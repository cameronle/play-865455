(function(root,factory){
  const rules=factory();
  if(typeof module==='object'&&module.exports)module.exports=rules;
  root.MelonLabRules=rules;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';

  // Canonical levels never move. Profiles only change which levels are active
  // and which canonical level follows a merge.
  const FRUITS=Object.freeze([
    Object.freeze({id:'kiwi',label:'KIWI',shape:'kiwi',color:'#82be68',dark:'#578f58',light:'#d3ec9b',r:22,score:10}),
    Object.freeze({id:'lemon',label:'LEMON',shape:'lemon',color:'#f3d15f',dark:'#d39b38',light:'#fff4a8',r:29,score:20}),
    Object.freeze({id:'cherry',label:'CHERRY',shape:'cherry',color:'#dc6274',dark:'#9e405b',light:'#f5a1a8',r:36,score:40}),
    Object.freeze({id:'peach',label:'PEACH',shape:'peach',color:'#ef9d83',dark:'#c76b65',light:'#ffd0ab',r:44,score:80}),
    Object.freeze({id:'orange',label:'ORANGE',shape:'orange',color:'#f09a3e',dark:'#c66b29',light:'#ffd477',r:52,score:160}),
    Object.freeze({id:'pear',label:'PEAR',shape:'pear',color:'#b4c95d',dark:'#718d3f',light:'#eff5a8',r:60,score:320}),
    Object.freeze({id:'pineapple',label:'PINEAPPLE',shape:'pineapple',color:'#e6b94f',dark:'#b0792e',light:'#fff0a0',r:68,score:640}),
    Object.freeze({id:'melon',label:'MELON',shape:'melon',color:'#78b968',dark:'#4e9055',light:'#d8ee99',r:76,score:1280}),
    Object.freeze({id:'dragonfruit',label:'DRAGONFRUIT',shape:'dragonfruit',color:'#e56b8a',dark:'#a94368',light:'#f8c4d5',r:84,score:2560}),
    Object.freeze({id:'papaya',label:'PAPAYA',shape:'papaya',color:'#f19b55',dark:'#c96b39',light:'#ffd28e',r:92,score:5120}),
    Object.freeze({id:'watermelon',label:'WATERMELON',shape:'watermelon',color:'#5ca865',dark:'#3c7d50',light:'#e1f3a1',r:100,score:10240})
  ]);

  const COMMON={
    dangerLineStart:250,
    dangerLineStep:-13,
    dangerStageDrops:24,
    dangerLineCap:224,
    dangerGracePeriod:1.4,
    topTierBonusMultiplier:5
  };

  const PROFILES=Object.freeze([
    Object.freeze({
      id:'classic7',
      label:'CLASSIC 7',
      unlockScore:0,
      minDrops:0,
      minWatermelonClears:0,
      activeLevels:Object.freeze([0,1,2,3,4,7,10]),
      directDropLevels:Object.freeze([0,1,2,3]),
      directDropCumulative:Object.freeze([.24,.48,.72,1]),
      mergeNext:Object.freeze([1,2,3,4,7,null,null,10,null,null,null]),
      scoreByLevel:Object.freeze([10,20,40,80,160,null,null,320,null,null,640]),
      newIds:Object.freeze([]),
      ...COMMON
    }),
    Object.freeze({
      id:'expanded9',
      label:'EXPANDED 9',
      unlockScore:4000,
      minDrops:12,
      minWatermelonClears:3,
      activeLevels:Object.freeze([0,1,2,3,4,5,6,7,10]),
      directDropLevels:Object.freeze([0,1,2,3,4,5]),
      directDropCumulative:Object.freeze([.2,.4,.6,.75,.9,1]),
      mergeNext:Object.freeze([1,2,3,4,5,6,7,10,null,null,null]),
      scoreByLevel:Object.freeze([10,20,40,80,160,320,640,1280,null,null,2560]),
      newIds:Object.freeze(['pear','pineapple']),
      ...COMMON
    }),
    Object.freeze({
      id:'expanded11',
      label:'EXPANDED 11',
      unlockScore:8000,
      minDrops:28,
      minWatermelonClears:6,
      activeLevels:Object.freeze([0,1,2,3,4,5,6,7,8,9,10]),
      directDropLevels:Object.freeze([0,1,2,3,4,5]),
      directDropCumulative:Object.freeze([.2,.4,.6,.75,.9,1]),
      mergeNext:Object.freeze([1,2,3,4,5,6,7,8,9,10,null]),
      scoreByLevel:Object.freeze([10,20,40,80,160,320,640,1280,2560,5120,10240]),
      newIds:Object.freeze(['dragonfruit','papaya']),
      ...COMMON
    })
  ]);

  function chooseDropLevel(randomValue,profile=PROFILES[0]){
    const value=Number(randomValue);
    if(Number.isNaN(value)||value<=0)return profile.directDropLevels[0];
    if(value>=1)return profile.directDropLevels[profile.directDropLevels.length-1];
    const index=profile.directDropCumulative.findIndex(limit=>value<limit);
    return profile.directDropLevels[index < 0 ? profile.directDropLevels.length-1 : index];
  }

  function dangerLineY(dropCount,profile=PROFILES[2]){
    const count=Number(dropCount);
    const safeCount=Number.isFinite(count)?Math.max(0,count):0;
    const stage=Math.min(2,Math.floor(safeCount/profile.dangerStageDrops));
    return Math.max(profile.dangerLineCap,profile.dangerLineStart+stage*profile.dangerLineStep);
  }

  function profileForProgress(score,dropCount,watermelonClears){
    const safeScore=Number.isFinite(Number(score))?Number(score):0;
    const safeDrops=Number.isFinite(Number(dropCount))?Number(dropCount):0;
    const safeWatermelonClears=Number.isFinite(Number(watermelonClears))?Number(watermelonClears):0;
    for(let i=PROFILES.length-1;i>=0;i--){
      const profile=PROFILES[i];
      if(safeScore>=profile.unlockScore&&safeDrops>=profile.minDrops&&safeWatermelonClears>=profile.minWatermelonClears)return profile;
    }
    return PROFILES[0];
  }

  function nextMergeLevel(level,profile=PROFILES[0]){
    const next=profile.mergeNext[Number(level)];
    return Number.isInteger(next)?next:null;
  }

  function scoreForLevel(level,profile=PROFILES[2]){
    const score=profile.scoreByLevel[Number(level)];
    return Number.isFinite(score)?score:FRUITS[Number(level)]?.score||0;
  }

  function topTierClearBonus(profile=PROFILES[2]){
    return scoreForLevel(FRUITS.length-1,profile)*profile.topTierBonusMultiplier;
  }

  return {FRUITS,PROFILES,chooseDropLevel,dangerLineY,profileForProgress,nextMergeLevel,scoreForLevel,topTierClearBonus};
});
