const test=require('node:test');
const assert=require('node:assert/strict');
const {loadGomoku}=require('./helpers/gomoku-runtime');
const {newBoard}=require('../gomoku/rules');
const count=g=>g.snapshot().board.flat().filter(Boolean).length;
test('blocked score writes do not break initial rendering or a completed game',()=>{
  const g=loadGomoku({setThrows:true});assert.equal(g.paints,1);g.start();const b=newBoard();for(let col=3;col<7;col++)b[7][col]=1;g.install(b);g.human(7,7);assert.equal(g.snapshot().phase,'over');assert.equal(g.nodes.winCount.textContent,1);assert.equal(g.nodes.curtain.classList.contains('hidden'),false);
});
test('partially corrupted saved stats are normalized to finite nonnegative counts',()=>{
  for(const value of ['7','[]','{"win":3,"loss":-5,"draw":"8"}','{"win":null,"loss":1.5}','"bad"']){
    const g=loadGomoku({saved:{'gomoku-stats-v3':value}});const stats=g.snapshot().stats;assert.deepEqual(Object.keys(stats).sort(),['draw','loss','win']);for(const n of Object.values(stats))assert.ok(Number.isSafeInteger(n)&&n>=0);if(value.includes('3'))assert.equal(stats.win,3);
  }
});
test('board touches commit once on release and never during a cancelled or dragged gesture',()=>{
 const g=loadGomoku();g.start();const c=g.nodes.board,p={clientX:375,clientY:375,pointerId:4};c.emit('pointerdown',p);assert.equal(count(g),0);c.emit('pointercancel',p);c.emit('pointerup',p);assert.equal(count(g),0);
 c.emit('pointerdown',p);c.emit('pointermove',{...p,clientX:405});c.emit('pointerup',p);assert.equal(count(g),0);
 c.emit('pointerdown',p);c.emit('pointerup',p);assert.equal(count(g),1);g.advance();assert.equal(count(g),2);
});
test('undo during CPU thinking cancels the reply and removes the pending human stone',()=>{
 const g=loadGomoku();g.start();g.tap(7,7);assert.equal(g.snapshot().waiting,true);assert.equal(g.nodes.undo.disabled,false);g.nodes.undo.emit('click');g.advance();assert.equal(count(g),0);assert.equal(g.snapshot().waiting,false);assert.equal(g.nodes.statusText.textContent,'YOUR TURN');
});
test('undo restores the previous whole turn including its last-move marker',()=>{
 const g=loadGomoku();g.start();g.tap(7,7);g.advance();const previous=g.snapshot();const next=previous.board[8][8]?{row:8,col:7}:{row:8,col:8};g.tap(next.row,next.col);g.advance();g.nodes.undo.emit('click');assert.deepEqual(g.snapshot().board,previous.board);assert.deepEqual(g.snapshot().last,previous.last);
});
test('a late cancelled CPU task cannot reply in the next turn',()=>{
 const g=loadGomoku();g.start();g.tap(7,7);const late=[...g.timers.values()][0].fn;g.nodes.undo.emit('click');g.tap(8,8);late();assert.equal(count(g),1);g.advance();assert.equal(count(g),2);
});
test('secondary pointers and right mouse buttons cannot place stones',()=>{
 const g=loadGomoku();g.start();g.tap(7,7,{isPrimary:false,pointerId:2});assert.equal(count(g),0);g.tap(7,7,{button:2,pointerType:'mouse'});assert.equal(count(g),0);
 const p={clientX:375,clientY:375,pointerId:1};g.nodes.board.emit('pointerdown',p);g.nodes.restart.emit('click');g.nodes.board.emit('pointerup',p);assert.equal(count(g),0);
});
test('keyboard-only play selects an intersection and places exactly once',()=>{
 const g=loadGomoku();g.start();g.nodes.board.emit('keydown',{key:'ArrowRight'});const s=g.snapshot();assert.deepEqual(s.cursor,{row:7,col:8});const e=g.nodes.board.emit('keydown',{key:'Enter'});assert.equal(e.defaultPrevented,true);assert.equal(count(g),1);assert.equal(g.snapshot().board[7][8],1);g.nodes.board.emit('keydown',{key:'Enter',repeat:true});assert.equal(count(g),1);g.advance();assert.equal(count(g),2);
});
test('nearby diagonal taps snap to the closest intersection on a scaled board',()=>{
 const g=loadGomoku();g.start();g.nodes.board.getBoundingClientRect=()=>({left:30,top:50,width:300,height:300});g.tap(7.44,7.44);assert.equal(g.snapshot().board[7][7],1);assert.equal(count(g),1);
});
test('hidden pages defer CPU replies until return without cancelling the human turn',()=>{
 const g=loadGomoku();g.start();g.tap(7,7);g.document.hidden=true;g.document.emit('visibilitychange');g.advance(1000);assert.equal(count(g),1);assert.equal(g.snapshot().waiting,true);g.document.hidden=false;g.document.emit('visibilitychange');g.advance();assert.equal(count(g),2);assert.equal(g.snapshot().waiting,false);
});
test('completed games can reveal the winning board without adding stones or another record',()=>{
 const g=loadGomoku();g.start();const b=newBoard();for(let c=3;c<7;c++)b[7][c]=1;g.install(b);g.human(7,7);assert.equal(g.snapshot().phase,'over');assert.equal(g.snapshot().stats.win,1);g.nodes.review.emit('click');assert.equal(g.nodes.curtain.classList.contains('hidden'),true);g.tap(8,8);g.nodes.board.emit('keydown',{key:'Enter'});assert.equal(count(g),5);assert.equal(g.snapshot().stats.win,1);
});
test('move count follows both stones and undo and restarts to zero',()=>{
 const g=loadGomoku();g.start();g.tap(7,7);assert.equal(String(g.nodes.moveCount.textContent),'1');g.advance();assert.equal(String(g.nodes.moveCount.textContent),'2');g.nodes.undo.emit('click');assert.equal(String(g.nodes.moveCount.textContent),'0');g.nodes.restart.emit('click');assert.equal(String(g.nodes.moveCount.textContent),'0');
});

test('CPU wins once, saves its loss record, and does not schedule another reply',()=>{const g=loadGomoku();g.start();const b=newBoard();for(let c=3;c<7;c++)b[7][c]=2;g.install(b);g.human(13,13);g.advance();assert.equal(g.snapshot().phase,'over');assert.equal(g.snapshot().stats.loss,1);assert.equal(g.nodes.curtainTitle.textContent,'WHITE WINS');g.advance(2000);assert.equal(g.snapshot().stats.loss,1);assert.equal(JSON.parse(g.store.get('gomoku-stats-v3')).loss,1);});
test('a full non-winning board is recorded as one draw',()=>{const g=loadGomoku();g.start();const b=newBoard();for(let y=0;y<15;y++)for(let x=0;x<15;x++)b[y][x]=((Math.floor(y/2)+x)%2)+1;b[14][14]=0;g.install(b);g.human(14,14);assert.equal(g.snapshot().phase,'over');assert.equal(g.snapshot().stats.draw,1);assert.equal(g.nodes.curtainTitle.textContent,'DRAW');});
test('rejected occupied moves create no undo snapshot and no second reply',()=>{const g=loadGomoku();g.start();g.tap(7,7);g.advance();const prev=g.snapshot();g.tap(7,7);assert.deepEqual(g.snapshot().board,prev.board);assert.equal(g.snapshot().snapshots.length,prev.snapshots.length);assert.equal(g.timers.size,0);});
test('keyboard selection stays inside all four edges and does not hijack controls',()=>{const g=loadGomoku();g.start();for(let i=0;i<20;i++)g.nodes.board.emit('keydown',{key:'ArrowUp'});for(let i=0;i<20;i++)g.nodes.board.emit('keydown',{key:'ArrowLeft'});assert.deepEqual(g.snapshot().cursor,{row:0,col:0});for(let i=0;i<20;i++)g.nodes.board.emit('keydown',{key:'ArrowDown'});for(let i=0;i<20;i++)g.nodes.board.emit('keydown',{key:'ArrowRight'});assert.deepEqual(g.snapshot().cursor,{row:14,col:14});g.document.emit('keydown',{key:'Enter',target:g.nodes.level});assert.equal(count(g),0);});
test('blocked reads and invalid JSON fall back to zero records',()=>{for(const options of [{getThrows:true},{saved:{'gomoku-stats-v3':'not json'}}])assert.deepEqual(loadGomoku(options).snapshot().stats,{win:0,loss:0,draw:0});});
test('invalid logical move coordinates cannot throw or add undo history',()=>{const g=loadGomoku();g.start();for(const [r,c]of[[-1,0],[15,0],[0,15],[7.5,7]])g.human(r,c);assert.equal(count(g),0);assert.equal(g.snapshot().snapshots.length,0);});
test('rotating or losing focus during a touch cancels pending placement',()=>{for(const type of ['resize','blur']){const g=loadGomoku();g.start();const p={clientX:375,clientY:375};g.nodes.board.emit('pointerdown',p);g.window.emit(type);g.nodes.board.emit('pointerup',p);assert.equal(count(g),0);}});

test('Enter starts from the unfocused title without hijacking the difficulty selector',()=>{const g=loadGomoku();g.document.emit('keydown',{key:'Enter',target:g.nodes.level});assert.equal(g.snapshot().phase,'idle');const e=g.document.emit('keydown',{key:'Enter',target:{tagName:'BODY'}});assert.equal(e.defaultPrevented,true);assert.equal(g.snapshot().phase,'play');assert.equal(g.document.activeElement.id,'board');});
