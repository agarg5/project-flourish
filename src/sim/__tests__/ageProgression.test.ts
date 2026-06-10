import { describe, expect, test } from 'bun:test';
import { createSimulation } from '../simulation';
import { neglectPath, runScenario } from '../scenarios';

describe('dual age-up gate (doc 03 section 6)', () => {
  test('research alone is not enough: the eco-health half must be sustained, then age-up fires', () => {
    const sim = createSimulation();
    sim.state.researchPoints = 200; // research half satisfied immediately

    // Pristine world: ecoHealth ~0.7 >= 0.60, so the sustain counter should
    // run its full 180 ticks before the age flips.
    let ageUpTick = -1;
    for (let t = 0; t < 250; t++) {
      sim.tick();
      if (ageUpTick < 0 && sim.state.age !== 'stone') ageUpTick = t + 1;
    }
    expect(ageUpTick).toBeGreaterThanOrEqual(180);
    expect(ageUpTick).toBeLessThanOrEqual(185);
    expect(sim.state.age).toBe('agricultural');
  });

  test('a build-rush that degrades the land is denied age-up despite meeting the research bar', () => {
    const { sim, rows } = runScenario(neglectPath, 600);
    expect(sim.state.researchPoints).toBeGreaterThan(120); // research half met
    expect(sim.state.age).toBe('stone');                   // ...but gated
    // The gate is the reason: eco health must have spent the run below 0.60.
    const lateRows = rows.slice(300);
    expect(Math.min(...lateRows.map((r) => r.ecoHealth))).toBeLessThan(0.6);
  });
});
