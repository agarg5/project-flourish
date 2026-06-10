import { CONFIG } from '../sim/config';
import { axialToWorld, hexagonCoords, hexDistance } from '../sim/hex';
import type { BiomeType, WorldCell } from '../sim/types';
import { BIOMES } from './biomes';

// Hand-authored starter map per doc 11 section 5: 127-cell hex (radius 6),
// mountain center, forest NW, grassland NE, wetland S. Deterministic layout —
// the doc-10 worked example must be reproducible against it.
function biomeFor(q: number, r: number): BiomeType {
  if (hexDistance({ q, r }, { q: 0, r: 0 }) <= 1) return 'mountain';
  if (r >= 3) return 'wetland';
  const { x } = axialToWorld(q, r);
  return x < 0 ? 'forest' : 'grassland';
}

export function createWorldCells(): WorldCell[] {
  return hexagonCoords(CONFIG.world.radius).map((c, id) => {
    const biome = biomeFor(c.q, c.r);
    return { id, q: c.q, r: c.r, biome, habitatQuality: BIOMES[biome].baseQuality };
  });
}

// The settlement starts on the forest-grassland boundary north of the
// mountain (doc 11: "adjacent to the grassland-forest boundary").
export const START_QR = { q: 1, r: -2 };
