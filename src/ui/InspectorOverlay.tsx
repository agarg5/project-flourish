// Dev inspector (doc 03 section 8): every sub-index live, with the
// eco-multiplier's 1.0 crossing highlighted — the clearest teacher that
// nature is an economic multiplier (doc 10 section 5).

import { useGame } from '../state/store';

export function InspectorOverlay() {
  const snap = useGame((g) => g.snap);
  const s = snap.sub;

  return (
    <div className="panel inspector">
      <h4>Inspector</h4>
      <div className="grid">
        <span>Eco multiplier</span>
        <span className={snap.ecoMult >= 1 ? 'mult-good' : 'mult-bad'}>
          ×{snap.ecoMult.toFixed(2)}
        </span>
        <span>Ecological health</span><span>{snap.ecoHealth.toFixed(3)}</span>
        <span>Economy / turn</span><span>{snap.economicOutput.toFixed(1)}</span>
        <div className="divider" />
        <span>Niche coverage</span><span>{s.nicheCoverage.toFixed(2)}</span>
        <span>Keystone health</span><span>{s.keystoneHealth.toFixed(2)}</span>
        <span>Population health</span><span>{s.populationHealth.toFixed(2)}</span>
        <span>Biome diversity</span><span>{s.biomeDiversity.toFixed(2)}</span>
        <div className="divider" />
        <span>Env quality</span><span>{s.envQuality.toFixed(2)}</span>
        <span>Settlement land</span><span>{s.settlementQuality.toFixed(2)}</span>
        <span>Crowding</span><span>{s.crowding.toFixed(2)}</span>
        <span>Steward fund</span><span>{snap.stewardshipBudget.toFixed(0)}</span>
        <div className="divider" />
        {snap.species.map((sp) => (
          <span key={sp.id} style={{ display: 'contents' }}>
            <span>{sp.emoji} {sp.name}</span>
            <span>{sp.population} / {sp.carryingCapacity}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
