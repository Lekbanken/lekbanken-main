'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PreviewDialog } from '../../components/PreviewDialog';
import { VersionsDialog } from '../../components/VersionsDialog';
import { ShareDialog } from '../../components/ShareDialog';
import { StatusBadge } from '../../components/StatusBadge';
import { publishPlan } from '../../api';
import { useActionFeedback } from '../../hooks/useActionFeedback';
import type { PlannerPlan, PlannerStatus } from '@/types/planner';
import type { UsePlanWizardResult } from '../hooks/usePlanWizard';

interface StepGranskaProps {
  plan: PlannerPlan;
  capabilities: {
    canPublish: boolean;
    canUpdate: boolean;
  };
  onPlanUpdate: (plan: PlannerPlan) => void;
  wizard: UsePlanWizardResult;
}

export function StepGranska({ plan, capabilities, onPlanUpdate, wizard }: StepGranskaProps) {
  const t = useTranslations('planner.wizard.steps.granska');
  const tv = useTranslations('planner.wizard.visibility');
  const tc = useTranslations('common.actions');
  const { withFeedback, isPending } = useActionFeedback();

  const [showPreview, setShowPreview] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const totalDuration = plan.blocks.reduce((sum, b) => sum + (b.durationMinutes ?? 0), 0);
  const hasBlocks = plan.blocks.length > 0;
  const canPublish = capabilities.canPublish && hasBlocks;
  const showPublishButton = plan.status === 'draft' || plan.status === 'modified';
  const isPlanPublished = plan.status === 'published';

  const handlePublish = async () => {
    await withFeedback(
      `publish-${plan.id}`,
      async () => {
        const result = await publishPlan(plan.id);
        onPlanUpdate({
          ...plan,
          status: result.plan.status as PlannerStatus,
          currentVersionId: result.plan.currentVersionId,
          currentVersion: result.version,
        });
        return result;
      },
      { successMessage: 'Planen har publicerats!', errorMessage: 'Kunde inte publicera plan' }
    );
  };

  const isPublishing = isPending(`publish-${plan.id}`);

  return (
    <>
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
              4
            </span>
            {t('title')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('description')}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Summary */}
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{plan.name}</h3>
                {plan.description && (
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                )}
              </div>
              <StatusBadge status={plan.status} size="sm" />
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Block</p>
                <p className="text-lg font-semibold">{plan.blocks.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total tid</p>
                <p className="text-lg font-semibold">{totalDuration} min</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Synlighet</p>
                <Badge variant="outline" className="mt-1">
                  {plan.visibility === 'private' && tv('private')}
                  {plan.visibility === 'tenant' && tv('tenant')}
                  {plan.visibility === 'public' && tv('public')}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Version</p>
                <p className="text-lg font-semibold">
                  {plan.currentVersion?.versionNumber ?? '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Actions Grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              onClick={() => setShowPreview(true)}
              disabled={!hasBlocks}
              className="justify-start gap-2"
            >
              <EyeIcon className="h-4 w-4" />
              {t('previewButton')}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowVersions(true)}
              className="justify-start gap-2"
            >
              <HistoryIcon className="h-4 w-4" />
              {t('versionsButton')}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowShare(true)}
              disabled={!isPlanPublished}
              className="justify-start gap-2"
            >
              <ShareIcon className="h-4 w-4" />
              {t('shareButton')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                // CSV export
                const lines = ['Position,Type,Title,Duration (min),Optional,Notes'];
                plan.blocks.forEach((block, idx) => {
                  const title =
                    block.blockType === 'game'
                      ? block.game?.title ?? 'Okänd lek'
                      : block.title ?? block.blockType;
                  lines.push(
                    [
                      idx + 1,
                      block.blockType,
                      `"${title.replace(/"/g, '""')}"`,
                      block.durationMinutes ?? 0,
                      block.isOptional ? 'Ja' : 'Nej',
                      `"${(block.notes ?? '').replace(/"/g, '""')}"`,
                    ].join(',')
                  );
                });
                const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${plan.name || 'plan'}.csv`;
                link.click();
                URL.revokeObjectURL(url);
              }}
              disabled={!hasBlocks}
              className="justify-start gap-2"
            >
              <DownloadIcon className="h-4 w-4" />
              {t('exportButton')}
            </Button>
          </div>

          {/* Publish Section */}
          {showPublishButton && (
            <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <RocketIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">{t('publishTitle')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {plan.status === 'modified'
                      ? t('publishDescriptionModified')
                      : t('publishDescriptionDraft')}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => void handlePublish()}
                disabled={!canPublish || isPublishing}
                className="w-full sm:w-auto"
              >
                {isPublishing ? (
                  <>
                    <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                    {t('publishing')}
                  </>
                ) : (
                  <>
                    <RocketIcon className="mr-2 h-4 w-4" />
                    {plan.status === 'modified' ? t('publishUpdateButton') : t('publishButton')}
                  </>
                )}
              </Button>
              {!hasBlocks && (
                <p className="text-xs text-amber-600">
                  {t('addBlocksFirst')}
                </p>
              )}
            </div>
          )}

          {isPlanPublished && (
            <div className="rounded-xl border border-green-500/20 bg-green-50 dark:bg-green-950/20 p-4">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">
                    {t('publishedTitle')}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {t('publishedDescription', { version: plan.currentVersion?.versionNumber ?? 0 })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-between border-t">
            <Button variant="outline" onClick={wizard.goToPrevStep}>
              <ChevronLeftIcon className="mr-1 h-4 w-4" />
              {tc('back')}
            </Button>
            <Button onClick={wizard.goToNextStep} disabled={!isPlanPublished}>
              {t('continueButton')}
              <ChevronRightIcon className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <PreviewDialog open={showPreview} onOpenChange={setShowPreview} plan={plan} />
      <VersionsDialog open={showVersions} onOpenChange={setShowVersions} planId={plan.id} />
      <ShareDialog
        open={showShare}
        onOpenChange={setShowShare}
        planId={plan.id}
        planName={plan.name}
        visibility={plan.visibility}
      />
    </>
  );
}

// Icons
function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function RocketIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
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

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
