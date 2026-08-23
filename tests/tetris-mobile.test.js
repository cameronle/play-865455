const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function element(id) { return { id, textContent:'', classList:{add(){},remove(){}}, dataset:{}, listeners:{}, addEventListener(type,fn){this.listeners[type]=fn;} }; }
function boot() {
  const ids=['board','next','score','highScore','level','lines','message','messageTitle','messageHint','startButton','newGameButton','pauseButton'];
  const nodes=Object.fromEntries(ids.map(id=>[id,element(id)]));
  const makeContext=()=>new Proxy({fills:[],fillStyle:''}, {get(o,k){if(k==='fillRect')return (x,y,w,h)=>o.fills.push({x,y,w,h,color:o.fillStyle});if(!(k in o))o[k]=()=>{};return o[k]},set(o,k,v){o[k]=v;return true}});
  const boardContext=makeContext(), nextContext=makeContext();
  nodes.board.getContext=()=>boardContext; nodes.next.getContext=()=>nextContext;
  const controls=['left','rotate','right','down','drop'].map(action=>{const e=element(action);e.dataset.action=action;return e});
  let raf;
  const fixedMath=Object.create(Math);fixedMath.random=()=>0;
  const sandbox={console,Math:fixedMath,localStorage:{getItem:()=>null,setItem(){}},document:{getElementById:id=>nodes[id],querySelectorAll:()=>controls},window:{listeners:{},addEventListener(type,fn){this.listeners[type]=fn;}},requestAnimationFrame:fn=>{raf=fn}};
  vm.createContext(sandbox); vm.runInContext(fs.readFileSync('tetris/game.js','utf8'),sandbox);
  return {nodes,controls,window:sandbox.window,boardContext,frame(t){boardContext.fills=[];raf(t);}};
}

test('soft-drop input on the title screen does not crash', () => {
  const app=boot();
  const down=app.controls.find(x=>x.dataset.action==='down');
  assert.doesNotThrow(()=>down.listeners.pointerdown({preventDefault(){}}));
});

test('soft drop never carries over to the next piece while the key remains held', () => {
  const app=boot();
  app.nodes.startButton.listeners.click();
  app.window.listeners.keydown({key:'ArrowDown',preventDefault(){}});
  for(let i=0;i<25;i++) app.frame((i+1)*16);
  app.frame(1000);
  const activeCells=app.boardContext.fills.filter(x=>x.color==='#55b7c8'&&x.y<120);
  assert.ok(activeCells.length>=4,'the next piece should still be at its spawn height');
});

test('touch soft drop stops when the button is released', () => {
  const source=fs.readFileSync('tetris/game.js','utf8');
  assert.match(source,/const stop=e=>\{e\.preventDefault\(\);softDropRequested=false;softDropHeld=false\}/);
  assert.match(source,/addEventListener\('pointerup',stop\)/);
  assert.match(source,/addEventListener\('pointercancel',stop\)/);
});

test('mobile layout stacks board and HUD instead of squeezing them side by side', () => {
  const css=fs.readFileSync('tetris/style.css','utf8');
  assert.match(css,/@media\(max-width:560px\)[\s\S]*\.game-layout\{flex-direction:column/);
  assert.match(css,/@media\(max-width:560px\)[\s\S]*\.board-wrap\{[^}]*width:min\(100%,300px,calc\(\(100svh - 190px\)\/2\)\)/);
});

test('touch controls suppress long-press text selection and callout menus', () => {
  const css=fs.readFileSync('tetris/style.css','utf8');
  assert.match(css,/\.touch-controls(?:,|\{)[\s\S]*user-select:none/);
  assert.match(css,/\.touch-controls button\{[^}]*-webkit-touch-callout:none/);
  assert.match(css,/\.touch-controls button\{[^}]*touch-action:none/);
});

test('mobile touch controls leave clearance for the fixed theme utilities', () => {
  const css=fs.readFileSync('tetris/style.css','utf8');
  assert.match(css, /@media\(max-width:560px\)[\s\S]*\.touch-controls\{[^}]*margin:6px auto 0/);
});

test('very narrow mobile screens keep the utility buttons below the controls', () => {
  const css=fs.readFileSync('tetris/style.css','utf8');
  assert.match(css, /@media\(max-width:360px\)\{[^}]*[\s\S]*?\.touch-controls\{margin-top:-4px\}/);
});
