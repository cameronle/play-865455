(() => {
  'use strict';
  const B = window.BubbleFrontier, D = B.Content, R = B.Rules, W = B.World;
  const dictionary = {
    controlsTitle:['操作与技能','Controls & skills'],displayTitle:['画面与声音','Display & sound'],
    confirmTitle:['开始新的远征？','Start a new expedition?'],confirmDetail:['新远征会覆盖当前进度，图鉴和纪录会保留。','The new expedition replaces this run. Discoveries and records remain.'],keepRun:['保留当前远征','Keep this expedition'],confirmNew:['确认重新开始','Confirm new expedition'],
    title:['泡泡远征','Bubble Frontier'],pause:['暂停','Pause'],mass:['泡泡质量','Bubble mass'],body:['体量','Body'],cleared:['已清空','Cleared'],coordinate:['坐标','Position'],
    preview:['四区肉鸽远征 · 原创泡泡世界','FOUR-REGION ROGUELITE EXPEDITION'],
    intro:['穿越泡泡世界，击破、吸收，让小小泡泡进化成你的战争机器。','Cross the bubble world. Shoot, absorb and evolve a tiny bubble into your own war machine.'],
    chooseChassis:['选择初始机体','Choose your chassis'],begin:['开始探索','Begin exploration'],paused:['探索已暂停','Exploration paused'],
    pausedDetail:['你的泡泡世界正在等你。暂停时敌人、弹体和冷却均停止。','Your bubble world can wait. Enemies, projectiles and cooldowns are frozen.'],
    resume:['继续探索','Continue'],restart:['重新开始','New expedition'],evolution:['泡泡进化','BUBBLE EVOLUTION'],chooseUpgrade:['选择一个模块','Choose one module'],
    upgradeNote:['战斗已暂停。模块会改变你的真实攻击与泡泡结构。','Combat is paused. Modules change your real attacks and bubble structure.'],
    endLabel:['本次探索结束','EXPEDITION ENDED'],lost:['泡泡散落了','Your bubbles scattered'],again:['再来一次','Try again'],build:['当前构筑','BUILD'],
    autoFire:['自动开火 · 吸收泡泡 · 跨越边界','AUTO-FIRE · ABSORB · CROSS THE BOUNDARY'],
    desktop:['WASD / 方向键移动 · 鼠标可瞄准 · SPACE 冲刺 · E 技能','WASD / arrows · Mouse aim · SPACE dash · E skill'],
    mobile:['摇杆移动，自动瞄准开火；按钮冲刺／技能，可在暂停中启用双摇杆。','Move with the stick. Auto-aim and fire; dash or skill. Dual sticks are optional.'],dash:['冲刺','Dash'],shieldSkill:['超载护盾','Overload shield'],
    footer:['致敬 Bubble Tanks · 原创代码、矢量泡泡与合成音效 · 非官方作品','Inspired by Bubble Tanks · Original code, vectors & synthesized audio · Unofficial'],
    power:['功率','Power'],growth:['进化','Evolution'],shield:['护盾','Shield'],startRoom:['起始泡泡','Starting bubble'],combatRoom:['战斗泡泡','Combat bubble'],cacheRoom:['泡泡宝藏','Bubble cache'],
    soundOn:['音效：开','Sound: on'],soundOff:['音效：关','Sound: off'],assistOn:['瞄准：自动辅助','Aim: assisted'],assistOff:['瞄准：鼠标锁定','Aim: mouse lock'],
    dormant:['休眠','Dormant'],splitLink:['散射 × 分裂','Fan × Split'],arcLink:['电弧 × 导电','Arc × Conductive']
  };
  const iconPaths = {
    pulse:'<circle cx="18" cy="24" r="10"/><path d="M27 20h12v8H27"/><circle cx="45" cy="24" r="3"/>',
    scatter:'<circle cx="15" cy="25" r="8"/><path d="M22 25l16-14M22 25h20M22 25l16 14"/><circle cx="42" cy="9" r="3"/><circle cx="46" cy="25" r="3"/><circle cx="42" cy="41" r="3"/>',
    arc:'<circle cx="10" cy="34" r="5"/><path d="M13 30l9-12-1 11 12-13-1 10 9-13"/><circle cx="45" cy="9" r="5"/>',
    split:'<circle cx="12" cy="25" r="7"/><path d="M19 25h8m0 0l9-11m-9 11l9 11"/><circle cx="41" cy="10" r="6"/><circle cx="41" cy="40" r="6"/>',
    rapid:'<path d="M8 15h20M4 25h24M8 35h20"/><circle cx="39" cy="25" r="10"/><path d="M39 18v7l5 4"/>',
    magnet:'<path d="M10 11v17a15 15 0 0030 0V11h-9v17a6 6 0 01-12 0V11z"/><path d="M10 19h9m12 0h9"/>',
    shield:'<circle cx="25" cy="25" r="18" stroke-dasharray="5 3"/><circle cx="25" cy="25" r="10"/>',
    thruster:'<circle cx="32" cy="25" r="12"/><path d="M20 20L7 16l6 9-6 9 13-4M32 20l6 5-6 5"/>'
  };
  function create(handlers) {
    const el = id => document.querySelector('#' + id);

    function text(id,value){const node=el(id),next=String(value);if(node.textContent!==next)node.textContent=next;}
    let language = '', cardKey = '', buildKey = '';
    const txt = (key, lang) => D.text(dictionary[key] || B.DetailUI.dictionary[key], lang);
    const detail = B.DetailUI.create(handlers);
    for (const [id, action] of Object.entries({confirmNewButton:'confirmNew',cancelNewButton:'cancelNew',startButton:'start',pauseButton:'pause',resumeButton:'resume',restartButton:'restart',newRunButton:'again',languageButton:'language',soundButton:'sound',aimButton:'aim',dualStickButton:'dualStick',handButton:'hand',qualityButton:'quality',rerollButton:'reroll',skipButton:'skip'})) {
      el(id).addEventListener('click', () => handlers.action(action));
    }
    el('skillSelect').addEventListener('change',()=>handlers.action('equip:'+el('skillSelect').value));
    function translate(lang) {
      for (const label of document.querySelectorAll('[data-i18n]')) label.textContent = txt(label.dataset.i18n, lang);
      document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
      text('languageButton',lang === 'en' ? '中文' : 'EN');
      el('languageButton').setAttribute('aria-label', lang === 'en' ? 'Switch to Chinese' : '切换英语');
      const select = el('chassisSelect'), previous = select.value;
      select.replaceChildren();
      for (const chassis of D.chassis) {
        const option = document.createElement('option'); option.value = chassis.id;
        option.textContent = D.text(chassis.name, lang) + ' · ' + D.text(chassis.description, lang);
        select.append(option);
      }
      select.value = D.chassis.some(c => c.id === previous) ? previous : 'balanced';
    }
    function choices(state) {
      el('upgradeChoices').replaceChildren();
      for (const item of state.offers || []) {
        const card = document.createElement('button'); card.type = 'button'; card.className = 'upgrade-choice'; card.dataset.upgrade = item.id;
        const mark = document.createElement('span'); mark.setAttribute('aria-hidden','true');
        mark.innerHTML = `<svg viewBox="0 0 50 50" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${B.Visuals.icon(item)}</svg>`;
        const copy = document.createElement('span'), heading = document.createElement('b'), description = document.createElement('span');
        heading.textContent = D.text(item.name, state.lang) + (R.rank(state.player, item.id) ? ` +${R.rank(state.player, item.id) + 1}` : '');
        description.textContent = D.text(item.description, state.lang);
        const insight=document.createElement('small');insight.className='upgrade-insight';insight.textContent=B.Insight.preview(state.player,item,state.lang).lines.join(' · ');
        copy.append(heading, description,insight); card.append(mark, copy);
        card.addEventListener('click', () => handlers.choose(item.id));
        el('upgradeChoices').append(card);
      }
    }
    function build(state) {
      const p = state.player, active = R.activeLoadout(p); el('buildChips').replaceChildren();
      function chip(text, cls = '') {const item = document.createElement('span'); item.textContent = text; item.className = cls; el('buildChips').append(item);}
      for (const gun of p.loadout) {
        const dormant = !active.includes(gun);
        chip(D.text(D.guns.find(g => g.id === gun.id)?.name || gun.id, state.lang) + ` ${gun.level}` + (dormant ? ' · ' + txt('dormant',state.lang) : ''), dormant ? 'dormant' : '');
      }
      for (const [id, level] of Object.entries(p.passives)) chip(D.text(D.passives.find(g => g.id === id)?.name || id, state.lang) + ` ${level}`);
      chip(D.text(D.skills.find(s=>s.id===p.skill).name,state.lang));
      for(const id of Object.keys(p.relics))chip(D.text(D.relics.find(r=>r.id===id).name,state.lang));
      for(const link of B.Visuals.links(p,D,R))chip(D.text(link.name,state.lang),'synergy');
    }
    function update(state, settings) {
      const p = state.player, room = W.current(state.world), lang = state.lang;
      if (language !== lang) {language = lang; translate(lang); cardKey = buildKey = '';}
      for (const [id, mode] of Object.entries({titlePanel:'title',pausePanel:'paused',upgradePanel:'upgrade',resultPanel:'over'})) el(id).hidden = state.mode !== mode;
      el('pauseButton').disabled = !['running','paused'].includes(state.mode);
      text('massValue',String(Math.round(p.mass)));
      text('tierValue',['I','II','III','IV','V','VI'][R.tier(p.mass)] + (R.tier(p.mass)<5 ? ` → ${R.THRESHOLDS[R.tier(p.mass)+1]}` : ''));
      text('clearValue',String(state.world.cleared));
      text('roomValue',`${room.x}, ${room.y}`);
      text('roomLabel',`${room.zone+1}/4 · `+txt({start:'startRoom',combat:'combatRoom',cache:'cacheRoom'}[room.type]||room.type, lang));
      const active=R.activeLoadout(p),sleeping=p.loadout.filter(g=>!active.includes(g));
      el('battleHud').hidden=state.mode!=='running';
      text('combatNotice',p.powerGrace>0&&R.effectivePower(p)>R.power(p)?`${lang==='en'?'Power buffer':'供能缓冲'} ${p.powerGrace.toFixed(1)}s`:sleeping.length?sleeping.map(g=>D.text(D.guns.find(d=>d.id===g.id).name,lang)).join(' / ')+(lang==='en'?' sleeping · restore mass':'休眠 · 吸收质量恢复供能'):'');
      const boss=room.enemies.find(e=>e.kind==='boss'&&e.hp>0);text('bossHint',boss?D.text(B.Bosses.definitions[boss.zone].name,lang)+` · ${lang==='en'?'Phase':'阶段'} ${boss.stage} · `+D.text(B.Bosses.definitions[boss.zone].tip,lang):'');
      el('bossHealth').hidden=!boss;if(boss){const health=Math.max(0,boss.hp/boss.maxHp)*100;el('bossHealthFill').style.width=health+'%';el('bossHealth').setAttribute('aria-valuenow',String(Math.round(health)));}
      text('powerValue',`${txt('power',lang)} ${R.activeLoadout(p).reduce((s,g) => s + g.cost, 0)} / ${R.effectivePower(p)}`);
      const growthSpan=12+6*(state.level+state.pending-1),growthStart=state.nextGrowth-growthSpan,progress=R.clamp(p.growth-growthStart,0,growthSpan);
      text('growthLabel',`${lang==='en'?'Level progress':'本级进化'} ${Math.floor(progress)} / ${growthSpan}`);
      el('growthFill').style.width = `${progress/growthSpan*100}%`;
      text('shieldValue',`${txt('shield',lang)} ${Math.ceil(p.shield)} · ${txt('salvage',lang)} ${state.salvage} · ${lang==='en'?'Rescue':'救援'} ${state.rescueLeft}`);
      el('dashButton').disabled = state.mode !== 'running' || p.dashClock > 0;
      el('skillButton').disabled = state.mode !== 'running' || p.skillClock > 0;
      text('dashClock',p.dashClock > 0 ? `${p.dashClock.toFixed(1)}s` : 'SPACE');
      text('skillName',D.text(D.skills.find(s=>s.id===p.skill).name,lang));
      el('rerollButton').disabled=state.rerolls<=0;text('rerollButton',(lang==='en'?'Reroll · ':'重掷 · ')+state.rerolls);
      text('skipButton',lang==='en'?'Skip · salvage +1':'弃选 · 回收 +1');
      text('dualStickButton',lang==='en'?(settings.dualStick?'Dual sticks':'Single stick'):(settings.dualStick?'双摇杆':'单摇杆'));
      text('handButton',lang==='en'?(settings.leftHand?'Right-hand move':'Left-hand move'):(settings.leftHand?'右手移动':'左手移动'));
      text('qualityButton',lang==='en'?(settings.quality==='low'?'Quality: low':'Quality: normal'):(settings.quality==='low'?'画质：低':'画质：标准'));
      const skillKey=lang+':'+p.skills.join(',');if(el('skillSelect').dataset.key!==skillKey){el('skillSelect').replaceChildren();for(const id of p.skills){const option=document.createElement('option');option.value=id;option.textContent=D.text(D.skills.find(s=>s.id===id).name,lang);el('skillSelect').append(option);}el('skillSelect').dataset.key=skillKey;}el('skillSelect').value=p.skill;
      text('skillClock',p.skillClock > 0 ? `${p.skillClock.toFixed(1)}s` : 'E');
      el('dashClock').dataset.ready = String(p.dashClock <= 0);
      el('skillClock').dataset.ready = String(p.skillClock <= 0);
      text('soundButton',txt(settings.sound ? 'soundOn' : 'soundOff',lang));
      text('aimButton',txt(settings.assist ? 'assistOn' : 'assistOff',lang));
      const nextCard = `${lang}:${state.mode}:${(state.offers || []).map(u => u.id + R.rank(p,u.id)).join(',')}`;
      if (nextCard !== cardKey) {cardKey = nextCard; if (state.mode === 'upgrade') choices(state);}
      const nextBuild = `${lang}:${R.effectivePower(p)}:${JSON.stringify(p.loadout)}:${JSON.stringify(p.passives)}:${p.skill}:${JSON.stringify(p.relics)}:${JSON.stringify(p.branches)}`;
      if (nextBuild !== buildKey) {buildKey = nextBuild; build(state);}
      detail.update(state, settings);
      el('confirmPanel').hidden=!state.confirmNew;
      if(state.confirmNew){el('titlePanel').hidden=true;el('pausePanel').hidden=true;}
    }
    return {update};
  }
  B.UI = {create, icons: iconPaths};
})();
