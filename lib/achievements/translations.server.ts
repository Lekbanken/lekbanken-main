/**
 * Achievement Domain Translation Helpers
 * 
 * Utilities for fetching and applying translations to achievements.
 * Used by app-facing code to display localized achievement content.
 */

import { createServerRlsClient } from '@/lib/supabase/server';
import type { ContentLocale } from '@/features/admin/translations/content-types';

// Default fallback chain for Nordic markets
const DEFAULT_LOCALE_ORDER: ContentLocale[] = ['sv', 'no', 'en'];

export interface LocalizedAchievement {
  id: string;
  achievement_key: string | null;
  condition_type: string;
  condition_value: number | null;
  scope: string;
  tenant_id: string | null;
  status: string;
  is_easter_egg: boolean;
  icon_url: string | null;
  icon_config: Record<string, unknown> | null;
  badge_color: string | null;
  // Localized fields
  name: string;
  description: string | null;
  hint_text: string | null;
  criteria_text: string | null;
  // Metadata
  _locale: ContentLocale;
  _hasTranslation: boolean;
}

/**
 * Get an achievement with localized content based on preferred locale order.
 */
export async function getLocalizedAchievement(
  achievementId: string,
  preferredLocales: ContentLocale[] = DEFAULT_LOCALE_ORDER
): Promise<LocalizedAchievement | null> {
  const supabase = await createServerRlsClient();
  
  const { data: achievement, error } = await supabase
    .from('achievements')
    .select(`
      id,
      achievement_key,
      condition_type,
      condition_value,
      scope,
      tenant_id,
      status,
      is_easter_egg,
      icon_url,
      icon_config,
      badge_color,
      name,
      description,
      hint_text
    `)
    .eq('id', achievementId)
    .single();
  
  if (error || !achievement) return null;
  
  const { data: translations } = await supabase
    .from('achievement_translations')
    .select('locale, name, description, hint_text, criteria_text')
    .eq('achievement_id', achievementId);
  
  const transMap = new Map<ContentLocale, { name: string; description: string | null; hint_text: string | null; criteria_text: string | null }>();
  for (const t of translations ?? []) {
    transMap.set(t.locale as ContentLocale, t);
  }
  
  let usedLocale: ContentLocale = 'sv';
  let hasTranslation = false;
  let name = achievement.name;
  let description = achievement.description;
  let hint_text = achievement.hint_text;
  let criteria_text: string | null = null;
  
  for (const locale of preferredLocales) {
    const trans = transMap.get(locale);
    if (trans) {
      usedLocale = locale;
      hasTranslation = true;
      name = trans.name;
      description = trans.description;
      hint_text = trans.hint_text;
      criteria_text = trans.criteria_text;
      break;
    }
  }
  
  return {
    id: achievement.id,
    achievement_key: achievement.achievement_key,
    condition_type: achievement.condition_type,
    condition_value: achievement.condition_value,
    scope: achievement.scope,
    tenant_id: achievement.tenant_id,
    status: achievement.status,
    is_easter_egg: achievement.is_easter_egg,
    icon_url: achievement.icon_url,
    icon_config: achievement.icon_config as Record<string, unknown> | null,
    badge_color: achievement.badge_color,
    name,
    description,
    hint_text,
    criteria_text,
    _locale: usedLocale,
    _hasTranslation: hasTranslation,
  };
}

/**
 * Get all published achievements with localized content.
 */
export async function getLocalizedAchievements(
  preferredLocales: ContentLocale[] = DEFAULT_LOCALE_ORDER,
  options?: {
    tenantId?: string | null;
    scope?: string;
    includeEasterEggs?: boolean;
  }
): Promise<LocalizedAchievement[]> {
  const supabase = await createServerRlsClient();
  
  let query = supabase
    .from('achievements')
    .select(`
      id,
      achievement_key,
      condition_type,
      condition_value,
      scope,
      tenant_id,
      status,
      is_easter_egg,
      icon_url,
      icon_config,
      badge_color,
      name,
      description,
      hint_text
    `)
    .eq('status', 'active')
    .order('name');
  
  if (options?.tenantId) {
    query = query.eq('tenant_id', options.tenantId);
  }
  if (options?.scope) {
    query = query.eq('scope', options.scope);
  }
  if (!options?.includeEasterEggs) {
    query = query.eq('is_easter_egg', false);
  }
  
  const { data: achievements, error } = await query;
  if (error || !achievements) return [];
  
  const achievementIds = achievements.map((a) => a.id);
  const { data: translations } = await supabase
    .from('achievement_translations')
    .select('achievement_id, locale, name, description, hint_text, criteria_text')
    .in('achievement_id', achievementIds);
  
  const transLookup = new Map<string, Map<ContentLocale, { name: string; description: string | null; hint_text: string | null; criteria_text: string | null }>>();
  for (const t of translations ?? []) {
    if (!transLookup.has(t.achievement_id)) {
      transLookup.set(t.achievement_id, new Map());
    }
    transLookup.get(t.achievement_id)!.set(t.locale as ContentLocale, t);
  }
  
  return achievements.map((achievement) => {
    const achTransMap = transLookup.get(achievement.id);
    let usedLocale: ContentLocale = 'sv';
    let hasTranslation = false;
    let name = achievement.name;
    let description = achievement.description;
    let hint_text = achievement.hint_text;
    let criteria_text: string | null = null;
    
    if (achTransMap) {
      for (const locale of preferredLocales) {
        const trans = achTransMap.get(locale);
        if (trans) {
          usedLocale = locale;
          hasTranslation = true;
          name = trans.name;
          description = trans.description;
          hint_text = trans.hint_text;
          criteria_text = trans.criteria_text;
          break;
        }
      }
    }
    
    return {
      id: achievement.id,
      achievement_key: achievement.achievement_key,
      condition_type: achievement.condition_type,
      condition_value: achievement.condition_value,
      scope: achievement.scope,
      tenant_id: achievement.tenant_id,
      status: achievement.status,
      is_easter_egg: achievement.is_easter_egg,
      icon_url: achievement.icon_url,
      icon_config: achievement.icon_config as Record<string, unknown> | null,
      badge_color: achievement.badge_color,
      name,
      description,
      hint_text,
      criteria_text,
      _locale: usedLocale,
      _hasTranslation: hasTranslation,
    };
  });
}

/**
 * Get an achievement by key with localized content.
 */
export async function getLocalizedAchievementByKey(
  key: string,
  preferredLocales: ContentLocale[] = DEFAULT_LOCALE_ORDER
): Promise<LocalizedAchievement | null> {
  const supabase = await createServerRlsClient();
  
  const { data: achievement, error } = await supabase
    .from('achievements')
    .select('id')
    .eq('achievement_key', key)
    .single();
  
  if (error || !achievement) return null;
  
  return getLocalizedAchievement(achievement.id, preferredLocales);
}
