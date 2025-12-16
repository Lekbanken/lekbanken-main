'use client';

const prefix = 'lekbanken.participant';

export type StoredParticipant = {
  token: string;
  participantId: string;
  sessionId: string;
  displayName: string;
};

const keyFor = (sessionCode: string) => `${prefix}.${sessionCode.toUpperCase()}`;

export function saveParticipantAuth(sessionCode: string, data: StoredParticipant) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(keyFor(sessionCode), JSON.stringify(data));
}

export function loadParticipantAuth(sessionCode: string): StoredParticipant | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(keyFor(sessionCode));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredParticipant;
  } catch {
    localStorage.removeItem(keyFor(sessionCode));
    return null;
  }
}

export function clearParticipantAuth(sessionCode: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(keyFor(sessionCode));
}
