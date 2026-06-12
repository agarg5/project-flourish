// ALL tunable coefficients live here (doc 05 principle: nothing hardcoded in
// sim logic). Numbers are starting targets calibrated against doc 10's worked
// example; expect heavy tuning in M3-M5.

export const CONFIG = {
  tickRate: 6,                   // sim ticks per second
  ticksPerTurn: 30,              // one "turn" in docs 10/11 = 30 ticks (~5s)

  world: { radius: 28 },         // hexagon radius -> 3R(R+1)+1 = 2437 cells (~55 across, RCT-scale)

  // Spatial model (doc 08):
  offBiomePenalty: 0.2,          // biomeMatch when cell biome not preferred
  founderFraction: 0.1,          // founder pop on arrival, fraction of K
  keystoneRadius: 2,             // hex rings a healthy keystone boosts
  markerCellCount: 6,            // herds per species (render anchors, spread by separation)

  // Population dynamics (docs 08/11):
  populationGrowthRate: 0.05,    // logistic r per tick, common species
  keystoneGrowthRate: 0.02,      // logistic r per tick, keystone/rare species
  noHabitatDeclineRate: 0.03,    // decay per tick when K = 0
  extinctionFloor: 1,            // below this with K = 0 -> locally extinct
  arrivalGraceTicks: 8,

  // Biodiversity blend (doc 03 section 2):
  biodiversityWeights: { niche: 0.35, keystone: 0.3, pop: 0.2, biome: 0.15 },
  biomeDiversityDenominator: 6,  // distinct viable biome types / this
  viableBiomeQuality: 0.35,      // avg quality for a biome type to count as viable
  nicheFillFraction: 0.5,        // pop/(this*K) = full strength for a niche

  // Wellbeing blend (doc 03 section 3). Display = base blend * baseScale
  // + direct building adds, clamped to the age ceiling.
  wellbeingWeights: { needs: 0.4, amenity: 0.25, env: 0.25, crowd: 0.1 },
  // Each additional copy of the same building contributes less wellbeing —
  // needs are met against finite population demand (doc 03 section 3).
  wellbeingDuplicateFalloff: 0.7,
  wellbeingBase: { needs: 0.55, amenity: 0.2 },
  wellbeingBaseScale: 40,
  envSampleRadius: 2,            // env quality sampled near buildings
  crowding: { densityThreshold: 0.04, scale: 3 },

  // Economy (docs 03 section 4 / 10 section 1):
  ecoMultiplier: { min: 0.5, span: 1.1 },  // min + span*smoothstep(h) -> 0.5..1.6
  baselineOutputPerTurn: 6,      // foraging/subsistence output with no buildings
  researchPerCoin: 3,            // research points per coin routed to R&D
  startingTreasury: 50,

  // Ecological health = blend of global biodiversity and habitat quality in
  // the settlement's impact zone (doc 03 section 4 "rolled-up health index").
  // The local-quality half is what makes the age gate respond to settlement
  // sprawl on a map much larger than the settlement.
  ecoHealth: { bioWeight: 0.35, qualityWeight: 0.65, impactRadius: 2, smoothing: 0.08 },

  // Keystone cascade (docs 05/08): effectiveness eases toward 0/1 at this rate.
  cascade: { recoveryRate: 0.04 },

  // M2 auto-stewardship: the stewardship income share buys restoration actions
  // targeted at the most degraded cells near the settlement.
  autoStewardship: { actionId: 'plant_hedgerow', searchRadius: 3 },
} as const;
