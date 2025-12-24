'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { ContentPhase, ContentStep } from '@/types/lobby';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  HandRaisedIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  FlagIcon,
} from '@heroicons/react/24/solid';

// ============================================================================
// Types
// ============================================================================

export interface ContentPreviewSectionProps {
  /** Content phases with steps */
  phases: ContentPhase[];
  /** Called when back is clicked */
  onBack?: () => void;
  /** Called when a step is clicked */
  onStepClick?: (step: ContentStep) => void;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Step Type Icons
// ============================================================================

const STEP_ICONS: Record<ContentStep['type'], React.ElementType> = {
  intro: DocumentTextIcon,
  activity: HandRaisedIcon,
  decision: ChatBubbleLeftRightIcon,
  reveal: SparklesIcon,
  outro: FlagIcon,
};

const STEP_LABELS: Record<ContentStep['type'], string> = {
  intro: 'Introduction',
  activity: 'Activity',
  decision: 'Decision',
  reveal: 'Reveal',
  outro: 'Conclusion',
};

// ============================================================================
// StepCard
// ============================================================================

interface StepCardProps {
  step: ContentStep;
  index: number;
  onClick?: () => void;
}

function StepCard({ step, index, onClick }: StepCardProps) {
  const Icon = STEP_ICONS[step.type];
  const hasIssues = step.issues && step.issues.length > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-lg border bg-surface-primary',
        'transition-all hover:shadow-sm hover:border-primary/30',
        'focus:outline-none focus:ring-2 focus:ring-primary/50',
        hasIssues && 'border-warning/50'
      )}
    >
      {/* Step number */}
      <div className={cn(
        'flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium',
        step.isReady ? 'bg-success/10 text-success' : 'bg-surface-secondary text-foreground-secondary'
      )}>
        {index + 1}
      </div>

      {/* Step info */}
      <div className="flex-1 min-w-0 text-left">
        <div className="font-medium text-foreground truncate">
          {step.title}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Icon className="h-3.5 w-3.5 text-foreground-secondary" />
          <span className="text-sm text-foreground-secondary">
            {STEP_LABELS[step.type]}
          </span>
        </div>
      </div>

      {/* Status */}
      <div className="flex-shrink-0">
        {hasIssues ? (
          <ExclamationTriangleIcon className="h-5 w-5 text-warning" />
        ) : step.isReady ? (
          <CheckCircleIcon className="h-5 w-5 text-success" />
        ) : (
          <span className="h-5 w-5 rounded-full border-2 border-foreground-secondary" />
        )}
      </div>
    </button>
  );
}

// ============================================================================
// PhaseGroup
// ============================================================================

interface PhaseGroupProps {
  phase: ContentPhase;
  phaseIndex: number;
  onStepClick?: (step: ContentStep) => void;
}

function PhaseGroup({ phase, phaseIndex, onStepClick }: PhaseGroupProps) {
  const readySteps = phase.steps.filter(s => s.isReady).length;
  const totalSteps = phase.steps.length;
  const allReady = readySteps === totalSteps;

  return (
    <div className="space-y-2">
      {/* Phase header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <span className="text-sm text-foreground-secondary">Phase {phaseIndex + 1}:</span>
          {phase.title}
        </h3>
        <Badge variant={allReady ? 'success' : 'secondary'} size="sm">
          {readySteps}/{totalSteps}
        </Badge>
      </div>

      {/* Steps */}
      <div className="space-y-1.5 pl-2 border-l-2 border-border ml-2">
        {phase.steps.map((step, stepIndex) => (
          <StepCard
            key={step.id}
            step={step}
            index={stepIndex}
            onClick={() => onStepClick?.(step)}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// ContentPreviewSection Component
// ============================================================================

export const ContentPreviewSection = forwardRef<HTMLDivElement, ContentPreviewSectionProps>(
  (
    {
      phases,
      onBack,
      onStepClick,
      className,
    },
    ref
  ) => {
    // Calculate stats
    const totalSteps = phases.reduce((sum, p) => sum + p.steps.length, 0);
    const readySteps = phases.reduce(
      (sum, p) => sum + p.steps.filter(s => s.isReady).length,
      0
    );
    const issueCount = phases.reduce(
      (sum, p) => sum + p.steps.reduce((s, step) => s + (step.issues?.length ?? 0), 0),
      0
    );

    return (
      <div ref={ref} className={cn('max-w-xl mx-auto', className)}>
        {/* Header with back button */}
        <div className="flex items-center gap-3 mb-6">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 -ml-2 rounded-lg hover:bg-surface-secondary transition-colors"
              aria-label="Go back"
            >
              <ChevronLeftIcon className="h-5 w-5 text-foreground" />
            </button>
          )}
          <h1 className="text-xl font-bold text-foreground flex-1">Content Preview</h1>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-6 text-sm text-foreground-secondary">
          <span>{phases.length} phases</span>
          <span>•</span>
          <span>{totalSteps} steps</span>
          <span>•</span>
          {issueCount > 0 ? (
            <span className="flex items-center gap-1.5 text-warning">
              <ExclamationTriangleIcon className="h-4 w-4" />
              {issueCount} issues
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-success">
              <CheckCircleIcon className="h-4 w-4" />
              {readySteps}/{totalSteps} ready
            </span>
          )}
        </div>

        {/* Phases */}
        {phases.length > 0 ? (
          <div className="space-y-6">
            {phases.map((phase, index) => (
              <PhaseGroup
                key={phase.id}
                phase={phase}
                phaseIndex={index}
                onStepClick={onStepClick}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="h-16 w-16 mx-auto rounded-full bg-surface-secondary flex items-center justify-center mb-4">
              <DocumentTextIcon className="h-8 w-8 text-foreground-secondary" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">No content yet</h3>
            <p className="text-foreground-secondary text-sm">
              Add phases and steps to your session
            </p>
          </div>
        )}
      </div>
    );
  }
);

ContentPreviewSection.displayName = 'ContentPreviewSection';

export default ContentPreviewSection;
