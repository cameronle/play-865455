const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('maze/index.html','utf8');
const css = fs.readFileSync('maze/style.css','utf8');
const js = fs.readFileSync('maze/game.js','utf8');

test('Maze ships one renderer and cache-busted audited assets without QA hooks', () => {
  assert.equal((js.match(/function draw\(\)/g)||[]).length,1);
  assert.doesNotMatch(js,/__maze(?:Observe|QA|\s*=)/);
  assert.ok(html.includes('style.css?v=thin-ui-1'));
  assert.ok(html.includes('game.js?v=cat-ghosts-audit-2'));
  assert.ok(html.indexOf('logic.js?')<html.indexOf('game.js?'));
});
test('Maze short landscape has visible direction controls and in-flow utilities', () => {
  assert.match(css,/@media\(max-width:950px\) and \(max-height:500px\) and \(orientation:landscape\)[\s\S]*\.mobile-controls\{display:grid/);
  assert.match(css,/\.utility-dock \.theme-toggle,\.utility-dock \.clear-data-toggle\{position:static/);
  assert.match(css,/100dvh - 310px/);
  assert.match(css,/min-height:44px/);
});
function declarations(text) { return Object.fromEntries([...text.matchAll(/(--[\w-]+)\s*:\s*([^;}]*)/g)].map(m=>[m[1],m[2].trim()])); }
function luminance(hex) {
  const s=hex.replace('#','');const v=[0,2,4].map(i=>parseInt(s.slice(i,i+2),16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
  return v[0]*.2126+v[1]*.7152+v[2]*.0722;
}
function ratio(a,b) { const x=[luminance(a),luminance(b)].sort((x,y)=>x-y);return (x[1]+.05)/(x[0]+.05); }
test('Maze HUD text and action labels meet 4.5:1 in both themes', () => {
  const light=declarations([...css.matchAll(/:root\{([^}]*)\}/g)].map(m=>m[1]).join(';'));
  const dark={...light,...declarations([...css.matchAll(/\[data-theme="dark"\]\{([^}]*)\}/g)].map(m=>m[1]).join(';'))};
  for(const [mode,p] of Object.entries({light,dark})) {
    for(const key of ['--score-ink','--best-ink','--room-ink','--ink','--muted']) assert.ok(ratio(p[key],p['--panel'])>=4.5,`${mode}: ${key}`);
    assert.ok(ratio('#3d3832',p['--yellow'])>=4.5,`${mode}: start`);
  }
  assert.ok(ratio('#111826','#0288d1')>=4.5,'light NEW');
});
