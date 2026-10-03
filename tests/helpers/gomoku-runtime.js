const fs=require('node:fs');
const vm=require('node:vm');
function loadGomoku(options={}){
  const timers=new Map(), store=new Map(Object.entries(options.saved||{}));let next=0,paints=0,now=0;
  const document={readyState:'complete',hidden:false,activeElement:null,listeners:{},documentElement:{dataset:{theme:'light'}}};
  const window={listeners:{}};
  function target(base={}){return Object.assign(base,{listeners:{},addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);},emit(type,props={}){const event={target:this,button:0,isPrimary:true,pointerId:1,pointerType:'touch',detail:1,preventDefault(){this.defaultPrevented=true;},...props};for(const fn of this.listeners[type]||[])fn(event);return event;}});}
  target(document);target(window);
  const ids=['board','restart','start','undo','level','statusText','turnStone','curtain','curtainTitle','curtainText','winCount','lossCount','drawCount','moveCount','boardHelp','utilityDock','review','recordSummary'];
  const nodes=Object.fromEntries(ids.map(id=>{const classes=new Set(id==='curtain'?['curtain']:[]);return [id,target({id,tagName:id==='board'?'CANVAS':['start','restart','undo'].includes(id)?'BUTTON':'DIV',textContent:'',className:'',value:id==='level'?'normal':'',disabled:false,attributes:{},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},setAttribute(k,v){this.attributes[k]=String(v);},getAttribute(k){return this.attributes[k];},focus(){document.activeElement=this;},appendChild(){},setPointerCapture(){},releasePointerCapture(){},hasPointerCapture(){return true;}})];}));
  document.querySelectorAll=()=>[];document.getElementById=id=>nodes[id];document.querySelector=selector=>selector.startsWith('#')?nodes[selector.slice(1)]:null;
  const context=new Proxy({fillRect(){paints++;}}, {get(o,k){return k in o?o[k]:()=>{};},set(o,k,v){o[k]=v;return true;}});
  nodes.board.width=nodes.board.height=750;nodes.board.getContext=()=>context;nodes.board.getBoundingClientRect=()=>({left:0,top:0,width:750,height:750});
  const sandbox={window,document,JSON,Math,console,performance:{now:()=>now},getComputedStyle:()=>({getPropertyValue:()=>''}),setTimeout(fn,delay){const id=++next;timers.set(id,{fn,due:now+delay});return id;},clearTimeout(id){timers.delete(id);},localStorage:{getItem(k){if(options.getThrows)throw Error('storage blocked');return store.get(k)??null;},setItem(k,v){if(options.setThrows)throw Error('quota');store.set(k,String(v));}}};
  sandbox.globalThis=sandbox;vm.createContext(sandbox);vm.runInContext(fs.readFileSync('gomoku/rules.js','utf8'),sandbox);window.GomokuRules=sandbox.GomokuRules;
  let source=fs.readFileSync('gomoku/app.js','utf8');
  source=source.replace(/\}\)\(\);\s*$/,`window.__qa={snapshot:()=>JSON.parse(JSON.stringify({board,phase,waiting,snapshots,last,stats,cursor:typeof cursor==='undefined'?null:cursor,gesture:typeof gesture==='undefined'?null:gesture})),install:(b)=>{clearTimeout(timer);board=b;phase='play';waiting=false;snapshots=[];last=null;$('curtain').classList.add('hidden');render();},human,render};})();`);
  vm.runInContext(source,sandbox);
  function advance(ms=300){now+=ms;for(const [id,t]of [...timers])if(t.due<=now){timers.delete(id);t.fn();}}
  function tap(row,col,props={}){const r=nodes.board.getBoundingClientRect();const e={clientX:r.left+(42+col*666/14)*r.width/750,clientY:r.top+(42+row*666/14)*r.height/750,...props};nodes.board.emit('pointerdown',e);nodes.board.emit('pointerup',e);}
  return {nodes,window,document,store,timers,advance,tap,context,get paints(){return paints;},snapshot:window.__qa.snapshot,install:window.__qa.install,start:()=>nodes.start.emit('click'),human:window.__qa.human};
}
module.exports={loadGomoku};
