#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const catalog = require(path.join(ROOT, 'data', 'games.js'));

const CATEGORY_LABELS_ZH = {
  puzzle: '益智',
  arcade: '街机',
  strategy: '策略',
  memory: '记忆',
  simulation: '模拟',
  card: '纸牌'
};

const TARGETS = [
  'index.html',
  'i18n.js',
  'README.md'
];

function fail(message) {
  throw new Error(`[catalog] ${message}`);
}

function validateCatalog() {
  if (!Array.isArray(catalog) || catalog.length === 0) {
    fail('data/games.js must export a non-empty array');
  }

  const gameDirs = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && fs.existsSync(path.join(ROOT, entry.name, 'index.html')))
    .map(entry => entry.name)
    .sort();
  const ids = catalog.map(game => game.id);
  const paths = catalog.map(game => game.path);

  if (catalog.length !== gameDirs.length) {
    fail(`catalog has ${catalog.length} entries but found ${gameDirs.length} game directories`);
  }
  if (JSON.stringify([...ids].sort()) !== JSON.stringify(gameDirs)) {
    fail(`catalog ids do not match game directories\n  catalog: ${ids.join(', ')}\n  dirs: ${gameDirs.join(', ')}`);
  }
  if (new Set(ids).size !== ids.length) fail('catalog ids must be unique');
  if (new Set(paths).size !== paths.length) fail('catalog paths must be unique');

  catalog.forEach((game, index) => {
    if (game.order !== index + 1) fail(`${game.id} has order ${game.order}, expected ${index + 1}`);
    if (game.id !== game.path) fail(`${game.id} must currently use the same id and path`);
    if (!CATEGORY_LABELS_ZH[game.category]) fail(`${game.id} uses unknown category ${game.category}`);
    if (!game.name?.zh || !game.name?.en) fail(`${game.id} is missing localized names`);
    if (!game.description?.zh || !game.description?.en) fail(`${game.id} is missing localized descriptions`);
    if (!game.readme?.title || !game.readme?.description) fail(`${game.id} is missing README metadata`);
  });
}

function replaceBlock(source, name, body) {
  const begin = `<!-- BEGIN GENERATED: ${name} -->`;
  const end = `<!-- END GENERATED: ${name} -->`;
  const beginIndex = source.indexOf(begin);
  if (beginIndex < 0) fail(`missing begin marker for ${name}`);
  const bodyStart = source.indexOf('\n', beginIndex);
  if (bodyStart < 0) fail(`begin marker for ${name} has no line ending`);
  const endIndex = source.indexOf(end, bodyStart + 1);
  if (endIndex < 0) fail(`missing end marker for ${name}`);
  return `${source.slice(0, bodyStart + 1)}${body}\n${source.slice(endIndex)}`;
}

function replaceInlineBlock(source, name, body) {
  const begin = `<!-- BEGIN GENERATED: ${name} -->`;
  const end = `<!-- END GENERATED: ${name} -->`;
  const pattern = new RegExp(`${escapeRegExp(begin)}[\\s\\S]*?${escapeRegExp(end)}`);
  if (!pattern.test(source)) fail(`missing inline markers for ${name}`);
  return source.replace(pattern, `${begin}${body}${end}`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderCards() {
  return catalog.map(game => [
    `      <a class="card" href="/${game.path}/" data-game="${game.id}" data-category="${game.category}" data-num="${String(game.order).padStart(2, '0')}"><div class="card-head"><span class="num">${String(game.order).padStart(2, '0')} / ${CATEGORY_LABELS_ZH[game.category]}</span><span class="arrow">→</span></div><div class="card-body"><h2 class="card-title">${game.name.zh}</h2><p class="card-desc">${game.description.zh}</p></div></a>`
  ]).join('\n');
}

function renderReadmeList() {
  return catalog.map(game => `- [${game.readme.title}](./${game.path}/) — ${game.readme.description}`).join('\n');
}

function renderDeployPaths() {
  return ['```text', ...catalog.map(game => `/${game.path}/`), '```'].join('\n');
}

function renderI18nGames(language) {
  const lines = catalog.map(game => {
    const value = {
      name: game.name[language],
      desc: game.description[language]
    };
    return `        ${JSON.stringify(game.id)}: ${JSON.stringify(value)}`;
  });
  return `      games: {\n${lines.join(',\n')}\n      }`;
}

function replaceI18nGames(source) {
  let result = source;
  let cursor = 0;
  for (const language of ['zh', 'en']) {
    const suffix = result.slice(cursor);
    const match = suffix.match(/      games: \{[\s\S]*?\n      \}/);
    if (!match) fail(`could not find ${language} games dictionary in i18n.js`);
    const start = cursor + match.index;
    const end = start + match[0].length;
    const replacement = renderI18nGames(language);
    result = `${result.slice(0, start)}${replacement}${result.slice(end)}`;
    cursor = start + replacement.length;
  }
  let statsIndex = 0;
  const stats = [`${catalog.length} 款游戏`, `${catalog.length} GAMES`];
  result = result.replace(/(stats:\s*')[^']*(')/g, (_, prefix, suffix) => {
    const value = stats[statsIndex++];
    return `${prefix}${value || ''}${suffix}`;
  });
  if (statsIndex !== stats.length) fail('expected two stats strings in i18n.js');
  return result;
}

function renderTarget(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  let source = fs.readFileSync(absolutePath, 'utf8');

  if (relativePath === 'index.html') {
    source = replaceInlineBlock(source, 'game-count', `${catalog.length} 款游戏`);
    source = replaceBlock(source, 'game-cards', renderCards());
  } else if (relativePath === 'i18n.js') {
    source = replaceI18nGames(source);
  } else if (relativePath === 'README.md') {
    source = replaceBlock(source, 'game-list', renderReadmeList());
    source = replaceBlock(source, 'deploy-paths', renderDeployPaths());
  }

  return source;
}

function main() {
  validateCatalog();
  const checkOnly = process.argv.includes('--check');
  const mismatches = [];

  for (const relativePath of TARGETS) {
    const absolutePath = path.join(ROOT, relativePath);
    const current = fs.readFileSync(absolutePath, 'utf8');
    const expected = renderTarget(relativePath);
    if (current !== expected) {
      mismatches.push(relativePath);
      if (!checkOnly) fs.writeFileSync(absolutePath, expected);
    }
  }

  if (checkOnly && mismatches.length > 0) {
    console.error(`[catalog] generated files are stale: ${mismatches.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  if (!checkOnly && mismatches.length > 0) {
    console.log(`[catalog] regenerated: ${mismatches.join(', ')}`);
  } else if (checkOnly) {
    console.log('[catalog] generated files are up to date');
  } else {
    console.log('[catalog] no changes needed');
  }
}

main();
