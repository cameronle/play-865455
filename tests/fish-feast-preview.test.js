'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('playable preview has local complete script order, accessible controls and thin themed UI',()=>{
 assert.ok(fs.existsSync('fish-feast/index.html'),'Playable preview page is not implemented');
 const html=fs.readFileSync('fish-feast/index.html','utf8'),css=fs.readFileSync('fish-feast/style.css','utf8');
 for(const id of ['game','startButton','pauseButton','dashButton','languageButton','overlay','growthFill','levelSelect'])assert.ok(html.includes('id="'+id+'"'));
 const scripts=[...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m=>m[1].split('?')[0]);
 for(const name of ['content.js','rules.js','progress.js','behaviors.js','simulation.js','input.js','render.js','game.js'])assert.ok(scripts.includes(name)&&fs.existsSync('fish-feast/'+name));
 assert.ok(scripts.indexOf('simulation.js')<scripts.indexOf('game.js'));assert.ok(scripts.includes('/theme.js'));assert.ok(html.includes('/theme.css'));assert.ok(html.includes('favicon.svg'));
 assert.doesNotMatch(html,/user-scalable=no|maximum-scale=1|https?:\/\//);assert.match(css,/border:\s*1px solid/);assert.doesNotMatch(css,/border:\s*[2-9]px|box-shadow:\s*(?!none)[^;]+;/);assert.match(css,/touch-action:\s*none/);
});
test('mobile utilities keep 44px hit boxes and the empty growth track is not a filled bar',()=>{
 const css=fs.readFileSync('fish-feast/style.css','utf8');assert.doesNotMatch(css,/min-width:42px/);assert.match(css,/\.back\{[^}]*min-height:44px/);assert.match(css,/\.growth-track\{[^}]*background:var\(--water\)/);
});
