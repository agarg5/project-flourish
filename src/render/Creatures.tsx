import { Html } from '@react-three/drei';
import { axialToWorld } from '../sim';
import { useGame } from '../state/store';
import { cellTopY, HEX_SIZE } from './World';

// HoMM-style species markers: one representative emoji + population count at
// the species' best-habitat cell, as a DOM overlay (real color emoji — SDF
// text can't render them). Real animated models arrive in M3.
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
        return (
          <Html
            key={sp.id}
            position={[x, y + 0.55, z]}
            center
            distanceFactor={18}
            style={{ pointerEvents: 'none', textAlign: 'center', userSelect: 'none' }}
          >
            <div style={{ fontSize: 26, lineHeight: 1 }}>{sp.emoji}</div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#f4f1e8',
                textShadow: '0 1px 3px rgba(10,20,12,0.9)',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              ×{sp.population}
            </div>
          </Html>
        );
      })}
    </group>
  );
}
