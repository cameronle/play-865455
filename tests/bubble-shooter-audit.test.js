"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict");
const { createBubbleShooter } = require("./helpers/bubble-shooter-runtime.js");
test("blocked storage still initializes a playable garden", () => {
  const g = createBubbleShooter({ blockStorage: true });
  assert.equal(g.snapshot().active, true);
  assert.ok(g.stats.draws > 0);
});

test("invalid persisted records cannot poison the score", () => {
  for (const v of ["NaN", "Infinity", "-20", "1.2", "9007199254740992"])
    assert.equal(
      createBubbleShooter({ storage: { "bubble-shooter-best": v } }).snapshot()
        .best,
      0,
    );
  assert.equal(
    createBubbleShooter({
      storage: { "bubble-shooter-best": "340" },
    }).snapshot().best,
    340,
  );
});

test("blocked record writes do not interrupt a resolved match", () => {
  const g = createBubbleShooter({ blockStorage: true });
  g.run(
    'grid=R.emptyGrid(13,8);grid[0][0]="mint";grid[1][0]="mint";shot={x:27,y:126,color:"mint"};attachShot()',
  );
  assert.equal(g.snapshot().active, false);
  assert.equal(g.snapshot().score, 30);
});

test("secondary mouse cannot capture or shoot", () => {
  const g = createBubbleShooter();
  g.element("game").dispatch("pointerdown", {
    pointerType: "mouse",
    button: 2,
    pointerId: 4,
  });
  g.element("game").dispatch("pointerup", {
    pointerType: "mouse",
    button: 2,
    pointerId: 4,
  });
  assert.equal(g.snapshot().pointerId, null);
  assert.equal(g.snapshot().shot, null);
});

test("a rejected pointer capture does not lose aiming", () => {
  const g = createBubbleShooter({ captureThrows: true });
  g.element("game").dispatch("pointerdown", { pointerId: 2 });
  assert.equal(g.snapshot().pointerId, 2);
});

test("one garden render reads theme colors only once", () => {
  const g = createBubbleShooter();
  g.stats.styleReads = 0;
  g.run("draw()");
  assert.ok(g.stats.styleReads <= 11, `${g.stats.styleReads} style reads`);
});

test("shot displacement is independent of animation frequency", () => {
  const ys = [];
  for (const hz of [30, 60, 120, 144]) {
    const g = createBubbleShooter();
    g.run("grid=R.emptyGrid(13,8);shoot()");
    g.frames(0.1, hz);
    ys.push(g.snapshot().shot.y);
  }
  assert.ok(Math.max(...ys) - Math.min(...ys) < 1e-7, ys.join(","));
});

test("restart cannot let an old callback accelerate a new shot", () => {
  const a = createBubbleShooter(),
    b = createBubbleShooter();
  a.run("shoot();initialize();grid=R.emptyGrid(13,8);shoot()");
  b.run("grid=R.emptyGrid(13,8);shoot()");
  const ac = a.stats.draws,
    bc = b.stats.draws;
  a.frame(1000 / 60);
  b.frame(1000 / 60);
  assert.equal(a.stats.draws - ac, b.stats.draws - bc);
  assert.equal(a.snapshot().shot.y, b.snapshot().shot.y);
});

test("shifted row parity preserves a same-color bridge", () => {
  const g = createBubbleShooter();
  const length = g.run(
    '(()=>{let a=R.emptyGrid(5,8);a[0][3]=a[1][3]=a[2][4]="mint";R.addRow(a,["coral"]);return R.component(a,1,3,"mint",1).length})()',
  );
  assert.equal(length, 3);
});

test("pressure lowers existing bubbles without lateral zigzag", () => {
  const g = createBubbleShooter();
  const before = g.run("JSON.stringify([center(0,3),center(1,3),center(2,4)])");
  g.run("addPressureRow()");
  const after = g.run("JSON.stringify([center(1,3),center(2,3),center(3,4)])");
  JSON.parse(before).forEach((p, i) => {
    assert.equal(JSON.parse(after)[i].x, p.x);
    assert.equal(JSON.parse(after)[i].y, p.y + 48);
  });
});

test("a removed color is not served from an obsolete preview", () => {
  const g = createBubbleShooter();
  g.run(
    'grid=R.emptyGrid(13,8);grid[0][0]=grid[1][0]="mint";grid[0][6]="coral";next="mint";shot={x:27,y:126,color:"mint"};attachShot()',
  );
  assert.equal(g.snapshot().current, "coral");
  assert.equal(g.snapshot().next, "coral");
});

test("pause freezes a flying bubble until explicit resume", () => {
  const g = createBubbleShooter();
  g.run("shoot()");
  g.element("pauseButton").click();
  const s = g.snapshot();
  g.frames(0.12);
  assert.deepEqual(g.snapshot().shot, s.shot);
  g.element("pauseButton").click();
  g.frames(0.05);
  assert.notEqual(g.snapshot().shot.y, s.shot.y);
});

test("swept flight stops at the first circle rather than jumping through it", () => {
  const g = createBubbleShooter();
  const r = JSON.parse(
    g.run(
      'JSON.stringify((()=>{const a=R.emptyGrid(13,8);a[4][4]="mint";return R.advanceShot(a,{x:240,y:675,vx:0,vy:-1,color:"mint"},650)})())',
    ),
  );
  assert.equal(r.hit.kind, "bubble");
  assert.equal(r.hit.row, 4);
  assert.equal(r.hit.col, 4);
  assert.ok(Math.abs(Math.hypot(r.shot.x - 251, r.shot.y - 222) - 50) < 1e-8);
});

test("aim preview reaches the same first collision as a fired bank shot", () => {
  const g = createBubbleShooter();
  g.run("grid=R.emptyGrid(13,8);aim={x:480,y:500};");
  const expected = JSON.parse(g.run("JSON.stringify(preview())"));
  g.run("shoot()");
  for (let i = 1; i <= 180 && g.snapshot().shot; i++) g.frame((i * 1000) / 60);
  const cell = expected.cell;
  assert.ok(cell);
  assert.equal(g.snapshot().grid[cell.row][cell.col], g.snapshot().next);
  assert.equal(g.snapshot().grid.flat().filter(Boolean).length, 1);
});

test("the visible FIRE control launches from a fresh game", () => {
  const g = createBubbleShooter();
  g.element("fireButton").click();
  assert.ok(g.snapshot().shot);
});

test("keyboard arrows adjust aim and Space fires once", () => {
  const g = createBubbleShooter();
  const before = g.snapshot().aim;
  g.event("keydown", { code: "ArrowLeft" });
  assert.notDeepEqual(g.snapshot().aim, before);
  g.event("keydown", { code: "Space" });
  assert.ok(g.snapshot().shot);
});

test("capture outside the field cannot create a horizontal endless shot", () => {
  const g = createBubbleShooter();
  g.run("aim={x:99999,y:675}");
  const v = JSON.parse(g.run("JSON.stringify(normalizedAim())"));
  assert.ok(-v.y >= Math.sin(Math.PI / 12) - 1e-9);
});

test("cancelling a second pointer cannot cancel the aiming pointer", () => {
  const g = createBubbleShooter(),
    c = g.element("game");
  c.dispatch("pointerdown", { pointerId: 1 });
  c.dispatch("pointerdown", { pointerId: 2 });
  c.dispatch("pointercancel", { pointerId: 2 });
  assert.equal(g.snapshot().pointerId, 1);
});

test("hiding the page cancels flight and requires manual resume", () => {
  const g = createBubbleShooter();
  g.run("shoot()");
  g.document.hidden = true;
  g.event("doc:visibilitychange");
  const before = g.snapshot();
  g.frames(0.5);
  assert.deepEqual(g.snapshot().shot, before.shot);
  g.document.hidden = false;
  g.event("doc:visibilitychange");
  g.frames(0.2);
  assert.deepEqual(g.snapshot().shot, before.shot);
  g.element("pauseButton").click();
  g.frames(0.05);
  assert.notDeepEqual(g.snapshot().shot, before.shot);
});

test("pause status and controls match the actual state", () => {
  const g = createBubbleShooter();
  g.element("pauseButton").click();
  assert.equal(g.element("pauseButton").textContent, "RESUME");
  assert.equal(g.element("fireButton").disabled, true);
  g.element("newButton").click();
  assert.equal(g.element("pauseButton").textContent, "PAUSE");
  assert.equal(g.element("fireButton").disabled, false);
});

test("a result after resume is not mislabeled as another resume", () => {
  const g = createBubbleShooter();
  g.run("togglePause();togglePause();end(true)");
  assert.equal(g.element("resultButton").textContent, "PLAY AGAIN");
  assert.equal(g.element("pauseButton").disabled, true);
});

test("the pressure failure boundary is marked on the field", () => {
  const g = createBubbleShooter();
  g.stats.commands.length = 0;
  g.run("draw()");
  assert.ok(
    g.stats.commands.some(
      (c) => c[0] === "lineTo" && c[1] === 480 && c[2] === 558,
    ),
  );
});

test("browser snapshots cannot mutate live board or aiming state", () => {
  const g = createBubbleShooter();
  const before = g.snapshot();
  g.run(
    'const a=window.BubbleGarden.getSnapshot();a.grid[0][0]="BAD";a.aim.x=-999;',
  );
  assert.deepEqual(g.snapshot(), before);
});

test("modified keyboard shortcuts do not aim fire or pause", () => {
  for (const modifier of ["ctrlKey", "metaKey", "altKey", "shiftKey"]) {
    const g = createBubbleShooter();
    const before = g.snapshot();
    for (const code of ["KeyP", "Space", "ArrowLeft"]) {
      const e = g.event("keydown", { code, [modifier]: true });
      assert.equal(e.defaultPrevented, undefined);
    }
    assert.deepEqual(g.snapshot(), before);
  }
});

test("initial start, pause, resume and result route keyboard focus", () => {
  const g = createBubbleShooter();
  assert.equal(g.document.activeElement, g.element("game"));
  g.run("togglePause()");
  assert.equal(g.document.activeElement, g.element("resultButton"));
  g.run("togglePause()");
  assert.equal(g.document.activeElement, g.element("game"));
  g.run("end(true)");
  assert.equal(g.document.activeElement, g.element("resultButton"));
});

test("dialog focus is requested only after the dialog is visible", () => {
  const g = createBubbleShooter(),
    button = g.element("resultButton"),
    focus = button.focus;
  button.focus = function (...args) {
    assert.ok(
      g.element("resultOverlay").classList.contains("show"),
      "hidden dialogs cannot receive native focus",
    );
    return focus.apply(this, args);
  };
  g.run("togglePause();togglePause();end(true)");
  assert.equal(g.document.activeElement, button);
});
