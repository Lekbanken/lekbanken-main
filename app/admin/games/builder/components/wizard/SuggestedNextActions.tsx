'use client';

/**
 * SuggestedNextActions
 *
 * Shows actionable suggestions based on current draft state.
 * Uses ResolveResult to identify orphans, missing items, and next steps.
 *
 * All state via reducer - NO shadow state.
 */

import { useMemo, useCallback } from 'react';
import { Button } from '@/components/ui';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LightBulbIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { useBuilderResolved } from '../BuilderResolvedContext';
import { ORPHAN_PHASE_KEY, UNASSIGNED_STEP_KEY } from '@/lib/builder/resolver';
import type { BuilderAction, StepData, PhaseData } from '@/types/game-builder-state';
import type { ArtifactFormData } from '@/types/games';
import { createStep, attachArtifactToStep, assignStepToPhase } from '@/lib/builder/wizard';

// =============================================================================
// Types
// =============================================================================

export interface SuggestedAction {
  id: string;
  type: 'add' | 'fix' | 'connect' | 'improve';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  /** Actions to dispatch when user clicks */
  actions?: BuilderAction[];
  /** Navigation target instead of dispatching */
  navigateTo?: string;
}

export interface SuggestedNextActionsProps {
  /** Current steps */
  steps: StepData[];
  /** Current phases */
  phases: PhaseData[];
  /** Current artifacts */
  artifacts: ArtifactFormData[];
  /** Dispatch function from useGameBuilder */
  dispatch: React.Dispatch<BuilderAction>;
  /** Navigation handler */
  onNavigate?: (section: string) => void;
  /** Max suggestions to show */
  maxSuggestions?: number;
  /** Show as compact list or cards */
  variant?: 'cards' | 'list';
}

// =============================================================================
// Suggestion Icons
// =============================================================================

function getSuggestionIcon(type: SuggestedAction['type']) {
  switch (type) {
    case 'add':
      return <PlusIcon className="h-4 w-4" />;
    case 'fix':
      return <ExclamationTriangleIcon className="h-4 w-4" />;
    case 'connect':
      return <LinkIcon className="h-4 w-4" />;
    case 'improve':
      return <LightBulbIcon className="h-4 w-4" />;
    default:
      return <LightBulbIcon className="h-4 w-4" />;
  }
}

function getPriorityColor(priority: SuggestedAction['priority']) {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'low':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

// =============================================================================
// Component
// =============================================================================

export function SuggestedNextActions({
  steps,
  phases,
  artifacts,
  dispatch,
  onNavigate,
  maxSuggestions = 5,
  variant = 'list',
}: SuggestedNextActionsProps) {
  const t = useTranslations('admin.games.builder.wizard');
  const resolved = useBuilderResolved();

  // Generate suggestions based on ResolveResult
  const suggestions = useMemo<SuggestedAction[]>(() => {
    const result: SuggestedAction[] = [];

    // 1. No steps at all - high priority
    if (steps.length === 0) {
      result.push({
        id: 'add-first-step',
        type: 'add',
        priority: 'high',
        title: t('suggestions.addFirstStep.title', { defaultValue: 'Lägg till första steget' }),
        description: t('suggestions.addFirstStep.description', {
          defaultValue: 'En lek behöver minst ett steg för att kunna spelas.',
        }),
        actions: [createStep('Steg 1')],
      });
    }

    // 2. Orphan steps (steps without phase in advanced mode)
    if (phases.length > 0) {
      const orphanSteps = resolved.stepsByPhaseId.get(ORPHAN_PHASE_KEY) ?? [];
      if (orphanSteps.length > 0) {
        const firstOrphan = orphanSteps[0];
        const firstPhase = phases[0];
        if (firstPhase) {
          result.push({
            id: `assign-orphan-${firstOrphan.id}`,
            type: 'fix',
            priority: 'high',
            title: t('suggestions.assignOrphanStep.title', {
              defaultValue: 'Tilldela steg till fas',
            }),
            description: t('suggestions.assignOrphanStep.description', {
              count: orphanSteps.length,
              defaultValue: `${orphanSteps.length} steg saknar fas.`,
            }),
            actions: [assignStepToPhase(firstOrphan.id, firstPhase.id)],
          });
        }
      }
    }

    // 3. Unassigned artifacts
    const unassignedArtifacts = resolved.artifactsByStepId.get(UNASSIGNED_STEP_KEY) ?? [];
    if (unassignedArtifacts.length > 0 && steps.length > 0) {
      const firstUnassigned = unassignedArtifacts[0];
      const firstStep = steps[0];
      result.push({
        id: `attach-artifact-${firstUnassigned.id}`,
        type: 'connect',
        priority: 'medium',
        title: t('suggestions.attachArtifact.title', {
          defaultValue: 'Koppla artefakt till steg',
        }),
        description: t('suggestions.attachArtifact.description', {
          count: unassignedArtifacts.length,
          defaultValue: `${unassignedArtifacts.length} artefakter är inte kopplade till något steg.`,
        }),
        actions: [attachArtifactToStep(firstUnassigned.id, firstStep.id)],
      });
    }

    // 4. Blocking errors exist
    const blockingErrors = resolved.blockingErrorsFor('playable');
    if (blockingErrors.length > 0 && result.length < maxSuggestions) {
      const firstError = blockingErrors[0];
      result.push({
        id: 'fix-blocking-error',
        type: 'fix',
        priority: 'high',
        title: t('suggestions.fixError.title', { defaultValue: 'Åtgärda fel' }),
        description: firstError.message,
        navigateTo: 'validation',
      });
    }

    // 5. No artifacts yet - low priority improvement
    if (artifacts.length === 0 && steps.length > 0 && result.length < maxSuggestions) {
      result.push({
        id: 'add-artifact',
        type: 'improve',
        priority: 'low',
        title: t('suggestions.addArtifact.title', { defaultValue: 'Lägg till en artefakt' }),
        description: t('suggestions.addArtifact.description', {
          defaultValue: 'Artefakter gör leken mer interaktiv med bilder, ljud eller frågor.',
        }),
        navigateTo: 'artefakter',
      });
    }

    // 6. Gate progress
    if (!resolved.isGatePassed('playable') && steps.length > 0 && result.length < maxSuggestions) {
      const playableErrors = resolved.errorsByGate.playable.filter((e) => e.severity === 'error');
      if (playableErrors.length > 0) {
        result.push({
          id: 'complete-playable',
          type: 'improve',
          priority: 'medium',
          title: t('suggestions.completePlayable.title', { defaultValue: 'Gör leken spelbar' }),
          description: t('suggestions.completePlayable.description', {
            count: playableErrors.length,
            defaultValue: `${playableErrors.length} saker kvar för att kunna testa leken.`,
          }),
          navigateTo: 'validation',
        });
      }
    }

    return result.slice(0, maxSuggestions);
  }, [steps, phases, artifacts, resolved, t, maxSuggestions]);

  const handleSuggestionClick = useCallback(
    (suggestion: SuggestedAction) => {
      if (suggestion.actions) {
        for (const action of suggestion.actions) {
          dispatch(action);
        }
      } else if (suggestion.navigateTo && onNavigate) {
        onNavigate(suggestion.navigateTo);
      }
    },
    [dispatch, onNavigate]
  );

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <LightBulbIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">
          {t('suggestions.empty', { defaultValue: 'Allt ser bra ut! Inga förslag just nu.' })}
        </p>
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className="space-y-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            onClick={() => handleSuggestionClick(suggestion)}
            className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-surface-secondary transition-colors text-left group"
          >
            <div
              className={`p-1.5 rounded ${getPriorityColor(suggestion.priority)}`}
            >
              {getSuggestionIcon(suggestion.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{suggestion.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {suggestion.description}
              </p>
            </div>
            <ArrowRightIcon className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {suggestions.map((suggestion) => (
        <Card
          key={suggestion.id}
          className="p-4 cursor-pointer hover:bg-surface-secondary transition-colors"
          onClick={() => handleSuggestionClick(suggestion)}
        >
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-lg ${getPriorityColor(suggestion.priority)}`}
            >
              {getSuggestionIcon(suggestion.type)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">{suggestion.title}</span>
                <Badge
                  variant={suggestion.priority === 'high' ? 'destructive' : 'outline'}
                  size="sm"
                >
                  {suggestion.priority === 'high'
                    ? t('priority.high', { defaultValue: 'Viktigt' })
                    : suggestion.priority === 'medium'
                    ? t('priority.medium', { defaultValue: 'Bra att göra' })
                    : t('priority.low', { defaultValue: 'Förbättring' })}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{suggestion.description}</p>
            </div>
            <Button variant="ghost" size="sm" className="flex-shrink-0">
              {suggestion.actions ? t('actions.apply', { defaultValue: 'Utför' }) : t('actions.go', { defaultValue: 'Gå' })}
              <ArrowRightIcon className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
