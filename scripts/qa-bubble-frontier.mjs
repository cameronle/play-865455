import assert from 'node:assert/strict';
import fs from 'node:fs';
const OUT = (process.env.TMPDIR || process.cwd() + '/.hermes/qa') + '/bubble-frontier-qa';
const origin = process.env.BUBBLE_QA_ORIGIN || 'http://127.0.0.1:8765';
fs.mkdirSync(OUT, {recursive: true});
const endpoint = process.env.BUBBLE_CDP_URL || 'http://127.0.0.1:9222';
const target = await (await fetch(endpoint + '/json/new?about:blank', {method: 'PUT'})).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {ws.addEventListener('open', resolve, {once: true}); ws.addEventListener('error', reject, {once: true});});
let n = 0; const pending = new Map(), errors = [];
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {const {resolve, reject, timer} = pending.get(m.id); clearTimeout(timer); pending.delete(m.id); m.error ? reject(Error(JSON.stringify(m.error))) : resolve(m.result);}
  if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) errors.push('HTTP ' + m.params.response.status + ': ' + m.params.response.url);
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
});
function call(method, params = {}) {
  const id = ++n;
  return new Promise((resolve, reject) => {const timer = setTimeout(() => {pending.delete(id); reject(Error('CDP timeout: ' + method));}, 10000); pending.set(id, {resolve, reject, timer}); ws.send(JSON.stringify({id, method, params}));});
}
async function evaluate(expression) {
  const result = await call('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
const delay = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(expression, timeout = 6000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {if (await evaluate(expression)) return; await delay(40);}
  throw Error('wait failed: ' + expression);
}
async function click(selector) {
  const p = await evaluate(`(() => {const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'nearest'});const r = e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await call('Input.dispatchMouseEvent', {type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1, ...p});
  await call('Input.dispatchMouseEvent', {type: 'mouseReleased', button: 'left', buttons: 0, clickCount: 1, ...p});
}
async function key(type, key, code, virtualKey) {await call('Input.dispatchKeyEvent', {type, key, code, windowsVirtualKeyCode: virtualKey, nativeVirtualKeyCode: virtualKey});}
async function screenshot(name) {const r = await call('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false}); const path = OUT + '/' + name + '.png'; fs.writeFileSync(path, Buffer.from(r.data, 'base64')); return path;}
async function checkPanelFrame(selector) {
  const frame = await evaluate(`(() => {
    const arena = document.querySelector('.arena').getBoundingClientRect();
    const panel = document.querySelector(${JSON.stringify(selector)});
    const box = panel.getBoundingClientRect(), style = getComputedStyle(panel);
    return {selector:${JSON.stringify(selector)}, gaps:[box.left-arena.left,box.top-arena.top,arena.right-box.right,arena.bottom-box.bottom], border:[style.borderTopWidth,style.borderRightWidth,style.borderBottomWidth,style.borderLeftWidth].map(parseFloat), arena:{width:arena.width,height:arena.height}, panel:{width:box.width,height:box.height}};
  })()`);
  assert.ok(frame.gaps.every(gap => gap >= 1 && gap <= 3.1), 'panel must have a slim blue surround, not a thick frame: ' + JSON.stringify(frame));
  assert.ok(frame.border.every(width => width === 1), 'panel outline stays one CSS pixel: ' + JSON.stringify(frame));
  return frame;
}
try {
  await call('Runtime.enable'); await call('Page.enable');
  await call('Network.enable'); await call('Network.setCacheDisabled',{cacheDisabled:true});
  await call('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('play-lang','zh');localStorage.setItem('play-theme','system');localStorage.setItem('bubble_frontier_settings',JSON.stringify({sound:false,assist:true,quality:'normal',dualStick:false,leftHand:false}));"});
  await call('Emulation.setDeviceMetricsOverride', {width: 1280, height: 800, deviceScaleFactor: 1, mobile: false});
  await call('Emulation.setFocusEmulationEnabled', {enabled: true});
  await call('Page.bringToFront');
  await call('Page.navigate', {url: origin + '/bubble-tanks/?qa=1'});
  await waitFor('document.readyState === "complete"');
  assert.match(await evaluate('document.title'), /Bubble Frontier/, 'the real game route must render before testing it');
  if (process.argv.includes('--red')) {console.log('route ready'); process.exitCode = 0;}
  else {
    await waitFor('!!window.BubbleFrontier?.snapshot');
    assert.equal((await evaluate('BubbleFrontier.snapshot()')).mode, 'title');
    await click('#startButton');
    if(await evaluate('!document.querySelector("#confirmPanel").hidden'))await click('#confirmNewButton');
    await waitFor('BubbleFrontier.snapshot().mode === "upgrade"');
    const desktopUpgradeFrame = await checkPanelFrame('#upgradePanel');
    await screenshot('desktop-upgrade');
    const offer = await evaluate('BubbleFrontier.snapshot().offers');
    assert.equal(new Set(offer).size, 3);
    const frozen = await evaluate('BubbleFrontier.snapshot().time'); await delay(200);
    assert.equal(await evaluate('BubbleFrontier.snapshot().time'), frozen);
    await click(`[data-upgrade="${offer.includes('scatter') ? 'scatter' : offer[0]}"]`);
    await waitFor('BubbleFrontier.snapshot().mode === "running"');
    await key('keyDown', 'd', 'KeyD', 68);
    await waitFor('BubbleFrontier.snapshot().room.x === 1', 5500);
    await key('keyUp', 'd', 'KeyD', 68);
    await delay(500);
    const initialCombat = await evaluate('BubbleFrontier.snapshot()');
    assert.ok(initialCombat.enemyCount > 0);
    const desktopGeometry = await evaluate('({height:innerHeight,scrollHeight:document.documentElement.scrollHeight,footerBottom:document.querySelector("footer").getBoundingClientRect().bottom,pageDisplay:getComputedStyle(document.querySelector(".page")).display,query:matchMedia("(min-width:901px) and (min-height:521px)").matches,styles:[...document.styleSheets].map(s=>({href:s.href,rules:s.cssRules.length,last:s.cssRules[s.cssRules.length-1]?.cssText.slice(0,250)}))})');
    assert.ok(desktopGeometry.scrollHeight <= desktopGeometry.height, 'desktop must fit without page scrolling: ' + JSON.stringify(desktopGeometry));
    const desktopScreenshot = await screenshot('desktop-combat');
    await click('#pauseButton'); await waitFor('BubbleFrontier.snapshot().mode === "paused"');
    const pauseTime = await evaluate('BubbleFrontier.snapshot().time'),pauseFrames=await evaluate('BubbleFrontier.snapshot().frames');
    await evaluate('window.__qaMutations=0;window.__qaObserver=new MutationObserver(r=>window.__qaMutations+=r.length);window.__qaObserver.observe(document.querySelector(".page"),{childList:true,subtree:true,characterData:true,attributes:true})');await delay(200);
    assert.equal(await evaluate('BubbleFrontier.snapshot().time'), pauseTime);assert.equal(await evaluate('BubbleFrontier.snapshot().frames'),pauseFrames);assert.equal(await evaluate('window.__qaObserver.disconnect();window.__qaMutations'),0,'paused HUD must be idle');
    await click('#resumeButton'); await waitFor('BubbleFrontier.snapshot().mode === "running"');
    await call('Emulation.setDeviceMetricsOverride', {width: 390, height: 844, deviceScaleFactor: 1, mobile: true});
    await call('Emulation.setTouchEmulationEnabled', {enabled: true, maxTouchPoints: 2});
    await call('Page.navigate', {url: origin + '/bubble-tanks/?qa=mobile'});
    await waitFor('!!window.BubbleFrontier?.snapshot');
    await click('#startButton');if(await evaluate('!document.querySelector("#confirmPanel").hidden'))await click('#confirmNewButton'); await waitFor('BubbleFrontier.snapshot().mode === "upgrade"');
    const mobileUpgradeFrame = await checkPanelFrame('#upgradePanel');
    const upgradeActions = await evaluate(`(() => {
      const p=document.querySelector('#upgradePanel').getBoundingClientRect();
      return ['rerollButton','skipButton'].map(id => {const r=document.getElementById(id).getBoundingClientRect();return {id,bottom:r.bottom,panelBottom:p.bottom,height:r.height};});
    })()`);
    assert.ok(upgradeActions.every(r => r.bottom <= r.panelBottom - 1 && r.height >= 44), 'phone upgrade actions must not be cropped: ' + JSON.stringify(upgradeActions));
    await screenshot('mobile-upgrade');
    const mobileOffer = await evaluate('BubbleFrontier.snapshot().offers');
    await click(`[data-upgrade="${mobileOffer.includes('scatter') ? 'scatter' : mobileOffer[0]}"]`);
    await click('#pauseButton');await click('#dualStickButton');await click('#resumeButton');
    const joystick = await evaluate('(() => {const r = document.querySelector("#joystick").getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};})()');
    await call('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: joystick.x, y: joystick.y, id: 1}]});
    await call('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: joystick.x + 37, y: joystick.y, id: 1}]});
    await waitFor('BubbleFrontier.snapshot().room.x === 1', 5500);
    const crossed=await evaluate('BubbleFrontier.snapshot()');await delay(120);const held=await evaluate('BubbleFrontier.snapshot()');assert.ok(held.input.x>.8&&held.playerX>crossed.playerX,'held touch must persist after room crossing');
    const aimStick=await evaluate('(()=>{const r=document.querySelector("#aimJoystick").getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2+22,id:2};})()');
    await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:joystick.x+37,y:joystick.y,id:1},aimStick]});
    await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[{x:joystick.x+37,y:joystick.y,id:1}]});
    const independent=await evaluate('BubbleFrontier.snapshot().input');assert.equal(independent.x,0);assert.ok(independent.aim,'lifting move must preserve aim');
    await call('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
    await delay(500);
    const mobileSnapshot = await evaluate('BubbleFrontier.snapshot()');
    const mobileScreenshot = await screenshot('mobile-combat');
    await click('#skillButton');
    await waitFor('BubbleFrontier.snapshot().skillClock > 0');
    if ((await evaluate('BubbleFrontier.snapshot()')).skill === 'overload') assert.ok((await evaluate('BubbleFrontier.snapshot()')).shield > 0);
    const geometry = await evaluate(`(() => ({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,controls:[...document.querySelectorAll('button,a,select')].filter(e=>e.getClientRects().length&&!e.closest('[hidden]')).map(e=>{const r=e.getBoundingClientRect();return {id:e.id||e.className,text:e.textContent.trim().slice(0,30),w:r.width,h:r.height};})}))()`);
    assert.equal(geometry.width, geometry.scroll, 'no phone overflow');
    assert.ok(geometry.controls.every(r => r.w >= 44 && r.h >= 44), JSON.stringify(geometry.controls));
    await click('#dashButton');
    assert.ok((await evaluate('BubbleFrontier.snapshot()')).dashClock > 0);
    await click('#pauseButton');
    const pauseMobile = await evaluate('BubbleFrontier.snapshot()');
    await click('#languageButton');
    assert.equal(await evaluate('BubbleFrontier.snapshot().lang'),'en');
    assert.ok(await evaluate('[...document.querySelectorAll("[data-i18n]")].every(e => !/[\\u3400-\\u9fff]/.test(e.textContent))'));
    const beforeTheme = await evaluate('document.documentElement.dataset.theme');
    await click('.theme-toggle'); await click('.theme-toggle'); await delay(100);
    assert.equal(await evaluate('document.documentElement.dataset.theme'),'dark');
    await checkPanelFrame('#pausePanel');
    await screenshot('mobile-dark-panel');
    assert.equal(await evaluate('BubbleFrontier.snapshot().mass'),pauseMobile.mass);
    await click('#resumeButton');
    const darkScreenshot = await screenshot('mobile-dark');
    await click('#pauseButton');
    await call('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
    await delay(80);
    const landscape = await evaluate(`(() => ({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,controlBottom:document.querySelector('.control-strip').getBoundingClientRect().bottom,canvasWidth:document.querySelector('#game').getBoundingClientRect().width,footerBottom:document.querySelector('footer').getBoundingClientRect().bottom,panelScroll:document.querySelector('#pausePanel').scrollHeight,panelHeight:document.querySelector('#pausePanel').clientHeight}))()`);
    await checkPanelFrame('#pausePanel');
    assert.equal(landscape.width,landscape.scrollWidth);
    assert.ok(landscape.controlBottom <= landscape.height,JSON.stringify(landscape));
    assert.ok(landscape.canvasWidth >= 260 && landscape.footerBottom <= landscape.height,'landscape battlefield must remain legible within the viewport: '+JSON.stringify(landscape));
    await click('#resumeButton');
    const landscapeScreenshot = await screenshot('mobile-landscape');
    await call('Emulation.setDeviceMetricsOverride',{width:320,height:568,deviceScaleFactor:1,mobile:true});
    await delay(80);
    const narrow = await evaluate('({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,controlBottom:document.querySelector(".control-strip").getBoundingClientRect().bottom})');
    await click('#pauseButton');
    await checkPanelFrame('#pausePanel');
    assert.equal(narrow.width,narrow.scrollWidth);
    assert.ok(narrow.controlBottom <= 568,'small-phone action controls must fit: '+JSON.stringify(narrow));
    assert.equal(errors.length, 0, JSON.stringify(errors));
    const result = {desktop:initialCombat,desktopGeometry,desktopUpgradeFrame,mobile:mobileSnapshot,mobileUpgradeFrame,geometry,landscape,narrow,errors,screenshots:[desktopScreenshot,mobileScreenshot,darkScreenshot,landscapeScreenshot]};
    fs.writeFileSync(OUT + '/report.json', JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  }
} catch (error) {console.error(error.stack);console.error('layout',await evaluate('({settings:JSON.parse(localStorage.getItem("bubble_frontier_settings")||"{}"),rects:[...document.querySelectorAll(".topbar,.hud,.field-meta,.arena-shell,.build-row,.control-strip,.joystick,.control-copy,.mobile-copy,.action-buttons,footer")].map(e=>({class:e.className,height:e.getBoundingClientRect().height,bottom:e.getBoundingClientRect().bottom,text:e.textContent.slice(0,100)}))})'));await screenshot('failed'); console.error('runtimeErrors', errors); process.exitCode = 1;}
finally {ws.close(); await fetch(endpoint + '/json/close/' + target.id).catch(() => {});}
