# 05 — Data Schemas

Concrete TypeScript shapes for the game's content and config. These are a
**contract** between the simulation, the data, and the UI. Implement them early
(M0/M1) so everything else has a stable target. Adjust as needed, but keep them
centralized and typed.

> All static content (ages, tech, species, buildings, biomes) lives in `src/data/`
> as typed arrays/maps. All tunable numbers live in `src/sim/config.ts`.

---

## Core Enums / Unions

```ts
export type AgeId =
  | 'stone' | 'agricultural' | 'bronze_iron' | 'industrial'
  | 'modern' | 'synergy' | 'stewardship';

export type BiomeType =
  | 'forest' | 'grassland' | 'wetland' | 'coast_shallow'
  | 'desert' | 'mountain' | 'open_water';

export type NicheId =
  | 'pollinator' | 'seed_disperser' | 'soil_engineer'
  | 'predator_balancer' | 'grazer' | 'decomposer' | 'filter_feeder';
```

---

## Ages

```ts
export interface AgeDef {
  id: AgeId;
  index: number;                 // 0..6, ordering
  name: string;
  blurb: string;                 // hopeful flavor text shown on age-up
  requiredResearch: number;      // R&D half of the dual gate
  requiredEcoHealth: number;     // 0..1 ecological-health half of the dual gate
  ecoHealthSustainTicks: number; // must be sustained this long (not a spike)
  // Ceilings unlocked by entering this age:
  ceilings: {
    maxBiodiversity: number;
    maxWellbeing: number;
    economyCeiling: number;
    worldCarryingCapacity: number; // pushes toward Hestia in late ages
  };
}
```

---

## Technologies (mostly-linear spine + sustainable branches)

```ts
export interface TechDef {
  id: string;
  ageId: AgeId;
  name: string;
  description: string;
  researchCost: number;
  prerequisites: string[];       // tech ids; the "spine" is a prereq chain
  isBranch?: boolean;            // optional sustainable-flavor branch (never "dirty")
  unlocks: {
    buildings?: string[];        // building ids
    actions?: string[];          // stewardship/action ids
    speciesEnabled?: string[];   // species that can now appear/be reintroduced
    modifiers?: Modifier[];      // passive effects (e.g. +eco-multiplier)
  };
}

export interface Modifier {
  target: 'economy' | 'wellbeing' | 'biodiversity' | 'ecoMultiplier'
        | 'habitatSuitability';
  op: 'add' | 'mul';
  value: number;
  note?: string;
}
```

---

## Species

```ts
export interface SpeciesDef {
  id: string;
  name: string;
  isKeystone: boolean;
  niches: NicheId[];             // jobs this species performs
  preferredBiomes: BiomeType[];
  // Habitat suitability needed before this species ARRIVES on its own:
  arrivalThreshold: number;      // 0..1
  baseCarryingCapacity: number;  // per suitable biome unit at full suitability
  // Keystone effect: how much it lifts biome capacity / supports others:
  keystoneBoost?: number;        // applied when present & healthy
  supportsNiches?: NicheId[];    // niches it helps unlock for others
  // For cascade modeling:
  cascadeThreshold?: number;     // below this pop fraction → downstream penalties
  reintroOnly?: boolean;         // can't recolonize naturally; needs reintroduction
  ageAvailableFrom?: AgeId;      // earliest age it can appear (optional)
}
```

---

## Buildings & Actions

```ts
export interface BuildingDef {
  id: string;
  ageId: AgeId;                  // earliest age available
  name: string;
  description: string;
  cost: number;
  upkeep: number;
  footprintBiomes: BiomeType[];  // where it can be placed
  effects: {
    economicOutput?: number;
    wellbeing?: Modifier[];      // e.g. amenities, environmental quality
    habitat?: HabitatEffect[];   // how it changes local habitat suitability
    attractsSpecies?: string[];  // species it tends to support
  };
}

export interface HabitatEffect {
  biome?: BiomeType;             // which biome the effect applies to/creates
  suitabilityDelta: number;      // + improves habitat, - degrades (rare, no dirty path)
  radius?: number;              // cells affected
  createsBiome?: BiomeType;      // e.g. restoration converting desert -> grassland
}

export interface ActionDef {     // stewardship/restoration verbs
  id: string;
  ageId: AgeId;
  name: string;
  description: string;
  cost: number;
  kind: 'restore' | 'rewild' | 'reintroduce' | 'terraform' | 'protect';
  effects: {
    habitat?: HabitatEffect[];
    reintroduceSpecies?: string; // for kind === 'reintroduce'
    raisesCarryingCapacity?: number; // terraform/dead-zone conversion (Hestia path)
    modifiers?: Modifier[];
  };
}
```

---

## Biomes & World

```ts
export interface BiomeDef {
  type: BiomeType;
  name: string;
  baseProductivity: number;      // contributes to economy potential
  baseBiodiversityCapacity: number;
  isDeadZone?: boolean;          // desert/barren/deep water; targets for terraform
  supportsNiches: NicheId[];
}

export interface WorldCell {
  id: number;
  biome: BiomeType;
  habitatSuitability: number;    // 0..1, dynamic
  buildingId?: string;
}

export interface SpeciesPresence {
  speciesId: string;
  population: number;
  cellIds: number[];             // where its representative markers render
}
```

---

## Live Game State (Zustand store shape)

```ts
export interface GameState {
  age: AgeId;
  tick: number;
  treasury: number;
  researchPoints: number;

  // Derived indices (recomputed each tick):
  wellbeing: number;             // 0..maxWellbeing
  biodiversity: number;          // 0..maxBiodiversity
  ecologicalHealth: number;      // 0..1
  economicOutput: number;
  flourishing: number;           // wellbeing * biodiversity (display value)
  worldCarryingCapacity: number; // potential ceiling; grows toward Hestia

  // World:
  cells: WorldCell[];
  species: SpeciesPresence[];
  builtBuildings: { id: string; cellId: number }[];
  unlockedTech: string[];

  // Player allocation of income:
  spendSplit: { buildings: number; rnd: number; stewardship: number };

  // Age-up tracking:
  ecoHealthSustainedTicks: number;
}
```

---

## Central Config (all tunables in one place)

```ts
// src/sim/config.ts
export const CONFIG = {
  tickRate: 6,                   // sim ticks per second
  biodiversityWeights: { niche: 0.35, keystone: 0.30, pop: 0.20, biome: 0.15 },
  wellbeingWeights: { needs: 0.4, amenity: 0.25, env: 0.25, crowd: 0.10 },
  ecoMultiplier: { min: 0.5, max: 1.6, curve: 'smoothstep' },
  populationGrowthRate: 0.05,    // logistic growth per tick (gentle)
  arrivalGraceTicks: 8,
  cascade: { penalty: 0.5, recoveryRate: 0.04, gentle: true },
  // ...all other coefficients here. NOTHING hardcoded in sim logic.
} as const;
```

---

## Schema Principles

- **Data-driven:** adding an age, tech, species, building, or action should mean
  adding a data entry — not editing simulation logic.
- **Typed everywhere:** the sim consumes these types directly.
- **No magic numbers in logic:** every coefficient resolves to `CONFIG`.
- **No "dirty" content:** habitat-degrading effects are rare/edge; the content
  set is built around coexistence (Pillar 1).
