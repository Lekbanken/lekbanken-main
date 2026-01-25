'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { type WizardStep, WIZARD_STEP_LABELS, getStepIndex, WIZARD_STEPS } from './types';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, CheckIcon } from '@heroicons/react/20/solid';

// =============================================================================
// Types
// =============================================================================

interface MobileWizardStepperProps {
  currentStep: WizardStep;
  steps?: WizardStep[];
  onStepClick?: (step: WizardStep) => void;
  /** Whether navigation is allowed */
  disabled?: boolean;
  /** Show step labels on mobile */
  showLabels?: boolean;
  className?: string;
}

// =============================================================================
// Mobile Wizard Stepper
// =============================================================================

/**
 * Mobile-optimized wizard stepper with:
 * - Progress dots
 * - Dropdown for quick navigation
 * - Compact design
 * 
 * @example
 * <MobileWizardStepper
 *   currentStep="bygg"
 *   onStepClick={goToStep}
 * />
 */
export function MobileWizardStepper({
  currentStep,
  steps = WIZARD_STEPS,
  onStepClick,
  disabled = false,
  showLabels = true,
  className,
}: MobileWizardStepperProps) {
  const t = useTranslations('planner.wizard.navigation');
  const tSteps = useTranslations('planner.wizard.steps');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentIndex = getStepIndex(currentStep);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  const handleStepSelect = (step: WizardStep) => {
    setDropdownOpen(false);
    onStepClick?.(step);
  };

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < steps.length - 1;

  const handlePrev = () => {
    if (canGoPrev && !disabled) {
      onStepClick?.(steps[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (canGoNext && !disabled) {
      onStepClick?.(steps[currentIndex + 1]);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Mobile Layout */}
      <div className="flex flex-col gap-3 sm:hidden">
        {/* Top row: Navigation + Current step */}
        <div className="flex items-center justify-between">
          {/* Prev button */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={!canGoPrev || disabled}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
              canGoPrev && !disabled
                ? 'bg-muted hover:bg-muted-foreground/20 text-foreground'
                : 'text-muted-foreground/30 cursor-not-allowed'
            )}
            aria-label={t('previousStep')}
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>

          {/* Current step dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => !disabled && setDropdownOpen(!dropdownOpen)}
              disabled={disabled}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                'bg-primary/10 text-primary hover:bg-primary/20',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {currentIndex + 1}
              </span>
              <span>{WIZARD_STEP_LABELS[currentStep]}</span>
              <ChevronDownIcon className={cn('h-4 w-4 transition-transform', dropdownOpen && 'rotate-180')} />
            </button>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <div className="absolute left-1/2 top-full z-50 mt-2 w-48 -translate-x-1/2 rounded-lg border border-border bg-card shadow-lg">
                <ul className="py-1">
                  {steps.map((step, index) => {
                    const isActive = step === currentStep;
                    const isCompleted = index < currentIndex;

                    return (
                      <li key={step}>
                        <button
                          type="button"
                          onClick={() => handleStepSelect(step)}
                          className={cn(
                            'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                            isActive
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-foreground hover:bg-muted'
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold',
                              isActive && 'bg-primary text-primary-foreground',
                              isCompleted && !isActive && 'bg-primary/20 text-primary',
                              !isActive && !isCompleted && 'bg-muted-foreground/20 text-muted-foreground'
                            )}
                          >
                            {isCompleted ? (
                              <CheckIcon className="h-3 w-3" />
                            ) : (
                              index + 1
                            )}
                          </span>
                          <span>{WIZARD_STEP_LABELS[step]}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Next button */}
          <button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext || disabled}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
              canGoNext && !disabled
                ? 'bg-muted hover:bg-muted-foreground/20 text-foreground'
                : 'text-muted-foreground/30 cursor-not-allowed'
            )}
            aria-label={t('nextStep')}
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2">
          {steps.map((step, index) => {
            const isActive = step === currentStep;
            const isCompleted = index < currentIndex;

            return (
              <button
                key={step}
                type="button"
                onClick={() => !disabled && onStepClick?.(step)}
                disabled={disabled}
                className={cn(
                  'transition-all',
                  disabled && 'cursor-not-allowed'
                )}
                aria-label={t('goToStep', { stepName: tSteps(`${step}.title`) })}
                aria-current={isActive ? 'step' : undefined}
              >
                <span
                  className={cn(
                    'block rounded-full transition-all',
                    isActive && 'h-2.5 w-8 bg-primary',
                    isCompleted && !isActive && 'h-2.5 w-2.5 bg-primary/60',
                    !isActive && !isCompleted && 'h-2.5 w-2.5 bg-muted-foreground/30'
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Layout - Use existing WizardStepNav styles */}
      <nav aria-label="Wizard steps" className="hidden sm:block">
        <ol className="flex items-center justify-center gap-2">
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
                  {showLabels && (
                    <span className="hidden lg:inline">{WIZARD_STEP_LABELS[step]}</span>
                  )}
                </button>
                {index < steps.length - 1 && (
                  <ChevronRightIcon className="mx-1 h-4 w-4 text-muted-foreground/50" />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

// =============================================================================
// Progress Bar Variant
// =============================================================================

interface WizardProgressBarProps {
  currentStep: WizardStep;
  steps?: WizardStep[];
  className?: string;
}

/**
 * Simple progress bar showing wizard completion.
 * 
 * @example
 * <WizardProgressBar currentStep="granska" />
 */
export function WizardProgressBar({
  currentStep,
  steps = WIZARD_STEPS,
  className,
}: WizardProgressBarProps) {
  const currentIndex = getStepIndex(currentStep);
  const progress = ((currentIndex + 1) / steps.length) * 100;

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-1 text-xs text-muted-foreground">
        <span>{WIZARD_STEP_LABELS[currentStep]}</span>
        <span>{currentIndex + 1} / {steps.length}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
