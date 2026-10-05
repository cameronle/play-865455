const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const catalog = require('../data/games.js');

test('retired tennis route is absent from source and public catalog', () => {
  assert.equal(fs.existsSync('pong'), false);
  assert.equal(catalog.some(game => game.id === 'pong'), false);
  assert.deepEqual(catalog.map(game => game.order), Array.from({length: catalog.length}, (_, i) => i + 1));
  for (const file of ['index.html','i18n.js','clear-game-data.js']) {
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /pong|TIDAL TENNIS|潮汐网球/);
  }
});

test('retired route variants redirect to the launcher', () => {
  const redirects = fs.readFileSync('_redirects', 'utf8').split('\n');
  for (const route of ['/pong','/pong/','/pong/*']) assert.ok(redirects.includes(`${route} / 301`));
});
