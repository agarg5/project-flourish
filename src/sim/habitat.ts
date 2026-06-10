// Habitat quality field + per-species suitability (doc 08 section 3).

import { CONFIG } from './config';
import { hexDistance } from './hex';
import type { Content, SimState, SpeciesDef, WorldCell } from './types';
import { clamp01 } from './util';

/** Recompute every cell's habitatQuality from biome base + placed effects with linear hex falloff. */
export function recomputeHabitat(state: SimState, content: Content): void {
  for (const cell of state.cells) {
    let q = content.biomes[cell.biome].baseQuality;
    for (const pe of state.placedEffects) {
      const origin = state.cells[pe.originCellId];
      for (const eff of pe.effects) {
        if (eff.suitabilityDelta === 0) continue;
        if (eff.biome && eff.biome !== cell.biome) continue;
        const radius = eff.radius ?? 0;
        const d = hexDistance(cell, origin);
        if (d <= radius) q += eff.suitabilityDelta * (1 - d / (radius + 1));
      }
    }
    cell.habitatQuality = clamp01(q);
  }
}

/** suitability(cell, s) = biomeMatch × habitatQuality (doc 08 section 3b). */
export function suitability(cell: WorldCell, sp: SpeciesDef): number {
  const match = sp.preferredBiomes.includes(cell.biome) ? 1 : CONFIG.offBiomePenalty;
  return match * cell.habitatQuality;
}

/** Average habitat quality over cells within `radius` of any building; global average if none. */
export function settlementQuality(state: SimState, radius: number): number {
  let cells: WorldCell[];
  if (state.buildings.length === 0) {
    cells = state.cells;
  } else {
    const origins = state.buildings.map((b) => state.cells[b.cellId]);
    cells = state.cells.filter((c) => origins.some((o) => hexDistance(c, o) <= radius));
  }
  if (cells.length === 0) return 0;
  return cells.reduce((s, c) => s + c.habitatQuality, 0) / cells.length;
}
