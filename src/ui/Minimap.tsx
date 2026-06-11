// Top-down minimap (RCT-style). Draws every cell as a small biome-coloured
// hex, the settlement and wildlife as dots, and a marker for where the camera
// is currently looking. Click to recenter the camera there.

import { useEffect, useRef } from 'react';
import { axialToWorld } from '../sim';
import { cameraApi } from '../render/CameraRig';
import { sim, useGame } from '../state/store';

const BIOME_DOT: Record<string, string> = {
  forest: '#3a7d4f',
  grassland: '#9caa55',
  wetland: '#3f7d70',
  coast_shallow: '#4f9e92',
  desert: '#cdb069',
  mountain: '#8b8e98',
  open_water: '#3f6f8f',
};

const SIZE = 168; // px
const PAD = 10;

export function Minimap() {
  const snap = useGame((g) => g.snap);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Static world extent + transform from world (x,z) -> minimap px.
  const extentRef = useRef(0);
  useEffect(() => {
    let max = 1;
    for (const c of sim.state.cells) {
      const { x, z } = axialToWorld(c.q, c.r);
      max = Math.max(max, Math.abs(x), Math.abs(z));
    }
    extentRef.current = max;
  }, []);

  const toPx = (x: number, z: number) => {
    const e = extentRef.current || 1;
    const s = (SIZE - PAD * 2) / (2 * e);
    return { px: SIZE / 2 + x * s, py: SIZE / 2 + z * s, s };
  };

  // Redraw on each snapshot (biomes/wildlife) — cheap at this resolution.
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d')!;
    ctx.clearRect(0, 0, SIZE, SIZE);

    // Cells.
    const { s } = toPx(0, 0);
    const r = Math.max(2, s * 0.62);
    for (const c of snap.cells) {
      const { x, z } = axialToWorld(c.q, c.r);
      const { px, py } = toPx(x, z);
      ctx.fillStyle = BIOME_DOT[c.biome] ?? '#888';
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Buildings (settlement).
    for (const b of snap.buildings) {
      const c = snap.cells[b.cellId];
      if (!c) continue;
      const { x, z } = axialToWorld(c.q, c.r);
      const { px, py } = toPx(x, z);
      ctx.fillStyle = '#f0d68a';
      ctx.fillRect(px - 2, py - 2, 4, 4);
    }
    // Wildlife.
    for (const sp of snap.species) {
      const c = snap.cells[sp.markerCellId];
      if (!c) continue;
      const { x, z } = axialToWorld(c.q, c.r);
      const { px, py } = toPx(x, z);
      ctx.fillStyle = sp.color;
      ctx.beginPath();
      ctx.arc(px, py, 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [snap]);

  // A small DOM marker tracks the camera target each animation frame (cheaper
  // than redrawing the whole canvas at 60fps).
  const markerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const m = markerRef.current;
      if (m) {
        const { x, z } = cameraApi.getTarget();
        const { px, py } = toPx(x, z);
        m.style.transform = `translate(${px - 6}px, ${py - 6}px)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const e0 = extentRef.current || 1;
    const s = (SIZE - PAD * 2) / (2 * e0);
    const wx = (px - SIZE / 2) / s;
    const wz = (py - SIZE / 2) / s;
    cameraApi.jumpTo(wx, wz);
  };

  return (
    <div className="panel minimap" style={{ width: SIZE, height: SIZE }} onClick={handleClick}>
      <canvas ref={canvasRef} width={SIZE} height={SIZE} />
      <div ref={markerRef} className="minimap-marker" />
    </div>
  );
}
