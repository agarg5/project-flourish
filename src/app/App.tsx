import { useEffect } from 'react';
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
import { Tutorial } from '../ui/Tutorial';
import { startGameLoop } from './gameLoop';
import '../ui/hud.css';

export function App() {
  const setPlacing = useGame((g) => g.setPlacing);

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
      <Scene />
      <div className="hud">
        <FlourishingMeter />
        <StatusPanel />
        <InspectorOverlay />
        <SpendSplitControl />
        <EventsFeed />
        <Minimap />
        <BuildMenu />
        <Tutorial />
        <div className="camera-btns">
          <button onClick={() => cameraApi.goMacro()}>🌍 Macro</button>
          <button onClick={() => cameraApi.goIntimate()}>🏕️ Intimate</button>
        </div>
      </div>
    </div>
  );
}
