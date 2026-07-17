// Habitat quality field + per-species suitability (doc 08 section 3).

import type { SimCaches } from './caches';
import { CONFIG } from './config';
import { hexagonCoords, hexDistance, qrKey } from './hex';
import type { Content, SimState, SpeciesDef, WorldCell } from './types';
import { clamp01 } from './util';

/**
 * Recompute every cell's habitatQuality from biome base + placed effects with
 * linear hex falloff. Effect-local: each effect touches only the O(radius²)
 * cells it can reach, instead of every cell scanning every effect. A no-op
 * unless the world changed since the last rebuild.
 */
export function recomputeHabitat(state: SimState, content: Content, caches: SimCaches): void {
  if (caches.isBuilt('habitat', state)) return;

  for (const cell of state.cells) {
    cell.habitatQuality = content.biomes[cell.biome].baseQuality;
  }

  const byQR = caches.index(state);
  for (const pe of state.placedEffects) {
    const origin = state.cells[pe.originCellId];
    for (const eff of pe.effects) {
      if (eff.suitabilityDelta === 0) continue;
      const radius = eff.radius ?? 0;
      for (const { q: dq, r: dr } of hexagonCoords(radius)) {
        const cell = byQR.get(qrKey(origin.q + dq, origin.r + dr));
        if (!cell) continue;
        if (eff.biome && eff.biome !== cell.biome) continue;
        const d = hexDistance(cell, origin);
        cell.habitatQuality += eff.suitabilityDelta * (1 - d / (radius + 1));
      }
    }
  }

  for (const cell of state.cells) {
    cell.habitatQuality = clamp01(cell.habitatQuality);
  }
  caches.markBuilt('habitat', state);
}

/** suitability(cell, s) = biomeMatch × habitatQuality (doc 08 section 3b). */
export function suitability(cell: WorldCell, sp: SpeciesDef): number {
  const match = sp.preferredBiomes.includes(cell.biome) ? 1 : CONFIG.offBiomePenalty;
  return match * cell.habitatQuality;
}

/**
 * Average habitat quality over cells within `radius` of any building; global
 * average if none. Requires habitat quality to be current (recomputeHabitat
 * runs earlier in the tick).
 */
export function settlementQuality(state: SimState, radius: number, caches: SimCaches): number {
  return caches.getZoneQuality(state, radius, () => {
    let cells: WorldCell[] = state.cells;
    if (state.buildings.length > 0) {
      const origins = state.buildings.map((b) => state.cells[b.cellId]);
      cells = state.cells.filter((c) => origins.some((o) => hexDistance(c, o) <= radius));
    }
    if (cells.length === 0) return 0;
    return cells.reduce((s, c) => s + c.habitatQuality, 0) / cells.length;
  });
}
