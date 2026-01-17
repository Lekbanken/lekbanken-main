'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  DocumentTextIcon,
  PuzzlePieceIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { createPlan, addBlock } from '../api';
import { useTenant } from '@/lib/context/TenantContext';
import type { PlannerPlan, PlannerBlock } from '../types';

// ============================================================================
// TYPES
// ============================================================================

interface WizardStep {
  id: 'basics' | 'template' | 'activities' | 'confirm';
  icon: React.ComponentType<{ className?: string }>;
}

interface PlanTemplate {
  id: 'empty' | 'warmup' | 'workshop' | 'teambuilding';
  icon: React.ComponentType<{ className?: string }>;
  blocks: Array<{
    block_type: PlannerBlock['blockType'];
    title?: string;
    duration_minutes: number;
  }>;
}

interface CreatePlanWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlanCreated: (plan: PlannerPlan) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'basics',
    icon: DocumentTextIcon,
  },
  {
    id: 'template',
    icon: SparklesIcon,
  },
  {
    id: 'activities',
    icon: PuzzlePieceIcon,
  },
  {
    id: 'confirm',
    icon: CheckIcon,
  },
];

const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: 'empty',
    icon: DocumentTextIcon,
    blocks: [],
  },
  {
    id: 'warmup',
    icon: SparklesIcon,
    blocks: [
      { block_type: 'preparation', title: 'Samla gruppen', duration_minutes: 2 },
      { block_type: 'game', duration_minutes: 5 },
      { block_type: 'game', duration_minutes: 5 },
      { block_type: 'game', duration_minutes: 5 },
      { block_type: 'pause', title: 'Kort paus', duration_minutes: 3 },
    ],
  },
  {
    id: 'workshop',
    icon: CalendarIcon,
    blocks: [
      { block_type: 'preparation', title: 'Välkomna och introduktion', duration_minutes: 5 },
      { block_type: 'game', duration_minutes: 15 },
      { block_type: 'pause', title: 'Paus', duration_minutes: 10 },
      { block_type: 'game', duration_minutes: 20 },
      { block_type: 'game', duration_minutes: 15 },
      { block_type: 'custom', title: 'Reflektion och avslut', duration_minutes: 10 },
    ],
  },
  {
    id: 'teambuilding',
    icon: PuzzlePieceIcon,
    blocks: [
      { block_type: 'preparation', title: 'Intro och indelning', duration_minutes: 10 },
      { block_type: 'game', duration_minutes: 20 },
      { block_type: 'game', duration_minutes: 20 },
      { block_type: 'pause', title: 'Fika', duration_minutes: 15 },
      { block_type: 'game', duration_minutes: 30 },
      { block_type: 'pause', title: 'Lunch', duration_minutes: 45 },
      { block_type: 'game', duration_minutes: 25 },
      { block_type: 'game', duration_minutes: 25 },
      { block_type: 'custom', title: 'Sammanfattning', duration_minutes: 15 },
    ],
  },
];

// ============================================================================
// STEP COMPONENTS
// ============================================================================

interface StepBasicsProps {
  name: string;
  description: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  t: ReturnType<typeof useTranslations<'admin.planner.createWizard'>>;
}

function StepBasics({ name, description, onNameChange, onDescriptionChange, t }: StepBasicsProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="plan-name" className="text-sm font-medium text-foreground">
          {t('nameLabel')} <span className="text-destructive">*</span>
        </label>
        <Input
          id="plan-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t('namePlaceholder')}
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          {t('nameHelp')}
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="plan-description" className="text-sm font-medium text-foreground">
          {t('descriptionLabel')}
        </label>
        <Textarea
          id="plan-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={t('descriptionPlaceholder')}
          rows={3}
        />
      </div>
    </div>
  );
}

interface StepTemplateProps {
  selectedTemplate: string;
  onSelectTemplate: (templateId: string) => void;
  t: ReturnType<typeof useTranslations<'admin.planner.createWizard'>>;
}

function StepTemplate({ selectedTemplate, onSelectTemplate, t }: StepTemplateProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t('templateHelp')}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {PLAN_TEMPLATES.map((template) => {
          const Icon = template.icon;
          const isSelected = selectedTemplate === template.id;
          const blockCount = template.blocks.length;
          const totalDuration = template.blocks.reduce((sum, b) => sum + b.duration_minutes, 0);
          const templateName = t(`templates.${template.id}.name` as const);
          const templateDesc = t(`templates.${template.id}.description` as const);

          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelectTemplate(template.id)}
              className={cn(
                'relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all',
                isSelected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border/60 bg-card hover:border-primary/40 hover:bg-muted/50'
              )}
            >
              {isSelected && (
                <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <CheckIcon className="h-3 w-3" />
                </div>
              )}
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  isSelected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{templateName}</h3>
                <p className="text-sm text-muted-foreground">{templateDesc}</p>
              </div>
              {blockCount > 0 && (
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span>{blockCount} block</span>
                  <span>•</span>
                  <span>~{totalDuration} min</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface StepActivitiesProps {
  selectedTemplate: string;
  t: ReturnType<typeof useTranslations<'admin.planner.createWizard'>>;
}

function StepActivities({ selectedTemplate, t }: StepActivitiesProps) {
  const template = PLAN_TEMPLATES.find((tp) => tp.id === selectedTemplate);
  const blocks = template?.blocks ?? [];

  const formatBlockType = (type: PlannerBlock['blockType']): string => {
    return t(`blockTypes.${type}` as const);
  };

  if (selectedTemplate === 'empty' || blocks.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-border/60 bg-muted/30 p-6 text-center">
          <PuzzlePieceIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-3 font-medium text-foreground">{t('activitiesEmptyTitle')}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('activitiesEmptyText')}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('activitiesEmptyTip')}
        </p>
      </div>
    );
  }

  const templateName = t(`templates.${template?.id ?? 'empty'}.name` as const);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t('templateBlocksInfo', { templateName })}
      </p>
      <div className="space-y-2">
        {blocks.map((block, index) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-4 py-3"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
              {index + 1}
            </span>
            <div className="flex-1">
              <span className="font-medium text-foreground">
                {block.title || formatBlockType(block.block_type)}
              </span>
            </div>
            <span className="text-sm text-muted-foreground">{block.duration_minutes} min</span>
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm">
        <strong>{t('confirmBlocks')}:</strong> {blocks.length} block, ~
        {blocks.reduce((sum, b) => sum + b.duration_minutes, 0)} min
      </div>
    </div>
  );
}

interface StepConfirmProps {
  name: string;
  description: string;
  selectedTemplate: string;
  t: ReturnType<typeof useTranslations<'admin.planner.createWizard'>>;
}

function StepConfirm({ name, description, selectedTemplate, t }: StepConfirmProps) {
  const template = PLAN_TEMPLATES.find((tp) => tp.id === selectedTemplate);
  const blocks = template?.blocks ?? [];
  const templateName = t(`templates.${template?.id ?? 'empty'}.name` as const);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/60 bg-card p-5">
        <h3 className="text-lg font-semibold text-foreground">{name || t('confirmNoDescription')}</h3>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
            <SparklesIcon className="h-4 w-4 text-primary" />
            {t('confirmTemplate')}: {templateName}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
            <PuzzlePieceIcon className="h-4 w-4 text-muted-foreground" />
            {blocks.length} block
          </span>
          {blocks.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />~
              {blocks.reduce((sum, b) => sum + b.duration_minutes, 0)} min
            </span>
          )}
        </div>
      </div>

      <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 text-sm text-primary">
        <strong>{t('nextStepsLabel')}</strong> {t('confirmNextSteps')}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CreatePlanWizard({ open, onOpenChange, onPlanCreated }: CreatePlanWizardProps) {
  const { currentTenant } = useTenant();
  const t = useTranslations('admin.planner.createWizard');

  // Form state
  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('empty');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = WIZARD_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;
  const canProceed = currentStep === 0 ? name.trim().length > 0 : true;

  const resetForm = useCallback(() => {
    setCurrentStep(0);
    setName('');
    setDescription('');
    setSelectedTemplate('empty');
    setError(null);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      // 1. Create the plan
      const plan = await createPlan({
        name: name.trim(),
        description: description.trim() || null,
        visibility: 'private',
        owner_tenant_id: currentTenant?.id ?? null,
      });

      // 2. Add template blocks if applicable
      const template = PLAN_TEMPLATES.find((t) => t.id === selectedTemplate);
      if (template && template.blocks.length > 0) {
        for (let i = 0; i < template.blocks.length; i++) {
          const block = template.blocks[i];
          await addBlock(plan.id, {
            block_type: block.block_type,
            title: block.title,
            duration_minutes: block.duration_minutes,
            position: i,
          });
        }
      }

      // 3. Callback and close
      onPlanCreated(plan);
      onOpenChange(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.createFailed'));
    } finally {
      setIsCreating(false);
    }
  }, [name, description, selectedTemplate, currentTenant?.id, onPlanCreated, onOpenChange, resetForm, t]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      void handleCreate();
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
    }
  }, [isLastStep, handleCreate]);

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const stepDescription = t(`steps.${step.id}.description` as const);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="flex h-[85vh] flex-col overflow-hidden rounded-t-3xl sm:max-w-xl sm:mx-auto"
      >
        {/* Drag handle */}
        <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-muted" aria-hidden />

        <SheetHeader className="px-1">
          <SheetTitle className="text-lg">{t('title')}</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {stepDescription}
          </p>
        </SheetHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          {WIZARD_STEPS.map((s, index) => {
            const Icon = s.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div key={s.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => index < currentStep && setCurrentStep(index)}
                  disabled={index > currentStep}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full transition-all',
                    isActive && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                    isCompleted && 'bg-primary/20 text-primary hover:bg-primary/30',
                    !isActive && !isCompleted && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <CheckIcon className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </button>
                {index < WIZARD_STEPS.length - 1 && (
                  <div
                    className={cn(
                      'h-0.5 w-8 rounded-full',
                      isCompleted ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-1 py-4">
          {currentStep === 0 && (
            <StepBasics
              name={name}
              description={description}
              onNameChange={setName}
              onDescriptionChange={setDescription}
              t={t}
            />
          )}
          {currentStep === 1 && (
            <StepTemplate
              selectedTemplate={selectedTemplate}
              onSelectTemplate={setSelectedTemplate}
              t={t}
            />
          )}
          {currentStep === 2 && <StepActivities selectedTemplate={selectedTemplate} t={t} />}
          {currentStep === 3 && (
            <StepConfirm
              name={name}
              description={description}
              selectedTemplate={selectedTemplate}
              t={t}
            />
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        {/* Footer with navigation */}
        <SheetFooter className="flex-row gap-2 border-t border-border/60 pt-4">
          {!isFirstStep && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={isCreating}
              className="gap-1"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              {t('buttons.back')}
            </Button>
          )}
          <div className="flex-1" />
          <Button
            type="button"
            variant="primary"
            onClick={handleNext}
            disabled={!canProceed || isCreating}
            className="gap-1"
          >
            {isCreating ? (
              t('buttons.creating')
            ) : isLastStep ? (
              <>
                {t('buttons.create')}
                <CheckIcon className="h-4 w-4" />
              </>
            ) : (
              <>
                {t('buttons.next')}
                <ChevronRightIcon className="h-4 w-4" />
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
