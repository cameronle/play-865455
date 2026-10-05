(function(root,factory){
  const progression=factory();
  if(typeof module==='object'&&module.exports)module.exports=progression;
  else root.SkyHopperProgression=progression;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const STAGES=Object.freeze([
    {id:0,min:0,widthMin:124,widthMax:140,gapMin:86,gapMax:98,shift:80},
    {id:1,min:1000,widthMin:116,widthMax:132,gapMin:98,gapMax:112,shift:110},
    {id:2,min:3000,widthMin:108,widthMax:124,gapMin:110,gapMax:124,shift:125},
    {id:3,min:6000,widthMin:104,widthMax:120,gapMin:118,gapMax:128,shift:130}
  ].map(Object.freeze));
  function stage(height){
    const h=Number.isFinite(height)?Math.max(0,height):0;
    return STAGES.findLast(s=>h>=s.min);
  }
  function segment(height,previous={},random=Math.random){
    const level=stage(height).id;
    const pool=level===0?['stairs','switchback']:level===1?['stairs','switchback','span','moving','spring']:['stairs','switchback','span','moving','fragile','spring'];
    const choices=pool.filter(k=>k!==previous.kind);
    const kind=previous.streak>=2?'recovery':choices[Math.floor(random()*choices.length)];
    return {kind,streak:kind==='recovery'?0:(previous.streak||0)+1,length:kind==='recovery'?3:4,step:0,direction:random()<.5?-1:1,id:(previous.id||0)+1};
  }
  function multiplier(combo){return combo>=9?3:combo>=6?2:combo>=3?1.5:1;}
  function createGoal(random=Math.random){
    const goals=[{kind:'height',target:300},{kind:'precise',target:3},{kind:'stars',target:8}];
    return {...goals[Math.min(2,Math.floor(random()*3))],progress:0,done:false};
  }
  return Object.freeze({STAGES,stage,segment,multiplier,createGoal});
});
