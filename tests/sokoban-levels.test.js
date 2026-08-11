const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function load(path){const box={module:{exports:{}},exports:{}};vm.runInNewContext(fs.readFileSync(path,'utf8'),box);return box.module.exports;}
function key(x,y){return `${x},${y}`}
function solvable(rows,R){
  const start=R.parseLevel(rows),goals=new Set(Object.keys(start.goals)),walls=new Set(Object.keys(start.walls));
  const encode=(player,boxes)=>`${player.x},${player.y}|${[...boxes].sort().join(';')}`;
  const queue=[{player:start.player,boxes:new Set(Object.keys(start.boxes))}],seen=new Set([encode(start.player,new Set(Object.keys(start.boxes)))]),dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  for(let head=0;head<queue.length&&head<250000;head++){
    const cur=queue[head];if([...cur.boxes].every(box=>goals.has(box)))return true;
    for(const [dx,dy] of dirs){const nx=cur.player.x+dx,ny=cur.player.y+dy,nk=key(nx,ny);if(nx<0||ny<0||nx>=start.width||ny>=start.height||walls.has(nk))continue;const boxes=new Set(cur.boxes);if(boxes.has(nk)){const bx=nx+dx,by=ny+dy,bk=key(bx,by);if(bx<0||by<0||bx>=start.width||by>=start.height||walls.has(bk)||boxes.has(bk))continue;boxes.delete(nk);boxes.add(bk)}const player={x:nx,y:ny},id=encode(player,boxes);if(!seen.has(id)){seen.add(id);queue.push({player,boxes})}}
  }
  return false;
}

test('Sokoban ships exactly twenty fixed levels',()=>{
  const levels=load('sokoban/levels.js');
  assert.equal(levels.length,20);
  assert.equal(new Set(levels.map(level=>JSON.stringify(level))).size,20);
});

test('every Sokoban level is structurally valid and all twelve additions are solver-verified',()=>{
  const levels=load('sokoban/levels.js'),R=load('sokoban/rules.js');
  levels.forEach((rows,index)=>{
    const state=R.parseLevel(rows),boxes=Object.keys(state.boxes).length,goals=Object.keys(state.goals).length;
    assert.equal(boxes,goals,`level ${index+1} box/goal mismatch`);
    assert.ok(boxes>0,`level ${index+1} has no boxes`);
    if(index>=8)assert.equal(solvable(rows,R),true,`new level ${index+1} is not solvable`);
  });
});

test('Sokoban page and runtime use the twenty-level pack',()=>{
  const html=fs.readFileSync('sokoban/index.html','utf8'),game=fs.readFileSync('sokoban/game.js','utf8');
  assert.match(html,/id="level">01 \/ 20/);
  assert.match(html,/src="levels\.js\?v=levels-20"/);
  assert.match(game,/window\.SokobanLevels/);
  assert.doesNotMatch(game,/const levels = \[/);
});
