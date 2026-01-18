'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ConversationCardsCollectionArtifact } from '@/features/play/components/ConversationCardsCollectionArtifact';

/**
 * Sanitized keypad metadata (from server - correctCode is NEVER included)
 */
type KeypadMetadata = {
  codeLength?: number;
  maxAttempts?: number | null;
  successMessage?: string | null;
  failMessage?: string | null;
  lockedMessage?: string | null;
  keypadState?: {
    isUnlocked: boolean;
    isLockedOut: boolean;
    attemptCount: number;
    unlockedAt: string | null;
  };
};

type SessionArtifact = {
  id: string;
  title: string;
  description?: string | null;
  artifact_type?: string | null;
  artifact_order?: number;
  metadata?: Record<string, unknown> | null;
};

type SessionArtifactVariant = {
  id: string;
  session_artifact_id: string;
  title?: string | null;
  body?: string | null;
  visibility: 'public' | 'leader_only' | 'role_private';
  visible_to_session_role_id?: string | null;
  revealed_at?: string | null;
  highlighted_at?: string | null;
};

type KeypadAttemptResponse = {
  status: 'success' | 'fail' | 'locked' | 'already_unlocked';
  message: string;
  attemptsLeft?: number;
  revealVariantIds?: string[];
  keypadState: {
    isUnlocked: boolean;
    isLockedOut: boolean;
    attemptCount: number;
  };
};

export function ArtifactsPanel({ sessionId }: { sessionId: string }) {
  const t = useTranslations('play.artifactsPanel');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<SessionArtifact[]>([]);
  const [variants, setVariants] = useState<SessionArtifactVariant[]>([]);
  
  // Keypad UI state (code entry, submission status)
  const [keypadCodes, setKeypadCodes] = useState<Map<string, string>>(new Map());
  const [keypadSubmitting, setKeypadSubmitting] = useState<Set<string>>(new Set());
  const [keypadMessages, setKeypadMessages] = useState<Map<string, { type: 'success' | 'error'; text: string }>>(new Map());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/artifacts`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('errors.loadFailed'));
      setArtifacts(data.artifacts || []);
      setVariants(data.variants || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [sessionId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const variantsByArtifact = useMemo(() => {
    const map = new Map<string, SessionArtifactVariant[]>();
    for (const v of variants) {
      const list = map.get(v.session_artifact_id) ?? [];
      list.push(v);
      map.set(v.session_artifact_id, list);
    }
    return map;
  }, [variants]);

  const snapshot = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/play/sessions/${sessionId}/artifacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || t('errors.snapshotFailed'));
      return;
    }
    await load();
  }, [sessionId, load, t]);

  const updateVariant = useCallback(
    async (body: unknown) => {
      setError(null);
      const res = await fetch(`/api/play/sessions/${sessionId}/artifacts/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t('errors.updateFailed'));
        return;
      }
      await load();
    },
    [sessionId, load, t]
  );

  /**
   * Submit keypad code to server for validation.
   * Server validates code, updates session state, and returns result.
   * correctCode is NEVER exposed to the client.
   */
  const submitKeypadCode = useCallback(
    async (artifactId: string, enteredCode: string) => {
      if (!enteredCode.trim()) return;

      setKeypadSubmitting((prev) => new Set([...prev, artifactId]));
      setKeypadMessages((prev) => {
        const next = new Map(prev);
        next.delete(artifactId);
        return next;
      });

      try {
        const res = await fetch(`/api/play/sessions/${sessionId}/artifacts/${artifactId}/keypad`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enteredCode }),
        });

        const data: KeypadAttemptResponse = await res.json();

        if (!res.ok) {
          setKeypadMessages((prev) => new Map(prev).set(artifactId, { type: 'error', text: t('errors.serverError') }));
          return;
        }

        // Update local message
        const messageType = data.status === 'success' || data.status === 'already_unlocked' ? 'success' : 'error';
        setKeypadMessages((prev) => new Map(prev).set(artifactId, { type: messageType, text: data.message }));

        // Clear entered code on success or lockout
        if (data.status === 'success' || data.status === 'locked') {
          setKeypadCodes((prev) => {
            const next = new Map(prev);
            next.delete(artifactId);
            return next;
          });
        }

        // Reload artifacts to get updated state
        await load();

      } catch (e) {
        setKeypadMessages((prev) => new Map(prev).set(artifactId, { 
          type: 'error', 
          text: e instanceof Error ? e.message : t('errors.somethingWentWrong') 
        }));
      } finally {
        setKeypadSubmitting((prev) => {
          const next = new Set(prev);
          next.delete(artifactId);
          return next;
        });
      }
    },
    [sessionId, load, t]
  );

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{t('title')}</h2>
            <p className="text-sm text-muted-foreground">{t('description')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={load}>
              {t('actions.update')}
            </Button>
            <Button size="sm" onClick={snapshot}>
              {t('actions.snapshotFromGame')}
            </Button>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      </Card>

      {artifacts.length === 0 ? (
        <Card className="p-6 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-foreground">{t('empty.title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('noArtifactsHint')}
          </p>
          <Button size="sm" onClick={snapshot}>
            {t('empty.description')}
          </Button>
          <p className="text-xs text-muted-foreground">
            {t('noArtifactsButton')}
          </p>
        </Card>
      ) : (
        artifacts.map((a) => {
          const vs = variantsByArtifact.get(a.id) ?? [];

          if (a.artifact_type === 'conversation_cards_collection') {
            return (
              <ConversationCardsCollectionArtifact
                key={a.id}
                sessionId={sessionId}
                participantToken={null}
                artifactTitle={a.title ?? null}
                artifactDescription={a.description ?? null}
                metadata={a.metadata ?? null}
              />
            );
          }

          // Keypad artifact rendering (server-side validation - correctCode never exposed)
          if (a.artifact_type === 'keypad') {
            const meta = (a.metadata || {}) as KeypadMetadata;
            const codeLength = meta.codeLength || 4;
            const maxAttempts = meta.maxAttempts;
            const successMessage = meta.successMessage || t('keypad.successMessage');
            const lockedMessage = meta.lockedMessage || t('keypad.lockedMessage');
            
            // Server-provided state
            const keypadState = meta.keypadState || { isUnlocked: false, isLockedOut: false, attemptCount: 0 };
            const isUnlocked = keypadState.isUnlocked;
            const isLockedOut = keypadState.isLockedOut;
            const attemptsRemaining = maxAttempts ? Math.max(0, maxAttempts - keypadState.attemptCount) : null;

            // Local UI state
            const enteredCode = keypadCodes.get(a.id) || '';
            const isSubmitting = keypadSubmitting.has(a.id);
            const message = keypadMessages.get(a.id);

            return (
              <Card key={a.id} className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{isLockedOut ? '🔒' : isUnlocked ? '🔓' : '🔐'}</span>
                      <h3 className="font-medium">{a.title}</h3>
                    </div>
                    {a.description && <p className="text-sm text-muted-foreground mt-1">{a.description}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={isUnlocked ? 'default' : isLockedOut ? 'destructive' : 'secondary'}>
                      {isUnlocked ? t('keypad.unlocked') : isLockedOut ? t('keypad.lockedOut') : t('keypad.locked')}
                    </Badge>
                    {attemptsRemaining !== null && !isUnlocked && !isLockedOut && (
                      <span className="text-xs text-muted-foreground">
                        {t('keypad.attemptsRemaining', { count: attemptsRemaining })}
                      </span>
                    )}
                  </div>
                </div>

                {isUnlocked ? (
                  <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-center">
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      ✓ {successMessage}
                    </p>
                    {vs.length > 0 && (
                      <div className="mt-3 space-y-2 text-left">
                        {vs.map((v) => (
                          <div key={v.id} className="rounded border border-border p-2 text-sm">
                            <p className="font-medium">{v.title || t('keypad.unlockedContent')}</p>
                            {v.body && <p className="text-muted-foreground">{v.body}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : isLockedOut ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-center">
                    <p className="text-sm font-medium text-destructive">
                      🔒 {lockedMessage}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Code entry - server validates, never exposes correctCode */}
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={codeLength}
                        placeholder={'•'.repeat(codeLength)}
                        value={enteredCode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, codeLength);
                          setKeypadCodes((prev) => new Map(prev).set(a.id, val));
                          // Clear error message when user starts typing
                          if (message?.type === 'error') {
                            setKeypadMessages((prev) => {
                              const next = new Map(prev);
                              next.delete(a.id);
                              return next;
                            });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && enteredCode.length === codeLength && !isSubmitting) {
                            void submitKeypadCode(a.id, enteredCode);
                          }
                        }}
                        disabled={isSubmitting}
                        className={`text-center text-2xl tracking-[0.5em] font-mono transition-transform ${
                          message?.type === 'error' ? 'animate-shake border-destructive' : ''
                        }`}
                      />
                      <Button
                        onClick={() => submitKeypadCode(a.id, enteredCode)}
                        disabled={enteredCode.length !== codeLength || isSubmitting}
                      >
                        {isSubmitting ? t('actions.checking') : t('actions.unlock')}
                      </Button>
                    </div>

                    {/* Feedback message */}
                    {message && (
                      <p className={`text-sm text-center ${message.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
                        {message.text}
                      </p>
                    )}

                    {/* Code dots visualization */}
                    <div className="flex justify-center gap-2">
                      {Array.from({ length: codeLength }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-3 w-3 rounded-full transition-colors ${
                            i < enteredCode.length ? 'bg-primary' : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          }

          // Standard artifact rendering (card, document, image, etc.)
          return (
            <Card key={a.id} className="p-6 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-medium">{a.title}</h3>
                  {a.description && <p className="text-sm text-muted-foreground">{a.description}</p>}
                </div>
                <Badge variant="secondary">{t('variants', { count: vs.length })}</Badge>
              </div>

              <div className="space-y-2">
                {vs.map((v) => {
                  const revealable = v.visibility === 'public';
                  const revealed = Boolean(v.revealed_at);
                  const highlighted = Boolean(v.highlighted_at);
                  return (
                    <div key={v.id} className="rounded-lg border border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {v.title || t('variant')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t(`visibility.${v.visibility}` as Parameters<typeof t>[0])}
                            {v.visibility === 'role_private' && v.visible_to_session_role_id ? ` ${t('rolePrivate')}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {revealable && (
                            <Button
                              size="sm"
                              variant={revealed ? 'outline' : 'primary'}
                              onClick={() =>
                                updateVariant({ action: 'reveal_variant', variantId: v.id, revealed: !revealed })
                              }
                            >
                              {revealed ? t('actions.hide') : t('actions.reveal')}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant={highlighted ? 'outline' : 'ghost'}
                            onClick={() =>
                              updateVariant({ action: 'highlight_variant', variantId: v.id, highlighted: !highlighted })
                            }
                          >
                            {highlighted ? t('actions.unhighlight') : t('actions.highlight')}
                          </Button>
                        </div>
                      </div>
                      {v.body && <p className="mt-2 text-sm whitespace-pre-wrap">{v.body}</p>}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
