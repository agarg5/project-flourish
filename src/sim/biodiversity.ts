// Biodiversity = weighted blend of niche coverage, keystone health,
// population health, and biome diversity (doc 03 section 2).

import { CONFIG } from './config';
import type { Content, NicheId, SimState } from './types';
import { clamp01 } from './util';

const ALL_NICHES: NicheId[] = [
  'pollinator', 'seed_disperser', 'soil_engineer',
  'predator_balancer', 'grazer', 'decomposer', 'filter_feeder',
];

export interface BiodiversityResult {
  bio01: number;
  nicheCoverage: number;
  keystoneHealth: number;
  populationHealth: number;
  biomeDiversity: number;
}

export function computeBiodiversity(state: SimState, content: Content): BiodiversityResult {
  const stById = new Map(state.species.map((s) => [s.speciesId, s]));

  // A keystone "unlocks" its supported niches for others: their contribution
  // scales with the keystone's effectiveness (doc 08 section 5).
  const supportMult = new Map<NicheId, number>();
  for (const sp of content.species) {
    if (!sp.isKeystone) continue;
    const eff = stById.get(sp.id)?.keystoneEffectiveness ?? 0;
    for (const n of sp.supportsNiches ?? []) {
      supportMult.set(n, Math.max(supportMult.get(n) ?? 0, eff));
    }
  }

  // All health terms reference the PRISTINE carrying capacity, not the current
  // one — a population sitting at its shrunken K is not "healthy"; lost
  // capacity is lost biodiversity until habitat is restored.
  const healthOf = (st: { population: number; carryingCapacity: number; pristineCapacity: number }) =>
    clamp01(Math.min(st.population, st.carryingCapacity) / Math.max(st.pristineCapacity, 1));

  let nicheSum = 0;
  for (const n of ALL_NICHES) {
    let best = 0;
    for (const sp of content.species) {
      if (!sp.niches.includes(n)) continue;
      const st = stById.get(sp.id);
      if (!st || st.population <= 0) continue;
      const kRef = Math.max(st.pristineCapacity, 1);
      best = Math.max(
        best,
        clamp01(Math.min(st.population, st.carryingCapacity) / (CONFIG.nicheFillFraction * kRef)),
      );
    }
    const mult = supportMult.get(n);
    if (mult !== undefined) best *= mult;
    nicheSum += best;
  }
  const nicheCoverage = nicheSum / ALL_NICHES.length;

  const keystones = content.species.filter((s) => s.isKeystone);
  let keystoneHealth = 1;
  if (keystones.length > 0) {
    keystoneHealth =
      keystones.reduce((sum, sp) => sum + healthOf(stById.get(sp.id)!), 0) / keystones.length;
  }

  // Population health over all species that *could* be here in this age —
  // a local extinction counts as zero, it doesn't drop out of the average.
  const curAgeIdx = content.ages.find((a) => a.id === state.age)?.index ?? 0;
  const eligible = content.species.filter((sp) => {
    if (sp.reintroOnly) return false;
    const from = sp.ageAvailableFrom ? content.ages.find((a) => a.id === sp.ageAvailableFrom)?.index ?? 0 : 0;
    return from <= curAgeIdx;
  });
  let populationHealth = 0;
  if (eligible.length > 0) {
    populationHealth =
      eligible.reduce((sum, sp) => sum + healthOf(stById.get(sp.id)!), 0) / eligible.length;
  }

  // Biome diversity: distinct viable (non-dead-zone) biome types present.
  const byBiome = new Map<string, { sum: number; n: number }>();
  for (const c of state.cells) {
    const acc = byBiome.get(c.biome) ?? { sum: 0, n: 0 };
    acc.sum += c.habitatQuality;
    acc.n++;
    byBiome.set(c.biome, acc);
  }
  let viable = 0;
  for (const [biome, acc] of byBiome) {
    if (content.biomes[biome]?.isDeadZone) continue;
    if (acc.sum / acc.n >= CONFIG.viableBiomeQuality) viable++;
  }
  const biomeDiversity = clamp01(viable / CONFIG.biomeDiversityDenominator);

  const w = CONFIG.biodiversityWeights;
  const bio01 = clamp01(
    w.niche * nicheCoverage +
      w.keystone * keystoneHealth +
      w.pop * populationHealth +
      w.biome * biomeDiversity,
  );
  return { bio01, nicheCoverage, keystoneHealth, populationHealth, biomeDiversity };
}
