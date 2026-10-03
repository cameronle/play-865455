(() => {
 'use strict';
 const B=window.BubbleFrontier,C=B.Combat,R=B.Rules,W=B.World,A=B.Adventure;
 const canvas=document.querySelector('#game'),renderer=B.Render.create(canvas),sound=B.Sound.create();
 const store=B.Storage.create({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)}),loaded=store.load(),settings=store.settings();
 let lang='zh';try{if(localStorage.getItem('play-lang')==='en')lang='en';}catch(_){}
 let state=C.create('title'),input,ui,last=performance.now(),accumulator=0,renderedFrames=0,lastHud=0;
 let hasSave=!!loaded.state,savedWarning=loaded.error||'',overwriteApproved=false;
 sound.setEnabled(settings.sound);
 function observe(){store.observe(state);state.records=store.records();}
 function persist(){if(state.mode==='title')return;const result=store.save(state);hasSave=result.ok||hasSave;savedWarning=result.ok?'':result.error;
  if(['won','over'].includes(state.mode))store.finish(state);
 }
 function sync(){state.lang=lang;state.hasSave=hasSave;state.storageWarning=savedWarning||store.status();ui.update(state,settings);renderer.draw(state);}
 function newState(chassis,difficulty){state=C.create(`${Date.now()}:${Math.random()}`,chassis,difficulty);state.lang=lang;accumulator=0;input.clear();}
 function changed(){input.clear();accumulator=0;persist();observe();sync();}
 function action(name){
  sound.unlock();
  if(state.confirmNew&&name==='pause')name='cancelNew';
  if(name==='cancelNew'){delete state.confirmNew;sync();return;}
  if(name==='confirmNew'){name=state.confirmNew;delete state.confirmNew;if(!['restart','start'].includes(name))return;overwriteApproved=true;}
  else if(state.confirmNew)return;
  else if(name==='restart'||name==='start'&&hasSave&&!overwriteApproved){state.confirmNew=name;input.clear();sync();return;}
  if(name==='start'||name==='again'){newState(document.querySelector('#chassisSelect').value||'balanced',document.querySelector('#difficultySelect').value||'normal');C.start(state);overwriteApproved=false;observe();persist();}
  else if(name==='continueSaved'){const saved=store.load();if(saved.state){state=saved.state;C.resume(state);input.clear();accumulator=0;persist();observe();}else savedWarning=saved.error||'save-unavailable';}
  else if(name==='restart'){persist();newState(state.player.chassis,state.difficulty);}
  else if(name==='pause'){if(state.mode==='paused')C.resume(state);else C.pause(state);input.clear();persist();}
  else if(name==='resume'){C.resume(state);input.clear();persist();}
  else if(name==='dash'){if(C.dash(state,input.sample()))sound.play('dash');}
  else if(name==='skill'){if(C.useSkill(state))sound.play('shield');}
  else if(name==='map'||name==='codex'||name==='assembly'){if(A.open(state,name)){input.clear();accumulator=0;state.records=store.records();}}
  else if(name==='room'){const room=W.current(state.world),kind=room.type==='workshop'?'workshop':room.type==='event'&&!room.eventResolved?'event':'assembly';if(A.open(state,kind)){input.clear();accumulator=0;}}
  else if(name==='close'){if(A.close(state))changed();}
  else if(name==='repair'||name==='refill'){if(A.buy(state,name==='repair'?'repair':'shield'))changed();}
  else if(name.startsWith('event:')){if(A.resolve(state,name.slice(6)))changed();}
  else if(name==='reroll'){if(C.reroll(state))changed();}
  else if(name==='skip'){if(C.skip(state))changed();}
  else if(name.startsWith('equip:')){if(A.equipSkill(state,name.slice(6)))changed();}
  else if(['dualStick','hand','quality'].includes(name)){if(name==='dualStick')settings.dualStick=!settings.dualStick;else if(name==='hand')settings.leftHand=!settings.leftHand;else settings.quality=settings.quality==='low'?'normal':'low';input.configure(settings,()=>state.player);store.setSettings(settings);}
  else if(name==='language'){lang=lang==='zh'?'en':'zh';try{localStorage.setItem('play-lang',lang);}catch(_){} }
  else if(name==='sound'){settings.sound=!settings.sound;sound.setEnabled(settings.sound);if(settings.sound)sound.unlock();store.setSettings(settings);}
  else if(name==='aim'){settings.assist=!settings.assist;input.setAssist(settings.assist);store.setSettings(settings);}
  sync();
 }
 input=B.Input.create(canvas,{isRunning:()=>state.mode==='running',action});input.setAssist(settings.assist);input.configure(settings,()=>state.player);
 ui=B.UI.create({action,choose(id){if(C.choose(state,id)){sound.unlock();sound.play('upgrade');changed();}},buy(id){if(A.buy(state,id))changed();},edit(command){const ok=A.edit(state,command);if(ok){if(command.type==='commit'||command.type==='cancel')changed();else sync();}return ok;}});
 document.addEventListener('DOMContentLoaded',()=>{const clear=document.querySelector('.clear-data-toggle');if(clear)document.querySelector('.topbar').append(clear);});
 document.addEventListener('themechange',()=>{renderer.refresh();renderer.draw(state);});
 window.addEventListener('resize',()=>sync());
 function suspend(){C.pause(state);input.clear();accumulator=0;persist();sync();last=performance.now();}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();last=performance.now();});window.addEventListener('blur',suspend);window.addEventListener('pagehide',suspend);
 function frame(now){
  const elapsed=Math.min(.12,Math.max(0,(now-last)/1000));last=now;
  const active=state.mode==='running'&&!document.hidden;
  if(active){accumulator+=elapsed;
   while(accumulator>=1/60&&state.mode==='running'){
    const mode=state.mode,roomId=W.current(state.world).id,bosses=state.world.bosses,score=state.score,mass=state.player.mass,growth=state.player.growth;
    C.step(state,input.sample(),1/60);accumulator-=1/60;
    if(state.score>score)sound.play('kill');else if(state.player.mass<mass)sound.play('hit');else if(state.player.growth>growth)sound.play('pickup');
    if(W.current(state.world).effects.some(f=>f.kind==='muzzle'&&f.ttl===f.duration))sound.play('shot');
    if(state.mode!==mode){input.clear();accumulator=0;persist();observe();}
    else if(W.current(state.world).id!==roomId||state.world.bosses!==bosses){persist();observe();}
   }

  }else accumulator=0;
  if(active){state.lang=lang;state.hasSave=hasSave;state.quality=settings.quality;state.storageWarning=savedWarning||store.status();
   if(now-lastHud>=100||state.mode!=='running'){ui.update(state,settings);lastHud=now;}
   renderer.draw(state);renderedFrames++;
  }
  requestAnimationFrame(frame);
 }
 B.snapshot=()=>{
  const p=state.player,room=W.current(state.world);
  return{skill:p.skill,skills:[...p.skills],relics:{...p.relics},branches:{...p.branches},rerolls:state.rerolls,runId:state.runId,mode:state.mode,lang:state.lang,time:state.time,frames:renderedFrames,chassis:p.chassis,mass:p.mass,growth:p.growth,tier:R.tier(p.mass),shield:p.shield,dashClock:p.dashClock,skillClock:p.skillClock,playerX:p.x,playerY:p.y,angle:p.angle,
   room:{x:room.x,y:room.y,id:room.id,type:room.type,cleared:room.cleared},cleared:state.world.cleared,bosses:state.world.bosses,salvage:state.salvage,rescueLeft:state.rescueLeft,difficulty:state.difficulty,
   enemyCount:room.enemies.filter(e=>e.hp>0).length,enemies:room.enemies.filter(e=>e.hp>0).map(e=>({id:e.id,kind:e.kind,bossId:e.bossId,stage:e.stage,x:e.x,y:e.y,hp:e.hp,warning:e.warning||0})),
   shots:room.shots.map(b=>({owner:b.owner,x:b.x,y:b.y,weapon:b.weapon,generation:b.generation||0})),drops:room.drops.length,score:state.score,level:state.level,offers:(state.offers||[]).map(u=>u.id),loadout:p.loadout.map(g=>({...g})),passives:{...p.passives},
   blueprints:{...p.blueprints},draft:state.draft?JSON.parse(JSON.stringify(state.draft)):null,power:R.power(p),active:R.activeLoadout(p).map(g=>g.id),input:JSON.parse(JSON.stringify(input.sample())),settings:{...settings},audio:sound.status(),transition:!!state.transition,storageWarning:state.storageWarning,hasSave};
 };
 sync();requestAnimationFrame(frame);
})();
