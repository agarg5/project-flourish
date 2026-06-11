// Species markers, HoMM style: one representative creature + population count
// at the species' best-habitat cell. Species with a CC0 Quaternius model get
// an animated 3D representative; the rest use an emoji billboard that gently
// bobs. Every marker drops a soft contact shadow so it reads as grounded, not
// floating. Each species is offset within its cell so co-located species don't
// stack.

import { Billboard, Html, useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { axialToWorld } from '../sim';
import { useGame } from '../state/store';
import type { UICell, UISpecies } from '../state/store';
import { cellHash } from './cellVisuals';
import { LOW_POLY_ANIMALS } from './LowPolyAnimals';
import { cellTopY, HEX_SIZE } from './World';

// Committed, always-present models.
const ANIMAL_MODELS: Record<string, { path: string; height: number; clip: string }> = {
  deer: { path: `${import.meta.env.BASE_URL}models/quaternius/Stag.gltf`, height: 1.15, clip: 'Eating' },
  wolf: { path: `${import.meta.env.BASE_URL}models/quaternius/Wolf.gltf`, height: 0.85, clip: 'Idle' },
};

for (const m of Object.values(ANIMAL_MODELS)) useGLTF.preload(m.path);

// Drop-in slots: place a generated GLB at public/models/animals/<id>.glb and it
// auto-replaces the procedural creature (see public/models/animals/README.md).
// Detected at runtime so a missing file simply falls back — no code change.
const OPTIONAL_MODELS: Record<string, { path: string; height: number }> = {
  beaver: { path: `${import.meta.env.BASE_URL}models/animals/beaver.glb`, height: 0.6 },
  boar: { path: `${import.meta.env.BASE_URL}models/animals/boar.glb`, height: 0.7 },
  heron: { path: `${import.meta.env.BASE_URL}models/animals/heron.glb`, height: 1.1 },
  wild_bee: { path: `${import.meta.env.BASE_URL}models/animals/bee.glb`, height: 0.35 },
};

// HEAD-check a model URL once (module-cached) so dropped-in files appear and
// absent ones fall back without console 404 noise from useGLTF.
const existCache = new Map<string, boolean | Promise<boolean>>();
function useModelExists(url: string | undefined): boolean {
  const [exists, setExists] = useState(() => (url ? existCache.get(url) === true : false));
  useEffect(() => {
    if (!url) return;
    const cached = existCache.get(url);
    if (typeof cached === 'boolean') {
      setExists(cached);
      return;
    }
    // Dev servers answer missing paths with the SPA index.html fallback (200),
    // so "ok" alone isn't proof the model exists — reject HTML responses.
    const p =
      (cached as Promise<boolean>) ??
      fetch(url, { method: 'HEAD' })
        .then((r) => r.ok && !(r.headers.get('content-type') ?? '').includes('text/html'))
        .catch(() => false);
    existCache.set(url, p);
    let alive = true;
    p.then((ok) => {
      existCache.set(url, ok);
      if (alive) setExists(ok);
    });
    return () => {
      alive = false;
    };
  }, [url]);
  return exists;
}

// Stable string hash -> 0..1, so a species' in-cell offset never changes.
function strHash(s: string, salt: number): number {
  let h = salt * 2654435761;
  for (let i = 0; i < s.length; i++) h = (h ^ s.charCodeAt(i)) * 16777619;
  return ((h >>> 0) % 10000) / 10000;
}

/** Soft round shadow on the ground that anchors a marker to the terrain. */
function ContactShadow({ radius }: { radius: number }) {
  return (
    <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[radius, 20]} />
      <meshBasicMaterial color="#0a160d" transparent opacity={0.28} depthWrite={false} />
    </mesh>
  );
}

/** Constant screen-size count label (no distanceFactor — stays a small nameplate). */
function CountLabel({ population, y }: { population: number; y: number }) {
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
        ×{population}
      </div>
    </Html>
  );
}

// The emoji rendered to a texture so it can live as a real billboard plane IN
// the 3D scene (proper depth + occlusion) standing on the ground — DOM overlays
// always read as floating. Cached per emoji.
const emojiTextureCache = new Map<string, THREE.CanvasTexture>();
function emojiTexture(emoji: string): THREE.CanvasTexture {
  let tex = emojiTextureCache.get(emoji);
  if (tex) return tex;
  const S = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  ctx.font = `${Math.round(S * 0.8)}px "Apple Color Emoji", "Segoe UI Emoji", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, S / 2, S * 0.56);
  tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  emojiTextureCache.set(emoji, tex);
  return tex;
}

const SPRITE_SIZE = 0.95;

// A billboard plane standing on the ground, gently bobbing — sits in the world
// like an RCT sprite, so it reads as grounded rather than a floating sticker.
function EmojiSprite({ emoji, phase }: { emoji: string; phase: number }) {
  const ref = useRef<THREE.Group>(null);
  const tex = useMemo(() => emojiTexture(emoji), [emoji]);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = SPRITE_SIZE / 2 + 0.05 + Math.sin(clock.elapsedTime * 1.8 + phase) * 0.06;
    }
  });
  return (
    <group ref={ref}>
      <Billboard follow lockX={false} lockZ={false}>
        <mesh>
          <planeGeometry args={[SPRITE_SIZE, SPRITE_SIZE]} />
          <meshBasicMaterial map={tex} transparent depthWrite={false} alphaTest={0.4} />
        </mesh>
      </Billboard>
    </group>
  );
}

interface ModelCfg {
  path: string;
  height: number;
  clip?: string;
}

function AnimalModel({ cfg, seed }: { cfg: ModelCfg; seed: number }) {
  const { scene, animations } = useGLTF(cfg.path);
  // Skinned meshes must be cloned with SkeletonUtils, not plain clone.
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const group = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    const action = (cfg.clip ? actions[cfg.clip] : undefined) ?? Object.values(actions)[0];
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

// One species marker. Art priority: committed model > dropped-in GLB (if
// present) > procedural low-poly > emoji sprite.
function CreatureMarker({ sp, cell, slot, slotCount }: { sp: UISpecies; cell: UICell; slot: number; slotCount: number }) {
  const { x, z } = axialToWorld(cell.q, cell.r, HEX_SIZE);
  const onWater = cell.biome === 'wetland' || cell.biome === 'coast_shallow';
  const y = cellTopY(cell.id, cell.biome) + (onWater ? 0.12 : 0);
  // Species sharing a cell get evenly-spaced slots around the centre so the
  // animals never stand inside each other (hash-only angles can collide).
  const ang =
    slotCount > 1
      ? (slot / slotCount) * Math.PI * 2 + strHash(sp.id, 1) * (Math.PI / slotCount) * 0.5
      : strHash(sp.id, 1) * Math.PI * 2;
  const rad = slotCount > 1 ? 0.55 + strHash(sp.id, 2) * 0.2 : 0.45 + strHash(sp.id, 2) * 0.4;
  const ox = Math.cos(ang) * rad;
  const oz = Math.sin(ang) * rad;
  const labelLift = strHash(sp.id, 5) * 0.3;
  const phase = strHash(sp.id, 9) * Math.PI * 2;
  const seed = cell.id * 17 + sp.id.length;

  const committed = ANIMAL_MODELS[sp.id];
  const optional = OPTIONAL_MODELS[sp.id];
  const optionalReady = useModelExists(optional?.path);
  const lowPoly = LOW_POLY_ANIMALS[sp.id];

  const cfg: ModelCfg | null = committed ?? (optional && optionalReady ? optional : null);

  let art: React.ReactNode;
  if (cfg) {
    art = (
      <Suspense fallback={lowPoly ? <lowPoly.Comp phase={phase} /> : null}>
        <ContactShadow radius={cfg.height * 0.34} />
        <AnimalModel cfg={cfg} seed={seed} />
        <CountLabel population={sp.population} y={cfg.height + 0.25 + labelLift} />
      </Suspense>
    );
  } else if (lowPoly) {
    art = (
      <>
        <ContactShadow radius={0.3} />
        <lowPoly.Comp phase={phase} />
        <CountLabel population={sp.population} y={lowPoly.labelY + 0.2 + labelLift} />
      </>
    );
  } else {
    art = (
      <>
        <ContactShadow radius={0.34} />
        <EmojiSprite emoji={sp.emoji} phase={phase} />
        <CountLabel population={sp.population} y={SPRITE_SIZE + 0.25 + labelLift} />
      </>
    );
  }

  return <group position={[x + ox, y, z + oz]}>{art}</group>;
}

export function Creatures() {
  const snap = useGame((g) => g.snap);
  const cellById = new Map(snap.cells.map((c) => [c.id, c]));

  // Which species share a marker cell (common at world start, when one prime
  // habitat cell wins several species' markers).
  const cellMates = new Map<number, string[]>();
  for (const sp of snap.species) {
    const arr = cellMates.get(sp.markerCellId) ?? [];
    arr.push(sp.id);
    cellMates.set(sp.markerCellId, arr);
  }

  return (
    <group>
      {snap.species.map((sp) => {
        const cell = cellById.get(sp.markerCellId);
        if (!cell) return null;
        const mates = cellMates.get(sp.markerCellId)!;
        return (
          <CreatureMarker
            key={sp.id}
            sp={sp}
            cell={cell}
            slot={mates.indexOf(sp.id)}
            slotCount={mates.length}
          />
        );
      })}
    </group>
  );
}
