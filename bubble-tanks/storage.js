(function(root,factory){const node=typeof module==='object'&&module.exports,api=factory(node?require('./rules.js'):root.BubbleFrontier.Rules,node?require('./world.js'):root.BubbleFrontier.World,node?require('./content.js'):root.BubbleFrontier.Content);if(node)module.exports=api;else(root.BubbleFrontier||={}).Storage=api;})(typeof globalThis!=='undefined'?globalThis:this,function(R,W,D){
 'use strict';
 const SAVE_KEY='bubble_frontier_save',RECORDS_KEY='bubble_frontier_records',SETTINGS_KEY='bubble_frontier_settings';
 const modes=['title','running','paused','upgrade','over','won','assembly','workshop','event','map','codex'];
 const roomTypes=['start','combat','cache','elite','hive','workshop','event','challenge','boss'];
 const failure=message=>({state:null,error:message});
 function serialize(state){
  const s=JSON.parse(JSON.stringify(state));s.randomState=state.rng.state();delete s.rng;delete s.confirmNew;delete s.transition;delete s.draft;delete s.draftHistory;delete s.records;delete s.storageWarning;
  s.offerIds=(state.offers||[]).map(u=>u.id);delete s.offers;
  if(!['upgrade','won','over','title'].includes(s.mode))s.mode='paused';
  return JSON.stringify(s);
 }
 const record=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
 function restore(raw){try{return restoreChecked(raw);}catch(_){return failure('invalid-structure');}}
 function restoreChecked(raw){
  if(typeof raw!=='string'||raw.length>2000000)return failure('invalid-size');
  let s;try{s=JSON.parse(raw);}catch(_){return failure('invalid-json');}
  if(!s||s.version!==2)return failure('unsupported-version');
  const badKeys=value=>value&&typeof value==='object'&&Object.entries(value).some(([key,v])=>['__proto__','constructor','prototype'].includes(key)||badKeys(v));
  if(badKeys(s))return failure('unsafe-fields');
  const number=(x,min=0,max=1e9)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
  const p=s.player,w=s.world;
  if(!record(p)||!record(w)||!modes.includes(s.mode)||!['normal','hard'].includes(s.difficulty)||typeof s.runId!=='string'||typeof w.seed!=='string')return failure('invalid-header');
  if(!number(p.mass,0,400)||!number(p.growth)||!number(p.x,0,800)||!number(p.y,0,800)||!number(p.angle,-1e6,1e6)||!number(p.shield,0,500)||!D.chassis.some(c=>c.id===p.chassis))return failure('invalid-player');
  if(!Array.isArray(p.loadout)||!p.loadout.length||p.loadout.length>R.MAX_MOUNTS||p.loadout.some(g=>!record(g))||p.loadout[0].id!=='pulse'||!record(p.passives))return failure('invalid-loadout');
  p.blueprints||=Object.fromEntries(p.loadout.map(g=>[g.id,g.level]));
  if(typeof p.blueprints!=='object'||Array.isArray(p.blueprints))return failure('invalid-blueprints');
  for(const[id,rank]of Object.entries(p.blueprints)){const def=D.guns.find(g=>g.id===id);if(!def||!Number.isInteger(rank)||rank<1||rank>def.cap)return failure('invalid-blueprint');}
  const slots=new Set();for(const g of p.loadout){const def=D.guns.find(d=>d.id===g.id);if(!def||g.cost!==def.cost||!Number.isInteger(g.level)||g.level<1||g.level>def.cap||!Number.isInteger(g.slot)||g.slot<0||slots.has(g.slot)||!number(g.angle,-Math.PI/2,Math.PI/2))return failure('invalid-module');slots.add(g.slot);
   if((g.x!==undefined||g.y!==undefined)&&(!number(g.x,-80,80)||!number(g.y,-80,80)))return failure('invalid-mount');}
  if(!D.skills.some(d=>d.id===p.skill)||!Array.isArray(p.skills)||p.skills.some(id=>!D.skills.some(d=>d.id===id))||!p.skills.includes(p.skill))return failure('invalid-skills');
  for(const key of ['relics','branches','heat']){p[key]??={};if(typeof p[key]!=='object'||Array.isArray(p[key]))return failure('invalid-equipment-map');}
  for(const [id,rank]of Object.entries(p.relics||{}))if(!D.relics.some(d=>d.id===id)||rank!==1)return failure('invalid-relic');
  for(const [id,value]of Object.entries(p.branches||{}))if(!D.guns.some(d=>d.id===id)||typeof value!=='boolean')return failure('invalid-branch');
  for(const value of Object.values(p.heat||{}))if(!number(value,0,2))return failure('invalid-heat');
  for(const key of ['dashClock','dashTime','skillClock','invulnerable','barrierTime','overdriveTime'])if(p[key]!==undefined&&!number(p[key],0,60))return failure('invalid-timer');
  if(p.powerGrace!==undefined&&!number(p.powerGrace,0,1.8)||p.powerReserve!==undefined&&!number(p.powerReserve,0,23))return failure('invalid-power-buffer');
  s.rerolls??=2;if(!Number.isInteger(s.rerolls)||s.rerolls<0||s.rerolls>2)return failure('invalid-rerolls');
  for(const [id,rank]of Object.entries(p.passives)){const def=D.passives.find(d=>d.id===id);if(!def||!Number.isInteger(rank)||rank<1||rank>def.cap)return failure('invalid-passive');}
  for(const k of ['time','nextId','score','level','nextGrowth','pending','salvage','rescueLeft'])if(!number(s[k]))return failure('invalid-counter');
  if(!['nextId','level','pending','rescueLeft'].every(k=>Number.isInteger(s[k])))return failure('invalid-integer');
  if(!record(s.cooldowns)||Object.values(s.cooldowns).some(v=>!number(v,-60,60)))return failure('invalid-cooldowns');
  if(!Number.isInteger(s.randomState)||!number(s.randomState,0,4294967295))return failure('invalid-random-state');
  if(!Number.isInteger(s.level)||s.level<1||!Number.isInteger(s.rescueLeft)||s.rescueLeft>1||!Number.isInteger(w.bosses)||w.bosses<0||w.bosses>4||!record(w.rooms)||Object.keys(w.rooms).length>400)return failure('invalid-world');
  if(!w.position||!Number.isInteger(w.position.x)||!Number.isInteger(w.position.y)||!w.rooms[W.key(w.position.x,w.position.y)])return failure('invalid-position');
  for(const [id,room]of Object.entries(w.rooms)){
   if(!record(room)||!Number.isInteger(room.zone)||room.zone<0||room.zone>3)return failure('invalid-room');
   if(room.stock!==undefined&&(!Array.isArray(room.stock)||room.stock.some(id=>!D.upgrades.some(u=>u.id===id))))return failure('invalid-stock');
   if(room.bought!==undefined&&(!Array.isArray(room.bought)||room.bought.some(id=>typeof id!=='string')))return failure('invalid-purchases');
   if(!Number.isInteger(room.x)||!Number.isInteger(room.y)||Math.abs(room.x)+Math.abs(room.y)>16||id!==W.key(room.x,room.y)||room.id!==id||!roomTypes.includes(room.type)||!number(room.time)||typeof room.cleared!=='boolean')return failure('invalid-room');
   for(const [name,limit]of Object.entries({enemies:100,shots:450,drops:1000,effects:500}))if(!Array.isArray(room[name])||room[name].length>limit)return failure('invalid-entities');
   for(const entity of [...room.enemies,...room.shots,...room.drops,...room.effects])if(!entity||!number(entity.x,-1000,1800)||!number(entity.y,-1000,1800))return failure('invalid-geometry');
   for(const e of room.enemies)if(!number(e.hp,-1e7,1e6)||!number(e.maxHp,1,1e6)||!number(e.r,1,150)||typeof e.kind!=='string')return failure('invalid-enemy');
   for(const b of room.shots)if(!number(b.vx,-10000,10000)||!number(b.vy,-10000,10000)||!number(b.ttl,0,60)||!number(b.r,0,150)||!number(b.damage,0,1e5)||!['player','enemy'].includes(b.owner)||!Array.isArray(b.hitIds)||b.hitIds.some(id=>typeof id!=='string'))return failure('invalid-shot');
   for(const d of room.drops)if(!number(d.value,0,400)||!number(d.r,0,150))return failure('invalid-drop');
   room.claims||={};if(typeof room.claims!=='object'||Array.isArray(room.claims))return failure('invalid-room-claims');
  }
  if(w.layoutVersion!==undefined&&w.layoutVersion!==1)return failure('invalid-layout');
  if(!w.rooms[s.safeRoom]?.cleared)return failure('invalid-checkpoint');
  if(!Array.isArray(s.offerIds)||new Set(s.offerIds).size!==s.offerIds.length||s.offerIds.length>3)return failure('invalid-cards');
  s.offers=s.offerIds.map(id=>D.upgrades.find(u=>u.id===id));if(s.offers.some(u=>!u)||s.mode==='upgrade'&&(!s.offers.length||s.pending<1||s.offers.some(u=>!R.canUpgrade(p,u))))return failure('invalid-upgrade');
  delete s.offerIds;delete s.draft;delete s.draftHistory;s.transition=null;s.rng=W.random(w.seed);s.rng.restore(s.randomState);delete s.randomState;
  if(!['upgrade','won','over','title'].includes(s.mode))s.mode='paused';
  p.dashTime=0;p.invulnerable=Math.max(p.invulnerable||0,1.25);return{state:s,error:null};
 }
 function blankRecords(){return{version:1,runs:0,wins:0,best:0,finished:[],chassis:[],weapons:[],enemies:[],rooms:[]};}
 function create(storage){
  let warning='';
  function readRecords(){try{const raw=storage.getItem(RECORDS_KEY);if(!raw)return blankRecords();const r=JSON.parse(raw);
   if(r.version!==1||!['runs','wins','best'].every(k=>Number.isFinite(r[k])&&r[k]>=0)||!['finished','chassis','weapons','enemies','rooms'].every(k=>Array.isArray(r[k])))throw Error('invalid-records');return r;
  }catch(_){warning='records-unavailable';return{...blankRecords(),invalid:true};}}
  function write(key,text){try{storage.setItem(key,text);return{ok:true};}catch(_){warning='storage-unavailable';return{ok:false,error:warning};}}
  function mergeRecords(records,state){
   const add=(key,values)=>{records[key]=[...new Set([...records[key],...values])];};
   add('chassis',[state.player.chassis]);add('weapons',state.player.loadout.map(g=>g.id));
   const rooms=Object.values(state.world.rooms).filter(r=>r.visited);add('enemies',rooms.flatMap(r=>r.enemies.map(e=>e.bossId||e.kind)));add('rooms',rooms.map(r=>r.type));return records;
  }
  return{
   load(){try{const raw=storage.getItem(SAVE_KEY);return raw?restore(raw):{state:null,error:null};}catch(_){warning='storage-unavailable';return failure(warning);}},
   save(state){try{return write(SAVE_KEY,serialize(state));}catch(_){warning='save-invalid';return{ok:false,error:warning};}},
   records:readRecords,status:()=>warning,
   observe(state){const r=readRecords();if(r.invalid)return{ok:false,error:warning};return write(RECORDS_KEY,JSON.stringify(mergeRecords(r,state)));},
   finish(state){if(!['won','over'].includes(state.mode))return{ok:false,error:'not-terminal'};const r=readRecords();if(r.invalid)return{ok:false,error:warning};
    if(r.finished.includes(state.runId))return{ok:true};r.finished.push(state.runId);r.runs++;if(state.mode==='won')r.wins++;r.best=Math.max(r.best,state.score);mergeRecords(r,state);return write(RECORDS_KEY,JSON.stringify(r));
   },
   settings(){try{const value=JSON.parse(storage.getItem(SETTINGS_KEY)||'{}');return{sound:!!value.sound,assist:value.assist!==false,quality:value.quality==='low'?'low':'normal',dualStick:!!value.dualStick,leftHand:!!value.leftHand};}catch(_){return{sound:false,assist:true,quality:'normal'};}},
   setSettings(settings){return write(SETTINGS_KEY,JSON.stringify({sound:!!settings.sound,assist:settings.assist!==false,quality:settings.quality==='low'?'low':'normal',dualStick:!!settings.dualStick,leftHand:!!settings.leftHand}));}
  };
 }
 return{SAVE_KEY,RECORDS_KEY,SETTINGS_KEY,serialize,restore,create};
});
