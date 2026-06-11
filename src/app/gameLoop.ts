// Fixed-timestep driver (doc 04): the sim advances at CONFIG.tickRate using a
// wall-clock accumulator on setInterval — unlike requestAnimationFrame this
// keeps ticking (at the right aggregate pace) when the tab is hidden or the
// browser throttles timers. Rendering stays on R3F's own rAF loop and simply
// reads the latest state when frames resume.

import { CONFIG } from '../sim';
import * as store from '../state/store';
import { useGame } from '../state/store';

let started = false;

export function startGameLoop(): void {
  if (started) return;
  started = true;

  const TICK_MS = 1000 / CONFIG.tickRate;
  const MAX_BURST = 5 * CONFIG.tickRate; // cap catch-up after long throttling
  let last = performance.now();
  let acc = 0;

  setInterval(() => {
    const now = performance.now();
    acc += now - last;
    last = now;
    let ticks = 0;
    // `store.sim` is read live so a Restart (which swaps the instance) is picked up.
    while (acc >= TICK_MS && ticks < MAX_BURST) {
      store.sim.tick();
      acc -= TICK_MS;
      ticks++;
    }
    if (ticks > 0) useGame.getState().refresh();
  }, TICK_MS);

  // Dev/testing handle (used by Playwright checks; harmless in production).
  (window as unknown as Record<string, unknown>).__flourish = {
    get sim() {
      return store.sim;
    },
    refresh: () => useGame.getState().refresh(),
  };
}
