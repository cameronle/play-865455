const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=()=>fs.readFileSync('sokoban/game.js','utf8');

test('Sokoban has distinct drawing primitives for goals crates and player',()=>{
  const js=source();
  for(const name of ['drawGoal','drawCrate','drawPlayer'])assert.match(js,new RegExp(`function ${name}\\(`));
  assert.match(js,/drawCrate\([^;]+onGoal/);
});

test('Sokoban crates use diagonal bracing and completed crates expose a check mark',()=>{
  const js=source();
  assert.match(js,/ctx\.moveTo\(x\+size\*\.3,y\+size\*\.3\)/);
  assert.match(js,/ctx\.lineTo\(x\+size\*\.7,y\+size\*\.7\)/);
  assert.match(js,/if\(onGoal\)[\s\S]*ctx\.lineTo/);
});

test('Sokoban goals use corner brackets and center marker at mobile-safe size',()=>{
  const js=source();
  assert.match(js,/function drawGoal\([\s\S]*Math\.max\(2,size\*\.055\)/);
  assert.match(js,/ctx\.fillRect\(x\+size\*\.47,y\+size\*\.47/);
});

test('Sokoban player has a helmet and tracks the last movement direction',()=>{
  const js=source();
  assert.match(js,/let playerDirection = 'down'/);
  assert.match(js,/playerDirection=directionName\(dx,dy\)/);
  assert.match(js,/function drawPlayer\([\s\S]*helmet/);
  assert.match(js,/playerDirection==='left'/);
  assert.match(js,/playerDirection==='right'/);
});

test('Sokoban visual refresh does not change the twenty-level pack',()=>{
  const levels=fs.readFileSync('sokoban/levels.js','utf8'),html=fs.readFileSync('sokoban/index.html','utf8');
  assert.match(html,/01 \/ 20/);
  assert.match(levels,/root\.SokobanLevels/);
});
