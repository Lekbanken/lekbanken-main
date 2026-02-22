/**
 * Play Primitives API Client (participant)
 *
 * Client-side helpers for artifacts + decisions/voting.
 */

import {
  validateParticipantPayload,
  ParticipantArtifactsResponseSchema,
  ParticipantDecisionsResponseSchema,
} from '@/features/play/contracts/participantCockpit.schema';
import { trackRequest } from '@/features/play/contracts/requestRateMonitor';

/** Keypad state returned from server (correctCode is NEVER included) */
export interface KeypadState {
  isUnlocked: boolean;
  isLockedOut: boolean;
  attemptCount: number;
  unlockedAt?: string | null;
}

/** Sanitized keypad metadata for participants (correctCode stripped) */
export interface SanitizedKeypadMetadata {
  codeLength: number;
  maxAttempts: number | null;
  successMessage: string | null;
  failMessage: string | null;
  lockedMessage: string | null;
  keypadState: KeypadState;
}

export interface ParticipantSessionArtifact {
  id: string;
  title?: string | null;
  description?: string | null;
  artifact_type?: string | null;
  artifact_order?: number | null;
  /** Sanitized metadata - correctCode is NEVER included for participants */
  metadata?: SanitizedKeypadMetadata | Record<string, unknown> | null;
}

export type ArtifactVisibility = 'public' | 'leader_only' | 'role_private';

export interface ParticipantSessionArtifactVariant {
  id: string;
  session_artifact_id: string;
  title?: string | null;
  body?: string | null;
  media_ref?: unknown;
  variant_order?: number | null;
  metadata?: unknown;
  visibility?: ArtifactVisibility | null;
  visible_to_session_role_id?: string | null;
  revealed_at?: string | null;
  highlighted_at?: string | null;
  /** v1.1: canonical "used" timestamp. Optional until DB migration lands. */
  used_at?: string | null;
}

export interface ParticipantArtifactsResponse {
  artifacts: ParticipantSessionArtifact[];
  variants: ParticipantSessionArtifactVariant[];
}

export interface DecisionOption {
  key: string;
  label: string;
}

export type DecisionStatus = 'draft' | 'open' | 'closed' | 'revealed';

export interface ParticipantDecision {
  id: string;
  title: string;
  prompt?: string | null;
  decision_type?: string | null;
  options?: DecisionOption[] | null;
  status: DecisionStatus;
  allow_anonymous?: boolean | null;
  max_choices?: number | null;
  opened_at?: string | null;
  closed_at?: string | null;
  revealed_at?: string | null;
}

export interface ParticipantDecisionsResponse {
  decisions: ParticipantDecision[];
}

export interface DecisionResultRow {
  key?: string;
  label?: string;
  count: number;
}

export interface DecisionResultsResponse {
  decision: {
    id: string;
    title: string;
    status: DecisionStatus;
    revealed_at?: string | null;
  };
  results: DecisionResultRow[];
}

function requireToken(participantToken?: string) {
  if (!participantToken) {
    throw new Error('Missing participant token');
  }
  return participantToken;
}

export async function getParticipantArtifacts(
  sessionId: string,
  options: { participantToken?: string }
): Promise<ParticipantArtifactsResponse> {
  const token = requireToken(options.participantToken);
  const url = `/api/play/sessions/${sessionId}/artifacts`;
  trackRequest(url);
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'x-participant-token': token },
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = typeof err?.error === 'string' ? err.error : `Artifacts fetch failed: ${res.status}`;
    throw new Error(msg);
  }

  const data = (await res.json()) as Partial<ParticipantArtifactsResponse>;

  // Dev-only contract validation
  validateParticipantPayload(
    ParticipantArtifactsResponseSchema,
    data,
    'getParticipantArtifacts',
  );

  return {
    artifacts: data.artifacts ?? [],
    variants: data.variants ?? [],
  };
}

export async function getParticipantDecisions(
  sessionId: string,
  options: { participantToken?: string }
): Promise<ParticipantDecision[]> {
  const token = requireToken(options.participantToken);
  const url = `/api/play/sessions/${sessionId}/decisions`;
  trackRequest(url);
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'x-participant-token': token },
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = typeof err?.error === 'string' ? err.error : `Decisions fetch failed: ${res.status}`;
    throw new Error(msg);
  }

  const data = (await res.json()) as Partial<ParticipantDecisionsResponse>;

  // Dev-only contract validation
  validateParticipantPayload(
    ParticipantDecisionsResponseSchema,
    { decisions: data.decisions ?? [] },
    'getParticipantDecisions',
  );

  return data.decisions ?? [];
}

export async function castParticipantVote(
  sessionId: string,
  decisionId: string,
  payload: { optionKey: string },
  options: { participantToken?: string }
): Promise<void> {
  const token = requireToken(options.participantToken);
  const res = await fetch(`/api/play/sessions/${sessionId}/decisions/${decisionId}/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-participant-token': token,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = typeof err?.error === 'string' ? err.error : `Vote failed: ${res.status}`;
    throw new Error(msg);
  }
}

export async function getParticipantDecisionResults(
  sessionId: string,
  decisionId: string,
  options: { participantToken?: string }
): Promise<DecisionResultsResponse> {
  const token = requireToken(options.participantToken);
  const res = await fetch(`/api/play/sessions/${sessionId}/decisions/${decisionId}/results`, {
    method: 'GET',
    headers: { 'x-participant-token': token },
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = typeof err?.error === 'string' ? err.error : `Results fetch failed: ${res.status}`;
    throw new Error(msg);
  }

  return (await res.json()) as DecisionResultsResponse;
}

// =============================================================================
// Keypad API (server-side validation - correctCode never exposed)
// =============================================================================

export interface KeypadAttemptResponse {
  status: 'success' | 'fail' | 'locked' | 'already_unlocked';
  message: string;
  attemptsLeft?: number;
  revealVariantIds?: string[];
  keypadState: KeypadState;
}

export async function submitKeypadCode(
  sessionId: string,
  artifactId: string,
  enteredCode: string,
  options: { participantToken?: string }
): Promise<KeypadAttemptResponse> {
  const token = requireToken(options.participantToken);
  const res = await fetch(`/api/play/sessions/${sessionId}/artifacts/${artifactId}/keypad`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-participant-token': token,
    },
    body: JSON.stringify({ enteredCode }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = typeof err?.error === 'string' ? err.error : `Keypad validation failed: ${res.status}`;
    throw new Error(msg);
  }

  return (await res.json()) as KeypadAttemptResponse;
}
