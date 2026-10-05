"use strict";
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {createHopper} = require('./helpers/doodle-harness');
const {createCave} = require('./helpers/cave-runtime');
const {boot: createMelon, fruit} = require('./helpers/melon-runtime');

function tokens(route, theme) {
  const css = fs.readFileSync(`${route}/style.css`, 'utf8'), values = {};
  for (const selector of [':root', theme === 'dark' ? '[data-theme="dark"]' : '[data-theme="light"]']) {
    const start = css.indexOf(selector + ' {');
    if (start < 0) continue;
    const block = css.slice(start, css.indexOf('}', start));
    for (const match of block.matchAll(/(--[a-z-]+)\s*:\s*([^;]+);/g)) values[match[1]] = match[2].trim();
  }
  return values;
}
function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map(c => parseInt(c, 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
  return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
}
function contrast(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
for (const theme of ['light', 'dark']) {
  test(`Sky Hop ${theme}: flat hero stands out from platforms on a quiet solid field`, () => {
    const css = tokens('sky-hopper', theme), calls = [];
    for (const name of ['--hero-body', '--hero-mark', '--cue', '--paper']) assert.match(css[name] || '', /^#[\da-f]{6}$/i, `${name} must be theme-specific`);
    assert.notEqual(css['--hero-body'], css['--mint'], 'hero must not share the normal platform fill');
    assert.ok(contrast(css['--hero-body'],css['--paper']) >= 3,'player silhouette must remain distinct');
    assert.ok(contrast(css['--hero-mark'],css['--hero-body']) >= 4.5,'animal face must remain readable');
    const g = createHopper(1, {css, onDraw: c => calls.push(c)});
    g.run('reset()');const before = g.snapshot();
    function draw(code) { calls.length = 0; g.run(code); return calls.slice(); }
    const background=draw('drawBackground(palette())');
    assert.deepEqual(background.map(c=>c.method),['fillRect']);
    assert.equal(background[0].fill,css['--paper']);
    const hero = draw('drawPlayer(palette())');
    assert.equal(hero.find(c => c.method === 'fill').fill, css['--hero-body']);
    for(const [type,token]of Object.entries({normal:'--mint',moving:'--blue',breaking:'--coral',spring:'--yellow',fading:'--purple'})){
      const platform=draw(`drawPlatform({x:50,y:450,w:80,h:12,type:'${type}',alpha:1},palette())`);
      assert.equal(platform.find(c=>c.method==='fill').fill,css[token]);
      if(type!=='normal')assert.ok(contrast(css['--cue'],css[token])>=4.5,'platform cues need non-color readability');
    }
    const star = draw('drawStar({x:100,y:100,r:10,phase:0},palette())');
    assert.equal(star.find(c => c.method === 'fill').fill, css['--yellow']);
    assert.deepEqual(g.snapshot(), before, 'palette drawing must not mutate gameplay');
  });
}

test('Firefly Cave light: the gold body has a thin high-contrast outline without enlarging its geometry', () => {
  const calls = [], g = createCave({onDraw: c => calls.push(c)}), before = g.snapshot();
  calls.length = 0;
  g.run('drawFirefly(true)');
  const outline = calls.find(c => c.method === 'stroke');
  assert.ok(contrast(outline.stroke, '#f2ce68') >= 3, 'body outline must separate gold from the cream channel');
  assert.equal(outline.lineWidth, 2);
  assert.equal(outline.shadowBlur, 0, 'outline must not add another glow');
  assert.deepEqual(calls.find(c => c.method === 'ellipse').args, [0,0,20,13,0,0,Math.PI*2]);
  assert.deepEqual(g.snapshot(), before);
});
test('Firefly Cave dark: keep the original glowing body and single blue tail stroke', () => {
  const calls = [], g = createCave({onDraw: c => calls.push(c)});
  calls.length = 0;
  g.run('drawFirefly(false)');
  assert.equal(calls.find(c => c.method === 'fill').fill, '#f2ce68');
  assert.equal(calls.filter(c => c.method === 'stroke').length, 1);
  assert.equal(calls.find(c => c.method === 'stroke').stroke, '#80c7df');
});

for (const theme of ['light', 'dark']) {
  test(`Melon Lab ${theme}: distinguish the kiwi landing-guide edge while retaining its faint fill`, () => {
    const css = tokens('melon-lab', theme), calls = [];
    const g = createMelon({css, onDraw: c => calls.push(c)}), p = g.test.palette();
    g.test.set({state:'playing', nextLevel:0, aimX:360});
    const before = g.snapshot();
    calls.length = 0;
    g.test.drawAim(p);
    const kiwiColor = require('../melon-lab/rules').FRUITS[0].color;
    assert.deepEqual(calls.filter(c => c.method === 'fill' && c.fill === kiwiColor).map(c => c.alpha), [.12, .72], 'guide fill and next-sample fill must remain unchanged');
    const outlines = calls.filter(c => c.method === 'stroke' && c.stroke === p.ink);
    assert.equal(outlines.at(-1).alpha, .72, 'next sample is not the landing guide');
    if (theme === 'light') assert.ok(outlines.at(-2).alpha >= .3 && outlines.at(-2).alpha <= .5, 'only the light guide edge needs stronger contrast');
    else assert.equal(outlines.at(-2).alpha, .12, 'dark rendering must remain unchanged');
    assert.deepEqual(g.snapshot(), before, 'guide rendering must not create or change physical fruit');
    calls.length = 0;
    g.nodes.game.getContext('2d').globalAlpha = 1;
    g.test.drawFruit(fruit(0, 360, 620), p);
    assert.ok(calls.filter(c => c.method === 'fill' || c.method === 'stroke').every(c => c.alpha === 1), 'physical fruit retains its opaque fill and edge');
  });
}
