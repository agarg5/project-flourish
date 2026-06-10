import { axialToWorld } from '../sim';
import { useGame } from '../state/store';
import { cellTopY, HEX_SIZE } from './World';

const BUILDING_COLORS: Record<string, string> = {
  forager_camp: '#b07a50',
  fire_hearth: '#d96f4e',
  polyculture_plot: '#79b35a',
  granary: '#d8b272',
  irrigation_channel: '#5a93b3',
};

// Placeholder geometry (M3 swaps in real low-poly assets): a hut-like box
// with a small roof pyramid, colored by building type.
export function Buildings() {
  const cells = useGame((g) => g.snap.cells);
  const built = cells.filter((c) => c.buildingId);

  return (
    <group>
      {built.map((c) => {
        const { x, z } = axialToWorld(c.q, c.r, HEX_SIZE);
        const y = cellTopY(c.id, c.biome);
        const color = BUILDING_COLORS[c.buildingId!] ?? '#c0a080';
        return (
          <group key={c.id} position={[x, y, z]}>
            <mesh position={[0, 0.18, 0]} castShadow>
              <boxGeometry args={[0.55, 0.36, 0.55]} />
              <meshStandardMaterial color={color} roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.46, 0]} castShadow>
              <coneGeometry args={[0.42, 0.26, 4]} />
              <meshStandardMaterial color="#8a5a3a" roughness={0.9} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
