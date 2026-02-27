/**
 * PinnedArtifactBar — Quick-access strip of pinned artifacts for Director.
 *
 * PR #4: Renders inside the Artefakter DrawerOverlay, above the artifact
 * list. Horizontal scroll row of compact chips — each shows type icon,
 * truncated title, and status dot. Clicking selects (expands) the artifact.
 *
 * Pins are UI-only (local state) — no backend persistence.
 * See ARTIFACT_COMPONENTS.md §5.5.
 */

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { ArtifactTypeIcon } from '../shared/ArtifactTypeIcon';
import type { ArtifactType } from '@/types/games';
import type { ArtifactStateStatus } from '@/types/session-cockpit';

// =============================================================================
// Props
// =============================================================================

export interface PinnedArtifactItem {
  id: string;
  title: string;
  type: ArtifactType;
  status: ArtifactStateStatus;
  isHighlighted: boolean;
}

export interface PinnedArtifactBarProps {
  items: PinnedArtifactItem[];
  onSelect: (artifactId: string) => void;
  onUnpin: (artifactId: string) => void;
}

// =============================================================================
// Status dot color
// =============================================================================

const STATUS_DOT: Record<ArtifactStateStatus, string> = {
  hidden: 'bg-muted-foreground/50',
  revealed: 'bg-primary',
  solved: 'bg-green-600',
};

// =============================================================================
// Component
// =============================================================================

export function PinnedArtifactBar({ items, onSelect, onUnpin }: PinnedArtifactBarProps) {
  const t = useTranslations('play.directorDrawer.artifacts');

  if (items.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-2">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          {t('pinnedTitle')}
        </span>
        <span className="text-[10px] text-muted-foreground/60">
          {t('pinnedVolatile')}
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              'group flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1',
              'text-xs text-foreground/80 hover:bg-accent/50 transition-colors',
              'shrink-0 max-w-[160px]',
            )}
            onClick={() => onSelect(item.id)}
            title={item.title}
          >
            {/* Status dot */}
            <span
              className={cn('h-1.5 w-1.5 rounded-full shrink-0', STATUS_DOT[item.status])}
              aria-hidden="true"
            />

            {/* Type icon */}
            <ArtifactTypeIcon type={item.type} size="sm" className="text-muted-foreground shrink-0" />

            {/* Title (truncated) */}
            <span className="truncate">{item.title}</span>

            {/* Highlighted indicator */}
            {item.isHighlighted && (
              <SparklesIcon className="h-3 w-3 text-primary shrink-0" aria-label={t('new')} />
            )}

            {/* Unpin button */}
            <span
              role="button"
              tabIndex={0}
              className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onUnpin(item.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onUnpin(item.id);
                }
              }}
              aria-label={`${t('unpin')} ${item.title}`}
            >
              <XMarkIcon className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
