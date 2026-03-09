"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EyeIcon, PencilSquareIcon, PlayIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import type { PlannerPlan, PlannerStatus } from "@/types/planner";
import type { ActiveRun } from "@/features/play/api";

interface PlanListItemProps {
  plan: PlannerPlan;
  isActive: boolean;
  onClick: () => void;
  onEdit?: () => void;
  /** Active run for this plan (if any). Shows progress + "Fortsätt" */
  activeRun?: ActiveRun | null;
  /** Called when user clicks "Fortsätt" or "Kör" */
  onPlay?: (planId: string) => void;
}

const statusBadgeVariants: Record<PlannerStatus, "warning" | "success" | "primary"> = {
  draft: "warning",
  published: "success",
  modified: "primary",
  archived: "warning",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

export const PlanListItem = memo(function PlanListItem({ plan, isActive, onClick, onEdit, activeRun, onPlay }: PlanListItemProps) {
  const t = useTranslations("planner");

  const hasActiveRun = !!activeRun;
  const progressLabel = hasActiveRun && activeRun.totalSteps > 0
    ? t('runStatus.progress', { current: activeRun.currentStepIndex + 1, total: activeRun.totalSteps })
    : null;

  return (
    <div
      className={cn(
        "group flex w-full items-start justify-between rounded-xl border p-3 sm:p-4 text-left transition",
        isActive
          ? "border-primary/50 bg-primary/5 shadow-sm"
          : "border-border/60 bg-card hover:border-primary/30 hover:bg-muted/40"
      )}
    >
      {/* Main content - clickable for preview */}
      <button
        type="button"
        onClick={onClick}
        className="flex-1 min-w-0 text-left"
      >
        <div className="space-y-2">
          <span className="font-semibold text-foreground line-clamp-1">
            {plan.name || t("untitledPlan")}
          </span>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={statusBadgeVariants[plan.status]} size="sm">
              {t(`statusLabels.${plan.status}`)}
            </Badge>
            <Badge variant="outline" size="sm">
              {t(`wizard.visibility.${plan.visibility}`)}
            </Badge>
            <span>{plan.blocks.length} block</span>
            <span>{plan.totalTimeMinutes ?? 0} min</span>
            {hasActiveRun && (
              <Badge variant="success" size="sm">
                {t('runStatus.inProgress')}{progressLabel && ` · ${progressLabel}`}
              </Badge>
            )}
          </div>
        </div>
      </button>

      {/* Right side: date + action icons + resume */}
      <div className="flex flex-col items-end gap-2 ml-3 shrink-0">
        <span className="text-xs text-muted-foreground">{formatDate(plan.updatedAt)}</span>

        {/* Resume / Play button */}
        {onPlay && plan.status !== 'draft' && (
          <Button
            size="sm"
            variant={hasActiveRun ? 'default' : 'secondary'}
            onClick={(e) => {
              e.stopPropagation();
              onPlay(plan.id);
            }}
            className="gap-1"
          >
            <PlayIcon className="h-3.5 w-3.5" />
            {hasActiveRun ? t('actions.resume') : t('actions.play')}
          </Button>
        )}

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={t('actions.preview')}
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title={t('actions.edit')}
            >
              <PencilSquareIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
