const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {loadSokoban}=require('./helpers/sokoban-runtime.js');

test('level navigation is visibly distinct from movement arrows',()=>{
 const html=fs.readFileSync('sokoban/index.html','utf8');
 assert.match(html,/id="previousButton"[^>]*>PREV<\/button>/);
 assert.match(html,/id="nextButton"[^>]*>NEXT<\/button>/);
});

test('completed crate leaves its goal frame visible outside the crate',()=>{
 const app=loadSokoban(),frames=[];
 app.context.strokeRect=(x,y,w,h)=>{if(app.context.strokeStyle==='#ff6b7a')frames.push({w,h});};
 app.context.fillRect=()=>{};
 app.context.stroke=()=>{};
 const tile=Math.floor(560/Math.max(app.snapshot().state.width,app.snapshot().state.height));
 // Drawing through the public theme-change listener uses the actual renderer.
 app.document.emit('themechange');
 assert.ok(frames.some(r=>r.w>tile*.76),'goal ring must protrude beyond the 76%-wide crate');
});

test('directly completing the last puzzle does not claim every puzzle is complete',()=>{
 const app=loadSokoban({levels:[['#####','#@$.#','#####'],['#####','#@$.#','#####']]});
 app.load(1);app.move(1,0);
 assert.equal(app.nodes.overlayTitle.textContent,'FINAL LEVEL CLEAR');
 assert.equal(app.timers.size,0);
});


test('every rendered token has valid colors and one maintained renderer',()=>{
 const app=loadSokoban();assert.deepEqual(app.invalidStyles,[]);
 const source=fs.readFileSync('sokoban/game.js','utf8');
 for(const name of ['draw','drawGoal','drawCrate','drawPlayer'])assert.equal((source.match(new RegExp('function '+name+'\\(','g'))||[]).length,1,name);
});

test('puzzle shell exposes keyboard board, selection, review and readable status',()=>{
 const html=fs.readFileSync('sokoban/index.html','utf8');
 assert.match(html,/id="game"[^>]*tabindex="0"/);
 for(const id of ['levelSelect','statusText','reviewButton'])assert.ok(html.includes(`id="${id}"`));
 assert.match(html,/aria-live="polite"/);
 assert.doesNotMatch(html,/user-scalable=no|overlay-spark/);
});
