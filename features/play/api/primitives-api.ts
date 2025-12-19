/**
 * Play Primitives API Client (participant)
 *
 * Client-side helpers for artifacts + decisions/voting.
 */

export interface ParticipantSessionArtifact {
  id: string;
  title?: string | null;
  artifact_order?: number | null;
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
  const res = await fetch(`/api/play/sessions/${sessionId}/artifacts`, {
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
  const res = await fetch(`/api/play/sessions/${sessionId}/decisions`, {
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
