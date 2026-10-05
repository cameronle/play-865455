'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../fish-feast/content.js'),R=require('../fish-feast/rules.js'),S=require('../fish-feast/simulation.js');
function context(){const calls=[],alpha=[];return{calls,alpha,ctx:new Proxy({},{get(_,key){return(...args)=>{calls.push([key,...args]);};},set(_,key,value){if(key==='globalAlpha')alpha.push(value);return true;}})};}
test('continuous fish silhouette keeps the exact contact capsule inside its visible core',()=>{
 const D=require('../fish-feast/render.js');assert.equal(typeof D.drawFish,'function','fish drawing is not independently exercisable');
 for(const shape of ['player',...Object.values(C.species).map(s=>s.shape)]){
  const f={shape,tier:2,x:0,y:0,vx:1,headingX:1,color:'mint'},g=R.geometry(f),{ctx,calls}=context();
  D.drawFish(ctx,f,0,D.palettes.light,1,shape==='player','en');
  assert.ok(calls.some(a=>a[0]==='arc'&&a[1]===g.half&&a[2]===0&&a[3]===g.ry&&a[4]===-Math.PI/2&&a[5]===Math.PI/2),'front contact semicircle is missing');
  assert.ok(calls.some(a=>a[0]==='arc'&&a[1]===-g.half&&a[2]===0&&a[3]===g.ry),'rear contact semicircle is missing');
  assert.ok(!calls.some(a=>a[0]==='roundRect'),'body is still the pasted rounded rectangle');
 }
});
test('each fish has a different connected tail/fin outline even at identical scale and color',()=>{
 const D=require('../fish-feast/render.js');assert.equal(typeof D.drawFish,'function');const traces=[];
 for(const shape of ['player',...Object.values(C.species).map(s=>s.shape)]){const {ctx,calls}=context();D.drawFish(ctx,{shape,tier:2,x:0,y:0,vx:1,headingX:1,color:'mint'},0,D.palettes.light,1,false);traces.push(JSON.stringify(calls.filter(a=>['moveTo','arc','lineTo','bezierCurveTo','quadraticCurveTo'].includes(a[0]))));}
 assert.equal(new Set(traces).size,traces.length);assert.ok(traces.every(t=>t.includes('bezierCurveTo')),'neck and tail are still disconnected straight triangles');
});
test('small food and hero tails stay readable at the initial narrow-phone scale',()=>{
 const D=require('../fish-feast/render.js');
 for(const [shape,tier,minimum]of [['slender',0,3],['player',1,7]]){
  const {ctx,calls}=context(),f={shape,tier,x:0,y:0,vx:1,headingX:1,color:'mint'},g=R.geometry(f);
  D.drawFish(ctx,f,0,D.palettes.dark,.47,shape==='player');
  const tail=calls.filter(a=>['bezierCurveTo','quadraticCurveTo'].includes(a[0])&&a.at(-2)<-g.rx);
  const halfHeight=Math.max(...tail.map(a=>Math.abs(a.at(-1))))*.47;
  assert.ok(halfHeight>=minimum,`${shape} tail half-height ${halfHeight} is unreadable on a narrow phone`);
 }
});
test('both initial and paused worlds render, fan tail is not a second body, and warnings stay legible',()=>{
 const D=require('../fish-feast/render.js'),s=S.create(760,520,1),{ctx,alpha}=context();
 assert.equal(typeof D.form,'function');assert.equal(D.form({...C.species.fry}).tail,'fan');
 assert.equal(D.form({...C.species.perch}).back,'sail');assert.equal(D.form({...C.species.hunter}).back,'blade');
 s.fish=[{...C.species.fry,x:100,y:100,vx:1,warning:0},{...C.species.hunter,x:600,y:150,vx:-1,warning:1}];
 D.draw(ctx,s,{palette:D.palettes.light,scale:.5});assert.ok(alpha.every(a=>a>=.4));
 S.start(s);S.pause(s);D.draw(ctx,s,{palette:D.palettes.dark,scale:.5,dpr:2,language:'zh'});assert.notEqual(D.palettes.light.water,D.palettes.dark.water);
 assert.doesNotMatch(fs.readFileSync('fish-feast/render.js','utf8'),/fillText\(f.warning/,'danger marker must remain screen-space geometry');
});
test('active objectives have non-color target marks and a visible short-lived combo cue',()=>{
 const D=require('../fish-feast/render.js'),s=S.create(760,520,1);S.start(s);s.fish=[{...C.species.perch,type:'perch',x:600,y:250,vx:1,warning:0}];s.goalStatus={kind:'revenge',type:'perch',tier:2};s.player.combo=3;s.player.lastMeal=1;s.time=1.2;
 const {ctx,calls}=context();D.draw(ctx,s,{palette:D.palettes.light,scale:.5,language:'zh'});
 assert.ok(calls.some(c=>c[0]==='fillText'&&c[1]==='◇'),'objective marker is missing');assert.ok(calls.some(c=>c[0]==='fillText'&&String(c[1]).includes('连吃')));
 const expired=context();s.time=4;D.draw(expired.ctx,s,{palette:D.palettes.dark,scale:.5,language:'en'});assert.ok(!expired.calls.some(c=>c[0]==='fillText'&&String(c[1]).includes('CHAIN')));
});
