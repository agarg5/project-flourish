// Tech tree panel (doc 06 M4): the mostly-linear spine grouped by age, with
// each tech's status — discovered, research progress, or locked behind a
// future age. Research accrues from the R&D income share and techs are
// discovered automatically when their threshold is met (the spend-split IS the
// strategic choice); this panel makes that progression legible.

import { useState } from 'react';
import { sim, useGame } from '../state/store';

export function TechTree() {
  const snap = useGame((g) => g.snap);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button className="techtree-toggle" onClick={() => setOpen(true)}>
        🔬 Tech Tree
      </button>
    );
  }

  const { ages, techs } = sim.content;
  const curAgeIndex = ages.find((a) => a.id === snap.age)?.index ?? 0;

  return (
    <div className="panel techtree">
      <div className="tt-head">
        <h3>Technologies</h3>
        <button className="tt-close" onClick={() => setOpen(false)}>✕</button>
      </div>
      <div className="tt-scroll">
        {ages.map((age) => {
          const ageTechs = techs.filter((t) => t.ageId === age.id);
          if (ageTechs.length === 0) return null;
          const ageReached = age.index <= curAgeIndex;
          return (
            <div key={age.id} className={`tt-age ${ageReached ? '' : 'tt-age-locked'}`}>
              <div className="tt-age-name">
                {age.name}
                {!ageReached && <span className="tt-lock"> · reach this age to research</span>}
              </div>
              {ageTechs.map((t) => {
                const unlocked = snap.unlockedTech.includes(t.id);
                const pct = Math.min(100, (snap.research / t.researchCost) * 100);
                const unlockNames = [
                  ...(t.unlocks.buildings ?? []).map(
                    (id) => sim.content.buildings.find((b) => b.id === id)?.name ?? id,
                  ),
                  ...(t.unlocks.actions ?? []).map(
                    (id) => sim.content.actions.find((a) => a.id === id)?.name ?? id,
                  ),
                  ...(t.unlocks.modifiers ?? []).map((m) => m.note ?? 'bonus'),
                ];
                return (
                  <div key={t.id} className={`tt-node ${unlocked ? 'tt-done' : ''}`}>
                    <div className="tt-node-top">
                      <span className="tt-name">
                        {unlocked ? '✓ ' : ''}{t.name}
                        {t.isBranch && <span className="tt-branch"> ⌥</span>}
                      </span>
                      <span className="tt-cost">{unlocked ? '' : `${snap.research.toFixed(0)} / ${t.researchCost} 🔬`}</span>
                    </div>
                    <div className="tt-desc">{t.description}</div>
                    {unlockNames.length > 0 && (
                      <div className="tt-unlocks">Unlocks: {unlockNames.join(', ')}</div>
                    )}
                    {!unlocked && ageReached && (
                      <div className="tt-bar"><div style={{ width: `${pct}%` }} /></div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
