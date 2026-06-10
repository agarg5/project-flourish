import { describe, expect, test } from 'bun:test';
import { hexagonCoords, hexDistance } from '../hex';

describe('hex grid', () => {
  test('radius-6 hexagon has 127 cells (doc 11 starter map)', () => {
    expect(hexagonCoords(6).length).toBe(127);
  });

  test('cell count formula 3R(R+1)+1 holds', () => {
    for (const r of [1, 2, 8]) {
      expect(hexagonCoords(r).length).toBe(3 * r * (r + 1) + 1);
    }
  });

  test('distance is symmetric and satisfies known values', () => {
    const a = { q: 0, r: 0 };
    const b = { q: 3, r: -1 };
    expect(hexDistance(a, b)).toBe(hexDistance(b, a));
    expect(hexDistance(a, b)).toBe(3);
    expect(hexDistance(a, { q: 1, r: 0 })).toBe(1);
    expect(hexDistance(a, { q: -2, r: 2 })).toBe(2);
  });
});
