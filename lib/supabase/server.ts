/**
 * Supabase Server Client
 *
 * This client is used in server-side code (API routes, middleware, server components).
 * It uses the SERVICE_ROLE_KEY which should NEVER be exposed to the browser.
 *
 * IMPORTANT: Only use this in:
 * - API routes (app/api/*)
 * - Middleware (middleware.ts)
 * - Server-side functions with 'use server'
 * - Never import this in client components!
 *
 * Usage in an API route:
 * ```ts
 * import { createServiceRoleClient } from '@/lib/supabase/server';
 *
 * export async function GET(request: Request) {
 *   const supabase = createServiceRoleClient();
 *   const { data, error } = await supabase
 *     .from('users')
 *     .select();
 *
 *   return Response.json({ data, error });
 * }
 * ```
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export function createServiceRoleClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Export singleton instance for convenience
export const supabaseAdmin = createServiceRoleClient();
