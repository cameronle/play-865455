"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { createRunner } = require("./helpers/runner-runtime.js");

const fs = require("node:fs");
test("pixel UI uses a local font and crisp square chrome", () => {
  const css = fs.readFileSync("endless-runner/style.css", "utf8");
  assert.match(css, /image-rendering:\s*pixelated/);
  assert.match(css, /@font-face[\s\S]*?Silkscreen-Regular\.ttf/);
  assert.doesNotMatch(css, /border-radius:\s*(?!0[;\s])\d/);
  assert.doesNotMatch(css, /(?:linear-gradient|radial-gradient|rotate\()/);
  assert.doesNotMatch(css, /box-shadow:\s*(?!none)[^;]*\d/);
  assert.ok(fs.existsSync("endless-runner/assets/OFL.txt"));
});

test("colored pixel actions retain AA text contrast when hovered or held", () => {
  const css = fs.readFileSync("endless-runner/style.css", "utf8");
  const base = css.match(/:root\s*\{([^}]+)\}/)[1];
  const dark = css.match(/\[data-theme="dark"\]\s*\{([^}]+)\}/)[1];
  const value = (b, k) => b.match(new RegExp(`--${k}:\\s*(#[0-9a-f]+)`, "i"))?.[1];
  const lum = h => h.slice(1).match(/../g).map(v => parseInt(v, 16) / 255)
    .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
    .reduce((n, v, i) => n + v * [.2126, .7152, .0722][i], 0);
  const fg = lum(value(base, "action-ink"));
  for (const [theme, b] of [["light", base], ["dark", dark]]) for (const k of ["yellow", "mint"]) {
    const bg = lum(value(b, k)), ratio = (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05);
    assert.ok(ratio >= 4.5, `${theme} ${k} contrast ${ratio}`);
  }
});

test("minimal runner keeps at most nine blocks and two colors in every pose", () => {
  const g = createRunner();
  g.element("startButton").click();
  for (const theme of ["light", "dark"]) for (const [grounded, run] of [[true, 0], [true, 2], [false, 0]]) {
    g.run(`player.onGround=${grounded};player.run=${run}`);
    const before = g.snapshot();
    const result = g.run(`(()=>{const original=pixelRect,colors=[];pixelRect=(color,...args)=>{colors.push(color);return original(color,...args)};try{drawPlayer(PIXEL_PALETTES['${theme}']);return{blocks:colors.length,colors:[...new Set(colors)]}}finally{pixelRect=original}})()`);
    assert.ok(result.blocks <= 9, `Runner is still busy: ${result.blocks} painted blocks`);
    assert.ok(result.colors.length <= 2, `Runner has ${result.colors.length} colors`);
    assert.deepEqual(g.snapshot(), before, "Pose drawing must not alter gameplay");
  }
});

test("bean runner has a continuous colored body instead of a separate neck and costume", () => {
  const g = createRunner();
  g.element("startButton").click();
  for (const theme of ["light", "dark"]) {
    const painted = g.run(`(()=>{const original=pixelRect,rects=[];pixelRect=(color,...rect)=>{rects.push({color,rect});return original(color,...rect)};try{drawPlayer(PIXEL_PALETTES['${theme}']);return{rects,body:PIXEL_PALETTES['${theme}'].blue,eye:PIXEL_PALETTES['${theme}'].outline,x:player.x,y:player.y}}finally{pixelRect=original}})()`);
    const sample = (x, y) => painted.rects.filter(q => x >= q.rect[0] && x < q.rect[0] + q.rect[2] && y >= q.rect[1] && y < q.rect[1] + q.rect[3]).at(-1)?.color;
    for (const y of [18, 24, 30]) for (const x of [7, 15, 23, 29])
      assert.equal(sample(painted.x + x, painted.y + y), painted.body, "Body should read as one continuous silhouette, not stacked blocks");
    assert.equal(painted.rects.filter(q => q.color === painted.eye).length, 2, "Only two eye dots, no outlined costume pieces");
  }
});

test("pixel scene uses integer rectangles, not smoothed vector paths", () => {
  const g = createRunner();
  g.element("startButton").click();
  g.run(`hazards=[{type:'spike',x:330.25,y:341,w:30,h:24},{type:'crate',x:390.75,y:318,w:42,h:47},{type:'pencil',x:460.4,y:343,w:74,h:22},{type:'ruler',x:565.6,y:341,w:88,h:24},{type:'ink',x:685.2,y:347,w:48,h:18},{type:'gap',x:740.7,y:365,w:40.6,h:85}];coins=[{x:320.3,y:286.2,r:7}];player.y=230.7;particles=[{x:400.3,y:80.7,life:.2,color:'#f2ca62'}]`);
  g.stats.commands.length = 0;
  g.run("draw()");
  const prohibited = new Set(["arc", "ellipse", "roundRect", "rotate", "quadraticCurveTo", "bezierCurveTo", "stroke", "createLinearGradient"]);
  assert.ok(!g.stats.commands.some(c => prohibited.has(c[0])), "Scene still paints smooth vector shapes");
  const rectangles = g.stats.commands.filter(c => c[0] === "fillRect");
  assert.ok(rectangles.length > 50, "Scene should contain distinct pixel details");
  for (const c of rectangles) assert.ok(c.slice(1).every(Number.isInteger), `Fractional paint: ${c}`);
  const before = g.snapshot();
  g.document.documentElement.dataset.theme = "light";
  g.run("draw()");
  assert.deepEqual(g.snapshot(), before, "Rendering must not change physics, controls, or storage");
});
