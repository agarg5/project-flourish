# Project Flourish — Planning Docs (Start Here)

> A 3D, web-based, relaxed sandbox city/civilization builder where humanity
> learns to flourish *with* nature across seven technological ages — from the
> Stone Age to an idealized, Hestia-inspired future.

This folder is a **planning package** intended to be handed to Claude Code (or
any capable engineering agent) to build the game in stages. It is intentionally
split into multiple focused files so each can be read, referenced, and
implemented independently.

---

## The One-Sentence Pitch

Build a civilization that flourishes *with* nature — not against it — across
seven ages of technology, guided by a single **Planetary Flourishing** score
that only rises when human well-being and biodiversity rise *together*.

---

## Read These In Order

| # | File | What it covers |
|---|------|----------------|
| 00 | `00_README_START_HERE.md` | This file. Orientation + reading order. |
| 01 | `01_VISION_AND_PILLARS.md` | The non-negotiable creative vision, tone, and design pillars. |
| 02 | `02_GAME_DESIGN_SPEC.md` | Full gameplay design: ages, scoring, economy, ecosystem, tech tree. |
| 03 | `03_SIMULATION_MODEL.md` | The math/feedback model. How economy ↔ biodiversity ↔ well-being interact. |
| 04 | `04_TECH_ARCHITECTURE.md` | Engine, stack, libraries, folder structure, simulation loop design. |
| 05 | `05_DATA_SCHEMAS.md` | Concrete TypeScript data shapes for ages, tech, species, buildings, biomes. |
| 06 | `06_BUILD_ROADMAP.md` | Phased build plan (milestones M0–M6) sized for long focused work sessions. |
| 07 | `07_RESEARCH_NOTES.md` | The real-world science grounding the game (ecology, urban design, Hestia). |
| 08 | `08_SPATIAL_MODEL.md` | The world's geometry (hex grid), habitat-suitability field, and spatial "build it & they come" resolution. **Amends file 05.** |
| 09 | `09_SEED_CONTENT.md` | Concrete Stone + Agricultural content (biomes, species, buildings, tech, actions) the sim needs to be real. |
| 10 | `10_WORKED_EXAMPLE.md` | A traced first session proving the core decision is interesting; doubles as the M1 golden-test fixture. |
| 11 | `11_DEMO_DECISIONS.md` | Demo-scoped decisions: assets, audio, hosting, starter map, sim tuning defaults, test harness, onboarding. |

---

## Core Design Decisions (Locked)

These were settled deliberately. Do not silently change them; if a tradeoff
forces a change, surface it explicitly.

- **Platform:** Web-based 3D. Shareability (click a link, play) is a first-class
  goal because this game is meant to *inspire people*.
- **Stack:** Three.js via React Three Fiber + TypeScript + Vite + Zustand.
- **Camera:** Dual-zoom — pull back for an Age-of-Empires macro view of the
  whole living planet; zoom in for a Roller-Coaster-Tycoon intimate view of
  animals moving and citizens enjoying spaces.
- **Structure:** One continuous map with multiple biomes. Endless. No win/lose.
- **Pace:** Fully relaxed sandbox. **No time pressure / no clock** in v1.
- **Ages:** Seven — Stone → Agricultural → Bronze/Iron → Industrial → Modern →
  Sustainable/Synergy → Futuristic/Stewardship.
- **Score:** One **Planetary Flourishing** score = `wellbeing × biodiversity`
  (multiplicative, so neither can be neglected).
- **Age-up trigger (dual):** Enough **R&D points** *and* a sustained
  **ecological-health threshold**.
- **Economy:** The engine. Ecological health *multiplies* economic output,
  which funds R&D + stewardship, creating a virtuous spiral.
- **Ecosystem:** Heroes-of-Might-&-Magic style — a visible representative
  creature with a population count beside it. Keystone species and niche-filling
  drive biodiversity. **"Build it and they come"** — animals arrive when habitat
  suits them; the player feels *embedded in* the ecosystem, not a hand placing
  furniture. Active reintroduction is a rare, earned, late-age exception.
- **Tech tree:** Mostly-linear spine with a few *sustainable-flavor* branches.
  **No "dirty" options.** Choices are "good vs. even better," never guilt traps.
- **Tone:** Hopeful, inspiring, credible. Grounded in real ecology, urban
  design, and astrobiology research (see file 07).

---

## What "Done" Looks Like For v1

A playable, shareable web prototype where a player can:
1. Start in the Stone Age on a small multi-biome planet.
2. Build, generate an economy, and invest in R&D.
3. Watch wildlife arrive as they create suitable habitat.
4. Advance through at least the first 3–4 ages.
5. See the Planetary Flourishing score respond legibly to their choices.

Later phases extend to all 7 ages and the Hestia-like end state.
