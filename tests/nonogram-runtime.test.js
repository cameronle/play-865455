const test = require('node:test'),
  assert = require('node:assert/strict');
const { boot } = require('./helpers/nonogram-runtime.js');
const R = require('../nonogram/rules.js');
test('Nonogram runtime builds a playable 10x10 board and can reveal a hint', () => {
  const rt = boot(),
    e = rt.nodes;
  assert.equal(e.board.children.length, 100);
  assert.equal(e.rowClues.children.length, 10);
  assert.equal(e.colClues.children.length, 10);
  assert.equal(e.puzzleSelect.children.length, 15);
  assert.equal(e.levelGrid.children.length, 15);
  assert.equal(e.progressSummary.textContent, '10×10 PACK · 0 / 15');
  assert.match(e.puzzleFrame.style.properties['--row-clue'], /px/);
  assert.match(e.puzzleFrame.style.properties['--col-clue'], /px/);
  e.hintButton.click();
  assert.equal(e.undoButton.disabled, false);
  assert.match(rt.storage.get('nonogram-saves'), /10-ROCKET/);
  assert.match(rt.storage.get('nonogram-last-played'), /ROCKET/);
  assert.ok(e.levelGrid.children[0].classList.contains('in-progress'));
  const reload = boot({ storage: Object.fromEntries(rt.storage) });
  assert.deepEqual(reload.snapshot().board, rt.snapshot().board);
  for (let i = 0; i < 100; i++) e.hintButton.click();
  assert.match(rt.storage.get('nonogram-completed'), /10-ROCKET/);
  assert.match(e.progressSummary.textContent, /1 \/ 15/);
});
test('TRY AGAIN clears a failed attempt but retains its locked starter cells', () => {
  const rt = boot();
  for (const c of [0, 1, 2]) rt.tap(0, c);
  assert.equal(rt.nodes.resultTitle.textContent, 'PUZZLE FAILED');
  assert.equal(rt.nodes.mistakes.textContent, '3 / 3');
  assert.match(rt.storage.get('nonogram-saves'), /10-ROCKET/);
  rt.nodes.resultButton.click();
  assert.equal(rt.nodes.mistakes.textContent, '0 / 3');
  assert.equal(rt.nodes.timer.textContent, '00:00');
  const expected = R.emptyBoard(10);
  for (const g of rt.snapshot().puzzle.givens)
    expected[g.r][g.c] = g.value ? R.FILLED : R.MARKED;
  assert.deepEqual(rt.snapshot().board, expected);
  assert.doesNotMatch(rt.storage.get('nonogram-saves'), /10-ROCKET/);
  assert.equal(rt.nodes.resultOverlay.classList.contains('show'), false);
});
