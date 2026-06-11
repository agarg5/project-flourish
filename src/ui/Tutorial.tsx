// A light, skippable first-session tutorial. Most steps advance on "Next";
// the build step waits until the player actually places their first building,
// so the one essential interaction is taught by doing. Dismissed state is
// remembered in localStorage; a "?" button replays it.

import { useEffect, useState } from 'react';
import { useGame } from '../state/store';
import type { UISnapshot } from '../state/store';

interface Step {
  title: string;
  body: string;
  // If set, the step auto-advances when this becomes true (no Next button).
  done?: (snap: UISnapshot) => boolean;
}

const STEPS: Step[] = [
  {
    title: 'Welcome to your living planet',
    body: 'The headline number up top is Planetary Flourishing = Wellbeing × Biodiversity. It only climbs when people AND nature thrive together — neglect either and it stalls.',
  },
  {
    title: 'Start your settlement',
    body: 'Open Build & Steward (bottom), pick the Forager Camp, then click a green tile to place it.',
    done: (s) => s.buildings.length > 0,
  },
  {
    title: 'Nature is an economic engine',
    body: 'Check the Inspector (right): the Eco multiplier above ×1.0 means healthy nature is boosting your economy. Let it fall and every building earns less.',
  },
  {
    title: 'The core choice',
    body: 'Building nudges nearby habitat down. Plant a Hedgerow (in Build & Steward) to heal it. Spending on stewardship feeds the multiplier that compounds everything later.',
  },
  {
    title: 'Allocate your income',
    body: 'The sliders (bottom-left) split income three ways: Buildings for comfort now, Research toward the next age, Stewardship to keep nature thriving. Balance is the whole game.',
  },
  {
    title: 'Flourish at your own pace',
    body: 'No clock, no failure — just a world to nurture. When research and eco-health are both ready, an Advance Age button appears. Have fun!',
  },
];

const STORAGE_KEY = 'flourish.tutorial.done';

export function Tutorial() {
  const snap = useGame((g) => g.snap);
  const [step, setStep] = useState(0);
  const [active, setActive] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== '1';
    } catch {
      return true;
    }
  });

  const current = STEPS[step];

  // Auto-advance gated steps once their condition is met.
  useEffect(() => {
    if (active && current?.done && current.done(snap)) {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
  }, [active, current, snap]);

  function finish() {
    setActive(false);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
  }

  if (!active) {
    return (
      <button
        className="tut-replay"
        title="Replay tutorial"
        onClick={() => {
          setStep(0);
          setActive(true);
        }}
      >
        ?
      </button>
    );
  }

  const isLast = step === STEPS.length - 1;
  const waiting = !!current.done;

  return (
    <div className="panel tutorial">
      <div className="tut-step">
        {step + 1} / {STEPS.length}
      </div>
      <h3>{current.title}</h3>
      <p>{current.body}</p>
      <div className="tut-actions">
        <button className="tut-skip" onClick={finish}>
          Skip
        </button>
        {waiting ? (
          <span className="tut-wait">↳ waiting for you…</span>
        ) : isLast ? (
          <button className="tut-next" onClick={finish}>
            Got it
          </button>
        ) : (
          <button className="tut-next" onClick={() => setStep((s) => s + 1)}>
            Next
          </button>
        )}
      </div>
    </div>
  );
}
