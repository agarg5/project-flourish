// Zustand bridge between the sim (source of truth) and React/R3F consumers.
// The sim instance lives outside React; the store holds UI snapshots plus
// transient UI state (placement mode, hover).

import { create } from 'zustand';
import { sfxAgeUp, sfxInvalid, sfxPlace } from '../audio/sound';
import { createSimulation } from '../sim';
import type { SimEvent, SimState, SpendSplit, SubIndices } from '../sim';

// `sim` is reassignable so Restart can swap in a fresh world (ES module live
// bindings mean importers see the new instance).
export let sim = createSimulation(undefined, { autoStewardship: true });

// --- localStorage persistence (doc 11). Bump SAVE_VERSION whenever the world
// layout or state shape changes, so stale saves are discarded rather than
// loaded into a mismatched world. ---
const SAVE_KEY = 'flourish.save';
const SAVE_VERSION = 6; // v6: citizen population added to sim state

function loadSaved(): void {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { version: number; state: SimState };
    if (parsed.version !== SAVE_VERSION) return;
    const s = parsed.state;
    if (!s || !Array.isArray(s.cells) || s.cells.length !== sim.state.cells.length) return;
    Object.assign(sim.state, s); // identity preserved, contents restored
  } catch {
    /* corrupt save / private mode — ignore, start fresh */
  }
}

export function saveGame(): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, state: sim.state }));
  } catch {
    /* quota / private mode */
  }
}

loadSaved();
if (typeof window !== 'undefined') {
  // Auto-save a few times a minute so a closed tab doesn't lose progress.
  setInterval(saveGame, 8000);
}

export interface UICell {
  id: number;
  q: number;
  r: number;
  biome: string;
  quality: number;
  buildingId?: string;
}

export interface UISpecies {
  id: string;
  name: string;
  emoji: string;
  color: string;
  population: number;
  carryingCapacity: number;
  /** Cells where this species' herds render — spread across its habitat. */
  markerCellIds: number[];
}

export interface UIPlaceable {
  kind: 'building' | 'action';
  id: string;
  name: string;
  description: string;
  cost: number;
  affordable: boolean;
}

export interface UISnapshot {
  tick: number;
  age: string;
  ageName: string;
  ageUpReady: boolean;
  treasury: number;
  research: number;
  stewardshipBudget: number;
  citizens: number;
  wellbeing: number;
  biodiversity: number;
  flourishing: number;
  ecoHealth: number;
  ecoMult: number;
  economicOutput: number;
  worldVitality: number;          // worldCarryingCapacity — the Hestia horizon
  worldVitalityBaseline: number;  // the wild starting world's capacity (the reference)
  sub: SubIndices;
  spendSplit: SpendSplit;
  cells: UICell[];
  buildings: { id: string; cellId: number; builtAtTick: number }[];
  species: UISpecies[];
  events: SimEvent[];
  unlockedTech: string[];
  placeables: UIPlaceable[];
  nextAge?: {
    name: string;
    requiredResearch: number;
    requiredEcoHealth: number;
    sustainTicks: number;
    sustainedTicks: number;
  };
}

function takeSnapshot(): UISnapshot {
  const s = sim.state;
  const cur = sim.content.ages.find((a) => a.id === s.age)!;
  const next = sim.content.ages.find((a) => a.index === cur.index + 1);
  const speciesDefs = new Map(sim.content.species.map((sp) => [sp.id, sp]));
  return {
    tick: s.tick,
    age: s.age,
    ageName: cur.name,
    ageUpReady: s.ageUpReady,
    treasury: s.treasury,
    research: s.researchPoints,
    stewardshipBudget: s.stewardshipBudget,
    citizens: Math.round(s.citizens),
    wellbeing: s.wellbeing,
    biodiversity: s.biodiversity,
    flourishing: s.flourishing,
    ecoHealth: s.ecologicalHealth,
    ecoMult: s.ecoMultiplier,
    economicOutput: s.economicOutput,
    worldVitality: s.worldCarryingCapacity,
    worldVitalityBaseline: sim.content.ages[0].ceilings.worldCarryingCapacity,
    sub: { ...s.sub },
    spendSplit: { ...s.spendSplit },
    cells: s.cells.map((c) => ({
      id: c.id, q: c.q, r: c.r, biome: c.biome,
      quality: c.habitatQuality, buildingId: c.buildingId,
    })),
    buildings: s.buildings.map((b) => ({ ...b })),
    species: s.species
      .filter((sp) => sp.population > 0)
      .map((sp) => {
        const def = speciesDefs.get(sp.speciesId)!;
        return {
          id: sp.speciesId,
          name: def.name,
          emoji: def.uiEmoji,
          color: def.uiColor,
          population: Math.round(sp.population),
          carryingCapacity: Math.round(sp.carryingCapacity),
          markerCellIds: sp.markerCellIds.length ? [...sp.markerCellIds] : [0],
        };
      }),
    events: [...s.events],
    unlockedTech: [...s.unlockedTech],
    placeables: [
      ...sim.availableBuildings().map((b) => ({
        kind: 'building' as const,
        id: b.id,
        name: b.name,
        description: b.description,
        cost: b.cost,
        affordable: s.treasury >= b.cost,
      })),
      ...sim.availableActions().map((a) => ({
        kind: 'action' as const,
        id: a.id,
        name: a.name,
        description: a.description,
        cost: a.cost,
        affordable: s.treasury >= a.cost,
      })),
    ],
    nextAge: next
      ? {
          name: next.name,
          requiredResearch: next.requiredResearch,
          requiredEcoHealth: next.requiredEcoHealth,
          sustainTicks: next.ecoHealthSustainTicks,
          sustainedTicks: s.ecoHealthSustainedTicks,
        }
      : undefined,
  };
}

export interface Placing {
  kind: 'building' | 'action';
  id: string;
}

interface GameStore {
  snap: UISnapshot;
  placing: Placing | null;
  hoveredCellId: number | null;
  /** Cell the player tapped to inspect (null = inspector closed). */
  selectedCellId: number | null;
  /** Bumped on every Restart — lets UI (tutorial) remount for the new world. */
  restartCount: number;
  refresh: () => void;
  setSpendSplit: (split: SpendSplit) => void;
  setPlacing: (p: Placing | null) => void;
  setHoveredCell: (cellId: number | null) => void;
  setSelectedCell: (cellId: number | null) => void;
  placeAt: (cellId: number) => void;
  advanceAge: () => void;
  restart: () => void;
}

export const useGame = create<GameStore>((set, get) => ({
  snap: takeSnapshot(),
  placing: null,
  hoveredCellId: null,
  selectedCellId: null,
  restartCount: 0,
  refresh: () => set({ snap: takeSnapshot() }),
  setSpendSplit: (split) => {
    sim.setSpendSplit(split);
    set({ snap: takeSnapshot() });
  },
  setPlacing: (placing) => set({ placing }),
  setHoveredCell: (hoveredCellId) => {
    if (get().hoveredCellId !== hoveredCellId) set({ hoveredCellId });
  },
  setSelectedCell: (selectedCellId) => set({ selectedCellId }),
  placeAt: (cellId) => {
    const { placing } = get();
    if (!placing) return;
    const res =
      placing.kind === 'building'
        ? sim.placeBuilding(placing.id, cellId)
        : sim.applyAction(placing.id, cellId);
    if (res.ok) {
      sfxPlace();
      // Keep placement mode active only if another copy is still affordable.
      const stillAffordable =
        placing.kind === 'building'
          ? sim.content.buildings.find((b) => b.id === placing.id)!.cost <= sim.state.treasury
          : sim.content.actions.find((a) => a.id === placing.id)!.cost <= sim.state.treasury;
      set({ snap: takeSnapshot(), placing: stillAffordable ? placing : null });
    } else {
      sfxInvalid();
    }
  },
  advanceAge: () => {
    if (sim.advanceAge().ok) {
      sfxAgeUp();
      set({ snap: takeSnapshot() });
    }
  },
  restart: () => {
    sim = createSimulation(undefined, { autoStewardship: true });
    try {
      localStorage.removeItem(SAVE_KEY);
      // A fresh world replays the tutorial (Tutorial remounts via restartCount).
      localStorage.removeItem('flourish.tutorial.done');
    } catch {
      /* ignore */
    }
    set((s) => ({
      snap: takeSnapshot(),
      placing: null,
      hoveredCellId: null,
      selectedCellId: null,
      restartCount: s.restartCount + 1,
    }));
  },
}));

/** Is placement currently valid on this cell? Cheap enough to call per hover. */
export function canPlaceAt(placing: Placing, cellId: number): boolean {
  return placing.kind === 'building'
    ? sim.canPlaceBuilding(placing.id, cellId).ok
    : sim.canApplyAction(placing.id, cellId).ok;
}

export interface CellInspection {
  id: number;
  biomeName: string;
  isDeadZone: boolean;
  quality: number; // 0..1 habitat quality
  building?: string; // display name
  actions: string[]; // applied stewardship action display names
  /** Species that live here now (suitable habitat + a standing population). */
  present: { id: string; name: string; emoji: string; population: number; suitability: number }[];
  /** Absent species whose habitat here already suits them — "build it and they come". */
  couldThrive: { id: string; name: string; emoji: string; suitability: number }[];
}

/**
 * Read a single cell's living state for the player-facing inspector. Reads the
 * sim directly (like canPlaceAt) so the per-cell detail never bloats every
 * snapshot. Cheap: a handful of suitability evaluations for one cell.
 */
export function inspectCell(cellId: number): CellInspection | null {
  const cell = sim.state.cells[cellId];
  if (!cell) return null;
  const biome = sim.content.biomes[cell.biome];
  const buildingDef = cell.buildingId
    ? sim.content.buildings.find((b) => b.id === cell.buildingId)
    : undefined;
  const actionNames = (sim.state.cellActions[cellId] ?? []).map(
    (id) => sim.content.actions.find((a) => a.id === id)?.name ?? id,
  );

  const present: CellInspection['present'] = [];
  const couldThrive: CellInspection['couldThrive'] = [];
  for (const sp of sim.content.species) {
    const suitability = sim.suitabilityFor(cellId, sp.id);
    if (suitability < sp.arrivalThreshold) continue;
    const st = sim.state.species.find((s) => s.speciesId === sp.id);
    const entry = { id: sp.id, name: sp.name, emoji: sp.uiEmoji, suitability };
    if (st && st.population > 0) {
      present.push({ ...entry, population: Math.round(st.population) });
    } else {
      couldThrive.push(entry);
    }
  }
  present.sort((a, b) => b.suitability - a.suitability);
  couldThrive.sort((a, b) => b.suitability - a.suitability);

  return {
    id: cellId,
    biomeName: biome?.name ?? cell.biome,
    isDeadZone: !!biome?.isDeadZone,
    quality: cell.habitatQuality,
    building: buildingDef?.name,
    actions: actionNames,
    present,
    couldThrive,
  };
}
