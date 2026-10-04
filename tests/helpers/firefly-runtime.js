const fs = require('node:fs');
const vm = require('node:vm');
function boot(options = {}) {
  const storage = new Map(Object.entries(options.storage || {})), nodes = {}, events = {window: {}, document: {}}, raf = new Map();
  let now = 100000, sequence = 0, paints = 0, writes = 0, doc;
  const ctx = new Proxy({}, {get: (o, k) => k in o ? o[k] : (...args) => { if (k === 'fillRect' && args[2] === 720 && args[3] === 720) paints++; }, set: (o, k, v) => ((o[k] = v), true)});
  function make(id, tag = 'div') {
    const classes = new Set(), listeners = {}, attrs = {}, captures = new Set(); let text = '', disabled = false;
    return {id, tagName: tag.toUpperCase(), dataset: {}, width: 720, height: 720, get disabled() { return disabled; }, set disabled(v) { writes++; disabled = v; }, hidden: false, isContentEditable: false, style: {}, children: [], parentElement: null,
      get textContent() { return text; }, set textContent(v) { writes++; text = String(v); },
      classList: {add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x), toggle(x, force) { force ??= !classes.has(x); force ? classes.add(x) : classes.delete(x); }},
      getContext: () => ctx, focus() { doc.activeElement = this; }, blur() { if (doc.activeElement === this) doc.activeElement = null; },
      contains(e) { return this === e || this.children.some(c => c.contains(e)); }, closest(s) { return s.split(',').some(x => x.trim() === this.tagName.toLowerCase() || x.trim() === '#' + id) ? this : this.parentElement?.closest(s) || null; },
      appendChild(c) { this.children.push(c); c.parentElement = this; }, replaceChildren(...children) { this.children = []; children.forEach(c => this.appendChild(c)); },
      setAttribute(k, v) { writes++; attrs[k] = String(v); }, getAttribute: k => attrs[k] ?? null,
      getBoundingClientRect: () => ({left: 0, top: 0, width: options.canvasSize || 720, height: options.canvasSize || 720}),
      setPointerCapture: id => captures.add(id), hasPointerCapture: id => captures.has(id), releasePointerCapture: id => captures.delete(id),
      addEventListener(t, f) { (listeners[t] ||= []).push(f); }, dispatch(t, extra = {}) { const e = {type: t, target: this, code: '', button: 0, pointerId: 1, pointerType: 'touch', isPrimary: true, clientX: 100, clientY: 100, preventDefault() { this.defaultPrevented = true; }, ...extra}; if (!this.disabled) for (const f of listeners[t] || []) f(e); return e; }, click() { return this.dispatch('click'); }
    };
  }
  for (const id of ['game','overlay','message','detail','startButton','pauseButton','upgradePanel','upgradeChoices','score','best','time','level','xpFill','moveUp','moveDown','moveLeft','moveRight','vitals','buildStatus']) nodes[id] = make(id, id === 'game' ? 'canvas' : id.endsWith('Button') || id.startsWith('move') ? 'button' : 'div');
  const buttons = ['Up','Down','Left','Right'].map(k => nodes['move'+k]); buttons.forEach(b => b.dataset.direction = b.id.slice(4).toLowerCase());
  nodes.overlay.appendChild(nodes.startButton); nodes.upgradePanel.appendChild(nodes.upgradeChoices); nodes.upgradePanel.hidden = true;
  doc = {hidden: !!options.initiallyHidden, activeElement: null, documentElement: make('html'), body: make('body'), getElementById: id => nodes[id] || null, querySelector: () => null, querySelectorAll: s => s === '.move-pad button' ? buttons : [], createElement: tag => make('',tag), addEventListener(t,f) { (events.document[t] ||= []).push(f); }};
  const win = {addEventListener(t,f) { (events.window[t] ||= []).push(f); }};
  let seed = options.seed || 7;
  const sandbox = {window: win, document: doc, getComputedStyle: () => ({getPropertyValue: () => ''}), performance: {now: () => now}, Math: Object.assign(Object.create(Math), {random: () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296)}), console,
    localStorage: {getItem(k) { if (options.storageThrows) throw Error('blocked'); return storage.get(k) ?? null; }, setItem(k,v) { if (options.storageThrows) throw Error('quota'); storage.set(k,String(v)); }},
    requestAnimationFrame: f => { const id = ++sequence; raf.set(id,f); return id; }, cancelAnimationFrame: id => raf.delete(id)};
  vm.createContext(sandbox); vm.runInContext(fs.readFileSync('firefly-watch/rules.js','utf8'),sandbox);
  // Test-only closure injection; never part of the deployed route.
  const shim = `window.__test={get:()=>({state,stats,player,enemies,shots,glowDrops,bursts,elapsed,score,best,level,xp,spawnTimer,fireTimer,nextBossIndex,input,dragPointer}),set:v=>{${['state','stats','player','enemies','shots','glowDrops','bursts','elapsed','score','best','level','xp','spawnTimer','fireTimer','nextBossIndex'].map(k=>`if('${k}' in v)${k}=v.${k};`).join('')}},startGame,togglePause,finishGame,update,updateEnemies,updateShots,updateGlowDrops,updatePlayer,fireVolley,gainXp,chooseUpgrade,resolveEnemyDeath,enemyTypes};`;
  vm.runInContext(fs.readFileSync('firefly-watch/game.js','utf8').replace(/\}\)\(\);\s*$/, ';'+shim+'})();'),sandbox);
  function emit(kind,t,extra={}) { const e = {type:t, code:'', target:doc.activeElement || doc.body, ctrlKey:false,metaKey:false,altKey:false,repeat:false,preventDefault(){this.defaultPrevented=true;},...extra}; for (const f of events[kind][t] || []) f(e); return e; }
  return {nodes,storage,window:win,document:doc,test:win.__test,snapshot:()=>JSON.parse(JSON.stringify(win.__test.get())),emit,
    frame(ms=1000/60) { now+=ms; const jobs=[...raf.values()]; raf.clear(); for(const f of jobs) f(now); },
    advance(seconds,hz=60) { for(let i=0;i<Math.round(seconds*hz);i++)this.frame(1000/hz); },
    paints:()=>paints,writes:()=>writes,rafCount:()=>raf.size,key:(code,extra={})=>emit('window','keydown',{code,...extra})};
}
function enemy(b, extra={}) { return {id:1,type:b.test.enemyTypes.moth,x:500,y:360,radius:15,hp:100,maxHp:100,speed:0,phase:0,orbiterCooldown:0,dead:false,escaped:false,...extra}; }
function shot(extra={}) { return {x:100,y:360,vx:510,vy:0,radius:4,life:1.6,damage:12,pierceLeft:0,hitIds:new Set(),...extra}; }
module.exports={boot,enemy,shot};
