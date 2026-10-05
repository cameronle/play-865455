(function(root,factory){'use strict';const api=factory(typeof module==='object'&&module.exports?require('./content.js'):root.FishFeast.Content);if(typeof module==='object'&&module.exports)module.exports=api;else root.FishFeast.Progress=api;})(globalThis,function(C){
 'use strict';
 const keys={progress:'fish-feast-progress-v1',settings:'fish-feast-settings-v1'};
 function read(raw){const p={version:1,unlocked:1,best:{},completed:[]};let v;try{v=JSON.parse(raw);}catch(_){return p;}if(!v||v.version!==1||!Number.isInteger(v.unlocked)||v.unlocked<1||v.unlocked>C.levels.length||!v.best||typeof v.best!=='object'||Array.isArray(v.best))return p;p.unlocked=v.unlocked;for(let id=1;id<=p.unlocked;id++)if(Number.isSafeInteger(v.best[id])&&v.best[id]>=0)p.best[id]=v.best[id];p.completed=Array.from({length:p.unlocked-1},(_,i)=>i+1);if(Array.isArray(v.completed))for(const id of v.completed)if(canPlay(p,id)&&!p.completed.includes(id))p.completed.push(id);p.completed.sort((a,b)=>a-b);return p;}
 function settings(raw,p){let v;try{v=JSON.parse(raw);}catch(_){}return{version:1,lastLevel:v&&v.version===1&&canPlay(p,v.lastLevel)?v.lastLevel:p.unlocked};}
 function canPlay(p,id){return Number.isInteger(id)&&id>=1&&id<=C.levels.length&&id<=p.unlocked;}
 function record(p,id,score,won){if(!canPlay(p,id)||!Number.isSafeInteger(score)||score<0)return false;p.best[id]=Math.max(p.best[id]||0,score);if(won){if(!p.completed.includes(id))p.completed.push(id);p.completed.sort((a,b)=>a-b);p.unlocked=Math.min(C.levels.length,Math.max(p.unlocked,id+1));}return true;}
 return{keys:Object.freeze(keys),read,settings,canPlay,record};
});
