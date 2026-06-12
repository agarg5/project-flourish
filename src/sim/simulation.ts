// The simulation core: pure TypeScript, no rendering dependencies, fully
// deterministic (no randomness anywhere). Runs headless in tests (doc 04).

import { createWorldCells, START_QR } from '../data/world.seed';
import { advanceAge, ageDef, checkAgeUp, checkTechUnlocks } from './ageProgression';
import { computeBiodiversity } from './biodiversity';
import { CONFIG } from './config';
import { DEFAULT_CONTENT } from './content';
import { resolveEconomy } from './economy';
import { computeCapacitiesAndMarkers, stepPopulations } from './ecosystem';
import { recomputeHabitat, settlementQuality, suitability } from './habitat';
import { hexDistance } from './hex';
import type {
  ActionDef, BuildingDef, Content, SimState, SpendSplit, WorldCell,
} from './types';
import { computeWellbeing } from './wellbeing';
import { clamp01, pushEvent } from './util';

export interface SimOptions {
  /** When true, the stewardship income share auto-buys restoration near the settlement (M2 demo mode). */
  autoStewardship?: boolean;
}

export interface CommandResult {
  ok: boolean;
  error?: string;
}

export class Simulation {
  readonly content: Content;
  readonly state: SimState;
  private readonly opts: Required<SimOptions>;

  constructor(content: Content = DEFAULT_CONTENT, opts: SimOptions = {}) {
    this.content = content;
    this.opts = { autoStewardship: opts.autoStewardship ?? false };

    const cells = createWorldCells();
    this.state = {
      tick: 0,
      age: content.ages[0].id,
      treasury: CONFIG.startingTreasury,
      researchPoints: 0,
      spendSplit: { buildings: 0.5, rnd: 0.3, stewardship: 0.2 },
      stewardshipBudget: 0,
      cells,
      buildings: [],
      placedEffects: [],
      cellActions: {},
      species: content.species.map((sp) => ({
        speciesId: sp.id,
        population: 0,
        carryingCapacity: 0,
        pristineCapacity: 0,
        arrivalProgress: 0,
        keystoneEffectiveness: 1,
        markerCellIds: [],
      })),
      unlockedTech: ['fire', 'tools'],
      wellbeing: 0,
      biodiversity: 0,
      ecologicalHealth: 0,
      ecoMultiplier: 1,
      economicOutput: 0,
      flourishing: 0,
      worldCarryingCapacity: content.ages[0].ceilings.worldCarryingCapacity,
      terraformBonus: 0,
      ecoHealthSustainedTicks: 0,
      ageUpReady: false,
      sub: {
        nicheCoverage: 0, keystoneHealth: 0, populationHealth: 0, biomeDiversity: 0,
        needs: 0, amenity: 0, envQuality: 0, crowding: 0, settlementQuality: 0,
      },
      events: [],
    };

    // The pristine world already hosts life (doc 10 section 2): species whose
    // suitability clears their threshold start at carrying capacity.
    recomputeHabitat(this.state, content);
    computeCapacitiesAndMarkers(this.state, content);
    for (const sp of content.species) {
      const st = this.state.species.find((s) => s.speciesId === sp.id)!;
      const startAge = content.ages[0];
      const ageOk = !sp.ageAvailableFrom || sp.ageAvailableFrom === startAge.id;
      if (!sp.reintroOnly && ageOk && st.carryingCapacity > 0) {
        st.population = st.carryingCapacity;
      }
    }
    computeCapacitiesAndMarkers(this.state, content);
    for (const st of this.state.species) st.pristineCapacity = st.carryingCapacity;
    this.recomputeIndices(true);
  }

  tick(): void {
    const s = this.state;
    recomputeHabitat(s, this.content);
    if (this.opts.autoStewardship) this.autoStewardshipStep();
    computeCapacitiesAndMarkers(s, this.content);
    stepPopulations(s, this.content);
    this.recomputeIndices(false);
    resolveEconomy(s, this.content, ageDef(s, this.content), this.opts);
    checkTechUnlocks(s, this.content);
    checkAgeUp(s, this.content);
    s.tick++;
  }

  private recomputeIndices(init: boolean): void {
    const s = this.state;
    const age = ageDef(s, this.content);
    const bio = computeBiodiversity(s, this.content);
    const wb = computeWellbeing(s, this.content, age);

    s.biodiversity = bio.bio01 * age.ceilings.maxBiodiversity;
    s.wellbeing = wb.wellbeing;
    s.flourishing = (s.wellbeing * s.biodiversity) / 100;

    // The Hestia horizon: the world's capacity for life is the age's baseline
    // ceiling plus whatever the player has earned by terraforming dead zones.
    s.worldCarryingCapacity = age.ceilings.worldCarryingCapacity + s.terraformBonus;

    // Ecological health: blend of global biodiversity and habitat quality in
    // the settlement impact zone, smoothed over time (doc 03 section 4).
    const sq = settlementQuality(s, CONFIG.ecoHealth.impactRadius);
    const target = clamp01(
      CONFIG.ecoHealth.bioWeight * (s.biodiversity / 100) +
        CONFIG.ecoHealth.qualityWeight * sq,
    );
    s.ecologicalHealth = init
      ? target
      : s.ecologicalHealth + CONFIG.ecoHealth.smoothing * (target - s.ecologicalHealth);

    s.sub = {
      nicheCoverage: bio.nicheCoverage,
      keystoneHealth: bio.keystoneHealth,
      populationHealth: bio.populationHealth,
      biomeDiversity: bio.biomeDiversity,
      needs: wb.needs,
      amenity: wb.amenity,
      envQuality: wb.envQuality,
      crowding: wb.crowding,
      settlementQuality: sq,
    };
  }

  // ---- Player commands -------------------------------------------------

  /** Player-confirmed age advance; valid only when state.ageUpReady. */
  advanceAge(): CommandResult {
    if (!advanceAge(this.state, this.content)) {
      return { ok: false, error: 'age-up gates not met' };
    }
    return { ok: true };
  }

  setSpendSplit(split: SpendSplit): void {
    const total = Math.max(split.buildings, 0) + Math.max(split.rnd, 0) + Math.max(split.stewardship, 0);
    if (total <= 0) return;
    this.state.spendSplit = {
      buildings: Math.max(split.buildings, 0) / total,
      rnd: Math.max(split.rnd, 0) / total,
      stewardship: Math.max(split.stewardship, 0) / total,
    };
  }

  availableBuildings(): BuildingDef[] {
    const ids = new Set<string>();
    for (const t of this.content.techs) {
      if (!this.state.unlockedTech.includes(t.id)) continue;
      for (const b of t.unlocks.buildings ?? []) ids.add(b);
    }
    return this.content.buildings.filter((b) => ids.has(b.id));
  }

  availableActions(): ActionDef[] {
    const ids = new Set<string>();
    for (const t of this.content.techs) {
      if (!this.state.unlockedTech.includes(t.id)) continue;
      for (const a of t.unlocks.actions ?? []) ids.add(a);
    }
    return this.content.actions.filter((a) => ids.has(a.id));
  }

  canPlaceBuilding(buildingId: string, cellId: number): CommandResult {
    const s = this.state;
    const def = this.content.buildings.find((b) => b.id === buildingId);
    if (!def) return { ok: false, error: 'unknown building' };
    if (!this.availableBuildings().some((b) => b.id === buildingId)) {
      return { ok: false, error: 'not unlocked' };
    }
    const cell = s.cells[cellId];
    if (!cell) return { ok: false, error: 'no such cell' };
    if (cell.buildingId) return { ok: false, error: 'cell occupied' };
    if (!def.footprintBiomes.includes(cell.biome)) return { ok: false, error: 'wrong biome' };
    if (s.treasury < def.cost) return { ok: false, error: 'cannot afford' };
    return { ok: true };
  }

  placeBuilding(buildingId: string, cellId: number): CommandResult {
    const can = this.canPlaceBuilding(buildingId, cellId);
    if (!can.ok) return can;
    const s = this.state;
    const def = this.content.buildings.find((b) => b.id === buildingId)!;
    const cell = s.cells[cellId];

    s.treasury -= def.cost;
    s.buildings.push({ id: def.id, cellId, builtAtTick: s.tick });
    cell.buildingId = def.id;
    if (def.effects.habitat?.length) {
      s.placedEffects.push({ originCellId: cellId, sourceId: def.id, effects: def.effects.habitat });
    }
    pushEvent(s, 'build', `Built ${def.name}`);
    return { ok: true };
  }

  canApplyAction(actionId: string, cellId: number, payFromStewardship = false): CommandResult {
    const s = this.state;
    const def = this.content.actions.find((a) => a.id === actionId);
    if (!def) return { ok: false, error: 'unknown action' };
    if (!this.availableActions().some((a) => a.id === actionId)) {
      return { ok: false, error: 'not unlocked' };
    }
    const cell = s.cells[cellId];
    if (!cell) return { ok: false, error: 'no such cell' };
    // Dead zones reject every action except terraforming — terraforming is the
    // one verb that can bring dead land back to life.
    if (this.content.biomes[cell.biome]?.isDeadZone && def.kind !== 'terraform') {
      return { ok: false, error: 'dead zone' };
    }
    if ((s.cellActions[cellId] ?? []).includes(actionId)) {
      return { ok: false, error: 'already applied here' };
    }
    const purse = payFromStewardship ? s.stewardshipBudget : s.treasury;
    if (purse < def.cost) return { ok: false, error: 'cannot afford' };
    return { ok: true };
  }

  applyAction(actionId: string, cellId: number, payFromStewardship = false): CommandResult {
    const can = this.canApplyAction(actionId, cellId, payFromStewardship);
    if (!can.ok) return can;
    const s = this.state;
    const def = this.content.actions.find((a) => a.id === actionId)!;
    const cell = s.cells[cellId];

    if (payFromStewardship) s.stewardshipBudget -= def.cost;
    else s.treasury -= def.cost;
    s.cellActions[cellId] = [...(s.cellActions[cellId] ?? []), actionId];

    // Terraforming permanently converts qualifying cells' biome. We only ever
    // convert dead-zone cells, so greening a desert never overwrites living land.
    const fromBiome = cell.biome;
    let terraformedCount = 0;
    let createdBiome: typeof cell.biome | undefined;
    for (const eff of def.effects.habitat ?? []) {
      if (!eff.createsBiome) continue;
      const radius = eff.radius ?? 0;
      for (const c of s.cells) {
        if (!this.content.biomes[c.biome]?.isDeadZone) continue;
        if (hexDistance(c, cell) > radius) continue;
        c.biome = eff.createsBiome;
        createdBiome = eff.createsBiome;
        terraformedCount++;
      }
    }
    if (def.effects.raisesCarryingCapacity) s.terraformBonus += def.effects.raisesCarryingCapacity;

    if (def.effects.habitat?.length) {
      s.placedEffects.push({ originCellId: cellId, sourceId: def.id, effects: def.effects.habitat });
    }

    if (terraformedCount > 0 && createdBiome) {
      const biomeName = this.content.biomes[createdBiome]?.name ?? createdBiome;
      pushEvent(s, 'action', `${def.name}: ${terraformedCount} cell(s) of ${fromBiome} became ${biomeName}`);
    } else {
      pushEvent(s, 'action', `${def.name} (${cell.biome})`);
    }
    return { ok: true };
  }

  // M2 auto-stewardship: spend the earmarked share on restoration targeted at
  // the most degraded land near the settlement.
  private autoStewardshipStep(): void {
    const s = this.state;
    const def = this.content.actions.find((a) => a.id === CONFIG.autoStewardship.actionId);
    if (!def || s.stewardshipBudget < def.cost || s.buildings.length === 0) return;
    if (!this.availableActions().some((a) => a.id === def.id)) return;

    const origins = s.buildings.map((b) => s.cells[b.cellId]);
    const candidates = s.cells
      .filter(
        (c) =>
          !this.content.biomes[c.biome]?.isDeadZone &&
          c.biome !== 'mountain' &&
          !(s.cellActions[c.id] ?? []).includes(def.id) &&
          origins.some((o) => hexDistance(c, o) <= CONFIG.autoStewardship.searchRadius),
      )
      .sort((a, b) => a.habitatQuality - b.habitatQuality || a.id - b.id);
    if (candidates.length === 0) return;

    const res = this.applyAction(def.id, candidates[0].id, true);
    if (res.ok) pushEvent(s, 'stewardship', `Stewards planted a hedgerow`);
  }

  // ---- Helpers for UI / scenarios ---------------------------------------

  startCell(): WorldCell {
    const c = this.state.cells.find((c) => c.q === START_QR.q && c.r === START_QR.r);
    if (!c) throw new Error('start cell missing from seed');
    return c;
  }

  cellsByDistanceFromStart(): WorldCell[] {
    const start = this.startCell();
    return [...this.state.cells].sort(
      (a, b) => hexDistance(a, start) - hexDistance(b, start) || a.id - b.id,
    );
  }

  suitabilityFor(cellId: number, speciesId: string): number {
    const sp = this.content.species.find((s) => s.id === speciesId);
    if (!sp) return 0;
    return suitability(this.state.cells[cellId], sp);
  }
}

export function createSimulation(content?: Content, opts?: SimOptions): Simulation {
  return new Simulation(content, opts);
}
