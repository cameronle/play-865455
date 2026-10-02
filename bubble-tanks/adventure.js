(function(root,factory){const node=typeof module==='object'&&module.exports,api=factory(node?require('./rules.js'):root.BubbleFrontier.Rules,node?require('./world.js'):root.BubbleFrontier.World,node?require('./content.js'):root.BubbleFrontier.Content);if(node)module.exports=api;else(root.BubbleFrontier||={}).Adventure=api;})(typeof globalThis!=='undefined'?globalThis:this,function(R,W,D){
 'use strict';
 const copy=value=>JSON.parse(JSON.stringify(value));
 function enter(state,room){
  if(room.cleared)state.safeRoom=room.id;
  if(room.type==='cache'&&!room.claims.cache){room.claims.cache=true;state.salvage+=2;}
  if(room.type==='workshop'&&!room.stock){room.stock=R.offers(state.player,W.random(`${state.world.seed}:${room.id}:stock`)).map(u=>u.id);room.bought=[];}
 }
 function clear(state,room){
  if(room.rewarded||room.enemies.some(e=>e.hp>0)||room.type==='boss'&&room.zone!==state.world.bosses)return false;
  room.cleared=true;room.rewarded=true;state.world.cleared++;state.safeRoom=room.id;
  if(state.player.passives.collector){for(const drop of room.drops)if(!drop.collected){drop.collected=true;R.absorb(state.player,drop);}room.drops=[];}
  const base=room.type==='boss'?8:room.type==='elite'?4:2;state.salvage+=base;
  if(room.type==='challenge'){room.challengeWon=room.challengeHits===0&&room.time<=35;if(room.challengeWon){state.salvage+=5;R.absorb(state.player,{value:12,source:'room'});}}
  if(room.type==='boss'&&W.completeBoss(state.world,room)){
   state.score+=250*(room.zone+1);R.absorb(state.player,{value:30,source:'boss'});state.notice='boss-clear';state.noticeTime=3;
   if(state.world.bosses===4){state.mode='won';state.notice='won';}
  }
  return true;
 }
 function rescue(state){
  if(state.difficulty==='hard'||state.rescueLeft<=0)return false;
  state.rescueLeft--;const [x,y]=(state.safeRoom||'0,0').split(',').map(Number),room=W.roomAt(state.world,x,y);
  state.world.position={x,y};room.visited=true;state.player.x=state.player.y=400;state.player.mass=22;state.player.shield=0;state.player.invulnerable=2.5;
  state.player.dashTime=0;state.transition=null;state.target=null;state.mode='paused';state.notice='rescue';state.noticeTime=8;state.cooldowns={};return true;
 }
 function open(state,kind){
  if(!['running','paused'].includes(state.mode))return false;
  const room=W.current(state.world);
  if(kind==='assembly'&&!room.cleared)return false;
  if(kind==='workshop'&&room.type!=='workshop'||kind==='event'&&(room.type!=='event'||room.eventResolved))return false;
  if(!['assembly','workshop','event','map','codex'].includes(kind))return false;
  state.returnMode=state.mode;state.mode=kind;enter(state,room);
  if(kind==='assembly'){state.player.blueprints||={};for(const g of state.player.loadout)state.player.blueprints[g.id]=Math.max(g.level,state.player.blueprints[g.id]||0);state.draft=copy(state.player.loadout);state.draftHistory=[];}
  return true;
 }
 function close(state){if(!['workshop','event','map','codex'].includes(state.mode))return false;state.mode=state.returnMode==='paused'?'paused':'running';return true;}
 function buy(state,id){
  if(state.mode!=='workshop')return false;const room=W.current(state.world),p=state.player;if(room.type!=='workshop')return false;
  if(id==='repair'){if(state.salvage<3||p.mass>=400)return false;state.salvage-=3;R.absorb(p,{value:18,source:'self'});return true;}
  if(id==='shield'){if(state.salvage<2||p.shield>=Math.max(15,(p.passives.shield||0)*10))return false;state.salvage-=2;p.shield=Math.max(15,(p.passives.shield||0)*10);return true;}
  if(!(room.stock||[]).includes(id)||(room.bought||[]).includes(id)||state.salvage<4||!R.applyUpgrade(p,id))return false;
  state.salvage-=4;room.bought.push(id);return true;
 }
 function resolve(state,id){
  if(state.mode!=='event'||!['leave','salvage','growth'].includes(id))return false;
  const room=W.current(state.world);if(room.type!=='event'||room.eventResolved)return false;
  if(id==='growth'&&state.player.mass<18)return false;
  room.eventResolved=true;
  if(id==='salvage')state.salvage+=5;
  if(id==='growth'){state.player.mass-=8;state.player.growth+=18;}
  close(state);return true;
 }
 function validDraft(state,draft){
  if(!draft.length||draft.length>10||draft[0].id!=='pulse')return false;
  const slots=new Set();for(const g of draft){
   if(slots.has(g.slot)||!Number.isInteger(g.slot)||g.slot<0||!(state.player.blueprints?.[g.id]||state.player.loadout.some(old=>old.id===g.id))||!D.guns.some(d=>d.id===g.id&&d.cost===g.cost)||!Number.isFinite(g.angle||0))return false;
   slots.add(g.slot);const m=R.mount(g);if(!Number.isFinite(m.x)||!Number.isFinite(m.y)||Math.hypot(m.x,m.y)>80)return false;
  }
  const base=R.bodyShape(state.player),connected=new Set();let changed=true;
  while(changed){changed=false;for(const g of draft){if(connected.has(g.slot))continue;const m=R.mount(g);
   if(base.some(c=>Math.hypot(m.x-c.x,m.y-c.y)<=c.r+10)||draft.some(other=>connected.has(other.slot)&&Math.hypot(m.x-R.mount(other).x,m.y-R.mount(other).y)<=18)){connected.add(g.slot);changed=true;}
  }}
  return connected.size===draft.length;
 }
 function edit(state,command){
  if(state.mode!=='assembly')return false;
  const p=state.player;
  if(command.type==='cancel'){delete state.draft;delete state.draftHistory;state.mode=state.returnMode==='paused'?'paused':'running';return true;}
  if(command.type==='undo'){if(!state.draftHistory.length)return false;state.draft=state.draftHistory.pop();return true;}
  if(command.type==='commit'){if(!validDraft(state,state.draft))return false;p.loadout=copy(state.draft);state.cooldowns={};return edit(state,{type:'cancel'});}
  const draft=copy(state.draft),gun=draft.find(g=>g.slot===command.slot)||(['add','auto'].includes(command.type)?draft[0]:null);if(!gun)return false;
  if(command.type==='add'){const def=D.guns.find(g=>g.id===command.id),level=state.player.blueprints?.[command.id];if(!def||!level||draft.reduce((sum,g)=>sum+g.cost,0)+def.cost>R.power(p))return false;
   const slot=Math.max(...draft.map(g=>g.slot))+1;draft.push({id:def.id,cost:def.cost,level,slot,angle:0,x:18,y:slot%2?10:-10});
  }else if(command.type==='move'){gun.x=command.x;gun.y=command.y;}
  else if(command.type==='rotate'){gun.angle=R.clamp((gun.angle||0)+command.angle,-Math.PI/2,Math.PI/2);}
  else if(command.type==='mirror'){
   if(draft.reduce((sum,g)=>sum+g.cost,0)+gun.cost>R.power(p))return false;
   const m=R.mount(gun);if(Math.abs(m.y)<4){gun.x=m.x;gun.y=-10;m.y=-10;}draft.push({...gun,slot:Math.max(...draft.map(g=>g.slot))+1,x:m.x,y:-m.y,angle:-(gun.angle||0)});
  }else if(command.type==='remove'){if(gun.slot===0)return false;draft.splice(draft.indexOf(gun),1);}
  else if(command.type==='priority'){const i=draft.indexOf(gun);if(i<=1)return false;draft.splice(i,1);draft.splice(i-1,0,gun);}
  else if(command.type==='auto'){
   draft.splice(0,draft.length,...p.loadout.map(g=>({...g,x:18,y:(g.slot%2?1:-1)*Math.min(14,g.slot*5),angle:0})));
  }else return false;
  if(!validDraft(state,draft))return false;
  state.draftHistory.push(copy(state.draft));if(state.draftHistory.length>20)state.draftHistory.shift();state.draft=draft;return true;
 }
 function equipSkill(state,id){if(!['paused','assembly','workshop'].includes(state.mode)||!state.player.skills.includes(id))return false;state.player.skill=id;return true;}
 return{enter,clear,rescue,open,close,buy,resolve,edit,validDraft,equipSkill};
});
