(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FishFeast.Input=api;})(globalThis,function(){
 'use strict';
 function create(canvas,button,options){const keys=new Set();let moveOwner=null,dashOwner=null,gesture=null,target=null;
  const host=options.root||window,active=options.active;
  function clear(){keys.clear();moveOwner=dashOwner=null;gesture=target=null;}
  function capture(node,id){try{node.setPointerCapture(id);}catch(_) {}}
  function release(node,id){try{node.releasePointerCapture(id);}catch(_) {}}
  function sample(){
   const x=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),y=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);
   if(gesture&&(gesture.dx||gesture.dy)){
    // Batch all events since the last frame, anchored to the actual fish.
    // Fresh motion replaces untravelled target debt, so turns respond now.
    if(!x&&!y){const p=options.player(),world=options.world();target={x:Math.max(0,Math.min(world.width,p.x+gesture.dx)),y:Math.max(0,Math.min(world.height,p.y+gesture.dy))};}
    gesture.dx=gesture.dy=0;
   }
   return{x,y,target:x||y?null:target?{...target}:null};
  }
  function point(event){const rect=canvas.getBoundingClientRect(),world=options.world();return{x:(event.clientX-rect.left)*world.width/rect.width,y:(event.clientY-rect.top)*world.height/rect.height};}
  canvas.addEventListener('pointerdown',e=>{if(!active()||moveOwner!==null||e.button>0)return;e.preventDefault();moveOwner=e.pointerId;gesture={x:e.clientX,y:e.clientY,dx:0,dy:0};target={x:options.player().x,y:options.player().y};capture(canvas,moveOwner);});
  canvas.addEventListener('pointermove',e=>{if(!active())return;if(moveOwner===e.pointerId&&gesture){e.preventDefault();const rect=canvas.getBoundingClientRect(),world=options.world();gesture.dx+=(e.clientX-gesture.x)*world.width/rect.width;gesture.dy+=(e.clientY-gesture.y)*world.height/rect.height;gesture.x=e.clientX;gesture.y=e.clientY;}else if(e.pointerType==='mouse'&&moveOwner===null&&!e.buttons)target=point(e);});
  function end(e){if(e.pointerId!==moveOwner)return;e.preventDefault();const id=moveOwner;moveOwner=null;gesture=target=null;release(canvas,id);}
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,end);
  canvas.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&moveOwner===null)target=null;});
  for(const type of ['contextmenu','selectstart','dragstart'])canvas.addEventListener(type,e=>e.preventDefault());
  canvas.addEventListener('touchmove',e=>{if(active())e.preventDefault();},{passive:false});
  button.addEventListener('pointerdown',e=>{if(!active()||button.disabled||dashOwner!==null||e.button>0)return;e.preventDefault();dashOwner=e.pointerId;capture(button,dashOwner);options.dash();});
  function endDash(e){if(e.pointerId!==dashOwner)return;e.preventDefault();const id=dashOwner;dashOwner=null;release(button,id);}
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,endDash);
  button.addEventListener('click',e=>{if(e.detail===0&&active()&&!button.disabled)options.dash();});
  host.addEventListener('keydown',e=>{if(!active()||/INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target?.tagName||''))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();keys.add(e.code);target=null;}else if(e.code==='Space'){e.preventDefault();if(!e.repeat)options.dash();}});
  host.addEventListener('keyup',e=>keys.delete(e.code));
  return{sample,clear,snapshot:()=>({moveOwner,dashOwner,keys:[...keys],target:target?{...target}:null})};
 }
 return{create};
});
