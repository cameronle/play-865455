(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./bosses.js'):root.BubbleFrontier.Bosses,typeof module==='object'&&module.exports?require('./content.js'):root.BubbleFrontier.Content);if(typeof module==='object'&&module.exports)module.exports=api;else(root.BubbleFrontier||={}).World=api;})(typeof globalThis!=='undefined'?globalThis:this,function(Bosses,Content){
 'use strict';
 function random(seed){let x=2166136261;for(const c of String(seed)){x^=c.charCodeAt(0);x=Math.imul(x,16777619);}const fn=()=>{x=(x+0x6D2B79F5)>>>0;let t=Math.imul(x^x>>>15,1|x);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};fn.state=()=>x>>>0;fn.restore=n=>{x=n>>>0;};return fn;}
 const key=(x,y)=>`${x},${y}`;
 const zoneAt=(x,y)=>Math.min(3,Math.max(0,Math.floor((Math.abs(x)+Math.abs(y)-1)/3)));
 function typeAt(x,y,rng){
  if(x===0&&y===0)return'start';
  for(let z=0;z<4;z++){
   if(x===3+z*3&&y===0)return'boss';if(x===1+z*3&&y===-1)return'workshop';
   if(x===1+z*3&&y===1)return'event';if(x===2+z*3&&y===-1)return'challenge';
   if(x===2+z*3&&y===1)return'elite';if(x===1+z*3&&y===2)return'hive';if(x===z*3&&y===2)return'cache';
  }
  return Math.abs(x)+Math.abs(y)>1&&rng()<.13?'cache':'combat';
 }
 function create(seed){const world={seed:String(seed),position:{x:0,y:0},rooms:{},cleared:0,bosses:0};roomAt(world,0,0).visited=true;return world;}
 function roomAt(world,x,y){
  const id=key(x,y);if(world.rooms[id])return world.rooms[id];
  const rng=random(`${world.seed}:${id}`),distance=Math.abs(x)+Math.abs(y),type=typeAt(x,y,rng),zone=type==='boss'?(x-3)/3:zoneAt(x,y);
  const room={id,x,y,distance,zone,type,visited:false,cleared:['start','cache','workshop','event'].includes(type),rewarded:false,time:0,enemies:[],drops:[],shots:[],effects:[],kills:0,claims:{},challengeHits:0};
  if(type==='boss')room.enemies.push(Bosses.create(zone,`${id}:boss`));
  else if(!room.cleared){
   const count=Math.min(10,2+Math.floor(distance*.65)+(type==='elite'?2:0)),elite=type==='elite'?1.4:1;
   for(let i=0;i<count;i++){const a=rng()*Math.PI*2,d=80+rng()*140;
    const pool=Content.enemies.filter(e=>e.zone<=zone),kind=distance<2?(i===0?'grazer':'shooter'):pool[Math.floor(rng()*pool.length)].id;
    const hp=(9+distance*2+(kind==='spinner'?8:0))*elite;
    room.enemies.push({id:`${id}:e${i}`,kind,x:400+Math.cos(a)*d,y:400+Math.sin(a)*d,r:Content.enemies.find(e=>e.id===kind).r,hp,maxHp:hp,angle:a,cooldown:.8+rng()*1.6,phase:rng()*6,slow:0,hit:0,rewarded:false,elite:type==='elite'});
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
 return{random,key,create,roomAt,current,travel,canEnter,completeBoss,zoneAt};
});
