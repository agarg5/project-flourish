import { useRef } from 'react';
import { useGame } from '../state/store';

// How many ticks of history define "recent" for the trend arrow (~5s at 6/s).
const TREND_WINDOW = 30;

/** A small ▲/▼ showing whether Flourishing is rising or falling lately. */
function useTrend(tick: number, value: number): number {
  const samples = useRef<{ tick: number; value: number }[]>([]);
  const buf = samples.current;
  if (buf.length === 0 || buf[buf.length - 1].tick !== tick) {
    buf.push({ tick, value });
    while (buf.length > 1 && tick - buf[0].tick > TREND_WINDOW) buf.shift();
  }
  return value - buf[0].value;
}

export function FlourishingMeter() {
  const snap = useGame((g) => g.snap);
  const trend = useTrend(snap.tick, snap.flourishing);
  const rising = trend > 0.05;
  const falling = trend < -0.05;
  return (
    <div className="panel flourish">
      <div className="label">Planetary Flourishing</div>
      <div className="score">
        {snap.flourishing.toFixed(1)}
        {(rising || falling) && (
          <span
            className="trend"
            title={`${rising ? '+' : ''}${trend.toFixed(1)} over the last few seconds`}
            style={{ color: rising ? '#a7d489' : '#e9b44c' }}
          >
            {rising ? '▲' : '▼'}
          </span>
        )}
      </div>
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
