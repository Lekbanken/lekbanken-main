"use client";

import { useEffect, useMemo, useState } from "react";
import { PlannerPageLayout } from "./components/PlannerPageLayout";
import { SessionEditor } from "./components/SessionEditor";
import { SessionList } from "./components/SessionList";
import { createPlan, fetchPlans, updatePlan, addBlock, updateBlock, deleteBlock, savePrivateNote, updateVisibility, reorderBlocks } from "./api";
import type { PlannerPlan, PlannerBlock, PlannerVisibility } from "./types";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/supabase/auth";
import { isSystemAdmin } from "@/lib/utils/authRoles";

export function PlannerPage() {
  const [plans, setPlans] = useState<PlannerPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, userProfile } = useAuth();
  const canSetPublic = isSystemAdmin(user, userProfile?.global_role ?? null);

  const loadPlans = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPlans();
      setPlans(data);
      if (!activePlanId && data.length > 0) {
        setActivePlanId(data[0].id);
      }
    } catch (err) {
      console.error(err);
      setError("Kunde inte ladda planer");
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

  const handleCreate = async () => {
    try {
      const plan = await createPlan({ name: "Ny plan" });
      setPlans((prev) => [plan, ...prev]);
      setActivePlanId(plan.id);
    } catch (err) {
      console.error(err);
      setError("Kunde inte skapa plan");
    }
  };

  const handlePlanChange = async (planId: string, updates: { name?: string; description?: string | null }) => {
    if (!planId) return;
    try {
      const updated = await updatePlan(planId, updates);
      updatePlanState(updated);
    } catch (err) {
      console.error(err);
      setError("Kunde inte uppdatera plan");
    }
  };

  const handleAddBlock = async (
    type: PlannerBlock["blockType"],
    extras?: Partial<PlannerBlock> & { game_id?: string | null }
  ) => {
    if (!activePlan) return;
    try {
      const updated = await addBlock(activePlan.id, {
        block_type: type,
        game_id: extras?.game_id,
        duration_minutes: extras?.durationMinutes ?? null,
        title: extras?.title ?? null,
        notes: extras?.notes ?? null,
        position: extras?.position,
        metadata: extras?.metadata ?? null,
        is_optional: extras?.isOptional ?? null,
      });
      updatePlanState(updated);
    } catch (err) {
      console.error(err);
      setError("Kunde inte lägga till block");
    }
  };

  const handleUpdateBlock = async (blockId: string, updates: Partial<PlannerBlock> & { position?: number }) => {
    if (!activePlan) return;
    try {
      const updated = await updateBlock(activePlan.id, blockId, {
        block_type: updates.blockType,
        game_id: updates.game?.id,
        duration_minutes: updates.durationMinutes,
        title: updates.title,
        notes: updates.notes,
        position: updates.position,
        metadata: updates.metadata ?? undefined,
        is_optional: updates.isOptional ?? undefined,
      });
      updatePlanState(updated);
    } catch (err) {
      console.error(err);
      setError("Kunde inte uppdatera block");
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!activePlan) return;
    try {
      const updated = await deleteBlock(activePlan.id, blockId);
      updatePlanState(updated);
    } catch (err) {
      console.error(err);
      setError("Kunde inte ta bort block");
    }
  };

  const handleSaveNote = async (content: string) => {
    if (!activePlan) return;
    try {
      await savePrivateNote(activePlan.id, content);
    } catch (err) {
      console.error(err);
      setError("Kunde inte spara anteckning");
    }
  };

  const handleVisibilityChange = async (planId: string, visibility: PlannerVisibility) => {
    try {
      const updated = await updateVisibility(planId, {
        visibility,
        owner_tenant_id: activePlan?.ownerTenantId ?? null,
      });
      updatePlanState(updated);
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error && err.message.toLowerCase().includes("public visibility")
          ? "Endast systemadmin kan sätta planer som publika."
          : "Kunde inte uppdatera synlighet";
      setError(message);
    }
  };

  const handleReorderBlocks = async (orderedIds: string[]) => {
    if (!activePlan) return;
    try {
      const updated = await reorderBlocks(activePlan.id, orderedIds);
      updatePlanState(updated);
    } catch (err) {
      console.error(err);
      setError("Kunde inte ändra blockordning");
    }
  };

  if (error) {
    return <ErrorState title="Kunde inte ladda Planner" description={error} onRetry={() => void loadPlans()} />;
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
            onUpdateBlock={handleUpdateBlock}
            onDeleteBlock={handleDeleteBlock}
            onSavePrivateNote={handleSaveNote}
            canSetPublicVisibility={canSetPublic}
            onVisibilityChange={(visibility) => handleVisibilityChange(activePlan.id, visibility)}
            onReorderBlocks={handleReorderBlocks}
          />
        ) : null}
      </div>
    </PlannerPageLayout>
  );
}
