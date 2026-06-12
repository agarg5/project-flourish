// Tech unlocks (cumulative research thresholds) and the dual age-up gate:
// enough research AND sustained ecological health (doc 03 section 6).

import type { Content, SimState } from './types';
import { pushEvent } from './util';

export function ageDef(state: SimState, content: Content) {
  const def = content.ages.find((a) => a.id === state.age);
  if (!def) throw new Error(`unknown age ${state.age}`);
  return def;
}

export function checkTechUnlocks(state: SimState, content: Content): void {
  const currentIdx = ageDef(state, content).index;
  let changed = true;
  while (changed) {
    changed = false;
    for (const t of content.techs) {
      if (state.unlockedTech.includes(t.id)) continue;
      const techAge = content.ages.find((a) => a.id === t.ageId);
      if (!techAge || techAge.index > currentIdx) continue;
      if (!t.prerequisites.every((p) => state.unlockedTech.includes(p))) continue;
      if (state.researchPoints < t.researchCost) continue;
      state.unlockedTech.push(t.id);
      pushEvent(state, 'tech', `Discovered ${t.name}`);
      changed = true;
    }
  }
}

/**
 * Compute dual-gate eligibility (doc 03 section 6). Advancing itself is a
 * player-confirmed command (advanceAge) — a celebratory choice, not an
 * ambush — so this only maintains the sustain counter and readiness flag.
 */
export function checkAgeUp(state: SimState, content: Content): void {
  const cur = ageDef(state, content);
  const next = content.ages.find((a) => a.index === cur.index + 1);
  if (!next) {
    state.ageUpReady = false;
    return;
  }

  // Sustained, not a spike: the counter resets if eco health dips.
  if (state.ecologicalHealth >= next.requiredEcoHealth) state.ecoHealthSustainedTicks++;
  else state.ecoHealthSustainedTicks = 0;

  state.ageUpReady =
    state.researchPoints >= next.requiredResearch &&
    state.ecoHealthSustainedTicks >= next.ecoHealthSustainTicks;
}

/** Advance to the next age if both gate halves are met. */
export function advanceAge(state: SimState, content: Content): boolean {
  if (!state.ageUpReady) return false;
  const cur = ageDef(state, content);
  const next = content.ages.find((a) => a.index === cur.index + 1);
  if (!next) return false;

  state.age = next.id;
  state.ageUpReady = false;
  state.ecoHealthSustainedTicks = 0;
  // Preserve the player's terraform-earned bonus across the age jump.
  state.worldCarryingCapacity = next.ceilings.worldCarryingCapacity + state.terraformBonus;
  pushEvent(state, 'ageUp', `${next.name} — ${next.blurb}`);
  return true;
}
