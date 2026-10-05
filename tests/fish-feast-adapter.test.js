'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function harness(initial={},blocked=false){
 const html=fs.readFileSync('fish-feast/index.html','utf8');assert.ok(html.includes('id="nextButton"'),'explicit next-level control missing');
 const storage=new Map(Object.entries(initial)),jobs=new Map(),nodes=new Map();let now=0,id=0,world;
 class E{constructor(tag='BUTTON'){this.tagName=tag;this.listeners={};this.textContent='';this.value='0';this.hidden=false;this.disabled=false;this.style={};this.dataset={};this.children=[];this.classList={toggle(){},add(){},remove(){}};}addEventListener(t,cb){(this.listeners[t]??=[]).push(cb);}dispatch(t,options={}){const e={target:this,preventDefault(){},stopPropagation(){},...options};for(const cb of this.listeners[t]||[])cb(e);}setAttribute(k,v){this[k]=String(v);}replaceChildren(...children){this.children=children;}focus(){doc.activeElement=this;}getBoundingClientRect(){return{left:0,top:0,x:0,y:0,width:760,height:520};}getContext(){return new Proxy({},{get:()=>()=>{}});}setPointerCapture(){}releasePointerCapture(){}}
 for(const m of html.matchAll(/id="([^"]+)"/g))nodes.set(m[1],new E(m[1]==='game'?'CANVAS':m[1]==='levelSelect'?'SELECT':'BUTTON'));
 const doc=new E('DOCUMENT');doc.hidden=false;doc.documentElement={dataset:{theme:'light'},lang:'zh'};doc.getElementById=id=>nodes.get(id);doc.querySelectorAll=()=>[];doc.querySelector=selector=>selector==='.action-row'?new E('SECTION'):selector==='.clear-data-toggle'?null:nodes.get(selector.replace('#',''));doc.createElement=tag=>new E(tag.toUpperCase());
 const win=new E('WINDOW');Object.assign(win,{document:doc,console,performance:{now:()=>now},localStorage:{getItem(k){if(blocked)throw Error('blocked');return storage.get(k)??null;},setItem(k,v){if(blocked)throw Error('blocked');storage.set(k,v);}},crypto:{getRandomValues(a){a[0]=92;return a;}},matchMedia:()=>({matches:false,addEventListener(){}}),devicePixelRatio:1,ResizeObserver:class{observe(){}},requestAnimationFrame(cb){jobs.set(++id,cb);return id;},cancelAnimationFrame(id){jobs.delete(id);},confirm:()=>true,Uint32Array});win.window=win;
 const context=vm.createContext(win);
 for(const name of ['content','rules','progress','behaviors','simulation','input','render']){assert.ok(html.includes(name+'.js'),'missing dependency '+name);vm.runInContext(fs.readFileSync('fish-feast/'+name+'.js','utf8'),context);}
 const original=win.FishFeast.Simulation.start;win.FishFeast.Simulation.start=(s,...args)=>{world=s;return original(s,...args);};vm.runInContext(fs.readFileSync('fish-feast/game.js','utf8'),context);
 return{win,doc,storage,nodes,snap:()=>JSON.parse(JSON.stringify(win.FishFeastGame.snapshot())),tick(){now+=1000/60;const pending=[...jobs];jobs.clear();for(const[,cb]of pending)cb(now);},get world(){return world;},click(id){nodes.get(id).dispatch('click');}};
}
test('adapter exposes a bilingual stage/objective line and waits for the marked revenge fish',()=>{
 const h=harness();h.click('startButton');h.tick();assert.ok(h.nodes.get('objectiveValue'),'objective line missing');assert.match(h.nodes.get('objectiveValue').textContent,/成长|反吃/);
 h.click('languageButton');assert.match(h.nodes.get('objectiveValue').textContent,/GROW|REVENGE/);
 const s=h.world;s.player.growth=s.level.goal;h.win.FishFeast.Rules.grow(s.player);s.fish=[];h.tick();assert.equal(h.snap().mode,'playing');assert.match(h.nodes.get('objectiveValue').textContent,/REVENGE/);
});
test('real adapter enforces locks, explicitly advances after a win, and retains records on retry',()=>{
 const h=harness();assert.equal(h.snap().level.id,1);h.nodes.get('levelSelect').value='11';h.click('startButton');assert.equal(h.snap().level.id,1,'tampered select bypassed lock');
 const s=h.world;s.player.growth=s.level.goal;h.win.FishFeast.Rules.grow(s.player);s.fish=[{...h.win.FishFeast.Content.species.perch,x:s.player.x,y:s.player.y,vx:0,vy:0,age:0,phase:0,warning:0,id:100,type:'perch'}];h.tick();h.tick();
 assert.equal(h.snap().mode,'won');assert.equal(h.snap().progress.unlocked,2);assert.equal(h.nodes.get('nextButton').hidden,false);const record=JSON.parse(h.storage.get('fish-feast-progress-v1'));assert.ok(record.best[1]>0);h.tick();assert.equal(h.snap().mode,'won','next stage auto-started');
 h.click('nextButton');assert.equal(h.snap().mode,'playing');assert.equal(h.snap().level.id,2);assert.equal(h.snap().player.growth,0);assert.equal(h.snap().player.lives,3);h.click('pauseButton');h.click('menuButton');assert.equal(h.snap().mode,'title');assert.equal(h.snap().progress.best[1],record.best[1]);
});
test('restoration, blocked storage and clearing leave no stale writes or mutable snapshot aliases',()=>{
 const saved=JSON.stringify({version:1,unlocked:5,best:{1:90,2:101},completed:[1,2,3,4]}),settings=JSON.stringify({version:1,lastLevel:3});
 const h=harness({'fish-feast-progress-v1':saved,'fish-feast-settings-v1':settings});assert.equal(h.snap().level.id,3);h.click('startButton');h.tick();const snapshot=h.win.FishFeastGame.snapshot();snapshot.player.growth=999;snapshot.progress.best[1]=0;snapshot.input.keys.push('KeyD');assert.equal(h.snap().progress.best[1],90);assert.ok(h.snap().player.growth<999);assert.deepEqual(h.snap().input.keys,[]);
 h.win.dispatch('game-data-clearing');const frozen=h.snap();assert.equal(frozen.clearPending,true);assert.equal(frozen.mode,'paused');h.storage.delete('fish-feast-progress-v1');h.storage.delete('fish-feast-settings-v1');h.win.dispatch('pagehide');h.click('startButton');h.tick();assert.equal(h.snap().time,frozen.time);assert.equal(h.storage.has('fish-feast-progress-v1'),false);assert.equal(h.storage.has('fish-feast-settings-v1'),false);
 for(const initial of [{'fish-feast-progress-v1':'{'},{}]){const k=harness(initial,initial['fish-feast-progress-v1']===undefined);assert.equal(k.snap().level.id,1);k.click('startButton');k.tick();assert.equal(k.snap().mode,'playing');}
});
