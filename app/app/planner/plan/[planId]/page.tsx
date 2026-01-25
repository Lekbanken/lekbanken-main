'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PlanWizard } from '@/features/planner/wizard';
import { PlannerTabs } from '@/features/planner/components/PlannerTabs';
import { 
  PlannerPageLayout, 
  PlannerPageHeader,
  PlannerEmptyState 
} from '@/features/planner/components/PlannerPageLayout';
import { usePlanWizard } from '@/features/planner/wizard/hooks/usePlanWizard';
import { fetchPlan } from '@/features/planner/api';
import type { PlannerPlan } from '@/types/planner';
import type { PlanCapabilities } from '@/lib/auth/capabilities';
import type { WizardStep } from '@/features/planner/wizard/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface PageProps {
  params: Promise<{ planId: string }>;
}

// Default capabilities for when API doesn't return them
const DEFAULT_CAPABILITIES: PlanCapabilities = {
  canRead: false,
  canUpdate: false,
  canDelete: false,
  canPublish: false,
  canSetVisibilityPublic: false,
  canCreateTemplate: false,
  canStartRun: false,
};

/**
 * Plan Wizard Page (/app/planner/plan/[planId])
 *
 * The 5-step wizard for editing a plan.
 * URL tracks current step via ?step= search param.
 */
export default function PlanWizardPage({ params }: PageProps) {
  const { planId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('planner.wizard.errors');

  const [plan, setPlan] = useState<PlannerPlan | null>(null);
  const [capabilities, setCapabilities] = useState<PlanCapabilities>(DEFAULT_CAPABILITIES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get initial step from URL or default to 'grund'
  const stepParam = searchParams.get('step') as WizardStep | null;
  const initialStep: WizardStep = stepParam && ['grund', 'bygg', 'anteckningar', 'granska', 'kor'].includes(stepParam)
    ? stepParam
    : 'grund';

  const wizard = usePlanWizard({ planId, initialStep });

  // Sync URL when step changes
  useEffect(() => {
    const currentUrlStep = searchParams.get('step');
    if (currentUrlStep !== wizard.currentStep) {
      const url = new URL(window.location.href);
      url.searchParams.set('step', wizard.currentStep);
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [wizard.currentStep, searchParams, router]);

  // Load plan
  useEffect(() => {
    const loadPlan = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await fetchPlan(planId);
        if (!result.plan) {
          setError('Planen kunde inte hittas.');
          return;
        }

        const caps = result.capabilities ?? DEFAULT_CAPABILITIES;

        // Non-editor - redirect to read-only view
        if (!caps.canUpdate) {
          router.replace(`/app/planner/${planId}`);
          return;
        }

        setPlan(result.plan);
        setCapabilities(caps);
      } catch (err) {
        console.error('Failed to load plan:', err);
        setError('Något gick fel vid hämtning av planen.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadPlan();
  }, [planId, router]);

  const handlePlanUpdate = (updatedPlan: PlannerPlan) => {
    setPlan(updatedPlan);
  };

  if (isLoading) {
    return (
      <PlannerPageLayout maxWidth="4xl">
        <PlannerTabs activeTab="edit" planId={planId} />
        <div className="mt-6 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </PlannerPageLayout>
    );
  }

  if (error || !plan) {
    return (
      <PlannerPageLayout maxWidth="4xl">
        <PlannerTabs activeTab="edit" planId={planId} />
        <div className="mt-6">
          <PlannerEmptyState
            icon={<ExclamationTriangleIcon className="h-16 w-16" />}
            title={error ?? t('planNotFound')}
            description={t('checkLink')}
            action={
              <Button href="/app/planner/plans">
                {t('goToPlans')}
              </Button>
            }
          />
        </div>
      </PlannerPageLayout>
    );
  }

  return (
    <PlannerPageLayout maxWidth="4xl">
      <PlannerPageHeader 
        title={plan.name}
        eyebrow="Planera"
        breadcrumbs={[
          { label: 'Mina planer', href: '/app/planner/plans' },
          { label: plan.name },
        ]}
      />
      
      <PlannerTabs activeTab="edit" planId={planId} planName={plan.name} />

      <div className="mt-6">
        <PlanWizard
          plan={plan}
          capabilities={capabilities}
          onPlanUpdate={handlePlanUpdate}
          wizard={wizard}
        />
      </div>
    </PlannerPageLayout>
  );
}
