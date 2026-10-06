(function(root,factory){
 "use strict";const d=factory(typeof module==="object"?require("./content"):root.SkyPatrolContent,typeof module==="object"?require("./enemies"):root.SkyPatrolEnemies,typeof module==="object"?require("./bosses"):root.SkyPatrolBosses);
 if(typeof module==="object")module.exports=d;else root.SkyPatrolDirector=d;
})(typeof globalThis!=="undefined"?globalThis:this,function(C,E,B){
 "use strict";
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function contact(a,z,b,q,rx,ry){
  let lo=0,hi=1;
  for(const [p,v,r] of [[a.x-b.x,z.x-a.x-(q.x-b.x),rx],[a.y-b.y,z.y-a.y-(q.y-b.y),ry]]){
   if(Math.abs(v)<1e-9){if(Math.abs(p)<=r)continue;return false;}
   const x=(-r-p)/v,y=(r-p)/v;lo=Math.max(lo,Math.min(x,y));hi=Math.min(hi,Math.max(x,y));if(lo>hi)return false;
  }return lo<=1&&hi>=0;
 }
 function beam(h,t){
  const warn=h.active?0:Math.max(0,h.warning),elapsed=Math.max(0,t-warn);
  const fraction=clamp((h.active?(h.duration-h.ttl):0)+elapsed,0,h.duration)/h.duration;
  return h.x+(h.reverse?1:-1)*(h.w-h.beamW)/2*(1-2*fraction);
 }
 function hazardSafe(h,a,z,t0,t1,p){
  const start=h.active?0:h.warning,end=start+h.ttl;
  if(t1<start||t0>end)return true;
  if(h.kind==="volley"){
   return h.bullets.every(b=>!contact(a,z,
     {x:b.x+b.vx*Math.max(0,t0-start),y:b.y+b.vy*Math.max(0,t0-start)},
     {x:b.x+b.vx*Math.max(0,t1-start),y:b.y+b.vy*Math.max(0,t1-start)},(p.w+6)/2+5,(p.h+12)/2+5));
  }
  if(h.kind==="route"){
   const cuts=[t0,t1];let cursor=start,last=h.origin;
   for(const v of h.route){cursor+=Math.hypot(v.x-last.x,v.y-last.y)/h.speed;if(cursor>t0&&cursor<t1)cuts.push(cursor);cursor+=v.pause||0;if(cursor>t0&&cursor<t1)cuts.push(cursor);last=v;}
   cuts.sort((a,b)=>a-b);
   const at=t=>{let q={...h.origin},remaining=Math.max(0,t-start)*h.speed;for(const v of h.route){const n=Math.hypot(v.x-q.x,v.y-q.y);if(remaining<=n)return {x:q.x+(v.x-q.x)*remaining/(n||1),y:q.y+(v.y-q.y)*remaining/(n||1)};remaining-=n;q=v;const pause=(v.pause||0)*h.speed;if(remaining<=pause)return q;remaining-=pause;}return q;};
   const ship=t=>({x:a.x+(z.x-a.x)*(t-t0)/(t1-t0),y:a.y+(z.y-a.y)*(t-t0)/(t1-t0)});
   for(let i=1;i<cuts.length;i++)if(contact(ship(cuts[i-1]),ship(cuts[i]),at(cuts[i-1]),at(cuts[i]),(p.w+h.w)/2+8,(p.h+h.h)/2+8))return false;
   return true;
  }
  if(h.kind==="laser"){
   const x0=beam(h,Math.max(start,t0)),x1=beam(h,Math.min(end,t1));
   return !contact(a,z,{x:x0,y:C.H/2},{x:x1,y:C.H/2},(p.w+h.beamW)/2+8,C.H);
  }
  const vx=z.x-a.x,vy=z.y-a.y,n=vx*vx+vy*vy,
   k=n?clamp(((h.x-a.x)*vx+(h.y-a.y)*vy)/n,0,1):0;
  return Math.hypot(a.x+k*vx-h.x,a.y+k*vy-h.y)>h.radius+Math.hypot(p.w/2,p.h/2)+8;
 }
 // Bounded, conservative time-expanded search. Nodes are real reachable ship
 // coordinates; reaction delay and swept contacts are checked on every edge.
 function escapePath(g,proposed=[],reaction=.25){
  const pending=(g.threats||[]).filter(t=>t.until>g.time).flatMap(t=>(t.specs||[]).map(h=>({...h,warning:h.warning-(g.time-t.start)})));
  const hazards=[...g.hazards,...pending,...proposed],p=g.player,dt=.22;
  const horizon=Math.min(6,Math.max(1.8,...hazards.map(h=>(h.active?0:h.warning)+h.ttl))),dirs=[[0,0],[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
  const endpoint=(a,dx,dy)=>{const n=Math.hypot(dx,dy)||1;return {x:clamp(a.x+dx/n*p.speed*dt,p.w/2,C.W-p.w/2),y:clamp(a.y+dy/n*p.speed*dt,p.h/2,C.H-p.h/2)};};
  const bodies=new Map();
  const frame=t=>{const key=Math.round(t*100000);if(!bodies.has(key))bodies.set(key,[...g.enemies.filter(e=>!e.dead).map(e=>({...E.forecast(e,t,g.mode),w:e.w,h:e.h})),...(g.boss&&g.phase==="boss"?[{...B.forecast(g.boss,t),w:g.boss.w,h:g.boss.h}]:[])]);return bodies.get(key);};
  const safe=(a,z,t)=>{
   if(hazards.some(h=>!hazardSafe(h,a,z,t,t+dt,p)))return false;
   const left=frame(t),right=frame(t+dt);
   if(left.some((e,i)=>contact(a,z,e,right[i],(p.w+e.w)/2+8,(p.h+e.h)/2+8)))return false;
   return g.enemyBullets.every(b=>!contact(a,z,{x:b.x+b.vx*t,y:b.y+b.vy*t},{x:b.x+b.vx*(t+dt),y:b.y+b.vy*(t+dt)},(p.w+b.w)/2+5,(p.h+b.h)/2+5));
  };
  // Most attacks have a simple legal escape. Validate it with exactly the same
  // swept-edge proof before expanding the full lattice; never skip a collision.
  for(const [dx,dy] of dirs){
   let a={x:p.x,y:p.y},path=[],valid=true;
   for(let t=0;t<horizon;t+=dt){const z=endpoint(a,t<reaction?0:dx,t<reaction?0:dy);if(!safe(a,z,t)){valid=false;break;}path.push(z);a=z;}
   if(valid)return path;
  }
  let nodes=[{x:p.x,y:p.y,path:[]}];
  for(let t=0;t<horizon;t+=dt){
   const next=new Map();
   for(const a of nodes)for(const [dx,dy] of t<reaction?[[0,0]]:dirs){
    const z=endpoint(a,dx,dy);if(!safe(a,z,t))continue;
    const key=Math.round(z.x/24)+","+Math.round(z.y/24);
    if(!next.has(key))next.set(key,{...z,path:[...a.path,z]});
   }
   if(!next.size)return null;nodes=[...next.values()];
  }return nodes[0].path;
 }
 function budgetKey(h){return h.kind==="mine"?"mine:"+(h.id??h.source+":"+h.x+":"+h.y):h.source;}
 function sources(g){
  return new Set([...(g.threats||[]).filter(t=>t.until>g.time&&!t.light).map(t=>t.source),...g.hazards.map(budgetKey),...g.enemyBullets.filter(b=>b.light===false).map(b=>b.source)]);
 }
 function reserve(g,source,duration,specs=[]){
  const light=specs.length>0&&specs.every(h=>h.light);
  const used=sources(g);if(!light&&!used.has(source)&&used.size>=2)return false;
  g.threats=(g.threats||[]).filter(t=>t.until>g.time&&t.source!==source);
  g.threats.push({source,until:g.time+duration,start:g.time,specs,light});return true;
 }
 function allowed(g,specs){
  const used=sources(g);for(const h of specs)if(!h.light)used.add(budgetKey(h));
  if(used.size>2||g.hazards.length+specs.length>C.LIMITS.hazards)return false;
  if(specs.some(h=>h.kind==="mine")&&g.hazards.filter(h=>h.kind==="mine").length+specs.filter(h=>h.kind==="mine").length>2)return false;
  return !!escapePath(g,specs);
 }
 function wave(g,dt){
  g.waveTime+=dt;const s=C.STAGES[g.level-1],w=s.waves[g.wave];
  if(g.layout===null)g.layout=g.random()<.5?-1:1;
  while(g.group<w.groups.length&&g.waveTime>=w.groups[g.group].at){
   const q=w.groups[g.group];
   const key=g.level+":"+g.wave+":"+g.group;
   if(!g.spawnGroup(q)){if(g.deferredGroup!==key){g.stats.queued+=q.count;g.deferredGroup=key;g.event("admission-queued",{wave:g.wave,type:q.type,count:q.count});}break;}
   g.deferredGroup=null;g.group++;
  }
  if(g.chasePending&&g.enemies.length<=C.LIMITS.enemies-2){
   if(g.spawnGroup({type:"interceptor",count:2,x:240,chase:true,summoned:true})){
    g.chasePending=false;g.event("chase",2);
   }
  }
  if(g.group===w.groups.length&&g.waveTime>=w.minSeconds&&!g.enemies.length&&!g.chasePending){
   if(g.waveEscapes===0){g.score+=100;g.event("wave-bonus",g.wave);}
   g.waveEscapes=0;g.wave++;g.group=0;g.waveTime=0;g.layout=null;
   if(g.wave>=s.waves.length){g.enemyBullets=[];g.hazards=[];g.threats=[];g.phase="boss-warning";g.phaseTimer=2;g.event("boss-warning",s.boss);}
  }
 }
 return {wave,reserve,allowed,escapePath,beam,hazardSafe,contact,sources};
});
