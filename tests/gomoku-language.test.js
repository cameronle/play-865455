const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const files = ['index.html', 'app.js'];

test('gomoku interface is consistently English', () => {
  for (const file of files) {
    const source = fs.readFileSync(`gomoku/${file}`, 'utf8');
    assert.equal(/[\u3400-\u9fff]/u.test(source), false, `${file} still contains Chinese interface text`);
  }
});

test('arcade card uses the English title and description', () => {
  const source = fs.readFileSync('index.html', 'utf8');
  assert.match(source, /<h2>GOMOKU<\/h2>/);
  assert.match(source, /Play as Black\. Connect five before the computer does\./);
});
