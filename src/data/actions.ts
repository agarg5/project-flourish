import type { ActionDef } from '../sim/types';

// Seed stewardship actions per doc 09 section 5, plus late-age terraforming
// (M5 / doc 12): converting dead zones to living biomes raises the world's
// carrying capacity toward the Hestia ceiling.
export const ACTIONS: ActionDef[] = [
  {
    id: 'plant_hedgerow', ageId: 'stone', name: 'Plant Hedgerow',
    description: 'A living fence of shrubs and flowers — shelter and forage for small wildlife.',
    cost: 12, kind: 'restore',
    effects: { habitat: [{ suitabilityDelta: 0.05, radius: 2 }] },
  },
  {
    id: 'protect_wetland', ageId: 'agricultural', name: 'Protect Wetland',
    description: 'Firm the marsh edge and let the water sit — beaver country.',
    cost: 18, kind: 'protect',
    effects: { habitat: [{ suitabilityDelta: 0.1, radius: 2, note: 'firms marsh, invites beaver' }] },
  },
  {
    id: 'restore_stream', ageId: 'bronze_iron', name: 'Restore Stream',
    description: 'Re-meander a straightened stream; life follows the water back.',
    cost: 25, kind: 'restore',
    effects: { habitat: [{ suitabilityDelta: 0.12, radius: 2 }] },
  },
  {
    id: 'plant_grove', ageId: 'bronze_iron', name: 'Plant Grove',
    description: 'A green commons of native trees in the heart of the town.',
    cost: 30, kind: 'restore',
    effects: { habitat: [{ suitabilityDelta: 0.08, radius: 3 }] },
  },
  {
    id: 'reforest', ageId: 'industrial', name: 'Reforest',
    description: 'Whole hillsides replanted — restoration at industrial scale.',
    cost: 45, kind: 'rewild',
    effects: { habitat: [{ suitabilityDelta: 0.15, radius: 2 }] },
  },

  // --- Terraforming (Stewardship Age): the dead-zone reversal. Only ever
  // converts dead-zone cells, so living land is never overwritten. ---
  {
    id: 'green_desert', ageId: 'stewardship', name: 'Green the Desert',
    description: 'Hold water in the soil and seed hardy grasses — barren sand becomes living grassland.',
    cost: 55, kind: 'terraform',
    effects: {
      habitat: [{ createsBiome: 'grassland', suitabilityDelta: 0.1, radius: 1 }],
      raisesCarryingCapacity: 8,
    },
  },
  {
    id: 'create_oasis', ageId: 'stewardship', name: 'Create Oasis',
    description: 'Draw groundwater to the surface — a wetland refuge blooms in the dead heart of the desert.',
    cost: 45, kind: 'terraform',
    effects: {
      habitat: [{ createsBiome: 'wetland', suitabilityDelta: 0.15, radius: 0 }],
      raisesCarryingCapacity: 6,
    },
  },

  // --- Reintroduction (doc 12 Phase 2): a rare, earned act. Only succeeds once
  // the species' habitat is ready to receive it (enforced in canApplyAction). ---
  {
    id: 'reintroduce_lynx', ageId: 'modern', name: 'Reintroduce Lynx',
    description: 'Return the lynx to restored forest and uplands — a predator the land has been missing.',
    cost: 40, kind: 'reintroduce',
    effects: { reintroduceSpecies: 'lynx' },
  },
  {
    id: 'reintroduce_bison', ageId: 'synergy', name: 'Reintroduce Bison',
    description: 'Bring the wisent home — a keystone grazer that shapes meadows for everything else.',
    cost: 60, kind: 'reintroduce',
    effects: { reintroduceSpecies: 'bison' },
  },

  // --- Large-scale rewilding (doc 12 Phase 3): habitat restoration at the
  // landscape scale that the late ages unlock. ---
  {
    id: 'wildlife_corridor', ageId: 'modern', name: 'Wildlife Corridor',
    description: 'Stitch fragmented habitats together so wildlife can move, feed, and breed across the land.',
    cost: 35, kind: 'rewild',
    effects: { habitat: [{ suitabilityDelta: 0.1, radius: 3, note: 'connects fragmented habitat' }] },
  },
  {
    id: 'rewild_landscape', ageId: 'synergy', name: 'Rewild Landscape',
    description: 'Step back and let a whole landscape return to wildness — restoration at its largest scale.',
    cost: 50, kind: 'rewild',
    effects: { habitat: [{ suitabilityDelta: 0.18, radius: 3 }] },
  },
];
