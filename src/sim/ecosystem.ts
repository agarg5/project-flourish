// Populations, niches, keystones, "build it and they come" (docs 03/08).

import type { SimCaches } from './caches';
import { CONFIG } from './config';
import { recomputeHabitat, suitability } from './habitat';
import { hexDistance } from './hex';
import type { Content, SimState, SpeciesState, WorldCell } from './types';
import { moveToward, pushEvent } from './util';

function stateOf(state: SimState, speciesId: string): SpeciesState {
  const st = state.species.find((s) => s.speciesId === speciesId);
  if (!st) throw new Error(`no species state for ${speciesId}`);
  return st;
}

function ageIndex(content: Content, ageId: string): number {
  return content.ages.find((a) => a.id === ageId)?.index ?? 0;
}

// Deterministic per-cell tie-break jitter for marker selection (id order alone
// would pile every herd into the lowest-id corner of a pristine map).
function jitter(cellId: number, salt: number): number {
  let h = (cellId + 1) * 374761393 + (salt + 1) * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return ((h >>> 0) % 1000) / 1000;
}

/**
 * Pick up to markerCellCount marker cells for one species: highest jittered
 * suitability first, kept `sep` apart, topped up with the best rest when the
 * habitat is too small to fit that many separated herds. Equivalent to ranking
 * all cells and greedily walking the ranking, but implemented as repeated
 * max-scans so the per-rebuild cost is O(markers × cells) with no sort or
 * allocation churn.
 */
function selectMarkers(cells: WorldCell[], scores: Float64Array, sep: number): number[] {
  const chosen: WorldCell[] = [];
  const pick = (requireSeparation: boolean): WorldCell | null => {
    let best: WorldCell | null = null;
    let bestScore = 0;
    for (const c of cells) {
      const s = scores[c.id];
      // Strict > keeps the lowest id on exact ties (ascending scan order).
      if (s <= 0 || s <= bestScore) continue;
      if (chosen.includes(c)) continue;
      if (requireSeparation && !chosen.every((m) => hexDistance(c, m) >= sep)) continue;
      best = c;
      bestScore = s;
    }
    return best;
  };
  while (chosen.length < CONFIG.markerCellCount) {
    const c = pick(true);
    if (!c) break;
    chosen.push(c);
  }
  while (chosen.length < CONFIG.markerCellCount) {
    const c = pick(false);
    if (!c) break;
    chosen.push(c);
  }
  return chosen.map((c) => c.id);
}

/**
 * Rebuild the world-shape-dependent aggregates: suitability arrays, marker
 * cells, and the K sums (base + per-keystone overlap). Only runs when the
 * world changed (or every call, when no caches are passed).
 */
function rebuildCapacityAggregates(state: SimState, content: Content, caches: SimCaches): void {
  const sep = Math.max(3, Math.round(CONFIG.world.radius / 4));
  const scores = new Float64Array(state.cells.length); // jittered for marker ties

  // Keystones project their boost within keystoneRadius of their markers.
  // Precompute, per species, how much qualifying capacity sits inside each
  // keystone's range; the per-tick K is then pure arithmetic over these sums.
  const keystoneRanges: { id: string; inRange: Set<number> }[] = [];

  for (const [si, sp] of content.species.entries()) {
    // The jitter (≤5e-4) only breaks exact ties in marker selection, far
    // smaller than any real suitability difference; K uses raw suitability.
    for (const c of state.cells) {
      scores[c.id] = suitability(c, sp) + jitter(c.id, si) * 5e-4;
    }
    stateOf(state, sp.id).markerCellIds = selectMarkers(state.cells, scores, sep);

    if (sp.isKeystone) {
      const origins = stateOf(state, sp.id).markerCellIds.map((id) => state.cells[id]);
      const inRange = new Set<number>();
      for (const c of state.cells) {
        if (origins.some((o) => hexDistance(c, o) <= CONFIG.keystoneRadius)) inRange.add(c.id);
      }
      keystoneRanges.push({ id: sp.id, inRange });
    }
  }

  for (const sp of content.species) {
    let base = 0;
    const overlaps = new Map<string, number>(keystoneRanges.map((kr) => [kr.id, 0]));
    for (const cell of state.cells) {
      const s = suitability(cell, sp);
      if (s < sp.arrivalThreshold) continue;
      const contribution = sp.baseCarryingCapacity * s;
      base += contribution;
      for (const kr of keystoneRanges) {
        if (kr.id === sp.id) continue;
        if (kr.inRange.has(cell.id)) {
          overlaps.set(kr.id, overlaps.get(kr.id)! + contribution);
        }
      }
    }
    caches.baseK.set(sp.id, base);
    caches.overlapK.set(sp.id, overlaps);
  }

  caches.markCapacityBuilt(state);
}

/**
 * Recompute each species' carrying capacity K and marker cells.
 * K(s) = Σ over cells with suitability ≥ arrivalThreshold of
 *        baseCarryingCapacity × suitability × keystoneFactor (doc 08 section 4).
 * The spatial sums are reused between world mutations; only the keystone-
 * effectiveness and world-capacity factors are applied per tick. Note this
 * derives habitat quality itself (via recomputeHabitat) — it does not consume
 * externally fabricated habitatQuality values.
 */
export function computeCapacitiesAndMarkers(
  state: SimState,
  content: Content,
  caches: SimCaches,
): void {
  recomputeHabitat(state, content, caches); // aggregates assume quality is current
  if (!caches.capacityCurrent(state)) rebuildCapacityAggregates(state, content, caches);

  // The world's capacity for life scales every habitat's carrying capacity.
  // At the starting world (no terraforming) this is exactly 1.0, so pristine
  // balance is unchanged; terraforming dead zones raises it above 1, growing
  // herds and resilience as the planet is pushed toward the Hestia ceiling.
  const worldFactor =
    state.worldCarryingCapacity / content.ages[0].ceilings.worldCarryingCapacity;

  const keystones = content.species.filter((sp) => sp.isKeystone);
  for (const sp of content.species) {
    let K = caches.baseK.get(sp.id)!;
    const overlaps = caches.overlapK.get(sp.id)!;
    for (const ks of keystones) {
      if (ks.id === sp.id) continue;
      const st = stateOf(state, ks.id);
      // A keystone only projects while it is actually present and effective.
      if (st.population <= 0 || st.keystoneEffectiveness <= 0) continue;
      K += (ks.keystoneBoost ?? 0) * st.keystoneEffectiveness * (overlaps.get(ks.id) ?? 0);
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
