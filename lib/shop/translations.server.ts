/**
 * Shop Domain Translation Helpers
 * 
 * Utilities for fetching and applying translations to shop items.
 * Used by app-facing code to display localized shop content.
 */

import { createServerRlsClient } from '@/lib/supabase/server';
import type { ContentLocale } from '@/features/admin/translations/content-types';

// Default fallback chain for Nordic markets
const DEFAULT_LOCALE_ORDER: ContentLocale[] = ['sv', 'no', 'en'];

export interface LocalizedShopItem {
  id: string;
  category: string;
  tenant_id: string;
  currency_id: string;
  price: number;
  image_url: string | null;
  is_available: boolean | null;
  is_featured: boolean | null;
  quantity_limit: number | null;
  sort_order: number | null;
  // Localized fields
  name: string;
  description: string | null;
  // Metadata
  _locale: ContentLocale;
  _hasTranslation: boolean;
}

/**
 * Get a shop item with localized content based on preferred locale order.
 */
export async function getLocalizedShopItem(
  itemId: string,
  preferredLocales: ContentLocale[] = DEFAULT_LOCALE_ORDER
): Promise<LocalizedShopItem | null> {
  const supabase = await createServerRlsClient();
  
  const { data: item, error } = await supabase
    .from('shop_items')
    .select(`
      id,
      category,
      tenant_id,
      currency_id,
      price,
      image_url,
      is_available,
      is_featured,
      quantity_limit,
      sort_order,
      name,
      description
    `)
    .eq('id', itemId)
    .single();
  
  if (error || !item) return null;
  
  const { data: translations } = await supabase
    .from('shop_item_translations')
    .select('locale, name, description')
    .eq('item_id', itemId);
  
  const transMap = new Map<ContentLocale, { name: string; description: string | null }>();
  for (const t of translations ?? []) {
    transMap.set(t.locale as ContentLocale, t);
  }
  
  let usedLocale: ContentLocale = 'sv';
  let hasTranslation = false;
  let name = item.name;
  let description = item.description;
  
  for (const locale of preferredLocales) {
    const trans = transMap.get(locale);
    if (trans) {
      usedLocale = locale;
      hasTranslation = true;
      name = trans.name;
      description = trans.description;
      break;
    }
  }
  
  return {
    id: item.id,
    category: item.category,
    tenant_id: item.tenant_id,
    currency_id: item.currency_id,
    price: item.price,
    image_url: item.image_url,
    is_available: item.is_available,
    is_featured: item.is_featured,
    quantity_limit: item.quantity_limit,
    sort_order: item.sort_order,
    name,
    description,
    _locale: usedLocale,
    _hasTranslation: hasTranslation,
  };
}

/**
 * Get all available shop items with localized content for a tenant.
 */
export async function getLocalizedShopItems(
  tenantId: string,
  preferredLocales: ContentLocale[] = DEFAULT_LOCALE_ORDER,
  options?: {
    category?: string;
    featuredOnly?: boolean;
  }
): Promise<LocalizedShopItem[]> {
  const supabase = await createServerRlsClient();
  
  let query = supabase
    .from('shop_items')
    .select(`
      id,
      category,
      tenant_id,
      currency_id,
      price,
      image_url,
      is_available,
      is_featured,
      quantity_limit,
      sort_order,
      name,
      description
    `)
    .eq('tenant_id', tenantId)
    .eq('is_available', true)
    .order('sort_order', { nullsFirst: false })
    .order('name');
  
  if (options?.category) {
    query = query.eq('category', options.category);
  }
  if (options?.featuredOnly) {
    query = query.eq('is_featured', true);
  }
  
  const { data: items, error } = await query;
  if (error || !items) return [];
  
  const itemIds = items.map((i) => i.id);
  const { data: translations } = await supabase
    .from('shop_item_translations')
    .select('item_id, locale, name, description')
    .in('item_id', itemIds);
  
  const transLookup = new Map<string, Map<ContentLocale, { name: string; description: string | null }>>();
  for (const t of translations ?? []) {
    if (!transLookup.has(t.item_id)) {
      transLookup.set(t.item_id, new Map());
    }
    transLookup.get(t.item_id)!.set(t.locale as ContentLocale, t);
  }
  
  return items.map((item) => {
    const itemTransMap = transLookup.get(item.id);
    let usedLocale: ContentLocale = 'sv';
    let hasTranslation = false;
    let name = item.name;
    let description = item.description;
    
    if (itemTransMap) {
      for (const locale of preferredLocales) {
        const trans = itemTransMap.get(locale);
        if (trans) {
          usedLocale = locale;
          hasTranslation = true;
          name = trans.name;
          description = trans.description;
          break;
        }
      }
    }
    
    return {
      id: item.id,
      category: item.category,
      tenant_id: item.tenant_id,
      currency_id: item.currency_id,
      price: item.price,
      image_url: item.image_url,
      is_available: item.is_available,
      is_featured: item.is_featured,
      quantity_limit: item.quantity_limit,
      sort_order: item.sort_order,
      name,
      description,
      _locale: usedLocale,
      _hasTranslation: hasTranslation,
    };
  });
}
