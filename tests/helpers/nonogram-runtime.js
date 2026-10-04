const fs = require('node:fs'),
  vm = require('node:vm'),
  Rules = require('../../nonogram/rules.js');
function boot(options = {}) {
  const storage = new Map(Object.entries(options.storage || {})),
    nodes = {},
    jobs = new Map(),
    events = { document: {}, window: {} };
  let now = 100000,
    next = 1,
    doc;
  function make(tag = 'div', id = '') {
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
      value: id === 'sizeSelect' ? String(options.size || 10) : '',
      disabled: false,
      inert: false,
      isContentEditable: false,
      tabIndex: 0,
      textContent: '',
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
          s.split(',').some((v) => {
            v = v.trim();
            return (
              v === this.tagName.toLowerCase() ||
              v === '#' + id ||
              (v[0] === '.' && cls.has(v.slice(1))) ||
              (v === '[contenteditable]' && this.isContentEditable)
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
            s === 'button:not(:disabled)'
              ? c.tagName === 'BUTTON' && !c.disabled
              : s === 'b'
                ? c.tagName === 'B'
                : s === 'button'
                  ? c.tagName === 'BUTTON'
                  : s === '.cell'
                    ? c.classList.contains('cell')
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
        if (k === 'tabindex') this.tabIndex = +v;
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
          key: '',
          button: 0,
          pointerId: 1,
          isPrimary: true,
          pointerType: 'mouse',
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
        return this.dispatch('click');
      },
      setPointerCapture() {},
      hasPointerCapture() {
        return true;
      },
      releasePointerCapture() {},
      getBoundingClientRect() {
        const n = +nodes.sizeSelect.value;
        if (id === 'board')
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
    Object.defineProperty(e, 'className', {
      get: () => [...cls].join(' '),
      set(v) {
        cls.clear();
        String(v)
          .split(/\s+/)
          .filter(Boolean)
          .forEach((c) => cls.add(c));
      },
    });
    Object.defineProperty(e, 'innerHTML', {
      get: () => '',
      set() {
        e.children = [];
      },
    });
    return e;
  }
  const divs = [
    'board',
    'rowClues',
    'colClues',
    'resultOverlay',
    'puzzleFrame',
    'levelOverlay',
    'levelGrid',
    'revealName',
    'pauseOverlay',
    'utilityDock',
    'gamePage',
  ];
  for (const id of [
    ...divs,
    'sizeSelect',
    'puzzleSelect',
    'modeFill',
    'modeMark',
    'undoButton',
    'hintButton',
    'newButton',
    'resetButton',
    'timer',
    'mistakes',
    'best',
    'resultTitle',
    'resultText',
    'resultButton',
    'levelButton',
    'progressSummary',
    'closeLevels',
    'galleryProgress',
    'pauseButton',
    'resumeButton',
    'statusText',
  ])
    nodes[id] = make(
      id.endsWith('Select') ? 'select' : divs.includes(id) ? 'div' : 'button',
      id,
    );
  nodes.revealName.appendChild(make('span'));
  nodes.revealName.appendChild(make('b'));
  nodes.resultOverlay.appendChild(nodes.resultButton);
  nodes.pauseOverlay.appendChild(nodes.resumeButton);
  nodes.levelOverlay.appendChild(nodes.closeLevels);
  nodes.levelOverlay.appendChild(nodes.levelGrid);
  doc = {
    hidden: false,
    activeElement: null,
    body: make('body'),
    readyState: 'complete',
    getElementById: (id) => nodes[id] || null,
    createElement: (tag) => make(tag),
    querySelector: () => null,
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
    NonogramRules: Rules,
    matchMedia: (q) => ({
      matches: q.includes('reduced-motion')
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
    window,
    document: doc,
    localStorage: {
      getItem(k) {
        if (options.storageThrows) throw Error('blocked');
        return storage.get(k) ?? null;
      },
      setItem(k, v) {
        if (options.storageThrows) throw Error('quota');
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
    'window.__test={get:()=>({puzzle,board,mode,size,puzzleIndex,mistakes,active,cursor,drag,historyLength:history.length,elapsed:elapsedSeconds()}),paint,start,hint,undo,finish};';
  vm.runInContext(
    fs
      .readFileSync('nonogram/game.js', 'utf8')
      .replace(/\}\)\(\);\s*$/, ';' + shim + '})();'),
    sandbox,
  );
  const emit = (kind, type, extra = {}) => {
    const e = {
      type,
      target: doc.activeElement || doc.body,
      key: '',
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
      if (!limit--) throw Error('timer loop');
      const [id, j] = due;
      now = j.due;
      if (j.repeat) j.due += j.ms;
      else jobs.delete(id);
      j.fn();
    }
    now = end;
  }
  function pointer(type, r = 0, c = 0, extra = {}) {
    const n = +nodes.sizeSelect.value;
    return nodes.board.dispatch(type, {
      target: nodes.board.children[r * n + c],
      clientX: 110 + c * 20,
      clientY: 110 + r * 20,
      ...extra,
    });
  }
  return {
    nodes,
    storage,
    document: doc,
    window,
    snapshot: () => JSON.parse(JSON.stringify(window.__test.get())),
    test: window.__test,
    advance,
    pointer,
    key: (key, extra) => emit('document', 'keydown', { key, ...extra }),
    emit,
    tap(r, c, extra) {
      pointer('pointerdown', r, c, extra);
      pointer('pointerup', r, c, extra);
    },
    changeSize(n) {
      nodes.sizeSelect.value = String(n);
      nodes.sizeSelect.dispatch('change');
    },
    changePuzzle(i) {
      nodes.puzzleSelect.value = String(i);
      nodes.puzzleSelect.dispatch('change');
    },
    setConfirm(v) {
      options.confirm = v;
    },
    intervalCount: () => [...jobs.values()].filter((j) => j.repeat).length,
  };
}
module.exports = { boot };
