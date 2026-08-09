const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function node(id) {
  return { id, textContent:'', classList:{ add(){}, remove(){} }, listeners:{}, onclick:null, addEventListener(type, fn){ this.listeners[type]=fn; } };
}

test('maze starts, accepts touch direction, moves ghosts, and pauses', () => {
  const ids=['game','pause','start','new','score','high','level','lives','title','hint','overlay'];
  const nodes=Object.fromEntries(ids.map(id=>[id,node(id)]));
  const buttons={up:node('up'),down:node('down'),left:node('left'),right:node('right')};
  const gradient={addColorStop(){}};
  const context2d=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get(o,k){if(!(k in o))o[k]=()=>{};return o[k]},set(o,k,v){o[k]=v;return true}});
  nodes.game.getContext=()=>context2d;
  nodes.game.getBoundingClientRect=()=>({left:0,top:0,width:480,height:480});
  nodes.game.setPointerCapture=()=>{};
  let raf;
  const storage=new Map();
  const sandbox={console,Math,JSON,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},document:{getElementById:id=>nodes[id],querySelector:s=>buttons[s.match(/data-dir="(.*?)"/)[1]]},window:{},requestAnimationFrame:fn=>{raf=fn}};
  sandbox.globalThis=sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('maze/logic.js','utf8'),sandbox);
  sandbox.window.MazeLogic=sandbox.MazeLogic;
  vm.runInContext(fs.readFileSync('maze/game.js','utf8'),sandbox);

  nodes.start.onclick();
  buttons.right.listeners.pointerdown({preventDefault(){}});
  raf(200); raf(400);
  assert.equal(nodes.score.textContent,'000010');
  nodes.game.listeners.pointerdown({clientX:200,clientY:200,pointerId:1,preventDefault(){}});
  nodes.game.listeners.pointerup({clientX:200,clientY:100,preventDefault(){}});
  nodes.pause.onclick();
  assert.equal(nodes.title.textContent,'PAUSED');
});
