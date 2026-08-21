const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const i18n = require('../i18n.js');

const EXPECTED_GAMES = [
  '2048', 'shooter', 'tetris', 'snake', 'breakout', 'minesweeper',
  'space-invaders', 'maze', 'gomoku', 'pong', 'sokoban', 'asteroids',
  'crosswalk', 'simon', 'sudoku', 'lunar-lander', 'connect-four',
  'sky-hopper', 'helicopter-cave', 'endless-runner', 'solitaire',
  'bubble-shooter', 'nonogram', 'flow', 'bridges', 'sliding-puzzle',
  'color-bounce', 'flappy'
];

const EXPECTED_CATEGORIES = ['puzzle', 'arcade', 'strategy', 'memory', 'simulation', 'card'];

test('i18n dictionary contains all 28 games and categories for both zh and en', () => {
  assert.equal(i18n.LANGUAGES.length, 2);
  assert.ok(i18n.LANGUAGES.includes('zh'));
  assert.ok(i18n.LANGUAGES.includes('en'));

  for (const lang of ['zh', 'en']) {
    const dict = i18n.DICT[lang];
    assert.ok(dict, `dict for ${lang} exists`);
    assert.ok(dict.title, `title for ${lang}`);
    assert.ok(dict.kicker, `kicker for ${lang}`);
    assert.ok(dict.stats, `stats for ${lang}`);
    assert.ok(dict.langBtn, `langBtn for ${lang}`);
    assert.ok(dict.footer, `footer for ${lang}`);

    for (const cat of EXPECTED_CATEGORIES) {
      assert.ok(dict.categories[cat], `category ${cat} in ${lang}`);
    }

    for (const game of EXPECTED_GAMES) {
      const g = dict.games[game];
      assert.ok(g, `game ${game} in ${lang}`);
      assert.ok(g.name && g.name.trim().length > 0, `game name for ${game} in ${lang}`);
      assert.ok(g.desc && g.desc.trim().length > 0, `game desc for ${game} in ${lang}`);
    }
  }
});

test('index.html includes i18n assets, lang button and 28 valid card data attributes', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /src="\/i18n\.js\?v=[^"]+"/i, 'i18n script included');
  assert.match(html, /id="langToggle"/i, 'lang toggle button present');
  assert.match(html, /class="[^"]*lang-toggle[^"]*"/i, 'lang toggle class present');
  assert.match(html, /data-lang="zh"/i, 'default dataset lang is zh');
  assert.match(html, /lang="zh-CN"/i, 'default html lang is zh-CN');

  for (const game of EXPECTED_GAMES) {
    const pattern = new RegExp(`data-game="${game}"`, 'i');
    assert.match(html, pattern, `card with data-game="${game}" present in index.html`);
  }
});

function bootI18nSandbox(savedLang = null) {
  const listeners = {};
  const root = { dataset: { lang: 'zh' }, lang: 'zh-CN', style: {} };
  const store = new Map(savedLang ? [['play-lang', savedLang]] : []);
  
  const titleEl = { textContent: '' };
  const kickerEl = { textContent: '' };
  const statsEl = { textContent: '' };
  const footerEl = { textContent: '' };
  const langBtn = {
    textContent: '',
    attrs: {},
    setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return this.attrs[k]; },
    addEventListener(type, fn) { listeners[type] = fn; },
    removeEventListener() {}
  };

  const cards = EXPECTED_GAMES.map((game, i) => {
    const numEl = { textContent: '' };
    const cardTitleEl = { textContent: '' };
    const cardDescEl = { textContent: '' };
    return {
      dataset: {
        game,
        category: i % 2 === 0 ? 'puzzle' : 'arcade',
        num: String(i + 1).padStart(2, '0')
      },
      querySelector(sel) {
        if (sel === '.num') return numEl;
        if (sel === '.card-title' || sel === 'h2') return cardTitleEl;
        if (sel === '.card-desc' || sel === 'p') return cardDescEl;
        return null;
      },
      _numEl: numEl,
      _cardTitleEl: cardTitleEl,
      _cardDescEl: cardDescEl
    };
  });

  const document = {
    documentElement: root,
    title: '',
    readyState: 'complete',
    querySelector(sel) {
      if (sel === '.kicker') return kickerEl;
      if (sel === '.stats') return statsEl;
      if (sel === 'footer') return footerEl;
      return null;
    },
    querySelectorAll(sel) {
      if (sel === '.card[data-game]') return cards;
      return [];
    },
    getElementById(id) {
      if (id === 'langToggle') return langBtn;
      return null;
    },
    addEventListener() {},
    dispatchEvent(ev) { listeners.dispatched = ev; }
  };

  const sandbox = {
    document,
    localStorage: {
      getItem: k => store.get(k) || null,
      setItem: (k, v) => store.set(k, v)
    },
    CustomEvent: function (type, detail) { this.type = type; this.detail = detail; }
  };
  sandbox.window = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('i18n.js', 'utf8'), sandbox);

  return { root, document, kickerEl, statsEl, footerEl, langBtn, cards, store, listeners, sandbox };
}

test('i18n defaults to Chinese (zh) when localStorage is empty', () => {
  const env = bootI18nSandbox(null);
  assert.equal(env.root.lang, 'zh-CN');
  assert.equal(env.root.dataset.lang, 'zh');
  assert.equal(env.document.title, 'PLAY — 小游戏集合');
  assert.equal(env.kickerEl.textContent, '无需登录 · 纯粹单机 · 随开随玩');
  assert.equal(env.statsEl.textContent, '28 款游戏');
  assert.equal(env.langBtn.textContent, 'EN');
  assert.equal(env.cards[0]._cardTitleEl.textContent, '2048');
  assert.equal(env.cards[0]._cardDescEl.textContent, '滑动合并相同数字，冲击 2048 方块。');
});

test('i18n switches to English (en) on toggle and saves to localStorage', () => {
  const env = bootI18nSandbox(null);
  env.listeners.click(); // simulate clicking langToggle

  assert.equal(env.store.get('play-lang'), 'en');
  assert.equal(env.root.lang, 'en');
  assert.equal(env.root.dataset.lang, 'en');
  assert.equal(env.document.title, 'PLAY — Arcade');
  assert.equal(env.kickerEl.textContent, 'SMALL GAMES / NO ACCOUNTS');
  assert.equal(env.statsEl.textContent, '28 GAMES');
  assert.equal(env.langBtn.textContent, '中文');
  assert.equal(env.cards[0]._cardTitleEl.textContent, '2048');
  assert.equal(env.cards[0]._cardDescEl.textContent, 'Join the numbers. Chase the tile.');

  // Toggle back to Chinese
  env.listeners.click();
  assert.equal(env.store.get('play-lang'), 'zh');
  assert.equal(env.root.lang, 'zh-CN');
  assert.equal(env.root.dataset.lang, 'zh');
  assert.equal(env.langBtn.textContent, 'EN');
  assert.equal(env.cards[0]._cardDescEl.textContent, '滑动合并相同数字，冲击 2048 方块。');
});

test('i18n loads saved language preference from localStorage', () => {
  const env = bootI18nSandbox('en');
  assert.equal(env.root.lang, 'en');
  assert.equal(env.root.dataset.lang, 'en');
  assert.equal(env.document.title, 'PLAY — Arcade');
  assert.equal(env.langBtn.textContent, '中文');
  assert.equal(env.cards[1]._cardTitleEl.textContent, 'SKY PATROL');
});
