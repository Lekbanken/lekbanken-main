/**
 * ParticipantDecisionOverlay
 *
 * Two parts:
 * 1. DecisionDrawer — collapsible list of all decisions (user-triggered)
 * 2. DecisionModal — blocking overlay for the current open decision (auto-triggered)
 *
 * Golden Path UX:
 * - Modal uses 2-step flow: Select → Confirm → Success
 * - Results view shows proportional bar chart
 * - Decision always blocks interaction until voted
 *
 * Extracted from ParticipantPlayView monolith.
 */

'use client';

import { useMemo, useRef, useState } from 'react';
import { hapticTap, HAPTIC_MEDIUM } from '../haptics';
import { playSfx, SFX_CONFIRM } from '../sound';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import type { ParticipantDecision, DecisionResultsResponse } from '@/features/play/api';

// =============================================================================
// Types
// =============================================================================

export interface DecisionState {
  decisions: ParticipantDecision[];
  decisionsError: string | null;
  selectedOptionByDecisionId: Record<string, string>;
  voteSendingByDecisionId: Record<string, boolean>;
  voteMessageByDecisionId: Record<string, string | null>;
  resultsByDecisionId: Record<string, DecisionResultsResponse | null>;
  submittedVoteByDecisionId: Record<string, boolean>;
}

export interface DecisionActions {
  onSelectOption: (decisionId: string, optionKey: string) => void;
  onVote: (decisionId: string) => void;
  onRefresh: () => void;
}

export interface ParticipantDecisionDrawerProps {
  state: DecisionState;
  actions: DecisionActions;
  onClose: () => void;
}

export interface ParticipantDecisionModalProps {
  state: DecisionState;
  actions: DecisionActions;
  isEnded: boolean;
}

// =============================================================================
// Decision Drawer (user-triggered, non-blocking)
// =============================================================================

export function ParticipantDecisionDrawer({
  state,
  actions,
  onClose,
}: ParticipantDecisionDrawerProps) {
  const t = useTranslations('play.participantView');
  const { decisions, decisionsError, selectedOptionByDecisionId, voteSendingByDecisionId, voteMessageByDecisionId, resultsByDecisionId } = state;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{t('decisionsDrawer.title')}</p>
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="ghost" onClick={actions.onRefresh} className="h-7 w-7 p-0" aria-label="Refresh">
            ↻
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onClose} className="h-7 w-7 p-0" aria-label="Close">
            ✕
          </Button>
        </div>
      </div>

      {decisionsError && <p className="text-sm text-destructive">{decisionsError}</p>}

      {decisions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('decisionsDrawer.noDecisions')}</p>
      ) : (
        <div className="space-y-3">
          {decisions.map((d) => {
            const selected = selectedOptionByDecisionId[d.id] ?? '';
            const sending = Boolean(voteSendingByDecisionId[d.id]);
            const msg = voteMessageByDecisionId[d.id];
            const options = d.options ?? [];
            const isOpen = d.status === 'open';
            const isRevealed = d.status === 'revealed';
            const results = resultsByDecisionId[d.id]?.results ?? null;

            return (
              <div key={d.id} className="rounded-md border border-border p-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{d.title}</p>
                    {d.prompt && (
                      <p className="text-sm text-muted-foreground">{d.prompt}</p>
                    )}
                  </div>
                  <Badge variant={isOpen ? 'default' : 'secondary'}>{d.status}</Badge>
                </div>

                {isOpen && options.length > 0 && (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      {options.map((o) => (
                        <label key={o.key} className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name={`decision-${d.id}`}
                            value={o.key}
                            checked={selected === o.key}
                            onChange={() => actions.onSelectOption(d.id, o.key)}
                            disabled={sending}
                          />
                          <span className="text-foreground">{o.label}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => actions.onVote(d.id)}
                        disabled={sending}
                      >
                        {t('voting.vote')}
                      </Button>
                      {msg && (
                        <p
                          className={`text-sm ${
                            msg.includes('!') ? 'text-green-600' : 'text-muted-foreground'
                          }`}
                        >
                          {msg}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {isRevealed && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('decisionsDrawer.results')}</p>
                    {results ? (
                      <ResultsBarChart results={results} />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {t('decisionsDrawer.resultsShown')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// =============================================================================
// Results Bar Chart (shared by drawer and modal)
// =============================================================================

function ResultsBarChart({ results }: { results: Array<{ key?: string; label?: string; count: number }> }) {
  const maxCount = useMemo(() => Math.max(1, ...results.map((r) => r.count)), [results]);

  return (
    <div className="space-y-2">
      {results.map((r) => {
        const pct = Math.round((r.count / maxCount) * 100);
        return (
          <div key={r.key ?? r.label} className="space-y-0.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{r.label ?? r.key}</span>
              <span className="tabular-nums text-muted-foreground">{r.count}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Decision Modal (auto-triggered, blocking)
//
// Premium 2-step flow:
// 1. Selection step — pick an option, see confirm button
// 2. Confirm step — "You chose X. Submit vote?" (reduces mis-taps)
// 3. Success state — "Thank you for voting" (replaces blank)
// =============================================================================

export function ParticipantDecisionModal({
  state,
  actions,
  isEnded,
}: ParticipantDecisionModalProps) {
  const t = useTranslations('play.participantView');
  const { decisions, selectedOptionByDecisionId, voteSendingByDecisionId, voteMessageByDecisionId, submittedVoteByDecisionId } = state;
  const [confirming, setConfirming] = useState(false);
  // Double-submit guard: tracks whether a vote is already in-flight
  const voteInFlightRef = useRef(false);

  const openDecision = decisions.find((d) => d.status === 'open');
  if (!openDecision || isEnded) return null;

  const selected = selectedOptionByDecisionId[openDecision.id] ?? '';
  const sending = Boolean(voteSendingByDecisionId[openDecision.id]);
  const msg = voteMessageByDecisionId[openDecision.id];
  const options = openDecision.options ?? [];
  const hasVoted = Boolean(submittedVoteByDecisionId[openDecision.id]);

  // Find label for selected option
  const selectedLabel = options.find((o) => o.key === selected)?.label ?? selected;

  // ── Success state ──────────────────────────────────────────────────
  if (hasVoted) {
    return (
      <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircleIcon className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-foreground">{t('decision.voteSubmitted')}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t('decision.thankYou')}</p>
          <p className="mt-3 text-xs text-muted-foreground">{t('decision.waitingForResults')}</p>
        </div>
      </div>
    );
  }

  // ── Confirm step ───────────────────────────────────────────────────
  if (confirming && selected) {
    return (
      <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl">
              🗳️
            </div>
            <h3 className="mt-3 text-lg font-bold text-foreground">{t('decision.confirmTitle')}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('decision.confirmDescription', { option: selectedLabel })}
            </p>
          </div>

          {/* Selected option preview */}
          <div className="mt-4 rounded-lg border-2 border-primary bg-primary/5 p-3 text-center">
            <span className="font-semibold text-foreground">{selectedLabel}</span>
          </div>

          {msg && !msg.includes('!') && (
            <p className="mt-3 text-sm text-destructive text-center">{msg}</p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => setConfirming(false)}
              disabled={sending}
            >
              {t('decision.back')}
            </Button>
            <Button
              onClick={() => {
                // Double-submit guard: prevent multiple in-flight votes
                if (voteInFlightRef.current || sending) return;
                voteInFlightRef.current = true;
                hapticTap(HAPTIC_MEDIUM);
                playSfx(SFX_CONFIRM);
                actions.onVote(openDecision.id);
                setConfirming(false);
                // Reset guard after a short delay to handle edge cases
                setTimeout(() => { voteInFlightRef.current = false; }, 3000);
              }}
              disabled={sending}
            >
              {sending ? t('voting.voting') : t('decision.confirmSubmit')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Selection step ─────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl shrink-0">
            🗳️
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              {t('decisionsDrawer.title')}
            </p>
            <p className="text-lg font-bold leading-tight text-foreground">{openDecision.title}</p>
          </div>
        </div>

        {openDecision.prompt && (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{openDecision.prompt}</p>
        )}

        <div className="mt-5 space-y-2.5">
          {options.length === 0 && (
            <div className="rounded-xl border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground text-center">
              {t('decisionsDrawer.noOptions')}
            </div>
          )}

          {options.map((o) => (
            <label
              key={o.key}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 active:scale-[0.98] ${
                selected === o.key
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-muted-foreground/40'
              }`}
            >
              <input
                type="radio"
                name={`modal-decision-${openDecision.id}`}
                value={o.key}
                checked={selected === o.key}
                onChange={() => actions.onSelectOption(openDecision.id, o.key)}
                disabled={sending}
                className="sr-only"
              />
              <div
                className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  selected === o.key ? 'border-primary' : 'border-muted-foreground/30'
                }`}
              >
                {selected === o.key && (
                  <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-foreground font-medium">{o.label}</span>
            </label>
          ))}
        </div>

        {msg && !msg.includes('!') && (
          <p className="mt-3 text-sm text-destructive">{msg}</p>
        )}

        <div className="mt-6">
          <Button
            onClick={() => setConfirming(true)}
            disabled={sending || !selected || options.length === 0}
            className="w-full"
            size="lg"
          >
            {t('voting.submitVote')}
          </Button>
          {options.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground text-center">
              {t('voting.hostNeedsToAddOptions')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
