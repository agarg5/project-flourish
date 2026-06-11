import { Sky } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, N8AO, TiltShift2, Vignette } from '@react-three/postprocessing';
import { Suspense } from 'react';
import { Clouds, WetlandWater } from './Atmosphere';
import { Buildings } from './Buildings';
import { CameraRig } from './CameraRig';
import { Creatures } from './Creatures';
import { Decorations, MountainPeaks } from './Decorations';
import { PlacementLayer } from './PlacementLayer';
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
      <Sky sunPosition={[60, 38, 25]} turbidity={5} rayleigh={0.4} mieCoefficient={0.004} />
      <fog attach="fog" args={['#bccab6', 60, 140]} />
      <hemisphereLight args={['#cfe4ff', '#5a6b4a', 0.55]} />
      <ambientLight intensity={0.25} color="#f0f4e4" />
      <directionalLight
        position={[24, 32, 14]}
        intensity={2.2}
        color="#fff0d6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-camera-near={1}
        shadow-camera-far={90}
      />
      <SceneHandle />
      <Suspense fallback={null}>
        <World />
        <Decorations />
        <MountainPeaks />
        <WetlandWater />
        <Clouds />
        <Buildings />
        <Creatures />
        <PlacementLayer />
      </Suspense>
      <CameraRig />
      <EffectComposer multisampling={4}>
        <N8AO aoRadius={1.2} intensity={2.5} distanceFalloff={1} />
        <Bloom intensity={0.12} luminanceThreshold={0.95} mipmapBlur />
        <TiltShift2 blur={0.1} />
        <Vignette eskil={false} offset={0.2} darkness={0.45} />
      </EffectComposer>
    </Canvas>
  );
}
