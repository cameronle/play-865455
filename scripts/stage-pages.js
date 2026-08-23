#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const catalog = require('../data/games.js');

const ROOT = path.resolve(__dirname, '..');
const destinationArg = process.argv[2] || '.pages-deploy';
const DESTINATION = path.resolve(ROOT, destinationArg);
const ROOT_FILES = ['index.html', 'i18n.js', 'theme.css', 'theme.js'];

function fail(message) {
  throw new Error(`[pages-stage] ${message}`);
}

if (DESTINATION === ROOT || DESTINATION === path.parse(DESTINATION).root) {
  fail('refusing to use the repository root or filesystem root as the destination');
}

const catalogPaths = catalog.map(game => game.path);
const gameDirs = fs.readdirSync(ROOT, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && fs.existsSync(path.join(ROOT, entry.name, 'index.html')))
  .map(entry => entry.name);

if (catalogPaths.length !== gameDirs.length || catalogPaths.some(gamePath => !gameDirs.includes(gamePath))) {
  fail('catalog and game directories are out of sync');
}

for (const file of ROOT_FILES) {
  if (!fs.existsSync(path.join(ROOT, file))) fail(`missing root asset: ${file}`);
}

fs.rmSync(DESTINATION, { recursive: true, force: true });
fs.mkdirSync(DESTINATION, { recursive: true });

for (const file of ROOT_FILES) {
  fs.copyFileSync(path.join(ROOT, file), path.join(DESTINATION, file));
}

for (const game of catalog) {
  fs.cpSync(path.join(ROOT, game.path), path.join(DESTINATION, game.path), { recursive: true });
}

const fileCount = [...walkFiles(DESTINATION)].length;
console.log(`[pages-stage] staged ${catalog.length} games and ${fileCount} files at ${DESTINATION}`);

function* walkFiles(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const current = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walkFiles(current);
    else if (entry.isFile()) yield current;
  }
}
