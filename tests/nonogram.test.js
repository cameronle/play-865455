const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const read = path => fs.readFileSync(path, 'utf8');

function rules() {
  const sandbox = { module:{exports:{}}, exports:{} };
  vm.runInNewContext(read('nonogram/rules.js'), sandbox);
  return sandbox.module.exports;
}

test('Nonogram derives row and column clues including empty lines', () => {
  const R = rules();
  const solution = [
    [0,1,1,0,1],
    [0,0,0,0,0],
    [1,1,1,1,1],
    [1,0,0,0,1],
    [0,1,1,1,0]
  ];
  const clues = R.makeClues(solution);
  assert.equal(JSON.stringify(clues.rows), JSON.stringify([[2,1],[0],[5],[1,1],[3]]));
  assert.equal(JSON.stringify(clues.cols), JSON.stringify([[2],[1,1,1],[1,1,1],[1,1],[1,2]]));
});

test('Nonogram cycles unknown to filled to marked to unknown', () => {
  const R = rules();
  assert.equal(R.nextState(R.UNKNOWN), R.FILLED);
  assert.equal(R.nextState(R.FILLED), R.MARKED);
  assert.equal(R.nextState(R.MARKED), R.UNKNOWN);
});

test('Nonogram completion requires exact filled cells but ignores correct marks', () => {
  const R = rules();
  const solution = [[1,0],[0,1]];
  assert.equal(R.isSolved([[R.FILLED,R.MARKED],[R.UNKNOWN,R.FILLED]], solution), true);
  assert.equal(R.isSolved([[R.FILLED,R.UNKNOWN],[R.FILLED,R.UNKNOWN]], solution), false);
});

test('Nonogram validates built-in puzzles and returns defensive copies', () => {
  const R = rules();
  for (const size of [5,10,15]) {
    const list = R.listPuzzles(size);
    assert.equal(list.length,15,`size ${size} needs exactly fifteen puzzles`);
    assert.equal(new Set(list.map(puzzle=>puzzle.name)).size,list.length,`size ${size} puzzle names must be unique`);
    for (const puzzle of list) {
      assert.equal(puzzle.solution.length, size);
      assert.ok(puzzle.solution.every(row => row.length === size));
      assert.ok(puzzle.solution.flat().every(value => value === 0 || value === 1));
    }
  }
  const first = R.getPuzzle(5,0);
  first.solution[0][0] = 9;
  assert.notEqual(R.getPuzzle(5,0).solution[0][0], 9);
});

test('Nonogram page is touch-safe, themed, keyboard accessible, and integrated as game 23', () => {
  const html = read('nonogram/index.html');
  const css = read('nonogram/style.css');
  const js = read('nonogram/game.js');
  const index = read('index.html');
  const readme = read('README.md');
  assert.match(html,/viewport-fit=cover/);
  assert.match(html,/src="\/theme\.js\?v=/);
  assert.match(html,/class="theme-toggle"/);
  for (const id of ['board','rowClues','colClues','sizeSelect','puzzleSelect','modeFill','modeMark','undoButton','hintButton','newButton','timer','mistakes','resultOverlay','resultButton']) {
    assert.match(html,new RegExp(`id="${id}"`));
  }
  assert.match(css,/touch-action:none/);
  assert.match(css,/-webkit-touch-callout:none/);
  assert.match(css,/\[data-theme="light"\]/);
  assert.match(js,/pointerdown/);
  assert.match(js,/pointermove/);
  assert.match(js,/keydown/);
  assert.match(js,/localStorage/);
  assert.match(index,/23 \/ PUZZLE[\s\S]*NONOGRAM/);
  assert.match(readme,/\.\/nonogram\//);
});

test('Nonogram exposes a visual level gallery with saved completion progress', () => {
  const html=read('nonogram/index.html'),css=read('nonogram/style.css'),js=read('nonogram/game.js');
  for(const id of ['levelButton','progressSummary','levelOverlay','levelGrid','closeLevels']) assert.match(html,new RegExp(`id="${id}"`));
  assert.match(css,/\.level-grid/);
  assert.match(css,/\.level-card\.completed/);
  assert.match(css,/\.pixel-preview/);
  assert.match(js,/nonogram-completed/);
  assert.match(js,/function renderLevelGrid/);
  assert.match(js,/function openLevels/);
  assert.match(js,/completed\.add\(bestKey\(\)\)/);
});

test('Nonogram auto-saves unfinished boards and exposes reset and in-progress states',()=>{
  const html=read('nonogram/index.html'),css=read('nonogram/style.css'),js=read('nonogram/game.js');
  assert.match(html,/id="resetButton"/);
  assert.match(css,/\.level-card\.in-progress/);
  assert.match(js,/nonogram-saves/);
  assert.match(js,/nonogram-last-played/);
  assert.match(js,/function saveGame/);
  assert.match(js,/function loadSavedGame/);
  assert.match(js,/function clearSavedGame/);
  assert.match(js,/IN PROGRESS/);
});
