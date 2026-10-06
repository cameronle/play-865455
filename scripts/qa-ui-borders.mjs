import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url), games = require('../data/games.js');
const args = process.argv.slice(2), origin = args[0] || 'http://127.0.0.1:8176';
const phase = args[1] || 'local', from = Number(args[2] || 0), until = Number(args[3] || games.length);
const OUT = path.join(process.env.TMPDIR || process.cwd(), 'thin-ui-borders', phase);
fs.mkdirSync(OUT, {recursive:true});
const endpoint = process.env.BORDER_CDP_URL || 'http://127.0.0.1:9222';
const version = await (await fetch(endpoint + '/json/version')).json();
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener('open', resolve, {once:true}));
let nextId = 0, sessionId, browserContextId;
const pending = new Map(), errors = [], warnings = [], rows = [];
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const task = pending.get(message.id);
    if (task) {clearTimeout(task.timer); pending.delete(message.id); message.error ? task.reject(Error(JSON.stringify(message.error))) : task.resolve(message.result);}
  }
  if (message.sessionId === sessionId && message.method === 'Runtime.exceptionThrown') errors.push({route:currentRoute, error:message.params.exceptionDetails});
  if (message.sessionId === sessionId && message.method === 'Network.responseReceived' && message.params.response.status >= 400) {
    const row = {route:currentRoute, url:message.params.response.url, status:message.params.response.status};
    errors.push(row);
  }
});
function call(method, params = {}, browser = false) {
  return new Promise((resolve,reject) => {
    const id = ++nextId, timer = setTimeout(() => {pending.delete(id);reject(Error('CDP timeout: '+method));}, 15000);
    pending.set(id,{resolve,reject,timer});
    ws.send(JSON.stringify({id,method,params,...(!browser && sessionId ? {sessionId} : {})}));
  });
}
async function evaluate(expression) {
  const result = await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
const delay = ms => new Promise(resolve => setTimeout(resolve,ms));
let currentRoute = null;
const views = [[320,568],[390,844],[568,320],[844,390],[768,1024],[1440,900]];
const start = {'2048':'#newGame',shooter:'#startButton',tetris:'#startButton',snake:'#startButton',breakout:'#start',minesweeper:'#start',maze:'#start',gomoku:'#start',sokoban:'#startButton',crosswalk:'#startButton',sudoku:'#startButton','sky-hopper':'#startButton','endless-runner':'#startButton',flappy:'#startButton','mushroom-trail':'#startButton','melon-lab':'#startButton','firefly-watch':'#startButton','bubble-tanks':'#startButton'};
const observer = `(() => {
  if (window.__thinUIObserver) return;
  window.__thinUIObserver = {paints:0};
  for (const name of ['fillRect','clearRect','fill','stroke','drawImage']) {
    const original = CanvasRenderingContext2D.prototype[name];
    CanvasRenderingContext2D.prototype[name] = function(...args) {window.__thinUIObserver.paints++;return Reflect.apply(original,this,args);};
  }
  localStorage.setItem('play-theme','light');
  localStorage.setItem('play-lang','en');
})()`;
async function navigate(route) {
  await call('Page.navigate',{url:origin+'/'+route+'/?border-qa='+phase});
  let ready = false;
  for (let count=0;count<150;count++) {
    if (await evaluate(`location.pathname===${JSON.stringify('/'+route+'/')} && document.readyState==='complete' && !!document.querySelector('h1')`)) {ready=true;break;}
    await delay(35);
  }
  assert.ok(ready,route+' not loaded');
  await evaluate('document.fonts.ready.then(()=>true)');
  // Initial/title painting may intentionally be scheduled for the next RAF.
  await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
}
async function nativeClick(selector) {
  const point = await evaluate(`(() => {const e=document.querySelector(${JSON.stringify(selector)});if(!e || e.disabled || !e.getBoundingClientRect().height || getComputedStyle(e).visibility==='hidden')return null;e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return {x,y,hit:e.contains(document.elementFromPoint(x,y))};})()`);
  if (!point) return false;
  assert.ok(point.hit,'blocked '+currentRoute+' '+selector);
  for (const type of ['mousePressed','mouseReleased']) await call('Input.dispatchMouseEvent',{type,x:point.x,y:point.y,button:'left',clickCount:1});
  return true;
}
const measure = `(() => {
  const bordered=[],violations=[],shadows=[],all=[...document.querySelectorAll('body *')];
  function label(e) {return e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(typeof e.className==='string'?'.'+e.className.trim().replace(/\\s+/g,'.'):'');}
  const route=location.pathname.split('/')[1];
  for (const e of all) {
    const r=e.getBoundingClientRect(),s=getComputedStyle(e);
    if (!r.width||!r.height||s.visibility==='hidden'||s.display==='none')continue;
    const sides=['Top','Right','Bottom','Left'].map(side=>({side,width:parseFloat(s['border'+side+'Width']),style:s['border'+side+'Style']}));
    const relevant=sides.filter(x=>x.width>0&&x.style!=='none'&&x.style!=='hidden');
    if(relevant.length)bordered.push({element:label(e),sides:relevant});
    const partition=route==='sudoku'&&e.classList.contains('cell')||route==='nonogram'&&(e.matches('.corner,.col-clues,.row-clues,.cell'));
    const art=!!e.closest('.route-fruit,.next-fruit');
    for(const side of relevant)if(side.width>(partition?2.05:1.05)&&!art)violations.push({element:label(e),...side});
    if(s.boxShadow!=='none'&&!art&&!e.matches('.cell.cursor,.theme-toggle,.clear-data-toggle'))shadows.push({element:label(e),shadow:s.boxShadow});
  }
  const canvas=[...document.querySelectorAll('canvas')].filter(e=>e.getBoundingClientRect().height);
  const focus=[...document.querySelectorAll('button,a,select,canvas[tabindex]')].find(e=>!e.disabled&&e.getBoundingClientRect().height);
  return {route,title:document.querySelector('h1')?.textContent.trim(),theme:document.documentElement.dataset.theme,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,bordered,violations,shadows,canvases:canvas.map(e=>({width:e.width,height:e.height,rect:e.getBoundingClientRect().toJSON()})),paints:window.__thinUIObserver.paints,focusTarget:focus?.id||null};
})()`;
function check(result,width,stage) {
  assert.equal(result.clientWidth,width,currentRoute+' mobile autoscaling at '+stage);
  assert.ok(result.scrollWidth<=result.clientWidth+1,JSON.stringify({route:currentRoute,stage,viewport:width,overflow:result.scrollWidth,result}));
  assert.deepEqual(result.violations,[],JSON.stringify({route:currentRoute,stage,thickBorders:result.violations}));
  assert.deepEqual(result.shadows,[],JSON.stringify({route:currentRoute,stage,heavyShadows:result.shadows}));
  assert.ok(result.bordered.length,currentRoute+' no rendered borders');
  if(result.canvases.length)assert.ok(result.paints>0,currentRoute+' blank Canvas');
}
try {
  ({browserContextId} = await call('Target.createBrowserContext',{},true));
  const {targetId} = await call('Target.createTarget',{url:'about:blank',browserContextId},true);
  ({sessionId} = await call('Target.attachToTarget',{targetId,flatten:true},true));
  await call('Runtime.enable');await call('Page.enable');await call('Network.enable');
  await call('Network.setCacheDisabled',{cacheDisabled:true});
  await call('Emulation.setFocusEmulationEnabled',{enabled:true});await call('Page.bringToFront');
  await call('Page.addScriptToEvaluateOnNewDocument',{source:observer});
  for (const game of games.slice(from,until)) {
    currentRoute = game.path;
    for (const [width,height] of views) {
      await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<900});
      await navigate(game.path);
      const initial = await evaluate(measure);check(initial,width,'initial');
      let started = false;
      if(start[game.path])started=await nativeClick(start[game.path]);
      for (const theme of ['light','dark']) {
        await evaluate(`(() => {for(let i=0;i<4 && document.documentElement.dataset.themeMode!==${JSON.stringify(theme)};i++)document.querySelector('.theme-toggle').click();window.scrollTo(0,0);return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));})()`);
        const active=await evaluate(measure);assert.equal(active.theme,theme);check(active,width,'playable');
        let screenshot=null;
        if (width===390 || width===1440) {
          const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
          screenshot=path.join(OUT,game.path+'-'+theme+'-'+width+'x'+height+'.png');
          fs.writeFileSync(screenshot,Buffer.from(shot.data,'base64'));
        }
        const row={route:game.path,name:game.name.zh,viewport:[width,height],theme,started,initial,active,screenshot,sourceInterception:false,focusEmulated:true};
        rows.push(row);fs.appendFileSync(path.join(OUT,'matrix.jsonl'),JSON.stringify(row)+'\n');
      }
    }
    console.log(JSON.stringify({phase,route:game.path,cases:views.length*2,status:'PASS'}));
  }
  assert.equal(rows.length,(until-from)*views.length*2);assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(OUT,`batch-${from}-${until}.json`),JSON.stringify({rows,errors,warnings,completed:true},null,2));
  console.log(JSON.stringify({phase,routes:until-from,cases:rows.length,errors:errors.length,warnings:warnings.length,completed:true}));
} catch(error) {
  fs.writeFileSync(path.join(OUT,`failed-${from}-${until}.json`),JSON.stringify({error:String(error.stack),route:currentRoute,rows,errors},null,2));
  throw error;
} finally {
  if(browserContextId)await call('Target.disposeBrowserContext',{browserContextId},true).catch(()=>{});
  ws.close();
}
