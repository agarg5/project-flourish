import { CONFIG } from '../sim/config';
import { axialToWorld, hexagonCoords, hexDistance } from '../sim/hex';
import type { BiomeType, WorldCell } from '../sim/types';
import { BIOMES } from './biomes';

// Hand-authored starter map (deterministic, scales with CONFIG.world.radius):
// a central mountain massif, forest NW, grassland NE, wetland to the south with
// a shallow-coast fringe at the far edge, and a desert dead-zone patch in the
// east (the late-game terraform lever needs something to convert).
function biomeFor(q: number, r: number, R: number): BiomeType {
  const d = hexDistance({ q, r }, { q: 0, r: 0 });
  if (d <= Math.max(2, Math.round(R * 0.22))) return 'mountain';

  // Desert: a compact dry patch out in the eastern grassland.
  const desertC = { q: Math.round(R * 0.55), r: -Math.round(R * 0.15) };
  if (hexDistance({ q, r }, desertC) <= Math.round(R * 0.22)) return 'desert';

  // South: wetland, fringed by shallow coast at the far southern edge.
  if (r >= Math.round(R * 0.4)) {
    return r >= Math.round(R * 0.82) ? 'coast_shallow' : 'wetland';
  }

  const { x } = axialToWorld(q, r);
  return x < 0 ? 'forest' : 'grassland';
}

export function createWorldCells(): WorldCell[] {
  const R = CONFIG.world.radius;
  return hexagonCoords(R).map((c, id) => {
    const biome = biomeFor(c.q, c.r, R);
    return { id, q: c.q, r: c.r, biome, habitatQuality: BIOMES[biome].baseQuality };
  });
}

// The settlement starts near the forest-grassland boundary north of the
// mountain, far enough out that the massif is scenery, not the whole view.
export const START_QR = { q: 8, r: -16 };
