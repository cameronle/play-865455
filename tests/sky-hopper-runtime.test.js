const test=require('node:test');
const assert=require('node:assert/strict');
const {createHopper}=require('./helpers/doodle-harness.js');

test('game shell prevents selection and callout defaults beyond button hit areas',()=>{
  const game=createHopper(),shell=game.element('gameShell');
  for(const type of ['selectstart','contextmenu','dragstart']){
    assert.equal(shell.dispatch(type).defaultPrevented,true,`${type} can escape the controls`);
    assert.notEqual(game.element('outsideGame').dispatch(type).defaultPrevented,true,'unrelated page content must remain unaffected');
  }
});

test('intentional direction input clears an existing text range without losing movement',()=>{
  for(const source of ['leftButton','rightButton','game','keyboard']){
    const game=createHopper();
    game.run('globalThis.selectionFixture={rangeCount:1,isCollapsed:false,clears:0,removeAllRanges(){this.rangeCount=0;this.isCollapsed=true;this.clears++}};globalThis.getSelection=()=>selectionFixture');
    if(source==='keyboard')game.event('keydown',{key:'ArrowLeft'});
    else game.element(source).dispatch('pointerdown',{pointerId:19,clientX:100});
    assert.equal(game.run('selectionFixture.rangeCount'),0,`${source} left a stale selection`);
    assert.equal(game.run('selectionFixture.clears'),1);
    assert.equal(game.snapshot().state,'playing');
    assert.equal(game.snapshot().input[source==='rightButton'?'right':'left'],true);
  }
});

test('language follows play-lang, updates active and result copy, and preserves gameplay and records',()=>{
  const game=createHopper(1,{storage:{'play-lang':'en',doodleHopBest:'123',doodleHopBestStars:'4'}});
  assert.equal(game.element('gameTitle').textContent,'SKY HOP');
  assert.equal(game.element('labelScore').textContent,'SCORE');
  game.run('reset()');const before=game.snapshot();
  game.element('languageButton').dispatch('click');
  assert.equal(game.store.get('play-lang'),'zh');
  assert.equal(game.element('gameTitle').textContent,'向上弹跳');
  assert.equal(game.element('pauseButton').textContent,'暂停');
  assert.deepEqual(game.snapshot(),before,'language is presentation, not a restart');
  game.run('togglePause()');assert.equal(game.element('message').textContent,'已暂停');
  game.element('languageButton').dispatch('click');
  assert.equal(game.element('message').textContent,'PAUSED');
  assert.equal(game.element('startButton').textContent,'RESUME');
  game.run('togglePause();highest=150;starCount=2;score=40;gameOver()');
  assert.equal(game.element('message').textContent,'GAME OVER');
  assert.match(game.element('detail').textContent,/15m · 2 STARS/);
  game.element('languageButton').dispatch('click');
  assert.equal(game.element('message').textContent,'本局结束');
  assert.match(game.element('detail').textContent,/15米 · 2颗星星/);
  assert.equal(game.store.get('doodleHopBest'),'123');
  assert.equal(game.store.get('doodleHopBestStars'),'4');
});

test('starting platforms connect to generated platforms without a double gap',()=>{
  const game=createHopper();
  for(let seed=1;seed<=256;seed++){
    game.seed(seed);game.run('reset()');
    const s=game.snapshot(),gap=s.platforms[9].y-s.platforms[10].y;
    assert.ok(gap>0 && gap<=125,`seed ${seed}: seam gap ${gap}`);
  }
});


test('rendering at 30 60 or 120 Hz produces the same physical jump',()=>{
  const runs=[30,60,120].map(fps=>{
    const game=createHopper();game.run("reset();stars=[];platforms=[];nextPlatformY=-1e6;player.y=602;player.vy=-670;player.vx=0");
    for(let n=0;n<=fps;n++)game.frame(n*1000/fps);
    return game.snapshot().player;
  });
  for(const p of runs.slice(1))assert.ok(Math.abs(p.y-runs[0].y)<.001,`inconsistent final y: ${runs.map(p=>p.y)}`);
});


test('releasing each canvas pointer only clears that pointer direction',()=>{
  for(const order of [[22,11],[11,22]]){
    const game=createHopper();game.run('reset()');const c=game.element('game');
    c.dispatch('pointerdown',{pointerId:11,clientX:100});c.dispatch('pointerdown',{pointerId:22,clientX:400});
    c.dispatch('pointerup',{pointerId:order[0]});
    assert.equal(game.snapshot().input[order[1]===11?'left':'right'],true,'remaining finger lost');
    c.dispatch('pointerup',{pointerId:order[1]});
    assert.deepEqual(game.snapshot().input,{left:false,right:false});
  }
});


test('keyboard aliases and pointer controls remain independent',()=>{
  const game=createHopper();game.run('reset()');
  game.event('keydown',{key:'ArrowLeft'});game.event('keydown',{key:'a'});game.event('keyup',{key:'ArrowLeft'});
  assert.equal(game.snapshot().input.left,true,'A is still held');
  game.element('game').dispatch('pointerdown',{pointerId:9,clientX:400});game.element('game').dispatch('pointerup',{pointerId:9});
  assert.equal(game.snapshot().input.left,true,'pointer release must preserve keyboard');
});


test('pause blur and restarting clear all held input',()=>{
  const game=createHopper();game.run('reset()');game.event('keydown',{key:'d'});game.run('togglePause()');
  assert.deepEqual(game.snapshot().input,{left:false,right:false});
  game.run('togglePause()');game.element('game').dispatch('pointerdown',{pointerId:7,clientX:100});game.event('blur');
  assert.deepEqual(game.snapshot().input,{left:false,right:false});
  game.run('reset()');game.event('keydown',{key:'a'});game.run('reset()');
  assert.deepEqual(game.snapshot().input,{left:false,right:false});
});


test('the guaranteed main route uses ordinary static platforms with conservative gaps',()=>{
  const game=createHopper();
  for(let seed=1;seed<=128;seed++){
    game.seed(seed);game.run('reset();cameraY=-20000;generatePlatforms()');
    const main=game.snapshot().platforms.filter(p=>p.safe);
    assert.ok(main.length>100,`seed ${seed}: no guaranteed main route`);
    for(let i=1;i<main.length;i++){
      assert.equal(main[i].type,'normal');
      assert.ok(main[i-1].y-main[i].y<=128,'stage-capped vertical reserve');
      assert.ok(require('../sky-hopper/rules').hasSafeApproach(main[i-1],main[i]),'nine-state horizontal reserve');
    }
  }
});


test('dangerous bonus platforms are optional beside the static main route',()=>{
  const game=createHopper(17);game.run('reset();cameraY=-12000;generatePlatforms()');
  const s=game.snapshot(),bonus=s.platforms.filter(p=>!p.safe);
  assert.ok(bonus.length>10,'bonus choices are missing');
  assert.deepEqual([...new Set(bonus.map(p=>p.type))].sort(),['breaking','fading','moving','spring']);
  assert.ok(s.stars.some(s=>s.value===50),'risk route must reward more');
});


test('releasing steering brakes within half a second instead of long drifting',()=>{
  const game=createHopper();game.run("reset();platforms=[];stars=[];nextPlatformY=-1e6;player.vx=330;player.y=600;player.vy=-670");
  for(let i=0;i<60;i++)game.run('update(1/120)');
  assert.ok(Math.abs(game.snapshot().player.vx)<35,'release keeps excessive momentum');
});


test('a platform pays its reward once even when landed on repeatedly',()=>{
  const game=createHopper();game.run("reset();stars=[];score=0;platforms=[{x:180,y:650,w:120,h:12,type:'normal',safe:true,alpha:1,touched:false,broken:false}];player.x=218;player.y=602;player.vy=10;landOnPlatform(platforms[0],649)");
  const first=game.snapshot().score;
  game.run('player.y=602;player.vy=10;landOnPlatform(platforms[0],649)');
  assert.ok(first>0);assert.equal(game.snapshot().score,first,'repeat bounce farms points');
});


test('height score and collection bonuses add rather than overwrite each other',()=>{
  const game=createHopper();game.run("reset();stars=[{x:240,y:600,r:9,value:50,collected:false}];player.x=218;player.y=580;highest=500;score=100;collectStars()");
  assert.equal(game.snapshot().score,150);
  game.run('platforms=[];stars=[];nextPlatformY=-1e6;player.y=200;player.vy=0;cameraY=-500;update(1/120)');
  assert.equal(game.snapshot().score,Math.floor(game.snapshot().highest/5)+50,'climbing swallowed the collected bonus');
});


test('landing feedback distinguishes a spring boost and settles after the bounce',()=>{
  const game=createHopper();game.run("reset();platforms=[{x:180,y:650,w:120,h:12,type:'spring',alpha:1,touched:false,broken:false}];player.x=218;player.y=602;player.vy=10;landOnPlatform(platforms[0],649)");
  assert.ok(game.run('player.bounce>0 && platforms[0].pulse>0 && player.springBounce===true'),'spring has no visual feedback');
  for(let i=0;i<60;i++)game.run('update(1/120)');
  assert.equal(game.run('player.bounce'),0);
});


test('moving and fading platform silhouettes are not color-only copies',()=>{
  const game=createHopper();game.stats.trace=true;
  const commands=type=>{game.stats.commands=[];game.run(`drawPlatform({x:180,y:450,w:120,type:'${type}',vx:60,alpha:1},palette())`);return JSON.stringify(game.stats.commands)};
  const normal=commands('normal');
  assert.notEqual(commands('moving'),normal,'moving needs a direction cue');
  assert.notEqual(commands('fading'),normal,'fading needs a non-color cue');
});


test('pause stops scheduled drawing and resume starts a single frame chain',()=>{
  const game=createHopper();game.run('reset()');game.frame(16);game.run('togglePause()');
  const draws=game.stats.draws;for(let n=1;n<=60;n++)game.frame(16+n*16);
  assert.equal(game.stats.draws,draws,'paused game still redraws');assert.equal(game.pending(),0);
  game.run('togglePause()');assert.equal(game.pending(),1);game.frame(2000);assert.equal(game.pending(),1);
});


test('unchanged HUD values do not cause repeated DOM writes',()=>{
  const game=createHopper();game.run('reset()');const writes=game.stats.textWrites;
  for(let i=0;i<20;i++)game.run('updateHud()');
  assert.equal(game.stats.textWrites,writes,'unchanged HUD is rewritten');
});


test('rendering reuses the palette until a theme change',()=>{
  const game=createHopper();const reads=game.stats.paletteReads;
  game.run('draw();draw();draw()');assert.equal(game.stats.paletteReads,reads,'computed styles read every draw');
  game.event('doc:themechange');assert.equal(game.stats.paletteReads,reads+1,'theme change must refresh the palette');
});
