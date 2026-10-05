'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createHopper}=require('./helpers/doodle-harness');

test('Sky Hop uses a flat shell without doodle branding, rotated framing or decorative marks',()=>{
  const html=fs.readFileSync('sky-hopper/index.html','utf8'),css=fs.readFileSync('sky-hopper/style.css','utf8');
  assert.match(html,/<title>Sky Hop/);
  assert.doesNotMatch(html,/DOODLE|Doodle|overlay-scribble|user-scalable=no/);
  assert.doesNotMatch(css,/rotate\(|gradient\(|stat::after|tips span::before|ui-rounded|border:\s*1px dashed/);
  assert.match(css,/border: 1px solid var\(--line\)/);
  assert.match(css,/:focus-visible/);
});

test('flat playfield draws a single solid surface and no ornamental scenery',()=>{
  const calls=[],g=createHopper(1,{onDraw:c=>calls.push(c)});g.run('reset()');const before=g.snapshot();
  calls.length=0;g.run('drawBackground(palette())');
  assert.deepEqual(calls.map(c=>[c.method,...c.args]),[['fillRect',0,0,480,720]]);
  assert.deepEqual(g.snapshot(),before,'presentation must not alter gameplay');
});

test('flat animal has two rabbit ears, a face and feet inside the unchanged player collider',()=>{
  const calls=[],g=createHopper(1,{onDraw:c=>calls.push(c)});g.run('reset();player.bounce=0');const before=g.snapshot();
  calls.length=0;g.run('drawPlayer(palette())');
  const ellipses=calls.filter(c=>c.method==='ellipse');
  assert.ok(ellipses.some(c=>JSON.stringify(c.args.slice(0,4))==='[0,5,21,17]'),'animal needs a round body, not a direction-key tile');
  for(const x of [-8.5,8.5])assert.ok(calls.some(c=>c.method==='moveTo'&&c.args[0]===x&&c.args[1]===-24),'both upright ears must be visible');
  for(const x of [-9,9])assert.ok(ellipses.some(c=>c.args[0]===x&&c.args[1]===20&&c.args[2]===8&&c.args[3]===4),'both feet must be visible');
  for(const x of [-7,7])assert.ok(ellipses.some(c=>c.args[0]===x&&c.args[1]===2&&c.args[2]===2.2),'animal needs two eyes');
  for(const c of ellipses){const [x,y,rx,ry]=c.args;assert.ok(x-rx>=-22&&x+rx<=22&&y-ry>=-24&&y+ry<=24,'animal artwork must fit the physical body');}
  for(const c of calls.filter(c=>['moveTo','lineTo'].includes(c.method))){const [x,y]=c.args;assert.ok(x>=-22&&x<=22&&y>=-24&&y<=24);}
  assert.ok(!calls.some(c=>['rotate','bezierCurveTo'].includes(c.method)),'no doodle wobble, costume or ornament');
  assert.deepEqual(g.snapshot(),before,'drawing must not change physics or state');
  calls.length=0;g.run('player.bounce=1;drawPlayer(palette())');
  assert.deepEqual(calls.find(c=>c.method==='scale').args,[1.07,.9],'keep brief landing compression');
});

test('all five flat platform types retain independent non-color cues and physical top edges',()=>{
  const g=createHopper();g.run('reset()');const before=g.snapshot();g.stats.trace=true;
  const commands=type=>{g.stats.commands=[];g.run(`drawPlatform({x:180,y:450,w:120,h:12,type:'${type}',vx:60,alpha:1,touched:false},palette())`);return g.stats.commands.slice();};
  const rows=['normal','moving','breaking','spring','fading'].map(commands);
  assert.equal(new Set(rows.map(r=>JSON.stringify(r))).size,5);
  for(const r of rows)assert.deepEqual(r.find(c=>c[0]==='moveTo'),['moveTo',183,450],'platform top must agree with collider');
  assert.deepEqual(g.snapshot(),before);
});
