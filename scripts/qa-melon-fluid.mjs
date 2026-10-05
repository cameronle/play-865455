import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const origin=process.argv[2]||'http://127.0.0.1:8176',phase=process.argv[3]||'local';
const out=path.resolve(process.env.MELON_QA_OUT||'/home/hermes/workspace/artifacts/game-qa/melon-fluid',phase);
fs.mkdirSync(out,{recursive:true});
const version=await(await fetch((process.env.MELON_CDP_URL||'http://127.0.0.1:9222')+'/json/version')).json();
const ws=new WebSocket(version.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0,session,context,target,current='',fixture=false;const pending=new Map(),errors=[],rows=[],loadedHashes=[];
const sha=text=>crypto.createHash('sha256').update(text).digest('hex');
const expectedHash=sha(fs.readFileSync(new URL('../melon-lab/game.js',import.meta.url)));
const shim=`window.__melonFixture={load:()=>{start();cancelAnimationFrame(rafId);rafId=0;window.requestAnimationFrame=()=>0;fruits=[[3,296,613],[3,424,613],[0,360,545]].map(([level,x,y])=>{const t=FRUITS[level];return{x,y,level,r:t.r,collisionR:t.collisionR,boundaryR:t.boundaryR,vx:0,vy:0,rot:0,age:2,settled:false,dead:false}});draw();},advance:n=>{for(let i=0;i<n;i++){clock+=STEP*1000;update(STEP);fruits[0].x=296;fruits[1].x=424;fruits[0].vx=fruits[1].vx=0;}draw();return MelonLab.getSnapshot()}};`;
ws.addEventListener('message',event=>{
 const m=JSON.parse(event.data);
 if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}}
 if(m.sessionId!==session)return;
 if(m.method==='Runtime.exceptionThrown')errors.push({case:current,error:m.params.exceptionDetails});
 if(m.method==='Network.responseReceived'&&m.params.response.status>=400)errors.push({case:current,url:m.params.response.url,status:m.params.response.status});
 if(m.method==='Fetch.requestPaused')handleResponse(m.params).catch(error=>{errors.push({case:current,interception:String(error)});call('Fetch.failRequest',{requestId:m.params.requestId,errorReason:'Failed'}).catch(()=>{})});
});
function call(method,params={},sid=session){return new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>{pending.delete(n);reject(Error('CDP timeout '+method))},20000);pending.set(n,{resolve,reject,timer});ws.send(JSON.stringify({id:n,method,params,...(sid?{sessionId:sid}:{})}))})}
async function evaluate(expression,sid=session){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sid);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value}
async function handleResponse(p){
 assert.equal(p.responseStatusCode,200,'fixture renderer HTTP status');const body=await call('Fetch.getResponseBody',{requestId:p.requestId});
 const text=body.base64Encoded?Buffer.from(body.body,'base64').toString():body.body;const hash=sha(text);assert.equal(hash,expectedHash,'fixture must execute exact deployed renderer');loadedHashes.push({case:current,url:p.request.url,sha256:hash});
 const code=text.replace(/\}\)\(\);\s*$/,';'+shim+'})();');assert.notEqual(code,text,'missing renderer closure');
 await call('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/javascript; charset=utf-8'},{name:'Cache-Control',value:'no-store'}],body:Buffer.from(code).toString('base64')});
}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(expression){for(let i=0;i<160;i++){if(await evaluate(expression))return;await delay(50)}throw Error('not ready '+expression)}
const snap=()=>evaluate('MelonLab.getSnapshot()');
async function shot(name){const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});const p=path.join(out,name+'.png');fs.writeFileSync(p,Buffer.from(r.data,'base64'));return p}
async function rect(selector){return evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect(),cx=r.x+r.width/2,cy=r.y+r.height/2;return{...r.toJSON(),cx,cy,hit:e.contains(document.elementFromPoint(cx,cy))}})()`)}
async function click(selector){const r=await rect(selector);assert.ok(r.hit,selector+' not clickable');for(const type of ['mousePressed','mouseReleased'])await call('Input.dispatchMouseEvent',{type,x:r.cx,y:r.cy,button:'left',clickCount:1})}
async function key(key,code,virtual){for(const type of ['keyDown','keyUp'])await call('Input.dispatchKeyEvent',{type,key,code,windowsVirtualKeyCode:virtual})}
async function navigate(width,height,theme){
 await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<900});await call('Emulation.setTouchEmulationEnabled',{enabled:width<900,maxTouchPoints:5});
 await call('Page.navigate',{url:origin+'/melon-lab/?qa='+phase});await waitFor('document.readyState==="complete"&&!!window.MelonLab');await call('Page.bringToFront');
 await evaluate(`(()=>{for(let i=0;i<4&&document.documentElement.dataset.themeMode!==${JSON.stringify(theme)};i++)document.querySelector('.theme-toggle').click();window.scrollTo(0,0);return document.fonts.ready.then(()=>true)})()`);
 assert.equal((await snap()).state,'title');assert.equal(await evaluate('document.visibilityState'),'visible');
}
function invariant(s){for(const f of s.fruits){const m=f.deformation;assert.ok([f.x,f.y,f.vx,f.vy,m.a,m.b,m.c].every(Number.isFinite));assert.ok(f.x>=75+f.boundaryX-1e-5&&f.x<=645-f.boundaryX+1e-5);assert.ok(f.y<=657-f.boundaryY+1e-5);assert.ok(Math.hypot(m.xx,m.xy)<=.20000001);assert.ok(Math.abs(m.a*m.c-m.b*m.b-1)<1e-8)}}
async function layout(width,height){const r=await evaluate(`(()=>{const c=document.querySelector('#game'),r=c.getBoundingClientRect();return{width:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,canvas:r.toJSON(),touch:getComputedStyle(c).touchAction,border:getComputedStyle(document.querySelector('.arena')).borderTopWidth,theme:document.documentElement.dataset.theme}})()`);assert.equal(r.width,width);assert.ok(r.scroll<=r.client);assert.equal(r.touch,'none');assert.equal(r.border,'1px');assert.ok(r.canvas.left>=0&&r.canvas.right<=width+1&&r.canvas.top>=0&&r.canvas.bottom<=height+1);return r}
async function native(width,height,theme){
 current='native-'+width+'-'+theme;await navigate(width,height,theme);assert.equal(await evaluate('typeof window.__melonFixture'),'undefined');
 const assets=await evaluate(`Promise.all([...document.querySelectorAll('script[src],link[rel="stylesheet"],link[rel="icon"]')].map(async e=>{const url=e.src||e.href,r=await fetch(url);return{url,status:r.status,type:r.headers.get('content-type'),text:await r.text()}}))`);
 for(const a of assets){assert.equal(a.status,200);assert.ok(!a.text.startsWith('<!doctype'));if(a.url.includes('/melon-lab/game.js'))assert.equal(sha(a.text),expectedHash)}
 await click('#startButton');await click('.brand');
 const samples=[];const sample=async()=>{const s=await snap();invariant(s);samples.push(s);return s};
 const initial=await snap();await call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});await delay(140);await call('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});assert.ok((await snap()).aimX>initial.aimX+15);
 for(const x of [300,370,410,340,400,460,280,340,400,450,350,410]){
  const r=await rect('#game'),px=r.x+x/720*r.width,py=r.y+160/720*r.height;
  if(width<900){const t={id:1,x:px,y:py,radiusX:2,radiusY:2};await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[t]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[t]})}
  else{await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:px,y:py,button:'none'});await key(' ','Space',32)}
  for(let i=0;i<8;i++){await delay(80);await sample()}
 }
 const active=await sample(),peak=Math.max(...samples.flatMap(s=>s.fruits.map(f=>Math.hypot(f.deformation.xx,f.deformation.xy))));assert.equal(active.dropCount,12);assert.ok(active.score>0);assert.ok(peak>.075,'natural contacts must show visible strain');const screenshot=await shot(current);
 const before=(await snap()).energy;await click(width<900?'#mobileStirButton':'#stirButton');const stirred=await snap();assert.ok(before-stirred.energy>=28);assert.ok(stirred.fluidPulse>1);await delay(300);invariant(await snap());
 await click('#pauseButton');await delay(50);const frozen=await snap();await delay(180);const after=await snap();assert.equal(after.state,'paused');assert.equal(after.elapsedMs,frozen.elapsedMs);assert.equal(after.framesRendered,frozen.framesRendered);await click('#startButton');assert.equal((await snap()).state,'playing');
 const {targetId:other}=await call('Target.createTarget',{url:'about:blank',browserContextId:context},null);const {sessionId:otherSession}=await call('Target.attachToTarget',{targetId:other,flatten:true},null);await call('Page.bringToFront',{},otherSession);await waitFor('document.visibilityState==="hidden"&&MelonLab.getSnapshot().paused');const hidden=await snap();await delay(120);assert.equal((await snap()).elapsedMs,hidden.elapsedMs);await call('Page.bringToFront');await waitFor('document.visibilityState==="visible"');assert.equal((await snap()).state,'paused');await call('Target.closeTarget',{targetId:other},null);await click('#startButton');
 rows.push({case:current,input:width<900?'native CDP touch':'native keyboard/mouse',injectedGameState:false,clockAcceleration:false,drops:active.dropCount,score:active.score,peakStrain:peak,pausePaintIdle:true,nativeBackgroundPause:true,layout:await layout(width,height),assets:assets.map(a=>({url:a.url,status:a.status,sha256:sha(a.text)})),screenshot});fs.writeFileSync(path.join(out,current+'.json'),JSON.stringify(samples,null,2));
}
async function squeeze(width,height,theme,film=false){
 current='squeeze-'+width+'-'+theme;await navigate(width,height,theme);await waitFor('!!window.__melonFixture');await evaluate('__melonFixture.load()');const before=await snap();const startScreenshot=await shot(current+'-before'),samples=[];const frames=path.join(out,current+'-frames');if(film)fs.mkdirSync(frames,{recursive:true});
 let peak=0,peakScreenshot;
 for(let i=0;i<72;i++){const s=await evaluate('__melonFixture.advance(5)');invariant(s);samples.push(s);const amount=-s.fruits[2].deformation.xx;if(amount>peak){peak=amount;if(!film)peakScreenshot=await shot(current+'-peak')}
  if(film){const file=await shot(current+'-frames/'+String(i).padStart(3,'0'));if(amount===peak)peakScreenshot=file}
 }
 const after=await snap();assert.ok(after.fruits[2].y>622);assert.ok(peak>.12);assert.equal(after.score,0);assert.equal(after.fruits.length,3);const endScreenshot=await shot(current+'-after');fs.writeFileSync(path.join(out,current+'.json'),JSON.stringify(samples,null,2));rows.push({case:current,fixture:'two braced large fruits, a smaller real physical body, 120Hz controlled clock',rendererHash:expectedHash,beforeY:before.fruits[2].y,afterY:after.fruits[2].y,peakHorizontalStrain:peak,invariantFrames:samples.length,startScreenshot,peakScreenshot,endScreenshot,frames:film?frames:null});
}
try{
 ({browserContextId:context}=await call('Target.createBrowserContext',{},null));({targetId:target}=await call('Target.createTarget',{url:'about:blank',browserContextId:context},null));({sessionId:session}=await call('Target.attachToTarget',{targetId:target,flatten:true},null));
 await call('Page.enable');await call('Runtime.enable');await call('Network.enable');await call('Network.setCacheDisabled',{cacheDisabled:true});
 await call('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{if(window.__melonSeeded)return;window.__melonSeeded=true;let n=417;Math.random=()=>((n=Math.imul(n,1664525)+1013904223>>>0)/4294967296)})();`});
 for(const [w,h,t]of [[1440,900,'light'],[390,844,'light'],[390,844,'dark']])await native(w,h,t);
 fixture=true;await call('Fetch.enable',{patterns:[{urlPattern:'*/melon-lab/game.js*',requestStage:'Response'}]});
 await squeeze(1440,900,'light');await squeeze(390,844,'light',true);await squeeze(390,844,'dark');await call('Fetch.disable');fixture=false;
 for(const [w,h]of [[320,568],[390,844],[568,320],[844,390],[768,1024],[1440,900]])for(const theme of ['light','dark']){current='layout-'+w+'x'+h+'-'+theme;await navigate(w,h,theme);await click('#startButton');await delay(50);rows.push({case:current,layout:await layout(w,h)})}
 assert.deepEqual(errors,[]);assert.equal(rows.length,18);assert.equal(loadedHashes.length,3);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({origin,phase,expectedHash,rows,loadedHashes,errors,completed:true},null,2));console.log(JSON.stringify({phase,cases:rows.length,native:3,squeezeFixtures:3,layouts:12,errors:0,completed:true,report:path.join(out,'report.json')}));
}catch(error){fs.writeFileSync(path.join(out,'failed.json'),JSON.stringify({case:current,rows,loadedHashes,errors,error:String(error)},null,2));throw error}
finally{if(context)await call('Target.disposeBrowserContext',{browserContextId:context},null).catch(()=>{});ws.close()}
