// Rounded, textured KayKit tree models (CC0) instead of procedural cones, for
// a warmer Age-of-Empires-ish forest. Each tree type is one InstancedMesh so
// the whole forest is a couple of draw calls. Density tracks habitat quality.

import { Instance, Instances, useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { axialToWorld } from '../sim';
import { useGame } from '../state/store';
import type { UICell } from '../state/store';
import { cellHash, cellHeight, HEX_SIZE, scatterInCell } from './cellVisuals';

const PINE = `${import.meta.env.BASE_URL}models/kaykit/tree_single_A.gltf`;
const BROADLEAF = `${import.meta.env.BASE_URL}models/kaykit/tree_single_B.gltf`;
useGLTF.preload(PINE);
useGLTF.preload(BROADLEAF);

interface TreeItem {
  x: number;
  y: number;
  z: number;
  s: number;
  ry: number;
}

function useTreeNode(path: string) {
  const { nodes, materials } = useGLTF(path);
  return useMemo(() => {
    const mesh = Object.values(nodes).find((n): n is THREE.Mesh => (n as THREE.Mesh).isMesh)!;
    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());
    return {
      geometry: mesh.geometry,
      material: Object.values(materials)[0] as THREE.Material,
      modelHeight: size.y,
      footY: -box.min.y, // lift so the trunk base sits on the ground
    };
  }, [nodes, materials]);
}

function TreeInstances({ path, items, targetHeight }: { path: string; items: TreeItem[]; targetHeight: number }) {
  const node = useTreeNode(path);
  const base = targetHeight / Math.max(node.modelHeight, 0.001);
  return (
    <Instances geometry={node.geometry} material={node.material} limit={700} castShadow receiveShadow>
      {items.map((it, i) => (
        <Instance
          key={i}
          position={[it.x, it.y + node.footY * base * it.s, it.z]}
          scale={base * it.s}
          rotation={[0, it.ry, 0]}
        />
      ))}
    </Instances>
  );
}

export function Trees() {
  const cells = useGame((g) => g.snap.cells);
  const sig = useMemo(
    () => cells.map((c) => `${c.biome[0]}${Math.round(c.quality * 5)}${c.buildingId ? 'b' : ''}`).join(''),
    [cells],
  );

  const { pines, broadleaf } = useMemo(() => {
    const pines: TreeItem[] = [];
    const broadleaf: TreeItem[] = [];
    for (const c of cells as UICell[]) {
      const { x, z } = axialToWorld(c.q, c.r, HEX_SIZE);
      const y = cellHeight(c.id, c.biome);
      const cleared = !!c.buildingId;
      if (c.biome === 'forest') {
        const n = cleared ? 1 : Math.max(1, Math.round(5 * Math.min(1, c.quality / 0.75)));
        for (let i = 0; i < n; i++) {
          const p = scatterInCell(x, z, c.id, i * 7 + 2, 0.62);
          // Mostly pines, a few broadleaf for variety.
          const item = { x: p.x, y, z: p.z, s: 0.8 + cellHash(c.id, i * 7 + 3) * 0.5, ry: cellHash(c.id, i) * Math.PI * 2 };
          if (cellHash(c.id, i * 5 + 9) < 0.78) pines.push(item);
          else broadleaf.push(item);
        }
      } else if (c.biome === 'grassland' && !cleared) {
        // Sparse lone trees dot the grassland.
        if (cellHash(c.id, 51) < 0.28) {
          const p = scatterInCell(x, z, c.id, 52, 0.45);
          broadleaf.push({ x: p.x, y, z: p.z, s: 0.7 + cellHash(c.id, 53) * 0.4, ry: cellHash(c.id, 54) * Math.PI * 2 });
        }
      }
    }
    return { pines, broadleaf };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  return (
    <group>
      <TreeInstances path={PINE} items={pines} targetHeight={1.1} />
      <TreeInstances path={BROADLEAF} items={broadleaf} targetHeight={0.95} />
    </group>
  );
}
