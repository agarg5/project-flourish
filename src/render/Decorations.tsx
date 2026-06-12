// Procedural stylized vegetation and terrain dressing. Density follows live
// habitat quality, so degraded land visibly thins out — decoration doubles as
// sim legibility (Pillar 5). Trees come from real models (Trees.tsx); this
// pass scatters lightweight ground cover per biome, including the desert
// (dunes, dry scrub, pebbles) so it reads as a place, not a flat brown stain.

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
  sy?: number;      // optional vertical squash (dunes are low mounds)
  sz?: number;      // optional non-uniform footprint stretch (dunes)
}

interface DecorSet {
  reeds: Item[];
  tufts: Item[];
  scrub: Item[];
  pebbles: Item[];
  dunes: Item[];
}

const TUFT_SHADES = ['#b9c46a', '#c6cf78'];
const SCRUB_SHADES = ['#a08a52', '#b09a5e', '#8f7f55'];
const DUNE_SHADES = ['#d3b06a', '#cba95f', '#dcbd76'];

function buildDecor(cells: UICell[]): DecorSet {
  const d: DecorSet = { reeds: [], tufts: [], scrub: [], pebbles: [], dunes: [] };

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
      const n = cleared ? 5 : 10;
      for (let i = 0; i < n; i++) {
        const p = scatterInCell(x, z, c.id, 70 + i * 3, 0.78);
        const rs = 0.5 + cellHash(c.id, 71 + i) * 0.45;
        d.reeds.push({ x: p.x, y: y + 0.13 * rs, z: p.z, s: rs, ry: 0, color: i % 2 ? '#3c6b50' : '#588a64' });
      }
    } else if (c.biome === 'desert') {
      // Soft dune mounds break up the flat expanse (smooth-shaded, sand tones)
      // — sparse, so they read as landforms rather than tiling the patch.
      if (cellHash(c.id, 80) < 0.3) {
        const p = scatterInCell(x, z, c.id, 81, 0.45);
        const ds = 0.65 + cellHash(c.id, 82) * 0.6;
        d.dunes.push({
          x: p.x, y, z: p.z, s: ds, ry: cellHash(c.id, 83) * Math.PI,
          color: DUNE_SHADES[c.id % DUNE_SHADES.length],
          sy: 0.14 + cellHash(c.id, 89) * 0.08,
          sz: 0.55 + cellHash(c.id, 84) * 0.35,
        });
      }
      // Sparse dry scrub — life clings on, but it's clearly parched.
      const bushes = 1 + (cellHash(c.id, 85) < 0.5 ? 1 : 0);
      for (let i = 0; i < bushes; i++) {
        const p = scatterInCell(x, z, c.id, 86 + i * 7);
        const bs = 0.5 + cellHash(c.id, 87 + i) * 0.5;
        d.scrub.push({ x: p.x, y: y + 0.07 * bs, z: p.z, s: bs, ry: cellHash(c.id, 88 + i) * Math.PI, color: SCRUB_SHADES[(c.id + i) % SCRUB_SHADES.length] });
      }
      // A few sun-bleached pebbles.
      for (let i = 0; i < 2; i++) {
        const p = scatterInCell(x, z, c.id, 90 + i * 5, 0.7);
        const ps = 0.10 + cellHash(c.id, 91 + i) * 0.14;
        d.pebbles.push({ x: p.x, y: y + ps * 0.4, z: p.z, s: ps, ry: cellHash(c.id, 92 + i) * Math.PI * 2, color: i % 2 ? '#c0a878' : '#b3995f' });
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
          scale={it.sy || it.sz ? [it.s, it.s * (it.sy ?? 1), it.s * (it.sz ?? 1)] : it.s}
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
      <DecorInstances items={d.reeds} limit={5200} flat geometry={<coneGeometry args={[0.07, 0.34, 4]} />} />
      <DecorInstances items={d.tufts} limit={2600} flat geometry={<coneGeometry args={[0.09, 0.16, 5]} />} />
      {/* desert: smooth dune mounds, dry scrub, bleached pebbles */}
      <DecorInstances items={d.dunes} limit={320} geometry={<sphereGeometry args={[0.9, 14, 9]} />} />
      <DecorInstances items={d.scrub} limit={700} flat geometry={<coneGeometry args={[0.13, 0.14, 6]} />} />
      <DecorInstances items={d.pebbles} limit={600} flat geometry={<icosahedronGeometry args={[1, 0]} />} />
    </group>
  );
}
