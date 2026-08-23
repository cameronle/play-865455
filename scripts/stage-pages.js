#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const catalog = require('../data/games.js');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_DESTINATION = path.join(ROOT, '.pages-deploy');
const TEMP_PREFIX = 'play-865455-pages-';
const destinationArg = process.argv[2] || '.pages-deploy';
const DESTINATION = resolveDestination(destinationArg);
const ROOT_FILES = ['index.html', 'i18n.js', 'theme.css', 'theme.js', 'clear-game-data.js'];

function fail(message) {
  throw new Error(`[pages-stage] ${message}`);
}

function resolveDestination(value) {
  const destination = path.resolve(ROOT, value);
  const tempRoot = path.resolve(os.tmpdir());
  const isDefault = destination === DEFAULT_DESTINATION;
  const isApprovedTemp = destination.startsWith(`${tempRoot}${path.sep}`)
    && path.basename(destination).startsWith(TEMP_PREFIX);

  if (!isDefault && !isApprovedTemp) {
    fail(`destination must be ${DEFAULT_DESTINATION} or a temporary ${TEMP_PREFIX}* directory`);
  }
  if (fs.existsSync(destination)) {
    const stat = fs.lstatSync(destination);
    if (stat.isSymbolicLink()) fail('destination must not be a symbolic link');
    if (!stat.isDirectory()) fail('destination must be a directory');
  }
  return destination;
}

const catalogPaths = catalog.map(game => game.path);
const gameDirs = fs.readdirSync(ROOT, { withFileTypes: true })
  .filter(entry => !entry.name.startsWith('.') && entry.isDirectory() && fs.existsSync(path.join(ROOT, entry.name, 'index.html')))
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
