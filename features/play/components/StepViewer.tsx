import { ClockIcon, CubeIcon, ShieldExclamationIcon } from "@heroicons/react/24/outline";
import type { Step } from "../types";

type StepViewerProps = {
  step: Step;
  index: number;
  total: number;
};

export function StepViewer({ step, index, total }: StepViewerProps) {
  return (
    <article className="space-y-5 rounded-3xl border border-border/60 bg-card p-5 shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {index + 1}
            </span>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              Steg {index + 1} av {total}
            </p>
          </div>
          <h2 className="text-xl font-semibold text-foreground sm:text-2xl">{step.title}</h2>
        </div>
        {step.durationMinutes ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
            <ClockIcon className="h-3.5 w-3.5" aria-hidden />
            {step.durationMinutes} min
          </span>
        ) : null}
      </div>

      <p className="text-base leading-relaxed text-foreground sm:text-lg">{step.description}</p>

      {step.materials && step.materials.length > 0 && (
        <div className="space-y-2.5 rounded-2xl bg-muted/40 p-4">
          <div className="flex items-center gap-2">
            <CubeIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Material</p>
          </div>
          <ul className="space-y-1.5 pl-6 text-sm text-foreground">
            {step.materials.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {step.safety && (
        <div className="space-y-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <div className="flex items-center gap-2">
            <ShieldExclamationIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-amber-700 dark:text-amber-300">Säkerhet</p>
          </div>
          <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-100">{step.safety}</p>
        </div>
      )}
    </article>
  );
}
