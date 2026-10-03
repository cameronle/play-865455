(() => {
  'use strict';
  const B = window.BubbleFrontier, R = B.Rules, W = B.World;
  const TAU = Math.PI * 2;
  function create(canvas) {
    const ctx = canvas.getContext('2d', {alpha: false});
    let palette;
    function refresh() {
      const css = getComputedStyle(document.documentElement);
      palette = Object.fromEntries(['field', 'field-deep', 'player', 'hostile', 'drop'].map(k => [k, css.getPropertyValue('--' + k).trim()]));
    }
    refresh();
    function circle(x, y, r, color, opacity = 0.14, width = 1.6) {
      ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.globalAlpha *= opacity; ctx.fill(); ctx.globalAlpha /= opacity || 1; ctx.stroke();
      ctx.globalAlpha *= 0.7; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(x - r * 0.06, y - r * 0.06, r * 0.68, Math.PI * 1.05, Math.PI * 1.48); ctx.stroke(); ctx.restore();
    }
    function label(text, x, y, size = 12, color = '#d5edfb', alpha = 0.6, align = 'center') {
      ctx.save(); ctx.fillStyle = color; ctx.globalAlpha = alpha; ctx.font = `${size}px system-ui,sans-serif`; ctx.textAlign = align; ctx.fillText(text, x, y); ctx.restore();
    }
    function line(points){ctx.beginPath();ctx.moveTo(...points[0]);for(const point of points.slice(1))ctx.lineTo(...point);ctx.stroke();}
    function gunShape(gun){
      const col=palette.player;
      if(gun.id==='pulse'){line([[5,-3],[21,-3],[21,3],[5,3]]);}
      else if(gun.id==='twin'){for(const y of [-5,5])line([[5,y-2],[23,y-2],[23,y+2],[5,y+2]]);}
      else if(gun.id==='scatter'){for(const a of [-.25,0,.25]){ctx.save();ctx.rotate(a);line([[6,-2],[24,-2],[24,2],[6,2]]);ctx.restore();}}
      else if(gun.id==='stream'){circle(16,0,7,col,.08);for(const y of [-4,0,4])line([[16,y],[28,y]]);}
      else if(gun.id==='needle'){line([[6,-2],[29,-2],[34,0],[29,2],[6,2]]);circle(9,0,5,col,.08);}
      else if(gun.id==='pierce'){line([[6,-4],[29,-4],[33,0],[29,4],[6,4]]);line([[13,-6],[13,6]]);line([[20,-6],[20,6]]);}
      else if(gun.id==='missile'){for(const y of [-6,6]){circle(15,y,5,col,.1);line([[15,y],[25,y],[29,y-2]]);}}
      else if(gun.id==='beam'){circle(18,0,8,col,.1);line([[6,-5],[25,-5]]);line([[6,5],[25,5]]);circle(23,0,3,col,.1);}
      else if(gun.id==='arc'){circle(14,0,4,col,.15);circle(24,0,3,col,.2);line([[5,0],[12,-4],[17,3],[24,0]]);}
      else if(gun.id==='mine'){circle(15,0,8,col,.15);for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5])line([[15+Math.cos(a)*8,Math.sin(a)*8],[15+Math.cos(a)*12,Math.sin(a)*12]]);}
      else if(gun.id==='orbit'){circle(16,0,10,col,.03);circle(6,0,3,col,.2);circle(26,0,3,col,.2);circle(16,0,4,col,.1);}
      else if(gun.id==='vortex'){ctx.beginPath();for(let i=0;i<40;i++){const a=i*.23,r=2+i*.22,x=16+Math.cos(a)*r,y=Math.sin(a)*r;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.stroke();}
    }
    function tank(player, time) {
      const circles = R.bodyCircles(player), maxR = Math.max(...circles.map(c => Math.hypot(c.x, c.y) + c.r));
      ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.angle);
      if (player.invulnerable > 0 && Math.floor(time * 9) % 2) ctx.globalAlpha = 0.68;
      if (player.shield > 0) {
        ctx.save(); ctx.strokeStyle = palette.player; ctx.lineWidth = 1.4; ctx.globalAlpha *= 0.65; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(0, 0, maxR + 8, 0, TAU); ctx.stroke(); ctx.restore();
      }
      for (let i = circles.length - 1; i >= 0; i--) {
        const c = circles[i]; circle(c.x, c.y, c.r, palette.player, i === 0 ? 0.34 : 0.13, i === 0 ? 2.8 : 1.9);
      }
      ctx.fillStyle = palette.player; ctx.beginPath(); ctx.arc(0, 0, 3.2, 0, TAU); ctx.fill();
      const active = R.activeLoadout(player);
      for (const gun of player.loadout) {
        ctx.save(); if (!active.includes(gun)) ctx.globalAlpha *= 0.3;
        const mount = R.mount(gun);
        ctx.translate(mount.x, mount.y); ctx.rotate(gun.angle || 0); ctx.translate(-18, 0);
        ctx.strokeStyle = palette.player; ctx.lineWidth = 1.4;
        gunShape(gun);
        ctx.restore();
      }
      ctx.restore();
    }
    function enemy(e) {
      if (e.hp <= 0) return;
      ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.kind === 'boss' ? 0 : e.kind === 'spinner' ? e.phase : e.angle);
      const col = e.hit > 0 ? '#ffdcaf' : palette.hostile;
      if (e.kind === 'boss') {
        if (e.zone === 0) {ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, e.r + 13, e.guardAngle + 0.67, e.guardAngle + TAU - 0.67); ctx.stroke();}
        else if (e.zone === 1) {circle(0, 0, e.r * 0.7, col, 0.08); for (let i = 0; i < 3; i++) {const a = i * TAU / 3; circle(Math.cos(a) * 17, Math.sin(a) * 17, 10, col, 0.16);}}
        else if (e.zone === 2) {ctx.setLineDash([6, 8]); circle(0, 0, e.r + 10, col, 0.02); ctx.setLineDash([]); circle(0, 0, e.r * 0.55, col, 0.06);}
        else {for (let i = 0; i < 6; i++) {const a = e.phase * 0.15 + i * TAU / 6; circle(Math.cos(a) * e.r * 0.55, Math.sin(a) * e.r * 0.55, e.r * 0.32, col, 0.09);} circle(0, 0, 12, col, 0.35);}
      } else if (e.kind === 'pod' || e.kind === 'core') {
        circle(0, 0, e.r * 0.6, col, 0.12); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-e.r, 0); ctx.lineTo(e.r, 0); ctx.stroke();
      } else if (e.kind === 'spinner') {
        for (let i = 0; i < 6; i++) {const a = i * TAU / 6; circle(Math.cos(a) * e.r, Math.sin(a) * e.r, e.r * 0.36, col, 0.12);}
      } else if (e.kind === 'grazer') {
        circle(-e.r * 0.7, -e.r * 0.5, e.r * 0.55, col, 0.09); circle(-e.r * 0.7, e.r * 0.5, e.r * 0.55, col, 0.09);
      } else if (e.kind === 'chaser') {
        circle(-e.r, -e.r * 0.5, e.r * 0.5, col, 0.11); circle(-e.r, e.r * 0.5, e.r * 0.5, col, 0.11);
        ctx.strokeStyle = col; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(3, -6); ctx.lineTo(e.r + 6, 0); ctx.lineTo(3, 6); ctx.stroke();
      } else if (e.kind === 'sniper') {
        circle(-e.r, 0, e.r * 0.6, col, 0.09); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(4, -3); ctx.lineTo(e.r + 15, -3); ctx.lineTo(e.r + 15, 3); ctx.lineTo(4, 3); ctx.stroke();
      } else {
        circle(-e.r * 0.7, 0, e.r * 0.65, col, 0.12); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(6, -4); ctx.lineTo(e.r + 8, -4); ctx.lineTo(e.r + 8, 4); ctx.lineTo(6, 4); ctx.stroke();
      }
      circle(0, 0, e.r, col, 0.13, 2);
      ctx.strokeStyle=col;
      if(e.kind==='guardian'||e.kind==='reflector'){ctx.lineWidth=e.kind==='reflector'?3:4;ctx.beginPath();ctx.arc(0,0,e.r+6,-1.05,1.05);ctx.stroke();if(e.kind==='reflector')line([[e.r,-8],[e.r+12,0],[e.r,8]]);}
      else if(e.kind==='scatterer'){for(const a of [-.4,0,.4]){ctx.save();ctx.rotate(a);line([[5,0],[e.r+10,0]]);ctx.restore();}}
      else if(e.kind==='spawner'){for(const a of [1.2,Math.PI,-1.2])circle(Math.cos(a)*e.r,Math.sin(a)*e.r,7,col,.12);}
      else if(e.kind==='miner'){circle(-e.r,0,9,col,.15);line([[-e.r-12,-4],[-e.r-4,4]]);line([[-e.r-12,4],[-e.r-4,-4]]);}
      else if(e.kind==='splitter'){for(const y of [-10,10])circle(-e.r*.6,y,e.r*.65,col,.09);line([[-e.r*1.4,0],[0,0]]);}
      else if(e.kind==='laser'){line([[4,-8],[e.r+16,-8],[e.r+16,8],[4,8]]);circle(e.r+12,0,6,col,.05);}
      else if(e.kind==='vortexer'){ctx.beginPath();ctx.arc(0,0,e.r+8,.4,Math.PI*1.6);ctx.stroke();circle(0,0,e.r*.4,col,.03);}
      else if(e.kind==='bomber'){for(let i=0;i<8;i++){const a=i*TAU/8;line([[Math.cos(a)*e.r,Math.sin(a)*e.r],[Math.cos(a)*(e.r+8),Math.sin(a)*(e.r+8)]]);}circle(0,0,4,col,.3);}
      else if(e.kind==='healer'){line([[-10,0],[10,0]]);line([[0,-10],[0,10]]);circle(-e.r,0,5,palette.drop,.15);}
      else if(e.kind==='leecher'){line([[e.r,-11],[e.r+10,-11],[e.r+10,11],[e.r,11]]);circle(-e.r,0,4,col,.2);}
      else if(e.kind==='lobber'){circle(-5,-e.r*.8,10,col,.15);line([[-5,-e.r*.8],[e.r+14,-e.r*.8]]);}
      else if(e.kind==='teleporter'){ctx.setLineDash([4,4]);circle(0,0,e.r+9,col,.03);ctx.setLineDash([]);circle(-e.r,0,5,col,.09);}
      else if(e.kind==='breaker'){line([[4,-5],[e.r+17,0],[4,5]]);line([[e.r,-9],[e.r,9]]);}
      else if(e.kind==='escort'){circle(0,e.r+7,8,col,.09);circle(0,-e.r-7,8,col,.09);line([[0,-e.r-7],[0,e.r+7]]);}
      if(e.mark>0){ctx.setLineDash([3,3]);circle(0,0,e.r+11,palette.drop,.02);ctx.setLineDash([]);}if(e.frozen>0){line([[-8,-8],[8,8]]);line([[-8,8],[8,-8]]);}
      if (e.warning) {ctx.globalAlpha = 0.75; circle(0, 0, e.r + 5, col, 0.08, 1);}
      ctx.restore();
      if (e.hp < e.maxHp) {ctx.save(); ctx.strokeStyle = palette.hostile; ctx.lineWidth = 2; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 5, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0, e.hp / e.maxHp)); ctx.stroke(); ctx.restore();}
    }
    function fx(f) {
      const progress = 1 - f.ttl / f.duration;
      ctx.save(); ctx.globalAlpha = Math.min(1, f.ttl / f.duration); ctx.strokeStyle = f.color === 'enemy' ? palette.hostile : palette.player; ctx.lineWidth = 1.3;
      if(['beam','enemyBeam','healLink','drain','playerAim'].includes(f.kind)){
        ctx.strokeStyle=['enemyBeam','drain'].includes(f.kind)?palette.hostile:f.kind==='healLink'?palette.drop:palette.player;ctx.lineWidth=f.kind==='beam'?4:f.kind==='enemyBeam'?5:2;if(f.kind==='playerAim')ctx.setLineDash([4,6]);line([[f.x,f.y],[f.toX??f.x+Math.cos(f.angle)*f.length,f.toY??f.y+Math.sin(f.angle)*f.length]]);
      }else if(['bombWarning','warpMark','enemyPullWarning','fuse','enemyBlast','enemyPull','coldfield','tail'].includes(f.kind)){
        const cold=f.kind==='coldfield'||f.kind==='tail';ctx.strokeStyle=cold?palette.player:palette.hostile;ctx.setLineDash(['bombWarning','warpMark','enemyPullWarning','fuse'].includes(f.kind)?[6,5]:[]);circle(f.x,f.y,f.r,ctx.strokeStyle,.08,1.5);if(f.kind==='enemyPull'||f.kind==='coldfield')for(let i=0;i<3;i++){const a=progress*TAU+i*TAU/3;circle(f.x+Math.cos(a)*f.r*.65,f.y+Math.sin(a)*f.r*.65,4,ctx.strokeStyle,.1);}
      }else if(f.kind==='decoy'){ctx.setLineDash([4,4]);circle(f.x,f.y,18,palette.player,.08);circle(f.x-10,f.y+12,9,palette.player,.05);}
      else if (f.kind === 'aim') {
        ctx.strokeStyle = palette.hostile; ctx.globalAlpha *= 0.48; ctx.setLineDash([5, 7]); ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + Math.cos(f.angle) * f.length, f.y + Math.sin(f.angle) * f.length); ctx.stroke();
      } else if (f.kind === 'hazard') {
        ctx.strokeStyle = palette.hostile; ctx.fillStyle = palette.hostile; ctx.lineWidth = f.danger ? 2.5 : 1.4;
        ctx.setLineDash(f.warning ? [5, 6] : []); ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, TAU); ctx.stroke();
        if (f.danger) {ctx.globalAlpha = 0.1; ctx.fill();}
      } else if (f.kind === 'arc') {
        const dx = f.toX - f.x, dy = f.toY - f.y, d = Math.hypot(dx, dy) || 1;
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(f.x, f.y);
        for (let i = 1; i <= 7; i++) {const t = i / 8, kink = i % 2 ? 7 : -7; ctx.lineTo(f.x + dx * t - dy / d * kink, f.y + dy * t + dx / d * kink);}
        ctx.lineTo(f.toX, f.toY); ctx.stroke();
      } else if (f.kind === 'burst' || f.kind === 'split') {
        for (let i = 0; i < 7; i++) {const a = i * TAU / 7, d = (f.r || 20) * (0.4 + progress * 1.8); circle(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, 3 + 3 * (1 - progress), ctx.strokeStyle, 0.1, 1.1);}
      } else {
        ctx.beginPath(); ctx.arc(f.x, f.y, (f.r || 25) * (0.5 + progress * 1.5), 0, TAU); ctx.stroke();
      }
      ctx.restore();
    }
    function drawRoom(room, state, xShift = 0, yShift = 0, player = true) {
      ctx.save(); ctx.translate(xShift, yShift);
      ctx.strokeStyle = '#c5e7fa'; ctx.fillStyle = '#e9f7ff'; ctx.lineWidth = 1.7;
      ctx.globalAlpha = 0.055; ctx.beginPath(); ctx.arc(400, 400, 350, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.36; ctx.stroke();
      ctx.globalAlpha = 0.08; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(400, 400, 338, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
      for (const direction of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        const [dx, dy] = direction;
        ctx.save(); ctx.translate(400 + dx * 362, 400 + dy * 362); ctx.rotate(Math.atan2(dy, dx));
        const blocked = !W.canEnter(state.world, room.x + dx, room.y + dy) || room.type === 'boss' && !room.cleared;
        ctx.strokeStyle = blocked ? palette.hostile : '#ceeafa'; ctx.globalAlpha = blocked ? 0.65 : 0.42; ctx.lineWidth = 1.7; ctx.beginPath();
        if (blocked) {ctx.moveTo(0, -6); ctx.lineTo(0, 6);} else {ctx.moveTo(-4, -5); ctx.lineTo(3, 0); ctx.lineTo(-4, 5);} ctx.stroke(); ctx.restore();
      }
      if (room.type === 'start') {label(state.lang === 'en' ? 'COLLECT · GROW · CROSS THE BOUNDARY' : '吸收泡泡 · 进化 · 跨越边界', 400, 470, 16, '#daf0fc', 0.55);}
      if (room.cleared && room.type !== 'start' && !room.drops.length) label(state.lang === 'en' ? 'CLEAR BUBBLE' : '泡泡已清空', 400, 660, 14, '#caecf3', 0.4);
      if (room.type === 'challenge' && !room.cleared) label(state.lang === 'en' ? 'BONUS: NO HIT · UNDER 35s' : '奖励目标：无损清空 · 35秒内', 400, 110, 14, palette.drop, 0.7);
      if (room.type === 'workshop' || room.type === 'event') label(state.lang === 'en' ? 'SAFE BUBBLE · USE THE ROOM BUTTON' : '安全泡泡 · 点击上方房间按钮', 400, 510, 16, palette.drop, 0.65);
      for (const drop of room.drops) {
        ctx.save(); ctx.strokeStyle = drop.source === 'self' ? palette.player : palette.drop;
        if (drop.source === 'self') {ctx.setLineDash([2, 2]); ctx.globalAlpha = 0.62;}
        circle(drop.x, drop.y, drop.r || 5, ctx.strokeStyle, 0.12, 1.4); ctx.restore();
      }
      for (const e of room.enemies) enemy(e);
      for (const shot of room.shots) {
        if(shot.delay>0)continue;
        const col = shot.owner === 'enemy' ? palette.hostile : palette.player;
        ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = shot.owner === 'enemy' ? 1.6 : 1.5;
        ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.moveTo(shot.x - shot.vx * 0.022, shot.y - shot.vy * 0.022); ctx.lineTo(shot.x, shot.y); ctx.stroke(); ctx.restore();
        if(shot.weapon==='vortex'){circle(shot.x,shot.y,shot.fieldRadius,col,.03,1.1);for(let i=0;i<3;i++){const a=state.time*2+i*TAU/3;circle(shot.x+Math.cos(a)*shot.fieldRadius*.6,shot.y+Math.sin(a)*shot.fieldRadius*.6,5,col,.05);}}
        if(['mine','hostile_mine'].includes(shot.weapon)){ctx.save();ctx.strokeStyle=col;ctx.setLineDash(shot.arm>0?[3,4]:[]);circle(shot.x,shot.y,shot.r+5,col,.07);ctx.restore();}
        if(shot.owner==='enemy'){ctx.save();ctx.strokeStyle=palette['field-deep'];ctx.lineWidth=5;ctx.beginPath();ctx.arc(shot.x,shot.y,shot.r,0,TAU);ctx.stroke();ctx.restore();}
        circle(shot.x, shot.y, shot.r, col, shot.owner === 'enemy' ? 0.72 : 0.38, shot.owner==='enemy'?2.3:1.2);
        if (shot.owner === 'enemy') {ctx.save(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(shot.x, shot.y, Math.max(1.4, shot.r * 0.32), 0, TAU); ctx.fill(); ctx.restore();}
      }
      for (const f of room.effects) if(state.quality!=='low'||!['muzzle','split','burst'].includes(f.kind))fx(f);
      if(state.player.barrierTime>0){const p=state.player;ctx.save();ctx.strokeStyle=palette.player;ctx.lineWidth=3;ctx.globalAlpha=.75;ctx.beginPath();ctx.arc(p.x,p.y,p.barrierRadius,p.angle+p.barrierGap,p.angle+TAU-p.barrierGap);ctx.stroke();ctx.restore();}
      if(state.player.overdriveTime>0)circle(state.player.x,state.player.y,42,palette.drop,.02,2);
      if (player) {
        tank(state.player, state.time);
        if (room.time < 4 && state.mode !== 'title') label(state.lang === 'en' ? 'YOU' : '你', state.player.x, state.player.y + 49, 18, palette.player, 0.9);
      }
      ctx.restore();
    }
    function minimap(state) {
      const p = state.world.position, left = 643, top = 41, cell = 17;
      ctx.save(); ctx.fillStyle = palette['field-deep']; ctx.globalAlpha = 0.65; ctx.fillRect(left - 10, top - 12, 127, 134); ctx.globalAlpha = 1;
      label(state.lang === 'en' ? 'BUBBLE MAP' : '泡泡地图', left + 52, top + 1, 10, '#deeffa', 0.6);
      for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) {
        const room = state.world.rooms[W.key(p.x + x, p.y + y)], cx = left + 51 + x * cell, cy = top + 69 + y * cell;
        if (!room?.visited && !room?.scanned && (Math.abs(x) + Math.abs(y) !== 1)) continue;
        ctx.globalAlpha = room?.visited ? 0.65 : 0.16; ctx.strokeStyle = room?.cleared ? palette.drop : '#dfebf8'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, room?.type === 'cache' ? 5.5 : 4, 0, TAU); ctx.stroke();
        if (x === 0 && y === 0) {ctx.globalAlpha = 0.9; ctx.fillStyle = palette.player; ctx.beginPath(); ctx.arc(cx, cy, 2, 0, TAU); ctx.fill();}
      }
      ctx.restore();
    }
    function draw(state) {
      ctx.fillStyle = palette.field; ctx.fillRect(0, 0, 800, 800);
      ctx.save(); ctx.strokeStyle = '#b6d9ee'; ctx.globalAlpha = 0.1; ctx.lineWidth = 1;
      for (const [x, y] of [[-300, 400], [1100, 400], [400, -300], [400, 1100]]) {ctx.beginPath(); ctx.arc(x, y, 350, 0, TAU); ctx.stroke();}
      ctx.restore();
      const room = W.current(state.world), t = state.transition;
      if (t) {
        const p = R.clamp(1 - t.ttl / t.duration, 0, 1), e = p * p * (3 - 2 * p);
        drawRoom(t.from, state, -t.dx * 700 * e, -t.dy * 700 * e, false);
        drawRoom(room, state, t.dx * 700 * (1 - e), t.dy * 700 * (1 - e), true);
      } else drawRoom(room, state);
      minimap(state);
      if (state.noticeTime > 0) {
        const text = {clear: ['泡泡已清空 · 自动吸收', 'CLEAR · BUBBLES DRAWN IN'], grow: ['泡泡体量进化', 'BODY EVOLVED'], shrink: ['体量退化 · 模块保留', 'BODY SHRUNK · BUILD KEPT'], hit: ['泡泡质量流失', 'BUBBLES LOST'], seal: ['击破本区 Boss 后开放下一环', 'CLEAR THE BOSS TO OPEN THE NEXT RING'], 'boss-clear': ['区域已突破 · 下一环开放', 'REGION CLEARED · NEXT RING OPEN']}[state.notice];
        if (text) label(text[state.lang === 'en' ? 1 : 0], 400, 720, 15, state.notice === 'shrink' ? palette.hostile : palette.player, Math.min(0.8, state.noticeTime));
      }
    }
    return {draw, refresh};
  }
  B.Render = {create};
})();
