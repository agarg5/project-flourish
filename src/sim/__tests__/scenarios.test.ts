// Fast-forward harness assertions (doc 11 section 7) plus worked-example
// directional checks (doc 10). Exact doc-10 numbers are illustrative; these
// tests lock the *relationships* — steward-forward wins, neglect stalls,
// the multiplier punishes degradation, and the synergy invariant holds.

import { describe, expect, test } from 'bun:test';
import { balanced, buildHeavy, greenPath, neglectPath, runScenario, stewardForward } from '../scenarios';

describe('worked example: steward-forward vs build-heavy (doc 10)', () => {
  const A = runScenario(buildHeavy, 600);
  const B = runScenario(stewardForward, 600);

  test('B advances beyond the Stone Age; A is still gated at tick 600', () => {
    expect(B.sim.state.age).not.toBe('stone');
    expect(A.sim.state.age).toBe('stone');
    expect(A.sim.state.researchPoints).toBeGreaterThan(120);
  });

  test('B ends with clearly higher flourishing', () => {
    const aEnd = A.rows[A.rows.length - 1].flourishing;
    const bEnd = B.rows[B.rows.length - 1].flourishing;
    expect(bEnd).toBeGreaterThan(aEnd * 1.2);
  });

  test('the eco-multiplier separates the strategies', () => {
    const aMin = Math.min(...A.rows.map((r) => r.ecoMult));
    const bMin = Math.min(...B.rows.map((r) => r.ecoMult));
    expect(aMin).toBeLessThan(bMin - 0.1);
  });

  test('build-heavy ends far less biodiverse than steward-forward, with a retreating wolf', () => {
    // On a large world one settlement barely dents *global* biodiversity, but
    // the gap between a careless and a careful playthrough is still clear, and
    // the wolf visibly retreats from the degraded settlement zone.
    const aBio = A.rows[A.rows.length - 1].biodiversity;
    const bBio = B.rows[B.rows.length - 1].biodiversity;
    expect(aBio).toBeLessThan(bBio - 8);
    const wolf = A.sim.state.species.find((s) => s.speciesId === 'wolf')!;
    expect(wolf.carryingCapacity).toBeLessThan(0.92 * wolf.pristineCapacity);
    const wolfB = B.sim.state.species.find((s) => s.speciesId === 'wolf')!;
    expect(wolfB.carryingCapacity).toBeGreaterThan(0.95 * wolfB.pristineCapacity);
  });
});

describe('doc 11 harness: green / neglect / balanced over 600 ticks', () => {
  const green = runScenario(greenPath, 600);
  const neglect = runScenario(neglectPath, 600);
  const mid = runScenario(balanced, 600);

  test('eco-mindful strategies (green, balanced) clearly beat the neglect path', () => {
    const f = (r: typeof green) => r.rows[r.rows.length - 1].flourishing;
    expect(f(green)).toBeGreaterThan(f(neglect) * 1.15);
    expect(f(mid)).toBeGreaterThan(f(neglect) * 1.15);
  });

  test('neglect drags the eco-multiplier toward the 1.0 crossing (nature throttles the economy)', () => {
    // Stone-age content can only degrade so far; the full below-1.0 crossing
    // is unit-tested on the curve itself (economy.test.ts) and becomes
    // reachable in later ages. Here we lock the *relationship*.
    const neglectMin = Math.min(...neglect.rows.map((r) => r.ecoMult));
    const greenMin = Math.min(...green.rows.map((r) => r.ecoMult));
    expect(neglectMin).toBeLessThan(1.1);
    expect(neglectMin).toBeLessThan(greenMin - 0.2);
  });

  test('no value is negative, NaN, or out of bounds in any scenario', () => {
    for (const { rows } of [green, neglect, mid]) {
      for (const r of rows) {
        for (const v of [r.wellbeing, r.biodiversity, r.flourishing, r.ecoHealth, r.ecoMult, r.treasury]) {
          expect(Number.isFinite(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(0);
        }
        expect(r.ecoHealth).toBeLessThanOrEqual(1);
        expect(r.flourishing).toBeLessThanOrEqual(150);
      }
    }
  });

  test('synergy invariant: flourishing never rises while BOTH wellbeing and biodiversity fall', () => {
    for (const { rows } of [green, neglect, mid]) {
      for (let i = 1; i < rows.length; i++) {
        const dW = rows[i].wellbeing - rows[i - 1].wellbeing;
        const dB = rows[i].biodiversity - rows[i - 1].biodiversity;
        const dF = rows[i].flourishing - rows[i - 1].flourishing;
        if (dW < -1e-9 && dB < -1e-9) {
          expect(dF).toBeLessThanOrEqual(1e-9);
        }
      }
    }
  });
});
