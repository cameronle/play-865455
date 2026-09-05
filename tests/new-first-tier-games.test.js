const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const read = path => fs.readFileSync(path, 'utf8');

for (const game of ['pong','sokoban','crosswalk','simon']) {
  test(`${game} has a complete static entrypoint and mobile viewport`, () => {
    const html = read(`${game}/index.html`);
    assert.match(html, /viewport-fit=cover/);
    assert.match(html, /user-scalable=no/);
    assert.match(html, /style\.css\?v=/);
    assert.match(html, /game\.js\?v=/);
    assert.match(read(`${game}/style.css`), /touch-action:none/);
  });
}

test('Sokoban rules push boxes, reject walls, and detect completion', () => {
  const code = read('sokoban/rules.js');
  const sandbox = {module:{exports:{}},exports:{}};
  vm.runInNewContext(code, sandbox);
  const rules = sandbox.module.exports;
  const state = rules.parseLevel(['#####','#@$.#','#####']);
  assert.equal(rules.move(state,1,0), true);
  assert.equal(rules.isComplete(state), true);
  assert.equal(rules.move(state,1,0), false);
});

test('Pong exposes drag/touch controls and a playable AI match', () => {
  const html = read('pong/index.html'), js = read('pong/game.js');
  assert.match(html, /id="startButton"/);
  assert.match(js, /pointermove/);
  assert.match(js, /AI WINS|YOU WIN/);
});

test('Crosswalk has finite lanes, goal progression, and directional touch controls', () => {
  const js = read('crosswalk/game.js'), html = read('crosswalk/index.html');
  assert.match(js, /makeLanes/);
  assert.match(js, /level\+\+/);
  assert.match(js, /lives--/);
  assert.match(html, /TINY CROSSING/);
  assert.match(html, /data-dir="up"/);
});

test('Simon generates a growing sequence and accepts four touch pads', () => {
  const js = read('simon/game.js'), html = read('simon/index.html');
  assert.match(js, /sequence\.push/);
  assert.match(js, /playSequence/);
  assert.equal((html.match(/data-pad=/g)||[]).length, 4);
  assert.match(html, /MONSTER BAND/);
});

test('launcher and README include the remaining four routes', () => {
  const index = read('index.html'), readme = read('README.md');
  for (const route of ['pong','sokoban','crosswalk','simon']) {
    assert.match(index, new RegExp(`/${route}/`));
    assert.match(readme, new RegExp(`\./${route}/`));
  }
});
