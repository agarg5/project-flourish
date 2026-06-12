# 12 — Late-Age Vertical (M5): Terraforming, Reintroduction & the Hestia Ceiling

> Implementation plan for the game's missing third act. Closes the gap between
> "a clever scoring demo that ends at the Industrial Age" and the vision's
> actual payoff: *humanity makes the planet more alive than it found it.*
> Pairs with docs 02 §5–7, 05, 06 (M5), and 08.

## Why this is the priority

The emotional arc (doc 01) is *Embedded → Capable → Tested → Steward →
Flourishing*. Today the build delivers the first three; the Steward/Flourishing
beats — the inspiring ones — don't exist. Ages 4–6 are numeric placeholders, the
desert dead-zone is seeded as a "terraform lever" that nothing can pull, and the
Hestia ceiling is a number the sim never reads.

## Key finding: the contracts already exist

Most of this is **wiring up fields the schema already defines** ([types.ts](../src/sim/types.ts)),
not new architecture:

| Field | Defined in | Read by sim today? |
|---|---|---|
| `HabitatEffect.createsBiome` | types.ts:79 | ❌ no |
| `ActionDef.effects.raisesCarryingCapacity` | types.ts:109 | ❌ no |
| `ActionDef.effects.reintroduceSpecies` | types.ts | ❌ no |
| `ActionDef.kind: 'terraform' \| 'reintroduce'` | types.ts | ❌ no (blocked at simulation.ts:219) |
| `SpeciesDef.reintroOnly` | types.ts:68 | ✅ (arrival + biodiversity already honor it) |
| `SpeciesDef.ageAvailableFrom` | types.ts:69 | ✅ (arrival + biodiversity already honor it) |
| `SimState.worldCarryingCapacity` | types.ts:196 | ❌ **stored & bumped on age-up, never used in any calc** |

`reintroOnly` / `ageAvailableFrom` are already honored on arrival
([ecosystem.ts:101-107](../src/sim/ecosystem.ts)) and in the biodiversity niche
filter ([biodiversity.ts:71](../src/sim/biodiversity.ts)) — so late-age species
"just work" once added to data. The real work is the three unread mechanics
(biome conversion, carrying-capacity raise, reintroduction) plus content.

---

## Phase 0 — Make the Hestia ceiling mechanically real (foundational)

Without this, "raising the ceiling" is cosmetic. Make `worldCarryingCapacity`
scale the actual life the world holds.

- Split state into an age baseline + a player-earned bonus so terraforming can
  push the world **past** its age default (that's the thesis):
  - Add `SimState.terraformBonus: number` (starts 0).
  - `worldCarryingCapacity = ageDef.ceilings.worldCarryingCapacity + terraformBonus`,
    recomputed where the age ceiling is applied. On age-up
    ([ageProgression.ts:63](../src/sim/ageProgression.ts)) **preserve**
    `terraformBonus` instead of overwriting (current line clobbers it).
- Feed it into carrying capacity in
  [`computeCapacitiesAndMarkers`](../src/sim/ecosystem.ts): multiply each
  species' `K` by `worldFactor = worldCarryingCapacity / content.ages[0].ceilings.worldCarryingCapacity`
  (= `/100`). At age 0 with no terraforming `worldFactor === 1`, so **existing
  balance and all current tests are unchanged**; in later ages herds visibly
  grow and the system gets more resilient.
- Note on health references: `pristineCapacity` is captured at init (age 0,
  factor 1), so keystone/population health stay anchored to the starting world.
  Biodiversity's 0..1 index is still separately capped by `maxBiodiversity`, so
  growing `K` raises *populations and resilience*, not the index past its
  ceiling — exactly the intended "more life, ceiling rises with you" feel.

**Verify:** unit test — bump `terraformBonus`, tick, assert a species' `K` and
population rise proportionally; assert age-up no longer resets `terraformBonus`.

## Phase 1 — Terraforming (convert dead zones to living biomes)

The headline late-game verb. Turn the eastern desert into living land.

- **Sim — biome conversion.** In [`applyAction`](../src/sim/simulation.ts), after
  paying, if any `effect.createsBiome` is set, mutate `cell.biome = createsBiome`
  (permanent, applied once at action time — *not* in `recomputeHabitat`, which
  runs every tick). Clearing the dead-zone flag is implicit: the new biome isn't
  a dead zone.
- **Sim — carrying-capacity raise.** If `def.effects.raisesCarryingCapacity` is
  set, `state.terraformBonus += that value` (feeds Phase 0).
- **Sim — allow terraform on dead zones.** [simulation.ts:219](../src/sim/simulation.ts)
  currently rejects *all* actions on dead zones. Exempt `kind === 'terraform'`
  (terraform is the one thing you *can* do to a dead zone). Keep the
  already-applied guard.
- **Data — actions** ([actions.ts](../src/data/actions.ts)): add e.g.
  - `green_desert` (terraform, desert→grassland, `+raisesCarryingCapacity`,
    Stewardship age), `create_oasis` (desert→wetland), and a coastal
    `seed_shallows` (open_water/desert-edge→coast_shallow) for the
    "shallow-sea creation" beat (doc 02 §7).
- **Render.** Terrain rebuilds on biome-signature change and the minimap already
  rebuilds on terraform ([Minimap.tsx](../src/ui/Minimap.tsx)) — so a converted
  cell re-greens with no new render code. Verify the existing signature hash in
  [World.tsx](../src/render/World.tsx) includes `biome` (it should).
- **Event + feel:** push a distinct `action` event ("The desert greens…") and
  consider a one-off `sfxAgeUp`-class chime on first terraform.

**Verify:** unit test — terraform a desert cell → `cell.biome` changed, dead-zone
gone, `terraformBonus` raised, and within N ticks a grassland species' `K > 0`
on that cell. Scenario test (below) converts the whole desert patch.

## Phase 2 — Reintroduction (rare, earned restoration act)

- **Sim — reintroduce command.** In `applyAction`, if
  `def.effects.reintroduceSpecies` is set: find that species' state; require its
  current `K >= CONFIG.extinctionFloor` on/near the target (habitat must be
  ready — *you restore the home first, then bring it back*); seed
  `population = max(founderFraction * K, extinctionFloor)`. If `K` is ~0, fail
  with a legible error ("habitat not ready") — this is what makes it *earned*,
  not a spawn button. Push an `arrival` event with special framing.
- **Data — species** ([species.ts](../src/data/species.ts)): add 1–2 `reintroOnly`
  species gated by `ageAvailableFrom: 'modern'/'synergy'`, ideally one
  keystone-tier so the cascade is visible (e.g. a wetland crane / a grassland
  bison). `reintroOnly` already blocks natural arrival, so they only appear via
  this verb.
- **Data — gating.** Unlock the reintroduction action only via a late-age tech
  (Modern "restoration ecology" / Synergy "rewilding") so it stays rare.
- **UI.** BuildMenu already lists unlocked actions; reintroduction needs a clear
  target affordance (which species). Simplest v1: one action per reintro species
  (`reintroduce_crane`), so it's just another action button — no new UI needed.

**Verify:** unit test — reintroduce with no habitat → fails; restore habitat then
reintroduce → species establishes and persists.

## Phase 3 — Late-age content (Modern → Synergy → Stewardship)

Fill the three placeholder ages so age-ups deliver new toys, not just bigger
numbers. All sustainable-flavored (Pillar 1: no dirty path).

- **Techs** ([tech.ts](../src/data/tech.ts)), extending the spine + a branch each:
  - *Modern:* renewables (econ `mul` + wellbeing), restoration_ecology (unlocks
    reintroduction + green building), wildlife_corridors (habitat action).
  - *Synergy:* living_buildings (mycelium construction — strong wellbeing +
    positive habitat), rewilding (large-radius habitat action), 15-min-city
    branch (wellbeing/crowding relief).
  - *Stewardship:* terraforming (unlocks Phase-1 actions), shallow_sea_creation,
    planetary_defense (flavor/econ).
- **Buildings:** 2–3 per age with the established shape (cost, upkeep,
  economicOutput, `needs:`/`amenity:` wellbeing mods, *positive or neutral*
  habitat). Living buildings should have positive habitat deltas — cities that
  are habitats (doc 02 §7).
- **Species:** a few `ageAvailableFrom`-gated natural arrivals for the richer
  late world (e.g. coast/wetland fauna once shallows exist), boosting niche
  coverage as the world heals.
- **Tuning:** ages 4–6 ceilings in [ages.ts](../src/data/ages.ts) are already
  roughed in; tune `requiredResearch` / `requiredEcoHealth` against a real
  steward-forward playthrough so the pacing isn't a wall.

## Phase 4 — Legibility & the "we did it" payoff

- **Hestia ceiling UI.** Surface `worldCarryingCapacity` (and how far above the
  age baseline the player has pushed it via terraforming) somewhere calm — e.g.
  a "World Vitality / Potential" readout near the FlourishingMeter. This is the
  visible horizon the whole game points at; right now nothing shows it.
- **Events** for the milestone beats: first terraform, first reintroduction,
  reaching Stewardship age, world carrying capacity passing the starting world's.
- (Optional) a gentle end-state acknowledgement when the world is measurably
  richer than the starting seed (more live biomes, higher `worldCarryingCapacity`,
  dead zones eliminated) — the final emotional beat, with no win/lose framing.

## Phase 5 — Scenario coverage

- Extend [scenarios.test.ts](../src/sim/__tests__/scenarios.test.ts) /
  [scenarios.ts](../src/sim/scenarios.ts) with a `stewardToHestia` strategy that
  runs long enough to reach late ages, terraform the desert patch, and reintroduce
  a species. Assert: dead-zone biome count drops to ~0, `worldCarryingCapacity`
  exceeds the Stewardship age baseline, the reintroduced species persists, and
  the synergy invariant still holds.
- Run [`scripts/fastforward.ts`](../scripts/fastforward.ts) to sanity-check the
  late-age curve in the summary table.

---

## Sequencing & risk

Phase 0 first (everything else is cosmetic without it), then 1 → 2 can land
independently, then 3 fills content, 4–5 are polish/proof. Phases 0–2 are pure
sim + small data and fully unit-testable headless — no render risk. Phase 3 is
data volume (tuning-heavy, low structural risk). The biggest *design* call is
how aggressively terraforming should raise `worldCarryingCapacity` (Phase 0
`worldFactor`) — recommend starting conservative and tuning against fastforward.

## Out of scope (defer)

Citizens/villagers in the intimate view (gap #2), more keystones broadly (gap
#3), player-facing cell inspector (gap #4), wider tech branching (gap #5). These
are separate verticals; this plan is the third act only.
