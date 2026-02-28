'use client'

import { useMemo, useSyncExternalStore } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { createBrowserClient } from '@/lib/supabase/client'

function toError(err: unknown): Error {
  if (err instanceof Error) return err
  return new Error(typeof err === 'string' ? err : JSON.stringify(err))
}

interface BrowserSupabaseState {
  supabase: SupabaseClient<Database> | null
  error: Error | null
}

// Module-level singleton state — determined once, never changes
let clientState: BrowserSupabaseState | null = null

function getClientState(): BrowserSupabaseState {
  if (clientState) return clientState
  try {
    clientState = { supabase: createBrowserClient(), error: null }
  } catch (err) {
    clientState = { supabase: null, error: toError(err) }
  }
  return clientState
}

// Server snapshot: always null (matches SSR output)
const serverSnapshot: BrowserSupabaseState = { supabase: null, error: null }

// No-op subscribe: the state never changes after initial creation
const noop = () => () => {}

/**
 * Access the Supabase browser client.
 *
 * Uses `useSyncExternalStore` to safely provide different values during SSR
 * (null) vs client (singleton instance) without hydration mismatch warnings.
 * The client is available immediately on the first client render — no
 * useEffect delay.
 */
export function useBrowserSupabase() {
  const { supabase, error } = useSyncExternalStore(
    noop,
    getClientState,
    () => serverSnapshot
  )

  // Memoize return object to give consumers stable reference
  return useMemo(() => ({
    supabase,
    error,
    isInitializing: supabase === null && error === null,
  }), [supabase, error])
}

