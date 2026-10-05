const test=require('node:test'),assert=require('node:assert/strict');
const {boot,fruit}=require('./helpers/melon-runtime');

test('a fast floor impact produces visible physical squash within 120ms, not a one-step target',()=>{
 const b=boot();b.test.start();b.test.set({fruits:[fruit(0,360,632,{vy:600})]});
 const heights=[];
 for(let i=0;i<14;i++){b.test.physics(1/120);const f=b.window.MelonLab.getSnapshot().fruits[0];heights.push(f.boundaryY/f.boundaryR);}
 assert.ok(Math.min(...heights)<.925,`impact must compress at least 7.5% promptly; observed ${Math.min(...heights)}`);
});

test('a small fruit actually squeezes down a braced narrow gap instead of staying on its rigid shoulders',()=>{
 const b=boot();b.test.start();
 const left=fruit(3,296,613),right=fruit(3,424,613),small=fruit(0,360,545);
 b.test.set({fruits:[left,right,small]});
 let peakCompression=0;
 for(let i=0;i<360;i++){
  b.test.physics(1/120);
  // These two braced supports deliberately cannot roll apart: descent must
  // come from the shared physical deformation, not widening the fixture.
  left.x=296;right.x=424;left.vx=right.vx=0;
  peakCompression=Math.max(peakCompression,-(small.strainX||0));
 }
 assert.ok(small.y>622,`small fruit must pass the shoulders and reach the lower gap; y=${small.y}`);
 assert.ok(peakCompression>.12,'the small body must narrow, not tunnel through hard contacts');
 assert.equal(b.test.get().score,0);assert.equal(b.test.get().fruits.length,3);
});

test('calm mode remains materially firmer under the same braced contact load',()=>{
 const peaks={};
 for(const mode of ['semi-fluid','calm']){
  const b=boot();b.test.start();if(mode==='calm')b.nodes.modeButton.click();
  const left=fruit(3,297,613),right=fruit(3,423,613),small=fruit(0,360,545);
  b.test.set({fruits:[left,right,small]});let peak=0;
  for(let i=0;i<360;i++){b.test.physics(1/120);left.x=297;right.x=423;left.vx=right.vx=0;peak=Math.max(peak,-(small.strainX||0));}
  peaks[mode]=peak;assert.equal(b.window.MelonLab.getSnapshot().mode,mode);
 }
 // Calm is a firmer flow, not rigid mode: passage can depend on how much
 // the neighboring supports spread too. Compare softness, not a false ban.
 assert.ok(peaks.calm<peaks['semi-fluid']*.65);assert.ok(peaks.calm>.025);
});

test('semi-fluid bodies cannot tunnel through an impossibly small braced gap',()=>{
 const b=boot();b.test.start();const left=fruit(3,305,613),right=fruit(3,415,613),small=fruit(0,360,545);
 b.test.set({fruits:[left,right,small]});
 for(let i=0;i<360;i++){b.test.physics(1/120);left.x=305;right.x=415;left.vx=right.vx=0;}
 assert.ok(small.y<605);assert.ok(small.x>340&&small.x<380);
});

test('floor impacts remain area-preserving across every fruit tier and collision direction',()=>{
 for(let level=0;level<11;level++)for(const side of ['floor','left','right']){
  const b=boot();b.test.start();const f=fruit(level,360,450);
  if(side==='floor'){f.y=657-f.boundaryR-2;f.vy=700}else{f.x=side==='left'?75+f.boundaryR+2:645-f.boundaryR-2;f.vx=side==='left'?-700:700}
  b.test.set({fruits:[f]});
  for(let i=0;i<60;i++){
   b.test.physics(1/120);const s=b.window.MelonLab.getSnapshot().fruits[0],d=s.deformation;
   assert.ok(Math.hypot(d.xx,d.xy)<=.20000001);assert.ok(Math.abs(d.a*d.c-d.b*d.b-1)<1e-8);
   assert.ok(s.x>=75+s.boundaryX-1e-6&&s.x<=645-s.boundaryX+1e-6);assert.ok(s.y<=657-s.boundaryY+1e-6);
  }
 }
});
