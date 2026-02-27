/**
 * DirectorArtifactActions — State-aware action buttons for artifact management.
 *
 * Extracted from inline action button logic in ArtifactsPanel (PR #1: Foundations).
 *
 * Stateless UI component that receives the current artifact state and exposes
 * only the valid actions for that state. All action handlers are passed from the
 * parent — this component does NOT contain business logic.
 *
 * State → Available Actions:
 *   hidden   → [Reveal]
 *   revealed → [Hide] [Highlight]
 *   unlocked → [Highlight] [Reset]
 *   solved   → [Reset]
 *   failed   → [Reset]
 *   (puzzle) → +[Reset] always available
 *
 * NOTE: lock/unlock is NOT exposed here because the artifact state API does not
 * support lock_artifact/unlock_artifact. Lock semantics are keypad-internal only.
 * If a future API adds artifact-level locking, re-add these buttons.
 */

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import type { ArtifactStateStatus } from '@/types/session-cockpit';

// =============================================================================
// Props
// =============================================================================

export interface DirectorArtifactActionsProps {
  /** Current state of the artifact. */
  state: ArtifactStateStatus;

  /** Whether this is a puzzle-type artifact (always show reset). */
  isPuzzle?: boolean;

  /** Whether the artifact is currently highlighted. */
  isHighlighted?: boolean;

  // ── Action handlers ──
  onReveal?: () => void;
  onHide?: () => void;
  onHighlight?: () => void;
  onUnhighlight?: () => void;
  onReset?: () => void;

  /** Compact button size for dense rows. */
  compact?: boolean;

  /** Disable all actions (e.g. during processing). */
  disabled?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function DirectorArtifactActions({
  state,
  isPuzzle = false,
  isHighlighted = false,
  onReveal,
  onHide,
  onHighlight,
  onUnhighlight,
  onReset,
  compact = false,
  disabled = false,
}: DirectorArtifactActionsProps) {
  const t = useTranslations('play.artifactsPanel.actions');
  const size = compact ? 'sm' : 'sm';

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Reveal / Hide toggle */}
      {state === 'hidden' && onReveal && (
        <Button size={size} variant="default" onClick={onReveal} disabled={disabled} className="gap-1">
          <EyeIcon className="h-3.5 w-3.5" />
          {!compact && t('reveal')}
        </Button>
      )}
      {state === 'revealed' && onHide && (
        <Button size={size} variant="outline" onClick={onHide} disabled={disabled} className="gap-1">
          <EyeSlashIcon className="h-3.5 w-3.5" />
          {!compact && t('hide')}
        </Button>
      )}

      {/* Highlight / Unhighlight toggle */}
      {state === 'revealed' && (
        isHighlighted ? (
          onUnhighlight && (
            <Button size={size} variant="outline" onClick={onUnhighlight} disabled={disabled} className="gap-1">
              <SparklesIcon className="h-3.5 w-3.5" />
              {!compact && t('unhighlight')}
            </Button>
          )
        ) : (
          onHighlight && (
            <Button size={size} variant="ghost" onClick={onHighlight} disabled={disabled} className="gap-1">
              <SparklesIcon className="h-3.5 w-3.5" />
              {!compact && t('highlight')}
            </Button>
          )
        )
      )}

      {/* Reset — available on solved, or always for puzzles */}
      {(state === 'solved' || (isPuzzle && state !== 'hidden')) && onReset && (
        <Button size={size} variant="outline" onClick={onReset} disabled={disabled} className="gap-1">
          <ArrowPathIcon className="h-3.5 w-3.5" />
          {!compact && t('reset')}
        </Button>
      )}
    </div>
  );
}
