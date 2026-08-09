const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Classes {
  constructor(initial='') { this.set = new Set(initial.split(/\s+/).filter(Boolean)); }
  add(x) { this.set.add(x); }
  remove(x) { this.set.delete(x); }
  contains(x) { return this.set.has(x); }
}
function element(id) {
  return { id, textContent:'', className:'', classList:new Classes(id === 'curtain' ? 'curtain' : ''), value:id === 'level' ? 'normal' : '', disabled:false, listeners:{}, addEventListener(type, fn) { this.listeners[type] = fn; } };
}

test('fresh page starts, accepts a center tap, and completes the cpu reply', () => {
  const ids = ['board','restart','start','undo','level','statusText','turnStone','curtain','curtainTitle','curtainText','winCount','lossCount','drawCount'];
  const nodes = Object.fromEntries(ids.map(id => [id, element(id)]));
  const gradient = { addColorStop() {} };
  const context2d = new Proxy({ createLinearGradient:()=>gradient, createRadialGradient:()=>gradient }, { get(o,k){ if (!(k in o)) o[k]=()=>{}; return o[k]; }, set(o,k,v){o[k]=v;return true;} });
  nodes.board.getContext = () => context2d;
  nodes.board.getBoundingClientRect = () => ({ left:0, top:0, width:750, height:750 });
  const saved = new Map();
  const sandbox = { console, JSON, Math, clearTimeout(){}, setTimeout(fn){ sandbox.pending=fn; return 1; }, localStorage:{ getItem:k=>saved.get(k)||null, setItem:(k,v)=>saved.set(k,v) }, document:{ getElementById:id=>nodes[id] }, window:{} };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('gomoku/rules.js','utf8'), sandbox);
  sandbox.window.GomokuRules = sandbox.GomokuRules;
  vm.runInContext(fs.readFileSync('gomoku/app.js','utf8'), sandbox);

  nodes.start.listeners.click();
  assert.equal(nodes.statusText.textContent, '轮到你落子');
  assert.equal(nodes.curtain.classList.contains('hidden'), true);
  nodes.board.listeners.pointerdown({ clientX:375, clientY:375, preventDefault(){} });
  assert.equal(nodes.statusText.textContent, '电脑思考中…');
  assert.equal(typeof sandbox.pending, 'function');
  sandbox.pending();
  assert.equal(nodes.statusText.textContent, '轮到你落子');
  assert.equal(nodes.undo.disabled, false);
});
