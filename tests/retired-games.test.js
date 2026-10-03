const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const catalog = require('../data/games.js');

const ROOT = path.resolve(__dirname, '..');
const retired = ['simon', 'lunar-lander', 'solitaire', 'color-bounce', 'space-invaders'];

for (const game of retired) {
  test(`retired game ${game} is absent from source and public metadata`, () => {
    assert.equal(catalog.some(entry => entry.id === game || entry.path === game), false, 'not in catalog');
    assert.equal(fs.existsSync(path.join(ROOT, game)), false, 'no game assets remain');
    for (const file of ['index.html', 'i18n.js', 'README.md', 'clear-game-data.js']) {
      assert.equal(fs.readFileSync(path.join(ROOT, file), 'utf8').includes(game), false, `${file} has no retired reference`);
    }
  });
}

test('retired entrypoints and nested assets redirect to the launcher', () => {
  const redirects = fs.readFileSync(path.join(ROOT, '_redirects'), 'utf8').trim().split(/\r?\n/);
  for (const game of retired) {
    for (const suffix of ['', '/', '/*']) {
      assert.ok(redirects.includes(`/${game}${suffix} / 301`), `${game}${suffix} redirects home`);
    }
  }
});

test('Pages build omits retired games and retains all current game entrypoints', () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'play-865455-pages-retired-'));
  try {
    execFileSync(process.execPath, ['scripts/stage-pages.js', output], {cwd: ROOT, stdio: 'pipe'});
    for (const game of retired) assert.equal(fs.existsSync(path.join(output, game)), false, game);
    for (const game of catalog) assert.ok(fs.existsSync(path.join(output, game.path, 'index.html')), game.path);
  } finally {
    fs.rmSync(output, {recursive: true, force: true});
  }
});
