const fs = require("node:fs"),
  vm = require("node:vm"),
  Rules = require("../../sliding-puzzle/rules.js");
function boot(options = {}) {
  const storage = new Map(Object.entries(options.storage || {})),
    nodes = {},
    jobs = new Map(),
    events = { document: {}, window: {} };
  let now = 100000,
    next = 1,
    doc;
  function make(tag = "div", id = "") {
    const cls = new Set(),
      attrs = {},
      listeners = {};
    const e = {
      id,
      tagName: tag.toUpperCase(),
      children: [],
      dataset: {},
      style: {
        properties: {},
        setProperty(k, v) {
          this.properties[k] = v;
        },
      },
      value: id === "sizeSelect" ? String(options.size || 4) : "",
      disabled: false,
      inert: false,
      isContentEditable: false,
      tabIndex: 0,
      textContent: "",
      parentElement: null,
      appendChild(c) {
        this.children.push(c);
        c.parentElement = this;
        return c;
      },
      replaceChildren(...cs) {
        this.children = [];
        cs.forEach((c) => this.appendChild(c));
      },
      contains(c) {
        return c === this || this.children.some((x) => x.contains(c));
      },
      closest(s) {
        if (
          s.split(",").some((v) => {
            v = v.trim();
            return (
              v === this.tagName.toLowerCase() ||
              v === "#" + id ||
              (v[0] === "." && cls.has(v.slice(1))) ||
              (v === "[contenteditable]" && this.isContentEditable)
            );
          })
        )
          return this;
        return this.parentElement?.closest(s) || null;
      },
      querySelector(s) {
        return this.querySelectorAll(s)[0] || null;
      },
      querySelectorAll(s) {
        return this.children.flatMap((c) => [
          ...((
            s === "button:not(:disabled)"
              ? c.tagName === "BUTTON" && !c.disabled
              : s === "b"
                ? c.tagName === "B"
                : s === "button"
                  ? c.tagName === "BUTTON"
                  : s === ".cell"
                    ? c.classList.contains("cell")
                    : false
          )
            ? [c]
            : []),
          ...c.querySelectorAll(s),
        ]);
      },
      focus() {
        doc.activeElement = this;
      },
      setAttribute(k, v) {
        attrs[k] = String(v);
        if (k === "tabindex") this.tabIndex = +v;
      },
      getAttribute(k) {
        return attrs[k] ?? null;
      },
      removeAttribute(k) {
        delete attrs[k];
      },
      addEventListener(t, f) {
        (listeners[t] ||= []).push(f);
      },
      dispatch(t, extra = {}) {
        const e = {
          type: t,
          target: this,
          key: "",
          button: 0,
          pointerId: 1,
          isPrimary: true,
          pointerType: "mouse",
          detail: 0,
          clientX: 0,
          clientY: 0,
          defaultPrevented: false,
          preventDefault() {
            this.defaultPrevented = true;
          },
          ...extra,
        };
        if (!this.disabled) for (const f of listeners[t] || []) f(e);
        return e;
      },
      click() {
        return this.dispatch("click");
      },
      setPointerCapture() {},
      hasPointerCapture() {
        return true;
      },
      releasePointerCapture() {},
      getBoundingClientRect() {
        const n = Number(nodes.sizeSelect.value);
        if (id === "board")
          return { left: 100, top: 100, width: n * 20, height: n * 20 };
        const r = +this.dataset.row,
          c = +this.dataset.col;
        return { left: 100 + c * 20, top: 100 + r * 20, width: 20, height: 20 };
      },
      classList: {
        add(...xs) {
          xs.forEach((x) => cls.add(x));
        },
        remove(...xs) {
          xs.forEach((x) => cls.delete(x));
        },
        contains(x) {
          return cls.has(x);
        },
        toggle(x, on) {
          on ??= !cls.has(x);
          on ? cls.add(x) : cls.delete(x);
          return on;
        },
      },
    };
    Object.defineProperty(e, "className", {
      get: () => [...cls].join(" "),
      set(v) {
        cls.clear();
        String(v)
          .split(/\s+/)
          .filter(Boolean)
          .forEach((c) => cls.add(c));
      },
    });
    Object.defineProperty(e, "innerHTML", {
      get: () => "",
      set() {
        e.children = [];
      },
    });
    return e;
  }
  const divs = [
    "board",
    "winOverlay",
    "pauseOverlay",
    "gamePage",
    "boardFrame",
  ];
  for (const id of [
    ...divs,
    "sizeSelect",
    "moveStat",
    "timeStat",
    "bestStat",
    "winTitle",
    "winDetail",
    "restartButton",
    "undoButton",
    "newButton",
    "pauseButton",
    "resumeButton",
    "statusText",
  ])
    nodes[id] = make(
      id === "sizeSelect" ? "select" : divs.includes(id) ? "div" : "button",
      id,
    );
  nodes.winOverlay.appendChild(nodes.restartButton);
  nodes.pauseOverlay.appendChild(nodes.resumeButton);
  doc = {
    hidden: false,
    documentElement: make("html"),
    activeElement: null,
    body: make("body"),
    readyState: "complete",
    getElementById: (id) => nodes[id] || null,
    createElement: (tag) => make(tag),
    querySelector: (selector) => options.toolbarHeight && selector === ".toolbar"
      ? { getBoundingClientRect: () => ({height: options.toolbarHeight(nodes)}) } : null,
    querySelectorAll: () => [],
    elementFromPoint(x, y) {
      const n = +nodes.sizeSelect.value,
        r = Math.floor((y - 100) / 20),
        c = Math.floor((x - 100) / 20);
      return r >= 0 && c >= 0 && r < n && c < n
        ? nodes.board.children[r * n + c]
        : null;
    },
    addEventListener(t, f) {
      (events.document[t] ||= []).push(f);
    },
  };
  const window = {
    SlidingRules: {
      ...Rules,
      generateSolvableBoard: (size) =>
        options.board && options.board.length === size * size
          ? options.board.slice()
          : Rules.generateSolvableBoard(size, options.rng || Math.random),
    },

    innerWidth: options.width || 800,
    innerHeight: options.height || 800,
    devicePixelRatio: 1,
    matchMedia: (q) => ({
      matches: q.includes("reduced-motion")
        ? options.reducedMotion !== false
        : true,
    }),
    confirm: () => options.confirm !== false,
    addEventListener(t, f) {
      (events.window[t] ||= []).push(f);
    },
    dispatchEvent(e) {
      for (const f of events.window[e.type] || []) f(e);
    },
  };
  const schedule = (fn, ms = 0, repeat = false) => {
    const id = next++;
    jobs.set(id, { fn, due: now + ms, ms, repeat });
    return id;
  };
  const sandbox = {
    navigator: { vibrate() {} },
    getComputedStyle: () => ({ getPropertyValue: () => "#ffffff" }),
    requestAnimationFrame: (f) => schedule(() => f(now), 16),
    cancelAnimationFrame: (id) => jobs.delete(id),
    window,
    document: doc,
    localStorage: {
      getItem(k) {
        if (options.storageThrows) throw Error("blocked");
        return storage.get(k) ?? null;
      },
      setItem(k, v) {
        if (options.storageThrows) throw Error("quota");
        storage.set(k, String(v));
      },
      removeItem(k) {
        storage.delete(k);
      },
    },
    Date: { now: () => now },
    performance: { now: () => now },
    Math,
    JSON,
    console,
    setTimeout: (f, m) => schedule(f, m),
    clearTimeout: (id) => jobs.delete(id),
    setInterval: (f, m) => schedule(f, m, true),
    clearInterval: (id) => jobs.delete(id),
  };
  vm.createContext(sandbox);
  const shim =
    "window.__test={get:()=>({size,board,moves,history,isWon,startTime,timerInterval,records}),handleTileClick};";
  vm.runInContext(
    fs
      .readFileSync("sliding-puzzle/game.js", "utf8")
      .replace(/\}\)\(\);\s*$/, ";" + shim + "})();"),
    sandbox,
  );
  if (options.size) window.SlidingGame.setSize(options.size);
  const emit = (kind, type, extra = {}) => {
    const e = {
      type,
      target: doc.activeElement || doc.body,
      key: "",
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      repeat: false,
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
      ...extra,
    };
    for (const f of events[kind][type] || []) f(e);
    return e;
  };
  function advance(ms) {
    const end = now + ms;
    let limit = 1000;
    for (;;) {
      const due = [...jobs.entries()]
        .filter(([, j]) => j.due <= end)
        .sort((a, b) => a[1].due - b[1].due)[0];
      if (!due) break;
      if (!limit--) throw Error("timer loop");
      const [id, j] = due;
      now = j.due;
      if (j.repeat) j.due += j.ms;
      else jobs.delete(id);
      j.fn();
    }
    now = end;
  }
  function pointer(type, index = 0, extra = {}) {
    return nodes.board.dispatch(type, {
      target: nodes.board.children[index] || nodes.board,
      clientX: 110 + (index % Number(nodes.sizeSelect.value)) * 20,
      clientY: 110 + Math.floor(index / Number(nodes.sizeSelect.value)) * 20,
      ...extra,
    });
  }
  return {
    nodes,
    storage,
    document: doc,
    window,
    test: window.__test,
    snapshot: () =>
      JSON.parse(JSON.stringify(window.SlidingGame.getSnapshot())),
    advance,
    pointer,
    emit,
    key: (code, extra = {}) =>
      emit("window", "keydown", { code, key: code, ...extra }),
    tile(index) {
      nodes.board.children[index].click();
    },
    intervalCount: () => [...jobs.values()].filter((j) => j.repeat).length,
  };
}

module.exports = { boot };
