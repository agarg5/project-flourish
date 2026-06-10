import { describe, expect, test } from 'bun:test';
import { CONFIG } from '../config';
import { ecoMultiplier } from '../economy';

describe('eco-multiplier curve (doc 10 section 1)', () => {
  test('bounds: 0.5 at dead, 1.6 at thriving', () => {
    expect(ecoMultiplier(0)).toBeCloseTo(CONFIG.ecoMultiplier.min, 5);
    expect(ecoMultiplier(1)).toBeCloseTo(CONFIG.ecoMultiplier.min + CONFIG.ecoMultiplier.span, 5);
  });

  test('crosses 1.0 as eco health moves through ~0.5 (the mechanical core)', () => {
    expect(ecoMultiplier(0.45)).toBeLessThan(1.0);
    expect(ecoMultiplier(0.5)).toBeGreaterThan(1.0);
  });

  test('matches doc 10 reference table within 0.01', () => {
    const table: Array<[number, number]> = [
      [0.3, 0.74], [0.4, 0.89], [0.5, 1.05], [0.6, 1.21], [0.7, 1.36],
    ];
    for (const [h, expected] of table) {
      expect(Math.abs(ecoMultiplier(h) - expected)).toBeLessThan(0.01);
    }
  });

  test('monotonically increasing', () => {
    let prev = -Infinity;
    for (let h = 0; h <= 1.001; h += 0.05) {
      const m = ecoMultiplier(h);
      expect(m).toBeGreaterThanOrEqual(prev);
      prev = m;
    }
  });
});
