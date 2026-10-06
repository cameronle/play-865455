(function (root, factory) {
  "use strict";
  const bosses = factory(typeof module === "object" ? require("./content") : root.SkyPatrolContent);
  if (typeof module === "object") module.exports = bosses;
  else root.SkyPatrolBosses = bosses;
})(typeof globalThis !== "undefined" ? globalThis : this, function (C) {
  "use strict";
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function initialize(g, type) {
    const d = C.BOSSES[type], scale = C.MODES[g.mode].hpScale;
    const b = { ...d, type, id: ++g.serial, x: 240, y: -d.h,
      hp: Math.ceil(d.hp * scale), maxHp: Math.ceil(d.hp * scale),
      age: 0, cooldown: 2, phase: 1, pattern: 0, hitFlash: 0, blockFlash: 0,
      partWindow: g.mode === "challenge" ? 3.6 : 4.5 };
    if (d.turretHp) b.turrets = ["left", "right"].map((part, i) => ({
      part, id: b.id + "-" + part, offset: i ? 56 : -56,
      hp: Math.ceil(d.turretHp * scale), maxHp: Math.ceil(d.turretHp * scale),
      cooldown: 1.2 + i, w: 34, h: 36, hitFlash: 0,
    }));
    return b;
  }
  function partsActive(b) { return !!b.turrets && (!b.stagedParts || b.phase === 2); }
  function protectedCore(b) { return partsActive(b) && b.turrets.some(t => t.hp > 0); }
  function partOpen(b, t) {
    return partsActive(b) && t.hp > 0 && (!b.alternating || b.turrets.filter(t=>t.hp>0).length===1 ||
      t.part === (Math.floor(b.age / b.partWindow)%2 ? "right" : "left"));
  }
  function progress(b) {
    return { max: b.maxHp + (b.turrets || []).reduce((n,t) => n + t.maxHp, 0),
      value: Math.max(0,b.hp) + (b.turrets || []).reduce((n,t) => n + t.hp, 0) };
  }
  function targets(b) {
    const core = { ...b, w: protectedCore(b) ? 40 : b.w, h: protectedCore(b) ? 40 : b.h };
    return [{ body: core, part: null }, ...(partsActive(b) ? b.turrets.filter(t => t.hp > 0).map(t => ({
      body: { x: b.x + t.offset, y: b.y + 6, px: (b.px ?? b.x) + t.offset, py: (b.py ?? b.y) + 6, w: t.w, h: t.h }, part: t.part,
    })) : [])];
  }
  function hit(g, amount, part) {
    const b = g.boss;
    if (part) {
      const t = b.turrets?.find(t => t.part === part);
      if (!t || !partOpen(b,t)) { b.blockFlash = .12; return false; }
      t.hp = Math.max(0,t.hp - amount); t.hitFlash = .12;
      if (!t.hp) {
        t.attack = null;
        g.hazards = g.hazards.filter(h => h.source !== t.id);
        g.threats = g.threats.filter(v=>v.source!==t.id);
        g.score += 200; g.event("turret-defeated",part);
        if (b.turrets.every(t => t.hp === 0)) {
          b.phase = b.stagedParts ? 3 : 2; b.cooldown = 1.5; b.attack = null; b.pattern=0; b.side=null; b.followups=[];
          g.event("core-open",b.type);
          g.event("boss-phase",b.phase);
        }
      }
      return true;
    }
    if (protectedCore(b)) { b.blockFlash = .12; return false; }
    b.hitFlash = .12;
    const nextHp = Math.max(0,b.hp-amount);
    if(b.stagedParts && b.phase===1 && nextHp <= Math.ceil(b.maxHp*.65)) {
      b.hp=Math.ceil(b.maxHp*.65); b.phase=2; b.attack=null; b.side=null; b.echo=null; b.followups=[]; b.summonPending=null; b.cooldown=1.5;
      g.enemyBullets=[]; g.hazards=[]; g.threats=[]; g.event("boss-phase",2); return true;
    }
    b.hp = nextHp;
    if (!b.hp) {
      g.burst(b.x,b.y,true); g.score += 1200 * g.level;
      g.event("boss-defeated",b.type); g.finishStage();
    }
    return true;
  }
  function pose(b,t) {
    const a=Math.min(140,(C.W-b.w)/2-12);
    switch(b.motion){
      case "sweep":return {x:240+Math.sin(t*.42)*a,y:110+Math.sin(t*.84)*25};
      case "stalk":return {x:240+Math.sin(t*.25)*a,y:118};
      case "zigzag":return {x:240+Math.asin(Math.sin(t*.62))*2/Math.PI*a,y:110};
      case "orbit":return {x:240+Math.sin(t*.55)*a,y:115+Math.cos(t*.55)*25};
      case "hold":return {x:240+Math.sin(t*.2)*65,y:125};
      default:return {x:240+Math.sin(t*.75)*Math.min(a,128),y:115+Math.sin(t*.35)*12};
    }
  }
  function move(b,target,dt,speed=140){
    const dx=target.x-b.x,dy=target.y-b.y,n=Math.hypot(dx,dy),s=Math.min(n,speed*dt);
    if(n){b.x+=dx/n*s;b.y+=dy/n*s;}return n<=speed*dt;
  }
  function forecast(b,t){
    let q={x:b.x,y:b.y};const d=b.dash;
    if(d){
      const walk=v=>{const n=Math.hypot(v.x-q.x,v.y-q.y),used=Math.min(t,n/320);if(n){q.x+=(v.x-q.x)*used*320/n;q.y+=(v.y-q.y)*used*320/n;}t-=used;return n/320<=used;};
      if(d.phase==="out"){for(let i=d.index;i<d.route.length;i++)if(!walk(d.route[i]))return q;t-=Math.min(t,1.4);}
      else if(d.phase==="recover")t-=Math.min(t,d.timer);
      if(t>0)walk(d.home);return q;
    }
    const hold=Math.max(b.attack?.timer||0,b.side?.timer||0,...(b.turrets||[]).map(v=>v.attack?.timer||0));
    if(t<=hold)return q;const target=pose(b,b.age+t),dx=target.x-q.x,dy=target.y-q.y,n=Math.hypot(dx,dy)||1,u=Math.min(1,(t-hold)*140/n);return {x:q.x+dx*u,y:q.y+dy*u};
  }
  function phase(g){
    const b=g.boss;if(b.stagedParts||protectedCore(b))return;
    const desired=b.phaseCount===3?(b.hp<=b.maxHp*.34?3:b.hp<=b.maxHp*.67?2:1):(b.hp<=b.maxHp*.55?2:1);
    if(desired>b.phase){b.phase=desired;b.pattern=0;g.event("boss-phase",b.phase);}
  }
  function patterns(b,mode){
    const list=b.phase===3&&b.final?b.final:b.phase===2&&b.later?b.later:mode==="challenge"?b.challenge:b.patterns;
    return mode==="challenge"&&b.phase>1?[...list,"cross"]:list;
  }
  function volley(a){
    const o=a.origin,shot=(angle,speed=155)=>({x:o.x,y:o.y,vx:Math.sin(angle)*speed,vy:Math.cos(angle)*speed});
    if(["gap","doubleFan","rotatingGap"].includes(a.kind)){
      const center=a.kind==="rotatingGap"?(a.gapIndex%3-1)*.3:a.gapSide*.23;
      return [-.85,-.57,-.3,0,.3,.57,.85].filter(v=>Math.abs(v-center)>.1).map(v=>shot(v));
    }
    if(a.kind==="fan")return [-.85,-.55,-.27,0,.27,.55,.85].map(v=>shot(v));
    if(a.kind==="cross")return [-1.05,-.72,-.42,.42,.72,1.05].map(v=>shot(v,175));
    const angle=Math.atan2(a.target.x-o.x,a.target.y-o.y);
    return (a.kind==="burst"||a.kind==="lockChain"?[-.10,0,.10]:[0]).map(v=>shot(angle+v,175));
  }
  function draft(g,kind,source=g.boss.id,origin=null){
    const b=g.boss,a={kind,source,timer:.95,target:{x:g.player.x,y:g.player.y},origin:origin||{x:b.x,y:b.y+b.h/2},specs:[],preview:[]};
    a.gapSide=-(b.gapSide||1);a.gapIndex=(b.gapIndex||0)+1;
    if(kind==="dash"||kind==="doubleDash"){
      a.timer=1.2;a.target={x:clamp(g.player.x,b.w/2+16,C.W-b.w/2-16),y:clamp(g.player.y,300,570)};
      a.route=[a.target];if(kind==="doubleDash")a.route.push({x:C.W-a.target.x,y:Math.max(300,a.target.y-30)});
      a.home={x:b.x,y:b.y};
      a.preview=[{kind:"route",origin:{x:b.x,y:b.y},route:[...a.route.map((v,i)=>({...v,pause:i===a.route.length-1?1.4:0})),a.home],speed:320,w:b.w,h:b.h,warning:a.timer,ttl:5,source}];
    }else if(["bomb","bombLanes","chainBomb"].includes(kind)){
      a.timer=1.4;const xs=kind==="bomb"?[g.player.x]:[clamp(g.player.x-100,50,430),clamp(g.player.x+100,50,430)];
      a.specs=xs.map((x,i)=>({kind:"bomb",x,y:clamp(g.player.y,70,C.H-55),radius:44,w:88,h:88,warning:1.4+(kind==="chainBomb"?i*.7:0),ttl:.6,source}));
    }else if(kind==="mineLanes"){
      a.timer=1.4;a.specs=[-85,85].map(v=>({kind:"mine",x:clamp(g.player.x+v,50,430),y:clamp(g.player.y-45,280,560),radius:25,w:50,h:50,warning:1.4,ttl:3.4,source}));
    }else if(kind==="laser"||kind==="reverseLaser"||kind==="partLaser"){
      a.timer=1.4;const center=clamp(origin?g.player.x+(origin.x<b.x?-60:60):g.player.x,100,380),w=origin?140:180,beamW=origin?26:30,reverse=kind==="reverseLaser"||(origin&&origin.x>b.x);
      a.specs=[{kind:"laser",x:center,y:C.H/2,w,h:C.H,beamW,beamX:center+(reverse?1:-1)*(w-beamW)/2,reverse,warning:1.4,ttl:1.5,duration:1.5,source}];
    }else if(!kind.startsWith("summon")){
      a.bullets=volley(a);a.preview=[{kind:"volley",bullets:a.bullets,warning:a.timer,ttl:3.4,source,light:kind==="aim"}];
      if(kind==="doubleFan"){
        const second={...a,kind:"gap",gapSide:-a.gapSide};a.echo={timer:.45,bullets:volley(second)};
        a.preview.push({kind:"volley",bullets:a.echo.bullets,warning:a.timer+.45,ttl:3.4,source});
      }
    }
    return a;
  }
  function arm(g,kind,source,origin){
    const a=draft(g,kind,source,origin),specs=[...a.specs,...a.preview];
    if(specs.length&&!g.attackAllowed(specs))return null;
    if((a.preview.length||!a.specs.length)&&!g.reserveAttack(a.source,Math.max(a.timer+3.4,...a.preview.map(h=>h.warning+h.ttl)),a.preview))return null;
    for(const h of a.specs)g.addHazard(h);
    g.boss.gapSide=a.gapSide;g.boss.gapIndex=a.gapIndex;g.event("boss-attack",kind);g.event("attack-detail",{kind,source:a.source,phase:g.boss.phase,warning:a.timer});return a;
  }
  function emit(g,a){for(const q of a.bullets||[])g.emit(q.x,q.y,q.vx,q.vy,a.source,a.kind==="aim");}
  function summon(g,kind){
    const b=g.boss,live=g.enemies.filter(e=>!e.dead);if(live.length>2||g.enemies.length+2>C.LIMITS.enemies)return false;
    const types=kind==="summonSupport"?["support","formation"]:kind==="summonFlank"?["interceptor","diver"]:kind==="summonDiver"?["formation","diver"]:kind==="summon"?["scout","scout"]:["formation","formation"];
    if(types.includes("support")&&live.some(e=>e.type==="support"))return false;
    const groupId=++g.serial;for(let i=0;i<2;i++)g.spawn(types[i],i?390:90,{summoned:true,groupId,leader:types[i]==="formation"&&types.indexOf("formation")===i,elite:g.mode==="challenge"&&types[i]==="diver",lane:i?1:-1});
    g.stats.summoned+=2;g.event("summon",{count:2,types});return true;
  }
  function fireAttack(g,a){
    const b=g.boss;for(const t of g.threats)if(t.source===a.source)t.specs=a.route?a.preview:a.echo?a.preview.slice(1):[];
    emit(g,a);if(a.echo)b.echo={...a.echo,kind:"gap",source:a.source};
    if(a.route)b.dash={phase:"out",route:a.route.map(q=>({...q})),index:0,target:{...a.route[0]},home:a.home};
    if(a.kind.startsWith("summon")){
      if(!summon(g,a.kind))b.summonPending=a.kind;
    }
    if(a.kind==="lockChain")b.followups=[{timer:.5,kind:"burst"},{timer:1.8,kind:"burst"}];
    if(["laser","reverseLaser","partLaser"].includes(a.kind))b.followups=[{timer:.15,kind:"aim"}];
    if(a.kind==="chainBomb")b.followups=[{timer:0,kind:"fan"}];
  }
  function turrets(g,dt){
    const b=g.boss;for(const t of b.turrets){
      if(t.hp<=0||!partOpen(b,t))continue;
      t.cooldown-=dt;
      if(t.attack){t.attack.timer-=dt;if(t.attack.timer<=0){fireAttack(g,t.attack);t.attack=null;t.cooldown=2.6/C.MODES[g.mode].fireScale;}}
      else if(t.cooldown<=0){t.attack=arm(g,b.partLaser?"partLaser":"aim",t.id,{x:b.x+t.offset,y:b.y+6});if(!t.attack)t.cooldown=.25;}
    }
  }
  function update(g,dt){
    if(g.phase!=="boss"||!g.boss)return;const b=g.boss;b.age+=dt;b.cooldown-=dt;
    b.hitFlash=Math.max(0,b.hitFlash-dt);b.blockFlash=Math.max(0,b.blockFlash-dt);
    for(const t of b.turrets||[])t.hitFlash=Math.max(0,t.hitFlash-dt);
    phase(g);
    if(b.echo){b.echo.timer-=dt;if(b.echo.timer<=0){emit(g,b.echo);g.event("boss-volley",{kind:"gap",side:-b.gapSide});b.echo=null;}}
    if(b.summonPending&&summon(g,b.summonPending))b.summonPending=null;
    if(b.followups?.length){b.followups[0].timer-=dt;if(b.followups[0].timer<=0&&!b.side){const q=b.followups[0];b.side=arm(g,q.kind,b.id+":side",{x:b.x,y:b.y+b.h/2});if(b.side)b.followups.shift();else q.timer=.25;}}
    if(b.side){b.side.timer-=dt;if(b.side.timer<=0){fireAttack(g,b.side);b.side=null;}}
    if(partsActive(b))turrets(g,dt);
    if(b.dash){
      const d=b.dash;if(d.phase==="recover"){d.timer-=dt;if(d.timer<=0)d.phase="return";}
      else if(move(b,d.phase==="out"?d.route[d.index]:d.home,dt,320)){
        if(d.phase==="out"&&++d.index<d.route.length){d.target={...d.route[d.index]};g.event("boss-dash-segment",d.index);}
        else if(d.phase==="out"){d.phase="recover";d.timer=1.4;g.event("boss-recovery",b.type);g.aim({...b,y:b.y-40},{x:80,y:C.H},130);g.aim({...b,y:b.y-40},{x:400,y:C.H},130);}
        else{b.dash=null;b.cooldown=1.6;}
      }return;
    }
    if(!b.attack&&!b.side&&!b.turrets?.some(t=>t.attack))move(b,pose(b,b.age),dt);
    if(b.attack){b.attack.timer-=dt;if(b.attack.timer<=0){const a=b.attack;fireAttack(g,a);b.attack=null;const escorts=g.enemies.filter(e=>e.summoned&&!e.dead&&!e.broken).length;b.cooldown=(b.phase===3?1.4:b.phase===2?1.65:2)/C.MODES[g.mode].fireScale*(b.escortPressure&&escorts===0?1.35:1);}
      return;
    }
    if(b.cooldown<=0){const seq=protectedCore(b)?["aim"]:patterns(b,g.mode),kind=seq[b.pattern%seq.length];b.attack=arm(g,kind);if(b.attack)b.pattern++;else b.cooldown=.25;}
  }
  return {initialize,update,hit,targets,progress,protectedCore,partOpen,partsActive,pose,forecast,patterns,draft};
});
