'use client';

import { useState, useRef, useEffect, type ReactElement, type TouchEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PlannerBlock } from '@/types/planner';

// =============================================================================
// Icons
// =============================================================================

const GripVerticalIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/>
    <circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>
  </svg>
);

const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
    <path d="m15 5 4 4"/>
  </svg>
);

const Trash2Icon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
  </svg>
);

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

const GamepadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/>
    <line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/>
    <rect width="20" height="12" x="2" y="6" rx="2"/>
  </svg>
);

const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>
  </svg>
);

const ClipboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="4" rx="1"/><path d="M4 6h16v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>
    <path d="M9 11h6"/><path d="M9 15h6"/>
  </svg>
);

const NoteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
  </svg>
);

const SectionIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 5h18"/><path d="M3 10h14"/><path d="M3 15h10"/>
  </svg>
);

const SessionGameIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

// =============================================================================
// Block Type Metadata
// =============================================================================

const blockMeta: Record<
  PlannerBlock['blockType'],
  { labelKey: string; className: string; Icon: () => ReactElement }
> = {
  game: {
    labelKey: 'blockTypes.game',
    className: 'bg-primary/10 text-primary',
    Icon: GamepadIcon,
  },
  pause: {
    labelKey: 'blockTypes.pause',
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    Icon: PauseIcon,
  },
  preparation: {
    labelKey: 'blockTypes.preparation',
    className: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    Icon: ClipboardIcon,
  },
  custom: {
    labelKey: 'blockTypes.custom',
    className: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
    Icon: NoteIcon,
  },
  section: {
    labelKey: 'blockTypes.section',
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    Icon: SectionIcon,
  },
  session_game: {
    labelKey: 'blockTypes.session_game',
    className: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    Icon: SessionGameIcon,
  },
};

// =============================================================================
// Types
// =============================================================================

interface TouchBlockRowProps {
  block: PlannerBlock;
  index: number;
  canEdit: boolean;
  canDelete: boolean;
  canReorder?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDurationChange?: (duration: number) => void;
  /** Trigger inline title editing (e.g. after creation) */
  isAutoEditingTitle?: boolean;
  onTitleSave?: (blockId: string, title: string) => void;
  onTitleEditDone?: () => void;
  /** Visual grouping: block appears under a section header */
  isUnderSection?: boolean;
}

// =============================================================================
// Swipe Hook
// =============================================================================

const SWIPE_THRESHOLD = 80;
const ACTION_WIDTH = 70;

function useSwipeActions() {
  const [offset, setOffset] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const handleTouchStart = (e: TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = e.touches[0].clientX;
    isDragging.current = true;
    isHorizontalSwipe.current = null;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging.current) return;

    const deltaX = e.touches[0].clientX - startX.current;
    const deltaY = e.touches[0].clientY - startY.current;

    // Determine swipe direction on first significant movement
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }

    // Only handle horizontal swipes
    if (!isHorizontalSwipe.current) return;

    currentX.current = e.touches[0].clientX;
    
    // Calculate new offset (only allow left swipe)
    let newOffset = isRevealed ? -ACTION_WIDTH + deltaX : deltaX;
    
    // Clamp offset
    newOffset = Math.max(-ACTION_WIDTH * 2, Math.min(0, newOffset));
    
    setOffset(newOffset);
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    
    // Snap to revealed or hidden state
    if (offset < -SWIPE_THRESHOLD) {
      setOffset(-ACTION_WIDTH);
      setIsRevealed(true);
    } else {
      setOffset(0);
      setIsRevealed(false);
    }
  };

  const reset = () => {
    setOffset(0);
    setIsRevealed(false);
  };

  return {
    offset,
    isRevealed,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    reset,
  };
}

// =============================================================================
// TouchBlockRow Component
// =============================================================================

/**
 * Mobile-optimized block row with swipe-to-reveal actions.
 * 
 * Features:
 * - Swipe left to reveal edit/delete buttons
 * - Larger touch targets
 * - Drag handle for reordering
 * - Compact layout for mobile screens
 */
export function TouchBlockRow({
  block,
  index: _index,
  canEdit,
  canDelete,
  canReorder,
  onEdit,
  onDelete,
  onDurationChange: _onDurationChange,
  isAutoEditingTitle = false,
  onTitleSave,
  onTitleEditDone,
  isUnderSection = false,
}: TouchBlockRowProps) {
  const t = useTranslations('planner');
  const { offset, isRevealed, handlers, reset } = useSwipeActions();
  const isOptimistic = block.id.startsWith('optimistic-');
  const effectiveCanEdit = canEdit && !isOptimistic;
  const effectiveCanDelete = canDelete && !isOptimistic;
  const effectiveCanReorder = canReorder && !isOptimistic;

  // Inline title editing for section headers
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(block.title ?? '');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const isSection = block.blockType === 'section';

  /* eslint-disable react-hooks/set-state-in-effect -- intentional sync from prop to local state */
  useEffect(() => {
    if (isAutoEditingTitle && isSection && !isOptimistic) {
      setIsEditingTitle(true);
      setEditTitleValue(block.title ?? '');
    }
  }, [isAutoEditingTitle, isSection, isOptimistic, block.title]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleSave = () => {
    const trimmed = editTitleValue.trim();
    if (trimmed && trimmed !== block.title && onTitleSave) {
      onTitleSave(block.id, trimmed);
    }
    setIsEditingTitle(false);
    onTitleEditDone?.();
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setEditTitleValue(block.title ?? '');
      setIsEditingTitle(false);
      onTitleEditDone?.();
    }
  };
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: block.id,
    disabled: !effectiveCanReorder,
  });

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const meta = blockMeta[block.blockType];
  const title = block.blockType === 'game' 
    ? block.game?.title ?? t('blockTypes.game')
    : block.title ?? t(meta.labelKey);

  const handleEdit = () => {
    reset();
    onEdit();
  };

  const handleDelete = () => {
    reset();
    onDelete();
  };

  // Section blocks render as compact header rows
  if (isSection) {
    return (
      <li
        ref={setNodeRef}
        style={sortableStyle}
        className={cn(
          'flex items-center gap-3 rounded-lg border-b border-border/40 bg-muted/30 px-3 py-2 transition',
          'mt-3 first:mt-0',
          isDragging && 'z-10 shadow-lg',
          isOptimistic && 'animate-pulse opacity-75'
        )}
      >
        {effectiveCanReorder && (
          <button
            {...attributes}
            {...listeners}
            className="touch-none text-muted-foreground/60"
            aria-label={t('dragToSort')}
          >
            <GripVerticalIcon />
          </button>
        )}
        <span className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', meta.className)}>
          <meta.Icon />
        </span>
        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            value={editTitleValue}
            onChange={(e) => setEditTitleValue(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={handleTitleKeyDown}
            className="flex-1 rounded border border-border bg-background px-2 py-0.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder={t('sectionTitlePlaceholder')}
          />
        ) : (
          <span
            className="flex-1 text-sm font-semibold text-foreground truncate"
            onDoubleClick={() => effectiveCanEdit && !isOptimistic && setIsEditingTitle(true)}
          >{title}</span>
        )}
        {isOptimistic && (
          <span className="text-xs text-muted-foreground">{t('pendingAdd')}</span>
        )}
        {effectiveCanDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="text-muted-foreground/60 hover:text-destructive"
            aria-label={t('deleteBlock')}
          >
            <Trash2Icon />
          </button>
        )}
      </li>
    );
  }

  return (
    <li
      ref={setNodeRef}
      style={sortableStyle}
      className={cn(
        'relative overflow-hidden rounded-xl',
        isDragging && 'z-10 shadow-lg',
        isOptimistic && 'animate-pulse opacity-75',
        isUnderSection && 'ml-6 border-l-2 border-l-emerald-300/40 -mt-1'
      )}
    >
      {/* Swipe action buttons (revealed on swipe) */}
      <div className="absolute inset-y-0 right-0 flex">
        {effectiveCanEdit && (
          <button
            type="button"
            onClick={handleEdit}
            className={cn(
              'flex w-[70px] items-center justify-center bg-primary text-primary-foreground',
              'transition-opacity',
              isRevealed ? 'opacity-100' : 'opacity-0'
            )}
            aria-label={t('editBlock')}
          >
            <PencilIcon />
          </button>
        )}
        {effectiveCanDelete && (
          <button
            type="button"
            onClick={handleDelete}
            className={cn(
              'flex w-[70px] items-center justify-center bg-destructive text-destructive-foreground',
              'transition-opacity',
              isRevealed ? 'opacity-100' : 'opacity-0'
            )}
            aria-label={t('deleteBlock')}
          >
            <Trash2Icon />
          </button>
        )}
      </div>

      {/* Main content (slides on swipe) */}
      <div
        {...handlers}
        style={{ transform: `translateX(${offset}px)` }}
        className={cn(
          'relative flex items-center gap-3 border border-border/60 bg-card p-3 transition-transform',
          'rounded-xl',
          isDragging && 'ring-2 ring-primary/30'
        )}
      >
        {/* Drag handle */}
        {canReorder && (
          <button
            {...attributes}
            {...listeners}
            className={cn(
              'flex h-10 w-8 flex-shrink-0 touch-none items-center justify-center',
              'rounded-lg text-muted-foreground/60',
              'active:bg-muted active:text-foreground'
            )}
            aria-label={t('dragToSort')}
          >
            <GripVerticalIcon />
          </button>
        )}

        {/* Block content */}
        <div className="min-w-0 flex-1">
          {isOptimistic && (
            <div className="mb-0.5 text-xs text-muted-foreground">{t('pendingAdd')}</div>
          )}
          {/* Title row */}
          <div className="flex items-center gap-2">
            <span className={cn(
              'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              meta.className
            )}>
              <meta.Icon />
              <span className="hidden sm:inline">{t(meta.labelKey)}</span>
            </span>
            <span className="truncate font-medium text-foreground">{title}</span>
            {block.isOptional && (
              <Badge variant="outline" size="sm" className="flex-shrink-0">
                {t('optional')}
              </Badge>
            )}
          </div>

          {/* Subtitle */}
          {(block.notes ?? block.game?.shortDescription) && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {block.notes ?? block.game?.shortDescription}
            </p>
          )}
        </div>

        {/* Duration */}
        <div className="flex flex-shrink-0 items-center gap-1 text-sm text-muted-foreground">
          <ClockIcon />
          <span className="tabular-nums">{block.durationMinutes ?? 0}</span>
          <span className="hidden sm:inline">min</span>
        </div>

        {/* Desktop-only action buttons */}
        <div className="hidden items-center gap-1 sm:flex">
          {effectiveCanEdit && (
            <button
              type="button"
              onClick={onEdit}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg',
                'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              aria-label={t('editBlock')}
            >
              <PencilIcon />
            </button>
          )}
          {effectiveCanDelete && (
            <button
              type="button"
              onClick={onDelete}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg',
                'text-muted-foreground hover:bg-muted hover:text-destructive'
              )}
              aria-label={t('deleteBlock')}
            >
              <Trash2Icon />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

// =============================================================================
// Export as default for lazy loading
// =============================================================================

export default TouchBlockRow;
