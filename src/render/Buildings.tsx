// Buildings render as KayKit Medieval Hexagon Pack models (CC0, see
// public/models/kaykit/LICENSE.txt), normalized to cell size, with a short
// grow-in animation on construction. The fire hearth is a procedural campfire.

import { Clone, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { axialToWorld } from '../sim';
import { useGame } from '../state/store';
import { cellTopY, HEX_SIZE } from './World';

// Paths go through BASE_URL so they resolve when the site is served from a
// subpath (e.g. GitHub Pages).
const MODELS: Record<string, string> = {
  forager_camp: `${import.meta.env.BASE_URL}models/kaykit/building_home_A_red.gltf`,
  polyculture_plot: `${import.meta.env.BASE_URL}models/kaykit/building_grain.gltf`,
  granary: `${import.meta.env.BASE_URL}models/kaykit/building_windmill_red.gltf`,
  irrigation_channel: `${import.meta.env.BASE_URL}models/kaykit/building_watermill_red.gltf`,
  smithy: `${import.meta.env.BASE_URL}models/kaykit/building_blacksmith_red.gltf`,
  trade_post: `${import.meta.env.BASE_URL}models/kaykit/building_market_red.gltf`,
  well: `${import.meta.env.BASE_URL}models/kaykit/building_well_red.gltf`,
  sawmill: `${import.meta.env.BASE_URL}models/kaykit/building_lumbermill_red.gltf`,
  ore_mine: `${import.meta.env.BASE_URL}models/kaykit/building_mine_red.gltf`,
};

for (const path of Object.values(MODELS)) useGLTF.preload(path);

const TARGET_FOOTPRINT = 1.5; // world units across — fits inside a hex cell

/** Scale-in ease for newly built structures (frame-rate smooth). */
function GrowIn({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    const s = THREE.MathUtils.damp(g.scale.x, 1, 4, delta);
    g.scale.setScalar(s);
  });
  return (
    <group ref={ref} scale={0.02}>
      {children}
    </group>
  );
}

function KayKitBuilding({ path }: { path: string }) {
  const { scene } = useGLTF(path);
  const { scale, yOffset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const s = TARGET_FOOTPRINT / Math.max(size.x, size.z, 0.001);
    return { scale: s, yOffset: -box.min.y * s };
  }, [scene]);
  return <Clone object={scene} scale={scale} position={[0, yOffset, 0]} castShadow receiveShadow />;
}

function Campfire() {
  const flame = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!flame.current) return;
    const f = 1 + Math.sin(clock.elapsedTime * 7) * 0.12;
    flame.current.scale.set(f, 1 / f, f);
  });
  const stones = useMemo(
    () => Array.from({ length: 6 }, (_, i) => ({
      x: Math.cos((i / 6) * Math.PI * 2) * 0.22,
      z: Math.sin((i / 6) * Math.PI * 2) * 0.22,
    })),
    [],
  );
  return (
    <group>
      {stones.map((p, i) => (
        <mesh key={i} position={[p.x, 0.05, p.z]} castShadow>
          <dodecahedronGeometry args={[0.07, 0]} />
          <meshStandardMaterial color="#8d8a93" roughness={0.9} />
        </mesh>
      ))}
      <mesh ref={flame} position={[0, 0.16, 0]}>
        <coneGeometry args={[0.12, 0.3, 6]} />
        <meshStandardMaterial color="#ff9c3f" emissive="#ff6a00" emissiveIntensity={2} />
      </mesh>
      <pointLight position={[0, 0.5, 0]} color="#ffb066" intensity={2} distance={4} decay={2} />
    </group>
  );
}

export function Buildings() {
  const buildings = useGame((g) => g.snap.buildings);
  const cells = useGame((g) => g.snap.cells);

  return (
    <group>
      {buildings.map((b) => {
        const cell = cells[b.cellId];
        if (!cell) return null;
        const { x, z } = axialToWorld(cell.q, cell.r, HEX_SIZE);
        const y = cellTopY(cell.id, cell.biome);
        const path = MODELS[b.id];
        return (
          <group key={`${b.cellId}-${b.id}`} position={[x, y, z]}>
            <GrowIn>{path ? <KayKitBuilding path={path} /> : <Campfire />}</GrowIn>
          </group>
        );
      })}
    </group>
  );
}
