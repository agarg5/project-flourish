import type { SpeciesDef } from '../sim/types';

// Seed species per doc 09 section 2.
export const SPECIES: SpeciesDef[] = [
  {
    id: 'deer', name: 'Red Deer', isKeystone: false,
    niches: ['grazer', 'seed_disperser'],
    preferredBiomes: ['forest', 'grassland'],
    arrivalThreshold: 0.35, baseCarryingCapacity: 200 / 40,
    uiEmoji: '🦌', uiColor: '#b07a4a',
  },
  {
    id: 'wild_bee', name: 'Wild Bee', isKeystone: false,
    niches: ['pollinator'],
    preferredBiomes: ['grassland', 'forest'],
    arrivalThreshold: 0.3, baseCarryingCapacity: 500 / 40,
    uiEmoji: '🐝', uiColor: '#e3b41a',
  },
  {
    id: 'boar', name: 'Wild Boar', isKeystone: false,
    niches: ['soil_engineer', 'seed_disperser'],
    preferredBiomes: ['forest', 'grassland', 'wetland'],
    arrivalThreshold: 0.4, baseCarryingCapacity: 150 / 40,
    uiEmoji: '🐗', uiColor: '#6b4f3a',
  },
  {
    id: 'heron', name: 'Grey Heron', isKeystone: false,
    niches: ['filter_feeder'],
    preferredBiomes: ['wetland', 'coast_shallow'],
    arrivalThreshold: 0.4, baseCarryingCapacity: 80 / 20,
    uiEmoji: '🪿', uiColor: '#8aa3b8',
  },
  {
    id: 'beaver', name: 'Eurasian Beaver', isKeystone: true,
    niches: ['soil_engineer'],
    preferredBiomes: ['wetland'],
    arrivalThreshold: 0.45, baseCarryingCapacity: 60 / 20,
    keystoneBoost: 0.4,
    supportsNiches: ['filter_feeder', 'decomposer'],
    cascadeThreshold: 0.4,
    uiEmoji: '🦫', uiColor: '#7a5230',
  },
  {
    id: 'wolf', name: 'Grey Wolf', isKeystone: false,
    niches: ['predator_balancer'],
    preferredBiomes: ['forest', 'grassland'],
    arrivalThreshold: 0.55, baseCarryingCapacity: 40 / 70,
    uiEmoji: '🐺', uiColor: '#9aa0a8',
  },
];
