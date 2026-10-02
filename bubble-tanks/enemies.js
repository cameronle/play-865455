(function(root,factory){const node=typeof module==='object'&&module.exports,api=factory(node?require('./content.js'):root.BubbleFrontier.Content);if(node)module.exports=api;else(root.BubbleFrontier||={}).Enemies=api;})(typeof globalThis!=='undefined'?globalThis:this,function(D){
 'use strict';const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),delta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b)),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 function child(c,kind,x,y,extra={}){if(c.room.enemies.filter(e=>e.hp>0).length>=24)return;const def=D.enemies.find(e=>e.id===kind),e={id:'child:'+ ++c.state.nextId,kind,x,y,r:def?.r||10,hp:18,maxHp:18,phase:0,angle:0,cooldown:1,warning:0,slow:0,hit:0,rewarded:false,rewardless:true,...extra};c.room.enemies.push(e);return e;}
 function move(c,a,speed){c.enemy.x+=Math.cos(a)*speed*c.dt*c.slow;c.enemy.y+=Math.sin(a)*speed*c.dt*c.slow;}
 function shot(c,a,opts={}){c.h.shot(c.state,c.room,c.enemy.x,c.enemy.y,a,{owner:'enemy',speed:145,damage:6,r:5,ttl:4,...opts});}
 function warn(c,seconds,length,fire,cooldown=3){const e=c.enemy;if(e.cooldown<=0&&!e.warning){e.warning=seconds;e.fireAngle=c.a;c.h.effect(c.room,'aim',e.x,e.y,{angle:e.fireAngle,length,ttl:seconds,duration:seconds});}if(e.warning>0){e.warning-=c.dt;if(e.warning<=0){e.warning=0;e.cooldown=cooldown;fire(c);}}}
 const handlers={
  grazer(c){move(c,c.state.target===c.enemy.id?c.a+Math.PI/2:c.enemy.phase+1,c.state.target===c.enemy.id?48:18);},
  shooter(c){const e=c.enemy;if(e.burstLeft>0){e.burstClock-=c.dt;if(e.burstClock<=0){shot(c,e.fireAngle);e.burstLeft--;e.burstClock+=.12;}}else warn(c,.38,95,()=>{e.burstLeft=3;e.burstClock=0;},2.5);},
  sniper(c){warn(c,.85,650,x=>shot(x,x.enemy.fireAngle,{speed:320,damage:9,r:4,weapon:'enemy_needle'}),3.5);},
  scatterer(c){if(c.d>190)move(c,c.a,25);if(c.d<240)warn(c,.5,110,x=>{for(let i=-2;i<=2;i++)shot(x,x.enemy.fireAngle+i*.18,{speed:150,r:5});},2.8);},
  guardian(c){c.enemy.angle+=clamp(delta(c.a,c.enemy.angle),-.8*c.dt,.8*c.dt);if(c.d>145)move(c,c.a,23);warn(c,.5,80,x=>shot(x,x.enemy.angle,{speed:140}),3.1);},
  spawner(c){const e=c.enemy;if((e.waves||0)>=3)return;warn(c,.75,90,x=>{for(const side of [-1,1])child(x,'chaser',e.x+side*28,e.y,{r:10,parent:e.id});e.waves=(e.waves||0)+1;},4);},
  miner(c){move(c,c.enemy.phase+.8,27);if(c.enemy.cooldown<=0&&c.room.shots.filter(b=>b.weapon==='hostile_mine'&&b.parent===c.enemy.id&&b.ttl>0).length<4){shot(c,0,{weapon:'hostile_mine',vx:0,vy:0,arm:.8,r:9,ttl:7,damage:8,parent:c.enemy.id});c.enemy.cooldown=1.8;}},
  splitter(c){move(c,c.a,32);},
  laser(c){const e=c.enemy;if(e.beamTime>0){e.beamTime=Math.max(0,e.beamTime-c.dt);c.h.effect(c.room,'enemyBeam',e.x,e.y,{angle:e.fireAngle,length:650,r:4,ttl:.05,duration:.05});e.beamClock-=c.dt;if(e.beamClock<=0){e.beamClock+=.15;for(const circle of c.h.circles(c.p)){const x=circle.x-e.x,y=circle.y-e.y,t=x*Math.cos(e.fireAngle)+y*Math.sin(e.fireAngle),v=Math.abs(-x*Math.sin(e.fireAngle)+y*Math.cos(e.fireAngle));if(t>0&&t<650&&v<circle.r+4){c.h.hurtPlayer(c.state,c.room,8);break;}}}}else warn(c,.85,650,()=>{e.beamTime=.6;e.beamClock=0;},3.4);},
  vortexer(c){if(c.enemy.cooldown<=0){c.h.effect(c.room,'enemyPullWarning',c.p.x,c.p.y,{r:95,ttl:.8,duration:.8,fieldKind:'pullWarning'});c.enemy.cooldown=4.5;}},
  bomber(c){const e=c.enemy;if(e.fuse>0){e.fuse-=c.dt;if(e.fuse<=0){if(c.d<90)c.h.hurtPlayer(c.state,c.room,12);c.h.effect(c.room,'enemyBlast',e.x,e.y,{r:90});e.hp=0;e.rewarded=true;}}else if(c.d<100){e.fuse=.7;c.h.effect(c.room,'fuse',e.x,e.y,{r:90,ttl:.7,duration:.7});}else move(c,c.a,60);},
  healer(c){if(c.d<170)move(c,c.a+Math.PI,24);if(c.enemy.cooldown<=0){const ally=c.room.enemies.filter(e=>e!==c.enemy&&e.hp>0&&e.hp<e.maxHp&&dist(e,c.enemy)<160).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(ally){ally.hp=Math.min(ally.maxHp,ally.hp+6);c.h.effect(c.room,'healLink',c.enemy.x,c.enemy.y,{toX:ally.x,toY:ally.y,ttl:.5,duration:.5});}c.enemy.cooldown=1.5;}},
  leecher(c){if(c.d>65)move(c,c.a,46);if(c.d<85&&c.enemy.cooldown<=0){const before=c.p.mass;c.h.hurtPlayer(c.state,c.room,5);c.enemy.hp=Math.min(c.enemy.maxHp,c.enemy.hp+Math.max(0,before-c.p.mass));c.enemy.cooldown=2;c.h.effect(c.room,'drain',c.enemy.x,c.enemy.y,{toX:c.p.x,toY:c.p.y,ttl:.35,duration:.35});}},
  lobber(c){if(c.enemy.cooldown<=0){let x=c.p.x+(c.p.moveX||0)*.4,y=c.p.y+(c.p.moveY||0)*.4;const d=Math.hypot(x-400,y-400);if(d>290){x=400+(x-400)/d*290;y=400+(y-400)/d*290;}c.h.effect(c.room,'bombWarning',x,y,{r:55,ttl:.85,duration:.85,fieldKind:'blastWarning'});c.enemy.cooldown=3.6;}},
  teleporter(c){const e=c.enemy;if(e.warpClock>0){e.warpClock-=c.dt;if(e.warpClock<=0){e.x=e.nextX;e.y=e.nextY;e.cooldown=3.4;c.h.effect(c.room,'warp',e.x,e.y,{r:30});}}else if(e.cooldown<=0){let a=e.phase*2.3+1.2;e.nextX=400+Math.cos(a)*220;e.nextY=400+Math.sin(a)*220;if(dist({x:e.nextX,y:e.nextY},c.p)<120){a+=Math.PI;e.nextX=400+Math.cos(a)*220;e.nextY=400+Math.sin(a)*220;}e.warpClock=.7;c.h.effect(c.room,'warpMark',e.nextX,e.nextY,{r:25,ttl:.7,duration:.7});}},
  reflector(c){c.enemy.angle+=clamp(delta(c.a,c.enemy.angle),-.65*c.dt,.65*c.dt);if(c.d>180)move(c,c.a,17);warn(c,.55,90,x=>shot(x,x.enemy.angle),3.3);},
  breaker(c){warn(c,.7,600,x=>shot(x,x.enemy.fireAngle,{weapon:'enemy_breaker',speed:270,damage:6,r:4,shieldBreak:true}),3.4);},
  escort(c){const e=c.enemy;if(!e.escorted){e.escorted=true;for(const side of [-1,1])child(c,'core',e.x,e.y+side*38,{r:11,parent:e.id});}warn(c,.5,90,x=>shot(x,x.enemy.fireAngle),2.8);},
  // AI BEHAVIORS
 };
 function update(state,room,enemy,dt,h){const handler=handlers[enemy.kind];if(!handler)return false;const p=state.player,aim=room.effects.find(f=>f.kind==='decoy'&&f.ttl>0)||p,a=Math.atan2(aim.y-enemy.y,aim.x-enemy.x);enemy.phase+=dt;enemy.cooldown-=dt;const slow=enemy.slow>0?.45:1;enemy.slow=Math.max(0,(enemy.slow||0)-dt);if(!['guardian','reflector'].includes(enemy.kind))enemy.angle=a;handler({state,room,enemy,dt,h,p,a,d:dist(p,enemy),slow});const d=dist(enemy,{x:400,y:400});if(d>300){enemy.x=400+(enemy.x-400)/d*300;enemy.y=400+(enemy.y-400)/d*300;}return true;}
 function onDeath(state,room,enemy,h){
  if(enemy.kind==='splitter'&&!enemy.rewardless)for(const side of [-1,1])child({state,room,h},'chaser',enemy.x+side*22,enemy.y,{r:10,parent:enemy.id});
  if(enemy.kind==='escort')for(const e of room.enemies)if(e.parent===enemy.id){e.hp=0;e.rewarded=true;}
  // DEATH BEHAVIORS
 }
 function damageMultiplier(enemy,room,hit){
  if(enemy.kind==='guardian'&&Math.abs(delta(Math.atan2(hit.y-enemy.y,hit.x-enemy.x),enemy.angle))<1.05)return .25;
  if(enemy.kind==='escort'&&room.enemies.some(e=>e.parent===enemy.id&&e.hp>0))return .25;
  // DAMAGE BEHAVIORS
  return 1;
 }
 function reflect(enemy,hit){
  if(enemy.kind==='reflector'&&enemy.phase%3<1.1&&Math.abs(delta(Math.atan2(hit.y-enemy.y,hit.x-enemy.x),enemy.angle))<1.0)return true;
  // REFLECTION BEHAVIORS
  return false;
 }
 function tick(state,room,dt,h){
  for(const f of room.effects){if(f.fieldKind==='pullWarning'&&f.ttl<=dt){f.fieldKind='pull';f.kind='enemyPull';f.ttl=f.duration=1.8;f.danger=true;f.damage=5;}if(f.fieldKind==='pull'){const p=state.player,d=dist(p,f);if(d>0&&d<f.r){p.x+=(f.x-p.x)/d*40*dt;p.y+=(f.y-p.y)/d*40*dt;}}}
  for(const f of room.effects)if(f.fieldKind==='blastWarning'&&f.ttl<=dt){f.fieldKind='blast';f.kind='enemyBlast';f.ttl=f.duration=.35;f.danger=true;f.damage=8;}
  // FIELD BEHAVIORS
 }
 return{update,onDeath,damageMultiplier,reflect,tick,handlers};
});
