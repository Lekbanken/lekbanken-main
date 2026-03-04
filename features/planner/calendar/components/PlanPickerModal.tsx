'use client';

/**
 * PlanPickerModal
 *
 * A dialog that lets the user pick one of their plans to schedule
 * on a specific calendar day. Includes search filtering.
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchPlans } from '@/features/planner/api';
import type { PlannerPlan, PlannerStatus } from '@/types/planner';

// =============================================================================
// Types
// =============================================================================

interface PlanPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the user picks a plan */
  onSelectPlan: (plan: PlannerPlan) => void;
  /** The date being scheduled (shown in the dialog subtitle) */
  scheduledDate?: string;
  /** Whether a schedule is being created */
  isSubmitting?: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

const statusVariant: Record<PlannerStatus, 'warning' | 'success' | 'primary'> = {
  draft: 'warning',
  published: 'success',
  modified: 'primary',
  archived: 'warning',
};

function formatDate(iso: string): string {
  const date = new Date(iso + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

// =============================================================================
// Component
// =============================================================================

export function PlanPickerModal({
  open,
  onOpenChange,
  onSelectPlan,
  scheduledDate,
  isSubmitting = false,
}: PlanPickerModalProps) {
  const t = useTranslations('planner');
  const tc = useTranslations('planner.wizard.calendar');

  const [plans, setPlans] = useState<PlannerPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Load plans when dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const data = await fetchPlans();
        if (!cancelled) {
          // Only show non-archived plans
          setPlans(data.filter((p) => p.status !== 'archived'));
        }
      } catch (err) {
        console.error('Failed to load plans for picker:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [open]);

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return plans;
    const q = search.toLowerCase();
    return plans.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
    );
  }, [plans, search]);

  const dateLabel = scheduledDate ? formatDate(scheduledDate) : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{tc('pickPlan')}</DialogTitle>
          {dateLabel && (
            <DialogDescription>{dateLabel}</DialogDescription>
          )}
        </DialogHeader>

        {/* Search */}
        <Input
          placeholder={t('search.placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          className="mb-2"
        />

        {/* Plan list */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px] max-h-[50vh]">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              {search ? t('noPlansByFilter') : t('noPlansYet')}
            </div>
          ) : (
            filtered.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => onSelectPlan(plan)}
                disabled={isSubmitting}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-border/60 bg-card p-3 text-left transition hover:border-primary/40 hover:bg-muted/40 disabled:opacity-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">
                    {plan.name || t('untitledPlan')}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={statusVariant[plan.status]} size="sm">
                      {t(`statusLabels.${plan.status}`)}
                    </Badge>
                    <span>{plan.blocks.length} block</span>
                    <span>{plan.totalTimeMinutes ?? 0} min</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0"
                  tabIndex={-1}
                  disabled={isSubmitting}
                >
                  {tc('schedule')}
                </Button>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
