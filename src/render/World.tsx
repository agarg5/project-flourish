import { Instance, Instances } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { axialToWorld } from '../sim';
import { useGame } from '../state/store';

export const HEX_SIZE = 1;

export const BIOME_COLORS: Record<string, string> = {
  forest: '#2f6b48',
  grassland: '#94a74e',
  wetland: '#4e7d6d',
  coast_shallow: '#5fae9c',
  desert: '#d9b86a',
  mountain: '#8d8f98',
  open_water: '#3f6f8f',
};

export const BIOME_HEIGHTS: Record<string, number> = {
  forest: 0.42,
  grassland: 0.3,
  wetland: 0.16,
  coast_shallow: 0.1,
  desert: 0.24,
  mountain: 1.15,
  open_water: 0.05,
};

const DEGRADED = new THREE.Color('#7d6b4f');

export function cellTopY(biome: string): number {
  return BIOME_HEIGHTS[biome] ?? 0.3;
}

export function World() {
  const cells = useGame((g) => g.snap.cells);

  const items = useMemo(
    () =>
      cells.map((c) => {
        const { x, z } = axialToWorld(c.q, c.r, HEX_SIZE);
        const h = cellTopY(c.biome);
        const base = new THREE.Color(BIOME_COLORS[c.biome] ?? '#888888');
        // Degraded land visibly browns; thriving land deepens.
        const color = base.clone().lerp(DEGRADED, Math.max(0, 0.75 - c.quality));
        return { id: c.id, x, z, h, color };
      }),
    [cells],
  );

  return (
    <Instances limit={256} castShadow receiveShadow>
      {/* thetaStart rotates the hexagon so flat edges face east-west (pointy-top layout) */}
      <cylinderGeometry args={[HEX_SIZE * 0.985, HEX_SIZE * 0.985, 1, 6, 1, false, Math.PI / 6]} />
      <meshStandardMaterial roughness={0.9} metalness={0} />
      {items.map((c) => (
        <Instance
          key={c.id}
          position={[c.x, c.h / 2, c.z]}
          scale={[1, c.h, 1]}
          color={c.color}
        />
      ))}
    </Instances>
  );
}
