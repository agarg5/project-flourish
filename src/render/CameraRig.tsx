import { CameraControls } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import { axialToWorld } from '../sim';
import { sim } from '../state/store';

// Dual-zoom rig (doc 02): macro = whole living planet; intimate = down among
// the settlement. UI buttons drive it through this module-level handle.
export const cameraApi = {
  goMacro: () => {},
  goIntimate: () => {},
};

export function CameraRig() {
  const ref = useRef<CameraControls>(null);

  useEffect(() => {
    const start = sim.startCell();
    const { x, z } = axialToWorld(start.q, start.r);

    cameraApi.goMacro = () => {
      ref.current?.setLookAt(0, 34, 27, 0, 0, 0, true);
    };
    // Dev/testing handle (headless screenshots position the camera through it).
    (window as unknown as Record<string, unknown>).__camera = ref.current;
    cameraApi.goIntimate = () => {
      // Approach from the north so the central mountain doesn't block the view.
      ref.current?.setLookAt(x + 4, 3.4, z - 6.5, x, 0.6, z, true);
    };
  }, []);

  return (
    <CameraControls
      ref={ref}
      minDistance={4}
      maxDistance={60}
      maxPolarAngle={Math.PI / 2.2}
      smoothTime={0.5}
    />
  );
}
