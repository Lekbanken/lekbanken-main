'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BlockList } from '../../components/BlockList';
import { BlockDetailDrawer } from '../../components/BlockDetailDrawer';
import { AddGameButton } from '../../components/AddGameButton';
import { GamePicker } from '../../components/GamePicker';
import { addBlock, deleteBlock, updateBlock, reorderBlocks, savePrivateNote, saveTenantNote } from '../../api';
import { useActionFeedback } from '../../hooks/useActionFeedback';
import { useTenant } from '@/lib/context/TenantContext';
import { arrayMove } from '@dnd-kit/sortable';
import type { PlannerPlan, PlannerBlock, PlannerBlockType } from '@/types/planner';
import type { GamePickerSelection } from '../../components/GamePicker';
import type { UsePlanWizardResult } from '../hooks/usePlanWizard';

interface StepBuildPlanProps {
  plan: PlannerPlan;
  capabilities: {
    canUpdate: boolean;
  };
  onPlanUpdate: (plan: PlannerPlan) => void;
  wizard: UsePlanWizardResult;
}

export function StepBuildPlan({ plan, capabilities, onPlanUpdate, wizard }: StepBuildPlanProps) {
  const t = useTranslations('planner.wizard.steps.bygg');
  const tn = useTranslations('planner.wizard.steps.anteckningar');
  const tw = useTranslations('planner.wizardSteps');
  const locale = useLocale();
  const { withFeedback, withSilentFeedback, isPending } = useActionFeedback();
  const { currentTenant } = useTenant();

  const [editingBlock, setEditingBlock] = useState<PlannerBlock | null>(null);
  const [showGamePicker, setShowGamePicker] = useState(false);
  /** Tracks whether the GamePicker was opened for session_game or regular game */
  const [gamePickerBlockType, setGamePickerBlockType] = useState<'game' | 'session_game'>('game');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);

  // Notes state
  const [privateNotes, setPrivateNotes] = useState(plan.notes?.privateNote?.content ?? '');
  const [tenantNotes, setTenantNotes] = useState(plan.notes?.tenantNote?.content ?? '');

  // Reset notes state when plan changes
  const planId = plan.id;
  useMemo(() => {
    setPrivateNotes(plan.notes?.privateNote?.content ?? '');
    setTenantNotes(plan.notes?.tenantNote?.content ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  // Ref tracking latest blocks to avoid stale closures in concurrent adds
  const planRef = useRef(plan);
  planRef.current = plan;

  /** Replace an optimistic block (by id) with the real API block, or remove it on rollback */
  const replaceOptimisticBlock = useCallback(
    (optimisticId: string, realBlock: PlannerBlock | null) => {
      const current = planRef.current;
      if (!current.blocks.some((b) => b.id === optimisticId)) return;
      const blocks = realBlock
        ? current.blocks.map((b) => (b.id === optimisticId ? realBlock : b))
        : current.blocks.filter((b) => b.id !== optimisticId);
      onPlanUpdate({ ...current, blocks: blocks.sort((a, b) => a.position - b.position) });
    },
    [onPlanUpdate]
  );

  const extendedCapabilities = {
    canEditBlocks: capabilities.canUpdate,
    canDeleteBlocks: capabilities.canUpdate,
    canReorderBlocks: capabilities.canUpdate,
  };

  // Calculate total duration (exclude section headers)
  const totalDuration = plan.blocks
    .filter((b) => b.blockType !== 'section')
    .reduce((sum, b) => sum + (b.durationMinutes ?? 0), 0);

  const handleAddBlockType = (type: PlannerBlockType) => {
    if (type === 'game' || type === 'session_game') {
      setGamePickerBlockType(type);
      setShowGamePicker(true);
    } else {
      void handleAddNonGameBlock(type);
    }
  };

  const handleAddNonGameBlock = async (type: PlannerBlockType) => {
    const defaultDuration = type === 'section' ? 0 : type === 'pause' ? 5 : type === 'preparation' ? 3 : 2;
    const result = await withFeedback(
      `add-block-${plan.id}`,
      async () => {
        const block = await addBlock(plan.id, {
          block_type: type,
          duration_minutes: defaultDuration,
          position: plan.blocks.length,
          ...(type === 'section' ? { title: t('defaultSectionTitle') } : {}),
        });
        onPlanUpdate({
          ...plan,
          blocks: [...plan.blocks, block].sort((a, b) => a.position - b.position),
        });
        return block;
      },
      { errorMessage: t('errors.addBlockFailed') }
    );
    if (type === 'section' && result.data) {
      setEditingSectionId(result.data.id);
    }
  };

  const handleGameSelected = async (game: GamePickerSelection) => {
    const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const currentBlocks = planRef.current.blocks;
    const blockType = gamePickerBlockType;
    const optimisticBlock: PlannerBlock = {
      id: optimisticId,
      planId: plan.id,
      position: currentBlocks.length,
      blockType,
      durationMinutes: game.duration ?? 5,
      game: {
        id: game.id,
        title: game.title,
        shortDescription: game.shortDescription ?? null,
        energyLevel: game.energyLevel ?? null,
        locationType: game.locationType ?? null,
        coverUrl: game.coverUrl ?? null,
        durationMinutes: game.duration,
      },
    };

    onPlanUpdate({
      ...planRef.current,
      blocks: [...currentBlocks, optimisticBlock].sort((a, b) => a.position - b.position),
    });
    setShowGamePicker(false);

    const result = await withFeedback(
      `add-game-block-${optimisticId}`,
      async () => {
        const block = await addBlock(plan.id, {
          block_type: blockType,
          game_id: game.id,
          duration_minutes: game.duration ?? 5,
          position: currentBlocks.length,
        });
        replaceOptimisticBlock(optimisticId, block);
        return block;
      },
      { errorMessage: t('errors.addGameFailed') }
    );

    if (result.error) {
      replaceOptimisticBlock(optimisticId, null);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (editingSectionId === blockId) setEditingSectionId(null);
    await withFeedback(
      `delete-block-${blockId}`,
      async () => {
        await deleteBlock(plan.id, blockId);
        const updatedBlocks = planRef.current.blocks
          .filter((b) => b.id !== blockId)
          .map((b, idx) => ({ ...b, position: idx }));
        onPlanUpdate({ ...planRef.current, blocks: updatedBlocks });
      },
      { errorMessage: t('errors.deleteBlockFailed') }
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
      { errorMessage: t('errors.updateDurationFailed') }
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
      { errorMessage: t('errors.updateBlockFailed') }
    );
  };

  const handleReorder = async (activeId: string, overId: string) => {
    const oldIndex = plan.blocks.findIndex((b) => b.id === activeId);
    const newIndex = plan.blocks.findIndex((b) => b.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(plan.blocks, oldIndex, newIndex);
    const orderedIds = reordered.map((b) => b.id);

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
      { errorMessage: t('errors.reorderFailed') }
    );
  };

  const handleSectionTitleSave = async (blockId: string, title: string) => {
    if (!planRef.current.blocks.some((b) => b.id === blockId)) return;
    await withSilentFeedback(
      `rename-section-${blockId}`,
      async () => {
        const updated = await updateBlock(plan.id, blockId, { title });
        const current = planRef.current;
        if (!current.blocks.some((b) => b.id === blockId)) return updated;
        onPlanUpdate({
          ...current,
          blocks: current.blocks.map((b) => (b.id === blockId ? updated : b)),
        });
        return updated;
      },
      { errorMessage: t('errors.updateBlockFailed') }
    );
  };

  // Notes handlers
  const handleSavePrivateNotes = async () => {
    if (privateNotes === (plan.notes?.privateNote?.content ?? '')) return;
    await withSilentFeedback(
      `save-private-notes-${plan.id}`,
      async () => {
        await savePrivateNote(plan.id, privateNotes);
      },
      { errorMessage: tn('errors.savePrivateNoteFailed') }
    );
  };

  const handleSaveTenantNotes = async () => {
    if (!currentTenant?.id) return;
    if (plan.visibility === 'private') return;
    if (tenantNotes === (plan.notes?.tenantNote?.content ?? '')) return;
    await withSilentFeedback(
      `save-tenant-notes-${plan.id}`,
      async () => {
        await saveTenantNote(plan.id, tenantNotes, currentTenant.id);
      },
      { errorMessage: tn('errors.saveTenantNoteFailed') }
    );
  };

  const showTenantNotes = plan.visibility !== 'private';
  const canEditTenantNotes = showTenantNotes && Boolean(currentTenant);

  return (
    <>
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  1
                </span>
                {tw('buildPlan')}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {t('description')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{totalDuration} min</p>
              <p className="text-xs text-muted-foreground">{t('blockCount', { count: plan.blocks.length })}</p>
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
            editingSectionId={editingSectionId}
            onSectionTitleSave={(id, title) => void handleSectionTitleSave(id, title)}
            onSectionEditDone={() => setEditingSectionId(null)}
          />

          {capabilities.canUpdate && <AddGameButton onAdd={handleAddBlockType} />}

          {/* Collapsible Notes Section */}
          <div className="border-t pt-4">
            <button
              type="button"
              onClick={() => setNotesOpen(!notesOpen)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <NotesIcon className="h-4 w-4" />
                {tn('title')}
              </span>
              <ChevronIcon className={`h-4 w-4 transition-transform ${notesOpen ? 'rotate-180' : ''}`} />
            </button>

            {notesOpen && (
              <div className="mt-3 space-y-4 px-1">
                {/* Private Notes */}
                <div className="space-y-2">
                  <Label htmlFor="private-notes" className="flex items-center gap-2 text-sm">
                    <LockIcon className="h-4 w-4 text-muted-foreground" />
                    {tn('privateNotesLabel')}
                    <span className="text-xs text-muted-foreground ml-auto">{tn('privateNotesHint')}</span>
                  </Label>
                  <Textarea
                    id="private-notes"
                    value={privateNotes}
                    onChange={(e) => setPrivateNotes(e.target.value)}
                    onBlur={() => void handleSavePrivateNotes()}
                    placeholder={tn('privateNotesPlaceholder')}
                    rows={3}
                    className="resize-none text-sm"
                  />
                </div>

                {/* Tenant Notes */}
                {showTenantNotes && (
                  <div className="space-y-2">
                    <Label htmlFor="tenant-notes" className="flex items-center gap-2 text-sm">
                      <UsersIcon className="h-4 w-4 text-muted-foreground" />
                      {tn('tenantNotesLabel')}
                      <span className="text-xs text-muted-foreground ml-auto">{tn('tenantNotesHint')}</span>
                    </Label>
                    <Textarea
                      id="tenant-notes"
                      value={tenantNotes}
                      onChange={(e) => setTenantNotes(e.target.value)}
                      onBlur={() => void handleSaveTenantNotes()}
                      placeholder={tn('tenantNotesPlaceholder')}
                      rows={3}
                      className="resize-none text-sm"
                      disabled={!canEditTenantNotes}
                    />
                  </div>
                )}

                {!showTenantNotes && (
                  <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground text-center">
                      {tn('tenantNotesDisabled')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end border-t">
            <Button onClick={wizard.goToNextStep}>
              {tw('saveAndRun')}
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
        key={`${locale}-${gamePickerBlockType}`}
        open={showGamePicker}
        onOpenChange={setShowGamePicker}
        onSelect={(game) => void handleGameSelected(game)}
        userPlayModes={gamePickerBlockType === 'session_game' ? ['participants'] : ['basic']}
        defaultPlayMode={gamePickerBlockType === 'session_game' ? 'participants' : undefined}
      />
    </>
  );
}

// Icons

function NotesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
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
