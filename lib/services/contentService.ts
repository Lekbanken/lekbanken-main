import { supabase } from '@/lib/supabase/client';
import type { Database, Json } from '@/types/supabase';

// Types - Use Supabase generated types where possible
export type ContentItem = Database['public']['Tables']['content_items']['Row'];
export type ContentItemInsert = Database['public']['Tables']['content_items']['Insert'];

export interface ContentSchedule {
  id: string;
  tenant_id: string;
  content_id: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SeasonalEvent {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  theme: string | null;
  start_date: string;
  end_date: string;
  reward_multiplier: number;
  featured_content_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContentCollection {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  category: string;
  cover_image_url: string | null;
  game_count: number;
  view_count: number;
  is_published: boolean;
  is_featured: boolean;
  order_index: number;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CollectionItem {
  id: string;
  collection_id: string;
  game_id: string;
  order_index: number;
  created_at: string;
}

// Content Items
export async function getContentItems(
  tenantId: string,
  filter?: { type?: string; onlyPublished?: boolean; onlyFeatured?: boolean; limit?: number; offset?: number }
): Promise<ContentItem[] | null> {
  try {
    let query = supabase
      .from('content_items')
      .select('*')
      .eq('tenant_id', tenantId);

    if (filter?.type) query = query.eq('type', filter.type);
    if (filter?.onlyPublished) query = query.eq('is_published', true);
    if (filter?.onlyFeatured) query = query.eq('is_featured', true);

    query = query.order('created_at', { ascending: false });
    query = query.limit(filter?.limit || 50).range(filter?.offset || 0, (filter?.limit || 50) + (filter?.offset || 0) - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching content items:', error);
      return null;
    }

    return (data as ContentItem[]) || [];
  } catch (err) {
    console.error('Error fetching content items:', err);
    return null;
  }
}

export async function createContentItem(
  tenantId: string,
  userId: string,
  item: {
    type: ContentItem['type'];
    title: string;
    description?: string | null;
    image_url?: string | null;
    is_published?: boolean;
    is_featured?: boolean;
    featured_until?: string | null;
    metadata?: Json | null;
  }
): Promise<ContentItem | null> {
  try {
    const insertData: ContentItemInsert = {
      tenant_id: tenantId,
      created_by_user_id: userId,
      type: item.type,
      title: item.title,
      description: item.description ?? null,
      image_url: item.image_url ?? null,
      is_published: item.is_published ?? false,
      is_featured: item.is_featured ?? false,
      featured_until: item.featured_until ?? null,
      metadata: item.metadata ?? null,
    };

    const { data, error } = await supabase
      .from('content_items')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating content item:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error creating content item:', err);
    return null;
  }
}

export async function updateContentItem(
  id: string,
  updates: Database['public']['Tables']['content_items']['Update']
): Promise<ContentItem | null> {
  try {
    const { data, error } = await supabase
      .from('content_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating content item:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error updating content item:', err);
    return null;
  }
}

export async function deleteContentItem(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('content_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting content item:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error deleting content item:', err);
    return false;
  }
}

// Content Schedules
export async function getContentSchedule(contentId: string): Promise<ContentSchedule | null> {
  try {
    const { data, error } = await supabase
      .from('content_schedules')
      .select('*')
      .eq('content_id', contentId)
      .single();

    if (error) {
      console.error('Error fetching content schedule:', error);
      return null;
    }

    return data as ContentSchedule;
  } catch (err) {
    console.error('Error fetching content schedule:', err);
    return null;
  }
}

export async function createOrUpdateContentSchedule(
  tenantId: string,
  contentId: string,
  startDate: string,
  endDate: string
): Promise<ContentSchedule | null> {
  try {
    const existing = await getContentSchedule(contentId);

    if (existing) {
      const { data, error } = await supabase
        .from('content_schedules')
        .update({
          start_date: startDate,
          end_date: endDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating content schedule:', error);
        return null;
      }

      return data as ContentSchedule;
    } else {
      const { data, error } = await supabase
        .from('content_schedules')
        .insert({
          tenant_id: tenantId,
          content_id: contentId,
          start_date: startDate,
          end_date: endDate,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating content schedule:', error);
        return null;
      }

      return data as ContentSchedule;
    }
  } catch (err) {
    console.error('Error managing content schedule:', err);
    return null;
  }
}

// Seasonal Events
export async function getSeasonalEvents(tenantId: string, onlyActive?: boolean): Promise<SeasonalEvent[] | null> {
  try {
    let query = supabase
      .from('seasonal_events')
      .select('*')
      .eq('tenant_id', tenantId);

    if (onlyActive) query = query.eq('is_active', true);

    query = query.order('start_date', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching seasonal events:', error);
      return null;
    }

    return (data as SeasonalEvent[]) || [];
  } catch (err) {
    console.error('Error fetching seasonal events:', err);
    return null;
  }
}

export async function createSeasonalEvent(
  tenantId: string,
  event: Omit<SeasonalEvent, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>
): Promise<SeasonalEvent | null> {
  try {
    const { data, error } = await supabase
      .from('seasonal_events')
      .insert({
        tenant_id: tenantId,
        ...event,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating seasonal event:', error);
      return null;
    }

    return data as SeasonalEvent;
  } catch (err) {
    console.error('Error creating seasonal event:', err);
    return null;
  }
}

export async function updateSeasonalEvent(id: string, updates: Partial<SeasonalEvent>): Promise<SeasonalEvent | null> {
  try {
    const { data, error } = await supabase
      .from('seasonal_events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating seasonal event:', error);
      return null;
    }

    return data as SeasonalEvent;
  } catch (err) {
    console.error('Error updating seasonal event:', err);
    return null;
  }
}

// Content Collections
export async function getContentCollections(
  tenantId: string,
  filter?: { category?: string; onlyPublished?: boolean; onlyFeatured?: boolean }
): Promise<ContentCollection[] | null> {
  try {
    let query = supabase
      .from('content_collections')
      .select('*')
      .eq('tenant_id', tenantId);

    if (filter?.category) query = query.eq('category', filter.category);
    if (filter?.onlyPublished) query = query.eq('is_published', true);
    if (filter?.onlyFeatured) query = query.eq('is_featured', true);

    query = query.order('order_index', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching content collections:', error);
      return null;
    }

    return (data as ContentCollection[]) || [];
  } catch (err) {
    console.error('Error fetching content collections:', err);
    return null;
  }
}

export async function createContentCollection(
  tenantId: string,
  userId: string,
  collection: Omit<ContentCollection, 'id' | 'tenant_id' | 'created_by_user_id' | 'created_at' | 'updated_at' | 'game_count' | 'view_count'>
): Promise<ContentCollection | null> {
  try {
    const { data, error } = await supabase
      .from('content_collections')
      .insert({
        tenant_id: tenantId,
        created_by_user_id: userId,
        ...collection,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating content collection:', error);
      return null;
    }

    return data as ContentCollection;
  } catch (err) {
    console.error('Error creating content collection:', err);
    return null;
  }
}

export async function updateContentCollection(id: string, updates: Partial<ContentCollection>): Promise<ContentCollection | null> {
  try {
    const { data, error } = await supabase
      .from('content_collections')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating content collection:', error);
      return null;
    }

    return data as ContentCollection;
  } catch (err) {
    console.error('Error updating content collection:', err);
    return null;
  }
}

// Collection Items
export async function getCollectionItems(collectionId: string): Promise<CollectionItem[] | null> {
  try {
    const { data, error } = await supabase
      .from('collection_items')
      .select('*')
      .eq('collection_id', collectionId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching collection items:', error);
      return null;
    }

    return (data as CollectionItem[]) || [];
  } catch (err) {
    console.error('Error fetching collection items:', err);
    return null;
  }
}

export async function addGameToCollection(
  collectionId: string,
  gameId: string,
  orderIndex?: number
): Promise<CollectionItem | null> {
  try {
    const { data, error } = await supabase
      .from('collection_items')
      .insert({
        collection_id: collectionId,
        game_id: gameId,
        order_index: orderIndex || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding game to collection:', error);
      return null;
    }

    return data as CollectionItem;
  } catch (err) {
    console.error('Error adding game to collection:', err);
    return null;
  }
}

export async function removeGameFromCollection(collectionItemId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('collection_items')
      .delete()
      .eq('id', collectionItemId);

    if (error) {
      console.error('Error removing game from collection:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error removing game from collection:', err);
    return false;
  }
}

// Use Supabase type for ContentAnalytics
export type ContentAnalytics = Database['public']['Tables']['content_analytics']['Row'];

export async function getContentAnalytics(tenantId: string, contentId: string): Promise<ContentAnalytics | null> {
  try {
    const { data, error } = await supabase
      .from('content_analytics')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('content_id', contentId)
      .single();

    if (error) {
      console.error('Error fetching content analytics:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error fetching content analytics:', err);
    return null;
  }
}

export async function trackContentView(tenantId: string, contentId: string): Promise<boolean> {
  try {
    const analytics = await getContentAnalytics(tenantId, contentId);

    if (analytics) {
      const { error } = await supabase
        .from('content_analytics')
        .update({
          view_count: (analytics.view_count || 0) + 1,
          last_viewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', analytics.id);

      if (error) {
        console.error('Error updating content analytics:', error);
        return false;
      }
    } else {
      const { error } = await supabase
        .from('content_analytics')
        .insert({
          tenant_id: tenantId,
          content_id: contentId,
          view_count: 1,
          click_count: 0,
          engagement_score: 0,
          last_viewed_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error creating content analytics:', error);
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error('Error tracking content view:', err);
    return false;
  }
}

export async function getTrendingContent(tenantId: string, limit = 10): Promise<ContentItem[] | null> {
  try {
    const { data, error } = await supabase
      .from('content_analytics')
      .select('content_items(*)')
      .eq('tenant_id', tenantId)
      .order('engagement_score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching trending content:', error);
      return null;
    }

    // Extract content_items from the joined query result
    const contentItems = data
      ?.map((item) => item.content_items)
      .filter((item): item is ContentItem => item !== null);

    return contentItems || [];
  } catch (err) {
    console.error('Error fetching trending content:', err);
    return null;
  }
}
