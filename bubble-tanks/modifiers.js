(function(root,factory){const node=typeof module==='object'&&module.exports,api=factory(node?require('./rules.js'):root.BubbleFrontier.Rules,node?require('./content.js'):root.BubbleFrontier.Content);if(node)module.exports=api;else(root.BubbleFrontier||={}).Modifiers=api;})(typeof globalThis!=='undefined'?globalThis:this,function(R,D){
 'use strict';const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 function damage(state,room,enemy,amount,hit){const p=state.player;if(hit.skill)return amount;amount*=1+(p.passives.damage||0)*.15;
  if(p.relics.glass_core)amount*=1.35;
  if(p.relics.echo_shell)amount*=.88;
  if(p.relics.active_hive&&hit.weapon!=='drone_pulse')amount*=.8;
  const copies=R.activeLoadout(p).filter(g=>g.id===hit.weapon).length;if(copies>1)amount/=1+.65*(copies-1);
  if(hit.weapon==='needle'&&p.passives.sonar&&dist(p,enemy)>240)amount*=1+p.passives.sonar*.15;
  amount*=hit.focusBoost||1;
  // DAMAGE MODIFIERS
  return amount;
 }
 function afterDamage(state,room,enemy,actual,hit,h){const p=state.player;
  if(actual>0&&enemy.hp>0&&!hit.skill){if(p.passives.frost)enemy.slow=Math.max(enemy.slow||0,enemy.kind==='boss'?.25:.4+p.passives.frost*.2);if(p.passives.conductive&&hit.weapon==='arc')enemy.charge=1.5+p.passives.conductive*.25;if(p.passives.mark)enemy.mark=1.5+p.passives.mark*.25;}if(enemy.hp<=0){enemy.mark=enemy.charge=0;}
  if(actual>0&&p.passives.siphon&&hit.weapon&&!hit.skill&&!enemy.rewardless&&!['vortex','orbit','fragment','mine','drone_pulse','tail'].includes(hit.weapon)){const window=Math.floor(state.time);if(p.siphonWindow!==window){p.siphonWindow=window;p.siphonUsed=0;}const cap=p.passives.siphon*2*(p.overdriveTime>0?1.5:1),gain=Math.min(Math.max(0,400-p.mass),Math.max(0,cap-(p.siphonUsed||0)),actual*.06*p.passives.siphon);p.mass+=gain;p.siphonUsed=(p.siphonUsed||0)+gain;}
  if(actual>0&&enemy.hp>0&&hit.weapon==='beam'&&p.relics.ice_crystal&&state.time>=(enemy.freezeImmuneUntil||0)){if(state.time-(enemy.beamHitAt??state.time)>.3)enemy.beamExposure=0;enemy.beamHitAt=state.time;enemy.beamExposure=(enemy.beamExposure||0)+.12;if(enemy.beamExposure>=.48){enemy.frozen=enemy.kind==='boss'?.08:.35;enemy.freezeImmuneUntil=state.time+1.5;enemy.beamExposure=0;}}
  if(actual>0&&hit.weapon==='twin'&&p.passives.focus){p.focusHits=(p.focusHits||0)+1;if(p.focusHits>=3){p.focusReady=true;p.focusHits=0;}}
  // HIT MODIFIERS
 }
 function shot(state,opts){const p=state.player;opts={...opts};
  if(opts.modified)return opts;opts.modified=true;if(opts.owner!=='enemy'&&D.ballistic.includes(opts.weapon)){opts.generation??=0;opts.pierce=(opts.pierce||1)+(p.passives.pierce_amp||0);}
  if(opts.owner!=='enemy'&&D.ballistic.includes(opts.weapon)&&p.relics.fission_core){opts.ttl=(opts.ttl??1.8)*.8;opts.canSplit=opts.generation===0;}
  if(opts.owner!=='enemy'&&D.ballistic.includes(opts.weapon)&&p.passives.refract){opts.bounces=Math.max(opts.bounces||0,1);opts.refractBonus=p.passives.refract*.08;}
  if(opts.weapon==='twin')opts.focusBoost=p.focusVolleys?.[opts.mount]||1;
  if(opts.owner!=='enemy'&&D.ballistic.includes(opts.weapon)&&p.relics.echo_shell&&p.echoVolleys?.[opts.mount]&&!opts.echo)opts.echoCopy=true;
  // SHOT MODIFIERS
  return opts;
 }
 function beforeVolley(state,gun){const p=state.player;
  if(gun.id==='twin'){p.focusVolleys||={};p.focusVolleys[gun.slot]=p.focusReady?1+(p.passives.focus||0)*.25:1;p.focusReady=false;}
  if(p.relics.echo_shell&&D.ballistic.includes(gun.id)){p.echoCounts||={};p.echoVolleys||={};p.echoCounts[gun.slot]=(p.echoCounts[gun.slot]||0)+1;p.echoVolleys[gun.slot]=p.echoCounts[gun.slot]%3===0;}
  // VOLLEY MODIFIERS
 }
 function miss(state,shot){const p=state.player;
  if(shot.owner==='player'&&shot.weapon==='twin'&&p.passives.focus&&!shot.hitIds.length){p.focusHits=0;p.focusReady=false;}
  // MISS MODIFIERS
 }
 function tick(state,room,dt,h){const p=state.player;
  for(const f of room.effects){if(f.kind==='coldfield'&&f.ttl>0)for(const e of room.enemies)if(e.hp>0&&dist(e,f)<f.r)e.slow=Math.max(e.slow||0,.15);
   if(f.kind==='tail'&&f.ttl>0){f.clock=(f.clock||0)-dt;if(f.clock<=0){f.clock+=.25;for(const e of room.enemies)if(e.hp>0&&dist(e,f)<e.r+f.r)h.hurt(state,room,e,2,{weapon:'tail',x:f.x,y:f.y});}}}
  if(p.relics.turbulent_tail&&p.dashTime>0&&(p.tailClock=(p.tailClock||0)-dt)<=0){p.tailClock=.06;h.effect(room,'tail',p.x,p.y,{r:21,ttl:.8,duration:.8,clock:0});}
 }
 function onDash(state,room,h){const p=state.player;
  if(p.relics.turbulent_tail)h.effect(room,'tail',p.x,p.y,{r:21,ttl:.8,duration:.8,clock:0});
 }
 function speed(player,value){
  if(player.relics.heavy_core)value*=.83;
  if(player.relics.gravity_sac)value*=.9;
  return value;
 }
 function interval(player,value){
  if(player.relics.efficiency)value*=1.15;
  if(player.relics.ice_crystal)value*=1.15;
  return value;
 }
 function afterPlayerDamage(state,room,hit,h){const p=state.player;
  if(!hit.dead&&p.mass<30&&p.passives.emergency&&!room.claims.emergency){room.claims.emergency=true;p.shield=Math.max(p.shield,5*p.passives.emergency);p.invulnerable=Math.max(p.invulnerable,1.2);h.effect(room,'shield',p.x,p.y,{r:40});}
 }
 return{damage,afterDamage,shot,beforeVolley,miss,tick,onDash,speed,interval,afterPlayerDamage};
});
