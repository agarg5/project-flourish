// Ambient life for the scene: still water insets on wetland cells and a few
// KayKit clouds drifting overhead, their shadows sweeping the terrain.

import { Clone, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CONFIG } from '../sim';
import { useGame } from '../state/store';
import { cellHash } from './cellVisuals';
import { buildWaterGeometry } from './terrain';

// Water is one continuous shared-vertex surface over the wetland (see
// terrain.ts), so it reads as a single pond rather than hexagonal plates.
export function WetlandWater() {
  const cells = useGame((g) => g.snap.cells);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geometry = useMemo(() => buildWaterGeometry(cells), []);
  if (!geometry) return null;
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial
        vertexColors
        transparent
        opacity={0.82}
        roughness={0.08}
        metalness={0.3}
        envMapIntensity={1.4}
      />
    </mesh>
  );
}

const CLOUDS = [
  { path: `${import.meta.env.BASE_URL}models/kaykit/cloud_big.gltf`, x: -16, z: -6, y: 11, speed: 0.22, width: 3.2 },
  { path: `${import.meta.env.BASE_URL}models/kaykit/cloud_small.gltf`, x: 4, z: 5, y: 12.5, speed: 0.3, width: 2.2 },
  { path: `${import.meta.env.BASE_URL}models/kaykit/cloud_big.gltf`, x: 12, z: -11, y: 13, speed: 0.18, width: 2.6 },
  { path: `${import.meta.env.BASE_URL}models/kaykit/cloud_small.gltf`, x: -7, z: 11, y: 12, speed: 0.26, width: 1.8 },
  { path: `${import.meta.env.BASE_URL}models/kaykit/cloud_big.gltf`, x: -2, z: 18, y: 12.8, speed: 0.2, width: 3.0 },
  { path: `${import.meta.env.BASE_URL}models/kaykit/cloud_small.gltf`, x: 18, z: 14, y: 11.6, speed: 0.28, width: 2.0 },
  { path: `${import.meta.env.BASE_URL}models/kaykit/cloud_big.gltf`, x: -20, z: -16, y: 13.4, speed: 0.16, width: 2.8 },
  { path: `${import.meta.env.BASE_URL}models/kaykit/cloud_big.gltf`, x: 30, z: -28, y: 12.2, speed: 0.24, width: 3.4 },
  { path: `${import.meta.env.BASE_URL}models/kaykit/cloud_small.gltf`, x: -34, z: 26, y: 13.0, speed: 0.3, width: 2.1 },
  { path: `${import.meta.env.BASE_URL}models/kaykit/cloud_big.gltf`, x: 8, z: 38, y: 12.6, speed: 0.18, width: 2.9 },
  { path: `${import.meta.env.BASE_URL}models/kaykit/cloud_small.gltf`, x: -28, z: -34, y: 11.8, speed: 0.26, width: 1.9 },
];

for (const c of CLOUDS) useGLTF.preload(c.path);

// Wrap-around bounds: just past the island edge, whatever the world radius.
const DRIFT_EXTENT = CONFIG.world.radius * Math.sqrt(3) + 4;

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
