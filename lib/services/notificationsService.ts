import { supabaseAdmin } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

// Types - Use Supabase generated types
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];

export type NotificationPreference = Database['public']['Tables']['notification_preferences']['Row'];
export type NotificationPreferenceInsert = Database['public']['Tables']['notification_preferences']['Insert'];

// Send Notifications
export async function sendNotification(params: {
  tenantId: string;
  userId?: string;
  title: string;
  message: string;
  type?: string;
  category?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  actionUrl?: string;
  actionLabel?: string;
  expiresAt?: Date;
}): Promise<Notification | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        tenant_id: params.tenantId,
        user_id: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || 'info',
        category: params.category,
        related_entity_id: params.relatedEntityId,
        related_entity_type: params.relatedEntityType,
        action_url: params.actionUrl,
        action_label: params.actionLabel,
        expires_at: params.expiresAt?.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending notification:', error);
      return null;
    }

    // Log notification delivery
    if (data && params.userId) {
      await logNotificationDelivery(data.id, params.userId, 'in_app');
    }

    return data;
  } catch (err) {
    console.error('Error sending notification:', err);
    return null;
  }
}

export async function sendBulkNotifications(params: {
  tenantId: string;
  userIds: string[];
  title: string;
  message: string;
  type?: string;
  category?: string;
}): Promise<Notification[] | null> {
  try {
    const notifications = params.userIds.map((userId) => ({
      tenant_id: params.tenantId,
      user_id: userId,
      title: params.title,
      message: params.message,
      type: params.type || 'info',
      category: params.category,
    }));

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) {
      console.error('Error sending bulk notifications:', error);
      return null;
    }

    return data || [];
  } catch (err) {
    console.error('Error sending bulk notifications:', err);
    return null;
  }
}

// Get Notifications
export async function getNotifications(
  userId: string,
  limit = 50,
  offset = 0
): Promise<Notification[] | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching notifications:', error);
      return null;
    }

    return data || [];
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return null;
  }
}

export async function getUnreadNotificationCount(userId: string): Promise<number | null> {
  try {
    const { count, error } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error fetching unread count:', error);
      return null;
    }

    return count || 0;
  } catch (err) {
    console.error('Error fetching unread count:', err);
    return null;
  }
}

export async function getNotificationsByCategory(
  userId: string,
  category: string,
  limit = 50,
  offset = 0
): Promise<Notification[] | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('category', category)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching notifications by category:', error);
      return null;
    }

    return data || [];
  } catch (err) {
    console.error('Error fetching notifications by category:', err);
    return null;
  }
}

// Mark Notifications
export async function markNotificationAsRead(notificationId: string): Promise<Notification | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) {
      console.error('Error marking notification as read:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error marking notification as read:', err);
    return null;
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    return false;
  }
}

// Delete Notifications
export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error deleting notification:', err);
    return false;
  }
}

export async function deleteNotificationsByCategory(userId: string, category: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .eq('category', category);

    if (error) {
      console.error('Error deleting notifications by category:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error deleting notifications by category:', err);
    return false;
  }
}

export async function deleteAllReadNotifications(userId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .eq('is_read', true);

    if (error) {
      console.error('Error deleting read notifications:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error deleting read notifications:', err);
    return false;
  }
}

// Notification Preferences
export async function getNotificationPreferences(userId: string): Promise<NotificationPreference | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching notification preferences:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error fetching notification preferences:', err);
    return null;
  }
}

export async function createNotificationPreferences(
  userId: string,
  tenantId?: string,
  preferences?: Partial<NotificationPreference>
): Promise<NotificationPreference | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('notification_preferences')
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        ...preferences,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification preferences:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error creating notification preferences:', err);
    return null;
  }
}

export async function updateNotificationPreferences(
  userId: string,
  updates: Partial<NotificationPreference>
): Promise<NotificationPreference | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('notification_preferences')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating notification preferences:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error updating notification preferences:', err);
    return null;
  }
}

// Notification Logging
export async function logNotificationDelivery(
  notificationId: string,
  userId: string,
  deliveryMethod: string,
  status = 'sent',
  errorMessage?: string
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('notification_log')
      .insert({
        notification_id: notificationId,
        user_id: userId,
        delivery_method: deliveryMethod,
        status,
        sent_at: new Date().toISOString(),
        error_message: errorMessage,
      });

    if (error) {
      console.error('Error logging notification delivery:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error logging notification delivery:', err);
    return false;
  }
}

// Notification Stats
export async function getNotificationStats(userId: string): Promise<
  {
    total: number;
    unread: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
  } | null
> {
  try {
    const { data: notifications, error } = await supabaseAdmin
      .from('notifications')
      .select('type, category, is_read')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching notification stats:', error);
      return null;
    }

    const stats = {
      total: (notifications || []).length,
      unread: (notifications || []).filter((n) => !n.is_read).length,
      byType: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
    };

    (notifications || []).forEach((n) => {
      stats.byType[n.type] = (stats.byType[n.type] || 0) + 1;
      if (n.category) {
        stats.byCategory[n.category] = (stats.byCategory[n.category] || 0) + 1;
      }
    });

    return stats;
  } catch (err) {
    console.error('Error fetching notification stats:', err);
    return null;
  }
}

// Clean up expired notifications
export async function deleteExpiredNotifications(): Promise<number | null> {
  try {
    const { data: deletedRows, error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      console.error('Error deleting expired notifications:', error);
      return null;
    }

    return (deletedRows || []).length;
  } catch (err) {
    console.error('Error deleting expired notifications:', err);
    return null;
  }
}
