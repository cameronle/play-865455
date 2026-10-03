(function(root,factory){
  const rules=factory();
  if(typeof module==='object'&&module.exports)module.exports=rules;
  else root.DoodleHopRules=rules;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const PHYSICS=Object.freeze({step:1/120,gravity:1500,jump:670,spring:900,maxSpeed:330,acceleration:1450,reverseAcceleration:1900,releaseDrag:6,drag: -10*Math.log(.82)});
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  function horizontalVelocity(velocity,direction,dt){
    const acceleration=direction*velocity<0?PHYSICS.reverseAcceleration:PHYSICS.acceleration;
    const drag=direction===0?PHYSICS.releaseDrag:PHYSICS.drag;
    const next=clamp((velocity+direction*acceleration*dt)*Math.exp(-drag*dt),-PHYSICS.maxSpeed,PHYSICS.maxSpeed);
    return !direction&&Math.abs(next)<.5?0:next;
  }
  function steerTowards(x,velocity,target){
    const error=target-x;
    if(Math.abs(error)<3)return 0;
    const sign=Math.sign(error),stopping=velocity*velocity/(2*PHYSICS.reverseAcceleration);
    return Math.sign(velocity)===sign&&Math.abs(error)<stopping+4?-sign:sign;
  }
  // Execute the same motion as the game; check descent, footprint and target motion.
  function canReach(from,to,{vx=0,xOffset=0,speed=PHYSICS.jump,width=480}={}){
    if(from.broken||to.broken||to.alpha<=.15)return false;
    let x=from.x+from.w/2-22+xOffset,bottom=from.y,vy=-speed,tx=to.x,tvx=to.vx||0;
    const dt=PHYSICS.step;
    for(let n=0;n<240;n++){
      const previous=bottom;
      if(tvx){tx+=tvx*dt;if(tx<4){tx=4;tvx=Math.abs(tvx)}if(tx+to.w>width-4){tx=width-4-to.w;tvx=-Math.abs(tvx)}}
      vx=horizontalVelocity(vx,steerTowards(x+22,vx,tx+to.w/2),dt);x+=vx*dt;
      if(x+44<0)x=width;else if(x>width)x=-44;
      vy+=PHYSICS.gravity*dt;bottom+=vy*dt;
      if(vy>0&&previous<=to.y+3&&bottom>=to.y)return x+44>tx+10&&x<tx+to.w-10;
      if(vy>0&&bottom>Math.max(from.y,to.y)+50)return false;
    }
    return false;
  }
  function hasSafeApproach(from,to){
    return [-PHYSICS.maxSpeed,0,PHYSICS.maxSpeed].every(vx=>[-22,0,22].every(xOffset=>canReach(from,to,{vx,xOffset})));
  }
  return Object.freeze({PHYSICS,clamp,horizontalVelocity,steerTowards,canReach,hasSafeApproach});
});
