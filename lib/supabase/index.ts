/**
 * Supabase Exports
 *
 * Centralized export point for Supabase clients and utilities.
 *
 * Usage:
 * ```tsx
 * // In client components:
 * import { supabase } from '@/lib/supabase';
 *
 * // In API routes:
 * import { supabaseAdmin } from '@/lib/supabase';
 * ```
 */

export { createBrowserClient, supabase } from './client';
export { createServiceRoleClient, supabaseAdmin } from './server';
export type { Database } from './types';
