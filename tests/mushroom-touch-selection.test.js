const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {boot}=require('./helpers/mushroom-runtime');
test('shell cancels select/menu/drag events without locking the document body',()=>{
 const b=boot();for(const type of ['selectstart','contextmenu','dragstart']){assert.equal(b.nodes.gamePage.dispatch(type).defaultPrevented,true,type);assert.equal(b.document.body.dispatch(type).defaultPrevented,false,type+' outside game');}
});

test('holding a direction clears a stale text range and Run still toggles by click',()=>{
 const b=boot();let clears=0;b.window.getSelection=()=>({isCollapsed:false,removeAllRanges(){clears++;}});b.test.startGame();b.nodes.rightButton.dispatch('pointerdown',{pointerId:25,pointerType:'touch'});assert.equal(clears,1);assert.equal(b.test.get().input.right,true);b.nodes.rightButton.dispatch('pointercancel',{pointerId:25});assert.equal(b.test.get().input.right,false);b.nodes.runButton.click();assert.equal(clears,2);assert.equal(b.test.get().input.run,true);
});
test('game shell and descendants disable text selection and WebKit callouts',()=>{
 const css=fs.readFileSync('mushroom-trail/style.css','utf8');const rule=css.match(/\.page\s*,\s*\.page\s+\*\s*\{([^}]+)\}/);assert.ok(rule,'button gaps, tips and HUD need a shell-level selection lock');for(const property of ['user-select','-webkit-user-select','-webkit-touch-callout'])assert.match(rule[1],new RegExp(property+':\\s*none'));
 assert.match(css,/\.controls\s*\{[^}]*touch-action:\s*none/);
});
