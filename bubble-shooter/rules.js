(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BubbleShooterRules=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function emptyGrid(rows=12,cols=8){return Array.from({length:rows},()=>Array(cols).fill(null));}
function neighbors(row,col){const diagonals=row%2?[[row-1,col],[row-1,col+1],[row+1,col],[row+1,col+1]]:[[row-1,col-1],[row-1,col],[row+1,col-1],[row+1,col]];return [[row,col-1],[row,col+1],...diagonals];}
function inside(grid,row,col){return row>=0&&row<grid.length&&col>=0&&col<grid[0].length;}
function component(grid,row,col,color=grid[row]&&grid[row][col]){if(!color||!inside(grid,row,col))return[];const found=[],seen=new Set([`${row},${col}`]),queue=[[row,col]];while(queue.length){const [r,c]=queue.shift();found.push([r,c]);for(const [nr,nc] of neighbors(r,c)){const key=`${nr},${nc}`;if(inside(grid,nr,nc)&&!seen.has(key)&&grid[nr][nc]===color){seen.add(key);queue.push([nr,nc]);}}}return found;}
function attached(grid){const seen=new Set(),queue=[];for(let c=0;c<grid[0].length;c++)if(grid[0][c]){seen.add(`0,${c}`);queue.push([0,c]);}while(queue.length){const [r,c]=queue.shift();for(const [nr,nc] of neighbors(r,c)){const key=`${nr},${nc}`;if(inside(grid,nr,nc)&&grid[nr][nc]&&!seen.has(key)){seen.add(key);queue.push([nr,nc]);}}}return seen;}
function resolve(grid,row,col){const group=component(grid,row,col);if(group.length<3)return{matched:0,dropped:0};for(const [r,c] of group)grid[r][c]=null;const connected=attached(grid);let dropped=0;for(let r=0;r<grid.length;r++)for(let c=0;c<grid[r].length;c++)if(grid[r][c]&&!connected.has(`${r},${c}`)){grid[r][c]=null;dropped++;}return{matched:group.length,dropped};}
function addRow(grid,colors){const cols=grid[0].length;grid.unshift(Array.from({length:cols},(_,i)=>colors[i%colors.length]));}
function occupied(grid){let count=0;for(const row of grid)for(const cell of row)if(cell)count++;return count;}
return{emptyGrid,neighbors,inside,component,resolve,addRow,occupied};
});
