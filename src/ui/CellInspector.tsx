// Player-facing cell inspector: tap any tile to see what lives there, how
// healthy its habitat is, and which species the land could yet support. This
// teaches "build it and they come" by making habitat suitability legible
// (Pillar 5) without exposing the dev-flavored raw indices.

import { inspectCell, useGame } from '../state/store';

function qualityLabel(q: number): string {
  if (q >= 0.75) return 'thriving';
  if (q >= 0.55) return 'healthy';
  if (q >= 0.35) return 'recovering';
  return 'degraded';
}

export function CellInspector() {
  const selectedCellId = useGame((g) => g.selectedCellId);
  const setSelectedCell = useGame((g) => g.setSelectedCell);
  // Re-read on every snapshot so populations/quality stay live while open.
  useGame((g) => g.snap.tick);

  if (selectedCellId == null) return null;
  const info = inspectCell(selectedCellId);
  if (!info) return null;

  const qualityPct = Math.round(info.quality * 100);

  return (
    <div className="panel cell-inspector">
      <div className="ci-head">
        <span className="ci-biome">{info.biomeName}</span>
        <button className="ci-close" title="Close" onClick={() => setSelectedCell(null)}>
          ×
        </button>
      </div>

      {info.isDeadZone ? (
        <div className="ci-deadzone">A dead zone — lifeless until terraformed.</div>
      ) : (
        <div className="ci-quality">
          Habitat {qualityLabel(info.quality)}
          <div className="bar">
            <div style={{ width: `${qualityPct}%`, background: '#84a98c' }} />
          </div>
          <span className="ci-pct">{qualityPct}%</span>
        </div>
      )}

      {info.building && <div className="ci-line">🏠 {info.building}</div>}
      {info.actions.length > 0 && (
        <div className="ci-line">🌱 {info.actions.join(', ')}</div>
      )}

      {info.present.length > 0 && (
        <div className="ci-group">
          <div className="ci-group-title">Living here</div>
          {info.present.map((s) => (
            <div key={s.id} className="ci-species">
              <span>{s.emoji} {s.name}</span>
              <span className="ci-pop">×{s.population}</span>
            </div>
          ))}
        </div>
      )}

      {info.couldThrive.length > 0 && (
        <div className="ci-group">
          <div className="ci-group-title">Could thrive here</div>
          {info.couldThrive.map((s) => (
            <div key={s.id} className="ci-species ci-absent">
              <span>{s.emoji} {s.name}</span>
              <span className="ci-hint">habitat ready</span>
            </div>
          ))}
        </div>
      )}

      {!info.isDeadZone && info.present.length === 0 && info.couldThrive.length === 0 && (
        <div className="ci-empty">No species suited to this land yet. Restore habitat nearby and life will follow.</div>
      )}
    </div>
  );
}
