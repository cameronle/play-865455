const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
function rules(){const box={module:{exports:{}},exports:{}};vm.runInNewContext(read('bubble-shooter/rules.js'),box);return box.module.exports;}

test('Bubble Shooter exposes stable staggered-grid neighbors',()=>{
  const R=rules();
  assert.equal(JSON.stringify(R.neighbors(2,3)),JSON.stringify([[2,2],[2,4],[1,2],[1,3],[3,2],[3,3]]));
  assert.equal(JSON.stringify(R.neighbors(3,3)),JSON.stringify([[3,2],[3,4],[2,3],[2,4],[4,3],[4,4]]));
});

test('Bubble Shooter removes color groups of three and detached bubbles',()=>{
  const R=rules(),grid=R.emptyGrid(7,8);
  grid[0][0]='cyan';grid[0][1]='orange';grid[1][0]='orange';grid[2][0]='orange';grid[3][0]='pink';
  const result=R.resolve(grid,2,0);
  assert.equal(result.matched,3);
  assert.equal(result.dropped,1);
  assert.equal(grid[0][0],'cyan');
  assert.equal(grid[0][1],null);
  assert.equal(grid[3][0],null);
});

test('Bubble Shooter does not remove groups smaller than three',()=>{
  const R=rules(),grid=R.emptyGrid(6,8);grid[0][2]='cyan';grid[1][2]='cyan';
  assert.equal(JSON.stringify(R.resolve(grid,1,2)),JSON.stringify({matched:0,dropped:0}));
  assert.equal(grid[0][2],'cyan');assert.equal(grid[1][2],'cyan');
});

test('Bubble Shooter adds a shifted pressure row without losing existing bubbles',()=>{
  const R=rules(),grid=R.emptyGrid(5,8);grid[0][0]='cyan';grid[1][1]='pink';
  R.addRow(grid,['orange','cyan','pink','green','orange','cyan','pink','green']);
  assert.equal(grid.length,6);assert.equal(grid[0][0],'orange');assert.equal(grid[1][0],'cyan');assert.equal(grid[2][1],'pink');
});

test('Bubble Shooter page is themed, touch-safe, and integrated as game 22',()=>{
  const html=read('bubble-shooter/index.html'),css=read('bubble-shooter/style.css'),js=read('bubble-shooter/game.js'),index=read('index.html'),readme=read('README.md');
  assert.match(html,/viewport-fit=cover/);assert.match(html,/src="\/theme\.js\?v=/);assert.match(html,/class="theme-toggle"/);
  for(const id of ['game','score','best','misses','newButton','resultOverlay','resultButton'])assert.match(html,new RegExp(`id="${id}"`));
  assert.match(css,/touch-action:none/);assert.match(css,/-webkit-touch-callout:none/);assert.match(css,/\[data-theme="light"\]/);
  assert.match(js,/pointermove/);assert.match(js,/pointerup/);assert.match(js,/function traceAim/);assert.match(js,/function addPressureRow/);
  assert.match(index,/data-game="bubble-shooter"/);assert.match(readme,/\.\/bubble-shooter\//);
});
