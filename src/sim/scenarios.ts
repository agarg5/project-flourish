// Scripted play-style scenarios for the fast-forward harness (doc 11 section 7)
// and the worked-example assertions (doc 10). Deterministic by construction.

import { CONFIG } from './config';
import { hexDistance } from './hex';
import { createSimulation, Simulation } from './simulation';
import type { BiomeType, SpendSplit } from './types';

export interface ScenarioRow {
  tick: number;
  wellbeing: number;
  biodiversity: number;
  flourishing: number;
  ecoHealth: number;
  ecoMult: number;
  economy: number;
  treasury: number;
  research: number;
  speciesCount: number;
  age: string;
}

export interface Strategy {
  name: string;
  spendSplit: SpendSplit;
  onTurn: (sim: Simulation, turn: number) => void;
}

/** Place a building on the first valid cell, nearest the start cell first. */
export function placeNearStart(sim: Simulation, buildingId: string): boolean {
  for (const cell of sim.cellsByDistanceFromStart()) {
    if (sim.placeBuilding(buildingId, cell.id).ok) return true;
  }
  return false;
}

/** Apply a stewardship action to the lowest-quality valid cell near the settlement. */
export function actNearSettlement(sim: Simulation, actionId: string): boolean {
  const s = sim.state;
  const origins = (s.buildings.length ? s.buildings.map((b) => s.cells[b.cellId]) : [sim.startCell()]);
  const candidates = [...s.cells]
    .filter((c) => origins.some((o) => hexDistance(c, o) <= 4))
    .sort((a, b) => a.habitatQuality - b.habitatQuality || a.id - b.id);
  for (const cell of candidates) {
    if (sim.applyAction(actionId, cell.id).ok) return true;
  }
  return false;
}

/**
 * Terraform the first available dead-zone cell with the given action. An
 * optional source biome targets a specific dead zone (e.g. desert vs open
 * water) so each terraform action only ever converts the land it is meant for.
 */
export function terraformDeadZone(
  sim: Simulation,
  actionId: string,
  sourceBiome?: BiomeType,
): boolean {
  for (const cell of sim.state.cells) {
    const isTarget = sourceBiome
      ? cell.biome === sourceBiome
      : sim.content.biomes[cell.biome]?.isDeadZone;
    if (isTarget && sim.applyAction(actionId, cell.id).ok) return true;
  }
  return false;
}

/** Reintroduce a species onto the nearest cell of one of its preferred biomes. */
export function reintroduceInto(sim: Simulation, actionId: string, biomes: BiomeType[]): boolean {
  for (const cell of sim.cellsByDistanceFromStart()) {
    if (biomes.includes(cell.biome) && sim.applyAction(actionId, cell.id).ok) return true;
  }
  return false;
}

function countBuildings(sim: Simulation, id: string): number {
  return sim.state.buildings.filter((b) => b.id === id).length;
}

function countActions(sim: Simulation, id: string): number {
  return Object.values(sim.state.cellActions).filter((list) => list.includes(id)).length;
}

// Strategy A from doc 10: build-heavy, minimal stewardship. Builds eagerly
// (doc 10: "throws up 3 forager camps" in the first turns).
export const buildHeavy: Strategy = {
  name: 'build-heavy',
  spendSplit: { buildings: 0.7, rnd: 0.25, stewardship: 0.05 },
  onTurn(sim) {
    for (let i = 0; i < 2; i++) {
      if (countBuildings(sim, 'forager_camp') < 11) placeNearStart(sim, 'forager_camp');
    }
  },
};

// Doc 11 "neglect path": max economy, ignore ecology entirely.
export const neglectPath: Strategy = {
  name: 'neglect',
  spendSplit: { buildings: 0.85, rnd: 0.15, stewardship: 0 },
  onTurn(sim) {
    if (countBuildings(sim, 'forager_camp') < 14) placeNearStart(sim, 'forager_camp');
  },
};

// Strategy B from doc 10: steward-forward — hold habitat while growing.
// Extends into the later ages: every economic addition is paired with
// stewardship, the thesis playstyle.
export const stewardForward: Strategy = {
  name: 'steward-forward',
  spendSplit: { buildings: 0.4, rnd: 0.3, stewardship: 0.3 },
  onTurn(sim, turn) {
    if (turn === 1) placeNearStart(sim, 'forager_camp');
    if (turn >= 2 && countActions(sim, 'plant_hedgerow') < 4 && turn % 2 === 0) {
      actNearSettlement(sim, 'plant_hedgerow');
    }
    if (turn === 5) placeNearStart(sim, 'fire_hearth');
    if (turn >= 8 && countBuildings(sim, 'forager_camp') < 3) placeNearStart(sim, 'forager_camp');
    if (sim.state.age !== 'stone') {
      if (countActions(sim, 'protect_wetland') < 1) actNearSettlement(sim, 'protect_wetland');
      if (countBuildings(sim, 'polyculture_plot') < 2) placeNearStart(sim, 'polyculture_plot');
      if (countBuildings(sim, 'irrigation_channel') < 1) placeNearStart(sim, 'irrigation_channel');
    }
    const ageIdx = sim.content.ages.find((a) => a.id === sim.state.age)?.index ?? 0;
    if (ageIdx >= 2) {
      if (countBuildings(sim, 'well') < 1) placeNearStart(sim, 'well');
      if (countBuildings(sim, 'trade_post') < 1) placeNearStart(sim, 'trade_post');
      if (countActions(sim, 'restore_stream') < 2) actNearSettlement(sim, 'restore_stream');
      if (countActions(sim, 'plant_grove') < 2) actNearSettlement(sim, 'plant_grove');
    }
    if (ageIdx >= 3) {
      if (countBuildings(sim, 'sawmill') < 1) placeNearStart(sim, 'sawmill');
      if (countActions(sim, 'reforest') < 2) actNearSettlement(sim, 'reforest');
    }
  },
};

// Doc 12 Phase 5: the full thesis playthrough — steward through every age, then
// use the late-game stewardship tools (reintroduction + dead-zone terraforming)
// to push the world past the wild baseline toward the Hestia ceiling.
export const stewardToHestia: Strategy = {
  name: 'steward-to-hestia',
  spendSplit: { buildings: 0.34, rnd: 0.33, stewardship: 0.33 },
  onTurn(sim, turn) {
    stewardForward.onTurn(sim, turn); // reuse the early → industrial playbook
    const ageIdx = sim.content.ages.find((a) => a.id === sim.state.age)?.index ?? 0;
    const absent = (id: string) =>
      (sim.state.species.find((s) => s.speciesId === id)?.population ?? 0) <= 0;

    if (ageIdx >= 4) {
      // Modern: renewables, green housing, corridors, and the lynx returns.
      if (countBuildings(sim, 'solar_array') < 2) placeNearStart(sim, 'solar_array');
      if (countBuildings(sim, 'green_tower') < 1) placeNearStart(sim, 'green_tower');
      if (countActions(sim, 'wildlife_corridor') < 2) actNearSettlement(sim, 'wildlife_corridor');
      if (absent('lynx')) reintroduceInto(sim, 'reintroduce_lynx', ['forest', 'mountain']);
    }
    if (ageIdx >= 5) {
      // Synergy: living buildings, vertical farms, rewilding, and the bison keystone.
      if (countBuildings(sim, 'living_building') < 2) placeNearStart(sim, 'living_building');
      if (countBuildings(sim, 'vertical_farm') < 1) placeNearStart(sim, 'vertical_farm');
      if (countActions(sim, 'rewild_landscape') < 2) actNearSettlement(sim, 'rewild_landscape');
      if (absent('bison')) reintroduceInto(sim, 'reintroduce_bison', ['grassland', 'forest']);
    }
    if (ageIdx >= 6) {
      // Stewardship: clean abundance, and terraform both dead zones toward
      // Hestia — green the desert and raise the deep sea into living shallows.
      if (countBuildings(sim, 'fusion_plant') < 1) placeNearStart(sim, 'fusion_plant');
      if (countBuildings(sim, 'arcology') < 1) placeNearStart(sim, 'arcology');
      terraformDeadZone(sim, 'green_desert', 'desert');
      terraformDeadZone(sim, 'create_oasis', 'desert');
      terraformDeadZone(sim, 'seed_shallows', 'open_water');
    }
  },
};

// Doc 11 "green path": eco-friendly choices only.
export const greenPath: Strategy = {
  name: 'green',
  spendSplit: { buildings: 0.35, rnd: 0.3, stewardship: 0.35 },
  onTurn(sim, turn) {
    if (turn === 1) placeNearStart(sim, 'forager_camp');
    if (countActions(sim, 'plant_hedgerow') < 6) actNearSettlement(sim, 'plant_hedgerow');
    if (sim.state.age !== 'stone') {
      if (countActions(sim, 'protect_wetland') < 2) actNearSettlement(sim, 'protect_wetland');
      if (countBuildings(sim, 'polyculture_plot') < 3) placeNearStart(sim, 'polyculture_plot');
      if (countBuildings(sim, 'irrigation_channel') < 1) placeNearStart(sim, 'irrigation_channel');
    }
  },
};

// Doc 11 "balanced": mixed.
export const balanced: Strategy = {
  name: 'balanced',
  spendSplit: { buildings: 0.5, rnd: 0.3, stewardship: 0.2 },
  onTurn(sim, turn) {
    if (countBuildings(sim, 'forager_camp') < 2) placeNearStart(sim, 'forager_camp');
    if (turn >= 3 && countActions(sim, 'plant_hedgerow') < 2 && turn % 3 === 0) {
      actNearSettlement(sim, 'plant_hedgerow');
    }
    if (turn === 6) placeNearStart(sim, 'fire_hearth');
    if (sim.state.age !== 'stone' && countBuildings(sim, 'polyculture_plot') < 1) {
      placeNearStart(sim, 'polyculture_plot');
    }
  },
};

export function runScenario(
  strategy: Strategy,
  ticks: number,
): { rows: ScenarioRow[]; sim: Simulation } {
  const sim = createSimulation(undefined, { autoStewardship: false });
  sim.setSpendSplit(strategy.spendSplit);
  const rows: ScenarioRow[] = [];
  for (let t = 0; t < ticks; t++) {
    if (t % CONFIG.ticksPerTurn === 0) strategy.onTurn(sim, t / CONFIG.ticksPerTurn);
    sim.tick();
    // Scenario players always take the age-up the moment it is offered.
    if (sim.state.ageUpReady) sim.advanceAge();
    const s = sim.state;
    rows.push({
      tick: s.tick,
      wellbeing: s.wellbeing,
      biodiversity: s.biodiversity,
      flourishing: s.flourishing,
      ecoHealth: s.ecologicalHealth,
      ecoMult: s.ecoMultiplier,
      economy: s.economicOutput,
      treasury: s.treasury,
      research: s.researchPoints,
      speciesCount: s.species.filter((sp) => sp.population > 0).length,
      age: s.age,
    });
  }
  return { rows, sim };
}

export function toCsv(rows: ScenarioRow[]): string {
  const header = Object.keys(rows[0]).join(',');
  const lines = rows.map((r) =>
    Object.values(r)
      .map((v) => (typeof v === 'number' ? v.toFixed(4) : String(v)))
      .join(','),
  );
  return [header, ...lines].join('\n');
}
