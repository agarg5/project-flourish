// Mountains as procedural jagged pointed peaks. Boulder models couldn't carry
// snow (no summit for it to sit on); a tapering faceted peak does. Each peak is
// an irregular low-poly cone — rings of jittered radii up to a point — with
// snow baked in as vertex colours above a height line. Because the form tapers
// to a summit, the white cap clearly reads as snow. A few seeded geometry
// variants are instanced, varied by scale/rotation.

import { Instance, Instances } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { axialToWorld } from '../sim';
import { useGame } from '../state/store';
import { cellHash, cellHeight, HEX_SIZE, scatterInCell } from './cellVisuals';

const ROCK_LOW = new THREE.Color('#4a4e57');   // shadowed base rock
const ROCK_HIGH = new THREE.Color('#6f7480');  // lit upper rock
const SNOW = new THREE.Color('#ffffff');
const SNOW_LINE = 0.5;
const SNOW_FULL = 0.64;

function h(seed: number, n: number): number {
  let x = (seed + 1) * 73856093 + (n + 1) * 19349663;
  x = (x ^ (x >> 13)) * 1274126177;
  x = x ^ (x >> 16);
  return ((x >>> 0) % 10000) / 10000;
}
function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// A peak normalized to height 1, base radius ~0.5, tapering to an apex.
function buildPeak(seed: number): THREE.BufferGeometry {
  const SEG = 7;
  const rings = [
    { y: 0.0, r: 0.6 },
    { y: 0.38, r: 0.46 },
    { y: 0.7, r: 0.24 },
  ];
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const tmp = new THREE.Color();

  const pushVert = (x: number, y: number, z: number) => {
    positions.push(x, y, z);
    const snow = smoothstep(SNOW_LINE, SNOW_FULL, y);
    tmp.copy(ROCK_LOW).lerp(ROCK_HIGH, smoothstep(0, 0.7, y)).lerp(SNOW, snow);
    colors.push(tmp.r, tmp.g, tmp.b);
    return positions.length / 3 - 1;
  };

  // Ring vertices with angular + radial jitter for a jagged silhouette.
  const ringIdx = rings.map((ring, ri) => {
    const idx: number[] = [];
    for (let i = 0; i < SEG; i++) {
      const a = (i / SEG) * Math.PI * 2 + (h(seed, ri * 13 + i) - 0.5) * 0.5;
      const rr = ring.r * (0.78 + h(seed, ri * 13 + i + 50) * 0.5);
      const yy = ring.y + (h(seed, ri * 13 + i + 100) - 0.5) * 0.08;
      idx.push(pushVert(Math.cos(a) * rr, yy, Math.sin(a) * rr));
    }
    return idx;
  });
  const apex = pushVert((h(seed, 900) - 0.5) * 0.1, 1, (h(seed, 901) - 0.5) * 0.1);

  // Connect adjacent rings as quads.
  for (let ri = 0; ri < rings.length - 1; ri++) {
    const lo = ringIdx[ri];
    const hi = ringIdx[ri + 1];
    for (let i = 0; i < SEG; i++) {
      const j = (i + 1) % SEG;
      indices.push(lo[i], hi[i], lo[j]);
      indices.push(lo[j], hi[i], hi[j]);
    }
  }
  // Top ring to apex.
  const top = ringIdx[ringIdx.length - 1];
  for (let i = 0; i < SEG; i++) {
    indices.push(top[i], apex, top[(i + 1) % SEG]);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

interface PeakItem {
  x: number;
  y: number;
  z: number;
  w: number; // world width
  hgt: number; // world height
  ry: number;
}

function PeakField({ geometry, items }: { geometry: THREE.BufferGeometry; items: PeakItem[] }) {
  return (
    <Instances geometry={geometry} limit={120} castShadow receiveShadow frustumCulled={false}>
      <meshStandardMaterial vertexColors roughness={0.95} flatShading envMapIntensity={0} />
      {items.map((it, i) => (
        <Instance
          key={i}
          position={[it.x, it.y, it.z]}
          scale={[it.w, it.hgt, it.w]}
          rotation={[0, it.ry, 0]}
        />
      ))}
    </Instances>
  );
}

const VARIANTS = 3;

export function Mountains() {
  const cells = useGame((g) => g.snap.cells);
  const geometries = useMemo(() => Array.from({ length: VARIANTS }, (_, i) => buildPeak(i + 1)), []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const buckets = useMemo(() => {
    const out: PeakItem[][] = Array.from({ length: VARIANTS }, () => []);
    for (const c of cells) {
      if (c.biome !== 'mountain') continue;
      const { x, z } = axialToWorld(c.q, c.r, HEX_SIZE);
      const y = cellHeight(c.id, c.biome) - 0.05;
      const isCenter = c.q === 0 && c.r === 0;
      // One dominant peak per cell + a smaller companion, so the range reads as
      // distinct summits rather than a cluttered pile.
      const peaks = [
        { main: true },
        { main: false },
      ];
      peaks.forEach((pk, i) => {
        const p = pk.main ? { x, z } : scatterInCell(x, z, c.id, 40 + i * 7, 0.5);
        const hgt = (pk.main ? (isCenter ? 3.6 : 2.5) : 1.4) + cellHash(c.id, 41 + i) * 0.7;
        const w = (pk.main ? 2.3 : 1.5) + cellHash(c.id, 42 + i) * 0.5;
        const v = Math.floor(cellHash(c.id, 43 + i) * VARIANTS) % VARIANTS;
        out[v].push({ x: p.x, y, z: p.z, w, hgt, ry: cellHash(c.id, 44 + i) * Math.PI * 2 });
      });
    }
    return out;
  }, [geometries]);

  return (
    <group>
      {geometries.map((g, i) => (
        <PeakField key={i} geometry={g} items={buckets[i]} />
      ))}
    </group>
  );
}
