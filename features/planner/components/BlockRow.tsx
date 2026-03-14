"use client";

import { useState, useRef, useEffect, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatEnergyLevel, formatEnvironment } from "@/lib/game-display";
import type { PlannerBlock } from "@/types/planner";

// Inline icons to avoid lucide-react dependency issues
const GripVerticalIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
);
const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
);
const Trash2Icon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
);
const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const GamepadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="2"/></svg>
);
const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></svg>
);
const ClipboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M4 6h16v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M9 11h6"/><path d="M9 15h6"/></svg>
);
const NoteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
);
const SectionIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h18"/><path d="M3 10h14"/><path d="M3 15h10"/></svg>
);
const SessionGameIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);

/** Style + icon config per block type (labels resolved via i18n) */
const blockStyles: Record<
  PlannerBlock["blockType"],
  { labelKey: string; className: string; Icon: () => ReactElement }
> = {
  game: {
    labelKey: "blockTypes.game",
    className: "bg-primary/10 text-primary",
    Icon: GamepadIcon,
  },
  pause: {
    labelKey: "blockTypes.pause",
    className: "bg-amber-500/10 text-amber-600",
    Icon: PauseIcon,
  },
  preparation: {
    labelKey: "blockTypes.preparation",
    className: "bg-indigo-500/10 text-indigo-600",
    Icon: ClipboardIcon,
  },
  custom: {
    labelKey: "blockTypes.custom",
    className: "bg-slate-500/10 text-slate-600",
    Icon: NoteIcon,
  },
  section: {
    labelKey: "blockTypes.section",
    className: "bg-emerald-500/10 text-emerald-600",
    Icon: SectionIcon,
  },
  session_game: {
    labelKey: "blockTypes.session_game",
    className: "bg-violet-500/10 text-violet-600",
    Icon: SessionGameIcon,
  },
};

interface BlockRowProps {
  block: PlannerBlock;
  index: number;
  canEdit: boolean;
  canDelete: boolean;
  canReorder: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDurationChange: (duration: number) => void;
  /** Trigger inline title editing (e.g. after creation) */
  isAutoEditingTitle?: boolean;
  onTitleSave?: (blockId: string, title: string) => void;
  onTitleEditDone?: () => void;
  /** Visual grouping: block appears under a section header */
  isUnderSection?: boolean;
}

/**
 * Maps locationType string to Environment type for formatter
 */
function mapLocationType(value?: string | null) {
  if (value === 'indoor') return 'indoor' as const;
  if (value === 'outdoor') return 'outdoor' as const;
  if (value === 'mixed' || value === 'both') return 'both' as const;
  return null;
}

export function BlockRow({
  block,
  index,
  canEdit,
  canDelete,
  canReorder,
  onEdit,
  onDelete,
  onDurationChange,
  isAutoEditingTitle = false,
  onTitleSave,
  onTitleEditDone,
  isUnderSection = false,
}: BlockRowProps) {
  const t = useTranslations('planner');
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [durationValue, setDurationValue] = useState(String(block.durationMinutes ?? 15));

  const style = blockStyles[block.blockType];
  const blockTypeLabel = t(style.labelKey);
  const isGame = block.blockType === "game" && block.game;
  const isSection = block.blockType === 'section';
  const isOptimistic = block.id.startsWith('optimistic-');
  // Disable editing on optimistic blocks (no real DB id yet)
  const effectiveCanEdit = canEdit && !isOptimistic;
  const effectiveCanDelete = canDelete && !isOptimistic;
  const effectiveCanReorder = canReorder && !isOptimistic;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    disabled: !effectiveCanReorder,
  });

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Inline title editing for section headers
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(block.title ?? '');
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Auto-start inline title editing (e.g. after section creation)
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

  const handleDurationBlur = () => {
    const parsed = parseInt(durationValue, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed !== block.durationMinutes) {
      onDurationChange(parsed);
    } else {
      setDurationValue(String(block.durationMinutes ?? 15));
    }
    setIsEditingDuration(false);
  };

  const handleDurationKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleDurationBlur();
    } else if (e.key === "Escape") {
      setDurationValue(String(block.durationMinutes ?? 15));
      setIsEditingDuration(false);
    }
  };
  const title =
    block.blockType === "game" ? block.game?.title ?? blockTypeLabel : block.title ?? blockTypeLabel;
  
  // Use centralized formatters
  const energyFormatted = formatEnergyLevel(
    block.game?.energyLevel as 'low' | 'medium' | 'high' | null | undefined
  );
  const locationFormatted = formatEnvironment(mapLocationType(block.game?.locationType));

  // Section blocks render as full-width header rows
  if (isSection) {
    return (
      <li
        ref={setNodeRef}
        style={dragStyle}
        className={cn(
          'group flex items-center gap-3 rounded-lg border-b border-border/40 bg-muted/30 px-4 py-2.5 transition',
          'mt-3 first:mt-0',
          isDragging ? 'shadow-lg ring-1 ring-primary/30' : 'hover:bg-muted/50',
          isOptimistic && 'animate-pulse opacity-75'
        )}
      >
        {effectiveCanReorder ? (
          <button
            {...attributes}
            {...listeners}
            className="text-muted-foreground/60 hover:text-muted-foreground active:cursor-grabbing"
            aria-label={t('dragToSort')}
          >
            <GripVerticalIcon />
          </button>
        ) : null}
        <span className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', style.className)}>
          <style.Icon />
        </span>
        {isEditingTitle ? (
          <Input
            ref={titleInputRef}
            value={editTitleValue}
            onChange={(e) => setEditTitleValue(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={handleTitleKeyDown}
            className="h-7 flex-1 text-sm font-semibold"
            placeholder={t('sectionTitlePlaceholder')}
          />
        ) : (
          <span className="flex-1 text-sm font-semibold text-foreground">
            {block.title ?? blockTypeLabel}
          </span>
        )}
        {isOptimistic && (
          <span className="text-xs text-muted-foreground">{t('pendingAdd')}</span>
        )}
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {effectiveCanEdit && (
            <Tooltip content={t('editBlock')}>
              <Button variant="ghost" size="sm" onClick={() => { setEditTitleValue(block.title ?? ''); setIsEditingTitle(true); }} className="h-7 w-7 p-0">
                <PencilIcon />
              </Button>
            </Tooltip>
          )}
          {effectiveCanDelete && (
            <Tooltip content={t('deleteBlock')}>
              <Button variant="ghost" size="sm" onClick={onDelete} className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                <Trash2Icon />
              </Button>
            </Tooltip>
          )}
        </div>
      </li>
    );
  }

  return (
    <li
      ref={setNodeRef}
      style={dragStyle}
      className={cn(
        "group rounded-xl border border-border/60 bg-card p-4 transition",
        isDragging ? "shadow-lg ring-1 ring-primary/30" : "hover:border-primary/30",
        isOptimistic && "animate-pulse opacity-75",
        isUnderSection && "ml-6 border-l-2 border-l-emerald-300/40 -mt-1"
      )}
    >
      {isOptimistic && (
        <div className="mb-1 text-xs text-muted-foreground">{t('pendingAdd')}</div>
      )}
      <div className="flex flex-wrap items-start gap-4">
        {effectiveCanReorder ? (
          <button
            {...attributes}
            {...listeners}
            className="mt-1 flex items-center gap-2 text-muted-foreground/60 hover:text-muted-foreground active:cursor-grabbing"
            aria-label={t('dragToSort')}
          >
            <GripVerticalIcon />
            <span className="text-xs font-medium">{index}</span>
          </button>
        ) : (
          <div className="mt-1 flex items-center gap-2 text-muted-foreground/60">
            <span className="text-xs font-medium">{index}</span>
          </div>
        )}

        <div className="flex flex-1 flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium", style.className)}>
                <style.Icon />
                {blockTypeLabel}
              </span>
              {block.isOptional && (
                <Badge variant="outline" size="sm">
                  {t('optional')}
                </Badge>
              )}
            </div>
            <p className="text-base font-semibold leading-snug text-foreground truncate">{title}</p>
            {/* Metadata: pills for energy/location, separate line-clamped description */}
            {isGame && (energyFormatted || locationFormatted) && (
              <div className="flex flex-wrap items-center gap-1.5">
                {energyFormatted && (
                  <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    {energyFormatted.labelShort}
                  </span>
                )}
                {locationFormatted && (
                  <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    {locationFormatted.labelShort}
                  </span>
                )}
              </div>
            )}
            {isGame && block.game?.shortDescription ? (
              <p className="line-clamp-1 text-sm text-muted-foreground">{block.game.shortDescription}</p>
            ) : block.notes ? (
              <p className="line-clamp-1 text-sm text-muted-foreground">{block.notes}</p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ClockIcon />
              {isEditingDuration && effectiveCanEdit ? (
                <Input
                  type="number"
                  min="1"
                  max="999"
                  value={durationValue}
                  onChange={(e) => setDurationValue(e.target.value)}
                  onBlur={handleDurationBlur}
                  onKeyDown={handleDurationKeyDown}
                  className="h-7 w-16 text-center text-sm"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => effectiveCanEdit && setIsEditingDuration(true)}
                  className={cn(
                    "text-sm tabular-nums",
                    effectiveCanEdit ? "hover:text-primary hover:underline" : "cursor-default"
                  )}
                  disabled={!effectiveCanEdit}
                >
                  {block.durationMinutes ?? 0} min
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {effectiveCanEdit && (
                <Tooltip content={t('editBlock')}>
                  <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0">
                    <PencilIcon />
                  </Button>
                </Tooltip>
              )}
              {effectiveCanDelete && (
                <Tooltip content={t('deleteBlock')}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDelete}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2Icon />
                  </Button>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
