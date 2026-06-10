import type { AgeDef } from '../sim/types';

// First two ages per doc 09 section 4; later ages are placeholder
// extrapolations to be tuned in M4/M5.
export const AGES: AgeDef[] = [
  {
    id: 'stone', index: 0, name: 'Stone Age',
    blurb: 'A small band in a vast living world. Everything begins embedded.',
    requiredResearch: 0, requiredEcoHealth: 0, ecoHealthSustainTicks: 0,
    ceilings: { maxWellbeing: 40, maxBiodiversity: 80, economyCeiling: 50, worldCarryingCapacity: 100 },
  },
  {
    id: 'agricultural', index: 1, name: 'Agricultural Age',
    blurb: 'The land answers tending. Fields and hedgerows — providing without taking.',
    requiredResearch: 120, requiredEcoHealth: 0.6, ecoHealthSustainTicks: 180,
    ceilings: { maxWellbeing: 65, maxBiodiversity: 90, economyCeiling: 120, worldCarryingCapacity: 120 },
  },
  {
    id: 'bronze_iron', index: 2, name: 'Bronze & Iron Age',
    blurb: 'Cities, trade, and the first deliberate green commons.',
    requiredResearch: 300, requiredEcoHealth: 0.62, ecoHealthSustainTicks: 240,
    ceilings: { maxWellbeing: 75, maxBiodiversity: 95, economyCeiling: 250, worldCarryingCapacity: 140 },
  },
  {
    id: 'industrial', index: 3, name: 'Industrial Age',
    blurb: 'Scale arrives. Used well, it builds more than it takes.',
    requiredResearch: 600, requiredEcoHealth: 0.62, ecoHealthSustainTicks: 240,
    ceilings: { maxWellbeing: 85, maxBiodiversity: 95, economyCeiling: 500, worldCarryingCapacity: 160 },
  },
  {
    id: 'modern', index: 4, name: 'Modern Age',
    blurb: 'Renewables and restoration — for the first time, healing at scale.',
    requiredResearch: 1000, requiredEcoHealth: 0.65, ecoHealthSustainTicks: 300,
    ceilings: { maxWellbeing: 90, maxBiodiversity: 100, economyCeiling: 800, worldCarryingCapacity: 200 },
  },
  {
    id: 'synergy', index: 5, name: 'Synergy Age',
    blurb: 'Cities that are habitats. Humanity becomes a keystone species.',
    requiredResearch: 1600, requiredEcoHealth: 0.72, ecoHealthSustainTicks: 360,
    ceilings: { maxWellbeing: 95, maxBiodiversity: 110, economyCeiling: 1200, worldCarryingCapacity: 260 },
  },
  {
    id: 'stewardship', index: 6, name: 'Stewardship Age',
    blurb: 'The planet more alive than we found it — and rising.',
    requiredResearch: 2400, requiredEcoHealth: 0.78, ecoHealthSustainTicks: 420,
    ceilings: { maxWellbeing: 100, maxBiodiversity: 120, economyCeiling: 2000, worldCarryingCapacity: 340 },
  },
];
