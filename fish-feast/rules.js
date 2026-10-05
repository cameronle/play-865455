(function(root,factory){'use strict';const api=factory(typeof module==='object'&&module.exports?require('./content.js'):root.FishFeast.Content);if(typeof module==='object'&&module.exports)module.exports=api;else root.FishFeast.Rules=api;})(globalThis,function(C){
  'use strict';
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  function geometry(fish){const rx=C.sizes[clamp(fish.tier,0,C.sizes.length-1)],ratios={slender:.39,round:.76,forked:.49,tall:.74,pointed:.47,player:.60,dart:.43,stream:.35,hooked:.52,broad:.66,jelly:.90},ry=rx*(ratios[fish.shape]||.6);return{rx,ry,half:rx-ry};}
  function player(width,height){return{x:width*.42,y:height*.5,vx:0,vy:0,headingX:1,headingY:0,tier:1,shape:'player',growth:0,score:0,lives:3,combo:0,lastMeal:-10,invulnerable:1.2,dashTime:0,cooldown:0};}
  function grow(p){p.tier=1;for(let i=2;i<C.thresholds.length;i++)if(p.growth>=C.thresholds[i])p.tier=i;return p.tier;}
  function relation(p,other){return other.hazard?'danger':other.tier<p.tier?'food':other.tier===p.tier?'neutral':'danger';}
  function eat(p,prey,time){if(prey.dead||prey.warning>0||relation(p,prey)!=='food')return false;prey.dead=true;p.growth+=prey.nutrition;p.combo=time-p.lastMeal<2?Math.min(5,p.combo+1):1;p.lastMeal=time;p.score+=prey.nutrition*10+p.combo*2;grow(p);return true;}
  function hurt(p,x,y){if(p.invulnerable>0||p.lives<=0)return false;p.lives--;p.x=x;p.y=y;p.vx=p.vy=0;p.dashTime=0;p.combo=0;p.invulnerable=1.8;return true;}
  function bound(fish,width,height){const g=geometry(fish);fish.x=clamp(fish.x,g.rx,width-g.rx);fish.y=clamp(fish.y,g.ry,height-g.ry);}
  function hit(a,b){const ga=geometry(a),gb=geometry(b),dx=Math.max(0,Math.abs(a.x-b.x)-ga.half-gb.half),dy=a.y-b.y;return dx*dx+dy*dy<=(ga.ry+gb.ry)**2;}
  function pointSegment(x,y,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,den=dx*dx+dy*dy,t=den?clamp(((x-ax)*dx+(y-ay)*dy)/den,0,1):0;return (x-ax-t*dx)**2+(y-ay-t*dy)**2;}
  function swept(a,b,oldA,oldB){const ga=geometry(a),gb=geometry(b),h=ga.half+gb.half,r=ga.ry+gb.ry,ax=oldA.x-oldB.x,ay=oldA.y-oldB.y,bx=a.x-b.x,by=a.y-b.y;
    if((ay<=0&&by>=0||ay>=0&&by<=0)&&ay!==by){const x=ax+(bx-ax)*(-ay/(by-ay));if(x>=-h&&x<=h)return true;}
    const d=Math.min(pointSegment(ax,ay,-h,0,h,0),pointSegment(bx,by,-h,0,h,0),pointSegment(-h,0,ax,ay,bx,by),pointSegment(h,0,ax,ay,bx,by));return d<=r*r;
  }
  return{clamp,geometry,player,grow,relation,eat,hurt,bound,hit,swept};
});
