"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const { createShooter } = require("./helpers/shooter-runtime");
test("Sky Patrol movement reaches true horizontal and lower playfield bounds", () => {
  const app = createShooter();
  app.element("startButton").click();
  app.event("keydown", { key: "ArrowLeft" });
  app.frames(1);
  let p = app.snapshot().player;
  assert.equal(p.x, p.w / 2);
  app.event("keyup", { key: "ArrowLeft" });
  app.event("keydown", { key: "ArrowRight" });
  app.frames(2);
  p = app.snapshot().player;
  assert.equal(p.x, 480 - p.w / 2);
  app.event("keyup", { key: "ArrowRight" });
  app.event("keydown", { key: "ArrowDown" });
  app.frames(1);
  p = app.snapshot().player;
  assert.equal(p.y, 648 - p.h / 2);
});
test("Sky Patrol supports every direction on keyboard and mobile", () => {
  for (const [name, key, axis, sign] of [
    ["left", "ArrowLeft", "x", -1],
    ["right", "ArrowRight", "x", 1],
    ["up", "ArrowUp", "y", -1],
    ["down", "ArrowDown", "y", 1],
  ]) {
    for (const mode of ["key", "touch"]) {
      const app = createShooter();
      app.element("startButton").click();
      app.run("g.player.x=240;g.player.y=324");
      mode === "key"
        ? app.event("keydown", { key })
        : app.element(name + "Button").dispatch("pointerdown");
      app.frames(0.1);
      assert.ok(
        (app.snapshot().player[axis] - (axis === "x" ? 240 : 324)) * sign > 0,
      );
    }
  }
});
test("Sky Patrol pointer dragging maps scaled canvas coordinates in both axes", () => {
  const app = createShooter();
  app.element("startButton").click();
  app.run("g.player.x=240;g.player.y=324");
  const canvas = app.element("game");
  canvas.getBoundingClientRect = () => ({
    left: 20,
    top: 30,
    width: 240,
    height: 324,
  });
  canvas.dispatch("pointerdown", { clientX: 60, clientY: 80 });
  canvas.dispatch("pointermove", { clientX: 80, clientY: 95 });
  assert.equal(app.snapshot().player.x, 280);
  assert.equal(app.snapshot().player.y, 354);
});
test("Sky Patrol preserves the 480 by 648 logical flight area", () => {
  assert.match(
    fs.readFileSync("shooter/index.html", "utf8"),
    /<canvas\b(?=[^>]*\bid="game")(?=[^>]*\bwidth="480")(?=[^>]*\bheight="648")/,
  );
  assert.match(
    fs.readFileSync("shooter/style.css", "utf8"),
    /aspect-ratio:\s*20\s*\/\s*27/,
  );
});
test("Sky Patrol locks touch gestures only while the flight is active", () => {
  const app = createShooter();
  let e = {
    preventDefault() {
      e.prevented = true;
    },
  };
  app.event("doc:touchmove", e);
  assert.equal(e.prevented, undefined);
  app.element("startButton").click();
  e = {
    preventDefault() {
      e.prevented = true;
    },
  };
  app.event("doc:touchmove", e);
  assert.equal(e.prevented, true);
  app.element("mobilePauseButton").click();
  e = {
    preventDefault() {
      e.prevented = true;
    },
  };
  app.event("doc:touchmove", e);
  assert.equal(e.prevented, undefined);
  assert.match(
    fs.readFileSync("shooter/style.css", "utf8"),
    /-webkit-touch-callout:\s*none/,
  );
});
