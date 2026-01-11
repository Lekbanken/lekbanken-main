/**
 * Content Translation Types
 * 
 * Type definitions for database-driven content translations
 * across Learning, Achievements, Shop, and Notifications domains.
 */

import type { Database, Json } from '@/types/supabase';

// Supported locales for content translations (matches game_translations pattern)
export type ContentLocale = 'sv' | 'en' | 'no';

export const CONTENT_LOCALES: ContentLocale[] = ['sv', 'en', 'no'];

export const LOCALE_LABELS: Record<ContentLocale, string> = {
  sv: 'Svenska',
  en: 'English',
  no: 'Norsk',
};

export const LOCALE_FLAGS: Record<ContentLocale, string> = {
  sv: '🇸🇪',
  en: '🇬🇧',
  no: '🇳🇴',
};

// ============================================================================
// Re-export Supabase-generated types for translation tables
// ============================================================================

// Learning Course Translations - use generated types
export type LearningCourseTranslation = Database['public']['Tables']['learning_course_translations']['Row'];
export type LearningCourseTranslationInsert = Database['public']['Tables']['learning_course_translations']['Insert'];
export type LearningCourseTranslationUpdate = Database['public']['Tables']['learning_course_translations']['Update'];

// Learning Path Translations
export type LearningPathTranslation = Database['public']['Tables']['learning_path_translations']['Row'];
export type LearningPathTranslationInsert = Database['public']['Tables']['learning_path_translations']['Insert'];
export type LearningPathTranslationUpdate = Database['public']['Tables']['learning_path_translations']['Update'];

// Achievement Translations
export type AchievementTranslation = Database['public']['Tables']['achievement_translations']['Row'];
export type AchievementTranslationInsert = Database['public']['Tables']['achievement_translations']['Insert'];
export type AchievementTranslationUpdate = Database['public']['Tables']['achievement_translations']['Update'];

// Shop Item Translations
export type ShopItemTranslation = Database['public']['Tables']['shop_item_translations']['Row'];
export type ShopItemTranslationInsert = Database['public']['Tables']['shop_item_translations']['Insert'];
export type ShopItemTranslationUpdate = Database['public']['Tables']['shop_item_translations']['Update'];

// Notification Template Translations
export type NotificationTemplateTranslation = Database['public']['Tables']['notification_template_translations']['Row'];
export type NotificationTemplateTranslationInsert = Database['public']['Tables']['notification_template_translations']['Insert'];
export type NotificationTemplateTranslationUpdate = Database['public']['Tables']['notification_template_translations']['Update'];

// Re-export Json type for content_json usage
export type { Json };

// ============================================================================
// Generic Translation Entry (for unified UI)
// ============================================================================

export type ContentDomain = 'learning_courses' | 'learning_paths' | 'achievements' | 'shop_items' | 'notification_templates';

export const CONTENT_DOMAINS: { id: ContentDomain; label: string; icon: string }[] = [
  { id: 'learning_courses', label: 'Kurser', icon: 'academic-cap' },
  { id: 'learning_paths', label: 'Lärandevägar', icon: 'map' },
  { id: 'achievements', label: 'Prestationer', icon: 'trophy' },
  { id: 'shop_items', label: 'Butiksartiklar', icon: 'shopping-bag' },
  { id: 'notification_templates', label: 'Notismallar', icon: 'bell' },
];

export interface ContentTranslationEntry {
  id: string;
  parentId: string;
  parentName: string;  // Original name for reference
  domain: ContentDomain;
  locale: ContentLocale;
  fields: Record<string, string | null>;  // field name -> translated value
  updatedAt: string;
}

export interface ContentTranslationCoverage {
  domain: ContentDomain;
  totalItems: number;
  translatedPerLocale: Record<ContentLocale, number>;
  percentPerLocale: Record<ContentLocale, number>;
}

// ============================================================================
// Translation with parent entity (for listings)
// ============================================================================

export interface TranslatedLearningCourse {
  id: string;
  slug: string;
  status: string;
  tenant_id: string | null;
  // Base fields (original)
  title: string;
  description: string | null;
  // Translations map
  translations: Record<ContentLocale, LearningCourseTranslation | null>;
}

export interface TranslatedAchievement {
  id: string;
  achievement_key: string | null;
  status: string;
  scope: string;
  tenant_id: string | null;
  // Base fields (original)
  name: string;
  description: string | null;
  hint_text: string | null;
  // Translations map
  translations: Record<ContentLocale, AchievementTranslation | null>;
}

export interface TranslatedShopItem {
  id: string;
  category: string;
  tenant_id: string;
  is_available: boolean | null;
  // Base fields (original)
  name: string;
  description: string | null;
  // Translations map
  translations: Record<ContentLocale, ShopItemTranslation | null>;
}

export interface TranslatedNotificationTemplate {
  id: string;
  template_key: string;
  category: string;
  is_active: boolean;
  tenant_id: string | null;
  // Base fields (original)
  name: string;
  title_template: string;
  message_template: string;
  action_label: string | null;
  // Translations map
  translations: Record<ContentLocale, NotificationTemplateTranslation | null>;
}

// ============================================================================
// Utility: Pick best translation
// ============================================================================

export type LocaleOrder = ContentLocale[];

export const DEFAULT_LOCALE_ORDER: LocaleOrder = ['sv', 'no', 'en'];

/**
 * Pick the best available translation from a translations map
 */
export function pickTranslation<T>(
  translations: Record<ContentLocale, T | null> | undefined,
  preferredLocales: LocaleOrder = DEFAULT_LOCALE_ORDER
): T | null {
  if (!translations) return null;
  
  for (const locale of preferredLocales) {
    if (translations[locale]) {
      return translations[locale];
    }
  }
  
  return null;
}

/**
 * Get translated field value with fallback to base entity
 */
export function getTranslatedField<T extends { translations?: Record<ContentLocale, unknown | null> }>(
  entity: T,
  field: string,
  preferredLocales: LocaleOrder = DEFAULT_LOCALE_ORDER
): string | null {
  // Try translations first
  if (entity.translations) {
    for (const locale of preferredLocales) {
      const translation = entity.translations[locale];
      if (translation && typeof translation === 'object' && field in translation) {
        const value = (translation as Record<string, unknown>)[field];
        if (value != null) return String(value);
      }
    }
  }
  
  // Fall back to base entity field
  if (field in entity) {
    const value = (entity as Record<string, unknown>)[field];
    if (value != null) return String(value);
  }
  
  return null;
}
