'use client';

/**
 * WizardPanel
 *
 * Main wizard panel for the game builder.
 * Shows:
 * - Wizard mode toggle (Simple/Advanced)
 * - Template picker (optional)
 * - Suggested next actions based on ResolveResult
 *
 * ARCHITECTURE:
 * - All state via reducer (useGameBuilder)
 * - All validation via ResolveResult (useBuilderResolved)
 * - Wizard is HELPING, not CONTROLLING
 * - NO shadow state
 *
 * @see docs/builder/SPRINT2_WIRING_PLAN.md
 */

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { useBuilderResolved } from '../BuilderResolvedContext';
import { WizardModeToggle } from './WizardModeToggle';
import { GameTemplatePicker } from './GameTemplatePicker';
import { SuggestedNextActions } from './SuggestedNextActions';
import type { BuilderAction, StepData, PhaseData } from '@/types/game-builder-state';
import type { ArtifactFormData } from '@/types/games';
import type { WizardMode, TemplateId } from '@/lib/builder/wizard';

// =============================================================================
// Types
// =============================================================================

export interface WizardPanelProps {
  /** Current steps */
  steps: StepData[];
  /** Current phases */
  phases: PhaseData[];
  /** Current artifacts */
  artifacts: ArtifactFormData[];
  /** Dispatch function from useGameBuilder */
  dispatch: React.Dispatch<BuilderAction>;
  /** Navigation handler for section switching */
  onNavigate?: (section: string) => void;
  /** Show template picker */
  showTemplatePicker?: boolean;
  /** Compact mode for sidebar */
  compact?: boolean;
  /** Default expanded state */
  defaultExpanded?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function WizardPanel({
  steps,
  phases,
  artifacts,
  dispatch,
  onNavigate,
  showTemplatePicker = true,
  compact = false,
  defaultExpanded = true,
}: WizardPanelProps) {
  const t = useTranslations('admin.games.builder.wizard');
  const resolved = useBuilderResolved();

  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  // Derive current mode from phases
  const currentMode: WizardMode = phases.length > 0 ? 'advanced' : 'simple';

  // Gate status for quick overview
  const isDraftPassed = resolved.isGatePassed('draft');
  const isPlayablePassed = resolved.isGatePassed('playable');

  const handleModeChange = useCallback((_mode: WizardMode) => {
    // Mode change is handled by WizardModeToggle via dispatch
    // We could track it here for analytics if needed
  }, []);

  const handleTemplateApplied = useCallback((templateId: TemplateId) => {
    setSelectedTemplate(templateId);
    setShowTemplates(false);
  }, []);

  if (compact) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-primary" />
            <span className="font-medium text-sm">{t('title', { defaultValue: 'Wizard' })}</span>
          </div>
          <WizardModeToggle
            phases={phases}
            steps={steps}
            dispatch={dispatch}
            onModeChange={handleModeChange}
            size="sm"
            showLabels={false}
          />
        </div>
        <SuggestedNextActions
          steps={steps}
          phases={phases}
          artifacts={artifacts}
          dispatch={dispatch}
          onNavigate={onNavigate}
          maxSuggestions={3}
          variant="list"
        />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 hover:bg-surface-secondary transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <SparklesIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">{t('title', { defaultValue: 'Wizard-hjälp' })}</h3>
                <p className="text-sm text-muted-foreground">
                  {currentMode === 'advanced'
                    ? t('mode.advancedDescription', { defaultValue: 'Avancerat läge med faser' })
                    : t('mode.simpleDescription', { defaultValue: 'Enkelt läge utan faser' })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Gate status badges */}
              <div className="hidden sm:flex items-center gap-2">
                <Badge
                  variant={isDraftPassed ? 'default' : 'outline'}
                  className={isDraftPassed ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}
                >
                  {isDraftPassed ? (
                    <CheckCircleIcon className="h-3 w-3 mr-1" />
                  ) : (
                    <XCircleIcon className="h-3 w-3 mr-1" />
                  )}
                  {t('gates.draft', { defaultValue: 'Utkast' })}
                </Badge>
                <Badge
                  variant={isPlayablePassed ? 'default' : 'outline'}
                  className={isPlayablePassed ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}
                >
                  {isPlayablePassed ? (
                    <CheckCircleIcon className="h-3 w-3 mr-1" />
                  ) : (
                    <XCircleIcon className="h-3 w-3 mr-1" />
                  )}
                  {t('gates.playable', { defaultValue: 'Spelbar' })}
                </Badge>
              </div>
              {isExpanded ? (
                <ChevronUpIcon className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-6">
            {/* Mode Toggle Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
              <div>
                <h4 className="font-medium text-sm mb-1">
                  {t('mode.title', { defaultValue: 'Komplexitet' })}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {t('mode.hint', { defaultValue: 'Välj enkel för snabb start, avancerad för full kontroll' })}
                </p>
              </div>
              <WizardModeToggle
                phases={phases}
                steps={steps}
                dispatch={dispatch}
                onModeChange={handleModeChange}
              />
            </div>

            {/* Template Picker Section */}
            {showTemplatePicker && (
              <div className="pb-4 border-b">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-sm">
                      {t('templates.title', { defaultValue: 'Mallar' })}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {t('templates.hint', { defaultValue: 'Börja med en färdig struktur' })}
                    </p>
                  </div>
                  {selectedTemplate && (
                    <Badge variant="secondary">
                      {t('templates.applied', { defaultValue: 'Mall tillämpad' })}
                    </Badge>
                  )}
                </div>
                {showTemplates ? (
                  <div className="space-y-4">
                    <GameTemplatePicker
                      dispatch={dispatch}
                      onTemplateApplied={handleTemplateApplied}
                      variant="cards"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowTemplates(false)}
                      className="w-full"
                    >
                      {t('templates.hide', { defaultValue: 'Dölj mallar' })}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTemplates(true)}
                    className="w-full"
                  >
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    {t('templates.show', { defaultValue: 'Visa mallar' })}
                  </Button>
                )}
              </div>
            )}

            {/* Suggested Actions Section */}
            <div>
              <h4 className="font-medium text-sm mb-3">
                {t('suggestions.title', { defaultValue: 'Föreslagna nästa steg' })}
              </h4>
              <SuggestedNextActions
                steps={steps}
                phases={phases}
                artifacts={artifacts}
                dispatch={dispatch}
                onNavigate={onNavigate}
                maxSuggestions={5}
                variant="list"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
