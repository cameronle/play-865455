(function (root, factory) {
  'use strict';
  const node = typeof module === 'object' && module.exports;
  const api = factory(node ? require('./rules.js') : root.FishFeast.Rules);
  if (node) module.exports = api;
  else root.FishFeast.Render = api;
})(globalThis, function (R) {
  'use strict';
  const palettes = {
    light: { water: '#eaf4f5', floor: '#d4e8e7', ink: '#24464d', player: '#258ab2', mint: '#72b69c', gold: '#dfad52', silver: '#91afbb', coral: '#dc8970', violet: '#9a8bc0', warning: '#c55744', mark: '#ffffff' },
    dark: { water: '#0d202b', floor: '#18313a', ink: '#d4eaf0', player: '#62cbea', mint: '#71b49d', gold: '#d3b263', silver: '#8ba8b4', coral: '#d68b7a', violet: '#aa9bc7', warning: '#ffac88', mark: '#12343f' }
  };
  const forms = {
    player: { back: 'soft', tail: 'crescent', length: .95, spread: .90, top: 1.28 },
    slender: { back: 'low', tail: 'split', length: 1.15, spread: .94, top: 1.12 },
    round: { back: 'dome', tail: 'fan', length: .80, spread: .85, top: 1.38 },
    forked: { back: 'swept', tail: 'fork', length: 1.12, spread: 1.02, top: 1.48 },
    tall: { back: 'sail', tail: 'fan', length: .70, spread: .67, top: 1.68 },
    pointed: { back: 'blade', tail: 'deepFork', length: 1.28, spread: 1.10, top: 1.85 },
    dart: { back: 'notch', tail: 'fork', length: 1.35, spread: 1.28, top: 1.34 },
    stream: { back: 'ribbon', tail: 'split', length: 1.52, spread: 1.25, top: 1.42 },
    hooked: { back: 'hook', tail: 'deepFork', length: 1.05, spread: .88, top: 1.76 },
    broad: { back: 'ridge', tail: 'fan', length: .64, spread: 1.05, top: 1.16 },
    jelly: { back: 'bell', tail: 'none', length: 0, spread: 0, top: 1.16 }
  };
  function form(f) {
    return { ...R.geometry(f), ...(forms[f.shape] || forms.player) };
  }
  function polygon(ctx, points) {
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    ctx.closePath();
    ctx.fill();
  }
  function silhouette(ctx, g, wiggle) {
    const { rx, ry, half: h } = g;
    const angle = .40, joinX = -h - Math.cos(angle) * ry, joinY = Math.sin(angle) * ry;
    const neckX = -rx - ry * .18, tailX = -rx - ry * g.length, tailY = ry * g.spread;
    // One filled outline joins body, dorsal fin, tapered tail root and tail.
    // Both semicircles and the full capsule core remain exactly R.geometry.
    // Only decorative fins/tail extend outside the unchanged contact body.
    ctx.beginPath();
    ctx.moveTo(joinX, -joinY);
    ctx.arc(-h, 0, ry, Math.PI + angle, Math.PI * 1.5);
    switch (g.back) {
      case 'notch':
        ctx.lineTo(-h * .45, -ry * 1.34);
        ctx.lineTo(0, -ry * 1.03);
        ctx.lineTo(h * .22, -ry * 1.27);
        ctx.lineTo(h, -ry);
        break;
      case 'ribbon':
        ctx.bezierCurveTo(-h * .8, -ry * 1.5, -h * .25, -ry * 1.45, 0, -ry);
        ctx.quadraticCurveTo(h * .38, -ry * 1.27, h, -ry);
        break;
      case 'hook':
        ctx.bezierCurveTo(-h * .72, -ry * 1.78, h * .28, -ry * 1.72, h * .4, -ry * 1.14);
        ctx.quadraticCurveTo(h * .62, -ry * 1.12, h, -ry);
        break;
      case 'ridge':
        ctx.lineTo(-h * .65, -ry * 1.16);
        ctx.lineTo(h * .3, -ry * 1.16);
        ctx.lineTo(h, -ry);
        break;
      case 'blade':
        ctx.lineTo(-h * .35, -ry * 1.85);
        ctx.quadraticCurveTo(h * .40, -ry * 1.10, h, -ry);
        break;
      case 'sail':
        ctx.bezierCurveTo(-h * .80, -ry * 1.90, h * .22, -ry * 1.90, h, -ry);
        break;
      case 'swept':
        ctx.lineTo(-h * .55, -ry * 1.48);
        ctx.lineTo(h * .6, -ry * 1.04);
        ctx.lineTo(h, -ry);
        break;
      case 'dome':
        ctx.bezierCurveTo(-h * .8, -ry * 1.5, h * .35, -ry * 1.5, h, -ry);
        break;
      case 'soft':
        ctx.bezierCurveTo(-h * .90, -ry * 1.3, h * .20, -ry * 1.3, h, -ry);
        break;
      default:
        ctx.bezierCurveTo(-h * .30, -ry * 1.15, h * .50, -ry * 1.12, h, -ry);
    }
    ctx.arc(h, 0, ry, -Math.PI / 2, Math.PI / 2);
    if (g.back === 'sail') {
      ctx.bezierCurveTo(h * .4, ry * 1.8, -h * .45, ry * 1.65, -h, ry);
    } else if (g.back === 'blade' || g.back === 'swept') {
      ctx.lineTo(h * .05, ry * 1.34);
      ctx.lineTo(-h * .4, ry);
      ctx.lineTo(-h, ry);
    } else {
      ctx.bezierCurveTo(h * .3, ry * 1.12, -h * .6, ry * 1.15, -h, ry);
    }
    ctx.arc(-h, 0, ry, Math.PI / 2, Math.PI - angle);
    ctx.bezierCurveTo(-rx, ry * .25, neckX, ry * .17 + wiggle * .25, tailX + ry * .06, tailY + wiggle);
    if (g.tail === 'fan') {
      // A flared sector with a gently bowed trailing edge, never a full disk.
      ctx.bezierCurveTo(tailX - ry * .30, tailY * .72 + wiggle, tailX - ry * .30, -tailY * .72 + wiggle, tailX + ry * .06, -tailY + wiggle);
    } else if (g.tail === 'crescent') {
      ctx.quadraticCurveTo(tailX - ry * .12, tailY * .75 + wiggle, tailX + ry * .17, tailY * .42 + wiggle);
      ctx.quadraticCurveTo(tailX + ry * .60, wiggle, tailX + ry * .17, -tailY * .42 + wiggle);
      ctx.quadraticCurveTo(tailX - ry * .12, -tailY * .75 + wiggle, tailX + ry * .06, -tailY + wiggle);
    } else {
      const notch = g.tail === 'deepFork' ? .64 : g.tail === 'fork' ? .55 : .40;
      ctx.quadraticCurveTo(tailX + ry * .22, tailY * .30 + wiggle, tailX + ry * notch, wiggle);
      ctx.quadraticCurveTo(tailX + ry * .22, -tailY * .30 + wiggle, tailX + ry * .06, -tailY + wiggle);
    }
    ctx.bezierCurveTo(neckX, -ry * .17 + wiggle * .25, -rx, -ry * .25, joinX, -joinY);
    ctx.closePath();
    ctx.fill();
  }
  function drawFish(ctx, f, time, palette, scale = 1, isPlayer = false, language = 'en') {
    const g = form(f), color = isPlayer ? palette.player : palette[f.color];
    const flip = isPlayer ? (f.headingX < 0 ? -1 : 1) : (f.vx < 0 ? -1 : 1);
    const wiggle = Math.sin(time * 8 + (f.id || 0)) * .11 * g.ry;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(flip, 1);
    ctx.fillStyle = color;
    if (f.shape === 'jelly') {
      // Opaque bell shares the complete contact capsule. Tentacles are decoration.
      ctx.beginPath();ctx.moveTo(-g.half, -g.ry);
      ctx.bezierCurveTo(-g.half * .7, -g.ry * 1.16, g.half * .7, -g.ry * 1.16, g.half, -g.ry);
      ctx.arc(g.half, 0, g.ry, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(-g.half, g.ry);ctx.arc(-g.half, 0, g.ry, Math.PI / 2, Math.PI * 1.5);ctx.closePath();ctx.fill();
      ctx.strokeStyle=color;ctx.lineWidth=Math.max(1.5/scale,g.ry*.09);ctx.lineCap='round';
      for (const offset of [-.48,0,.48]) {const x=g.rx*offset;ctx.beginPath();ctx.moveTo(x,g.ry*.72);ctx.bezierCurveTo(x+wiggle,g.ry*1.14,x-wiggle*2,g.ry*1.55,x+wiggle,g.ry*1.8);ctx.stroke();}
      ctx.strokeStyle=palette.mark;ctx.lineWidth=1/scale;ctx.beginPath();ctx.moveTo(-g.rx*.65,g.ry*.22);ctx.quadraticCurveTo(0,g.ry*.45,g.rx*.65,g.ry*.22);ctx.stroke();ctx.restore();return;
    }
    silhouette(ctx, g, wiggle);
    // The hero's white eye and leaf-like pectoral fin are a readable mascot,
    // not a halo, extra body dot, texture or second decorative eye.
    const eyeX = g.half + g.ry * .36, eyeY = -g.ry * .24;
    if (isPlayer) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, Math.max(2.5 / scale, g.ry * .23), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#233d43';
      ctx.beginPath();
      ctx.arc(eyeX + .35 / scale, eyeY, Math.max(1.15 / scale, g.ry * .105), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = palette.mark;
      ctx.beginPath();
      ctx.moveTo(g.rx * .05, g.ry * .1);
      ctx.quadraticCurveTo(-g.rx * .30, g.ry * .2, -g.rx * .16, g.ry * .66);
      ctx.quadraticCurveTo(g.rx * .08, g.ry * .49, g.rx * .05, g.ry * .1);
      ctx.fill();
    } else {
      ctx.fillStyle = '#233d43';
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, Math.max(1.05 / scale, g.ry * .115), 0, Math.PI * 2);
      ctx.fill();
      if (['sail','blade','hook','ridge'].includes(g.back)) {
        ctx.strokeStyle = '#233d43';
        ctx.lineWidth = 1 / scale;
        ctx.lineCap = 'round';
        // One gill arc gives large fish a head rather than a dotted pill.
        ctx.beginPath();
        ctx.moveTo(g.half - g.ry * .20, -g.ry * .50);
        ctx.quadraticCurveTo(g.half - g.ry * .52, 0, g.half - g.ry * .20, g.ry * .48);
        ctx.stroke();
        if (g.back === 'blade') {
          ctx.beginPath();
          ctx.moveTo(g.rx - g.ry * .06, g.ry * .11);
          ctx.lineTo(g.rx - g.ry * .51, g.ry * .21);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
    if (isPlayer) {
      ctx.save();
      ctx.font = `700 ${11 / scale}px ui-monospace,monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = palette.ink;
      ctx.fillText(language === 'zh' ? '你' : 'YOU', f.x, f.y - g.ry * g.top - 9 / scale);
      ctx.restore();
    }
  }
  function draw(ctx, s, options) {
    const p = options.palette || palettes.light;
    const scale = options.scale || 1, dpr = options.dpr || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = p.water;
    ctx.fillRect(0, 0, s.width, s.height);
    ctx.strokeStyle = p.floor;
    ctx.lineWidth = 1 / scale;
    ctx.beginPath();
    ctx.moveTo(0, s.height - 14 / scale);
    ctx.bezierCurveTo(s.width * .3, s.height - 22 / scale, s.width * .65, s.height - 5 / scale, s.width, s.height - 14 / scale);
    ctx.stroke();
    for (const f of s.fish) {
      const danger = R.relation(s.player, f) === 'danger', g = form(f);
      ctx.save();
      if (f.warning > 0) ctx.globalAlpha = .5;
      drawFish(ctx, f, options.reduced ? 0 : s.time, p, scale);
      ctx.restore();
      const o=s.goalStatus,target=o&&(o.kind==='revenge'?f.type===o.type&&f.tier===o.tier:o.kind==='catch'?f.type===o.type:o.kind==='shoal'?f.motion==='school':o.kind==='lanes'?Number.isInteger(f.lane)&&!(s.lanesEaten||[]).includes(f.lane):false);
      if(target){ctx.save();ctx.fillStyle=p.ink;ctx.textAlign='center';ctx.font=`700 ${14/scale}px sans-serif`;ctx.fillText('◇',R.clamp(f.x,9/scale,s.width-9/scale),R.clamp(f.y-g.ry*g.top-(danger?25:8)/scale,16/scale,s.height-10/scale));ctx.restore();}
      if (danger) {
        ctx.fillStyle = p.warning;
        const markerRadius = 5 / scale;
        const markerY = f.y - g.ry * g.top - 10 / scale;
        polygon(ctx, [[f.x, markerY - markerRadius], [f.x + markerRadius, markerY + markerRadius * .7], [f.x - markerRadius, markerY + markerRadius * .7]]);
        if (f.warning > 0 || f.intent === 'windup') {
          ctx.fillStyle = p.water;
          ctx.font = `700 ${8 / scale}px ui-monospace,monospace`;
          ctx.textAlign = 'center';
          ctx.fillText('!', f.x, markerY + 2 / scale);
        }
      }
    }
    const blink = s.player.invulnerable > 0 && s.time > 1 && Math.floor(s.time * 9) % 2 === 0;
    ctx.save();
    if (blink) ctx.globalAlpha = .5;
    drawFish(ctx, s.player, options.reduced ? 0 : s.time, p, scale, true, options.language);
    ctx.restore();
    if(s.player.combo>1&&s.time-s.player.lastMeal<2){const g=R.geometry(s.player);ctx.save();ctx.fillStyle=p.ink;ctx.font=`700 ${11/scale}px ui-monospace,monospace`;ctx.textAlign='center';ctx.fillText((options.language==='zh'?'连吃':'CHAIN')+' ×'+s.player.combo,R.clamp(s.player.x,48/scale,s.width-48/scale),R.clamp(s.player.y-g.ry*g.top-24/scale,15/scale,s.height-12/scale));ctx.restore();}
    if (!options.reduced) for (const e of s.effects) {
      const remaining = e.kind === 'grow' ? .7 : .35;
      ctx.save();
      ctx.globalAlpha = Math.max(0, e.life / remaining);
      ctx.strokeStyle = e.kind === 'hurt' ? p.warning : e.kind === 'grow' ? p.gold : p.player;
      ctx.lineWidth = 1.5 / scale;
      ctx.beginPath();
      ctx.arc(e.x, e.y, (8 + e.age * 65) / scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
  return { palettes, draw, drawFish, form };
});
