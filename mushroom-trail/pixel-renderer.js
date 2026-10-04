(() => {
  'use strict';
  // Original local pixel sprites. Coordinates below are buffer pixels, not CSS pixels.
  const WIDTH = 320, HEIGHT = 180, UNIT = 3;
  const SPRITES = Object.freeze({
    hero: Object.freeze([
      '....KKKK....', '...KRRRRK...', '..KRRRGRRK..', '.KRRRGGWRRK.',
      '.KRRRRRRRRK.', '..KHHSSSKK..', '..KHSSKSSK..', '...KSSSSSK..',
      '...KSSSSK...', '..KBBYYBBK..', '.KWBBBBBBWKK', '.KWBIBBIBBWK',
      '..KBIKKIBBK.', '...KIIIKKK..', '..KCCK.KCCK.', '..KKKK.KKKK.'
    ]),
    walker: Object.freeze([
      '..K....K....', '..K....K....', '..KKKKKKKK..', '.KRRRRRRRRK.',
      'KRRYYYYRRRRK', 'KRRRYYRRRRRK', 'KRRRRRRRRRRK', '.KWWKWWKRRK.',
      '.KWWKWWKRRK.', '..KKKKKKKK..', '.KCCK..KCCK.', '.KKKK..KKKK.'
    ]),
    hopper: Object.freeze([
      'K.........K.', '.K.......K..', '..KKKKKKK...', '.KPPPPPPPK..',
      'KPPPPWPPPPK.', 'KPPPPWPPPPK.', '.KWWKWWKPK..', '.KWWKWWKPK..',
      '..KKKKKKK...', '.KCCK.KCCK..', 'KCCK...KCCK.', 'KKK.....KKK.'
    ]),
    coin: Object.freeze(['..YYY..', '.YWWWY.', 'YWWYWWY', 'YWYYWWY', 'YWWYWWY', '.YWWWY.', '..YYY..']),
    seed: Object.freeze(['...GG...', '..GGGG..', '.GWGGWG.', 'KGGGGGGK', '.KGGGGK.', '..KYYK..', '..KYYK..', '...KK...']),
    question: Object.freeze(['YYY', '..Y', '.YY', '.Y.', '...', '.Y.'])
  });
  const COLORS = Object.freeze({K:'#273245', R:'#d75843', G:'#76ac48', W:'#fff0c7', H:'#754938', S:'#ffc68e', B:'#318d94', I:'#236269', C:'#724738', Y:'#f3c54f', P:'#9684c5'});
  const WORLDS = Object.freeze([
    {sky:'#79c6ea',skyDark:'#203947',far:'#a5d57b',near:'#73ae63',cloud:'#edf8e1',soil:'#b97b4c',seam:'#8b5739',grass:'#81b943',stone:'#607d6b'},
    {sky:'#edbd83',skyDark:'#493a48',far:'#d69768',near:'#bc7656',cloud:'#ffe6bb',soil:'#b16d46',seam:'#804735',grass:'#d8ab5c',stone:'#9e765f'},
    {sky:'#273651',skyDark:'#18263b',far:'#3a4864',near:'#52637a',cloud:'#7f92ad',soil:'#697187',seam:'#41485e',grass:'#98a6a5',stone:'#747f95'}
  ]);
  function create(output) {
    const buffer = document.createElement('canvas');
    buffer.width = WIDTH; buffer.height = HEIGHT;
    const ctx = buffer.getContext('2d');
    ctx.imageSmoothingEnabled = false; output.imageSmoothingEnabled = false;
    const n = value => Math.round(value / UNIT);
    function rect(x,y,w,h,color) {
      x=Math.round(x); y=Math.round(y); w=Math.max(0,Math.round(w)); h=Math.max(0,Math.round(h));
      if(!w||!h||x>=WIDTH||y>=HEIGHT||x+w<=0||y+h<=0)return;
      ctx.fillStyle=color;ctx.fillRect(x,y,w,h);
    }
    function sprite(rows,x,y,colors=COLORS,flip=false,scale=1) {
      for(let row=0;row<rows.length;row++)for(let col=0;col<rows[row].length;col++){
        const color=colors[rows[row][col]];if(color)rect(x+(flip?rows[row].length-1-col:col)*scale,y+row*scale,scale,scale,color);
      }
    }
    function box(x,y,w,h,fill,edge=COLORS.K) {
      rect(x,y,w,h,edge);rect(x+1,y+1,w-2,h-2,fill);
    }
    function cloud(x,y,color) {
      rect(x+7,y,12,3,color);rect(x+3,y+3,23,5,color);rect(x,y+8,31,4,color);
    }
    function background(s,p) {
      rect(0,0,WIDTH,HEIGHT,s.dark?p.skyDark:p.sky);
      if(s.levelIndex===2||s.dark){
        for(let i=0;i<16;i++)rect((i*47+31)%WIDTH,13+(i*19)%56,1,1,COLORS.W);
        rect(270,21,10,10,COLORS.W);rect(267,23,15,6,COLORS.W);rect(276,19,8,10,s.dark?p.skyDark:p.sky);
      }else{rect(270,19,12,12,COLORS.Y);rect(267,22,18,6,COLORS.Y);}
      for(let i=0;i<4;i++)cloud(((i*103+24-s.cameraX*.04)%420+420)%420-36,25+(i%2)*19,s.dark?'#456273':p.cloud);
      const drift=Math.round(s.cameraX*.055)%112;
      for(let i=-1;i<4;i++){
        const x=i*112-drift;
        if(s.levelIndex===2){
          rect(x+11,88,52,66,p.far);rect(x+6,83,11,9,p.far);rect(x+29,83,11,9,p.far);rect(x+52,83,11,9,p.far);
          rect(x+27,99,6,14,p.sky);rect(x+48,118,6,12,p.sky);
        }else if(s.levelIndex===1){
          rect(x+6,116,90,39,p.far);rect(x+19,100,65,16,p.far);rect(x+32,89,40,11,p.far);
          rect(x+32,105,53,3,p.near);
        }else{
          for(let row=0;row<8;row++)rect(x+40-row*5,100+row*7,30+row*10,7,p.far);
          rect(x+48,114,2,4,p.near);rect(x+65,121,2,4,p.near);
        }
      }
      // Keep scenery above the collision surface so pits cannot read as bridges.
      rect(0,145,WIDTH,HEIGHT-145,s.dark?p.skyDark:p.sky);
    }
    function decoration(item,s,p) {
      const x=n(item.x-s.cameraX),y=151;
      if(item.type==='tree'||item.type==='bush'){
        rect(x-10,y-8,23,7,p.near);rect(x-5,y-14,14,6,p.near);rect(x-2,y-17,7,4,p.near);
        rect(x-6,y-9,2,2,p.far);rect(x+5,y-5,2,2,p.far);
      }else if(item.type==='cactus'){
        rect(x-2,y-19,5,19,p.near);rect(x-7,y-12,6,3,p.near);rect(x-7,y-16,3,7,p.near);rect(x+3,y-8,6,3,p.near);rect(x+6,y-13,3,7,p.near);
      }else if(item.type==='crystal'){
        rect(x-7,y-7,4,7,'#a7bacc');rect(x-3,y-15,5,15,'#a7bacc');rect(x+3,y-10,4,10,'#7d9cae');
      }else{rect(x-9,y-7,20,7,p.near);rect(x-5,y-12,12,5,p.near);rect(x-3,y-9,5,2,p.far);}
    }
    function platform(b,s,p) {
      if(b.broken)return;
      const x=n(b.x-s.cameraX),y=n(b.y+(b.bump?-Math.sin(b.bump*19)*7:0)),w=n(b.w),h=n(b.h);
      if(x+w<0||x>WIDTH)return;
      if(b.type==='ground'){
        rect(x,y,w,h,p.soil);rect(x,y,w,3,p.grass);rect(x,y+3,w,1,p.seam);
        for(let row=y+4;row<y+h;row+=8){
          rect(x,row+7,w,1,p.seam);
          for(let col=x+(Math.round((row-y)/8)%2?8:0);col<x+w;col+=16){rect(col,row,1,7,p.seam);rect(col+3,row+2,Math.min(2,x+w-col-3),1,p.grass);}
        }
      }else if(b.type==='pipe'){
        box(x+2,y+5,w-4,h-5,'#368948','#215134');rect(x+4,y+6,3,h-7,'#71b95a');rect(x+w-6,y+6,2,h-7,'#28683e');
        box(x,y,w,7,'#54a94c','#215134');rect(x+2,y+1,w-4,1,'#a2d276');
      }else if(b.type==='question'){
        box(x,y,w,h,b.hit?'#a89072':COLORS.Y,p.seam);rect(x+2,y+2,1,1,COLORS.W);rect(x+w-3,y+h-3,1,1,p.seam);
        if(b.hit)rect(x+Math.floor(w/2),y+Math.floor(h/2),1,1,p.seam);
        else sprite(SPRITES.question,x+Math.floor((w-3)/2),y+Math.floor((h-6)/2),{Y:p.seam});
      }else if(b.type==='brick'){
        box(x,y,w,h,'#d98d5b',p.seam);rect(x+1,y+Math.floor(h/2),w-2,1,p.seam);
        for(let col=x+7;col<x+w-1;col+=13){rect(col,y+1,1,Math.floor(h/2),p.seam);rect(col+6,y+Math.floor(h/2)+1,1,h-Math.floor(h/2)-2,p.seam);}
      }else if(b.type==='moving'){
        box(x,y,w,h,p.stone);rect(x+2,y+1,w-4,1,'#a7bacc');for(let col=x+5;col<x+w-3;col+=9)rect(col,y+3,3,1,COLORS.W);
      }else{box(x,y,w,h,p.soil,p.seam);rect(x+1,y,w-2,2,p.grass);}
    }
    function flag(x,y,height,color,s,large=false) {
      x=n(x-s.cameraX);y=n(y);height=n(height);
      rect(x,y-height,2,height,COLORS.W);rect(x-1,y-height-2,4,2,COLORS.Y);
      const width=large?15:11;rect(x+2,y-height+2,width,7,color);rect(x+2,y-height+9,width-3,2,color);
      rect(x-4,y,10,3,COLORS.K);rect(x-3,y-2,8,2,'#c4b58b');
    }
    function goal(s,p) {
      const ground=s.world.platforms.find(b=>b.type==='ground'&&s.world.goal.x>=b.x&&s.world.goal.x<b.x+b.w),base=ground?.y??s.world.goal.y+90;
      const x=n(s.world.goal.x+95-s.cameraX),floor=n(base);
      // Small original gatehouse, not a copied castle map or artwork.
      rect(x,floor-31,28,31,p.stone);for(let i=0;i<3;i++)rect(x+i*11,floor-36,6,5,p.stone);
      rect(x+10,floor-15,9,15,COLORS.K);rect(x+8,floor-19,13,4,COLORS.K);rect(x+3,floor-26,3,5,COLORS.Y);rect(x+23,floor-26,3,5,COLORS.Y);
      flag(s.world.goal.x,base,165,COLORS.R,s,true);
    }
    function hero(player,s) {
      if(!player||(player.inv>0&&Math.floor(player.inv*14)%2===0))return;
      let rows=SPRITES.hero;
      const walking=player.grounded&&Math.abs(player.vx)>25;
      if(walking&&Math.floor(player.anim*3)%2)rows=[...rows.slice(0,14),'...KCCKKCCK.','...KKKKKKKK.'];
      else if(!player.grounded)rows=[...rows.slice(0,14),'..KCCKKKCCK.','..KKKK.KKKK.'];
      const colors=player.powered?{...COLORS,R:'#79b24f',B:'#f3c54f',I:'#c7903e'}:COLORS;
      sprite(rows,n(player.x+player.w/2-s.cameraX)-6,n(player.y+player.h)-16,colors,player.face<0);
    }
    function draw(s) {
      const p=WORLDS[s.levelIndex]||WORLDS[0];background(s,p);
      for(const item of s.world.decor)decoration(item,s,p);
      for(const block of s.world.platforms)platform(block,s,p);
      for(const coin of s.world.coins)if(!coin.got)sprite(SPRITES.coin,n(coin.x-s.cameraX)-3,n(coin.y)-3-Math.round(Math.sin(s.clock*.006+coin.x)),COLORS);
      for(const item of s.powerups)sprite(SPRITES.seed,n(item.x-s.cameraX),n(item.y),COLORS);
      for(const enemy of s.world.enemies)if(!enemy.dead){
        const rows=SPRITES[enemy.type==='hopper'?'hopper':'walker'];sprite(rows,n(enemy.x-s.cameraX),n(enemy.y+enemy.h)-12,COLORS,enemy.vx<0);
      }
      flag(s.world.checkpoint.x,s.world.checkpoint.y+35,110,s.checkpointReached?COLORS.G:COLORS.Y,s);
      goal(s,p);
      for(const particle of s.particles)if(particle.life>0){if(particle.kind==='coin')sprite(SPRITES.coin,n(particle.x-s.cameraX)-3,n(particle.y)-3);else rect(n(particle.x-s.cameraX),n(particle.y),particle.life>.25?2:1,particle.life>.25?2:1,COLORS.Y);}
      hero(s.player,s);
      output.imageSmoothingEnabled=false;output.drawImage(buffer,0,0,WIDTH*UNIT,HEIGHT*UNIT);
    }
    return Object.freeze({draw});
  }
  window.MushroomPixel=Object.freeze({width:WIDTH,height:HEIGHT,sprites:SPRITES,create});
})();
