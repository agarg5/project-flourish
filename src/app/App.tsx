import { useEffect } from 'react';
import { cameraApi } from '../render/CameraRig';
import { Scene } from '../render/Scene';
import { EventsFeed } from '../ui/EventsFeed';
import { FlourishingMeter } from '../ui/FlourishingMeter';
import { InspectorOverlay } from '../ui/InspectorOverlay';
import { SpendSplitControl } from '../ui/SpendSplitControl';
import { StatusPanel } from '../ui/StatusPanel';
import { startGameLoop } from './gameLoop';
import '../ui/hud.css';

export function App() {
  useEffect(() => {
    startGameLoop();
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Scene />
      <div className="hud">
        <FlourishingMeter />
        <StatusPanel />
        <InspectorOverlay />
        <SpendSplitControl />
        <EventsFeed />
        <div className="camera-btns">
          <button onClick={() => cameraApi.goMacro()}>🌍 Macro</button>
          <button onClick={() => cameraApi.goIntimate()}>🏕️ Intimate</button>
        </div>
      </div>
    </div>
  );
}
