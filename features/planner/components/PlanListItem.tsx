"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import type { PlannerPlan, PlannerStatus, PlannerVisibility } from "@/types/planner";

interface PlanListItemProps {
  plan: PlannerPlan;
  isActive: boolean;
  onClick: () => void;
}

const statusLabels: Record<PlannerStatus, string> = {
  draft: "Utkast",
  published: "Publicerad",
  modified: "Ändrad",
  archived: "Arkiverad",
};

const statusBadgeVariants: Record<PlannerStatus, "warning" | "success" | "primary"> = {
  draft: "warning",
  published: "success",
  modified: "primary",
  archived: "warning",
};

const visibilityLabels: Record<PlannerVisibility, string> = {
  private: "Privat",
  tenant: "Organisation",
  public: "Publik",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

export function PlanListItem({ plan, isActive, onClick }: PlanListItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start justify-between rounded-xl border p-4 text-left transition",
        isActive
          ? "border-primary/50 bg-primary/5 shadow-sm"
          : "border-border/60 bg-card hover:border-primary/30 hover:bg-muted/40"
      )}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{plan.name || "Namnlös plan"}</span>
          <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant={statusBadgeVariants[plan.status]} size="sm">
            {statusLabels[plan.status]}
          </Badge>
          <Badge variant="outline" size="sm">
            {visibilityLabels[plan.visibility]}
          </Badge>
          <span>{plan.blocks.length} block</span>
          <span>{plan.totalTimeMinutes ?? 0} min</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">{formatDate(plan.updatedAt)}</span>
    </button>
  );
}
