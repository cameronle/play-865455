'use strict';
// QA-only observer. Forecasts operate on detached copies. Public commands are
// ordinary movement and the game's real dash, never injected lives/food/time.
const R=require('../fish-feast/rules.js'),B=require('../fish-feast/behaviors.js'),C=require('../fish-feast/content.js');
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),cache=new WeakMap();
function priority(s,f){
 const c=s.level.challenge,done=!c||(c.kind==='catch'?(s.caught?.[c.type]||0)>=c.need:c.kind==='lanes'?(s.lanesEaten||[]).length>=c.need:(s.bestShoal||0)>=c.need);
 if(s.player.growth>=s.level.goal&&done)return f.type===s.level.finish.type&&f.tier===s.level.finish.tier?24:1;
 if(c?.kind==='catch'&&!done)return f.type===c.type?8:1;
 if(c?.kind==='shoal'&&!done)return f.motion==='school'?(s.shoalId===f.schoolId&&s.time-s.shoalTime<1.8?20:6):1;
 if(c?.kind==='lanes'&&!done)return Number.isInteger(f.lane)&&!s.lanesEaten.includes(f.lane)?6:1;
 return Math.max(1,f.nutrition||1);
}
function decide(s){
 const previous=cache.get(s);if(previous&&previous.time===s.time)return previous.command;
 const p=s.player,pg=R.geometry(p),available=s.fish.filter(f=>!f.dead&&!f.warning&&R.relation(p,f)==='food'),required=available.filter(f=>priority(s,f)===24),food=(required.length?required:available).sort((a,b)=>distance(p,a)/priority(s,a)-distance(p,b)/priority(s,b));
 const danger=s.fish.filter(f=>!f.dead&&R.relation(p,f)==='danger'&&distance(p,f)<pg.rx+R.geometry(f).rx+190*1.2+(480-190)*C.dashDuration+205*1.2+24),bound=q=>({x:R.clamp(q.x,pg.rx,s.width-pg.rx),y:R.clamp(q.y,pg.ry,s.height-pg.ry)}),goal=food[0]||p;
 let command={target:bound(goal),dash:false};
 if(danger.length){
  const candidates=[bound(p),...food.slice(0,4).map(bound)];
  for(let i=0;i<16;i++){const a=i*Math.PI/8;candidates.push(bound({x:p.x+Math.cos(a)*190,y:p.y+Math.sin(a)*190}));}
  let best=-Infinity;
  for(const target of candidates)for(const useDash of [false,true]){
   if(useDash&&(p.cooldown>0||p.dashTime>0||distance(p,target)<50))continue;
   const player={...p},fish=danger.map(f=>({...f})),world={...s,player,fish},obstacles=fish;
   let collisions=0,minGap=1000,travel=0,dashTime=useDash?C.dashDuration:p.dashTime;
   // Re-run the actual AI against this candidate player's changing position.
   // Sweep every substep; constant-velocity prediction misses chase turns.
   for(let i=0;i<36;i++){
    const dt=1/30,oldP={x:player.x,y:player.y},remaining=distance(player,target);dashTime=Math.max(0,dashTime-dt);
    if(remaining>=2){player.headingX=(target.x-player.x)/remaining;player.headingY=(target.y-player.y)/remaining;}
    const step=dashTime>0?480*dt:remaining>=2?Math.min(remaining,190*dt):0;
    player.x+=player.headingX*step;player.y+=player.headingY*step;R.bound(player,s.width,s.height);travel+=step;player.invulnerable=Math.max(0,player.invulnerable-dt);
    for(const f of obstacles){const oldF={x:f.x,y:f.y};f.warning=Math.max(0,(f.warning||0)-dt);f.age+=dt;if(f.warning>0)continue;B.move(world,f,dt);if(player.invulnerable<=0){const g=R.geometry(f),gap=Math.hypot(Math.max(0,Math.abs(player.x-f.x)-pg.half-g.half),player.y-f.y)-pg.ry-g.ry;minGap=Math.min(minGap,gap);if(R.swept(player,f,oldP,oldF))collisions++;}}
   }
   const score=-collisions*10000+Math.min(12,minGap)*2-distance(player,goal)*.8-travel*.01-(useDash?60:0);
   if(score>best){best=score;command={target,dash:useDash};}
  }
 }
 cache.set(s,{time:s.time,command});return command;
}
function aim(s){return decide(s).target;}
function shouldDash(s,target){const c=decide(s);return c.dash&&(!target||target.x===c.target.x&&target.y===c.target.y);}
module.exports={aim,shouldDash,decide};
