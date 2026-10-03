"use strict";
const fs = require("node:fs");
const vm = require("node:vm");
function createShooter(options = {}) {
  let random = 1,
    now = 0,
    nextFrame = 0;
  const frames = new Map(),
    elements = new Map(),
    listeners = new Map();
  const store = new Map(Object.entries(options.storage || {}));
  const stats = { draws: 0, textWrites: 0, storageWrites: 0, commands: [] };
  const math = Object.create(Math);
  math.random = () =>
    (random = (Math.imul(random, 1664525) + 1013904223) >>> 0) / 4294967296;
  const context = new Proxy(
    {},
    {
      get(o, key) {
        return key in o
          ? o[key]
          : (...args) => stats.commands.push([key, ...args]);
      },
      set(o, key, v) {
        o[key] = v;
        return true;
      },
    },
  );
  context.fillRect = (...args) => {
    stats.commands.push(["fillRect", ...args]);
    if (args[0] === 0 && args[1] === 0 && args[2] === 480 && args[3] === 648)
      stats.draws++;
  };
  function element(id) {
    if (elements.has(id)) return elements.get(id);
    const handlers = new Map(),
      classes = new Set();
    let text = "",
      html = "";
    const e = {
      id,
      tagName: "BUTTON",
      dataset: {},
      style: {},
      width: 480,
      height: 648,
      classList: {
        add: (c) => classes.add(c),
        remove: (c) => classes.delete(c),
        contains: (c) => classes.has(c),
        toggle(c, force) {
          if (force === undefined) force = !classes.has(c);
          force ? classes.add(c) : classes.delete(c);
        },
      },
      get textContent() {
        return text;
      },
      set textContent(v) {
        text = String(v);
        stats.textWrites++;
      },
      get innerHTML() {
        return html;
      },
      set innerHTML(v) {
        html = String(v);
      },
      setAttribute(k, v) {
        this[k] = String(v);
      },
      getAttribute(k) {
        return this[k];
      },
      addEventListener(t, f) {
        if (!handlers.has(t)) handlers.set(t, []);
        handlers.get(t).push(f);
      },
      dispatch(t, event = {}) {
        const ev = {
          preventDefault() {
            this.defaultPrevented = true;
          },
          target: e,
          pointerId: 1,
          pointerType: "touch",
          button: 0,
          buttons: 1,
          clientX: 100,
          clientY: 100,
          ...event,
        };
        for (const f of handlers.get(t) || []) f(ev);
        return ev;
      },
      click() {
        return this.dispatch("click");
      },
      focus() {
        document.activeElement = this;
      },
      setPointerCapture() {
        if (options.captureThrows) throw new Error("Inactive pointer");
      },
      releasePointerCapture() {},
      hasPointerCapture() {
        return true;
      },
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 480,
        height: 648,
      }),
      getContext: () => context,
    };
    elements.set(id, e);
    return e;
  }
  const document = {
    hidden: false,
    activeElement: null,
    documentElement: { dataset: { theme: "dark" } },
    getElementById: element,
    querySelector: element,
    addEventListener(t, f) {
      const key = "doc:" + t;
      if (!listeners.has(key)) listeners.set(key, []);
      listeners.get(key).push(f);
    },
  };
  class Audio {
    constructor() {
      if (options.audioThrows) throw new Error("Audio unavailable");
      this.state = "running";
      this.currentTime = 0;
      this.destination = {};
    }
    resume() {
      return Promise.resolve();
    }
    createOscillator() {
      return {
        frequency: {},
        connect() {
          return this;
        },
        start() {},
        stop() {},
      };
    }
    createGain() {
      return {
        gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {
          return this;
        },
      };
    }
  }
  const sandbox = {
    console,
    Math: math,
    document,
    performance: { now: () => now },
    localStorage: {
      getItem(k) {
        if (options.blockStorage) throw new Error("Storage disabled");
        return store.get(k) ?? null;
      },
      setItem(k, v) {
        if (options.blockStorage) throw new Error("Storage disabled");
        stats.storageWrites++;
        store.set(k, String(v));
      },
    },
    setTimeout: (f) => {
      f();
      return 1;
    },
    clearTimeout() {},
    requestAnimationFrame: (f) => {
      frames.set(++nextFrame, f);
      return nextFrame;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
    addEventListener(t, f) {
      if (!listeners.has(t)) listeners.set(t, []);
      listeners.get(t).push(f);
    },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
  };
  if (!options.noAudio) sandbox.AudioContext = Audio;
  sandbox.window = sandbox;
  const source = fs.readFileSync("shooter/game.js", "utf8");
  const env = vm.createContext(sandbox);
  vm.runInContext(
    source.replace(
      /\}\)\(\);?\s*$/,
      ";globalThis.__shooterTest={run:code=>eval(code)};})();",
    ),
    env,
  );
  const run = (code) => env.__shooterTest.run(code);
  return {
    run,
    stats,
    store,
    document,
    element,
    event(t, e = {}) {
      for (const f of listeners.get(t) || [])
        f({
          preventDefault() {
            this.defaultPrevented = true;
          },
          target: element("body"),
          ...e,
        });
    },
    frame(t) {
      now = t;
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((f) => f(t));
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
          "JSON.stringify({state,score,level,lives,best,player,bullets,enemyBullets,enemies,powerups,levelTimer})",
        ),
      ),
  };
}
module.exports = { createShooter };
