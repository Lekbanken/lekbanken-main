/**
 * StoryViewModal Component
 * 
 * Shows all steps with leader scripts as a scrollable narrative.
 * Helps the host preview the full game flow before or during a session.
 * 
 * Task 3.4 - Session Cockpit Architecture
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  XMarkIcon,
  BookOpenIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import type { CockpitStep } from '@/types/session-cockpit';

// =============================================================================
// Types
// =============================================================================

export interface StoryViewModalProps {
  /** Is the modal open? */
  open: boolean;
  /** Called when user closes the modal */
  onClose: () => void;
  /** All steps in the game */
  steps: CockpitStep[];
  /** Current step index (for highlighting) */
  currentStepIndex?: number;
  /** Session/game name */
  title?: string;
  /** Callback when user clicks to navigate to a step */
  onNavigateToStep?: (stepIndex: number) => void;
}

// =============================================================================
// StepCard Component
// =============================================================================

function StepCard({
  step,
  index,
  isCurrent,
  isPast,
  onNavigate,
}: {
  step: CockpitStep;
  index: number;
  isCurrent: boolean;
  isPast: boolean;
  onNavigate?: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(isCurrent);
  
  const hasLeaderScript = Boolean(step.leaderScript);
  
  return (
    <Card 
      className={cn(
        'overflow-hidden transition-all',
        isCurrent && 'ring-2 ring-primary shadow-lg',
        isPast && 'opacity-60'
      )}
    >
      {/* Header - always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
      >
        {/* Step number */}
        <div className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
          isCurrent 
            ? 'bg-primary text-primary-foreground' 
            : isPast 
              ? 'bg-muted text-muted-foreground' 
              : 'bg-primary/10 text-primary'
        )}>
          {index + 1}
        </div>
        
        {/* Title and meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-foreground truncate">
              {step.title || 'Namnlöst steg'}
            </h3>
            {isCurrent && (
              <Badge variant="primary" size="sm">Nu</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            {step.durationMinutes && (
              <span className="flex items-center gap-1">
                <ClockIcon className="h-3.5 w-3.5" />
                {step.durationMinutes} min
              </span>
            )}
            {hasLeaderScript && (
              <span className="flex items-center gap-1 text-amber-600">
                <DocumentTextIcon className="h-3.5 w-3.5" />
                Script
              </span>
            )}
          </div>
        </div>
        
        {/* Expand/collapse icon */}
        <div className="shrink-0 text-muted-foreground">
          {isExpanded ? (
            <ChevronUpIcon className="h-5 w-5" />
          ) : (
            <ChevronDownIcon className="h-5 w-5" />
          )}
        </div>
      </button>
      
      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t pt-3">
          {/* Description */}
          {step.description && (
            <div className="text-sm text-muted-foreground">
              {step.description}
            </div>
          )}
          
          {/* Leader Script */}
          {hasLeaderScript && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/20 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <DocumentTextIcon className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
                    SÄGA TILL GRUPPEN
                  </div>
                  <div className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap">
                    {step.leaderScript}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Navigate button */}
          {onNavigate && !isCurrent && (
            <Button
              variant="outline"
              size="sm"
              onClick={onNavigate}
              className="w-full"
            >
              Gå till detta steg
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function StoryViewModal({
  open,
  onClose,
  steps,
  currentStepIndex = -1,
  title = 'Berättelsen',
  onNavigateToStep,
}: StoryViewModalProps) {
  if (!open) return null;
  
  const totalDuration = steps.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
  const stepsWithScripts = steps.filter((s) => s.leaderScript).length;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-background rounded-xl shadow-2xl flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <BookOpenIcon className="h-6 w-6 text-primary" />
            <div>
              <h2 className="font-semibold text-foreground text-lg">{title}</h2>
              <div className="text-xs text-muted-foreground flex items-center gap-3">
                <span>{steps.length} steg</span>
                {totalDuration > 0 && <span>~{totalDuration} min totalt</span>}
                {stepsWithScripts > 0 && (
                  <span className="text-amber-600">
                    {stepsWithScripts} scripts
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {steps.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpenIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Inga steg i detta spel ännu.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {steps.map((step, index) => (
                <StepCard
                  key={step.id}
                  step={step}
                  index={index}
                  isCurrent={index === currentStepIndex}
                  isPast={index < currentStepIndex}
                  onNavigate={
                    onNavigateToStep
                      ? () => onNavigateToStep(index)
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Stäng
          </Button>
        </div>
      </div>
    </div>
  );
}
