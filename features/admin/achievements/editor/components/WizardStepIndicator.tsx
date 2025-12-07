'use client';

import { CheckIcon } from '@heroicons/react/24/solid';

export type WizardStep = {
  id: number;
  name: string;
  description?: string;
};

type WizardStepIndicatorProps = {
  steps: WizardStep[];
  currentStep: number;
  onStepClick?: (stepId: number) => void;
  allowClickPrevious?: boolean;
};

/**
 * Visual step indicator for the badge builder wizard.
 * Shows progress through: Lagerval → Tema & Färger → Metadata → Publicering
 */
export function WizardStepIndicator({
  steps,
  currentStep,
  onStepClick,
  allowClickPrevious = true,
}: WizardStepIndicatorProps) {
  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="flex items-center justify-between">
        {steps.map((step, stepIdx) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isClickable = allowClickPrevious && step.id < currentStep;

          return (
            <li
              key={step.id}
              className={`relative flex-1 ${stepIdx !== steps.length - 1 ? 'pr-4' : ''}`}
            >
              {/* Connector line */}
              {stepIdx !== steps.length - 1 && (
                <div
                  className="absolute top-4 left-[calc(50%+16px)] right-0 h-0.5 -translate-y-1/2"
                  aria-hidden="true"
                >
                  <div
                    className={`h-full transition-colors duration-300 ${
                      isCompleted ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                </div>
              )}

              {/* Step circle and label */}
              <button
                type="button"
                onClick={() => isClickable && onStepClick?.(step.id)}
                disabled={!isClickable}
                className={`
                  group relative flex flex-col items-center
                  ${isClickable ? 'cursor-pointer' : 'cursor-default'}
                `}
              >
                {/* Circle */}
                <span
                  className={`
                    relative z-10 flex h-8 w-8 items-center justify-center rounded-full 
                    text-sm font-semibold transition-all duration-300
                    ${
                      isCompleted
                        ? 'bg-primary text-white shadow-md'
                        : isCurrent
                        ? 'bg-primary/10 text-primary ring-2 ring-primary ring-offset-2'
                        : 'bg-muted text-muted-foreground'
                    }
                    ${isClickable ? 'group-hover:scale-110 group-hover:shadow-lg' : ''}
                  `}
                >
                  {isCompleted ? (
                    <CheckIcon className="h-4 w-4" />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </span>

                {/* Label */}
                <span
                  className={`
                    mt-2 text-xs font-medium transition-colors
                    ${isCurrent ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'}
                  `}
                >
                  {step.name}
                </span>

                {/* Description (optional, shown on current) */}
                {step.description && isCurrent && (
                  <span className="mt-0.5 text-[10px] text-muted-foreground">
                    {step.description}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Default wizard steps for the badge builder
 */
export const BADGE_WIZARD_STEPS: WizardStep[] = [
  { id: 1, name: 'Lagerval', description: 'Välj form och dekorationer' },
  { id: 2, name: 'Tema & Färger', description: 'Anpassa utseendet' },
  { id: 3, name: 'Metadata', description: 'Titel och beskrivning' },
  { id: 4, name: 'Publicering', description: 'Granska och publicera' },
];
