import { useGame } from '../state/store';

export function FlourishingMeter() {
  const snap = useGame((g) => g.snap);
  return (
    <div className="panel flourish">
      <div className="label">Planetary Flourishing</div>
      <div className="score">{snap.flourishing.toFixed(1)}</div>
      <div className="contributors">
        <div>
          Wellbeing {snap.wellbeing.toFixed(0)}
          <div className="bar">
            <div style={{ width: `${Math.min(snap.wellbeing, 100)}%`, background: '#e9c46a' }} />
          </div>
        </div>
        <div>
          Biodiversity {snap.biodiversity.toFixed(0)}
          <div className="bar">
            <div style={{ width: `${Math.min(snap.biodiversity, 100)}%`, background: '#84a98c' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
