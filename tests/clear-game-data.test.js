const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const ROOT = process.cwd();
const source = fs.readFileSync('clear-game-data.js', 'utf8');
const games = fs.readdirSync(ROOT, {withFileTypes: true})
  .filter(entry => entry.isDirectory() && fs.existsSync(`${entry.name}/index.html`))
  .map(entry => entry.name);

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
  const window = {confirm: () => true, caches, location};
  const sandbox = {document, localStorage: storage, sessionStorage, caches, location, window, console};
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return {storage, buttons, sessionCleared: () => sessionCleared, deletedCaches, reloaded: () => reloaded};
}

test('every game page loads the shared clear-data utility', () => {
  assert.equal(games.length, 27);
  for (const game of games) {
    const html = fs.readFileSync(`${game}/index.html`, 'utf8');
    assert.match(html, /src="\/clear-game-data\.js\?v=clear-1"/, `${game} clear-data script`);
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

test('staged public root includes the clear-data utility', () => {
  const stage = fs.readFileSync('scripts/stage-pages.js', 'utf8');
  assert.match(stage, /clear-game-data\.js/);
});
