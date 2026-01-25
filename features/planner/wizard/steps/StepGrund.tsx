'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { updatePlan, updateVisibility } from '../../api';
import { useActionFeedback } from '../../hooks/useActionFeedback';
import type { PlannerPlan, PlannerVisibility } from '@/types/planner';
import type { UsePlanWizardResult } from '../hooks/usePlanWizard';

interface StepGrundProps {
  plan: PlannerPlan;
  capabilities: {
    canUpdate: boolean;
    canSetVisibilityPublic?: boolean;
  };
  onPlanUpdate: (plan: PlannerPlan) => void;
  wizard: UsePlanWizardResult;
}

export function StepGrund({ plan, capabilities, onPlanUpdate, wizard }: StepGrundProps) {
  const t = useTranslations('planner.wizard.steps.grund');
  const tv = useTranslations('planner.wizard.visibility');
  const { withFeedback, isPending } = useActionFeedback();

  // Initialize form state from plan (no sync effect needed - use plan.id as key)
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description ?? '');
  const [visibility, setVisibility] = useState<PlannerVisibility>(plan.visibility);

  // Reset state when plan changes using useMemo to track plan.id
  const planId = plan.id;
  useMemo(() => {
    setName(plan.name);
    setDescription(plan.description ?? '');
    setVisibility(plan.visibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  const hasChanges =
    name !== plan.name ||
    description !== (plan.description ?? '') ||
    visibility !== plan.visibility;

  const handleSave = async () => {
    if (!capabilities.canUpdate) return;

    // Update basic info
    if (name !== plan.name || description !== (plan.description ?? '')) {
      await withFeedback(
        `update-plan-${plan.id}`,
        async () => {
          const updated = await updatePlan(plan.id, {
            name: name.trim() || plan.name,
            description: description.trim() || null,
          });
          onPlanUpdate(updated);
          return updated;
        },
        { errorMessage: 'Kunde inte spara ändringar' }
      );
    }

    // Update visibility separately if changed
    if (visibility !== plan.visibility) {
      await withFeedback(
        `update-visibility-${plan.id}`,
        async () => {
          const updated = await updateVisibility(plan.id, {
            visibility,
            owner_tenant_id: plan.ownerTenantId ?? null,
          });
          onPlanUpdate(updated);
          return updated;
        },
        { errorMessage: 'Kunde inte ändra synlighet' }
      );
    }
  };

  const handleSaveAndContinue = async () => {
    if (hasChanges) {
      await handleSave();
    }
    wizard.goToNextStep();
  };

  const isSaving = isPending(`update-plan-${plan.id}`) || isPending(`update-visibility-${plan.id}`);
  const canSetPublic = capabilities.canSetVisibilityPublic !== false;

  const visibilityOptions = [
    { value: 'private', label: tv('private') },
    { value: 'tenant', label: tv('tenant') },
    { value: 'public', label: tv('public'), disabled: !canSetPublic },
  ];

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
            1
          </span>
          {t('title')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('description')}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="plan-name">{t('nameLabel')} *</Label>
          <Input
            id="plan-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('namePlaceholder')}
            disabled={!capabilities.canUpdate}
            maxLength={100}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="plan-description">{t('descriptionLabel')}</Label>
          <Textarea
            id="plan-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('descriptionPlaceholder')}
            disabled={!capabilities.canUpdate}
            rows={3}
          />
        </div>

        {/* Visibility */}
        <div className="space-y-2">
          <Label htmlFor="plan-visibility">{t('visibilityLabel')}</Label>
          <Select
            id="plan-visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as PlannerVisibility)}
            disabled={!capabilities.canUpdate}
            options={visibilityOptions}
            className="w-full sm:w-[200px]"
          />
          <p className="text-xs text-muted-foreground">
            {visibility === 'private' && t('visibilityPrivate')}
            {visibility === 'tenant' && t('visibilityTenant')}
            {visibility === 'public' && t('visibilityPublic')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-between">
          <div />
          <div className="flex gap-2">
            {hasChanges && (
              <Button
                variant="outline"
                onClick={() => void handleSave()}
                disabled={isSaving || !capabilities.canUpdate}
              >
                {isSaving ? t('saving') : t('saveButton')}
              </Button>
            )}
            <Button onClick={() => void handleSaveAndContinue()} disabled={isSaving}>
              {isSaving ? t('saving') : t('continueButton')}
              <ChevronRightIcon className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
