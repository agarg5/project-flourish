import type { SpendSplit } from '../sim';
import { useGame } from '../state/store';

const FIELDS = [
  ['buildings', 'Buildings'],
  ['rnd', 'Research'],
  ['stewardship', 'Stewardship'],
] as const;

type Key = (typeof FIELDS)[number][0];

// Move one share to `value` and absorb the change into the OTHER two,
// proportionally to their current sizes, so the total stays 1 and the slider
// the player is dragging lands exactly where they put it. (The sim renormalizes
// too; without this the thumb snapped back under the cursor mid-drag.)
function rebalance(split: SpendSplit, key: Key, value: number): SpendSplit {
  const target = Math.max(0, Math.min(1, value));
  const others = FIELDS.map(([k]) => k).filter((k) => k !== key);
  const othersTotal = others.reduce((sum, k) => sum + split[k], 0);
  const remaining = 1 - target;
  const next = { ...split, [key]: target } as SpendSplit;
  if (othersTotal > 0) {
    for (const k of others) next[k] = (split[k] / othersTotal) * remaining;
  } else {
    // Both others were zero — split the remainder evenly so it stays reachable.
    for (const k of others) next[k] = remaining / others.length;
  }
  return next;
}

export function SpendSplitControl() {
  const split = useGame((g) => g.snap.spendSplit);
  const setSpendSplit = useGame((g) => g.setSpendSplit);

  return (
    <div className="panel spend">
      <h4>Income allocation</h4>
      {FIELDS.map(([key, label]) => {
        const pct = Math.round(split[key] * 100);
        return (
          <div className="row" key={key}>
            <label htmlFor={`spend-${key}`}>{label}</label>
            <input
              id={`spend-${key}`}
              type="range"
              min={0}
              max={100}
              value={pct}
              aria-label={`${label} income share`}
              aria-valuetext={`${pct} percent`}
              onChange={(e) => setSpendSplit(rebalance(split, key, Number(e.target.value) / 100))}
            />
            <span>{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}
