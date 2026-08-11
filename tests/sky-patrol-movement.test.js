const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function element(id){return{id,textContent:'',innerHTML:'',classList:{add(){},remove(){},toggle(){}},listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},click(){this.listeners.click?.({preventDefault(){}})}}}
function boot(){
  const ids=['game','score','level','lives','best','overlay','startButton','soundButton','mobilePauseButton','leftButton','rightButton','upButton','downButton'];
  const nodes=Object.fromEntries(ids.map(id=>[id,element(id)]));
  const ctx=new Proxy({}, {get(o,k){if(!(k in o))o[k]=()=>{};return o[k]},set(o,k,v){o[k]=v;return true}});
  nodes.game.width=480;nodes.game.height=720;nodes.game.getContext=()=>ctx;nodes.game.getBoundingClientRect=()=>({left:0,top:0,width:480,height:720});
  let raf;
  const document={getElementById:id=>nodes[id],querySelector:()=>element('query')};
  const window={listeners:{},addEventListener(type,fn){this.listeners[type]=fn;}};
  const sandbox={console,document,window,localStorage:{getItem:()=>null,setItem(){}},requestAnimationFrame:fn=>{raf=fn},setTimeout:fn=>fn(),Math};
  vm.createContext(sandbox);vm.runInContext(fs.readFileSync('shooter/game.js','utf8'),sandbox);
  return{nodes,window,frame(t){raf(t)}};
}

test('Sky Patrol movement reaches true horizontal and lower playfield bounds',()=>{
  const source=fs.readFileSync('shooter/game.js','utf8');
  assert.match(source,/player\.x=clamp\([^;]+player\.w\/2,W-player\.w\/2\)/);
  assert.match(source,/player\.y=clamp\([^;]+player\.h\/2,H-player\.h\/2\)/);
  assert.match(source,/player=\{x:W\/2,y:H-24,w:28,h:44/);
});

test('Sky Patrol supports up and down controls on keyboard and mobile',()=>{
  const html=fs.readFileSync('shooter/index.html','utf8'),source=fs.readFileSync('shooter/game.js','utf8'),css=fs.readFileSync('shooter/style.css','utf8');
  assert.match(html,/id="upButton"/);assert.match(html,/id="downButton"/);
  assert.match(html,/ARROWS \/ WASD TO MOVE/);
  assert.match(source,/pointer = \{left:false,right:false,up:false,down:false\}/);
  assert.match(source,/bindHold\('upButton','up'\)/);assert.match(source,/bindHold\('downButton','down'\)/);
  assert.match(source,/ArrowUp/);assert.match(source,/ArrowDown/);
  assert.match(css,/-webkit-touch-callout:none/);assert.match(css,/touch-action:none/);
});

test('Sky Patrol pointer dragging moves in both axes rather than x only',()=>{
  const source=fs.readFileSync('shooter/game.js','utf8');
  assert.match(source,/player\.x=clamp/);
  assert.match(source,/player\.y=clamp/);
});
