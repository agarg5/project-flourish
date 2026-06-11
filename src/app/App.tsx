import { Component, useEffect } from 'react';
import type { ReactNode } from 'react';
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
// the HUD alive and show a gentle notice instead of unmounting everything.
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="scene-fallback">
          The 3D view hit a graphics error. Your world is safe — reload the page to restore it.
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  const setPlacing = useGame((g) => g.setPlacing);
  const restart = useGame((g) => g.restart);

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
      <SceneBoundary>
        <Scene />
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
        <div className="camera-btns">
          <button onClick={() => cameraApi.goMacro()}>🌍 Macro</button>
          <button onClick={() => cameraApi.goIntimate()}>🏕️ Intimate</button>
          <button className="restart-btn" onClick={onRestart} title="Start a new world">↻ Restart</button>
        </div>
      </div>
    </div>
  );
}
