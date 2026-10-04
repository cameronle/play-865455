const fs=require('node:fs'),vm=require('node:vm');
function boot(options={}){
 const storage=new Map(Object.entries(options.storage||{})),nodes={},events={window:{},document:{}},raf=new Map();let now=100000,seq=1,paints=0,writes=0,styles=0;const transforms=[];
 const ctx=new Proxy({}, {get:(o,k)=>k in o?o[k]:k==='createLinearGradient'?()=>({addColorStop(){}}):(...args)=>{if(k==='fillRect'&&args[2]===720&&args[3]===720)paints++;if(k==='transform'&&options.recordTransforms)transforms.push(args)},set:(o,k,v)=>((o[k]=v),true)});let doc;
 function make(id,tag='div'){
  const classes=new Set(),listeners={},attrs={},captures=new Set();let text='';return {
   id,tagName:tag.toUpperCase(),dataset:{},width:720,height:720,disabled:false,isContentEditable:false,style:{setProperty(){},removeProperty(){}},children:[],parentElement:null,
   get textContent(){return text},set textContent(v){writes++;text=String(v)},
   classList:{add:(x)=>classes.add(x),remove:(x)=>classes.delete(x),contains:x=>classes.has(x),toggle(x,force){force??=!classes.has(x);force?classes.add(x):classes.delete(x)}},
   getContext:()=>ctx,focus(){doc.activeElement=this},blur(){if(doc.activeElement===this)doc.activeElement=null},contains(e){return this===e||this.children.some(c=>c.contains(e))},
   closest(s){return s.split(',').some(x=>x.trim()===this.tagName.toLowerCase()||x.trim()==='#'+id)?this:this.parentElement?.closest(s)||null},
   appendChild(c){this.children.push(c);c.parentElement=this},setAttribute(k,v){writes++;attrs[k]=String(v)},getAttribute:k=>attrs[k]??null,
   getBoundingClientRect:()=>({x:0,y:0,left:0,top:0,width:720,height:720,right:720,bottom:720}),
   setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id),
   addEventListener(t,f){(listeners[t]||=[]).push(f)},dispatch(t,extra={}){const e={type:t,target:this,code:'',button:0,pointerId:1,pointerType:'touch',isPrimary:true,clientX:360,clientY:120,detail:0,defaultPrevented:false,preventDefault(){this.defaultPrevented=true},...extra};if(!this.disabled)for(const f of listeners[t]||[])f(e);return e},click(){return this.dispatch('click')}
  };
 }
 for(const id of ['game','score','best','energy','fruitCount','nextFruit','nextDot','currentFruit','currentDot','overlay','message','detail','startButton','pauseButton','stirButton','mobileStirButton','dropButton','modeButton','route','unlockToast','profileStatus','routeSummary','utilityDock','gamePage'])nodes[id]=make(id,id==='game'?'canvas':id.endsWith('Button')?'button':'div');
 nodes.overlay.appendChild(nodes.startButton);nodes.gamePage.appendChild(nodes.game);nodes.gamePage.appendChild(nodes.overlay);
 doc={hidden:!!options.initiallyHidden,readyState:'complete',activeElement:null,documentElement:make('html'),body:make('body'),getElementById:id=>nodes[id]||null,querySelector:selector=>selector==='.page'?nodes.gamePage:null,querySelectorAll:()=>[],createElement:tag=>make('',tag),addEventListener(t,f){(events.document[t]||=[]).push(f)}};
 const win={innerWidth:1280,innerHeight:800,addEventListener(t,f){(events.window[t]||=[]).push(f)}};
 const sandbox={window:win,document:doc,getComputedStyle:()=>{styles++;return{getPropertyValue:()=>''}},performance:{now:()=>now},Math:Object.assign(Object.create(Math),{random:options.rng||(()=>.1)}),JSON,console,addEventListener:win.addEventListener,
  localStorage:{getItem(k){if(options.storageThrows)throw Error('blocked');return storage.get(k)??null},setItem(k,v){if(options.storageThrows)throw Error('quota');storage.set(k,String(v))}},requestAnimationFrame:f=>{const id=seq++;raf.set(id,f);return id},cancelAnimationFrame:id=>raf.delete(id),setTimeout,clearTimeout};
 vm.createContext(sandbox);vm.runInContext(options.rulesSource||fs.readFileSync('melon-lab/rules.js','utf8'),sandbox);
 const shim=`window.__test={get:()=>({state,paused,fruits,particles,merges,aimX,nextLevel,dropCount,watermelonClears,currentProfileIndex,dropCooldown,energy,score,best,dangerTimer,fluidPulse,clearPulse,clock,last,mode,BIN,clearing:typeof clearing==='undefined'?false:clearing}),set:v=>{if('state'in v)state=v.state;if('paused'in v)paused=v.paused;if('fruits'in v)fruits=v.fruits;if('score'in v)score=v.score;if('best'in v)best=v.best;if('dropCount'in v)dropCount=v.dropCount;if('watermelonClears'in v)watermelonClears=v.watermelonClears;if('currentProfileIndex'in v)currentProfileIndex=v.currentProfileIndex;if('energy'in v)energy=v.energy;if('nextLevel'in v)nextLevel=v.nextLevel;if('aimX'in v)aimX=v.aimX;if('dropCooldown'in v)dropCooldown=v.dropCooldown;},start,spawnFruit,mergeFruits,stirPool,physics,update,draw,gameOver,togglePause,maybeAdvanceProfile,hitBoundaries};`;
 const source=options.source||fs.readFileSync('melon-lab/game.js','utf8');vm.runInContext(source.replace(/\}\)\(\);\s*$/,';'+shim+'})();'),sandbox);
 function emit(kind,t,extra={}){const e={type:t,key:'',code:'',target:doc.activeElement||doc.body,ctrlKey:false,metaKey:false,altKey:false,repeat:false,preventDefault(){this.defaultPrevented=true},...extra};for(const f of events[kind][t]||[])f(e);return e}
 return {nodes,storage,window:win,document:doc,test:win.__test,snapshot:()=>JSON.parse(JSON.stringify(win.__test.get())),frame(ms=1000/60){now+=ms;const jobs=[...raf.values()];raf.clear();for(const f of jobs)f(now)},advance(seconds,hz=60){for(let i=0;i<Math.round(seconds*hz);i++)this.frame(1000/hz)},transforms:()=>transforms.map(a=>[...a]),paintCount:()=>paints,writeCount:()=>writes,styleCount:()=>styles,rafCount:()=>raf.size,key:(key,extra={})=>emit('window','keydown',{key,...extra}),emit};
}
function fruit(level,x,y,extra={}){const t=require('../../melon-lab/rules').FRUITS[level];return {x,y,vx:0,vy:0,r:t.r,collisionR:t.collisionR,boundaryR:t.boundaryR,level,rot:0,age:2,settled:false,dead:false,...extra}}
module.exports={boot,fruit};
