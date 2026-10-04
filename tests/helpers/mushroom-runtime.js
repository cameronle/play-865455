const fs=require('node:fs'),vm=require('node:vm');
function boot(options={}){
 const storage=new Map(Object.entries(options.storage||{})),nodes={},events={window:{},document:{}},raf=new Map();let now=100000,seq=1,paints=0,writes=0,styles=0;
 const ctx=new Proxy({}, {get:(o,k)=>k in o?o[k]:k==='createLinearGradient'?()=>({addColorStop(){}}):(...args)=>{if(k==='drawImage')paints++},set:(o,k,v)=>((o[k]=v),true)});
 let doc;
 function make(id,tag='div'){
  const classes=new Set(),listeners={},attrs={},captures=new Set();let text='';return {
   id,tagName:tag.toUpperCase(),dataset:{},width:960,height:540,disabled:false,inert:false,isContentEditable:false,style:{setProperty(){}},children:[],parentElement:null,
   get textContent(){return text},set textContent(v){writes++;text=String(v)},
   classList:{add:(x)=>classes.add(x),remove:(x)=>classes.delete(x),contains:(x)=>classes.has(x),toggle(x,force){force??=!classes.has(x);force?classes.add(x):classes.delete(x)}},
   getContext:()=>ctx,focus(){doc.activeElement=this},blur(){if(doc.activeElement===this)doc.activeElement=null},contains(e){return this===e||this.children.some(c=>c.contains(e))},
   closest(s){return s.split(',').some(x=>x.trim()===this.tagName.toLowerCase()||x.trim()==='#'+id)?this:this.parentElement?.closest(s)||null},
   appendChild(c){this.children.push(c);c.parentElement=this},setAttribute(k,v){attrs[k]=String(v)},getAttribute(k){return attrs[k]??null},
   getBoundingClientRect:()=>({x:0,y:0,left:0,top:0,width:960,height:540}),
   setPointerCapture(id){captures.add(id)},hasPointerCapture:id=>captures.has(id),releasePointerCapture(id){captures.delete(id)},
   addEventListener(t,f){(listeners[t]||=[]).push(f)},dispatch(t,extra={}){const e={type:t,target:this,code:'',button:0,pointerId:1,isPrimary:true,detail:0,defaultPrevented:false,preventDefault(){this.defaultPrevented=true},...extra};if(!this.disabled)for(const f of listeners[t]||[])f(e);return e},click(){return this.dispatch('click')}
  };
 }
 for(const id of ['game','world','coins','lives','score','overlay','message','detail','startButton','pauseButton','leftButton','rightButton','jumpButton','runButton','gamePage','gameFrame','utilityDock'])nodes[id]=make(id,id==='game'?'canvas':id.endsWith('Button')?'button':'div');
 nodes.overlay.appendChild(nodes.startButton);nodes.gameFrame.appendChild(nodes.game);nodes.gameFrame.appendChild(nodes.overlay);
 doc={hidden:false,readyState:'complete',activeElement:null,documentElement:make('html'),body:make('body'),getElementById:id=>nodes[id]||null,querySelector:()=>null,createElement:tag=>make('',tag),addEventListener(t,f){(events.document[t]||=[]).push(f)}};
 const win={innerWidth:1280,innerHeight:800,addEventListener(t,f){(events.window[t]||=[]).push(f)}};
 const sandbox={window:win,document:doc,navigator:{vibrate(){}},getComputedStyle:()=>{styles++;return{getPropertyValue:()=>'',paddingLeft:'0',paddingRight:'0',paddingTop:'0',paddingBottom:'0'}},performance:{now:()=>now},Math:options.rng?Object.assign(Object.create(Math),{random:options.rng}):Math,JSON,console,addEventListener:win.addEventListener,
 localStorage:{getItem(k){if(options.storageThrows)throw Error('blocked');return storage.get(k)??null},setItem(k,v){if(options.storageThrows)throw Error('quota');storage.set(k,String(v))}},
 requestAnimationFrame:f=>{const id=seq++;raf.set(id,f);return id},cancelAnimationFrame:id=>raf.delete(id),setTimeout,clearTimeout};
 vm.createContext(sandbox);
 for(const file of ['rules.js','levels.js','pixel-renderer.js'])if(fs.existsSync('mushroom-trail/'+file))vm.runInContext(fs.readFileSync('mushroom-trail/'+file,'utf8'),sandbox);
 const shim=`window.__test={get:()=>({state,paused,levelIndex,current,player,input,particles,powerups,cameraX,clock,lives,score,coins,best,checkpointReached,LEVELS}),set:v=>{if('state'in v)state=v.state;if('paused'in v)paused=v.paused;if('player'in v)player=v.player;if('current'in v)current=v.current;if('lives'in v)lives=v.lives;if('score'in v)score=v.score;if('coins'in v)coins=v.coins;if('particles'in v)particles=v.particles;if('clock'in v)clock=v.clock;if('powerups'in v)powerups=v.powerups;if('checkpointReached'in v)checkpointReached=v.checkpointReached;},update,resolvePlayer,updatePlatforms,updateEnemies,stompOrHurt,hurtPlayer,bumpBlock,reachCheckpoint,levelClear,loadLevel,startGame,nextLevel,togglePause,pressJump,releaseJump,draw};`;
 vm.runInContext(fs.readFileSync('mushroom-trail/game.js','utf8').replace(/\}\)\(\);\s*$/,';'+shim+'})();'),sandbox);
 function emit(kind,t,extra={}){const e={type:t,key:'',code:'',target:doc.activeElement||doc.body,ctrlKey:false,metaKey:false,altKey:false,repeat:false,preventDefault(){this.defaultPrevented=true},...extra};for(const f of events[kind][t]||[])f(e);return e}
 return {nodes,storage,window:win,document:doc,test:win.__test,snapshot:()=>JSON.parse(JSON.stringify(win.__test.get())),frame(ms=1000/60){now+=ms;const jobs=[...raf.values()];raf.clear();for(const f of jobs)f(now)},paintCount:()=>paints,writeCount:()=>writes,styleCount:()=>styles,rafCount:()=>raf.size,key:(key,extra={})=>emit('window','keydown',{key,...extra}),emit};
}
module.exports={boot};
