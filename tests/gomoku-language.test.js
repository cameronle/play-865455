const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const i18n = require('../i18n.js');

const files = ['index.html', 'app.js'];

test('gomoku interface is consistently English', () => {
  for (const file of files) {
    const source = fs.readFileSync(`gomoku/${file}`, 'utf8');
    assert.equal(/[\u3400-\u9fff]/u.test(source), false, `${file} still contains Chinese interface text`);
  }
});

test('launcher integrates gomoku with English and Chinese i18n entries', () => {
  const source = fs.readFileSync('index.html', 'utf8');
  assert.match(source, /data-game="gomoku"/);
  assert.match(source, /href="\/gomoku\/"/);
  assert.equal(i18n.DICT.en.games.gomoku.name, 'GOMOKU');
  assert.equal(i18n.DICT.en.games.gomoku.desc, 'Play as Black. Connect five before the computer does.');
  assert.equal(i18n.DICT.zh.games.gomoku.name, '五子棋');
  assert.equal(i18n.DICT.zh.games.gomoku.desc, '执黑先行，在电脑拦截前率先连成五子。');
});
