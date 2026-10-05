'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHopper}=require('./helpers/doodle-harness');
function land(g,{id=10000,y=450,x=218,type='normal',routeRole='main'}={}){
  return g.run(`platforms=[{id:${id},x:180,y:${y},w:120,h:12,type:'${type}',routeRole:'${routeRole}',safe:true,alpha:1,touched:false,broken:false}];stars=[];player.x=${x};player.y=${y}-46;player.vy=10;landOnPlatform(platforms[0],${y}-1)`);
}
test('fresh center landings build a capped combo and repeated or lower landings cannot farm it',()=>{
  const g=createHopper();g.run('reset()');land(g);
  assert.equal(g.run('typeof combo'), 'number','combo state missing');
  assert.equal(g.run('combo'),1);const score=g.snapshot().score;
  g.run('player.y=404;player.vy=10;landOnPlatform(platforms[0],449)');
  assert.equal(g.run('combo'),1);assert.equal(g.snapshot().score,score);
  land(g,{id:10001,y:550});assert.equal(g.snapshot().score,score,'backtracking farms rewards');
  for(let n=1;n<12;n++)land(g,{id:10001+n,y:450-n*100});
  assert.equal(g.run('Progression.multiplier(combo)'),3);
  land(g,{id:20000,y:-900,x:180});assert.equal(g.run('combo'),0,'edge landing did not break combo');
  assert.ok(g.run('maxCombo>=9'));
});
test('stars and a precise landing qualify only once per jump and pause preserves combo',()=>{
  const g=createHopper();g.run('reset();stars=[{x:240,y:400,r:9,value:50,bonus:true,collected:false}];player.x=218;player.y=380;collectStars()');
  assert.equal(g.run('combo'),1);g.run('collectStars()');assert.equal(g.run('combo'),1);
  land(g,{y:450});assert.equal(g.run('combo'),1,'star and landing doubled the same jump');
  g.run('togglePause()');const before=g.snapshot().score;g.run('update(.5)');assert.equal(g.snapshot().score,before);assert.equal(g.run('combo'),1);
  g.run('togglePause();reset()');assert.equal(g.run('combo'),0);assert.equal(g.run('maxCombo'),0);
});
test('fading warning runs down predictably and cannot be renewed by another bounce',()=>{
  const g=createHopper();g.run('reset()');land(g,{type:'fading'});
  assert.equal(g.run('platforms[0].alpha'),1,'fading immediately loses its readable silhouette');
  assert.equal(g.run('platforms[0].fadeTimer'),.85);
  g.run('platforms[0].fadeTimer=.4;platforms[0].alpha=.4/.85;player.y=404;player.vy=10;landOnPlatform(platforms[0],449)');
  assert.equal(g.run('platforms[0].fadeTimer'),.4);
});
test('one reachable run goal is created and its completion only pays once',()=>{
  const g=createHopper();g.run('reset()');assert.equal(g.run('typeof goal'),'object','run goal missing');
  g.run("goal={kind:'height',target:100,progress:0,done:false};highest=1000;bonusScore=0;checkGoal()");
  assert.equal(g.run('goal.done'),true);const paid=g.run('bonusScore');assert.ok(paid>0);
  g.run('checkGoal();highest=100;checkGoal()');assert.equal(g.run('bonusScore'),paid);
});
test('V2 records are isolated from legacy records and malformed saves recover safely',()=>{
  const g=createHopper(1,{storage:{doodleHopBest:'123',doodleHopBestStars:'4',skyHopperBest:'999'}});
  assert.equal(g.element('best').textContent,'000000','legacy score is mixed into V2');
  g.run('reset();score=500;highest=2400;maxCombo=7;gameOver()');
  const record=JSON.parse(g.store.get('skyHopperRecordsV2')||'null');
  assert.ok(record,'V2 record is missing');assert.deepEqual(record,{schemaVersion:2,bestScore:500,bestHeight:240,bestCombo:7});
  assert.equal(g.store.get('doodleHopBest'),'123');assert.equal(g.store.get('doodleHopBestStars'),'4');assert.equal(g.store.get('skyHopperBest'),'999');
  for(const value of ['broken','null','{"schemaVersion":2,"bestScore":-1}', '{"schemaVersion":1,"bestScore":100}']){
    const bad=createHopper(1,{storage:{skyHopperRecordsV2:value}});assert.equal(bad.element('best').textContent,'000000');bad.run('reset();gameOver()');
  }
  const restored=createHopper(1,{storage:{skyHopperRecordsV2:JSON.stringify(record)}});assert.equal(restored.element('best').textContent,'000500');
});
test('clear data whitelist includes the isolated V2 record',()=>{
  const source=require('node:fs').readFileSync('clear-game-data.js','utf8');
  const rules=source.match(/'sky-hopper': \[(.*?)\]/)[1];assert.ok(rules.includes("'skyHopperRecordsV2'"),'V2 record is not clearable');
});
test('clearing data freezes the run before asynchronous reload so records cannot return',()=>{
  const g=createHopper();g.run('reset();score=1234');g.event('game-data-clearing');
  g.element('leftButton').dispatch('pointerdown',{pointerId:3});g.event('keydown',{key:'d'});
  g.run('gameOver();update(.5)');assert.equal(g.store.has('skyHopperRecordsV2'),false);assert.equal(g.pending(),0);
  assert.deepEqual(g.snapshot().input,{left:false,right:false});
});
test('overlay exposes title paused and over states for compact responsive layouts',()=>{
  const g=createHopper();assert.equal(g.element('overlay').dataset.state,'title');
  g.run('reset();togglePause()');assert.equal(g.element('overlay').dataset.state,'paused');
  g.run('togglePause();gameOver()');assert.equal(g.element('overlay').dataset.state,'over');
});
test('stage combo goal and feedback labels are bilingual and do not restart the run',()=>{
  const g=createHopper();g.run("reset();highest=3100;combo=7;feedback={kind:'precise',life:.5};updateHud()");
  assert.match(g.element('stageText').textContent,/挑战/,'new stage feedback missing');
  assert.match(g.element('comboText').textContent,/7.*×2/);assert.match(g.element('goalText').textContent,/目标/);
  const before=g.snapshot();g.element('languageButton').dispatch('click');
  assert.deepEqual(g.snapshot(),before);assert.match(g.element('stageText').textContent,/FOCUS/);
  assert.match(g.element('goalText').textContent,/GOAL/);assert.equal(g.element('feedbackText').textContent,'PRECISE');
});
