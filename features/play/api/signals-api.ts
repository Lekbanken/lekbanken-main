export type SessionSignalRow = {
  id: string;
  session_id: string;
  channel: string;
  payload: unknown;
  sender_user_id: string | null;
  sender_participant_id: string | null;
  created_at: string;
};

export type GetSessionSignalsResponse = {
  success: boolean;
  signals: SessionSignalRow[];
};

export async function getSessionSignals(sessionId: string): Promise<GetSessionSignalsResponse> {
  const res = await fetch(`/api/play/sessions/${sessionId}/signals`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = typeof err?.error === 'string' ? err.error : `Signal load failed: ${res.status}`;
    throw new Error(msg);
  }

  return (await res.json()) as GetSessionSignalsResponse;
}

export async function sendSessionSignal(
  sessionId: string,
  payload: { channel: string; message?: string; payload?: unknown },
  options?: { participantToken?: string }
): Promise<SessionSignalRow> {
  const res = await fetch(`/api/play/sessions/${sessionId}/signals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.participantToken ? { 'x-participant-token': options.participantToken } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = typeof err?.error === 'string' ? err.error : `Signal send failed: ${res.status}`;
    throw new Error(msg);
  }

  const data = (await res.json()) as { signal?: SessionSignalRow };
  if (!data.signal) throw new Error('Signal send failed: missing response');
  return data.signal;
}
