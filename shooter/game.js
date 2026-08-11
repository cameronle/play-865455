(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const $ = id => document.getElementById(id);
  const scoreEl = $('score'), levelEl = $('level'), livesEl = $('lives'), bestEl = $('best');
  const overlay = $('overlay'), startButton = $('startButton'), soundButton = $('soundButton');
  const keys = new Set();
  const pointer = {left:false,right:false,up:false,down:false};
  const colors = {cyan:'#64e6e0', orange:'#ffb45c', red:'#ff6b7a', white:'#e8f0f7', muted:'#748394'};
  let state='title', score=0, level=1, lives=3, best=Number(localStorage.getItem('sky-patrol-best') || 0), muted=false;
  let player, bullets=[], enemyBullets=[], enemies=[], particles=[], stars=[], powerups=[];
  let last=0, spawnTimer=0, fireTimer=0, enemyFireTimer=0, levelTimer=0, shake=0, audio;
  bestEl.textContent=fmt(best);

  function fmt(n){return String(Math.max(0,n)).padStart(6,'0')}
  function resizeCanvas(){ /* CSS handles display size; logical canvas stays crisp */ }
  function rand(a,b){return a+Math.random()*(b-a)}
  function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
  function hit(a,b){return Math.abs(a.x-b.x)<a.w/2+b.w/2 && Math.abs(a.y-b.y)<a.h/2+b.h/2}
  function setHud(){scoreEl.textContent=fmt(score);levelEl.textContent=String(level).padStart(2,'0');livesEl.textContent='♥'.repeat(lives)+'·'.repeat(3-lives)}

  function beep(freq,duration,type='square',volume=.035){
    if(muted) return;
    audio ||= new (window.AudioContext||window.webkitAudioContext)();
    if(audio.state==='suspended') audio.resume();
    const o=audio.createOscillator(), g=audio.createGain(); o.type=type; o.frequency.value=freq; g.gain.setValueAtTime(volume,audio.currentTime); g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration); o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime+duration);
  }
  function noise(){beep(75,.08,'sawtooth',.045)}

  function reset(){
    score=0; level=1; lives=3; bullets=[]; enemyBullets=[]; enemies=[]; particles=[]; powerups=[]; spawnTimer=0; fireTimer=0; enemyFireTimer=0; levelTimer=0; shake=0;
    player={x:W/2,y:H-24,w:28,h:44,speed:285,invuln:0,fireLevel:1};
    stars=Array.from({length:70},()=>({x:rand(12,W-12),y:rand(0,H),s:rand(.5,2.1),v:rand(20,90),a:rand(.25,.9)}));
    setHud();
  }
  function start(){reset();state='playing';overlay.classList.add('hidden');beep(440,.08);setTimeout(()=>beep(660,.12),70)}
  function gameOver(){state='gameover';overlay.classList.remove('hidden');startButton.textContent='PLAY AGAIN';document.querySelector('.eyebrow').textContent='RUN COMPLETE';document.querySelector('.intro h1').innerHTML='GAME<br><em>OVER</em>';document.querySelector('.hint').textContent='FINAL SCORE '+fmt(score);best=Math.max(best,score);localStorage.setItem('sky-patrol-best',best);bestEl.textContent=fmt(best);noise()}
  function pause(){if(state==='playing'){state='paused';overlay.classList.remove('hidden');startButton.textContent='RESUME';document.querySelector('.eyebrow').textContent='FLIGHT PAUSED';document.querySelector('.intro h1').innerHTML='PAUSED';document.querySelector('.hint').textContent='PRESS P OR TAP RESUME'}else if(state==='paused'){state='playing';overlay.classList.add('hidden')}}

  function spawnEnemy(){
    const type=Math.random()<.2?'heavy':'scout'; const w=type==='heavy'?34:25;
    enemies.push({x:rand(26,W-26),y:-30,w,h:w,hp:type==='heavy'?3:1,maxHp:type==='heavy'?3:1,type,vy:rand(30,48)+level*4,vx:rand(-28,28),phase:Math.random()*7,score:type==='heavy'?90:25});
  }
  function fire(){if(fireTimer>0)return;fireTimer=.18; const spread=player.fireLevel>1?[-7,7]:[0]; spread.forEach(dx=>bullets.push({x:player.x+dx,y:player.y-20,w:3,h:14,vy:-520})); beep(520,.035,'square',.018)}
  function enemyFire(){if(!enemies.length)return; const e=enemies[Math.floor(Math.random()*enemies.length)]; enemyBullets.push({x:e.x,y:e.y+18,w:4,h:12,vy:145+level*10}); beep(120,.035,'triangle',.012)}
  function burst(x,y,color,count=10){for(let i=0;i<count;i++)particles.push({x,y,vx:rand(-100,100),vy:rand(-100,100),life:rand(.25,.65),max:.65,color,size:rand(1,3)})}
  function hurt(){if(player.invuln>0)return; lives--;player.invuln=1.5;shake=.3;burst(player.x,player.y,colors.red,24);noise();setHud(); if(lives<=0)gameOver()}

  function update(dt){
    stars.forEach(s=>{s.y+=s.v*dt*(1+level*.04);if(s.y>H+4){s.y=-4;s.x=rand(12,W-12)}});
    if(player.invuln>0)player.invuln-=dt;
    const dirX=(keys.has('ArrowLeft')||keys.has('a')||pointer.left?-1:0)+(keys.has('ArrowRight')||keys.has('d')||pointer.right?1:0);
    const dirY=(keys.has('ArrowUp')||keys.has('w')||pointer.up?-1:0)+(keys.has('ArrowDown')||keys.has('s')||pointer.down?1:0);
    player.x=clamp(player.x+dirX*player.speed*dt,player.w/2,W-player.w/2);
    player.y=clamp(player.y+dirY*player.speed*dt,player.h/2,H-player.h/2);
    // The ship fires automatically.
    fire();

    fireTimer=Math.max(0,fireTimer-dt); spawnTimer-=dt; enemyFireTimer-=dt; levelTimer+=dt; if(spawnTimer<=0){spawnEnemy();spawnTimer=Math.max(.28,1.05-level*.045)} if(enemyFireTimer<=0){enemyFire();enemyFireTimer=Math.max(.55,1.7-level*.08)}
    if(levelTimer>24){level++;levelTimer=0;setHud();beep(880,.12,'triangle')}
    bullets.forEach(b=>b.y+=b.vy*dt);bullets=bullets.filter(b=>b.y>-20);
    enemyBullets.forEach(b=>b.y+=b.vy*dt);enemyBullets=enemyBullets.filter(b=>b.y<H+20);
    enemies.forEach(e=>{e.y+=e.vy*dt;e.x+=Math.sin((e.y+e.phase*20)/70)*e.vx*dt});
    enemies=enemies.filter(e=>{if(e.y>H+40){hurt();return false}return true});
    for(let i=bullets.length-1;i>=0;i--){let removed=false;for(let j=enemies.length-1;j>=0;j--){if(hit(bullets[i],enemies[j])){const e=enemies[j];e.hp--;burst(bullets[i].x,bullets[i].y,colors.orange,5);bullets.splice(i,1);removed=true;if(e.hp<=0){score+=e.score;burst(e.x,e.y,e.type==='heavy'?colors.red:colors.cyan,18);if(Math.random()<.08)powerups.push({x:e.x,y:e.y,w:15,h:15,vy:55,kind:'double'});enemies.splice(j,1);beep(e.type==='heavy'?180:260,.08,'square',.025);setHud()}break}}if(removed)continue}
    enemyBullets.forEach(b=>{if(hit(b,player)){b.y=H+30;hurt()}});
    enemies.forEach(e=>{if(hit(e,player)){e.y=H+30;hurt()}});
    powerups.forEach(p=>p.y+=p.vy*dt);powerups=powerups.filter(p=>{if(hit(p,player)){player.fireLevel=2;score+=15;setHud();beep(740,.12,'sine');return false}return p.y<H+20});
    particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=70*dt;p.life-=dt});particles=particles.filter(p=>p.life>0);shake=Math.max(0,shake-dt);
  }

  function draw(){
    ctx.save(); if(shake>0)ctx.translate(rand(-3,3),rand(-3,3));ctx.fillStyle='#080d15';ctx.fillRect(0,0,W,H);
    stars.forEach(s=>{ctx.globalAlpha=s.a;ctx.fillStyle=colors.white;ctx.fillRect(s.x,s.y,s.s,s.s)});ctx.globalAlpha=1;
    ctx.strokeStyle='rgba(100,230,224,.08)';ctx.beginPath();ctx.moveTo(0,H-48);ctx.lineTo(W,H-48);ctx.stroke();
    bullets.forEach(b=>{ctx.fillStyle=colors.cyan;ctx.shadowColor=colors.cyan;ctx.shadowBlur=10;ctx.fillRect(b.x-b.w/2,b.y,b.w,b.h);ctx.shadowBlur=0});
    enemyBullets.forEach(b=>{ctx.fillStyle=colors.red;ctx.fillRect(b.x-b.w/2,b.y,b.w,b.h)});
    enemies.forEach(e=>{ctx.save();ctx.translate(e.x,e.y);ctx.fillStyle=e.type==='heavy'?colors.red:colors.orange;ctx.strokeStyle='#101923';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-e.w/2,-e.h/3);ctx.lineTo(-e.w/5,-e.h/2);ctx.lineTo(e.w/5,-e.h/2);ctx.lineTo(e.w/2,-e.h/3);ctx.lineTo(e.w/3,e.h/3);ctx.lineTo(-e.w/3,e.h/3);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#101923';ctx.fillRect(-e.w/4,-2,4,4);ctx.fillRect(e.w/4-4,-2,4,4);if(e.maxHp>1){ctx.fillStyle='#172432';ctx.fillRect(-e.w/2,-e.h/2-8,e.w,3);ctx.fillStyle=colors.red;ctx.fillRect(-e.w/2,-e.h/2-8,e.w*(e.hp/e.maxHp),3)}ctx.restore()});
    powerups.forEach(p=>{ctx.strokeStyle=colors.cyan;ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,8,0,Math.PI*2);ctx.stroke();ctx.fillStyle=colors.cyan;ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.fillText('×',p.x,p.y+4)});
    if(player&&!(player.invuln>0&&Math.floor(player.invuln*12)%2===0)){ctx.save();ctx.translate(player.x,player.y);ctx.fillStyle=colors.cyan;ctx.shadowColor=colors.cyan;ctx.shadowBlur=12;ctx.beginPath();ctx.moveTo(0,-22);ctx.lineTo(15,15);ctx.lineTo(5,12);ctx.lineTo(0,22);ctx.lineTo(-5,12);ctx.lineTo(-15,15);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#0b111a';ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(5,4);ctx.lineTo(-5,4);ctx.closePath();ctx.fill();ctx.restore()}
    particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size)});ctx.globalAlpha=1;ctx.restore();
  }
  function loop(t){const dt=Math.min(.033,(t-last)/1000||0);last=t;if(state==='playing')update(dt);draw();requestAnimationFrame(loop)}

  function bindHold(id,prop){const el=$(id);const on=e=>{e.preventDefault();pointer[prop]=true};const off=e=>{e.preventDefault();pointer[prop]=false};['pointerdown','touchstart'].forEach(ev=>el.addEventListener(ev,on,{passive:false}));['pointerup','pointercancel','pointerleave','touchend'].forEach(ev=>el.addEventListener(ev,off,{passive:false}))}
  startButton.addEventListener('click',()=>{if(state==='paused'){pause()}else start()});soundButton.addEventListener('click',()=>{muted=!muted;soundButton.classList.toggle('on',!muted);soundButton.textContent=muted?'MUTED':'SOUND';if(!muted)beep(660,.06)});
  $('mobilePauseButton').addEventListener('click',pause);
  bindHold('leftButton','left');bindHold('rightButton','right');bindHold('upButton','up');bindHold('downButton','down');
  window.addEventListener('keydown',e=>{const key=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','a','d','w','s','p','m'].includes(key))e.preventDefault();if(key==='p')pause();if(key==='m')soundButton.click();keys.add(key)});window.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
  canvas.addEventListener('pointermove',e=>{if(e.buttons){const r=canvas.getBoundingClientRect();if(player){player.x=clamp((e.clientX-r.left)/r.width*W,player.w/2,W-player.w/2);player.y=clamp((e.clientY-r.top)/r.height*H,player.h/2,H-player.h/2)}}});
  reset();requestAnimationFrame(loop);
})();
