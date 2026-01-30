'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BlockList } from '../../components/BlockList';
import { BlockDetailDrawer } from '../../components/BlockDetailDrawer';
import { AddGameButton } from '../../components/AddGameButton';
import { GamePicker } from '../../components/GamePicker';
import { addBlock, deleteBlock, updateBlock, reorderBlocks } from '../../api';
import { useActionFeedback } from '../../hooks/useActionFeedback';
import { arrayMove } from '@dnd-kit/sortable';
import type { PlannerPlan, PlannerBlock, PlannerBlockType } from '@/types/planner';
import type { UsePlanWizardResult } from '../hooks/usePlanWizard';

interface StepByggPlanProps {
  plan: PlannerPlan;
  capabilities: {
    canUpdate: boolean;
  };
  onPlanUpdate: (plan: PlannerPlan) => void;
  wizard: UsePlanWizardResult;
}

export function StepByggPlan({ plan, capabilities, onPlanUpdate, wizard }: StepByggPlanProps) {
  const t = useTranslations('planner.wizard.steps.bygg');
  const tc = useTranslations('common.actions');
  const locale = useLocale();
  const { withFeedback, withSilentFeedback, isPending } = useActionFeedback();

  const [editingBlock, setEditingBlock] = useState<PlannerBlock | null>(null);
  const [showGamePicker, setShowGamePicker] = useState(false);

  const extendedCapabilities = {
    canEditBlocks: capabilities.canUpdate,
    canDeleteBlocks: capabilities.canUpdate,
    canReorderBlocks: capabilities.canUpdate,
  };

  // Calculate total duration
  const totalDuration = plan.blocks.reduce((sum, b) => sum + (b.durationMinutes ?? 0), 0);

  const handleAddBlockType = (type: PlannerBlockType) => {
    if (type === 'game') {
      setShowGamePicker(true);
    } else {
      void handleAddNonGameBlock(type);
    }
  };

  const handleAddNonGameBlock = async (type: PlannerBlockType) => {
    const defaultDuration = type === 'pause' ? 5 : type === 'preparation' ? 3 : 2;
    await withFeedback(
      `add-block-${plan.id}`,
      async () => {
        const block = await addBlock(plan.id, {
          block_type: type,
          duration_minutes: defaultDuration,
          position: plan.blocks.length,
        });
        onPlanUpdate({
          ...plan,
          blocks: [...plan.blocks, block].sort((a, b) => a.position - b.position),
        });
        return block;
      },
      { errorMessage: 'Kunde inte lägga till block' }
    );
  };

  const handleGameSelected = async (game: { id: string; title: string; duration: number | null }) => {
    await withFeedback(
      `add-game-block-${plan.id}`,
      async () => {
        const block = await addBlock(plan.id, {
          block_type: 'game',
          game_id: game.id,
          duration_minutes: game.duration ?? 5,
          position: plan.blocks.length,
        });
        onPlanUpdate({
          ...plan,
          blocks: [...plan.blocks, block].sort((a, b) => a.position - b.position),
        });
        return block;
      },
      { errorMessage: 'Kunde inte lägga till lek' }
    );
    setShowGamePicker(false);
  };

  const handleDeleteBlock = async (blockId: string) => {
    await withFeedback(
      `delete-block-${blockId}`,
      async () => {
        await deleteBlock(plan.id, blockId);
        const updatedBlocks = plan.blocks
          .filter((b) => b.id !== blockId)
          .map((b, idx) => ({ ...b, position: idx }));
        onPlanUpdate({ ...plan, blocks: updatedBlocks });
      },
      { errorMessage: 'Kunde inte ta bort block' }
    );
  };

  const handleBlockDurationChange = async (blockId: string, duration: number) => {
    await withSilentFeedback(
      `update-block-duration-${blockId}`,
      async () => {
        const updated = await updateBlock(plan.id, blockId, { duration_minutes: duration });
        onPlanUpdate({
          ...plan,
          blocks: plan.blocks.map((b) => (b.id === blockId ? updated : b)),
        });
        return updated;
      },
      { errorMessage: 'Kunde inte uppdatera tid' }
    );
  };

  const handleBlockDetailSave = async (updates: {
    duration_minutes?: number;
    notes?: string;
    is_optional?: boolean;
  }) => {
    if (!editingBlock) return;
    await withSilentFeedback(
      `update-block-${editingBlock.id}`,
      async () => {
        const updated = await updateBlock(plan.id, editingBlock.id, updates);
        onPlanUpdate({
          ...plan,
          blocks: plan.blocks.map((b) => (b.id === editingBlock.id ? updated : b)),
        });
        return updated;
      },
      { errorMessage: 'Kunde inte uppdatera block' }
    );
  };

  const handleReorder = async (activeId: string, overId: string) => {
    const oldIndex = plan.blocks.findIndex((b) => b.id === activeId);
    const newIndex = plan.blocks.findIndex((b) => b.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(plan.blocks, oldIndex, newIndex);
    const orderedIds = reordered.map((b) => b.id);

    // Optimistic update
    onPlanUpdate({
      ...plan,
      blocks: reordered.map((b, i) => ({ ...b, position: i })),
    });

    await withSilentFeedback(
      `reorder-blocks-${plan.id}`,
      async () => {
        const updated = await reorderBlocks(plan.id, orderedIds);
        onPlanUpdate(updated);
        return updated;
      },
      { errorMessage: 'Kunde inte ändra blockordning' }
    );
  };

  const _hasBlocks = plan.blocks.length > 0;

  return (
    <>
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  2
                </span>
                {t('title')}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {t('description')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{totalDuration} min</p>
              <p className="text-xs text-muted-foreground">{plan.blocks.length} block</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <BlockList
            blocks={plan.blocks}
            capabilities={extendedCapabilities}
            onReorder={handleReorder}
            onEditBlock={setEditingBlock}
            onDeleteBlock={(id) => void handleDeleteBlock(id)}
            onDurationChange={(id, dur) => void handleBlockDurationChange(id, dur)}
            isReordering={isPending(`reorder-blocks-${plan.id}`)}
          />

          {capabilities.canUpdate && <AddGameButton onAdd={handleAddBlockType} />}

          {/* Navigation */}
          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-between border-t">
            <Button variant="outline" onClick={wizard.goToPrevStep}>
              <ChevronLeftIcon className="mr-1 h-4 w-4" />
              {tc('back')}
            </Button>
            <Button onClick={wizard.goToNextStep}>
              {t('continueButton')}
              <ChevronRightIcon className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <BlockDetailDrawer
        block={editingBlock}
        open={!!editingBlock}
        onOpenChange={(open) => !open && setEditingBlock(null)}
        onSave={(updates) => void handleBlockDetailSave(updates)}
        onDelete={() => editingBlock && void handleDeleteBlock(editingBlock.id)}
        canDelete={capabilities.canUpdate}
        isSaving={isPending(`update-block-${editingBlock?.id}`)}
      />

      <GamePicker
        key={locale}
        open={showGamePicker}
        onOpenChange={setShowGamePicker}
        onSelect={(game) => void handleGameSelected(game)}
      />
    </>
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
