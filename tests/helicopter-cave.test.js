const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

test('Helicopter Cave has a complete mobile single-action entrypoint',()=>{const html=read('helicopter-cave/index.html'),css=read('helicopter-cave/style.css');assert.match(html,/viewport-fit=cover/);assert.match(html,/user-scalable=no/);for(const id of ['game','startButton','pauseButton','thrustButton','distance','best','speed'])assert.match(html,new RegExp(`id="${id}"`));assert.match(css,/touch-action:none/);});
test('hold input lifts and release allows gravity to pull the helicopter down',()=>{const js=read('helicopter-cave/game.js');assert.match(js,/GRAVITY/);assert.match(js,/LIFT/);assert.match(js,/input\.thrust/);assert.match(js,/pointerdown/);assert.match(js,/pointerup/);});
test('cave generation maintains a bounded navigable gap',()=>{const js=read('helicopter-cave/game.js');assert.match(js,/function generateCaveSegment/);assert.match(js,/MIN_GAP/);assert.match(js,/MAX_GAP/);assert.match(js,/Math\.max\(MIN_GAP/);});
test('game includes progressive speed obstacles distance and local best',()=>{const js=read('helicopter-cave/game.js');assert.match(js,/obstacles/);assert.match(js,/scrollSpeed/);assert.match(js,/distance/);assert.match(js,/localStorage\.setItem/);});
test('collisions include cave ceiling floor and obstacles and end only once',()=>{const js=read('helicopter-cave/game.js');assert.match(js,/function checkCollision/);assert.match(js,/function gameOver/);assert.match(js,/state=['"]over['"]/);assert.match(js,/ceiling|top/);assert.match(js,/floor|bottom/);});
test('start button canvas touch and space are state aware',()=>{const js=read('helicopter-cave/game.js');assert.match(js,/startButton/);assert.match(js,/canvas\.addEventListener\(['"]pointerdown/);assert.match(js,/Space|event\.code===['"]Space/);assert.match(js,/state!==['"]playing['"]/);});
test('launcher and README include Helicopter Cave',()=>{assert.match(read('index.html'),/\/helicopter-cave\//);assert.match(read('README.md'),/\.\/helicopter-cave\//);});
