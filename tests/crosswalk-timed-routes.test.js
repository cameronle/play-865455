const test=require('node:test'),assert=require('node:assert/strict');
const {loadCrosswalk}=require('./helpers/crosswalk-runtime.js');
const solutions=require('./fixtures/crosswalk-timed-routes.json');
const {levels}=require('../crosswalk/levels.js');

test('all twenty timed routes clear naturally with the real fixed-step traffic and no lost lives',()=>{
 assert.equal(solutions.length,levels.length);const a=loadCrosswalk();a.start();
 for(const solution of solutions){
  assert.equal(a.snapshot().level,solution.level);
  for(const direction of solution.actions){
   if(direction!=='wait')a.move(direction);
   if(a.snapshot().state==='playing')a.advance(solution.stepMs,120);
   assert.equal(a.snapshot().lives,3,`level ${solution.level}: ${direction}`);
  }
  const s=a.snapshot();assert.equal(s.player.row,0);assert.equal(s.state,solution.level===levels.length?'won':'level-clear');
  assert.equal(s.progress.completed[solution.level-1],true);assert.equal(s.progress.levelScores[solution.level],110);assert.equal(s.progress.flawless[solution.level],true);
  if(solution.level!==levels.length)a.start();
 }
 assert.equal(a.snapshot().progress.completed.filter(Boolean).length,levels.length);
 assert.equal(a.snapshot().score,levels.length*110);
 const restored=loadCrosswalk({saved:Object.fromEntries(a.store)});assert.equal(restored.snapshot().progress.completed.filter(Boolean).length,levels.length);
 restored.nodes.levelsButton.emit('click');assert.equal(restored.nodes.levelGrid.children.filter(card=>!card.disabled).length,levels.length);
});
