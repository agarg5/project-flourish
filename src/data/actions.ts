import type { ActionDef } from '../sim/types';

// Seed stewardship actions per doc 09 section 5. Reintroduce/terraform are
// deliberately out of seed scope (M5).
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
];
