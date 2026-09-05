const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const lightRoutes=['2048','tetris','snake','minesweeper','sudoku','gomoku'];
const canvasRoutes=['breakout','bridges','bubble-shooter','color-bounce','crosswalk','endless-runner','flappy','flow','helicopter-cave','lunar-lander','maze','pong','shooter','sky-hopper','snake','sokoban','space-invaders','tetris'];

function bootTheme(saved=null,dark=false){
  const listeners={};
  const root={dataset:{},style:{}};
  const meta={content:''};
  const toggle={textContent:'',dataset:{},setAttribute(){},addEventListener(type,fn){listeners[type]=fn;}};
  const media={matches:dark,addEventListener(type,fn){listeners.media=fn;}};
  const store=new Map(saved?[['play-theme',saved]]:[]);
  const document={documentElement:root,readyState:'complete',querySelectorAll:()=>[toggle],querySelector:()=>meta,addEventListener(){},dispatchEvent(){}};
  const sandbox={document,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},matchMedia:()=>media,getComputedStyle:()=>({getPropertyValue:()=>dark?'#090d14':'#faf8ef'}),requestAnimationFrame:fn=>fn(),CustomEvent:function(){}};
  sandbox.window=sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('theme.js','utf8'),sandbox);
  return {root,toggle,store,listeners,media};
}

test('shared theme defaults to system and cycles system, light, dark',()=>{
  const app=bootTheme(null,true);
  assert.equal(app.root.dataset.theme,'dark');
  assert.equal(app.root.dataset.themeMode,'system');
  assert.equal(app.toggle.textContent,'AUTO');
  app.listeners.click();
  assert.equal(app.root.dataset.theme,'light');
  assert.equal(app.store.get('play-theme'),'light');
  app.listeners.click();
  assert.equal(app.root.dataset.theme,'dark');
  assert.equal(app.store.get('play-theme'),'dark');
  app.listeners.click();
  assert.equal(app.root.dataset.themeMode,'system');
  assert.equal(app.store.get('play-theme'),'system');
});

test('system changes are followed only while mode is automatic',()=>{
  const app=bootTheme(null,false);
  app.media.matches=true;
  app.listeners.media();
  assert.equal(app.root.dataset.theme,'dark');
  app.listeners.click();
  app.media.matches=false;
  app.listeners.media();
  assert.equal(app.root.dataset.theme,'light');
});

test('all formerly light routes load shared theme assets and expose a toggle',()=>{
  for(const route of lightRoutes){
    const html=fs.readFileSync(`${route}/index.html`,'utf8');
    assert.match(html,/href="\/theme\.css\?v=[^"]+"/i,`${route} theme css`);
    assert.match(html,/src="\/theme\.js\?v=[^"]+"/i,`${route} theme js`);
    assert.match(html,/class="[^"]*theme-toggle[^"]*"/i,`${route} toggle`);
    const css=fs.readFileSync(`${route}/${route==='gomoku'?'app.css':'style.css'}`,'utf8');
    const alternate=route==='gomoku'?/\[data-theme="light"\]/:/\[data-theme="dark"\]/;
    assert.match(css,alternate,`${route} alternate palette`);
  }
});

test('canvas games redraw from CSS theme variables instead of fixed light backgrounds',()=>{
  for(const route of ['snake','tetris']){
    const source=fs.readFileSync(`${route}/game.js`,'utf8');
    assert.match(source,/getComputedStyle\(document\.documentElement\)/,`${route} reads theme colors`);
    assert.match(source,/themechange/,`${route} redraws after theme changes`);
  }
});

test('New Game controls use each game\'s theme accent in both modes',()=>{
  const expected={
    tetris:{light:{color:'#3d3832',hover:'#ccebd7'},dark:{color:'#20323a',hover:'#b6e3c2'}},
    snake:{light:{color:'#25433d',hover:'#ccebd7'},dark:{color:'#25433d',hover:'#b6e3c2'}},
  };
  for(const [route,modes] of Object.entries(expected)){
    const css=fs.readFileSync(`${route}/style.css`,'utf8');
    assert.match(css,new RegExp(`\\.secondary\\{[^}]*color:${modes.light.color}`),`${route} light accent`);
    assert.match(css,new RegExp(`\\.secondary:hover\\{background:${modes.light.hover}`),`${route} light hover`);
    assert.match(css,new RegExp(`\\[data-theme="dark"\\] \\.secondary\\{[^}]*color:${modes.dark.color}`),`${route} dark accent`);
    assert.match(css,new RegExp(`\\[data-theme="dark"\\] \\.secondary:hover\\{background:${modes.dark.hover}`),`${route} dark hover`);
  }
  for(const [route,colors] of Object.entries({
    breakout:{light:'#ef8b70',hover:'#e77966'},
    maze:{light:'#0288d1',hover:'#0277bd'},
    'space-invaders':{light:'#e98575',hover:'#d97467'},
  })){
    const css=fs.readFileSync(`${route}/style.css`,'utf8');
    assert.match(css,new RegExp(`\\[data-theme="light"\\] \\.new\\s*\\{[\\s\\S]*background:\\s*${colors.light}`),`${route} light action color`);
    assert.match(css,new RegExp(`\\[data-theme="light"\\] \\.new:hover\\s*\\{\\s*background:\\s*${colors.hover}`),`${route} light hover color`);
  }
});

test('Crosswalk overlay title has no duplicate text shadow',()=>{
  const css=fs.readFileSync('crosswalk/style.css','utf8');
  assert.doesNotMatch(css,/\.overlay b\s*\{[^}]*text-shadow/);
});

test('every canvas game has a live theme path for its playfield',()=>{
  for(const route of canvasRoutes){
    const js=fs.readFileSync(`${route}/game.js`,'utf8');
    const css=fs.readFileSync(`${route}/style.css`,'utf8');
    const jsTheme=/dataset\.theme|getComputedStyle\(document\.documentElement\)|\bisLight\b|\bisDark\b/.test(js);
    const cssTheme=/\[data-theme="(?:light|dark)"\][\s\S]*canvas|canvas[\s\S]*var\(--/.test(css);
    assert.ok(jsTheme||cssTheme,`${route} has no canvas theme path`);
  }
});

test('theme stylesheet keeps the compact control usable on phones',()=>{
  const css=fs.readFileSync('theme.css','utf8');
  assert.match(css,/\.theme-toggle/);
  assert.match(css,/@media\(max-width:480px\)/);
  assert.match(css,/min-height:32px/);
});

test('root launcher index page is themed, minimalist, and uses system theme',()=>{
  const html=fs.readFileSync('index.html','utf8');
  assert.match(html,/href="\/theme\.css\?v=[^"]+"/i,'root theme css');
  assert.match(html,/src="\/theme\.js\?v=[^"]+"/i,'root theme js');
  assert.match(html,/class="[^"]*theme-toggle[^"]*"/i,'root toggle');
  assert.match(html,/\[data-theme="dark"\]/i,'root dark theme');
  assert.match(html,/\[data-theme="light"\]/i,'root light theme');
  assert.match(html,/font-family:[^;]*ui-monospace/i,'root monospace font');
  assert.doesNotMatch(html,/fonts\.googleapis\.com/i,'no external Google fonts dependency');
});
