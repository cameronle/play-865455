'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {environment}=require('./helpers/bubble-runtime.js');
const C=require('../bubble-tanks/combat.js'),R=require('../bubble-tanks/rules.js'),W=require('../bubble-tanks/world.js'),A=require('../bubble-tanks/adventure.js'),S=require('../bubble-tanks/storage.js'),D=require('../bubble-tanks/content.js');

test('releasing movement preserves the held aim pointer',()=>{
 const h=environment(['input.js']),input=h.B.Input.create(h.elements.get('game'),{isRunning:()=>true,action:()=>{}});input.configure({dualStick:true},()=>({x:400,y:400}));
 const move=h.elements.get('joystick'),aim=h.elements.get('aimJoystick');move.rect=aim.rect={left:0,top:0,width:108,height:108};
 move.emit('pointerdown',{pointerId:1,clientX:80,clientY:54});aim.emit('pointerdown',{pointerId:2,clientX:54,clientY:90});
 move.emit('pointerup',{pointerId:1});assert.equal(input.sample().x,0);assert.ok(input.sample().aim);
 aim.emit('pointermove',{pointerId:2,clientX:80,clientY:54});assert.ok(input.sample().aim.x>400);
 aim.emit('pointercancel',{pointerId:2});assert.equal(input.sample().aim,null);
});

test('full loadouts reject a new mount without poisoning a saved run',()=>{
 const s=C.create('limit');C.start(s);s.player.mass=400;A.open(s,'assembly');
 while(A.edit(s,{type:'add',id:'pulse'})){}assert.equal(s.draft.length,10);A.edit(s,{type:'commit'});
 assert.equal(R.applyUpgrade(s.player,'twin'),false);assert.equal(s.player.loadout.length,10);
 assert.equal(S.restore(S.serialize(s)).error,null);assert.equal(R.applyUpgrade(s.player,'pulse'),true);
});

test('evolution bar measures the current level interval',()=>{
 const h=environment(['ui.js']),s=C.create('growth');s.lang='zh';s.level=6;s.player.growth=121;s.nextGrowth=162;
 h.B.UI.create({action(){},choose(){},buy(){},edit(){}}).update(s,{});
 assert.ok(Math.abs(parseFloat(h.elements.get('growthFill').style.width)-100/42)<1e-6);
 assert.match(h.elements.get('growthLabel').textContent,/1 \/ 42/);
});

test('restart requires confirmation and cancelling keeps the current expedition',()=>{
 const h=runtime(),before=h.B.snapshot();h.elements.get('pauseButton').click();h.elements.get('restartButton').click();
 assert.equal(h.B.snapshot().growth,before.growth);assert.equal(h.elements.get('confirmPanel').hidden,false);
 h.elements.get('cancelNewButton').click();assert.equal(h.B.snapshot().mode,'paused');assert.equal(h.elements.get('confirmPanel').hidden,true);
 h.elements.get('restartButton').click();h.elements.get('confirmNewButton').click();assert.equal(h.B.snapshot().mode,'title');assert.equal(h.B.snapshot().growth,0);
});

test('damage grants a bounded power buffer before modules sleep',()=>{
 const s=C.create('capacitor'),p=s.player;C.start(s);p.mass=115;for(const id of ['scatter','needle','beam'])R.applyUpgrade(p,id);
 assert.ok(R.activeLoadout(p).some(g=>g.id==='beam'));C.hurtPlayer(s,W.current(s.world),1);
 assert.equal(R.power(p),10);assert.ok(R.activeLoadout(p).some(g=>g.id==='beam'),'damage must not immediately shut down fire');
 assert.ok(p.powerGrace>0);assert.equal(S.restore(S.serialize(s)).error,null);
 const room=W.current(s.world);room.drops=[];for(let n=0;n<130;n++)C.step(s,{},1/60);
 assert.ok(!R.activeLoadout(p).some(g=>g.id==='beam'));assert.equal(p.powerGrace,0);
});

test('upgrade cards explain rank, power changes and newly completed links',()=>{
 const h=environment(['ui.js']),s=C.create('insight');s.lang='zh';s.mode='upgrade';s.pending=1;s.player.mass=115;R.applyUpgrade(s.player,'scatter');
 s.offers=['pulse','split','flow_core'].map(id=>D.upgrades.find(u=>u.id===id));
 const ui=h.B.UI.create({action(){},choose(){},buy(){},edit(){}});ui.update(s,{});
 const cards=h.elements.get('upgradeChoices').children,flatten=n=>n.textContent+' '+n.children.map(flatten).join(' ');
 assert.match(flatten(cards[0]),/1 → 2/);assert.match(flatten(cards[0]),/功率不变/);assert.match(flatten(cards[1]),/散射 × 分裂/);
 assert.equal(s.player.loadout[0].level,1,'previews never apply the upgrade');
});

test('HUD names power-buffer and sleeping weapons; assembly forecasts degradation',()=>{
 const h=environment(['ui.js']),s=C.create('power-ui');s.lang='zh';s.player.mass=115;for(const id of ['scatter','needle','beam'])R.applyUpgrade(s.player,id);C.hurtPlayer(s,W.current(s.world),1);
 const ui=h.B.UI.create({action(){},choose(){},buy(){},edit(){}});ui.update(s,{});assert.match(h.elements.get('combatNotice')?.textContent||'',/供能缓冲/);
 s.player.powerGrace=0;ui.update(s,{});assert.match(h.elements.get('combatNotice').textContent,/持续光束.*休眠/);
 C.start(s);A.open(s,'assembly');ui.update(s,{});assert.match(h.elements.get('assemblyForecast')?.textContent||'',/掉一档/);
});

test('pause settings have discoverable control and display groups',()=>{
 const h=environment(['ui.js']);assert.ok(h.elements.has('controlSettings'));assert.ok(h.elements.has('displaySettings'));
 const fs=require('node:fs'),css=fs.readFileSync('bubble-tanks/style.css','utf8');assert.match(css,/\.battle-hud\s*\{[^}]*font-size:12px/);
});

test('new chassis have distinct playable starters without changing old saves',()=>{
 const starts=D.chassis.map(c=>R.createPlayer(c.id));assert.equal(new Set(starts.map(p=>p.loadout.map(g=>g.id).join(',')+':'+p.skill)).size,6);
 for(const p of starts){assert.equal(p.loadout[0].id,'pulse');assert.ok(p.skills.includes(p.skill));assert.equal(R.activeLoadout(p).length,p.loadout.length);const s=C.create('starter',p.chassis);assert.equal(S.restore(S.serialize(s)).error,null);}
 const old=C.create('legacy','swarmbody');old.player.skill='overload';old.player.skills=['overload'];assert.equal(S.restore(S.serialize(old)).state.player.skill,'overload');
});

test('seeded special routes vary while old expeditions retain their layout',()=>{
 const layouts=new Set();for(let seed=0;seed<24;seed++){const w=W.create('route-'+seed),list=[];for(let x=0;x<=3;x++)for(let y=-3;y<=3;y++)if(Math.abs(x)+Math.abs(y)<=3){const room=W.roomAt(w,x,y);if(['workshop','event','challenge','elite','hive','cache'].includes(room.type))list.push([room.id,room.type]);}layouts.add(JSON.stringify(list));}
 assert.ok(layouts.size>5);const old=W.create('old');delete old.layoutVersion;assert.equal(W.roomAt(old,1,-1).type,'workshop');
 const a=W.create('stable'),b=W.create('stable');assert.deepEqual(W.landmarks(a,2),W.landmarks(b,2));
});

test('encounters compose a bounded support formation rather than unrelated rolls',()=>{
 const w=W.create('formations');let formations=0;for(let x=4;x<10;x++)for(let y=-2;y<=2;y++){const room=W.roomAt(w,x,y);if(room.cleared||room.type==='boss')continue;
 assert.ok(room.encounter,'combat rooms name a composition');assert.ok(room.enemies.filter(e=>['healer','spawner','escort'].includes(e.kind)).length<=1);
 if(room.encounter==='repair-line'){assert.ok(room.enemies.some(e=>e.kind==='healer'));assert.ok(room.enemies.some(e=>e.kind==='guardian'));formations++;}}
 assert.ok(formations>0);
});

test('boss burst damage cannot skip phases and detached cores demand a target switch',()=>{
 const B=require('../bubble-tanks/bosses.js'),s=C.create('phase-gate');s.world.bosses=3;const room=W.roomAt(s.world,12,0);s.world.position={x:12,y:0};const boss=room.enemies[0];
 C.hurtEnemy(s,room,boss,10000,{weapon:'pulse'});assert.ok(boss.hp>0,'phase transition survives a burst');
 B.update(s,room,boss,.02,{effect:C.effect,shot:C.spawnShot});assert.equal(boss.stage,2);assert.equal(room.enemies.filter(e=>e.kind==='core').length,3);
 const hp=boss.hp;C.hurtEnemy(s,room,boss,10000,{weapon:'pulse'});assert.equal(boss.hp,hp,'living cores protect final boss');
 assert.equal(C.selectTarget(s,room,.02).kind,'core');for(const e of room.enemies)if(e.kind==='core')e.hp=0;
 C.hurtEnemy(s,room,boss,10000,{weapon:'pulse'});assert.ok(boss.hp<=0);
});

test('paused frames perform no redundant paint or HUD writes and actions still redraw',()=>{
 const h=runtime();h.elements.get('pauseButton').click();const before=h.B.snapshot().frames,canvas=h.elements.get('game'),ops=canvas.calls.length;
 h.frames(60);assert.equal(h.B.snapshot().frames,before);assert.equal(canvas.calls.length,ops);
 h.elements.get('languageButton').click();assert.ok(canvas.calls.length>ops);h.elements.get('resumeButton').click();h.frames(5);assert.ok(h.B.snapshot().frames>before);
});

test('identical HUD snapshots do not replace text nodes repeatedly',()=>{
 const h=environment(['ui.js']),s=C.create('dom');s.lang='zh';const ui=h.B.UI.create({action(){},choose(){},buy(){},edit(){}});ui.update(s,{});
 let writes=0;for(const el of h.elements.values()){let value=el.textContent;Object.defineProperty(el,'textContent',{get:()=>value,set:v=>{writes++;value=v;}});}ui.update(s,{});assert.equal(writes,0);
});

test('Boss health remains visible below readable mechanics guidance',()=>{
 const h=environment(['ui.js']),s=C.create('boss-hud');s.lang='zh';s.world.position={x:3,y:0};const boss=W.current(s.world).enemies[0];boss.hp=boss.maxHp*.55;
 h.B.UI.create({action(){},choose(){},buy(){},edit(){}}).update(s,{});assert.ok(h.elements.has('bossHealthFill'));assert.ok(Math.abs(parseFloat(h.elements.get('bossHealthFill').style.width)-55)<1e-6);assert.equal(h.elements.get('bossHealth').hidden,false);
});

const modules=['render.js','input.js','sound.js','ui.js','game.js'];
function runtime(){const h=environment(modules);h.elements.get('startButton').click();h.frames(80);h.elements.get('skipButton').click();return h;}
test('held touch survives a room crossing until the actual release',()=>{
 const h=runtime(),stick=h.elements.get('joystick');stick.rect={left:0,top:0,width:108,height:108};
 stick.emit('pointerdown',{pointerId:7,pointerType:'touch',clientX:91,clientY:54});
 for(let n=0;n<300&&h.B.snapshot().room.x===0;n++)h.frames();
 const crossed=h.B.snapshot();assert.equal(crossed.room.x,1);assert.ok(crossed.input.x>.9);
 stick.emit('pointermove',{pointerId:7,pointerType:'touch',clientX:90,clientY:54});h.frames(8);
 assert.ok(h.B.snapshot().playerX>crossed.playerX);stick.emit('pointerup',{pointerId:7});assert.equal(h.B.snapshot().input.x,0);
});
