const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./helpers/melon-runtime');
test('keyboard first action drops exactly once and repeat/modifier/focused-button input is ignored',()=>{
 const b=boot();b.key(' ');assert.equal(b.test.get().dropCount,1);b.advance(.6);for(const extra of [{repeat:true},{ctrlKey:true},{metaKey:true},{target:b.nodes.modeButton}])b.key(' ',extra);assert.equal(b.test.get().dropCount,1);b.key('Enter');assert.equal(b.test.get().dropCount,2);
});
test('primary canvas gesture previews and drags before committing once on release',()=>{
 const b=boot();b.nodes.game.dispatch('pointerdown',{pointerId:1,clientX:200});assert.equal(b.test.get().dropCount,0);assert.equal(b.test.get().aimX,200);
 b.nodes.game.dispatch('pointerdown',{pointerId:2,isPrimary:false,clientX:500});b.nodes.game.dispatch('pointermove',{pointerId:2,isPrimary:false,clientX:600});assert.equal(b.test.get().aimX,200);
 b.nodes.game.dispatch('pointermove',{pointerId:1,clientX:300});assert.equal(b.test.get().aimX,300);assert.equal(b.test.get().fruits.length,0);
 b.nodes.game.dispatch('pointerup',{pointerId:1,clientX:300});assert.equal(b.test.get().dropCount,1);assert.equal(b.test.get().fruits[0].x,300);b.nodes.game.dispatch('pointerup',{pointerId:1,clientX:300});assert.equal(b.test.get().dropCount,1);
});
test('paused world rejects aim/drop/stir/mode and held keys do not leak through resume',()=>{
 const b=boot();b.test.start();b.key('ArrowRight');b.advance(.1);b.test.togglePause();const before=b.snapshot();b.nodes.game.dispatch('pointermove',{clientX:600});b.key('ArrowLeft');b.nodes.dropButton.click();b.nodes.mobileStirButton.click();b.nodes.modeButton.click();assert.deepEqual(b.snapshot(),before);b.test.togglePause();const x=b.test.get().aimX;b.advance(.4);assert.equal(b.test.get().aimX,x);
});
test('a page first loaded in the background enables title controls when it becomes visible',()=>{
 const b=boot({initiallyHidden:true});assert.equal(b.nodes.dropButton.disabled,true);b.document.hidden=false;b.emit('document','visibilitychange');assert.equal(b.nodes.dropButton.disabled,false);b.nodes.dropButton.click();assert.equal(b.test.get().dropCount,1);
});
test('background suspension clears input and requires manual resume',()=>{
 const b=boot();b.test.start();b.key('ArrowRight');b.advance(.1);b.document.hidden=true;b.emit('document','visibilitychange');assert.equal(b.test.get().paused,true);const before=b.snapshot();b.key('Enter');b.nodes.game.dispatch('pointerdown',{clientX:600});b.advance(1);assert.deepEqual(b.snapshot(),before);b.document.hidden=false;b.emit('document','visibilitychange');assert.equal(b.test.get().paused,true);b.nodes.startButton.click();const x=b.test.get().aimX;b.advance(.2);assert.equal(b.test.get().aimX,x);
});
test('releasing a canvas gesture does not release a physically held keyboard owner',()=>{
 const b=boot();b.test.start();b.key('ArrowRight');b.nodes.game.dispatch('pointerdown',{pointerId:1,clientX:200});b.advance(.6);b.nodes.game.dispatch('pointerup',{pointerId:1});const x=b.test.get().aimX;b.advance(.1);assert.ok(b.test.get().aimX>x);
});
test('left and right key owners are independent and browser defaults are prevented',()=>{
 const b=boot();b.test.start();const e=b.key('ArrowRight',{code:'ArrowRight'});assert.equal(e.defaultPrevented,true);const x=b.test.get().aimX;b.advance(.1);assert.ok(b.test.get().aimX>x);b.key('d',{code:'KeyD'});b.emit('window','keyup',{key:'ArrowRight',code:'ArrowRight'});const p=b.test.get().aimX;b.advance(.1);assert.ok(b.test.get().aimX>p);b.emit('window','keyup',{key:'d',code:'KeyD'});const stopped=b.test.get().aimX;b.advance(.1);assert.equal(b.test.get().aimX,stopped);
});
