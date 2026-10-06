const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const catalog = require('../data/games.js');

const ROOT = process.cwd();
const source = fs.readFileSync('clear-game-data.js', 'utf8');
const games = catalog.map(game => game.path);

function boot(route, initialKeys) {
  const storage = {};
  for (const key of initialKeys) storage[key] = 'saved';
  const storageMethods = {
    getItem(key) { return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null; },
    setItem(key, value) { storage[key] = String(value); },
    removeItem(key) { delete storage[key]; }
  };
  for (const [name, fn] of Object.entries(storageMethods)) Object.defineProperty(storage, name, {value: fn, enumerable: false});

  let sessionCleared = false;
  let reloaded = false;
  const deletedCaches = [];
  const buttons = [];
  const document = {
    readyState: 'complete',
    querySelector: () => null,
    createElement: () => ({
      type: '', className: '', textContent: '', title: '', disabled: false,
      setAttribute() {},
      addEventListener(type, handler) { if (type === 'click') this.clickHandler = handler; }
    }),
    body: {appendChild(button) { buttons.push(button); }},
    addEventListener() {}
  };
  const sessionStorage = {clear() { sessionCleared = true; }};
  const caches = {
    async keys() { return ['game-cache']; },
    async delete(name) { deletedCaches.push(name); return true; }
  };
  const location = {pathname: `/${route}/`, reload() { reloaded = true; }};
  let confirmation='';const window = {confirm: message=>{confirmation=message;return true;}, caches, location, dispatchEvent(event) { assert.equal(event.type, "game-data-clearing"); return true; }};
  const sandbox = {document, localStorage: storage, sessionStorage, caches, location, window, console, Event: class { constructor(type) { this.type = type; } }};
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return {storage, buttons, sessionCleared: () => sessionCleared, deletedCaches, reloaded: () => reloaded,confirmation:()=>confirmation};
}

for (const route of ['fish-feast', 'helicopter-cave', 'connect-four', 'maze']) {
  test(`retired game ${route} does not install controls or erase existing records`, () => {
    const keys = ['maze-high', 'fish-feast-progress-v1', 'fish-feast-settings-v1', 'helicopterCaveBest', 'connectFourRecord', 'connectFourGame-v1', 'classic-snake-high-score', 'play-lang', 'play-theme'];
    const app = boot(route, keys);
    assert.equal(app.buttons.length, 0);
    for (const key of keys) assert.equal(app.storage[key], 'saved');
    assert.equal(app.reloaded(), false);
  });
}
test('every game page loads the shared clear-data utility', () => {
  assert.equal(games.length, catalog.length);
  for (const game of games) {
    const html = fs.readFileSync(`${game}/index.html`, 'utf8');
    assert.match(html, /src="\/clear-game-data\.js\?v=[a-zA-Z0-9-]+"/, `${game} clear-data script`);
  }
});

test('clear-data utility removes only the current game data and preserves shared preferences', async () => {
  const app = boot('sokoban', ['sokobanUnlocked', 'sokobanBest03', 'play-theme', 'play-lang', 'sudokuBest-easy']);
  assert.equal(app.buttons.length, 1);
  await app.buttons[0].clickHandler();
  assert.equal(app.storage.sokobanUnlocked, undefined);
  assert.equal(app.storage.sokobanBest03, undefined);
  assert.equal(app.storage['play-theme'], 'saved');
  assert.equal(app.storage['play-lang'], 'saved');
  assert.equal(app.storage['sudokuBest-easy'], 'saved');
  assert.equal(app.sessionCleared(), true);
  assert.deepEqual(app.deletedCaches, ['game-cache']);
  assert.equal(app.reloaded(), true);
});

test('Bubble Frontier clear preserves neighboring game scores and shared preferences', async()=>{const app=boot('bubble-tanks',['bubble_frontier_save','bubble_frontier_records','bubble_frontier_settings','fireflyWatchBest','play-lang','play-theme']);assert.equal(app.buttons.length,1);await app.buttons[0].clickHandler();for(const key of ['bubble_frontier_save','bubble_frontier_records','bubble_frontier_settings'])assert.equal(app.storage[key],undefined);for(const key of ['fireflyWatchBest','play-lang','play-theme'])assert.equal(app.storage[key],'saved');});

test('Sky Patrol clear removes both record generations by exact key only',async()=>{const app=boot('shooter',['sky-patrol-best','sky-patrol-records-v2','sky-patrol-records-v2-backup','fireflyWatchBest','play-lang','play-theme']);await app.buttons[0].clickHandler();for(const key of ['sky-patrol-best','sky-patrol-records-v2'])assert.equal(app.storage[key],undefined);for(const key of ['sky-patrol-records-v2-backup','fireflyWatchBest','play-lang','play-theme'])assert.equal(app.storage[key],'saved');});

test('2048 clear removes its saved turn and best without erasing other games', async () => {
  const app = boot('2048', ['play-2048-best', 'play-2048-save-v1', 'play-theme', 'play-lang', 'sky-patrol-best']);
  await app.buttons[0].clickHandler();
  assert.equal(app.storage['play-2048-best'], undefined);
  assert.equal(app.storage['play-2048-save-v1'], undefined);
  for (const key of ['play-theme','play-lang','sky-patrol-best']) assert.equal(app.storage[key], 'saved');
});

test('staged public root includes the clear-data utility', () => {
  const stage = fs.readFileSync('scripts/stage-pages.js', 'utf8');
  assert.match(stage, /clear-game-data\.js/);
});
