'use client';

/**
 * AddToPlanModal
 *
 * A dialog that lets the user pick one of their plans and add the
 * current game as a block. Used from the game detail page.
 *
 * Flow:
 *   Game detail → "Lägg till i plan" → Pick plan → addBlock() → Toast
 *
 * Follows the same pattern as PlanPickerModal (search, skeleton, plan list).
 *
 * Race-safety:
 *   - pendingPlanIds (Set) allows parallel adds to different plans
 *   - addedToPlanIds prevents duplicate adds to same plan
 *   - Block count updated optimistically in local state
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import { useToast } from '@/components/ui/toast';
import { fetchPlans, addBlock } from '@/features/planner/api';
import type { PlannerPlan, PlannerStatus } from '@/types/planner';
import { CheckIcon, PlusIcon } from '@heroicons/react/24/outline';

// =============================================================================
// Types
// =============================================================================

interface AddToPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The game to add as a block */
  gameId: string;
  gameName: string;
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

// =============================================================================
// Component
// =============================================================================

export function AddToPlanModal({
  open,
  onOpenChange,
  gameId,
  gameName,
}: AddToPlanModalProps) {
  const t = useTranslations('planner');
  const ta = useTranslations('planner.addToPlanModal');
  const toast = useToast();
  const router = useRouter();

  const [plans, setPlans] = useState<PlannerPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [pendingPlanIds, setPendingPlanIds] = useState<Set<string>>(new Set());
  const [addedToPlanIds, setAddedToPlanIds] = useState<Set<string>>(new Set());

  // Load plans when dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const data = await fetchPlans();
        if (!cancelled) {
          setPlans(data.filter((p) => p.status !== 'archived'));
        }
      } catch (err) {
        console.error('Failed to load plans:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [open]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSearch('');
      setAddedToPlanIds(new Set());
      setPendingPlanIds(new Set());
    }
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

  const handleAdd = useCallback(async (plan: PlannerPlan) => {
    if (pendingPlanIds.has(plan.id) || addedToPlanIds.has(plan.id)) return;
    // Guard: plan may have been deleted in another tab
    if (!plans.find((p) => p.id === plan.id)) return;

    setPendingPlanIds((prev) => new Set(prev).add(plan.id));
    try {
      await addBlock(plan.id, {
        block_type: 'game',
        game_id: gameId,
      });
      setAddedToPlanIds((prev) => new Set(prev).add(plan.id));

      // Optimistic block count update
      setPlans((prev) =>
        prev.map((p) =>
          p.id === plan.id
            ? {
                ...p,
                blocks: [
                  ...p.blocks,
                  {
                    id: crypto.randomUUID(),
                    planId: plan.id,
                    position: p.blocks.length,
                    blockType: 'game' as const,
                    game: null,
                  },
                ],
              }
            : p
        )
      );

      toast.success(ta('addedToPlan', { planName: plan.name || t('untitledPlan') }));
    } catch (err) {
      console.error('Failed to add block to plan:', err);
      toast.error(ta('addFailed'));
    } finally {
      setPendingPlanIds((prev) => {
        const next = new Set(prev);
        next.delete(plan.id);
        return next;
      });
    }
  }, [gameId, plans, pendingPlanIds, addedToPlanIds, t, ta, toast]);

  const handleGoToPlan = useCallback((planId: string) => {
    onOpenChange(false);
    router.push(`/app/planner/plan/${planId}?step=build`);
  }, [onOpenChange, router]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{ta('title')}</DialogTitle>
          <DialogDescription>
            {ta('description', { gameName })}
          </DialogDescription>
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
            filtered.map((plan) => {
              const isAdded = addedToPlanIds.has(plan.id);
              const isAdding = pendingPlanIds.has(plan.id);

              return (
                <div
                  key={plan.id}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-border/60 bg-card p-3 transition"
                >
                  <button
                    type="button"
                    onClick={() => void handleAdd(plan)}
                    disabled={isAdding || isAdded}
                    className="min-w-0 flex-1 text-left hover:opacity-80 disabled:cursor-default"
                  >
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
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    {isAdded ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled
                          tabIndex={-1}
                        >
                          <CheckIcon className="h-4 w-4 mr-1" />
                          {ta('added')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGoToPlan(plan.id)}
                        >
                          {ta('openPlan')}
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void handleAdd(plan)}
                        disabled={isAdding}
                        tabIndex={-1}
                      >
                        {isAdding ? (
                          ta('adding')
                        ) : (
                          <>
                            <PlusIcon className="h-4 w-4 mr-1" />
                            {ta('addButton')}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
