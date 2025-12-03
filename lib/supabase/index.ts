/**
 * Supabase Exports (Client Only)
 *
 * Centralized export point for browser-safe Supabase clients.
 *
 * Usage:
 * ```tsx
 * // In client components:
 * import { supabase, createBrowserClient } from '@/lib/supabase';
 * ```
 *
 * For server-side usage, import directly from:
 * ```tsx
 * import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
 * ```
 */

export { createBrowserClient, supabase } from './client'
export type { Database } from './types'
