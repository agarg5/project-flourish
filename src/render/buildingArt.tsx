// Procedural eco-futurist ("solarpunk") architecture — the civilization the
// vision doc asks for: hopeful, inspiring, flourishing WITH nature across ages
// of technology. Built in code (like the animals and mountains) rather than
// from downloaded models, with a shared visual language — warm cream shells,
// teal glass, living green terraces, dark solar skin, soft warm/cyan glow —
// that grows from humble organic pods (Stone Age) to soaring arcologies
// (Stewardship Age). Each building sits with its base on y=0; the parent group
// positions it on the cell and plays the grow-in.

import { useMemo } from 'react';
import * as THREE from 'three';

// --- Shared palette. One material instance per look, reused across every
// building so we never allocate materials per placement. ---
const MAT = {
  shell: new THREE.MeshStandardMaterial({ color: '#ece4d2', roughness: 0.72 }),
  shellDark: new THREE.MeshStandardMaterial({ color: '#c8ba9f', roughness: 0.85 }),
  glass: new THREE.MeshStandardMaterial({
    color: '#7fd0c6', roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.5,
  }),
  solar: new THREE.MeshStandardMaterial({ color: '#26344f', roughness: 0.35, metalness: 0.45 }),
  leaf: new THREE.MeshStandardMaterial({ color: '#6fa368', roughness: 0.82 }),
  leafDark: new THREE.MeshStandardMaterial({ color: '#537f4c', roughness: 0.85 }),
  metal: new THREE.MeshStandardMaterial({ color: '#d6d0c2', roughness: 0.4, metalness: 0.55 }),
  wood: new THREE.MeshStandardMaterial({ color: '#a9784e', roughness: 0.8 }),
  glowWarm: new THREE.MeshStandardMaterial({
    color: '#ffe0b0', emissive: new THREE.Color('#ffb85c'), emissiveIntensity: 1.5, roughness: 0.3,
  }),
  glowCyan: new THREE.MeshStandardMaterial({
    color: '#c6f6ec', emissive: new THREE.Color('#4fe0c8'), emissiveIntensity: 2.1, roughness: 0.3,
  }),
  water: new THREE.MeshStandardMaterial({
    color: '#6db6c9', roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.72,
  }),
};

type Mat = THREE.Material;

// --- Small primitive helpers ---------------------------------------------

function Cyl({ r = 0.4, rt, h = 0.6, y = 0, mat = MAT.shell, seg = 20, castShadow = true }:
  { r?: number; rt?: number; h?: number; y?: number; mat?: Mat; seg?: number; castShadow?: boolean }) {
  return (
    <mesh position={[0, y + h / 2, 0]} material={mat} castShadow={castShadow} receiveShadow>
      <cylinderGeometry args={[rt ?? r, r, h, seg]} />
    </mesh>
  );
}

/** A hemisphere dome (flat side down). */
function Dome({ r = 0.5, y = 0, mat = MAT.shell, scaleY = 1 }:
  { r?: number; y?: number; mat?: Mat; scaleY?: number }) {
  return (
    <mesh position={[0, y, 0]} scale={[1, scaleY, 1]} material={mat} castShadow receiveShadow>
      <sphereGeometry args={[r, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
    </mesh>
  );
}

/** A thin glowing band around a cylinder (windows / energy lines). */
function Ring({ r = 0.42, y = 0.3, mat = MAT.glowWarm, tube = 0.03 }:
  { r?: number; y?: number; mat?: Mat; tube?: number }) {
  return (
    <mesh position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={mat}>
      <torusGeometry args={[r, tube, 8, 28]} />
    </mesh>
  );
}

/** N slender support legs on a circle (for canopies / lifted volumes). */
function Stilts({ n = 4, r = 0.42, h = 0.5, mat = MAT.metal, thick = 0.035 }:
  { n?: number; r?: number; h?: number; mat?: Mat; thick?: number }) {
  return (
    <group>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + Math.PI / n;
        return (
          <mesh key={i} position={[Math.cos(a) * r, h / 2, Math.sin(a) * r]} material={mat} castShadow>
            <cylinderGeometry args={[thick, thick, h, 6]} />
          </mesh>
        );
      })}
    </group>
  );
}

/** A tilted solar panel. */
function Panel({ x = 0, z = 0, y = 0.5, w = 0.5, d = 0.36, tilt = -0.5, mat = MAT.solar }:
  { x?: number; z?: number; y?: number; w?: number; d?: number; tilt?: number; mat?: Mat }) {
  return (
    <group position={[x, y, z]} rotation={[tilt, 0, 0]}>
      <mesh material={mat} castShadow>
        <boxGeometry args={[w, 0.02, d]} />
      </mesh>
    </group>
  );
}

/** A green planted terrace ring around a tower level. */
function Terrace({ r = 0.5, y = 0.6, mat = MAT.leaf }: { r?: number; y?: number; mat?: Mat }) {
  return (
    <mesh position={[0, y, 0]} material={mat} castShadow receiveShadow>
      <cylinderGeometry args={[r, r, 0.06, 20]} />
    </mesh>
  );
}

/** A cluster of little green blobs (rooftop / terrace planting). */
function Foliage({ y = 0.7, r = 0.3, n = 5, seed = 0 }: { y?: number; r?: number; n?: number; seed?: number }) {
  return (
    <group position={[0, y, 0]}>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + seed;
        const rr = r * (0.4 + ((i * 7 + seed * 13) % 10) / 16);
        return (
          <mesh key={i} position={[Math.cos(a) * rr, 0, Math.sin(a) * rr]} scale={0.12 + (i % 3) * 0.03}
            material={i % 2 ? MAT.leaf : MAT.leafDark} castShadow>
            <icosahedronGeometry args={[1, 0]} />
          </mesh>
        );
      })}
    </group>
  );
}

// --- Per-building compositions -------------------------------------------
// Kept small and readable; each reads top-to-bottom as a little structure.

function ForagerCamp() {
  // A humble woven bio-pod with a leaf canopy — the hopeful first shelter.
  return (
    <group>
      <Dome r={0.46} scaleY={0.9} mat={MAT.shell} />
      <mesh position={[0, 0.12, 0.4]} material={MAT.glowWarm}>
        <boxGeometry args={[0.16, 0.22, 0.06]} />
      </mesh>
      <Cyl r={0.02} h={0.5} y={0.4} mat={MAT.wood} seg={6} />
      <mesh position={[0.16, 0.78, 0]} rotation={[0, 0, -0.5]} scale={[0.34, 0.05, 0.28]} material={MAT.leaf} castShadow>
        <sphereGeometry args={[1, 10, 8]} />
      </mesh>
    </group>
  );
}

function Granary() {
  // Rounded silo, green cap, warm glow bands.
  return (
    <group>
      <Cyl r={0.4} h={0.9} mat={MAT.shell} />
      <Ring r={0.42} y={0.32} mat={MAT.glowWarm} />
      <Ring r={0.42} y={0.62} mat={MAT.glowWarm} />
      <Dome r={0.4} y={0.9} scaleY={0.7} mat={MAT.leaf} />
      <Foliage y={1.0} r={0.18} n={4} />
    </group>
  );
}

function PolyculturePlot() {
  // Low terraced planting beds — vertical agriculture, gentle.
  return (
    <group>
      {[0, 1, 2].map((i) => (
        <group key={i} position={[0, 0.06 + i * 0.14, (i - 1) * 0.22]}>
          <mesh material={MAT.wood} castShadow receiveShadow>
            <boxGeometry args={[0.95 - i * 0.12, 0.1, 0.28]} />
          </mesh>
          <mesh position={[0, 0.09, 0]} material={i % 2 ? MAT.leaf : MAT.leafDark} castShadow>
            <boxGeometry args={[0.9 - i * 0.12, 0.08, 0.22]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function IrrigationChannel() {
  // A sleek water arch feeding a bright channel.
  return (
    <group>
      <mesh position={[0, 0.06, 0]} material={MAT.water} receiveShadow>
        <boxGeometry args={[1.0, 0.08, 0.3]} />
      </mesh>
      <mesh position={[0, 0.42, 0]} rotation={[0, 0, 0]} material={MAT.metal} castShadow>
        <torusGeometry args={[0.34, 0.045, 8, 20, Math.PI]} />
      </mesh>
      <Ring r={0.36} y={0.42} mat={MAT.glowCyan} tube={0.02} />
    </group>
  );
}

function Smithy() {
  // A workshop pod with a warm forge glow venting from the roof.
  return (
    <group>
      <mesh position={[0, 0.3, 0]} material={MAT.shell} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.6, 0.7]} />
      </mesh>
      <Dome r={0.44} y={0.6} scaleY={0.5} mat={MAT.shellDark} />
      <Cyl r={0.09} h={0.35} y={0.7} mat={MAT.metal} seg={10} />
      <mesh position={[0, 1.06, 0]} material={MAT.glowWarm}>
        <icosahedronGeometry args={[0.09, 0]} />
      </mesh>
      <mesh position={[0, 0.24, 0.36]} material={MAT.glowWarm}>
        <boxGeometry args={[0.28, 0.24, 0.04]} />
      </mesh>
    </group>
  );
}

function TradePost() {
  // A canopy hub: a broad disc roof on slender supports over a glowing core.
  return (
    <group>
      <Stilts n={5} r={0.44} h={0.62} />
      <Cyl r={0.16} h={0.5} y={0.05} mat={MAT.glowCyan} seg={12} castShadow={false} />
      <mesh position={[0, 0.72, 0]} material={MAT.shell} castShadow receiveShadow>
        <cylinderGeometry args={[0.62, 0.66, 0.09, 6]} />
      </mesh>
      <Foliage y={0.79} r={0.4} n={6} seed={1} />
    </group>
  );
}

function Well() {
  // A slim water spire ringed with light.
  return (
    <group>
      <Cyl r={0.26} h={0.3} mat={MAT.shellDark} />
      <Cyl r={0.1} rt={0.07} h={0.7} y={0.3} mat={MAT.metal} seg={12} />
      <mesh position={[0, 1.02, 0]} material={MAT.glowCyan}>
        <icosahedronGeometry args={[0.12, 0]} />
      </mesh>
      <Ring r={0.28} y={0.32} mat={MAT.glowCyan} tube={0.02} />
    </group>
  );
}

function Sawmill() {
  // A long timber hall with a bright ring blade motif.
  return (
    <group>
      <mesh position={[0, 0.28, 0]} material={MAT.shell} castShadow receiveShadow>
        <boxGeometry args={[0.95, 0.56, 0.6]} />
      </mesh>
      <mesh position={[0, 0.62, 0]} rotation={[0, 0, 0]} material={MAT.wood} castShadow>
        <boxGeometry args={[1.0, 0.12, 0.66]} />
      </mesh>
      <mesh position={[0.5, 0.34, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT.metal} castShadow>
        <torusGeometry args={[0.2, 0.03, 6, 18]} />
      </mesh>
      <mesh position={[0, 0.3, 0.31]} material={MAT.glowWarm}>
        <boxGeometry args={[0.5, 0.2, 0.03]} />
      </mesh>
    </group>
  );
}

function OreMine() {
  // A minehead: an angular frame over a glowing shaft.
  return (
    <group>
      <Cyl r={0.42} h={0.22} mat={MAT.shellDark} />
      <mesh position={[0, 0.12, 0]} material={MAT.glowCyan}>
        <cylinderGeometry args={[0.2, 0.2, 0.06, 16]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.16, 0.5, 0]} rotation={[0, 0, s * 0.28]} material={MAT.metal} castShadow>
          <boxGeometry args={[0.06, 0.9, 0.06]} />
        </mesh>
      ))}
      <mesh position={[0, 0.96, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT.metal} castShadow>
        <torusGeometry args={[0.14, 0.03, 6, 16]} />
      </mesh>
    </group>
  );
}

function SolarArray() {
  // Rows of tilted photovoltaic panels — clean and iconic.
  return (
    <group>
      <mesh position={[0, 0.04, 0]} material={MAT.shellDark} receiveShadow>
        <boxGeometry args={[1.0, 0.06, 0.9]} />
      </mesh>
      {[-0.3, 0.02, 0.34].map((z, i) => (
        <group key={i}>
          <Panel x={-0.26} z={z} y={0.28} w={0.42} d={0.3} />
          <Panel x={0.26} z={z} y={0.28} w={0.42} d={0.3} />
        </group>
      ))}
      <mesh position={[0, 0.12, -0.5]} material={MAT.glowCyan}>
        <boxGeometry args={[0.5, 0.04, 0.04]} />
      </mesh>
    </group>
  );
}

function GreenTower() {
  // A tapered tower ringed with planted terraces and lit windows.
  return (
    <group>
      <Cyl r={0.4} rt={0.28} h={1.7} mat={MAT.shell} />
      {[0.45, 0.9, 1.35].map((y, i) => (
        <group key={i}>
          <Terrace r={0.44 - i * 0.05} y={y} />
          <Foliage y={y + 0.05} r={0.4 - i * 0.05} n={6} seed={i} />
        </group>
      ))}
      <Ring r={0.3} y={1.55} mat={MAT.glowWarm} tube={0.025} />
      <Dome r={0.28} y={1.7} scaleY={0.6} mat={MAT.glass} />
    </group>
  );
}

function LivingBuilding() {
  // An organic curved shell wrapped in greenery and soft light.
  return (
    <group>
      <mesh position={[0, 0.5, 0]} scale={[0.55, 0.62, 0.45]} material={MAT.shell} castShadow receiveShadow>
        <sphereGeometry args={[1, 20, 16]} />
      </mesh>
      <mesh position={[0, 0.5, 0]} rotation={[0, 0.6, 0.2]} material={MAT.glass}>
        <torusGeometry args={[0.5, 0.09, 10, 28]} />
      </mesh>
      <Foliage y={0.9} r={0.32} n={7} seed={2} />
      <Foliage y={0.3} r={0.44} n={6} seed={4} />
      <mesh position={[0, 0.5, 0.42]} material={MAT.glowWarm}>
        <boxGeometry args={[0.14, 0.5, 0.04]} />
      </mesh>
    </group>
  );
}

function VerticalFarm() {
  // A stacked tower of glowing green grow-tiers behind glass.
  return (
    <group>
      <Cyl r={0.36} h={1.9} mat={MAT.glass} seg={6} castShadow={false} />
      {[0.25, 0.6, 0.95, 1.3, 1.65].map((y, i) => (
        <group key={i}>
          <mesh position={[0, y, 0]} material={MAT.leaf} castShadow>
            <cylinderGeometry args={[0.34, 0.34, 0.12, 6]} />
          </mesh>
          <Ring r={0.35} y={y + 0.09} mat={MAT.glowCyan} tube={0.015} />
        </group>
      ))}
      <mesh position={[0, 1.98, 0]} material={MAT.metal} castShadow>
        <cylinderGeometry args={[0.2, 0.36, 0.12, 6]} />
      </mesh>
    </group>
  );
}

function FusionPlant() {
  // A containment dome around a bright cyan energy core.
  return (
    <group>
      <Cyl r={0.55} h={0.3} mat={MAT.shellDark} />
      <mesh position={[0, 0.55, 0]} material={MAT.glowCyan}>
        <icosahedronGeometry args={[0.24, 1]} />
      </mesh>
      <Ring r={0.34} y={0.55} mat={MAT.glowCyan} tube={0.03} />
      <mesh position={[0, 0.55, 0]} rotation={[Math.PI / 2.6, 0.4, 0]} material={MAT.glowCyan}>
        <torusGeometry args={[0.34, 0.02, 8, 24]} />
      </mesh>
      <mesh position={[0, 0.5, 0]} scale={[1, 1, 1]} material={MAT.glass}>
        <sphereGeometry args={[0.6, 22, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.5, 0.34, Math.sin(a) * 0.5]} material={MAT.metal} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
          </mesh>
        );
      })}
    </group>
  );
}

function Arcology() {
  // The crown: a soaring terraced megastructure, green and luminous.
  return (
    <group>
      <Cyl r={0.62} rt={0.5} h={0.5} mat={MAT.shell} />
      <Cyl r={0.46} rt={0.34} h={0.5} y={0.5} mat={MAT.shell} />
      <Cyl r={0.3} rt={0.2} h={0.5} y={1.0} mat={MAT.shell} />
      {[0.5, 1.0, 1.5].map((y, i) => (
        <group key={i}>
          <Terrace r={0.66 - i * 0.16} y={y} mat={MAT.leaf} />
          <Foliage y={y + 0.05} r={0.6 - i * 0.16} n={8} seed={i * 3} />
          <Ring r={0.52 - i * 0.16} y={y - 0.18} mat={MAT.glowWarm} tube={0.02} />
        </group>
      ))}
      <Dome r={0.24} y={1.5} scaleY={0.9} mat={MAT.glass} />
      <mesh position={[0, 1.86, 0]} material={MAT.glowCyan}>
        <icosahedronGeometry args={[0.08, 0]} />
      </mesh>
    </group>
  );
}

const BUILDERS: Record<string, () => React.ReactElement> = {
  forager_camp: ForagerCamp,
  granary: Granary,
  polyculture_plot: PolyculturePlot,
  irrigation_channel: IrrigationChannel,
  smithy: Smithy,
  trade_post: TradePost,
  well: Well,
  sawmill: Sawmill,
  ore_mine: OreMine,
  solar_array: SolarArray,
  green_tower: GreenTower,
  living_building: LivingBuilding,
  vertical_farm: VerticalFarm,
  fusion_plant: FusionPlant,
  arcology: Arcology,
};

/** A clean generic structure for any building without a bespoke form. */
function Generic() {
  return (
    <group>
      <Cyl r={0.4} rt={0.34} h={0.8} mat={MAT.shell} />
      <Ring r={0.38} y={0.5} mat={MAT.glowWarm} />
      <Dome r={0.34} y={0.8} scaleY={0.7} mat={MAT.glass} />
      <Foliage y={0.86} r={0.2} n={4} />
    </group>
  );
}

export function BuildingArt({ id }: { id: string }) {
  const Comp = useMemo(() => BUILDERS[id] ?? Generic, [id]);
  return <Comp />;
}
