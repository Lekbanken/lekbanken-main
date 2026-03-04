'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '../../components/StatusBadge';
import { updatePlan, publishPlan } from '../../api';
import { useActionFeedback } from '../../hooks/useActionFeedback';
import type { PlannerPlan, PlannerStatus } from '@/types/planner';
import type { UsePlanWizardResult } from '../hooks/usePlanWizard';

interface StepSaveAndRunProps {
  plan: PlannerPlan;
  capabilities: {
    canUpdate: boolean;
    canPublish: boolean;
    canStartRun: boolean;
  };
  onPlanUpdate: (plan: PlannerPlan) => void;
  wizard: UsePlanWizardResult;
}

export function StepSaveAndRun({ plan, capabilities, onPlanUpdate, wizard }: StepSaveAndRunProps) {
  const tp = useTranslations('planner');
  const tc = useTranslations('common.actions');
  const tw = useTranslations('planner.wizardSteps');
  const ta = useTranslations('planner.actions');
  const ts = useTranslations('planner.success');
  const tw2 = useTranslations('planner.warnings');
  const router = useRouter();
  const { withFeedback, isPending } = useActionFeedback();

  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description ?? '');

  const totalDuration = plan.blocks
    .filter((b) => b.blockType !== 'section')
    .reduce((sum, b) => sum + (b.durationMinutes ?? 0), 0);
  const contentBlockCount = plan.blocks.filter((b) => b.blockType !== 'section').length;
  const hasBlocks = contentBlockCount > 0;

  // Check if any block is a session-game (participants mode)
  const hasSessionBlock = plan.blocks.some(
    (b) => b.blockType === 'game' && b.game && (b.metadata as Record<string, unknown>)?.playMode === 'participants'
  );

  const hasNameChanged = name !== plan.name;
  const hasDescriptionChanged = description !== (plan.description ?? '');
  const hasChanges = hasNameChanged || hasDescriptionChanged;

  const isSaving = isPending(`save-plan-${plan.id}`);
  const isSavingAndRunning = isPending(`save-and-run-${plan.id}`);

  const savePlanMeta = async (): Promise<PlannerPlan> => {
    let updatedPlan = plan;
    if (hasChanges) {
      const payload: Record<string, string> = {};
      if (hasNameChanged) payload.name = name;
      if (hasDescriptionChanged) payload.description = description;

      updatedPlan = await updatePlan(plan.id, payload);
      onPlanUpdate(updatedPlan);
    }
    return updatedPlan;
  };

  const handleSave = async () => {
    await withFeedback(
      `save-plan-${plan.id}`,
      async () => {
        const updated = await savePlanMeta();
        return updated;
      },
      { successMessage: ts('saved'), errorMessage: tp('errors.saveFailed') }
    );
  };

  const handleSaveAndRun = async () => {
    await withFeedback(
      `save-and-run-${plan.id}`,
      async () => {
        // 1. Save meta if changed
        const updatedPlan = await savePlanMeta();

        // 2. Auto-publish if needed (transparent to user — Decision #2)
        if (updatedPlan.status === 'draft' || updatedPlan.status === 'modified') {
          const publishResult = await publishPlan(plan.id);
          onPlanUpdate({
            ...updatedPlan,
            status: publishResult.plan.status as PlannerStatus,
            currentVersionId: publishResult.plan.currentVersionId,
            currentVersion: publishResult.version,
          });
        }

        // 3. Navigate to play
        router.push(`/app/play/plan/${plan.id}`);
        return updatedPlan;
      },
      { errorMessage: tp('errors.publishFailed') }
    );
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
            2
          </span>
          {tw('saveAndRun')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Editable Plan Meta */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plan-name">{tp('wizard.steps.grund.nameLabel')}</Label>
            <Input
              id="plan-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              disabled={!capabilities.canUpdate}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-description">{tp('wizard.steps.grund.descriptionLabel')}</Label>
            <Textarea
              id="plan-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none"
              disabled={!capabilities.canUpdate}
            />
          </div>
        </div>

        {/* Inline Preview */}
        <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium text-muted-foreground">
                ⏱ {totalDuration} min • {contentBlockCount} block
              </p>
            </div>
            <StatusBadge status={plan.status} size="sm" />
          </div>

          {/* Block list preview */}
          <div className="space-y-2">
            {plan.blocks.map((block, idx) => {
              if (block.blockType === 'section') {
                return (
                  <div key={block.id} className="flex items-center gap-2 pt-2 first:pt-0">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {block.title ?? tp('blockTypes.section')}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                );
              }

              const isSessionGame = block.blockType === 'game' &&
                block.game &&
                (block.metadata as Record<string, unknown>)?.playMode === 'participants';

              const blockNumber = plan.blocks
                .slice(0, idx)
                .filter((b) => b.blockType !== 'section').length + 1;

              const blockIcon =
                block.blockType === 'game' ? '🎮' :
                block.blockType === 'pause' ? '⏸' :
                block.blockType === 'preparation' ? '📋' : '📝';

              const blockTitle =
                block.blockType === 'game'
                  ? block.game?.title ?? tp('blockTypes.game')
                  : block.title ?? tp(`blockTypes.${block.blockType}`);

              return (
                <div
                  key={block.id}
                  className={`flex items-center gap-3 rounded-lg p-2 text-sm ${
                    isSessionGame ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800' : 'bg-background'
                  }`}
                >
                  <span className="text-muted-foreground w-6 text-right text-xs">{blockNumber}.</span>
                  <span>{blockIcon}</span>
                  <span className="flex-1 truncate">
                    <span className="font-medium">{blockTitle}</span>
                  </span>
                  <span className="text-muted-foreground text-xs">{block.durationMinutes ?? 0} min</span>
                  {isSessionGame && (
                    <span className="text-xs text-amber-600 dark:text-amber-400" title={tw2('sessionBlockNotSupported')}>
                      ⚠️
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Session block warning */}
          {hasSessionBlock && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-3">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                ⚠️ {tw2('sessionBlockNotSupported')}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-between border-t">
          <Button variant="outline" onClick={wizard.goToPrevStep}>
            <ChevronLeftIcon className="mr-1 h-4 w-4" />
            {tc('back')}
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => void handleSave()}
              disabled={!hasChanges || isSaving || isSavingAndRunning}
            >
              {isSaving ? (
                <>
                  <LoaderIcon className="mr-1 h-4 w-4 animate-spin" />
                  {ta('saving')}
                </>
              ) : (
                ta('save')
              )}
            </Button>
            <Button
              onClick={() => void handleSaveAndRun()}
              disabled={!hasBlocks || isSavingAndRunning || !capabilities.canStartRun}
            >
              {isSavingAndRunning ? (
                <>
                  <LoaderIcon className="mr-1 h-4 w-4 animate-spin" />
                  {ta('saving')}
                </>
              ) : (
                <>
                  {ta('saveAndRun')}
                  <PlayIcon className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Icons

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
