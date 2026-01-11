/**
 * Content Translation Server API
 * 
 * Server-side functions for managing content translations.
 * Used by the admin translation hub for CRUD operations.
 */

import { createServerRlsClient } from '@/lib/supabase/server';
import type {
  ContentLocale,
  LearningCourseTranslation,
  LearningCourseTranslationInsert,
  LearningPathTranslation,
  LearningPathTranslationInsert,
  AchievementTranslation,
  AchievementTranslationInsert,
  ShopItemTranslation,
  ShopItemTranslationInsert,
  NotificationTemplateTranslation,
  NotificationTemplateTranslationInsert,
  ContentTranslationCoverage,
  TranslatedLearningCourse,
  TranslatedAchievement,
  TranslatedShopItem,
  TranslatedNotificationTemplate,
} from './content-types';
import { CONTENT_LOCALES } from './content-types';

// ============================================================================
// Learning Course Translations
// ============================================================================

export async function getLearningCourseTranslations(courseId: string): Promise<LearningCourseTranslation[]> {
  const supabase = await createServerRlsClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('learning_course_translations')
    .select('*')
    .eq('course_id', courseId)
    .order('locale');
  
  if (error) throw error;
  return (data ?? []) as LearningCourseTranslation[];
}

export async function upsertLearningCourseTranslation(
  input: LearningCourseTranslationInsert
): Promise<LearningCourseTranslation> {
  const supabase = await createServerRlsClient();
  const { data: user } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('learning_course_translations')
    .upsert({
      ...input,
      updated_by: user?.user?.id,
    }, {
      onConflict: 'course_id,locale',
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as LearningCourseTranslation;
}

export async function deleteLearningCourseTranslation(courseId: string, locale: ContentLocale): Promise<void> {
  const supabase = await createServerRlsClient();
  const { error } = await supabase
    .from('learning_course_translations')
    .delete()
    .eq('course_id', courseId)
    .eq('locale', locale);
  
  if (error) throw error;
}

// ============================================================================
// Learning Path Translations
// ============================================================================

export async function getLearningPathTranslations(pathId: string): Promise<LearningPathTranslation[]> {
  const supabase = await createServerRlsClient();
  const { data, error } = await supabase
    .from('learning_path_translations')
    .select('*')
    .eq('path_id', pathId)
    .order('locale');
  
  if (error) throw error;
  return (data ?? []) as LearningPathTranslation[];
}

export async function upsertLearningPathTranslation(
  input: LearningPathTranslationInsert
): Promise<LearningPathTranslation> {
  const supabase = await createServerRlsClient();
  const { data: user } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('learning_path_translations')
    .upsert({
      ...input,
      updated_by: user?.user?.id,
    }, {
      onConflict: 'path_id,locale',
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as LearningPathTranslation;
}

export async function deleteLearningPathTranslation(pathId: string, locale: ContentLocale): Promise<void> {
  const supabase = await createServerRlsClient();
  const { error } = await supabase
    .from('learning_path_translations')
    .delete()
    .eq('path_id', pathId)
    .eq('locale', locale);
  
  if (error) throw error;
}

// ============================================================================
// Achievement Translations
// ============================================================================

export async function getAchievementTranslations(achievementId: string): Promise<AchievementTranslation[]> {
  const supabase = await createServerRlsClient();
  const { data, error } = await supabase
    .from('achievement_translations')
    .select('*')
    .eq('achievement_id', achievementId)
    .order('locale');
  
  if (error) throw error;
  return (data ?? []) as AchievementTranslation[];
}

export async function upsertAchievementTranslation(
  input: AchievementTranslationInsert
): Promise<AchievementTranslation> {
  const supabase = await createServerRlsClient();
  const { data: user } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('achievement_translations')
    .upsert({
      ...input,
      updated_by: user?.user?.id,
    }, {
      onConflict: 'achievement_id,locale',
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as AchievementTranslation;
}

export async function deleteAchievementTranslation(achievementId: string, locale: ContentLocale): Promise<void> {
  const supabase = await createServerRlsClient();
  const { error } = await supabase
    .from('achievement_translations')
    .delete()
    .eq('achievement_id', achievementId)
    .eq('locale', locale);
  
  if (error) throw error;
}

// ============================================================================
// Shop Item Translations
// ============================================================================

export async function getShopItemTranslations(itemId: string): Promise<ShopItemTranslation[]> {
  const supabase = await createServerRlsClient();
  const { data, error } = await supabase
    .from('shop_item_translations')
    .select('*')
    .eq('item_id', itemId)
    .order('locale');
  
  if (error) throw error;
  return (data ?? []) as ShopItemTranslation[];
}

export async function upsertShopItemTranslation(
  input: ShopItemTranslationInsert
): Promise<ShopItemTranslation> {
  const supabase = await createServerRlsClient();
  const { data: user } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('shop_item_translations')
    .upsert({
      ...input,
      updated_by: user?.user?.id,
    }, {
      onConflict: 'item_id,locale',
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as ShopItemTranslation;
}

export async function deleteShopItemTranslation(itemId: string, locale: ContentLocale): Promise<void> {
  const supabase = await createServerRlsClient();
  const { error } = await supabase
    .from('shop_item_translations')
    .delete()
    .eq('item_id', itemId)
    .eq('locale', locale);
  
  if (error) throw error;
}

// ============================================================================
// Notification Template Translations
// ============================================================================

export async function getNotificationTemplateTranslations(templateId: string): Promise<NotificationTemplateTranslation[]> {
  const supabase = await createServerRlsClient();
  const { data, error } = await supabase
    .from('notification_template_translations')
    .select('*')
    .eq('template_id', templateId)
    .order('locale');
  
  if (error) throw error;
  return (data ?? []) as NotificationTemplateTranslation[];
}

export async function upsertNotificationTemplateTranslation(
  input: NotificationTemplateTranslationInsert
): Promise<NotificationTemplateTranslation> {
  const supabase = await createServerRlsClient();
  const { data: user } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('notification_template_translations')
    .upsert({
      ...input,
      updated_by: user?.user?.id,
    }, {
      onConflict: 'template_id,locale',
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as NotificationTemplateTranslation;
}

export async function deleteNotificationTemplateTranslation(templateId: string, locale: ContentLocale): Promise<void> {
  const supabase = await createServerRlsClient();
  const { error } = await supabase
    .from('notification_template_translations')
    .delete()
    .eq('template_id', templateId)
    .eq('locale', locale);
  
  if (error) throw error;
}

// ============================================================================
// Coverage Statistics
// ============================================================================

export async function getContentTranslationCoverage(): Promise<ContentTranslationCoverage[]> {
  const supabase = await createServerRlsClient();
  const results: ContentTranslationCoverage[] = [];
  
  // Learning Courses
  const { count: coursesTotal } = await supabase
    .from('learning_courses')
    .select('*', { count: 'exact', head: true });
  
  const courseTranslatedPerLocale: Record<ContentLocale, number> = { sv: 0, en: 0, no: 0 };
  for (const locale of CONTENT_LOCALES) {
    const { count } = await supabase
      .from('learning_course_translations')
      .select('*', { count: 'exact', head: true })
      .eq('locale', locale);
    courseTranslatedPerLocale[locale] = count ?? 0;
  }
  
  results.push({
    domain: 'learning_courses',
    totalItems: coursesTotal ?? 0,
    translatedPerLocale: courseTranslatedPerLocale,
    percentPerLocale: {
      sv: coursesTotal ? Math.round((courseTranslatedPerLocale.sv / coursesTotal) * 100) : 0,
      en: coursesTotal ? Math.round((courseTranslatedPerLocale.en / coursesTotal) * 100) : 0,
      no: coursesTotal ? Math.round((courseTranslatedPerLocale.no / coursesTotal) * 100) : 0,
    },
  });
  
  // Learning Paths
  const { count: pathsTotal } = await supabase
    .from('learning_paths')
    .select('*', { count: 'exact', head: true });
  
  const pathTranslatedPerLocale: Record<ContentLocale, number> = { sv: 0, en: 0, no: 0 };
  for (const locale of CONTENT_LOCALES) {
    const { count } = await supabase
      .from('learning_path_translations')
      .select('*', { count: 'exact', head: true })
      .eq('locale', locale);
    pathTranslatedPerLocale[locale] = count ?? 0;
  }
  
  results.push({
    domain: 'learning_paths',
    totalItems: pathsTotal ?? 0,
    translatedPerLocale: pathTranslatedPerLocale,
    percentPerLocale: {
      sv: pathsTotal ? Math.round((pathTranslatedPerLocale.sv / pathsTotal) * 100) : 0,
      en: pathsTotal ? Math.round((pathTranslatedPerLocale.en / pathsTotal) * 100) : 0,
      no: pathsTotal ? Math.round((pathTranslatedPerLocale.no / pathsTotal) * 100) : 0,
    },
  });
  
  // Achievements
  const { count: achievementsTotal } = await supabase
    .from('achievements')
    .select('*', { count: 'exact', head: true });
  
  const achievementTranslatedPerLocale: Record<ContentLocale, number> = { sv: 0, en: 0, no: 0 };
  for (const locale of CONTENT_LOCALES) {
    const { count } = await supabase
      .from('achievement_translations')
      .select('*', { count: 'exact', head: true })
      .eq('locale', locale);
    achievementTranslatedPerLocale[locale] = count ?? 0;
  }
  
  results.push({
    domain: 'achievements',
    totalItems: achievementsTotal ?? 0,
    translatedPerLocale: achievementTranslatedPerLocale,
    percentPerLocale: {
      sv: achievementsTotal ? Math.round((achievementTranslatedPerLocale.sv / achievementsTotal) * 100) : 0,
      en: achievementsTotal ? Math.round((achievementTranslatedPerLocale.en / achievementsTotal) * 100) : 0,
      no: achievementsTotal ? Math.round((achievementTranslatedPerLocale.no / achievementsTotal) * 100) : 0,
    },
  });
  
  // Shop Items
  const { count: shopItemsTotal } = await supabase
    .from('shop_items')
    .select('*', { count: 'exact', head: true });
  
  const shopTranslatedPerLocale: Record<ContentLocale, number> = { sv: 0, en: 0, no: 0 };
  for (const locale of CONTENT_LOCALES) {
    const { count } = await supabase
      .from('shop_item_translations')
      .select('*', { count: 'exact', head: true })
      .eq('locale', locale);
    shopTranslatedPerLocale[locale] = count ?? 0;
  }
  
  results.push({
    domain: 'shop_items',
    totalItems: shopItemsTotal ?? 0,
    translatedPerLocale: shopTranslatedPerLocale,
    percentPerLocale: {
      sv: shopItemsTotal ? Math.round((shopTranslatedPerLocale.sv / shopItemsTotal) * 100) : 0,
      en: shopItemsTotal ? Math.round((shopTranslatedPerLocale.en / shopItemsTotal) * 100) : 0,
      no: shopItemsTotal ? Math.round((shopTranslatedPerLocale.no / shopItemsTotal) * 100) : 0,
    },
  });
  
  // Notification Templates
  const { count: templatesTotal } = await supabase
    .from('notification_templates')
    .select('*', { count: 'exact', head: true });
  
  const templateTranslatedPerLocale: Record<ContentLocale, number> = { sv: 0, en: 0, no: 0 };
  for (const locale of CONTENT_LOCALES) {
    const { count } = await supabase
      .from('notification_template_translations')
      .select('*', { count: 'exact', head: true })
      .eq('locale', locale);
    templateTranslatedPerLocale[locale] = count ?? 0;
  }
  
  results.push({
    domain: 'notification_templates',
    totalItems: templatesTotal ?? 0,
    translatedPerLocale: templateTranslatedPerLocale,
    percentPerLocale: {
      sv: templatesTotal ? Math.round((templateTranslatedPerLocale.sv / templatesTotal) * 100) : 0,
      en: templatesTotal ? Math.round((templateTranslatedPerLocale.en / templatesTotal) * 100) : 0,
      no: templatesTotal ? Math.round((templateTranslatedPerLocale.no / templatesTotal) * 100) : 0,
    },
  });
  
  return results;
}

// ============================================================================
// Entities with translations (for listing UIs)
// ============================================================================

export async function getCoursesWithTranslations(): Promise<TranslatedLearningCourse[]> {
  const supabase = await createServerRlsClient();
  
  const { data: courses, error } = await supabase
    .from('learning_courses')
    .select(`
      id,
      slug,
      status,
      tenant_id,
      title,
      description
    `)
    .order('title');
  
  if (error) throw error;
  if (!courses) return [];
  
  // Fetch all translations
  const { data: translations } = await supabase
    .from('learning_course_translations')
    .select('*');
  
  const translationsMap = new Map<string, Record<ContentLocale, LearningCourseTranslation | null>>();
  for (const t of translations ?? []) {
    if (!translationsMap.has(t.course_id)) {
      translationsMap.set(t.course_id, { sv: null, en: null, no: null });
    }
    translationsMap.get(t.course_id)![t.locale as ContentLocale] = t as LearningCourseTranslation;
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (courses as any[]).map((c: any) => ({
    ...c,
    translations: translationsMap.get(c.id) ?? { sv: null, en: null, no: null },
  }));
}

export async function getAchievementsWithTranslations(): Promise<TranslatedAchievement[]> {
  const supabase = await createServerRlsClient();
  
  const { data: achievements, error } = await supabase
    .from('achievements')
    .select(`
      id,
      achievement_key,
      status,
      scope,
      tenant_id,
      name,
      description,
      hint_text
    `)
    .order('name');
  
  if (error) throw error;
  if (!achievements) return [];
  
  const { data: translations } = await supabase
    .from('achievement_translations')
    .select('*');
  
  const translationsMap = new Map<string, Record<ContentLocale, AchievementTranslation | null>>();
  for (const t of translations ?? []) {
    if (!translationsMap.has(t.achievement_id)) {
      translationsMap.set(t.achievement_id, { sv: null, en: null, no: null });
    }
    translationsMap.get(t.achievement_id)![t.locale as ContentLocale] = t as AchievementTranslation;
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (achievements as any[]).map((a: any) => ({
    ...a,
    translations: translationsMap.get(a.id) ?? { sv: null, en: null, no: null },
  }));
}

export async function getShopItemsWithTranslations(): Promise<TranslatedShopItem[]> {
  const supabase = await createServerRlsClient();
  
  const { data: items, error } = await supabase
    .from('shop_items')
    .select(`
      id,
      category,
      tenant_id,
      is_available,
      name,
      description
    `)
    .order('name');
  
  if (error) throw error;
  if (!items) return [];
  
  const { data: translations } = await supabase
    .from('shop_item_translations')
    .select('*');
  
  const translationsMap = new Map<string, Record<ContentLocale, ShopItemTranslation | null>>();
  for (const t of translations ?? []) {
    if (!translationsMap.has(t.item_id)) {
      translationsMap.set(t.item_id, { sv: null, en: null, no: null });
    }
    translationsMap.get(t.item_id)![t.locale as ContentLocale] = t as ShopItemTranslation;
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (items as any[]).map((i: any) => ({
    ...i,
    translations: translationsMap.get(i.id) ?? { sv: null, en: null, no: null },
  }));
}

export async function getNotificationTemplatesWithTranslations(): Promise<TranslatedNotificationTemplate[]> {
  const supabase = await createServerRlsClient();
  
  const { data: templates, error } = await supabase
    .from('notification_templates')
    .select(`
      id,
      template_key,
      category,
      is_active,
      tenant_id,
      name,
      title_template,
      message_template,
      action_label
    `)
    .order('name');
  
  if (error) throw error;
  if (!templates) return [];
  
  const { data: translations } = await supabase
    .from('notification_template_translations')
    .select('*');
  
  const translationsMap = new Map<string, Record<ContentLocale, NotificationTemplateTranslation | null>>();
  for (const t of translations ?? []) {
    if (!translationsMap.has(t.template_id)) {
      translationsMap.set(t.template_id, { sv: null, en: null, no: null });
    }
    translationsMap.get(t.template_id)![t.locale as ContentLocale] = t as NotificationTemplateTranslation;
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (templates as any[]).map((t: any) => ({
    ...t,
    translations: translationsMap.get(t.id) ?? { sv: null, en: null, no: null },
  }));
}
