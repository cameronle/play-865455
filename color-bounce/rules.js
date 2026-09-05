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

  function createRingCrossingState() {
    return { phase: 'approaching', safeSegment: null };
  }

  function ringSegment(ball, cx, obstacle) {
    const angle = normalizeAngle(Math.atan2(ball.y - obstacle.y, ball.x - cx) - obstacle.angle);
    return Math.floor((angle / (Math.PI * 2)) * 4) % 4;
  }

  function resolveRingCollision(ball, cx, obstacle, crossing = createRingCrossingState()) {
    const state = crossing && crossing.phase ? crossing : createRingCrossingState();
    if (!ball || !obstacle || obstacle.type !== 'circle' || state.phase === 'passed') {
      return { result: 'none', state };
    }

    const outer = obstacle.radius + obstacle.thickness / 2;
    if (state.phase === 'passing') {
      if (ball.y + ball.r < obstacle.y - outer) {
        return { result: 'passed', state: { ...state, phase: 'passed' } };
      }
      return { result: 'safe', state };
    }

    const result = checkObstacleCollision(ball, cx, obstacle);
    if (result === 'safe' && (ball.vy === undefined || ball.vy < 0)) {
      return {
        result: 'safe',
        state: { phase: 'passing', safeSegment: ringSegment(ball, cx, obstacle) }
      };
    }
    return { result, state };
  }

  return {
    updatePhysics,
    applyJump,
    normalizeAngle,
    checkObstacleCollision,
    createRingCrossingState,
    resolveRingCollision,
  };
});
