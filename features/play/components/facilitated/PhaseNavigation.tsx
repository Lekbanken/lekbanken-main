'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface PhaseNavigationProps {
  currentPhaseIndex: number;
  totalPhases: number;
  onPrevious: () => void;
  onNext: () => void;
  onComplete?: () => void;
  isFirstPhase?: boolean;
  isLastPhase?: boolean;
  disabled?: boolean;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PhaseNavigation({
  currentPhaseIndex,
  totalPhases,
  onPrevious,
  onNext,
  onComplete,
  isFirstPhase,
  isLastPhase,
  disabled = false,
  className,
}: PhaseNavigationProps) {
  const t = useTranslations('play.phaseNavigation');
  const atFirst = isFirstPhase ?? currentPhaseIndex === 0;
  const atLast = isLastPhase ?? currentPhaseIndex === totalPhases - 1;

  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      {/* Previous button */}
      <Button
        variant="outline"
        size="lg"
        onClick={onPrevious}
        disabled={atFirst || disabled}
        className="gap-2"
      >
        <ChevronLeftIcon className="h-5 w-5" />
        <span className="hidden sm:inline">{t('previous')}</span>
      </Button>

      {/* Phase counter */}
      <div className="text-center">
        <span className="font-mono text-lg font-semibold text-foreground">
          {currentPhaseIndex + 1}
        </span>
        <span className="mx-1 text-muted-foreground">/</span>
        <span className="font-mono text-muted-foreground">{totalPhases}</span>
      </div>

      {/* Next / Complete button */}
      {atLast ? (
        <Button
          variant="primary"
          size="lg"
          onClick={onComplete}
          disabled={disabled}
          className="gap-2"
        >
          <CheckCircleIcon className="h-5 w-5" />
          <span className="hidden sm:inline">{t('finish')}</span>
        </Button>
      ) : (
        <Button
          variant="primary"
          size="lg"
          onClick={onNext}
          disabled={disabled}
          className="gap-2"
        >
          <span className="hidden sm:inline">{t('next')}</span>
          <ChevronRightIcon className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
