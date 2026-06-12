// Fast-forward harness (doc 11 section 7): run scenarios headless, dump CSVs
// to tmp/ for plotting, and print a summary table.
// Usage: bun scripts/fastforward.ts [ticks]

import { mkdirSync, writeFileSync } from 'node:fs';
import {
  balanced, buildHeavy, greenPath, neglectPath, runScenario, stewardForward, stewardToHestia, toCsv,
} from '../src/sim/scenarios';

const ticks = Number(process.argv[2] ?? 600);
mkdirSync('tmp', { recursive: true });

const strategies = [greenPath, neglectPath, balanced, buildHeavy, stewardForward, stewardToHestia];

console.log(`tick=${ticks}`);
console.log(
  'scenario'.padEnd(18),
  ['flourish', 'wellbeing', 'biodiv', 'ecoHealth', 'ecoMult', 'treasury', 'research', 'age']
    .map((h) => h.padStart(10))
    .join(''),
);

for (const strat of strategies) {
  const { rows } = runScenario(strat, ticks);
  const end = rows[rows.length - 1];
  writeFileSync(`tmp/scenario-${strat.name}.csv`, toCsv(rows));
  console.log(
    strat.name.padEnd(18),
    [
      end.flourishing.toFixed(1),
      end.wellbeing.toFixed(1),
      end.biodiversity.toFixed(1),
      end.ecoHealth.toFixed(3),
      end.ecoMult.toFixed(2),
      end.treasury.toFixed(0),
      end.research.toFixed(0),
      end.age,
    ]
      .map((v) => String(v).padStart(10))
      .join(''),
  );
}
console.log('\nCSVs written to tmp/scenario-*.csv');
