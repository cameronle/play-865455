const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { boot } = require('./helpers/melon-runtime');

const css = () => fs.readFileSync('melon-lab/style.css', 'utf8');

test('Melon Lab uses a single one-pixel frame across all responsive layouts', () => {
  const source = css();
  assert.match(source, /--frame-width:\s*1px\s*;/);
  const declarations = [...source.matchAll(/\b(?:border(?:-(?:top|right|bottom|left))?(?:-width)?|outline):\s*([^;{}]+)/g)];
  assert.ok(declarations.length > 15);
  for (const [, value] of declarations) {
    assert.match(value, /^(?:0\b|none\b|var\(--frame-width\)|1px\b)/, `Inconsistent frame: ${value}`);
  }
});

test('Melon Lab filled action labels keep dark ink in both themes', () => {
  const source = css();
  assert.ok(source.includes('--button-ink: #3b302b;'), 'Filled controls need theme-independent readable ink');
  const rule = source.match(/\.overlay button, \.stir-button, \.mobile-actions button \{([^}]+)\}/)[1];
  assert.match(rule, /color:\s*var\(--button-ink\)/);
});

test('Melon Lab removes offset hard shadows that read as a second thick frame', () => {
  assert.ok(!/box-shadow:\s*(?!inset|none)[^;{}]*var\(--(?:ink|shadow)\)/.test(css()), 'Panel, arena and button hard shadows must not thicken the frame');
});

test('Melon Lab pool and danger strokes stay one CSS pixel after canvas resize', () => {
  const b = boot();
  const ctx = b.nodes.game.getContext('2d');
  const strokes = [];
  ctx.stroke = () => strokes.push({ color: ctx.strokeStyle, width: ctx.lineWidth });
  for (const width of [214, 282, 390, 508, 720, 0]) {
    b.nodes.game.getBoundingClientRect = () => ({ width });
    b.emit('window', 'resize');
    strokes.length = 0;
    b.test.draw();
    for (const color of ['#3b302b', '#e97883']) {
      const stroke = strokes.find(item => item.color === color);
      assert.ok(stroke, `Missing pool/danger stroke ${color}`);
      const cssWidth = stroke.width * (width || 720) / 720;
      assert.ok(Math.abs(cssWidth - 1) < 1e-9, `${color}: ${cssWidth}px at canvas ${width}px`);
    }
  }
});
