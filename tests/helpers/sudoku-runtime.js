const fs = require('node:fs');
const vm = require('node:vm');
const Rules = require('../../sudoku/rules.js');

function createRuntime(options = {}) {
  const storage = new Map(Object.entries(options.storage || {})), elements = new Map();
  const windowEvents = new Map(), documentEvents = new Map(), jobs = new Map();
  let time = 100000, nextJob = 1, seed = options.seed || 1;
  const rng = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const confirms = [];
  let document;
  function element(tag = 'button', id = '') {
    const listeners = new Map(), attrs = {}, classes = new Set();
    const e = {id, tagName: tag.toUpperCase(), dataset: {}, children: [], parentElement: null,
      style: {}, value: id === 'difficulty' ? 'medium' : '', textContent: '', disabled: false,
      tabIndex: 0, inert: false, hidden: false, isContentEditable: false,
      setAttribute(k, v) { attrs[k] = String(v); if (k === 'tabindex') this.tabIndex = +v; },
      getAttribute(k) { return attrs[k] ?? null; },
      removeAttribute(k) { delete attrs[k]; },
      appendChild(child) { this.children.push(child); child.parentElement = this; return child; },
      replaceChildren(...children) { this.children = []; children.forEach(c => this.appendChild(c)); },
      focus() { document.activeElement = this; },
      contains(child) { return child === this || this.children.some(c => c.contains(child)); },
      closest(selector) {
        const selectors = selector.split(',').map(s => s.trim());
        if (selectors.some(s => s === this.tagName.toLowerCase() || s === '#'+this.id ||
          (s.startsWith('.') && classes.has(s.slice(1))) || (s === '[contenteditable]' && this.isContentEditable))) return this;
        return this.parentElement?.closest(selector) || null;
      },
      addEventListener(name, fn) { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(fn); },
      dispatch(name, extra = {}) {
        const event = {type: name, target: this, button: 0, isPrimary: true, pointerType: 'mouse',
          defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...extra};
        if (!this.disabled) { for (const fn of listeners.get(name) || []) fn(event); this['on'+name]?.(event); }
        return event;
      },
      click() { return this.dispatch('click'); },
      classList: {add(...ns) { ns.forEach(n => classes.add(n)); },remove(...ns) { ns.forEach(n => classes.delete(n)); },
        contains(n) { return classes.has(n); }, toggle(n, on) { const add = on ?? !classes.has(n); add ? classes.add(n) : classes.delete(n); return add; }}
    };
    Object.defineProperty(e, 'className', {get: () => [...classes].join(' '), set(v) { classes.clear(); String(v).split(/\s+/).filter(Boolean).forEach(n => classes.add(n)); }});
    Object.defineProperty(e, 'innerHTML', {get: () => '', set() { e.children = []; }});
    return e;
  }
  for (const id of ['board','timer','mistakes','best','difficulty','overlay','overlayTitle','overlayText','startButton','notesButton','eraseButton','undoButton','hintButton','newButton','pauseButton','statusText','utilityDock','gamePage']) {
    elements.set(id, element(id === 'difficulty' ? 'select' : (['board','overlay','gamePage','utilityDock'].includes(id) ? 'div' : 'button'), id));
  }
  const numberButtons = Array.from({length: 9}, (_, i) => { const e = element(); e.dataset.number = String(i+1); return e; });
  const theme = element(); theme.className = 'theme-toggle';
  const clear = element(); clear.className = 'clear-data-toggle';
  document = {hidden: false, activeElement: null, body: element('body'), readyState: 'complete',
    getElementById: id => elements.get(id) || null,
    querySelectorAll: selector => selector === '[data-number]' ? numberButtons : [],
    querySelector: selector => selector === '.theme-toggle' ? theme : selector === '.clear-data-toggle' ? clear : null,
    createElement: tag => element(tag),
    addEventListener(name, fn) { if (!documentEvents.has(name)) documentEvents.set(name, []); documentEvents.get(name).push(fn); }};
  const window = {SudokuRules: {...Rules, generatePuzzle(d) { return options.fixture ? JSON.parse(JSON.stringify(options.fixture)) : Rules.generatePuzzle(d, rng); }},
    dispatchEvent(event){for(const fn of windowEvents.get(event.type)||[])fn(event);return true;},
    performance: {now: () => time}, confirm(message) { confirms.push(message); return options.confirm !== false; },
    addEventListener(name, fn) { if (!windowEvents.has(name)) windowEvents.set(name, []); windowEvents.get(name).push(fn); }};
  const localStorage = new Proxy({
    getItem(k) { if (options.storageThrows) throw new Error('blocked'); return storage.get(k) ?? null; },
    setItem(k, v) { if (options.storageThrows) throw new Error('quota'); storage.set(k, String(v)); },
    removeItem(k) { if (options.storageThrows) throw new Error('blocked'); storage.delete(k); }
  },{ownKeys:()=>[...storage.keys()],getOwnPropertyDescriptor:()=>({enumerable:true,configurable:true})});
  const fakeDate = {now: () => time};
  const schedule = (fn, ms, repeat) => { const id = nextJob++; jobs.set(id, {fn, due: time+ms, ms, repeat}); return id; };
  const sandbox = {window, document, localStorage, Date: fakeDate, Event: class {constructor(type){this.type=type}}, performance: window.performance, Math: Object.assign(Object.create(Math),{random:options.random||rng}),
    setInterval: (fn, ms) => schedule(fn, ms, true), clearInterval: id => jobs.delete(id),
    setTimeout: (fn, ms=0) => schedule(fn, ms, false), clearTimeout: id => jobs.delete(id), console};
  vm.createContext(sandbox);
  const shim = `window.__sudokuTest={get:()=>({puzzle:R.clone(puzzle),solution:R.clone(solution),board:R.clone(board),notes:notes.map(row=>row.map(set=>[...set])),selected:{...selected},mistakes,state,notesMode,elapsed,historyLength:history.length}),selectCell,enterNumber,erase,undo,hint,newGame,startClock,finish,updateTimer};`;
  const code = fs.readFileSync('sudoku/game.js', 'utf8').replace(/\}\)\(\);\s*$/, ';'+shim+'})();');
  vm.runInContext(code, sandbox);
  const snapshot = () => JSON.parse(JSON.stringify(window.__sudokuTest.get()));
  function advance(ms, fire = true) {
    const target = time + ms;
    if (fire) for (;;) {
      let next = null;
      for (const [id, job] of jobs) if (job.due <= target && (!next || job.due < next[1].due)) next = [id, job];
      if (!next) break;
      const [id, job] = next; time = job.due;
      if (job.repeat) job.due += job.ms; else jobs.delete(id);
      job.fn();
    }
    time = target;
  }
  const emit = (target, name, extra = {}) => {
    const event = {key: '',target: document.activeElement || document.body,repeat: false,ctrlKey: false,metaKey:false,altKey:false,shiftKey:false,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}, ...extra};
    for (const fn of (target === 'document' ? documentEvents : windowEvents).get(name) || []) fn(event);
    return event;
  };
  function select(r, c) { const cell = elements.get('board').children[r*9+c]; cell.dispatch('pointerdown'); cell.click(); }
  return {elements,numberButtons,window,document,storage,confirms,snapshot,advance,emit,select,setConfirm: value => {options.confirm=value;},
    start: () => elements.get('startButton').click(),
    key: (key, extra) => emit('window','keydown',{key,...extra}),
    runSharedClear(){
      sandbox.location={pathname:'/sudoku/',reload(){emit('window','pagehide')}};
      const previous=document.querySelector;document.querySelector=s=>s==='.clear-data-toggle'?document.body.children.find(e=>e.classList.contains('clear-data-toggle'))||null:previous(s);
      vm.runInContext(fs.readFileSync('clear-game-data.js','utf8'),sandbox);
      return document.body.children.find(e=>e.classList.contains('clear-data-toggle'));
    },
    test: window.__sudokuTest, intervalCount: () => [...jobs.values()].filter(j => j.repeat).length};
}
module.exports = {createRuntime};
