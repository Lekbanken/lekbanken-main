/**
 * Individual Item Translation Editor Page
 * 
 * Dynamic page for editing translations for a single content item.
 */

import { notFound } from 'next/navigation';
import { createServerRlsClient } from '@/lib/supabase/server';
import { TranslationEditor } from '@/features/admin/translations/TranslationEditor';
import { saveContentTranslation, deleteContentTranslation } from '@/features/admin/translations/content-actions';
import {
  getAchievementTranslations,
  getLearningCourseTranslations,
  getShopItemTranslations,
  getNotificationTemplateTranslations,
} from '@/features/admin/translations/content-api.server';
import type { ContentDomain, ContentLocale } from '@/features/admin/translations/content-types';

interface PageProps {
  params: Promise<{ domain: string; itemId: string }>;
}

const VALID_DOMAINS: ContentDomain[] = [
  'learning_courses',
  'learning_paths',
  'achievements',
  'shop_items',
  'notification_templates',
];

// Field definitions per domain
const DOMAIN_FIELDS: Record<ContentDomain, { key: string; label: string; type: 'text' | 'textarea'; required?: boolean }[]> = {
  learning_courses: [
    { key: 'title', label: 'Titel', type: 'text', required: true },
    { key: 'description', label: 'Beskrivning', type: 'textarea' },
  ],
  learning_paths: [
    { key: 'title', label: 'Titel', type: 'text', required: true },
    { key: 'description', label: 'Beskrivning', type: 'textarea' },
  ],
  achievements: [
    { key: 'name', label: 'Namn', type: 'text', required: true },
    { key: 'description', label: 'Beskrivning', type: 'textarea' },
    { key: 'hint_text', label: 'Tips', type: 'textarea' },
    { key: 'criteria_text', label: 'Kriterier', type: 'textarea' },
  ],
  shop_items: [
    { key: 'name', label: 'Namn', type: 'text', required: true },
    { key: 'description', label: 'Beskrivning', type: 'textarea' },
  ],
  notification_templates: [
    { key: 'title_template', label: 'Rubrikmall', type: 'text', required: true },
    { key: 'message_template', label: 'Meddelandemall', type: 'textarea', required: true },
    { key: 'action_label', label: 'Åtgärdsknapp', type: 'text' },
  ],
};

interface ItemData {
  name: string;
  originalValues: Record<string, string | null>;
  translations: Record<ContentLocale, Record<string, string | null> | null>;
}

async function getItemData(domain: ContentDomain, itemId: string): Promise<ItemData | null> {
  const supabase = await createServerRlsClient();
  
  switch (domain) {
    case 'learning_courses': {
      const { data, error } = await supabase
        .from('learning_courses')
        .select('id, title, description')
        .eq('id', itemId)
        .single();
      
      if (error || !data) return null;
      
      const translations = await getLearningCourseTranslations(itemId);
      const transMap: Record<ContentLocale, Record<string, string | null> | null> = { sv: null, en: null, no: null };
      for (const t of translations) {
        transMap[t.locale as ContentLocale] = {
          title: t.title,
          description: t.description,
        };
      }
      
      return {
        name: data.title,
        originalValues: { title: data.title, description: data.description } as Record<string, string | null>,
        translations: transMap,
      };
    }
    
    case 'achievements': {
      const { data, error } = await supabase
        .from('achievements')
        .select('id, name, description, hint_text')
        .eq('id', itemId)
        .single();
      
      if (error || !data) return null;
      
      const translations = await getAchievementTranslations(itemId);
      const transMap: Record<ContentLocale, Record<string, string | null> | null> = { sv: null, en: null, no: null };
      for (const t of translations) {
        transMap[t.locale as ContentLocale] = {
          name: t.name,
          description: t.description,
          hint_text: t.hint_text,
          criteria_text: t.criteria_text,
        };
      }
      
      return {
        name: data.name,
        originalValues: { name: data.name, description: data.description, hint_text: data.hint_text, criteria_text: null } as Record<string, string | null>,
        translations: transMap,
      };
    }
    
    case 'shop_items': {
      const { data, error } = await supabase
        .from('shop_items')
        .select('id, name, description')
        .eq('id', itemId)
        .single();
      
      if (error || !data) return null;
      
      const translations = await getShopItemTranslations(itemId);
      const transMap: Record<ContentLocale, Record<string, string | null> | null> = { sv: null, en: null, no: null };
      for (const t of translations) {
        transMap[t.locale as ContentLocale] = {
          name: t.name,
          description: t.description,
        };
      }
      
      return {
        name: data.name,
        originalValues: { name: data.name, description: data.description } as Record<string, string | null>,
        translations: transMap,
      };
    }
    
    case 'notification_templates': {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('id, name, title_template, message_template, action_label')
        .eq('id', itemId)
        .single();
      
      if (error || !data) return null;
      
      const translations = await getNotificationTemplateTranslations(itemId);
      const transMap: Record<ContentLocale, Record<string, string | null> | null> = { sv: null, en: null, no: null };
      for (const t of translations) {
        transMap[t.locale as ContentLocale] = {
          title_template: t.title_template,
          message_template: t.message_template,
          action_label: t.action_label,
        };
      }
      
      return {
        name: data.name,
        originalValues: { title_template: data.title_template, message_template: data.message_template, action_label: data.action_label } as Record<string, string | null>,
        translations: transMap,
      };
    }
    
    case 'learning_paths': {
      // Not yet implemented
      return null;
    }
    
    default:
      return null;
  }
}

export default async function ItemTranslationPage({ params }: PageProps) {
  const { domain, itemId } = await params;
  
  if (!VALID_DOMAINS.includes(domain as ContentDomain)) {
    notFound();
  }
  
  const validDomain = domain as ContentDomain;
  const itemData = await getItemData(validDomain, itemId);
  
  if (!itemData) {
    notFound();
  }
  
  const fields = DOMAIN_FIELDS[validDomain];
  
  // Create bound action functions
  async function handleSave(locale: ContentLocale, values: Record<string, string | null>) {
    'use server';
    const result = await saveContentTranslation(validDomain, itemId, locale, values);
    if (!result.success) {
      throw new Error(result.error);
    }
  }
  
  async function handleDelete(locale: ContentLocale) {
    'use server';
    const result = await deleteContentTranslation(validDomain, itemId, locale);
    if (!result.success) {
      throw new Error(result.error);
    }
  }
  
  return (
    <TranslationEditor
      domain={validDomain}
      itemName={itemData.name}
      fields={fields}
      originalValues={itemData.originalValues}
      translations={itemData.translations}
      onSave={handleSave}
      onDelete={handleDelete}
    />
  );
}
