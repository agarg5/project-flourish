// Hex grid helpers — axial coordinates, pointy-top orientation (doc 08).

export interface Axial {
  q: number;
  r: number;
}

export const HEX_DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1],
];

export function hexDistance(a: Axial, b: Axial): number {
  return (
    (Math.abs(a.q - b.q) +
      Math.abs(a.q + a.r - b.q - b.r) +
      Math.abs(a.r - b.r)) / 2
  );
}

/** All axial coords of a hexagon-shaped map of the given radius (3R(R+1)+1 cells). */
export function hexagonCoords(radius: number): Axial[] {
  const out: Axial[] = [];
  for (let q = -radius; q <= radius; q++) {
    const rMin = Math.max(-radius, -q - radius);
    const rMax = Math.min(radius, -q + radius);
    for (let r = rMin; r <= rMax; r++) out.push({ q, r });
  }
  return out;
}

const SQRT3 = Math.sqrt(3);

/** Axial -> plan position (x east, z south) for pointy-top hexes of the given size. */
export function axialToWorld(q: number, r: number, size = 1): { x: number; z: number } {
  return { x: SQRT3 * size * (q + r / 2), z: 1.5 * size * r };
}
