'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '../../components/StatusBadge';
import type { PlannerPlan } from '@/types/planner';
import type { UsePlanWizardResult } from '../hooks/usePlanWizard';

interface StepKorProps {
  plan: PlannerPlan;
  capabilities: {
    canStartRun: boolean;
  };
  onPlanUpdate: (plan: PlannerPlan) => void;
  wizard: UsePlanWizardResult;
}

export function StepKor({ plan, capabilities, wizard }: StepKorProps) {
  const router = useRouter();
  const t = useTranslations('planner.wizard.steps.kor');
  const tc = useTranslations('common.actions');

  const isPlanPublished = plan.status === 'published';
  const hasBlocks = plan.blocks.length > 0;
  const canRun = capabilities.canStartRun && isPlanPublished && hasBlocks;
  const totalDuration = plan.blocks.reduce((sum, b) => sum + (b.durationMinutes ?? 0), 0);

  const handleStartRun = () => {
    router.push(`/app/play/${plan.id}/start`);
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
            5
          </span>
          {t('title')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Plan Overview */}
        <div className="rounded-xl border border-border/60 bg-gradient-to-br from-primary/5 to-transparent p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold">{plan.name}</h3>
              {plan.description && (
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              )}
            </div>
            <StatusBadge status={plan.status} size="sm" />
          </div>

          <div className="mt-4 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <BlocksIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{plan.blocks.length} block</span>
            </div>
            <div className="flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{totalDuration} min</span>
            </div>
            {plan.currentVersion && (
              <Badge variant="outline">v{plan.currentVersion.versionNumber}</Badge>
            )}
          </div>
        </div>

        {/* Run Status */}
        {canRun ? (
          <div className="rounded-xl border-2 border-green-500/30 bg-green-50 dark:bg-green-950/20 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
                <PlayIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-green-800 dark:text-green-200">
                  {t('readyTitle')}
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {t('readyDescription')}
                </p>
              </div>
            </div>
            <Button
              size="lg"
              onClick={handleStartRun}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
            >
              <PlayIcon className="mr-2 h-5 w-5" />
              {t('startButton')}
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
                <AlertIcon className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h4 className="font-semibold text-amber-800 dark:text-amber-200">
                  {t('notReadyTitle')}
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {!isPlanPublished
                    ? t('notReadyNotPublished')
                    : !hasBlocks
                    ? t('notReadyNoBlocks')
                    : t('notReadyNoPermission')}
                </p>
              </div>
            </div>
            {!isPlanPublished && (
              <Button variant="outline" onClick={() => wizard.goToStep('granska')}>
                {t('goToGranska')}
              </Button>
            )}
            {isPlanPublished && !hasBlocks && (
              <Button variant="outline" onClick={() => wizard.goToStep('bygg')}>
                {t('goToBygg')}
              </Button>
            )}
          </div>
        )}

        {/* Quick Tips */}
        <div className="rounded-xl bg-muted/50 p-4 space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <LightbulbIcon className="h-4 w-4 text-amber-500" />
            {t('tipsTitle')}
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>{t('tip1')}</li>
            <li>{t('tip2')}</li>
            <li>{t('tip3')}</li>
          </ul>
        </div>

        {/* Navigation */}
        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-between border-t">
          <Button variant="outline" onClick={wizard.goToPrevStep}>
            <ChevronLeftIcon className="mr-1 h-4 w-4" />
            {tc('back')}
          </Button>
          <div />
        </div>
      </CardContent>
    </Card>
  );
}

// Icons
function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function BlocksIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
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
