'use client';

import { useCallback, useEffect, useState } from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { getSessionTimeBank } from '@/features/play/api/time-bank-api';
import { useLiveSession } from '@/features/play/hooks/useLiveSession';

type ParticipantTimeBankDisplayProps = {
  sessionId: string;
  /** If false, component renders nothing. Useful for conditional feature gating. */
  enabled?: boolean;
};

function formatSeconds(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Participant-facing Time Bank widget.
 * Shows the current balance and updates via realtime.
 * Read-only (participants cannot adjust the balance).
 */
export function ParticipantTimeBankDisplay({
  sessionId,
  enabled = true,
}: ParticipantTimeBankDisplayProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balanceSeconds, setBalanceSeconds] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSessionTimeBank(sessionId);
      setBalanceSeconds(res.timeBank.balanceSeconds ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte ladda tidsbank');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [load, enabled]);

  // Realtime updates
  useLiveSession({
    sessionId,
    enabled,
    onTimeBankChanged: (payload) => {
      if (payload.sessionId !== sessionId) return;
      // Refresh from server for accurate balance
      void load();
    },
  });

  if (!enabled) return null;

  // If never loaded or has no balance info, hide
  if (balanceSeconds === null && !loading && !error) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <ClockIcon className="h-4 w-4 text-muted-foreground" />
      <span className="text-muted-foreground">Tidsbank:</span>
      {loading && balanceSeconds === null ? (
        <span className="text-muted-foreground">…</span>
      ) : error ? (
        <Badge variant="destructive" size="sm">
          Fel
        </Badge>
      ) : (
        <Badge variant="secondary" size="sm">
          {formatSeconds(balanceSeconds ?? 0)}
        </Badge>
      )}
    </div>
  );
}
