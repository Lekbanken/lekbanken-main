'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { savePrivateNote, saveTenantNote } from '../../api';
import { useActionFeedback } from '../../hooks/useActionFeedback';
import { useTenant } from '@/lib/context/TenantContext';
import type { PlannerPlan } from '@/types/planner';
import type { UsePlanWizardResult } from '../hooks/usePlanWizard';

interface StepAnteckningarProps {
  plan: PlannerPlan;
  capabilities: {
    canUpdate: boolean;
  };
  onPlanUpdate: (plan: PlannerPlan) => void;
  wizard: UsePlanWizardResult;
}

export function StepAnteckningar({ plan, capabilities: _capabilities, onPlanUpdate: _onPlanUpdate, wizard }: StepAnteckningarProps) {
  const t = useTranslations('planner.wizard.steps.anteckningar');
  const tc = useTranslations('common.actions');
  const { withSilentFeedback, isPending } = useActionFeedback();
  const { currentTenant } = useTenant();

  const [privateNotes, setPrivateNotes] = useState(plan.notes?.privateNote?.content ?? '');
  const [tenantNotes, setTenantNotes] = useState(plan.notes?.tenantNote?.content ?? '');

  // Reset state when plan changes using useMemo to track plan.id
  const planId = plan.id;
  useMemo(() => {
    setPrivateNotes(plan.notes?.privateNote?.content ?? '');
    setTenantNotes(plan.notes?.tenantNote?.content ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  const handleSavePrivateNotes = async () => {
    if (privateNotes === (plan.notes?.privateNote?.content ?? '')) return;

    await withSilentFeedback(
      `save-private-notes-${plan.id}`,
      async () => {
        await savePrivateNote(plan.id, privateNotes);
      },
      { errorMessage: 'Kunde inte spara privat anteckning' }
    );
  };

  const handleSaveTenantNotes = async () => {
    if (!currentTenant?.id) return;
    if (plan.visibility === 'private') return;
    if (tenantNotes === (plan.notes?.tenantNote?.content ?? '')) return;

    await withSilentFeedback(
      `save-tenant-notes-${plan.id}`,
      async () => {
        await saveTenantNote(plan.id, tenantNotes, currentTenant.id);
      },
      { errorMessage: 'Kunde inte spara delad anteckning' }
    );
  };

  const showTenantNotes = plan.visibility !== 'private';
  const canEditTenantNotes = showTenantNotes && Boolean(currentTenant);
  const isSaving = isPending(`save-private-notes-${plan.id}`) || isPending(`save-tenant-notes-${plan.id}`);

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
            3
          </span>
          {t('title')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('description')}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Private Notes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="private-notes" className="flex items-center gap-2">
              <LockIcon className="h-4 w-4 text-muted-foreground" />
              {t('privateNotesLabel')}
            </Label>
            <span className="text-xs text-muted-foreground">{t('privateNotesHint')}</span>
          </div>
          <Textarea
            id="private-notes"
            value={privateNotes}
            onChange={(e) => setPrivateNotes(e.target.value)}
            onBlur={() => void handleSavePrivateNotes()}
            placeholder={t('privateNotesPlaceholder')}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            {t('privateNotesDescription')}
          </p>
        </div>

        {/* Tenant Notes */}
        {showTenantNotes && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="tenant-notes" className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4 text-muted-foreground" />
                {t('tenantNotesLabel')}
              </Label>
              <span className="text-xs text-muted-foreground">{t('tenantNotesHint')}</span>
            </div>
            <Textarea
              id="tenant-notes"
              value={tenantNotes}
              onChange={(e) => setTenantNotes(e.target.value)}
              onBlur={() => void handleSaveTenantNotes()}
              placeholder={t('tenantNotesPlaceholder')}
              rows={4}
              className="resize-none"
              disabled={!canEditTenantNotes}
            />
            <p className="text-xs text-muted-foreground">
              {t('tenantNotesDescription')}
            </p>
          </div>
        )}

        {!showTenantNotes && (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground text-center">
              {t('tenantNotesDisabled')}
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-between border-t">
          <Button variant="outline" onClick={wizard.goToPrevStep}>
            <ChevronLeftIcon className="mr-1 h-4 w-4" />
            {tc('back')}
          </Button>
          <Button onClick={wizard.goToNextStep} disabled={isSaving}>
            {isSaving ? tc('saving') : t('continueButton')}
            <ChevronRightIcon className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
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
