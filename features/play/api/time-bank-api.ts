export type TimeBankApplyDeltaResponse = {
  success: boolean;
  // Function returns jsonb; keep it flexible.
  result: unknown;
};

export type TimeBankLedgerRow = {
  id: string;
  session_id: string;
  delta_seconds: number;
  reason: string;
  metadata: Record<string, unknown> | null;
  event_id: string | null;
  actor_user_id: string | null;
  actor_participant_id: string | null;
  created_at: string;
};

export type GetSessionTimeBankResponse = {
  success: boolean;
  timeBank: { balanceSeconds: number; updatedAt: string | null };
  ledger: TimeBankLedgerRow[];
};

export async function getSessionTimeBank(sessionId: string): Promise<GetSessionTimeBankResponse> {
  const res = await fetch(`/api/play/sessions/${sessionId}/time-bank`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = typeof err?.error === 'string' ? err.error : `Time bank load failed: ${res.status}`;
    throw new Error(msg);
  }

  return (await res.json()) as GetSessionTimeBankResponse;
}

export async function applySessionTimeBankDelta(
  sessionId: string,
  payload: {
    deltaSeconds: number;
    reason: string;
    metadata?: Record<string, unknown>;
    minBalanceSeconds?: number;
    maxBalanceSeconds?: number;
  }
): Promise<TimeBankApplyDeltaResponse> {
  const res = await fetch(`/api/play/sessions/${sessionId}/time-bank`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = typeof err?.error === 'string' ? err.error : `Time bank update failed: ${res.status}`;
    throw new Error(msg);
  }

  return (await res.json()) as TimeBankApplyDeltaResponse;
}
