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

describe('pristine world starts at equilibrium (doc 10 section 2)', () => {
  test('no seed species starts below its pristine carrying capacity', () => {
    const sim = createSimulation();
    for (const sp of sim.state.species) {
      if (sp.population <= 0) continue;
      expect(sp.population).toBeGreaterThanOrEqual(sp.pristineCapacity - 1e-6);
    }
  });

  test('an untouched world does not drift upward over its first 300 ticks', () => {
    const sim = createSimulation();
    const bio0 = sim.state.biodiversity;
    for (let t = 0; t < 300; t++) sim.tick();
    // Equilibrium: idle biodiversity holds steady (keystone-boosted capacity is
    // baked into the start state, so nothing grows into slack it started below).
    expect(Math.abs(sim.state.biodiversity - bio0)).toBeLessThan(0.5);
  });
});

describe('auto-stewardship (M2 demo path)', () => {
  test('the stewardship income share accrues and buys restoration near the settlement', () => {
    const sim = createSimulation(undefined, { autoStewardship: true });
    sim.setSpendSplit({ buildings: 0.4, rnd: 0.2, stewardship: 0.4 });
    // A building both funds income above subsistence and anchors the search zone.
    sim.placeBuilding('forager_camp', sim.cellsByDistanceFromStart()[0].id);

    let budgetEverPositive = false;
    for (let t = 0; t < 400; t++) {
      sim.tick();
      if (sim.state.stewardshipBudget > 0) budgetEverPositive = true;
    }
    expect(budgetEverPositive).toBe(true);
    // Stewards should have planted at least one hedgerow (a cellAction) by now.
    const hedgerows = Object.values(sim.state.cellActions)
      .flat()
      .filter((a) => a === 'plant_hedgerow').length;
    expect(hedgerows).toBeGreaterThan(0);
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
