export interface ChatMessage {
  id: string;
  createdAt: string;
  visibility: 'public' | 'host';
  message: string;
  senderLabel: string;
  isMine: boolean;
  /** For private messages: the participant this message is to/from (for host view) */
  participantId?: string;
}

export async function getSessionChatMessages(
  sessionId: string,
  options?: { since?: string; participantToken?: string }
): Promise<ChatMessage[]> {
  const url = new URL(`/api/play/sessions/${sessionId}/chat`, window.location.origin);
  if (options?.since) url.searchParams.set('since', options.since);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: options?.participantToken
      ? { 'x-participant-token': options.participantToken }
      : undefined,
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Chat fetch failed: ${res.status}`);
  }

  const data = (await res.json()) as { messages?: ChatMessage[] };
  return data.messages ?? [];
}

export async function sendSessionChatMessage(
  sessionId: string,
  payload: { 
    message: string; 
    visibility: 'public' | 'host'; 
    anonymous?: boolean;
    /** For host replying to a specific participant */
    recipientParticipantId?: string;
  },
  options?: { participantToken?: string }
): Promise<void> {
  const res = await fetch(`/api/play/sessions/${sessionId}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.participantToken ? { 'x-participant-token': options.participantToken } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = typeof err?.error === 'string' ? err.error : `Chat send failed: ${res.status}`;
    throw new Error(msg);
  }
}
