import type { Database } from '@/types/supabase';

type SessionStatus = Database['public']['Enums']['participant_session_status'];
type ParticipantRole = Database['public']['Enums']['participant_role'];

export interface PlaySession {
  id: string;
  sessionCode: string;
  displayName: string;
  status: SessionStatus;
  participantCount?: number;
  createdAt?: string;
  updatedAt?: string;
  startedAt?: string | null;
  pausedAt?: string | null;
  endedAt?: string | null;
  gameId?: string | null;
  planId?: string | null;
  settings?: Record<string, unknown> | null;
}

export interface Participant {
  id: string;
  displayName: string;
  role: ParticipantRole;
  status: Database['public']['Enums']['participant_status'];
  joinedAt?: string;
  lastSeenAt?: string;
}

async function parseJson(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export async function createSession(payload: {
  displayName: string;
  description?: string;
  gameId?: string;
  planId?: string;
}) {
  const res = await fetch('/api/play/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function listHostSessions(): Promise<{ sessions: PlaySession[] }> {
  const res = await fetch('/api/play/sessions', { cache: 'no-store' });
  return parseJson(res);
}

export async function getHostSession(id: string): Promise<{ session: PlaySession }> {
  const res = await fetch(`/api/play/sessions/${id}`, { cache: 'no-store' });
  return parseJson(res);
}

export async function updateSessionStatus(id: string, action: 'start' | 'pause' | 'resume' | 'end' | 'lock' | 'unlock') {
  const res = await fetch(`/api/play/sessions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  return parseJson(res);
}

export async function getParticipants(id: string): Promise<{ participants: Participant[] }> {
  const res = await fetch(`/api/play/sessions/${id}/participants`, { cache: 'no-store' });
  return parseJson(res);
}

export async function joinSession(payload: { sessionCode: string; displayName: string }) {
  const res = await fetch('/api/play/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function rejoinSession(payload: { sessionCode: string; participantToken: string }) {
  // Underlying endpoint expects { participantToken, sessionId }
  // (sessionId is not always available in callers), so we resolve it via the
  // public session lookup endpoint when needed.
  const session = await getPublicSession(payload.sessionCode);
  const sessionId: string | undefined = session?.session?.id;
  if (!sessionId) {
    throw new Error('Session not found');
  }

  const res = await fetch('/api/play/rejoin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participantToken: payload.participantToken, sessionId }),
  });
  return parseJson(res);
}

export async function getParticipantMe(sessionCode: string, token: string) {
  const res = await fetch(`/api/play/me?session_code=${encodeURIComponent(sessionCode)}`, {
    headers: { 'x-participant-token': token },
    cache: 'no-store',
  });
  return parseJson(res);
}

export async function heartbeat(sessionCode: string, token: string) {
  const res = await fetch(`/api/play/heartbeat?session_code=${encodeURIComponent(sessionCode)}`, {
    method: 'POST',
    headers: { 'x-participant-token': token },
  });
  return res.ok;
}

export async function getPublicSession(code: string) {
  const res = await fetch(`/api/play/session/${code}`, { cache: 'no-store' });
  return parseJson(res);
}

// Participant action functions for hosts
export async function kickParticipant(sessionId: string, participantId: string) {
  const res = await fetch(`/api/play/sessions/${sessionId}/participants/${participantId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'kick' }),
  });
  return parseJson(res);
}

export async function blockParticipant(sessionId: string, participantId: string) {
  const res = await fetch(`/api/play/sessions/${sessionId}/participants/${participantId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'block' }),
  });
  return parseJson(res);
}

export async function approveParticipant(sessionId: string, participantId: string) {
  const res = await fetch(`/api/play/sessions/${sessionId}/participants/${participantId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'approve' }),
  });
  return parseJson(res);
}

export async function setNextStarter(sessionId: string, participantId: string) {
  const res = await fetch(`/api/play/sessions/${sessionId}/participants/${participantId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'setNextStarter' }),
  });
  return parseJson(res);
}

export async function setParticipantPosition(sessionId: string, participantId: string, position: number) {
  const res = await fetch(`/api/play/sessions/${sessionId}/participants/${participantId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'setPosition', position }),
  });
  return parseJson(res);
}
