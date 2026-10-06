(function(root,factory){'use strict';const node=typeof module==='object'&&module.exports,api=factory(node?require('./content.js'):root.FishFeast.Content,node?require('./rules.js'):root.FishFeast.Rules,node?require('./behaviors.js'):root.FishFeast.Behaviors);if(node)module.exports=api;else root.FishFeast.Simulation=api;})(globalThis,function(C,R,B){
 'use strict';
 function random(s){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296;}
 // A centered obstacle needs space for a full player above OR below it.
 // The former diameter-sum check only proved an edge-anchored jelly bypass.
 const minimumHeight=Math.ceil(Math.max(...[2,3,4,5].map(tier=>4*R.geometry({shape:'player',tier}).ry+2*R.geometry(tier===5?C.species.jelly:{...C.species.hunter,tier:tier+1}).ry+48))/10)*10;
 function worldSize(width,height){const factor=Math.max(1,minimumHeight/height);return{width:width*factor,height:height*factor};}
 function create(width=760,height=520,seed=1){({width,height}=worldSize(width,height));return{width,height,seed:seed>>>0||1,rng:seed>>>0||1,mode:'title',levelIndex:0,level:C.levels[0],player:R.player(width,height),fish:[],effects:[],time:0,spawnTimer:1.4,foodTimer:1,objectiveTimer:1,accumulator:0,nextId:1,eaten:0,hits:0,stageIndex:0,phase:'forage',caught:{},lanesEaten:[],bestShoal:0,shoalId:null,shoalCount:0,shoalTime:-10,revengeCount:0};}
 function activePool(s){const stages=s.level.stages;if(!stages)return s.level.pool;let index=0;for(let i=1;i<stages.length;i++)if(s.player.growth>=stages[i].from)index=i;s.stageIndex=index;return stages[index].pool;}
 function kindOf(entry){const type=typeof entry==='string'?entry:entry.type,kind=C.species[type];return kind?{...kind,type,...(typeof entry==='object'?{tier:entry.tier}:{} )}:null;}
 function objective(s){const c=s.level.challenge,current=c?(c.kind==='catch'?s.caught[c.type]||0:c.kind==='lanes'?s.lanesEaten.length:s.bestShoal):0,challengeDone=!c||current>=c.need,reverse=s.player.growth>=s.level.goal&&challengeDone,phase=reverse?'reverse':s.player.growth>=7?'hunt':'forage';if(!challengeDone)return{phase,kind:c.kind,type:c.type,current,need:c.need,complete:false};if(!reverse)return{phase,kind:'grow',current:s.player.growth,need:s.level.goal,complete:false};return{phase,kind:'revenge',type:s.level.finish.type,tier:s.level.finish.tier,current:s.revengeCount,need:s.level.finish.need,complete:s.revengeCount>=s.level.finish.need};}
 function spawn(s,type,options={}){if(s.fish.length>=(options.target?C.maxEntities:C.maxEntities-3))return false;const base=C.species[type];if(!base)return false;const kind={...base,...options};if(!Number.isInteger(kind.tier)||kind.tier<0||kind.tier>=C.sizes.length)return false;
  if(kind.hazard&&s.fish.filter(f=>!f.dead&&f.hazard).length>=s.level.maxJellies||kind.motion==='chase'&&s.fish.filter(f=>!f.dead&&f.motion==='chase').length>=s.level.maxChasers)return false;
  const relation=R.relation(s.player,kind),count=s.fish.filter(f=>!f.dead&&R.relation(s.player,f)===relation).length;
  if(relation==='danger'&&count>=s.level.maxThreats||relation==='neutral'&&count>=6)return false;
  const fish={...kind,type,id:s.nextId,x:0,y:0,vx:0,vy:0,age:0,phase:random(s)*Math.PI*2,warning:relation==='danger'?C.warningTime:0,dead:false};
  const g=R.geometry(fish),p=s.player,pg=R.geometry(p),padding=relation==='danger'?88:24;
  const leader=kind.motion==='school'&&s.level.schoolSize>1?s.fish.find(f=>!f.dead&&f.type===type&&f.schoolId===f.id&&s.fish.filter(member=>!member.dead&&member.schoolId===f.id).length<s.level.schoolSize):null;
  const slot=leader?s.fish.filter(f=>!f.dead&&f.schoolId===leader.id).length:0;
  for(let attempt=0;attempt<16;attempt++){
   const left=random(s)<.5;fish.x=relation==='danger'&&!options.patrol?(left?g.rx+3:s.width-g.rx-3):g.rx+random(s)*(s.width-g.rx*2);
   fish.y=g.ry+10+random(s)*Math.max(0,s.height-g.ry*2-20);
   let inSchool=false;
   if(leader&&attempt===0){fish.x=leader.x-(Math.sign(leader.vx)||1)*(g.rx*2+12)*slot;fish.y=leader.y+(slot%2?1:-1)*g.ry*.65;inSchool=true;}
   if(s.level.lanes){fish.lane=fish.id%s.level.lanes;fish.y=R.clamp(s.height*(fish.lane+.5)/s.level.lanes,g.ry+3,s.height-g.ry-3);}
   if(kind.hazard){const zones=s.level.jellyZones,zone=s.fish.filter(f=>f.hazard).length%zones.length;fish.x=R.clamp(s.width*zones[zone]+(random(s)-.5)*16,g.rx+3,s.width-g.rx-3);if(s.height<300)fish.y=zone%2?s.height-g.ry-12:g.ry+12;fish.warning=1.4;}
   if(fish.x<g.rx||fish.x>s.width-g.rx||fish.y<g.ry||fish.y>s.height-g.ry)continue;
   if(Math.hypot(fish.x-p.x,fish.y-p.y)<=pg.rx+g.rx+padding)continue;
   fish.vx=(left?1:-1)*kind.speed;fish.vy=(random(s)-.5)*kind.speed*.3;fish.baseY=fish.y;
   if(kind.motion==='school'){fish.schoolId=inSchool?leader.id:fish.id;fish.schoolSlot=inSchool?slot:0;fish.schoolOffset=inSchool?fish.y-leader.y:0;if(inSchool){fish.vx=leader.vx;fish.phase=leader.phase;}}
   B.initialize(s,fish);s.nextId++;s.fish.push(fish);return true;
  }
  return false;
 }
 function start(s,index=0){const fresh=create(s.width,s.height,s.seed);Object.assign(s,fresh);s.levelIndex=R.clamp(index,0,C.levels.length-1);s.level=C.levels[s.levelIndex];s.mode='playing';
  const pool=activePool(s).map(kindOf),food=pool.filter(f=>R.relation(s.player,f)==='food').map(f=>f.type);
  for(let i=0;i<10;i++)spawn(s,food[i%food.length]);
  const special=pool.filter(f=>f.hazard||f.motion==='chase'||f.tier===4).map(f=>f.type);
  for(const id of special){const kind=C.species[id],total=kind.hazard?s.level.maxJellies:kind.motion==='chase'?s.level.maxChasers:1;for(let i=0;i<total;i++)spawn(s,id);}
  for(const kind of pool)if(kind.tier>=1&&!special.includes(kind.type))spawn(s,kind.type,{tier:kind.tier});s.phase=objective(s).phase;
 }
 function dash(s){const p=s.player;if(s.mode!=='playing'||p.cooldown>0)return false;p.cooldown=C.dashCooldown;p.dashTime=C.dashDuration;return true;}
 function pause(s){if(s.mode!=='playing')return false;s.mode='paused';s.player.vx=s.player.vy=0;s.player.dashTime=0;s.accumulator=0;return true;}
 function resume(s){if(s.mode!=='paused')return false;s.mode='playing';s.accumulator=0;return true;}
 function resize(s,width,height){({width,height}=worldSize(width,height));const sx=width/s.width,sy=height/s.height;s.width=width;s.height=height;for(const fish of [s.player,...s.fish]){fish.x*=sx;fish.y*=sy;if(Number.isFinite(fish.baseY))fish.baseY*=sy;if(Number.isFinite(fish.anchorX))fish.anchorX*=sx;if(Number.isFinite(fish.anchorY))fish.anchorY*=sy;if(Number.isFinite(fish.schoolOffset))fish.schoolOffset*=sy;R.bound(fish,width,height);}s.accumulator=0;}
 function safePosition(s){let best={x:s.width*.5,y:s.height*.5},score=-1;for(const fx of [.16,.5,.84])for(const fy of [.16,.5,.84]){const point={...s.player,x:s.width*fx,y:s.height*fy};R.bound(point,s.width,s.height);const distance=Math.min(...s.fish.filter(f=>!f.dead&&R.relation(s.player,f)==='danger').map(f=>Math.hypot(f.x-point.x,f.y-point.y)));if(distance>score){score=distance;best=point;}}return best;}
 function effect(s,kind,x,y){s.effects.push({kind,x,y,life:kind==='grow'?.7:.35,age:0});if(s.effects.length>20)s.effects.shift();}
 function step(s,input={}){if(s.mode!=='playing')return;const dt=C.step,p=s.player,oldP={x:p.x,y:p.y},startTier=p.tier;s.time+=dt;
  p.cooldown=Math.max(0,p.cooldown-dt);p.invulnerable=Math.max(0,p.invulnerable-dt);p.dashTime=Math.max(0,p.dashTime-dt);
  let dx=Number(input.x)||0,dy=Number(input.y)||0;
  // Clamp the final step to the target, including fractional logical pixels.
  if(input.target){dx=input.target.x-p.x;dy=input.target.y-p.y;const distance=Math.hypot(dx,dy),travel=190*dt;if(distance>0){const factor=Math.min(1,distance/travel)/distance;dx*=factor;dy*=factor;}}
  const length=Math.hypot(dx,dy);if(length>1){dx/=length;dy/=length;}
  if(dx||dy){const n=Math.hypot(dx,dy);p.headingX=dx/n;p.headingY=dy/n;}
  const speed=p.dashTime>0?480:190;p.vx=(p.dashTime>0?p.headingX:dx)*speed;p.vy=(p.dashTime>0?p.headingY:dy)*speed;p.x+=p.vx*dt;p.y+=p.vy*dt;R.bound(p,s.width,s.height);
  const contacts=[];
  for(const f of s.fish){const oldF={x:f.x,y:f.y};f.warning=Math.max(0,f.warning-dt);f.age+=dt;if(f.warning>0)continue;
   B.move(s,f,dt);
   if(!f.dead&&R.swept(p,f,oldP,oldF))contacts.push(f);
  }
  const danger=contacts.find(f=>f.hazard||f.tier>startTier);
  if(danger&&p.invulnerable<=0){const safe=safePosition(s);if(R.hurt(p,safe.x,safe.y)){s.hits++;effect(s,'hurt',p.x,p.y);if(p.lives===0)s.mode='lost';}}
  else for(const f of contacts)if(!f.hazard&&f.tier<startTier){const tier=p.tier,reverse=objective(s).phase==='reverse';if(R.eat(p,f,s.time)){s.eaten++;s.caught[f.type]=(s.caught[f.type]||0)+1;if(Number.isInteger(f.lane)&&!s.lanesEaten.includes(f.lane))s.lanesEaten.push(f.lane);if(Number.isInteger(f.schoolId)){s.shoalCount=s.shoalId===f.schoolId&&s.time-s.shoalTime<2?s.shoalCount+1:1;s.shoalId=f.schoolId;s.shoalTime=s.time;s.bestShoal=Math.max(s.bestShoal,s.shoalCount);}if(reverse&&f.type===s.level.finish.type&&f.tier===s.level.finish.tier)s.revengeCount++;p.growth=Math.min(p.growth,s.level.goal);R.grow(p);effect(s,'eat',f.x,f.y);if(p.tier>tier){R.bound(p,s.width,s.height);effect(s,'grow',p.x,p.y);}}}
  s.fish=s.fish.filter(f=>!f.dead);s.effects=s.effects.filter(e=>{e.life-=dt;e.age+=dt;return e.life>0;});
  if(s.mode!=='playing')return;
  const status=objective(s);s.phase=status.phase;if(status.complete){s.mode='won';p.vx=p.vy=0;p.dashTime=0;return;}
  const previousStage=s.stageIndex,pool=activePool(s).map(kindOf).filter(f=>s.phase!=='reverse'||f.hazard||R.relation(p,f)!=='danger'),edible=pool.filter(f=>R.relation(p,f)==='food').map(f=>f.type),foodCount=s.fish.filter(f=>R.relation(p,f)==='food').length;
  if(s.phase!=='reverse'&&s.stageIndex!==previousStage){const pressure=s.level.stages[s.stageIndex].pressure;if(pressure)for(let i=0;i<pressure.need;i++)spawn(s,pressure.type,{tier:pressure.tier,patrol:true});}
  s.foodTimer-=dt;if(s.foodTimer<=0){s.foodTimer=s.level.foodEvery||1.5;if(foodCount<s.level.foodMinimum&&edible.length){const type=edible[Math.floor(random(s)*edible.length)];for(let i=0;i<Math.min(3,s.level.foodMinimum-foodCount);i++)spawn(s,type);}}
  s.objectiveTimer-=dt;if(s.objectiveTimer<=0){s.objectiveTimer=1;let target=null;if(status.kind==='revenge')target={type:status.type,tier:status.tier};else if(status.kind==='catch')target={type:status.type,tier:C.species[status.type].tier};else if(status.kind==='shoal')target={type:'fry',tier:0};if(target){const total=s.fish.filter(f=>!f.dead&&f.type===target.type&&f.tier===target.tier).length,need=status.kind==='shoal'?s.level.schoolSize:1;for(let i=total;i<need;i++)spawn(s,target.type,{tier:target.tier,target:true});}}
  s.spawnTimer-=dt;if(s.spawnTimer<=0&&pool.length){s.spawnTimer=s.level.spawnEvery;const kind=pool[Math.floor(random(s)*pool.length)];spawn(s,kind.type,{tier:kind.tier});}
 }
 function advance(s,elapsed,input={}){if(s.mode!=='playing')return;s.accumulator+=Math.max(0,Math.min(.25,elapsed));let count=0;while(s.accumulator+1e-10>=C.step&&count++<31&&s.mode==='playing'){s.accumulator-=C.step;step(s,input);}if(s.mode!=='playing')s.accumulator=0;}
 function snapshot(s){return JSON.parse(JSON.stringify({...s,goalStatus:objective(s)}));}
 return{create,start,spawn,dash,pause,resume,resize,step,advance,snapshot,objective};
});
