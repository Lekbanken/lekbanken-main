/**
 * Public API Types & Webhook Configuration
 * 
 * Types for the read-only public API and webhook system.
 */

// =============================================================================
// Webhook Configuration
// =============================================================================

/** Webhook event types that can trigger notifications */
export type WebhookEventType =
  | 'session.created'
  | 'session.started'
  | 'session.ended'
  | 'participant.joined'
  | 'participant.left'
  | 'trigger.fired'
  | 'decision.created'
  | 'decision.closed'
  | 'artifact.revealed'
  | 'phase.changed'
  | 'step.advanced';

/** Webhook configuration stored in tenant metadata */
export interface WebhookConfig {
  id: string;
  name?: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
  is_active: boolean;
  headers?: Record<string, string>;
  retry_count?: number;
  timeout_seconds?: number;
  created_at: string;
  updated_at?: string;
  last_triggered_at?: string;
  failure_count?: number;
}

/** Result of a webhook delivery attempt */
export interface WebhookDeliveryResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  status_code?: number;
  duration_ms?: number;
  attempts?: number;
  error?: string;
  webhook_id?: string;
}

/** Webhook delivery payload */
export interface WebhookPayload<T = WebhookEventData> {
  id: string;
  event: WebhookEventType;
  timestamp: string;
  tenant_id: string;
  data: T;
}

/** Union of all webhook event data types */
export type WebhookEventData =
  | SessionEventData
  | ParticipantEventData
  | TriggerEventData
  | DecisionEventData
  | ArtifactEventData
  | PhaseEventData
  | StepEventData;

export interface SessionEventData {
  session_id: string;
  game_id: string;
  game_name: string;
  status: 'pending' | 'active' | 'ended';
  participant_count?: number;
}

export interface ParticipantEventData {
  session_id: string;
  participant_id: string;
  participant_name: string;
  role_id?: string;
  role_name?: string;
}

export interface TriggerEventData {
  session_id: string;
  trigger_id: string;
  trigger_name: string;
  actions_executed: string[];
}

export interface DecisionEventData {
  session_id: string;
  decision_id: string;
  decision_title: string;
  decision_type: string;
  status: 'open' | 'closed';
  results?: Record<string, number>;
}

export interface ArtifactEventData {
  session_id: string;
  artifact_id: string;
  artifact_title: string;
  artifact_type: string;
  revealed_to?: string[];
}

export interface PhaseEventData {
  session_id: string;
  phase_id: string;
  phase_name: string;
  phase_index: number;
}

export interface StepEventData {
  session_id: string;
  step_id: string;
  step_title: string;
  step_index: number;
}

// =============================================================================
// Public API Response Types
// =============================================================================

/** Public API game summary (read-only) */
export interface PublicGameSummary {
  id: string;
  name: string;
  description: string | null;
  short_description?: string | null;
  play_mode?: string;
  duration_minutes: number | null;
  min_participants: number | null;
  max_participants: number | null;
  thumbnail_url: string | null;
  status?: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}

/** Public API session summary (read-only) */
export interface PublicSessionSummary {
  id: string;
  game_id: string;
  game_name: string;
  status: 'pending' | 'active' | 'ended';
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  participant_count: number;
  current_phase?: string;
  current_step_index?: number;
}

/** Public API session details (read-only) */
export interface PublicSessionDetails extends Omit<PublicSessionSummary, 'current_phase' | 'current_step_index'> {
  duration_seconds: number | null;
  participants?: {
    id: string;
    team_name: string | null;
    display_name: string | null;
    joined_at: string;
  }[];
  events?: import('@/types/analytics').TimelineEvent[];
  current_phase_name?: string;
  time_bank_balance?: number;
  events_count?: number;
}

/** API key for authentication */
export interface ApiKey {
  id: string;
  tenant_id: string;
  name: string;
  key_prefix: string; // First 8 chars for identification
  key_hash: string; // SHA-256 hash of full key
  scopes: ApiScope[];
  rate_limit: number; // requests per minute
  created_at: string;
  last_used_at?: string;
  expires_at?: string;
  enabled: boolean;
}

/** API access scopes */
export type ApiScope =
  | 'games:read'
  | 'sessions:read'
  | 'sessions:write'
  | 'participants:read'
  | 'analytics:read'
  | 'webhooks:manage';

// =============================================================================
// API Response Wrappers
// =============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  page?: number;
  per_page?: number;
  total?: number;
  total_pages?: number;
}

// =============================================================================
// Webhook Helpers
// =============================================================================

/**
 * Generate webhook signature for payload verification
 */
export function generateWebhookSignature(
  payload: string,
  secret: string
): string {
  // In production, use crypto.createHmac
  // This is a placeholder - actual implementation would use Node crypto
  return `sha256=${secret.slice(0, 8)}_placeholder`;
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = generateWebhookSignature(payload, secret);
  return signature === expected;
}

/**
 * Build webhook payload for an event
 */
export function buildWebhookPayload(
  event: WebhookEventType,
  tenantId: string,
  data: WebhookEventData
): WebhookPayload {
  return {
    id: crypto.randomUUID(),
    event,
    timestamp: new Date().toISOString(),
    tenant_id: tenantId,
    data,
  };
}
