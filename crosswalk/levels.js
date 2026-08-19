(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CrosswalkLevels = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  const TRAFFIC_ROWS = [2, 3, 4, 6, 7, 9];
  const BASE_SAFE_ROWS = [1, 5, 8, 10, 11];

  const vehicle = (kind, offset) => ({ kind, offset });
  const standardVehicles = (style = 'steady') => {
    if (style === 'dense') return [vehicle('car', 0.04), vehicle('car', 0.37), vehicle('car', 0.7)];
    if (style === 'convoy') return [vehicle('car', 0.06), vehicle('car', 0.22), vehicle('car', 0.38)];
    if (style === 'bus') return [vehicle('bus', 0.13), vehicle('car', 0.69)];
    if (style === 'jam') return [vehicle('car', 0.08), vehicle('bus', 0.4), vehicle('car', 0.78)];
    if (style === 'emergency') return [vehicle('emergency', 0.16), vehicle('car', 0.68)];
    return [vehicle('car', 0.12), vehicle('car', 0.63)];
  };

  const lane = (row, options = {}) => ({
    row,
    dir: row % 2 ? 1 : -1,
    speed: 1,
    pattern: 'steady',
    vehicles: standardVehicles(),
    ...options,
  });

  const makeLanes = (options = {}) => TRAFFIC_ROWS.map(row => lane(row, options[row] || {}));
  const safeRows = (overrides = {}) => BASE_SAFE_ROWS.map(row => ({
    row,
    blocks: [],
    ...(overrides[row] || {}),
  }));

  const levels = [
    { id: 1, name: 'FIRST CROSSING', chapter: 1, subtitle: 'LEARN THE STREET', speedScale: 0.85, lanes: makeLanes({}), safeRows: safeRows() },
    { id: 2, name: 'OPPOSITE FLOW', chapter: 1, subtitle: 'LEARN THE STREET', speedScale: 0.90, lanes: makeLanes({ 3: { speed: 0.92 }, 6: { speed: 1.04 } }), safeRows: safeRows() },
    { id: 3, name: 'LONG VEHICLES', chapter: 1, subtitle: 'LEARN THE STREET', speedScale: 0.95, lanes: makeLanes({ 2: { vehicles: standardVehicles('bus') }, 7: { vehicles: standardVehicles('bus'), speed: 0.92 } }), safeRows: safeRows() },
    { id: 4, name: 'MEDIAN DETOUR', chapter: 1, subtitle: 'LEARN THE STREET', speedScale: 1.00, lanes: makeLanes({ 4: { speed: 0.94 } }), safeRows: safeRows({ 5: { blocks: [3] }, 8: { blocks: [5] } }) },

    { id: 5, name: 'RED LIGHT', chapter: 2, subtitle: 'READ THE SIGNALS', speedScale: 1.05, lanes: makeLanes({ 3: { signal: { cycle: 6, go: 3.5, phase: 0.4 } } }), safeRows: safeRows() },
    { id: 6, name: 'DOUBLE CYCLE', chapter: 2, subtitle: 'READ THE SIGNALS', speedScale: 1.10, lanes: makeLanes({ 3: { signal: { cycle: 6, go: 3.2, phase: 0.2 } }, 6: { signal: { cycle: 6, go: 3.2, phase: 3.2 } } }), safeRows: safeRows() },
    { id: 7, name: 'CONVOY', chapter: 2, subtitle: 'READ THE SIGNALS', speedScale: 1.15, lanes: makeLanes({ 2: { pattern: 'convoy', vehicles: standardVehicles('convoy') }, 7: { pattern: 'convoy', vehicles: standardVehicles('convoy'), speed: 0.94 } }), safeRows: safeRows() },
    { id: 8, name: 'RUSH HOUR', chapter: 2, subtitle: 'READ THE SIGNALS', speedScale: 1.20, lanes: makeLanes({ 2: { vehicles: standardVehicles('bus') }, 3: { signal: { cycle: 5.8, go: 3.1, phase: 0.5 } }, 7: { pattern: 'convoy', vehicles: standardVehicles('convoy') } }), safeRows: safeRows({ 5: { blocks: [2] } }), checkpoint: true },

    { id: 9, name: 'ROADWORKS', chapter: 3, subtitle: 'CHOOSE YOUR ROUTE', speedScale: 1.25, lanes: makeLanes({ 4: { vehicles: standardVehicles('bus') } }), safeRows: safeRows({ 5: { blocks: [2, 3] }, 8: { blocks: [5, 6] }, 10: { blocks: [7] } }) },
    { id: 10, name: 'BROKEN MEDIAN', chapter: 3, subtitle: 'CHOOSE YOUR ROUTE', speedScale: 1.30, lanes: makeLanes({ 2: { speed: 0.96 }, 6: { speed: 1.04 } }), safeRows: safeRows({ 5: { blocks: [0, 1, 2, 6, 7, 8] }, 8: { blocks: [0, 1, 7, 8] } }) },
    { id: 11, name: 'SHORT OR SAFE', chapter: 3, subtitle: 'CHOOSE YOUR ROUTE', speedScale: 1.35, lanes: makeLanes({ 2: { vehicles: standardVehicles('bus'), speed: 0.96 }, 3: { speed: 0.86 }, 6: { vehicles: standardVehicles('dense'), speed: 0.88 }, 7: { speed: 1.04 } }), safeRows: safeRows({ 5: { blocks: [3, 4] }, 8: { blocks: [4] } }) },
    { id: 12, name: 'MOVING CROSSWALK', chapter: 3, subtitle: 'CHOOSE YOUR ROUTE', speedScale: 1.40, lanes: makeLanes({ 4: { signal: { cycle: 7, go: 4.2, phase: 0.7 } } }), safeRows: safeRows({ 8: { moving: { width: 3, speed: 0.62, start: 1 } } }), checkpoint: true },

    { id: 13, name: 'SIGNAL WAVE', chapter: 4, subtitle: 'TRAFFIC HAS A RHYTHM', speedScale: 1.45, lanes: makeLanes({
      2: { signal: { cycle: 7.5, go: 3.6, phase: 0.0 } },
      3: { signal: { cycle: 7.5, go: 3.6, phase: 1.0 } },
      4: { signal: { cycle: 7.5, go: 3.6, phase: 2.0 } },
      6: { pattern: 'convoy', vehicles: standardVehicles('convoy'), signal: { cycle: 7.5, go: 3.6, phase: 3.0 } },
    }), safeRows: safeRows() },
    { id: 14, name: 'EMERGENCY LANE', chapter: 4, subtitle: 'TRAFFIC HAS A RHYTHM', speedScale: 1.50, lanes: makeLanes({ 3: { signal: { cycle: 6.5, go: 3.3, phase: 0.2 } }, 6: { vehicles: standardVehicles('emergency'), speed: 0.96 } }), safeRows: safeRows({ 5: { blocks: [4] } }) },
    { id: 15, name: 'TRAFFIC JAM', chapter: 4, subtitle: 'TRAFFIC HAS A RHYTHM', speedScale: 1.55, lanes: makeLanes({ 2: { pattern: 'jam', vehicles: standardVehicles('jam'), speed: 0.82 }, 4: { vehicles: standardVehicles('dense'), speed: 1.08 }, 7: { signal: { cycle: 5.8, go: 2.9, phase: 1.4 } } }), safeRows: safeRows() },
    { id: 16, name: 'ROLLING DETOUR', chapter: 4, subtitle: 'TRAFFIC HAS A RHYTHM', speedScale: 1.60, lanes: makeLanes({ 2: { signal: { cycle: 6.5, go: 3.1, phase: 0.0 } }, 6: { signal: { cycle: 6.5, go: 3.1, phase: 3.2 }, vehicles: standardVehicles('bus') } }), safeRows: safeRows({ 5: { blocks: [1, 2], moving: { width: 4, speed: 0.42, start: 0 } }, 8: { blocks: [6, 7] } }), checkpoint: true },

    { id: 17, name: 'THREE WAYS THROUGH', chapter: 5, subtitle: 'THE FINAL CROSSING', speedScale: 1.65, lanes: makeLanes({ 2: { vehicles: standardVehicles('bus') }, 3: { speed: 0.86 }, 6: { vehicles: standardVehicles('dense'), speed: 1.08 }, 9: { signal: { cycle: 6, go: 3.1, phase: 0.8 } } }), safeRows: safeRows({ 5: { blocks: [2, 6] }, 8: { blocks: [1, 4, 7] } }) },
    { id: 18, name: 'EMERGENCY DETOUR', chapter: 5, subtitle: 'THE FINAL CROSSING', speedScale: 1.70, lanes: makeLanes({ 3: { vehicles: standardVehicles('emergency'), signal: { cycle: 6.5, go: 3.2, phase: 0.3 } }, 6: { vehicles: standardVehicles('bus'), speed: 0.96 } }), safeRows: safeRows({ 5: { blocks: [3, 4], moving: { width: 4, speed: 0.46, start: 2 } }, 8: { blocks: [5] } }) },
    { id: 19, name: 'ALL SIGNALS', chapter: 5, subtitle: 'THE FINAL CROSSING', speedScale: 1.75, lanes: makeLanes({
      2: { pattern: 'convoy', vehicles: standardVehicles('convoy'), signal: { cycle: 7, go: 3.4, phase: 0.0 } },
      3: { vehicles: standardVehicles('bus'), signal: { cycle: 7, go: 3.4, phase: 1.1 } },
      6: { vehicles: standardVehicles('emergency'), signal: { cycle: 7, go: 3.4, phase: 2.2 } },
      7: { pattern: 'convoy', vehicles: standardVehicles('convoy'), speed: 0.98 },
    }), safeRows: safeRows({ 5: { moving: { width: 3, speed: 0.58, start: 0 }, blocks: [4] }, 8: { blocks: [2, 6] } }) },
    { id: 20, name: 'CITY LOOP', chapter: 5, subtitle: 'THE FINAL CROSSING', speedScale: 1.80, lanes: makeLanes({
      2: { signal: { cycle: 7.5, go: 3.4, phase: 0.0 }, vehicles: standardVehicles('bus') },
      3: { pattern: 'convoy', vehicles: standardVehicles('convoy'), signal: { cycle: 7.5, go: 3.4, phase: 1.2 } },
      4: { vehicles: standardVehicles('emergency'), signal: { cycle: 7.5, go: 3.4, phase: 2.4 } },
      6: { pattern: 'jam', vehicles: standardVehicles('jam'), speed: 0.86 },
      7: { signal: { cycle: 7.5, go: 3.4, phase: 3.6 }, vehicles: standardVehicles('dense') },
    }), safeRows: safeRows({ 5: { moving: { width: 4, speed: 0.5, start: 0 }, blocks: [1, 7] }, 8: { moving: { width: 3, speed: 0.64, start: 3 }, blocks: [4] } }), checkpoint: true },
  ];

  return { levels, TRAFFIC_ROWS, BASE_SAFE_ROWS };
});
