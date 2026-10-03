const test=require('node:test');const assert=require('node:assert/strict');const rules=require('../gomoku/rules');
test('empty or invalid stone ids cannot be played or win',()=>{for(const stone of [0,3,-1,undefined,'1']){const b=rules.newBoard();assert.equal(rules.play(b,7,7,stone),false);assert.equal(rules.hasFive(b,7,7,stone),false);assert.equal(b[7][7],0);}});

test('hard does not choose a dead four instead of defending a double-three fork',()=>{
 const b=rules.newBoard();for(let c=1;c<=3;c++)b[3][c]=2;b[3][0]=b[3][5]=1;for(const [y,x]of[[6,7],[8,7],[7,6],[7,8]])b[y][x]=1;assert.deepEqual(rules.pickMove(b,'hard',()=>0),{row:7,col:7});
});

test('winningLine returns only contiguous winning stones in all four directions',()=>{
 assert.equal(typeof rules.winningLine,'function');for(const [dy,dx]of [[1,0],[0,1],[1,1],[1,-1]]){const b=rules.newBoard();const cells=Array.from({length:5},(_,i)=>({row:5+dy*i,col:7+dx*i}));for(const p of cells)b[p.row][p.col]=2;assert.equal(rules.winningLine(b,cells[2].row,cells[2].col,2).length,5);assert.deepEqual(new Set(rules.winningLine(b,cells[2].row,cells[2].col,2).map(p=>`${p.row},${p.col}`)),new Set(cells.map(p=>`${p.row},${p.col}`)));}assert.deepEqual(rules.winningLine(rules.newBoard(),7,7,1),[]);
});

test('AI returns legal positions without mutating the board for every difficulty',()=>{for(const level of ['easy','normal','hard']){const b=rules.newBoard();for(let turn=0;turn<70;turn++){const before=JSON.stringify(b),m=rules.pickMove(b,level,()=>.6);assert.equal(JSON.stringify(b),before);if(!m)break;assert.equal(rules.play(b,m.row,m.col,turn%2+1),true);if(rules.outcome(b,m.row,m.col,turn%2+1))break;}}});
test('edge overlines win while gaps and four stones do not',()=>{for(const stone of [1,2]){const b=rules.newBoard();for(let c=0;c<6;c++)b[0][c]=stone;assert.equal(rules.hasFive(b,0,0,stone),true);b[0][2]=0;assert.equal(rules.hasFive(b,0,0,stone),false);}});
