/**
 * ArtifactBadge — State + visibility badge for artifacts.
 *
 * Extracted from inline status rendering in ArtifactsPanel and
 * ParticipantArtifactDrawer (PR #1: Foundations).
 *
 * Renders:
 * - State icon (eye/lock/check/x)
 * - State label (translated)
 * - Optional visibility pill (public / leader_only / role_private)
 * - Optional type icon
 *
 * Does NOT own layout borders (PlaySurface is the only border owner).
 */

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import {
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import type { ArtifactType } from '@/types/games';
import type { ArtifactStateStatus } from '@/types/session-cockpit';
import { ArtifactTypeIcon } from './ArtifactTypeIcon';

// =============================================================================
// State → visual mapping
// =============================================================================

type StateConfig = {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
};

const STATE_CONFIG: Record<ArtifactStateStatus, StateConfig> = {
  hidden: { icon: EyeSlashIcon, variant: 'secondary' },
  revealed: { icon: EyeIcon, variant: 'default' },
  solved: { icon: CheckCircleIcon, variant: 'default', className: 'bg-green-500/10 text-green-600 border-green-500/30' },
};

// =============================================================================
// Participant-only state type (3-state model: highlighted → available → used)
// =============================================================================

export type ParticipantArtifactState = 'highlighted' | 'available' | 'used';

// =============================================================================
// Props
// =============================================================================

export interface ArtifactBadgeProps {
  /**
   * Director state — uses full ArtifactStateStatus.
   * For participant use, pass `participantState` instead.
   */
  state?: ArtifactStateStatus;

  /**
   * Participant state — 3-state model only.
   * Mutually exclusive with `state`.
   */
  participantState?: ParticipantArtifactState;

  /** Author-time visibility (public / leader_only / role_private). */
  visibility?: 'public' | 'leader_only' | 'role_private';

  /** Artifact type — when provided, shows type icon. */
  artifactType?: ArtifactType;

  /** Show type icon alongside the state badge. */
  showTypeIcon?: boolean;

  /** Compact mode for dense director rows. */
  compact?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function ArtifactBadge({
  state,
  participantState,
  visibility,
  artifactType,
  showTypeIcon = false,
  compact = false,
}: ArtifactBadgeProps) {
  const t = useTranslations('play.artifactBadge');

  // ── Participant 3-state rendering ──
  // IMPORTANT: Participant branch must remain disjoint from director branch.
  // Never pass both `state` and `participantState`. A future refactor in the
  // director branch must not leak labels/icons into participant UI.
  if (participantState) {
    return (
      <div className="inline-flex items-center gap-1">
        {showTypeIcon && artifactType && (
          <ArtifactTypeIcon type={artifactType} size={compact ? 'sm' : 'md'} className="text-muted-foreground" />
        )}
        {participantState === 'used' && (
          <Badge variant="secondary" className={compact ? 'text-[10px] px-1.5 py-0' : 'text-[10px]'}>
            ✓ {t('used')}
          </Badge>
        )}
        {participantState === 'highlighted' && (
          <Badge variant="default" className={`animate-pulse ${compact ? 'text-[10px] px-1.5 py-0' : 'text-[10px]'}`}>
            {t('highlighted')}
          </Badge>
        )}
        {participantState === 'available' && visibility && (
          <Badge variant="secondary" className={compact ? 'text-[10px] px-1.5 py-0' : 'text-[10px]'}>
            {t(`visibility.${visibility}`)}
          </Badge>
        )}
      </div>
    );
  }

  // ── Director full-state rendering ──
  if (!state) return null;

  const config = STATE_CONFIG[state];
  const Icon = config.icon;

  return (
    <div className="inline-flex items-center gap-1">
      {showTypeIcon && artifactType && (
        <ArtifactTypeIcon type={artifactType} size={compact ? 'sm' : 'md'} className="text-muted-foreground" />
      )}
      <Badge
        variant={config.variant}
        className={`inline-flex items-center gap-1 ${compact ? 'text-[10px] px-1.5 py-0' : 'text-xs'} ${config.className ?? ''}`}
      >
        <Icon className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        {t(`state.${state}`)}
      </Badge>
      {visibility && (
        <Badge variant="outline" className={compact ? 'text-[10px] px-1.5 py-0' : 'text-xs'}>
          {t(`visibility.${visibility}`)}
        </Badge>
      )}
    </div>
  );
}
