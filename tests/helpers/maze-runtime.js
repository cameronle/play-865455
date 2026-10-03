const fs = require('node:fs');
const vm = require('node:vm');

function loadMaze(options = {}) {
  const storage = options.storage || new Map();
  const listeners = {};
  const listenable = base => Object.assign(base, {
    listeners: {},
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); },
    emit(type, event = {}) {
      const e = { button: 0, pointerId: 1, isPrimary: true, preventDefault() { this.defaultPrevented = true; }, ...event };
      for (const fn of this.listeners[type] || []) fn(e);
      return e;
    },
  });
  function node(id) {
    const classes = new Set();
    return listenable({ id, textContent: '', disabled: false, dataset: {}, tagName: 'BUTTON',
      classList: { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x) },
      setAttribute(k, v) { this[k] = String(v); }, focus() {}, onclick: null,
    });
  }
  const html = fs.readFileSync('maze/index.html', 'utf8');
  const nodes = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m => [m[1], node(m[1])]));
  const buttons = Object.fromEntries(['up', 'down', 'left', 'right'].map(k => [k, node(k)]));
  const context2d = new Proxy({}, { get(o, k) { return o[k] ||= () => {}; }, set(o, k, v) { o[k] = v; return true; } });
  Object.assign(nodes.game, { tagName: 'CANVAS', getContext: () => context2d,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 480, height: 480 }),
    setPointerCapture() { if (options.captureThrows) throw new Error('capture rejected'); }, releasePointerCapture() {}, hasPointerCapture: () => true,
  });
  const document = listenable({ hidden: false, documentElement: { dataset: { theme: 'light' } },
    getElementById: id => nodes[id], querySelector: s => buttons[s.match(/data-dir="(.*?)"/)?.[1]],
  });
  const window = listenable({});
  const pending = new Map(); let clock = 0, rafCount = 0;
  const sandbox = { console, Math: Object.create(Math), JSON, document, window,
    performance: { now: () => clock },
    localStorage: { getItem(k) { if (options.storageThrows) throw new Error('blocked'); return storage.get(k) ?? null; },
      setItem(k, v) { if (options.storageThrows) throw new Error('quota'); storage.set(k, String(v)); } },
    requestAnimationFrame: fn => { pending.set(++rafCount, fn); return rafCount; }, cancelAnimationFrame: id => pending.delete(id),
  };
  sandbox.Math.random = options.random || (() => 0.5); sandbox.globalThis = sandbox;
  vm.createContext(sandbox); vm.runInContext(fs.readFileSync('maze/logic.js', 'utf8'), sandbox); window.MazeLogic = sandbox.MazeLogic;
  // A test-only closure adapter, never written into the browser bundle.
  const hook = `window.__maze = {
    snapshot: () => JSON.parse(JSON.stringify({ state,score,high,level,lives,player,enemies,dots:[...dots],direction,queued,swipe,timer })),
    patch: v => { if ('player' in v) player=v.player; if ('enemies' in v) enemies=v.enemies.map(e=>({previous:null,personality:0,...e}));
      if ('dots' in v) dots=new Set(v.dots); if ('lives' in v) lives=v.lives; if ('level' in v) level=v.level;
      if ('direction' in v) direction=v.direction; if ('queued' in v) queued=v.queued; },
    step: update, draw
  };`;
  const source = fs.readFileSync('maze/game.js', 'utf8').replace(/\}\)\(\);\s*$/, hook + '\n})();');
  vm.runInContext(source, sandbox);
  const game = { nodes, buttons, storage, document, window, pending, sandbox,
    snapshot: () => window.__maze.snapshot(), patch: v => window.__maze.patch(v), step: () => window.__maze.step(),
    start: () => nodes.start.onclick(),
    key(key, extra = {}) { const event = { key, target: { tagName: 'BODY' }, preventDefault() { this.defaultPrevented = true; }, ...extra }; window.onkeydown?.(event); window.emit('keydown', event); return event; },
    frame(delta = 0) { clock += delta; const batch = [...pending.values()]; pending.clear(); batch.forEach(fn => fn(clock)); },
    run(ms, hz = 60) { const count = Math.round(ms / 1000 * hz); for (let i = 0; i < count; i++) this.frame(ms / count); },
  };
  return game;
}
module.exports = { loadMaze };
