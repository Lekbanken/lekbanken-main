/**
 * Supabase Browser Client
 *
 * This client is used in the browser (frontend) to interact with Supabase.
 * It uses the ANON key which is safe to expose publicly.
 *
 * IMPORTANT: This client is for client-side code only (pages, components).
 * For server-side code (API routes), use server.ts instead.
 *
 * Usage in a component:
 * ```tsx
 * import { supabase } from '@/lib/supabase/client';
 *
 * export default function MyComponent() {
 *   const [data, setData] = useState(null);
 *
 *   useEffect(() => {
 *     supabase
 *       .from('games')
 *       .select()
 *       .then(({ data }) => setData(data));
 *   }, []);
 *
 *   return <div>{JSON.stringify(data)}</div>;
 * }
 * ```
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export function createBrowserClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Export singleton instance for convenience
// Use this in most places for simplicity
export const supabase = createBrowserClient();
