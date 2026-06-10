import { Canvas, useThree } from '@react-three/fiber';
import { Buildings } from './Buildings';
import { CameraRig } from './CameraRig';
import { Creatures } from './Creatures';
import { World } from './World';

// Dev/testing handle: lets headless checks inspect the live three.js scene.
function SceneHandle() {
  const three = useThree();
  (window as unknown as Record<string, unknown>).__scene = three;
  return null;
}

export function Scene() {
  return (
    <Canvas camera={{ position: [0, 34, 27], fov: 38 }} shadows>
      <color attach="background" args={['#15231b']} />
      <fog attach="fog" args={['#15231b', 55, 110]} />
      <ambientLight intensity={0.85} color="#e8f0dd" />
      <directionalLight
        position={[18, 28, 12]}
        intensity={1.6}
        color="#fff3da"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <SceneHandle />
      <World />
      <Buildings />
      <Creatures />
      <CameraRig />
    </Canvas>
  );
}
