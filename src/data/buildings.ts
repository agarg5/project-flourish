import type { BuildingDef } from '../sim/types';

// Seed buildings per doc 09 section 3. Wellbeing modifier notes are prefixed
// 'needs:' or 'amenity:' — the wellbeing model classifies adds by that prefix.
export const BUILDINGS: BuildingDef[] = [
  {
    id: 'forager_camp', ageId: 'stone', name: 'Forager Camp',
    description: 'A small camp gathering food from the surrounding land.',
    cost: 20, upkeep: 1,
    footprintBiomes: ['forest', 'grassland', 'wetland'],
    effects: {
      economicOutput: 4,
      wellbeing: [{ target: 'wellbeing', op: 'add', value: 6, note: 'needs: food' }],
      // Doc 09 started this at -0.05; tuned harder so the stewardship offset
      // is a real decision (doc 09 section 3: "that offset IS the central
      // synergy decision") and a camp-rush genuinely risks the eco gate.
      habitat: [{ suitabilityDelta: -0.4, radius: 1 }],
    },
  },
  {
    id: 'fire_hearth', ageId: 'stone', name: 'Fire Hearth',
    description: 'A shared hearth — warmth, cooking, stories.',
    cost: 15, upkeep: 0,
    footprintBiomes: ['forest', 'grassland'],
    effects: {
      wellbeing: [{ target: 'wellbeing', op: 'add', value: 5, note: 'amenity: warmth/gathering' }],
      habitat: [{ suitabilityDelta: 0, radius: 0 }],
    },
  },
  {
    id: 'polyculture_plot', ageId: 'agricultural', name: 'Polyculture Plot',
    description: 'Mixed crops with hedgerows — food for people, habitat for pollinators.',
    cost: 35, upkeep: 2,
    footprintBiomes: ['grassland'],
    effects: {
      economicOutput: 9,
      wellbeing: [{ target: 'wellbeing', op: 'add', value: 8, note: 'needs: surplus food' }],
      habitat: [{ suitabilityDelta: 0.04, radius: 2, note: 'hedgerows aid pollinators' }],
      attractsSpecies: ['wild_bee'],
    },
  },
  {
    id: 'granary', ageId: 'agricultural', name: 'Granary',
    description: 'Stores the surplus; steadies the food supply between seasons.',
    cost: 30, upkeep: 1,
    footprintBiomes: ['grassland', 'forest'],
    effects: {
      economicOutput: 3,
      wellbeing: [{ target: 'wellbeing', op: 'add', value: 6, note: 'needs: food stability' }],
    },
  },
  {
    id: 'irrigation_channel', ageId: 'agricultural', name: 'Irrigation Channel',
    description: 'Channels water to fields; its damp edges invite wetland life.',
    cost: 25, upkeep: 1,
    footprintBiomes: ['grassland', 'wetland'],
    effects: {
      habitat: [{ suitabilityDelta: 0.06, radius: 2, note: 'damp edges, wetland-friendly' }],
      attractsSpecies: ['heron'],
    },
  },

  // --- Bronze & Iron Age ---
  {
    id: 'smithy', ageId: 'bronze_iron', name: 'Smithy',
    description: 'Bronze and iron worked into tools that make every trade better.',
    cost: 50, upkeep: 3,
    footprintBiomes: ['grassland', 'forest'],
    effects: {
      economicOutput: 14,
      wellbeing: [{ target: 'wellbeing', op: 'add', value: 7, note: 'needs: tools & goods' }],
      habitat: [{ suitabilityDelta: -0.18, radius: 1 }],
    },
  },
  {
    id: 'trade_post', ageId: 'bronze_iron', name: 'Trade Post',
    description: 'A market square humming with exchange between settlements.',
    cost: 60, upkeep: 3,
    footprintBiomes: ['grassland'],
    effects: {
      economicOutput: 18,
      wellbeing: [{ target: 'wellbeing', op: 'add', value: 6, note: 'amenity: market life' }],
      habitat: [{ suitabilityDelta: -0.12, radius: 1 }],
    },
  },
  {
    id: 'well', ageId: 'bronze_iron', name: 'Well',
    description: 'Clean water close to home — health for the whole settlement.',
    cost: 30, upkeep: 1,
    footprintBiomes: ['grassland', 'forest'],
    effects: {
      economicOutput: 2,
      wellbeing: [{ target: 'wellbeing', op: 'add', value: 8, note: 'needs: clean water' }],
    },
  },

  // --- Industrial Age ---
  {
    id: 'sawmill', ageId: 'industrial', name: 'Sawmill',
    description: 'Water-powered saws; managed coppices keep the forest standing.',
    cost: 90, upkeep: 5,
    footprintBiomes: ['forest'],
    effects: {
      economicOutput: 26,
      wellbeing: [{ target: 'wellbeing', op: 'add', value: 6, note: 'needs: lumber & warmth' }],
      habitat: [{ suitabilityDelta: -0.2, radius: 1 }],
    },
  },
  {
    id: 'ore_mine', ageId: 'industrial', name: 'Ore Mine',
    description: 'Metals from the mountain — the engine of the industrial leap.',
    cost: 110, upkeep: 6,
    footprintBiomes: ['mountain', 'grassland'],
    effects: {
      economicOutput: 34,
      wellbeing: [{ target: 'wellbeing', op: 'add', value: 8, note: 'needs: goods & wages' }],
      habitat: [{ suitabilityDelta: -0.3, radius: 1 }],
    },
  },

  // --- Modern Age: the turn toward healing. Power and housing that give back
  // to the land rather than taking from it (doc 02 section 5; doc 12 Phase 3). ---
  {
    id: 'solar_array', ageId: 'modern', name: 'Solar Array',
    description: 'Pollinator-friendly solar meadows — clean power and wildflowers in the same field.',
    cost: 130, upkeep: 3,
    footprintBiomes: ['grassland'],
    effects: {
      economicOutput: 22,
      wellbeing: [{ target: 'wellbeing', op: 'add', value: 6, note: 'needs: clean power' }],
      habitat: [{ suitabilityDelta: 0.02, radius: 1, note: 'solar meadow aids pollinators' }],
      attractsSpecies: ['wild_bee'],
    },
  },
  {
    id: 'green_tower', ageId: 'modern', name: 'Green Tower',
    description: 'Green-roofed mixed-use housing — homes wrapped in living walls.',
    cost: 150, upkeep: 4,
    footprintBiomes: ['grassland', 'forest'],
    effects: {
      economicOutput: 16,
      wellbeing: [
        { target: 'wellbeing', op: 'add', value: 9, note: 'amenity: light, green, walkable' },
        { target: 'wellbeing', op: 'add', value: 4, note: 'needs: dense housing' },
      ],
      habitat: [{ suitabilityDelta: 0.05, radius: 1, note: 'living roofs and walls' }],
    },
  },

  // --- Synergy Age: cities that are habitats. Humanity becomes keystone-capable. ---
  {
    id: 'living_building', ageId: 'synergy', name: 'Living Building',
    description: 'Grown from mycelium and timber — the structure itself is habitat.',
    cost: 180, upkeep: 2,
    footprintBiomes: ['grassland', 'forest', 'wetland'],
    effects: {
      economicOutput: 22,
      wellbeing: [
        { target: 'wellbeing', op: 'add', value: 11, note: 'amenity: biophilic living' },
        { target: 'wellbeing', op: 'add', value: 5, note: 'needs: self-sustaining homes' },
      ],
      habitat: [{ suitabilityDelta: 0.08, radius: 1, note: 'the building is habitat' }],
    },
  },
  {
    id: 'vertical_farm', ageId: 'synergy', name: 'Vertical Farm',
    description: 'Stacked, soil-light food production — feeds the city and frees the land around it.',
    cost: 200, upkeep: 4,
    footprintBiomes: ['grassland'],
    effects: {
      economicOutput: 30,
      wellbeing: [{ target: 'wellbeing', op: 'add', value: 9, note: 'needs: abundant food' }],
      habitat: [{ suitabilityDelta: 0.03, radius: 2, note: 'releases farmland back to nature' }],
    },
  },

  // --- Stewardship Age: abundance with a lighter footprint than ever. ---
  {
    id: 'fusion_plant', ageId: 'stewardship', name: 'Fusion Plant',
    description: 'Clean, abundant energy — the foundation of a post-scarcity, low-impact economy.',
    cost: 300, upkeep: 6,
    footprintBiomes: ['grassland', 'mountain'],
    effects: {
      economicOutput: 50,
      wellbeing: [{ target: 'wellbeing', op: 'add', value: 12, note: 'needs: limitless clean energy' }],
      habitat: [{ suitabilityDelta: 0, radius: 0 }],
    },
  },
  {
    id: 'arcology', ageId: 'stewardship', name: 'Arcology',
    description: 'A whole city in a living structure — dense, green, and surrounded by wilderness.',
    cost: 350, upkeep: 5,
    footprintBiomes: ['grassland'],
    effects: {
      economicOutput: 45,
      wellbeing: [
        { target: 'wellbeing', op: 'add', value: 15, note: 'amenity: the 15-minute city' },
        { target: 'wellbeing', op: 'add', value: 9, note: 'needs: everything within reach' },
      ],
      habitat: [{ suitabilityDelta: 0.06, radius: 2, note: 'concentrates people, frees the land' }],
    },
  },
];
