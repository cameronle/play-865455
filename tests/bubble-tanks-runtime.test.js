'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {environment} = require('./helpers/bubble-runtime.js');

test('keyboard and captured touch movement share controls and release completely on cancellation', () => {
  const h = environment(['input.js']); const actions = []; let running = true;
  const input = h.B.Input.create(h.elements.get('game'), {isRunning: () => running, action: name => actions.push(name)});
  const key = h.window.emit('keydown', {code:'KeyD'});
  assert.equal(key.defaultPrevented, true); assert.equal(input.sample().x, 1);
  h.window.emit('keyup', {code:'KeyD'}); assert.equal(input.sample().x, 0);
  h.window.emit('keydown', {code:'Space', repeat:false});
  h.window.emit('keydown', {code:'Space', repeat:true});
  assert.deepEqual(actions, ['dash']);
  const stick = h.elements.get('joystick'); stick.rect = {left:0,top:0,width:108,height:108};
  stick.emit('pointerdown', {pointerId:7,pointerType:'touch',clientX:54,clientY:54});
  stick.emit('pointermove', {pointerId:7,pointerType:'touch',clientX:91,clientY:54});
  assert.ok(input.sample().x > 0.95); assert.equal(input.sample().y, 0);
  stick.emit('pointercancel', {pointerId:7});
  assert.equal(input.sample().x, 0);
  h.window.emit('keydown', {code:'KeyW'}); input.clear(); assert.equal(input.sample().y, 0);
  running = false;
  stick.emit('pointerdown', {pointerId:8,pointerType:'touch',clientX:54,clientY:54});
  stick.emit('pointermove', {pointerId:8,pointerType:'touch',clientX:91,clientY:54});
  assert.equal(input.sample().x, 0, 'paused screens cannot retain a touch direction');
});

test('mouse aim is mapped into the logical canvas and falls back to automatic targeting on leave', () => {
  const h = environment(['input.js']); const canvas = h.elements.get('game');
  canvas.rect = {left:10,top:20,width:400,height:400};
  const input = h.B.Input.create(canvas, {isRunning: () => true, action: () => {}});
  canvas.emit('pointermove', {pointerType:'mouse',clientX:310,clientY:120});
  assert.equal(input.sample().aim.x, 600); assert.equal(input.sample().aim.y, 200);
  canvas.emit('pointerleave', {pointerType:'mouse'});
  assert.equal(input.sample().aim, null);
});

const modules = ['render.js','input.js','sound.js','ui.js','game.js'];
test('real browser modules run title, growth choice, keyboard travel, pause and explicit resume without stuck input', () => {
  const h = environment(modules), snapshot = () => h.B.snapshot();
  assert.equal(snapshot().mode, 'title');
  assert.equal(h.elements.get('titlePanel').hidden, false);
  h.elements.get('chassisSelect').value = 'scout';
  h.elements.get('startButton').click(); h.frames(80);
  assert.equal(snapshot().mode, 'upgrade');
  assert.equal(snapshot().chassis, 'scout');
  assert.equal(h.elements.get('upgradePanel').hidden, false);
  assert.equal(new Set(snapshot().offers).size, 3);
  const frozen = snapshot().time; h.frames(10); assert.equal(snapshot().time, frozen);
  const card = h.elements.get('upgradeChoices').children[0];
  assert.ok(card.dataset.upgrade); card.click();
  assert.equal(snapshot().mode, 'running');
  h.window.emit('keydown', {code:'KeyD'});
  for (let i = 0; i < 240 && snapshot().room.x === 0; i++) h.frames();
  h.window.emit('keyup', {code:'KeyD'});
  assert.equal(snapshot().room.x, 1);
  assert.ok(snapshot().enemyCount > 0);
  h.window.emit('keydown', {code:'KeyW'}); h.elements.get('pauseButton').click();
  const paused = snapshot(); h.frames(60);
  assert.equal(snapshot().time, paused.time);
  assert.equal(h.elements.get('pausePanel').hidden, false);
  h.elements.get('resumeButton').click(); h.frames(3);
  assert.equal(snapshot().playerY, paused.playerY, 'resume must not resurrect the held movement key');
  h.elements.get('game').emit('pointermove', {pointerType:'mouse',clientX:300,clientY:200});
  const aimed = snapshot(); aimed.input.aim.x = -999;
  assert.notEqual(snapshot().input.aim.x, -999, 'nested aim snapshots also must be detached');
  h.document.hidden = true; h.document.emit('visibilitychange');
  assert.equal(snapshot().mode, 'paused');
  h.document.hidden = false; h.document.emit('visibilitychange');
  assert.equal(snapshot().mode, 'paused', 'returning to the tab requires explicit resume');
  const copied = snapshot(); copied.room.x = 999; copied.offers.push('fake');
  assert.notEqual(snapshot().room.x, 999, 'QA snapshots cannot mutate the game');
});

test('language and theme redraws preserve the running build, while restart resets it', () => {
  const h = environment(modules);
  h.elements.get('startButton').click(); h.frames(80);
  h.elements.get('upgradeChoices').children[0].click();
  const before = h.B.snapshot();
  h.elements.get('languageButton').click(); h.document.emit('themechange'); h.frames(1);
  assert.equal(h.B.snapshot().lang, 'en');
  assert.equal(h.B.snapshot().mass, before.mass);
  assert.ok(h.labels.every(el => !/[\u3400-\u9fff]/.test(el.textContent)));
  h.elements.get('pauseButton').click(); h.elements.get('restartButton').click();
  assert.equal(h.B.snapshot().mode, 'title');
  assert.equal(h.B.snapshot().growth, 0);
  assert.equal(h.B.snapshot().mass, 22);
});

test('renderer identifies the player on room entry without permanent nameplate clutter', () => {
  const h = environment(['render.js']), canvas = h.elements.get('game'), renderer = h.B.Render.create(canvas);
  const state = h.B.Combat.create('label'); state.lang = 'zh'; h.B.Combat.start(state);
  renderer.draw(state);
  assert.ok(canvas.calls.some(c => c.op === 'fillText' && c.args[0] === '你'));
  canvas.calls.length = 0; h.B.World.current(state.world).time = 5; renderer.draw(state);
  assert.ok(!canvas.calls.some(c => c.op === 'fillText' && c.args[0] === '你'));
});

test('local synthesized effects create real audio nodes only after a gesture and obey mute', () => {
  const h = environment(['sound.js']); const events = [];
  h.window.AudioContext = class {
    constructor() {this.currentTime = 0; this.state = 'running'; this.destination = {};}
    resume() {return Promise.resolve();}
    createGain() {return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}
    createOscillator() {return {frequency:{setValueAtTime(value){events.push(value);},exponentialRampToValueAtTime(){}},connect(){},start(){},stop(){}};}
  };
  const sound = h.B.Sound.create();
  sound.play('upgrade'); assert.equal(events.length, 0);
  sound.unlock(); sound.play('upgrade'); assert.ok(events.length > 0);
  sound.setEnabled(false); const count = events.length; sound.play('hit'); assert.equal(events.length, count);
  sound.setEnabled(true); sound.play('hit'); assert.ok(events.length > count);
});
