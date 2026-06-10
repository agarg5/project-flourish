# 03 — Simulation Model (The Math)

This file specifies *how the numbers actually work*. These formulas are a
**starting point for balancing**, not sacred constants. The relationships
(what multiplies what) matter more than the exact coefficients. Keep all tunable
values in a central config (see file 05) so balancing is easy.

---

## 0. Design Intent Recap

- One visible score: **Planetary Flourishing**.
- It only rises when **well-being and biodiversity rise together** (multiplicative).
- **Ecological health multiplies the economy.**
- The economy funds R&D + stewardship → the virtuous spiral.
- No clock. Recovery is always possible.

---

## 1. The Master Equation

```
Flourishing = Wellbeing × Biodiversity
```

Both factors are normalized to a comparable scale (e.g. 0–100, or 0–1 internally
and displayed scaled). Because it is a product:

- High Wellbeing × low Biodiversity → low Flourishing.
- Low Wellbeing × high Biodiversity → low Flourishing.
- Only raising **both** moves the headline number meaningfully.

Display tip: show the single Flourishing number prominently, with Wellbeing and
Biodiversity available as the two "under the hood" contributors when the player
wants detail. (Reinforces synergy without hiding the levers.)

---

## 2. Biodiversity

Biodiversity is **not** a raw species count. Model it as a blend:

```
Biodiversity =
    w_niche    * NicheCoverage
  + w_keystone * KeystoneHealth
  + w_pop      * PopulationHealth
  + w_biome    * BiomeDiversity
```

Where (all terms normalized 0–1):

- **NicheCoverage** = fraction of ecological "jobs" filled across the world
  (pollinator, seed-disperser, soil-turner, predator-balancer, etc.). Filling
  more distinct niches matters more than piling up individuals of one species.
- **KeystoneHealth** = how well keystone species are doing. Keystones are
  weighted heavily; losing one triggers a **cascade** (see §5).
- **PopulationHealth** = how close present species' populations are to the
  habitat's healthy carrying capacity (penalize both collapse and unsustainable
  overshoot).
- **BiomeDiversity** = variety and extent of viable habitat types. This is the
  lever the Hestia end-game pushes hardest (eliminate dead zones → more biomes
  productive → higher ceiling).

Suggested starting weights: `w_niche=0.35, w_keystone=0.30, w_pop=0.20,
w_biome=0.15`. Tune later.

---

## 3. Well-being

```
Wellbeing =
    w_needs     * NeedsMet
  + w_amenity   * Amenities
  + w_env       * EnvironmentalQuality
  - w_crowd     * Overcrowding
```

- **NeedsMet** = food, shelter, water, energy provided vs. population demand.
- **Amenities** = services, culture, recreation, access (the 15-minute-city
  idea: how easily citizens reach what they need).
- **EnvironmentalQuality** = local nature access, air/water quality, green space
  — the **biophilia** link (proximity to nature directly raises well-being, a
  real and important coupling that reinforces synergy).
- **Overcrowding** = density beyond what infrastructure + greenspace supports.

Note the `EnvironmentalQuality` term: it means a *greener world literally makes
citizens happier*, so the two halves of Flourishing reinforce each other not
only at the top-level product but inside Well-being too. Keep this coupling — it
is thematically central.

---

## 4. Economy

```
BaseOutput   = sum of economic output from buildings/activities
EcoMultiplier = f(EcologicalHealth)          // ranges roughly 0.5 … 1.5+
EconomicOutput = BaseOutput × EcoMultiplier

Income(tick) = EconomicOutput − Upkeep
```

- **EcologicalHealth** is closely related to Biodiversity but can be its own
  rolled-up health index (habitat quality, climate stability, resource
  renewability). Simplest v1: reuse Biodiversity (or a smoothed version) as the
  EcoMultiplier input.
- **EcoMultiplier** should be able to dip **below 1.0** when nature is degraded
  (ecosystem services failing) and rise **above 1.0** when nature thrives
  (pollination, fertile soil, stable climate). This is the mechanical core of
  "nature is a multiplier, not a constraint."
- Spend `Income` on: buildings, **R&D**, **stewardship**.

---

## 5. Dynamics Over Time (The Tick)

Run a **fixed-timestep simulation tick** (e.g. 4–10 ticks/sec sim time,
decoupled from render — see file 04). Each tick, roughly:

1. **Habitat suitability** recomputed per biome cell from current buildings,
   restoration, pollution/quality, and biome type.
2. **Species populations** move toward carrying capacity implied by habitat
   suitability + niche availability (logistic-style growth; gentle, legible).
   - "Build it and they come": when a cell's suitability for a species crosses a
     threshold and a source population exists, that species **arrives**.
   - **Reintroduction** lets the player inject a source population for
     locally-extinct species (rare, late-age).
3. **Keystone cascades:** if a keystone's population crosses below a threshold,
   apply downstream penalties to the species/niches it supports (and reversible
   recovery when it returns). Keep cascades *gentle and recoverable* (Pillar 1).
4. **Derived indices** recomputed: Biodiversity, Wellbeing, EcologicalHealth.
5. **Economy** resolved: output × eco-multiplier − upkeep → income → treasury.
6. **R&D** accrues from R&D spend; check unlocks.
7. **Flourishing** recomputed and surfaced.

All of this should be **smooth and slow enough to read** — the player should be
able to watch a wetland restoration gradually attract life and lift the score.

---

## 6. Age-Up Check

```
canAdvanceAge =
     researchPoints >= age.requiredResearch
  && EcologicalHealth >= age.requiredEcoHealth   // sustained, not a single spike
```

Track the eco-health condition as *sustained over N ticks* so it is a real
"life has taken hold" state, not a momentary blip. Because there is no dirty
path, `requiredEcoHealth` is a gentle checkpoint, not a punishing wall.

Advancing an age **raises ceilings**: max possible Biodiversity, max Wellbeing,
and the economic ceiling all increase, and new tech/buildings/actions unlock.

---

## 7. The Hestia Ceiling (End-Game Target)

Late ages let the player **raise the world's intrinsic capacity** beyond the
Earth-like baseline:

- Converting dead zones (deserts, frozen/barren areas, deep lifeless water) into
  productive habitat increases `BiomeDiversity` and the global carrying capacity.
- The theoretical ceiling rises toward a **Hestia-inspired "superhabitable"
  cap** — a world that supports far more life than the starting planet.
- This is the mathematical expression of the game's final emotional beat:
  *humanity made the planet more alive than it found it.*

Represent the ceiling explicitly (e.g. `worldCarryingCapacity`) so the player
can see their world's *potential* growing, not just their current score.

---

## 8. Balancing Guidance

- Keep every coefficient in one config object (file 05). Never hardcode in logic.
- Favor **gentle** curves; this is a calm sandbox. Avoid sharp cliffs.
- Make sure the **greener path compounds** so patience is rewarded *without*
  punishing experimentation.
- Make cause→effect visible within a few seconds of sim time wherever possible.
- Provide a debug/inspector overlay (dev-only) that shows every sub-index live.
