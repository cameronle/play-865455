const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function element(id) { return { id, textContent:'', classList:{add(){},remove(){}}, dataset:{}, listeners:{}, addEventListener(type,fn){this.listeners[type]=fn;} }; }
function boot() {
  const ids=['board','next','score','highScore','level','lines','message','messageTitle','messageHint','startButton','newGameButton','pauseButton'];
  const nodes=Object.fromEntries(ids.map(id=>[id,element(id)]));
  const context=new Proxy({}, {get(o,k){if(!(k in o))o[k]=()=>{};return o[k]},set(o,k,v){o[k]=v;return true}});
  nodes.board.getContext=()=>context; nodes.next.getContext=()=>context;
  const controls=['left','rotate','right','down','drop'].map(action=>{const e=element(action);e.dataset.action=action;return e});
  let raf;
  const sandbox={console,Math,localStorage:{getItem:()=>null,setItem(){}},document:{getElementById:id=>nodes[id],querySelectorAll:()=>controls},window:{listeners:{},addEventListener(type,fn){this.listeners[type]=fn;}},requestAnimationFrame:fn=>{raf=fn}};
  vm.createContext(sandbox); vm.runInContext(fs.readFileSync('tetris/game.js','utf8'),sandbox);
  return {nodes,controls,window:sandbox.window,frame:t=>raf(t)};
}

test('soft-drop input on the title screen does not crash', () => {
  const app=boot();
  const down=app.controls.find(x=>x.dataset.action==='down');
  assert.doesNotThrow(()=>down.listeners.pointerdown({preventDefault(){}}));
});

test('touch soft drop stops when the button is released', () => {
  const source=fs.readFileSync('tetris/game.js','utf8');
  assert.match(source,/const stop=e=>\{e\.preventDefault\(\);softDropping=false\}/);
  assert.match(source,/addEventListener\('pointerup',stop\)/);
  assert.match(source,/addEventListener\('pointercancel',stop\)/);
});

test('mobile layout stacks board and HUD instead of squeezing them side by side', () => {
  const css=fs.readFileSync('tetris/style.css','utf8');
  assert.match(css,/@media\(max-width:560px\)[\s\S]*\.game-layout\{flex-direction:column/);
  assert.match(css,/@media\(max-width:560px\)[\s\S]*\.board-wrap\{[^}]*width:min\(100%,300px,calc\(\(100svh - 190px\)\/2\)\)/);
});
