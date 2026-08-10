(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SolitaireRules=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const SUITS=['clubs','diamonds','hearts','spades'];
const red=s=>s==='diamonds'||s==='hearts';
function createDeck(){return SUITS.flatMap(suit=>Array.from({length:13},(_,i)=>({id:`${suit}-${i+1}`,suit,rank:i+1,faceUp:false})));}
function cloneState(state){return JSON.parse(JSON.stringify(state));}
function shuffle(deck,random=Math.random){const copy=deck.map(card=>({...card}));for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
function deal(source=createDeck()){const deck=source.map(card=>({...card,faceUp:false})),tableau=Array.from({length:7},()=>[]);for(let col=0;col<7;col++)for(let row=0;row<=col;row++)tableau[col].push(deck.shift());for(const pile of tableau)pile[pile.length-1].faceUp=true;return{tableau,foundations:[[],[],[],[]],stock:deck,waste:[],moves:0};}
function canPlaceOnTableau(card,target){if(!card||!card.faceUp)return false;if(!target)return card.rank===13;return target.faceUp&&red(card.suit)!==red(target.suit)&&card.rank===target.rank-1;}
function canPlaceOnFoundation(card,target){if(!card||!card.faceUp)return false;if(!target)return card.rank===1;return card.suit===target.suit&&card.rank===target.rank+1;}
function validRun(cards){for(let i=0;i<cards.length;i++){if(!cards[i].faceUp)return false;if(i&& !canPlaceOnTableau(cards[i],cards[i-1]))return false;}return cards.length>0;}
function reveal(pile){if(pile.length&&!pile[pile.length-1].faceUp)pile[pile.length-1].faceUp=true;}
function moveTableau(state,from,index,to=from===0?1:0){const source=state.tableau[from],target=state.tableau[to];if(!source||!target||index<0||index>=source.length||from===to)return false;const moving=source.slice(index);if(!validRun(moving)||!canPlaceOnTableau(moving[0],target.at(-1)||null))return false;target.push(...moving);source.splice(index);reveal(source);state.moves++;return true;}
function moveWasteToTableau(state,to){const card=state.waste.at(-1),target=state.tableau[to];if(!card||!target||!canPlaceOnTableau(card,target.at(-1)||null))return false;target.push(state.waste.pop());state.moves++;return true;}
function foundationIndex(suit){return SUITS.indexOf(suit);}
function moveToFoundation(state,source,index){let card,pile;if(source==='waste'){card=state.waste.at(-1);pile=state.waste;}else{pile=state.tableau[source];if(!pile||index!==pile.length-1)return false;card=pile.at(-1);}const foundation=state.foundations[foundationIndex(card&&card.suit)];if(!card||!foundation||!canPlaceOnFoundation(card,foundation.at(-1)||null))return false;foundation.push(pile.pop());if(source!=='waste')reveal(pile);state.moves++;return true;}
function moveFoundationToTableau(state,foundationIndexValue,to){const foundation=state.foundations[foundationIndexValue],target=state.tableau[to],card=foundation&&foundation.at(-1);if(!card||!target||!canPlaceOnTableau(card,target.at(-1)||null))return false;target.push(foundation.pop());state.moves++;return true;}
function drawStock(state){if(state.stock.length){const card=state.stock.pop();card.faceUp=true;state.waste.push(card);state.moves++;return true;}if(state.waste.length){state.stock=state.waste.reverse().map(card=>({...card,faceUp:false}));state.waste=[];state.moves++;return true;}return false;}
function isComplete(state){return state.foundations.length===4&&state.foundations.every(p=>p.length===13);}
return{SUITS,createDeck,shuffle,deal,cloneState,canPlaceOnTableau,canPlaceOnFoundation,moveTableau,moveWasteToTableau,moveToFoundation,moveFoundationToTableau,drawStock,isComplete};
});
