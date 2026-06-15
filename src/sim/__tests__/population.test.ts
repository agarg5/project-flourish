// Citizens: population tracks housing, and crowding bites when people outgrow
// their amenities + greenspace (doc 03 section 3, made literal).

import { describe, expect, test } from 'bun:test';
import { CONFIG } from '../config';
import { createSimulation } from '../simulation';

function placeNeeds(sim: ReturnType<typeof createSimulation>, count: number) {
  sim.state.treasury = 10_000; // fund the test so placement isn't budget-gated
  const cells = sim.cellsByDistanceFromStart();
  let placed = 0;
  for (const c of cells) {
    if (placed >= count) break;
    if (sim.placeBuilding('forager_camp', c.id).ok) placed++;
  }
  return placed;
}

describe('citizens (doc 03 section 3)', () => {
  test('start at the founding band, before any housing', () => {
    const sim = createSimulation();
    expect(sim.state.citizens).toBe(CONFIG.citizens.base);
  });

  test('population grows toward the housing that needs-buildings provide', () => {
    const sim = createSimulation();
    placeNeeds(sim, 3);
    for (let t = 0; t < 200; t++) sim.tick();
    const cap = sim.state.sub.housingCapacity;
    expect(cap).toBeGreaterThan(CONFIG.citizens.base);
    expect(sim.state.citizens).toBeGreaterThan(CONFIG.citizens.base + 4);
    // Logistic growth approaches but never overshoots capacity.
    expect(sim.state.citizens).toBeLessThanOrEqual(cap + 1e-6);
  });

  test('housing without amenities or greenspace breeds crowding', () => {
    // Many needs-only camps (which also degrade nearby habitat) pack people in.
    const crowded = createSimulation();
    placeNeeds(crowded, 8);
    for (let t = 0; t < 250; t++) crowded.tick();

    // A modest settlement that pairs housing with an amenity stays comfortable.
    const comfy = createSimulation();
    placeNeeds(comfy, 1);
    for (const c of comfy.cellsByDistanceFromStart()) {
      if (comfy.placeBuilding('fire_hearth', c.id).ok) break;
    }
    for (let t = 0; t < 250; t++) comfy.tick();

    expect(crowded.state.sub.crowding).toBeGreaterThan(0.5);
    expect(crowded.state.sub.crowding).toBeGreaterThan(comfy.state.sub.crowding + 0.3);
  });
});
