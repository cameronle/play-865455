const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../sudoku/rules.js');
const blank = () => Array.from({length:9}, () => Array(9).fill(0));

test('Sudoku solver and solution count reject conflicting givens without mutation', () => {
  const valid = R.generatePuzzle('easy', () => .3141592653).solution;
  const bad = R.clone(valid); bad[0][0] = bad[0][1];
  const before = JSON.stringify(bad);
  assert.equal(R.solve(bad), null);
  assert.equal(R.countSolutions(bad), 0);
  assert.equal(JSON.stringify(bad), before);
  const partial = blank(); partial[0][0] = partial[0][1] = 5;
  assert.equal(R.solve(partial), null);
  assert.equal(R.countSolutions(partial), 0);
});

test('Sudoku rules reject malformed boards, invalid values and coordinates', () => {
  for (const board of [null, [], Array(9).fill([]), Array(9).fill(Array(9).fill('1')), Array(9).fill(Array(9).fill(10))]) {
    assert.equal(R.solve(board), null);
    assert.equal(R.countSolutions(board), 0);
    assert.equal(R.isComplete(board), false);
  }
  const b = blank();
  for (const value of [-1,10,1.5,'1',null,NaN,Infinity]) assert.equal(R.canPlace(b,0,0,value),false);
  for (const [row,col] of [[-1,0],[9,0],[0,9],[.5,0]]) {
    assert.equal(R.canPlace(b,row,col,1),false);
    assert.deepEqual(R.candidates(b,row,col),[]);
  }
  assert.equal(R.countSolutions(b,0),0);
});

test('Sudoku untrusted-save solution counting has a conservative search budget',()=>{
 const {puzzle}=R.generatePuzzle('easy',()=>.12345);
 assert.equal(R.countSolutions(puzzle,2,0),2);
 assert.equal(R.countSolutions(puzzle,2,20000),1);
});

test('Sudoku clear-data route includes active saves as well as per-difficulty records',()=>{
 const source=require('node:fs').readFileSync('clear-game-data.js','utf8');
 assert.match(source,/sudoku:\s*\['sudokuBest-', 'sudoku-game-v1'\]/);
});

test('Sudoku page offers pause, unhinted record labeling, zoom and a non-floating utility dock',()=>{
 const html=require('node:fs').readFileSync('sudoku/index.html','utf8');
 for(const id of ['pauseButton','statusText','utilityDock'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/BEST[^<]*NO HINTS/);assert.equal(html.includes('user-scalable=no'),false);
 const css=require('node:fs').readFileSync('sudoku/style.css','utf8');assert.match(css,/#utilityDock/);assert.match(css,/100dvh/);
});

test('Sudoku seeded generation preserves unique, consistent solutions across every difficulty',()=>{
 for(const difficulty of ['easy','medium','hard'])for(let seed=1;seed<=25;seed++){
  let state=seed;const rng=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  const g=R.generatePuzzle(difficulty,rng);assert.ok(R.isComplete(g.solution));assert.equal(R.countSolutions(g.puzzle),1);
  assert.deepEqual(R.solve(g.puzzle),g.solution);const clues=g.puzzle.flat().filter(Boolean).length;
  const [min,max]={easy:[38,44],medium:[31,37],hard:[25,30]}[difficulty];assert.ok(clues>=min&&clues<=max);
 }
});

test('Sudoku rules reject sparse board and row arrays',()=>{
 for(const board of [Array(9),Array.from({length:9},()=>Array(9))]){
  assert.equal(R.validBoard(board),false);assert.equal(R.isComplete(board),false);assert.equal(R.solve(board),null);assert.equal(R.countSolutions(board),0);
 }
});
