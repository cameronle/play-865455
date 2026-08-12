const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function rules(){const box={module:{exports:{}},exports:{}};vm.runInNewContext(fs.readFileSync('nonogram/rules.js','utf8'),box);return box.module.exports}
function make(tag='div',id=''){
 const listeners={};
 return{tag,id,textContent:'',innerHTML:'',value:id==='sizeSelect'?'10':'',disabled:false,dataset:{},style:{setProperty(){}},children:[],attributes:{},classList:{values:new Set(),add(...x){x.forEach(v=>this.values.add(v))},remove(...x){x.forEach(v=>this.values.delete(v))},toggle(x,on){if(on)this.values.add(x);else this.values.delete(x)},contains(x){return this.values.has(x)}},appendChild(child){this.children.push(child);if(!this.value&&tag==='select')this.value=String(child.value)},replaceChildren(...children){this.children=children},addEventListener(type,fn){(listeners[type]??=[]).push(fn)},dispatch(type,event={}){for(const fn of listeners[type]||[])fn({preventDefault(){},target:this,pointerId:1,button:0,key:'',...event})},setAttribute(k,v){this.attributes[k]=v},closest(selector){return selector==='.cell'&&this.classList.contains('cell')?this:null},setPointerCapture(){}};
}
test('Nonogram runtime builds a playable 10x10 board and can reveal a hint',()=>{
 const ids=['board','rowClues','colClues','sizeSelect','puzzleSelect','modeFill','modeMark','undoButton','hintButton','newButton','timer','mistakes','best','resultOverlay','resultTitle','resultText','resultButton','puzzleFrame'];
 const elements=new Map(ids.map(id=>[id,make(id==='sizeSelect'||id==='puzzleSelect'?'select':'div',id)]));
 elements.get('sizeSelect').value='10';
 const documentListeners={};
 const sandbox={window:{NonogramRules:rules()},document:{getElementById:id=>elements.get(id),createElement:tag=>make(tag),addEventListener(type,fn){documentListeners[type]=fn},elementFromPoint(){return null}},localStorage:{getItem(){return null},setItem(){}},setInterval(){return 1},clearInterval(){},setTimeout(fn){fn()},Date,Math,JSON,console};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync('nonogram/game.js','utf8'),sandbox);
 assert.equal(elements.get('board').children.length,100);
 assert.equal(elements.get('rowClues').children.length,10);
 assert.equal(elements.get('colClues').children.length,10);
 assert.equal(elements.get('puzzleSelect').children.length,12);
 elements.get('hintButton').dispatch('click');
 assert.equal(elements.get('undoButton').disabled,false);
 assert.ok(elements.get('board').children.some(cell=>cell.classList.contains('filled')||cell.classList.contains('marked')));
});
