# 02 — Game Design Spec

This is the full gameplay design. File 03 covers the underlying math; this file
covers *what the player experiences and does*.

---

## 1. The World

- **One continuous map**, viewed in stylized 3D, that the player can rotate and
  zoom (dual-zoom: macro ↔ intimate).
- The map contains **multiple biomes** (e.g. forest, grassland, wetland, coast/
  shallow sea, desert, mountain). Biomes have different baseline habitat
  suitability for different species and different building constraints.
- The world is **endless** — no win/lose, no edge-of-map "you finished."
- v1 can ship a single hand-authored small planet; later, procedural variety.

## 2. Camera & Views

- **Macro view (Age of Empires):** Pull back to see the whole civilization and
  biome spread, population of species as clustered markers, the Flourishing
  score climbing.
- **Intimate view (Roller Coaster Tycoon):** Zoom in to watch a representative
  animal move through a wildlife corridor, citizens enjoying a green plaza, a
  pod in the shallow sea. This is where the game earns emotional warmth.

## 3. The Core Score: Planetary Flourishing

- **One visible number**, the thing the player is nurturing upward.
- Computed as **`Flourishing = Wellbeing × Biodiversity`** (see file 03 for the
  exact formulation).
- Multiplicative on purpose: a rich civilization on a dead planet scores low; a
  pristine wilderness with miserable humans scores low. Only raising *both*
  pushes the number up. This is the thesis, enforced by math.
- The score climbs toward a **Hestia-inspired ceiling** that itself rises as the
  player techs up (later ages raise the *cap* on possible flourishing).

## 4. The Economy (The Engine)

- Civilization activity (farming, industry, trade, services) produces economic
  output.
- **Ecological health multiplies economic output.** Healthy ecosystems provide
  "ecosystem services" (pollination, fertile soil, stable climate, clean water)
  that boost the economy; degraded ones choke it (failures, depletion, recovery
  costs).
- Money is spent on three things:
  1. **Infrastructure & buildings** (housing, food, energy, amenities)
  2. **R&D investment** (buys down the tech tree)
  3. **Restoration & stewardship** (actively healing/improving the planet)
- **The virtuous spiral:** healthy planet → strong economy → fund R&D +
  stewardship → greener tech + healing → healthier planet → stronger economy.
- The vicious version (neglect nature → economy weakens → harder to fund fixes)
  exists as gentle pressure, never a punishing death spiral. No clock means the
  player can always recover at their own pace.

## 5. Age Progression

### The Seven Ages
1. **Stone Age** — Hunter-gatherers. Tiny footprint, fully embedded. Baseline.
2. **Agricultural Age** — First settlements & farming. First tradeoffs in land use.
3. **Bronze/Iron Age** — Cities, specialization, trade. Density & greenspace begin to matter.
4. **Industrial Age** — Economic acceleration. Large-scale impact becomes possible.
5. **Modern Age** — Renewables, restoration ecology, corridors, green building. Healing becomes possible.
6. **Sustainable/Synergy Age** — Wildlife-inclusive cities, living buildings, rewilding. Humans become keystone-capable.
7. **Futuristic/Stewardship Age** — Asteroid defense, dead-zone terraforming, climate engineering toward Hestia, interstellar pollination horizon.

### Age-Up Trigger (Dual Gate)
To advance an age, the player must *simultaneously* meet:
- **R&D threshold** — enough research accumulated (the tech exists), AND
- **Ecological-health threshold** — a sustained minimum of ecosystem health (the
  planet can support the leap).

Because there is no dirty path (see tech tree), the ecological threshold is a
gentle "have you let life take hold here?" checkpoint, not a punishing gate.
A pure tech-rush stalls until life catches up — teaching the lesson softly.

### Important: No Forced Crisis
The Industrial Age is *available* but not a mandatory hard lesson. A player who
has been investing wisely can route around its worst impacts. This is the more
hopeful design and fits Pillar 1.

## 6. The Ecosystem & Animals

### Representation (Heroes of Might & Magic style)
- Each present species shows as a **representative creature (or small cluster)**
  with a **population count** beside it (e.g. a herd of elephants marked "×340").
- Under the hood these are **population numbers**, not individually simulated
  agents — light to run, charming to watch.

### Species Roles
- **Keystone species** (e.g. elephants, beavers): disproportionate boosters.
  Their presence raises the whole biome's biodiversity capacity and unlocks
  habitat for other species. Lose them → cascade decline.
- **Niche species:** each fills an ecological "job" — pollinator, seed disperser,
  soil-turner, predator-balancer. **More niches filled = higher *and* more
  resilient biodiversity.**
- **Population health:** numbers rise when habitat + conditions support them,
  fall when degraded. Legible cause-and-effect.

### "Build It And They Come" (Core Interaction)
- The player does **not** place animals. They **shape habitat** (restore a
  wetland, plant mixed forest, create shallow sunlit coast) and animals
  **arrive on their own** when conditions suit them.
- This keeps the player *embedded in* the ecosystem rather than managing a zoo.
- **Reintroduction** is the rare exception: a late-age stewardship tool for
  species that are locally extinct and have no source population to recolonize
  from. It should feel like a meaningful restoration act, not a default verb.

### Biodiversity Score Inputs
Biodiversity is not merely a species count. It is a function of:
`niches filled + keystones thriving + population health + biome diversity`.
(See file 03 for the formula.)

## 7. Research & Development / Tech Tree

### How It Works
- R&D is funded by the economy (which is itself multiplied by ecological health).
- Investing accrues research points → unlock technologies.
- Tech does two jobs: **gates age progression** (the R&D half of the dual trigger)
  and **unlocks new buildings, actions, and capabilities**.

### Shape: Mostly-Linear Spine + A Few Branches
- A clear linear spine carries everyone through the 7-age arc (welcoming, simple,
  teaches the vision).
- A *few* optional branches per age provide expression — but every branch is a
  **sustainable flavor**, never a dirty option. Choices are "good vs. even better."
- Example branches: Agricultural Age → aquaculture emphasis vs. terrestrial
  polyculture; Synergy Age → living-architecture-first vs. rewilding-first.

### Tech By Age (Representative, Not Exhaustive)
- **Stone:** fire, tools, language, shelter → ability to settle.
- **Agricultural:** polyculture/mixed agriculture, irrigation, domestication,
  granaries. (Branch: terrestrial vs. aquaculture emphasis.)
- **Bronze/Iron:** metallurgy, the wheel, trade networks, early green-integrated
  urban planning, water management.
- **Industrial:** mass production, efficient power, rail. (Framed around
  efficiency and scale — no "pollute for profit" option.)
- **Modern:** renewables (solar/wind), restoration ecology, wildlife corridors,
  water treatment, green building standards. First real *reversal* tools.
- **Sustainable/Synergy:** wildlife-inclusive city design, the 15-minute city,
  living buildings (mycelium/mushroom construction), peatland rewetting,
  enhanced rock weathering, large-scale rewilding.
- **Futuristic/Stewardship:** asteroid/planetary defense, desert greening &
  dead-zone terraforming, shallow-sea creation, climate engineering toward
  Hestia-like conditions, interstellar pollination (seeding life beyond Earth).

Each age visibly **raises the ceiling** on both economy and biodiversity — so
teching up means "more synergy is now possible," not just "bigger numbers."

## 8. Buildings & Actions (Per-Age Catalog — To Be Expanded)

Buildings/actions are unlocked by tech and have **habitat effects** (positive or
neutral; with no dirty path, even early ones are framed around coexistence).
Each entry will carry: cost, economic output, well-being effect, habitat/biome
effect, and which species it tends to attract or support. File 05 defines the
data shape; the full catalog is built out during implementation (file 06, M3+).

## 9. UX & Feedback Principles

- **Legibility first.** When the player acts, the world and the score should
  respond in an understandable, visible way.
- **Calm.** No timers, no alarms, no failure screens in v1.
- **Show life responding.** The emotional payoff is watching animals arrive and
  the world grow richer. Prioritize that feedback loop in the UI.
