(function(root,factory){
  const rules=factory();
  if(typeof module==='object'&&module.exports)module.exports=rules;
  root.MelonLabRules=rules;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';

  const FRUITS=Object.freeze([
    Object.freeze({id:'kiwi',label:'KIWI',color:'#82be68',dark:'#578f58',light:'#d3ec9b',r:22,score:10}),
    Object.freeze({id:'lemon',label:'LEMON',color:'#f3d15f',dark:'#d39b38',light:'#fff4a8',r:29,score:20}),
    Object.freeze({id:'cherry',label:'CHERRY',color:'#dc6274',dark:'#9e405b',light:'#f5a1a8',r:36,score:40}),
    Object.freeze({id:'peach',label:'PEACH',color:'#ef9d83',dark:'#c76b65',light:'#ffd0ab',r:44,score:80}),
    Object.freeze({id:'orange',label:'ORANGE',color:'#f09a3e',dark:'#c66b29',light:'#ffd477',r:53,score:160}),
    Object.freeze({id:'melon',label:'MELON',color:'#78b968',dark:'#4e9055',light:'#d8ee99',r:63,score:320}),
    Object.freeze({id:'watermelon',label:'WATERMELON',color:'#5ca865',dark:'#3c7d50',light:'#e1f3a1',r:74,score:640})
  ]);

  const DIFFICULTY_PROFILE=Object.freeze({
    directDropLevels:4,
    directDropBand:.24,
    dangerLineStart:250,
    dangerLineRise:.25,
    dangerLineCap:430,
    topTierBonusMultiplier:5
  });

  function chooseDropLevel(randomValue){
    const value=Number(randomValue);
    if(Number.isNaN(value))return 0;
    return Math.min(DIFFICULTY_PROFILE.directDropLevels-1,Math.max(0,Math.floor(value/DIFFICULTY_PROFILE.directDropBand)));
  }

  function dangerLineY(dropCount,profile=DIFFICULTY_PROFILE){
    const count=Number(dropCount);
    const safeCount=Number.isFinite(count)?Math.max(0,count):0;
    return Math.min(profile.dangerLineCap,profile.dangerLineStart+safeCount*profile.dangerLineRise);
  }

  function topTierClearBonus(){
    return FRUITS[FRUITS.length-1].score*DIFFICULTY_PROFILE.topTierBonusMultiplier;
  }

  return {FRUITS,DIFFICULTY_PROFILE,chooseDropLevel,dangerLineY,topTierClearBonus};
});
