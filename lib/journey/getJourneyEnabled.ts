/**
 * Server-side utility to check whether Journey mode is enabled for a user.
 * Use for subroute gating — prevents loading Journey-specific UI/data
 * when the user hasn't opted in.
 */
import { createServiceRoleClient } from '@/lib/supabase/server';

type PrefsRow = {
  journey_enabled: boolean;
  journey_decision_at: string | null;
};

export async function getJourneyEnabled(userId: string): Promise<boolean> {
  const supabase = await createServiceRoleClient();

  const { data } = await (
    supabase.from('user_journey_preferences' as never) as unknown as {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          maybeSingle: () => Promise<{ data: PrefsRow | null; error: unknown }>;
        };
      };
    }
  )
    .select('journey_enabled,journey_decision_at')
    .eq('user_id', userId)
    .maybeSingle();

  return data?.journey_enabled === true;
}
