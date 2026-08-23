const test = require('node:test');
const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

test('stage-pages creates a complete public tree without development files', () => {
  const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'play-865455-pages-'));
  try {
    childProcess.execFileSync(process.execPath, ['scripts/stage-pages.js', destination], {
      cwd: ROOT,
      stdio: 'pipe'
    });

    for (const file of ['index.html', 'i18n.js', 'theme.css', 'theme.js']) {
      assert.ok(fs.existsSync(path.join(destination, file)), `${file} is staged`);
    }

    const games = fs.readdirSync(destination, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && fs.existsSync(path.join(destination, entry.name, 'index.html')));
    assert.equal(games.length, 28);

    for (const name of ['.git', '.github', 'tests', 'scripts', 'package.json', 'README.md', 'data']) {
      assert.equal(fs.existsSync(path.join(destination, name)), false, `${name} is not public content`);
    }
  } finally {
    fs.rmSync(destination, { recursive: true, force: true });
  }
});
