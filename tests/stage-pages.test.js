const test = require('node:test');
const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

test('stage-pages rejects destinations outside the approved staging locations', () => {
  const unsafeDestinations = [
    path.join(ROOT, '2048'),
    path.join(ROOT, 'data'),
    path.join(ROOT, 'unsafe-pages-output'),
    path.join(os.tmpdir(), 'play-865455-unsafe-output')
  ];

  for (const destination of unsafeDestinations) {
    try {
      const result = childProcess.spawnSync(process.execPath, ['scripts/stage-pages.js', destination], {
        cwd: ROOT,
        encoding: 'utf8'
      });
      assert.notEqual(result.status, 0, `${destination} must be rejected`);
    } finally {
      if (destination !== path.join(ROOT, '2048') && destination !== path.join(ROOT, 'data')) {
        fs.rmSync(destination, { recursive: true, force: true });
      }
    }
  }
});

test('stage-pages rejects symlink destinations', () => {
  const destination = path.join(os.tmpdir(), 'play-865455-pages-symlink');
  fs.rmSync(destination, { recursive: true, force: true });
  fs.symlinkSync(ROOT, destination, 'dir');
  try {
    const result = childProcess.spawnSync(process.execPath, ['scripts/stage-pages.js', destination], {
      cwd: ROOT,
      encoding: 'utf8'
    });
    assert.notEqual(result.status, 0);
  } finally {
    fs.rmSync(destination, { recursive: true, force: true });
  }
});

test('stage-pages creates a complete public tree without development files', () => {
  const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'play-865455-pages-'));
  try {
    childProcess.execFileSync(process.execPath, ['scripts/stage-pages.js', destination], {
      cwd: ROOT,
      stdio: 'pipe'
    });

    for (const file of ['index.html', 'i18n.js', 'theme.css', 'theme.js', 'clear-game-data.js', '_redirects']) {
      assert.ok(fs.existsSync(path.join(destination, file)), `${file} is staged`);
    }

    assert.match(fs.readFileSync(path.join(destination, '_redirects'), 'utf8'), /\/asteroids\/\* \/ 301/);

    const games = fs.readdirSync(destination, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && fs.existsSync(path.join(destination, entry.name, 'index.html')));
    assert.equal(games.length, 27);

    for (const name of ['.git', '.github', 'tests', 'scripts', 'package.json', 'README.md', 'data']) {
      assert.equal(fs.existsSync(path.join(destination, name)), false, `${name} is not public content`);
    }
  } finally {
    fs.rmSync(destination, { recursive: true, force: true });
  }
});
