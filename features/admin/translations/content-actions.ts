'use server';

/**
 * Content Translation Server Actions
 * 
 * Server actions for saving and deleting content translations.
 */

import { revalidatePath } from 'next/cache';
import {
  upsertLearningCourseTranslation,
  deleteLearningCourseTranslation,
  upsertLearningPathTranslation,
  deleteLearningPathTranslation,
  upsertAchievementTranslation,
  deleteAchievementTranslation,
  upsertShopItemTranslation,
  deleteShopItemTranslation,
  upsertNotificationTemplateTranslation,
  deleteNotificationTemplateTranslation,
} from './content-api.server';
import type { ContentDomain, ContentLocale } from './content-types';

export async function saveContentTranslation(
  domain: ContentDomain,
  parentId: string,
  locale: ContentLocale,
  values: Record<string, string | null>
): Promise<{ success: boolean; error?: string }> {
  try {
    switch (domain) {
      case 'learning_courses':
        await upsertLearningCourseTranslation({
          course_id: parentId,
          locale,
          title: values.title ?? '',
          description: values.description,
          content_json: values.content_json ? JSON.parse(values.content_json) : null,
        });
        break;
        
      case 'learning_paths':
        await upsertLearningPathTranslation({
          path_id: parentId,
          locale,
          title: values.title ?? '',
          description: values.description,
        });
        break;
        
      case 'achievements':
        await upsertAchievementTranslation({
          achievement_id: parentId,
          locale,
          name: values.name ?? '',
          description: values.description,
          hint_text: values.hint_text,
          criteria_text: values.criteria_text,
        });
        break;
        
      case 'shop_items':
        await upsertShopItemTranslation({
          item_id: parentId,
          locale,
          name: values.name ?? '',
          description: values.description,
        });
        break;
        
      case 'notification_templates':
        await upsertNotificationTemplateTranslation({
          template_id: parentId,
          locale,
          title_template: values.title_template ?? '',
          message_template: values.message_template ?? '',
          action_label: values.action_label,
        });
        break;
        
      default:
        return { success: false, error: 'Unknown domain' };
    }
    
    revalidatePath(`/admin/translations/content/${domain}`);
    revalidatePath(`/admin/translations/content/${domain}/${parentId}`);
    revalidatePath('/admin/translations/content');
    
    return { success: true };
  } catch (error) {
    console.error('Failed to save content translation:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function deleteContentTranslation(
  domain: ContentDomain,
  parentId: string,
  locale: ContentLocale
): Promise<{ success: boolean; error?: string }> {
  try {
    switch (domain) {
      case 'learning_courses':
        await deleteLearningCourseTranslation(parentId, locale);
        break;
        
      case 'learning_paths':
        await deleteLearningPathTranslation(parentId, locale);
        break;
        
      case 'achievements':
        await deleteAchievementTranslation(parentId, locale);
        break;
        
      case 'shop_items':
        await deleteShopItemTranslation(parentId, locale);
        break;
        
      case 'notification_templates':
        await deleteNotificationTemplateTranslation(parentId, locale);
        break;
        
      default:
        return { success: false, error: 'Unknown domain' };
    }
    
    revalidatePath(`/admin/translations/content/${domain}`);
    revalidatePath(`/admin/translations/content/${domain}/${parentId}`);
    revalidatePath('/admin/translations/content');
    
    return { success: true };
  } catch (error) {
    console.error('Failed to delete content translation:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
