// Top-down minimap (RCT-style): the island rendered as smooth filled biome
// regions (each pixel samples its nearest hex — no dot/pixel look), with the
// settlement as gold squares, wildlife as small emoji, and a marker for where
// the camera is looking. Click to recenter the camera there.

import { useEffect, useMemo, useRef } from 'react';
import { axialToWorld, worldToAxial } from '../sim';
import { cameraApi } from '../render/CameraRig';
import { sim, useGame } from '../state/store';

const BIOME_FILL: Record<string, [number, number, number]> = {
  forest: [58, 125, 79],
  grassland: [156, 170, 85],
  wetland: [63, 125, 112],
  coast_shallow: [79, 158, 146],
  desert: [205, 176, 105],
  mountain: [139, 142, 152],
  open_water: [63, 111, 143],
};

const SIZE = 190; // px
const PAD = 8;

export function Minimap() {
  const snap = useGame((g) => g.snap);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Static world extent + transform from world (x,z) -> minimap px. Computed
  // synchronously so the first base-image render already has the right scale.
  const extent = useMemo(() => {
    let max = 1;
    for (const c of sim.state.cells) {
      const { x, z } = axialToWorld(c.q, c.r);
      max = Math.max(max, Math.abs(x), Math.abs(z));
    }
    return max + 0.9; // include the outer cells' own footprint
  }, []);
  const extentRef = useRef(extent);
  extentRef.current = extent;

  const toPx = (x: number, z: number) => {
    const s = (SIZE - PAD * 2) / (2 * extentRef.current);
    return { px: SIZE / 2 + x * s, py: SIZE / 2 + z * s, s };
  };

  // Base biome image: every pixel samples its containing hex, giving solid
  // continuous regions. Rebuilt only when a biome actually changes (terraform).
  const biomeSig = useMemo(() => snap.cells.map((c) => c.biome[0]).join(''), [snap.cells]);
  const baseImage = useMemo(() => {
    const byQR = new Map<string, string>();
    for (const c of snap.cells) byQR.set(`${c.q},${c.r}`, c.biome);
    const img = new ImageData(SIZE, SIZE);
    const e = extentRef.current || 1;
    const s = (SIZE - PAD * 2) / (2 * e);
    for (let py = 0; py < SIZE; py++) {
      for (let px = 0; px < SIZE; px++) {
        const wx = (px - SIZE / 2) / s;
        const wz = (py - SIZE / 2) / s;
        const { q, r } = worldToAxial(wx, wz);
        const biome = byQR.get(`${q},${r}`);
        if (!biome) continue; // outside the island -> transparent
        const [cr, cg, cb] = BIOME_FILL[biome] ?? [136, 136, 136];
        const o = (py * SIZE + px) * 4;
        img.data[o] = cr;
        img.data[o + 1] = cg;
        img.data[o + 2] = cb;
        img.data[o + 3] = 255;
      }
    }
    return img;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biomeSig]);

  // Redraw overlays on each snapshot (buildings/wildlife move slowly).
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d')!;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.putImageData(baseImage, 0, 0);

    // Buildings (settlement).
    for (const b of snap.buildings) {
      const c = snap.cells[b.cellId];
      if (!c) continue;
      const { x, z } = axialToWorld(c.q, c.r);
      const { px, py } = toPx(x, z);
      ctx.fillStyle = '#f0d68a';
      ctx.fillRect(px - 2, py - 2, 4, 4);
    }
    // Wildlife as small emoji (readable, RCT-map cute).
    ctx.font = '9px "Apple Color Emoji", "Segoe UI Emoji", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const sp of snap.species) {
      const c = snap.cells[sp.markerCellId];
      if (!c) continue;
      const { x, z } = axialToWorld(c.q, c.r);
      const { px, py } = toPx(x, z);
      ctx.fillText(sp.emoji, px, py);
    }
  }, [snap, baseImage]);

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
