'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PlanListPanel } from '@/features/planner/components/PlanListPanel';
import { PlannerTabs } from '@/features/planner/components/PlannerTabs';
import { PlannerPageLayout } from '@/features/planner/components/PlannerPageLayout';
import { PageTitleHeader } from '@/components/app/PageTitleHeader';
import { appNavItems } from '@/components/app/nav-items';
import { Button } from '@/components/ui/button';
import { CreatePlanDialog } from '@/features/planner/components/CreatePlanDialog';
import { fetchPlans, createPlan } from '@/features/planner/api';
import { useActionFeedback } from '@/features/planner/hooks/useActionFeedback';
import { useTenant } from '@/lib/context/TenantContext';
import { PlusIcon } from '@heroicons/react/24/outline';
import type { PlannerPlan } from '@/types/planner';
import type { PlanScope } from '@/features/planner/components/ScopeSelector';

/**
 * Plan Library Page (/app/planner/plans)
 *
 * Shows the list of plans the user has access to.
 * Selecting a plan navigates to the wizard.
 */
export default function PlanLibraryPage() {
  const router = useRouter();
  const { withFeedback, isPending } = useActionFeedback();
  const t = useTranslations('planner');
  const { currentTenant } = useTenant();

  const [plans, setPlans] = useState<PlannerPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [currentScope, setCurrentScope] = useState<PlanScope>('mine');

  // Load plans based on scope
  const loadPlans = useCallback(async (scope: PlanScope = 'mine') => {
    setIsLoading(true);
    try {
      const params: { scope: PlanScope; tenantId?: string } = { scope };
      if (scope === 'org' && currentTenant?.id) {
        params.tenantId = currentTenant.id;
      }
      const loadedPlans = await fetchPlans(params);
      setPlans(loadedPlans);
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant?.id]);

  useEffect(() => {
    void loadPlans(currentScope);
  }, [loadPlans, currentScope]);

  const handleScopeChange = useCallback((scope: PlanScope) => {
    setCurrentScope(scope);
  }, []);

  const handleSelectPlan = (planId: string) => {
    router.push(`/app/planner/plan/${planId}`);
  };

  const handleEditPlan = (planId: string) => {
    router.push(`/app/planner/plan/${planId}?step=build`);
  };

  const handleCreatePlan = async (name: string, description: string) => {
    const result = await withFeedback(
      'create-plan',
      async () => {
        const newPlan = await createPlan({ name, description });
        return newPlan;
      },
      { successMessage: t('planCreated'), errorMessage: t('planCreateError') }
    );
    if (result.data) {
      setPlans((prev) => [result.data!, ...prev]);
      setShowCreateDialog(false);
      router.push(`/app/planner/plan/${result.data.id}`);
    }
  };

  const plannerIcon = appNavItems.find((item) => item.href === '/app/planner')?.icon;

  return (
    <PlannerPageLayout>
      <PageTitleHeader
        icon={plannerIcon}
        title={t('pageHeaderTitle')}
        subtitle={t('pageSubtitle')}
        rightSlot={
          <Button size="sm" variant="primary" className="gap-1" onClick={() => setShowCreateDialog(true)} disabled={isPending('create-plan')}>
            <PlusIcon className="h-4 w-4" />
            {t('newPlan')}
          </Button>
        }
      />
      
      <PlannerTabs activeTab="plans" />

      <div className="mt-6">
        <PlanListPanel
          plans={plans}
          activePlanId={null}
          isLoading={isLoading}
          onSelectPlan={handleSelectPlan}
          onEditPlan={handleEditPlan}
          onCreatePlan={() => setShowCreateDialog(true)}
          onScopeChange={handleScopeChange}
          isCreating={isPending('create-plan')}
        />
      </div>

      <CreatePlanDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreatePlan}
        isSubmitting={isPending('create-plan')}
      />
    </PlannerPageLayout>
  );
}
