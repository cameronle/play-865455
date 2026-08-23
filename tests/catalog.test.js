const test = require('node:test');
const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_PATH = path.join(ROOT, 'data', 'games.js');

test('canonical game catalog exists', () => {
  assert.ok(fs.existsSync(CATALOG_PATH), 'data/games.js must be the catalog source');
});

test('catalog covers every game directory with unique ordered metadata', () => {
  const games = require(CATALOG_PATH);
  const gameDirs = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter(entry => !entry.name.startsWith('.') && entry.isDirectory() && fs.existsSync(path.join(ROOT, entry.name, 'index.html')))
    .map(entry => entry.name)
    .sort();
  const ids = games.map(game => game.id);
  const paths = games.map(game => game.path);

  assert.equal(games.length, gameDirs.length);
  assert.deepEqual([...ids].sort(), gameDirs);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(paths).size, paths.length);
  assert.deepEqual(games.map(game => game.order), games.map((_, index) => index + 1));

  for (const game of games) {
    assert.equal(game.id, game.path);
    assert.ok(game.name.zh && game.name.en);
    assert.ok(game.description.zh && game.description.en);
    assert.ok(game.readme.title && game.readme.description);
  }

  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  const indexIds = [...index.matchAll(/data-game="([^"]+)"/g)].map(match => match[1]);
  const readmeIds = [...readme.matchAll(/^\- \[[^\]]+\]\(\.\/([^/]+)\/\)/gm)].map(match => match[1]);
  assert.deepEqual(indexIds, ids);
  assert.deepEqual(readmeIds, ids);
});

test('generated launcher metadata is up to date', () => {
  childProcess.execFileSync(process.execPath, ['scripts/generate-catalog.js', '--check'], {
    cwd: ROOT,
    stdio: 'pipe'
  });
});

test('catalog validation ignores the hidden Pages staging directory', () => {
  const staging = path.join(ROOT, '.pages-deploy');
  fs.mkdirSync(staging, { recursive: true });
  fs.writeFileSync(path.join(staging, 'index.html'), '<!doctype html>');
  try {
    childProcess.execFileSync(process.execPath, ['scripts/generate-catalog.js', '--check'], {
      cwd: ROOT,
      stdio: 'pipe'
    });
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
});
