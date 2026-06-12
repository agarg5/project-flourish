import { Environment, Lightformer, Sky } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, N8AO, TiltShift2, Vignette } from '@react-three/postprocessing';
import { Suspense, useEffect } from 'react';
import { ACESFilmicToneMapping } from 'three';
import { CONFIG } from '../sim';
import { Clouds, WetlandWater } from './Atmosphere';
import { Buildings } from './Buildings';
import { CameraRig } from './CameraRig';
import { Creatures } from './Creatures';
import { Decorations } from './Decorations';
import { Mountains } from './Mountains';
import { Trees } from './Trees';
import { PlacementLayer } from './PlacementLayer';
import { World } from './World';

// Dev/testing handle: lets headless checks inspect the live three.js scene.
function SceneHandle() {
  const three = useThree();
  (window as unknown as Record<string, unknown>).__scene = three;
  return null;
}

// WebGL context-loss recovery, attached from INSIDE the canvas via an effect.
// (Do NOT use Canvas's onCreated for this — passing onCreated silently
// prevented R3F v9 from initializing the scene at all; that was the
// "graphics hiccup" bug.) preventDefault on contextlost allows the browser
// to restore the context; on restore, the parent remounts a fresh canvas.
function ContextRecovery({ onRestored }: { onRestored?: () => void }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const el = gl.domElement;
    const onLost = (e: Event) => e.preventDefault();
    const onRestoredEv = () => onRestored?.();
    el.addEventListener('webglcontextlost', onLost, false);
    el.addEventListener('webglcontextrestored', onRestoredEv, false);
    return () => {
      el.removeEventListener('webglcontextlost', onLost);
      el.removeEventListener('webglcontextrestored', onRestoredEv);
    };
  }, [gl, onRestored]);
  return null;
}

export function Scene({ onContextRestored }: { onContextRestored?: () => void }) {
  return (
    <Canvas
      camera={{ position: [0, 48, 38], fov: 40 }}
      shadows
      gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
    >
      <Sky sunPosition={[60, 38, 25]} turbidity={5} rayleigh={0.4} mieCoefficient={0.004} />
      {/* Fog distances scale with the island so the macro view isn't a haze. */}
      <fog
        attach="fog"
        args={['#bccab6', CONFIG.world.radius * Math.sqrt(3) * 3.2, CONFIG.world.radius * Math.sqrt(3) * 8]}
      />
      <hemisphereLight args={['#cfe4ff', '#5a6b4a', 0.55]} />
      <ambientLight intensity={0.25} color="#f0f4e4" />
      <directionalLight
        position={[34, 44, 20]}
        intensity={2.2}
        color="#fff0d6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={55}
        shadow-camera-bottom={-55}
        shadow-camera-near={1}
        shadow-camera-far={200}
      />
      {/* Self-contained environment (no external HDR fetch) used ONLY for
          specular reflections on shiny surfaces (water). environmentIntensity
          near-zero so it doesn't add diffuse fill that washes the matte
          terrain; the water material opts in via its own envMapIntensity. */}
      <Environment resolution={128} environmentIntensity={0.04} frames={1}>
        <color attach="background" args={['#8aa6ba']} />
        <Lightformer intensity={1.0} color="#eaf2fa" position={[0, 6, 0]} scale={[12, 12, 1]} rotation={[Math.PI / 2, 0, 0]} />
        <Lightformer intensity={2.2} color="#fff0d6" position={[5, 4, 3]} scale={[5, 5, 1]} />
      </Environment>
      <SceneHandle />
      <ContextRecovery onRestored={onContextRestored} />
      <Suspense fallback={null}>
        <World />
        <Decorations />
        <Trees />
        <Mountains />
        <WetlandWater />
        <Clouds />
        <Buildings />
        <Creatures />
        <PlacementLayer />
      </Suspense>
      <CameraRig />
      <EffectComposer multisampling={4}>
        <N8AO aoRadius={0.6} intensity={1.4} distanceFalloff={1} />
        <Bloom intensity={0.12} luminanceThreshold={0.95} mipmapBlur />
        <TiltShift2 blur={0.04} />
        <Vignette eskil={false} offset={0.25} darkness={0.4} />
      </EffectComposer>
    </Canvas>
  );
}
