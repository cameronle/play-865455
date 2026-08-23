const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function load(path){const box={module:{exports:{}},exports:{}};vm.runInNewContext(fs.readFileSync(path,'utf8'),box);return box.module.exports}
function key(x,y){return `${x},${y}`}
function solve(rows,R,maxStates=1000000){
  const start=R.parseLevel(rows),goals=new Set(Object.keys(start.goals));
  const initialBoxes=new Set(Object.keys(start.boxes));
  const reachable=(player,boxes)=>{
    const queue=[player],seen=new Set([key(player.x,player.y)]);
    for(const point of queue){
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const next={x:point.x+dx,y:point.y+dy},nextKey=key(next.x,next.y);
        if(next.x<0||next.y<0||next.x>=start.width||next.y>=start.height||start.walls[nextKey]||boxes.has(nextKey)||seen.has(nextKey))continue;
        seen.add(nextKey);queue.push(next);
      }
    }
    return seen;
  };
  const encode=(boxes,player)=>`${[...boxes].sort().join(';')}|${key(player.x,player.y)}`;
  const queue=[{boxes:initialBoxes,player:start.player,pushes:0}],seen=new Set([encode(initialBoxes,start.player)]);
  for(let head=0;head<queue.length&&seen.size<maxStates;head++){
    const current=queue[head];
    if([...current.boxes].every(box=>goals.has(box)))return {pushes:current.pushes,states:seen.size};
    const walkable=reachable(current.player,current.boxes);
    for(const box of current.boxes){
      const [bx,by]=box.split(',').map(Number);
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const behind=key(bx-dx,by-dy),destination=key(bx+dx,by+dy);
        if(!walkable.has(behind)||start.walls[destination]||current.boxes.has(destination))continue;
        const boxes=new Set(current.boxes);boxes.delete(box);boxes.add(destination);
        const player={x:bx,y:by},id=encode(boxes,player);
        if(!seen.has(id)){seen.add(id);queue.push({boxes,player,pushes:current.pushes+1});}
      }
    }
  }
  return null;
}

test('Sokoban ships exactly twenty fixed levels',()=>{
  const levels=load('sokoban/levels.js');
  assert.equal(levels.length,20);
  assert.equal(new Set(levels.map(level=>JSON.stringify(level))).size,20);
});

test('every Sokoban level is solvable and the push difficulty rises through the pack',()=>{
  const levels=load('sokoban/levels.js'),R=load('sokoban/rules.js');
  const difficulty=[];
  levels.forEach((rows,index)=>{
    const state=R.parseLevel(rows),boxes=Object.keys(state.boxes).length,goals=Object.keys(state.goals).length;
    assert.equal(boxes,goals,`level ${index+1} box/goal mismatch`);
    assert.ok(boxes>0,`level ${index+1} has no boxes`);
    const result=solve(rows,R);
    assert.ok(result,`level ${index+1} is not solvable within the solver budget`);
    difficulty.push(result.pushes);
  });
  assert.ok(difficulty[0]>=8,'the opening pack should not be a one-push tutorial');
  assert.ok(difficulty.at(-1)>=40,'the final pack should require serious planning');
  for(let i=1;i<difficulty.length;i++)assert.ok(difficulty[i]>=difficulty[i-1],`difficulty drops at level ${i+1}: ${difficulty.join(',')}`);
});

test('Sokoban page and runtime use the twenty-level pack',()=>{
  const html=fs.readFileSync('sokoban/index.html','utf8'),game=fs.readFileSync('sokoban/game.js','utf8');
  assert.match(html,/id="level">01 \/ 20/);
  assert.match(html,/src="levels\.js\?v=levels-hard-1"/);
  assert.match(game,/window\.SokobanLevels/);
  assert.doesNotMatch(game,/const levels = \[/);
});
