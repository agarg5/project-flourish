// Habitat quality field + per-species suitability (doc 08 section 3).

import type { SimCaches } from './caches';
import { qrKey } from './caches';
import { CONFIG } from './config';
import { hexDistance } from './hex';
import type { Content, SimState, SpeciesDef, WorldCell } from './types';
import { clamp01 } from './util';

/**
 * Recompute every cell's habitatQuality from biome base + placed effects with
 * linear hex falloff. Effect-local: each effect touches only the O(radius²)
 * cells it can reach, instead of every cell scanning every effect. With caches,
 * a no-op unless the world changed since the last rebuild.
 */
export function recomputeHabitat(state: SimState, content: Content, caches?: SimCaches): void {
  if (caches?.habitatCurrent()) return;

  for (const cell of state.cells) {
    cell.habitatQuality = content.biomes[cell.biome].baseQuality;
  }

  const byQR = caches
    ? caches.index(state)
    : new Map(state.cells.map((c) => [qrKey(c.q, c.r), c]));
  for (const pe of state.placedEffects) {
    const origin = state.cells[pe.originCellId];
    for (const eff of pe.effects) {
      if (eff.suitabilityDelta === 0) continue;
      const radius = eff.radius ?? 0;
      for (let dq = -radius; dq <= radius; dq++) {
        const rMin = Math.max(-radius, -dq - radius);
        const rMax = Math.min(radius, -dq + radius);
        for (let dr = rMin; dr <= rMax; dr++) {
          const cell = byQR.get(qrKey(origin.q + dq, origin.r + dr));
          if (!cell) continue;
          if (eff.biome && eff.biome !== cell.biome) continue;
          const d = (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
          cell.habitatQuality += eff.suitabilityDelta * (1 - d / (radius + 1));
        }
      }
    }
  }

  for (const cell of state.cells) {
    cell.habitatQuality = clamp01(cell.habitatQuality);
  }
  caches?.markHabitatBuilt();
}

/** suitability(cell, s) = biomeMatch × habitatQuality (doc 08 section 3b). */
export function suitability(cell: WorldCell, sp: SpeciesDef): number {
  const match = sp.preferredBiomes.includes(cell.biome) ? 1 : CONFIG.offBiomePenalty;
  return match * cell.habitatQuality;
}

/** Cells within `radius` of any building; the whole world when there are none. */
export function buildingZone(state: SimState, radius: number, caches?: SimCaches): WorldCell[] {
  const compute = (): WorldCell[] => {
    if (state.buildings.length === 0) return state.cells;
    const origins = state.buildings.map((b) => state.cells[b.cellId]);
    return state.cells.filter((c) => origins.some((o) => hexDistance(c, o) <= radius));
  };
  return caches ? caches.zone(state, radius, compute) : compute();
}

/** Average habitat quality over cells within `radius` of any building; global average if none. */
export function settlementQuality(state: SimState, radius: number, caches?: SimCaches): number {
  const cells = buildingZone(state, radius, caches);
  if (cells.length === 0) return 0;
  return cells.reduce((s, c) => s + c.habitatQuality, 0) / cells.length;
}
