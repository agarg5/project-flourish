// Continuous terrain mesh. Instead of 127 separate hex prisms (which read as a
// grid of tiles no matter how they're tuned), this builds ONE watertight mesh
// where adjacent cells SHARE their corner vertices. Within a biome every cell
// is the same colour and height, so shared corners make it a single smooth
// surface — the hexes vanish. At biome borders the shared corner averages the
// two sides, giving a soft colour/height transition instead of a hard tile
// edge. A skirt drops the outer rim to a base depth for a clean island.

import * as THREE from 'three';
import { axialToWorld } from '../sim';
import type { UICell } from '../state/store';
import { BIOME_COLORS, cellHeight, HEX_SIZE } from './cellVisuals';

const BASE_Y = -1.8;
const SKIRT_COLOR = new THREE.Color('#5b4a38');

interface CellRender {
  x: number;
  z: number;
  h: number;
  color: THREE.Color;
  cornerKeys: string[];
}

function cornerKey(x: number, z: number): string {
  return `${x.toFixed(3)},${z.toFixed(3)}`;
}

/** The 6 corner world positions of a pointy-top hex (matches the tiling). */
function hexCorners(cx: number, cz: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < 6; i++) {
    const a = ((30 + 60 * i) * Math.PI) / 180;
    out.push([cx + HEX_SIZE * Math.cos(a), cz + HEX_SIZE * Math.sin(a)]);
  }
  return out;
}

interface SurfaceOpts {
  height: (cell: UICell) => number;
  color: (cell: UICell) => THREE.Color;
  skirt: boolean;
}

function buildSurface(cells: UICell[], opts: SurfaceOpts): THREE.BufferGeometry | null {
  if (cells.length === 0) return null;

  // 1. Accumulate every corner's averaged height + colour across its cells.
  const corners = new Map<
    string,
    { x: number; z: number; hSum: number; r: number; g: number; b: number; n: number }
  >();
  const cellRenders: CellRender[] = cells.map((c) => {
    const { x, z } = axialToWorld(c.q, c.r, HEX_SIZE);
    const h = opts.height(c);
    const color = opts.color(c);
    const keys: string[] = [];
    for (const [cx, cz] of hexCorners(x, z)) {
      const key = cornerKey(cx, cz);
      let e = corners.get(key);
      if (!e) {
        e = { x: cx, z: cz, hSum: 0, r: 0, g: 0, b: 0, n: 0 };
        corners.set(key, e);
      }
      e.hSum += h;
      e.r += color.r;
      e.g += color.g;
      e.b += color.b;
      e.n += 1;
      keys.push(key);
    }
    return { x, z, h, color, cornerKeys: keys };
  });

  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  // 2. One vertex per unique corner (averaged), indexed for reuse.
  const cornerIdx = new Map<string, number>();
  let vi = 0;
  for (const [key, e] of corners) {
    positions.push(e.x, e.hSum / e.n, e.z);
    colors.push(e.r / e.n, e.g / e.n, e.b / e.n);
    cornerIdx.set(key, vi++);
  }

  // 3. Each cell: a centre vertex (its own colour) fanned to its 6 corners.
  for (const cr of cellRenders) {
    const ci = vi++;
    positions.push(cr.x, cr.h, cr.z);
    colors.push(cr.color.r, cr.color.g, cr.color.b);
    for (let i = 0; i < 6; i++) {
      // Wound so the top face normal points up (+Y).
      indices.push(ci, cornerIdx.get(cr.cornerKeys[(i + 1) % 6])!, cornerIdx.get(cr.cornerKeys[i])!);
    }
  }

  // 4. Skirt: walls down to BASE_Y along edges used by only one cell (the rim).
  if (opts.skirt) {
    const edgeUse = new Map<string, number>();
    for (const cr of cellRenders) {
      for (let i = 0; i < 6; i++) {
        const k1 = cr.cornerKeys[i];
        const k2 = cr.cornerKeys[(i + 1) % 6];
        const ek = k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
        edgeUse.set(ek, (edgeUse.get(ek) ?? 0) + 1);
      }
    }
    for (const cr of cellRenders) {
      for (let i = 0; i < 6; i++) {
        const k1 = cr.cornerKeys[i];
        const k2 = cr.cornerKeys[(i + 1) % 6];
        const ek = k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
        if (edgeUse.get(ek) !== 1) continue;
        const a = cornerIdx.get(k1)!;
        const b = cornerIdx.get(k2)!;
        const ax = positions[a * 3], ay = positions[a * 3 + 1], az = positions[a * 3 + 2];
        const bx = positions[b * 3], by = positions[b * 3 + 1], bz = positions[b * 3 + 2];
        const ba = vi++;
        positions.push(ax, BASE_Y, az);
        colors.push(SKIRT_COLOR.r, SKIRT_COLOR.g, SKIRT_COLOR.b);
        const bb = vi++;
        positions.push(bx, BASE_Y, bz);
        colors.push(SKIRT_COLOR.r, SKIRT_COLOR.g, SKIRT_COLOR.b);
        // Two tris for the wall quad (a, b, bb, ba), wound to face outward.
        indices.push(a, bb, b, a, ba, bb);
        void ay; void by;
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

const DEGRADED = new THREE.Color('#8a7355');

export function buildTerrainGeometry(cells: UICell[]): THREE.BufferGeometry | null {
  return buildSurface(cells, {
    height: (c) => cellHeight(c.id, c.biome),
    color: (c) => {
      const base = new THREE.Color(BIOME_COLORS[c.biome] ?? '#888888');
      return base.lerp(DEGRADED, Math.max(0, 0.7 - c.quality));
    },
    skirt: true,
  });
}

const WATER_COLOR = new THREE.Color('#3d8294');

export function buildWaterGeometry(cells: UICell[]): THREE.BufferGeometry | null {
  const wet = cells.filter((c) => c.biome === 'wetland' || c.biome === 'coast_shallow');
  // Flat sheet a touch above the terrain so it reads as standing water.
  return buildSurface(wet, {
    height: (c) => cellHeight(c.id, c.biome) + 0.06,
    color: () => WATER_COLOR,
    skirt: false,
  });
}
