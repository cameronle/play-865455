(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, TAU = Math.PI * 2;
  const $ = id => document.getElementById(id);
  const ui = {score:$('score'), high:$('high'), level:$('level'), lives:$('lives'), overlay:$('overlay'), title:$('overlayTitle'), text:$('overlayText'), start:$('startButton'), pause:$('pauseButton')};
  const keys = {left:false,right:false,thrust:false,fire:false};
  const stars = Array.from({length:90}, (_,i) => ({x:(i*193)%W,y:(i*317)%H,a:.2+(i%7)/10,r:i%9===0?1.5:.7}));
  let ship=null, asteroids=[], bullets=[], particles=[], score=0, high=Number(localStorage.getItem('vectorDriftHigh')||0), level=1, lives=3, state='title', last=0, fireTimer=0, respawnTimer=0, waveTimer=0;

  const wrap = o => { if(o.x < -o.r) o.x=W+o.r; if(o.x>W+o.r)o.x=-o.r; if(o.y < -o.r)o.y=H+o.r; if(o.y>H+o.r)o.y=-o.r; };
  const dist2 = (a,b) => {let dx=a.x-b.x,dy=a.y-b.y;if(dx>W/2)dx-=W;if(dx<-W/2)dx+=W;if(dy>H/2)dy-=H;if(dy<-H/2)dy+=H;return dx*dx+dy*dy;};
  const updateHud = () => {ui.score.textContent=String(score).padStart(6,'0');ui.high.textContent=String(high).padStart(6,'0');ui.level.textContent=String(level).padStart(2,'0');ui.lives.textContent=Array(Math.max(0,lives)).fill('◆').join(' ')||'—';};
  function makeShip(){return{x:W/2,y:H/2,vx:0,vy:0,a:-Math.PI/2,r:14,inv:2.2};}
  function safeAsteroid(size, x, y){
    let r=[0,25,45,72][size], ax=x, ay=y;
    if(ax==null){do{ax=Math.random()*W;ay=Math.random()*H;}while((ax-W/2)**2+(ay-H/2)**2<170**2);}
    const speed=(55+level*6+(3-size)*12)*(0.78+Math.random()*.45), angle=Math.random()*TAU;
    return{x:ax,y:ay,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r,size,a:Math.random()*TAU,spin:(Math.random()-.5)*1.1,shape:Array.from({length:10},()=>.72+Math.random()*.34)};
  }
  function makeWave(){asteroids=[];for(let i=0;i<3+level;i++)asteroids.push(safeAsteroid(3));waveTimer=0;}
  function resetGame(){score=0;level=1;lives=3;bullets=[];particles=[];ship=makeShip();makeWave();state='playing';ui.overlay.classList.add('hide');ui.pause.textContent='PAUSE';updateHud();}
  function burst(x,y,color='#63e6df',count=14){for(let i=0;i<count;i++){const a=Math.random()*TAU,s=35+Math.random()*150;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.35+Math.random()*.65,max:1,color});}}
  function fire(){if(state!=='playing'||!ship||ship.inv>2.1||fireTimer>0)return;const nx=Math.cos(ship.a),ny=Math.sin(ship.a);bullets.push({x:ship.x+nx*18,y:ship.y+ny*18,vx:ship.vx+nx*430,vy:ship.vy+ny*430,r:2,life:1.25});ship.vx-=nx*5;ship.vy-=ny*5;fireTimer=.17;}
  function splitAsteroid(index){
    const rock=asteroids[index]; if(!rock)return;
    asteroids.splice(index,1); score += [0,120,60,25][rock.size]; burst(rock.x,rock.y,'#ffb45c',8+rock.size*4);
    if(rock.size>1){for(let n=0;n<2;n++){const child=safeAsteroid(rock.size-1,rock.x,rock.y), base=Math.atan2(rock.vy,rock.vx)+(n?1:-1)*(.55+Math.random()*.35);child.vx=Math.cos(base)*Math.hypot(child.vx,child.vy);child.vy=Math.sin(base)*Math.hypot(child.vx,child.vy);asteroids.push(child);}}
    if(score>high){high=score;localStorage.setItem('vectorDriftHigh',high);} updateHud();
  }
  window.splitAsteroid=splitAsteroid;
  function loseLife(){if(!ship||ship.inv>0)return;burst(ship.x,ship.y,'#ff7088',30);lives--;updateHud();ship=null;if(lives<=0){state='over';ui.title.textContent='MISSION LOST';ui.text.textContent=`SCORE ${String(score).padStart(6,'0')}`;ui.start.textContent='TRY AGAIN';ui.overlay.classList.remove('hide');}else respawnTimer=1.35;}
  function togglePause(){if(state==='playing'){state='paused';ui.title.textContent='PAUSED';ui.text.textContent='FIELD SUSPENDED';ui.start.textContent='RESUME';ui.overlay.classList.remove('hide');ui.pause.textContent='RESUME';}else if(state==='paused'){state='playing';ui.overlay.classList.add('hide');ui.pause.textContent='PAUSE';last=performance.now();}}
  function action(){if(state==='title'||state==='over'||state==='won')resetGame();else if(state==='paused')togglePause();}
  function update(dt){
    fireTimer=Math.max(0,fireTimer-dt);
    if(!ship&&lives>0){respawnTimer-=dt;if(respawnTimer<=0)ship=makeShip();}
    if(ship){ship.inv=Math.max(0,ship.inv-dt);if(keys.left)ship.a-=3.7*dt;if(keys.right)ship.a+=3.7*dt;if(keys.thrust){ship.vx+=Math.cos(ship.a)*220*dt;ship.vy+=Math.sin(ship.a)*220*dt;if(Math.random()<.7)particles.push({x:ship.x-Math.cos(ship.a)*13,y:ship.y-Math.sin(ship.a)*13,vx:ship.vx-Math.cos(ship.a)*(80+Math.random()*80),vy:ship.vy-Math.sin(ship.a)*(80+Math.random()*80),life:.2,max:.2,color:'#ffb45c'});}const drag=Math.pow(.992,dt*60);ship.vx*=drag;ship.vy*=drag;const sp=Math.hypot(ship.vx,ship.vy);if(sp>330){ship.vx*=330/sp;ship.vy*=330/sp;}ship.x+=ship.vx*dt;ship.y+=ship.vy*dt;wrap(ship);if(keys.fire)fire();}
    bullets.forEach(b=>{b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;wrap(b);});bullets=bullets.filter(b=>b.life>0);
    asteroids.forEach(a=>{a.x+=a.vx*dt;a.y+=a.vy*dt;a.a+=a.spin*dt;wrap(a);});
    particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;p.vx*=.985;p.vy*=.985;});particles=particles.filter(p=>p.life>0);
    outer:for(let bi=bullets.length-1;bi>=0;bi--)for(let ai=asteroids.length-1;ai>=0;ai--)if(dist2(bullets[bi],asteroids[ai])<(asteroids[ai].r+3)**2){bullets.splice(bi,1);splitAsteroid(ai);continue outer;}
    if(ship&&ship.inv<=0)for(const a of asteroids)if(dist2(ship,a)<(ship.r+a.r*.82)**2){loseLife();break;}
    if(!asteroids.length){waveTimer+=dt;if(waveTimer>1.2){level++;if(level>12){state='won';ui.title.textContent='SECTOR CLEAR';ui.text.textContent=`FINAL SCORE ${score}`;ui.start.textContent='FLY AGAIN';ui.overlay.classList.remove('hide');}else{ship=makeShip();makeWave();updateHud();}}}
  }
  function palette(){
    const css=typeof getComputedStyle==='function'?getComputedStyle(document.documentElement):null;
    const get=(name,fallback)=>css?.getPropertyValue(name).trim()||fallback;
    return {
      board:get('--board','#050910'),
      star:get('--muted','#748394'),
      line:get('--line','#263746'),
      ship:get('--cyan','#63e6df'),
      thrust:get('--amber','#ffb45c'),
      asteroid:get('--ink','#e8f0f7'),
      bullet:get('--cyan','#63e6df'),
      particle:get('--amber','#ffb45c')
    };
  }
  function drawShip(s,colors){
    if(s.inv>0&&Math.floor(s.inv*10)%2===0)return;
    ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.a);
    ctx.strokeStyle=colors.ship;
    ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(19,0);ctx.lineTo(-13,-11);ctx.lineTo(-8,0);ctx.lineTo(-13,11);ctx.closePath();ctx.stroke();
    if(keys.thrust){
      ctx.strokeStyle=colors.thrust;
      ctx.beginPath();ctx.moveTo(-10,-6);ctx.lineTo(-23,0);ctx.lineTo(-10,6);ctx.stroke();
    }
    ctx.restore();
  }
  function draw(){
    const colors=palette();
    ctx.fillStyle=colors.board;ctx.fillRect(0,0,W,H);
    stars.forEach(s=>{ctx.globalAlpha=s.a;ctx.fillStyle=colors.star;ctx.fillRect(s.x,s.y,s.r,s.r);});
    ctx.globalAlpha=1;ctx.strokeStyle=colors.line;ctx.lineWidth=1;ctx.strokeRect(12,12,W-24,H-24);
    asteroids.forEach(a=>{ctx.save();ctx.translate(a.x,a.y);ctx.rotate(a.a);ctx.strokeStyle=colors.asteroid;ctx.lineWidth=2;ctx.beginPath();a.shape.forEach((m,i)=>{const an=i/a.shape.length*TAU,r=a.r*m;i?ctx.lineTo(Math.cos(an)*r,Math.sin(an)*r):ctx.moveTo(Math.cos(an)*r,Math.sin(an)*r);});ctx.closePath();ctx.stroke();ctx.restore();});
    bullets.forEach(b=>{ctx.fillStyle=colors.bullet;ctx.beginPath();ctx.arc(b.x,b.y,3,0,TAU);ctx.fill();});
    particles.forEach(p=>{ctx.fillStyle=p.color||colors.particle;ctx.fillRect(p.x,p.y,2,2);});
    if(state==='playing')drawShip(ship,colors);
  }
  function loop(t){const dt=Math.min(.033,(t-last)/1000||0);last=t;if(state==='playing')update(dt);draw();requestAnimationFrame(loop);}requestAnimationFrame(loop);
  const keyMap={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'thrust',KeyW:'thrust',Space:'fire'};
  addEventListener('keydown',e=>{if(keyMap[e.code]){keys[keyMap[e.code]]=true;e.preventDefault();if(state==='title'||state==='over')resetGame();}if(e.code==='KeyP'||e.code==='Escape'){togglePause();e.preventDefault();}if(e.code==='Enter')action();});
  addEventListener('keyup',e=>{if(keyMap[e.code])keys[keyMap[e.code]]=false;});
  const binds={leftButton:'left',rightButton:'right',thrustButton:'thrust',fireButton:'fire'};
  Object.entries(binds).forEach(([id,name])=>{const el=$(id);const on=e=>{e.preventDefault();if(state==='title'||state==='over')resetGame();keys[name]=true;el.classList.add('active');if(name==='fire')fire();try{el.setPointerCapture(e.pointerId);}catch(_){}};const off=e=>{e.preventDefault();keys[name]=false;el.classList.remove('active');};el.addEventListener('pointerdown',on);el.addEventListener('pointerup',off);el.addEventListener('pointercancel',off);el.addEventListener('lostpointercapture',off);});
  ui.start.addEventListener('click',action);ui.pause.addEventListener('click',()=>state==='title'?action():togglePause());
  document.addEventListener('themechange',draw);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')togglePause();});
  updateHud();draw();
})();
