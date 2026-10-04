(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FlappyRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function updatePhysics(bird, dt, gravity = 1050) {
    const vy = bird.vy + gravity * dt;
    const y = bird.y + bird.vy * dt + 0.5 * gravity * dt * dt;
    return { ...bird, y, vy };
  }

  function flap(bird, flapVelocity = -340) {
    return { ...bird, vy: flapVelocity };
  }

  function checkPipeCollision(bird, pipe) {
    if (!bird || !pipe) return false;
    const nearestX=Math.max(pipe.x,Math.min(pipe.x+pipe.width,bird.x));
    const dx=bird.x-nearestX;
    const topY=Math.min(bird.y,pipe.topY),bottomY=Math.max(bird.y,pipe.bottomY);
    return dx*dx+(bird.y-topY)**2<bird.r**2 || dx*dx+(bird.y-bottomY)**2<bird.r**2;
  }


  const CONSTANTS=Object.freeze({WIDTH:400,HEIGHT:600,GROUND_Y:568,GRAVITY:1050,FLAP_VELOCITY:-350,SPEED:135,GAP:140,PIPE_WIDTH:52,STEP:1/120});
  function randomUnit(rng){const n=rng();return Number.isFinite(n)?Math.max(0,Math.min(1,n)):0}
  function makePipe(x,rng=Math.random){const topY=65+randomUnit(rng)*(CONSTANTS.GROUND_Y-CONSTANTS.GAP-130);return{x,width:CONSTANTS.PIPE_WIDTH,topY,bottomY:topY+CONSTANTS.GAP,scored:false,seed:randomUnit(rng)*10}}
  function createWorld(rng=Math.random){return{bird:{x:90,y:260,vy:0,r:14,angle:0},pipes:[makePipe(460,rng),makePipe(680,rng)],score:0,dead:false,time:0}}
  function stepWorld(world,dt,rng){
    const bird=updatePhysics(world.bird,dt,CONSTANTS.GRAVITY);
    bird.angle=bird.vy<-50?-.38:Math.min(1.2,bird.angle+dt*2.8);
    const pipes=world.pipes.map(p=>({...p,x:p.x-CONSTANTS.SPEED*dt}));
    const next={...world,bird,pipes,time:world.time+dt};
    if(bird.y-bird.r<=0||bird.y+bird.r>=CONSTANTS.GROUND_Y){bird.y=Math.max(bird.r,Math.min(CONSTANTS.GROUND_Y-bird.r,bird.y));return{...next,dead:true}}
    if(pipes.some(p=>checkPipeCollision(bird,p)))return{...next,dead:true};
    for(const p of pipes)if(!p.scored&&p.x+p.width<bird.x-bird.r){p.scored=true;next.score++}
    const last=pipes[pipes.length-1];if(last&&last.x<CONSTANTS.WIDTH-210)pipes.push(makePipe(last.x+230,rng));
    next.pipes=pipes.filter(p=>p.x+p.width>-20);return next;
  }
  function advanceWorld(world,dt,rng=Math.random){
    if(world.dead||!Number.isFinite(dt)||dt<=0)return world;
    let remaining=Math.min(.25,dt),out=world;
    while(remaining>1e-10&&!out.dead){const step=Math.min(CONSTANTS.STEP,remaining);out=stepWorld(out,step,rng);remaining-=step}
    return out;
  }

  return {
    CONSTANTS,makePipe,createWorld,advanceWorld,
    updatePhysics,
    flap,
    checkPipeCollision,
  };
});
