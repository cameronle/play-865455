(()=>{
  'use strict';
  const KEY='play-theme';
  const MODES=['system','light','dark'];
  const media=window.matchMedia('(prefers-color-scheme: dark)');
  let mode=localStorage.getItem(KEY);
  if(!MODES.includes(mode))mode='system';

  function resolved(){return mode==='system'?(media.matches?'dark':'light'):mode}
  function themeColor(){
    const value=getComputedStyle(document.documentElement).getPropertyValue('--theme-color').trim();
    return value||(resolved()==='dark'?'#090d14':'#faf8ef');
  }
  function updateControls(){
    document.querySelectorAll('.theme-toggle').forEach(button=>{
      button.textContent=mode==='system'?'AUTO':mode.toUpperCase();
      button.dataset.mode=mode;
      button.setAttribute('aria-label',`Theme: ${mode}. Activate to change.`);
      button.setAttribute('title',`Theme: ${mode}`);
    });
  }
  function apply(){
    const theme=resolved();
    document.documentElement.dataset.theme=theme;
    document.documentElement.dataset.themeMode=mode;
    document.documentElement.style.colorScheme=theme;
    updateControls();
    requestAnimationFrame(()=>{
      const meta=document.querySelector('meta[name="theme-color"]');
      if(meta)meta.content=themeColor();
      document.dispatchEvent(new CustomEvent('themechange',{detail:{mode,theme}}));
    });
  }
  function cycle(){
    mode=MODES[(MODES.indexOf(mode)+1)%MODES.length];
    localStorage.setItem(KEY,mode);
    apply();
  }
  function bind(){
    document.querySelectorAll('.theme-toggle').forEach(button=>button.addEventListener('click',cycle));
    updateControls();
  }

  apply();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  media.addEventListener('change',()=>{if(mode==='system')apply()});
})();
