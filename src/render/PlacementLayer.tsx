// Pointer -> hex picking and the placement highlight. An invisible ground
// plane converts pointer position to the containing hex (no per-cell
// raycasting needed); a translucent hex ring shows hover + validity.

import { useMemo, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { axialToWorld, worldToAxial } from '../sim';
import { canPlaceAt, useGame } from '../state/store';
import { cellHeight, HEX_SIZE } from './cellVisuals';

// Below this pointer travel (px) between down and up, treat it as a tap (place);
// beyond it, the gesture was a camera pan and we must NOT place.
const DRAG_TOLERANCE = 6;

export function PlacementLayer() {
  const cells = useGame((g) => g.snap.cells);
  const placing = useGame((g) => g.placing);
  const hoveredCellId = useGame((g) => g.hoveredCellId);
  const setHoveredCell = useGame((g) => g.setHoveredCell);
  const placeAt = useGame((g) => g.placeAt);
  const setPlacing = useGame((g) => g.setPlacing);

  // Topology is static: map axial coords -> cell id once.
  const byQR = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cells) m.set(`${c.q},${c.r}`, c.id);
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cellFromEvent = (e: ThreeEvent<PointerEvent | MouseEvent>): number | null => {
    const { q, r } = worldToAxial(e.point.x, e.point.z, HEX_SIZE);
    return byQR.get(`${q},${r}`) ?? null;
  };

  const hovered = hoveredCellId != null ? cells[hoveredCellId] : null;
  const valid = placing && hovered ? canPlaceAt(placing, hovered.id) : false;

  // Track where the pointer went down so we can tell a tap (place) from a drag
  // (camera pan) — left-drag pans the map, so onClick alone would misfire.
  const downAt = useRef<{ x: number; y: number } | null>(null);

  return (
    <group>
      <mesh
        position={[0, 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
        onPointerMove={(e) => setHoveredCell(cellFromEvent(e))}
        onPointerLeave={() => setHoveredCell(null)}
        onPointerDown={(e) => {
          downAt.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
        }}
        onPointerUp={(e) => {
          const d = downAt.current;
          downAt.current = null;
          if (!d || !placing) return;
          const moved = Math.hypot(e.nativeEvent.clientX - d.x, e.nativeEvent.clientY - d.y);
          if (moved > DRAG_TOLERANCE) return; // it was a pan, not a tap
          const id = cellFromEvent(e);
          if (id != null) placeAt(id);
        }}
        onContextMenu={(e) => {
          e.nativeEvent.preventDefault();
          setPlacing(null);
        }}
      >
        <planeGeometry args={[120, 120]} />
      </mesh>

      {placing && hovered && (
        <mesh
          position={(() => {
            const { x, z } = axialToWorld(hovered.q, hovered.r, HEX_SIZE);
            return [x, cellHeight(hovered.id, hovered.biome) + 0.03, z];
          })()}
          rotation={[0, Math.PI / 6, 0]}
        >
          <cylinderGeometry args={[HEX_SIZE * 0.99, HEX_SIZE * 0.99, 0.06, 6]} />
          <meshBasicMaterial
            color={valid ? '#7dde8b' : '#e06c55'}
            transparent
            opacity={0.45}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
