const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {boot}=require('./helpers/mushroom-runtime');
function renderer(){
 const calls=[];const context={fillStyle:'',fillRect(...a){calls.push({color:this.fillStyle,rect:a});},clearRect(){},drawImage(){calls.push({blit:true})},imageSmoothingEnabled:true};
 const window={};const sandbox={window,document:{createElement:()=>({width:0,height:0,getContext:()=>context})},Math};
 vm.runInNewContext(fs.readFileSync('mushroom-trail/pixel-renderer.js','utf8'),sandbox);
 return {calls,context,api:window.MushroomPixel};
}
test('pixel renderer uses a true 320×180 nearest-neighbor buffer',()=>{
 const r=renderer();assert.equal(r.api.width,320);assert.equal(r.api.height,180);const draw=r.api.create(r.context);const b=boot();const s=b.window.MushroomTrail.getSnapshot();const before=JSON.stringify(s);
 draw.draw({world:s.world,player:s.player,powerups:[],particles:[],cameraX:0,clock:0,levelIndex:0,checkpointReached:false,dark:false,paused:false});
 assert.equal(JSON.stringify(s),before);assert.equal(r.context.imageSmoothingEnabled,false);assert.ok(r.calls.some(c=>c.blit));
 const rects=r.calls.filter(c=>c.rect);assert.ok(rects.length>100);assert.ok(rects.every(c=>c.rect.every(Number.isInteger)));assert.ok(rects.every(c=>c.rect[2]>=0&&c.rect[3]>=0));
});
test('every world and theme renders all semantic entities without curves or gradients',()=>{
 const b=boot();b.test.startGame();
 for(let levelIndex=0;levelIndex<3;levelIndex++)for(const dark of [false,true]){
  b.test.loadLevel(levelIndex);const s=b.window.MushroomTrail.getSnapshot(),r=renderer();const d=r.api.create(r.context);
  assert.doesNotThrow(()=>d.draw({world:s.world,player:{...s.player,powered:true},powerups:[{x:100,y:300,w:24,h:24}],particles:[{x:130,y:280,size:4,life:.3,color:'#ffe08a'}],cameraX:0,clock:600,levelIndex,dark,paused:true,checkpointReached:true}));
  assert.ok(r.calls.some(c=>c.blit));assert.equal(r.api.sprites.hero.length,16);assert.notDeepEqual(r.api.sprites.walker,r.api.sprites.hopper);
 }
});
test('falling gaps show sky, never a false continuous ground-colored bridge',()=>{
 const r=renderer(),world={decor:[],coins:[],enemies:[],platforms:[{x:0,y:460,w:120,h:80,type:'ground'},{x:240,y:460,w:120,h:80,type:'ground'}],checkpoint:{x:10000,y:425},goal:{x:11000,y:365}};
 r.api.create(r.context).draw({world,player:null,powerups:[],particles:[],cameraX:0,clock:0,levelIndex:0,checkpointReached:false,dark:false});
 const at=(x,y)=>r.calls.filter(c=>c.rect&&x>=c.rect[0]&&x<c.rect[0]+c.rect[2]&&y>=c.rect[1]&&y<c.rect[1]+c.rect[3]).at(-1)?.color;
 const sky=r.calls.find(c=>c.rect&&c.rect[0]===0&&c.rect[1]===0&&c.rect[2]===320&&c.rect[3]===180).color;
 assert.equal(at(60,153),sky);assert.equal(at(60,159),sky);assert.notEqual(at(10,153),sky);
});
test('goal flag is grounded on physical terrain, not the old beacon offset',()=>{
 const r=renderer(),s=boot().window.MushroomTrail.getSnapshot();s.world.goal={x:600,y:325};
 r.api.create(r.context).draw({world:s.world,player:null,powerups:[],particles:[],cameraX:0,clock:0,levelIndex:0,checkpointReached:false,dark:false});
 assert.ok(r.calls.some(c=>c.color==='#273245'&&c.rect[0]===196&&c.rect[1]===153&&c.rect[2]===10&&c.rect[3]===3));
});
test('pixel renderer is locally wired before the game and CSS disables interpolation',()=>{
 const html=fs.readFileSync('mushroom-trail/index.html','utf8'),css=fs.readFileSync('mushroom-trail/style.css','utf8');
 assert.ok(html.indexOf('pixel-renderer.js')<html.indexOf('src="game.js'));assert.match(css,/image-rendering:\s*pixelated/);assert.match(html,/mushroom-touch-6/);
});
