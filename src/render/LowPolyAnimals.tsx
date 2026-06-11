// Simple procedural low-poly animals for the species without a CC0 model
// (boar, beaver, heron, bee). Built from primitives in the game's flat-shaded
// style so they sit in the 3D world properly — grounded, with depth — instead
// of reading as floating emoji cutouts. Each gets a gentle idle motion.

import type { ReactElement } from 'react';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';

type AnimalProps = { phase: number };

const FUR = '#9c6a3a';
const FUR_DARK = '#6e4a28';
const BOAR = '#5c4a3a';
const BOAR_DARK = '#473a2e';
const HERON_BODY = '#c9d2da';
const HERON_WING = '#8b97a3';
const BEAK = '#e0a33a';
const LEG = '#d8a24a';

// Gentle breathing/sway wrapper. amp/speed tuned per animal by the caller.
function Idle({ phase, amp = 0.04, speed = 2, children }: AnimalProps & { amp?: number; speed?: number; children: React.ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime * speed + phase;
    g.position.y = Math.sin(t) * amp;
    g.rotation.z = Math.sin(t * 0.7) * amp * 0.5;
  });
  return <group ref={ref}>{children}</group>;
}

function mat(color: string, flat = true) {
  return <meshStandardMaterial color={color} roughness={0.85} flatShading={flat} />;
}

// ---- Beaver: rounded body, head, paddle tail, ears ----
export function Beaver({ phase }: AnimalProps) {
  return (
    <Idle phase={phase} amp={0.03} speed={2.2}>
      <group scale={0.62}>
        {/* body */}
        <mesh position={[0, 0.34, 0]} scale={[0.7, 0.78, 0.62]} castShadow>
          <icosahedronGeometry args={[0.5, 1]} />
          {mat(FUR)}
        </mesh>
        {/* head */}
        <mesh position={[0, 0.66, 0.34]} scale={[0.5, 0.46, 0.5]} castShadow>
          <icosahedronGeometry args={[0.5, 1]} />
          {mat(FUR)}
        </mesh>
        {/* ears */}
        {[-0.14, 0.14].map((x) => (
          <mesh key={x} position={[x, 0.86, 0.34]} scale={0.07} castShadow>
            <icosahedronGeometry args={[1, 0]} />
            {mat(FUR_DARK)}
          </mesh>
        ))}
        {/* paddle tail */}
        <mesh position={[0, 0.18, -0.42]} rotation={[0.5, 0, 0]} scale={[0.34, 0.06, 0.4]} castShadow>
          <boxGeometry args={[1, 1, 1]} />
          {mat(FUR_DARK)}
        </mesh>
        {/* eyes */}
        {[-0.12, 0.12].map((x) => (
          <mesh key={x} position={[x, 0.72, 0.56]} scale={0.04}>
            <icosahedronGeometry args={[1, 0]} />
            {mat('#22191100', false)}
          </mesh>
        ))}
      </group>
    </Idle>
  );
}

// ---- Boar: stocky body, snout, tusks, legs ----
export function Boar({ phase }: AnimalProps) {
  return (
    <Idle phase={phase} amp={0.025} speed={2.6}>
      <group scale={0.7}>
        {/* body */}
        <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.55, 0.95, 0.5]} castShadow>
          <icosahedronGeometry args={[0.5, 1]} />
          {mat(BOAR)}
        </mesh>
        {/* head/snout forward */}
        <mesh position={[0, 0.46, 0.5]} rotation={[Math.PI / 2, 0, 0]} scale={[0.34, 0.42, 0.34]} castShadow>
          <coneGeometry args={[0.5, 1, 7]} />
          {mat(BOAR_DARK)}
        </mesh>
        {/* tusks */}
        {[-0.1, 0.1].map((x) => (
          <mesh key={x} position={[x, 0.4, 0.66]} rotation={[-0.5, 0, 0]} scale={[0.03, 0.12, 0.03]} castShadow>
            <coneGeometry args={[0.5, 1, 5]} />
            {mat('#eee6d0')}
          </mesh>
        ))}
        {/* ears */}
        {[-0.16, 0.16].map((x) => (
          <mesh key={x} position={[x, 0.66, 0.34]} rotation={[0, 0, 0]} scale={[0.1, 0.14, 0.05]} castShadow>
            <coneGeometry args={[0.5, 1, 4]} />
            {mat(BOAR_DARK)}
          </mesh>
        ))}
        {/* legs */}
        {[[-0.18, 0.28], [0.18, 0.28], [-0.18, -0.28], [0.18, -0.28]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.14, z]} scale={[0.06, 0.28, 0.06]} castShadow>
            <cylinderGeometry args={[0.5, 0.5, 1, 5]} />
            {mat(BOAR_DARK)}
          </mesh>
        ))}
      </group>
    </Idle>
  );
}

// ---- Heron: tall thin body, long neck, beak, legs ----
export function Heron({ phase }: AnimalProps) {
  return (
    <Idle phase={phase} amp={0.02} speed={1.6}>
      <group scale={0.62}>
        {/* legs */}
        {[-0.08, 0.08].map((x) => (
          <mesh key={x} position={[x, 0.32, 0]} scale={[0.025, 0.64, 0.025]} castShadow>
            <cylinderGeometry args={[0.5, 0.5, 1, 5]} />
            {mat(LEG)}
          </mesh>
        ))}
        {/* body */}
        <mesh position={[0, 0.78, 0]} rotation={[Math.PI / 2.4, 0, 0]} scale={[0.32, 0.5, 0.32]} castShadow>
          <icosahedronGeometry args={[0.5, 1]} />
          {mat(HERON_BODY)}
        </mesh>
        {/* wing accents */}
        <mesh position={[0, 0.8, -0.08]} rotation={[0.4, 0, 0]} scale={[0.3, 0.36, 0.12]} castShadow>
          <icosahedronGeometry args={[0.5, 1]} />
          {mat(HERON_WING)}
        </mesh>
        {/* neck */}
        <mesh position={[0, 1.08, 0.08]} rotation={[-0.3, 0, 0]} scale={[0.05, 0.42, 0.05]} castShadow>
          <cylinderGeometry args={[0.5, 0.5, 1, 6]} />
          {mat(HERON_BODY)}
        </mesh>
        {/* head */}
        <mesh position={[0, 1.32, 0.18]} scale={0.1} castShadow>
          <icosahedronGeometry args={[1, 1]} />
          {mat(HERON_BODY)}
        </mesh>
        {/* beak */}
        <mesh position={[0, 1.32, 0.34]} rotation={[Math.PI / 2, 0, 0]} scale={[0.03, 0.18, 0.03]} castShadow>
          <coneGeometry args={[0.5, 1, 5]} />
          {mat(BEAK)}
        </mesh>
      </group>
    </Idle>
  );
}

// ---- Bee: striped body, wings; hovers ----
export function Bee({ phase }: AnimalProps) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime * 4 + phase;
    g.position.y = 0.55 + Math.sin(t) * 0.12; // hover
    g.rotation.y = Math.sin(t * 0.5) * 0.4;
  });
  return (
    <group ref={ref} scale={0.5}>
      {/* abdomen stripes */}
      <mesh position={[0, 0, 0]} scale={[0.42, 0.4, 0.55]} castShadow>
        <icosahedronGeometry args={[0.5, 1]} />
        {mat('#e8b21f')}
      </mesh>
      <mesh position={[0, 0, -0.06]} scale={[0.44, 0.42, 0.16]}>
        <icosahedronGeometry args={[0.5, 1]} />
        {mat('#2a2118')}
      </mesh>
      <mesh position={[0, 0, 0.18]} scale={[0.44, 0.42, 0.16]}>
        <icosahedronGeometry args={[0.5, 1]} />
        {mat('#2a2118')}
      </mesh>
      {/* head */}
      <mesh position={[0, 0.02, 0.34]} scale={0.18} castShadow>
        <icosahedronGeometry args={[1, 1]} />
        {mat('#2a2118')}
      </mesh>
      {/* wings */}
      {[-0.16, 0.16].map((x) => (
        <mesh key={x} position={[x, 0.18, -0.02]} rotation={[0.3, 0, x > 0 ? -0.4 : 0.4]} scale={[0.04, 0.22, 0.34]}>
          <icosahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial color="#eaf2ff" transparent opacity={0.55} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

export const LOW_POLY_ANIMALS: Record<string, { Comp: (p: AnimalProps) => ReactElement; labelY: number }> = {
  beaver: { Comp: Beaver, labelY: 0.9 },
  boar: { Comp: Boar, labelY: 0.95 },
  heron: { Comp: Heron, labelY: 1.1 },
  wild_bee: { Comp: Bee, labelY: 0.95 },
};
