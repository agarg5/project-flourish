// Species markers, HoMM style: one representative creature + population count
// at the species' best-habitat cell. Species with a CC0 Quaternius model get
// an animated 3D representative; the rest use an emoji billboard. Each species
// is offset within its cell by a stable hash so co-located species don't stack.

import { Html, useAnimations, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { axialToWorld } from '../sim';
import { useGame } from '../state/store';
import type { UISpecies } from '../state/store';
import { cellHash } from './cellVisuals';
import { cellTopY, HEX_SIZE } from './World';

const ANIMAL_MODELS: Record<string, { path: string; height: number; clip: string }> = {
  deer: { path: `${import.meta.env.BASE_URL}models/quaternius/Stag.gltf`, height: 0.7, clip: 'Eating' },
  wolf: { path: `${import.meta.env.BASE_URL}models/quaternius/Wolf.gltf`, height: 0.55, clip: 'Idle' },
};

for (const m of Object.values(ANIMAL_MODELS)) useGLTF.preload(m.path);

// Stable string hash -> 0..1, so a species' in-cell offset never changes.
function strHash(s: string, salt: number): number {
  let h = salt * 2654435761;
  for (let i = 0; i < s.length; i++) h = (h ^ s.charCodeAt(i)) * 16777619;
  return ((h >>> 0) % 10000) / 10000;
}

/** Constant screen-size count label (no distanceFactor — stays a small nameplate). */
function CountLabel({ population, emoji, y }: { population: number; emoji?: string; y: number }) {
  return (
    <Html position={[0, y, 0]} center sprite style={{ pointerEvents: 'none', userSelect: 'none' }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#f4f1e8',
          textShadow: '0 1px 3px rgba(10,20,12,0.95)',
          fontFamily: 'system-ui, sans-serif',
          whiteSpace: 'nowrap',
        }}
      >
        {emoji ? `${emoji} ` : ''}×{population}
      </div>
    </Html>
  );
}

function EmojiBillboard({ emoji }: { emoji: string }) {
  return (
    <Html position={[0, 0.5, 0]} center sprite style={{ pointerEvents: 'none', userSelect: 'none' }}>
      <div style={{ fontSize: 30, lineHeight: 1 }}>{emoji}</div>
    </Html>
  );
}

function AnimalModel({ sp, seed }: { sp: UISpecies; seed: number }) {
  const cfg = ANIMAL_MODELS[sp.id];
  const { scene, animations } = useGLTF(cfg.path);
  // Skinned meshes must be cloned with SkeletonUtils, not plain clone.
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const group = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    const action = actions[cfg.clip] ?? Object.values(actions)[0];
    if (!action) return;
    action.reset();
    // Desync individuals so two animals never move in lockstep.
    action.time = cellHash(seed, 7) * (action.getClip().duration || 1);
    action.play();
    return () => {
      action.stop();
    };
  }, [actions, cfg.clip, seed]);

  const scale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    return cfg.height / Math.max(size.y, 0.001);
  }, [cloned, cfg.height]);

  return (
    <group ref={group} rotation={[0, cellHash(seed, 11) * Math.PI * 2, 0]} scale={scale}>
      <primitive object={cloned} />
    </group>
  );
}

export function Creatures() {
  const snap = useGame((g) => g.snap);
  const cellById = new Map(snap.cells.map((c) => [c.id, c]));

  return (
    <group>
      {snap.species.map((sp) => {
        const cell = cellById.get(sp.markerCellId);
        if (!cell) return null;
        const { x, z } = axialToWorld(cell.q, cell.r, HEX_SIZE);
        const y = cellTopY(cell.id, cell.biome);
        // Spread co-located species to distinct spots within the cell.
        const ang = strHash(sp.id, 1) * Math.PI * 2;
        const rad = 0.3 + strHash(sp.id, 2) * 0.25;
        const ox = Math.cos(ang) * rad;
        const oz = Math.sin(ang) * rad;
        const model = ANIMAL_MODELS[sp.id];
        return (
          <group key={sp.id} position={[x + ox, y, z + oz]}>
            {model ? (
              <Suspense fallback={<EmojiBillboard emoji={sp.emoji} />}>
                <AnimalModel sp={sp} seed={cell.id * 17 + sp.id.length} />
                <CountLabel population={sp.population} y={model.height + 0.25} />
              </Suspense>
            ) : (
              <>
                <EmojiBillboard emoji={sp.emoji} />
                <CountLabel population={sp.population} y={0.95} />
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}
