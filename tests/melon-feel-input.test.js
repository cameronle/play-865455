const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./helpers/melon-runtime');
test('native secondary stir pointer-up works while the canvas pointer stays held',()=>{
 const b=boot();b.test.start();b.nodes.game.dispatch('pointerdown',{clientX:280});const control=b.nodes.mobileStirButton;control.dispatch('pointerdown',{pointerId:2,isPrimary:false});control.dispatch('pointerup',{pointerId:2,isPrimary:false});assert.equal(b.test.get().energy,70);assert.equal(b.window.MelonLab.getSnapshot().aiming,true);control.dispatch('click',{detail:1});assert.equal(b.test.get().energy,70,'compatibility click must not spend twice');b.nodes.game.dispatch('pointerup',{clientX:280});assert.equal(b.test.get().dropCount,1);
});
test('a pending drag owns its aim without discarding the held keyboard owner',()=>{
 const b=boot();b.test.start();b.key('ArrowRight');b.nodes.game.dispatch('pointerdown',{clientX:180});b.advance(.2);assert.equal(b.test.get().aimX,180);b.nodes.game.dispatch('pointerup',{clientX:180});assert.equal(b.test.get().fruits[0].x,180);b.advance(.1);assert.ok(b.test.get().aimX>180);
});
test('cancel, capture loss and release outside the canvas do not commit a sample',()=>{
 for(const event of ['pointercancel','lostpointercapture','outside']){const b=boot();b.test.start();b.nodes.game.dispatch('pointerdown',{clientX:250});if(event==='outside')b.nodes.game.dispatch('pointerup',{clientX:900});else{b.nodes.game.dispatch(event);b.nodes.game.dispatch('pointerup',{clientX:250})}assert.equal(b.test.get().dropCount,0,event);b.nodes.game.dispatch('pointerdown',{pointerId:2,clientX:300});b.nodes.game.dispatch('pointerup',{pointerId:2,clientX:300});assert.equal(b.test.get().dropCount,1,event);}
});
test('an explicit drop consumes a pending gesture exactly once',()=>{
 const b=boot();b.test.start();b.nodes.game.dispatch('pointerdown',{clientX:280});b.nodes.dropButton.click();assert.equal(b.test.get().dropCount,1);b.advance(.6);b.nodes.game.dispatch('pointerup',{clientX:280});assert.equal(b.test.get().dropCount,1);
});
test('auxiliary stir does not commit or cancel an independently held aim gesture',()=>{
 const b=boot();b.test.start();b.nodes.game.dispatch('pointerdown',{clientX:280});b.nodes.mobileStirButton.click();assert.equal(b.test.get().energy,70);assert.equal(b.test.get().dropCount,0);b.nodes.game.dispatch('pointermove',{clientX:320});b.nodes.game.dispatch('pointerup',{clientX:320});assert.equal(b.test.get().dropCount,1);assert.equal(b.test.get().fruits[0].x,320);
});
