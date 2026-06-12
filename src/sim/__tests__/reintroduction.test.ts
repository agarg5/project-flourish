import { describe, expect, test } from 'bun:test';
import { CONFIG } from '../config';
import { createSimulation } from '../simulation';

function speciesState(sim: ReturnType<typeof createSimulation>, id: string) {
  const st = sim.state.species.find((s) => s.speciesId === id);
  if (!st) throw new Error(`missing ${id}`);
  return st;
}

function forestCell(sim: ReturnType<typeof createSimulation>) {
  const c = sim.state.cells.find((c) => c.biome === 'forest');
  if (!c) throw new Error('seed has no forest cell');
  return c;
}

describe('reintroduction-only species do not arrive on their own (doc 12 Phase 2)', () => {
  test('a reintroOnly species stays absent even where its habitat is suitable', () => {
    const sim = createSimulation();
    const lynx = speciesState(sim, 'lynx');
    expect(lynx.population).toBe(0);
    expect(lynx.carryingCapacity).toBeGreaterThan(0); // forest/mountain suit it

    for (let t = 0; t < CONFIG.arrivalGraceTicks + 20; t++) sim.tick();
    expect(lynx.population).toBe(0); // never colonizes — no source population
  });
});

describe('reintroduction is rare and earned (doc 12 Phase 2)', () => {
  test('fails when the habitat is not ready to receive the species', () => {
    const sim = createSimulation();
    sim.state.unlockedTech.push('restoration_ecology');
    sim.state.treasury = 1000;
    const lynx = speciesState(sim, 'lynx');
    lynx.carryingCapacity = 0; // no habitat ready right now
    const forest = forestCell(sim);

    expect(sim.canApplyAction('reintroduce_lynx', forest.id).ok).toBe(false);
    expect(sim.canApplyAction('reintroduce_lynx', forest.id).error).toBe('habitat not ready');
  });

  test('succeeds into ready habitat, seeding a founder population that takes hold', () => {
    const sim = createSimulation();
    sim.state.unlockedTech.push('restoration_ecology');
    sim.state.treasury = 1000;
    const lynx = speciesState(sim, 'lynx');
    const forest = forestCell(sim);
    const K = lynx.carryingCapacity;
    expect(K).toBeGreaterThan(0);

    const res = sim.applyAction('reintroduce_lynx', forest.id);
    expect(res.ok).toBe(true);
    expect(lynx.population).toBeGreaterThan(0);
    expect(lynx.population).toBeCloseTo(CONFIG.founderFraction * K, 5);

    // It establishes and grows rather than blinking out.
    for (let t = 0; t < 60; t++) sim.tick();
    expect(lynx.population).toBeGreaterThan(CONFIG.founderFraction * K);
  });

  test('a species already present cannot be reintroduced again', () => {
    const sim = createSimulation();
    sim.state.unlockedTech.push('restoration_ecology');
    sim.state.treasury = 1000;
    const forest = forestCell(sim);

    expect(sim.applyAction('reintroduce_lynx', forest.id).ok).toBe(true);
    const again = sim.canApplyAction('reintroduce_lynx', forest.id);
    expect(again.ok).toBe(false);
    expect(again.error).toBe('already present');
  });
});

describe('the reintroduced bison is a working second keystone (doc 12 Phase 2)', () => {
  test('once reintroduced and grown past its cascade threshold, it projects a keystone boost', () => {
    const sim = createSimulation();
    sim.state.unlockedTech.push('restoration_ecology', 'rewilding');
    sim.state.treasury = 1000;
    const bison = speciesState(sim, 'bison');
    const grassland = sim.state.cells.find((c) => c.biome === 'grassland');
    if (!grassland) throw new Error('seed has no grassland cell');

    expect(sim.applyAction('reintroduce_bison', grassland.id).ok).toBe(true);
    const founderPop = bison.population;
    expect(bison.keystoneEffectiveness).toBeLessThan(0.3); // founder pop below threshold

    for (let t = 0; t < 200; t++) sim.tick();
    expect(bison.population).toBeGreaterThan(founderPop); // grew past the founder seed
    expect(bison.keystoneEffectiveness).toBeGreaterThan(0.8); // now a healthy, projecting keystone
  });
});
