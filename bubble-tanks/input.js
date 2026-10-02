(() => {
  'use strict';
  const B = window.BubbleFrontier;
  function create(canvas, handlers) {
    const keys = new Set(), stick = document.querySelector('#joystick'), thumb = document.querySelector('#stickThumb');
    const aimStick=document.querySelector('#aimJoystick'),aimThumb=document.querySelector('#aimThumb');
    let aimPointer=null,aimVector=null,dualStick=false,playerPosition=()=>({x:400,y:400});
    let pointer = null, touchX = 0, touchY = 0, aim = null, assist = true;
    const movement = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight']);
    function clear() {
      keys.clear(); touchX = touchY = 0; aim = null;aimVector=null;
      if(aimPointer!==null){try{aimStick.releasePointerCapture(aimPointer);}catch(_){}aimPointer=null;}aimThumb.style.transform='translate(-50%,-50%)';
      if (pointer !== null) {try {stick.releasePointerCapture(pointer);} catch (_) {}}
      pointer = null; stick.classList.remove('active'); thumb.style.transform = 'translate(-50%,-50%)';
    }
    function sample() {
      return {x: touchX || Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')),
        y: touchY || Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp')), aim:aimVector?{x:playerPosition().x+aimVector.x*300,y:playerPosition().y+aimVector.y*300}:aim};
    }
    window.addEventListener('keydown', e => {
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName)) return;
      if (movement.has(e.code)) {
        if (handlers.isRunning()) {e.preventDefault(); keys.add(e.code);}
        return;
      }
      const action = {Space:'dash',KeyE:'skill',Escape:'pause',KeyP:'pause'}[e.code];
      if (action && !e.repeat) {e.preventDefault(); handlers.action(action);}
    });
    window.addEventListener('keyup', e => {if (movement.has(e.code)) {e.preventDefault(); keys.delete(e.code);}});
    window.addEventListener('blur', clear);
    function move(e) {
      if (e.pointerId !== pointer) return;
      e.preventDefault();
      const r = stick.getBoundingClientRect(), dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2;
      const limit = Math.min(r.width, r.height) * 0.35, length = Math.hypot(dx, dy), ratio = Math.min(1, limit / (length || 1));
      touchX = length < 5 ? 0 : dx * ratio / limit; touchY = length < 5 ? 0 : dy * ratio / limit;
      thumb.style.transform = `translate(calc(-50% + ${dx * ratio}px),calc(-50% + ${dy * ratio}px))`;
    }
    stick.addEventListener('pointerdown', e => {
      if (!handlers.isRunning() || pointer !== null) return;
      e.preventDefault(); pointer = e.pointerId; stick.classList.add('active');
      try {stick.setPointerCapture(pointer);} catch (_) {}
      move(e);
    });
    stick.addEventListener('pointermove', move);
    for (const type of ['pointerup','pointercancel','lostpointercapture']) stick.addEventListener(type, e => {
      if (e.pointerId === pointer) {e.preventDefault(); clear();}
    });
    for (const type of ['contextmenu','selectstart','dragstart']) stick.addEventListener(type, e => e.preventDefault());
    canvas.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' || !handlers.isRunning()) return;
      const r = canvas.getBoundingClientRect();
      aim = {x: (e.clientX - r.left) / r.width * 800, y: (e.clientY - r.top) / r.height * 800};
    });
    canvas.addEventListener('pointerleave', () => {if (assist) aim = null;});
    canvas.addEventListener('pointercancel', () => {aim = null;});
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    for (const id of ['dashButton','skillButton']) {
      const button = document.querySelector('#' + id);
      button.addEventListener('click', () => handlers.action(id === 'dashButton' ? 'dash' : 'skill'));
      button.addEventListener('contextmenu', e => e.preventDefault());
    }
    for (const target of [canvas, stick]) target.addEventListener('touchmove', e => {if (handlers.isRunning()) e.preventDefault();}, {passive:false});
    function aimMove(e){if(e.pointerId!==aimPointer)return;e.preventDefault();const r=aimStick.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,d=Math.hypot(x,y),limit=r.width*.35;if(d>5){aimVector={x:x/d,y:y/d};const ratio=Math.min(1,limit/d);aimThumb.style.transform=`translate(calc(-50% + ${x*ratio}px),calc(-50% + ${y*ratio}px))`;}}
    aimStick.addEventListener('pointerdown',e=>{if(!handlers.isRunning()||!dualStick||aimPointer!==null)return;aimPointer=e.pointerId;try{aimStick.setPointerCapture(aimPointer);}catch(_){}aimMove(e);});
    aimStick.addEventListener('pointermove',aimMove);for(const type of ['pointerup','pointercancel','lostpointercapture'])aimStick.addEventListener(type,e=>{if(e.pointerId===aimPointer){e.preventDefault();aimPointer=null;aimVector=null;aimThumb.style.transform='translate(-50%,-50%)';}});
    aimStick.addEventListener('touchmove',e=>{if(handlers.isRunning())e.preventDefault();},{passive:false});
    return {sample, clear, configure(options,position){dualStick=!!options.dualStick;playerPosition=position||playerPosition;aimStick.hidden=!dualStick;document.documentElement.dataset.hand=options.leftHand?'left':'right';clear();}, setAssist(value) {assist = value; aim = null;}};
  }
  B.Input = {create};
})();
