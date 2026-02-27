/**
 * ArtifactInspector — Director sidebar showing full details for a selected artifact.
 *
 * PR #2: Director Artifact Inspector.
 *
 * Consumes existing cockpit state + callbacks only — no new fetches,
 * no new realtime subscriptions. Variant-level actions are optional;
 * when not provided, variant rows show read-only state.
 *
 * Sections:
 *   1. Header (type icon, title, state badge, close)
 *   2. Quick actions (reveal / hide / reset — artifact-level)
 *   3. Read-only details (description, metadata)
 *   4. Variants list (optional — shown when variant data is provided)
 *   5. Links (step / phase / triggers via ArtifactLinkPills)
 *
 * Does NOT own layout borders — parent provides `border-l` on desktop.
 * PlaySurface is the only border owner (PLAY_UI_CONTRACT §1).
 */

'use client';

import React, { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import type {
  CockpitArtifact,
  ArtifactState,
  CockpitStep,
  CockpitPhase,
  CockpitTrigger,
} from '@/types/session-cockpit';
import type { ArtifactType } from '@/types/games';
import { ArtifactTypeIcon } from '../shared/ArtifactTypeIcon';
import { ArtifactBadge } from '../shared/ArtifactBadge';
import { ArtifactLinkPills } from './ArtifactLinkPills';

// =============================================================================
// Variant type (subset of SessionArtifactVariant, kept lightweight)
// =============================================================================

export interface InspectorVariant {
  id: string;
  title?: string | null;
  body?: string | null;
  visibility: 'public' | 'leader_only' | 'role_private';
  revealed_at?: string | null;
  highlighted_at?: string | null;
}

// =============================================================================
// Props
// =============================================================================

export interface ArtifactInspectorProps {
  /** The selected artifact (null = empty state). */
  artifact: CockpitArtifact | null;

  /** Derived state for the selected artifact. */
  artifactState: ArtifactState | null;

  /** Whether the inspector is open / visible. */
  isOpen: boolean;

  /** Called to close the inspector. */
  onClose: () => void;

  // ── Artifact-level actions (use existing handlers) ──
  onRevealArtifact?: (artifactId: string) => Promise<void>;
  onHideArtifact?: (artifactId: string) => Promise<void>;
  onResetArtifact?: (artifactId: string) => Promise<void>;

  // ── Variant-level actions (optional — not available in all contexts) ──
  onRevealVariant?: (variantId: string) => Promise<void>;
  onHighlightVariant?: (variantId: string) => Promise<void>;

  /** Variants for the selected artifact (optional). */
  variants?: InspectorVariant[];

  // ── Link resolution data (from existing Director state) ──
  steps?: CockpitStep[];
  phases?: CockpitPhase[];
  triggers?: CockpitTrigger[];
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Derive linked triggers by scanning trigger conditions/actions for
 * references to the given artifact ID. Pure derivation, no fetch.
 */
function findLinkedTriggers(
  triggers: CockpitTrigger[],
  artifactId: string,
): Array<{ id: string; name: string }> {
  return triggers.filter((trigger) => {
    const cond = trigger.condition ?? {};
    const condStr = JSON.stringify(cond);
    if (condStr.includes(artifactId)) return true;

    for (const action of trigger.actions ?? []) {
      if (JSON.stringify(action).includes(artifactId)) return true;
    }
    return false;
  }).map((t) => ({ id: t.id, name: t.name }));
}

// =============================================================================
// Component
// =============================================================================

export function ArtifactInspector({
  artifact,
  artifactState,
  isOpen,
  onClose,
  onRevealArtifact,
  onHideArtifact,
  onResetArtifact,
  onRevealVariant,
  onHighlightVariant,
  variants,
  steps,
  phases,
  triggers,
}: ArtifactInspectorProps) {
  const t = useTranslations('play.artifactInspector');
  const tActions = useTranslations('play.artifactsPanel.actions');
  const [metadataExpanded, setMetadataExpanded] = useState(false);

  // ── Derive link data ──
  const linkedStep = useMemo(() => {
    if (!artifact?.stepId || !steps) return undefined;
    const step = steps.find((s) => s.id === artifact.stepId);
    if (!step) return undefined;
    return { id: step.id, title: step.title, stepOrder: step.stepOrder };
  }, [artifact, steps]);

  const linkedPhase = useMemo(() => {
    if (!artifact?.phaseId || !phases) return undefined;
    const phase = phases.find((p) => p.id === artifact.phaseId);
    if (!phase) return undefined;
    return { id: phase.id, name: phase.name, phaseOrder: phase.phaseOrder };
  }, [artifact, phases]);

  const linkedTriggers = useMemo(() => {
    if (!artifact?.id || !triggers) return [];
    return findLinkedTriggers(triggers, artifact.id);
  }, [artifact, triggers]);

  if (!isOpen) return null;

  // ── Empty state ──
  if (!artifact) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <span className="text-sm font-medium text-muted-foreground">{t('title')}</span>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
            <XMarkIcon className="h-4 w-4" />
            <span className="sr-only">{t('close')}</span>
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-sm text-muted-foreground text-center">{t('noSelection')}</p>
        </div>
      </div>
    );
  }

  const status = artifactState?.status ?? 'hidden';
  const _isRevealed = artifactState?.isRevealed ?? false;
  const isHighlighted = artifactState?.isHighlighted ?? false;

  // Pretty-print metadata (collapsed by default)
  const metadataStr = artifact.metadata
    ? JSON.stringify(artifact.metadata, null, 2)
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* ────────────────────────────────────────────────────────────── */}
      {/* 1. HEADER                                                     */}
      {/* ────────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2 p-4 border-b border-border/50">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <ArtifactTypeIcon
            type={artifact.artifactType as ArtifactType}
            size="md"
            className="text-muted-foreground shrink-0 mt-0.5"
          />
          <div className="min-w-0">
            <h3 className="font-medium text-sm leading-tight truncate">{artifact.title}</h3>
            <div className="mt-1">
              <ArtifactBadge state={status} compact />
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0 shrink-0">
          <XMarkIcon className="h-4 w-4" />
          <span className="sr-only">{t('close')}</span>
        </Button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">
        {/* ────────────────────────────────────────────────────────── */}
        {/* 2. QUICK ACTIONS                                          */}
        {/* ────────────────────────────────────────────────────────── */}
        <div className="p-4 border-b border-border/50 space-y-2">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {t('quickActions')}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {status === 'hidden' && onRevealArtifact && (
              <Button
                size="sm"
                variant="default"
                className="h-7 text-xs gap-1"
                onClick={() => onRevealArtifact(artifact.id)}
              >
                <EyeIcon className="h-3.5 w-3.5" />
                {tActions('reveal')}
              </Button>
            )}

            {status === 'revealed' && onHideArtifact && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => onHideArtifact(artifact.id)}
              >
                <EyeSlashIcon className="h-3.5 w-3.5" />
                {tActions('hide')}
              </Button>
            )}

            {status !== 'hidden' && onResetArtifact && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1 text-muted-foreground"
                onClick={() => onResetArtifact(artifact.id)}
              >
                <ArrowPathIcon className="h-3.5 w-3.5" />
                {tActions('reset')}
              </Button>
            )}
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 3. READ-ONLY DETAILS                                      */}
        {/* ────────────────────────────────────────────────────────── */}
        <div className="p-4 border-b border-border/50 space-y-3">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {t('details')}
          </div>

          {artifact.description && (
            <p className="text-sm text-foreground/80 leading-relaxed">
              {artifact.description}
            </p>
          )}

          {/* State details */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">{t('detailType')}</span>
              <div className="font-medium">{artifact.artifactType}</div>
            </div>
            <div>
              <span className="text-muted-foreground">{t('detailOrder')}</span>
              <div className="font-medium">{artifact.artifactOrder}</div>
            </div>
            {artifactState?.attemptCount != null && (
              <div>
                <span className="text-muted-foreground">{t('detailAttempts')}</span>
                <div className="font-medium">
                  {artifactState.attemptCount}
                  {artifactState.maxAttempts != null && ` / ${artifactState.maxAttempts}`}
                </div>
              </div>
            )}
            {artifactState?.progress != null && (
              <div>
                <span className="text-muted-foreground">{t('detailProgress')}</span>
                <div className="font-medium">{artifactState.progress}%</div>
              </div>
            )}
          </div>

          {/* Highlight indicator */}
          {isHighlighted && (
            <div className="flex items-center gap-1.5 text-xs">
              <SparklesIcon className="h-3.5 w-3.5 text-primary" />
              <span className="text-primary font-medium">{t('currentlyHighlighted')}</span>
            </div>
          )}

          {/* Metadata (collapsed by default) */}
          {metadataStr && (
            <div>
              <button
                type="button"
                onClick={() => setMetadataExpanded((p) => !p)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {metadataExpanded
                  ? <ChevronDownIcon className="h-3 w-3" />
                  : <ChevronRightIcon className="h-3 w-3" />}
                {t('metadata')}
              </button>
              {metadataExpanded && (
                <pre className="mt-2 p-2 rounded bg-muted/50 text-[10px] text-muted-foreground overflow-x-auto max-h-48">
                  {metadataStr}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 4. VARIANTS                                               */}
        {/* ────────────────────────────────────────────────────────── */}
        {variants && variants.length > 0 && (
          <div className="p-4 border-b border-border/50 space-y-2">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {t('variants')} ({variants.length})
            </div>
            <div className="space-y-2">
              {variants.map((v) => {
                const revealed = Boolean(v.revealed_at);
                const highlighted = Boolean(v.highlighted_at);

                return (
                  <div
                    key={v.id}
                    className={cn(
                      'rounded-lg border p-2.5 text-xs transition-colors',
                      revealed
                        ? 'border-primary/30 bg-primary/5'
                        : 'border-border/50',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">
                          {v.title || t('untitledVariant')}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <ArtifactBadge
                            state={revealed ? 'revealed' : 'hidden'}
                            visibility={v.visibility}
                            compact
                          />
                          {highlighted && (
                            <Badge variant="default" className="text-[9px] px-1 py-0 animate-pulse">
                              <SparklesIcon className="h-2.5 w-2.5 mr-0.5" />
                              {tActions('highlight')}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Variant actions (only when handlers provided) */}
                      <div className="flex items-center gap-1 shrink-0">
                        {!revealed && onRevealVariant && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-1.5 text-[10px]"
                            onClick={() => onRevealVariant(v.id)}
                          >
                            <EyeIcon className="h-3 w-3" />
                          </Button>
                        )}
                        {!highlighted && onHighlightVariant && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-1.5 text-[10px]"
                            onClick={() => onHighlightVariant(v.id)}
                          >
                            <SparklesIcon className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {v.body && (
                      <p className="mt-1.5 text-muted-foreground line-clamp-2">{v.body}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────── */}
        {/* 5. LINKS                                                  */}
        {/* ────────────────────────────────────────────────────────── */}
        <div className="p-4 space-y-2">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {t('links')}
          </div>
          <ArtifactLinkPills
            step={linkedStep}
            phase={linkedPhase}
            triggers={linkedTriggers}
            compact
          />
        </div>
      </div>
    </div>
  );
}
