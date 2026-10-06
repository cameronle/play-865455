(function(root,factory){"use strict";const E=factory(typeof module==="object"?require("./content"):root.SkyPatrolContent);if(typeof module==="object")module.exports=E;else root.SkyPatrolEnemies=E;})(typeof globalThis!=="undefined"?globalThis:this,function(C){
 "use strict";const {W,H,MODES}=C,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function links(g){
  for(const e of g.enemies){e.supportedBy=null;e.shield=e.type==="heavy"&&e.age%4<2.3;}
  for(const s of g.enemies.filter(e=>!e.dead&&e.type==="support"&&e.y>30&&e.y<H-90&&e.age%4<2.5)){
   const allies=g.enemies.filter(e=>!e.dead&&e.type!=="support"&&e!==s&&e.y>0&&Math.hypot(e.x-s.x,e.y-s.y)<190).sort((a,b)=>Math.hypot(a.x-s.x,a.y-s.y)-Math.hypot(b.x-s.x,b.y-s.y)).slice(0,2);
   for(const e of allies){e.supportedBy=s.id;e.shield=true;}
  }
 }
 function intercept(g,e,dt){
  if(e.phase==="entry"){
   let lane=e.lane||-1;let x=lane===1?W-e.w/2:e.w/2;
   if(Math.hypot(x-g.player.x,145-g.player.y)<110){lane=-lane;x=W-x;}
   const target={x:lane===1?e.w/2:W-e.w/2,y:clamp(g.player.y,330,550)},n=Math.hypot(target.x-x,target.y-145),
     endpoint={x:x+(target.x-x)/n*245*2.6,y:145+(target.y-145)/n*245*2.6},
     spec={kind:"route",origin:{x,y:145},route:[endpoint],speed:245,w:e.w,h:e.h,warning:1.1,ttl:2.6,source:e.id};
   if(!g.attackAllowed([spec])||!g.reserveAttack(e.id,3.7,[spec]))return;
   e.x=x;e.y=145;e.px=x;e.py=145;e.lane=lane;e.baseX=e.x;e.target=target;
   e.phase="aim";e.warning=1.1;g.event("interceptor-warning",e.id);return;
  }
  if(e.phase==="aim"){
   e.warning-=dt;if(e.warning>0)return;
   const dx=e.target.x-e.x,dy=e.target.y-e.y,n=Math.hypot(dx,dy);e.vx=dx/n*245;e.vy=dy/n*245;e.phase="cross";e.crossTime=0;
  }
  e.x+=e.vx*dt;e.y+=e.vy*dt;e.crossTime+=dt;
  if(e.crossTime>2.6)e.escaped=true;
 }
 function lock(g,e){
  const target={x:g.player.x,y:g.player.y},warning=e.type==="sniper"?1.1:.9,dx=target.x-e.x,dy=target.y-e.y,n=Math.hypot(dx,dy)||1;
  let specs;
  if(e.type==="diver")specs=[{kind:"route",origin:{x:e.x,y:e.y},route:[{x:e.x+dx/n*260*3.5,y:e.y+dy/n*260*3.5}],speed:260,w:e.w,h:e.h,warning,ttl:3.5,source:e.id}];
  else specs=Array.from({length:e.elite?3:1},(_,i)=>{
   const y=e.y+i*.24*80,length=Math.hypot(target.x-e.x,target.y-y)||1;
   return {kind:"volley",source:e.id,warning:warning+i*.24,ttl:3.4,bullets:[{x:e.x,y:y+e.h/2,vx:(target.x-e.x)/length*220,vy:(target.y-y)/length*220}]};
  });
  if(e.type==="diver"&&e.elite){const x=e.x+dx/n*260*.65,y=e.y+dy/n*260*.65+e.h/2;
   specs.push({kind:"volley",source:e.id,warning:warning+.65,ttl:3.4,bullets:[{x,y,vx:-65,vy:120},{x,y,vx:65,vy:120}]});
  }
  if(!g.attackAllowed(specs)||!g.reserveAttack(e.id,warning+3.5,specs))return false;
  e.phase="aim";e.target=target;e.warning=warning;g.event(e.type+"-warning",e.id);return true;
 }
 function forecast(e,t,mode="normal"){
  let x=e.x,y=e.y;
  if(e.type==="interceptor"){
   if(e.phase==="cross")return {x:x+e.vx*t,y:y+e.vy*t};
   if(e.phase==="aim"){const n=Math.hypot(e.target.x-x,e.target.y-y)||1,u=Math.max(0,t-e.warning);return {x:x+(e.target.x-x)/n*245*u,y:y+(e.target.y-y)/n*245*u};}
   return {x,y};
  }
  if(e.phase==="dive")return {x:x+e.vx*t,y:y+e.vy*t};
  if(e.phase==="exit")return {x,y:y+80*t};
  if(e.phase==="aim"){
   if(e.type==="sniper")return {x,y:y+80*Math.max(0,t-e.warning)};
   const n=Math.hypot(e.target.x-x,e.target.y-y)||1,u=Math.max(0,t-e.warning);return {x:x+(e.target.x-x)/n*260*u,y:y+(e.target.y-y)/n*260*u};
  }
  return {x:clamp(e.broken?x+(e.id%2?1:-1)*40*t:e.baseX+Math.sin((e.age+t)*1.5+(e.type==="formation"?e.groupId:e.id))*12,e.w/2,W-e.w/2),y:y+e.speed*MODES[mode].speedScale*t};
 }
 function update(g,e,dt){
      e.age += dt;
      e.cooldown -= dt;
      if(e.type==="interceptor") { intercept(g,e,dt); return; }
      if(e.type==="support") { links(g); }
      if(e.type==="minelayer"&&e.y>30&&e.y<H-90&&e.cooldown<=0) {
        const h=g.addHazard({kind:"mine",x:clamp(g.player.x+(e.lane||1)*55,45,435),y:clamp(g.player.y,200,550),radius:25,w:50,h:50,warning:1.2,ttl:3.2,source:e.id});
        e.cooldown=h?4.6:.3;
      }
      if (e.type === "diver" || e.type === "sniper") {
        if (e.phase === "entry" && e.age >= 1.6 && e.y > 30 && e.cooldown<=0) {
          if(!lock(g,e))e.cooldown=.3;
        } else if (e.phase === "aim") {
          e.warning -= dt;
          if (e.warning <= 0) {
            if (e.type === "sniper") {
              for(const t of g.threats)if(t.source===e.id)t.specs=t.specs.slice(1);
              g.aim(e, e.target, 220);
              if(e.elite)e.echo={timer:.24,left:2,target:{...e.target}};
              e.phase = "exit";
            } else {
              e.phase = "dive";
              const dx = e.target.x - e.x,
                dy = e.target.y - e.y,
                n = Math.hypot(dx, dy) || 1;
              e.vx = (dx / n) * 260;
              e.vy = (dy / n) * 260;
              e.diveTime = 0;
            }
          }
        }
        if(e.echo) {
          e.echo.timer-=dt;
          if(e.echo.timer<=0){g.aim(e,e.echo.target,220);for(const t of g.threats)if(t.source===e.id)t.specs=t.specs.slice(1);e.echo.timer=.24;if(!--e.echo.left)e.echo=null;}
        }
        if (e.phase === "exit") {
          e.y += 80 * dt;
          return;
        }
        if (e.phase === "dive") {
          e.x += e.vx * dt;
          e.y += e.vy * dt;
          e.diveTime += dt;
          if(e.elite&&e.diveTime>=.65&&!e.coverFired){for(const vx of [-65,65])g.emit(e.x,e.y+e.h/2,vx,120,e.id,false);e.coverFired=true;g.event("elite-cover",e.id);}
          if (e.diveTime > 3.5) e.escaped = true;
          return;
        }
        if (e.phase === "aim") return;
      }
      if (e.type === "bomber" && e.y > 30 && e.y < H - 90 && e.cooldown <= 0) {
        const marked=g.addHazard({
          kind: "bomb",
          x: g.player.x,
          y: clamp(g.player.y, 60, H - 48),
          radius: 42,
          w: 84,
          h: 84,
          warning: 1.4,
          ttl: 0.5,
          source: e.id,
        });
        e.cooldown = marked ? 3.6 / MODES[g.mode].fireScale : .3;
      }
      e.y += e.speed * MODES[g.mode].speedScale * dt;
      e.shield=!!e.supportedBy||(e.type==="heavy"&&e.age%4<2.3);
      e.x = clamp(
        e.broken
          ? e.x + (e.id % 2 ? 1 : -1) * 40 * dt
          : e.baseX +
              Math.sin(
                e.age * 1.5 + (e.type === "formation" ? e.groupId : e.id),
              ) *
                12,
        e.w / 2,
        W - e.w / 2,
      );
      if (
        !["bomber","minelayer","support"].includes(e.type) &&
        e.y > e.h / 2 &&
        e.y < H - 90 &&
        e.cooldown <= 0 &&
        !e.shield
      ) {
        if (e.type === "heavy")
          for (const vx of [-42, 0, 42])
            g.emit(e.x, e.y + e.h / 2, vx, 140, e.id);
        else g.emit(e.x, e.y + e.h / 2, 0, 130, e.id);
        e.cooldown = (e.broken?4.5:3) / MODES[g.mode].fireScale;
      }
     }
 return {update,links,forecast};
});
