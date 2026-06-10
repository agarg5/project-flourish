# 08 — Spatial / World Model

> Fills the biggest gap between file 03 (sim math) and file 05 (schemas): the
> sim assumes per-cell suitability and `radius` effects, but no topology was
> defined. This file defines the world's geometry, how habitat suitability is
> computed and spreads, and how "build it and they come" resolves spatially.
> It **amends file 05** — the additions here are marked `(AMENDS 05)`.

---

## 1. Decision: Hexagonal grid, axial coordinates

The world is a **hex grid**, not a square grid or region graph.

**Why hex over square:** every neighbor is the same distance away, so habitat
spread, falloff, and `radius` effects are **isotropic** — a restored wetland
radiates suitability in a clean ring rather than a square with weird diagonals.
Because "shape habitat → watch life spread outward legibly" (Pillar 5) is the
core feeling, isotropy is worth the handful of helper functions hex needs.

**Why not a region graph:** radius/distance effects and the intimate-zoom
"walk a corridor" moment both want real geometry, not abstract adjacency.

### Size (v1)
A hexagon-shaped map of radius `R`. Cell count = `3R(R+1) + 1`.
- **Default `R = 8` → 217 cells.** Big enough for 4–5 contiguous biome regions
  and a wildlife corridor; small enough that per-cell sim is trivially cheap and
  the whole thing instances in one draw call per mesh type.
- Keep `R` in `CONFIG.world.radius` so it's tunable.

### Coordinates (axial `q, r`)
Each cell has axial coords `(q, r)` with implicit `s = -q - r`.
```ts
// Hex distance (axial):
function hexDistance(a, b) {
  return (Math.abs(a.q - b.q)
        + Math.abs(a.q + a.r - b.q - b.r)
        + Math.abs(a.r - b.r)) / 2;
}
// The 6 neighbor directions:
const HEX_DIRS = [[+1,0],[+1,-1],[0,-1],[-1,0],[-1,+1],[0,+1]];
```

### `(AMENDS 05)` `WorldCell` gains coordinates
```ts
export interface WorldCell {
  id: number;
  q: number; r: number;          // NEW: axial coordinates
  biome: BiomeType;
  habitatQuality: number;        // RENAMED from habitatSuitability: 0..1 dynamic field
  buildingId?: string;
}
```
`habitatQuality` is the cell's *biome-agnostic* health (how cared-for / undisturbed
the land is). Per-*species* suitability is derived from it in §3 — that rename
removes the ambiguity in the old single `habitatSuitability` field.

---

## 2. Biome layout

Biomes are **contiguous regions**, not per-cell noise — a forest is a blob of
forest cells, so corridors and edges are meaningful.

- v1 ships **one hand-authored layout** (a seed) so the worked example (file 10)
  is reproducible. Procedural generation is post-v1.
- Authoring format: a flat array of `{ q, r, biome }` plus a default
  `habitatQuality` per biome (its `baseQuality`). Stored in `src/data/world.seed.ts`.
- Target seed composition for R=8: ~forest 35%, grassland 30%, wetland 15%,
  coast_shallow 10%, desert (dead zone) 10%. Desert exists so the late-game
  terraforming lever (file 03 §7) has something to convert.

---

## 3. Habitat suitability (the core spatial computation)

Two layers: a dynamic **quality field** per cell, and a derived **per-species
suitability**.

### 3a. Quality field — buildings/actions push it, with hex falloff
Each tick, for every cell:
```
habitatQuality(cell) = clamp(
    biome.baseQuality
  + Σ over active HabitatEffects e:
        e.suitabilityDelta × falloff(hexDistance(cell, e.origin), e.radius),
  0, 1)

falloff(d, radius) = d > radius ? 0 : (1 - d / (radius + 1))   // linear, isotropic
```
- A building/action with `radius: 0` affects only its own cell.
- `suitabilityDelta` is usually **positive** (no dirty path). The rare negatives
  (e.g. a dense early settlement) are small and local — and are exactly what the
  stewardship actions in file 09 are designed to offset, which is where the
  synergy decision lives.
- `createsBiome` / `convertsBiome`: an effect may flip a cell's `biome` (e.g.
  Protect Wetland firming a marsh edge; late-game terraform desert→grassland).
  Biome flips are discrete and logged so the change is legible.

### 3b. Per-species suitability
```
suitability(cell, s) = biomeMatch(s, cell.biome) × habitatQuality(cell)

biomeMatch(s, b) = b ∈ s.preferredBiomes ? 1.0 : CONFIG.offBiomePenalty   // default 0.2
```
A species only thrives where *both* the biome fits **and** the land is healthy.

---

## 4. Populations & "build it and they come" (spatial resolution)

Honors file 05's `SpeciesPresence { speciesId, population, cellIds }` — **one
aggregate population per species** plus the cells where its markers render.

### Carrying capacity (global, summed over cells)
```
K(s) = Σ over cells where suitability(cell,s) ≥ s.arrivalThreshold:
          s.baseCarryingCapacity × suitability(cell, s) × keystoneFactor(cell, s)
```
Cells below the species' `arrivalThreshold` contribute **0** — a species won't
cling to land that can't support it. `keystoneFactor` is `1 + Σ keystoneBoost`
of healthy keystones whose range covers the cell (see §5).

### Logistic growth toward K
```
pop(s) += CONFIG.populationGrowthRate × pop(s) × (1 − pop(s) / K(s))   // gentle
```

### Arrival (the "and they come" moment)
A currently-absent species (`pop = 0`) **arrives** when, for `arrivalGraceTicks`
consecutive ticks:
1. at least one cell has `suitability(cell, s) ≥ s.arrivalThreshold`, **and**
2. a **source** exists: the species is age-enabled (`ageAvailableFrom`) and not
   `reintroOnly`. (v1 uses a regional source pool; spatial source-population
   recolonization is a post-v1 refinement.)

On arrival, seed a founder population = `CONFIG.founderFraction × K(s)` (e.g.
0.1) so growth has something to compound. `reintroOnly` species never satisfy
condition 2 naturally — they require the late-age reintroduce action.

### Where markers render
`cellIds` = the top-N cells by `suitability(cell, s)` (N small, e.g. 3), so the
representative creature + count label (HoMM style) appears in the species'
best habitat. Population label = `pop(s)` rounded.

---

## 5. Keystone effects & cascades (spatial)

A keystone (e.g. **Beaver**, file 09) that is present **and healthy**
(`pop ≥ cascadeThreshold × K`) projects its `keystoneBoost` to every cell within
its range (its `cellIds` ± a `keystoneRadius`), raising `keystoneFactor` there
and unlocking `supportsNiches` for other species (i.e. making those niches count
toward `NicheCoverage` in file 03 §2).

If the keystone drops **below** `cascadeThreshold × K`, withdraw the boost
gradually (`CONFIG.cascade.recoveryRate` per tick, both directions) so dependent
species decline and recover **smoothly and reversibly** (Pillar 1). No instant
collapse.

---

## 6. `(AMENDS 05)` CONFIG additions
```ts
world: {
  radius: 8,                 // hex map radius → 3R(R+1)+1 cells
},
offBiomePenalty: 0.2,        // biomeMatch when biome not preferred
founderFraction: 0.1,        // founder pop on arrival, × K
keystoneRadius: 2,           // hex rings a healthy keystone boosts
// (existing: populationGrowthRate, arrivalGraceTicks, cascade, ...)
```

---

## 7. What this unblocks
With geometry pinned, the M1 sim can compute real per-cell suitability, the M3
building loop has a well-defined placement + falloff model, and file 10's worked
example is reproducible tick-for-tick. Everything here resolves to `CONFIG` —
nothing hardcoded in sim logic (file 05 principle).
