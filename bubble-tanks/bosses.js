(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else(root.BubbleFrontier||={}).Bosses=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const TAU=Math.PI*2;
 const definitions=[
  {id:'ring-guard',name:['环形守卫','Ring Guard'],mechanic:'rotating-gap',tip:['绕到旋转护环的缺口，第二阶段注意扩散弹。','Circle into the rotating shield gap; phase two adds fans.'],hp:140},
  {id:'hive-mother',name:['蜂群母体','Hive Mother'],mechanic:'protected-nodes',tip:['先击碎三颗卫星囊，再攻击母体。召唤物不提供成长。','Break three orbiting pods, then the mother. Summons give no growth.'],hp:240},
  {id:'phase-weaver',name:['相位编织者','Phase Weaver'],mechanic:'locked-jump',tip:['躲开标记；跃迁后1.6秒暴露弱点，集中输出。','Avoid the mark; strike during the 1.6s weak-point window after a jump.'],hp:340},
  {id:'aggregate',name:['泡泡聚合核','Bubble Aggregate'],mechanic:'detached-cores',tip:['55%血量分离核心；先击碎三颗核心解除无敌，再攻击本体。','At 55% health, break three detached cores to remove the body shield.'],hp:460}
 ];
 function create(zone,id){const def=definitions[zone];return{id,kind:'boss',bossId:def.id,zone,x:400,y:350,r:39+zone*3,hp:def.hp,maxHp:def.hp,angle:0,phase:0,stage:1,phaseEvents:0,guardAngle:0,cooldown:1.2,slow:0,hit:0,rewarded:false};}
 function node(state,b,index,kind){const a=index*TAU/3;return{id:`${b.id}:node${++state.nextId}`,kind,parent:b.id,index,x:b.x+Math.cos(a)*82,y:b.y+Math.sin(a)*82,r:kind==='pod'?16:19,hp:kind==='pod'?28:45,maxHp:kind==='pod'?28:45,angle:a,phase:0,cooldown:1+index*.55,slow:0,hit:0,rewarded:false,rewardless:true};}
 function damageMultiplier(b,room,hit={}){
  if(hit.unblockable)return 1;
  if(b.zone===0){const a=Math.atan2((hit.y??b.y)-b.y,(hit.x??b.x)-b.x),delta=Math.atan2(Math.sin(a-b.guardAngle),Math.cos(a-b.guardAngle));return Math.abs(delta)<.67?1:.12;}
  if((b.zone===1||b.zone===3)&&room.enemies.some(e=>e.parent===b.id&&e.hp>0))return 0;
  if(b.zone===2)return b.exposed>0?1.25:.3;
  return 1;
 }
 function update(state,room,b,dt,api){
  if(b.hp<=0)return;
  b.exposed=Math.max(0,(b.exposed||0)-dt);
  b.phase+=dt;b.angle=Math.atan2(state.player.y-b.y,state.player.x-b.x);b.guardAngle=b.phase*(b.stage===1?.5:.8);
  if(b.hp/b.maxHp<=.550001&&b.stage===1){b.stage=2;b.phaseEvents++;b.cooldown=Math.min(b.cooldown,.4);api.effect(room,'boss-phase',b.x,b.y,{r:b.r+25,ttl:1,duration:1});
   if(b.zone===3)for(let i=0;i<3;i++)room.enemies.push(node(state,b,i,'core'));
  }
  if(b.zone===1&&!b.nodesSpawned){b.nodesSpawned=true;for(let i=0;i<3;i++)room.enemies.push(node(state,b,i,'pod'));}
  if(b.zone===1)for(const e of room.enemies.filter(e=>e.parent===b.id&&e.hp>0)){const a=b.phase*.45+e.index*TAU/3;e.x=b.x+Math.cos(a)*82;e.y=b.y+Math.sin(a)*82;}
  if(b.zone===0){b.x=400+Math.cos(b.phase*.27)*62;b.y=350+Math.sin(b.phase*.27)*45;}
  if(b.zone===3){b.x=400+Math.sin(b.phase*.4)*90;b.y=310+Math.cos(b.phase*.25)*35;}
  b.cooldown-=dt;
  if(b.cooldown<=0&&!b.warning){
   b.warning=b.zone===2?.85:.65;b.fireAngle=b.angle;b.lockX=state.player.x;b.lockY=state.player.y;
   api.effect(room,'aim',b.x,b.y,{angle:b.fireAngle,length:650,ttl:b.warning,duration:b.warning});
   if(b.zone===2)api.effect(room,'hazard',b.lockX,b.lockY,{r:58,warning:true,ttl:b.warning,duration:b.warning,color:'enemy'});
  }
  if(b.warning>0){b.warning-=dt;if(b.warning<=0){
   if(b.zone===2){b.exposed=1.6;const d=Math.hypot(b.lockX-400,b.lockY-400),scale=d>245?245/d:1;b.x=400+(b.lockX-400)*scale;b.y=400+(b.lockY-400)*scale;
    api.effect(room,'hazard',b.x,b.y,{r:b.stage===1?52:75,danger:true,damage:8,ttl:2.2,duration:2.2,color:'enemy'});
   }
   const count=b.zone===0?(b.stage===1?7:11):b.zone===1?(b.stage===1?5:9):b.zone===2?(b.stage===1?6:10):(b.stage===1?10:16);
   const fan=b.zone===1||b.zone===3&&(b.attackIndex||0)%2===1;
   for(let i=0;i<count;i++){const a=fan?b.fireAngle+(i-(count-1)/2)*.11:b.phase+i*TAU/count;
    api.shot(state,room,b.x,b.y,a,{owner:'enemy',r:6,speed:b.stage===1?125:155,damage:7+b.zone,ttl:5,pattern:b.zone===3?'aggregate':b.bossId});
   }
   b.attackIndex=(b.attackIndex||0)+1;b.warning=0;b.cooldown=b.stage===1?2.65:2.15;
  }}
 }
 return{definitions,create,update,damageMultiplier};
});
