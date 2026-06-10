// Economy: BaseOutput × EcoMultiplier − Upkeep (doc 03 section 4), with the
// eco-multiplier curve from doc 10 section 1: 0.5 + 1.1 × smoothstep(h).

import { CONFIG } from './config';
import type { AgeDef, Content, SimState } from './types';
import { clamp01 } from './util';

export function smoothstep(h: number): number {
  const x = clamp01(h);
  return x * x * (3 - 2 * x);
}

export function ecoMultiplier(ecologicalHealth: number): number {
  return CONFIG.ecoMultiplier.min + CONFIG.ecoMultiplier.span * smoothstep(ecologicalHealth);
}

export interface EconomyOptions {
  autoStewardship: boolean;
}

export function resolveEconomy(
  state: SimState,
  content: Content,
  age: AgeDef,
  opts: EconomyOptions,
): void {
  let base: number = CONFIG.baselineOutputPerTurn;
  let upkeep = 0;
  const buildingById = new Map(content.buildings.map((b) => [b.id, b]));
  for (const b of state.buildings) {
    const def = buildingById.get(b.id);
    if (!def) continue;
    base += def.effects.economicOutput ?? 0;
    upkeep += def.upkeep;
  }

  // Passive tech modifiers (none in seed content, but the schema supports them).
  let multAdjust = 0;
  for (const t of content.techs) {
    if (!state.unlockedTech.includes(t.id)) continue;
    for (const m of t.unlocks.modifiers ?? []) {
      if (m.target === 'economy') base = m.op === 'mul' ? base * m.value : base + m.value;
      if (m.target === 'ecoMultiplier' && m.op === 'add') multAdjust += m.value;
    }
  }

  const mult = ecoMultiplier(state.ecologicalHealth) + multAdjust;
  const output = Math.min(base * mult, age.ceilings.economyCeiling);
  const incomePerTick = (output - upkeep) / CONFIG.ticksPerTurn;

  state.ecoMultiplier = mult;
  state.economicOutput = output - upkeep;

  if (incomePerTick >= 0) {
    const { rnd, stewardship } = state.spendSplit;
    state.researchPoints += incomePerTick * rnd * CONFIG.researchPerCoin;
    if (opts.autoStewardship) {
      state.stewardshipBudget += incomePerTick * stewardship;
      state.treasury += incomePerTick * (1 - rnd - stewardship);
    } else {
      // Manual mode (tests/scenarios): the player spends on stewardship
      // actions directly from the treasury.
      state.treasury += incomePerTick * (1 - rnd);
    }
  } else {
    state.treasury = Math.max(0, state.treasury + incomePerTick);
  }
}
