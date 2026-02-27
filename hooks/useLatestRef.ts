'use client';

import { useEffect, useRef } from 'react';

/**
 * Returns a ref that always holds the latest value.
 *
 * Useful for stabilising callbacks passed to subscription effects so that
 * the effect dependency array stays empty (or only contains stable values)
 * while the handler always sees the latest closure.
 *
 * The ref is updated in a passive effect (after paint), so by the time
 * any other effect reads `ref.current`, it already reflects the latest render.
 *
 * @example
 * ```ts
 * const onEventRef = useLatestRef(onEvent);
 *
 * useEffect(() => {
 *   channel.on('broadcast', (e) => onEventRef.current?.(e));
 *   // ...
 * }, [channel]); // no callback in deps → no channel churn
 * ```
 */
export function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}
