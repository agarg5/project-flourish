# Project Flourish

> Build a civilization that flourishes *with* nature — not against it — across seven ages of technology, guided by a single **Planetary Flourishing** score that only rises when human well-being and biodiversity rise *together*.

![Project Flourish — a living hex planet](docs/screenshot.png)

A calm, hopeful 3D sandbox in the browser. No clock, no fail state: shape habitat and wildlife arrives on its own; neglect nature and the economy that funds everything quietly throttles. Ecology is a multiplier, not a constraint — and the math enforces it (`Flourishing = Wellbeing × Biodiversity`).

## Run it

```sh
bun install
bun run dev        # → http://localhost:5173
```

```sh
bun test           # headless simulation tests (the sim runs without a renderer)
bun run fastforward  # play five strategies 600 ticks ahead, dump CSVs to tmp/
```

## How it's built

TypeScript + Vite + React Three Fiber + Zustand. The simulation is pure TypeScript with no rendering dependencies — deterministic, fixed-timestep, and unit-tested headless; the 3D scene and HUD are pure consumers of its state.

The full design — vision, simulation model, spatial model, data schemas, and build roadmap — lives in the numbered planning docs ([start here](00_README_START_HERE.md)).

## Status

- ✅ M0–M2: world render, dual-zoom camera, headless sim core (24 tests), live HUD
- 🔨 M3: building placement, stewardship actions, the species-arrival payoff loop
- ⏳ M4–M6: tech tree and age progression UI, late-game restoration, polish + shareable deploy
