// Zustand bridge between the sim (source of truth) and React/R3F consumers.
// The sim instance lives outside React; the store holds UI snapshots only.

import { create } from 'zustand';
import { createSimulation } from '../sim';
import type { SimEvent, SpendSplit, SubIndices } from '../sim';

export const sim = createSimulation(undefined, { autoStewardship: true });

// Pre-place a small starter settlement so the M2 dynamics (income, habitat
// pressure, stewardship response) are visible. M3 replaces this with the
// "Place a shelter to begin" onboarding moment.
{
  const cells = sim.cellsByDistanceFromStart();
  let camps = 0;
  for (const c of cells) {
    if (camps >= 2) break;
    if (sim.placeBuilding('forager_camp', c.id).ok) camps++;
  }
  for (const c of cells) {
    if (sim.placeBuilding('fire_hearth', c.id).ok) break;
  }
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
  markerCellId: number;
}

export interface UISnapshot {
  tick: number;
  age: string;
  ageName: string;
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
  species: UISpecies[];
  events: SimEvent[];
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

interface GameStore {
  snap: UISnapshot;
  refresh: () => void;
  setSpendSplit: (split: SpendSplit) => void;
}

export const useGame = create<GameStore>((set) => ({
  snap: takeSnapshot(),
  refresh: () => set({ snap: takeSnapshot() }),
  setSpendSplit: (split) => {
    sim.setSpendSplit(split);
    set({ snap: takeSnapshot() });
  },
}));
