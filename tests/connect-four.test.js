const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');

function loadRules(){const sandbox={module:{exports:{}},exports:{}};vm.runInNewContext(read('connect-four/rules.js'),sandbox);return sandbox.module.exports;}

test('Connect Four drops pieces to the lowest open row',()=>{const R=loadRules(),b=R.createBoard();assert.equal(R.drop(b,3,1),5);assert.equal(R.drop(b,3,2),4);assert.equal(b[5][3],1);assert.equal(b[4][3],2);});
test('Connect Four detects horizontal vertical and both diagonal wins',()=>{const R=loadRules();for(const cells of [[[5,0],[5,1],[5,2],[5,3]],[[2,4],[3,4],[4,4],[5,4]],[[5,0],[4,1],[3,2],[2,3]],[[2,0],[3,1],[4,2],[5,3]]]){const b=R.createBoard();for(const [r,c] of cells)b[r][c]=1;assert.equal(R.winner(b),1);}});
test('Connect Four AI takes a win and blocks an immediate loss',()=>{const R=loadRules();let b=R.createBoard();R.drop(b,0,2);R.drop(b,1,2);R.drop(b,2,2);assert.equal(R.chooseMove(b,2,'hard'),3);b=R.createBoard();R.drop(b,0,1);R.drop(b,1,1);R.drop(b,2,1);assert.equal(R.chooseMove(b,2,'hard'),3);});
test('Connect Four page has touch columns, three difficulties, undo and side selection',()=>{const html=read('connect-four/index.html'),css=read('connect-four/style.css'),js=read('connect-four/game.js');assert.equal((html.match(/data-column=/g)||[]).length,7);for(const value of ['easy','medium','hard'])assert.match(html,new RegExp(`value="${value}"`));for(const id of ['undoButton','newButton','firstPlayer'])assert.match(html,new RegExp(`id="${id}"`));assert.match(css,/touch-action:manipulation/);assert.match(js,/localStorage/);});

test('launcher and README include Connect Four',()=>{const index=read('index.html'),readme=read('README.md');for(const route of ['connect-four']){assert.match(index,new RegExp(`/${route}/`));assert.match(readme,new RegExp(`\./${route}/`));}});
