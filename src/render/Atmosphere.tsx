// Ambient life for the scene: still water insets on wetland cells and a few
// KayKit clouds drifting overhead, their shadows sweeping the terrain.

import { Clone, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { axialToWorld } from '../sim';
import { useGame } from '../state/store';
import { cellHash, cellHeight, HEX_SIZE } from './cellVisuals';

// Water is a SINGLE merged surface over all wetland/coast cells, not per-cell
// translucent discs: overlapping translucent discs stack their opacity and
// darken to near-black triangles at every 3-cell junction. One merged mesh
// draws each pixel once, so the sheet is uniform.
export function WetlandWater() {
  const cells = useGame((g) => g.snap.cells);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geometry = useMemo(() => {
    const hexes = cells
      .filter((c) => c.biome === 'wetland' || c.biome === 'coast_shallow')
      .map((c) => {
        const { x, z } = axialToWorld(c.q, c.r, HEX_SIZE);
        // Flat pointy-top hexagon cap, slightly oversized to tile flush.
        const hex = new THREE.CircleGeometry(HEX_SIZE * 1.02, 6, Math.PI / 6);
        hex.rotateX(-Math.PI / 2);
        hex.translate(x, cellHeight(c.id, c.biome) + 0.04, z);
        return hex;
      });
    return hexes.length ? mergeGeometries(hexes) : null;
  }, []);

  if (!geometry) return null;
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial
        color="#3d8294"
        transparent
        opacity={0.78}
        roughness={0.12}
        metalness={0.1}
      />
    </mesh>
  );
}

const CLOUDS = [
  { path: `${import.meta.env.BASE_URL}models/kaykit/cloud_big.gltf`, x: -16, z: -6, y: 11, speed: 0.22, width: 3.2 },
  { path: `${import.meta.env.BASE_URL}models/kaykit/cloud_small.gltf`, x: 4, z: 5, y: 12.5, speed: 0.3, width: 2.2 },
  { path: `${import.meta.env.BASE_URL}models/kaykit/cloud_big.gltf`, x: 12, z: -11, y: 13, speed: 0.18, width: 2.6 },
  { path: `${import.meta.env.BASE_URL}models/kaykit/cloud_small.gltf`, x: -7, z: 11, y: 12, speed: 0.26, width: 1.8 },
];

for (const c of CLOUDS) useGLTF.preload(c.path);

const DRIFT_EXTENT = 26; // wrap-around bounds, beyond the fog line

function Cloud({ cfg, index }: { cfg: (typeof CLOUDS)[number]; index: number }) {
  const { scene } = useGLTF(cfg.path);
  const ref = useRef<THREE.Group>(null);

  // Normalize so `width` means world units, whatever the model's native size.
  const scale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    return cfg.width / Math.max(size.x, size.z, 0.001);
  }, [scene, cfg.width]);

  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    g.position.x += cfg.speed * delta;
    if (g.position.x > DRIFT_EXTENT) g.position.x = -DRIFT_EXTENT;
  });

  return (
    <group ref={ref} position={[cfg.x, cfg.y, cfg.z]} rotation={[0, cellHash(index, 3) * Math.PI, 0]}>
      <Clone object={scene} scale={scale} castShadow />
    </group>
  );
}

export function Clouds() {
  return (
    <group>
      {CLOUDS.map((cfg, i) => (
        <Cloud key={i} cfg={cfg} index={i} />
      ))}
    </group>
  );
}
