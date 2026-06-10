# 06 — Build Roadmap

Phased plan sized so each milestone is a coherent chunk a focused coding session
can deliver. Each milestone ends in something **runnable and demonstrable**.
Build the **sim core before the pretty rendering** — the game must be *correct*
before it is *beautiful*.

> Golden rule: keep the sim/render separation (file 04) from day one. It is
> painful to retrofit.

---

## M0 — Foundation & Skeleton
**Goal:** Project runs; architecture in place; empty world renders.
- Scaffold Vite + TypeScript + React + R3F + drei + Zustand.
- Implement the folder structure from file 04.
- Implement the data schemas + `CONFIG` from file 05 (even if sparsely filled).
- Fixed-timestep game loop calling a no-op `sim.tick()`.
- Render a static stylized terrain with 2–3 biomes and the dual-zoom camera rig.
**Demo:** You can fly the camera macro↔intimate over an empty multi-biome world.

## M1 — Simulation Core (headless-correct)
**Goal:** The beating heart works and is tested, before heavy visuals.
- Implement economy, well-being, biodiversity, ecological health, and the
  master equation (`Flourishing = Wellbeing × Biodiversity`) per file 03.
- Implement the eco-multiplier crossing 1.0 in both directions.
- Implement population dynamics (logistic growth toward habitat-implied capacity)
  and **"build it and they come"** arrival logic.
- Implement keystone cascade + gentle recovery.
- **Unit tests** for all of the above (headless, no render).
**Demo:** A headless script ticks the sim and prints indices changing sensibly.

## M2 — State Bridge & Live HUD
**Goal:** See the sim through a minimal UI.
- Wire sim → Zustand store → React HUD.
- `FlourishingMeter` (headline number + the two contributors).
- Dev-only `InspectorOverlay` showing every sub-index live.
- Basic treasury + spend-split control (buildings / R&D / stewardship).
**Demo:** Watch numbers move live as the sim runs; adjust spend split and see effects.

## M3 — Building & Habitat Loop
**Goal:** The player can act on the world and see life respond.
- Build menu (age-gated). Place buildings on cells; instanced rendering.
- Buildings apply habitat effects; habitat suitability updates per cell.
- Species **arrive on their own** when suitability crosses thresholds; render
  representative creature + population count (HoMM style).
- First real content pass: Stone + Agricultural age buildings/species/biomes.
**Demo:** Restore/plant habitat → watch a species arrive → Biodiversity (and the
Flourishing score) climb.

## M4 — Tech Tree & Age Progression
**Goal:** The full progression spine is playable.
- Tech tree UI (mostly-linear spine + a few sustainable branches).
- R&D accrual from spend; unlocks buildings/actions/species/modifiers.
- Dual age-up gate (R&D + sustained eco-health); age-up raises ceilings.
- Content through at least Industrial or Modern age.
**Demo:** Play from Stone Age through several age-ups, unlocking greener tech.

## M5 — Stewardship, Restoration & the Hestia Ceiling
**Goal:** The hopeful late-game and the thesis payoff.
- Stewardship/restoration actions (restore, rewild, protect).
- Rare reintroduction action for locally-extinct species.
- Dead-zone terraforming that **raises world carrying capacity** toward the
  Hestia-inspired ceiling.
- Content for Modern → Synergy → Stewardship ages.
**Demo:** Convert a dead zone to productive habitat; watch the world's *potential*
and life both rise toward the idealized future.

## M6 — Polish, Feel & Shareability
**Goal:** It feels warm, calm, inspiring — and is easy to share.
- Art/tone polish (stylized, friendly), smooth camera, smooth value transitions.
- Intimate-view "watch this herd / this plaza" moments.
- Onboarding/first-session flow that teaches the loop gently.
- Performance pass + light initial load; deploy to a shareable URL.
- (Optional, post-v1) save/load; optional "challenge mode" with a climate clock.
**Demo:** Send a friend a link; they play and *feel* the hopeful vision.

---

## Sequencing Notes For The Coding Agent
- Do **M0 → M1 → M2** strictly in order; they establish correctness + visibility.
- M3 and M4 are where it becomes a *game*; keep content data-driven (file 05).
- Resist polishing visuals before the sim is correct and legible.
- After each milestone, leave the build runnable and commit a short note on what
  changed and what's next.
- Keep all balance numbers in `CONFIG`; expect heavy tuning in M3–M5.

## Definition of Done (v1)
Playable, shareable web prototype: start in the Stone Age, build an economy,
invest in R&D, watch wildlife arrive as habitat improves, advance through several
ages, and see the Planetary Flourishing score respond legibly — with a visible
path toward the idealized, Hestia-like future.
