'use client'

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { createBrowserClient } from '@/lib/supabase/client'

function toError(err: unknown): Error {
  if (err instanceof Error) return err
  return new Error(typeof err === 'string' ? err : JSON.stringify(err))
}

export function useBrowserSupabase() {
  const [supabase, setSupabase] = useState<SupabaseClient<Database> | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    try {
      setSupabase(createBrowserClient())
    } catch (err) {
      setError(toError(err))
    }
  }, [])

  return {
    supabase,
    error,
    isInitializing: supabase === null && error === null,
  }
}

