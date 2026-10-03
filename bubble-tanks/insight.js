(function(root,factory){const node=typeof module==='object'&&module.exports,api=factory(node?require('./rules.js'):root.BubbleFrontier.Rules,node?require('./content.js'):root.BubbleFrontier.Content,node?require('./visuals.js'):root.BubbleFrontier.Visuals);if(node)module.exports=api;else(root.BubbleFrontier||={}).Insight=api;})(typeof globalThis!=='undefined'?globalThis:this,function(R,D,V){
 'use strict';
 const labels={gun:['武器','Weapon'],passive:['被动','Passive'],relic:['遗物','Relic'],skill:['技能','Skill'],branch:['分支','Branch']};
 const num=n=>Number(n.toFixed(2));
 function preview(player,item,lang='zh'){
  const en=lang==='en',p=JSON.parse(JSON.stringify(player)),rank=R.rank(p,item.id),before=V.links(p,D,R),used=p.loadout.reduce((n,g)=>n+g.cost,0),supply=R.power(p);
  const lines=[D.text(labels[item.type],lang)+(rank?` ${rank} → ${rank+1}`:(en?' · New':' · 新获得'))];
  if(!R.applyUpgrade(p,item.id))return{lines:[...lines,en?'Unavailable: check power or mount limit':'无法安装：检查功率或炮口上限'],links:[],sleeping:[]};
  const delta=p.loadout.reduce((n,g)=>n+g.cost,0)-used,capacity=R.power(p)-supply;
  lines.push(capacity?`${en?'Capacity':'供能'} ${supply} → ${R.power(p)}`:delta?`${en?'Power':'功率'} ${used} → ${used+delta} / ${R.power(p)}`:en?'Same power':'功率不变');
  if(item.type==='gun'){const next=R.baseDamage({id:item.id,level:rank+1});lines.push(`${en?'Base hit':'基础伤害'} ${rank?num(R.baseDamage({id:item.id,level:rank}))+' → ':''}${num(next)}`);}
  const links=V.links(p,D,R).filter(s=>!before.some(b=>b.id===s.id)),active=R.activeLoadout({...p,powerGrace:0}),sleeping=p.loadout.filter(g=>!active.includes(g));
  if(links.length)lines.push((en?'Link: ':'联动：')+links.map(s=>D.text(s.name,lang)).join(' / '));
  if(sleeping.length)lines.push((en?'Sleeping: ':'休眠：')+sleeping.map(g=>D.text(D.guns.find(d=>d.id===g.id).name,lang)).join(' / '));
  return{lines,links:links.map(s=>s.id),sleeping:sleeping.map(g=>g.id)};
 }
 function assembly(player,draft,lang='zh'){
  const en=lang==='en',lower={...player,loadout:draft,powerGrace:0,mass:Math.max(0,(R.THRESHOLDS[R.tier(player.mass)]||0)-1)},active=R.activeLoadout(lower),counts={};for(const g of draft)counts[g.id]=(counts[g.id]||0)+1;
  const copies=Object.entries(counts).filter(([,n])=>n>1).map(([id,n])=>`${D.text(D.guns.find(g=>g.id===id).name,lang)} ×${n}: ${num(n/(1+.65*(n-1)))}×`);
  return(en?'One tier lower, active: ':'掉一档仍工作：')+active.map(g=>D.text(D.guns.find(d=>d.id===g.id).name,lang)).join(' / ')+(copies.length?' · '+(en?'Duplicate damage (not linear): ':'同款总伤害（非线性）：')+copies.join(' / '):'');
 }
 return{preview,assembly};
});
