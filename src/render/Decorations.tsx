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
  reeds: Item[];
  tufts: Item[];
}

const PINE_SHADES = ['#2f6b40', '#377a49', '#2a5e3a', '#3f8552'];
const CANOPY_SHADES = ['#5d9c4f', '#6fae5c', '#549147'];
const TUFT_SHADES = ['#b9c46a', '#c6cf78'];

function buildDecor(cells: UICell[]): DecorSet {
  const d: DecorSet = { pines: [], canopies: [], trunks: [], reeds: [], tufts: [] };

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
      const n = cleared ? 4 : 8;
      for (let i = 0; i < n; i++) {
        const p = scatterInCell(x, z, c.id, 70 + i * 3, 0.6);
        const rs = 0.4 + cellHash(c.id, 71 + i) * 0.35;
        d.reeds.push({ x: p.x, y: y + 0.13 * rs, z: p.z, s: rs, ry: 0, color: i % 2 ? '#3c6b50' : '#588a64' });
      }
      if (!cleared && cellHash(c.id, 78) < 0.25) {
        const p = scatterInCell(x, z, c.id, 79, 0.4);
        d.canopies.push({ x: p.x, y: y + 0.42 * 0.45, z: p.z, s: 0.45, ry: 0, color: '#4d8a5c' });
        d.trunks.push({ x: p.x, y: y + 0.11 * 0.45, z: p.z, s: 0.45, ry: 0, color: '#5e4631' });
      }
    }
    // Mountain cells get KayKit peak models instead (see MountainPeaks below).
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

// Procedural jagged peaks for the central range. Each peak is a low-segment
// cone with a snow cap that shares the same segment count, rotation, and
// squash, so the snow hugs the rock facets instead of floating as a blob.
interface Peak {
  x: number;
  z: number;
  baseY: number;
  h: number;
  r: number;
  rot: number;
  squash: number;
  tiltX: number;
  tiltZ: number;
  snow: boolean;
}

const SNOW_FRACTION = 0.34;
const PEAK_SEGMENTS = 5;

function PeakMesh({ p }: { p: Peak }) {
  const snowH = p.h * SNOW_FRACTION;
  const snowR = p.r * SNOW_FRACTION * 1.07;
  return (
    <group
      position={[p.x, p.baseY, p.z]}
      rotation={[p.tiltX, p.rot, p.tiltZ]}
      scale={[1, 1, p.squash]}
    >
      <mesh position={[0, p.h / 2, 0]} castShadow receiveShadow>
        <coneGeometry args={[p.r, p.h, PEAK_SEGMENTS]} />
        <meshStandardMaterial color="#8b8a94" roughness={0.95} flatShading />
      </mesh>
      {p.snow && (
        <mesh position={[0, p.h * (1 - SNOW_FRACTION) + snowH / 2 - 0.01, 0]} castShadow>
          <coneGeometry args={[snowR, snowH, PEAK_SEGMENTS]} />
          <meshStandardMaterial color="#eef1f4" roughness={0.6} flatShading />
        </mesh>
      )}
    </group>
  );
}

export function MountainPeaks() {
  const cells = useGame((g) => g.snap.cells);
  // Biome layout is static; compute once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const peaks = useMemo(() => {
    const out: Peak[] = [];
    for (const c of cells) {
      if (c.biome !== 'mountain') continue;
      const { x, z } = axialToWorld(c.q, c.r, HEX_SIZE);
      const baseY = cellHeight(c.id, c.biome) - 0.03;
      const isCenter = c.q === 0 && c.r === 0;
      // Main peak — tallest at the center of the range.
      const h = (isCenter ? 2.6 : 1.5) + cellHash(c.id, 95) * 0.7;
      out.push({
        x, z, baseY, h,
        r: 0.78 + cellHash(c.id, 96) * 0.15,
        rot: cellHash(c.id, 97) * Math.PI,
        squash: 0.82 + cellHash(c.id, 98) * 0.18,
        tiltX: (cellHash(c.id, 99) - 0.5) * 0.08,
        tiltZ: (cellHash(c.id, 100) - 0.5) * 0.08,
        snow: true,
      });
      // A lower shoulder peak, offset within the cell.
      const sp = scatterInCell(x, z, c.id, 101, 0.45);
      const sh = h * (0.45 + cellHash(c.id, 102) * 0.2);
      out.push({
        x: sp.x, z: sp.z, baseY, h: sh,
        r: 0.5 + cellHash(c.id, 103) * 0.12,
        rot: cellHash(c.id, 104) * Math.PI,
        squash: 0.85 + cellHash(c.id, 105) * 0.15,
        tiltX: (cellHash(c.id, 106) - 0.5) * 0.12,
        tiltZ: (cellHash(c.id, 107) - 0.5) * 0.12,
        snow: sh > 1.2,
      });
    }
    return out;
  }, []);

  return (
    <group>
      {peaks.map((p, i) => (
        <PeakMesh key={i} p={p} />
      ))}
    </group>
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
      {/* short bladed tufts rather than tall thin poles */}
      <DecorInstances items={d.reeds} limit={600} flat geometry={<coneGeometry args={[0.07, 0.34, 4]} />} />
      <DecorInstances items={d.tufts} limit={500} flat geometry={<coneGeometry args={[0.09, 0.16, 5]} />} />
    </group>
  );
}
