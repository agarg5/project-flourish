import type { BiomeDef } from '../sim/types';

// Seed biomes per doc 09 section 1. `mountain` is not in the doc-09 table but
// the doc-11 starter map calls for a mountain center, so it gets a sparse,
// hardy profile here (spec gap filled; surfaced in the build notes).
export const BIOMES: Record<string, BiomeDef> = {
  forest: {
    type: 'forest', name: 'Forest',
    baseQuality: 0.75, baseProductivity: 0.5, baseBiodiversityCapacity: 0.8,
    supportsNiches: ['seed_disperser', 'decomposer', 'predator_balancer'],
  },
  grassland: {
    type: 'grassland', name: 'Grassland',
    baseQuality: 0.7, baseProductivity: 0.6, baseBiodiversityCapacity: 0.6,
    supportsNiches: ['grazer', 'pollinator', 'soil_engineer'],
  },
  wetland: {
    type: 'wetland', name: 'Wetland',
    baseQuality: 0.8, baseProductivity: 0.4, baseBiodiversityCapacity: 0.9,
    supportsNiches: ['filter_feeder', 'pollinator', 'decomposer'],
  },
  coast_shallow: {
    type: 'coast_shallow', name: 'Shallow Coast',
    baseQuality: 0.8, baseProductivity: 0.5, baseBiodiversityCapacity: 1.0,
    supportsNiches: ['filter_feeder', 'grazer'],
  },
  desert: {
    type: 'desert', name: 'Desert',
    baseQuality: 0.1, baseProductivity: 0.1, baseBiodiversityCapacity: 0.1,
    isDeadZone: true,
    supportsNiches: [],
  },
  mountain: {
    type: 'mountain', name: 'Mountain',
    baseQuality: 0.55, baseProductivity: 0.2, baseBiodiversityCapacity: 0.4,
    supportsNiches: ['predator_balancer'],
  },
};
