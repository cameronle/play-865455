(function(root,factory){'use strict';const node=typeof module==='object'&&module.exports,api=factory(node?require('./rules.js'):root.FishFeast.Rules);if(node)module.exports=api;else root.FishFeast.Behaviors=api;})(globalThis,function(R){
 'use strict';
 function initialize(s,f){f.intent='patrol';f.intentTime=0;f.aiCooldown=2.4+(f.phase||0)*.15;f.anchorX=f.x;f.anchorY=f.y;f.verticalFlip=1;}
 function move(s,f,dt){
  const direction=Math.sign(f.vx)||1;
  f.aiCooldown=Math.max(0,(f.aiCooldown||0)-dt);
  if(f.motion==='zigzag'){f.vx=direction*f.speed;f.vy=f.speed*.58*(Math.floor((f.age+(f.phase||0))*.75)%2?-1:1)*(f.verticalFlip||1);}
  if(f.motion==='burst'){
   if(f.intent==='patrol'&&f.aiCooldown<=0){f.intent='coil';f.intentTime=.55;}
   else if(f.intent==='coil'){f.intentTime-=dt;if(f.intentTime<=0){f.intent='burst';f.intentTime=.48;}}
   else if(f.intent==='burst'){f.intentTime-=dt;if(f.intentTime<=0){f.intent='patrol';f.aiCooldown=3.2;}}
   f.vx=direction*f.speed*(f.intent==='burst'?2.2:f.intent==='coil'?.35:1);f.vy=0;
  }
  if(f.motion==='chase'){
   const dx=s.player.x-f.x,dy=s.player.y-f.y,distance=Math.hypot(dx,dy),isThreat=R.relation(s.player,f)==='danger';
   if(!isThreat||distance>275){if(f.intent!=='patrol')f.aiCooldown=4.2;f.intent='patrol';f.intentTime=0;}
   else if(f.intent==='patrol'&&f.aiCooldown<=0&&s.player.invulnerable<=0&&distance<220&&s.fish.filter(other=>other.motion==='chase'&&(other.intent==='windup'||other.intent==='chase')).length<s.level.maxChasers){f.intent='windup';f.intentTime=.65;}
   else if(f.intent==='windup'){f.intentTime-=dt;if(f.intentTime<=0){f.intent='chase';f.intentTime=1.35;}}
   else if(f.intent==='chase'){f.intentTime-=dt;if(f.intentTime<=0){f.intent='patrol';f.aiCooldown=4.2;}}
   if(f.intent==='chase'){f.vx=dx/(distance||1)*110;f.vy=dy/(distance||1)*110;}
   else{f.vx=direction*f.speed*(f.intent==='windup'?.3:1);f.vy=R.clamp(f.vy,-f.speed*.3,f.speed*.3)*Math.exp(-dt*2);}
  }
  if(s.level.lanes&&Number.isInteger(f.lane)&&['cruise','school'].includes(f.motion))f.vy=R.clamp((f.baseY-f.y)*1.2,-f.speed*.35,f.speed*.35);
  if(f.motion==='school'&&s.level.schoolSize>1&&f.schoolId!==f.id){const leader=s.fish.find(member=>!member.dead&&member.id===f.schoolId);if(leader){const targetX=leader.x-(Math.sign(leader.vx)||1)*(R.geometry(f).rx*2+12)*f.schoolSlot;f.vx=leader.vx+R.clamp((targetX-f.x)*.5,-f.speed*.2,f.speed*.2);f.vy=R.clamp((leader.y+f.schoolOffset-f.y)*2,-f.speed*.4,f.speed*.4);}}
  if(f.motion==='float'){f.vx=(f.anchorX+Math.sin(f.age*.5+f.phase)*12-f.x)*1.2;f.vy=(f.anchorY+Math.sin(f.age*.8+f.phase)*9-f.y)*1.4;}
  f.x+=f.vx*dt;f.y+=f.vy*dt;if(f.motion==='school'&&s.level.schoolSize===1)f.y+=Math.sin(f.age*1.4+f.phase)*8*dt;
  const g=R.geometry(f);
  if(f.x<g.rx){f.x=g.rx;f.vx=Math.abs(f.vx);}if(f.x>s.width-g.rx){f.x=s.width-g.rx;f.vx=-Math.abs(f.vx);}
  if(f.y<g.ry){f.y=g.ry;f.vy=Math.abs(f.vy);f.verticalFlip=-(f.verticalFlip||1);}if(f.y>s.height-g.ry){f.y=s.height-g.ry;f.vy=-Math.abs(f.vy);f.verticalFlip=-(f.verticalFlip||1);}
 }
 return{initialize,move};
});
