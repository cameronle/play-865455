"use strict";
const fs = require("node:fs");
const vm = require("node:vm");

function loadGame({ saved = new Map(), denied = false, seed = 3 } = {}) {
  class Element {
    constructor(id = "") {
      this.id = id;
      this.children = [];
      this.listeners = new Map();
      this.attributes = {};
      this.dataset = {};
      this.style = {};
      this.textContent = "";
      this.disabled = false;
      const classes = new Set(id === "overlay" ? ["hidden"] : []);
      this.classList = {
        add: (x) => classes.add(x),
        remove: (x) => classes.delete(x),
        contains: (x) => classes.has(x),
        toggle: (x, yes) => {
          if (yes ?? !classes.has(x)) classes.add(x);
          else classes.delete(x);
        },
      };
    }
    set innerHTML(value) {
      this.children = [];
    }
    appendChild(child) {
      this.children.push(child);
      return child;
    }
    append(...children) {
      this.children.push(...children);
    }
    setAttribute(key, value) {
      this.attributes[key] = String(value);
    }
    getAttribute(key) {
      return this.attributes[key];
    }
    addEventListener(type, handler) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(handler);
    }
    dispatch(type, data = {}) {
      const event = {
        preventDefault() {
          this.defaultPrevented = true;
        },
        ...data,
      };
      for (const handler of this.listeners.get(type) || []) handler(event);
      if (this["on" + type]) this["on" + type](event);
      return event;
    }
    focus() {
      document.activeElement = this;
    }
    setPointerCapture() {}
    releasePointerCapture() {}
    getBoundingClientRect() {
      return { x: 0, y: 0, left: 0, top: 0, width: 350, height: 350 };
    }
  }
  const ids = Object.fromEntries(
    [
      "board",
      "score",
      "best",
      "overlay",
      "overlayTitle",
      "newGame",
      "tryAgain",
      "undo",
      "status",
    ].map((id) => [id, new Element(id)]),
  );
  const directions = ["up", "down", "left", "right"].map((dir) => {
    const element = new Element();
    element.dataset.dir = dir;
    return element;
  });
  const document = new Element("document");
  Object.assign(document, {
    hidden: false,
    visibilityState: "visible",
    getElementById: (id) => ids[id],
    createElement: () => new Element(),
    querySelectorAll: (selector) =>
      selector === "[data-dir]" ? directions : [],
    activeElement: null,
  });
  const window = new Element("window");
  const math = Object.create(Math);
  math.random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const localStorage = {
    getItem(key) {
      if (denied) throw new Error("SecurityError: storage denied");
      return saved.get(key) ?? null;
    },
    setItem(key, value) {
      if (denied) throw new Error("QuotaExceededError: storage denied");
      saved.set(key, String(value));
    },
    removeItem(key) {
      if (denied) throw new Error("SecurityError: storage denied");
      saved.delete(key);
    },
  };
  const context = vm.createContext({
    document,
    window,
    localStorage,
    Math: math,
    console,
    setTimeout: (fn) => {
      fn();
      return 1;
    },
    clearTimeout() {},
    requestAnimationFrame: (fn) => {
      fn();
      return 1;
    },
    performance: { now: () => 0 },
    matchMedia: () => ({ matches: false }),
  });
  let source = fs.readFileSync("2048/game.js", "utf8");
  // Test-only lexical instrumentation: no debug global is shipped to browsers.
  source = source.replace(
    /\}\)\(\);\s*$/,
    `;globalThis.__game = {
    state: () => ({ grid: grid.map(row => row.slice()), score, won, best }),
    fixture: (value, points = 0, victory = false) => { grid = value.map(row => row.slice()); score = points; won = victory; overlay.classList.add('hidden'); draw(); },
    slide: values => slideLine(values), canMove: () => canMove(),
    move: key => move(dirs[key])
  };})();`,
  );
  vm.runInContext(source, context, { timeout: 1000 });
  return {
    api: context.__game,
    ids,
    document,
    window,
    directions,
    saved,
    state: () => JSON.parse(JSON.stringify(context.__game.state())),
  };
}
const board = (...rows) => [
  ...rows,
  ...Array.from({ length: 4 - rows.length }, () => [0, 0, 0, 0]),
];

module.exports = { loadGame, board };
