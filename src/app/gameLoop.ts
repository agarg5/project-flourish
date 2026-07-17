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
  const MAX_CATCHUP_MS = 5000; // at most 5s of real time is ever caught up at once
  let last = performance.now();
  let acc = 0;

  // A hidden/throttled tab fires this callback far less often than TICK_MS, so
  // `acc` builds up a deficit. We cap CATCH-UP at MAX_CATCHUP_MS: without the
  // clamp, an hour hidden would leave ~21,600 ticks of debt and peg the CPU
  // (and flood the event feed) for minutes on refocus. Clamping before the
  // drain loop means "throttled for a long time" costs a bounded burst, not an
  // unbounded one. The sim has no wall-clock dependence, so dropping excess
  // real time only means the world advances a little slower while hidden.
  const step = () => {
    const now = performance.now();
    acc = Math.min(acc + (now - last), MAX_CATCHUP_MS);
    last = now;
    let ticks = 0;
    // `store.sim` is read live so a Restart (which swaps the instance) is picked up.
    while (acc >= TICK_MS) {
      store.sim.tick();
      acc -= TICK_MS;
      ticks++;
    }
    if (ticks > 0) useGame.getState().refresh();
  };
  setInterval(step, TICK_MS);

  // On refocus, reset the clock so the first post-refocus callback doesn't
  // count the entire hidden gap as owed time (belt-and-suspenders with the clamp).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      last = performance.now();
      acc = 0;
    }
  });

  // Dev/testing handle (used by Playwright checks; harmless in production).
  (window as unknown as Record<string, unknown>).__flourish = {
    get sim() {
      return store.sim;
    },
    refresh: () => useGame.getState().refresh(),
  };
}
