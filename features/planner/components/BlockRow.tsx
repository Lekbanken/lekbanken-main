"use client";

import { useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
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

const blockMeta: Record<
  PlannerBlock["blockType"],
  { label: string; className: string; Icon: () => ReactElement }
> = {
  game: {
    label: "Lek",
    className: "bg-primary/10 text-primary",
    Icon: GamepadIcon,
  },
  pause: {
    label: "Paus",
    className: "bg-amber-500/10 text-amber-600",
    Icon: PauseIcon,
  },
  preparation: {
    label: "Förberedelse",
    className: "bg-indigo-500/10 text-indigo-600",
    Icon: ClipboardIcon,
  },
  custom: {
    label: "Notis",
    className: "bg-slate-500/10 text-slate-600",
    Icon: NoteIcon,
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
}

function formatEnergyLevel(value?: string | null) {
  if (!value) return null;
  const map: Record<string, string> = {
    low: "Låg",
    medium: "Medel",
    high: "Hög",
  };
  return map[value] ?? value;
}

function formatLocationType(value?: string | null) {
  if (!value) return null;
  const map: Record<string, string> = {
    indoor: "Inne",
    outdoor: "Ute",
    mixed: "Inne/ute",
  };
  return map[value] ?? value;
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
}: BlockRowProps) {
  const t = useTranslations('planner');
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [durationValue, setDurationValue] = useState(String(block.durationMinutes ?? 15));

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    disabled: !canReorder,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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

  const meta = blockMeta[block.blockType];
  const isGame = block.blockType === "game" && block.game;
  const title =
    block.blockType === "game" ? block.game?.title ?? "Lek" : block.title ?? meta.label;
  const energyLabel = formatEnergyLevel(block.game?.energyLevel);
  const locationLabel = formatLocationType(block.game?.locationType);

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-xl border border-border/60 bg-card p-4 transition",
        isDragging ? "shadow-lg ring-1 ring-primary/30" : "hover:border-primary/30"
      )}
    >
      <div className="flex flex-wrap items-start gap-4">
        {canReorder ? (
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
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium", meta.className)}>
                <meta.Icon />
                {meta.label}
              </span>
              {block.isOptional && (
                <Badge variant="outline" size="sm">
                  Valfri
                </Badge>
              )}
            </div>
            <div>
              <p className="font-semibold text-foreground">{title}</p>
              {block.notes ? (
                <p className="text-sm text-muted-foreground">{block.notes}</p>
              ) : block.game?.shortDescription ? (
                <p className="text-sm text-muted-foreground">{block.game.shortDescription}</p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ClockIcon />
              {isEditingDuration && canEdit ? (
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
                  onClick={() => canEdit && setIsEditingDuration(true)}
                  className={cn(
                    "text-sm tabular-nums",
                    canEdit ? "hover:text-primary hover:underline" : "cursor-default"
                  )}
                  disabled={!canEdit}
                >
                  {block.durationMinutes ?? 0} min
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {canEdit && (
                <Tooltip content="Redigera block">
                  <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0">
                    <PencilIcon />
                  </Button>
                </Tooltip>
              )}
              {canDelete && (
                <Tooltip content="Ta bort block">
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

      {isGame && (energyLabel || locationLabel) ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {energyLabel && (
            <Badge variant="secondary" size="sm">
              Energi: {energyLabel}
            </Badge>
          )}
          {locationLabel && (
            <Badge variant="secondary" size="sm">
              Plats: {locationLabel}
            </Badge>
          )}
        </div>
      ) : null}
    </li>
  );
}
