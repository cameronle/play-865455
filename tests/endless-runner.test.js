const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

test('Endless Runner has a complete mobile entrypoint',()=>{const html=read('endless-runner/index.html'),css=read('endless-runner/style.css');assert.match(html,/viewport-fit=cover/);assert.match(html,/user-scalable=no/);for(const id of ['game','startButton','pauseButton','jumpButton','dropButton','distance','best','speed'])assert.match(html,new RegExp(`id="${id}"`));assert.match(css,/touch-action:none/);assert.match(css,/-webkit-touch-callout:none/);});
test('runner supports variable-height jump and fast fall',()=>{const js=read('endless-runner/game.js');assert.match(js,/JUMP_SPEED/);assert.match(js,/GRAVITY/);assert.match(js,/jumpHeld/);assert.match(js,/fastFall/);assert.match(js,/function jump/);});
test('obstacle generator uses speed-aware reaction distance and avoids impossible patterns',()=>{const js=read('endless-runner/game.js');assert.match(js,/function spawnPattern/);assert.match(js,/reactionDistance/);assert.match(js,/MIN_REACTION_TIME/);assert.match(js,/lastPattern/);assert.match(js,/safe|fair/i);});
test('game includes spikes crates gaps coins and progressive speed',()=>{const js=read('endless-runner/game.js');for(const marker of ['spike','crate','gap','coin','scrollSpeed'])assert.match(js,new RegExp(marker));});
test('collision handles ground obstacles gaps and game over once',()=>{const js=read('endless-runner/game.js');assert.match(js,/function checkCollision/);assert.match(js,/function gameOver/);assert.match(js,/state=['"]over['"]/);assert.match(js,/onGround/);});
test('touch and keyboard input are state aware and long press safe',()=>{const js=read('endless-runner/game.js'),css=read('endless-runner/style.css');assert.match(js,/pointerdown/);assert.match(js,/pointerup/);assert.match(js,/selectstart/);assert.match(js,/contextmenu/);assert.match(js,/event\.code===['"]Space/);assert.match(js,/state!==['"]playing['"]/);assert.match(css,/user-select:none/);});
test('launcher and README include Endless Runner',()=>{assert.match(read('index.html'),/\/endless-runner\//);assert.match(read('README.md'),/\.\/endless-runner\//);});
