import { useRef } from 'react';

/**
 * A revision counter that increments whenever `key` changes. Handy as a React
 * `key` to remount static-content components (e.g. drei `<Instances>` running
 * on a finite `frames` budget) so a content change re-uploads once, without
 * using a giant signature string as the key itself.
 */
export function useRev(key: string): number {
  const prevKey = useRef(key);
  const rev = useRef(0);
  if (prevKey.current !== key) {
    prevKey.current = key;
    rev.current++;
  }
  return rev.current;
}
