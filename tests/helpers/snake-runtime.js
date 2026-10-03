"use strict";
const fs = require("node:fs"),
  vm = require("node:vm");
function createSnake(options = {}) {
  let now = 0,
    frameId = 0,
    seed = options.seed ?? 1;
  const queue = new Map(),
    nodes = new Map(),
    listeners = new Map(),
    store = new Map(Object.entries(options.storage || {}));
  const stats = { frames: 0, paints: 0, writes: 0, commands: [] };
  const context = new Proxy(
    { globalAlpha: 1 },
    {
      get(o, k) {
        return k in o ? o[k] : (...a) => stats.commands.push([k, ...a]);
      },
      set(o, k, v) {
        o[k] = v;
        return true;
      },
    },
  );
  context.fillRect = (...a) => {
    if (a[2] === 400 && a[3] === 400) stats.paints++;
    stats.commands.push([
      "fillRect",
      context.globalAlpha,
      context.fillStyle,
      ...a,
    ]);
  };
  function node(id) {
    if (nodes.has(id)) return nodes.get(id);
    const handlers = new Map(),
      classes = new Set();
    const e = {
      id,
      tagName:
        id === "body"
          ? "BODY"
          : ["board", "next"].includes(id)
            ? "CANVAS"
            : "BUTTON",
      dataset: {},
      width: 400,
      height: 400,
      textContent: "",
      disabled: false,
      classList: {
        add: (c) => classes.add(c),
        remove: (c) => classes.delete(c),
        contains: (c) => classes.has(c),
        toggle(c, on) {
          if (on === undefined) on = !classes.has(c);
          on ? classes.add(c) : classes.delete(c);
        },
      },
      addEventListener(t, f) {
        if (!handlers.has(t)) handlers.set(t, []);
        handlers.get(t).push(f);
      },
      dispatch(t, v = {}) {
        const event = {
          target: e,
          detail: 0,
          pointerId: 1,
          pointerType: "touch",
          button: 0,
          buttons: 1,
          preventDefault() {
            this.defaultPrevented = true;
          },
          ...v,
        };
        for (const f of handlers.get(t) || []) f(event);
        return event;
      },
      click() {
        return this.dispatch("click");
      },
      setAttribute(k, v) {
        this[k] = String(v);
      },
      getAttribute(k) {
        return this[k];
      },
      getContext: () => context,
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 400,
        height: 400,
      }),
      focus() {
        document.activeElement = this;
      },
      setPointerCapture() {
        if (options.captureThrows) throw Error("Inactive pointer");
      },
      releasePointerCapture() {},
      hasPointerCapture: () => true,
    };
    nodes.set(id, e);
    return e;
  }
  const controls = ["up", "left", "down", "right"].map((a) => {
    const e = node(a);
    e.dataset.action = a;
    return e;
  });
  const document = {
    hidden: false,
    documentElement: { dataset: { theme: "light" } },
    getElementById: node,
    querySelectorAll: () => controls,
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
    document,
    console,
    Math: math,
    performance: { now: () => now },
    localStorage: {
      getItem(k) {
        if (options.blockRead) throw Error("Storage denied");
        return store.get(k) ?? null;
      },
      setItem(k, v) {
        if (options.blockWrite) throw Error("Storage quota");
        stats.writes++;
        store.set(k, String(v));
      },
    },
    getComputedStyle: () => {
      stats.styleReads = (stats.styleReads || 0) + 1;
      return { getPropertyValue: () => "" };
    },
    requestAnimationFrame(f) {
      queue.set(++frameId, f);
      return frameId;
    },
    cancelAnimationFrame: (id) => queue.delete(id),
    addEventListener(t, f) {
      if (!listeners.has(t)) listeners.set(t, []);
      listeners.get(t).push(f);
    },
  };
  sandbox.window = sandbox;
  const env = vm.createContext(sandbox);
  const source = fs.readFileSync("snake/game.js", "utf8");
  vm.runInContext(
    source.replace(
      /\}\)\(\);?\s*$/,
      ";globalThis.__snakeTest={run:code=>eval(code)};})();",
    ),
    env,
  );
  const run = (code) => env.__snakeTest.run(code);
  return {
    run,
    stats,
    store,
    document,
    node,
    controls,
    event(t, v = {}) {
      const e = {
        target: node("body"),
        preventDefault() {
          this.defaultPrevented = true;
        },
        ...v,
      };
      for (const f of listeners.get(t) || []) f(e);
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
          "JSON.stringify({snake,food,direction,score,highScore,state,timer,stepMs,queue:typeof turnQueue==='undefined'?[]:turnQueue})",
        ),
      ),
  };
}
module.exports = { createSnake };
