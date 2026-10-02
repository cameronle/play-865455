(function(root,factory){const node=typeof module==='object'&&module.exports,api=factory(node?require('./rules.js'):root.BubbleFrontier.Rules,node?require('./content.js'):root.BubbleFrontier.Content);if(node)module.exports=api;else(root.BubbleFrontier||={}).Skills=api;})(typeof globalThis!=='undefined'?globalThis:this,function(R,D){
 'use strict';const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 function activate(state,room,h){const p=state.player;
  if(p.skill==='emp'){for(const e of room.enemies)if(e.hp>0&&dist(e,p)<140){e.frozen=e.kind==='boss'?.12:.9;h.hurt(state,room,e,7,{skill:'emp'});if(e.charge){e.charge=0;h.effect(room,'discharge',e.x,e.y,{r:75});for(const other of room.enemies)if(other.hp>0&&dist(e,other)<75)h.hurt(state,room,other,4,{skill:'emp'});}}let removed=0;for(const b of room.shots)if(b.owner==='enemy'&&dist(b,p)<160&&removed<24){b.ttl=0;removed++;}h.effect(room,'emp',p.x,p.y,{r:140});return true;}
  if(p.skill==='blink'){const old={x:p.x,y:p.y};p.x+=Math.cos(p.angle)*140;p.y+=Math.sin(p.angle)*140;const d=Math.hypot(p.x-400,p.y-400);if(d>330){p.x=400+(p.x-400)/d*330;p.y=400+(p.y-400)/d*330;}p.invulnerable=Math.max(p.invulnerable,.45);if(R.activeLoadout(p).some(g=>g.id==='orbit'))for(let i=0;i<3;i++)h.shot(state,room,old.x,old.y,0,{weapon:'orbit',vx:0,vy:0,r:7,orbitRadius:50,orbitPhase:i*Math.PI*2/3,anchorX:old.x,anchorY:old.y,damage:2,contactClock:0,ttl:.7,mount:'blink'});h.effect(room,'blink',old.x,old.y,{r:35});return true;}
  if(p.skill==='barrier'){p.barrierTime=3;p.barrierRadius=76+R.tier(p.mass)*3;p.barrierGap=p.chassis==='bulwark'?.24:.55;h.effect(room,'barrier',p.x,p.y,{r:p.barrierRadius});return true;}
  if(p.skill==='burst'){for(const e of room.enemies){const d=dist(e,p);if(e.hp>0&&d<135&&d){h.hurt(state,room,e,12+R.tier(p.mass)*2,{skill:'burst'});const force=e.kind==='boss'?5:40;e.x+=(e.x-p.x)/d*force;e.y+=(e.y-p.y)/d*force;}}let removed=0,converted=0;for(const b of room.shots)if(b.owner==='enemy'&&b.ttl>0&&dist(b,p)<150&&removed<24){b.ttl=0;removed++;if(converted<Math.min(4,(p.passives.converter||0)*2)){room.drops.push({id:'convert:'+ ++state.nextId,x:b.x,y:b.y,r:4,value:1,source:'self',collected:false});converted++;}}h.effect(room,'burst',p.x,p.y,{r:135});return true;}
  if(p.skill==='decoy'){h.effect(room,'decoy',p.x-Math.sin(p.angle)*65,p.y+Math.cos(p.angle)*65,{r:18,ttl:3,duration:3,mine:R.activeLoadout(p).some(g=>g.id==='mine')});return true;}
  if(p.skill==='overdrive'){p.overdriveTime=4;h.effect(room,'overdrive',p.x,p.y,{r:42});return true;}
  if(p.skill==='swarm'){const count=Math.min(6,3+(p.passives.swarm_expand||0)+(p.chassis==='swarmbody'?1:0)),existing=room.shots.filter(b=>b.weapon==='drone'&&b.ttl>0).length;for(let i=existing;i<count;i++){const phase=i*Math.PI*2/count;h.shot(state,room,p.x+Math.cos(phase)*65,p.y+Math.sin(phase)*65,0,{weapon:'drone',vx:0,vy:0,r:8,damage:0,phase,droneClock:0,ttl:5+(p.relics?.active_hive?2:0)});}h.effect(room,'swarm',p.x,p.y,{r:65});return true;}
  // SKILL ACTIVATIONS
  return false;
 }
 function tick(state,room,dt,h){const p=state.player;
  if(p.barrierTime>0){p.barrierTime=Math.max(0,p.barrierTime-dt);for(const b of room.shots){const a=Math.atan2(b.y-p.y,b.x-p.x),delta=Math.abs(Math.atan2(Math.sin(a-p.angle),Math.cos(a-p.angle)));if(b.owner==='enemy'&&b.ttl>0&&Math.abs(dist(b,p)-p.barrierRadius)<9+b.r&&delta>p.barrierGap){b.ttl=0;h.effect(room,'intercept',b.x,b.y,{r:14,ttl:.2,duration:.2});}}}
  for(const f of room.effects)if(f.kind==='decoy'&&f.ttl<=dt&&f.mine&&!f.expired){f.expired=true;h.shot(state,room,f.x,f.y,0,{weapon:'mine',vx:0,vy:0,r:8,arm:.4,ttl:8,damage:14,mount:'decoy'});}
  p.overdriveTime=Math.max(0,(p.overdriveTime||0)-dt);
  for(const drone of room.shots.filter(b=>b.weapon==='drone'&&b.ttl>0)){const target=room.enemies.find(e=>e.hp>0&&e.id===state.target)||room.enemies.find(e=>e.hp>0),a=state.time*1.5+drone.phase,at=target||p,x=at.x+Math.cos(a)*35,y=at.y+Math.sin(a)*35;drone.x+=(x-drone.x)*Math.min(1,dt*2.8);drone.y+=(y-drone.y)*Math.min(1,dt*2.8);drone.droneClock-=dt;if(target&&drone.droneClock<=0&&dist(drone,target)<300){drone.droneClock+=.55;h.shot(state,room,drone.x,drone.y,Math.atan2(target.y-drone.y,target.x-drone.x),{weapon:'drone_pulse',damage:4,r:3,speed:310,ttl:1.4});}}
  for(const slot of Object.keys(p.heat||{}))p.heat[slot]=Math.max(0,p.heat[slot]-dt*.35*(1+(p.passives.cooling||0)*.5));
  // SKILL TIMER HANDLERS
 }
 return{activate,tick};
});
