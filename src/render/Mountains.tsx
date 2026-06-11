// Mountains as procedural jagged pointed peaks. Each peak is an irregular
// faceted cone — several rings of jittered vertices up to an apex — merged
// into ONE BufferGeometry with colours baked per-vertex in WORLD space, so the
// snowline is a real altitude: short shoulder peaks stay bare rock and only
// the tall summits carry snow (a noisy line, since a straight one reads
// artificial). Faces pushed inward are darkened like crevices, upper rock is
// lighter than the base, and a skirt of small KayKit rocks (talus) grounds
// each peak. The whole range is a few dozen tiny cones — one draw call.

import { Instance, Instances, useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { axialToWorld } from '../sim';
import { useGame } from '../state/store';
import { cellHash, cellHeight, HEX_SIZE, scatterInCell } from './cellVisuals';

const ROCK_LOW = new THREE.Color('#3f434c');   // shadowed base rock
const ROCK_HIGH = new THREE.Color('#686d78');  // lit upper rock
const SNOW = new THREE.Color('#ffffff');
// World-space altitude (above the mountain cell tops) where snow begins/ends.
// Shoulders top out ~2.1 so they stay rock; main summits (2.6..4.5) get caps.
const SNOW_LINE = 2.2;
const SNOW_FULL = 2.6;

const TALUS_A = `${import.meta.env.BASE_URL}models/kaykit/rock_single_A.gltf`;
const TALUS_C = `${import.meta.env.BASE_URL}models/kaykit/rock_single_C.gltf`;
useGLTF.preload(TALUS_A);
useGLTF.preload(TALUS_C);

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

interface PeakSpec {
  seed: number;
  x: number;   // world position of the peak base centre
  baseY: number;
  z: number;
  w: number;   // world base width
  hgt: number; // world height
  ry: number;
}

// Build one peak directly in world space; colours use ABSOLUTE height above
// the cell top so the snowline is shared by the whole range.
function buildPeak(p: PeakSpec): THREE.BufferGeometry {
  const SEG = 9;
  const rings = [
    { y: 0.0, r: 0.62 },
    { y: 0.22, r: 0.55 },
    { y: 0.42, r: 0.46 },
    { y: 0.6, r: 0.35 },
    { y: 0.76, r: 0.22 },
  ];
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const tmp = new THREE.Color();
  const cosR = Math.cos(p.ry);
  const sinR = Math.sin(p.ry);

  // radialFrac: how far out this vertex sits vs its ring's nominal radius —
  // inward verts read as crevices and get darkened.
  const pushVert = (lx: number, ly: number, lz: number, radialFrac: number, vi: number) => {
    const wx = (lx * cosR - lz * sinR) * p.w + p.x;
    const wz = (lx * sinR + lz * cosR) * p.w + p.z;
    const altitude = ly * p.hgt; // world height above the cell top
    positions.push(wx, p.baseY + altitude, wz);
    // Noisy snowline so snow fingers down some faces and bares others.
    const lineJitter = (h(p.seed, vi + 500) - 0.5) * 0.5;
    const snow = smoothstep(SNOW_LINE + lineJitter, SNOW_FULL + lineJitter, altitude);
    const crevice = smoothstep(1.0, 0.72, radialFrac) * 0.35; // deeper = darker
    tmp.copy(ROCK_LOW)
      .lerp(ROCK_HIGH, smoothstep(0, 3.4, altitude))
      .offsetHSL(0, 0, (h(p.seed, vi + 900) - 0.5) * 0.05 - crevice * 0.08)
      .lerp(SNOW, snow);
    colors.push(tmp.r, tmp.g, tmp.b);
    return positions.length / 3 - 1;
  };

  // Ring vertices with angular + radial jitter for a jagged silhouette.
  let vi = 0;
  const ringIdx = rings.map((ring, ri) => {
    const idx: number[] = [];
    for (let i = 0; i < SEG; i++) {
      const a = (i / SEG) * Math.PI * 2 + (h(p.seed, ri * 17 + i) - 0.5) * 0.4;
      const frac = 0.72 + h(p.seed, ri * 17 + i + 50) * 0.56; // 0.72..1.28
      const rr = ring.r * frac;
      const yy = ring.y + (h(p.seed, ri * 17 + i + 100) - 0.5) * 0.07;
      idx.push(pushVert(Math.cos(a) * rr, yy, Math.sin(a) * rr, frac, vi++));
    }
    return idx;
  });
  const apex = pushVert((h(p.seed, 900) - 0.5) * 0.08, 1, (h(p.seed, 901) - 0.5) * 0.08, 1, vi++);

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
  return geo;
}

interface TalusItem {
  x: number;
  y: number;
  z: number;
  s: number;
  ry: number;
}

// Small rocks scattered at the feet of the peaks (talus) — grounds the range.
function TalusField({ path, items }: { path: string; items: TalusItem[] }) {
  const { nodes, materials } = useGLTF(path);
  const node = useMemo(() => {
    const mesh = Object.values(nodes).find((n): n is THREE.Mesh => (n as THREE.Mesh).isMesh)!;
    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());
    const unit = Math.max(size.x, size.z, 1e-4);
    return { geometry: mesh.geometry, material: Object.values(materials)[0] as THREE.Material, unit, footY: -box.min.y / unit };
  }, [nodes, materials]);
  return (
    <Instances geometry={node.geometry} material={node.material} limit={300} castShadow receiveShadow frustumCulled={false}>
      {items.map((it, i) => (
        <Instance
          key={i}
          position={[it.x, it.y + node.footY * it.s, it.z]}
          scale={it.s / node.unit}
          rotation={[0, it.ry, 0]}
        />
      ))}
    </Instances>
  );
}

export function Mountains() {
  const cells = useGame((g) => g.snap.cells);
  // Mountain cells never change biome, so key the rebuild on their id list.
  const sig = useMemo(
    () => cells.filter((c) => c.biome === 'mountain').map((c) => c.id).join(','),
    [cells],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { rangeGeometry, talusA, talusC } = useMemo(() => {
    const peakGeos: THREE.BufferGeometry[] = [];
    const talusA: TalusItem[] = [];
    const talusC: TalusItem[] = [];
    for (const c of cells) {
      if (c.biome !== 'mountain') continue;
      const { x, z } = axialToWorld(c.q, c.r, HEX_SIZE);
      const y = cellHeight(c.id, c.biome) - 0.05;
      const isCenter = c.q === 0 && c.r === 0;
      // One dominant peak + two shoulders per cell for a denser, craggier range.
      const peaks = [{ main: true }, { main: false }, { main: false }];
      peaks.forEach((pk, i) => {
        const p = pk.main ? { x, z } : scatterInCell(x, z, c.id, 40 + i * 7, 0.55);
        const hgt = (pk.main ? (isCenter ? 3.8 : 2.6) : 1.2 + i * 0.3) + cellHash(c.id, 41 + i) * 0.7;
        const w = (pk.main ? 2.3 : 1.3) + cellHash(c.id, 42 + i) * 0.5;
        peakGeos.push(
          buildPeak({
            seed: c.id * 7 + i,
            x: p.x, baseY: y, z: p.z, w, hgt,
            ry: cellHash(c.id, 44 + i) * Math.PI * 2,
          }),
        );
      });
      // Talus rocks near the cell rim.
      for (let i = 0; i < 2; i++) {
        const p = scatterInCell(x, z, c.id, 70 + i * 9, 0.85);
        const item = { x: p.x, y, z: p.z, s: 0.22 + cellHash(c.id, 71 + i) * 0.2, ry: cellHash(c.id, 72 + i) * Math.PI * 2 };
        if (cellHash(c.id, 73 + i) < 0.5) talusA.push(item);
        else talusC.push(item);
      }
    }
    const rangeGeometry = mergeGeometries(peakGeos, false);
    rangeGeometry.computeVertexNormals();
    peakGeos.forEach((g) => g.dispose());
    return { rangeGeometry, talusA, talusC };
  }, [sig]);

  return (
    <group>
      <mesh geometry={rangeGeometry} castShadow receiveShadow frustumCulled={false}>
        <meshStandardMaterial vertexColors roughness={0.95} flatShading />
      </mesh>
      <TalusField path={TALUS_A} items={talusA} />
      <TalusField path={TALUS_C} items={talusC} />
    </group>
  );
}
