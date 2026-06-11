// Mountains built from KayKit rock models (CC0) clustered and stretched into
// craggy peaks. Snow is baked into the rock geometry as vertex colours (white
// above a height line, grey below) so it follows the exact rock shape with no
// intersecting "collar" artifacts and never floats. One InstancedMesh per rock
// type keeps it cheap.

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

const ROCK_GREY = new THREE.Color('#53565f');
const SNOW_WHITE = new THREE.Color('#f0f4f9');
const SNOW_LINE = 0.62; // fraction of model height where snow begins
const SNOW_FULL = 0.8; // fully white above this fraction

interface RockItem {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  ry: number;
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function useSnowyRock(path: string) {
  const { nodes } = useGLTF(path);
  return useMemo(() => {
    const mesh = Object.values(nodes).find((n): n is THREE.Mesh => (n as THREE.Mesh).isMesh)!;
    mesh.updateWorldMatrix(true, false);
    // Bake the node transform so geometry is Y-up object space, then add
    // vertex colours by height for the snow line.
    const geo = mesh.geometry.clone();
    geo.applyMatrix4(mesh.matrixWorld);
    geo.computeBoundingBox();
    const box = geo.boundingBox!;
    const minY = box.min.y;
    const spanY = Math.max(box.max.y - minY, 1e-4);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const frac = (pos.getY(i) - minY) / spanY;
      const snow = smoothstep(SNOW_LINE, SNOW_FULL, frac);
      c.copy(ROCK_GREY).lerp(SNOW_WHITE, snow);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const size = box.getSize(new THREE.Vector3());
    return { geometry: geo, unit: Math.max(size.x, size.z, 1e-4), footY: -minY };
  }, [nodes]);
}

function RockField({ path, items }: { path: string; items: RockItem[] }) {
  const node = useSnowyRock(path);
  return (
    <Instances geometry={node.geometry} limit={200} castShadow receiveShadow frustumCulled={false}>
      <meshStandardMaterial vertexColors roughness={0.92} flatShading />
      {items.map((it, i) => (
        <Instance
          key={i}
          position={[it.x, it.y + node.footY * (it.sy / node.unit), it.z]}
          scale={[it.sx / node.unit, it.sy / node.unit, it.sx / node.unit]}
          rotation={[0, it.ry, 0]}
        />
      ))}
    </Instances>
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
