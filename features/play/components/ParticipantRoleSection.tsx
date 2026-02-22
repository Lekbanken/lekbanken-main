/**
 * ParticipantRoleSection
 *
 * Role card with secret-instructions reveal flow.
 * Extracted from ParticipantPlayView monolith.
 *
 * Renders inside the overlay drawer slot (non-blocking, user-triggered).
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RoleCard, type RoleCardData } from './RoleCard';
import { sendSessionChatMessage } from '@/features/play/api/chat-api';

// =============================================================================
// Types
// =============================================================================

export interface ParticipantRoleSectionProps {
  role: RoleCardData;
  sessionId: string;
  sessionCode: string;
  participantToken: string;
  /** When the host unlocked secret instructions (null = still locked) */
  secretUnlockedAt: string | null;
  secretUnlockedBy: string | null;
  /** When THIS participant revealed their own secret instructions */
  secretRevealedAt: string | null;
  /** Current step title (for hint-request chat message) */
  currentStepTitle?: string;
  /** Callback when secretRevealedAt changes */
  onSecretRevealed?: (revealedAt: string) => void;
}

// =============================================================================
// Component
// =============================================================================

export function ParticipantRoleSection({
  role,
  sessionId,
  sessionCode,
  participantToken,
  secretUnlockedAt: initialUnlockedAt,
  secretUnlockedBy: initialUnlockedBy,
  secretRevealedAt: initialRevealedAt,
  currentStepTitle,
  onSecretRevealed,
}: ParticipantRoleSectionProps) {
  const t = useTranslations('play.participantView');

  const [secretUnlockedAt, setSecretUnlockedAt] = useState(initialUnlockedAt);
  const [secretUnlockedBy, setSecretUnlockedBy] = useState(initialUnlockedBy);
  const [secretRevealedAt, setSecretRevealedAt] = useState(initialRevealedAt);
  const [secretRevealLoading, setSecretRevealLoading] = useState(false);
  const [secretRevealError, setSecretRevealError] = useState<string | null>(null);
  const [hintRequestSending, setHintRequestSending] = useState(false);
  const [hintRequestError, setHintRequestError] = useState<string | null>(null);

  // Sync from parent when props change (e.g. realtime update)
  useEffect(() => setSecretUnlockedAt(initialUnlockedAt), [initialUnlockedAt]);
  useEffect(() => setSecretUnlockedBy(initialUnlockedBy), [initialUnlockedBy]);
  useEffect(() => setSecretRevealedAt(initialRevealedAt), [initialRevealedAt]);

  const secretsUnlocked = Boolean(secretUnlockedAt);
  const secretsRevealed = Boolean(secretRevealedAt);

  const handleRevealSecretInstructions = useCallback(async () => {
    setSecretRevealLoading(true);
    try {
      const res = await fetch(`/api/play/me/role/reveal?session_code=${sessionCode}`, {
        method: 'POST',
        headers: { 'x-participant-token': participantToken },
      });

      const data = (await res.json().catch(() => ({}))) as {
        secretRevealedAt?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? t('errors.couldNotShowInstructions'));
      }

      const revealedAt = data.secretRevealedAt ?? new Date().toISOString();
      setSecretRevealedAt(revealedAt);
      setSecretRevealError(null);
      onSecretRevealed?.(revealedAt);
    } catch (err) {
      setSecretRevealError(
        err instanceof Error ? err.message : t('errors.couldNotShowInstructions'),
      );
    } finally {
      setSecretRevealLoading(false);
    }
  }, [participantToken, sessionCode, t, onSecretRevealed]);

  const handleRequestHintFromHost = useCallback(async () => {
    setHintRequestSending(true);
    setHintRequestError(null);
    try {
      const msg = currentStepTitle
        ? t('hints.needHintWithStep', { step: currentStepTitle })
        : t('hints.needHint');

      await sendSessionChatMessage(
        sessionId,
        { message: msg, visibility: 'host', anonymous: false },
        { participantToken },
      );
    } catch (err) {
      setHintRequestError(err instanceof Error ? err.message : t('errors.couldNotRequestHint'));
    } finally {
      setHintRequestSending(false);
    }
  }, [participantToken, sessionId, currentStepTitle, t]);

  return (
    <div className="space-y-3">
      {/* Locked state */}
      {!secretsUnlocked && (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">{t('secretsLocked.message')}</p>
        </Card>
      )}

      {/* Unlocked but not yet revealed */}
      {secretsUnlocked && !secretsRevealed && (
        <Card className="p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{t('secrets.title')}</p>
              <p className="text-sm text-muted-foreground">{t('secrets.clickToShow')}</p>
              {secretUnlockedBy && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('secrets.unlockedAt', {
                    time: secretUnlockedAt
                      ? new Date(secretUnlockedAt).toLocaleTimeString()
                      : '',
                  })}
                </p>
              )}
            </div>
            <Button
              onClick={() => void handleRevealSecretInstructions()}
              disabled={secretRevealLoading}
            >
              {secretRevealLoading ? t('secrets.showing') : t('secrets.show')}
            </Button>
          </div>
          {secretRevealError && (
            <div className="mt-2 text-sm text-destructive">{secretRevealError}</div>
          )}
        </Card>
      )}

      {/* Role card */}
      <RoleCard
        role={role}
        variant="full"
        showPrivate={secretsUnlocked && secretsRevealed}
        onRequestHint={
          secretsUnlocked && secretsRevealed && role.private_hints
            ? () => void handleRequestHintFromHost()
            : undefined
        }
        interactive={!hintRequestSending}
      />
      {hintRequestError && <div className="text-sm text-destructive">{hintRequestError}</div>}
    </div>
  );
}
