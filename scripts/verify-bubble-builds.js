'use strict';
// No HP, reward, drop, invulnerability, or boss-progress overrides.
// Navigation uses legal cardinal World.travel transitions (walking time omitted); combat uses real fixed-time steps.
// Two fixed seeds × six build preferences × supply/rush routes. A scripted pilot is not a human difficulty benchmark.
const root=require('node:path').resolve(__dirname,'../bubble-tanks')+'/',C=require(root+'combat.js'),R=require(root+'rules.js'),W=require(root+'world.js'),A=require(root+'adventure.js'),D=require(root+'content.js'),fs=require('node:fs');
const routes=[
['scout',['needle','sonar','blink','needle_branch','pierce']],
['bulwark',['scatter','orbit','shield','barrier','shell']],
['gunship',['stream','scatter','split','fission_core','hot_chamber','stream_branch']],
['swarmbody',['swarm','swarm_expand','active_hive','missile','mark']],
['phase',['arc','conductive','emp','vortex','conductive_sea']],
['balanced',['mine','vortex','decoy','gravity_sac','mine_branch']]
];
function rank(s,u,wants){const i=wants.indexOf(u.id);return (i<0?(u.type==='skill'||u.type==='gun'?-60:0):160-i*4)+(u.id==='shield'?80:0)+(['damage','rapid','thruster','cooling','shell','conserve','magnet','collector','siphon'].includes(u.id)?55:0)-R.rank(s.player,u.id)*4;}
function select(s,wants){let opts=s.offers||[];if(!opts.some(u=>wants.includes(u.id))&&s.rerolls>0){C.reroll(s);opts=s.offers;}opts.sort((a,b)=>rank(s,b,wants)-rank(s,a,wants));if(rank(s,opts[0],wants)<0)C.skip(s);else C.choose(s,opts[0].id);const skill=wants.find(id=>s.player.skills.includes(id));if(skill&&s.mode==='running'){C.pause(s);A.equipSkill(s,skill);C.resume(s);}}
function combat(s,wants){const room=W.current(s.world),begin=s.time;let ticks=0,peak=0;
while(!room.cleared&&s.time-begin<240&&ticks++<16000){
 if(s.mode==='upgrade'){select(s,wants);continue;}if(s.mode==='paused'){C.resume(s);if(W.current(s.world)!==room)return {status:'rescue',seconds:s.time-begin,peak};}if(s.mode==='over')break;
 const p=s.player,alive=room.enemies.filter(e=>e.hp>0),target=alive.filter(e=>e.kind==='pod'||e.kind==='core').sort((a,b)=>C.distance(a,p)-C.distance(b,p))[0]||alive.sort((a,b)=>C.distance(a,p)-C.distance(b,p))[0];if(!target)break;
 const dx=p.x-target.x,dy=p.y-target.y,d=Math.max(1,Math.hypot(dx,dy));let desired=wants.includes('mine')?105:wants.includes('scatter')?150:225;
 let mx=-dy/d*.65+dx/d*Math.max(-1,Math.min(1,(desired-d)/70)),my=dx/d*.65+dy/d*Math.max(-1,Math.min(1,(desired-d)/70));
 for(const b of room.shots)if(b.owner==='enemy'&&b.ttl>0){const bx=p.x-b.x-b.vx*.18,by=p.y-b.y-b.vy*.18,bd=Math.hypot(bx,by);if(bd<100&&bd>1){mx+=bx/bd*(100-bd)/55;my+=by/bd*(100-bd)/55;}}
 const edge=Math.hypot(p.x-400,p.y-400);if(edge>230){mx-=(p.x-400)/edge*(edge-230)/40;my-=(p.y-400)/edge*(edge-230)/40;}
 const mag=Math.max(1,Math.hypot(mx,my)),input={x:mx/mag,y:my/mag,aim:{x:target.x,y:target.y}};
 if(p.skillClock<=0&&(p.skill!=='overload'||p.shield<8)&&(p.skill!=='blink'||edge<170))C.useSkill(s);if(p.dashClock<=0&&edge<170&&room.shots.some(b=>b.owner==='enemy'&&C.distance(p,b)<45))C.dash(s,input);
 C.step(s,input,1/60);if(W.current(s.world)!==room)return{status:'retreat',seconds:s.time-begin,peak};peak=Math.max(peak,room.shots.length);
}
return {status:room.cleared?'clear':s.mode==='over'?'death':'timeout',seconds:Number((s.time-begin).toFixed(1)),peak,remaining:room.enemies.filter(e=>e.hp>0).map(e=>({kind:e.kind,hp:Math.round(e.hp)}))};}
function travel(s,x,y){const begin=s.world.position,q=[[begin.x,begin.y,[]]],seen=new Set([W.key(begin.x,begin.y)]);let path=null;while(q.length){const [atX,atY,steps]=q.shift();if(atX===x&&atY===y){path=steps;break;}for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=atX+dx,ny=atY+dy,key=W.key(nx,ny);if(seen.has(key)||!W.canEnter(s.world,nx,ny)||W.roomAt(s.world,nx,ny).type==='boss'&&(nx!==x||ny!==y))continue;seen.add(key);q.push([nx,ny,[...steps,[dx,dy]]]);}}if(!path)return false;for(const[dx,dy]of path){const old=W.current(s.world),r=W.travel(s.world,dx,dy,s.player);if(r===old)return false;A.enter(s,r);}return true;}
function run(chassis,wants,seed,route='supply'){const s=C.create('balance-'+seed,chassis),log=[];C.start(s);for(let t=0;t<180;t++){if(s.mode==='upgrade')select(s,wants);else C.step(s,{},1/60);}let aborted='';
for(let zone=0;zone<4&&!aborted;zone++){
 const inner=zone*3,outer=(zone+1)*3,rooms=[];for(let x=0;x<=outer;x++)for(let y=0;y<=outer;y++){const d=x+y;if(d>inner&&d<=outer&&!(x===outer&&y===0))rooms.push({x,y,d});}rooms.sort((a,b)=>a.d-b.d||a.y-b.y);if(route==='rush')rooms.splice(0,rooms.length,{x:inner+1,y:0},{x:inner+2,y:0});else for(const p of W.landmarks(s.world,zone))if(p.type!=='boss'&&!rooms.some(r=>r.x===p.x&&r.y===p.y))rooms.push(p);
 for(const goal of [...rooms,{x:outer,y:0}]){
  if(s.mode==='upgrade')while(s.mode==='upgrade')select(s,wants);
  if(s.mode==='paused')C.resume(s);
  if(!travel(s,goal.x,goal.y)){aborted='travel';break;}
  let room=W.current(s.world);if(!room.cleared){let result;for(let attempt=0;attempt<4;attempt++){result=combat(s,wants);log.push({zone,room:room.id,...result});if(!['retreat','rescue'].includes(result.status))break;if(s.mode==='paused')C.resume(s);if(!travel(s,goal.x,goal.y))break;}if(result.status!=='clear'){aborted=result.status;break;}}
  for(let t=0;t<140;t++){if(s.mode==='upgrade')select(s,wants);else C.step(s,{x:0,y:0},1/60);}
  if(room.type==='workshop'){A.open(s,'workshop');for(const id of room.stock||[])if(rank(s,D.upgrades.find(u=>u.id===id),wants)>0)A.buy(s,id);if(s.player.mass<120)for(let i=0;i<3;i++)A.buy(s,'repair');A.close(s);}
  if(s.mode==='won')break;
 }
}
return{chassis,seed,route,mode:s.mode,bosses:s.world.bosses,seconds:Math.round(s.time),mass:Number(s.player.mass.toFixed(1)),salvage:s.salvage,rescueLeft:s.rescueLeft,level:s.level,guns:s.player.loadout.map(g=>g.id),skill:s.player.skill,passives:s.player.passives,relics:s.player.relics,aborted,log};}
const assert=require('node:assert/strict');
const matrix=process.argv.includes('--matrix'),data=matrix?[11,12].flatMap(seed=>['supply','rush'].flatMap(route=>routes.map(([c,w])=>run(c,w,seed,route)))):routes.map(([c,w])=>run(c,w,11));
fs.writeFileSync((process.env.TMPDIR||process.cwd())+'/bubble-balance-report.json',JSON.stringify(data,null,2));
assert.equal(data.length,matrix?24:6);assert.equal(new Set(data.map(r=>`${r.seed}:${r.route}:${r.chassis}`)).size,data.length);for(const result of data){assert.ok(['won','over'].includes(result.mode),JSON.stringify(result));if(!matrix||result.route==='supply'){assert.equal(result.mode,'won',JSON.stringify(result));assert.equal(result.bosses,4);}assert.ok(result.log.every(r=>r.peak<=420));}
fs.writeFileSync((process.env.TMPDIR||process.cwd())+'/bubble-balance-report.json',JSON.stringify(data,null,2));console.log(JSON.stringify(data.map(({log,...r})=>({...r,last:log.at(-1)})),null,2));
