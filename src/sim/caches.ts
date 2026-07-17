// Version-keyed caches for the sim's per-tick hot paths (doc 04's determinism
// contract still holds: caches only memoize pure functions of sim state).
//
// The expensive spatial aggregates — habitat quality, per-species suitability,
// marker selection, keystone-range overlap sums, building impact zones — are
// pure functions of inputs that change only on player commands (build, action,
// terraform) or a save-load. Rebuilding them every tick made a 2437-cell world
// cost ~14ms/tick; keyed on a mutation counter, the steady-state tick is
// arithmetic only. Owned by Simulation, never serialized.

import type { Comfort } from './population';
import type { SimState, WorldCell } from './types';

// Axial coords fit well inside ±QR_OFFSET for any plausible world radius.
const QR_OFFSET = 1 << 9;

export function qrKey(q: number, r: number): number {
  return (q + QR_OFFSET) * (QR_OFFSET * 2) + (r + QR_OFFSET);
}

interface Zone {
  buildingCount: number;
  version: number;
  cells: WorldCell[];
}

export class SimCaches {
  /** Bumped on every world mutation; consumers compare their built version. */
  private version = 0;

  private cellIndex: Map<number, WorldCell> | null = null;
  private habitatBuilt = -1;
  private capacityBuilt = -1;
  private zones = new Map<number, Zone>();
  private comfort: { buildingCount: number; version: number; value: Comfort } | null = null;
  private biomeDiversity: { version: number; value: number } | null = null;

  /** Per-species jittered marker scores per cell id. Valid while capacityCurrent(). */
  readonly markerScores = new Map<string, Float64Array>();
  /** Per-species Σ base×suitability over qualifying cells (no keystone/world factors). */
  readonly baseK = new Map<string, number>();
  /** speciesId → keystoneId → Σ base×suitability over qualifying cells inside that keystone's marker range. */
  readonly overlapK = new Map<string, Map<string, number>>();

  /** A world mutation happened (build / action / terraform): derived data is stale. */
  bump(): void {
    this.version++;
  }

  /**
   * Wholesale state replacement (save-load): cell object identities changed,
   * so drop everything that holds references into the old cells array.
   */
  invalidate(): void {
    this.version++;
    this.cellIndex = null;
    this.zones.clear();
    this.comfort = null;
  }

  habitatCurrent(): boolean {
    return this.habitatBuilt === this.version;
  }
  markHabitatBuilt(): void {
    this.habitatBuilt = this.version;
  }

  capacityCurrent(): boolean {
    return this.capacityBuilt === this.version;
  }
  markCapacityBuilt(): void {
    this.capacityBuilt = this.version;
  }

  /** (q,r) → cell lookup. Topology is fixed per world, so this never expires. */
  index(state: SimState): Map<number, WorldCell> {
    if (!this.cellIndex) {
      this.cellIndex = new Map(state.cells.map((c) => [qrKey(c.q, c.r), c]));
    }
    return this.cellIndex;
  }

  /** Cells within `radius` of any building (the whole world when there are none). */
  zone(state: SimState, radius: number, compute: () => WorldCell[]): WorldCell[] {
    const z = this.zones.get(radius);
    if (z && z.buildingCount === state.buildings.length && z.version === this.version) {
      return z.cells;
    }
    const cells = compute();
    this.zones.set(radius, { buildingCount: state.buildings.length, version: this.version, cells });
    return cells;
  }

  /** Comfort from buildings — invariant between placements. */
  getComfort(state: SimState, compute: () => Comfort): Comfort {
    const c = this.comfort;
    if (c && c.buildingCount === state.buildings.length && c.version === this.version) {
      return c.value;
    }
    const value = compute();
    this.comfort = { buildingCount: state.buildings.length, version: this.version, value };
    return value;
  }

  /** Biome-diversity term — a pure function of biomes + habitat quality. */
  getBiomeDiversity(compute: () => number): number {
    if (this.biomeDiversity?.version !== this.version) {
      this.biomeDiversity = { version: this.version, value: compute() };
    }
    return this.biomeDiversity.value;
  }
}
