import { describe, expect, test } from 'bun:test';
import { ACTIONS } from '../../data/actions';
import { AGES } from '../../data/ages';
import { BIOMES } from '../../data/biomes';
import { BUILDINGS } from '../../data/buildings';
import { SPECIES } from '../../data/species';
import { TECHS } from '../../data/tech';
import { createSimulation } from '../simulation';

const buildingIds = new Set(BUILDINGS.map((b) => b.id));
const actionIds = new Set(ACTIONS.map((a) => a.id));
const techIds = new Set(TECHS.map((t) => t.id));
const speciesIds = new Set(SPECIES.map((s) => s.id));
const ageIds = new Set(AGES.map((a) => a.id));
const biomeTypes = new Set(Object.values(BIOMES).map((b) => b.type));

describe('content graph integrity (doc 12 Phase 3 guards the expanded catalog)', () => {
  test('no duplicate ids across each catalog', () => {
    expect(buildingIds.size).toBe(BUILDINGS.length);
    expect(actionIds.size).toBe(ACTIONS.length);
    expect(techIds.size).toBe(TECHS.length);
    expect(speciesIds.size).toBe(SPECIES.length);
  });

  test('every tech references real ages, prerequisites, and unlock targets', () => {
    for (const t of TECHS) {
      expect(ageIds).toContain(t.ageId);
      for (const p of t.prerequisites) expect(techIds).toContain(p);
      for (const b of t.unlocks.buildings ?? []) expect(buildingIds).toContain(b);
      for (const a of t.unlocks.actions ?? []) expect(actionIds).toContain(a);
      for (const sp of t.unlocks.speciesEnabled ?? []) expect(speciesIds).toContain(sp);
    }
  });

  test('every building references real ages, biomes, and attracted species', () => {
    for (const b of BUILDINGS) {
      expect(ageIds).toContain(b.ageId);
      for (const biome of b.footprintBiomes) expect(biomeTypes).toContain(biome);
      for (const sp of b.effects.attractsSpecies ?? []) expect(speciesIds).toContain(sp);
    }
  });

  test('every action references real ages, reintroduction targets, and created biomes', () => {
    for (const a of ACTIONS) {
      expect(ageIds).toContain(a.ageId);
      if (a.effects.reintroduceSpecies) expect(speciesIds).toContain(a.effects.reintroduceSpecies);
      for (const eff of a.effects.habitat ?? []) {
        if (eff.createsBiome) expect(biomeTypes).toContain(eff.createsBiome);
      }
    }
  });

  test('every species references real biomes and an existing source age', () => {
    for (const s of SPECIES) {
      for (const biome of s.preferredBiomes) expect(biomeTypes).toContain(biome);
      if (s.ageAvailableFrom) expect(ageIds).toContain(s.ageAvailableFrom);
    }
  });

  test('every building and action is reachable — unlocked by at least one tech', () => {
    const unlockedBuildings = new Set(TECHS.flatMap((t) => t.unlocks.buildings ?? []));
    const unlockedActions = new Set(TECHS.flatMap((t) => t.unlocks.actions ?? []));
    for (const b of BUILDINGS) {
      expect(unlockedBuildings.has(b.id)).toBe(true); // orphaned building = unbuildable
    }
    for (const a of ACTIONS) {
      expect(unlockedActions.has(a.id)).toBe(true); // orphaned action = unusable
    }
  });

  test('reintroduction-only species are gated behind a reintroduce action', () => {
    const reintroTargets = new Set(
      ACTIONS.filter((a) => a.effects.reintroduceSpecies).map((a) => a.effects.reintroduceSpecies),
    );
    for (const s of SPECIES) {
      if (s.reintroOnly) expect(reintroTargets.has(s.id)).toBe(true);
    }
  });
});

describe('the late-age spine is reachable end-to-end (doc 12 Phase 3)', () => {
  test('with enough research at the final age, the whole Modern→Stewardship tree unlocks in order', () => {
    const sim = createSimulation();
    sim.state.researchPoints = 5000; // ample — isolates the prerequisite chain from economy pacing

    // Walk to the final age via the gate (pacing is tuned separately).
    for (let i = 0; i < AGES.length - 1; i++) {
      sim.state.ageUpReady = true;
      sim.advanceAge();
    }
    expect(sim.state.age).toBe('stewardship');

    sim.tick(); // checkTechUnlocks resolves the dependency fixpoint
    const techs = new Set(sim.state.unlockedTech);
    for (const id of [
      'renewables', 'green_building', 'restoration_ecology',
      'living_architecture', 'circular_economy', 'rewilding',
      'fusion_power', 'arcology_design', 'terraforming',
    ]) {
      expect(techs.has(id)).toBe(true); // no dead-end in the chain
    }

    // The capstone content those techs gate is now actually available.
    const buildings = new Set(sim.availableBuildings().map((b) => b.id));
    expect(buildings.has('arcology')).toBe(true);
    expect(buildings.has('living_building')).toBe(true);
    const actions = new Set(sim.availableActions().map((a) => a.id));
    expect(actions.has('green_desert')).toBe(true);
    expect(actions.has('reintroduce_bison')).toBe(true);
  });
});
