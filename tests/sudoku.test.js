const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function rules() {
  const code = fs.readFileSync('sudoku/rules.js', 'utf8');
  const sandbox = { module:{exports:{}}, exports:{} };
  vm.runInNewContext(code, sandbox);
  return sandbox.module.exports;
}

test('Sudoku validates rows, columns, and 3x3 boxes', () => {
  const R = rules();
  const board = Array.from({length:9},()=>Array(9).fill(0));
  board[0][0]=5;
  assert.equal(R.canPlace(board,0,1,5),false);
  assert.equal(R.canPlace(board,1,0,5),false);
  assert.equal(R.canPlace(board,1,1,5),false);
  assert.equal(R.canPlace(board,4,4,5),true);
});

test('Sudoku solver completes a classic puzzle correctly', () => {
  const R = rules();
  const puzzle=[
    [5,3,0,0,7,0,0,0,0],[6,0,0,1,9,5,0,0,0],[0,9,8,0,0,0,0,6,0],
    [8,0,0,0,6,0,0,0,3],[4,0,0,8,0,3,0,0,1],[7,0,0,0,2,0,0,0,6],
    [0,6,0,0,0,0,2,8,0],[0,0,0,4,1,9,0,0,5],[0,0,0,0,8,0,0,7,9]
  ];
  const solved=R.solve(puzzle);
  assert.equal(R.isComplete(solved),true);
  assert.deepEqual(Array.from(solved[0]),[5,3,4,6,7,8,9,1,2]);
});

test('generated puzzles have exactly one solution and difficulty controls clue count', () => {
  const R=rules();
  for (const [difficulty,min,max] of [['easy',38,44],['medium',31,37],['hard',25,30]]) {
    const game=R.generatePuzzle(difficulty,()=>0.3141592653);
    const clues=game.puzzle.flat().filter(Boolean).length;
    assert.ok(clues>=min&&clues<=max,`${difficulty} clues=${clues}`);
    assert.equal(R.countSolutions(game.puzzle,2),1);
    assert.equal(R.isComplete(game.solution),true);
  }
});

test('Sudoku page exposes mobile number pad, notes, undo, hint, difficulty and timer', () => {
  const html=fs.readFileSync('sudoku/index.html','utf8');
  const css=fs.readFileSync('sudoku/style.css','utf8');
  const js=fs.readFileSync('sudoku/game.js','utf8');
  assert.match(html,/viewport-fit=cover/);
  assert.match(html,/user-scalable=no/);
  assert.equal((html.match(/data-number=/g)||[]).length,9);
  for(const id of ['notesButton','eraseButton','undoButton','hintButton','difficulty','timer']) assert.match(html,new RegExp(`id="${id}"`));
  assert.match(css,/touch-action:manipulation/);
  assert.match(js,/localStorage/);
  assert.match(js,/keydown/);
});


test('Sudoku initial runtime renders 81 cells and starts from the overlay', () => {
  const elements = new Map();
  function make(id='') { return {id,textContent:'',value:id==='difficulty'?'medium':'',className:'',classList:{add(){},remove(){},toggle(){},contains(){return false}},children:[],dataset:{},style:{},attributes:{},appendChild(child){this.children.push(child)},addEventListener(){},setAttribute(k,v){this.attributes[k]=v}}; }
  for (const id of ['board','timer','mistakes','best','difficulty','overlay','overlayTitle','overlayText','startButton','notesButton','eraseButton','undoButton','hintButton','newButton']) elements.set(id,make(id));
  const numberButtons=Array.from({length:9},(_,i)=>{const e=make();e.dataset.number=String(i+1);return e});
  const sandbox={window:{SudokuRules:rules(),addEventListener(){}},document:{getElementById:id=>elements.get(id),querySelectorAll:()=>numberButtons,createElement:()=>make(),addEventListener(){},hidden:false},localStorage:{getItem(){return null},setItem(){}},setInterval:()=>1,clearInterval(){},setTimeout:fn=>fn(),Date,Math,console};
  vm.createContext(sandbox);vm.runInContext(fs.readFileSync('sudoku/game.js','utf8'),sandbox);
  assert.equal(elements.get('board').children.length,81);
  assert.equal(elements.get('overlayTitle').textContent,'SUDOKU');
});

test('launcher and README include Sudoku', () => {
  assert.match(fs.readFileSync('index.html','utf8'),/\/sudoku\//);
  assert.match(fs.readFileSync('README.md','utf8'),/\.\/sudoku\//);
});
