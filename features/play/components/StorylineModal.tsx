/**
 * StorylineModal Component
 * 
 * Enhanced story view for the Lobby that helps facilitators prepare.
 * Shows introduction, safety/inclusion info, and all steps/phases in a
 * swipeable/navigable format.
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  XMarkIcon,
  BookOpenIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  LightBulbIcon,
  MapPinIcon,
  HandRaisedIcon,
} from '@heroicons/react/24/outline';
import type { CockpitStep, CockpitPhase, SafetyInfo } from '@/types/session-cockpit';

// =============================================================================
// Types
// =============================================================================

export interface StorylineModalProps {
  /** Is the modal open? */
  open: boolean;
  /** Called when user closes the modal */
  onClose: () => void;
  /** Game/session name */
  title: string;
  /** Game description/introduction */
  introduction?: string;
  /** Safety and inclusion info */
  safetyInfo?: SafetyInfo;
  /** All steps in the game */
  steps: CockpitStep[];
  /** All phases in the game */
  phases: CockpitPhase[];
}

// =============================================================================
// Types
// =============================================================================

type TabType = 'intro' | 'phases' | 'steps';

// =============================================================================
// Sub-components
// =============================================================================

function IntroPage({
  title,
  introduction,
  safetyInfo,
  stepsCount,
  phasesCount,
  totalDuration,
}: {
  title: string;
  introduction?: string;
  safetyInfo?: SafetyInfo;
  stepsCount: number;
  phasesCount: number;
  totalDuration: number;
}) {
  const t = useTranslations('play.storyline');
  const hasSafetyInfo = safetyInfo?.safetyNotes || safetyInfo?.accessibilityNotes || 
                        safetyInfo?.spaceRequirements || safetyInfo?.leaderTips;

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <span>{t('stepsCount', { count: stepsCount })}</span>
          {phasesCount > 0 && <span>{t('phasesCount', { count: phasesCount })}</span>}
          {totalDuration > 0 && (
            <span className="flex items-center gap-1">
              <ClockIcon className="h-4 w-4" />
              {t('totalDuration', { minutes: totalDuration })}
            </span>
          )}
        </div>
      </div>

      {/* Introduction */}
      {introduction && (
        <Card className="p-4 border-border/40">
          <div className="flex items-start gap-3">
            <BookOpenIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-foreground mb-2">{t('introductionLabel')}</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{introduction}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Safety & Inclusion */}
      {hasSafetyInfo && (
        <Card className="p-4 border-border/40 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-amber-600" />
            <h3 className="font-medium text-foreground">{t('safetyAndInclusion')}</h3>
          </div>

          {safetyInfo?.safetyNotes && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/20 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <ShieldCheckIcon className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
                    {t('safetyNotes')}
                  </div>
                  <div className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap">
                    {safetyInfo.safetyNotes}
                  </div>
                </div>
              </div>
            </div>
          )}

          {safetyInfo?.accessibilityNotes && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950/20 dark:border-blue-800">
              <div className="flex items-start gap-2">
                <HandRaisedIcon className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">
                    {t('accessibilityNotes')}
                  </div>
                  <div className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">
                    {safetyInfo.accessibilityNotes}
                  </div>
                </div>
              </div>
            </div>
          )}

          {safetyInfo?.spaceRequirements && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-950/20 dark:border-green-800">
              <div className="flex items-start gap-2">
                <MapPinIcon className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">
                    {t('spaceRequirements')}
                  </div>
                  <div className="text-sm text-green-900 dark:text-green-100 whitespace-pre-wrap">
                    {safetyInfo.spaceRequirements}
                  </div>
                </div>
              </div>
            </div>
          )}

          {safetyInfo?.leaderTips && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg dark:bg-purple-950/20 dark:border-purple-800">
              <div className="flex items-start gap-2">
                <LightBulbIcon className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-medium text-purple-700 dark:text-purple-400 mb-1">
                    {t('leaderTips')}
                  </div>
                  <div className="text-sm text-purple-900 dark:text-purple-100 whitespace-pre-wrap">
                    {safetyInfo.leaderTips}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Hint to swipe/navigate */}
      <div className="text-center text-sm text-muted-foreground">
        {t('swipeHint')}
      </div>
    </div>
  );
}

function StepPage({ step, stepNumber, totalSteps }: { step: CockpitStep; stepNumber: number; totalSteps: number }) {
  const t = useTranslations('play.storyline');
  const hasLeaderScript = Boolean(step.leaderScript);

  return (
    <div className="space-y-4">
      {/* Step header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
          {stepNumber}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground mb-0.5">
            {t('stepOf', { current: stepNumber, total: totalSteps })}
          </div>
          <h2 className="text-xl font-semibold text-foreground truncate">
            {step.title || t('unnamedStep')}
          </h2>
        </div>
        {step.durationMinutes && (
          <Badge variant="secondary" className="shrink-0">
            <ClockIcon className="h-3.5 w-3.5 mr-1" />
            {step.durationMinutes} min
          </Badge>
        )}
      </div>

      {/* Description */}
      {step.description && (
        <Card className="p-4 border-border/40">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {step.description}
          </p>
        </Card>
      )}

      {/* Leader Script */}
      {hasLeaderScript && (
        <Card className="p-4 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <DocumentTextIcon className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2">
                {t('sayToGroup')}
              </div>
              <div className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap">
                {step.leaderScript}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Participant prompt */}
      {step.participantPrompt && (
        <Card className="p-4 border-border/40">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            {t('participantSees')}
          </div>
          <div className="text-sm text-foreground whitespace-pre-wrap">
            {step.participantPrompt}
          </div>
        </Card>
      )}

      {/* Board text */}
      {step.boardText && (
        <Card className="p-4 border-border/40">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            {t('boardMessage')}
          </div>
          <div className="text-sm text-foreground whitespace-pre-wrap italic">
            {step.boardText}
          </div>
        </Card>
      )}
    </div>
  );
}

function PhasePage({ phase, phaseNumber, totalPhases }: { phase: CockpitPhase; phaseNumber: number; totalPhases: number }) {
  const t = useTranslations('play.storyline');

  // Map phase type to color and icon
  const phaseStyles: Record<string, { bg: string; border: string; text: string }> = {
    intro: { bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-400' },
    round: { bg: 'bg-green-50 dark:bg-green-950/20', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-400' },
    finale: { bg: 'bg-purple-50 dark:bg-purple-950/20', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-400' },
    break: { bg: 'bg-orange-50 dark:bg-orange-950/20', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-400' },
  };

  const style = phaseStyles[phase.phaseType] || phaseStyles.round;

  return (
    <div className="space-y-4">
      {/* Phase header */}
      <div className="flex items-center gap-3">
        <div className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-semibold',
          style.bg, style.border, style.text
        )}>
          {phaseNumber}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground mb-0.5">
            {t('phaseOf', { current: phaseNumber, total: totalPhases })}
          </div>
          <h2 className="text-xl font-semibold text-foreground truncate">
            {phase.name || t('unnamedPhase')}
          </h2>
        </div>
        <Badge variant="secondary" className={cn('shrink-0 capitalize', style.text)}>
          {t(`phaseType.${phase.phaseType}`)}
        </Badge>
      </div>

      {/* Description */}
      {phase.description && (
        <Card className={cn('p-4', style.bg, style.border)}>
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {phase.description}
          </p>
        </Card>
      )}

      {/* Empty state if no description */}
      {!phase.description && (
        <Card className="p-4 border-border/40">
          <p className="text-sm text-muted-foreground italic">
            {t('noPhaseDescription')}
          </p>
        </Card>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function StorylineModal({
  open,
  onClose,
  title,
  introduction,
  safetyInfo,
  steps,
  phases,
}: StorylineModalProps) {
  const t = useTranslations('play.storyline');
  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const prevOpenRef = useRef(open);
  
  const [activeTab, setActiveTab] = useState<TabType>('intro');
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  const totalDuration = steps.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);

  // Tab definitions
  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'intro', label: t('tabIntro') },
    { id: 'phases', label: t('tabPhases'), count: phases.length },
    { id: 'steps', label: t('tabSteps'), count: steps.length },
  ];

  const goNext = useCallback(() => {
    if (activeTab === 'intro') {
      // Go to phases or steps
      if (phases.length > 0) {
        setActiveTab('phases');
        setPhaseIndex(0);
      } else if (steps.length > 0) {
        setActiveTab('steps');
        setStepIndex(0);
      }
    } else if (activeTab === 'phases') {
      if (phaseIndex < phases.length - 1) {
        setPhaseIndex(prev => prev + 1);
      } else if (steps.length > 0) {
        setActiveTab('steps');
        setStepIndex(0);
      }
    } else if (activeTab === 'steps') {
      if (stepIndex < steps.length - 1) {
        setStepIndex(prev => prev + 1);
      }
    }
  }, [activeTab, phaseIndex, stepIndex, phases.length, steps.length]);

  const goPrev = useCallback(() => {
    if (activeTab === 'intro') {
      // Already at start
    } else if (activeTab === 'phases') {
      if (phaseIndex > 0) {
        setPhaseIndex(prev => prev - 1);
      } else {
        setActiveTab('intro');
      }
    } else if (activeTab === 'steps') {
      if (stepIndex > 0) {
        setStepIndex(prev => prev - 1);
      } else if (phases.length > 0) {
        setActiveTab('phases');
        setPhaseIndex(phases.length - 1);
      } else {
        setActiveTab('intro');
      }
    }
  }, [activeTab, phaseIndex, stepIndex, phases.length]);

  // Reset when modal opens
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      requestAnimationFrame(() => {
        setActiveTab('intro');
        setPhaseIndex(0);
        setStepIndex(0);
      });
    }
    prevOpenRef.current = open;
  }, [open]);

  // Touch/swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const threshold = 50;
    if (deltaX > threshold) {
      goPrev();
    } else if (deltaX < -threshold) {
      goNext();
    }
    touchStartX.current = null;
  };

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        goNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        goPrev();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, goNext, goPrev, onClose]);

  if (!open) return null;

  const isFirstItem = activeTab === 'intro';
  const isLastItem = activeTab === 'steps' && stepIndex === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl h-[80vh] max-h-[600px] bg-background rounded-xl shadow-2xl flex flex-col mx-4">
        {/* Header with close button */}
        <div className="flex items-center justify-between border-b border-border/40 px-6 py-3">
          <div className="flex items-center gap-3">
            <BookOpenIcon className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">{t('title')}</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-border/40 px-4">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'phases') setPhaseIndex(0);
                  if (tab.id === 'steps') setStepIndex(0);
                }}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium transition-colors rounded-t-lg',
                  'hover:bg-muted/50',
                  activeTab === tab.id
                    ? 'text-primary border-b-2 border-primary bg-muted/30'
                    : 'text-muted-foreground'
                )}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0">
                    {tab.count}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>
        
        {/* Content - swipeable */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto p-6"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {activeTab === 'intro' && (
            <IntroPage
              title={title}
              introduction={introduction}
              safetyInfo={safetyInfo}
              stepsCount={steps.length}
              phasesCount={phases.length}
              totalDuration={totalDuration}
            />
          )}
          {activeTab === 'phases' && phases[phaseIndex] && (
            <PhasePage
              phase={phases[phaseIndex]}
              phaseNumber={phaseIndex + 1}
              totalPhases={phases.length}
            />
          )}
          {activeTab === 'steps' && steps[stepIndex] && (
            <StepPage
              step={steps[stepIndex]}
              stepNumber={stepIndex + 1}
              totalSteps={steps.length}
            />
          )}
          
          {/* Empty state for phases/steps */}
          {activeTab === 'phases' && phases.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              {t('noPhasesAvailable')}
            </div>
          )}
          {activeTab === 'steps' && steps.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              {t('noStepsAvailable')}
            </div>
          )}
        </div>
        
        {/* Footer with navigation */}
        <div className="border-t border-border/40 px-6 py-4 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={goPrev}
            disabled={isFirstItem}
            className="gap-1"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            {t('previous')}
          </Button>

          {/* Current position indicator */}
          <div className="text-xs text-muted-foreground">
            {activeTab === 'phases' && phases.length > 0 && (
              t('phaseOf', { current: phaseIndex + 1, total: phases.length })
            )}
            {activeTab === 'steps' && steps.length > 0 && (
              t('stepOf', { current: stepIndex + 1, total: steps.length })
            )}
          </div>

          <Button
            variant={isLastItem ? 'outline' : 'default'}
            size="sm"
            onClick={isLastItem ? onClose : goNext}
            className="gap-1"
          >
            {isLastItem ? (
              t('close')
            ) : (
              <>
                {t('next')}
                <ChevronRightIcon className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
