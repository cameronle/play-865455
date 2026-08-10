const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const read=p=>fs.readFileSync(p,'utf8');
function loadRules(){const sandbox={module:{exports:{}},exports:{}};vm.runInNewContext(read('solitaire/rules.js'),sandbox);return sandbox.module.exports;}

test('Solitaire creates a complete unique deck and deals standard Klondike piles',()=>{
  const R=loadRules(),deck=R.createDeck();
  assert.equal(deck.length,52);
  assert.equal(new Set(deck.map(card=>card.id)).size,52);
  const state=R.deal(deck);
  assert.deepEqual(Array.from(state.tableau,p=>p.length),[1,2,3,4,5,6,7]);
  assert.equal(state.stock.length,24);
  assert.equal(state.waste.length,0);
  assert.equal(state.tableau.every(p=>p.at(-1).faceUp),true);
  assert.equal(state.tableau.every(p=>p.slice(0,-1).every(card=>!card.faceUp)),true);
});

test('Solitaire validates alternating descending tableau runs and ace-up foundations',()=>{
  const R=loadRules();
  const red7={suit:'hearts',rank:7,faceUp:true},black6={suit:'spades',rank:6,faceUp:true},red6={suit:'diamonds',rank:6,faceUp:true};
  assert.equal(R.canPlaceOnTableau(black6,red7),true);
  assert.equal(R.canPlaceOnTableau(red6,red7),false);
  assert.equal(R.canPlaceOnTableau({suit:'clubs',rank:13,faceUp:true},null),true);
  assert.equal(R.canPlaceOnFoundation({suit:'clubs',rank:1,faceUp:true},null),true);
  assert.equal(R.canPlaceOnFoundation({suit:'clubs',rank:2,faceUp:true},{suit:'clubs',rank:1,faceUp:true}),true);
  assert.equal(R.canPlaceOnFoundation({suit:'hearts',rank:2,faceUp:true},{suit:'clubs',rank:1,faceUp:true}),false);
});

test('Solitaire move and undo preserve state while revealing newly exposed cards',()=>{
  const R=loadRules();
  const state={tableau:[[{id:'x',suit:'clubs',rank:9,faceUp:false},{id:'a',suit:'hearts',rank:7,faceUp:true}],[{id:'b',suit:'spades',rank:8,faceUp:true}],[],[],[],[],[]],foundations:[[],[],[],[]],stock:[],waste:[],moves:0};
  const snapshot=R.cloneState(state);
  assert.equal(R.moveTableau(state,0,1,1),true);
  assert.equal(state.tableau[0].at(-1).faceUp,true);
  assert.equal(state.tableau[1].length,2);
  assert.equal(state.moves,1);
  assert.deepEqual(R.cloneState(snapshot),snapshot);
});

test('Solitaire detects a completed game only when all foundations contain 13 cards',()=>{
  const R=loadRules(),card=(suit,rank)=>({id:suit+rank,suit,rank,faceUp:true});
  const state={foundations:['clubs','diamonds','hearts','spades'].map(s=>Array.from({length:13},(_,i)=>card(s,i+1)))};
  assert.equal(R.isComplete(state),true);
  state.foundations[0].pop();
  assert.equal(R.isComplete(state),false);
});

test('Solitaire page is a complete themed mobile static entrypoint',()=>{
  const html=read('solitaire/index.html'),css=read('solitaire/style.css'),js=read('solitaire/game.js'),index=read('index.html'),readme=read('README.md');
  assert.match(html,/viewport-fit=cover/);
  assert.match(html,/src="\/theme\.js\?v=/);
  assert.match(html,/class="theme-toggle"/);
  for(const id of ['stock','waste','foundation0','tableau0','undoButton','newButton','resultOverlay'])assert.match(html,new RegExp(`id="${id}"`));
  assert.match(css,/\[data-theme="light"\]/);
  assert.match(css,/touch-action:manipulation/);
  assert.match(js,/pointerdown|click/);
  assert.match(index,/\/solitaire\//);
  assert.match(readme,/\.\/solitaire\//);
});
