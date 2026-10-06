import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import controller from './fish-pilot.js';
import content from '../fish-feast/content.js';
const origin=process.argv[2]||'http://127.0.0.1:8176',phase=process.argv[3]||'slice',mode=process.argv[4]||'smoke';
const dragPilot=process.env.FISH_QA_INPUT==='drag'||mode==='drag-pilot'||mode==='drag-campaign';
const seedFixture=process.env.FISH_QA_SEED?Number(process.env.FISH_QA_SEED):null;
if(seedFixture!==null&&(!Number.isInteger(seedFixture)||seedFixture<1||seedFixture>4294967295))throw Error('Invalid native QA seed');
if(mode==='endgame'&&!process.env.FISH_QA_PROGRESS)throw Error('Endgame QA requires an earned progress file');
const earnedSave=mode==='endgame'?JSON.parse(fs.readFileSync(process.env.FISH_QA_PROGRESS,'utf8')):null;
const OUT=path.resolve(process.env.FISH_QA_OUT||'/home/hermes/workspace/artifacts/game-qa/fish-feast',phase);fs.mkdirSync(OUT,{recursive:true});
const endpoint=process.env.FISH_CDP_URL||'http://127.0.0.1:9222',version=await(await fetch(endpoint+'/json/version')).json(),ws=new WebSocket(version.webSocketDebuggerUrl);
await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
let id=0,session,context,target,current='',acceptDialogs=false;const pending=new Map(),errors=[],rows=[];
ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}if(m.sessionId===session&&m.method==='Runtime.exceptionThrown')errors.push({case:current,exception:m.params.exceptionDetails});if(m.sessionId===session&&m.method==='Network.responseReceived'&&m.params.response.status>=400)errors.push({case:current,url:m.params.response.url,status:m.params.response.status});if(m.sessionId===session&&m.method==='Page.javascriptDialogOpening'&&acceptDialogs)call('Page.handleJavaScriptDialog',{accept:true}).catch(error=>errors.push({case:current,dialog:String(error)}));});
function call(method,params={},sid=session){return new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>{pending.delete(n);reject(Error('timeout '+method));},15000);pending.set(n,{resolve,reject,timer});ws.send(JSON.stringify({id:n,method,params,...(sid?{sessionId:sid}:{})}));});}
async function evaluate(expression,sid=session){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sid);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(expression,seconds=8){for(let i=0;i<seconds*20;i++){if(await evaluate(expression))return;await delay(50);}throw Error('Condition did not become true: '+expression);}
let lastObserved=null,lastTrace=-Infinity;
const snap=async()=>{const value=await evaluate('window.FishFeastGame.snapshot()');lastObserved=value;return value;};
function trace(s,command){if(s.time<lastTrace)lastTrace=-Infinity;if(s.time-lastTrace<1)return;lastTrace=s.time;fs.appendFileSync(path.join(OUT,mode+'-trace.jsonl'),JSON.stringify({case:current,command,snapshot:s})+'\n');}
async function rect(selector){return evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return {...r.toJSON(),xCenter:x,yCenter:y,hit:e.contains(document.elementFromPoint(x,y))};})()`);}
async function click(selector){const r=await rect(selector);assert.ok(r.hit,'blocked '+selector);for(const type of ['mousePressed','mouseReleased'])await call('Input.dispatchMouseEvent',{type,x:r.xCenter,y:r.yCenter,button:'left',clickCount:1});}
async function key(code,type='keyDown'){await call('Input.dispatchKeyEvent',{type,code,key:code==='Space'?' ':code.startsWith('Key')?code.slice(3).toLowerCase():code,windowsVirtualKeyCode:code==='Space'?32:code.startsWith('Key')?code.charCodeAt(3):0});}
async function shot(name){const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});const file=path.join(OUT,name+'.png');fs.writeFileSync(file,Buffer.from(r.data,'base64'));return file;}
async function navigate(width,height,theme,lang){await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<900});await call('Emulation.setTouchEmulationEnabled',{enabled:width<900,maxTouchPoints:5});await call('Page.navigate',{url:process.env.FISH_PAGE_URL||origin+'/fish-feast/?qa='+phase});await waitFor('document.readyState==="complete"&&!!window.FishFeastGame');await call('Page.bringToFront');await evaluate('document.fonts.ready.then(()=>true)');await evaluate(`(()=>{for(let i=0;i<4&&document.documentElement.dataset.themeMode!==${JSON.stringify(theme)};i++)document.querySelector('.theme-toggle').click();if(window.FishFeastGame.snapshot().language!==${JSON.stringify(lang)})document.getElementById('languageButton').click();window.scrollTo(0,0);return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));})()`);assert.equal((await snap()).mode,'title');}
const layoutExpression=`(()=>{const canvas=document.querySelector('canvas'),arena=document.getElementById('arena'),goal=document.getElementById('objectiveValue'),names=['.back','#game','#pauseButton','#dashButton','.theme-toggle','#languageButton','.clear-data-toggle'],boxes=Object.fromEntries(names.map(k=>{const e=document.querySelector(k);return[k,{...e.getBoundingClientRect().toJSON(),visible:getComputedStyle(e).display!=='none'}]}));const borders=[...document.querySelectorAll('.stat,.arena,button,.panel,select')].filter(e=>e.getBoundingClientRect().height).map(e=>({id:e.id,tag:e.tagName,width:parseFloat(getComputedStyle(e).borderTopWidth),shadow:getComputedStyle(e).boxShadow}));return{viewportWidth:innerWidth,width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,height:innerHeight,boxes,borders,objective:{font:parseFloat(getComputedStyle(goal).fontSize),width:goal.clientWidth,scroll:goal.scrollWidth,text:goal.textContent},theme:document.documentElement.dataset.theme,lang:document.documentElement.lang,touch:getComputedStyle(canvas).touchAction,arena:arena.getBoundingClientRect().toJSON()};})()`;
function checkLayout(m,width,height){assert.equal(m.viewportWidth,width);assert.ok(m.width<=width&&m.width>=width-20);assert.ok(m.scroll<=m.width);assert.ok(m.objective.font>=(height<480&&width>=600?10:11),'objective text too small');assert.ok(m.objective.scroll<=m.objective.width+1,'objective clipped');assert.equal(m.touch,'none');for(const b of m.borders){assert.ok(b.width<=1,b.id+' thick border');assert.equal(b.shadow,'none');}for(const[k,r]of Object.entries(m.boxes)){assert.ok(r.width>0&&r.height>0,k+' hidden');assert.ok(r.left>=-1&&r.right<=width+1,k+' outside width');assert.ok(r.top>=-1&&r.bottom<=height+1,k+' outside height');}for(const k of ['.back','#pauseButton','#dashButton','.theme-toggle','#languageButton','.clear-data-toggle'])assert.ok(m.boxes[k].height>=44&&m.boxes[k].width>=44,k+' small touch target');}
async function smoke(){
 current='native-desktop';await navigate(1440,900,'light','en');await click('#startButton');await waitFor('window.FishFeastGame.snapshot().time>.1');const first=await snap();await key('KeyD');await delay(180);await key('KeyD','keyUp');const moved=await snap();assert.ok(moved.player.x>first.player.x+12);
 await key('Space');await key('Space','keyUp');assert.ok((await snap()).player.cooldown>0);await click('#pauseButton');const frozen=await snap();assert.equal(frozen.mode,'paused');await delay(220);assert.equal((await snap()).time,frozen.time);assert.equal((await snap()).frames,frozen.frames);assert.deepEqual((await snap()).input.keys,[]);await click('#startButton');const restart=await snap();await delay(160);const after=await snap();assert.equal(after.mode,'playing');assert.equal(after.player.x,restart.player.x);checkLayout(await evaluate(layoutExpression),1440,900);rows.push({case:current,movement:moved.player.x-first.player.x,pauseFrozen:true,screenshot:await shot('desktop-light')});
 current='native-mobile';await navigate(390,844,'dark','zh');await click('#startButton');await waitFor('window.FishFeastGame.snapshot().time>.1');const c=await rect('#game'),startX=c.x+c.width*.32,startY=c.y+c.height*.50,p0=await snap();const t1={id:1,x:startX,y:startY,radiusX:2,radiusY:2};await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[t1]});const moveOwner=(await snap()).input.moveOwner;assert.ok(Number.isInteger(moveOwner)&&moveOwner>0);assert.ok(Math.abs((await snap()).player.x-p0.player.x)<5,'touch teleported fish');await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...t1,x:startX+70}]});await delay(180);const p1=await snap();assert.ok(p1.player.x>p0.player.x+12);
 const d=await rect('#dashButton'),t2={id:2,x:d.xCenter,y:d.yCenter,radiusX:2,radiusY:2};await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...t1,x:startX+70},t2]});assert.ok((await snap()).player.cooldown>0);await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[t2]});assert.equal((await snap()).input.moveOwner,moveOwner);await call('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});assert.equal((await snap()).input.moveOwner,null);assert.equal((await snap()).input.target,null);await delay(260);checkLayout(await evaluate(layoutExpression),390,844);rows.push({case:current,movement:p1.player.x-p0.player.x,multiTouchDash:true,cancelClears:true,screenshot:await shot('mobile-dark')});
 current='native-background';await navigate(390,844,'light','zh');await click('#startButton');await waitFor('window.FishFeastGame.snapshot().time>.1');const {targetId:other}=await call('Target.createTarget',{url:'about:blank',browserContextId:context},null);const {sessionId:otherSession}=await call('Target.attachToTarget',{targetId:other,flatten:true},null);await call('Page.bringToFront',{},otherSession);await waitFor('document.visibilityState==="hidden"&&window.FishFeastGame.snapshot().mode==="paused"');const hidden=await snap();await delay(220);assert.equal((await snap()).time,hidden.time);await call('Page.bringToFront');await waitFor('document.visibilityState==="visible"');assert.equal((await snap()).mode,'paused');await call('Target.closeTarget',{targetId:other},null);await click('#startButton');await waitFor('window.FishFeastGame.snapshot().mode==="playing"');rows.push({case:current,actualHiddenTransition:true,explicitResume:true,screenshot:await shot('mobile-light')});
}
async function drag(){
 const views=[[390,844,'dark','zh'],[844,390,'light','en'],[1440,900,'light','en']];
 for(const [width,height,theme,language]of views)for(const kind of ['slow','reverse','fast']){
  current='native-drag-'+kind+'-'+width+'x'+height;
  await navigate(width,height,theme,language);await click('#startButton');await waitFor('FishFeastGame.snapshot().time>.1');
  // Observational recorder installed after the game loop so samples follow physics.
  await evaluate(`(()=>{const c=document.querySelector('#game');window.__dragReceipt={running:true,frames:[],events:[]};for(const type of ['pointerdown','pointermove','pointerup','pointercancel'])c.addEventListener(type,e=>__dragReceipt.events.push({type,x:e.clientX,y:e.clientY,now:performance.now(),trusted:e.isTrusted}));function record(now){if(!__dragReceipt.running)return;const s=FishFeastGame.snapshot();__dragReceipt.frames.push({now:performance.now(),rafNow:now,x:s.player.x,y:s.player.y,vx:s.player.vx,vy:s.player.vy,time:s.time,hits:s.hits,growth:s.player.growth,tier:s.player.tier,owner:s.input.moveOwner,target:s.input.target});requestAnimationFrame(record)}requestAnimationFrame(record);return true})()`);
  const box=await rect('#game'),p={id:1,x:box.x+box.width*.30,y:box.y+box.height*.5,radiusX:2,radiusY:2},mobile=width<900;
  const move=async x=>{if(mobile)await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...p,x}]});else await call('Input.dispatchMouseEvent',{type:'mouseMoved',x,y:p.y,button:'none',buttons:1});};
  if(mobile)await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});else await call('Input.dispatchMouseEvent',{type:'mousePressed',x:p.x,y:p.y,button:'left',buttons:1,clickCount:1});
  await delay(30);
  if(kind==='slow'){for(let i=1;i<=24;i++){await move(p.x+i*.25);await delay(20);}}
  else if(kind==='fast'){for(let i=1;i<=6;i++){await move(p.x+20*i);await delay(8);}}
  else{for(let i=1;i<=5;i++){await move(p.x+20*i);await delay(20);}await delay(40);for(let i=1;i<=4;i++){await move(p.x+100-5*i);await delay(20);}}
  await delay(60);const screenshot=await shot(current);if(mobile)await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:p.x+(kind==='slow'?6:kind==='fast'?120:80),y:p.y,button:'left',buttons:0,clickCount:1});
  await waitFor('FishFeastGame.snapshot().input.moveOwner===null&&FishFeastGame.snapshot().player.vx===0');await delay(60);
  const receipt=await evaluate('(()=>{__dragReceipt.running=false;return __dragReceipt})()'),state=await snap();
  fs.writeFileSync(path.join(OUT,current+'-trace.json'),JSON.stringify(receipt,null,2));
  assert.ok(receipt.events.every(e=>e.trusted),'drag must use trusted native pointers');assert.equal(receipt.events.filter(e=>e.type==='pointercancel').length,0);assert.equal(state.hits,0,'damage invalidates a motion measurement');
  const down=receipt.events.find(e=>e.type==='pointerdown'),up=receipt.events.find(e=>e.type==='pointerup'),moves=receipt.events.filter(e=>e.type==='pointermove');assert.ok(down&&up&&moves.length);
  const first=receipt.frames.find(f=>f.now>=down.now),held=receipt.frames.filter(f=>f.now>=down.now&&f.now<up.now),scale=box.width/state.width;
  let motion;
  if(kind==='slow'){
   const delivered=moves.filter((e,i)=>e.x>(i?moves[i-1].x:down.x));let responsive=0;
   for(const e of delivered){const before=receipt.frames.filter(f=>f.now<e.now).at(-1),next=moves.find(m=>m.now>e.now),after=receipt.frames.find(f=>f.now>=e.now&&(!next||f.now<next.now));if(before&&after&&after.x>before.x+1e-8)responsive++;}
   const actualFinger=moves.at(-1).x-down.x,actualFish=(held.at(-1).x-first.x)*scale;
   assert.ok(delivered.length>0);assert.equal(responsive,delivered.length,'each delivered small movement must respond in the next frame');assert.ok(Math.abs(actualFish-actualFinger)<.05,'slow drag must preserve fractional distance');
   motion={deliveredMoves:delivered.length,responsiveMoves:responsive,fingerCss:actualFinger,fishCss:actualFish};
  }else if(kind==='reverse'){
   const peak=Math.max(...moves.map(e=>e.x)),turn=moves.find((e,i)=>i>0&&moves[i-1].x===peak&&e.x<peak),before=receipt.frames.filter(f=>f.now<turn.now).at(-1),after=receipt.frames.find(f=>f.now>=turn.now&&f.x<before.x);
   assert.ok(before&&after,'reverse must move toward the new direction');assert.ok(after.now-turn.now<50,'reverse must respond without old target debt');assert.ok(held.at(-1).x<before.x,'fish must travel backward during the reversal');
   motion={fingerReversalCss:peak-moves.at(-1).x,reverseResponseMs:after.now-turn.now,fishReversalCss:(before.x-held.at(-1).x)*scale};
  }else{
   const actualFinger=moves.at(-1).x-down.x,after=receipt.frames.find(f=>f.now>=moves.at(-1).now),actualFish=(after.x-first.x)*scale;
   const cap=content.dragSpeed;let checked=0,maxSpeed=0;
   for(let i=1;i<held.length;i++){const a=held[i-1],b=held[i],dt=b.time-a.time;if(dt>0&&a.growth===b.growth){const speed=Math.hypot(b.x-a.x,b.y-a.y)/dt;assert.ok(speed<=cap+1e-6,'fast motion must remain within its physical swimming tier');maxSpeed=Math.max(maxSpeed,speed);checked++;}}
   assert.ok(checked>=5);assert.ok(actualFish>0&&actualFish<actualFinger*.85,'fast strokes must visibly swim instead of instantly following the whole finger distance');
   motion={deliveredMoves:moves.length,fingerCss:actualFinger,fishCss:actualFish,checkedPhysicalFrames:checked,maxLogicalSpeed:maxSpeed,swimSpeedCap:cap};
  }
  assert.equal(state.input.target,null);const stoppedX=state.player.x;await delay(100);assert.equal((await snap()).player.x,stoppedX,'release must stop ordinary swimming');
  checkLayout(await evaluate(layoutExpression),width,height);await click('#pauseButton');const paused=await snap();await delay(100);assert.equal((await snap()).frames,paused.frames);assert.equal((await snap()).time,paused.time);await click('#startButton');await delay(80);assert.equal((await snap()).player.x,stoppedX,'resume must not replay queued drag');
  const gaps=receipt.frames.slice(1).map((f,i)=>f.now-receipt.frames[i].now).sort((a,b)=>a-b),row={case:current,width,height,kind,input:mobile?'native CDP touch drag':'native CDP mouse drag',seed:state.seed,...motion,medianFrameMs:gaps[Math.floor(gaps.length/2)],maxFrameMs:Math.max(...gaps),releaseStops:true,pauseFrozen:true,resumeClears:true,stateInjection:false,clockAcceleration:false,physicalPhone:false,screenshot};
  rows.push(row);fs.appendFileSync(path.join(OUT,'drag.jsonl'),JSON.stringify(row)+'\n');
 }
 assert.equal(rows.length,views.length*3);
}
// Each guided stroke uses real pointer ownership and holds its intent between
// observations; re-anchoring is a legitimate release/press, never game-state injection.
let pilotPointer=null;
async function steer(s,box,aim,dash){
 if(!aim)return;const x=box.x+Math.max(2,Math.min(box.width-2,aim.x/s.width*box.width)),y=box.y+Math.max(2,Math.min(box.height-2,aim.y/s.height*box.height));
 if(dragPilot){if(pilotPointer)await call('Input.dispatchMouseEvent',{type:'mouseReleased',...pilotPointer,button:'left',buttons:0,clickCount:1});const start={x:box.x+s.player.x/s.width*box.width,y:box.y+s.player.y/s.height*box.height};await call('Input.dispatchMouseEvent',{type:'mousePressed',...start,button:'left',buttons:1,clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseMoved',x,y,button:'none',buttons:1});pilotPointer={x,y};}
 else await call('Input.dispatchMouseEvent',{type:'mouseMoved',x,y,button:'none'});
 if(dash){await key('Space');await key('Space','keyUp');}
}
async function pilot(){
 const late=mode==='endgame',level=late?12:1,views=late?[[844,390,'light','late-landscape'],[390,844,'dark','late-portrait']]:[[1440,900,'light','desktop-grown'],[390,844,'dark','mobile-grown']];
 for(const [width,height,theme,name]of views){
  current='native-mouse-pursuit-'+width;await navigate(width,height,theme,'zh');if(late){await evaluate(`(()=>{const P=window.FishFeast.Progress,data=${JSON.stringify(earnedSave)},validated=P.read(JSON.stringify(data));if(validated.unlocked!==12||validated.completed.length!==12)throw Error('Invalid earned endgame progress');localStorage.setItem(P.keys.progress,JSON.stringify(validated));localStorage.setItem(P.keys.settings,JSON.stringify({version:1,lastLevel:12}));})()`);await call('Page.reload');await waitFor('document.readyState==="complete"&&!!window.FishFeastGame&&window.FishFeastGame.snapshot().level.id===12');await evaluate('document.fonts.ready.then(()=>true)');}
  await click('#startButton');await waitFor('window.FishFeastGame.snapshot().time>.1');
  const box=await rect('#game'),startingBest=(await snap()).progress.best[level]||0,started=Date.now();let grownShot=null,peak=0,steps=0;
  while(Date.now()-started<(late?160000:105000)){
   const s=await snap(),p=s.player;peak=Math.max(peak,s.fish.length);if(s.mode!=='playing')break;
   const aim=controller.aim(s,dragPilot);trace(s,{target:aim,dash:controller.shouldDash(s,aim,dragPilot),input:dragPilot?'held drag':'hover'});
   await steer(s,box,aim,controller.shouldDash(s,aim,dragPilot));
   if(p.tier>=(late?5:2)&&!grownShot){await delay(180);grownShot=await shot(name);}
   await delay(late?55:90);steps++;
  }
  const end=await snap();assert.equal(end.mode,'won','ordinary mouse pursuit did not clear level');assert.ok(end.player.lives>0);assert.ok(end.eaten>0);assert.ok(grownShot);checkLayout(await evaluate(layoutExpression),width,height);
  const stored=await evaluate('JSON.parse(localStorage.getItem("fish-feast-progress-v1"))');assert.equal(stored.best[level],Math.max(startingBest,end.player.score));const resultShot=await shot(name+'-complete');
  await click('#startButton');const retry=await snap();assert.equal(retry.mode,'playing');assert.equal(retry.player.growth,0);assert.equal(retry.player.lives,3);assert.equal(retry.progress.best[level],Math.max(startingBest,end.player.score));
  const row={case:current,level,seed:end.seed,saveFixture:late?'Restored earned campaign progress through the real validator':null,input:dragPilot?'native CDP held relative drag strokes guided by detached snapshots':'native CDP mouse movement guided by detached snapshots',stateInjection:false,clockAcceleration:false,width,height,growth:end.player.growth,eaten:end.eaten,lives:end.player.lives,score:end.player.score,simulationSeconds:end.time,peakEntities:peak,mouseUpdates:steps,screenshot:grownShot,resultScreenshot:resultShot,retryResets:true,recordReadBack:true};rows.push(row);fs.appendFileSync(path.join(OUT,'pilot.jsonl'),JSON.stringify(row)+'\n');
 }
}
async function campaign(){
 const [width,height]=(process.env.FISH_CAMPAIGN_VIEW||'1440x900').split('x').map(Number),language=width<900?'zh':'en';
 current='campaign-start';await navigate(width,height,width<900?'dark':'light',language);assert.equal((await snap()).progress.unlocked,1,'campaign must start with a clean save');
 const levels=await evaluate('window.FishFeast.Content.levels.map(l=>l.id)');await click('#startButton');
 for(const level of levels){
  current='native-campaign-level-'+level;const started=Date.now();let retries=0,steps=0,peak=0,activeShot=null;const species=new Set(),motions=new Set(),phases=new Set();
  while(Date.now()-started<160000){
   const s=await snap();assert.equal(s.level.id,level);peak=Math.max(peak,s.fish.length);for(const f of s.fish){species.add(f.type);motions.add(f.motion);if(f.intent)phases.add(f.motion+':'+f.intent);}
   if(s.mode==='won')break;if(s.mode==='lost'){assert.ok(retries<2,'campaign retries exhausted on level '+level);retries++;await click('#startButton');continue;}assert.equal(s.mode,'playing');
   const aim=controller.aim(s,dragPilot);trace(s,{target:aim,dash:controller.shouldDash(s,aim,dragPilot),input:dragPilot?'held drag':'hover'});const box=await rect('#game');await steer(s,box,aim,controller.shouldDash(s,aim,dragPilot));
   if([4,8,12].includes(level)&&s.player.tier>=3&&!activeShot)activeShot=await shot('campaign-'+level+'-active');await delay(55);steps++;
  }
  const end=await snap();assert.equal(end.mode,'won','native campaign did not complete level '+level);assert.ok(end.player.lives>0&&end.eaten>0);checkLayout(await evaluate(layoutExpression),width,height);
  const stored=await evaluate('JSON.parse(localStorage.getItem("fish-feast-progress-v1"))');assert.ok(stored.completed.includes(level));assert.equal(stored.best[level],end.player.score);assert.equal(stored.unlocked,Math.min(level+1,levels.length));
  const row={case:current,level,width,height,language,input:dragPilot?'native CDP held relative drag strokes; mobile viewport is not a physical phone':'native CDP mouse movement guided by detached snapshots; mobile viewport is not a physical phone',stateInjection:false,clockAcceleration:false,retries,mouseUpdates:steps,simulationSeconds:end.time,elapsedMilliseconds:Date.now()-started,eaten:end.eaten,growth:end.player.growth,lives:end.player.lives,score:end.player.score,peakEntities:peak,species:[...species],motions:[...motions],phases:[...phases],screenshot:activeShot,recordReadBack:true};rows.push(row);fs.appendFileSync(path.join(OUT,'campaign.jsonl'),JSON.stringify(row)+'\n');console.log(JSON.stringify({level,completed:true,retries,simulationSeconds:end.time}));
  if(level<levels.length){await click('#nextButton');await waitFor('window.FishFeastGame.snapshot().mode==="playing"');}
 }
 assert.equal(rows.length,levels.length);assert.equal(await evaluate('document.getElementById("nextButton").hidden'),true);await shot('campaign-graduate');await click('#menuButton');await call('Page.reload');await waitFor('document.readyState==="complete"&&!!window.FishFeastGame');const restored=await snap();assert.equal(restored.mode,'title');assert.equal(restored.level.id,levels.length);assert.deepEqual(restored.progress.completed,levels);assert.equal(restored.player.growth,0);
 await verifyNativeClear(language,restored.progress.completed);
}
async function verifyNativeClear(language,completed){
 current='reload-and-native-clear';const {theme,savedLanguage}=await evaluate('({theme:localStorage.getItem("play-theme"),savedLanguage:localStorage.getItem("play-lang")})');
 await evaluate(`(()=>{window.name='';localStorage.setItem('flappy-best-v1','73');const own=['fish-feast-progress-v1','fish-feast-settings-v1'],set=Storage.prototype.setItem,remove=Storage.prototype.removeItem;let clearing=false;const writes=[],removed=[];const receipt=()=>{const state=window.FishFeastGame.snapshot();window.name='FISH_CLEAR_QA:'+JSON.stringify({clearing,writes,removed,pending:state.clearPending,mode:state.mode});};window.addEventListener('game-data-clearing',()=>{clearing=true;receipt();});Storage.prototype.setItem=function(k,v){if(clearing&&own.includes(k))writes.push(k);const result=set.call(this,k,v);if(clearing)receipt();return result;};Storage.prototype.removeItem=function(k){if(own.includes(k))removed.push({key:k,clearing});const result=remove.call(this,k);if(clearing)receipt();return result;};window.addEventListener('pagehide',receipt);})()`);
 acceptDialogs=true;await click('.clear-data-toggle');await waitFor('document.readyState==="complete"&&!!window.FishFeastGame&&window.FishFeastGame.snapshot().progress.unlocked===1');acceptDialogs=false;await delay(300);
 const cleared=await snap(),persistent=await evaluate(`({progress:localStorage.getItem('fish-feast-progress-v1'),settings:localStorage.getItem('fish-feast-settings-v1'),other:localStorage.getItem('flappy-best-v1'),theme:localStorage.getItem('play-theme'),language:localStorage.getItem('play-lang')})`),marker=await evaluate('window.name');
 assert.ok(marker.startsWith('FISH_CLEAR_QA:'),'pre-reload clearing receipt missing');const report=JSON.parse(marker.slice('FISH_CLEAR_QA:'.length));assert.deepEqual(persistent,{progress:null,settings:null,other:'73',theme,language:savedLanguage});assert.equal(cleared.level.id,1);assert.equal(cleared.language,language);assert.deepEqual(cleared.progress.best,{});assert.deepEqual(cleared.progress.completed,[]);assert.equal(report.pending,true);assert.equal(report.clearing,true);assert.deepEqual(report.writes,[]);assert.equal(report.removed.length,2);assert.ok(report.removed.every(r=>r.clearing));rows.push({case:current,restoredCompleted:completed,nativeConfirmation:true,receiptTransport:'target-local window.name across same-origin reload',exactStorageReadBack:persistent,clearObserver:report,oldStateDidNotWriteBack:true});await evaluate('window.name=""');
}
async function clearFixture(){
 await navigate(390,844,'dark','zh');await evaluate(`(()=>{localStorage.setItem('fish-feast-progress-v1',JSON.stringify({version:1,unlocked:3,best:{1:123,2:156},completed:[1,2]}));localStorage.setItem('fish-feast-settings-v1',JSON.stringify({version:1,lastLevel:2}));})()`);await call('Page.reload');await waitFor('document.readyState==="complete"&&!!window.FishFeastGame&&window.FishFeastGame.snapshot().progress.unlocked===3');assert.equal((await snap()).progress.best[2],156);await click('#startButton');await waitFor('window.FishFeastGame.snapshot().time>.1');await verifyNativeClear('zh',[1,2]);assert.equal(rows.at(-1).clearObserver.mode,'paused');
}
async function forms(){
 current='fish-core-raster-coverage';await navigate(1440,900,'light','zh');
 const result=await evaluate(`(()=>{
  const D=window.FishFeast.Render,R=window.FishFeast.Rules,C=window.FishFeast.Content;
  const before=JSON.stringify(window.FishFeastGame.snapshot()),rows=[];
  for(const shape of ['player',...Object.values(C.species).map(f=>f.shape)])for(let tier=0;tier<C.sizes.length;tier++)for(const flip of [-1,1])for(const theme of ['light','dark']){
   const canvas=document.createElement('canvas');canvas.width=canvas.height=600;const ctx=canvas.getContext('2d');
   const f={shape,tier,x:300,y:300,vx:flip,headingX:flip,color:'mint'},g=R.geometry(f);
   D.drawFish(ctx,f,0,D.palettes[theme],1,shape==='player','zh');
   const pixels=ctx.getImageData(0,0,600,600).data;let checked=0,missing=0,minAlpha=255;
   for(let y=Math.floor(300-g.ry);y<=Math.ceil(300+g.ry);y++)for(let x=Math.floor(300-g.rx);x<=Math.ceil(300+g.rx);x++){
    const dx=Math.max(0,Math.abs(x+.5-300)-g.half),dy=y+.5-300;
    if(Math.hypot(dx,dy)<g.ry-1){checked++;const alpha=pixels[(y*600+x)*4+3];minAlpha=Math.min(minAlpha,alpha);if(alpha<230)missing++;}
   }
   rows.push({shape,tier,flip,theme,checked,missing,minAlpha});
  }
  return{rows,unchanged:before===JSON.stringify(window.FishFeastGame.snapshot())};
 })()`);
 assert.ok(result.unchanged,'renderer fixture altered gameplay');
 const expected=await evaluate('(1+Object.keys(window.FishFeast.Content.species).length)*window.FishFeast.Content.sizes.length*4');assert.equal(result.rows.length,expected);for(const r of result.rows){assert.ok(r.checked>0);assert.equal(r.missing,0,'invisible collision core '+JSON.stringify(r));}
 rows.push({case:current,fixture:'real Canvas pixels, decorative fins excluded from primary contacts',stateInjection:false,...result});
 // Optional old renderer lives only in a separate lexical sandbox. It cannot
 // overwrite the live game's namespace. This gallery is explicitly a fixture.
 const previous=process.env.FISH_PREVIOUS_RENDER;
 const oldExpression=previous?`(()=>{const globalThis={FishFeast:{Rules:window.FishFeast.Rules}};${fs.readFileSync(previous,'utf8')}return globalThis.FishFeast.Render;})()`:'null';
 await call('Emulation.setDeviceMetricsOverride',{width:1160,height:550,deviceScaleFactor:1,mobile:false});
 await evaluate(`(()=>{
  const D=window.FishFeast.Render,C=window.FishFeast.Content,previous=${oldExpression};
  const canvas=document.createElement('canvas');canvas.width=1160;canvas.height=550;
  document.body.replaceChildren(canvas);document.body.style.cssText='margin:0;padding:0;display:block;overflow:hidden';
  canvas.style.cssText='display:block;width:1160px;height:550px';const ctx=canvas.getContext('2d');
  ctx.fillStyle=D.palettes.light.water;ctx.fillRect(0,0,1160,550);
  ctx.fillStyle=D.palettes.light.ink;ctx.font='700 24px sans-serif';ctx.fillText('鱼形调整 · 实际绘图等宽对比',24,36);
  ctx.font='14px sans-serif';ctx.fillText('保持碰撞核心与成长数值；尾根、鱼鳍与脸部重新绘制',24,63);
  const roster=[{shape:'player',color:'player',name:'主角'},...Object.values(C.species).filter(s=>['slender','round','forked','tall','pointed'].includes(s.shape)).map(s=>({...s,name:s.name.zh}))];
  for(const [row,theme,y]of [[0,'light',162],[1,'light',306],[2,'dark',466]]){
   const p=D.palettes[theme];if(row===2){ctx.fillStyle=p.water;ctx.fillRect(0,386,1160,164);}
   for(let i=0;i<roster.length;i++){
    const f={...roster[i],tier:2,x:160+i*175,y,vx:1,headingX:1};
    if(row===0&&previous){const tile=document.createElement('canvas');tile.width=200;tile.height=240;const t=tile.getContext('2d');const fixture={...f,x:110,y:100};const player=i===0?fixture:{shape:'player',tier:5,x:-1000,y:-1000,headingX:1};previous.draw(t,{width:200,height:240,player,fish:i===0?[]:[fixture],time:0,effects:[]},{palette:p,scale:1,dpr:1,language:'zh',reduced:true});ctx.drawImage(tile,0,30,200,155,f.x-110,y-70,200,155);}
    else D.drawFish(ctx,f,0,p,1,i===0,'zh');
   }
   ctx.fillStyle=p.ink;ctx.textAlign='left';ctx.font='700 14px sans-serif';ctx.fillText(row===0&&previous?'调整前':row===2?'深色':'调整后',20,y);
  }
  ctx.fillStyle=D.palettes.light.ink;ctx.font='14px sans-serif';
  for(let i=0;i<roster.length;i++){ctx.textAlign='center';ctx.fillText(roster[i].name,160+i*175,96);}
  return{items:roster.length,previous:!!previous,evidence:'renderer fixture, not an injected gameplay scene'};
 })()`);
 rows.push({case:'fish-form-gallery',fixture:true,screenshot:await shot('fish-forms')});
}
async function matrix(){const views=[[320,568],[390,844],[412,915],[844,390],[1024,768],[1440,900]];for(const [width,height]of views)for(const theme of ['light','dark'])for(const lang of ['zh','en']){current=[width,height,theme,lang].join('-');await navigate(width,height,theme,lang);await click('#startButton');await waitFor('window.FishFeastGame.snapshot().time>.15');await evaluate('window.scrollTo(0,0)');const measure=await evaluate(layoutExpression);checkLayout(measure,width,height);assert.equal(measure.theme,theme);assert.equal((await snap()).language,lang);let screenshot=null;if(width===390||width===1440)screenshot=await shot('matrix-'+current);await click('#pauseButton');const f=await snap();await delay(100);assert.equal((await snap()).frames,f.frames);rows.push({case:current,width,height,theme,lang,layout:measure,pauseIdle:true,screenshot});fs.appendFileSync(path.join(OUT,'matrix.jsonl'),JSON.stringify(rows.at(-1))+'\n');}assert.equal(rows.length,views.length*4);}
try{
 ({browserContextId:context}=await call('Target.createBrowserContext',{},null));({targetId:target}=await call('Target.createTarget',{url:'about:blank',browserContextId:context},null));({sessionId:session}=await call('Target.attachToTarget',{targetId:target,flatten:true},null));await call('Page.enable');await call('Runtime.enable');await call('Network.enable');await call('Network.setCacheDisabled',{cacheDisabled:true});if(seedFixture!==null)await call('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{const original=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>a instanceof Uint32Array&&a.length===1?(a[0]=${seedFixture},a):original(a);})();`});if(process.env.FISH_PAGE_URL?.startsWith('file:'))await call('Network.setBlockedURLs',{urls:['http://*','https://*']});
 if(mode==='drag')await drag();else if(mode==='forms')await forms();else if(mode==='matrix')await matrix();else if(mode==='campaign'||mode==='drag-campaign')await campaign();else if(mode==='clear')await clearFixture();else if(mode==='pilot'||mode==='drag-pilot'||mode==='endgame')await pilot();else await smoke();assert.deepEqual(errors,[]);const report={phase,mode,page:await evaluate('location.href'),networkBlocked:!!process.env.FISH_PAGE_URL?.startsWith('file:'),cases:rows.length,rows,errors,focusEmulation:false,sourceInterception:false,seedFixture,physicalPhone:false,completed:true};fs.writeFileSync(path.join(OUT,mode+'.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({phase,mode,cases:rows.length,errors:errors.length,completed:true,report:path.join(OUT,mode+'.json')}));
}catch(error){const layout=await evaluate(layoutExpression).catch(()=>null),overflow=await evaluate(`(()=>{const w=document.documentElement.clientWidth;return [...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>w+1).map(e=>({tag:e.tagName,id:e.id,class:e.className,text:e.textContent.slice(0,100),box:e.getBoundingClientRect().toJSON(),min:getComputedStyle(e).minWidth,whiteSpace:getComputedStyle(e).whiteSpace}));})()`).catch(()=>null);fs.writeFileSync(path.join(OUT,mode+'-failed.json'),JSON.stringify({error:String(error.stack),case:current,seedFixture,snapshot:await snap().catch(()=>lastObserved),screenshot:await shot(mode+'-failed').catch(()=>null),rows,errors,layout,overflow},null,2));throw error;}finally{if(context)await call('Target.disposeBrowserContext',{browserContextId:context},null).catch(()=>{});ws.close();}
