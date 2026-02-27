/**
 * ArtifactCard — Shared card container for a single artifact.
 *
 * Extracted from inline variant card markup in ParticipantArtifactDrawer
 * (PR #1: Foundations). Used by both Director (dense list rows) and
 * Participant (expanded drawer cards).
 *
 * This is a renderer-agnostic container:
 * - header: type icon + title + badge
 * - optional description
 * - collapse/expand body container
 * - accepts `children` for puzzle content / variant list
 *
 * Does NOT recreate puzzle renderers.
 * Does NOT own drawer chrome (DrawerOverlay does that).
 * Does NOT add PlaySurface borders (PlaySurface is the only border owner).
 */

'use client';

import React, { useCallback } from 'react';
import type { ArtifactType } from '@/types/games';
import { ArtifactTypeIcon } from './ArtifactTypeIcon';

// =============================================================================
// Density styling
// =============================================================================

const DENSITY_CLASSES = {
  dense: {
    card: 'p-2 gap-1.5',
    title: 'text-[13px]',
    description: 'text-[11px]',
    body: 'text-xs',
    iconSize: 'sm' as const,
  },
  comfortable: {
    card: 'p-3 gap-2',
    title: 'text-sm',
    description: 'text-xs',
    body: 'text-sm',
    iconSize: 'md' as const,
  },
  spacious: {
    card: 'p-4 gap-2.5',
    title: 'text-base',
    description: 'text-sm',
    body: 'text-base',
    iconSize: 'md' as const,
  },
} as const;

// =============================================================================
// State classes (participant 3-state model)
// =============================================================================

export type ArtifactCardState = 'highlighted' | 'available' | 'used';

const STATE_CLASSES: Record<ArtifactCardState, string> = {
  highlighted: 'bg-primary/5 border-2 border-primary/30 shadow-sm',
  available: 'bg-muted/30 border border-border',
  used: 'bg-muted/20 border border-border opacity-70',
};

// =============================================================================
// Props
// =============================================================================

export interface ArtifactCardProps {
  /** Unique artifact (or variant) ID for keying. */
  id: string;

  /** The display title. */
  title: string;

  /** Optional description shown below title. */
  description?: string | null;

  /** The artifact type — drives icon rendering. */
  artifactType?: ArtifactType;

  /** Visual state class. Defaults to 'available'. */
  state?: ArtifactCardState;

  /** Card density. Defaults to 'comfortable'. */
  density?: 'dense' | 'comfortable' | 'spacious';

  /** Whether the card body is expanded. */
  isExpanded?: boolean;

  /** Toggle expand/collapse. Required if the card has expandable content. */
  onToggleExpand?: () => void;

  /** Whether this card is batch-selected (Director only). */
  isSelected?: boolean;

  /** Toggle batch selection (Director only). */
  onToggleSelect?: () => void;

  /** Badge element rendered in the header row (e.g. ArtifactBadge). */
  badge?: React.ReactNode;

  /** Action buttons rendered in the header row (Director only). */
  actions?: React.ReactNode;

  /**
   * Expandable body content. If provided, the card is expandable.
   * Rendered only when isExpanded is true.
   */
  children?: React.ReactNode;

  /**
   * One-line excerpt shown when collapsed + has children.
   * Pass the first line of body text.
   */
  excerpt?: string | null;

  /** data-highlighted attribute for scroll targeting. */
  dataHighlighted?: boolean;

  /** Additional CSS class on the outer element. */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function ArtifactCard({
  id: _id,
  title,
  description,
  artifactType,
  state = 'available',
  density = 'comfortable',
  isExpanded = false,
  onToggleExpand,
  isSelected: _isSelected,
  onToggleSelect: _onToggleSelect,
  badge,
  actions,
  children,
  excerpt,
  dataHighlighted,
  className,
}: ArtifactCardProps) {
  const d = DENSITY_CLASSES[density];
  const stateClass = STATE_CLASSES[state];
  const hasExpandableContent = Boolean(children);
  const isClickable = hasExpandableContent && Boolean(onToggleExpand);

  const handleClick = useCallback(() => {
    if (isClickable && onToggleExpand) {
      onToggleExpand();
    }
  }, [isClickable, onToggleExpand]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isClickable) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onToggleExpand?.();
      }
    },
    [isClickable, onToggleExpand],
  );

  // Choose between button (clickable) and div (static)
  const Tag = isClickable ? 'button' : 'div';

  return (
    <Tag
      type={isClickable ? 'button' : undefined}
      data-highlighted={dataHighlighted ? 'true' : undefined}
      onClick={isClickable ? handleClick : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      aria-expanded={hasExpandableContent ? isExpanded : undefined}
      className={[
        'w-full rounded-lg text-left transition-colors select-none',
        isClickable ? 'active:scale-[0.98] cursor-pointer' : '',
        stateClass,
        d.card,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* ── Header row ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Type icon */}
        {artifactType && (
          <ArtifactTypeIcon type={artifactType} size={d.iconSize} className="text-muted-foreground shrink-0" />
        )}

        {/* Title */}
        <p
          className={`font-medium ${d.title} ${
            state === 'used' ? 'text-muted-foreground line-through' : 'text-foreground'
          }`}
        >
          {title}
        </p>

        {/* Badge */}
        {badge}

        {/* Actions (pushed right) */}
        {actions && <div className="ml-auto flex items-center gap-1">{actions}</div>}

        {/* Expand chevron */}
        {hasExpandableContent && (
          <span
            className={`${actions ? '' : 'ml-auto'} text-xs text-muted-foreground transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
            aria-hidden
          >
            ▾
          </span>
        )}
      </div>

      {/* ── Description (always visible when present) ── */}
      {description && (
        <p className={`${d.description} text-muted-foreground`}>{description}</p>
      )}

      {/* ── Expanded body ── */}
      {hasExpandableContent && isExpanded && (
        <div className={`mt-1.5 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200 ${d.body} ${
          state === 'used' ? 'text-muted-foreground/60' : 'text-muted-foreground'
        }`}>
          {children}
        </div>
      )}

      {/* ── One-line excerpt when collapsed ── */}
      {hasExpandableContent && !isExpanded && excerpt && (
        <p className="mt-1 text-xs text-muted-foreground/50 truncate">{excerpt}</p>
      )}
    </Tag>
  );
}
