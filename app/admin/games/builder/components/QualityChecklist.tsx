'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

type ChecklistItemProps = {
  label: string;
  checked: boolean;
  optional?: boolean;
};

function ChecklistItem({ label, checked, optional }: ChecklistItemProps) {
  const t = useTranslations('admin.games.builder');
  return (
    <div className="flex items-center gap-2 text-sm">
      {checked ? (
        <CheckCircleIcon className="h-4 w-4 text-emerald-500 flex-shrink-0" />
      ) : (
        <div className={cn(
          'h-4 w-4 rounded-full border-2 flex-shrink-0',
          optional ? 'border-muted-foreground/40' : 'border-muted-foreground'
        )} />
      )}
      <span className={cn(
        checked ? 'text-foreground' : 'text-muted-foreground',
        optional && !checked && 'italic'
      )}>
        {label}
        {optional && !checked && ` (${t('quality.optional')})`}
      </span>
    </div>
  );
}

type ChecklistSectionProps = {
  title: string;
  items: { label: string; checked: boolean; optional?: boolean }[];
  status: 'incomplete' | 'complete' | 'warning';
};

function ChecklistSection({ title, items, status }: ChecklistSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {status === 'complete' && (
          <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
        )}
        {status === 'warning' && (
          <ExclamationCircleIcon className="h-4 w-4 text-amber-500" />
        )}
        <h4 className={cn(
          'text-xs font-semibold uppercase tracking-wider',
          status === 'complete' ? 'text-emerald-600' : 'text-muted-foreground'
        )}>
          {title}
        </h4>
      </div>
      <div className="space-y-1.5 pl-1">
        {items.map((item, idx) => (
          <ChecklistItem key={idx} {...item} />
        ))}
      </div>
    </div>
  );
}

export type QualityState = {
  name: boolean;
  shortDescription: boolean;
  purposeSelected: boolean;
  subPurposeSelected: boolean;
  coverImageSelected: boolean;
  hasStepsOrDescription: boolean;
  energyLevel: boolean;
  location: boolean;
  allRequiredMet: boolean;
  noValidationErrors: boolean;
  reviewed: boolean;
};

type QualityChecklistProps = {
  state: QualityState;
  status: 'draft' | 'published';
};

export function QualityChecklist({ state, status }: QualityChecklistProps) {
  const t = useTranslations('admin.games.builder');
  const draftItems = useMemo(() => [
    { label: t('quality.items.draft.name'), checked: state.name },
  ], [state.name, t]);

  const playableItems = useMemo(() => [
    { label: t('quality.items.playable.shortDescription'), checked: state.shortDescription },
    { label: t('quality.items.playable.purposeSelected'), checked: state.purposeSelected },
    { label: t('quality.items.playable.subPurposeSelected'), checked: state.subPurposeSelected, optional: true },
    { label: t('quality.items.playable.stepsOrDescription'), checked: state.hasStepsOrDescription },
    { label: t('quality.items.playable.energyLevel'), checked: state.energyLevel, optional: true },
    { label: t('quality.items.playable.location'), checked: state.location, optional: true },
  ], [state, t]);

  const publishableItems = useMemo(() => [
    { label: t('quality.items.publishable.coverImage'), checked: state.coverImageSelected },
    { label: t('quality.items.publishable.allRequired'), checked: state.allRequiredMet },
    { label: t('quality.items.publishable.noValidationErrors'), checked: state.noValidationErrors },
  ], [state.allRequiredMet, state.noValidationErrors, state.coverImageSelected, t]);

  const draftComplete = draftItems.every((i) => i.checked);
  const playableComplete = playableItems.filter((i) => !i.optional).every((i) => i.checked);
  const publishableComplete = publishableItems.every((i) => i.checked);

  const overallStatus = useMemo(() => {
    if (publishableComplete && playableComplete && draftComplete) return 'publishable';
    if (playableComplete && draftComplete) return 'playable';
    if (draftComplete) return 'draft';
    return 'incomplete';
  }, [draftComplete, playableComplete, publishableComplete]);

  const statusBadge = {
    incomplete: { label: t('quality.status.incomplete'), color: 'bg-muted text-muted-foreground' },
    draft: { label: t('quality.status.draft'), color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    playable: { label: t('quality.status.playable'), color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    publishable: { label: t('quality.status.publishable'), color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  }[overallStatus];

  return (
    <div className="space-y-6 p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">{t('quality.title')}</h3>
        <div className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
          statusBadge.color
        )}>
          {statusBadge.label}
        </div>
      </div>

      <ChecklistSection
        title={t('quality.sections.draft')}
        items={draftItems}
        status={draftComplete ? 'complete' : 'incomplete'}
      />

      <ChecklistSection
        title={t('quality.sections.playable')}
        items={playableItems}
        status={playableComplete ? 'complete' : draftComplete ? 'warning' : 'incomplete'}
      />

      <ChecklistSection
        title={t('quality.sections.publishable')}
        items={publishableItems}
        status={publishableComplete ? 'complete' : 'incomplete'}
      />

      {status === 'published' && (
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-3 text-sm text-emerald-700 dark:text-emerald-400">
          {t('quality.published')}
        </div>
      )}
    </div>
  );
}
