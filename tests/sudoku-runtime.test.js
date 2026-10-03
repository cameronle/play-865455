const test = require('node:test');
const assert = require('node:assert/strict');
const {createRuntime} = require('./helpers/sudoku-runtime');
const empty = g => { const s=g.snapshot(); for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(!s.board[r][c])return {r,c,value:s.solution[r][c]}; };

test('Sudoku native number click and stable grid selection retain cell identity and focus', () => {
  const g=createRuntime();g.start();const e=empty(g);const cells=[...g.elements.get('board').children];
  cells[e.r*9+e.c].focus();g.select(e.r,e.c);
  assert.equal(g.elements.get('board').children[e.r*9+e.c],cells[e.r*9+e.c]);
  assert.equal(g.document.activeElement,cells[e.r*9+e.c]);
  g.numberButtons[e.value-1].click();
  assert.equal(g.snapshot().board[e.r][e.c],e.value);
  assert.equal(g.elements.get('board').children.length,81);
  assert.equal(g.elements.get('board').children.filter(c=>c.tabIndex===0).length,1);
});

test('Sudoku input does not alter title or hijack form controls and modified keys', () => {
 const g=createRuntime();const initial=g.snapshot();g.key('ArrowRight');g.key('n');
 assert.deepEqual(g.snapshot().selected,initial.selected);assert.equal(g.snapshot().notesMode,false);
 g.start();const e=empty(g);g.select(e.r,e.c);
 for(const extra of [{target:g.elements.get('difficulty')},{ctrlKey:true},{altKey:true},{repeat:true}]) {
  const event=g.key(String(e.value),extra);assert.equal(event.defaultPrevented,false);assert.equal(g.snapshot().board[e.r][e.c],0);
 }
 g.key('ArrowDown',{target:g.elements.get('difficulty')});assert.deepEqual(g.snapshot().selected,{r:e.r,c:e.c});
 g.key('n',{ctrlKey:true});assert.equal(g.snapshot().notesMode,false);
 g.key(String(e.value));assert.equal(g.snapshot().board[e.r][e.c],e.value);
});

test('Sudoku undo changes board and notes but never refunds mistakes or records no-ops', () => {
 const g=createRuntime();g.start();const e=empty(g);g.select(e.r,e.c);
 g.test.erase();assert.equal(g.snapshot().historyLength,0);
 g.test.enterNumber(e.value);g.test.enterNumber(e.value);assert.equal(g.snapshot().historyLength,1);
 const wrong=e.value===9?1:e.value+1;g.test.enterNumber(wrong);assert.equal(g.snapshot().mistakes,1);
 g.test.undo();assert.equal(g.snapshot().board[e.r][e.c],0);assert.equal(g.snapshot().mistakes,1);
 g.elements.get('notesButton').click();g.test.enterNumber(2);assert.deepEqual(g.snapshot().notes[e.r][e.c],[2]);
 g.test.undo();assert.deepEqual(g.snapshot().notes[e.r][e.c],[]);
 for(let i=0;i<120;i++)g.test.enterNumber(2);assert.equal(g.snapshot().historyLength,100);
 g.test.newGame(false);assert.equal(g.snapshot().notesMode,false);
});

test('Sudoku background pause preserves fractional time and requires explicit resume', () => {
 const g=createRuntime();g.start();g.advance(650);g.document.hidden=true;g.emit('document','visibilitychange');
 assert.equal(g.snapshot().state,'paused');assert.equal(g.intervalCount(),0);
 g.advance(9000);g.document.hidden=false;g.emit('document','visibilitychange');assert.equal(g.snapshot().state,'paused');
 g.start();g.advance(550);assert.equal(g.snapshot().elapsed,1);
 g.elements.get('pauseButton').click();g.advance(5000);assert.equal(g.snapshot().elapsed,1);
 g.start();g.advance(800);g.test.updateTimer();assert.equal(g.snapshot().elapsed,2);
 g.emit('window','blur');assert.equal(g.snapshot().state,'paused');assert.equal(g.intervalCount(),0);
});

test('Sudoku best records survive invalid storage and exact finish timing excludes hinted wins', () => {
 const R=require('../sudoku/rules.js'),solution=R.generatePuzzle('easy',()=>.3141592653).solution;
 const puzzle=R.clone(solution);puzzle[0][0]=0;const fixture={solution,puzzle,difficulty:'medium'};
 for(const corrupt of ['-2','NaN','Infinity','<img src=x>','null','1.2','999999999999']) {
  const g=createRuntime({fixture,storage:{'sudokuBest-medium':corrupt}});assert.equal(g.elements.get('best').textContent,'--:--');
  g.start();g.advance(1100,false);g.test.enterNumber(solution[0][0]);assert.equal(g.snapshot().state,'won');
  assert.equal(g.snapshot().elapsed,1);assert.equal(g.storage.get('sudokuBest-medium'),'1');
  g.test.finish();assert.equal(g.storage.get('sudokuBest-medium'),'1');
 }
 const denied=createRuntime({fixture,storageThrows:true});denied.start();denied.test.enterNumber(solution[0][0]);assert.equal(denied.snapshot().state,'won');
 const assisted=createRuntime({fixture});assisted.start();assisted.test.hint();assert.equal(assisted.snapshot().state,'won');assert.equal(assisted.storage.has('sudokuBest-medium'),false);
 const zero=createRuntime({storage:{'sudokuBest-medium':'0'}});assert.equal(zero.elements.get('best').textContent,'00:00');
});

test('Sudoku reload restores a validated in-progress grid paused with notes, undo, mistakes and fractional time', () => {
 const g=createRuntime();g.start();const e=empty(g);g.select(e.r,e.c);
 g.elements.get('notesButton').click();g.test.enterNumber(2);g.elements.get('notesButton').click();
 g.test.enterNumber(e.value===9?1:e.value+1);g.test.hint();g.test.undo();
 g.advance(1450,false);g.emit('window','pagehide');const saved=Object.fromEntries(g.storage);
 assert.equal(g.storage.has('sudoku-game-v1'),true);
 const h=createRuntime({storage:saved});assert.equal(h.snapshot().state,'paused');assert.equal(h.intervalCount(),0);
 for(const key of ['puzzle','board','notes','selected','mistakes','notesMode','historyLength'])assert.deepEqual(h.snapshot()[key],g.snapshot()[key],key);
 assert.equal(h.snapshot().elapsed,1);h.advance(5000);h.start();h.advance(650,false);h.test.updateTimer();assert.equal(h.snapshot().elapsed,2);
 h.test.undo();assert.equal(h.snapshot().mistakes,1);assert.equal(h.snapshot().historyLength,g.snapshot().historyLength-1);
 assert.equal(JSON.parse(h.storage.get('sudoku-game-v1')).hintsUsed,1);
});

test('Sudoku New and difficulty changes ask before discarding progress', () => {
 const g=createRuntime();g.start();const e=empty(g);g.select(e.r,e.c);g.test.enterNumber(e.value);const before=g.snapshot();
 g.setConfirm(false);g.elements.get('newButton').click();assert.equal(g.confirms.length,1);assert.deepEqual(g.snapshot().board,before.board);
 const select=g.elements.get('difficulty');select.value='hard';select.dispatch('change');assert.equal(select.value,'medium');assert.deepEqual(g.snapshot().puzzle,before.puzzle);
 g.setConfirm(true);g.elements.get('newButton').click();assert.equal(g.snapshot().state,'playing');assert.equal(g.snapshot().historyLength,0);assert.equal(g.snapshot().mistakes,0);
});

test('Sudoku rejects corrupt, non-unique, oversized and completed saves without losing best records',()=>{
 const g=createRuntime();g.start();const raw=g.storage.get('sudoku-game-v1'),cases=['{broken','x'.repeat(200001),'null'];
 const changed=fn=>{const s=JSON.parse(raw);fn(s);cases.push(JSON.stringify(s));};
 changed(s=>s.version=7);changed(s=>s.elapsedMs=-1);changed(s=>s.mistakes=3);changed(s=>s.hintsUsed='0');changed(s=>s.difficulty='__proto__');
 changed(s=>s.puzzle[0][1]=s.puzzle[0][0]||1);changed(s=>s.puzzle=Array.from({length:9},()=>Array(9).fill(0)));
 changed(s=>s.notes[0][0]=[true]);changed(s=>s.selected.r=9);changed(s=>s.history=Array(101).fill(s.history[0]));
 changed(s=>s.history=[{board:s.board,notes:s.notes,selected:{r:-1,c:0}}]);
 changed(s=>s.board=require('../sudoku/rules.js').solve(s.puzzle));
 for(const data of cases){const h=createRuntime({storage:{'sudoku-game-v1':data,'sudokuBest-medium':'123'}});assert.equal(h.snapshot().state,'title');assert.equal(h.elements.get('best').textContent,'02:03');assert.equal(h.storage.has('sudoku-game-v1'),false)}
});

test('Sudoku lifecycle exposes disabled tools, live fill status and a paused inert grid',()=>{
 const g=createRuntime();assert.equal(g.elements.get('notesButton').disabled,true);assert.equal(g.elements.get('pauseButton').disabled,true);
 assert.equal(g.numberButtons.every(b=>b.disabled),true);g.start();assert.equal(g.elements.get('notesButton').disabled,false);assert.equal(g.elements.get('undoButton').disabled,true);
 const e=empty(g);g.select(e.r,e.c);g.test.enterNumber(e.value);assert.equal(g.elements.get('undoButton').disabled,false);assert.match(g.elements.get('statusText').textContent,/FILLED/);
 g.elements.get('pauseButton').click();assert.equal(g.elements.get('board').inert,true);assert.equal(g.numberButtons.every(b=>b.disabled),true);
 g.start();assert.equal(g.elements.get('board').inert,false);g.test.undo();assert.equal(g.elements.get('undoButton').disabled,true);
});

test('Sudoku hint targets the selected empty cell and undo keeps the assisted flag',()=>{
 const g=createRuntime({random:()=>0});g.start();const s=g.snapshot(),empties=[];for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(!s.board[r][c])empties.push({r,c});
 const e=empties.at(-1);g.select(e.r,e.c);g.test.hint();assert.equal(g.snapshot().board[e.r][e.c],s.solution[e.r][e.c]);
 g.test.undo();assert.equal(g.snapshot().board[e.r][e.c],0);assert.equal(JSON.parse(g.storage.get('sudoku-game-v1')).hintsUsed,1);
});

test('Sudoku periodically checkpoints elapsed time without action or pagehide',()=>{
 const g=createRuntime();g.start();g.advance(10500);const saved=JSON.parse(g.storage.get('sudoku-game-v1'));assert.ok(saved.elapsedMs>=10000);
 const h=createRuntime({storage:Object.fromEntries(g.storage)});assert.equal(h.snapshot().state,'paused');assert.equal(h.snapshot().elapsed,10);
});

test('Sudoku shared Clear removes only owned saves and cannot resurrect progress during reload',async()=>{
 const g=createRuntime({storage:{'sudokuBest-medium':'123','play-theme-mode':'dark','sokoban-progress':'keep'}});g.start();
 const e=empty(g);g.select(e.r,e.c);g.test.enterNumber(e.value);g.runSharedClear().click();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(g.storage.has('sudoku-game-v1'),false);assert.equal(g.storage.has('sudokuBest-medium'),false);
 assert.equal(g.storage.get('play-theme-mode'),'dark');assert.equal(g.storage.get('sokoban-progress'),'keep');assert.equal(g.intervalCount(),0);
});

test('Sudoku new puzzle resets time immediately rather than after the next timer tick',()=>{
 const g=createRuntime();g.start();g.advance(5500);assert.ok(g.snapshot().elapsed>=5);
 g.test.newGame(false);assert.equal(g.snapshot().elapsed,0);assert.equal(g.elements.get('timer').textContent,'00:00');
});

test('Sudoku Start and Resume focus an editable selected cell for keyboard play',()=>{
 const R=require('../sudoku/rules.js'),solution=R.generatePuzzle('easy',()=>.25).solution,puzzle=R.clone(solution);puzzle[0][1]=0;
 const g=createRuntime({fixture:{solution,puzzle,difficulty:'medium'}});g.start();assert.deepEqual(g.snapshot().selected,{r:0,c:1});assert.equal(g.document.activeElement,g.elements.get('board').children[1]);
 g.elements.get('pauseButton').click();assert.equal(g.document.activeElement.id,'startButton');g.start();assert.equal(g.document.activeElement,g.elements.get('board').children[1]);
});
