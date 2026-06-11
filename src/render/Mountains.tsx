// Mountains built from KayKit rock models (CC0) clustered and stretched into
// craggy peaks, with snow caps placed at each rock's true top. One
// InstancedMesh per rock type keeps it cheap.

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
  snow: boolean;
}

function useRockNode(path: string) {
  const { nodes, materials } = useGLTF(path);
  return useMemo(() => {
    const mesh = Object.values(nodes).find((n): n is THREE.Mesh => (n as THREE.Mesh).isMesh)!;
    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());
    const unit = Math.max(size.x, size.z, 0.001);
    return {
      geometry: mesh.geometry,
      material: Object.values(materials)[0] as THREE.Material,
      unit,
      heightRatio: Math.max(size.y, 0.001) / unit, // model height per 1u width
      footY: -box.min.y / unit,
    };
  }, [nodes, materials]);
}

// Renders the rock instances AND their snow caps together, so the cap can use
// the model's real top (footY + heightRatio) instead of a guess.
function RockField({ path, items }: { path: string; items: RockItem[] }) {
  const node = useRockNode(path);
  const snowItems = items.filter((it) => it.snow);
  return (
    <group>
      <Instances geometry={node.geometry} material={node.material} limit={200} castShadow receiveShadow>
        {items.map((it, i) => (
          <Instance
            key={i}
            position={[it.x, it.y + node.footY * it.sy, it.z]}
            scale={[it.sx / node.unit, it.sy / node.unit, it.sx / node.unit]}
            rotation={[0, it.ry, 0]}
          />
        ))}
      </Instances>
      <Instances limit={200} castShadow frustumCulled={false}>
        <icosahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color="#eef2f6" roughness={0.55} flatShading />
        {snowItems.map((it, i) => {
          // Rock top = base + heightRatio scaled by sy; tuck the cap just under it.
          const topY = it.y + (node.footY + node.heightRatio) * it.sy;
          const capR = it.sx * 0.5;
          return (
            <Instance
              key={i}
              position={[it.x, topY - capR * 0.45, it.z]}
              scale={[capR, capR * 0.5, capR]}
              rotation={[0, it.ry, 0]}
            />
          );
        })}
      </Instances>
    </group>
  );
}

export function Mountains() {
  const cells = useGame((g) => g.snap.cells);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { rocksA, rocksC } = useMemo(() => {
    const rocksA: RockItem[] = [];
    const rocksC: RockItem[] = [];
    for (const c of cells) {
      if (c.biome !== 'mountain') continue;
      const { x, z } = axialToWorld(c.q, c.r, HEX_SIZE);
      const y = cellHeight(c.id, c.biome) - 0.05;
      const isCenter = c.q === 0 && c.r === 0;
      const lobes = 3;
      for (let i = 0; i < lobes; i++) {
        const main = i === 0;
        const p = main ? { x, z } : scatterInCell(x, z, c.id, 90 + i * 4, 0.55);
        const tall = (main ? (isCenter ? 4.6 : 3.2) : 1.8) + cellHash(c.id, 91 + i) * 1.0;
        const wide = (main ? 1.5 : 1.05) + cellHash(c.id, 92 + i) * 0.35;
        const item: RockItem = {
          x: p.x, y, z: p.z, sx: wide, sy: tall,
          ry: cellHash(c.id, 93 + i) * Math.PI * 2,
          snow: tall > 2.0,
        };
        if (cellHash(c.id, 94 + i) < 0.5) rocksA.push(item);
        else rocksC.push(item);
      }
    }
    return { rocksA, rocksC };
  }, []);

  return (
    <group>
      <RockField path={ROCK_A} items={rocksA} />
      <RockField path={ROCK_C} items={rocksC} />
    </group>
  );
}
