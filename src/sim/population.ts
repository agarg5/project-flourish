// Citizens: the settlement's people (doc 03 section 3 made literal). Population
// grows logistically toward the housing its `needs:` buildings provide, and is
// the basis for crowding (people vs. amenities + greenspace) and the intimate
// view's villagers. Pure and deterministic — no randomness.

import { CONFIG } from './config';
import type { BuildingDef, Content, SimState } from './types';

export interface Comfort {
  /** Sum of `needs:` wellbeing points across buildings (with duplicate falloff). */
  needsAdd: number;
  /** Sum of `amenity:` wellbeing points across buildings (with duplicate falloff). */
  amenityAdd: number;
}

/**
 * The needs/amenity comfort a settlement's buildings provide. Each additional
 * copy of the same building contributes less (finite demand, doc 03 section 3).
 * Shared by the wellbeing blend and the citizen growth target so they never
 * drift apart.
 */
export function buildingComfort(state: SimState, content: Content): Comfort {
  const byId = new Map<string, BuildingDef>(content.buildings.map((b) => [b.id, b]));
  let needsAdd = 0;
  let amenityAdd = 0;
  const copies = new Map<string, number>();
  for (const b of state.buildings) {
    const def = byId.get(b.id);
    const n = copies.get(b.id) ?? 0;
    copies.set(b.id, n + 1);
    const falloff = Math.pow(CONFIG.wellbeingDuplicateFalloff, n);
    for (const m of def?.effects.wellbeing ?? []) {
      if (m.note?.startsWith('needs')) needsAdd += m.value * falloff;
      else amenityAdd += m.value * falloff;
    }
  }
  return { needsAdd, amenityAdd };
}

/** Housing the settlement can support: a founding band plus needs buildings. */
export function housingCapacity(needsAdd: number): number {
  return CONFIG.citizens.base + CONFIG.citizens.perNeedPoint * needsAdd;
}

/**
 * Citizens a settlement comfortably hosts: amenities plus the greenspace around
 * it. People packed in beyond this feel crowded — the coupling that makes a
 * dense city *need* nearby nature (the biophilia tension, doc 03 section 3).
 */
export function comfortCapacity(amenityAdd: number, envQuality: number): number {
  return (
    CONFIG.citizens.base +
    CONFIG.citizens.perAmenityPoint * amenityAdd +
    CONFIG.citizens.greenComfort * envQuality
  );
}

/** Advance the citizen population one tick toward its housing capacity. */
export function stepCitizens(state: SimState, content: Content): void {
  const { needsAdd } = buildingComfort(state, content);
  const cap = housingCapacity(needsAdd);
  const c = state.citizens;
  // Logistic toward capacity: grows when housed, eases down if housing is lost.
  state.citizens = Math.max(CONFIG.citizens.base, c + CONFIG.citizens.growthRate * c * (1 - c / cap));
}
