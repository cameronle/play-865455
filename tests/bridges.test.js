const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { levels } = require('../bridges/levels.js');
const rules = require('../bridges/rules.js');

test('Bridges ships 30 ordered levels across 3 board sizes', () => {
  assert.equal(levels['4x4'].length, 10);
  assert.equal(levels['6x6'].length, 10);
  assert.equal(levels['8x8'].length, 10);
  for (const pack of ['4x4', '6x6', '8x8']) {
    for (const level of levels[pack]) {
      assert.ok(level.islands.length >= 4);
      assert.ok(level.islands.every(isl => isl.count > 0 && isl.r >= 0 && isl.c >= 0));
    }
  }
});

test('Bridges rules find straight unobstructed orthogonal neighbors', () => {
  const level = {
    rows: 4, cols: 4,
    islands: [
      { id: 0, r: 0, c: 0, count: 2 },
      { id: 1, r: 0, c: 2, count: 3 },
      { id: 2, r: 0, c: 3, count: 1 },
      { id: 3, r: 2, c: 0, count: 2 },
    ]
  };
  const neighbors0 = rules.findValidNeighbors(level, 0);
  assert.deepEqual(neighbors0.map(n => n.id).sort(), [1, 3]); // island 2 is blocked by 1
});

test('Bridges rules detect bridge crossing collisions', () => {
  const isls = [
    { id: 0, r: 1, c: 0 },
    { id: 1, r: 1, c: 3 },
    { id: 2, r: 0, c: 1 },
    { id: 3, r: 3, c: 1 },
  ];
  // H bridge from 0 to 1 crosses V bridge from 2 to 3
  assert.equal(rules.bridgesCross(isls[0], isls[1], isls[2], isls[3]), true);
  // Non-crossing parallel or non-intersecting
  const isls2 = [
    { id: 0, r: 0, c: 0 },
    { id: 1, r: 0, c: 3 },
    { id: 2, r: 1, c: 0 },
    { id: 3, r: 1, c: 3 },
  ];
  assert.equal(rules.bridgesCross(isls2[0], isls2[1], isls2[2], isls2[3]), false);
});

test('Bridges validates island count satisfaction and connected graph', () => {
  const level = {
    rows: 3, cols: 3,
    islands: [
      { id: 0, r: 0, c: 0, count: 1 },
      { id: 1, r: 0, c: 2, count: 2 },
      { id: 2, r: 2, c: 2, count: 1 },
    ]
  };
  const bridges = {
    '0-1': 1,
    '1-2': 1
  };
  assert.equal(rules.isLevelComplete(level, bridges), true);

  const incompleteBridges = {
    '0-1': 1
  };
  assert.equal(rules.isLevelComplete(level, incompleteBridges), false);
});

test('Bridges page is a complete themed mobile static entrypoint', () => {
  const html = fs.readFileSync('bridges/index.html', 'utf8');
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /user-scalable=no/);
  assert.match(html, /id="board"/);
  assert.match(html, /id="levelsOverlay"/);
  assert.match(html, /rules\.js\?v=/);
  assert.match(html, /levels\.js\?v=/);
  assert.match(html, /game\.js\?v=/);
  assert.match(fs.readFileSync('bridges/style.css', 'utf8'), /touch-action:\s*none/);
});
