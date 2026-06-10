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
];
