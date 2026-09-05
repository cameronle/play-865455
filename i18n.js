(function (global) {
  'use strict';

  const KEY = 'play-lang';
  const LANGUAGES = ['zh', 'en'];

  const DICT = {
    zh: {
      htmlLang: 'zh-CN',
      title: 'PLAY — 小游戏集合',
      kicker: '无需登录 · 纯粹单机 · 随开随玩',
      stats: '27 款游戏',
      langBtn: 'EN',
      langBtnLabel: '切换为英文 (Switch to English)',
      footer: '更多游戏持续更新中 · 为 Web 纯粹体验而生',
      categories: {
        puzzle: '益智',
        arcade: '街机',
        strategy: '策略',
        memory: '记忆',
        simulation: '模拟',
        card: '纸牌'
      },
      games: {
        "2048": {"name":"小小星球","desc":"合并相同的小星球，从一颗小小行星一路成长到太阳。"},
        "shooter": {"name":"星空巡航","desc":"移动、自动发射、躲避敌机，经典飞行射击。"},
        "tetris": {"name":"纸片积木","desc":"拼接彩色纸片、消除整行，把凌乱桌面整理干净。"},
        "snake": {"name":"毛毛虫花园","desc":"操控贪吃的小毛毛虫收集苹果和浆果，越吃越长。"},
        "breakout": {"name":"萤火花园","desc":"在深夜花园里弹开花灯，守住小萤火虫的微光。"},
        "minesweeper": {"name":"鼹鼠巡逻","desc":"在地下花园里推算数字、插好小旗，避开危险蘑菇。"},
        "space-invaders": {"name":"太空侵略者","desc":"迎击步步逼近的外星阵列，守卫防线。"},
        "maze": {"name":"猫咪幽灵","desc":"帮助小猫收集所有鱼干，躲开在房间里巡逻的床单幽灵。"},
        "gomoku": {"name":"五子棋","desc":"执黑先行，在电脑拦截前率先连成五子。"},
        "pong": {"name":"弹球对决","desc":"滑动球拍精准截击，与电脑一较高下。"},
        "sokoban": {"name":"小熊搬果篮","desc":"帮小熊把果篮推回野餐点，规划路线完成 20 个森林关卡。"},
        "crosswalk": {"name":"小鸭过街","desc":"护送小鸭子穿过车流、红绿灯和施工路段，平安回到家。"},
        "simon": {"name":"怪兽乐队","desc":"记住四只小怪兽的节奏，按正确顺序让乐队继续演奏。"},
        "sudoku": {"name":"数独","desc":"在九宫格填入数字，满足行列唯一解。"},
        "lunar-lander": {"name":"月兔着陆","desc":"驾驶小兔子的纸盒飞船，在有限燃料下平稳降落月面。"},
        "connect-four": {"name":"四子棋","desc":"轮流落子，抢先在横竖斜任意方向连成四子。"},
        "sky-hopper": {"name":"涂鸦弹跳","desc":"在手绘平台间自动弹跳，收集星星，继续向上冒险。"},
        "helicopter-cave": {"name":"直升机洞穴","desc":"按住上升松开下落，穿行狭窄起伏的地下洞穴。"},
        "endless-runner": {"name":"无尽奔跑","desc":"跨越尖刺与坑洞、收集金币，跟上加速节奏。"},
        "solitaire": {"name":"兔子茶会","desc":"整理红黑茶点卡牌，把四种花色送回各自的茶盘。"},
        "bubble-shooter": {"name":"泡泡花园","desc":"瞄准发射彩色花朵泡泡，让相同颜色的花朵一起绽放。"},
        "nonogram": {"name":"贴纸揭晓","desc":"根据行列数字涂满贴纸页，揭开一张张手绘图案。"},
        "flow": {"name":"连线解谜","desc":"连接相同颜色管道，无交叉铺满整个棋盘。"},
        "bridges": {"name":"数桥","desc":"在岛屿间架设指定数量桥梁，连通完整网络。"},
        "sliding-puzzle": {"name":"数字华容道","desc":"滑动方块归位，将乱序数字按顺序排列整齐。"},
        "color-bounce": {"name":"颜料巡游","desc":"带着小变色龙穿过同色颜料圈，收集飞溅一路向上。"},
        "flappy": {"name":"小鸟邮差","desc":"操控背着邮包的小鸟穿过云朵，安全送出每一封信。"}
      }
    },
    en: {
      htmlLang: 'en',
      title: 'PLAY — Arcade',
      kicker: 'SMALL GAMES / NO ACCOUNTS',
      stats: '27 GAMES',
      langBtn: '中文',
      langBtnLabel: 'Switch to Chinese (切换为中文)',
      footer: 'MORE GAMES COMING SOON · BUILT FOR THE WEB',
      categories: {
        puzzle: 'PUZZLE',
        arcade: 'ARCADE',
        strategy: 'STRATEGY',
        memory: 'MEMORY',
        simulation: 'SIMULATION',
        card: 'CARD'
      },
      games: {
        "2048": {"name":"LITTLE PLANETS","desc":"Merge matching little worlds and grow from a pebble to a sun."},
        "shooter": {"name":"SKY PATROL","desc":"Move, fire, survive. A small original shooter."},
        "tetris": {"name":"PAPER BLOCKS","desc":"Fit colorful paper pieces, clear lines, and tidy the desk."},
        "snake": {"name":"WORM & APPLE","desc":"Guide a hungry little worm through the garden and grow longer."},
        "breakout": {"name":"FIRELIGHT GARDEN","desc":"Break the flower lights and keep a little firefly glowing."},
        "minesweeper": {"name":"MOLE PATROL","desc":"Read the underground clues, place flags, and avoid the bad mushrooms."},
        "space-invaders": {"name":"ALIEN FORMATION","desc":"Defend the line against descending aliens."},
        "maze": {"name":"CAT & GHOSTS","desc":"Help the cat find every fish treat while dodging the sheet ghosts."},
        "gomoku": {"name":"GOMOKU","desc":"Play as Black. Connect five before the computer does."},
        "pong": {"name":"PONG","desc":"Deflect the ball. Outsmart the machine."},
        "sokoban": {"name":"BEAR & BOXES","desc":"Help a little bear push fruit crates back to the picnic baskets."},
        "crosswalk": {"name":"TINY CROSSING","desc":"Guide a little duck through traffic, signals, and roadworks to get home."},
        "simon": {"name":"MONSTER BAND","desc":"Remember the monster beat and play it back in the right order."},
        "sudoku": {"name":"SUDOKU","desc":"Place the digits. Complete every row, column, and box."},
        "lunar-lander": {"name":"MOON BUNNY","desc":"Pilot a paper rocket and land the moon bunny softly with limited fuel."},
        "connect-four": {"name":"CONNECT FOUR","desc":"Drop four in a row before the computer does."},
        "sky-hopper": {"name":"DOODLE HOP!","desc":"Bounce through a hand-drawn sky, collect stars, and climb higher."},
        "helicopter-cave": {"name":"HELICOPTER CAVE","desc":"Hold to rise, release to fall, and survive the cave."},
        "endless-runner": {"name":"ENDLESS RUNNER","desc":"Jump, collect, and keep pace with the accelerating road."},
        "solitaire": {"name":"BUNNY TEA TIME","desc":"Sort the tea cards and send every suit home to its tray."},
        "bubble-shooter": {"name":"BUBBLE GARDEN","desc":"Aim colorful flower bubbles and make matching blossoms bloom together."},
        "nonogram": {"name":"STICKER REVEAL","desc":"Fill the sticker page from the clues and reveal a little picture."},
        "flow": {"name":"FLOW FREE","desc":"Connect matching colors. Fill the whole board."},
        "bridges": {"name":"BRIDGES","desc":"Connect the islands. Build a single network."},
        "sliding-puzzle": {"name":"15-PUZZLE","desc":"Slide tiles into the empty space. Put numbers in order."},
        "color-bounce": {"name":"PAINT PARADE","desc":"Guide a tiny chameleon through matching paint hoops and collect splashes."},
        "flappy": {"name":"BIRDIE POST","desc":"Guide a tiny mail bird through cloud gaps and deliver every letter."}
      }
    }
  };

  let currentLang = 'zh';
  try {
    const saved = localStorage.getItem(KEY);
    if (LANGUAGES.includes(saved)) {
      currentLang = saved;
    }
  } catch (e) {}

  function apply(lang) {
    if (!DICT[lang]) lang = 'zh';
    currentLang = lang;

    if (typeof document === 'undefined') return;

    if (document.documentElement) {
      document.documentElement.lang = DICT[lang].htmlLang;
      document.documentElement.dataset.lang = lang;
    }

    document.title = DICT[lang].title;

    const kickerEl = document.querySelector('.kicker');
    if (kickerEl) kickerEl.textContent = DICT[lang].kicker;

    const statsEl = document.querySelector('.stats');
    if (statsEl) statsEl.textContent = DICT[lang].stats;

    const langBtn = document.getElementById('langToggle');
    if (langBtn) {
      langBtn.textContent = DICT[lang].langBtn;
      langBtn.setAttribute('aria-label', DICT[lang].langBtnLabel);
      langBtn.setAttribute('title', DICT[lang].langBtnLabel);
    }

    const cards = document.querySelectorAll('.card[data-game]');
    cards.forEach(card => {
      const gameKey = card.dataset.game;
      const catKey = card.dataset.category;
      const num = card.dataset.num;

      const numEl = card.querySelector('.num');
      if (numEl && catKey && DICT[lang].categories[catKey]) {
        numEl.textContent = `${num} / ${DICT[lang].categories[catKey]}`;
      }

      const info = DICT[lang].games[gameKey];
      if (info) {
        const titleEl = card.querySelector('.card-title');
        if (titleEl) titleEl.textContent = info.name;
        const descEl = card.querySelector('.card-desc');
        if (descEl) descEl.textContent = info.desc;
      }
    });

    const footerEl = document.querySelector('footer');
    if (footerEl) footerEl.textContent = DICT[lang].footer;

    try {
      document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
    } catch (e) {}
  }

  function setLang(lang) {
    if (!LANGUAGES.includes(lang)) return;
    try {
      localStorage.setItem(KEY, lang);
    } catch (e) {}
    apply(lang);
  }

  function toggle() {
    const nextLang = currentLang === 'zh' ? 'en' : 'zh';
    setLang(nextLang);
  }

  function bind() {
    const btn = document.getElementById('langToggle');
    if (btn) {
      btn.removeEventListener('click', toggle);
      btn.addEventListener('click', toggle);
    }
    apply(currentLang);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bind, { once: true });
    } else {
      bind();
    }
  }

  const playI18n = {
    KEY,
    LANGUAGES,
    DICT,
    apply,
    setLang,
    toggle,
    getLang: () => currentLang
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = playI18n;
  }
  if (typeof global !== 'undefined') {
    global.playI18n = playI18n;
  }
})(typeof window !== 'undefined' ? window : this);
