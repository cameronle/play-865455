const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class ClassList {
  constructor(initial = '') { this.values = new Set(initial.split(/\s+/).filter(Boolean)); }
  add(value) { this.values.add(value); }
  remove(value) { this.values.delete(value); }
  contains(value) { return this.values.has(value); }
}

function makeElement(id) {
  return {
    id,
    textContent: '',
    className: '',
    classList: new ClassList(id === 'overlay' ? 'overlay' : ''),
    disabled: false,
    value: id === 'difficulty' ? 'normal' : '',
    listeners: {},
    addEventListener(type, fn) { this.listeners[type] = fn; },
  };
}

test('page starts and accepts the first pointer move', () => {
  const ids = ['board', 'status', 'turnDot', 'overlay', 'overlayTitle', 'overlayText', 'start', 'newGame', 'undo', 'difficulty', 'wins', 'losses', 'draws'];
  const elements = Object.fromEntries(ids.map((id) => [id, makeElement(id)]));
  const gradient = { addColorStop() {} };
  const drawContext = new Proxy({ createLinearGradient: () => gradient, createRadialGradient: () => gradient }, { get(target, key) { if (!(key in target)) target[key] = () => {}; return target[key]; }, set(target, key, value) { target[key] = value; return true; } });
  elements.board.width = 720;
  elements.board.height = 720;
  elements.board.getContext = () => drawContext;
  elements.board.getBoundingClientRect = () => ({ left: 0, top: 0, width: 720, height: 720 });
  const storage = new Map();
  const context = {
    console,
    Math,
    JSON,
    setTimeout: (fn) => { context.pendingTimer = fn; return 1; },
    clearTimeout: () => {},
    localStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    document: { getElementById: (id) => elements[id] },
    window: { addEventListener: () => {} },
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('gomoku/engine.js', 'utf8'), context);
  context.window.GomokuEngine = context.GomokuEngine;
  vm.runInContext(fs.readFileSync('gomoku/game.js', 'utf8'), context);

  elements.start.listeners.click();
  assert.equal(elements.status.textContent, '轮到你落子');
  assert.equal(elements.overlay.classList.contains('hidden'), true);

  elements.board.listeners.pointerdown({ clientX: 360, clientY: 360, preventDefault() {} });
  assert.equal(elements.status.textContent, '电脑思考中…');
  assert.equal(typeof context.pendingTimer, 'function');

  context.pendingTimer();
  assert.equal(elements.status.textContent, '轮到你落子');
  assert.equal(elements.undo.disabled, false);
});
