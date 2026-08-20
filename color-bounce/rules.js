(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ColorRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function updatePhysics(state, dt, gravity = 1200) {
    const vy = state.vy + gravity * dt;
    const y = state.y + vy * dt;
    return { ...state, y, vy };
  }

  function applyJump(state, jumpVelocity = -420) {
    return { ...state, vy: jumpVelocity };
  }

  function normalizeAngle(rad) {
    const twoPi = Math.PI * 2;
    return ((rad % twoPi) + twoPi) % twoPi;
  }

  function checkObstacleCollision(ball, cx, obstacle) {
    if (!obstacle || !ball) return 'none';

    if (obstacle.type === 'circle') {
      const dist = Math.hypot(ball.x - cx, ball.y - obstacle.y);
      const inner = obstacle.radius - obstacle.thickness / 2;
      const outer = obstacle.radius + obstacle.thickness / 2;

      if (dist + ball.r >= inner && dist - ball.r <= outer) {
        // Angle of ball relative to circle center
        const angle = normalizeAngle(Math.atan2(ball.y - obstacle.y, ball.x - cx) - obstacle.angle);
        const segment = Math.floor((angle / (Math.PI * 2)) * 4) % 4;
        const segColor = obstacle.colors[segment];
        return segColor === ball.color ? 'safe' : 'hit';
      }
      return 'none';
    }

    return 'none';
  }

  return {
    updatePhysics,
    applyJump,
    normalizeAngle,
    checkObstacleCollision,
  };
});
