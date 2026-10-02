'use strict';
const test=require('node:test'),assert=require('node:assert/strict');const{environment}=require('./helpers/bubble-runtime.js');
const C=require('../bubble-tanks/combat.js'),W=require('../bubble-tanks/world.js'),S=require('../bubble-tanks/storage.js');
const modules=['render.js','input.js','sound.js','ui.js','game.js'];
test('map and codex are actual frozen overlays with explicit return and discoverable objectives',()=>{
 const h=environment(modules);h.elements.get('startButton').click();h.elements.get('mapButton').click();
 assert.equal(h.B.snapshot().mode,'map');assert.equal(h.elements.get('mapPanel').hidden,false);const t=h.B.snapshot().time;h.frames(60);assert.equal(h.B.snapshot().time,t);
 assert.ok(h.elements.get('mapGoal').textContent.includes('3, 0'));h.elements.get('mapCloseButton').click();assert.equal(h.B.snapshot().mode,'running');
 h.elements.get('pauseButton').click();h.elements.get('codexButton').click();assert.equal(h.B.snapshot().mode,'codex');assert.ok(h.elements.get('codexEntries').children.length>3);
 h.elements.get('codexCloseButton').click();assert.equal(h.B.snapshot().mode,'paused');
});
test('assembly UI edits a detached draft, previews real mounts and applies only on commit',()=>{
 const h=environment(modules);h.elements.get('startButton').click();h.elements.get('roomActionButton').click();assert.equal(h.B.snapshot().mode,'assembly');
 const before=h.B.snapshot().loadout[0];h.elements.get('assemblyMirrorButton').click();assert.equal(h.B.snapshot().draft.length,2);assert.equal(h.B.snapshot().loadout.length,1);
 const t=h.B.snapshot().time;h.frames(60);assert.equal(h.B.snapshot().time,t);assert.ok(h.elements.get('assemblyPreview').calls.some(c=>c.op==='arc'));
 h.elements.get('assemblyCancelButton').click();assert.equal(h.B.snapshot().mode,'running');assert.deepEqual(h.B.snapshot().loadout[0],before);
 h.elements.get('roomActionButton').click();h.elements.get('assemblyMirrorButton').click();h.elements.get('assemblyCommitButton').click();assert.equal(h.B.snapshot().loadout.length,2);
});
test('a saved expedition is resumed by a visible button, keeps its room and settings, and starts with released input',()=>{
 const s=C.create('runtime-resume','scout','hard');C.start(s);s.world.position={x:1,y:0};W.current(s.world).visited=true;s.salvage=11;
 const h=environment(modules,{[S.SAVE_KEY]:S.serialize(s),[S.SETTINGS_KEY]:JSON.stringify({sound:false,assist:false,quality:'low'})});
 assert.equal(h.B.snapshot().mode,'title');assert.equal(h.elements.get('continueButton').hidden,false);h.elements.get('continueButton').click();
 assert.equal(h.B.snapshot().mode,'running');assert.equal(h.B.snapshot().room.x,1);assert.equal(h.B.snapshot().salvage,11);assert.equal(h.B.snapshot().difficulty,'hard');assert.equal(h.B.snapshot().settings.assist,false);
 assert.equal(h.B.snapshot().input.x,0);assert.equal(h.B.snapshot().input.y,0);h.elements.get('pauseButton').click();assert.ok(h.stored.get(S.SAVE_KEY));
});
test('victory uses a separate result title and records one completed expedition',()=>{
 const s=C.create('win-ui');s.mode='won';s.world.bosses=4;s.score=1200;
 const h=environment(modules,{[S.SAVE_KEY]:S.serialize(s)});h.elements.get('continueButton').click();h.frames(3);
 assert.equal(h.B.snapshot().mode,'won');assert.equal(h.elements.get('resultPanel').hidden,false);assert.match(h.elements.get('resultTitle').textContent,/胜利/);
 const stats=JSON.parse(h.stored.get(S.RECORDS_KEY));assert.equal(stats.wins,1);h.frames(120);assert.equal(JSON.parse(h.stored.get(S.RECORDS_KEY)).wins,1);
});
