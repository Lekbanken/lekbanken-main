'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PlanListPanel } from '@/features/planner/components/PlanListPanel';
import { PlannerTabs } from '@/features/planner/components/PlannerTabs';
import { 
  PlannerPageLayout, 
  PlannerPageHeader 
} from '@/features/planner/components/PlannerPageLayout';
import { CreatePlanDialog } from '@/features/planner/components/CreatePlanDialog';
import { fetchPlans, createPlan } from '@/features/planner/api';
import { useActionFeedback } from '@/features/planner/hooks/useActionFeedback';
import type { PlannerPlan } from '@/types/planner';

/**
 * Plan Library Page (/app/planner/plans)
 *
 * Shows the list of plans the user has access to.
 * Selecting a plan navigates to the wizard.
 */
export default function PlanLibraryPage() {
  const router = useRouter();
  const { withFeedback, isPending } = useActionFeedback();

  const [plans, setPlans] = useState<PlannerPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Load plans on mount
  useEffect(() => {
    const loadPlans = async () => {
      try {
        const loadedPlans = await fetchPlans();
        setPlans(loadedPlans);
      } catch (err) {
        console.error('Failed to load plans:', err);
      } finally {
        setIsLoading(false);
      }
    };
    void loadPlans();
  }, []);

  const handleSelectPlan = (planId: string) => {
    router.push(`/app/planner/plan/${planId}`);
  };

  const handleCreatePlan = async (name: string, description: string) => {
    const result = await withFeedback(
      'create-plan',
      async () => {
        const newPlan = await createPlan({ name, description });
        return newPlan;
      },
      { successMessage: 'Plan skapad!', errorMessage: 'Kunde inte skapa plan' }
    );
    if (result.data) {
      setPlans((prev) => [result.data!, ...prev]);
      setShowCreateDialog(false);
      router.push(`/app/planner/plan/${result.data.id}`);
    }
  };

  return (
    <PlannerPageLayout>
      <PlannerPageHeader 
        title="Planera" 
        eyebrow="App"
      />
      
      <PlannerTabs activeTab="plans" />

      <div className="mt-6">
        <PlanListPanel
          plans={plans}
          activePlanId={null}
          isLoading={isLoading}
          onSelectPlan={handleSelectPlan}
          onCreatePlan={() => setShowCreateDialog(true)}
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
