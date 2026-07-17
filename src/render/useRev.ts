import { useState } from 'react';

/**
 * A revision counter that increments whenever `key` changes. Handy as a React
 * `key` to remount static-content components (e.g. drei `<Instances>` running
 * on a finite `frames` budget) so a content change re-uploads once, without
 * using a giant signature string as the key itself.
 *
 * Uses the official "adjust state during render" pattern rather than mutating a
 * ref — state is versioned per render, so a discarded concurrent render can't
 * advance the counter without committing (a ref would, and then skip a needed
 * remount on the retried render).
 */
export function useRev(key: string): number {
  const [state, setState] = useState({ key, rev: 0 });
  if (state.key !== key) {
    setState({ key, rev: state.rev + 1 });
    return state.rev + 1;
  }
  return state.rev;
}
