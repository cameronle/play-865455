(() => {
  'use strict';
  const tones = {shot:[350,200,0.04,0.014],pickup:[620,840,0.055,0.025],kill:[180,70,0.13,0.035],hit:[130,52,0.14,0.04],
    upgrade:[540,1060,0.23,0.05],dash:[220,640,0.1,0.025],shield:[400,700,0.22,0.035]};
  function create() {
    let context = null, enabled = true; const clocks = {};
    function unlock() {
      if (!enabled) return;
      try {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!context && Audio) context = new Audio();
        if (context?.state === 'suspended') context.resume().catch(() => {});
      } catch (_) {context = null;}
    }
    function play(kind) {
      if (!enabled || !context || context.state !== 'running' || !tones[kind]) return;
      const now = context.currentTime;
      if (['shot','pickup'].includes(kind) && now - (clocks[kind] ?? -100) < 0.09) return;
      clocks[kind] = now;
      try {
        const [from,to,duration,volume] = tones[kind], oscillator = context.createOscillator(), gain = context.createGain();
        oscillator.type = kind === 'hit' || kind === 'kill' ? 'triangle' : 'sine';
        oscillator.frequency.setValueAtTime(from,now); oscillator.frequency.exponentialRampToValueAtTime(to,now + duration);
        gain.gain.setValueAtTime(volume,now); gain.gain.exponentialRampToValueAtTime(0.0001,now + duration);
        oscillator.connect(gain); gain.connect(context.destination); oscillator.start(now); oscillator.stop(now + duration);
      } catch (_) {}
    }
    return {unlock,play,setEnabled(value) {enabled = !!value;},status() {return context?.state || 'locked';}};
  }
  window.BubbleFrontier.Sound = {create};
})();
