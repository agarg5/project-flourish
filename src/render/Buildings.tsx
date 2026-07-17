// Buildings render as procedural eco-futurist ("solarpunk") architecture — see
// buildingArt.tsx — normalized to cell size, with a short grow-in animation on
// construction. The fire hearth stays a warm procedural campfire.

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { axialToWorld } from '../sim';
import { useGame } from '../state/store';
import { BuildingArt } from './buildingArt';
import { cellTopY, HEX_SIZE } from './World';

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
        return (
          <group key={`${b.cellId}-${b.id}`} position={[x, y, z]}>
            <GrowIn>
              {/* The fire hearth keeps its warm procedural campfire; every other
                  building is procedural eco-futurist architecture (buildingArt). */}
              {b.id === 'fire_hearth' ? <Campfire /> : <BuildingArt id={b.id} />}
            </GrowIn>
          </group>
        );
      })}
    </group>
  );
}
