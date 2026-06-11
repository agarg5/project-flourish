// Mountains built from KayKit rock models (CC0) clustered and stretched into
// craggy peaks, with snow caps — real faceted rock reads far better than plain
// procedural cones. One InstancedMesh per rock type keeps it cheap.

import { Instance, Instances, useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { axialToWorld } from '../sim';
import { useGame } from '../state/store';
import { cellHash, cellHeight, HEX_SIZE, scatterInCell } from './cellVisuals';

const ROCK_A = `${import.meta.env.BASE_URL}models/kaykit/rock_single_A.gltf`;
const ROCK_C = `${import.meta.env.BASE_URL}models/kaykit/rock_single_C.gltf`;
useGLTF.preload(ROCK_A);
useGLTF.preload(ROCK_C);

interface RockItem {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  ry: number;
  snowY: number | null; // world Y to drop a snow cap, or null
  snowS: number;
}

function useRockNode(path: string) {
  const { nodes, materials } = useGLTF(path);
  return useMemo(() => {
    const mesh = Object.values(nodes).find((n): n is THREE.Mesh => (n as THREE.Mesh).isMesh)!;
    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());
    return {
      geometry: mesh.geometry,
      material: Object.values(materials)[0] as THREE.Material,
      unit: Math.max(size.x, size.z, 0.001), // base footprint -> normalize to 1u
      h: Math.max(size.y, 0.001),
      footY: -box.min.y,
    };
  }, [nodes, materials]);
}

function RockField({ path, items }: { path: string; items: RockItem[] }) {
  const node = useRockNode(path);
  const base = 1 / node.unit; // so sx is roughly world-units across
  return (
    <Instances geometry={node.geometry} material={node.material} limit={200} castShadow receiveShadow>
      {items.map((it, i) => (
        <Instance
          key={i}
          position={[it.x, it.y + node.footY * base * it.sy, it.z]}
          scale={[base * it.sx, base * it.sy, base * it.sx]}
          rotation={[0, it.ry, 0]}
        />
      ))}
    </Instances>
  );
}

export function Mountains() {
  const cells = useGame((g) => g.snap.cells);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { rocksA, rocksC, snow } = useMemo(() => {
    const rocksA: RockItem[] = [];
    const rocksC: RockItem[] = [];
    const snow: { x: number; y: number; z: number; s: number }[] = [];
    for (const c of cells) {
      if (c.biome !== 'mountain') continue;
      const { x, z } = axialToWorld(c.q, c.r, HEX_SIZE);
      const y = cellHeight(c.id, c.biome) - 0.05;
      const isCenter = c.q === 0 && c.r === 0;
      // A tall central crag plus a couple of lower shoulders per cell. Rocks
      // are stretched well taller than wide so they read as steep peaks, not
      // boulders.
      const lobes = 3;
      for (let i = 0; i < lobes; i++) {
        const main = i === 0;
        const p = main ? { x, z } : scatterInCell(x, z, c.id, 90 + i * 4, 0.55);
        const tall = (main ? (isCenter ? 4.6 : 3.2) : 1.8) + cellHash(c.id, 91 + i) * 1.0;
        const wide = (main ? 1.5 : 1.05) + cellHash(c.id, 92 + i) * 0.35;
        const ry = cellHash(c.id, 93 + i) * Math.PI * 2;
        // Rock models are a bit wider than tall, so the visible top sits at
        // roughly 0.55x the vertical scale above the base.
        const top = y + tall * 0.52;
        const item: RockItem = {
          x: p.x, y, z: p.z, sx: wide, sy: tall, ry,
          snowY: tall > 1.6 ? top : null,
          snowS: wide * 0.62,
        };
        if (cellHash(c.id, 94 + i) < 0.5) rocksA.push(item);
        else rocksC.push(item);
        if (item.snowY !== null) snow.push({ x: p.x, y: item.snowY, z: p.z, s: item.snowS });
      }
    }
    return { rocksA, rocksC, snow };
  }, []);

  return (
    <group>
      <RockField path={ROCK_A} items={rocksA} />
      <RockField path={ROCK_C} items={rocksC} />
      <Instances limit={60} castShadow frustumCulled={false}>
        <icosahedronGeometry args={[0.32, 0]} />
        <meshStandardMaterial color="#eef2f6" roughness={0.55} flatShading />
        {snow.map((s, i) => (
          <Instance key={i} position={[s.x, s.y, s.z]} scale={[s.s, s.s * 0.55, s.s]} />
        ))}
      </Instances>
    </group>
  );
}
