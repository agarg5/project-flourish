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
      <WorldVitality value={snap.worldVitality} baseline={snap.worldVitalityBaseline} />
    </div>
  );
}

// The Hestia horizon: how much life the world can hold, relative to the wild
// world the player started in. Climbs past 1.0× only by terraforming dead zones.
function WorldVitality({ value, baseline }: { value: number; baseline: number }) {
  const ratio = baseline > 0 ? value / baseline : 1;
  const enriched = ratio > 1.001;
  return (
    <div
      className="world-vitality"
      title="How much life the world can hold, relative to the wild world you started in. Terraform dead zones to push it higher."
      style={{
        marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.12)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        fontSize: '0.82em', color: enriched ? '#9cc6a0' : 'rgba(255,255,255,0.72)',
      }}
    >
      <span>World Vitality</span>
      <span>
        {value.toFixed(0)}
        <span style={{ opacity: 0.7, marginLeft: 6 }}>×{ratio.toFixed(2)} wild</span>
      </span>
    </div>
  );
}
