"use strict";
const fs = require("node:fs"),
  vm = require("node:vm");
function createMinesweeper(options = {}) {
  let clock = 10000,
    serial = 0,
    seed = options.seed ?? 1;
  const store = new Map(Object.entries(options.storage || {})),
    timers = new Map(),
    roots = new Map(),
    windowHandlers = new Map();
  const document = {
    hidden: false,
    activeElement: null,
    handlers: new Map(),
    getElementById(id) {
      if (!roots.has(id)) roots.set(id, node("div", id));
      return roots.get(id);
    },
    createElement: (tag) => node(tag),
    addEventListener(t, f) {
      if (!this.handlers.has(t)) this.handlers.set(t, []);
      this.handlers.get(t).push(f);
    },
  };
  function node(tag, id = "") {
    let klass = "",
      text = "",
      children = [];
    const attributes = {},
      handlers = new Map(),
      captures = new Set();
    const el = {
      tagName: tag.toUpperCase(),
      id,
      dataset: {},
      parentElement: null,
      disabled: false,
      tabIndex: 0,
      scrollLeft: 0,
      scrollTop: 0,
      style: {
        properties: {},
        setProperty(k, v) {
          this.properties[k] = String(v);
        },
      },
      get className() {
        return klass;
      },
      set className(v) {
        klass = v;
      },
      get textContent() {
        return text;
      },
      set textContent(v) {
        text = String(v);
      },
      get children() {
        return children;
      },
      get innerHTML() {
        return text;
      },
      set innerHTML(v) {
        if (children.includes(document.activeElement))
          document.activeElement = null;
        children = [];
        text = v;
      },
      classList: {
        contains(c) {
          return klass.split(/\s+/).includes(c);
        },
        add(...cs) {
          klass = Array.from(
            new Set([...klass.split(/\s+/).filter(Boolean), ...cs]),
          ).join(" ");
        },
        remove(...cs) {
          klass = klass
            .split(/\s+/)
            .filter((c) => !cs.includes(c))
            .join(" ");
        },
        toggle(c, force) {
          const on = force ?? !this.contains(c);
          on ? this.add(c) : this.remove(c);
          return on;
        },
      },
      appendChild(c) {
        children.push(c);
        c.parentElement = el;
        return c;
      },
      replaceChildren(...cs) {
        this.innerHTML = "";
        cs.forEach((c) => this.appendChild(c));
      },
      setAttribute(k, v) {
        attributes[k] = String(v);
      },
      getAttribute(k) {
        return attributes[k] ?? null;
      },
      closest(sel) {
        if (sel === ".cell")
          return this.classList.contains("cell")
            ? this
            : this.parentElement?.closest(sel);
        return null;
      },
      contains(c) {
        return c === el || children.some((n) => n.contains(c));
      },
      addEventListener(t, f) {
        if (!handlers.has(t)) handlers.set(t, []);
        handlers.get(t).push(f);
      },
      focus() {
        document.activeElement = el;
      },
      scrollIntoView() {},
      getBoundingClientRect() {
        return {
          left: 0,
          top: 0,
          right: 36,
          bottom: 36,
          width: 36,
          height: 36,
        };
      },
      setPointerCapture(id) {
        if (options.captureThrows) throw Error("inactive pointer");
        captures.add(id);
      },
      hasPointerCapture: (id) => captures.has(id),
      releasePointerCapture: (id) => captures.delete(id),
      dispatch(t, v = {}) {
        const e = {
          type: t,
          target: el,
          currentTarget: el,
          detail: 0,
          pointerId: 1,
          pointerType: "touch",
          button: 0,
          clientX: 18,
          clientY: 18,
          preventDefault() {
            this.defaultPrevented = true;
          },
          stopPropagation() {
            this.stopped = true;
          },
          ...v,
        };
        let cur = el;
        while (cur) {
          e.currentTarget = cur;
          for (const f of cur._handlers.get(t) || []) f(e);
          if (typeof cur["on" + t] === "function") cur["on" + t](e);
          if (e.stopped) break;
          cur = cur.parentElement;
        }
        return e;
      },
      click() {
        return this.dispatch("click");
      },
      _handlers: handlers,
    };
    return el;
  }
  ["message", "levelsPanel"].forEach((id) =>
    document.getElementById(id).classList.add("hide"),
  );
  const math = Object.create(Math);
  math.random = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  function timer(fn, ms, repeat) {
    const id = ++serial;
    timers.set(id, { fn, at: clock + ms, ms, repeat });
    return id;
  }
  const sandbox = {
    console,
    document,
    Math: math,
    Date: class extends Date {
      static now() {
        return clock;
      }
    },
    performance: { now: () => clock },
    setTimeout: (f, m) => timer(f, m, false),
    setInterval: (f, m) => timer(f, m, true),
    clearTimeout: (id) => timers.delete(id),
    clearInterval: (id) => timers.delete(id),
    localStorage: {
      getItem(k) {
        if (options.blockRead) throw Error("storage blocked");
        return store.get(k) ?? null;
      },
      setItem(k, v) {
        if (options.blockWrite) throw Error("storage quota");
        store.set(k, String(v));
      },
    },
    addEventListener(t, f) {
      if (!windowHandlers.has(t)) windowHandlers.set(t, []);
      windowHandlers.get(t).push(f);
    },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync("minesweeper/levels.js", "utf8"), sandbox);
  let source = fs.readFileSync("minesweeper/game.js", "utf8");
  source = source.replace(
    /\}\)\(\);?\s*$/,
    `;window.__mineQA={snapshot:()=>({rows,cols,mineCount,levelIndex,started,over,flags,cells:cells.map(c=>({...c})),completed:[...completed],bestTimes:[...bestTimes]}),open,flag};})();`,
  );
  vm.runInContext(source, sandbox);
  function advance(ms) {
    const end = clock + ms;
    let count = 0;
    while (true) {
      let next;
      for (const [id, t] of timers) {
        if (t.at <= end && (!next || t.at < next[1].at)) next = [id, t];
      }
      if (!next) break;
      if (++count > 100000) throw Error("timer runaway");
      const [id, t] = next;
      clock = t.at;
      if (t.repeat) t.at += t.ms;
      else timers.delete(id);
      t.fn();
    }
    clock = end;
  }
  return {
    get: document.getElementById.bind(document),
    document,
    store,
    advance,
    snapshot: () => JSON.parse(JSON.stringify(sandbox.__mineQA.snapshot())),
    open: (i) => sandbox.__mineQA.open(i),
    flag: (i) => sandbox.__mineQA.flag(i),
    cell: (i) => document.getElementById("grid").children[i],
    start() {
      document.getElementById("start").click();
    },
    emit(t, v = {}) {
      const e = {
        target: document.activeElement,
        preventDefault() {
          this.defaultPrevented = true;
        },
        ...v,
      };
      for (const f of windowHandlers.get(t) || []) f(e);
      for (const f of document.handlers.get(t) || []) f(e);
      return e;
    },
    timerCount: () => timers.size,
  };
}
module.exports = { createMinesweeper };
