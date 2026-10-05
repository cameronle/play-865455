const test=require('node:test'),assert=require('node:assert/strict');
const {boot,fruit}=require('./helpers/melon-runtime');
test('a merge keeps bounded momentum and starts a readable elastic pulse',()=>{
 const b=boot();b.test.start();const a=fruit(0,340,500),c=fruit(0,380,500);b.test.set({fruits:[a,c]});assert.equal(b.test.mergeFruits(a,c),true);const s=b.window.MelonLab.getSnapshot(),f=s.fruits[0];assert.ok(Math.abs(f.vy)<160,'merge must not launch every tier with a fixed violent kick');assert.ok(Math.abs(f.deformation.xx)>0);assert.equal(s.mergeFeedback.length,1);assert.equal(s.mergeFeedback[0].points,20);assert.equal(s.score,20);
});
test('drawing uses the same affine matrix as the physical directional envelope',()=>{
 const b=boot({recordTransforms:true});b.test.start();b.test.set({fruits:[fruit(0,360,635,{vy:500})]});for(let i=0;i<30;i++)b.test.update(1/120);b.test.draw();const f=b.window.MelonLab.getSnapshot().fruits[0],m=f.deformation;assert.deepEqual(b.transforms().at(-1),[m.a,m.b,m.b,m.c,0,0]);assert.ok(Math.abs(f.boundaryY-f.boundaryR*Math.hypot(m.b,m.c))<1e-8);
});
test('directional strain changes real pair separation rather than just artwork',()=>{
 for(const strain of [-.07,.07]){const b=boot();b.test.start();const initial=strain<0?53:49;b.test.set({fruits:[fruit(0,300,350,{strainX:strain}),fruit(1,300,350+initial,{strainX:strain})]});b.test.physics(1/120);const [a,c]=b.test.get().fruits;if(strain<0)assert.ok(c.y-a.y>initial);else assert.ok(Math.abs(c.y-a.y-initial)<1e-8);}
});
test('an unsupported fruit relaxes back to its neutral contact shape',()=>{
 const b=boot();b.test.start();b.test.set({fruits:[fruit(0,360,-1800,{strainX:.09,strainY:.03})]});for(let i=0;i<120;i++)b.test.update(1/120);const f=b.window.MelonLab.getSnapshot().fruits[0];assert.ok(Math.hypot(f.deformation.xx,f.deformation.xy)<.001);assert.ok(Math.abs(f.boundaryX-f.boundaryR)<.03);
});
test('elastic collision, area, and dynamic wall/floor invariants survive seeded crowding',()=>{
 for(let seed=1;seed<=12;seed++){let n=seed;const rng=()=>((n=Math.imul(n,1664525)+1013904223>>>0)/4294967296);const b=boot({rng});b.test.start();b.test.set({currentProfileIndex:2,fruits:Array.from({length:32},(_,i)=>fruit(i%11,75+rng()*570,180+rng()*530,{vx:(rng()-.5)*900,vy:rng()*600}))});for(let step=0;step<160;step++){b.test.physics(1/120);for(const f of b.window.MelonLab.getSnapshot().fruits){assert.ok([f.x,f.y,f.vx,f.vy,f.boundaryX,f.boundaryY].every(Number.isFinite));assert.ok(f.x>=75+f.boundaryX-1e-6&&f.x<=645-f.boundaryX+1e-6);assert.ok(f.y<=657-f.boundaryY+1e-6);assert.ok(Math.hypot(f.deformation.xx,f.deformation.xy)<=.36000001);assert.ok(Math.abs(f.deformation.a*f.deformation.c-f.deformation.b**2-1)<1e-8);}}}
});
test('floor pressure deforms the actual contact envelope with an area-preserving transform',()=>{
 const b=boot();b.test.start();b.test.set({fruits:[fruit(0,360,635,{vy:500})]});for(let i=0;i<35;i++)b.test.update(1/120);const f=b.window.MelonLab.getSnapshot().fruits[0];assert.ok(f.boundaryY<f.boundaryR,'floor contact must compress the physical vertical envelope');assert.ok(f.boundaryX>f.boundaryR);assert.ok(f.y<=657-f.boundaryY+1e-6);assert.ok(Math.abs(f.deformation.a*f.deformation.c-f.deformation.b**2-1)<1e-9);
});
