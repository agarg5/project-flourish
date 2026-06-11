import { useMemo } from 'react';
import { DoubleSide } from 'three';
import { useGame } from '../state/store';
import { cellHeight } from './cellVisuals';
import { buildTerrainGeometry } from './terrain';

export { HEX_SIZE } from './cellVisuals';

/** Top surface height of a cell — objects (buildings, creatures) sit on this. */
export function cellTopY(id: number, biome: string): number {
  return cellHeight(id, biome);
}

// One continuous mesh for the whole world (see terrain.ts). Rebuilt only when
// the coarse biome/quality signature changes — quality moves slowly, so this
// is rare. Adjacent cells share corner vertices, so same-biome regions render
// as one smooth surface with no visible hex tiling.
export function World() {
  const cells = useGame((g) => g.snap.cells);
  const sig = useMemo(
    () => cells.map((c) => `${c.biome[0]}${Math.round(c.quality * 5)}`).join(''),
    [cells],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geometry = useMemo(() => buildTerrainGeometry(cells), [sig]);
  if (!geometry) return null;
  return (
    <mesh geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial vertexColors roughness={0.97} metalness={0} side={DoubleSide} />
    </mesh>
  );
}
