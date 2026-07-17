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
// world mutation the sim supports appends to one of three append-only
// collections (buildings, placedEffects, cellActions), so their combined
// count strictly increases on each mutation. A future mutating command is
// covered automatically as long as it appends to one of them; a command that
// mutates cells in place without doing so (none exists today) would need to
// join the key. Save-load replaces the state graph wholesale — including cell
// object identities — so it must call invalidate(), which starts a new epoch.
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
  private habitatBuilt: Slot<true> | null = null;
  private capacityBuilt: Slot<true> | null = null;
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
    this.habitatBuilt = null;
    this.capacityBuilt = null;
    this.zoneQuality.clear();
    this.biomeDiversity = null;
    this.baseK.clear();
    this.overlapK.clear();
  }

  /** World-mutation counter; strictly increases with each build/action/terraform. */
  private keyOf(state: SimState): number {
    let n = state.buildings.length + state.placedEffects.length;
    for (const id in state.cellActions) n += state.cellActions[id].length;
    return n;
  }

  private current(slot: Slot<unknown> | null | undefined, state: SimState): boolean {
    return slot != null && slot.epoch === this.epoch && slot.key === this.keyOf(state);
  }

  private slot<T>(state: SimState, value: T): Slot<T> {
    return { epoch: this.epoch, key: this.keyOf(state), value };
  }

  habitatCurrent(state: SimState): boolean {
    return this.current(this.habitatBuilt, state);
  }
  markHabitatBuilt(state: SimState): void {
    this.habitatBuilt = this.slot(state, true);
  }

  capacityCurrent(state: SimState): boolean {
    return this.current(this.capacityBuilt, state);
  }
  markCapacityBuilt(state: SimState): void {
    this.capacityBuilt = this.slot(state, true);
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
