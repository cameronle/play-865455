(() => {
'use strict';
const R=window.NonogramRules,$=id=>document.getElementById(id);
const boardEl=$('board'),rowCluesEl=$('rowClues'),colCluesEl=$('colClues');
let puzzle,board,history=[],mode=R.FILLED,size=10,puzzleIndex=0,mistakes=0,active=true,startedAt=0,timer=null,cursor={r:0,c:0},drag=null;
const bests=JSON.parse(localStorage.getItem('nonogram-bests')||'{}');
const completed=new Set(JSON.parse(localStorage.getItem('nonogram-completed')||'[]'));
function saveCompleted(){localStorage.setItem('nonogram-completed',JSON.stringify([...completed]))}
function formatTime(seconds){return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`}
function bestKey(){return `${size}-${puzzle.name}`}
function updateTime(){if(startedAt&&active)$('timer').textContent=formatTime(Math.floor((Date.now()-startedAt)/1000))}
function lineMatches(values,clue){return JSON.stringify(R.runs(values.map(value=>value===R.FILLED?1:0)))===JSON.stringify(clue)}
function buildClues(){
 rowCluesEl.replaceChildren();colCluesEl.replaceChildren();
 puzzle.clues.rows.forEach((clue,r)=>{const el=document.createElement('div');el.className='row-clue';el.dataset.row=r;el.innerHTML=clue.map(n=>`<span>${n}</span>`).join('');rowCluesEl.appendChild(el)});
 puzzle.clues.cols.forEach((clue,c)=>{const el=document.createElement('div');el.className='col-clue';el.dataset.col=c;el.innerHTML=clue.map(n=>`<span>${n}</span>`).join('');colCluesEl.appendChild(el)});
}
function buildBoard(){
 boardEl.replaceChildren();boardEl.style.setProperty('--size',size);$('puzzleFrame').style.setProperty('--size',size);
 for(let r=0;r<size;r++)for(let c=0;c<size;c++){const cell=document.createElement('button');cell.type='button';cell.className='cell';cell.dataset.row=r;cell.dataset.col=c;cell.setAttribute('role','gridcell');cell.setAttribute('aria-label',`Row ${r+1}, column ${c+1}`);if((c+1)%5===0&&c<size-1)cell.classList.add('major-right');if((r+1)%5===0&&r<size-1)cell.classList.add('major-bottom');boardEl.appendChild(cell)}
}
function render(){
 [...boardEl.children].forEach((cell,index)=>{const r=Math.floor(index/size),c=index%size,value=board[r][c];cell.classList.toggle('filled',value===R.FILLED);cell.classList.toggle('marked',value===R.MARKED);cell.classList.toggle('cursor',r===cursor.r&&c===cursor.c);cell.setAttribute('aria-pressed',value===R.UNKNOWN?'false':value===R.FILLED?'true':'mixed')});
 [...rowCluesEl.children].forEach((el,r)=>el.classList.toggle('complete',lineMatches(board[r],puzzle.clues.rows[r])));
 [...colCluesEl.children].forEach((el,c)=>el.classList.toggle('complete',lineMatches(board.map(row=>row[c]),puzzle.clues.cols[c])));
 $('mistakes').textContent=`${mistakes} / 3`;$('undoButton').disabled=!history.length;$('modeFill').classList.toggle('active',mode===R.FILLED);$('modeMark').classList.toggle('active',mode===R.MARKED);
 const best=bests[bestKey()];$('best').textContent=best?formatTime(best):'--:--';
}
function snapshot(){history.push({board:board.map(row=>row.slice()),mistakes});if(history.length>100)history.shift()}
function paint(r,c,value,fromDrag=false){
 if(!active||r<0||c<0||r>=size||c>=size||board[r][c]===value)return;
 if(!fromDrag)snapshot();board[r][c]=value;cursor={r,c};
 const wrong=(value===R.FILLED)!==Boolean(puzzle.solution[r][c])&&value!==R.UNKNOWN;
 if(wrong){mistakes++;const cell=boardEl.children[r*size+c];cell.classList.add('error');setTimeout(()=>cell.classList.remove('error'),360)}
 render();if(mistakes>=3){finish(false);return}if(R.isSolved(board,puzzle.solution))finish(true);
}
function cellFromEvent(event){const el=event.target.closest?.('.cell');return el?{r:Number(el.dataset.row),c:Number(el.dataset.col),el}:null}
function setMode(next){mode=next;render()}
function progressFor(currentSize=size){const list=R.listPuzzles(currentSize);return{done:list.filter(item=>completed.has(`${currentSize}-${item.name}`)).length,total:list.length}}
function updateProgress(){const progress=progressFor();const text=`${size}×${size} · ${progress.done} / ${progress.total} COMPLETE`;$('progressSummary').textContent=text;$('galleryProgress').textContent=`${progress.done} / ${progress.total} COMPLETE`}
function previewNode(item){const preview=document.createElement('span');preview.className='pixel-preview';preview.style.gridTemplateColumns=`repeat(${item.size},1fr)`;preview.style.gridTemplateRows=`repeat(${item.size},1fr)`;item.solution.flat().forEach(value=>{const pixel=document.createElement('i');if(value)pixel.classList.add('on');preview.appendChild(pixel)});return preview}
function renderLevelGrid(){const list=R.listPuzzles(size),grid=$('levelGrid');grid.replaceChildren();list.forEach((item,index)=>{const key=`${size}-${item.name}`,done=completed.has(key),card=document.createElement('button');card.type='button';card.className='level-card';card.classList.toggle('completed',done);card.classList.toggle('current',index===puzzleIndex);card.appendChild(previewNode(item));const title=document.createElement('strong');title.textContent=`${String(index+1).padStart(2,'0')} / ${item.name}`;card.appendChild(title);const detail=document.createElement('small');detail.textContent=done?(bests[key]?`BEST ${formatTime(bests[key])}`:'COMPLETE'):'NOT COMPLETE';card.appendChild(detail);const check=document.createElement('span');check.className='check';check.textContent='✓';card.appendChild(check);card.addEventListener('click',()=>{puzzleIndex=index;$('puzzleSelect').value=String(index);closeLevels();start()});grid.appendChild(card)});updateProgress()}
function openLevels(){renderLevelGrid();$('levelOverlay').classList.add('show');$('levelOverlay').setAttribute('aria-hidden','false')}
function closeLevels(){$('levelOverlay').classList.remove('show');$('levelOverlay').setAttribute('aria-hidden','true')}
function populatePuzzles(){const list=R.listPuzzles(size);$('puzzleSelect').replaceChildren();list.forEach((item,index)=>{const option=document.createElement('option');option.value=index;option.textContent=`${String(index+1).padStart(2,'0')} / ${item.name}`;$('puzzleSelect').appendChild(option)});puzzleIndex=Math.min(puzzleIndex,list.length-1);$('puzzleSelect').value=String(puzzleIndex);renderLevelGrid()}
function start(){
 size=Number($('sizeSelect').value);puzzleIndex=Number($('puzzleSelect').value||0);puzzle=R.getPuzzle(size,puzzleIndex);board=R.emptyBoard(size);history=[];mistakes=0;active=true;cursor={r:0,c:0};startedAt=Date.now();clearInterval(timer);timer=setInterval(updateTime,1000);$('timer').textContent='00:00';$('resultOverlay').classList.remove('show');buildClues();buildBoard();render();
}
function finish(won){active=false;clearInterval(timer);const elapsed=Math.max(1,Math.floor((Date.now()-startedAt)/1000));$('resultTitle').textContent=won?'PICTURE COMPLETE':'PUZZLE FAILED';$('resultText').textContent=won?`${puzzle.name} · ${formatTime(elapsed)}`:'THREE INCORRECT CELLS';$('resultButton').textContent=won?'NEXT PUZZLE':'TRY AGAIN';if(won){completed.add(bestKey());saveCompleted();if(!bests[bestKey()]||elapsed<bests[bestKey()]){bests[bestKey()]=elapsed;localStorage.setItem('nonogram-bests',JSON.stringify(bests))}}$('resultOverlay').classList.add('show');renderLevelGrid();render()}
function nextPuzzle(){if($('resultTitle').textContent==='PICTURE COMPLETE'){const count=R.listPuzzles(size).length;puzzleIndex=(puzzleIndex+1)%count;$('puzzleSelect').value=String(puzzleIndex)}start()}
function undo(){const state=history.pop();if(!state)return;board=state.board;mistakes=state.mistakes;active=true;$('resultOverlay').classList.remove('show');render()}
function hint(){if(!active)return;for(let r=0;r<size;r++)for(let c=0;c<size;c++){const correct=puzzle.solution[r][c]?R.FILLED:R.MARKED;if(board[r][c]!==correct){snapshot();board[r][c]=correct;cursor={r,c};render();if(R.isSolved(board,puzzle.solution))finish(true);return}}}
boardEl.addEventListener('contextmenu',event=>event.preventDefault());
boardEl.addEventListener('pointerdown',event=>{const hit=cellFromEvent(event);if(!hit||!active)return;event.preventDefault();boardEl.setPointerCapture?.(event.pointerId);const value=event.button===2?R.MARKED:mode;drag={pointerId:event.pointerId,value,last:`${hit.r},${hit.c}`};snapshot();paint(hit.r,hit.c,value,true)});
boardEl.addEventListener('pointermove',event=>{if(!drag||drag.pointerId!==event.pointerId)return;event.preventDefault();const hit=cellFromEvent(event)||(()=>{const found=document.elementFromPoint?.(event.clientX,event.clientY);const el=found?.closest?.('.cell');return el?{r:Number(el.dataset.row),c:Number(el.dataset.col)}:null})();if(!hit)return;const key=`${hit.r},${hit.c}`;if(key===drag.last)return;drag.last=key;paint(hit.r,hit.c,drag.value,true)});
function endDrag(event){if(drag&&(!event||event.pointerId===drag.pointerId))drag=null}boardEl.addEventListener('pointerup',endDrag);boardEl.addEventListener('pointercancel',endDrag);boardEl.addEventListener('lostpointercapture',endDrag);
$('modeFill').addEventListener('click',()=>setMode(R.FILLED));$('modeMark').addEventListener('click',()=>setMode(R.MARKED));$('undoButton').addEventListener('click',undo);$('hintButton').addEventListener('click',hint);$('newButton').addEventListener('click',start);$('resultButton').addEventListener('click',nextPuzzle);$('levelButton').addEventListener('click',openLevels);$('progressSummary').addEventListener('click',openLevels);$('closeLevels').addEventListener('click',closeLevels);$('levelOverlay').addEventListener('click',event=>{if(event.target===$('levelOverlay'))closeLevels()});$('puzzleSelect').addEventListener('change',()=>{puzzleIndex=Number($('puzzleSelect').value);start();renderLevelGrid()});$('sizeSelect').addEventListener('change',()=>{size=Number($('sizeSelect').value);puzzleIndex=0;populatePuzzles();start()});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('levelOverlay').classList.contains('show')){closeLevels();return}if(event.key.toLowerCase()==='f')setMode(R.FILLED);else if(event.key.toLowerCase()==='x')setMode(R.MARKED);else if(event.key.toLowerCase()==='u')undo();else if(event.key.toLowerCase()==='h')hint();else if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();cursor.r=Math.max(0,Math.min(size-1,cursor.r+(event.key==='ArrowDown'?1:event.key==='ArrowUp'?-1:0)));cursor.c=Math.max(0,Math.min(size-1,cursor.c+(event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0)));render()}else if(event.key===' '||event.key==='Enter'){event.preventDefault();paint(cursor.r,cursor.c,mode)}});
size=Number($('sizeSelect').value);populatePuzzles();start();
})();
