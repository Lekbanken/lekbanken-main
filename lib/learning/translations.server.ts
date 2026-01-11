/**
 * Learning Domain Translation Helpers
 * 
 * Utilities for fetching and applying translations to learning content.
 * Used by app-facing code to display localized course/path content.
 */

import { createServerRlsClient } from '@/lib/supabase/server';
import type { ContentLocale } from '@/features/admin/translations/content-types';

// Default fallback chain for Nordic markets
const DEFAULT_LOCALE_ORDER: ContentLocale[] = ['sv', 'no', 'en'];

export interface LocalizedCourse {
  id: string;
  slug: string;
  status: string;
  tenant_id: string | null;
  cover_image_url: string | null;
  difficulty: string | null;
  duration_minutes: number | null;
  // Localized fields
  title: string;
  description: string | null;
  content_json: Record<string, unknown> | null;
  // Metadata
  _locale: ContentLocale;
  _hasTranslation: boolean;
}

export interface LocalizedPath {
  id: string;
  slug: string;
  status: string;
  tenant_id: string | null;
  // Localized fields
  title: string;
  description: string | null;
  // Metadata
  _locale: ContentLocale;
  _hasTranslation: boolean;
}

/**
 * Get a course with localized content based on preferred locale order.
 * Falls back through locales until a translation is found.
 */
export async function getLocalizedCourse(
  courseId: string,
  preferredLocales: ContentLocale[] = DEFAULT_LOCALE_ORDER
): Promise<LocalizedCourse | null> {
  const supabase = await createServerRlsClient();
  
  // Fetch base course
  const { data: course, error } = await supabase
    .from('learning_courses')
    .select(`
      id,
      slug,
      status,
      tenant_id,
      cover_image_url,
      difficulty,
      duration_minutes,
      title,
      description,
      content_json
    `)
    .eq('id', courseId)
    .single();
  
  if (error || !course) return null;
  
  // Fetch translations
  const { data: translations } = await supabase
    .from('learning_course_translations')
    .select('locale, title, description, content_json')
    .eq('course_id', courseId);
  
  // Build translation map
  const transMap = new Map<ContentLocale, { title: string; description: string | null; content_json: unknown }>();
  for (const t of translations ?? []) {
    transMap.set(t.locale as ContentLocale, t);
  }
  
  // Find best translation
  let usedLocale: ContentLocale = 'sv';
  let hasTranslation = false;
  let localizedTitle = course.title;
  let localizedDescription = course.description;
  let localizedContent = course.content_json as Record<string, unknown> | null;
  
  for (const locale of preferredLocales) {
    const trans = transMap.get(locale);
    if (trans) {
      usedLocale = locale;
      hasTranslation = true;
      localizedTitle = trans.title;
      localizedDescription = trans.description;
      localizedContent = trans.content_json as Record<string, unknown> | null;
      break;
    }
  }
  
  return {
    id: course.id,
    slug: course.slug,
    status: course.status,
    tenant_id: course.tenant_id,
    cover_image_url: course.cover_image_url,
    difficulty: course.difficulty,
    duration_minutes: course.duration_minutes,
    title: localizedTitle,
    description: localizedDescription,
    content_json: localizedContent,
    _locale: usedLocale,
    _hasTranslation: hasTranslation,
  };
}

/**
 * Get a course by slug with localized content.
 */
export async function getLocalizedCourseBySlug(
  slug: string,
  preferredLocales: ContentLocale[] = DEFAULT_LOCALE_ORDER
): Promise<LocalizedCourse | null> {
  const supabase = await createServerRlsClient();
  
  const { data: course, error } = await supabase
    .from('learning_courses')
    .select('id')
    .eq('slug', slug)
    .single();
  
  if (error || !course) return null;
  
  return getLocalizedCourse(course.id, preferredLocales);
}

/**
 * Get all published courses with localized content.
 */
export async function getLocalizedCourses(
  preferredLocales: ContentLocale[] = DEFAULT_LOCALE_ORDER,
  tenantId?: string | null
): Promise<LocalizedCourse[]> {
  const supabase = await createServerRlsClient();
  
  // Build query
  let query = supabase
    .from('learning_courses')
    .select(`
      id,
      slug,
      status,
      tenant_id,
      cover_image_url,
      difficulty,
      duration_minutes,
      title,
      description,
      content_json
    `)
    .eq('status', 'published')
    .order('title');
  
  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }
  
  const { data: courses, error } = await query;
  if (error || !courses) return [];
  
  // Fetch all translations
  const courseIds = courses.map((c) => c.id);
  const { data: translations } = await supabase
    .from('learning_course_translations')
    .select('course_id, locale, title, description')
    .in('course_id', courseIds);
  
  // Build translation lookup
  const transLookup = new Map<string, Map<ContentLocale, { title: string; description: string | null }>>();
  for (const t of translations ?? []) {
    if (!transLookup.has(t.course_id)) {
      transLookup.set(t.course_id, new Map());
    }
    transLookup.get(t.course_id)!.set(t.locale as ContentLocale, t);
  }
  
  // Apply translations
  return courses.map((course) => {
    const courseTransMap = transLookup.get(course.id);
    let usedLocale: ContentLocale = 'sv';
    let hasTranslation = false;
    let title = course.title;
    let description = course.description;
    
    if (courseTransMap) {
      for (const locale of preferredLocales) {
        const trans = courseTransMap.get(locale);
        if (trans) {
          usedLocale = locale;
          hasTranslation = true;
          title = trans.title;
          description = trans.description;
          break;
        }
      }
    }
    
    return {
      id: course.id,
      slug: course.slug,
      status: course.status,
      tenant_id: course.tenant_id,
      cover_image_url: course.cover_image_url,
      difficulty: course.difficulty,
      duration_minutes: course.duration_minutes,
      title,
      description,
      content_json: course.content_json as Record<string, unknown> | null,
      _locale: usedLocale,
      _hasTranslation: hasTranslation,
    };
  });
}

/**
 * Get a learning path with localized content.
 */
export async function getLocalizedPath(
  pathId: string,
  preferredLocales: ContentLocale[] = DEFAULT_LOCALE_ORDER
): Promise<LocalizedPath | null> {
  const supabase = await createServerRlsClient();
  
  const { data: path, error } = await supabase
    .from('learning_paths')
    .select('id, slug, status, tenant_id, title, description')
    .eq('id', pathId)
    .single();
  
  if (error || !path) return null;
  
  const { data: translations } = await supabase
    .from('learning_path_translations')
    .select('locale, title, description')
    .eq('path_id', pathId);
  
  const transMap = new Map<ContentLocale, { title: string; description: string | null }>();
  for (const t of translations ?? []) {
    transMap.set(t.locale as ContentLocale, t);
  }
  
  let usedLocale: ContentLocale = 'sv';
  let hasTranslation = false;
  let title = path.title;
  let description = path.description;
  
  for (const locale of preferredLocales) {
    const trans = transMap.get(locale);
    if (trans) {
      usedLocale = locale;
      hasTranslation = true;
      title = trans.title;
      description = trans.description;
      break;
    }
  }
  
  return {
    id: path.id,
    slug: path.slug,
    status: path.status,
    tenant_id: path.tenant_id,
    title,
    description,
    _locale: usedLocale,
    _hasTranslation: hasTranslation,
  };
}
