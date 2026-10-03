const fs = require('node:fs');
const vm = require('node:vm');
function createHopper(seed = 1) {
  let randomState = seed >>> 0, now = 0, id = 0;
  const frames = new Map(), elements = new Map(), listeners = new Map();
  const stats = {draws:0, textWrites:0, paletteReads:0, trace:false, commands:[]};
  const math = Object.create(Math);
  math.random = () => ((randomState = (Math.imul(randomState,1664525)+1013904223)>>>0) / 4294967296);
  const context = new Proxy({}, {get:(o,k)=>k in o?o[k]:((...args)=>{if(stats.trace)stats.commands.push([k,...args])}), set:(o,k,v)=>(o[k]=v,true)});
  context.fillRect = (x,y,w,h) => { if(x===0 && y===0 && w===480 && h===720) stats.draws++; };
  function element(name) {
    if(elements.has(name)) return elements.get(name);
    let text=''; const handlers=new Map(), classes=new Set();
    const e={id:name,dataset:{},style:{},width:480,height:720,
      classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x)},
      get textContent(){return text},set textContent(value){text=String(value);stats.textWrites++},
      addEventListener:(t,f)=>{if(!handlers.has(t))handlers.set(t,[]);handlers.get(t).push(f)},
      dispatch:(t,event={})=>{event={preventDefault(){this.defaultPrevented=true},pointerId:1,clientX:100,clientY:100,...event};for(const f of handlers.get(t)||[])f(event);return event},
      setPointerCapture(){},releasePointerCapture(){},hasPointerCapture(){return true},
      getBoundingClientRect:()=>({left:0,top:0,width:480,height:720}),getContext:()=>context};
    elements.set(name,e);return e;
  }
  const document={hidden:false,getElementById:element,documentElement:{},
    addEventListener:(t,f)=>{if(!listeners.has('doc:'+t))listeners.set('doc:'+t,[]);listeners.get('doc:'+t).push(f)}};
  const store=new Map();
  const sandbox={Math:math,console,document,performance:{now:()=>now},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))},
    getComputedStyle:()=>{stats.paletteReads++;return {getPropertyValue:()=>''}},
    requestAnimationFrame:f=>{frames.set(++id,f);return id},cancelAnimationFrame:i=>frames.delete(i),
    addEventListener:(t,f)=>{if(!listeners.has(t))listeners.set(t,[]);listeners.get(t).push(f)}};
  sandbox.window=sandbox; const env=vm.createContext(sandbox);
  if(fs.existsSync('sky-hopper/rules.js'))sandbox.DoodleHopRules=require(require('node:path').resolve('sky-hopper/rules.js'));
  const source=fs.readFileSync('sky-hopper/game.js','utf8');
  if(!/\}\)\(\);?\s*$/.test(source))throw new Error('Expected a game IIFE');
  vm.runInContext(source.replace(/\}\)\(\);?\s*$/, ';globalThis.__hopTest={run:code=>eval(code)};})();'),env);
  const run=code=>env.__hopTest.run(code);
  return {run,stats,element,document,store,seed:n=>{randomState=n>>>0},
    event:(t,event={})=>{for(const f of listeners.get(t)||[])f({preventDefault(){},...event})},
    frame:time=>{now=time;const current=[...frames.values()];frames.clear();current.forEach(f=>f(time))},
    pending:()=>frames.size,
    snapshot:()=>JSON.parse(run('JSON.stringify({state,paused,player,platforms,stars,cameraY,highest,score,starCount,input})'))};
}
module.exports={createHopper};
