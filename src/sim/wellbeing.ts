// Wellbeing = weighted base blend (needs, amenities, environment, crowding)
// plus direct building contributions, capped by the age ceiling (doc 03 §3).
// The environment term is the biophilia coupling: a greener world literally
// makes citizens happier — keep it (doc 03 calls it thematically central).

import type { SimCaches } from './caches';
import { CONFIG } from './config';
import { settlementQuality } from './habitat';
import { buildingComfort, comfortCapacity, housingCapacity } from './population';
import type { AgeDef, Content, SimState } from './types';
import { clamp, clamp01 } from './util';

export interface WellbeingResult {
  wellbeing: number;
  needs: number;
  amenity: number;
  envQuality: number;
  crowding: number;
  housingCapacity: number;
  comfortCapacity: number;
}

export function computeWellbeing(
  state: SimState,
  content: Content,
  age: AgeDef,
  caches: SimCaches,
): WellbeingResult {
  const { needsAdd, amenityAdd } = buildingComfort(state, content);

  // Environmental quality: habitat quality where citizens live.
  const envQuality = settlementQuality(state, CONFIG.envSampleRadius, caches);

  // Crowding now tracks PEOPLE, not building footprint: a population that
  // outgrows its amenities and surrounding greenspace feels crowded. This is
  // what makes a dense late-game city need nearby nature (doc 03 section 3).
  const comfort = comfortCapacity(amenityAdd, envQuality);
  const crowding = clamp01((state.citizens / Math.max(comfort, 1) - 1) * CONFIG.citizens.crowdScale);

  const w = CONFIG.wellbeingWeights;
  const base01 = clamp01(
    w.needs * CONFIG.wellbeingBase.needs +
      w.amenity * CONFIG.wellbeingBase.amenity +
      w.env * envQuality -
      w.crowd * crowding,
  );

  const wellbeing = clamp(
    base01 * CONFIG.wellbeingBaseScale + needsAdd + amenityAdd,
    0,
    age.ceilings.maxWellbeing,
  );
  return {
    wellbeing,
    needs: needsAdd,
    amenity: amenityAdd,
    envQuality,
    crowding,
    housingCapacity: housingCapacity(needsAdd),
    comfortCapacity: comfort,
  };
}
