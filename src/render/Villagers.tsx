// The settlement's people, made visible (the intimate-view warmth pillar).
// Simple low-poly figures scattered around building cells; their number tracks
// the citizen population, so a growing, thriving town is something you can
// literally watch fill with life. Positions are deterministic (seeded by index)
// and capped for performance — this is flavour, not simulation.

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { axialToWorld } from '../sim';
import { useGame } from '../state/store';
import { cellTopY, HEX_SIZE } from './World';

const MAX_VILLAGERS = 48;          // perf cap — beyond this, one figure = many people
const CITIZENS_PER_FIGURE = 2;     // each figure stands in for this many citizens

const SKIN = ['#e8b58a', '#c98b5e', '#9c6b43', '#f0c9a0'];
const CLOTHES = ['#7a8c5a', '#9c5c4a', '#5a708c', '#b58a4a', '#6a6f7a', '#8a6a8c'];

interface Figure {
  x: number;
  z: number;
  y: number;
  skin: string;
  cloth: string;
  phase: number; // bob offset so they don't move in lockstep
}

/** One little person: a clothed body, a head, a gentle idle bob. */
function Villager({ fig }: { fig: Figure }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = fig.y + Math.sin(clock.elapsedTime * 1.6 + fig.phase) * 0.015;
  });
  return (
    <group ref={ref} position={[fig.x, fig.y, fig.z]}>
      <mesh castShadow position={[0, 0.11, 0]}>
        <cylinderGeometry args={[0.05, 0.08, 0.22, 6]} />
        <meshStandardMaterial color={fig.cloth} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 0.27, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color={fig.skin} roughness={0.85} />
      </mesh>
    </group>
  );
}

export function Villagers() {
  const buildings = useGame((g) => g.snap.buildings);
  const cells = useGame((g) => g.snap.cells);
  const citizens = useGame((g) => g.snap.citizens);

  const figures = useMemo<Figure[]>(() => {
    if (buildings.length === 0) return [];
    const count = Math.min(MAX_VILLAGERS, Math.max(1, Math.round(citizens / CITIZENS_PER_FIGURE)));
    const out: Figure[] = [];
    for (let i = 0; i < count; i++) {
      // Spread people across building cells, round-robin.
      const b = buildings[i % buildings.length];
      const cell = cells[b.cellId];
      if (!cell) continue;
      const { x, z } = axialToWorld(cell.q, cell.r, HEX_SIZE);
      // Deterministic golden-angle scatter within the cell's footprint.
      const a = i * 2.39996;
      const r = HEX_SIZE * (0.35 + 0.45 * ((i * 0.6180339) % 1));
      out.push({
        x: x + Math.cos(a) * r,
        z: z + Math.sin(a) * r,
        y: cellTopY(cell.id, cell.biome),
        skin: SKIN[i % SKIN.length],
        cloth: CLOTHES[(i * 3) % CLOTHES.length],
        phase: (i * 1.7) % (Math.PI * 2),
      });
    }
    return out;
  }, [buildings, cells, citizens]);

  if (figures.length === 0) return null;
  return (
    <group>
      {figures.map((fig, i) => (
        <Villager key={i} fig={fig} />
      ))}
    </group>
  );
}
