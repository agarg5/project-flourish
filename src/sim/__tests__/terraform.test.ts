import { describe, expect, test } from 'bun:test';
import { AGES } from '../../data/ages';
import { createSimulation } from '../simulation';

function speciesState(sim: ReturnType<typeof createSimulation>, id: string) {
  const st = sim.state.species.find((s) => s.speciesId === id);
  if (!st) throw new Error(`missing ${id}`);
  return st;
}

function desertCell(sim: ReturnType<typeof createSimulation>) {
  const c = sim.state.cells.find((c) => c.biome === 'desert');
  if (!c) throw new Error('seed has no desert cell to terraform');
  return c;
}

describe('Phase 0 — the Hestia ceiling scales carrying capacity (doc 12)', () => {
  test('worldFactor is 1.0 at the starting world (pristine balance unchanged)', () => {
    const sim = createSimulation();
    expect(sim.state.worldCarryingCapacity).toBe(AGES[0].ceilings.worldCarryingCapacity);
    expect(sim.state.terraformBonus).toBe(0);
  });

  test('raising terraformBonus grows every habitat carrying capacity proportionally', () => {
    const sim = createSimulation();
    const deer = speciesState(sim, 'deer');
    const baseK = deer.carryingCapacity;
    expect(baseK).toBeGreaterThan(0);

    // Double the world's capacity (baseline 100 + 100 bonus -> factor 2).
    sim.state.terraformBonus = AGES[0].ceilings.worldCarryingCapacity;
    sim.tick(); // recomputeIndices publishes the new worldCarryingCapacity
    sim.tick(); // capacities pick it up

    expect(deer.carryingCapacity).toBeGreaterThan(baseK * 1.8);
    expect(deer.carryingCapacity).toBeLessThan(baseK * 2.2);
  });

  test('age-up preserves the player-earned terraform bonus', () => {
    const sim = createSimulation();
    sim.state.terraformBonus = 8;
    sim.state.ageUpReady = true;

    const res = sim.advanceAge();
    expect(res.ok).toBe(true);
    expect(sim.state.age).toBe('agricultural');
    expect(sim.state.worldCarryingCapacity).toBe(AGES[1].ceilings.worldCarryingCapacity + 8);
  });
});

describe('Phase 1 — terraforming converts dead zones to living land (doc 12)', () => {
  test('terraforming is the only action permitted on a dead zone', () => {
    const sim = createSimulation();
    sim.state.unlockedTech.push('terraforming');
    sim.state.treasury = 1000;
    const desert = desertCell(sim);

    expect(sim.canApplyAction('plant_hedgerow', desert.id).ok).toBe(false);
    expect(sim.canApplyAction('green_desert', desert.id).ok).toBe(true);
  });

  test('green_desert converts the cell to grassland and raises world carrying capacity', () => {
    const sim = createSimulation();
    sim.state.unlockedTech.push('terraforming');
    sim.state.treasury = 1000;
    const desert = desertCell(sim);
    const bonusBefore = sim.state.terraformBonus;

    const res = sim.applyAction('green_desert', desert.id);
    expect(res.ok).toBe(true);
    expect(desert.biome).toBe('grassland');
    expect(sim.state.terraformBonus).toBe(bonusBefore + 8);
  });

  test('a greened cell becomes high-quality habitat after a tick (was a dead zone)', () => {
    const sim = createSimulation();
    sim.state.unlockedTech.push('terraforming');
    sim.state.treasury = 1000;
    const desert = desertCell(sim);
    expect(desert.habitatQuality).toBeLessThan(0.2); // dead-zone baseline

    sim.applyAction('green_desert', desert.id);
    sim.tick(); // recomputeHabitat applies the new biome + delta
    expect(desert.habitatQuality).toBeGreaterThan(0.5);
  });

  test('create_oasis converts a desert cell to wetland', () => {
    const sim = createSimulation();
    sim.state.unlockedTech.push('terraforming');
    sim.state.treasury = 1000;
    const desert = desertCell(sim);

    const res = sim.applyAction('create_oasis', desert.id);
    expect(res.ok).toBe(true);
    expect(desert.biome).toBe('wetland');
  });
});
