const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { levels } = require('../flow/levels.js');
const rules = require('../flow/rules.js');

test('Flow Free ships 40 ordered levels across 4 board sizes', () => {
  assert.equal(levels['5x5'].length, 10);
  assert.equal(levels['6x6'].length, 10);
  assert.equal(levels['7x7'].length, 10);
  assert.equal(levels['8x8'].length, 10);
  for (const pack of ['5x5', '6x6', '7x7', '8x8']) {
    for (const level of levels[pack]) {
      assert.ok(level.endpoints.length >= 3);
      assert.ok(level.endpoints.every(ep => ep.start && ep.end));
    }
  }
});

test('Flow Free rules validate neighbor adjacency and path connections', () => {
  assert.equal(rules.isAdjacent({ r: 0, c: 0 }, { r: 0, c: 1 }), true);
  assert.equal(rules.isAdjacent({ r: 0, c: 0 }, { r: 1, c: 1 }), false);
  assert.equal(rules.isAdjacent({ r: 2, c: 3 }, { r: 1, c: 3 }), true);
});

test('Flow Free detects complete board flow and all pairs connected', () => {
  const level = {
    size: 2,
    endpoints: [
      { color: 0, start: [0, 0], end: [1, 0] },
      { color: 1, start: [0, 1], end: [1, 1] }
    ]
  };
  const solvedPaths = {
    0: [{ r: 0, c: 0 }, { r: 1, c: 0 }],
    1: [{ r: 0, c: 1 }, { r: 1, c: 1 }]
  };
  assert.equal(rules.isLevelComplete(level, solvedPaths), true);

  const incompletePaths = {
    0: [{ r: 0, c: 0 }, { r: 1, c: 0 }],
    1: [{ r: 0, c: 1 }]
  };
  assert.equal(rules.isLevelComplete(level, incompletePaths), false);
});

test('Flow Free page is a complete themed mobile static entrypoint', () => {
  const html = fs.readFileSync('flow/index.html', 'utf8');
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /user-scalable=no/);
  assert.match(html, /id="board"/);
  assert.match(html, /id="levelsOverlay"/);
  assert.match(html, /rules\.js\?v=/);
  assert.match(html, /levels\.js\?v=/);
  assert.match(html, /game\.js\?v=/);
  assert.match(fs.readFileSync('flow/style.css', 'utf8'), /touch-action:\s*none/);
});
