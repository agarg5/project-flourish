# 09 — Seed Content (Stone + Agricultural)

> The minimal, concrete content set the M1 sim and M3 building loop need to be
> real and testable. Authored against file 05 schemas + file 08 spatial model.
> Every entry passes file 07's content checklist (grounded, synergistic,
> hopeful, embedded, legible). **Numbers are starting targets** — they live in
> data, get tuned in M3–M5, and seed the golden tests in file 10.

This is *not* the full catalog — just enough for the first two ages so the loop
is playable and the worked example reproducible.

---

## 1. Biomes (`src/data/biomes.ts`)

| type | baseQuality | baseProductivity | baseBiodivCapacity | deadZone | supportsNiches |
|---|---|---|---|---|---|
| `forest` | 0.75 | 0.5 | 0.8 | – | seed_disperser, decomposer, predator_balancer |
| `grassland` | 0.70 | 0.6 | 0.6 | – | grazer, pollinator, soil_engineer |
| `wetland` | 0.80 | 0.4 | 0.9 | – | filter_feeder, pollinator, decomposer |
| `coast_shallow` | 0.80 | 0.5 | 1.0 | – | filter_feeder, grazer |
| `desert` | 0.10 | 0.1 | 0.1 | ✓ | — |

`coast_shallow` has the highest biodiversity capacity — the Hestia nod (file 07
§E: shallow sunlit seas are the most productive habitat). `desert` is the dead
zone the late-game terraform lever targets.

---

## 2. Species (`src/data/species.ts`)

Stone-age wild species + the keystone. (Domesticated species are economy inputs,
not wild-biodiversity counters, so they're modeled as building effects, not here.)

| id | name | keystone | niches | preferredBiomes | arrival | baseK | notes |
|---|---|---|---|---|---|---|---|
| `deer` | Red Deer | – | grazer, seed_disperser | forest, grassland | 0.35 | 200 | easy early arrival |
| `wild_bee` | Wild Bee | – | pollinator | grassland, forest | 0.30 | 500 | lowest threshold; first to arrive |
| `boar` | Wild Boar | – | soil_engineer, seed_disperser | forest, grassland, wetland | 0.40 | 150 | |
| `heron` | Grey Heron | – | filter_feeder | wetland, coast_shallow | 0.40 | 80 | |
| `beaver` | Eurasian Beaver | ✓ | soil_engineer | wetland | 0.45 | 60 | **keystone**; see below |
| `wolf` | Grey Wolf | – | predator_balancer | forest, grassland | 0.55 | 40 | high threshold; arrives last, needs prey |

### Beaver (keystone) extra fields
```ts
keystoneBoost: 0.4,                       // +40% capacity in range when healthy
supportsNiches: ['filter_feeder','decomposer'],  // unlocks these for others
cascadeThreshold: 0.4,                    // below 40% of K → boost withdraws
```
Grounded directly in file 07 §A (beavers engineer wetlands that support whole
communities). It's the cascade demo: protect the wetland → beaver arrives →
wetland capacity jumps → heron (filter_feeder) niche opens → biodiversity steps up.

---

## 3. Buildings (`src/data/buildings.ts`)

All framed as coexistence (no dirty path). Habitat deltas are local; the small
negatives are the friction the stewardship actions (§5) are meant to offset —
that offset *is* the central synergy decision.

### Stone Age
```ts
{ id:'forager_camp', ageId:'stone', cost:20, upkeep:1,
  footprintBiomes:['forest','grassland','wetland'],
  effects:{ economicOutput:4,
            wellbeing:[{target:'wellbeing',op:'add',value:6,note:'needs: food'}],
            habitat:[{ suitabilityDelta:-0.05, radius:1 }] } },   // light, local

{ id:'fire_hearth', ageId:'stone', cost:15, upkeep:0,
  footprintBiomes:['forest','grassland'],
  effects:{ wellbeing:[{target:'wellbeing',op:'add',value:5,note:'amenity: warmth/gathering'}],
            habitat:[{ suitabilityDelta:0, radius:0 }] } },
```

### Agricultural Age
```ts
{ id:'polyculture_plot', ageId:'agricultural', cost:35, upkeep:2,
  footprintBiomes:['grassland'],
  effects:{ economicOutput:9,
            wellbeing:[{target:'wellbeing',op:'add',value:8,note:'needs: surplus food'}],
            habitat:[{ suitabilityDelta:+0.04, radius:2, note:'hedgerows aid pollinators' }],
            attractsSpecies:['wild_bee'] } },   // synergy: food AND habitat

{ id:'granary', ageId:'agricultural', cost:30, upkeep:1,
  footprintBiomes:['grassland','forest'],
  effects:{ economicOutput:3,
            wellbeing:[{target:'wellbeing',op:'add',value:6,note:'needs: food stability'}] } },

{ id:'irrigation_channel', ageId:'agricultural', cost:25, upkeep:1,
  footprintBiomes:['grassland','wetland'],
  effects:{ habitat:[{ suitabilityDelta:+0.06, radius:2, note:'damp edges → wetland-friendly' }],
            attractsSpecies:['heron'] } },
```
`polyculture_plot` is the showpiece: it raises wellbeing (food) **and** habitat
(hedgerows) at once — file 07 §B, monoculture→polyculture. Compare to a
hypothetical bare farm and the synergy framing is obvious.

---

## 4. Tech (`src/data/tech.ts`) — minimal spine for two ages

```
stone:        fire → tools → shelter            (unlocks forager_camp, fire_hearth)
agricultural: cultivation → polyculture          (unlocks polyculture_plot, granary)
                          → irrigation            (unlocks irrigation_channel)
              [branch] terrestrial-polyculture vs aquaculture-emphasis  (post-seed)
```
Each tech: `researchCost` ascending (e.g. 10, 25, 40, 60, 90). The dual age-up
gate (file 03 §6) uses the age's `requiredResearch` + `requiredEcoHealth`.

### Ages (`src/data/ages.ts`) — first two
```ts
{ id:'stone', index:0, requiredResearch:0,   requiredEcoHealth:0.0, ecoHealthSustainTicks:0,
  ceilings:{ maxWellbeing:40, maxBiodiversity:80, economyCeiling:50,  worldCarryingCapacity:100 } },
{ id:'agricultural', index:1, requiredResearch:120, requiredEcoHealth:0.60, ecoHealthSustainTicks:180,
  ceilings:{ maxWellbeing:65, maxBiodiversity:90, economyCeiling:120, worldCarryingCapacity:120 } },
```
Note Stone starts with **high biodiversity ceiling, low wellbeing ceiling** —
the player begins nature-rich and comfort-poor (see file 10). The
`requiredEcoHealth: 0.60` gate is why a build-only rush stalls.

---

## 5. Stewardship Actions (`src/data/actions.ts`) — available early, light

```ts
{ id:'plant_hedgerow', ageId:'stone', cost:12, kind:'restore',
  effects:{ habitat:[{ suitabilityDelta:+0.05, radius:2 }] } },

{ id:'protect_wetland', ageId:'agricultural', cost:18, kind:'protect',
  effects:{ habitat:[{ suitabilityDelta:+0.10, radius:2, note:'firms marsh → invites beaver' }] } },
```
`reintroduce` / `terraform` actions are deliberately **out of seed scope** (late
ages, file 06 M5). Early stewardship is cheap and additive so the synergy choice
("spend this income on another camp, or on a hedgerow that holds biodiversity?")
exists from the first minutes.

---

## 6. Coverage check
This seed gives the sim: 5 biomes, 6 wild species (incl. 1 keystone with a real
cascade), 5 buildings, 5 techs across 2 ages, 2 stewardship actions. Enough to
exercise every M1 sim path — arrival, logistic growth, keystone cascade+recovery,
eco-multiplier crossing 1.0, and the dual age-up gate — and to run file 10's
worked example end to end.
