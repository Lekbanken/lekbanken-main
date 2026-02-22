'use client';

import { useRef } from 'react';

/**
 * Returns a ref that always holds the latest value.
 *
 * Useful for stabilising callbacks passed to subscription effects so that
 * the effect dependency array stays empty (or only contains stable values)
 * while the handler always sees the latest closure.
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
  // Intentionally synchronous — runs during render (before commit),
  // so the ref is always up-to-date when any effect reads it.
  ref.current = value;
  return ref;
}
