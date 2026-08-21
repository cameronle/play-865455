(()=>{'use strict';
const c=document.getElementById('game'),x=c.getContext('2d'),W=480,H=620,$=id=>document.getElementById(id);
let state='title',score=0,high=+localStorage.getItem('invaders-high')||0,level=1,lives=3,player,aliens=[],shots=[],enemyShots=[],keys=new Set(),last=0,moveTimer=0,fireTimer=0,enemyTimer=0,invulnerable=0;
function hud(){$('score').textContent=String(score).padStart(6,'0');$('high').textContent=String(high).padStart(6,'0');$('level').textContent=String(level).padStart(2,'0');$('lives').textContent='♥'.repeat(lives)+'·'.repeat(3-lives)}
function msg(title,hint,button){$('title').textContent=title;$('hint').textContent=hint;$('start').textContent=button;$('overlay').classList.remove('hide')}
function makeWave(){aliens=[];for(let row=0;row<4+Math.min(level,3);row++)for(let col=0;col<9;col++)aliens.push({x:74+col*42,y:64+row*29,w:24,h:17,row,alive:true})}
function saveHigh(){if(high>+localStorage.getItem('invaders-high')||0)localStorage.setItem('invaders-high',String(high))}
function setup(){score=0;level=1;lives=3;player={x:W/2,y:H-46,w:30,h:18};shots=[];enemyShots=[];moveTimer=0;fireTimer=0;enemyTimer=.8;invulnerable=0;makeWave();hud();draw()}
function start(){saveHigh();setup();state='play';$('overlay').classList.add('hide')}
function pause(){if(state==='play'){state='pause';msg('PAUSED','PRESS P OR RESUME','RESUME')}else if(state==='pause'){state='play';$('overlay').classList.add('hide')}}
function fire(){if(fireTimer>0||state!=='play')return;fireTimer=.28;shots.push({x:player.x,y:player.y-12,v:-430})}
function lose(){if(invulnerable>0)return;lives--;hud();if(lives<=0){state='over';if(score>high){high=score;localStorage.setItem('invaders-high',String(high))}hud();msg('GAME OVER','FINAL SCORE '+String(score).padStart(6,'0'),'PLAY AGAIN')}else{player.x=W/2;shots=[];enemyShots=[];invulnerable=1.5}}
function update(dt){
  invulnerable=Math.max(0,invulnerable-dt);
  const direction=(keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0);
  player.x=Math.max(24,Math.min(W-24,player.x+direction*280*dt));fireTimer=Math.max(0,fireTimer-dt);enemyTimer-=dt;
  fire();
  if(enemyTimer<=0){enemyTimer=Math.max(.3,1.4-level*.08);const alive=aliens.filter(alien=>alien.alive);if(alive.length){const alien=alive[Math.floor(Math.random()*alive.length)];enemyShots.push({x:alien.x,y:alien.y+12,v:150+level*12})}}
  let dx=0;moveTimer+=dt;if(moveTimer>.4){moveTimer=0;dx=8*(Math.floor(Date.now()/400)%2?1:-1)}
  let reachedLine=false;aliens.forEach(alien=>{if(alien.alive){alien.x+=dx;alien.y+=level*.7*dt;if(alien.y>H-105)reachedLine=true}});if(reachedLine){lose();makeWave();return}
  shots.forEach(shot=>shot.y+=shot.v*dt);enemyShots.forEach(shot=>shot.y+=shot.v*dt);shots=shots.filter(shot=>shot.y>-10);enemyShots=enemyShots.filter(shot=>shot.y<H+10);
  shots.forEach(shot=>aliens.forEach(alien=>{if(alien.alive&&Math.abs(shot.x-alien.x)<alien.w/2&&Math.abs(shot.y-alien.y)<alien.h/2){alien.alive=false;shot.y=-20;score+=10*(alien.row+1);if(score>high)high=score;hud()}}));
  enemyShots.forEach(shot=>{if(invulnerable<=0&&Math.abs(shot.x-player.x)<18&&Math.abs(shot.y-player.y)<16){shot.y=H+20;lose()}});
  if(!aliens.some(alien=>alien.alive)){level++;makeWave();enemyShots=[];hud()}
}
function draw(){
  const isLight = document.documentElement.dataset.theme === 'light';
  const bg = isLight ? '#f7f4ec' : '#080d15';
  const starCol = isLight ? '#8b817733' : '#e8f0f733';
  const cyan = isLight ? '#0288d1' : '#64e6e0';
  const orange = isLight ? '#f77f00' : '#ffb45c';
  const red = isLight ? '#e63946' : '#ff6b7a';
  x.fillStyle=bg;x.fillRect(0,0,W,H);
  for(let i=0;i<70;i++){x.fillStyle=i%5?starCol:(isLight?'#0288d155':'#64e6e088');x.fillRect((i*83)%W,(i*47)%H,2,2)}
  x.strokeStyle=isLight?'rgba(2,136,209,.15)':'#64e6e622';x.beginPath();x.moveTo(0,H-27);x.lineTo(W,H-27);x.stroke();
  aliens.forEach(alien=>{if(alien.alive){x.fillStyle=alien.row%2?orange:cyan;x.fillRect(alien.x-12,alien.y-7,24,14);x.fillStyle=bg;x.fillRect(alien.x-7,alien.y-2,4,4);x.fillRect(alien.x+3,alien.y-2,4,4)}});
  if(!(invulnerable>0&&Math.floor(invulnerable*10)%2===0)){x.fillStyle=cyan;x.beginPath();x.moveTo(player.x,player.y-14);x.lineTo(player.x+18,player.y+8);x.lineTo(player.x-18,player.y+8);x.closePath();x.fill()}
  x.fillStyle=orange;shots.forEach(shot=>x.fillRect(shot.x-2,shot.y,4,12));
  x.fillStyle=red;enemyShots.forEach(shot=>x.fillRect(shot.x-2,shot.y,4,12));
}
function movePlayerButton(dir){const button=$(dir==='left'?'leftButton':'rightButton'),key=dir==='left'?'ArrowLeft':'ArrowRight',on=event=>{event.preventDefault();if(state!=='play')start();keys.add(key)},off=event=>{event.preventDefault();keys.delete(key)};button.addEventListener('pointerdown',on);['pointerup','pointercancel','pointerleave'].forEach(type=>button.addEventListener(type,off))}
function loop(time){const dt=Math.min(.033,(time-last)/1000||0);last=time;if(state==='play')update(dt);draw();requestAnimationFrame(loop)}
$('start').onclick=start;$('new').onclick=start;$('pause').onclick=pause;movePlayerButton('left');movePlayerButton('right');
window.onkeydown=event=>{if(['ArrowLeft','ArrowRight','a','d','p','P'].includes(event.key))event.preventDefault();keys.add(event.key);if((event.key==='ArrowLeft'||event.key==='ArrowRight'||event.key==='a'||event.key==='d')&&state!=='play')start();if(event.key==='p'||event.key==='P')pause()};window.onkeyup=event=>keys.delete(event.key);
c.addEventListener('pointerdown',event=>{event.preventDefault();if(state!=='play')start();const rect=c.getBoundingClientRect();player.x=Math.max(24,Math.min(W-24,(event.clientX-rect.left)/rect.width*W))});c.addEventListener('pointermove',event=>{if(event.buttons){event.preventDefault();const rect=c.getBoundingClientRect();player.x=Math.max(24,Math.min(W-24,(event.clientX-rect.left)/rect.width*W))}});
setup();msg('ALIEN FORMATION','MOVE TO AIM · AUTO-FIRE ENABLED','START');requestAnimationFrame(loop)})();
