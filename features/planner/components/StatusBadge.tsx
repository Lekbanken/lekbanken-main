"use client";

import { cn } from "@/lib/utils";
import type { PlannerStatus } from "@/types/planner";

interface StatusBadgeProps {
  status: PlannerStatus;
  size?: "sm" | "md";
  className?: string;
}

const STATUS_CONFIG: Record<PlannerStatus, { label: string; color: string; dot: string }> = {
  draft: {
    label: "Utkast",
    color: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
  },
  published: {
    label: "Publicerad",
    color: "bg-green-50 text-green-700 border-green-200",
    dot: "bg-green-500",
  },
  modified: {
    label: "Ändrad",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  archived: {
    label: "Arkiverad",
    color: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-400",
  },
};

export function StatusBadge({ status, size = "md", className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        config.color,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}

/**
 * Minimal dot-only variant for lists
 */
export function StatusDot({ status, className }: { status: PlannerStatus; className?: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;

  return (
    <span className={cn("h-2 w-2 rounded-full", config.dot, className)} title={config.label} />
  );
}
