import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type NavigationControlsProps = {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onEnd?: () => void;
  progress?: number; // 0-1
  /** When true, the Next button is disabled (e.g. session not started) */
  nextDisabled?: boolean;
  /** Tooltip shown when Next is disabled */
  nextDisabledReason?: string;
};

export function NavigationControls({ current, total, onPrev, onNext, onEnd, progress, nextDisabled, nextDisabledReason }: NavigationControlsProps) {
  const t = useTranslations('play.navigationControls');
  const isFirst = current === 0;
  const isLast = current === total - 1;

  return (
    <div 
      className="fixed inset-x-0 z-30 px-4 lg:bottom-6" 
      style={{ bottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 rounded-2xl border border-border/50 bg-card/98 p-4 shadow-xl backdrop-blur-xl">
        {/* Progress section */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {/* Step dots */}
            <div className="flex items-center gap-1">
              {Array.from({ length: total }).map((_, i) => (
                <span
                  key={i}
                  className={`h-2 w-2 rounded-full transition-all ${
                    i === current 
                      ? "bg-primary scale-125" 
                      : i < current 
                        ? "bg-primary/40" 
                        : "bg-muted"
                  }`}
                  aria-hidden
                />
              ))}
            </div>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {t('stepOf', { current: current + 1, total })}
          </span>
        </div>

        {/* Progress bar */}
        {typeof progress === "number" && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${Math.min(1, Math.max(0, progress)) * 100}%` }}
              aria-hidden
            />
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="lg" 
            onClick={onPrev} 
            disabled={isFirst}
            className="h-12 flex-1 gap-2 text-sm font-medium transition-all active:scale-95 disabled:opacity-40"
          >
            <ChevronLeftIcon className="h-4 w-4" aria-hidden />
            {t('previous')}
          </Button>
          {!isLast ? (
            <div className="flex-1 relative">
              <Button 
                size="lg" 
                onClick={onNext}
                disabled={nextDisabled}
                className="h-12 w-full gap-2 text-sm font-medium shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {t('next')}
                <ChevronRightIcon className="h-4 w-4" aria-hidden />
              </Button>
              {nextDisabled && nextDisabledReason && (
                <p className="mt-1 text-center text-[10px] text-muted-foreground">{nextDisabledReason}</p>
              )}
            </div>
          ) : (
            <Button 
              size="lg" 
              onClick={onEnd}
              className="h-12 flex-1 gap-2 bg-green-600 text-sm font-medium shadow-lg shadow-green-600/20 transition-all hover:bg-green-700 active:scale-95"
            >
              <CheckIcon className="h-4 w-4" aria-hidden />
              {t('finish')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
