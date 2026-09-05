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
        "2048": {"name":"2048","desc":"滑动并合并相同数字，挑战 2048。"},
        "shooter": {"name":"星空巡航","desc":"移动、自动发射、躲避敌机，经典飞行射击。"},
        "tetris": {"name":"纸片积木","desc":"拼接彩色纸片、消除整行，把凌乱桌面整理干净。"},
        "snake": {"name":"毛毛虫花园","desc":"操控贪吃的小毛毛虫收集苹果和浆果，越吃越长。"},
        "breakout": {"name":"萤火花园","desc":"在深夜花园里弹开花灯，守住小萤火虫的微光。"},
        "minesweeper": {"name":"鼹鼠巡逻","desc":"在地下花园里推算数字、插好小旗，避开危险蘑菇。"},
        "space-invaders": {"name":"月面花园防守","desc":"守住月面温室，让自动花粉炮击退一波波太空害虫。"},
        "maze": {"name":"猫咪幽灵","desc":"帮助小猫收集所有鱼干，躲开在房间里巡逻的床单幽灵。"},
        "gomoku": {"name":"五子棋","desc":"执黑先行，在电脑拦截前率先连成五子。"},
        "pong": {"name":"潮汐网球","desc":"在潮汐海面上挥动冲浪板球拍，先拿到 7 分。"},
        "sokoban": {"name":"小熊搬果篮","desc":"帮小熊把果篮推回野餐点，规划路线完成 20 个森林关卡。"},
        "crosswalk": {"name":"小鸭过街","desc":"护送小鸭子穿过车流、红绿灯和施工路段，平安回到家。"},
        "simon": {"name":"怪兽乐队","desc":"记住四只小怪兽的节奏，按正确顺序让乐队继续演奏。"},
        "sudoku": {"name":"便当数字","desc":"把数字整齐装进九宫格便当盒，行列和小格都不能重复。"},
        "lunar-lander": {"name":"月兔着陆","desc":"驾驶小兔子的纸盒飞船，在有限燃料下平稳降落月面。"},
        "connect-four": {"name":"四子棋","desc":"轮流落子，抢先在横竖斜任意方向连成四子。"},
        "sky-hopper": {"name":"涂鸦弹跳","desc":"在手绘平台间自动弹跳，收集星星，继续向上冒险。"},
        "helicopter-cave": {"name":"萤火洞穴","desc":"按住点亮萤火虫，穿过水晶洞穴和狭窄通道。"},
        "endless-runner": {"name":"桌面冲刺","desc":"跨过铅笔和橡皮、收集贴纸，在桌面上一路冲刺。"},
        "solitaire": {"name":"兔子茶会","desc":"整理红黑茶点卡牌，把四种花色送回各自的茶盘。"},
        "bubble-shooter": {"name":"泡泡花园","desc":"瞄准发射彩色花朵泡泡，让相同颜色的花朵一起绽放。"},
        "nonogram": {"name":"贴纸揭晓","desc":"根据行列数字涂满贴纸页，揭开一张张手绘图案。"},
        "flow": {"name":"彩带路线","desc":"把同色彩带从纽扣连到纽扣，铺满整张纸页。"},
        "bridges": {"name":"岛屿连线","desc":"在手绘地图上架起绳桥，连接每座岛屿的海岸。"},
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
        "2048": {"name":"2048","desc":"Slide and merge matching numbers to reach 2048."},
        "shooter": {"name":"SKY PATROL","desc":"Move, fire, survive. A small original shooter."},
        "tetris": {"name":"PAPER BLOCKS","desc":"Fit colorful paper pieces, clear lines, and tidy the desk."},
        "snake": {"name":"WORM & APPLE","desc":"Guide a hungry little worm through the garden and grow longer."},
        "breakout": {"name":"FIRELIGHT GARDEN","desc":"Break the flower lights and keep a little firefly glowing."},
        "minesweeper": {"name":"MOLE PATROL","desc":"Read the underground clues, place flags, and avoid the bad mushrooms."},
        "space-invaders": {"name":"MOON GARDEN DEFENSE","desc":"Protect the moon greenhouse as the flower cannon clears waves of space pests."},
        "maze": {"name":"CAT & GHOSTS","desc":"Help the cat find every fish treat while dodging the sheet ghosts."},
        "gomoku": {"name":"GOMOKU","desc":"Play as Black. Connect five before the computer does."},
        "pong": {"name":"TIDAL TENNIS","desc":"Ride the tide with surfboard paddles and score seven before the tide bot."},
        "sokoban": {"name":"BEAR & BOXES","desc":"Help a little bear push fruit crates back to the picnic baskets."},
        "crosswalk": {"name":"TINY CROSSING","desc":"Guide a little duck through traffic, signals, and roadworks to get home."},
        "simon": {"name":"MONSTER BAND","desc":"Remember the monster beat and play it back in the right order."},
        "sudoku": {"name":"BENTO NUMBERS","desc":"Pack every number into the bento grid without repeating a compartment."},
        "lunar-lander": {"name":"MOON BUNNY","desc":"Pilot a paper rocket and land the moon bunny softly with limited fuel."},
        "connect-four": {"name":"CONNECT FOUR","desc":"Drop four in a row before the computer does."},
        "sky-hopper": {"name":"DOODLE HOP!","desc":"Bounce through a hand-drawn sky, collect stars, and climb higher."},
        "helicopter-cave": {"name":"FIREFLY CAVE","desc":"Hold the firefly up through crystals, vines, and narrowing cave walls."},
        "endless-runner": {"name":"DESK DASH","desc":"Hop over pencils, dodge erasers, and catch stickers across the desk."},
        "solitaire": {"name":"BUNNY TEA TIME","desc":"Sort the tea cards and send every suit home to its tray."},
        "bubble-shooter": {"name":"BUBBLE GARDEN","desc":"Aim colorful flower bubbles and make matching blossoms bloom together."},
        "nonogram": {"name":"STICKER REVEAL","desc":"Fill the sticker page from the clues and reveal a little picture."},
        "flow": {"name":"RIBBON ROUTE","desc":"Weave matching ribbons between buttons and cover the whole page."},
        "bridges": {"name":"ISLAND LINKS","desc":"Draw rope bridges across the map and connect every little island."},
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
