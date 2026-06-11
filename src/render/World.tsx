import { Instance, Instances } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { axialToWorld } from '../sim';
import { useGame } from '../state/store';
import { BIOME_COLORS, cellHash, cellHeight, HEX_SIZE } from './cellVisuals';

export { HEX_SIZE } from './cellVisuals';

/** Top surface height of a cell's terrain column. */
export function cellTopY(id: number, biome: string): number {
  return cellHeight(id, biome);
}

const DEGRADED = new THREE.Color('#8a7355');

export function World() {
  const cells = useGame((g) => g.snap.cells);

  // Every column shares a deep floor (-BASE_DEPTH). Because all columns reach
  // the same depth and overlap their neighbors radially, the vertical walls of
  // adjacent cells always overlap even when their tops differ — so no sky shows
  // through the seams (the earlier "white triangle" gaps).
  const BASE_DEPTH = 2;
  const items = useMemo(
    () =>
      cells.map((c) => {
        const { x, z } = axialToWorld(c.q, c.r, HEX_SIZE);
        const top = cellHeight(c.id, c.biome);
        const h = top + BASE_DEPTH;
        const base = new THREE.Color(BIOME_COLORS[c.biome] ?? '#888888');
        // Subtle per-cell tonal variation breaks the flat uniformity...
        base.offsetHSL((cellHash(c.id, 7) - 0.5) * 0.02, 0, (cellHash(c.id, 8) - 0.5) * 0.06);
        // ...and degraded land visibly browns; thriving land deepens.
        const color = base.lerp(DEGRADED, Math.max(0, 0.75 - c.quality));
        return { id: c.id, x, z, h, cy: top - h / 2, color };
      }),
    [cells],
  );

  return (
    <Instances limit={256} castShadow receiveShadow>
      {/* thetaStart rotates the hexagon so flat edges face east-west (pointy-top
          layout). Radius == HEX_SIZE so hexes tile exactly edge-to-edge with no
          overlap; the shared deep base (below) keeps height-difference seams
          closed without needing the columns to poke into each other. */}
      <cylinderGeometry args={[HEX_SIZE, HEX_SIZE, 1, 6, 1, false, Math.PI / 6]} />
      <meshStandardMaterial roughness={0.95} metalness={0} />
      {items.map((c) => (
        <Instance
          key={c.id}
          position={[c.x, c.cy, c.z]}
          scale={[1, c.h, 1]}
          color={c.color}
        />
      ))}
    </Instances>
  );
}
