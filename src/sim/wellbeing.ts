// Wellbeing = weighted base blend (needs, amenities, environment, crowding)
// plus direct building contributions, capped by the age ceiling (doc 03 §3).
// The environment term is the biophilia coupling: a greener world literally
// makes citizens happier — keep it (doc 03 calls it thematically central).

import { CONFIG } from './config';
import { hexDistance } from './hex';
import type { AgeDef, Content, SimState } from './types';
import { clamp, clamp01 } from './util';

export interface WellbeingResult {
  wellbeing: number;
  needs: number;
  amenity: number;
  envQuality: number;
  crowding: number;
}

export function computeWellbeing(state: SimState, content: Content, age: AgeDef): WellbeingResult {
  const buildingById = new Map(content.buildings.map((b) => [b.id, b]));
  let needsAdd = 0;
  let amenityAdd = 0;
  const copies = new Map<string, number>();
  for (const b of state.buildings) {
    const def = buildingById.get(b.id);
    const n = copies.get(b.id) ?? 0;
    copies.set(b.id, n + 1);
    const falloff = Math.pow(CONFIG.wellbeingDuplicateFalloff, n);
    for (const m of def?.effects.wellbeing ?? []) {
      if (m.note?.startsWith('needs')) needsAdd += m.value * falloff;
      else amenityAdd += m.value * falloff;
    }
  }

  // Environmental quality: habitat quality where citizens live.
  let envCells = state.cells;
  if (state.buildings.length > 0) {
    const origins = state.buildings.map((b) => state.cells[b.cellId]);
    envCells = state.cells.filter((c) =>
      origins.some((o) => hexDistance(c, o) <= CONFIG.envSampleRadius),
    );
  }
  const envQuality = envCells.reduce((s, c) => s + c.habitatQuality, 0) / Math.max(envCells.length, 1);

  const crowding = clamp01(
    (state.buildings.length / state.cells.length - CONFIG.crowding.densityThreshold) *
      CONFIG.crowding.scale,
  );

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
  return { wellbeing, needs: needsAdd, amenity: amenityAdd, envQuality, crowding };
}
