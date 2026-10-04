const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {boot,fruit}=require('./helpers/melon-runtime');
test('Melon Lab keeps browser zoom and scopes selection protection to its game shell',()=>{
 const html=fs.readFileSync('melon-lab/index.html','utf8'),css=fs.readFileSync('melon-lab/style.css','utf8');assert.doesNotMatch(html,/user-scalable=no|maximum-scale=1/);assert.match(css,/\.page\s*\{[^}]*-webkit-user-select:\s*none/s);assert.match(css,/-webkit-touch-callout:\s*none/);
});
test('short viewport sizing and in-flow utility dock keep primary controls with the arena',()=>{
 const html=fs.readFileSync('melon-lab/index.html','utf8'),css=fs.readFileSync('melon-lab/style.css','utf8');assert.match(html,/id="utilityDock"/);assert.ok(html.indexOf('class="mobile-actions"')<html.indexOf('</aside>'));assert.match(css,/100dvh/);assert.match(css,/height:\s*44px/);assert.match(html,/id="profileStatus"/);assert.match(html,/id="routeSummary"/);
});
test('docked utilities reset the shared floating-button transform and use readable ink',()=>{
 const css=fs.readFileSync('melon-lab/style.css','utf8');assert.match(css,/\.utility-dock \.theme-toggle, \.utility-dock \.clear-data-toggle \{[^}]*transform:\s*none/s);assert.match(css,/\.utility-dock \.theme-toggle, \.utility-dock \.clear-data-toggle \{[^}]*color:\s*var\(--ink\)/s);
});
test('mobile route has a swipe cue and keyboard-only help is separated',()=>{
 const html=fs.readFileSync('melon-lab/index.html','utf8');assert.match(html,/class="route-hint"/);assert.match(html,/class="keyboard-hint"/);const js=fs.readFileSync('melon-lab/game.js','utf8');assert.match(js,/canvasLabelPx/);assert.match(js,/10\*W\/width/);
});
test('physics-mode button keeps a 44px touch target at desktop and mobile widths',()=>{
 const css=fs.readFileSync('melon-lab/style.css','utf8'),base=css.match(/\.mode-button \{([^}]+)\}/)[1];assert.match(base,/min-height:\s*44px/);
});
test('public Melon Lab snapshot is detached and cannot mutate the pool or profile',()=>{
 const b=boot();b.test.start();b.test.set({fruits:[fruit(0,360,400)]});assert.equal(typeof b.window.MelonLab.getSnapshot,'function');const s=b.window.MelonLab.getSnapshot();s.fruits[0].x=-999;s.activeLevels[0]=999;assert.equal(b.test.get().fruits[0].x,360);assert.equal(b.window.MelonLab.getSnapshot().activeLevels[0],0);assert.ok(Object.isFrozen(b.window.MelonLab));
});
