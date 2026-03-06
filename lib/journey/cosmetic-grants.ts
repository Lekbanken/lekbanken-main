import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

type ServiceClient = SupabaseClient<Database>;

type LevelTrigger = { type: 'level'; level: number };
type AchievementTrigger = { type: 'achievement'; achievementId: string };
type UnlockTrigger = LevelTrigger | AchievementTrigger;

/**
 * Check unlock rules and grant any newly earned cosmetics.
 *
 * MUST be called with a **service-role** Supabase client — this bypasses RLS
 * so that clients can never grant themselves cosmetics directly.
 *
 * @returns Array of cosmetic IDs that were newly granted.
 */
export async function checkAndGrantCosmetics(
  supabaseAdmin: ServiceClient,
  userId: string,
  trigger: UnlockTrigger,
): Promise<string[]> {
  // 1. Fetch matching unlock rules
  const rulesQuery = supabaseAdmin
    .from('cosmetic_unlock_rules')
    .select('cosmetic_id, unlock_config')
    .eq('unlock_type', trigger.type);

  // We fetch all rules of the matching type, then filter in-app
  // because JSONB operators vary per trigger type.
  const { data: rules, error: rulesError } = await rulesQuery;
  if (rulesError || !rules || rules.length === 0) return [];

  // 2. Filter rules by trigger-specific criteria
  const candidateIds: string[] = [];
  for (const rule of rules) {
    const config = rule.unlock_config as Record<string, unknown>;
    if (trigger.type === 'level') {
      const requiredLevel = Number(config.required_level ?? 0);
      if (requiredLevel <= trigger.level) {
        candidateIds.push(rule.cosmetic_id);
      }
    } else if (trigger.type === 'achievement') {
      if (config.achievement_id === trigger.achievementId) {
        candidateIds.push(rule.cosmetic_id);
      }
    }
  }

  if (candidateIds.length === 0) return [];

  // 3. Filter out already-owned cosmetics
  const { data: owned } = await supabaseAdmin
    .from('user_cosmetics')
    .select('cosmetic_id')
    .eq('user_id', userId)
    .in('cosmetic_id', candidateIds);

  const ownedSet = new Set((owned ?? []).map((r) => r.cosmetic_id));
  const newIds = candidateIds.filter((id) => !ownedSet.has(id));

  if (newIds.length === 0) return [];

  // 4. Bulk-insert new user_cosmetics (service role — bypasses RLS)
  const rows = newIds.map((cosmeticId) => ({
    user_id: userId,
    cosmetic_id: cosmeticId,
    unlock_type: trigger.type,
  }));

  const { error: insertError } = await supabaseAdmin
    .from('user_cosmetics')
    .insert(rows);

  if (insertError) {
    console.error('[cosmetic-grants] Failed to insert user_cosmetics:', insertError.message);
    return [];
  }

  return newIds;
}
