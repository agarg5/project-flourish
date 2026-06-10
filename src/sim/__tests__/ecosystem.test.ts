import { describe, expect, test } from 'bun:test';
import { CONFIG } from '../config';
import { createSimulation } from '../simulation';

function speciesState(sim: ReturnType<typeof createSimulation>, id: string) {
  const st = sim.state.species.find((s) => s.speciesId === id);
  if (!st) throw new Error(`missing ${id}`);
  return st;
}

describe('"build it and they come" arrival (doc 08 section 4)', () => {
  test('an absent species with suitable habitat arrives after the grace period with a founder population', () => {
    const sim = createSimulation();
    const deer = speciesState(sim, 'deer');
    deer.population = 0;
    deer.arrivalProgress = 0;

    let arrivedAt = -1;
    for (let t = 0; t < CONFIG.arrivalGraceTicks + 5; t++) {
      sim.tick();
      if (arrivedAt < 0 && deer.population > 0) arrivedAt = t + 1;
    }
    expect(arrivedAt).toBeGreaterThanOrEqual(CONFIG.arrivalGraceTicks);
    expect(arrivedAt).toBeLessThanOrEqual(CONFIG.arrivalGraceTicks + 2);
    // Founder population = founderFraction * K
    expect(deer.population).toBeGreaterThan(0.05 * deer.carryingCapacity);
    expect(deer.population).toBeLessThan(0.2 * deer.carryingCapacity);
  });
});

describe('logistic growth (docs 08/11)', () => {
  test('population rises monotonically toward K and reaches 90% in a gentle window', () => {
    const sim = createSimulation();
    const deer = speciesState(sim, 'deer');
    deer.population = 0.1 * deer.carryingCapacity;

    let prev = deer.population;
    let reached90 = -1;
    for (let t = 0; t < 150; t++) {
      sim.tick();
      expect(deer.population).toBeGreaterThanOrEqual(prev - 1e-9);
      expect(deer.population).toBeLessThanOrEqual(deer.carryingCapacity * 1.01);
      prev = deer.population;
      if (reached90 < 0 && deer.population >= 0.9 * deer.carryingCapacity) reached90 = t;
    }
    expect(reached90).toBeGreaterThan(40);
    expect(reached90).toBeLessThan(120);
  });
});

describe('keystone cascade + recovery (docs 08 section 5, 11 section 6)', () => {
  test('crushing the beaver withdraws its boost and drops biodiversity; recovery is symmetric', () => {
    const sim = createSimulation();
    const beaver = speciesState(sim, 'beaver');
    const baselineBio = sim.state.biodiversity;
    const baselineHeronK = speciesState(sim, 'heron').carryingCapacity;

    // Crush the keystone below its cascade threshold.
    beaver.population = 0.05 * beaver.carryingCapacity;
    for (let t = 0; t < 40; t++) sim.tick();

    expect(beaver.keystoneEffectiveness).toBeLessThan(0.2);
    const cascadeBio = sim.state.biodiversity;
    expect(cascadeBio).toBeLessThan(baselineBio - 5);
    expect(speciesState(sim, 'heron').carryingCapacity).toBeLessThan(baselineHeronK);

    // Restore the keystone; effects reverse gently.
    beaver.population = beaver.carryingCapacity;
    for (let t = 0; t < 80; t++) sim.tick();
    expect(beaver.keystoneEffectiveness).toBeGreaterThan(0.9);
    expect(sim.state.biodiversity).toBeGreaterThan(cascadeBio + 3);
    expect(sim.state.biodiversity).toBeGreaterThan(baselineBio - 6);
  });
});
