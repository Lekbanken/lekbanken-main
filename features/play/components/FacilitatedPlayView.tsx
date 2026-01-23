/**
 * FacilitatedPlayView
 *
 * A tabbed play mode layout for facilitated games (with phases, triggers, etc).
 * Uses capability-driven rendering via SessionCapabilities.
 *
 * This is a LAYOUT component - it uses shared containers from the play feature,
 * no duplicated logic or data models.
 *
 * Tab structure:
 * - Play: Step navigation and current step content
 * - Content: Artifacts, puzzles, decisions, outcome (if available)
 * - Manage: Roles, triggers, settings (if available)
 *
 * @see PLAY_MODE_UI_AUDIT.md section 12.3
 */


'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { StepViewer } from './StepViewer';
import { StepPhaseNavigation } from './StepPhaseNavigation';
import { ArtifactsPanel } from './ArtifactsPanel';
import { DecisionsPanel } from './DecisionsPanel';
import { OutcomePanel } from './OutcomePanel';
import { PuzzleProgressPanel } from './PuzzleProgressPanel';
import { TriggerPanel } from './TriggerPanel';
import { PropConfirmationManager } from './PropConfirmationManager';
import { Toolbelt } from '@/features/tools/components/Toolbelt';
import type { PlaySessionData, StepInfo } from '../api/session-api';
import type { SessionCapabilities } from '@/hooks/useSessionCapabilities';
import type { SessionTrigger } from '@/types/games';

interface FacilitatedPlayViewProps {
  /** Session data from API */
  playData: PlaySessionData;
  /** Capabilities computed by useSessionCapabilities */
  caps: SessionCapabilities;
  /** Current session ID */
  sessionId: string;
  /** Session triggers */
  triggers: SessionTrigger[];
  /** Current step index */
  currentStepIndex: number;
  /** Current phase index */
  currentPhaseIndex: number;
  /** Callback when step changes */
  onStepChange: (index: number) => void;
  /** Callback when phase changes */
  onPhaseChange: (index: number) => void;
  /** Callback when a trigger is fired */
  onTriggerAction: (triggerId: string, action: 'fire' | 'disable' | 'arm') => void;
  /** Callback when session is completed */
  onComplete: () => void;
  /** Optional callback to exit play mode */
  onBack?: () => void;
}

/**
 * Converts a StepInfo to the Step format expected by StepViewer.
 */
function stepInfoToStep(step: StepInfo) {
  return {
    id: step.id,
    title: step.title,
    description: step.description ?? step.content ?? '',
    durationMinutes: step.durationMinutes ?? step.duration ?? undefined,
    materials: step.materials,
    safety: step.safety,
    tag: step.tag,
    note: step.note,
  };
}

export function FacilitatedPlayView({
  playData,
  caps,
  sessionId,
  triggers,
  currentStepIndex,
  currentPhaseIndex,
  onStepChange,
  onPhaseChange,
  onTriggerAction,
  onComplete,
  onBack,
}: FacilitatedPlayViewProps) {
  const t = useTranslations('play.facilitatedView');

  // Use first visible tab as default
  const [activeTab, setActiveTab] = useState<string>(caps.visibleTabs[0] ?? 'play');
  const [contentTab, setContentTab] = useState<string>(caps.contentSubTabs[0] ?? 'artifacts');
  const [manageTab, setManageTab] = useState<string>(caps.manageSubTabs[0] ?? 'settings');
  const [confirmEndSessionOpen, setConfirmEndSessionOpen] = useState(false);

  const steps = playData.steps;
  const phases = playData.phases;
  const step = steps[currentStepIndex];

  // Keep navigation lightweight (avoid duplicating StepViewer content)
  const navigationSteps = steps.map((s) => ({
    id: s.id,
    title: s.title,
    durationMinutes: s.durationMinutes,
  }));
  const navigationPhases = phases.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
  }));

  // Handle trigger fire action
  const handleFireTrigger = async (triggerId: string) => {
    onTriggerAction(triggerId, 'fire');
  };

  return (
    <div className="space-y-4">
      {/* Header with phase navigation */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{playData.gameTitle}</h2>
            {caps.showPhaseNavigation && phases.length > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                {t('phaseProgress', {
                  current: currentPhaseIndex + 1,
                  total: phases.length,
                  phaseName: phases[currentPhaseIndex]?.name ?? '',
                })}
              </p>
            )}
            {step && (
              <p className="mt-1 text-sm text-muted-foreground">
                {t('stepProgress', {
                  current: currentStepIndex + 1,
                  total: steps.length,
                  stepName: step.title,
                })}
              </p>
            )}
          </div>
          {/* Timer could go here in the future */}
        </div>
      </Card>

      {/* Main Tabs */}
      <div className="space-y-4">
        <Tabs
          tabs={caps.visibleTabs.map((tab) => ({
            id: tab,
            label: t(`tabs.${tab}`),
          }))}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {/* Play Tab */}
        <TabPanel id="play" activeTab={activeTab} className="space-y-4">
          {/* Step/Phase Navigation Controls */}
          <StepPhaseNavigation
            currentStepIndex={currentStepIndex}
            totalSteps={steps.length}
            steps={navigationSteps}
            currentPhaseIndex={currentPhaseIndex}
            totalPhases={phases.length}
            phases={navigationPhases}
            onStepChange={onStepChange}
            onPhaseChange={onPhaseChange}
            showPhases={caps.showPhaseNavigation}
            unified
          />

          {/* Current Step */}
          {step && (
            <StepViewer
              step={stepInfoToStep(step)}
              index={currentStepIndex}
              total={steps.length}
            />
          )}

          {/* Toolbelt in play tab */}
          {caps.showToolbelt && <Toolbelt sessionId={sessionId} role="host" />}
        </TabPanel>

        {/* Content Tab */}
        {caps.visibleTabs.includes('content') && (
          <TabPanel id="content" activeTab={activeTab}>
            <div className="space-y-4">
              <Tabs
                tabs={caps.contentSubTabs.map((sub) => ({
                  id: sub,
                  label: t(`content.${sub}`),
                }))}
                activeTab={contentTab}
                onChange={setContentTab}
              />

              {caps.showArtifactsPanel && (
                <TabPanel id="artifacts" activeTab={contentTab}>
                  <ArtifactsPanel sessionId={sessionId} />
                </TabPanel>
              )}
              {caps.showPuzzlesPanel && (
                <TabPanel id="puzzles" activeTab={contentTab}>
                  <PuzzleProgressPanel sessionId={sessionId} />
                </TabPanel>
              )}
              {caps.showDecisionsPanel && (
                <TabPanel id="decisions" activeTab={contentTab}>
                  <DecisionsPanel sessionId={sessionId} />
                </TabPanel>
              )}
              {caps.showOutcomePanel && (
                <TabPanel id="outcome" activeTab={contentTab}>
                  <OutcomePanel sessionId={sessionId} />
                </TabPanel>
              )}
            </div>
          </TabPanel>
        )}

        {/* Manage Tab */}
        {caps.visibleTabs.includes('manage') && (
          <TabPanel id="manage" activeTab={activeTab}>
            <div className="space-y-4">
              <Tabs
                tabs={caps.manageSubTabs.map((sub) => ({
                  id: sub,
                  label: t(`manage.${sub}`),
                }))}
                activeTab={manageTab}
                onChange={setManageTab}
              />

              {caps.showRoleAssigner && (
                <TabPanel id="roles" activeTab={manageTab}>
                  {/* RoleAssignerContainer would go here */}
                  <Card className="p-4">
                    <p className="text-muted-foreground">{t('manage.rolesPlaceholder')}</p>
                  </Card>
                </TabPanel>
              )}
              {caps.showTriggersPanel && (
                <TabPanel id="triggers" activeTab={manageTab}>
                  <TriggerPanel triggers={triggers} onFireTrigger={handleFireTrigger} />
                </TabPanel>
              )}
              <TabPanel id="settings" activeTab={manageTab}>
                <Card className="p-4">
                  <p className="text-muted-foreground">{t('manage.settingsPlaceholder')}</p>
                </Card>
              </TabPanel>
            </div>
          </TabPanel>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between">
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            {t('exitPlay')}
          </Button>
        )}
        <Button
          onClick={() => setConfirmEndSessionOpen(true)}
          className="ml-auto"
          variant="destructive"
        >
          {t('endSession')}
        </Button>
      </div>

      <AlertDialog open={confirmEndSessionOpen} onOpenChange={setConfirmEndSessionOpen}>
        <AlertDialogContent variant="destructive">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmEndSession.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirmEndSession.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('confirmEndSession.cancel')}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onComplete}>
              {t('confirmEndSession.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Props manager (floating) */}
      {caps.showPropsManager && <PropConfirmationManager sessionId={sessionId} />}
    </div>
  );
}
