/**
 * Personalization Service
 *
 * Manages user preferences, recommendations, saved items, and personalization
 * settings to deliver customized experiences based on user behavior and interests.
 */

import { supabase } from '@/lib/supabase/client';

// Type definitions
export interface UserPreference {
  id: string;
  tenant_id: string;
  user_id: string;
  language?: string;
  theme?: 'light' | 'dark' | 'auto';
  notifications_enabled?: boolean;
  email_frequency?: string;
  preferred_game_categories?: string[];
  difficulty_preference?: string;
  content_maturity_level?: string;
  profile_visibility?: string;
  show_stats_publicly?: boolean;
  allow_friend_requests?: boolean;
  allow_messages?: boolean;
  enable_recommendations?: boolean;
  recommendation_frequency?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SavedItem {
  id: string;
  tenant_id: string;
  user_id: string;
  item_type: string;
  item_id: string;
  item_title?: string;
  item_metadata?: Record<string, unknown>;
  saved_at?: string;
}

export interface PersonalizationEvent {
  id: string;
  tenant_id: string;
  user_id: string;
  event_type: string;
  item_type?: string;
  item_id?: string;
  item_title?: string;
  event_metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface RecommendationItem {
  id: string;
  tenant_id: string;
  user_id: string;
  recommendation_id: string;
  item_type: string;
  item_id: string;
  item_title?: string;
  reason: string;
  confidence_score: number;
  rank_position: number;
  was_clicked?: boolean;
  was_completed?: boolean;
  created_at?: string;
}

export interface InterestProfile {
  id: string;
  tenant_id: string;
  user_id: string;
  interest_category: string;
  interest_weight: number;
  interest_activity: number;
  is_trending: boolean;
  trend_score: number;
  last_engagement_at?: string;
  created_at?: string;
}

// User Preferences Functions
export async function getUserPreferences(tenantId: string, userId: string): Promise<UserPreference | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = supabase.from('user_preferences' as any) as any;
    const { data, error } = await query
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user preferences:', error);
      return null;
    }

    return data as UserPreference;
  } catch (err) {
    console.error('Error fetching user preferences:', err);
    return null;
  }
}

export async function updateUserPreferences(
  tenantId: string,
  userId: string,
  updates: Partial<UserPreference>
): Promise<UserPreference | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = supabase.from('user_preferences' as any) as any;
    const { data, error } = await query
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user preferences:', error);
      return null;
    }

    return data as UserPreference;
  } catch (err) {
    console.error('Error updating user preferences:', err);
    return null;
  }
}

export async function createUserPreferences(
  tenantId: string,
  userId: string,
  preferences: Omit<UserPreference, 'id' | 'created_at' | 'updated_at' | 'tenant_id' | 'user_id'>
): Promise<UserPreference | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = supabase.from('user_preferences' as any) as any;
    const { data, error } = await query
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        ...preferences,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user preferences:', error);
      return null;
    }

    return data as UserPreference;
  } catch (err) {
    console.error('Error creating user preferences:', err);
    return null;
  }
}

// Saved Items Functions
export async function getSavedItems(
  tenantId: string,
  userId: string,
  itemType?: string
): Promise<SavedItem[] | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('saved_items' as any) as any)
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId);

    if (itemType) {
      query = query.eq('item_type', itemType);
    }

    const { data, error } = await query.order('saved_at', { ascending: false });

    if (error) {
      console.error('Error fetching saved items:', error);
      return null;
    }

    return (data as SavedItem[]) || [];
  } catch (err) {
    console.error('Error fetching saved items:', err);
    return null;
  }
}

export async function saveItem(
  tenantId: string,
  userId: string,
  itemType: string,
  itemId: string,
  itemTitle?: string
): Promise<SavedItem | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = supabase.from('saved_items' as any) as any;
    const { data, error } = await query
      .upsert(
        {
          item_type: itemType,
          item_id: itemId,
          item_title: itemTitle,
        },
        { onConflict: 'tenant_id, user_id, item_type, item_id' }
      )
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error saving item:', error);
      return null;
    }

    return data as SavedItem;
  } catch (err) {
    console.error('Error saving item:', err);
    return null;
  }
}

export async function removeSavedItem(
  tenantId: string,
  userId: string,
  itemType: string,
  itemId: string
): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = supabase.from('saved_items' as any) as any;
    const { error } = await query
      .delete()
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .eq('item_type', itemType)
      .eq('item_id', itemId);

    if (error) {
      console.error('Error removing saved item:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error removing saved item:', err);
    return false;
  }
}

// Personalization Events Functions
export async function trackPersonalizationEvent(
  tenantId: string,
  userId: string,
  eventType: string,
  itemType?: string,
  itemId?: string,
  itemTitle?: string
): Promise<PersonalizationEvent | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = supabase.from('personalization_events' as any) as any;
    const { data, error } = await query
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        event_type: eventType,
        item_type: itemType,
        item_id: itemId,
        item_title: itemTitle,
      })
      .select()
      .single();

    if (error) {
      console.error('Error tracking personalization event:', error);
      return null;
    }

    return data as PersonalizationEvent;
  } catch (err) {
    console.error('Error tracking personalization event:', err);
    return null;
  }
}

export async function getPersonalizationEvents(
  tenantId: string,
  userId: string,
  eventType?: string,
  limit: number = 100
): Promise<PersonalizationEvent[] | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('personalization_events' as any) as any)
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId);

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching personalization events:', error);
      return null;
    }

    return (data as PersonalizationEvent[]) || [];
  } catch (err) {
    console.error('Error fetching personalization events:', err);
    return null;
  }
}

// Recommendation Functions
export async function getRecommendations(
  tenantId: string,
  userId: string,
  limit: number = 20
): Promise<RecommendationItem[] | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = supabase.from('recommendation_history' as any) as any;
    const { data, error } = await query
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recommendations:', error);
      return null;
    }

    return (data as RecommendationItem[]) || [];
  } catch (err) {
    console.error('Error fetching recommendations:', err);
    return null;
  }
}

export async function trackRecommendationClick(
  tenantId: string,
  userId: string,
  recommendationId: string
): Promise<RecommendationItem | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = supabase.from('recommendation_history' as any) as any;
    const { data, error } = await query
      .update({
        was_clicked: true,
        interaction_timestamp: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .eq('recommendation_id', recommendationId)
      .select()
      .single();

    if (error) {
      console.error('Error tracking recommendation click:', error);
      return null;
    }

    return data as RecommendationItem;
  } catch (err) {
    console.error('Error tracking recommendation click:', err);
    return null;
  }
}

// Interest Profile Functions
export async function getInterestProfiles(
  tenantId: string,
  userId: string,
  limit: number = 50
): Promise<InterestProfile[] | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = supabase.from('interest_profiles' as any) as any;
    const { data, error } = await query
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .order('interest_weight', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching interest profiles:', error);
      return null;
    }

    return (data as InterestProfile[]) || [];
  } catch (err) {
    console.error('Error fetching interest profiles:', err);
    return null;
  }
}

export async function updateInterestProfile(
  tenantId: string,
  userId: string,
  category: string,
  weight: number,
  activity: number = 0
): Promise<InterestProfile | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = supabase.from('interest_profiles' as any) as any;
    const { data, error } = await query
      .upsert(
        {
          interest_category: category,
          interest_weight: weight,
          interest_activity: activity,
          last_engagement_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id, user_id, interest_category' }
      )
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating interest profile:', error);
      return null;
    }

    return data as InterestProfile;
  } catch (err) {
    console.error('Error updating interest profile:', err);
    return null;
  }
}

// Content Preferences Functions
export async function getContentPreferences(
  tenantId: string,
  userId: string,
  limit: number = 50
): Promise<Record<string, unknown>[] | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = supabase.from('content_preferences' as any) as any;
    const { data, error } = await query
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .order('engagement_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching content preferences:', error);
      return null;
    }

    return (data as Record<string, unknown>[]) || [];
  } catch (err) {
    console.error('Error fetching content preferences:', err);
    return null;
  }
}

export async function updateContentPreference(
  tenantId: string,
  userId: string,
  category: string,
  preferenceLevel: string,
  frequencyPreference?: string
): Promise<Record<string, unknown> | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = supabase.from('content_preferences' as any) as any;
    const { data, error } = await query
      .upsert({
        content_category: category,
        preference_level: preferenceLevel,
        frequency_preference: frequencyPreference,
        last_engaged_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id, user_id, content_category' })
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating content preference:', error);
      return null;
    }

    return data as Record<string, unknown>;
  } catch (err) {
    console.error('Error updating content preference:', err);
    return null;
  }
}

// Analytics Functions
export async function getPersonalizationStats(
  tenantId: string,
  userId: string
): Promise<Record<string, unknown> | null> {
  try {
    // Get event counts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eventsQuery = (supabase.from('personalization_events' as any) as any)
      .select('event_type', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('user_id', userId);

    const { count: eventCount } = await eventsQuery;

    // Get saved items count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const savedQuery = (supabase.from('saved_items' as any) as any)
      .select('id', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('user_id', userId);

    const { count: savedCount } = await savedQuery;

    // Get interests count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interestsQuery = (supabase.from('interest_profiles' as any) as any)
      .select('id', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('user_id', userId);

    const { count: interestsCount } = await interestsQuery;

    return {
      total_events: eventCount || 0,
      total_saved_items: savedCount || 0,
      total_interests: interestsCount || 0,
    };
  } catch (err) {
    console.error('Error getting personalization stats:', err);
    return null;
  }
}

export async function getTenantPersonalizationStats(
  tenantId: string
): Promise<Record<string, unknown> | null> {
  try {
    // Get total users with preferences
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const usersQuery = (supabase.from('user_preferences' as any) as any)
      .select('user_id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    const { count: totalUsers } = await usersQuery;

    // Get language distribution
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const langQuery = (supabase.from('user_preferences' as any) as any)
      .select('preferred_language')
      .eq('tenant_id', tenantId);

    const { data: langData } = await langQuery;
    const languageDistribution = (langData as Array<Record<string, unknown>>)
      ?.reduce((acc: Record<string, number>, row) => {
        const lang = (row.preferred_language as string) || 'unknown';
        acc[lang] = (acc[lang] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

    // Get theme distribution
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const themeQuery = (supabase.from('user_preferences' as any) as any)
      .select('preferred_theme')
      .eq('tenant_id', tenantId);

    const { data: themeData } = await themeQuery;
    const themeDistribution = (themeData as Array<Record<string, unknown>>)
      ?.reduce((acc: Record<string, number>, row) => {
        const theme = (row.preferred_theme as string) || 'unknown';
        acc[theme] = (acc[theme] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

    // Get interest profiles count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profilesQuery = (supabase.from('interest_profiles' as any) as any)
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    const { count: totalProfiles } = await profilesQuery;

    // Get content preferences count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contentQuery = (supabase.from('content_preferences' as any) as any)
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    const { count: totalContentPrefs } = await contentQuery;

    // Get recommendation stats
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recQuery = (supabase.from('recommendation_history' as any) as any)
      .select('id, clicked, completed')
      .eq('tenant_id', tenantId);

    const { data: recData, count: totalRecs } = await recQuery;
    const recommendations = (recData as Array<Record<string, unknown>>) || [];
    const clicks = recommendations.filter((r) => r.clicked).length;
    const completions = recommendations.filter((r) => r.completed).length;
    const ctr = totalRecs ? clicks / totalRecs : 0;
    const completionRate = totalRecs ? completions / totalRecs : 0;

    return {
      total_users: totalUsers || 0,
      languages: languageDistribution,
      themes: themeDistribution,
      total_profiles: totalProfiles || 0,
      total_content_prefs: totalContentPrefs || 0,
      total_recommendations: totalRecs || 0,
      ctr: ctr,
      completion_rate: completionRate,
      avg_confidence: 0.75, // Placeholder
      notifications: { enabled: totalUsers || 0, disabled: 0 },
      privacy: { public: totalUsers || 0, private: 0 },
      top_interests: [],
      trending: [],
      top_content: [],
      genres: {},
      top_recommended: [],
    };
  } catch (err) {
    console.error('Error getting tenant personalization stats:', err);
    return null;
  }
}
