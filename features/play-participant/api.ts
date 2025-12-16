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
  gameId?: string | null;
  planId?: string | null;
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

export async function updateSessionStatus(id: string, action: 'start' | 'pause' | 'resume' | 'end') {
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
  const res = await fetch('/api/play/rejoin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
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
