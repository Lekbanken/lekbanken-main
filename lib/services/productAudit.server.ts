/**
 * Product Audit Service
 * 
 * Server-side service for logging product lifecycle events.
 * Used by API routes to track changes for compliance and debugging.
 * 
 * Note: Uses raw SQL queries since the product_audit_log table
 * is not yet in the generated Supabase types.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import type { ProductAuditEventType, ProductAuditEvent } from '@/features/admin/products/v2/types';

export type LogProductEventParams = {
  productId: string;
  eventType: ProductAuditEventType;
  eventData?: Record<string, unknown>;
  actorId?: string;
};

/**
 * Log a product audit event
 */
export async function logProductEvent({
  productId,
  eventType,
  eventData = {},
  actorId,
}: LogProductEventParams): Promise<{ id: string } | null> {
  const client = createServiceRoleClient();

  // Get actor email if actorId provided
  let actorEmail: string | null = null;
  if (actorId) {
    const { data: user } = await client
      .from('users')
      .select('email')
      .eq('id', actorId)
      .single();
    actorEmail = user?.email ?? null;
  }

  // Use raw query since product_audit_log is not in generated types yet
  // The table will be created by migration 20260108160000_product_audit_log.sql
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = client as any;
    const { data, error } = await supabaseAny
      .from('product_audit_log')
      .insert({
        product_id: productId,
        event_type: eventType,
        event_data: eventData,
        actor_id: actorId ?? null,
        actor_email: actorEmail,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[productAudit.server] Failed to log event:', error);
      return null;
    }

    return data ? { id: data.id } : null;
  } catch (err) {
    console.error('[productAudit.server] Exception logging event:', err);
    return null;
  }
}

/**
 * Log multiple field updates as a single event
 */
export async function logFieldUpdates(
  productId: string,
  changes: Record<string, { old: unknown; new: unknown }>,
  actorId?: string
): Promise<void> {
  const eventData = {
    changes,
    fields_changed: Object.keys(changes),
  };

  await logProductEvent({
    productId,
    eventType: 'field_updated',
    eventData,
    actorId,
  });
}

/**
 * Log a status change event
 */
export async function logStatusChange(
  productId: string,
  oldStatus: string,
  newStatus: string,
  actorId?: string
): Promise<void> {
  await logProductEvent({
    productId,
    eventType: 'status_changed',
    eventData: {
      old_status: oldStatus,
      new_status: newStatus,
    },
    actorId,
  });
}

/**
 * Log a Stripe sync event
 */
export async function logStripeSync(
  productId: string,
  stripeProductId: string,
  success: boolean,
  error?: string,
  actorId?: string
): Promise<void> {
  await logProductEvent({
    productId,
    eventType: success ? 'stripe_synced' : 'stripe_sync_failed',
    eventData: {
      stripe_product_id: stripeProductId,
      success,
      error: error ?? null,
    },
    actorId,
  });
}

/**
 * Log a price event
 */
export async function logPriceEvent(
  productId: string,
  eventType: 'price_created' | 'price_updated' | 'price_deleted' | 'default_price_changed',
  priceData: {
    priceId: string;
    amount?: number;
    currency?: string;
    interval?: string;
    stripePriceId?: string | null;
    oldDefault?: string;
    newDefault?: string;
  },
  actorId?: string
): Promise<void> {
  await logProductEvent({
    productId,
    eventType,
    eventData: {
      price_id: priceData.priceId,
      amount: priceData.amount,
      currency: priceData.currency,
      interval: priceData.interval,
      stripe_price_id: priceData.stripePriceId,
      old_default: priceData.oldDefault,
      new_default: priceData.newDefault,
    },
    actorId,
  });
}

/**
 * Get recent audit events for a product
 */
export async function getRecentAuditEvents(
  productId: string,
  limit = 10
): Promise<ProductAuditEvent[]> {
  const client = createServiceRoleClient();

  // Use any cast since product_audit_log is not in generated types yet
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = client as any;
    const { data, error } = await supabaseAny
      .from('product_audit_log')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[productAudit.server] Failed to fetch events:', error);
      return [];
    }

    return (data ?? []).map((row: {
      id: string;
      product_id: string;
      event_type: string;
      event_data: Record<string, unknown> | null;
      actor_id: string | null;
      actor_email: string | null;
      created_at: string;
    }) => ({
      id: row.id,
      product_id: row.product_id,
      event_type: row.event_type as ProductAuditEventType,
      event_data: row.event_data ?? {},
      actor_id: row.actor_id,
      actor_email: row.actor_email,
      created_at: row.created_at,
    }));
  } catch (err) {
    console.error('[productAudit.server] Exception fetching events:', err);
    return [];
  }
}
