const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('README game descriptions and documentation are consistently Chinese',()=>{
  const readme=fs.readFileSync('README.md','utf8');
  for(const phrase of ['Self-maintained','maintained in this repository','Added ','Replaced ','Deleted the ']) assert.doesNotMatch(readme,new RegExp(phrase));
  for(const heading of ['## 游戏列表','## 本地开发','## 部署','## 许可证','## 维护说明','## 更新记录']) assert.match(readme,new RegExp(heading));
  assert.equal((readme.match(/^\- \[[^\]]+\]\([^\)]+\) — /gm)||[]).length,23);
});
