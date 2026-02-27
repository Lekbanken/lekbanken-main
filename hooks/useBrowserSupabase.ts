'use client'

import { useState } from 'react'
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

/**
 * Lazy-initialise the Supabase browser client.
 *
 * Uses a `useState` initialiser so the client is created synchronously on the
 * first client render (no flash of `null`).  The `typeof window` guard keeps
 * the server-side render safe — during SSR the hook returns `null` and
 * `isInitializing: true`.
 */
export function useBrowserSupabase() {
  const [{ supabase, error }] = useState<BrowserSupabaseState>(() => {
    if (typeof window === 'undefined') {
      return { supabase: null, error: null }
    }
    try {
      return { supabase: createBrowserClient(), error: null }
    } catch (err) {
      return { supabase: null, error: toError(err) }
    }
  })

  return {
    supabase,
    error,
    isInitializing: supabase === null && error === null,
  }
}

