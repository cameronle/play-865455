const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {loadCrosswalk}=require('./helpers/crosswalk-runtime.js');

test('safe medians at rows five and eight are visibly different from traffic lanes',()=>{
 const a=loadCrosswalk(),rows=[];a.ctx.fillRect=(x,y,w,h)=>{if(w===600&&h===60&&a.ctx.fillStyle==='#9eddbd')rows.push(y/60);};
 a.document.emit('themechange');a.step(20);assert.ok(rows.includes(5));assert.ok(rows.includes(8));
});



test('moving medians mark unsafe cells differently from permanently safe mint rows',()=>{
 const a=loadCrosswalk();a.start();a.load(11);const fills=[];a.ctx.fillRect=(x,y,w,h)=>{if(y===480&&w===600&&h===60)fills.push(a.ctx.fillStyle);};
 a.document.emit('themechange');a.step(20);assert.ok(fills.includes('#f28c78'));assert.ok(!fills.includes('#9eddbd'));
});

test('only one maintained renderer exists for each road entity',()=>{
 const src=fs.readFileSync('crosswalk/game.js','utf8');
 for(const name of ['drawRoad','drawBlocker','drawSignal','drawVehicle','drawPlayer','draw'])assert.equal((src.match(new RegExp('function '+name+'\\(','g'))||[]).length,1,name);
});

test('mobile shell has height-bounded board, normal-flow utilities and accessible controls',()=>{
 const html=fs.readFileSync('crosswalk/index.html','utf8'),css=fs.readFileSync('crosswalk/style.css','utf8');
 assert.doesNotMatch(html,/user-scalable=no/);assert.match(html,/id="game"[^>]*tabindex="0"/);
 assert.match(html,/id="utilityDock"/);assert.match(css,/100dvh/);assert.match(css,/body \.theme-toggle/);
 assert.match(css,/min-height:44px/);
});
