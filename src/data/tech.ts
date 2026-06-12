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

  // --- Bronze & Iron Age (age gate at 300 research) ---
  {
    id: 'bronze_working', ageId: 'bronze_iron', name: 'Bronze Working',
    description: 'Metal shaped to purpose — better tools, better craft.',
    researchCost: 150, prerequisites: ['polyculture'],
    unlocks: { buildings: ['smithy'] },
  },
  {
    id: 'trade_networks', ageId: 'bronze_iron', name: 'Trade Networks',
    description: 'Paths between settlements; surplus becomes prosperity.',
    researchCost: 200, prerequisites: ['bronze_working'],
    unlocks: { buildings: ['trade_post'] },
  },
  {
    id: 'water_management', ageId: 'bronze_iron', name: 'Water Management',
    description: 'Wells and tended streams — clean water for people and wetlands alike.',
    researchCost: 250, prerequisites: ['bronze_working'],
    unlocks: { buildings: ['well'], actions: ['restore_stream'] },
  },
  {
    id: 'urban_greens', ageId: 'bronze_iron', name: 'Urban Greens', isBranch: true,
    description: 'Green commons woven through the town — the first city that breathes.',
    researchCost: 280, prerequisites: ['trade_networks'],
    unlocks: { actions: ['plant_grove'] },
  },

  // --- Industrial Age (age gate at 600 research) ---
  {
    id: 'efficient_power', ageId: 'industrial', name: 'Efficient Power',
    description: 'Water wheels and clever gearing — more output from the same effort.',
    researchCost: 380, prerequisites: ['water_management'],
    unlocks: {
      buildings: ['sawmill'],
      modifiers: [{ target: 'economy', op: 'mul', value: 1.08, note: 'efficient power' }],
    },
  },
  {
    id: 'mass_production', ageId: 'industrial', name: 'Mass Production',
    description: 'Scale arrives. Used carefully, it builds more than it takes.',
    researchCost: 480, prerequisites: ['efficient_power'],
    unlocks: { buildings: ['ore_mine'] },
  },
  {
    id: 'rail_links', ageId: 'industrial', name: 'Rail Links',
    description: 'Goods glide between regions; trade reaches everyone.',
    researchCost: 560, prerequisites: ['mass_production'],
    unlocks: {
      actions: ['reforest'],
      modifiers: [{ target: 'economy', op: 'mul', value: 1.1, note: 'rail trade reach' }],
    },
  },

  // --- Modern Age (age gate at 1000 research): healing becomes possible. ---
  {
    id: 'renewables', ageId: 'modern', name: 'Renewables',
    description: 'Sun and wind — power without a smokestack, and meadows beneath the panels.',
    researchCost: 1050, prerequisites: ['rail_links'],
    unlocks: {
      buildings: ['solar_array'],
      modifiers: [{ target: 'economy', op: 'mul', value: 1.08, note: 'cheap clean power' }],
    },
  },
  {
    id: 'green_building', ageId: 'modern', name: 'Green Building',
    description: 'Living roofs, walls, and corridors woven into how we build.',
    researchCost: 1200, prerequisites: ['renewables'],
    unlocks: { buildings: ['green_tower'] },
  },
  {
    id: 'restoration_ecology', ageId: 'modern', name: 'Restoration Ecology', isBranch: true,
    description: 'The science of healing ecosystems — and of bringing back what was lost.',
    researchCost: 1100, prerequisites: ['renewables'],
    unlocks: { actions: ['reintroduce_lynx', 'wildlife_corridor'] },
  },

  // --- Synergy Age (age gate at 1600 research): humanity becomes keystone-capable. ---
  {
    id: 'living_architecture', ageId: 'synergy', name: 'Living Architecture',
    description: 'Buildings grown, not just built — structures that are themselves habitat.',
    researchCost: 1700, prerequisites: ['green_building'],
    unlocks: { buildings: ['living_building'] },
  },
  {
    id: 'circular_economy', ageId: 'synergy', name: 'Circular Economy',
    description: 'Nothing wasted — vertical farms and closed loops feed the city and free the land.',
    researchCost: 1900, prerequisites: ['living_architecture'],
    unlocks: {
      buildings: ['vertical_farm'],
      modifiers: [{ target: 'economy', op: 'mul', value: 1.1, note: 'closed-loop efficiency' }],
    },
  },
  {
    id: 'rewilding', ageId: 'synergy', name: 'Rewilding', isBranch: true,
    description: 'Let large wild systems run themselves again — keystones returned, the land set free.',
    researchCost: 1800, prerequisites: ['restoration_ecology'],
    unlocks: { actions: ['reintroduce_bison', 'rewild_landscape'] },
  },

  // --- Stewardship Age (age gate at 2400 research): the planet more alive than we found it. ---
  {
    id: 'fusion_power', ageId: 'stewardship', name: 'Fusion Power',
    description: 'Clean, abundant energy — the foundation of a post-scarcity, low-impact world.',
    researchCost: 2500, prerequisites: ['circular_economy'],
    unlocks: {
      buildings: ['fusion_plant'],
      modifiers: [{ target: 'economy', op: 'mul', value: 1.15, note: 'limitless clean energy' }],
    },
  },
  {
    id: 'arcology_design', ageId: 'stewardship', name: 'Arcology Design',
    description: 'Whole cities in living structures — dense and green, wilderness all around.',
    researchCost: 2750, prerequisites: ['fusion_power'],
    unlocks: { buildings: ['arcology'] },
  },
  {
    id: 'terraforming', ageId: 'stewardship', name: 'Terraforming', isBranch: true,
    description: 'Bring dead land back to life — greened deserts, new oases, and shallow seas raised from the deep.',
    researchCost: 2500, prerequisites: ['rewilding'],
    unlocks: { actions: ['green_desert', 'create_oasis', 'seed_shallows'] },
  },
];
