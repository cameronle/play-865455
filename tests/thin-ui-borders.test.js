'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const games = require('../data/games.js');
const root = path.resolve(__dirname, '..');
const partitions = {
  sudoku: new Set(['.cell:nth-child(3n)', '.cell:nth-child(n+19):nth-child(-n+27),.cell:nth-child(n+46):nth-child(-n+54)']),
  nonogram: new Set(['.corner', '.col-clues', '.row-clues', '.cell.major-right', '.cell.major-bottom']),
};
function styles(game) {
  const dir = path.join(root, game.path);
  const css = fs.readdirSync(dir).filter(name => name.endsWith('.css')).map(name => fs.readFileSync(path.join(dir, name), 'utf8'));
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  for (const match of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) css.push(match[1]);
  assert.ok(css.length, `${game.path}: route stylesheet missing`);
  return css.join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
}
function declarations(css) {
  const result = [];
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = match[1].trim().replace(/\s+/g, ' ');
    for (const item of match[2].matchAll(/([\w-]+)\s*:\s*([^;{}]+)/g)) result.push({selector, property:item[1], value:item[2].trim()});
  }
  return result;
}
test('all catalog games use at most one CSS pixel for UI borders at every breakpoint', () => {
  const violations = [];
  for (const game of games) {
    for (const decl of declarations(styles(game))) {
      if (!/^border(?:-(?:top|right|bottom|left))?(?:-width)?$/.test(decl.property)) continue;
      const maximum = partitions[game.path]?.has(decl.selector) ? 2 : 1;
      for (const match of decl.value.matchAll(/(?<![\w.])([\d.]+)px\b/g)) {
        if (Number(match[1]) > maximum) violations.push(`${game.path} ${decl.selector} ${decl.property}: ${decl.value}`);
      }
    }
  }
  assert.deepEqual(violations, [], 'Only meaningful puzzle partitions may be thicker than the shared 1px frame');
});
test('game UI surfaces do not gain a second heavy frame through offset shadows', () => {
  const violations = [];
  for (const game of games) {
    for (const decl of declarations(styles(game))) {
      if (decl.property !== 'box-shadow' || /^none(?:\s*!important)?$/.test(decl.value)) continue;
      // Fruit shading/seeds are original icon artwork, not UI frames.
      if (game.path === 'melon-lab' && /(?:\.route-fruit|\.next-fruit)/.test(decl.selector)) continue;
      // A keyboard cursor must remain visible within the puzzle cells.
      if (game.path === 'nonogram' && decl.selector === '.cell.cursor') continue;
      violations.push(`${game.path} ${decl.selector}: ${decl.value}`);
    }
  }
  assert.deepEqual(violations, [], 'Panels, playfields and buttons should retain only their thin border');
});
