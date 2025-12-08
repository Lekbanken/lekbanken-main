import { ClockIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import type { PlannerPlan } from "../types";

export function PlanOverview({ plan }: { plan: PlannerPlan }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Plan</p>
            <h1 className="text-xl font-bold text-foreground">{plan.name}</h1>
            {plan.description ? <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p> : null}
          </div>
          <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <ClockIcon className="h-4 w-4" />
            {plan.totalTimeMinutes ?? 0} min
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Squares2X2Icon className="h-4 w-4 text-muted-foreground" />
          Block
        </div>
        {plan.blocks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
            Inga block i denna plan ännu.
          </div>
        ) : (
          plan.blocks.map((block) => (
            <div key={block.id} className="rounded-xl border border-border/60 bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {block.blockType === "game" ? block.game?.title ?? "Lek" : block.title ?? "Block"}
                  </p>
                  {block.notes ? <p className="text-xs text-muted-foreground">{block.notes}</p> : null}
                </div>
                <span className="text-xs text-muted-foreground">
                  {block.durationMinutes ?? block.game?.durationMinutes ?? 0} min
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
