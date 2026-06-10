# 10 — Worked Example (Proof-of-Loop + Golden Fixture)

> Answers the open question from the design review: *is the moment-to-moment
> decision actually interesting, in a game with no clock and no fail state?*
> It traces a concrete first session using the file 09 seed content and file 08
> spatial model, comparing two play styles. The numbers here are **illustrative
> starting targets** that become the **M1 golden-master test fixtures** (file 04):
> a fixed seed must reproduce this trajectory ± tolerance, or balance changed.

---

## 1. The model used (made explicit)

```
ecoMult(h)   = 0.5 + 1.1 × smoothstep(h),   smoothstep(h) = 3h² − 2h³
ecoHealth h  ≈ biodiversity / 100   (file 03 §4: reuse biodiversity, smoothed)
Flourishing  = wellbeing × biodiversity / 100      (both displayed 0..100)
Income/turn  = (Σ building.economicOutput) × ecoMult(h) − Σ upkeep
```
Reference values of the multiplier (note it **crosses 1.0**):

| ecoHealth h | 0.30 | 0.40 | 0.50 | 0.60 | 0.70 | 0.74 |
|---|---|---|---|---|---|---|
| ecoMult | 0.74 | 0.89 | 1.05 | 1.21 | 1.36 | 1.40 |

One "turn" ≈ 30 sim ticks (~5s real). Granularity is for readability; the sim
runs per-tick (file 04).

---

## 2. The start state (turn 0) — nature-rich, comfort-poor

The pristine world already hosts life. With biome `baseQuality` 0.70–0.80, the
suitability of most seed species clears their `arrivalThreshold` immediately:

- **Present at start:** wild_bee, deer, boar, heron, **beaver** (keystone), wolf
  — the untouched land supports them all.
- **Indices:** biodiversity **70**, wellbeing **18**, ecoHealth **0.70**,
  Flourishing **= 18×70/100 = 12.6**. Treasury 50, research 0.

> This is the key reframing the multiplicative score makes meaningful from turn
> one: the player does **not** start at zero-and-zero. They start *rich in
> nature, poor in well-being*, and the job is to raise comfort **without
> knocking nature back down**. Naive building raises wellbeing but degrades local
> habitat → sensitive species (wolf @0.55, beaver @0.45) retreat → biodiversity
> falls → the product barely moves. That tension exists in the first 30 seconds.

---

## 3. Two strategies, same start

- **Strategy A — Build-heavy.** spendSplit `{ buildings 0.70, rnd 0.25, stewardship 0.05 }`.
  Maximize output and comfort now.
- **Strategy B — Steward-forward.** spendSplit `{ buildings 0.40, rnd 0.30, stewardship 0.30 }`.
  Hold habitat while growing.

| | Turn 0 | Turn 6 | Turn 12 | Turn 20 |
|---|---|---|---|---|
| **A** wellbeing | 18 | 38 | 52 | 56 |
| **A** biodiversity | 70 | 58 | 50 | 56 |
| **A** ecoHealth | .70 | .58 | .50 | .56 |
| **A** ecoMult | 1.36 | 1.15 | 1.05 | 1.12 |
| **A** Flourishing | **12.6** | **22.0** | **26.0** | **31.4** |
| **A** age | stone | stone | stone *(gate blocked)* | stone→ catching up |
| **B** wellbeing | 18 | 30 | 46 | 58 |
| **B** biodiversity | 70 | 72 | 74 | 90→ |
| **B** ecoHealth | .70 | .72 | .74 | .76 |
| **B** ecoMult | 1.36 | 1.38 | 1.40 | 1.40+ |
| **B** Flourishing | **12.6** | **21.6** | **34.0** | **52.0** |
| **B** age | stone | stone | **→ agricultural** | agricultural |

### What happens, turn by turn
- **Turns 1–6:** A throws up 3 forager camps; their `−0.05` habitat deltas stack
  around the settlement, suitability there dips, **wolf retreats** (suitability <
  0.55) and the beaver wavers. Biodiversity slides 70→58. B builds one camp,
  plants 2 hedgerows and protects the wetland; quality holds, the **beaver stays
  healthy → keystone boost → heron's filter_feeder niche stays filled**.
  *On raw Flourishing they're nearly tied (22.0 vs 21.6) — B looks "behind."*
- **Turns 7–12:** the divergence. A's ecoHealth drifts to 0.50, so `ecoMult`
  falls to ~1.05 — each building earns less, and biodiversity 50 caps the product.
  A reaches the research bar but **the Agricultural gate's `requiredEcoHealth 0.60`
  is not met** → stalled. B's `ecoMult 1.40` means its 18 output earns ~25,
  *matching A's 26 from far fewer buildings*; B clears both gate halves and
  **advances to Agricultural**, raising every ceiling.
- **Turns 13–20:** B compounds — polyculture plots add wellbeing **and** habitat,
  ecoMult stays pinned high, Flourishing reaches 52 and climbs. A, unpunished,
  notices the stall, shifts spend to stewardship, and recovers ecoHealth back
  toward 0.60 over several turns — the lesson taught **softly** (file 02 §5), no
  failure screen, just "let life catch up first."

---

## 4. Why this is a *real* decision (the fun answer)

The tension comes from **opportunity cost + a compounding multiplier + a soft
gate**, not from a clock:

1. **Every income unit is contested** three ways. Buildings pay off *now*; R&D
   buys the *next age*; stewardship raises `ecoMult`, which multiplies **all
   future** income and biodiversity. That's the classic spend-now-vs-compound
   dilemma — interesting on turn 2 and on turn 50.
2. **The multiplier makes "boring safe building" a trap.** Because `ecoMult`
   swings 0.74–1.40, neglecting nature doesn't just lower the biodiversity score —
   it throttles the *economy that funds everything*. Synergy is enforced by the
   math, exactly as Pillar 2 demands.
3. **The age gate converts patience into progress, not punishment.** A pure rush
   plateaus; it never dies. Recovery is always open (no clock). So the player is
   *optimizing*, never *losing* — which is the whole hopeful thesis.

The agonizing-on-turn-20 question is therefore real: **cash in for comfort now,
or feed the multiplier and pull away later?** And both answers are dignified.

---

## 5. The legibility / feel beats (what the player *sees*)

These are the moments M2/M3 must surface clearly:
- Build a camp too aggressively → **the wolf marker fades out** and biodiversity
  ticks down within a few seconds. Cause→effect, visible (Pillar 5).
- Protect the wetland → a few ticks later the **beaver count rises**, then the
  **heron arrives** (keystone unlocking a niche) and biodiversity steps up. The
  "build it and they come" payoff.
- The `ecoMult` readout crossing **1.0 ↔** is the single clearest teacher that
  nature is an economic multiplier — put it in the inspector overlay (file 04).

---

## 6. Golden-test fixtures (M1)

Lock these as headless assertions (file 04 testing section):
1. **Determinism:** seed `flourish-fixture-01`, run 600 ticks (20 turns) with
   Strategy B's fixed spendSplit → reproduces the B column ± 5%.
2. **ecoMult crosses 1.0** in both directions as ecoHealth moves through 0.5.
3. **Keystone cascade + recovery:** force beaver below `cascadeThreshold` →
   heron's supported niche declines; restore wetland → both recover within
   `< N` ticks, monotonically.
4. **Age gate is dual:** Strategy A reaches `requiredResearch` but is **denied**
   age-up until ecoHealth ≥ 0.60 sustained `ecoHealthSustainTicks`.
5. **Synergy invariant:** across the run, `Flourishing` never rises while *both*
   wellbeing and biodiversity fall.

If a future balance change breaks a fixture, that's a conscious decision to
re-approve — not a silent regression.

---

## 7. Status
With files 08–10, the three review gaps are closed: geometry is defined, seed
content exists, and the core loop is shown to carry a real, hopeful decision —
with concrete numbers the M1 sim can be tested against. **Ready to start
Session 0 (scaffold + harness) → M1 sim slice.**
