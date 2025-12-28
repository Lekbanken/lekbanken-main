import { createHmac } from 'crypto';
import type { 
  WebhookConfig, 
  WebhookEventType, 
  WebhookPayload,
  WebhookDeliveryResult 
} from '@/types/public-api';

/**
 * Webhook delivery service for sending events to external systems
 */

/**
 * Sign a webhook payload using HMAC-SHA256
 */
export function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Verify a webhook signature
 */
export function verifySignature(
  payload: string, 
  signature: string, 
  secret: string
): boolean {
  const expected = signPayload(payload, secret);
  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expected.length) return false;
  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Build a webhook payload
 */
export function buildWebhookPayload<T>(
  event: WebhookEventType,
  data: T,
  tenantId: string
): WebhookPayload<T> {
  return {
    id: crypto.randomUUID(),
    event,
    timestamp: new Date().toISOString(),
    tenant_id: tenantId,
    data,
  };
}

/**
 * Deliver a webhook to a configured endpoint
 */
export async function deliverWebhook<T>(
  config: WebhookConfig,
  event: WebhookEventType,
  data: T,
  tenantId: string
): Promise<WebhookDeliveryResult> {
  // Check if this event type is subscribed
  if (!config.events.includes(event)) {
    return {
      success: true,
      skipped: true,
      reason: 'Event not subscribed',
    };
  }

  const payload = buildWebhookPayload(event, data, tenantId);
  const payloadString = JSON.stringify(payload);
  const signature = signPayload(payloadString, config.secret);

  const startTime = Date.now();
  let attempt = 0;
  let lastError: Error | null = null;

  // Retry logic
  const maxRetries = config.retry_count ?? 3;
  while (attempt <= maxRetries) {
    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event,
          'X-Webhook-Id': payload.id,
          'X-Webhook-Timestamp': payload.timestamp,
          ...(config.headers || {}),
        },
        body: payloadString,
        signal: AbortSignal.timeout(config.timeout_seconds ? config.timeout_seconds * 1000 : 30000),
      });

      const duration = Date.now() - startTime;

      if (response.ok) {
        return {
          success: true,
          status_code: response.status,
          duration_ms: duration,
          attempts: attempt + 1,
          webhook_id: payload.id,
        };
      }

      // Non-retryable status codes
      if (response.status >= 400 && response.status < 500) {
        return {
          success: false,
          status_code: response.status,
          duration_ms: duration,
          attempts: attempt + 1,
          error: `HTTP ${response.status}: ${response.statusText}`,
          webhook_id: payload.id,
        };
      }

      // Retryable error
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    attempt++;
    if (attempt <= maxRetries) {
      // Exponential backoff: 1s, 2s, 4s, 8s...
      await new Promise((resolve) => 
        setTimeout(resolve, Math.pow(2, attempt - 1) * 1000)
      );
    }
  }

  return {
    success: false,
    duration_ms: Date.now() - startTime,
    attempts: attempt,
    error: lastError?.message || 'Unknown error',
    webhook_id: payload.id,
  };
}

/**
 * Queue a webhook for async delivery (placeholder for actual queue implementation)
 */
export async function queueWebhook<T>(
  config: WebhookConfig,
  event: WebhookEventType,
  data: T,
  tenantId: string
): Promise<{ queued: boolean; id: string }> {
  // In production, this would queue to a proper job queue (e.g., Bull, Inngest, etc.)
  // For now, we'll just deliver synchronously with a fire-and-forget pattern
  const id = crypto.randomUUID();
  
  // Fire and forget - don't await
  deliverWebhook(config, event, data, tenantId).catch((error) => {
    console.error(`[Webhook ${id}] Delivery failed:`, error);
  });

  return { queued: true, id };
}

/**
 * Get webhook configs for a tenant from database
 */
export async function getTenantWebhookConfigs(
  tenantId: string,
  supabase: ReturnType<typeof import('@/lib/supabase/server').createServiceRoleClient>
): Promise<WebhookConfig[]> {
  // This would query a webhooks table - placeholder implementation
  const { data } = await supabase
    .from('tenant_webhooks' as 'games') // Type hack - table doesn't exist yet
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  if (!data) return [];

  return data.map((row) => ({
    id: (row as Record<string, unknown>).id as string,
    url: (row as Record<string, unknown>).url as string,
    secret: (row as Record<string, unknown>).secret as string,
    events: (row as Record<string, unknown>).events as WebhookEventType[],
    is_active: true,
    headers: (row as Record<string, unknown>).headers as Record<string, string> | undefined,
    retry_count: (row as Record<string, unknown>).retry_count as number | undefined,
    timeout_seconds: (row as Record<string, unknown>).timeout_seconds as number | undefined,
    created_at: (row as Record<string, unknown>).created_at as string,
    updated_at: (row as Record<string, unknown>).updated_at as string,
  }));
}

/**
 * Broadcast an event to all webhooks for a tenant
 */
export async function broadcastEvent<T>(
  event: WebhookEventType,
  data: T,
  tenantId: string,
  supabase: ReturnType<typeof import('@/lib/supabase/server').createServiceRoleClient>
): Promise<{ delivered: number; failed: number; skipped: number }> {
  const configs = await getTenantWebhookConfigs(tenantId, supabase);
  
  const results = await Promise.allSettled(
    configs.map((config) => deliverWebhook(config, event, data, tenantId))
  );

  let delivered = 0;
  let failed = 0;
  let skipped = 0;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      if (result.value.skipped) {
        skipped++;
      } else if (result.value.success) {
        delivered++;
      } else {
        failed++;
      }
    } else {
      failed++;
    }
  }

  return { delivered, failed, skipped };
}
