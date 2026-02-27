/**
 * ArtifactLinkPills — Shows connections from an artifact to steps, phases, and triggers.
 *
 * Pure presentation component. Receives pre-resolved link data — no fetching.
 * Used by ArtifactInspector to display contextual relationships.
 *
 * Does NOT own layout borders (PlaySurface is the only border owner).
 */

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import {
  MapPinIcon,
  FlagIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';

// =============================================================================
// Props
// =============================================================================

export interface ArtifactLinkPillsProps {
  /** Linked step (resolved from artifact.stepId). */
  step?: { id: string; title: string; stepOrder?: number };

  /** Linked phase (resolved from artifact.phaseId). */
  phase?: { id: string; name: string; phaseOrder?: number };

  /** Linked triggers (resolved by scanning trigger conditions/actions). */
  triggers?: Array<{ id: string; name: string }>;

  /** Compact mode for tight layouts. */
  compact?: boolean;

  /** Called when a pill is clicked (e.g. to navigate or highlight). */
  onPillClick?: (type: 'step' | 'phase' | 'trigger', id: string) => void;
}

// =============================================================================
// Component
// =============================================================================

export function ArtifactLinkPills({
  step,
  phase,
  triggers = [],
  compact = false,
  onPillClick,
}: ArtifactLinkPillsProps) {
  const t = useTranslations('play.artifactInspector');

  const hasAny = step || phase || triggers.length > 0;

  if (!hasAny) {
    return (
      <span className={`text-muted-foreground ${compact ? 'text-[10px]' : 'text-xs'}`}>
        {t('noLinks')}
      </span>
    );
  }

  const iconSize = compact ? 'h-3 w-3' : 'h-3.5 w-3.5';
  const badgeSize = compact ? 'text-[10px] px-1.5 py-0' : 'text-xs';

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {step && (
        <Badge
          variant="outline"
          className={`inline-flex items-center gap-1 ${badgeSize} cursor-pointer hover:bg-muted/50 transition-colors`}
          onClick={() => onPillClick?.('step', step.id)}
        >
          <MapPinIcon className={iconSize} />
          {step.stepOrder != null
            ? t('linkStep', { order: step.stepOrder + 1, title: step.title })
            : step.title}
        </Badge>
      )}

      {phase && (
        <Badge
          variant="outline"
          className={`inline-flex items-center gap-1 ${badgeSize} cursor-pointer hover:bg-muted/50 transition-colors`}
          onClick={() => onPillClick?.('phase', phase.id)}
        >
          <FlagIcon className={iconSize} />
          {phase.name}
        </Badge>
      )}

      {triggers.map((trigger) => (
        <Badge
          key={trigger.id}
          variant="outline"
          className={`inline-flex items-center gap-1 ${badgeSize} cursor-pointer hover:bg-muted/50 transition-colors`}
          onClick={() => onPillClick?.('trigger', trigger.id)}
        >
          <BoltIcon className={iconSize} />
          {trigger.name}
        </Badge>
      ))}
    </div>
  );
}
