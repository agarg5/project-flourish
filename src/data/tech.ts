import type { TechDef } from '../sim/types';

// Minimal two-age spine per doc 09 section 4. researchCost is a cumulative
// threshold against total accumulated research (see types.ts). `fire` and
// `tools` start unlocked so the first buildings are available from turn one.
export const TECHS: TechDef[] = [
  {
    id: 'fire', ageId: 'stone', name: 'Fire',
    description: 'Warmth, cooked food, and a circle to gather around.',
    researchCost: 10, prerequisites: [],
    unlocks: { buildings: ['fire_hearth'] },
  },
  {
    id: 'tools', ageId: 'stone', name: 'Tools',
    description: 'Worked stone and bone — gathering becomes providing.',
    researchCost: 25, prerequisites: ['fire'],
    unlocks: { buildings: ['forager_camp'], actions: ['plant_hedgerow'] },
  },
  {
    id: 'shelter', ageId: 'stone', name: 'Shelter',
    description: 'The ability to settle — a place that is somewhere.',
    researchCost: 40, prerequisites: ['tools'],
    unlocks: {},
  },
  {
    id: 'cultivation', ageId: 'agricultural', name: 'Cultivation',
    description: 'Seeds kept and sown; the land answers tending.',
    researchCost: 60, prerequisites: ['shelter'],
    unlocks: { buildings: ['granary'] },
  },
  {
    id: 'polyculture', ageId: 'agricultural', name: 'Polyculture',
    description: 'Many crops together — resilient fields that feed wild things too.',
    researchCost: 90, prerequisites: ['cultivation'],
    unlocks: { buildings: ['polyculture_plot'] },
  },
  {
    id: 'irrigation', ageId: 'agricultural', name: 'Irrigation',
    description: 'Water led gently to where it is needed.',
    researchCost: 75, prerequisites: ['cultivation'],
    unlocks: { buildings: ['irrigation_channel'], actions: ['protect_wetland'] },
  },
];
