// Ambient life for the scene: still water insets on wetland cells and a few
// KayKit clouds drifting overhead, their shadows sweeping the terrain.

import { Clone, Instance, Instances, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { axialToWorld } from '../sim';
import { useGame } from '../state/store';
import { cellHash, cellHeight, HEX_SIZE } from './cellVisuals';

export function WetlandWater() {
  const cells = useGame((g) => g.snap.cells);
  // Biome layout is static; compute once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pools = useMemo(
    () =>
      cells
        .filter((c) => c.biome === 'wetland' || c.biome === 'coast_shallow')
        .map((c) => {
          const { x, z } = axialToWorld(c.q, c.r, HEX_SIZE);
          return { id: c.id, x, z, y: cellHeight(c.id, c.biome) + 0.02 };
        }),
    [],
  );

  return (
    <Instances limit={64} frustumCulled={false}>
      <cylinderGeometry args={[HEX_SIZE * 0.93, HEX_SIZE * 0.93, 0.02, 6, 1, false, Math.PI / 6]} />
      <meshStandardMaterial
        color="#3d8294"
        transparent
        opacity={0.55}
        roughness={0.15}
        metalness={0.1}
      />
      {pools.map((p) => (
        <Instance key={p.id} position={[p.x, p.y, p.z]} />
      ))}
    </Instances>
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
