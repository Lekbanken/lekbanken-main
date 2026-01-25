'use client';

import { cn } from '@/lib/utils';
import { type WizardStep, WIZARD_STEP_LABELS, getStepIndex } from './types';

interface WizardStepNavProps {
  currentStep: WizardStep;
  steps: WizardStep[];
  onStepClick?: (step: WizardStep) => void;
  /** Whether navigation is allowed (e.g., disabled during save) */
  disabled?: boolean;
}

export function WizardStepNav({
  currentStep,
  steps,
  onStepClick,
  disabled = false,
}: WizardStepNavProps) {
  const currentIndex = getStepIndex(currentStep);

  return (
    <nav aria-label="Wizard steps" className="w-full">
      {/* Mobile: Compact step indicator */}
      <div className="flex items-center justify-between sm:hidden">
        <span className="text-sm font-medium text-foreground">
          Steg {currentIndex + 1} av {steps.length}
        </span>
        <span className="text-sm text-muted-foreground">
          {WIZARD_STEP_LABELS[currentStep]}
        </span>
      </div>

      {/* Desktop: Full step navigation */}
      <ol className="hidden sm:flex items-center gap-2">
        {steps.map((step, index) => {
          const isActive = step === currentStep;
          const isCompleted = index < currentIndex;
          const isClickable = !disabled && onStepClick;

          return (
            <li key={step} className="flex items-center">
              <button
                type="button"
                onClick={() => isClickable && onStepClick(step)}
                disabled={disabled}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive && 'bg-primary text-primary-foreground',
                  isCompleted && !isActive && 'text-primary hover:bg-primary/10',
                  !isActive && !isCompleted && 'text-muted-foreground hover:bg-muted',
                  disabled && 'cursor-not-allowed opacity-50'
                )}
                aria-current={isActive ? 'step' : undefined}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                    isActive && 'bg-primary-foreground/20',
                    isCompleted && !isActive && 'bg-primary/20',
                    !isActive && !isCompleted && 'bg-muted-foreground/20'
                  )}
                >
                  {isCompleted ? (
                    <CheckIcon className="h-3.5 w-3.5" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="hidden lg:inline">{WIZARD_STEP_LABELS[step]}</span>
              </button>
              {index < steps.length - 1 && (
                <ChevronIcon className="mx-1 h-4 w-4 text-muted-foreground/50" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
