import { useGame } from '../state/store';

export function StatusPanel() {
  const snap = useGame((g) => g.snap);
  const advanceAge = useGame((g) => g.advanceAge);
  const next = snap.nextAge;
  const researchPct = next ? Math.min(100, (snap.research / next.requiredResearch) * 100) : 100;
  const sustainPct = next
    ? Math.min(100, (next.sustainedTicks / Math.max(next.sustainTicks, 1)) * 100)
    : 100;

  return (
    <div className="panel status">
      <div className="age">{snap.ageName}</div>
      <div>🪙 {snap.treasury.toFixed(0)} &nbsp; 🔬 {snap.research.toFixed(0)}</div>
      {next && snap.ageUpReady ? (
        <button className="ageup" onClick={advanceAge}>
          ✨ Advance to the {next.name}
        </button>
      ) : (
        next && (
          <div className="gate">
            Toward {next.name}:
            <div>research {snap.research.toFixed(0)} / {next.requiredResearch}</div>
            <div className="gatebar"><div style={{ width: `${researchPct}%` }} /></div>
            <div>
              eco health ≥ {next.requiredEcoHealth.toFixed(2)} sustained
            </div>
            <div className="gatebar"><div style={{ width: `${sustainPct}%` }} /></div>
          </div>
        )
      )}
    </div>
  );
}
