(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.NonogramRules=api;
})(typeof window!=='undefined'?window:this,function(){
  'use strict';
  const UNKNOWN=0,FILLED=1,MARKED=2;
  const raw={
    5:[
      {name:'HEART',rows:['01010','11111','11111','01110','00100']},
      {name:'ARROW',rows:['00100','01100','11111','01100','00100']},
      {name:'CUP',rows:['10001','10001','10001','01110','00100']}
    ],
    10:[
      {name:'ROCKET',rows:['0001100000','0011110000','0111111000','0111111000','0111111000','0011110000','0011110000','0110011000','1100001100','0100001000']},
      {name:'CAT',rows:['1100000011','1110000111','1111001111','1111111111','1101111011','1111111111','0111111110','0011111100','0011001100','0110000110']},
      {name:'TREE',rows:['0001100000','0011110000','0111111000','1111111100','0011110000','0111111000','1111111100','0001100000','0001100000','0011110000']}
    ],
    15:[
      {name:'ALIEN',rows:['000110000110000','000011001100000','000111111110000','001110110111000','011111111111100','110111111101100','110110000101100','000011001100000','000110110110000','001100000011000','011000000001100','110000000000110','110000000000110','011000000001100','001100000011000']},
      {name:'DIAMOND',rows:['000000010000000','000000111000000','000001111100000','000011111110000','000111111111000','001111111111100','011111111111110','111111111111111','011111111111110','001111111111100','000111111111000','000011111110000','000001111100000','000000111000000','000000010000000']},
      {name:'LIGHTHOUSE',rows:['000000111000000','000001111100000','000011111110000','000001111100000','000001111100000','000011111110000','000010000010000','000011111110000','000010101010000','000011111110000','000010101010000','000011111110000','000111111111000','001111111111100','011111111111110']}
    ]
  };
  function runs(line){const result=[];let count=0;for(const value of line){if(value){count++}else if(count){result.push(count);count=0}}if(count)result.push(count);return result.length?result:[0]}
  function makeClues(solution){
    const rows=solution.map(runs),width=solution[0]?.length||0;
    const cols=Array.from({length:width},(_,col)=>runs(solution.map(row=>row[col])));
    return{rows,cols};
  }
  function decode(entry){const solution=entry.rows.map(row=>[...row].map(Number));return{name:entry.name,size:solution.length,solution,clues:makeClues(solution)}}
  function clonePuzzle(puzzle){return{name:puzzle.name,size:puzzle.size,solution:puzzle.solution.map(row=>row.slice()),clues:{rows:puzzle.clues.rows.map(row=>row.slice()),cols:puzzle.clues.cols.map(col=>col.slice())}}}
  function listPuzzles(size){return(raw[size]||[]).map(entry=>clonePuzzle(decode(entry)))}
  function getPuzzle(size,index){const list=listPuzzles(size);if(!list.length)throw new Error('Unsupported puzzle size');return list[((Number(index)||0)%list.length+list.length)%list.length]}
  function nextState(value){return value===UNKNOWN?FILLED:value===FILLED?MARKED:UNKNOWN}
  function isSolved(board,solution){return solution.every((row,r)=>row.every((value,c)=>(board[r]?.[c]===FILLED)===Boolean(value)))}
  function emptyBoard(size){return Array.from({length:size},()=>Array(size).fill(UNKNOWN))}
  return{UNKNOWN,FILLED,MARKED,runs,makeClues,listPuzzles,getPuzzle,nextState,isSolved,emptyBoard};
});
