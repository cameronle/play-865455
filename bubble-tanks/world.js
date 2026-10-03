(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./bosses.js'):root.BubbleFrontier.Bosses,typeof module==='object'&&module.exports?require('./content.js'):root.BubbleFrontier.Content);if(typeof module==='object'&&module.exports)module.exports=api;else(root.BubbleFrontier||={}).World=api;})(typeof globalThis!=='undefined'?globalThis:this,function(Bosses,Content){
 'use strict';
 function random(seed){let x=2166136261;for(const c of String(seed)){x^=c.charCodeAt(0);x=Math.imul(x,16777619);}const fn=()=>{x=(x+0x6D2B79F5)>>>0;let t=Math.imul(x^x>>>15,1|x);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};fn.state=()=>x>>>0;fn.restore=n=>{x=n>>>0;};return fn;}
 const key=(x,y)=>`${x},${y}`;
 const zoneAt=(x,y)=>Math.min(3,Math.max(0,Math.floor((Math.abs(x)+Math.abs(y)-1)/3)));
 function landmarks(world,zone){
  const base=zone*3,types=['workshop','event','challenge','elite','hive','cache'];
  let slots=[[base+1,-1],[base+1,1],[base+2,-1],[base+2,1],[base+1,2],[base,2]];
  if(world.layoutVersion===1){slots.push([base+1,-2],[base,-2]);const rng=random(world.seed+':route:'+zone);for(let i=slots.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[slots[i],slots[j]]=[slots[j],slots[i]];}}
  return [{type:'boss',x:base+3,y:0},...types.map((type,i)=>({type,x:slots[i][0],y:slots[i][1]}))];
 }
 function typeAt(x,y,rng,world){
  if(x===0&&y===0)return'start';
  for(let z=0;z<4;z++){const special=landmarks(world,z).find(p=>p.x===x&&p.y===y);if(special)return special.type;}
  if(world.layoutVersion===1&&y===0&&x>0&&x%3===2)return'elite';
  return Math.abs(x)+Math.abs(y)>1&&rng()<.13?'cache':'combat';
 }
 function create(seed){const world={layoutVersion:1,seed:String(seed),position:{x:0,y:0},rooms:{},cleared:0,bosses:0};roomAt(world,0,0).visited=true;return world;}
 function roomAt(world,x,y){
  const id=key(x,y);if(world.rooms[id])return world.rooms[id];
  const rng=random(`${world.seed}:${id}`),distance=Math.abs(x)+Math.abs(y),type=typeAt(x,y,rng,world),zone=type==='boss'?(x-3)/3:zoneAt(x,y);
  const room={id,x,y,distance,zone,type,visited:false,cleared:['start','cache','workshop','event'].includes(type),rewarded:false,time:0,enemies:[],drops:[],shots:[],effects:[],kills:0,claims:{},challengeHits:0};
  if(type==='boss')room.enemies.push(Bosses.create(zone,`${id}:boss`));
  else if(!room.cleared){
   const count=Math.min(10,2+Math.floor(distance*.65)+(type==='elite'?2:0)),elite=type==='elite'?1.4:1;
   const templates=Content.encounters.filter(e=>e.zone<=zone),formation=templates[Math.floor(rng()*templates.length)],special=['healer','spawner','escort'];
   room.encounter=distance<2?'intro':type==='hive'?'brood':formation.id;
   for(let i=0;i<count;i++){const a=rng()*Math.PI*2,d=80+rng()*140;
    const pool=Content.enemies.filter(e=>e.zone<=zone&&!special.includes(e.id));
    let kind=distance<2?(i===0?'grazer':'shooter'):formation.members[i]||pool[Math.floor(rng()*pool.length)].id;
    if(type==='hive'&&special.includes(kind))kind='chaser';
    const hp=(9+distance*2+(kind==='spinner'?8:0))*elite;
    room.enemies.push({id:`${id}:e${i}`,kind,x:distance>=2&&i<formation.members.length?330+i*60:400+Math.cos(a)*d,y:distance>=2&&i<formation.members.length?350+(i%2)*65:400+Math.sin(a)*d,r:Content.enemies.find(e=>e.id===kind).r,hp,maxHp:hp,angle:a,cooldown:.8+rng()*1.6,phase:rng()*6,slow:0,hit:0,rewarded:false,elite:type==='elite'});
   }
   if(type==='hive'){room.enemies[0].kind='spawner';room.enemies[0].r=27;room.enemies[0].hp=room.enemies[0].maxHp*=1.6;}
  }else if(type==='start'||type==='cache'){
   const count=type==='start'?6:10;for(let i=0;i<count;i++){const a=i*Math.PI*2/count,d=type==='start'?66:90;
    room.drops.push({id:`${id}:b${i}`,x:400+Math.cos(a)*d,y:400+Math.sin(a)*d,value:type==='start'?2:3,source:'room',r:5,collected:false});}
  }
  world.rooms[id]=room;return room;
 }
 function current(world){return roomAt(world,world.position.x,world.position.y);}
 function canEnter(world,x,y){return Number.isInteger(x)&&Number.isInteger(y)&&Math.abs(x)+Math.abs(y)<=Math.min(12,3*((world.bosses||0)+1));}
 function completeBoss(world,room){if(room.type!=='boss'||!room.cleared||room.bossClaimed||room.zone!==world.bosses)return false;room.bossClaimed=true;world.bosses++;return true;}
 function travel(world,dx,dy,player){
  if(Math.abs(dx)+Math.abs(dy)!==1)throw new Error('travel needs one cardinal direction');
  const from=current(world),x=world.position.x+dx,y=world.position.y+dy;
  if(from.type==='boss'&&!from.cleared||!canEnter(world,x,y))return from;
  world.position={x,y};const room=current(world);room.visited=true;
  player.x=400-dx*285;player.y=400-dy*285;player.invulnerable=Math.max(player.invulnerable||0,1.25);return room;
 }
 return{random,key,landmarks,create,roomAt,current,travel,canEnter,completeBoss,zoneAt};
});
