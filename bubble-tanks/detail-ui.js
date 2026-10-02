(() => {
 'use strict';
 const B=window.BubbleFrontier,D=B.Content,R=B.Rules,W=B.World;
 const dictionary={
  mapShort:['地图','Map'],map:['泡泡地图','Bubble map'],mapNote:['环线限制当前区域。Boss 在东侧主路，工坊在其西北。跨越边界进入相邻泡泡。','The ring gate limits your region. Bosses lie east; workshops northwest. Cross boundaries into adjacent bubbles.'],
  goal:['当前目标','Current objective'],back:['返回','Back'],continueSaved:['继续存档','Continue saved run'],newSaved:['开始新局（覆盖远征）','New run (replace expedition)'],normal:['普通 · 一次安全救援','Normal · one safe rescue'],hard:['挑战 · 无救援','Hard · no rescue'],
  assembly:['安全组装','Assembly'],workshop:['泡泡工坊','Workshop'],event:['膜内信号','Membrane signal'],elite:['精英泡泡','Elite bubble'],hive:['蜂巢泡泡','Hive bubble'],challenge:['无损挑战','No-hit challenge'],boss:['区域 Boss','Region boss'],
  codex:['构筑图鉴','Build codex'],assemblyNote:['拖动炮口连接泡泡，或选模块再调整。超预算模块休眠；镜像消耗独立功率。','Drag connected mounts, or select and adjust. Over-budget modules sleep; mirrors cost full power.'],
  mirror:['镜像','Mirror'],rotate:['转向','Rotate'],priority:['优先','Priority'],remove:['拆下','Remove'],undo:['撤销','Undo'],auto:['自动','Auto'],commit:['应用','Apply'],cancel:['取消','Cancel'],install:['安装','Install'],
  salvage:['回收','Salvage'],repair:['修复质量 · 3','Repair mass · 3'],refill:['补充护盾 · 2','Refill shield · 2'],bought:['已购','Bought'],power:['功率','Power'],shield:['护盾','Shield'],lost:['泡泡散落了','Your bubbles scattered'],
  eventNote:['一次性选择；离开后不会重新出现。质量交换只增加进化，不直接修复机体。','One choice only; it never rerolls. Mass trade raises evolution, not body mass.'],eventSalvage:['回收碎片 · +5','Recover salvage · +5'],eventGrowth:['交换进化 · 质量 -8 / 进化 +18','Trade · mass -8 / evolution +18'],eventLeave:['保持机体 · 不交换','Keep your body · no trade'],
  saved:['已保存本次远征；随时继续。','Expedition saved; continue at any time.'],saveWarning:['存档不可用或存储受限。旧数据未自动删除；开始新局会覆盖本次远征。','Save unavailable or storage restricted. Old data was not deleted; starting a new run replaces this expedition.'],
  rescued:['已使用一次安全救援，返回最近安全泡泡。蓝图保留；低功率模块暂时休眠。','Your one rescue returned you to safety. Blueprints remain; low-power modules sleep.'],win:['远征胜利','Expedition victory'],
  region:['区域','Region'],wins:['胜利','Wins'],records:['本地记录','Local records'],discovery:['图鉴只记录发现，不提供永久属性。','Discoveries are records, not permanent stat boosts.'],
  mapLegend:['● 战斗 · ◆ 精英 · H 蜂巢 · W 工坊 · E 事件 · C 挑战 · B Boss · ◎ 宝藏；点亮圆点是你。','● combat · ◆ elite · H hive · W workshop · E event · C challenge · B boss · ◎ cache; filled dot = you.']
 };
 function create(handlers){
  const el=id=>document.querySelector('#'+id),txt=(key,lang)=>D.text(dictionary[key],lang);
  let language='',detailKey='',current=null,drag=null;
  const actions={continueButton:'continueSaved',mapButton:'map',mapCloseButton:'close',roomActionButton:'room',assemblyButton:'assembly',codexButton:'codex',codexCloseButton:'close',workshopCloseButton:'close',repairButton:'repair',refillButton:'refill',eventSalvageButton:'event:salvage',eventGrowthButton:'event:growth',eventLeaveButton:'event:leave'};
  for(const[id,action]of Object.entries(actions))el(id).addEventListener('click',()=>handlers.action(action));
  for(const[id,type]of Object.entries({assemblyMirrorButton:'mirror',assemblyRotateButton:'rotate',assemblyPriorityButton:'priority',assemblyRemoveButton:'remove',assemblyUndoButton:'undo',assemblyAutoButton:'auto',assemblyCommitButton:'commit',assemblyCancelButton:'cancel'}))el(id).addEventListener('click',()=>handlers.edit({type,slot:Number(el('assemblySelect').value),angle:Math.PI/12}));
  el('assemblyAddButton').addEventListener('click',()=>handlers.edit({type:'add',id:el('assemblyBlueprintSelect').value}));
  for(const[id,delta]of Object.entries({assemblyLeftButton:[-4,0],assemblyUpButton:[0,-4],assemblyDownButton:[0,4],assemblyRightButton:[4,0]}))el(id).addEventListener('click',()=>{if(current?.mode!=='assembly')return;const slot=Number(el('assemblySelect').value),gun=current.draft.find(g=>g.slot===slot),m=R.mount(gun);handlers.edit({type:'move',slot,x:m.x+delta[0],y:m.y+delta[1]});});
  function translate(lang){const select=el('difficultySelect'),old=select.value;select.replaceChildren();for(const id of ['normal','hard']){const option=document.createElement('option');option.value=id;option.textContent=txt(id,lang);select.append(option);}select.value=old==='hard'?'hard':'normal';}
  function itemCard(item,lang,extra,onClick){
   const card=document.createElement('button');card.type='button';card.className='upgrade-choice';
   const mark=document.createElement('span');mark.setAttribute('aria-hidden','true');mark.innerHTML=`<svg viewBox="0 0 50 50" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${B.Visuals.icon(item)}</svg>`;
   const copy=document.createElement('span'),heading=document.createElement('b'),description=document.createElement('span');heading.textContent=D.text(item.name,lang)+extra;description.textContent=D.text(item.description,lang);copy.append(heading,description);card.append(mark,copy);card.addEventListener('click',onClick);return card;
  }
  function map(state){
   const z=Math.min(3,state.world.bosses),pos=state.world.position,goalX=3+z*3;
   el('mapGoal').textContent=`${txt('region',state.lang)} ${z+1}/4 · ${txt('goal',state.lang)}: Boss (${goalX}, 0) · ${txt('workshop',state.lang)} (${goalX-2}, -1). ${txt('mapNote',state.lang)}`;
   el('mapLegend').textContent=txt('mapLegend',state.lang);el('mapGrid').replaceChildren();const signs={start:'○',combat:'●',elite:'◆',hive:'H',workshop:'W',event:'E',challenge:'C',boss:'B',cache:'◎'};
   for(let y=pos.y-4;y<=pos.y+4;y++)for(let x=pos.x-4;x<=pos.x+4;x++){
    const node=document.createElement('span'),room=state.world.rooms[W.key(x,y)],hint=x===goalX&&y===0?'boss':x===goalX-2&&y===-1?'workshop':null;
    node.className='map-cell'+(x===pos.x&&y===pos.y?' current':'')+(room?.cleared?' cleared':'');node.textContent=room?.visited||room?.scanned?signs[room.type]:hint?signs[hint]:'·';node.setAttribute('aria-label',`${x}, ${y}`);el('mapGrid').append(node);
   }
  }
  function workshop(state){
   const room=W.current(state.world);el('workshopBalance').textContent=`${txt('salvage',state.lang)} ${state.salvage} · ${state.lang==='en'?'Stock is fixed per bubble.':'每个泡泡的货架固定，购买后不会补货。'}`;
   el('workshopStock').replaceChildren();for(const id of room.stock||[]){const item=D.upgrades.find(u=>u.id===id);if(!item)continue;const sold=room.bought.includes(id),card=itemCard(item,state.lang,sold?' · '+txt('bought',state.lang):' · 4',()=>handlers.buy(id));card.dataset.stock=id;card.disabled=sold||state.salvage<4||!R.canUpgrade(state.player,item);el('workshopStock').append(card);}
   el('repairButton').disabled=state.salvage<3||state.player.mass>=400;el('refillButton').disabled=state.salvage<2||state.player.shield>=Math.max(15,(state.player.passives.shield||0)*10);
  }
  function assembly(state){
   const select=el('assemblySelect'),old=Number(select.value);select.replaceChildren();for(const gun of state.draft){const option=document.createElement('option');option.value=String(gun.slot);option.textContent=D.text(D.guns.find(g=>g.id===gun.id).name,state.lang)+` #${gun.slot+1} · ${gun.cost}`;select.append(option);}select.value=String(state.draft.some(g=>g.slot===old)?old:state.draft[0].slot);
   const blueprints=el('assemblyBlueprintSelect'),previous=blueprints.value;blueprints.replaceChildren();for(const[id,level]of Object.entries(state.player.blueprints||{})){const def=D.guns.find(g=>g.id===id),option=document.createElement('option');option.value=id;option.textContent=D.text(def.name,state.lang)+` ${level}`;blueprints.append(option);}blueprints.value=state.player.blueprints?.[previous]?previous:Object.keys(state.player.blueprints||{})[0]||'pulse';
   const used=state.draft.reduce((sum,g)=>sum+g.cost,0);el('assemblyPower').textContent=`${txt('power',state.lang)} ${used} / ${R.power(state.player)} · ${state.draft.length} ${state.lang==='en'?'mounts':'炮口'}`;
   const ctx=el('assemblyPreview').getContext('2d'),color=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#276f96';ctx.clearRect(0,0,280,180);ctx.save();ctx.translate(140,90);ctx.scale(1.55,1.55);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1;
   for(const c of R.bodyShape(state.player)){ctx.beginPath();ctx.arc(c.x,c.y,c.r,0,Math.PI*2);ctx.stroke();}
   for(const gun of state.draft){const m=R.mount(gun);ctx.save();ctx.translate(m.x,m.y);ctx.rotate(gun.angle||0);ctx.globalAlpha=gun.slot===Number(select.value)?1:.45;ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(12,0);ctx.stroke();ctx.restore();}ctx.restore();
   const selected=state.draft.find(g=>g.slot===Number(select.value));el('assemblyMirrorButton').disabled=used+selected.cost>R.power(state.player);el('assemblyRemoveButton').disabled=selected.slot===0;el('assemblyUndoButton').disabled=!state.draftHistory.length;
   el('assemblyAddButton').disabled=state.draft.length>=10||used+(D.guns.find(g=>g.id===blueprints.value)?.cost||99)>R.power(state.player);
  }
  el('assemblySelect').addEventListener('change',()=>{if(current?.mode==='assembly')assembly(current);});const preview=el('assemblyPreview');
  el('assemblyBlueprintSelect').addEventListener('change',()=>{if(current?.mode==='assembly')assembly(current);});
  function point(e){const r=preview.getBoundingClientRect();return{x:((e.clientX-r.left)*280/r.width-140)/1.55,y:((e.clientY-r.top)*180/r.height-90)/1.55};}
  preview.addEventListener('pointerdown',e=>{if(current?.mode!=='assembly')return;e.preventDefault();const p=point(e),gun=current.draft.reduce((best,g)=>Math.hypot(R.mount(g).x-p.x,R.mount(g).y-p.y)<Math.hypot(R.mount(best).x-p.x,R.mount(best).y-p.y)?g:best,current.draft[0]);if(Math.hypot(R.mount(gun).x-p.x,R.mount(gun).y-p.y)>15)return;drag={id:e.pointerId,slot:gun.slot};el('assemblySelect').value=String(gun.slot);try{preview.setPointerCapture(e.pointerId);}catch(_){}assembly(current);});
  preview.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId||current?.mode!=='assembly')return;e.preventDefault();const p=point(e);handlers.edit({type:'move',slot:drag.slot,x:Math.round(p.x/2)*2,y:Math.round(p.y/2)*2});});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])preview.addEventListener(event,()=>{drag=null;});
  function codex(state){
   const records=state.records||{runs:0,wins:0,best:0};el('codexSummary').textContent=`${txt('records',state.lang)}: ${records.runs} · ${txt('wins',state.lang)} ${records.wins} · BEST ${records.best}. ${txt('discovery',state.lang)}`;
   el('codexEntries').replaceChildren();for(const item of [...D.chassis,...D.upgrades,...D.synergies,...D.enemies,...B.Bosses.definitions]){const row=document.createElement('div'),heading=document.createElement('b'),text=document.createElement('span');heading.textContent=D.text(item.name,state.lang);text.textContent=D.text(item.description||item.tip,state.lang);row.append(heading,text);el('codexEntries').append(row);}
  }
  function update(state){
   current=state;const p=state.player,room=W.current(state.world),lang=state.lang;
   if(language!==lang){language=lang;translate(lang);detailKey='';}
   for(const[id,mode]of Object.entries({mapPanel:'map',workshopPanel:'workshop',eventPanel:'event',assemblyPanel:'assembly',codexPanel:'codex'}))el(id).hidden=state.mode!==mode;
   el('resultPanel').hidden=!['over','won'].includes(state.mode);el('mapButton').disabled=!['running','paused'].includes(state.mode);el('assemblyButton').disabled=!room.cleared;el('roomActionButton').disabled=!['running','paused'].includes(state.mode)||!room.cleared;
   el('roomActionButton').textContent=txt(room.type==='workshop'?'workshop':room.type==='event'&&!room.eventResolved?'event':'assembly',lang);el('continueButton').hidden=!state.hasSave;
   if(state.hasSave)el('startButton').textContent=txt('newSaved',lang);
   el('saveStatus').textContent=state.storageWarning?txt('saveWarning',lang):state.hasSave?txt('saved',lang):'';el('storageStatus').textContent=state.storageWarning?txt('saveWarning',lang):txt('saved',lang);
   if(state.notice==='rescue')el('pauseDetail').textContent=txt('rescued',lang);
   if(['elite','hive','workshop','event','challenge','boss'].includes(room.type))el('roomLabel').textContent=txt(room.type,lang);
   el('roomLabel').textContent=`${room.zone+1}/4 · `+el('roomLabel').textContent;
   el('shieldValue').textContent+=` · ${txt('salvage',lang)} ${state.salvage} · ${lang==='en'?'Rescue':'救援'} ${state.rescueLeft}`;
   const nextDetail=`${lang}:${state.mode}:${room.id}:${state.salvage}:${JSON.stringify(state.draft)}:${JSON.stringify(room.bought)}:${JSON.stringify(p.loadout)}:${Math.floor(p.mass)}`;
   if(nextDetail!==detailKey){detailKey=nextDetail;if(state.mode==='map')map(state);if(state.mode==='workshop')workshop(state);if(state.mode==='assembly')assembly(state);if(state.mode==='codex')codex(state);}
   el('eventGrowthButton').disabled=p.mass<18;
   if(['over','won'].includes(state.mode)){el('resultTitle').textContent=txt(state.mode==='won'?'win':'lost',lang);el('resultDetail').textContent=lang==='en'?`${state.world.bosses}/4 bosses · ${state.world.cleared} bubbles cleared · ${state.score} points · Evolution ${state.level}`:`击破 ${state.world.bosses}/4 Boss · 清空 ${state.world.cleared} 个泡泡 · ${state.score} 分 · 进化 ${state.level}`;}
  }
  return{update};
 }
 B.DetailUI={create,dictionary};
})();
