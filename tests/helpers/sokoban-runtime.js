const fs = require('node:fs');
const vm = require('node:vm');
function loadSokoban(options = {}) {
  const store = new Map(Object.entries(options.saved || {})), timers = new Map();
  let id = 0, paints = 0; const invalidStyles = [];
  function target(base = {}) {
    return Object.assign(base, {listeners:{}, addEventListener(type, fn) {(this.listeners[type] ||= []).push(fn);},
      emit(type, props = {}) { const e = {target:this, button:0, isPrimary:true, pointerId:1, clientX:100, clientY:100, preventDefault(){this.defaultPrevented=true;}, ...props};
        for (const fn of this.listeners[type] || []) fn(e); return e;
      }});
  }
  const document = target({hidden:false, activeElement:null, documentElement:{dataset:{theme:'light'}}});
  const window = target({});
  const ids = ['game','level','moves','pushes','best','overlay','overlayTitle','overlayText','startButton','resetButton','undoButton','previousButton','nextButton','levelSelect','statusText','reviewButton','utilityDock'];
  const nodes = Object.fromEntries(ids.map(id => {
    const classes = new Set();
    return [id, target({id,tagName:id==='game'?'CANVAS':id==='levelSelect'?'SELECT':id.endsWith('Button')?'BUTTON':'DIV',textContent:'',value:'',disabled:false,dataset:{},attributes:{},
      classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},
      setAttribute(k,v){this.attributes[k]=String(v);},focus(){document.activeElement=this;},options:[],appendChild(child){this.options.push(child);},
      setPointerCapture(){if(options.captureThrows)throw Error('capture');},releasePointerCapture(){},hasPointerCapture(){return true;}})];
  }));
  const dpad = ['up','down','left','right'].map(dir => target({tagName:'BUTTON',dataset:{dir}}));
  document.getElementById = id => nodes[id];
  document.querySelectorAll = selector => selector==='[data-dir]' ? dpad : [];
  document.createElement = () => target({dataset:{},setAttribute(){}});
  const context = new Proxy({fillRect(){paints++;}}, {get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>{if(['fillStyle','strokeStyle'].includes(k)&&typeof v!=='string')invalidStyles.push({k,v});o[k]=v;return true;}});
  nodes.game.width = nodes.game.height = 560; nodes.game.getContext = () => context;
  nodes.game.getBoundingClientRect = () => ({left:0,top:0,width:560,height:560});
  const sandbox = {window,document,console,JSON,Math,Number,Set,Array,getComputedStyle:()=>({getPropertyValue:()=>''}),
    localStorage:{getItem(k){if(options.getThrows)throw Error('blocked');return store.get(k)??null;},setItem(k,v){if(options.setThrows)throw Error('quota');store.set(k,String(v));},removeItem(k){if(options.setThrows)throw Error('blocked');store.delete(k);}},
    setInterval(fn){const t=++id;timers.set(t,fn);return t;},clearInterval(t){timers.delete(t);},setTimeout(fn){const t=++id;timers.set(t,()=>{timers.delete(t);fn();});return t;},clearTimeout(t){timers.delete(t);}};
  window.setInterval = sandbox.setInterval; window.clearInterval = sandbox.clearInterval;
  vm.createContext(sandbox);
  for(const file of ['rules.js','levels.js']) vm.runInContext(fs.readFileSync('sokoban/'+file,'utf8'),sandbox);
  window.SokobanRules = sandbox.SokobanRules; window.SokobanLevels = options.levels || sandbox.SokobanLevels;
  let source = fs.readFileSync('sokoban/game.js','utf8');
  source=source.replace(/\}\)\(\);\s*$/, "window.__qa={snapshot:()=>JSON.parse(JSON.stringify({state,levelIndex,history,playerDirection,gamePhase})),attempt,loadLevel,undo,draw};})();");
  vm.runInContext(source,sandbox);
  return {nodes,document,window,dpad,context,store,timers,invalidStyles,snapshot:window.__qa.snapshot,move:window.__qa.attempt,undo:window.__qa.undo,
    start:()=>nodes.startButton.emit('click'),load:window.__qa.loadLevel,tick:()=>{for(const fn of [...timers.values()])fn();},get paints(){return paints;}};
}
module.exports = {loadSokoban};
