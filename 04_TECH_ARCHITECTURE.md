# 04 — Technical Architecture

## Recommended Stack

| Concern | Choice | Why |
|---|---|---|
| Language | **TypeScript** | Type-safe data schemas (file 05) prevent a class of sim bugs. |
| Build/dev | **Vite** | Fast dev server, simple, great DX. |
| 3D rendering | **Three.js** via **React Three Fiber (R3F)** | Web-native 3D, instant shareability, declarative scene graph. |
| R3F helpers | **@react-three/drei** | Camera controls, instancing, helpers — saves weeks. |
| UI layer | **React** | HUD, panels, tech tree UI over the 3D canvas. |
| State | **Zustand** | Simple, fast, works cleanly outside React (sim loop can read/write store without re-render storms). |
| Animation/tween | **@react-three/drei** + lightweight tween util | Smooth camera + value transitions. |

### Why web / Three.js over Unity (decision rationale)
The game's *purpose* is to inspire people — that makes **one-click shareability**
a first-class feature, which the web wins decisively. Unity/Godot give richer
3D tooling and asset pipelines but cost shareability (downloads) and add
friction for a "click a link, see the hopeful future" experience. The simulation
here is **population-level math, not heavy per-agent physics**, so we don't need
a heavy engine. If the project later demands AAA 3D, the design docs are
engine-agnostic enough to port.

## Critical Architecture Principle: Separate Sim From Render

The **simulation is the source of truth**, not the scene graph.

```
        ┌────────────────────────┐
        │   Simulation Core      │   pure TS, no Three.js, no React
        │  (fixed-timestep tick) │   deterministic, unit-testable
        └───────────┬────────────┘
                    │ writes
                    ▼
        ┌────────────────────────┐
        │   Game State (Zustand) │   single source of truth
        └───────┬────────┬───────┘
         reads  │        │  reads
                ▼        ▼
     ┌──────────────┐  ┌──────────────────┐
     │ R3F 3D Scene │  │ React HUD / Panels│
     │ (renders     │  │ (score, tech tree,│
     │  state)      │  │  build menu)      │
     └──────────────┘  └──────────────────┘
```

- The **sim core** is plain TypeScript with **no rendering dependencies**. It
  can run headless in tests. This is essential for balancing and correctness.
- The sim runs on a **fixed timestep** (e.g. accumulator pattern), decoupled
  from the render frame rate. Rendering interpolates/reads the latest state.
- Rendering and UI are **pure consumers** of state. They never own game truth.

This separation is the single most important technical decision. Enforce it.

## Suggested Folder Structure

```
src/
  sim/                  # PURE TypeScript simulation. No three/react imports.
    index.ts            # createSimulation(), tick()
    economy.ts
    ecosystem.ts        # populations, niches, keystones, "build it & they come"
    wellbeing.ts
    biodiversity.ts
    ageProgression.ts
    types.ts            # re-exports from data/schemas
    config.ts           # ALL tunable coefficients live here
  data/                 # static content as typed data (see file 05)
    ages.ts
    tech.ts
    species.ts
    buildings.ts
    biomes.ts
  state/
    store.ts            # Zustand store; bridges sim <-> UI/render
    selectors.ts
  render/               # R3F scene
    Scene.tsx
    World.tsx           # terrain / biomes
    Buildings.tsx       # instanced building meshes
    Creatures.tsx       # representative creature + population label (HoMM style)
    CameraRig.tsx       # dual-zoom macro <-> intimate
  ui/                   # React HUD over the canvas
    FlourishingMeter.tsx
    TechTreePanel.tsx
    BuildMenu.tsx
    InspectorOverlay.tsx  # dev-only: live sub-indices
  app/
    App.tsx
    gameLoop.ts         # fixed-timestep driver calling sim.tick()
  main.tsx
```

## The Game Loop (fixed timestep)

```ts
// app/gameLoop.ts (sketch)
const TICK_MS = 1000 / 6;          // 6 sim ticks/sec; tune later
let acc = 0, last = performance.now();

function frame(now: number) {
  acc += now - last; last = now;
  while (acc >= TICK_MS) {
    sim.tick(TICK_MS / 1000);       // advance simulation by fixed dt
    acc -= TICK_MS;
  }
  // render reads latest state; optionally interpolate for smoothness
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

The sim writes results into the Zustand store at the end of each tick (or in
batches) so React/R3F re-render only when relevant slices change.

## Rendering Notes

- **Instancing** for buildings and creatures (R3F `<Instances>`), since there
  can be many. Population is a *number*, so you render one representative mesh
  plus a count label, not N meshes — cheap and on-brand (HoMM style).
- **Dual-zoom camera:** one `CameraRig` that smoothly transitions between a
  pulled-back macro framing and a close intimate framing (drei `CameraControls`
  or a custom rig). Consider snapping to "follow this herd / this plaza" in the
  intimate view.
- **Biomes as terrain regions:** v1 can use a low-poly tile/region terrain with
  per-region biome material; keep it stylized, not photoreal (faster + warmer).
- Keep art **stylized and friendly** to match the hopeful tone (Pillar 1/5).

## Open-Source To Scout (don't block on these)

The biggest reusable value is in **simulation patterns** and **R3F building
blocks**, not a drop-in whole game. Worth a look during M0:
- R3F + drei ecosystem (camera controls, instancing, performance helpers).
- Any MIT-licensed low-poly nature/building asset packs for placeholder art.
- Agent/ABM and logistic-growth references for the population model (concepts,
  not necessarily code).
Verify licenses before pulling anything in. Prefer small, well-licensed pieces
over a heavy framework that fights our sim/render separation.

## Performance Targets (v1)

- 60fps render on a mid laptop with a few hundred buildings + dozens of species
  markers.
- Sim tick well under frame budget (it's lightweight population math).
- Initial load light enough to share over a link (lazy-load heavier assets).

## Testing

- **Unit-test the sim core headless** (no render). Especially: the master
  equation, eco-multiplier crossing 1.0, keystone cascade + recovery, age-up
  dual gate, "build it and they come" arrival thresholds.
- Determinism: same seed + same inputs → same outputs. Makes balancing sane.
