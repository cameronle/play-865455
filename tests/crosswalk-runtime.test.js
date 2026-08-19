const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function makeNode(id, extra = {}) {
  const listeners = {};
  const classes = new Set();
  return {
    id,
    textContent: '',
    innerHTML: '',
    dataset: {},
    children: [],
    listeners,
    disabled: false,
    classList: {
      add: name => classes.add(name),
      remove: name => classes.delete(name),
      contains: name => classes.has(name),
      toggle: (name, force) => force === undefined ? (classes.has(name) ? classes.delete(name) : classes.add(name)) : (force ? classes.add(name) : classes.delete(name)),
    },
    addEventListener(type, fn) { listeners[type] = fn; },
    setAttribute() {},
    appendChild(child) { this.children.push(child); },
    replaceChildren(...children) { this.children = children; },
    ...extra,
  };
}

function loadGame() {
  const ids = ['game', 'score', 'level', 'chapter', 'lives', 'overlay', 'overlayTitle', 'overlayText', 'startButton', 'pauseButton', 'levelsButton', 'levelsOverlay', 'levelGrid', 'levelsProgress', 'closeLevels'];
  const nodes = Object.fromEntries(ids.map(id => [id, makeNode(id)]));
  const directions = ['up', 'left', 'down', 'right'].map(dir => {
    const button = makeNode(dir);
    button.dataset.dir = dir;
    return button;
  });
  const gradients = { addColorStop() {} };
  const ctx = new Proxy({ createLinearGradient: () => gradients, createRadialGradient: () => gradients }, {
    get(target, key) {
      if (!(key in target)) target[key] = () => {};
      return target[key];
    },
    set(target, key, value) { target[key] = value; return true; },
  });
  nodes.game.getContext = () => ctx;
  nodes.game.setPointerCapture = () => {};
  const storage = new Map();
  let raf;
  let now = 0;
  const documentListeners = {};
  const sandbox = {
    console,
    Math,
    JSON,
    Date,
    navigator: { vibrate() {} },
    performance: { now: () => now },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    requestAnimationFrame: fn => { raf = fn; return 1; },
    document: {
      hidden: false,
      getElementById: id => nodes[id],
      querySelectorAll: selector => selector === '[data-dir]' ? directions : [],
      createElement: tag => makeNode(tag),
      addEventListener: (type, fn) => { documentListeners[type] = fn; },
    },
    addEventListener: (type, fn) => { sandbox.windowListeners[type] = fn; },
    windowListeners: {},
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const file of ['crosswalk/rules.js', 'crosswalk/levels.js', 'crosswalk/game.js']) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  }
  return { sandbox, nodes, directions, documentListeners, tick: timestamp => { now = timestamp; raf(timestamp); } };
}

test('Crosswalk runtime starts from the title state and accepts touch movement', () => {
  const runtime = loadGame();
  runtime.nodes.startButton.listeners.click();
  const initial = runtime.sandbox.CrosswalkGame.getSnapshot();
  assert.equal(initial.state, 'playing');
  assert.equal(initial.level, 1);
  assert.equal(initial.levelIndex, 0);
  assert.equal(initial.lives, 3);
  assert.equal(initial.score, 0);
  assert.equal(initial.laneCount, 6);
  runtime.directions[0].listeners.pointerdown({ preventDefault() {} });
  assert.equal(runtime.sandbox.CrosswalkGame.getSnapshot().score, 10);
  runtime.nodes.pauseButton.listeners.click();
  assert.equal(runtime.sandbox.CrosswalkGame.getSnapshot().state, 'paused');
  assert.equal(runtime.nodes.overlayTitle.textContent, 'PAUSED');
  runtime.nodes.startButton.listeners.click();
  assert.equal(runtime.sandbox.CrosswalkGame.getSnapshot().state, 'playing');
});

test('Crosswalk renders all level cards and only the first level is initially unlocked', () => {
  const runtime = loadGame();
  runtime.nodes.levelsButton.listeners.click();
  assert.equal(runtime.nodes.levelsOverlay.classList.contains('show'), true);
  assert.equal(runtime.nodes.levelGrid.children.length, 20);
  assert.equal(runtime.nodes.levelGrid.children.filter(card => !card.disabled).length, 1);
  assert.equal(runtime.nodes.levelsProgress.textContent, '0 / 20 COMPLETE');
});

test('Crosswalk pause and visibility handlers do not advance the simulation while paused', () => {
  const runtime = loadGame();
  runtime.nodes.startButton.listeners.click();
  runtime.tick(100);
  const before = runtime.sandbox.CrosswalkGame.getSnapshot();
  runtime.nodes.pauseButton.listeners.click();
  runtime.tick(1000);
  const after = runtime.sandbox.CrosswalkGame.getSnapshot();
  assert.equal(after.state, 'paused');
  assert.equal(after.score, before.score);
  runtime.documentListeners.visibilitychange();
});
