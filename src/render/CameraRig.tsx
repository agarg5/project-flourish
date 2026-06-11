import { CameraControls } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { axialToWorld, CONFIG } from '../sim';
import { sim } from '../state/store';

// Dual-zoom rig (doc 02): macro = whole living planet; intimate = down among
// the settlement. Pan-primary controls for a Roller-Coaster-Tycoon feel:
// drag (or one-finger / trackpad click-drag) slides the map, scroll/pinch
// zooms, right-drag (or two-finger) rotates. UI buttons + the minimap drive
// the camera through this module-level handle.
export const cameraApi = {
  goMacro: () => {},
  goIntimate: () => {},
  goHome: () => {},
  jumpTo: (_x: number, _z: number) => {},
  getTarget: (): { x: number; z: number } => ({ x: 0, z: 0 }),
};

// World half-extent in plan units, for framing + pan bounds.
const SPAN = CONFIG.world.radius * Math.sqrt(3) + 2;

export function CameraRig() {
  const ref = useRef<CameraControls>(null);

  useEffect(() => {
    const cc = ref.current;
    if (!cc) return;

    // Pan-primary input mapping (trackpad-friendly). ACTION values are numeric
    // enums on the camera-controls class; cast around the strict union types.
    const ACTION = (cc.constructor as unknown as { ACTION: Record<string, number> }).ACTION;
    const mb = cc.mouseButtons as unknown as Record<string, number>;
    const tc = cc.touches as unknown as Record<string, number>;
    mb.left = ACTION.TRUCK;
    mb.right = ACTION.ROTATE;
    mb.wheel = ACTION.DOLLY;
    tc.one = ACTION.TOUCH_TRUCK;
    tc.two = ACTION.TOUCH_DOLLY_TRUCK;
    tc.three = ACTION.TOUCH_TRUCK;
    // Zoom toward the pointer (AoE/RCT feel) instead of the locked centre
    // target — otherwise anything off-centre is impossible to zoom into.
    cc.dollyToCursor = true;

    // Keep the camera target over the island.
    cc.setBoundary(
      new THREE.Box3(new THREE.Vector3(-SPAN, -2, -SPAN), new THREE.Vector3(SPAN, 10, SPAN)),
    );

    const start = sim.startCell();
    const { x, z } = axialToWorld(start.q, start.r);

    cameraApi.goMacro = () => {
      cc.setLookAt(0, SPAN * 1.55, SPAN * 1.25, 0, 0, 0, true);
    };
    cameraApi.goIntimate = () => {
      cc.setLookAt(x + 4, 3.4, z - 6.5, x, 0.6, z, true);
    };
    // Region scale: the settlement and its surroundings, NOT the whole island —
    // on the big map you pan/minimap to explore (the RCT feel). South-east
    // vantage keeps the mountain massif as a corner backdrop, roughly
    // minimap-aligned (north ≈ up).
    cameraApi.goHome = () => {
      cc.setLookAt(x + 9, 13, z + 7, x, 0, z, true);
    };
    cameraApi.jumpTo = (tx: number, tz: number) => {
      cc.setTarget(tx, 0, tz, true);
    };
    cameraApi.getTarget = () => {
      const v = new THREE.Vector3();
      cc.getTarget(v);
      return { x: v.x, z: v.z };
    };

    // Start at region scale over the settlement; Macro is one click away.
    cc.setLookAt(x + 9, 13, z + 7, x, 0, z, false);

    // Dev/testing handle (headless screenshots position the camera through it).
    (window as unknown as Record<string, unknown>).__camera = cc;
  }, []);

  return (
    <CameraControls
      ref={ref}
      minDistance={3}
      maxDistance={SPAN * 2.4}
      maxPolarAngle={Math.PI / 2.15}
      smoothTime={0.4}
    />
  );
}
