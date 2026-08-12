const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function rules(){const box={module:{exports:{}},exports:{}};vm.runInNewContext(fs.readFileSync('nonogram/rules.js','utf8'),box);return box.module.exports}
function make(tag='div',id=''){
 const listeners={};
 const properties={};
 return{tag,id,textContent:'',innerHTML:'',value:id==='sizeSelect'?'10':'',disabled:false,dataset:{},style:{properties,setProperty(key,value){properties[key]=value}},children:[],attributes:{},classList:{values:new Set(),add(...x){x.forEach(v=>this.values.add(v))},remove(...x){x.forEach(v=>this.values.delete(x))},toggle(x,on){if(on)this.values.add(x);else this.values.delete(x)},contains(x){return this.values.has(x)}},appendChild(child){this.children.push(child);if(!this.value&&tag==='select')this.value=String(child.value)},replaceChildren(...children){this.children=children},querySelector(selector){return selector==='b'?this.children.find(child=>child.tag==='b')||null:null},addEventListener(type,fn){(listeners[type]??=[]).push(fn)},dispatch(type,event={}){for(const fn of listeners[type]||[])fn({preventDefault(){},target:this,pointerId:1,button:0,key:'',...event})},setAttribute(k,v){this.attributes[k]=v},closest(selector){return selector==='.cell'&&this.classList.contains('cell')?this:null},setPointerCapture(){}};
}
test('Nonogram runtime builds a playable 10x10 board and can reveal a hint',()=>{
 const ids=['board','rowClues','colClues','sizeSelect','puzzleSelect','modeFill','modeMark','undoButton','hintButton','newButton','resetButton','timer','mistakes','best','resultOverlay','resultTitle','resultText','resultButton','puzzleFrame','levelButton','progressSummary','levelOverlay','levelGrid','closeLevels','galleryProgress','revealName'];
 function elementMap(){const map=new Map(ids.map(id=>[id,make(id==='sizeSelect'||id==='puzzleSelect'?'select':'div',id)]));const reveal=map.get('revealName');reveal.appendChild(make('span'));reveal.appendChild(make('b'));return map}
 const elements=elementMap();
 elements.get('sizeSelect').value='10';
 const documentListeners={};
 const storage={};
 const sandbox={window:{NonogramRules:rules(),matchMedia(){return{matches:true}}},document:{getElementById:id=>elements.get(id),createElement:tag=>make(tag),addEventListener(type,fn){documentListeners[type]=fn},elementFromPoint(){return null}},localStorage:{getItem(key){return storage[key]??null},setItem(key,value){storage[key]=String(value)}},setInterval(){return 1},clearInterval(){},setTimeout(fn){fn()},Date,Math,JSON,console};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync('nonogram/game.js','utf8'),sandbox);
 assert.equal(elements.get('board').children.length,100);
 assert.equal(elements.get('rowClues').children.length,10);
 assert.equal(elements.get('colClues').children.length,10);
 assert.equal(elements.get('puzzleSelect').children.length,15);
 assert.equal(elements.get('levelGrid').children.length,15);
 assert.equal(elements.get('progressSummary').textContent,'10×10 PACK · 0 / 15');
 assert.match(elements.get('puzzleFrame').style.properties['--row-clue'],/px/);
 assert.match(elements.get('puzzleFrame').style.properties['--col-clue'],/px/);
 assert.ok(parseInt(elements.get('puzzleFrame').style.properties['--row-clue'])<86);
 elements.get('hintButton').dispatch('click');
 assert.equal(elements.get('undoButton').disabled,false);
 assert.ok(elements.get('board').children.some(cell=>cell.classList.contains('filled')||cell.classList.contains('marked')));
 assert.match(storage['nonogram-saves'],/10-ROCKET/);
 assert.match(storage['nonogram-last-played'],/ROCKET/);
 assert.ok(elements.get('levelGrid').children[0].classList.contains('in-progress'));
 const elements2=elementMap();
 elements2.get('sizeSelect').value='10';
 const sandbox2={window:{NonogramRules:rules()},document:{getElementById:id=>elements2.get(id),createElement:tag=>make(tag),addEventListener(){},elementFromPoint(){return null}},localStorage:sandbox.localStorage,setInterval(){return 1},clearInterval(){},setTimeout(fn){fn()},Date,Math,JSON,console};
 vm.createContext(sandbox2);vm.runInContext(fs.readFileSync('nonogram/game.js','utf8'),sandbox2);
 assert.ok(elements2.get('board').children.some(cell=>cell.classList.contains('filled')||cell.classList.contains('marked')));
 for(let i=0;i<100;i++)elements.get('hintButton').dispatch('click');
 assert.match(storage['nonogram-completed'],/10-ROCKET/);
 assert.match(elements.get('progressSummary').textContent,/1 \/ 15/);
});
