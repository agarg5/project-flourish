// Populations, niches, keystones, "build it and they come" (docs 03/08).

import { CONFIG } from './config';
import { suitability } from './habitat';
import { hexDistance } from './hex';
import type { Content, SimState, SpeciesState } from './types';
import { moveToward, pushEvent } from './util';

function stateOf(state: SimState, speciesId: string): SpeciesState {
  const st = state.species.find((s) => s.speciesId === speciesId);
  if (!st) throw new Error(`no species state for ${speciesId}`);
  return st;
}

function ageIndex(content: Content, ageId: string): number {
  return content.ages.find((a) => a.id === ageId)?.index ?? 0;
}

/**
 * Recompute each species' carrying capacity K and marker cells.
 * K(s) = Σ over cells with suitability ≥ arrivalThreshold of
 *        baseCarryingCapacity × suitability × keystoneFactor (doc 08 section 4).
 */
export function computeCapacitiesAndMarkers(state: SimState, content: Content): void {
  const suits = new Map<string, number[]>();
  for (const sp of content.species) {
    suits.set(sp.id, state.cells.map((c) => suitability(c, sp)));
  }

  // Markers first: top-N cells by suitability (render anchors + keystone range
  // origins), kept a minimum distance apart — on a pristine map suitability
  // ties everywhere and pure top-N would pile every herd into the lowest-id
  // corner, making wildlife impossible to find on a big world. Exact ties are
  // broken by a deterministic per-cell jitter (id order walks the west edge),
  // far smaller than any real suitability difference.
  const sep = Math.max(3, Math.round(CONFIG.world.radius / 4));
  const jitter = (cellId: number, salt: number): number => {
    let h = (cellId + 1) * 374761393 + (salt + 1) * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    h = h ^ (h >> 16);
    return ((h >>> 0) % 1000) / 1000;
  };
  for (const [si, sp] of content.species.entries()) {
    const suit = suits.get(sp.id)!;
    const ranked = state.cells
      .map((c) => ({ c, s: suit[c.id] + jitter(c.id, si) * 5e-4 }))
      .sort((a, b) => b.s - a.s || a.c.id - b.c.id);
    const chosen: { c: (typeof state.cells)[number]; s: number }[] = [];
    for (const cand of ranked) {
      if (cand.s <= 0 || chosen.length >= CONFIG.markerCellCount) break;
      if (chosen.every((m) => hexDistance(cand.c, m.c) >= sep)) chosen.push(cand);
    }
    // Tiny habitats may not fit N separated herds — top up with the best rest.
    for (const cand of ranked) {
      if (cand.s <= 0 || chosen.length >= CONFIG.markerCellCount) break;
      if (!chosen.includes(cand)) chosen.push(cand);
    }
    stateOf(state, sp.id).markerCellIds = chosen.map((x) => x.c.id);
  }

  // Healthy keystones project their boost within keystoneRadius of their markers.
  const keystoneRanges = content.species
    .filter((sp) => sp.isKeystone)
    .map((sp) => {
      const st = stateOf(state, sp.id);
      const origins = st.markerCellIds.map((id) => state.cells[id]);
      const inRange = new Set<number>();
      if (st.keystoneEffectiveness > 0 && st.population > 0) {
        for (const c of state.cells) {
          if (origins.some((o) => hexDistance(c, o) <= CONFIG.keystoneRadius)) inRange.add(c.id);
        }
      }
      return { sp, st, inRange };
    });

  // The world's capacity for life scales every habitat's carrying capacity.
  // At the starting world (no terraforming) this is exactly 1.0, so pristine
  // balance is unchanged; terraforming dead zones raises it above 1, growing
  // herds and resilience as the planet is pushed toward the Hestia ceiling.
  const worldFactor =
    state.worldCarryingCapacity / content.ages[0].ceilings.worldCarryingCapacity;

  for (const sp of content.species) {
    const suit = suits.get(sp.id)!;
    let K = 0;
    for (const cell of state.cells) {
      const s = suit[cell.id];
      if (s < sp.arrivalThreshold) continue;
      let factor = 1;
      for (const kr of keystoneRanges) {
        if (kr.sp.id === sp.id) continue;
        if (kr.inRange.has(cell.id)) {
          factor += (kr.sp.keystoneBoost ?? 0) * kr.st.keystoneEffectiveness;
        }
      }
      K += sp.baseCarryingCapacity * s * factor;
    }
    stateOf(state, sp.id).carryingCapacity = K * worldFactor;
  }
}

/** Arrival, logistic growth, local extinction, and keystone cascade easing. */
export function stepPopulations(state: SimState, content: Content): void {
  for (const sp of content.species) {
    const st = stateOf(state, sp.id);
    const K = st.carryingCapacity;
    const ageOk =
      !sp.ageAvailableFrom || ageIndex(content, sp.ageAvailableFrom) <= ageIndex(content, state.age);

    if (st.population <= 0) {
      // "Build it and they come": arrive after a sustained grace period when
      // habitat suits and a source population exists (doc 08 section 4).
      const founder = CONFIG.founderFraction * K;
      if (!sp.reintroOnly && ageOk && K > 0 && founder >= CONFIG.extinctionFloor) {
        st.arrivalProgress++;
        if (st.arrivalProgress >= CONFIG.arrivalGraceTicks) {
          st.population = founder;
          st.arrivalProgress = 0;
          pushEvent(state, 'arrival', `${sp.uiEmoji} ${sp.name} has arrived`);
        }
      } else {
        st.arrivalProgress = 0;
      }
    } else if (K <= 0) {
      st.population *= 1 - CONFIG.noHabitatDeclineRate;
      if (st.population < CONFIG.extinctionFloor) {
        st.population = 0;
        pushEvent(state, 'departure', `${sp.uiEmoji} ${sp.name} has left the region`);
      }
    } else {
      const r = sp.isKeystone ? CONFIG.keystoneGrowthRate : CONFIG.populationGrowthRate;
      st.population += r * st.population * (1 - st.population / K);
      if (st.population < CONFIG.extinctionFloor && K < CONFIG.extinctionFloor) {
        st.population = 0;
        pushEvent(state, 'departure', `${sp.uiEmoji} ${sp.name} has left the region`);
      }
    }

    if (sp.isKeystone) {
      const healthy = K > 0 && st.population >= (sp.cascadeThreshold ?? 0) * K;
      st.keystoneEffectiveness = moveToward(
        st.keystoneEffectiveness,
        healthy ? 1 : 0,
        CONFIG.cascade.recoveryRate,
      );
    }
  }
}
