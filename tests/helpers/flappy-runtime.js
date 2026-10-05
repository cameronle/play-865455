const fs=require('node:fs'),vm=require('node:vm'),R=require('../../flappy/rules.js');
function boot(options={}){
 const storage=new Map(Object.entries(options.storage||{})),nodes={},events={window:{},document:{}},raf=new Map(),timers=new Map();let now=100000,seq=1,paints=0;
 const ctx=new Proxy({}, {get:(o,k)=>k in o?o[k]:(...args)=>{if(k==='fillRect'&&args[0]===0&&args[1]===0&&args[2]===400&&args[3]===600)paints++;options.onDraw?.({method:k,args,fill:o.fillStyle,stroke:o.strokeStyle,alpha:o.globalAlpha})},set:(o,k,v)=>((o[k]=v),true)});
 let doc;
 function make(id,tag='div'){
  const classes=new Set(),listeners={},attrs={};return {
   id,tagName:tag.toUpperCase(),width:400,height:600,disabled:false,inert:false,isContentEditable:false,textContent:'',style:{setProperty(){}},children:[],parentElement:null,
   classList:{add:(x)=>classes.add(x),remove:(x)=>classes.delete(x),contains:(x)=>classes.has(x),toggle(x,force){force??=!classes.has(x);force?classes.add(x):classes.delete(x)}},
   getContext:()=>ctx,focus(){doc.activeElement=this},contains(e){return this===e||this.children.some(c=>c.contains(e))},
   closest(s){return s.split(',').some(x=>x.trim()===this.tagName.toLowerCase()||x.trim()==='#'+id)?this:this.parentElement?.closest(s)||null},
   appendChild(c){this.children.push(c);c.parentElement=this},setAttribute(k,v){attrs[k]=String(v)},getAttribute(k){return attrs[k]??null},
   getBoundingClientRect:()=>({x:0,y:0,left:0,top:0,width:400,height:600}),
   setPointerCapture(){},hasPointerCapture(){return true},releasePointerCapture(){},
   addEventListener(t,f){(listeners[t]||=[]).push(f)},dispatch(t,extra={}){const e={type:t,target:this,code:'',button:0,pointerId:1,isPrimary:true,detail:0,defaultPrevented:false,preventDefault(){this.defaultPrevented=true},...extra};if(!this.disabled)for(const f of listeners[t]||[])f(e);return e},click(){return this.dispatch('click')}
  };
 }
 for(const id of ['game','scoreStat','bestStat','overlay','overlayTitle','overlayText','startButton','pauseButton','gamePage','gameFrame','utilityDock'])nodes[id]=make(id,id==='game'?'canvas':id.endsWith('Button')?'button':'div');
 nodes.overlay.appendChild(nodes.startButton);nodes.gameFrame.appendChild(nodes.game);nodes.gameFrame.appendChild(nodes.overlay);
 doc={hidden:false,readyState:'complete',activeElement:null,documentElement:make('html'),body:make('body'),getElementById:id=>nodes[id]||null,querySelector:()=>null,addEventListener(t,f){(events.document[t]||=[]).push(f)}};
 const boundRules=options.rng?{...R,createWorld:()=>R.createWorld(options.rng),advanceWorld:(w,dt)=>R.advanceWorld(w,dt,options.rng)}:R;
 const win={FlappyRules:boundRules,innerWidth:1280,innerHeight:800,addEventListener(t,f){(events.window[t]||=[]).push(f)}};
 const sandbox={window:win,document:doc,navigator:{vibrate(){}},getComputedStyle:()=>({getPropertyValue:name=>options.css?.[name]||'',paddingLeft:'0',paddingRight:'0',paddingTop:'0',paddingBottom:'0'}),performance:{now:()=>now},Math:options.rng?Object.assign(Object.create(Math),{random:options.rng}):Math,JSON,console,
 localStorage:{getItem(k){if(options.storageThrows)throw Error('blocked');return storage.get(k)??null},setItem(k,v){if(options.storageThrows)throw Error('quota');storage.set(k,String(v))}},
 requestAnimationFrame:f=>{const id=seq++;raf.set(id,f);return id},cancelAnimationFrame:id=>raf.delete(id),setTimeout(f,ms=0){const id=seq++;timers.set(id,{f,due:now+ms});return id},clearTimeout:id=>timers.delete(id)};
 vm.createContext(sandbox);const shim=`window.__test={get:()=>({state,score,best,bird,pipes}),set:v=>{if('state'in v)state=v.state;if('score'in v)score=v.score;if('best'in v)best=v.best;if('bird'in v)bird=v.bird;if('pipes'in v)pipes=v.pipes},update,gameOver};`;
 vm.runInContext(fs.readFileSync('flappy/game.js','utf8').replace(/\}\)\(\);\s*$/,';'+shim+'})();'),sandbox);
 function advance(ms){now+=ms;for(const [id,t]of [...timers])if(t.due<=now){timers.delete(id);t.f()}}
 function emit(kind,t,extra={}){const e={type:t,code:'',target:doc.activeElement||doc.body,ctrlKey:false,metaKey:false,altKey:false,repeat:false,preventDefault(){this.defaultPrevented=true},...extra};for(const f of events[kind][t]||[])f(e);return e}
 return {nodes,storage,window:win,document:doc,test:win.__test,snapshot:()=>JSON.parse(JSON.stringify(win.FlappyGame.getSnapshot())),advance,frame(ms=1000/60){advance(ms);const jobs=[...raf.values()];raf.clear();for(const f of jobs)f(now)},paintCount:()=>paints,rafCount:()=>raf.size,key:(code,extra={})=>emit('window','keydown',{code,...extra}),emit};
}
module.exports={boot};
