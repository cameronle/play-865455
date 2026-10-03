const fs=require('node:fs'),vm=require('node:vm');
function loadCrosswalk(options={}){
 let now=0,id=0,paints=0;const rafs=new Map(),store=new Map(Object.entries(options.saved||{}));
 function target(base={}){const classes=new Set();return Object.assign(base,{listeners:{},children:[],attributes:{},textContent:'',innerHTML:'',dataset:base.dataset||{},disabled:false,
  classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x)},
  addEventListener(type,fn){(this.listeners[type]||=[]).push(fn);},emit(type,props={}){const e={target:this,button:0,isPrimary:true,pointerId:1,clientX:100,clientY:100,preventDefault(){this.defaultPrevented=true;},...props};for(const fn of this.listeners[type]||[])fn(e);return e;},
  appendChild(child){this.children.push(child);return child;},replaceChildren(...children){this.children=children;},setAttribute(k,v){this.attributes[k]=String(v);},focus(){document.activeElement=this;},setPointerCapture(){if(options.captureThrows)throw Error('capture');},releasePointerCapture(){},contains(node){return node===this||this.children.some(c=>c.contains?.(node));},querySelectorAll(){return this.children.filter(c=>!c.disabled);}});}
 const document=target({hidden:false,readyState:'complete',documentElement:{dataset:{theme:'light'}},activeElement:null});
 const ids=['game','score','level','chapter','lives','overlay','overlayTitle','overlayText','startButton','pauseButton','levelsButton','levelsOverlay','levelGrid','levelsProgress','closeLevels','utilityDock','statusText','gamePage'];
 const nodes=Object.fromEntries(ids.map(id=>[id,target({id,tagName:id==='game'?'CANVAS':id.endsWith('Button')||id==='closeLevels'?'BUTTON':'DIV'})]));
 const dirs=['up','left','down','right'].map(dir=>target({tagName:'BUTTON',dataset:{dir}}));
 const ctx=new Proxy({fillRect(x,y,w,h){if(w===600&&h===720)paints++;}}, {get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>{o[k]=v;return true;}});
 nodes.game.width=600;nodes.game.height=720;nodes.game.getContext=()=>ctx;
 document.getElementById=id=>nodes[id];document.querySelectorAll=s=>s==='[data-dir]'?dirs:[];document.createElement=tag=>target({tagName:tag.toUpperCase()});
 const window=target({}),sandbox={window,document,navigator:{vibrate(){}},performance:{now:()=>now},console,Math,JSON,Set,Map,Number,Array,
  getComputedStyle:()=>{options.onStyleRead?.();return {getPropertyValue:()=>''};},localStorage:{getItem(k){if(options.storageThrows)throw Error('blocked');return store.get(k)??null;},setItem(k,v){if(options.storageThrows)throw Error('quota');store.set(k,String(v));}},
  requestAnimationFrame(fn){const n=++id;rafs.set(n,fn);return n;},cancelAnimationFrame(n){rafs.delete(n);},addEventListener:(...args)=>window.addEventListener(...args)};
 Object.assign(window,{requestAnimationFrame:sandbox.requestAnimationFrame,cancelAnimationFrame:sandbox.cancelAnimationFrame});vm.createContext(sandbox);
 for(const file of ['rules.js','levels.js'])vm.runInContext(fs.readFileSync('crosswalk/'+file,'utf8'),sandbox);
 window.CrosswalkRules=sandbox.CrosswalkRules;window.CrosswalkLevels=options.levels?{levels:options.levels}:sandbox.CrosswalkLevels;
 let src=fs.readFileSync('crosswalk/game.js','utf8');
 src=src.replace(/\}\)\(\);\s*$/,`window.__qa={snapshot:()=>JSON.parse(JSON.stringify({state,level,levelIndex,lives,score,player,lanes,worldTime,levelTime,moveLock,movingExposure,checkpointIndex,autoNextTimer,progress})),update,move,finishLevel,startLevel,setPlayer:p=>Object.assign(player,p),setCars:fn=>fn(lanes)};})();`);
 vm.runInContext(src,sandbox);
 function step(ms=100){now+=ms;const callbacks=[...rafs.values()];rafs.clear();for(const fn of callbacks)fn(now);}
 return {nodes,document,window,dirs,store,rafs,ctx,start:()=>nodes.startButton.emit('click'),move:window.__qa.move,update:window.__qa.update,finish:window.__qa.finishLevel,load:window.__qa.startLevel,setPlayer:window.__qa.setPlayer,setCars:window.__qa.setCars,snapshot:window.__qa.snapshot,step,advance(ms,hz=60){const dt=1000/hz;for(let t=0;t<ms-.001;t+=dt)step(Math.min(dt,ms-t));},get paints(){return paints;},key(code,props={}){return window.emit('keydown',{code,...props});}};
}
module.exports={loadCrosswalk};
