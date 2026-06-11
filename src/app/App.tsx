import { Component, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { isMuted, setBirdLevel, setMuted, sfxArrival, sfxDeparture, sfxTech } from '../audio/sound';
import { cameraApi } from '../render/CameraRig';
import { Scene } from '../render/Scene';
import { useGame } from '../state/store';
import { BuildMenu } from '../ui/BuildMenu';
import { EventsFeed } from '../ui/EventsFeed';
import { FlourishingMeter } from '../ui/FlourishingMeter';
import { InspectorOverlay } from '../ui/InspectorOverlay';
import { Minimap } from '../ui/Minimap';
import { SpendSplitControl } from '../ui/SpendSplitControl';
import { StatusPanel } from '../ui/StatusPanel';
import { TechTree } from '../ui/TechTree';
import { Tutorial } from '../ui/Tutorial';
import { startGameLoop } from './gameLoop';
import '../ui/hud.css';

// If the 3D scene crashes (e.g. WebGL context lost on a strained GPU), keep
// the HUD alive and AUTO-RECOVER: remount the canvas (a fresh GL context)
// after a short delay, with backoff. Only after repeated failures does it
// settle into a persistent notice. The sim keeps running throughout.
const MAX_SCENE_RETRIES = 3;

class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean; generation: number; retries: number }
> {
  state = { failed: false, generation: 0, retries: 0 };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    if (this.state.retries < MAX_SCENE_RETRIES) {
      const delay = 1500 * (this.state.retries + 1);
      setTimeout(() => {
        this.setState((s) => ({ failed: false, generation: s.generation + 1, retries: s.retries + 1 }));
      }, delay);
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="scene-fallback">
          {this.state.retries < MAX_SCENE_RETRIES
            ? 'The 3D view hit a graphics hiccup — restoring it…'
            : 'The 3D view could not recover from a graphics error. Your world is safe (it auto-saves). Quitting and reopening the browser usually clears this.'}
        </div>
      );
    }
    return <div key={this.state.generation} style={{ position: 'absolute', inset: 0 }}>{this.props.children}</div>;
  }
}

// Plays cues for sim events (tech discoveries, species arrivals/departures)
// and tunes the ambient birdsong to biodiversity. Events are diffed by object
// identity (snapshots reuse the same event objects), so the capped feed and
// loaded saves don't replay old sounds.
function SoundDirector() {
  const events = useGame((g) => g.snap.events);
  const biodiversity = useGame((g) => g.snap.biodiversity);
  const lastSeen = useRef<unknown>(events[events.length - 1] ?? null);

  useEffect(() => {
    setBirdLevel(biodiversity / 100);
  }, [biodiversity]);

  useEffect(() => {
    const prev = lastSeen.current;
    const start = prev ? events.findIndex((e) => (e as unknown) === prev) + 1 : 0;
    for (const e of events.slice(start)) {
      if (e.type === 'tech') sfxTech();
      else if (e.type === 'arrival') sfxArrival();
      else if (e.type === 'departure') sfxDeparture();
    }
    lastSeen.current = events[events.length - 1] ?? prev;
  }, [events]);

  return null;
}

function MuteButton() {
  const [muted, setMutedState] = useState(isMuted);
  const toggle = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };
  return (
    <button onClick={toggle} title={muted ? 'Unmute sound' : 'Mute sound'}>
      {muted ? '🔇 Sound' : '🔊 Sound'}
    </button>
  );
}

export function App() {
  const setPlacing = useGame((g) => g.setPlacing);
  const restart = useGame((g) => g.restart);
  // Bumped when a lost WebGL context is restored — remounts a fresh canvas.
  const [sceneKey, setSceneKey] = useState(0);

  const onRestart = () => {
    if (window.confirm('Start a new world? Your current civilization will be lost.')) {
      restart();
      cameraApi.goMacro();
    }
  };

  useEffect(() => {
    startGameLoop();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPlacing(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPlacing]);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <SceneBoundary key={sceneKey}>
        <Scene onContextRestored={() => setSceneKey((k) => k + 1)} />
      </SceneBoundary>
      <div className="hud">
        <FlourishingMeter />
        <StatusPanel />
        <InspectorOverlay />
        <SpendSplitControl />
        <EventsFeed />
        <Minimap />
        <BuildMenu />
        <TechTree />
        <Tutorial />
        <SoundDirector />
        <div className="camera-btns">
          <button onClick={() => cameraApi.goMacro()}>🌍 Macro</button>
          <button onClick={() => cameraApi.goIntimate()}>🏕️ Intimate</button>
          <MuteButton />
          <button className="restart-btn" onClick={onRestart} title="Start a new world">↻ Restart</button>
        </div>
      </div>
    </div>
  );
}
