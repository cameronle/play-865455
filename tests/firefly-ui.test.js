const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('Firefly keeps zoom, semantic upgrade dialog and a contained utility dock',()=>{
 const html=fs.readFileSync('firefly-watch/index.html','utf8');
 assert.doesNotMatch(html,/user-scalable=no/);
 for(const id of ['utilityDock','vitals'])assert.match(html,new RegExp(`id="${id}"`));
 assert.match(html,/role="dialog"/);assert.match(html,/tabindex="0"/);
});
test('Firefly screen-space vitals replace unreadable scaled Canvas labels',()=>{
 const js=fs.readFileSync('firefly-watch/game.js','utf8'),css=fs.readFileSync('firefly-watch/style.css','utf8');
 assert.doesNotMatch(js,/function drawStatus/);assert.match(css,/align-content:start/);
});
test('Firefly has height-bounded portrait and landscape playfields without fixed utility overlap',()=>{
 const css=fs.readFileSync('firefly-watch/style.css','utf8');
 assert.match(css,/100dvh/);assert.match(css,/orientation:landscape/);assert.match(css,/\.utility-dock/);
 assert.match(css,/min-height:44px/);assert.match(css,/focus-visible/);
});
