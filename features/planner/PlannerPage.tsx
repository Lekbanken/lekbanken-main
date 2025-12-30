"use client";

import { useEffect, useMemo, useState } from "react";
import { PlannerPageLayout } from "./components/PlannerPageLayout";
import { SessionEditor } from "./components/SessionEditor";
import { SessionList } from "./components/SessionList";
import { createPlan, fetchPlans, updatePlan, addBlock, deleteBlock, savePrivateNote, saveTenantNote, updateVisibility, reorderBlocks, publishPlan } from "./api";
import type { PlannerPlan, PlannerBlock, PlannerVisibility, PlannerStatus } from "./types";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/supabase/auth";
import { useActionFeedback } from "./hooks/useActionFeedback";

export function PlannerPage() {
  const [plans, setPlans] = useState<PlannerPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const { effectiveGlobalRole } = useAuth();
  const canSetPublic = effectiveGlobalRole === "system_admin";
  const { withFeedback, withSilentFeedback, isPending } = useActionFeedback();

  const loadPlans = async () => {
    setIsLoading(true);
    setInitialLoadError(null);
    try {
      const data = await fetchPlans();
      setPlans(data);
      if (!activePlanId && data.length > 0) {
        setActivePlanId(data[0].id);
      }
    } catch (err) {
      console.error(err);
      setInitialLoadError("Kunde inte ladda planer");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activePlan = useMemo(
    () => plans.find((p) => p.id === activePlanId) ?? plans[0],
    [plans, activePlanId]
  );

  const updatePlanState = (next: PlannerPlan) => {
    setPlans((prev) => prev.map((plan) => (plan.id === next.id ? next : plan)));
    setActivePlanId(next.id);
  };

  // Helper to add a block to local plan state
  const addBlockToState = (planId: string, block: PlannerBlock) => {
    setPlans((prev) =>
      prev.map((plan) => {
        if (plan.id !== planId) return plan;
        const blocks = [...plan.blocks, block].sort((a, b) => a.position - b.position);
        return { ...plan, blocks };
      })
    );
  };

  // Helper to update a block in local plan state
  const updateBlockInState = (planId: string, block: PlannerBlock) => {
    setPlans((prev) =>
      prev.map((plan) => {
        if (plan.id !== planId) return plan;
        const blocks = plan.blocks.map((b) => (b.id === block.id ? block : b));
        return { ...plan, blocks };
      })
    );
  };

  // Helper to remove a block from local plan state
  const removeBlockFromState = (planId: string, blockId: string) => {
    setPlans((prev) =>
      prev.map((plan) => {
        if (plan.id !== planId) return plan;
        const blocks = plan.blocks
          .filter((b) => b.id !== blockId)
          .map((b, idx) => ({ ...b, position: idx }));
        return { ...plan, blocks };
      })
    );
  };

  const handleCreate = async () => {
    await withFeedback(
      'create-plan',
      async () => {
        const plan = await createPlan({ name: "Ny plan" });
        setPlans((prev) => [plan, ...prev]);
        setActivePlanId(plan.id);
        return plan;
      },
      { errorMessage: "Kunde inte skapa plan" }
    );
  };

  const handlePlanChange = async (planId: string, updates: { name?: string; description?: string | null }) => {
    if (!planId) return;
    await withSilentFeedback(
      `update-plan-${planId}`,
      async () => {
        const updated = await updatePlan(planId, updates);
        updatePlanState(updated);
        return updated;
      },
      { errorMessage: "Kunde inte uppdatera plan" }
    );
  };

  const handleAddBlock = async (
    type: PlannerBlock["blockType"],
    extras?: Partial<PlannerBlock> & { game_id?: string | null }
  ) => {
    if (!activePlan) return;
    await withFeedback(
      `add-block-${activePlan.id}`,
      async () => {
        const block = await addBlock(activePlan.id, {
          block_type: type,
          game_id: extras?.game_id,
          duration_minutes: extras?.durationMinutes ?? null,
          title: extras?.title ?? null,
          notes: extras?.notes ?? null,
          position: extras?.position,
          metadata: extras?.metadata ?? null,
          is_optional: extras?.isOptional ?? null,
        });
        addBlockToState(activePlan.id, block);
        return block;
      },
      { errorMessage: "Kunde inte lägga till block" }
    );
  };

  // NOTE: handleUpdateBlock removed in Sprint 4 cleanup.
  // Block updates are handled via auto-save or inline editing.

  const handleDeleteBlock = async (blockId: string) => {
    if (!activePlan) return;
    await withFeedback(
      `delete-block-${blockId}`,
      async () => {
        const result = await deleteBlock(activePlan.id, blockId);
        removeBlockFromState(activePlan.id, blockId);
        return result;
      },
      { errorMessage: "Kunde inte ta bort block" }
    );
  };

  const handleSaveNote = async (content: string) => {
    if (!activePlan) return;
    await withSilentFeedback(
      `save-private-note-${activePlan.id}`,
      async () => {
        await savePrivateNote(activePlan.id, content);
      },
      { errorMessage: "Kunde inte spara anteckning" }
    );
  };

  const handleSaveTenantNote = async (content: string) => {
    if (!activePlan) return;
    await withSilentFeedback(
      `save-tenant-note-${activePlan.id}`,
      async () => {
        await saveTenantNote(activePlan.id, content, activePlan.ownerTenantId ?? null);
      },
      { errorMessage: "Kunde inte spara tenant-anteckning" }
    );
  };

  const handleVisibilityChange = async (planId: string, visibility: PlannerVisibility) => {
    await withFeedback(
      `visibility-${planId}`,
      async () => {
        const updated = await updateVisibility(planId, {
          visibility,
          owner_tenant_id: activePlan?.ownerTenantId ?? null,
        });
        updatePlanState(updated);
        return updated;
      },
      { 
        errorMessage: "Kunde inte uppdatera synlighet",
        showErrorDetails: true 
      }
    );
  };

  const handleReorderBlocks = async (orderedIds: string[]) => {
    if (!activePlan) return;
    await withSilentFeedback(
      `reorder-blocks-${activePlan.id}`,
      async () => {
        const updated = await reorderBlocks(activePlan.id, orderedIds);
        updatePlanState(updated);
        return updated;
      },
      { errorMessage: "Kunde inte ändra blockordning" }
    );
  };

  const handlePublish = async () => {
    if (!activePlan) return;
    await withFeedback(
      `publish-${activePlan.id}`,
      async () => {
        const result = await publishPlan(activePlan.id);
        // Update plan state with new status and version
        setPlans((prev) =>
          prev.map((p) =>
            p.id === activePlan.id
              ? {
                  ...p,
                  status: result.plan.status as PlannerStatus,
                  currentVersionId: result.plan.currentVersionId,
                  currentVersion: result.version,
                }
              : p
          )
        );
        return result;
      },
      { 
        errorMessage: "Kunde inte publicera plan",
        successMessage: "Planen har publicerats!"
      }
    );
  };

  // Only show full-page error for initial load failure
  if (initialLoadError) {
    return <ErrorState title="Kunde inte ladda Planner" description={initialLoadError} onRetry={() => void loadPlans()} />;
  }

  if (isLoading && !activePlan) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <PlannerPageLayout>
      <div className="space-y-6">
        <SessionList plans={plans} onCreate={() => void handleCreate()} activeId={activePlan?.id} onSelect={setActivePlanId} />
        {activePlan ? (
          <SessionEditor
            plan={activePlan}
            onPlanChange={handlePlanChange}
            onAddBlock={handleAddBlock}
            onDeleteBlock={handleDeleteBlock}
            onSavePrivateNote={handleSaveNote}
            onSaveTenantNote={handleSaveTenantNote}
            canSetPublicVisibility={canSetPublic}
            onVisibilityChange={(visibility) => handleVisibilityChange(activePlan.id, visibility)}
            onReorderBlocks={handleReorderBlocks}
            onPublish={handlePublish}
            isPublishing={isPending(`publish-${activePlan.id}`)}
          />
        ) : null}
      </div>
    </PlannerPageLayout>
  );
}
