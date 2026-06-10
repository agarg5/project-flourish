import { describe, expect, test } from 'bun:test';
import { createSimulation } from '../simulation';

describe('start state (doc 10 section 2: nature-rich, comfort-poor)', () => {
  const sim = createSimulation();
  const s = sim.state;

  test('all six seed species are present at start', () => {
    expect(s.species.filter((sp) => sp.population > 0).length).toBe(6);
  });

  test('indices near worked-example targets', () => {
    expect(s.biodiversity).toBeGreaterThan(62);
    expect(s.biodiversity).toBeLessThan(80);
    expect(s.wellbeing).toBeGreaterThan(13);
    expect(s.wellbeing).toBeLessThan(23);
    expect(s.ecologicalHealth).toBeGreaterThan(0.62);
    expect(s.ecologicalHealth).toBeLessThan(0.8);
    expect(s.flourishing).toBeGreaterThan(8);
    expect(s.flourishing).toBeLessThan(18);
    expect(s.treasury).toBe(50);
    expect(s.researchPoints).toBe(0);
    expect(s.age).toBe('stone');
  });
});

describe('determinism (doc 04: same seed + same inputs = same outputs)', () => {
  test('two sims with identical scripted inputs match exactly after 400 ticks', () => {
    const run = () => {
      const sim = createSimulation();
      sim.setSpendSplit({ buildings: 0.5, rnd: 0.3, stewardship: 0.2 });
      for (let t = 0; t < 400; t++) {
        if (t === 30) sim.placeBuilding('forager_camp', sim.cellsByDistanceFromStart()[0].id);
        if (t === 90) sim.applyAction('plant_hedgerow', sim.cellsByDistanceFromStart()[5].id);
        sim.tick();
      }
      return JSON.stringify(sim.state);
    };
    expect(run()).toBe(run());
  });
});

describe('sanity bounds', () => {
  test('no index goes negative or NaN over a long idle run', () => {
    const sim = createSimulation();
    for (let t = 0; t < 600; t++) {
      sim.tick();
      const s = sim.state;
      for (const v of [s.wellbeing, s.biodiversity, s.flourishing, s.ecologicalHealth, s.treasury]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
      }
      for (const sp of s.species) {
        expect(Number.isFinite(sp.population)).toBe(true);
        expect(sp.population).toBeGreaterThanOrEqual(0);
      }
      for (const c of s.cells) {
        expect(c.habitatQuality).toBeGreaterThanOrEqual(0);
        expect(c.habitatQuality).toBeLessThanOrEqual(1);
      }
    }
  });
});
