// Data schemas per planning doc 05, amended by doc 08 (spatial model).
// These types are the contract between sim, data, and UI.

export type AgeId =
  | 'stone' | 'agricultural' | 'bronze_iron' | 'industrial'
  | 'modern' | 'synergy' | 'stewardship';

export type BiomeType =
  | 'forest' | 'grassland' | 'wetland' | 'coast_shallow'
  | 'desert' | 'mountain' | 'open_water';

export type NicheId =
  | 'pollinator' | 'seed_disperser' | 'soil_engineer'
  | 'predator_balancer' | 'grazer' | 'decomposer' | 'filter_feeder';

export interface AgeDef {
  id: AgeId;
  index: number;
  name: string;
  blurb: string;
  requiredResearch: number;
  requiredEcoHealth: number;
  ecoHealthSustainTicks: number;
  ceilings: {
    maxBiodiversity: number;
    maxWellbeing: number;
    economyCeiling: number;
    worldCarryingCapacity: number;
  };
}

export interface Modifier {
  target: 'economy' | 'wellbeing' | 'biodiversity' | 'ecoMultiplier' | 'habitatSuitability';
  op: 'add' | 'mul';
  value: number;
  note?: string;
}

export interface TechDef {
  id: string;
  ageId: AgeId;
  name: string;
  description: string;
  // researchCost is a cumulative threshold: the tech unlocks once total
  // accumulated research passes it (research is a progress meter, not spent).
  researchCost: number;
  prerequisites: string[];
  isBranch?: boolean;
  unlocks: {
    buildings?: string[];
    actions?: string[];
    speciesEnabled?: string[];
    modifiers?: Modifier[];
  };
}

export interface SpeciesDef {
  id: string;
  name: string;
  isKeystone: boolean;
  niches: NicheId[];
  preferredBiomes: BiomeType[];
  arrivalThreshold: number;
  baseCarryingCapacity: number;
  keystoneBoost?: number;
  supportsNiches?: NicheId[];
  cascadeThreshold?: number;
  reintroOnly?: boolean;
  ageAvailableFrom?: AgeId;
  // UI-only hints (no sim meaning):
  uiEmoji: string;
  uiColor: string;
}

export interface HabitatEffect {
  biome?: BiomeType;             // if set, only cells of this biome are affected
  suitabilityDelta: number;
  radius?: number;               // hex rings affected; 0/undefined = own cell only
  createsBiome?: BiomeType;      // biome conversion (late-game; not used by seed content)
  note?: string;
}

export interface BuildingDef {
  id: string;
  ageId: AgeId;
  name: string;
  description: string;
  cost: number;
  upkeep: number;                // per turn (CONFIG.ticksPerTurn ticks)
  footprintBiomes: BiomeType[];
  effects: {
    economicOutput?: number;     // per turn
    wellbeing?: Modifier[];      // note prefix 'needs:' or 'amenity:' classifies the add
    habitat?: HabitatEffect[];
    attractsSpecies?: string[];
  };
}

export interface ActionDef {
  id: string;
  ageId: AgeId;
  name: string;
  description: string;
  cost: number;
  kind: 'restore' | 'rewild' | 'reintroduce' | 'terraform' | 'protect';
  effects: {
    habitat?: HabitatEffect[];
    reintroduceSpecies?: string;
    raisesCarryingCapacity?: number;
    modifiers?: Modifier[];
  };
}

export interface BiomeDef {
  type: BiomeType;
  name: string;
  baseQuality: number;           // default habitatQuality for cells of this biome
  baseProductivity: number;
  baseBiodiversityCapacity: number;
  isDeadZone?: boolean;
  supportsNiches: NicheId[];
}

export interface WorldCell {
  id: number;
  q: number;
  r: number;
  biome: BiomeType;
  habitatQuality: number;        // 0..1, recomputed each tick
  buildingId?: string;
}

// A habitat influence anchored to a cell (from a building or stewardship action).
export interface PlacedEffect {
  originCellId: number;
  sourceId: string;              // building or action id (for legibility/UI)
  effects: HabitatEffect[];
}

export interface SpeciesState {
  speciesId: string;
  population: number;            // 0 = locally absent
  carryingCapacity: number;      // K, recomputed each tick
  pristineCapacity: number;      // K of the untouched world — the health reference
  arrivalProgress: number;       // consecutive suitable ticks while absent
  keystoneEffectiveness: number; // 0..1, eased toward target (cascade state)
  markerCellIds: number[];       // top cells by suitability (render anchors)
}

export interface SimEvent {
  tick: number;
  type: 'arrival' | 'departure' | 'ageUp' | 'tech' | 'build' | 'action' | 'stewardship';
  message: string;
}

export interface SpendSplit {
  buildings: number;
  rnd: number;
  stewardship: number;
}

export interface SubIndices {
  nicheCoverage: number;
  keystoneHealth: number;
  populationHealth: number;
  biomeDiversity: number;
  needs: number;
  amenity: number;
  envQuality: number;
  crowding: number;
  settlementQuality: number;     // avg habitat quality in the settlement impact zone
}

export interface SimState {
  tick: number;
  age: AgeId;
  treasury: number;
  researchPoints: number;
  spendSplit: SpendSplit;
  stewardshipBudget: number;     // earmarked income, spent by auto-stewardship

  cells: WorldCell[];
  buildings: { id: string; cellId: number }[];
  placedEffects: PlacedEffect[];
  cellActions: Record<number, string[]>; // actions already applied per cell
  species: SpeciesState[];
  unlockedTech: string[];

  // Derived indices (recomputed each tick):
  wellbeing: number;             // display points, capped by age ceiling
  biodiversity: number;          // display points, scaled by age ceiling
  ecologicalHealth: number;      // 0..1, smoothed
  ecoMultiplier: number;
  economicOutput: number;        // per turn
  flourishing: number;           // wellbeing * biodiversity / 100
  worldCarryingCapacity: number;
  ecoHealthSustainedTicks: number;
  sub: SubIndices;

  events: SimEvent[];
}

export interface Content {
  ages: AgeDef[];
  techs: TechDef[];
  species: SpeciesDef[];
  buildings: BuildingDef[];
  actions: ActionDef[];
  biomes: Record<string, BiomeDef>;
}
