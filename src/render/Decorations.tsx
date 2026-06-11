// Procedural stylized vegetation and terrain dressing. Density follows live
// habitat quality, so degraded land visibly thins out — decoration doubles as
// sim legibility (Pillar 5). Replaced/augmented by real asset packs in M3.

import { Instance, Instances } from '@react-three/drei';
import { useMemo } from 'react';
import { axialToWorld } from '../sim';
import { useGame } from '../state/store';
import type { UICell } from '../state/store';
import { cellHash, cellHeight, HEX_SIZE, scatterInCell } from './cellVisuals';

interface Item {
  x: number;
  y: number;
  z: number;
  s: number;        // scale
  ry: number;       // y rotation
  color: string;
}

interface DecorSet {
  reeds: Item[];
  tufts: Item[];
}

const TUFT_SHADES = ['#b9c46a', '#c6cf78'];

function buildDecor(cells: UICell[]): DecorSet {
  // Trees (forest + grassland) are handled by Trees.tsx with real models.
  // This pass only scatters lightweight ground cover: grass tufts and reeds.
  const d: DecorSet = { reeds: [], tufts: [] };

  for (const c of cells) {
    const { x, z } = axialToWorld(c.q, c.r, HEX_SIZE);
    const y = cellHeight(c.id, c.biome);
    const cleared = !!c.buildingId;

    if (c.biome === 'grassland') {
      const tufts = cleared ? 1 : 3;
      for (let i = 0; i < tufts; i++) {
        const p = scatterInCell(x, z, c.id, 60 + i * 5);
        const ts = 0.6 + cellHash(c.id, 61 + i) * 0.7;
        d.tufts.push({ x: p.x, y: y + 0.08 * ts, z: p.z, s: ts, ry: 0, color: TUFT_SHADES[(c.id + i) % TUFT_SHADES.length] });
      }
    } else if (c.biome === 'wetland') {
      const n = cleared ? 4 : 8;
      for (let i = 0; i < n; i++) {
        const p = scatterInCell(x, z, c.id, 70 + i * 3, 0.6);
        const rs = 0.4 + cellHash(c.id, 71 + i) * 0.35;
        d.reeds.push({ x: p.x, y: y + 0.13 * rs, z: p.z, s: rs, ry: 0, color: i % 2 ? '#3c6b50' : '#588a64' });
      }
    }
  }
  return d;
}

function DecorInstances({
  items, limit, geometry, flat,
}: {
  items: Item[];
  limit: number;
  geometry: React.ReactNode;
  flat?: boolean;
}) {
  return (
    <Instances limit={limit} castShadow receiveShadow frustumCulled={false}>
      {geometry}
      <meshStandardMaterial roughness={0.85} flatShading={flat} />
      {items.map((it, i) => (
        <Instance
          key={i}
          position={[it.x, it.y, it.z]}
          scale={it.s}
          rotation={[0, it.ry, 0]}
          color={it.color}
        />
      ))}
    </Instances>
  );
}

export function Decorations() {
  const cells = useGame((g) => g.snap.cells);
  // Rebuild only when something visible changes (quality moves slowly).
  const sig = useMemo(
    () => cells.map((c) => `${c.biome[0]}${Math.round(c.quality * 8)}${c.buildingId ? 'b' : ''}`).join(''),
    [cells],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const d = useMemo(() => buildDecor(cells), [sig]);

  return (
    <group>
      {/* short bladed reeds in the wetland, grass tufts on the grassland */}
      <DecorInstances items={d.reeds} limit={600} flat geometry={<coneGeometry args={[0.07, 0.34, 4]} />} />
      <DecorInstances items={d.tufts} limit={500} flat geometry={<coneGeometry args={[0.09, 0.16, 5]} />} />
    </group>
  );
}
