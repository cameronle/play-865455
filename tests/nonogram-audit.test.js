const test = require('node:test'),
  assert = require('node:assert/strict');
const R = require('../nonogram/rules.js');
const { solutions } = require('./helpers/nonogram-solver.js');
const { boot } = require('./helpers/nonogram-runtime.js');
test('keyboard follows the actually focused cell after a pointer stroke and undo', () => {
  const rt=boot({size:5});rt.tap(1,4);rt.nodes.undoButton.click();
  rt.nodes.board.children[0].focus();rt.key('ArrowDown');rt.key('Enter');
  assert.equal(rt.snapshot().board[1][0],R.FILLED);
  assert.equal(rt.snapshot().board[2][4],R.UNKNOWN);
});
test('blocked storage does not stop the puzzle or hint', () => {
  const rt = boot({ storageThrows: true });
  rt.nodes.hintButton.click();
  assert.equal(rt.snapshot().historyLength, 1);
  assert.equal(rt.nodes.board.children.length, 100);
});
test('malformed storage records fall back without breaking or injecting cell states', () => {
  for (const value of ['{broken', 'null', 'true', '[]', '"text"']) {
    const rt = boot({
      storage: {
        'nonogram-bests': value,
        'nonogram-completed': value,
        'nonogram-saves': value,
      },
    });
    assert.equal(rt.nodes.board.children.length, 100);
    assert.equal(rt.snapshot().mistakes, 0);
  }
  for (const corrupt of [
    { board: Array.from({ length: 10 }, () => Array(10).fill(9)) },
    { mistakes: -2 },
    { elapsed: Infinity },
    { cursor: { r: 90, c: -5 } },
  ]) {
    const record = {
      board: R.emptyBoard(10),
      mistakes: 0,
      elapsed: 10,
      cursor: { r: 0, c: 0 },
      ...corrupt,
    };
    const rt = boot({
      storage: { 'nonogram-saves': JSON.stringify({ '10-ROCKET': record }) },
    });
    assert.equal(rt.snapshot().mistakes, 0);
    assert.ok(
      rt
        .snapshot()
        .board.flat()
        .every((v) => [0, 1, 2].includes(v)),
    );
    assert.ok(rt.snapshot().cursor.r >= 0 && rt.snapshot().cursor.r < 10);
    assert.ok(rt.snapshot().elapsed >= 0 && rt.snapshot().elapsed <= 10);
  }
});
test('starter cells survive reset and reject painting without an undo entry', () => {
  const rt = boot();
  const g = rt.snapshot().puzzle.givens[0];
  assert.equal(rt.snapshot().board[g.r][g.c], R.FILLED);
  rt.nodes.modeMark.click();
  rt.tap(g.r, g.c);
  assert.equal(rt.snapshot().board[g.r][g.c], R.FILLED);
  assert.equal(rt.snapshot().historyLength, 0);
  assert.equal(
    rt.nodes.board.children[g.r * 10 + g.c].getAttribute('aria-disabled'),
    'true',
  );
  rt.nodes.resetButton.click();
  assert.equal(rt.snapshot().board[g.r][g.c], R.FILLED);
});
test('a failed restored board stays terminal until fresh retry', () => {
  const rt = boot();
  for (const c of [0, 1, 2]) rt.tap(0, c);
  const reload = boot({ storage: Object.fromEntries(rt.storage) });
  assert.equal(reload.snapshot().active, false);
  assert.equal(reload.nodes.resultOverlay.classList.contains('show'), true);
  assert.equal(reload.intervalCount(), 0);
  reload.nodes.resultButton.click();
  assert.equal(reload.snapshot().mistakes, 0);
  assert.equal(reload.snapshot().active, true);
});
test('last-played uses stable name and rejects fractional or invalid indexes', () => {
  const rt = boot({
    storage: {
      'nonogram-last-played': JSON.stringify({
        size: 5,
        index: 0,
        name: 'KEY',
      }),
    },
  });
  assert.equal(rt.snapshot().puzzle.name, 'KEY');
  const bad = boot({
    storage: {
      'nonogram-last-played': JSON.stringify({ size: 5, index: 1.5 }),
    },
  });
  assert.equal(bad.snapshot().puzzle.name, 'HEART');
});
test('an owned stroke ignores secondary pointers and unrelated cancellation', () => {
  const rt = boot({ size: 5 });
  rt.pointer('pointerdown', 1, 0, { pointerId: 1 });
  rt.pointer('pointerdown', 1, 1, { pointerId: 2, isPrimary: false });
  rt.pointer('pointercancel', 1, 1, { pointerId: 2 });
  rt.pointer('pointermove', 1, 2, { pointerId: 1 });
  assert.equal(rt.snapshot().board[1][2], R.FILLED);
  assert.equal(rt.snapshot().historyLength, 1);
  rt.pointer('pointercancel', 1, 2, { pointerId: 1 });
  rt.pointer('pointermove', 1, 3, { pointerId: 1 });
  assert.equal(rt.snapshot().board[1][3], R.UNKNOWN);
});
test('fast strokes fill every crossed cell and one undo reverts the entire gesture', () => {
  const rt = boot({ size: 5 });
  rt.pointer('pointerdown', 1, 0);
  rt.pointer('pointermove', 1, 4);
  rt.pointer('pointerup', 1, 4);
  assert.deepEqual(rt.snapshot().board[1], Array(5).fill(R.FILLED));
  assert.equal(rt.snapshot().historyLength, 1);
  rt.nodes.undoButton.click();
  assert.deepEqual(rt.snapshot().board[1], Array(5).fill(R.UNKNOWN));
});
test('tap toggles a painted cell back to unknown without adding a mistake', () => {
  const rt = boot({ size: 5 });
  rt.tap(1, 0);
  rt.tap(1, 0);
  assert.equal(rt.snapshot().board[1][0], R.UNKNOWN);
  assert.equal(rt.snapshot().mistakes, 0);
});
test('gallery keyboard is isolated, focus trapped and returned to its opener', () => {
  const rt = boot({ size: 5 });
  rt.nodes.levelButton.focus();
  rt.nodes.levelButton.click();
  const before = rt.snapshot();
  rt.key('Enter');
  rt.key('h');
  rt.key('ArrowRight');
  assert.deepEqual(rt.snapshot().board, before.board);
  assert.deepEqual(rt.snapshot().cursor, before.cursor);
  assert.equal(rt.document.activeElement.id, 'closeLevels');
  rt.key('Tab', { shiftKey: true });
  assert.equal(rt.document.activeElement, rt.nodes.levelGrid.children[14]);
  rt.key('Tab');
  assert.equal(rt.document.activeElement.id, 'closeLevels');
  rt.key('Escape');
  assert.equal(rt.document.activeElement.id, 'levelButton');
});
test('shortcuts preserve browser modifiers and native select and button activation', () => {
  const rt = boot({ size: 5 });
  const before = rt.snapshot();
  for (const extra of [
    { ctrlKey: true },
    { metaKey: true },
    { altKey: true },
  ]) {
    const e = rt.key('h', extra);
    assert.equal(e.defaultPrevented, false);
  }
  const e = rt.key('Enter', { target: rt.nodes.hintButton });
  assert.equal(e.defaultPrevented, false);
  rt.key('ArrowRight', { target: rt.nodes.sizeSelect });
  assert.deepEqual(rt.snapshot().board, before.board);
  assert.deepEqual(rt.snapshot().cursor, before.cursor);
});
test('grid has one tab stop, focus follows arrows and labels expose cell state', () => {
  const rt = boot({ size: 5 });
  assert.equal(
    rt.nodes.board.children.filter((c) => c.tabIndex === 0).length,
    1,
  );
  rt.key('ArrowDown');
  assert.equal(rt.document.activeElement, rt.nodes.board.children[5]);
  rt.key('Enter');
  assert.match(
    rt.nodes.board.children[5].getAttribute('aria-label'),
    /filled/i,
  );
  assert.equal(
    rt.nodes.board.children.filter((c) => c.tabIndex === 0).length,
    1,
  );
});
test('a completed puzzle cannot be resurrected by undo', () => {
  const rt = boot({ size: 5 });
  for (let i = 0; i < 25; i++) rt.nodes.hintButton.click();
  assert.equal(rt.snapshot().active, false);
  rt.test.undo();
  assert.equal(rt.snapshot().active, false);
  assert.equal(rt.nodes.undoButton.disabled, true);
});
test('reset cancels old completion callbacks and leaves the fresh board playable', () => {
  const rt = boot({ size: 5, reducedMotion: false });
  for (let i = 0; i < 25; i++) rt.nodes.hintButton.click();
  rt.nodes.resetButton.click();
  rt.advance(6000);
  assert.equal(rt.nodes.resultOverlay.classList.contains('show'), false);
  assert.equal(rt.nodes.revealName.classList.contains('show'), false);
  assert.equal(rt.snapshot().active, true);
  assert.equal(
    rt
      .snapshot()
      .board.flat()
      .filter((v) => v !== 0).length,
    0,
  );
});
test('the result dialog owns focus and reduced motion skips the long reveal', () => {
  const rt = boot({ size: 5 });
  for (let i = 0; i < 25; i++) rt.nodes.hintButton.click();
  assert.equal(rt.nodes.resultOverlay.classList.contains('show'), true);
  assert.equal(rt.document.activeElement.id, 'resultButton');
  const e = rt.key('Tab');
  assert.equal(e.defaultPrevented, true);
});
test('hidden pages freeze and persist elapsed time until explicit resume', () => {
  const rt = boot({ size: 5 });
  rt.tap(1, 0);
  rt.advance(2300);
  rt.document.hidden = true;
  rt.emit('document', 'visibilitychange');
  const elapsed = rt.snapshot().elapsed;
  rt.advance(8000);
  assert.equal(rt.snapshot().elapsed, elapsed);
  assert.equal(rt.intervalCount(), 0);
  assert.equal(rt.nodes.pauseOverlay.classList.contains('show'), true);
  const saved = JSON.parse(rt.storage.get('nonogram-saves'));
  assert.equal(saved['5-HEART'].elapsed, elapsed);
  rt.document.hidden = false;
  rt.emit('document', 'visibilitychange');
  rt.advance(2000);
  assert.equal(rt.snapshot().elapsed, elapsed);
  rt.nodes.resumeButton.click();
  rt.advance(1000);
  assert.equal(rt.snapshot().elapsed, elapsed + 1);
  assert.equal(rt.intervalCount(), 1);
});
test('switching puzzles saves elapsed time before changing identity', () => {
  const rt = boot({ size: 5 });
  rt.tap(1, 0);
  rt.advance(5300);
  rt.changePuzzle(1);
  const save = JSON.parse(rt.storage.get('nonogram-saves'));
  assert.equal(save['5-HEART'].elapsed, 5);
  rt.changePuzzle(0);
  assert.equal(rt.snapshot().elapsed, 5);
  assert.equal(rt.snapshot().board[1][0], R.FILLED);
});
test('clearing game data cannot be undone by a pagehide autosave', () => {
  const rt = boot();
  rt.nodes.hintButton.click();
  rt.emit('window', 'game-data-clearing');
  rt.storage.clear();
  rt.emit('window', 'pagehide');
  assert.equal(rt.storage.size, 0);
  assert.equal(rt.intervalCount(), 0);
});
test('cancelled reset keeps the board and elapsed time intact', () => {
  const rt = boot({ size: 5 });
  rt.tap(1, 0);
  rt.advance(1000);
  rt.setConfirm(false);
  const before = rt.snapshot();
  rt.nodes.resetButton.click();
  assert.deepEqual(rt.snapshot(), before);
});
test('the page permits native zoom and names its modal and pause controls', () => {
  const html = require('node:fs').readFileSync('nonogram/index.html', 'utf8');
  assert.doesNotMatch(html, /user-scalable=no|maximum-scale=1/);
  for (const id of [
    'gamePage',
    'pauseButton',
    'pauseOverlay',
    'resumeButton',
    'utilityDock',
  ])
    assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /id="levelOverlay"[^>]*role="dialog"/);
  assert.match(html, /id="resultOverlay"[^>]*role="dialog"/);
});
test('assistive button activation paints a cell and pointer focus follows the selected cell', () => {
  const rt = boot({ size: 5 }),
    cell = rt.nodes.board.children[5];
  rt.nodes.board.dispatch('click', { target: cell, detail: 0 });
  assert.equal(rt.snapshot().board[1][0], R.FILLED);
  rt.tap(1, 1);
  assert.equal(rt.document.activeElement, rt.nodes.board.children[6]);
});
test('unfinished gallery cards do not contain solution pixels', () => {
  const rt = boot({ size: 5 });
  for (const card of rt.nodes.levelGrid.children)
    assert.equal(
      card.children[0].children.some((p) => p.classList.contains('on')),
      false,
    );
});
test('replaying a completed level does not overwrite its best-time gallery label', () => {
  const rt = boot({ size: 5 });
  for (let i = 0; i < 25; i++) rt.nodes.hintButton.click();
  rt.nodes.resetButton.click();
  rt.nodes.hintButton.click();
  const card = rt.nodes.levelGrid.children[0];
  assert.equal(card.classList.contains('in-progress'), false);
  assert.match(card.children[2].textContent, /BEST/);
});
test('all 45 levels complete through ordinary correct moves without a mistake', () => {
  let count = 0;
  for (const n of [5, 10, 15])
    for (let i = 0; i < 15; i++) {
      const rt = boot({ size: n });
      rt.changePuzzle(i);
      const p = rt.snapshot().puzzle;
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++)
          if (p.solution[r][c] && !p.givens.some((g) => g.r === r && g.c === c))
            rt.tap(r, c);
      assert.equal(rt.snapshot().mistakes, 0, `${n}-${p.name}`);
      assert.equal(rt.snapshot().active, false, `${n}-${p.name}`);
      assert.equal(rt.nodes.resultTitle.textContent, 'PICTURE COMPLETE');
      assert.ok(
        JSON.parse(rt.storage.get('nonogram-completed')).includes(
          `${n}-${p.name}`,
        ),
      );
      count++;
    }
  assert.equal(count, 45);
});
test('every Nonogram has one clue-and-starter solution matching its original picture', () => {
  for (const size of [5, 10, 15])
    for (const puzzle of R.listPuzzles(size)) {
      const found = solutions(puzzle);
      assert.equal(
        found.length,
        1,
        `${size}-${puzzle.name} must not punish a valid alternate answer`,
      );
      assert.deepEqual(found[0], puzzle.solution);
      for (const g of puzzle.givens || [])
        assert.equal(g.value, puzzle.solution[g.r][g.c]);
    }
});
