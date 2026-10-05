const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const css=fs.readFileSync('flappy/style.css','utf8');
const roles=['sky','grid','cloud','cloud-line','pipe','pipe-line','ground','ground-line','ground-detail','waypoint','bird','wing','beak','bird-line','eye','cap'];
function scene(theme){const colors={};for(const m of css.matchAll(/(:root|\[data-theme="dark"\])\s*\{([^}]*)\}/g))if(m[1]===':root'||theme==='dark')for(const t of m[2].matchAll(/--scene-([\w-]+):\s*(#[\da-f]{6})\s*[;}]/gi))colors[t[1]]=t[2];return colors}
function luminance(hex){const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb.reduce((v,n,i)=>v+n*[.2126,.7152,.0722][i],0)}
function contrast(a,b){const [lo,hi]=[luminance(a),luminance(b)].sort((a,b)=>a-b);return(hi+.05)/(lo+.05)}
test('Birdie playfield has independent light/dark semantic colors with foreground hierarchy',()=>{
 for(const theme of ['light','dark']){const p=scene(theme);for(const role of roles)assert.match(p[role]||'',/^#[\da-f]{6}$/i,`${theme} ${role} scene token missing`);
  assert.ok(contrast(p.sky,p.pipe)>=2,`${theme} pillar fill must remain readable`);assert.ok(contrast(p.sky,p['pipe-line'])>=3,`${theme} obstacle edge`);
  assert.ok(contrast(p.sky,p['cloud-line'])<contrast(p.sky,p['pipe-line']),`${theme} scenery must be quieter than obstacles`);
  assert.ok(contrast(p.bird,p['bird-line'])>=4.5,`${theme} warm bird silhouette`);assert.ok(contrast(p.eye,p['bird-line'])>=7,`${theme} eye does not invert with page theme`);
  assert.ok(luminance(p.waypoint)<luminance(p.sky)||contrast(p.sky,p.waypoint)<3,`${theme} route guides should not outshine the bird`);
 }
 assert.notEqual(scene('light').sky,scene('dark').sky);assert.notEqual(scene('light').pipe,scene('dark').pipe);
});

test('Birdie Canvas uses the scene palette, keeping scenery and bird colors separate on both themes',()=>{
 const {boot}=require('./helpers/flappy-runtime.js');
 for(const theme of ['light','dark']){
  const p=scene(theme),calls=[],tokens=Object.fromEntries(Object.entries(p).map(([k,v])=>['--scene-'+k,v]));
  // Deliberately hostile page colors prove that the renderer no longer reuses HUD tokens.
  const h=boot({css:{...tokens,'--paper':'#ff00ff','--ink':'#00ff00','--mint':'#ff00ff','--blue':'#ff00ff','--coral':'#ff00ff'},onDraw:call=>calls.push(call)});
  h.frame();
  const filled=(args,color)=>calls.some(c=>c.method==='fillRect'&&c.args.every((v,i)=>v===args[i])&&c.fill===color);
  assert.ok(filled([0,0,400,600],p.sky),`${theme} background must use scene sky`);
  assert.ok(filled([0,568,400,32],p.ground),`${theme} ground must not inherit HUD mint`);
  h.window.FlappyGame.flap();h.test.set({pipes:[{x:180,width:52,topY:180,bottomY:320,scored:false}]});h.frame(0);
  assert.ok(filled([180,0,52,180],p.pipe),`${theme} obstacle fill`);
  assert.ok(calls.some(c=>c.method==='strokeRect'&&c.stroke===p['pipe-line']),`${theme} obstacle edge`);
  assert.ok(calls.some(c=>c.method==='ellipse'&&c.args[2]===16&&c.args[3]===14&&c.fill===p.bird),`${theme} courier body`);
  assert.ok(calls.some(c=>c.method==='ellipse'&&c.args[2]===10&&c.args[3]===6&&c.fill===p.wing),`${theme} warm wing`);
  assert.ok(calls.some(c=>c.method==='arc'&&c.args[0]===5&&c.args[1]===-6&&c.fill===p.eye),`${theme} pale eye stays pale`);
 }
});
