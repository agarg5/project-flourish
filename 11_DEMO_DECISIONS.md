# 11 — Demo Decisions (Filling the Gaps)

These decisions close the open questions from the planning docs, scoped to a
**playable demo** — not a shipped product. Keep things simple; upgrade later.

---

## 1. 3D Assets

All assets CC0 (no attribution required). Use `.glb`/`.gltf` format for Three.js.

| Need | Source | Notes |
|------|--------|-------|
| Terrain, trees, rocks | **KayKit** Forest Nature Pack + **Kenney** Nature Kit | KayKit ships glTF natively; Kenney has GLB conversions via Eclair Assets on itch.io |
| Buildings (all ages) | **Quaternius** Ultimate Buildings + **KayKit** City Builder Bits | Cover stone huts through modern structures |
| Animals | **Quaternius** animated animals pack | Mammals, birds, fish with animations |
| Gap-fill | **Meshy** or **Tripo** (AI model generators) | For age-specific pieces the packs don't cover (futuristic domes, etc.) |

Sources:
- KayKit: kaylousberg.itch.io
- Quaternius: quaternius.com
- Kenney: kenney.nl/assets/category:3D

Art style: **stylized low-poly**, consistent across packs. All three sources share
a similar friendly aesthetic.

---

## 2. Audio (Minimal)

Use **Howler.js** (MIT) for playback — simple API, handles browser autoplay
restrictions, supports looping and fading. No spatial audio needed for demo.

### Demo sound budget: 5 sounds

1. **Ambient background loop** — gentle nature soundscape, 1–2 min looping
2. **UI click** — soft feedback for button/selection
3. **Positive chime** — building placed / action confirmed
4. **Nature accent** — bird chirp, triggered occasionally for atmosphere
5. **Water/wind loop** — layered with background for depth

Sources (all CC0):
- **Freesound.org** — best for nature recordings
- **Kenney.nl** — UI Audio and Interface Sounds packs
- **OpenGameArt.org** — ambient music loops

Load lazily after first user interaction (browser autoplay policy).

---

## 3. Hosting & Sharing

**Vercel** — zero-config Vite support, free tier (100 GB bandwidth), instant
deploys via `npx vercel` or GitHub push.

- Bundle small assets (<5 MB) in `public/`. Lazy-load larger models.
- Tree-shake Three.js imports to keep bundle size reasonable.

### OG tags (minimum for link sharing)

```html
<meta property="og:title" content="Project Flourish" />
<meta property="og:description" content="Build a civilization that flourishes with nature" />
<meta property="og:image" content="https://yourdomain/preview.png" />
<meta property="og:url" content="https://yourdomain" />
<meta name="twitter:card" content="summary_large_image" />
```

Create a 1200×630 px preview image (screenshot of the game world).

---

## 4. Save/Load

**localStorage only** for demo. Serialize the Zustand store to JSON on manual
save; restore on load. No backend, no accounts. This is enough for a demo where
someone plays for 20–30 minutes.

---

## 5. Starter Map

**7-radius hex grid (127 cells).** Four biomes in rough quadrants:

```
         Mountain (7 hexes, center)
    Forest (NW)         Grassland (NE)
              Wetland (S)
```

Player starts adjacent to the grassland–forest boundary where both biomes are
accessible. Enough space for 15–20 buildings while keeping the map visually
scannable at macro zoom.

---

## 6. Simulation Tuning (Demo Defaults)

All values in `CONFIG`. Expect to adjust after first playtest.

### Eco-multiplier curve

Sigmoid: `ecoMult = 0.5 + 1.0 / (1 + exp(-10 * (ecoHealth - 0.5)))`

- 0.5 at zero eco-health (economy halved)
- 1.0 at 0.5 eco-health (neutral)
- ~1.5 at high eco-health (50% bonus)

### Population growth

Logistic growth rate per tick:
- Common species: `r = 0.05`
- Rare/keystone species: `r = 0.02`
- 90% carrying capacity reached in ~50–80 ticks

### Species arrival

- Threshold: habitat suitability > 0.6 (2–3 compatible buildings trigger it)
- **3–5 seconds** after placing a building for the first visual cue
- **8–12 seconds** to reach "established" population
- Brief anticipation animation at ~2 seconds (rustling, bird call)

### Keystone cascade

Keystone population below 20% of carrying capacity triggers downstream
penalties. Biodiversity should drop ~20% within 30 ticks of keystone loss.
Recovery is symmetrical — restore the keystone, effects reverse at the same
rate.

---

## 7. Fast-Forward Test Harness

Run the sim headless for 500 ticks against three scenarios:

| Scenario | Strategy | Assert by tick 300 |
|----------|----------|--------------------|
| Green path | Eco-friendly buildings only | Flourishing > 0.7 |
| Neglect path | Max economy, ignore ecology | Flourishing < 0.3, economy declining |
| Balanced | Mixed | Flourishing 0.4–0.7, stable |

Log `[tick, wellbeing, biodiversity, flourishing, ecoMult, economy, speciesCount]`
each tick. Plot the CSV to eyeball curves. Assert no values negative or out of
bounds.

---

## 8. Onboarding (Demo-Light)

No tutorial system. Instead:

- Start with a **single prompt**: "Place a shelter to begin your settlement."
- Tooltip on hover for each building showing its effects.
- The Flourishing meter animates visibly on every player action — this IS the
  teaching mechanism.
- The dev inspector overlay doubles as a "what's happening" panel for curious
  players.
