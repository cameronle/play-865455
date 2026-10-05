(function(root,factory){'use strict';const content=factory();if(typeof module==='object'&&module.exports)module.exports=content;else(root.FishFeast=root.FishFeast||{}).Content=content;})(globalThis,function(){
 'use strict';
 const species={
  sprat:{name:{zh:'细鳞鱼',en:'Sprat'},tier:0,shape:'slender',motion:'cruise',speed:53,nutrition:1,color:'mint'},
  fry:{name:{zh:'圆鳍鱼',en:'Roundfin'},tier:0,shape:'round',motion:'school',speed:45,nutrition:1,color:'gold'},
  sardine:{name:{zh:'银尾鱼',en:'Silver tail'},tier:1,shape:'forked',motion:'school',speed:58,nutrition:2,color:'silver'},
  perch:{name:{zh:'扇背鱼',en:'Fanback'},tier:2,shape:'tall',motion:'cruise',speed:43,nutrition:3,color:'coral'},
  hunter:{name:{zh:'长吻鱼',en:'Longnose'},tier:3,shape:'pointed',motion:'cruise',speed:37,nutrition:4,color:'violet'},
  weaver:{name:{zh:'折线鱼',en:'Weaver'},tier:1,shape:'dart',motion:'zigzag',speed:55,nutrition:2,color:'gold'},
  skipper:{name:{zh:'飞梭鱼',en:'Skipper'},tier:0,shape:'stream',motion:'burst',speed:48,nutrition:1,color:'coral'},
  pursuer:{name:{zh:'追浪鱼',en:'Wave chaser'},tier:3,shape:'hooked',motion:'chase',speed:42,nutrition:4,color:'silver'},
  leviathan:{name:{zh:'巨尾鱼',en:'Greattail'},tier:4,shape:'broad',motion:'cruise',speed:23,nutrition:6,color:'mint'},
  jelly:{name:{zh:'水母',en:'Jellyfish'},tier:1,shape:'jelly',motion:'float',speed:8,nutrition:0,color:'violet',hazard:true}
 };
 const base=['sprat','fry','sardine','perch','hunter'];
 const chapters={shallows:{zh:'浅海',en:'Shallows'},reef:{zh:'礁湾',en:'Reef bay'},deep:{zh:'深海',en:'Deep sea'}};
 function level(id,chapterId,zh,en,goal,brief,extras={}){return{id,chapterId,chapter:chapters[chapterId],name:{zh,en},goal,brief:{zh:brief[0],en:brief[1]},pool:[...base],maxThreats:3,foodMinimum:6,spawnEvery:1.4,schoolSize:1,lanes:0,maxJellies:0,maxChasers:0,jellyZones:[.27,.73],...extras};}
 const levels=[
  level(1,'shallows','浅海初游','First swim',44,['吃小鱼、躲大鱼。长大后回头反吃。','Eat smaller fish, avoid bigger fish, then turn the tables.']),
  level(2,'shallows','鱼群午餐','Shoal lunch',50,['鱼群结伴游动。找准队尾，连续进食。','Shoals swim together. Approach the tail for a string of meals.'],{schoolSize:3}),
  level(3,'shallows','交错水道','Crossing lanes',56,['鱼沿几条水道横穿。留意上下换道时机。','Fish cross in lanes. Choose when to move between them.'],{lanes:4,maxThreats:2}),
  level(4,'shallows','食物链反转','Turn the tables',66,['鱼群和水道交错。稳步长大，反吃长吻鱼。','Read the lanes and shoals, grow, then eat the longnose.'],{schoolSize:2,lanes:3,foodMinimum:7}),
  level(5,'reef','折返追逐','Weaving chase',52,['折线鱼会周期变向。别只追它的旧位置。','Weavers change direction. Anticipate their next turn.'],{pool:[...base,'weaver']}),
  level(6,'reef','短冲飞梭','Skipper sprint',60,['飞梭鱼短暂收身后冲游。等它减速再追。','Skippers coil before a short burst. Catch them after it ends.'],{pool:[...base,'skipper','weaver'],schoolSize:2}),
  level(7,'reef','水母绕行','Jelly detour',64,['水母永远不可吃。绕开伞体，寻找另一侧的鱼。','Jellyfish are never food. Go around their bells.'],{pool:[...base,'weaver','jelly'],maxJellies:1,lanes:3,maxThreats:3}),
  level(8,'reef','礁湾交汇','Reef crossroads',72,['鱼群、冲游和水母交汇。冲刺用于脱身，不是无敌。','Shoals, skippers and jellyfish overlap. Dash is escape, not immunity.'],{pool:[...base,'weaver','skipper','jelly'],schoolSize:3,maxJellies:2,maxThreats:4,foodMinimum:7}),
  level(9,'deep','追浪预警','Chaser warning',62,['追浪鱼先亮出预警，再短暂追击。横向绕开它。','Chasers warn before a bounded pursuit. Sidestep their approach.'],{pool:[...base,'pursuer'],maxChasers:1,maxThreats:3}),
  level(10,'deep','巨尾慢航','Greattail passage',76,['巨尾鱼缓慢横穿。用鱼群成长，再回头挑战它。','Greattails cross slowly. Grow on shoals before facing them.'],{pool:[...base,'leviathan'],schoolSize:3,lanes:3,maxThreats:3}),
  level(11,'deep','深海巡游','Deep patrol',82,['变向鱼引路，追击者和水母封路。保留脱身空间。','Weavers lead through chasers and jellyfish. Keep an escape route.'],{pool:[...base,'weaver','pursuer','jelly'],maxChasers:1,maxJellies:1,maxThreats:4,lanes:4}),
  level(12,'deep','海域毕业','Ocean graduate',90,['所有鱼种汇合。读懂预警与食物链，完成最后一次成长。','All encounters unite. Read warnings and the food chain for the final swim.'],{pool:Object.keys(species),schoolSize:3,maxChasers:2,maxJellies:2,maxThreats:5,foodMinimum:8,spawnEvery:1.2})
 ];
 return{species,chapters,levels,thresholds:[0,0,7,19,37,61],sizes:[18,29,42,58,77,98],maxEntities:30,step:1/120,dashDuration:.22,dashCooldown:2.6,warningTime:1.0};
});
