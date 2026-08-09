const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function element(id) {
  return { id, textContent:'', classList:{ add(){}, remove(){} }, listeners:{}, onclick:null, addEventListener(type, fn){ this.listeners[type]=fn; } };
}

function boot() {
  const ids=['game','pause','start','new','mobileLaunch','score','high','level','lives','title','hint','overlay'];
  const nodes=Object.fromEntries(ids.map(id=>[id,element(id)]));
  const arcs=[];
  const context2d=new Proxy({ arc(x,y,r){ arcs.push({x,y,r}); } },{get(o,k){if(!(k in o))o[k]=()=>{};return o[k]},set(o,k,v){o[k]=v;return true}});
  nodes.game.getContext=()=>context2d;
  nodes.game.getBoundingClientRect=()=>({left:0,top:0,width:360,height:480});
  nodes.game.setPointerCapture=()=>{}; nodes.game.releasePointerCapture=()=>{};
  let raf;
  const sandbox={console,Math,localStorage:{getItem:()=>null,setItem(){}},document:{getElementById:id=>nodes[id]},window:{},requestAnimationFrame:fn=>{raf=fn}};
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('breakout/game.js','utf8'),sandbox);
  return {nodes,arcs,runFrame:t=>raf(t)};
}

test('mobile launch button starts and launches from the title screen', () => {
  const app=boot();
  app.nodes.mobileLaunch.onclick();
  app.arcs.length=0; app.runFrame(200); app.runFrame(400);
  const ballYs=app.arcs.filter(a=>a.r===6).map(a=>a.y);
  assert.ok(ballYs.length >= 2);
  assert.notEqual(ballYs.at(-1), ballYs[0], 'ball stayed attached to the paddle');
});

test('a tap on the playfield starts and launches the game', () => {
  const app=boot();
  app.nodes.game.listeners.pointerdown({clientX:180,clientY:430,pointerId:1,pointerType:'touch',preventDefault(){}});
  app.nodes.game.listeners.pointerup({clientX:180,clientY:430,pointerId:1,pointerType:'touch',preventDefault(){}});
  app.arcs.length=0; app.runFrame(200); app.runFrame(400);
  const ballYs=app.arcs.filter(a=>a.r===6).map(a=>a.y);
  assert.ok(ballYs.length >= 2);
  assert.notEqual(ballYs.at(-1), ballYs[0]);
});

test('top collision clamps the ball inside the board and sends it downward', () => {
  const source=fs.readFileSync('breakout/game.js','utf8');
  assert.match(source,/if\(ball\.y-ball\.r<=0&&ball\.vy<0\)\{ball\.y=ball\.r;ball\.vy=Math\.abs\(ball\.vy\)\}/);
});

test('mobile layout gives the playfield full width and a visible launch button', () => {
  const css=fs.readFileSync('breakout/style.css','utf8');
  assert.match(css,/@media\(max-width:600px\)[\s\S]*\.layout\{display:flex;flex-direction:column/);
  assert.match(css,/\.mobile-actions\{display:block/);
  assert.match(css,/min-height:48px/);
});
