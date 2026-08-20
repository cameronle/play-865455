(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FlappyRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function updatePhysics(bird, dt, gravity = 1050) {
    const vy = bird.vy + gravity * dt;
    const y = bird.y + vy * dt;
    return { ...bird, y, vy };
  }

  function flap(bird, flapVelocity = -340) {
    return { ...bird, vy: flapVelocity };
  }

  function checkPipeCollision(bird, pipe) {
    if (!bird || !pipe) return false;
    const birdLeft = bird.x - bird.r;
    const birdRight = bird.x + bird.r;
    const birdTop = bird.y - bird.r;
    const birdBottom = bird.y + bird.r;

    const pipeLeft = pipe.x;
    const pipeRight = pipe.x + pipe.width;

    // Check horizontal overlap with pipe
    if (birdRight > pipeLeft && birdLeft < pipeRight) {
      // Check vertical collision with top pipe or bottom pipe
      if (birdTop < pipe.topY || birdBottom > pipe.bottomY) {
        return true;
      }
    }
    return false;
  }

  return {
    updatePhysics,
    flap,
    checkPipeCollision,
  };
});
