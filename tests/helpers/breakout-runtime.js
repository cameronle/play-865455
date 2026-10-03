"use strict";
const fs = require("node:fs"),
  vm = require("node:vm");
function createBreakout(options = {}) {
  let now = 0,
    id = 0,
    seed = options.seed ?? 1;
  const queue = new Map(),
    nodes = new Map(),
    listeners = new Map(),
    store = new Map(Object.entries(options.storage || {}));
  const stats = { frames: 0, paints: 0, writes: 0, commands: [] };
  const ctx = new Proxy(
    { globalAlpha: 1 },
    {
      get(o, k) {
        return k in o
          ? o[k]
          : (...args) => {
              if (options.record) stats.commands.push([k, ...args]);
            };
      },
      set(o, k, v) {
        o[k] = v;
        return true;
      },
    },
  );
  ctx.fillRect = (...args) => {
    if (args[2] === 480 && args[3] === 640) stats.paints++;
    if (options.record) stats.commands.push(["fillRect", ...args]);
  };
  function node(id) {
    if (nodes.has(id)) return nodes.get(id);
    const handlers = new Map(),
      classes = new Set();
    const el = {
      id,
      tagName: id === "game" ? "CANVAS" : "BUTTON",
      dataset: {},
      width: 480,
      height: 640,
      disabled: false,
      textContent: "",
      onclick: null,
      classList: {
        add: (k) => classes.add(k),
        remove: (k) => classes.delete(k),
        contains: (k) => classes.has(k),
      },
      addEventListener(t, f) {
        if (!handlers.has(t)) handlers.set(t, []);
        handlers.get(t).push(f);
      },
      dispatch(t, v = {}) {
        const e = {
          target: el,
          detail: 0,
          pointerId: 1,
          pointerType: "touch",
          button: 0,
          clientX: 180,
          clientY: 300,
          preventDefault() {
            this.defaultPrevented = true;
          },
          ...v,
        };
        for (const f of handlers.get(t) || []) f(e);
        if (typeof this["on" + t] === "function") this["on" + t](e);
        return e;
      },
      click() {
        return this.dispatch("click");
      },
      getContext: () => ctx,
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 360,
        height: 480,
      }),
      setPointerCapture() {
        if (options.captureThrows) throw Error("Inactive pointer");
      },
      releasePointerCapture() {},
      hasPointerCapture: () => true,
      focus() {
        document.activeElement = el;
      },
      setAttribute(k, v) {
        this[k] = String(v);
      },
      getAttribute(k) {
        return this[k];
      },
    };
    nodes.set(id, el);
    return el;
  }
  const document = {
    hidden: false,
    documentElement: { dataset: { theme: "light" } },
    getElementById: node,
    addEventListener(t, f) {
      if (!listeners.has("doc:" + t)) listeners.set("doc:" + t, []);
      listeners.get("doc:" + t).push(f);
    },
  };
  const math = Object.create(Math);
  math.random = () =>
    options.fixedRandom ??
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const sandbox = {
    console,
    document,
    Math: math,
    performance: { now: () => now },
    localStorage: {
      getItem(k) {
        if (options.blockRead) throw Error("Storage denied");
        return store.get(k) ?? null;
      },
      setItem(k, v) {
        if (options.blockWrite) throw Error("Storage denied");
        stats.writes++;
        store.set(k, String(v));
      },
    },
    requestAnimationFrame(f) {
      queue.set(++id, f);
      return id;
    },
    cancelAnimationFrame: (i) => queue.delete(i),
    addEventListener(t, f) {
      if (!listeners.has(t)) listeners.set(t, []);
      listeners.get(t).push(f);
    },
  };
  sandbox.window = sandbox;
  const env = vm.createContext(sandbox);
  const source = fs.readFileSync("breakout/game.js", "utf8");
  vm.runInContext(
    source.replace(
      /\}\)\(\);?\s*$/,
      ";globalThis.__breakoutTest={run:code=>eval(code)};})();",
    ),
    env,
  );
  const run = (code) => env.__breakoutTest.run(code);
  return {
    run,
    node,
    stats,
    document,
    store,
    event(t, v = {}) {
      const e = {
        target: { tagName: "BODY" },
        preventDefault() {
          this.defaultPrevented = true;
        },
        ...v,
      };
      for (const f of listeners.get(t) || []) f(e);
      if (typeof sandbox["on" + t] === "function") sandbox["on" + t](e);
      return e;
    },
    frame(t) {
      now = t;
      const calls = [...queue.values()];
      queue.clear();
      stats.frames += calls.length;
      calls.forEach((f) => f(t));
    },
    frames(seconds, hz = 60) {
      const end = now + seconds * 1000,
        dt = 1000 / hz;
      while (now + dt < end - 1e-7) this.frame(now + dt);
      this.frame(end);
    },
    snapshot: () =>
      JSON.parse(
        run(
          'JSON.stringify({state,score,high,level,lives,bar,ball,bricks,keys:[...keys],dragging,accumulator:typeof accumulator===\"undefined\"?0:accumulator})',
        ),
      ),
  };
}
module.exports = { createBreakout };
