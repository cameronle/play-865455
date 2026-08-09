const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

test('Sky Hopper has a complete mobile-first static entrypoint',()=>{const html=read('sky-hopper/index.html'),css=read('sky-hopper/style.css');assert.match(html,/viewport-fit=cover/);assert.match(html,/user-scalable=no/);for(const id of ['game','startButton','pauseButton','leftButton','rightButton','score','best','height'])assert.match(html,new RegExp(`id="${id}"`));assert.match(css,/touch-action:none/);});
test('player auto-bounces and only lands while falling',()=>{const js=read('sky-hopper/game.js');assert.match(js,/function landOnPlatform/);assert.match(js,/player\.vy<=0/);assert.match(js,/player\.vy=platform\.type===['"]spring['"]\?-900:-670/);assert.match(js,/GRAVITY/);});
test('camera scroll generates platforms above and cleans platforms below',()=>{const js=read('sky-hopper/game.js');assert.match(js,/cameraY/);assert.match(js,/function generatePlatforms/);assert.match(js,/platforms=platforms\.filter/);});
test('platform variety includes moving breaking spring and fading types',()=>{const js=read('sky-hopper/game.js');for(const type of ['normal','moving','breaking','spring','fading'])assert.match(js,new RegExp(`['"]${type}['"]`));});
test('falling below the screen ends the run once and stores the best score',()=>{const js=read('sky-hopper/game.js');assert.match(js,/function gameOver/);assert.match(js,/localStorage\.setItem/);assert.match(js,/state=['"]over['"]/);});
test('touch buttons and canvas halves provide state-aware movement',()=>{const js=read('sky-hopper/game.js');assert.match(js,/bindHold\(['"]leftButton/);assert.match(js,/bindHold\(['"]rightButton/);assert.match(js,/canvas\.addEventListener\(['"]pointerdown/);assert.match(js,/if\(state!==['"]playing['"]\).*start/);});
test('launcher and README include Sky Hopper',()=>{assert.match(read('index.html'),/\/sky-hopper\//);assert.match(read('README.md'),/\.\/sky-hopper\//);});
