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

  // --- Late-age stewardship spine (doc 12). Full Modern/Synergy/Stewardship
  // content lands in M5/Phase 3; these are the restoration capstones:
  // rail_links -> restoration_ecology -> rewilding -> terraforming. ---
  {
    id: 'restoration_ecology', ageId: 'modern', name: 'Restoration Ecology',
    description: 'The science of healing ecosystems — and of bringing back what was lost.',
    researchCost: 950, prerequisites: ['rail_links'],
    unlocks: { actions: ['reintroduce_lynx'] },
  },
  {
    id: 'rewilding', ageId: 'synergy', name: 'Rewilding',
    description: 'Let large wild systems run themselves again — keystones returned, the land set free.',
    researchCost: 1500, prerequisites: ['restoration_ecology'],
    unlocks: { actions: ['reintroduce_bison'] },
  },
  {
    id: 'terraforming', ageId: 'stewardship', name: 'Terraforming',
    description: 'Bring dead land back to life — greened deserts and new oases that hold more life than before.',
    researchCost: 2400, prerequisites: ['rewilding'],
    unlocks: { actions: ['green_desert', 'create_oasis'] },
  },
];
