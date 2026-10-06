'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),catalog=require('../data/games.js'),P=require('../fish-feast/progress.js');
test('Fish Feast is a unique bilingual catalog route with complete local dependencies and scoped persistence',()=>{
 const entry=catalog.filter(g=>g.id==='fish-feast');assert.equal(entry.length,1,'new game is not integrated');const g=entry[0];assert.equal(g.path,'fish-feast');assert.equal(g.category,'arcade');assert.ok(g.name.zh&&g.name.en&&g.description.zh&&g.description.en);assert.ok(g.order>=1&&g.order<=catalog.length);
 const html=fs.readFileSync('fish-feast/index.html','utf8'),sources=[...html.matchAll(/src="([^"]+)"/g)].map(m=>m[1].split('?')[0]);for(const src of sources)assert.ok(fs.existsSync(src.startsWith('/')?src.slice(1):'fish-feast/'+src),src);
 for(const [before,after]of [['content.js','rules.js'],['rules.js','behaviors.js'],['behaviors.js','simulation.js'],['progress.js','game.js'],['render.js','game.js']])assert.ok(sources.indexOf(before)<sources.indexOf(after));assert.ok(sources.includes('/clear-game-data.js'));assert.doesNotMatch(html,/PREVIEW|第一关可玩预览|https?:\/\//);for(const key of Object.values(P.keys))assert.ok(fs.readFileSync('clear-game-data.js','utf8').includes(key));
});
test('challenge release advertises the first goal and fresh cache keys for every changed route asset',()=>{
 const C=require('../fish-feast/content.js'),html=fs.readFileSync('fish-feast/index.html','utf8');
 assert.equal(Number(html.match(/id="growthValue">0 \/ (\d+)/)[1]),C.levels[0].goal);
 for(const file of ['content.js','rules.js','behaviors.js','simulation.js','input.js','render.js','game.js','style.css'])assert.ok(html.includes(file+'?v=fish-swim-v4'),file+' needs the current control release cache key');
});
