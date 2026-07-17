// Version-keyed caches for the sim's per-tick hot paths (doc 04's determinism
// contract still holds: caches only memoize pure functions of sim state).
//
// The expensive spatial aggregates — habitat quality, marker selection,
// carrying-capacity sums, building-zone quality, biome diversity — are pure
// functions of world inputs that change only on player commands (build,
// action, terraform). Rebuilding them every tick made a 2437-cell world cost
// ~14ms/tick; cached, the steady-state tick is arithmetic only.
//
// The cache key is DERIVED FROM STATE, not maintained by discipline: every
// habitat-relevant mutation appends to an append-only collection — building
// placement appends to `buildings`, and habitat actions (including terraform,
// since a biome change is only expressible as a habitat effect) push onto
// `placedEffects` — so their combined length strictly increases on each such
// mutation. Reintroduction changes populations only, which the K evaluation
// reads live, so it needs no invalidation. A future command that mutated
// cells in place without appending to either collection (none exists today)
// would need to join the key. Save-load replaces the state graph wholesale —
// including cell object identities — so it must call invalidate(), which
// starts a new epoch.
//
// Owned by Simulation, never serialized.

import { QR_KEY_LIMIT, qrKey } from './hex';
import type { SimState, WorldCell } from './types';

interface Slot<T> {
  epoch: number;
  key: number;
  value: T;
}

export class SimCaches {
  /** Bumped when the state graph is replaced from outside (save-load). */
  private epoch = 0;

  private cellIndex: Map<number, WorldCell> | null = null;
  private built = new Map<'habitat' | 'capacity', { epoch: number; key: number }>();
  private zoneQuality = new Map<number, Slot<number>>();
  private biomeDiversity: Slot<number> | null = null;

  /** Per-species Σ base×suitability over qualifying cells (no keystone/world factors). */
  readonly baseK = new Map<string, number>();
  /** speciesId → keystoneId → Σ base×suitability over qualifying cells inside that keystone's marker range. */
  readonly overlapK = new Map<string, Map<string, number>>();

  /** Start a new epoch: drop everything, including cell-reference holders. */
  invalidate(): void {
    this.epoch++;
    this.cellIndex = null;
    this.built.clear();
    this.zoneQuality.clear();
    this.biomeDiversity = null;
    this.baseK.clear();
    this.overlapK.clear();
  }

  /** Habitat-mutation counter; strictly increases with each build/action/terraform (see header). */
  private keyOf(state: SimState): number {
    return state.buildings.length + state.placedEffects.length;
  }

  private current(slot: Slot<unknown> | null | undefined, state: SimState): boolean {
    return slot != null && slot.epoch === this.epoch && slot.key === this.keyOf(state);
  }

  private slot<T>(state: SimState, value: T): Slot<T> {
    return { epoch: this.epoch, key: this.keyOf(state), value };
  }

  isBuilt(what: 'habitat' | 'capacity', state: SimState): boolean {
    const m = this.built.get(what);
    return m !== undefined && m.epoch === this.epoch && m.key === this.keyOf(state);
  }
  markBuilt(what: 'habitat' | 'capacity', state: SimState): void {
    this.built.set(what, { epoch: this.epoch, key: this.keyOf(state) });
  }

  /** (q,r) → cell lookup. Topology is fixed per epoch, so this never expires. */
  index(state: SimState): Map<number, WorldCell> {
    if (!this.cellIndex) {
      for (const c of state.cells) {
        if (Math.abs(c.q) >= QR_KEY_LIMIT || Math.abs(c.r) >= QR_KEY_LIMIT) {
          throw new Error(`cell (${c.q},${c.r}) outside qrKey range ±${QR_KEY_LIMIT}`);
        }
      }
      this.cellIndex = new Map(state.cells.map((c) => [qrKey(c.q, c.r), c]));
    }
    return this.cellIndex;
  }

  /**
   * Average habitat quality in the building zone of the given radius.
   * Callers must have habitat quality current (recomputeHabitat first).
   */
  getZoneQuality(state: SimState, radius: number, compute: () => number): number {
    const s = this.zoneQuality.get(radius);
    if (this.current(s, state)) return s!.value;
    const value = compute();
    this.zoneQuality.set(radius, this.slot(state, value));
    return value;
  }

  /**
   * Biome-diversity term — a pure function of biomes + habitat quality.
   * Callers must have habitat quality current (recomputeHabitat first).
   */
  getBiomeDiversity(state: SimState, compute: () => number): number {
    if (!this.current(this.biomeDiversity, state)) {
      this.biomeDiversity = this.slot(state, compute());
    }
    return this.biomeDiversity!.value;
  }
}
