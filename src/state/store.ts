// Zustand bridge between the sim (source of truth) and React/R3F consumers.
// The sim instance lives outside React; the store holds UI snapshots plus
// transient UI state (placement mode, hover).

import { create } from 'zustand';
import { createSimulation } from '../sim';
import type { SimEvent, SpendSplit, SubIndices } from '../sim';

export const sim = createSimulation(undefined, { autoStewardship: true });

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
  markerCellId: number;
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
  wellbeing: number;
  biodiversity: number;
  flourishing: number;
  ecoHealth: number;
  ecoMult: number;
  economicOutput: number;
  sub: SubIndices;
  spendSplit: SpendSplit;
  cells: UICell[];
  buildings: { id: string; cellId: number; builtAtTick: number }[];
  species: UISpecies[];
  events: SimEvent[];
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
    wellbeing: s.wellbeing,
    biodiversity: s.biodiversity,
    flourishing: s.flourishing,
    ecoHealth: s.ecologicalHealth,
    ecoMult: s.ecoMultiplier,
    economicOutput: s.economicOutput,
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
          markerCellId: sp.markerCellIds[0] ?? 0,
        };
      }),
    events: [...s.events],
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
  refresh: () => void;
  setSpendSplit: (split: SpendSplit) => void;
  setPlacing: (p: Placing | null) => void;
  setHoveredCell: (cellId: number | null) => void;
  placeAt: (cellId: number) => void;
  advanceAge: () => void;
}

export const useGame = create<GameStore>((set, get) => ({
  snap: takeSnapshot(),
  placing: null,
  hoveredCellId: null,
  refresh: () => set({ snap: takeSnapshot() }),
  setSpendSplit: (split) => {
    sim.setSpendSplit(split);
    set({ snap: takeSnapshot() });
  },
  setPlacing: (placing) => set({ placing }),
  setHoveredCell: (hoveredCellId) => {
    if (get().hoveredCellId !== hoveredCellId) set({ hoveredCellId });
  },
  placeAt: (cellId) => {
    const { placing } = get();
    if (!placing) return;
    const res =
      placing.kind === 'building'
        ? sim.placeBuilding(placing.id, cellId)
        : sim.applyAction(placing.id, cellId);
    if (res.ok) {
      // Keep placement mode active only if another copy is still affordable.
      const stillAffordable =
        placing.kind === 'building'
          ? sim.content.buildings.find((b) => b.id === placing.id)!.cost <= sim.state.treasury
          : sim.content.actions.find((a) => a.id === placing.id)!.cost <= sim.state.treasury;
      set({ snap: takeSnapshot(), placing: stillAffordable ? placing : null });
    }
  },
  advanceAge: () => {
    if (sim.advanceAge().ok) set({ snap: takeSnapshot() });
  },
}));

/** Is placement currently valid on this cell? Cheap enough to call per hover. */
export function canPlaceAt(placing: Placing, cellId: number): boolean {
  return placing.kind === 'building'
    ? sim.canPlaceBuilding(placing.id, cellId).ok
    : sim.canApplyAction(placing.id, cellId).ok;
}
