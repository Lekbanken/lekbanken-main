'use client';

import { Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MobileWizardStepper } from './MobileWizardStepper';
import { StepGrund } from './steps/StepGrund';
import { StepByggPlan } from './steps/StepByggPlan';
import { StepAnteckningar } from './steps/StepAnteckningar';
import { StepGranska } from './steps/StepGranska';
import { StepKor } from './steps/StepKor';
import type { PlannerPlan } from '@/types/planner';
import type { WizardStep } from './types';
import type { UsePlanWizardResult } from './hooks/usePlanWizard';

interface PlanWizardProps {
  plan: PlannerPlan;
  capabilities: {
    canUpdate: boolean;
    canDelete: boolean;
    canPublish: boolean;
    canStartRun: boolean;
    canSetVisibilityPublic?: boolean;
  };
  onPlanUpdate: (plan: PlannerPlan) => void;
  wizard: UsePlanWizardResult;
}

export function PlanWizard({ plan, capabilities, onPlanUpdate, wizard }: PlanWizardProps) {
  const renderStep = () => {
    const stepProps = {
      plan,
      capabilities,
      onPlanUpdate,
      wizard,
    };

    switch (wizard.currentStep) {
      case 'grund':
        return <StepGrund {...stepProps} />;
      case 'bygg':
        return <StepByggPlan {...stepProps} />;
      case 'anteckningar':
        return <StepAnteckningar {...stepProps} />;
      case 'granska':
        return <StepGranska {...stepProps} />;
      case 'kor':
        return <StepKor {...stepProps} />;
      default:
        return <StepGrund {...stepProps} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Navigation - Mobile-optimized */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <MobileWizardStepper
            currentStep={wizard.currentStep}
            steps={wizard.steps}
            onStepClick={wizard.goToStep}
          />
        </CardContent>
      </Card>

      {/* Step Content */}
      <Suspense fallback={<StepSkeleton />}>
        {renderStep()}
      </Suspense>
    </div>
  );
}

function StepSkeleton() {
  return (
    <Card className="border-border/60">
      <CardContent className="p-6 space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-24" />
      </CardContent>
    </Card>
  );
}

export type { WizardStep };
