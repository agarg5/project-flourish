// Shared deterministic visual helpers for the render layer. Pure functions of
// cell id, so the world looks identical every load (and in headless checks).

export const HEX_SIZE = 1;

export const BIOME_COLORS: Record<string, string> = {
  forest: '#3a7d4f',
  grassland: '#a8b45e',
  wetland: '#4e8d78',
  coast_shallow: '#5fae9c',
  desert: '#d9b86a',
  mountain: '#9b9aa3',
  open_water: '#3f6f8f',
};

// Biomes are nearly coplanar so there are no chunky vertical cliff faces
// between them — those exposed hex-prism sides were what read as "stacked
// blocks". Water biomes sit a touch lower so the pond reads as recessed.
const BIOME_BASE_HEIGHTS: Record<string, number> = {
  forest: 0.3,
  grassland: 0.28,
  wetland: 0.22,
  coast_shallow: 0.2,
  desert: 0.27,
  mountain: 0.34,
  open_water: 0.18,
};

/** Deterministic 0..1 hash from a cell id and a salt. */
export function cellHash(id: number, salt: number): number {
  let h = (id + 1) * 374761393 + salt * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return ((h >>> 0) % 10000) / 10000;
}

/** Terrain column height for a cell — constant per biome, so same-biome
 * neighbors form one continuous surface with no lips or shadow seams between
 * tiles (per-cell height jitter read as misaligned tiles up close). Variation
 * comes from color jitter and decoration instead. Mountains are a constant
 * plinth; the peak meshes on top provide the silhouette. */
export function cellHeight(_id: number, biome: string): number {
  return BIOME_BASE_HEIGHTS[biome] ?? 0.3;
}

/** Jittered position within a cell, keeping decorations off the rim. */
export function scatterInCell(
  x: number,
  z: number,
  id: number,
  salt: number,
  maxRadius = 0.55,
): { x: number; z: number } {
  const angle = cellHash(id, salt) * Math.PI * 2;
  const dist = Math.sqrt(cellHash(id, salt + 31)) * maxRadius;
  return { x: x + Math.cos(angle) * dist, z: z + Math.sin(angle) * dist };
}
