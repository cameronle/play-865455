const fs = require("node:fs"),
  vm = require("node:vm"),
  Rules = require("../../connect-four/rules.js");
function boot(options = {}) {
  const store = new Map(Object.entries(options.storage || {})),
    jobs = new Map(),
    windowEvents = new Map(),
    documentEvents = new Map(),
    nodes = {};
  let now = 10000,
    id = 0,
    seed = 1,
    doc,
    hit = null;
  const confirms = [],
    rng = () =>
      (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  function element(tag = "button", id = "") {
    const cls = new Set(),
      attrs = {},
      listeners = {};
    const e = {
      id,
      tagName: tag.toUpperCase(),
      dataset: {},
      children: [],
      style: {},
      listeners,
      value:
        id === "difficulty" ? "medium" : id === "firstPlayer" ? "human" : "",
      textContent: "",
      disabled: false,
      inert: false,
      isContentEditable: false,
      parentElement: null,
      addEventListener(t, f) {
        (listeners[t] ||= []).push(f);
      },
      dispatch(t, extra = {}) {
        const ev = {
          type: t,
          target: this,
          button: 0,
          isPrimary: true,
          pointerId: 1,
          clientX: 350,
          clientY: 400,
          detail: 0,
          preventDefault() {
            this.defaultPrevented = true;
          },
          ...extra,
        };
        if (!this.disabled) {
          for (const f of listeners[t] || []) f(ev);
          this["on" + t]?.(ev);
        }
        return ev;
      },
      click() {
        return this.dispatch("click");
      },
      focus() {
        doc.activeElement = this;
      },
      setPointerCapture() {},
      releasePointerCapture() {},
      setAttribute(k, v) {
        attrs[k] = String(v);
      },
      getAttribute(k) {
        return attrs[k] ?? null;
      },
      removeAttribute(k) {
        delete attrs[k];
      },
      getBoundingClientRect() {
        return {
          left: 0,
          top: 0,
          width: 700,
          height: 600,
          right: 700,
          bottom: 600,
        };
      },
      appendChild(c) {
        this.children.push(c);
        c.parentElement = this;
        return c;
      },
      replaceChildren(...c) {
        this.children = [];
        c.forEach((x) => this.appendChild(x));
      },
      contains(c) {
        return this === c || this.children.some((x) => x.contains(c));
      },
      closest(s) {
        if (
          s.split(",").some((v) => {
            v = v.trim();
            return (
              v === this.tagName.toLowerCase() ||
              (v[0] === "." && cls.has(v.slice(1))) ||
              v === "#" + this.id ||
              (v === "[contenteditable]" && this.isContentEditable)
            );
          })
        )
          return this;
        return this.parentElement?.closest(s) || null;
      },
      classList: {
        add(...x) {
          x.forEach((c) => cls.add(c));
        },
        remove(...x) {
          x.forEach((c) => cls.delete(c));
        },
        contains(c) {
          return cls.has(c);
        },
        toggle(c, on) {
          on ??= !cls.has(c);
          on ? cls.add(c) : cls.delete(c);
          return on;
        },
      },
    };
    Object.defineProperty(e, "className", {
      get: () => [...cls].join(" "),
      set: (s) => {
        cls.clear();
        String(s)
          .split(/\s+/)
          .filter(Boolean)
          .forEach((x) => cls.add(x));
      },
    });
    return e;
  }
  for (const n of [
    "board",
    "status",
    "turnDot",
    "difficulty",
    "firstPlayer",
    "undoButton",
    "newButton",
    "wins",
    "losses",
    "draws",
    "resultOverlay",
    "resultTitle",
    "resultText",
    "resultButton",
    "pauseButton",
    "resumeButton",
    "viewButton",
    "pauseOverlay",
    "utilityDock",
  ])
    nodes[n] = element(
      ["difficulty", "firstPlayer"].includes(n)
        ? "select"
        : ["board", "resultOverlay", "pauseOverlay", "utilityDock"].includes(n)
          ? "div"
          : "button",
      n,
    );
  const cols = Array.from({ length: 7 }, (_, i) => {
    const e = element();
    e.dataset.column = String(i);
    return e;
  });
  const theme = element();
  theme.className = "theme-toggle";
  const clear = element();
  clear.className = "clear-data-toggle";
  doc = {
    hidden: false,
    body: element("body"),
    readyState: "complete",
    activeElement: null,
    getElementById: (n) => nodes[n] || null,
    querySelectorAll: (s) => (s === "[data-column]" ? cols : []),
    querySelector: (s) =>
      s === ".theme-toggle" ? theme : s === ".clear-data-toggle" ? clear : null,
    createElement: (tag) => element(tag),
    elementFromPoint: () => hit,
    addEventListener(t, f) {
      (documentEvents.get(t) || documentEvents.set(t, []).get(t)).push(f);
    },
  };
  const schedule = (fn, ms = 0) => {
    const key = ++id;
    jobs.set(key, { fn, time: now + ms });
    return key;
  };
  const window = {
    ConnectFourRules: {
      ...Rules,
      chooseMove: (b, p, d) =>
        options.fixedAi ? 6 : Rules.chooseMove(b, p, d, { rng, now: () => 0 }),
    },
    setTimeout: schedule,
    clearTimeout: (i) => jobs.delete(i),
    confirm(text) {
      confirms.push(text);
      return options.confirm !== false;
    },
    addEventListener(t, f) {
      (windowEvents.get(t) || windowEvents.set(t, []).get(t)).push(f);
    },
    dispatchEvent(e) {
      for (const f of windowEvents.get(e.type) || []) f(e);
    },
  };
  const storage = new Proxy(
    {
      getItem(k) {
        if (options.storageThrows) throw Error("blocked");
        return store.get(k) ?? null;
      },
      setItem(k, v) {
        if (options.storageThrows) throw Error("quota");
        store.set(k, String(v));
      },
      removeItem(k) {
        if (options.storageThrows) throw Error("blocked");
        store.delete(k);
      },
    },
    {
      ownKeys: () => [...store.keys()],
      getOwnPropertyDescriptor: () => ({
        enumerable: true,
        configurable: true,
      }),
    },
  );
  const sandbox = {
    window,
    document: doc,
    localStorage: storage,
    performance: { now: () => now },
    Date: { now: () => now },
    Math: Object.assign(Object.create(Math), { random: rng }),
    setTimeout: schedule,
    clearTimeout: (i) => jobs.delete(i),
    Event: class {
      constructor(t) {
        this.type = t;
      }
    },
    console,
  };
  vm.createContext(sandbox);
  const shim = `window.__cfTest={get:()=>({board:board.map(r=>r.slice()),history:history.slice(),turn,busy,over,recorded,record:{...record},paused:typeof paused==='undefined'?false:paused,moves:typeof moves==='undefined'?[]:moves.slice(),selected:typeof selectedColumn==='undefined'?3:selectedColumn}),humanMove,computerMove,newGame,undo};`;
  vm.runInContext(
    fs
      .readFileSync("connect-four/game.js", "utf8")
      .replace(/\}\)\(\);\s*$/, ";" + shim + "})();"),
    sandbox,
  );
  const emit = (kind, type, extra = {}) => {
    const ev = {
      key: "",
      target: doc.activeElement || doc.body,
      repeat: false,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
      ...extra,
    };
    for (const f of (kind === "window" ? windowEvents : documentEvents).get(
      type,
    ) || [])
      f(ev);
    return ev;
  };
  function advance(ms) {
    const end = now + ms;
    let limit = 200;
    for (;;) {
      let next = null;
      for (const [i, j] of jobs)
        if (j.time <= end && (!next || j.time < next[1].time)) next = [i, j];
      if (!next) break;
      if (!limit--) throw Error("timer loop");
      now = next[1].time;
      jobs.delete(next[0]);
      next[1].fn();
    }
    now = end;
  }
  const snapshot = () => JSON.parse(JSON.stringify(window.__cfTest.get()));
  const cells = () =>
    nodes.board.children.flatMap((row) =>
      row.getAttribute("role") === "row" ? row.children : [row],
    );
  return {
    cells,
    nodes,
    cols,
    storage: store,
    confirms,
    window,
    document: doc,
    snapshot,
    test: window.__cfTest,
    emit,
    key: (key, extra) => emit("document", "keydown", { key, ...extra }),
    advance,
    flush: () => advance(1000),
    pending: () => [...jobs.values()].map((j) => j.fn),
    pendingCount: () => jobs.size,
    setConfirm: (v) => (options.confirm = v),
    pointer(type, col = 3, extra = {}) {
      hit = cells()[35 + col];
      return nodes.board.dispatch(type, {
        target: hit,
        clientX: col * 100 + 50,
        clientY: 550,
        ...extra,
      });
    },
    runSharedClear() {
      sandbox.location = {
        pathname: "/connect-four/",
        reload() {
          emit("window", "pagehide");
        },
      };
      const prev = doc.querySelector;
      doc.querySelector = (s) =>
        s === ".clear-data-toggle"
          ? doc.body.children.find((e) =>
              e.classList.contains("clear-data-toggle"),
            ) || null
          : prev(s);
      vm.runInContext(fs.readFileSync("clear-game-data.js", "utf8"), sandbox);
      return doc.body.children.find((e) =>
        e.classList.contains("clear-data-toggle"),
      );
    },
  };
}
module.exports = { boot };
