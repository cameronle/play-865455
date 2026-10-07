const test = require('node:test');
const assert = require('node:assert/strict');
const {loadSokoban} = require('./helpers/sokoban-runtime');
const fs = require('node:fs');

test('the bear has round brown ears and a separate light muzzle at real render time', () => {
  const app = loadSokoban(), curves = [];
  app.context.ellipse = (...args) => curves.push({args, color:app.context.fillStyle});
  app.document.emit('themechange');
  assert.ok(curves.filter(c => c.color === '#ad7b56').length >= 4,
    'brown head, body and two round ears must be rendered rather than a block avatar');
  assert.ok(curves.some(c => c.color === '#edcfaa'), 'the muzzle must remain distinguishable from the brown face');
  assert.deepEqual(app.invalidStyles, []);
});

test('goal pads remain readable before and after a crate arrives', () => {
  const app = loadSokoban({levels:[['#####','#@$.#','#####']]}), pads=[];
  app.context.roundRect = (x,y,w,h,r) => pads.push({w,h,fill:app.context.fillStyle,stroke:app.context.strokeStyle});
  app.document.emit('themechange');
  assert.ok(pads.some(p => p.fill === '#e7f0e9' && p.stroke === '#638675'),
    'empty goals must be quiet green floor pads rather than face-like pink marks');
  pads.length=0; app.move(1,0);
  const s=Math.floor(560/5);
  assert.ok(pads.some(p => p.stroke === '#638675' && p.w>s*.8),
    'completed goal outline must stay visible beyond the crate');
  assert.equal(app.snapshot().gamePhase,'complete');
  assert.deepEqual(app.invalidStyles, []);
});

test('the quiet UI and both themes use role-specific vector tokens and fresh asset keys', () => {
  const css=fs.readFileSync('sokoban/style.css','utf8'), js=fs.readFileSync('sokoban/game.js','utf8'), html=fs.readFileSync('sokoban/index.html','utf8');
  for (const role of ['bear','bear-muzzle','crate','goal','fruit']) {
    assert.ok(css.includes(`--${role}:`), `${role} needs its own palette token`);
    assert.ok(js.includes(`get('--${role}'`), `${role} token must reach the actual renderer`);
  }
  assert.match(css,/\[data-theme="dark"\][\s\S]*--bear:/);
  assert.match(css,/\.stats>div\{[^}]*border:0/);
  assert.doesNotMatch(css,/ui-rounded|SF Pro Rounded|linear-gradient|radial-gradient/);
  for (const asset of ['style.css','game.js','favicon.svg']) assert.ok(html.includes(`${asset}?v=flat-vector-1`));
});
