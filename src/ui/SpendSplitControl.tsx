import { useGame } from '../state/store';

const FIELDS = [
  ['buildings', 'Buildings'],
  ['rnd', 'Research'],
  ['stewardship', 'Stewardship'],
] as const;

export function SpendSplitControl() {
  const split = useGame((g) => g.snap.spendSplit);
  const setSpendSplit = useGame((g) => g.setSpendSplit);

  return (
    <div className="panel spend">
      <h4>Income allocation</h4>
      {FIELDS.map(([key, label]) => (
        <div className="row" key={key}>
          <label>{label}</label>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(split[key] * 100)}
            onChange={(e) => {
              setSpendSplit({ ...split, [key]: Number(e.target.value) / 100 });
            }}
          />
          <span>{Math.round(split[key] * 100)}%</span>
        </div>
      ))}
    </div>
  );
}
