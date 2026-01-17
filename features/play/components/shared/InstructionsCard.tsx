'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { RunStep } from '@/features/play/types';

// ============================================================================
// TYPES
// ============================================================================

export interface InstructionsCardProps {
  steps: RunStep[];
  currentStepIndex?: number;
  completedStepIds?: string[];
  onStepComplete?: (stepId: string) => void;
  onStepClick?: (index: number) => void;
  collapsed?: boolean;
  showStepNumbers?: boolean;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function InstructionsCard({
  steps,
  currentStepIndex = 0,
  completedStepIds = [],
  onStepComplete,
  onStepClick,
  collapsed: initialCollapsed = false,
  showStepNumbers = true,
  className,
}: InstructionsCardProps) {
  const t = useTranslations('play.instructionsCard');
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  if (steps.length === 0) {
    return null;
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="py-3">
        <button
          type="button"
          className="flex w-full cursor-pointer items-center justify-between text-left"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <CardTitle className="flex items-center gap-2 text-base">
            <span>📖</span>
            {t('title')}
            <span className="text-sm font-normal text-muted-foreground">
              ({completedStepIds.length}/{steps.length})
            </span>
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-8 w-8 px-0">
            {isCollapsed ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronUpIcon className="h-4 w-4" />
            )}
          </Button>
        </button>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="space-y-2 pt-0">
          {steps.map((step, index) => {
            const isCompleted = completedStepIds.includes(step.id);
            const isCurrent = index === currentStepIndex;

            return (
              <div
                key={step.id}
                className={cn(
                  'group relative flex gap-3 rounded-lg border p-3 transition-all',
                  isCurrent && !isCompleted && 'border-primary bg-primary/5 ring-1 ring-primary/20',
                  isCompleted && 'border-border/40 bg-muted/30',
                  !isCurrent && !isCompleted && 'border-border/60 hover:border-border',
                  onStepClick && 'cursor-pointer'
                )}
                onClick={() => onStepClick?.(index)}
              >
                {/* Step number or check */}
                {showStepNumbers && (
                  <div
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                      isCompleted && 'bg-primary text-primary-foreground',
                      isCurrent && !isCompleted && 'bg-primary text-primary-foreground',
                      !isCurrent && !isCompleted && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircleIcon className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4
                    className={cn(
                      'font-medium',
                      isCompleted && 'text-muted-foreground line-through'
                    )}
                  >
                    {step.title}
                  </h4>
                  {step.description && (
                    <p
                      className={cn(
                        'mt-1 text-sm',
                        isCompleted ? 'text-muted-foreground/70' : 'text-muted-foreground'
                      )}
                    >
                      {step.description}
                    </p>
                  )}

                  {/* Duration badge */}
                  {step.durationMinutes > 0 && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      ⏱️ {step.durationMinutes} min
                    </span>
                  )}
                </div>

                {/* Complete button (on hover or touch) */}
                {onStepComplete && !isCompleted && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStepComplete(step.id);
                    }}
                  >
                    Klar
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}
