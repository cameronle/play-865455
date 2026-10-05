'use strict';
// QA-only observer/controller: returns an ordinary target. Never writes state,
// changes collisions, feeds fish, grants lives or controls the simulation clock.
const R=require('../fish-feast/rules.js');
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
// Narrow giant-fish lanes need a moving-obstacle forecast: a static waypoint
// can park the player against a wall while the giant closes the remaining gap.
function forecast(s){
 const p=s.player,pg=R.geometry(p),food=s.fish.filter(f=>!f.dead&&!f.warning&&R.relation(p,f)==='food').sort((a,b)=>distance(p,a)/a.nutrition-distance(p,b)/b.nutrition),danger=s.fish.filter(f=>!f.dead&&(f.warning||0)<1&&R.relation(p,f)==='danger');
 const bound=q=>({x:R.clamp(q.x,pg.rx,s.width-pg.rx),y:R.clamp(q.y,pg.ry,s.height-pg.ry)});
 const reflect=(n,lo,hi)=>{if(hi<=lo)return lo;const span=hi-lo,q=((n-lo)%(span*2)+span*2)%(span*2);return lo+(q<=span?q:span*2-q);};
 const future=(f,t)=>{const g=R.geometry(f),move=Math.max(0,t-(f.warning||0));return{x:reflect(f.x+f.vx*move,g.rx,s.width-g.rx),y:reflect(f.y+f.vy*move,g.ry,s.height-g.ry),g,nutrition:f.nutrition};};
 const times=[.15,.3,.5,.8,1.2],obstacles=times.map(t=>danger.map(f=>future(f,t))),meals=food.map(f=>future(f,.6));
 const gap=(q,f)=>Math.hypot(Math.max(0,Math.abs(q.x-f.x)-pg.half-f.g.half),q.y-f.y)-pg.ry-f.g.ry;
 const candidates=[...food.slice(0,8).map(bound),bound(p)];for(let i=0;i<16;i++){const a=i*Math.PI/8;candidates.push(bound({x:p.x+Math.cos(a)*190,y:p.y+Math.sin(a)*190}));}
 let best=candidates[0],bestScore=-Infinity;
 for(const q of candidates){const d=distance(p,q),ux=(q.x-p.x)/(d||1),uy=(q.y-p.y)/(d||1);let collision=0,minGap=1000,endGap=1000;
  for(let i=0;i<times.length;i++){const t=times[i],step=Math.min(d,t*190),point={x:p.x+ux*step,y:p.y+uy*step};for(const f of obstacles[i]){const g=gap(point,f);if(t>=p.invulnerable){minGap=Math.min(minGap,g);if(g<3)collision++;}if(i===times.length-1)endGap=Math.min(endGap,g);}}
  const remaining=Math.min(...meals.map(f=>distance(q,f)/(f.nutrition||1)),1000),score=-collision*1000+Math.min(50,minGap)*2+Math.min(120,endGap)*.3-remaining*.8-d*.01;if(score>bestScore){bestScore=score;best=q;}
 }
 return best;
}
function aim(s){
 if(s.height<220&&s.player.tier>=3&&s.fish.some(f=>!f.dead&&f.type==='leviathan'&&R.relation(s.player,f)==='danger'))return forecast(s);
 const p=s.player,pg=R.geometry(p),food=s.fish.filter(f=>!f.dead&&!f.warning&&R.relation(p,f)==='food').sort((a,b)=>distance(p,a)-distance(p,b)),danger=s.fish.filter(f=>!f.dead&&!f.warning&&R.relation(p,f)==='danger');
 const bound=point=>({x:R.clamp(point.x,pg.rx,s.width-pg.rx),y:R.clamp(point.y,pg.ry,s.height-pg.ry)});
 const gap=(point,f)=>{const g=R.geometry(f),dx=Math.max(0,Math.abs(point.x-f.x)-pg.half-g.half);return Math.hypot(dx,point.y-f.y)-pg.ry-g.ry;};
 const safePath=point=>danger.every(f=>!R.swept({...p,...point},f,p,f));
 let goal=food.find(f=>danger.every(d=>gap(f,d)>10))||food[0]||p;
 if(p.invulnerable>0||!danger.length)return{x:goal.x,y:goal.y};
 if(danger.some(f=>gap(p,f)<35)){
  const candidates=[];for(let i=0;i<12;i++){const angle=i*Math.PI/6;candidates.push(bound({x:p.x+Math.cos(angle)*125,y:p.y+Math.sin(angle)*125}));}
  candidates.sort((a,b)=>{const score=q=>Math.min(...danger.map(d=>gap(q,d)))-distance(q,goal)*.08+(safePath(q)?35:0);return score(b)-score(a);});return candidates[0];
 }
 if(safePath(goal))return{x:goal.x,y:goal.y};
 const waypoints=[];
 for(const f of danger){const g=R.geometry(f);for(const sign of [-1,1]){waypoints.push(bound({x:f.x,y:f.y+sign*(pg.ry+g.ry+40)}));waypoints.push(bound({x:f.x+sign*(pg.rx+g.rx+40),y:f.y}));}}
 const usable=waypoints.filter(q=>distance(p,q)>16&&safePath(q)&&danger.every(d=>gap(q,d)>12));usable.sort((a,b)=>distance(p,a)+distance(a,goal)-distance(p,b)-distance(b,goal));
 return usable[0]||{x:goal.x,y:goal.y};
}
module.exports={aim};
