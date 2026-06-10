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

const BIOME_BASE_HEIGHTS: Record<string, number> = {
  forest: 0.42,
  grassland: 0.3,
  wetland: 0.16,
  coast_shallow: 0.1,
  desert: 0.24,
  mountain: 1.0,
  open_water: 0.05,
};

/** Deterministic 0..1 hash from a cell id and a salt. */
export function cellHash(id: number, salt: number): number {
  let h = (id + 1) * 374761393 + salt * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return ((h >>> 0) % 10000) / 10000;
}

/** Terrain column height for a cell — biome base + per-cell variation. */
export function cellHeight(id: number, biome: string): number {
  const base = BIOME_BASE_HEIGHTS[biome] ?? 0.3;
  if (biome === 'mountain') return 0.8 + cellHash(id, 1) * 0.75; // craggy range
  return base + (cellHash(id, 1) - 0.5) * 0.08;
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
