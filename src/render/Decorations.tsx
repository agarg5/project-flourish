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
  pines: Item[];
  canopies: Item[];
  trunks: Item[];
  rocks: Item[];
  snow: Item[];
  reeds: Item[];
  tufts: Item[];
}

const PINE_SHADES = ['#2f6b40', '#377a49', '#2a5e3a', '#3f8552'];
const CANOPY_SHADES = ['#5d9c4f', '#6fae5c', '#549147'];
const TUFT_SHADES = ['#b9c46a', '#c6cf78'];

function buildDecor(cells: UICell[]): DecorSet {
  const d: DecorSet = { pines: [], canopies: [], trunks: [], rocks: [], snow: [], reeds: [], tufts: [] };

  for (const c of cells) {
    const { x, z } = axialToWorld(c.q, c.r, HEX_SIZE);
    const y = cellHeight(c.id, c.biome);
    const cleared = !!c.buildingId;

    if (c.biome === 'forest') {
      // Tree count tracks habitat quality: a thriving forest is dense,
      // a degraded one visibly thins.
      const n = cleared ? 1 : Math.max(0, Math.round(4 * Math.min(1, c.quality / 0.75)));
      for (let i = 0; i < n; i++) {
        const p = scatterInCell(x, z, c.id, i * 7 + 2);
        const s = 0.75 + cellHash(c.id, i * 7 + 3) * 0.6;
        d.pines.push({ x: p.x, y: y + 0.47 * s, z: p.z, s, ry: cellHash(c.id, i) * Math.PI, color: PINE_SHADES[(c.id + i) % PINE_SHADES.length] });
        d.trunks.push({ x: p.x, y: y + 0.11 * s, z: p.z, s, ry: 0, color: '#6b4a32' });
      }
    } else if (c.biome === 'grassland') {
      if (!cleared && cellHash(c.id, 51) < 0.3) {
        const p = scatterInCell(x, z, c.id, 52);
        const s = 0.6 + cellHash(c.id, 53) * 0.4;
        d.canopies.push({ x: p.x, y: y + 0.42 * s, z: p.z, s, ry: cellHash(c.id, 54) * Math.PI, color: CANOPY_SHADES[c.id % CANOPY_SHADES.length] });
        d.trunks.push({ x: p.x, y: y + 0.11 * s, z: p.z, s: s * 0.9, ry: 0, color: '#7a5a3a' });
      }
      const tufts = cleared ? 1 : 3;
      for (let i = 0; i < tufts; i++) {
        const p = scatterInCell(x, z, c.id, 60 + i * 5);
        const ts = 0.6 + cellHash(c.id, 61 + i) * 0.7;
        d.tufts.push({ x: p.x, y: y + 0.08 * ts, z: p.z, s: ts, ry: 0, color: TUFT_SHADES[(c.id + i) % TUFT_SHADES.length] });
      }
    } else if (c.biome === 'wetland') {
      const n = cleared ? 2 : 4;
      for (let i = 0; i < n; i++) {
        const p = scatterInCell(x, z, c.id, 70 + i * 3);
        const rs = 0.7 + cellHash(c.id, 71 + i) * 0.6;
        d.reeds.push({ x: p.x, y: y + 0.21 * rs, z: p.z, s: rs, ry: 0, color: i % 2 ? '#3c6b50' : '#588a64' });
      }
      if (!cleared && cellHash(c.id, 78) < 0.25) {
        const p = scatterInCell(x, z, c.id, 79, 0.4);
        d.canopies.push({ x: p.x, y: y + 0.42 * 0.45, z: p.z, s: 0.45, ry: 0, color: '#4d8a5c' });
        d.trunks.push({ x: p.x, y: y + 0.11 * 0.45, z: p.z, s: 0.45, ry: 0, color: '#5e4631' });
      }
    } else if (c.biome === 'mountain') {
      const p = scatterInCell(x, z, c.id, 90, 0.35);
      const ks = 0.5 + cellHash(c.id, 91) * 0.8;
      d.rocks.push({ x: p.x, y: y + 0.21 * ks, z: p.z, s: ks, ry: cellHash(c.id, 92) * Math.PI, color: cellHash(c.id, 93) < 0.5 ? '#84838d' : '#75747e' });
      // Snowcap on the taller columns reads as a proper range.
      if (y > 1.15) {
        const ss = 0.8 + (y - 1.15);
        d.snow.push({ x, y: y - 0.02 + 0.25 * ss, z, s: ss, ry: cellHash(c.id, 94) * Math.PI, color: '#eef1f4' });
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
      {/* pine canopy: two stacked cones feel; single cone reads fine at this scale */}
      <DecorInstances items={d.pines} limit={600} flat geometry={<coneGeometry args={[0.22, 0.5, 6]} />} />
      <DecorInstances items={d.trunks} limit={700} geometry={<cylinderGeometry args={[0.045, 0.06, 0.22, 5]} />} />
      <DecorInstances items={d.canopies} limit={200} flat geometry={<icosahedronGeometry args={[0.26, 0]} />} />
      <DecorInstances items={d.rocks} limit={100} flat geometry={<coneGeometry args={[0.28, 0.42, 4]} />} />
      <DecorInstances items={d.snow} limit={100} flat geometry={<coneGeometry args={[0.55, 0.5, 6]} />} />
      <DecorInstances items={d.reeds} limit={300} geometry={<cylinderGeometry args={[0.018, 0.028, 0.42, 4]} />} />
      <DecorInstances items={d.tufts} limit={500} flat geometry={<coneGeometry args={[0.09, 0.16, 5]} />} />
    </group>
  );
}
