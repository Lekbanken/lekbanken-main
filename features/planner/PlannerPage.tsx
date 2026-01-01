"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PlanListPanel } from "./components/PlanListPanel";
import { PlanHeaderBar } from "./components/PlanHeaderBar";
import { BlockList } from "./components/BlockList";
import { BlockDetailDrawer } from "./components/BlockDetailDrawer";
import { ActionBar } from "./components/ActionBar";
import { AddGameButton } from "./components/AddGameButton";
import { GamePicker } from "./components/GamePicker";
import { VersionsDialog } from "./components/VersionsDialog";
import { PreviewDialog } from "./components/PreviewDialog";
import { ShareDialog } from "./components/ShareDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { PageTitleHeader } from "@/components/app/PageTitleHeader";
import { appNavItems } from "@/components/app/nav-items";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { arrayMove } from "@dnd-kit/sortable";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import {
  createPlan,
  fetchPlans,
  updatePlan,
  addBlock,
  deleteBlock,
  updateBlock,
  savePrivateNote,
  saveTenantNote,
  updateVisibility,
  reorderBlocks,
  publishPlan,
  deletePlan,
} from "./api";
import type { PlannerPlan, PlannerBlock, PlannerVisibility, PlannerStatus } from "./types";
import { useAuth } from "@/lib/supabase/auth";
import { useTenant } from "@/lib/context/TenantContext";
import { useActionFeedback } from "./hooks/useActionFeedback";
import {
  derivePlanCapabilities,
  capabilitiesToObject,
  type CapabilityContext,
  type PlanResource,
  type PlanCapabilities,
} from "@/lib/auth/capabilities";

type PlannerUICapabilities = PlanCapabilities & {
  canSetVisibility: boolean;
  canViewHistory: boolean;
  canEditBlocks: boolean;
  canDeleteBlocks: boolean;
  canReorderBlocks: boolean;
  canShare: boolean;
  canExport: boolean;
  canRun: boolean;
};

export function PlannerPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<PlannerPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [editingBlock, setEditingBlock] = useState<PlannerBlock | null>(null);
  const [planName, setPlanName] = useState("");
  const [planDescription, setPlanDescription] = useState("");
  const [privateNotes, setPrivateNotes] = useState("");
  const [tenantNotes, setTenantNotes] = useState("");
  const [showPlanList, setShowPlanList] = useState(false);
  
  // Dialog states
  const [showGamePicker, setShowGamePicker] = useState(false);
  const [showVersionsDialog, setShowVersionsDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  
  const { user, effectiveGlobalRole } = useAuth();
  const { currentTenant, userTenants } = useTenant();
  const { withFeedback, withSilentFeedback, isPending } = useActionFeedback();

  // ─────────────────────────────────────────────────────────────────────────────
  // Data Loading
  // ─────────────────────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────────────────────
  // Derived State
  // ─────────────────────────────────────────────────────────────────────────────

  const activePlan = useMemo(
    () => plans.find((p) => p.id === activePlanId) ?? plans[0],
    [plans, activePlanId]
  );

  // Sync local form state when active plan changes
  useEffect(() => {
    if (activePlan) {
      setPlanName(activePlan.name);
      setPlanDescription(activePlan.description ?? "");
      setPrivateNotes(activePlan.notes?.privateNote?.content ?? "");
      setTenantNotes(activePlan.notes?.tenantNote?.content ?? "");
    }
  }, [activePlan]);

  // Build capabilities for active plan
  const capabilities: PlannerUICapabilities = useMemo(() => {
    if (!activePlan || !user) {
      return {
        canRead: false,
        canUpdate: false,
        canDelete: false,
        canPublish: false,
        canSetVisibilityPublic: false,
        canCreateTemplate: false,
        canStartRun: false,
        canSetVisibility: false,
        canViewHistory: false,
        canEditBlocks: false,
        canDeleteBlocks: false,
        canReorderBlocks: false,
        canShare: false,
        canExport: false,
        canRun: false,
      };
    }

    const ctx: CapabilityContext = {
      userId: user.id,
      globalRole: effectiveGlobalRole ?? null,
      tenantMemberships: (userTenants ?? []).map((t) => ({
        tenantId: t.id,
        role: t.membership?.role ?? "member",
      })),
    };

    const planResource: PlanResource = {
      ownerUserId: activePlan.ownerUserId,
      ownerTenantId: activePlan.ownerTenantId ?? null,
      visibility: activePlan.visibility,
    };

    const caps = derivePlanCapabilities(ctx, planResource);
    const base = capabilitiesToObject(caps);

    // Extended capabilities for UI
    return {
      ...base,
      canSetVisibility: base.canUpdate,
      canViewHistory: base.canRead,
      canEditBlocks: base.canUpdate,
      canDeleteBlocks: base.canUpdate,
      canReorderBlocks: base.canUpdate,
      canShare: base.canRead,
      canExport: base.canRead,
      canRun: base.canStartRun,
    };
  }, [activePlan, user, effectiveGlobalRole, userTenants]);

  // Calculate total duration
  const totalDuration = useMemo(() => {
    return activePlan?.blocks.reduce((sum, b) => sum + (b.durationMinutes ?? 0), 0) ?? 0;
  }, [activePlan?.blocks]);

  // ─────────────────────────────────────────────────────────────────────────────
  // State Update Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  const updatePlanState = (next: PlannerPlan) => {
    setPlans((prev) => prev.map((plan) => (plan.id === next.id ? next : plan)));
  };

  const addBlockToState = (planId: string, block: PlannerBlock) => {
    setPlans((prev) =>
      prev.map((plan) => {
        if (plan.id !== planId) return plan;
        const blocks = [...plan.blocks, block].sort((a, b) => a.position - b.position);
        return { ...plan, blocks };
      })
    );
  };

  const updateBlockInState = (planId: string, block: PlannerBlock) => {
    setPlans((prev) =>
      prev.map((plan) => {
        if (plan.id !== planId) return plan;
        const blocks = plan.blocks.map((b) => (b.id === block.id ? block : b));
        return { ...plan, blocks };
      })
    );
  };

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

  // ─────────────────────────────────────────────────────────────────────────────
  // Event Handlers
  // ─────────────────────────────────────────────────────────────────────────────

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

  const handlePlanNameBlur = async () => {
    if (!activePlan || planName.trim() === activePlan.name) return;
    if (planName.trim().length === 0) {
      setPlanName(activePlan.name);
      return;
    }
    await withSilentFeedback(
      `update-plan-name-${activePlan.id}`,
      async () => {
        const updated = await updatePlan(activePlan.id, { name: planName.trim() });
        updatePlanState(updated);
        return updated;
      },
      { errorMessage: "Kunde inte uppdatera namn" }
    );
  };

  const handlePlanDescriptionBlur = async () => {
    if (!activePlan || planDescription === (activePlan.description ?? "")) return;
    await withSilentFeedback(
      `update-plan-desc-${activePlan.id}`,
      async () => {
        const updated = await updatePlan(activePlan.id, { description: planDescription || null });
        updatePlanState(updated);
        return updated;
      },
      { errorMessage: "Kunde inte uppdatera beskrivning" }
    );
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!activePlan) return;
    await withFeedback(
      `delete-block-${blockId}`,
      async () => {
        await deleteBlock(activePlan.id, blockId);
        removeBlockFromState(activePlan.id, blockId);
      },
      { errorMessage: "Kunde inte ta bort block" }
    );
  };

  const handleBlockDurationChange = async (blockId: string, duration: number) => {
    if (!activePlan) return;
    await withSilentFeedback(
      `update-block-duration-${blockId}`,
      async () => {
        const updated = await updateBlock(activePlan.id, blockId, { duration_minutes: duration });
        updateBlockInState(activePlan.id, updated);
        return updated;
      },
      { errorMessage: "Kunde inte uppdatera tid" }
    );
  };

  const handleBlockDetailSave = async (updates: { duration_minutes?: number; notes?: string; is_optional?: boolean }) => {
    if (!activePlan || !editingBlock) return;
    await withSilentFeedback(
      `update-block-${editingBlock.id}`,
      async () => {
        const updated = await updateBlock(activePlan.id, editingBlock.id, updates);
        updateBlockInState(activePlan.id, updated);
        return updated;
      },
      { errorMessage: "Kunde inte uppdatera block" }
    );
  };

  const handleReorder = async (activeId: string, overId: string) => {
    if (!activePlan) return;
    const oldIndex = activePlan.blocks.findIndex((b) => b.id === activeId);
    const newIndex = activePlan.blocks.findIndex((b) => b.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(activePlan.blocks, oldIndex, newIndex);
    const orderedIds = reordered.map((b) => b.id);

    // Optimistic update
    setPlans((prev) =>
      prev.map((p) =>
        p.id === activePlan.id
          ? { ...p, blocks: reordered.map((b, i) => ({ ...b, position: i })) }
          : p
      )
    );

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

  const handleVisibilityChange = async (visibility: PlannerVisibility) => {
    if (!activePlan) return;
    await withFeedback(
      `visibility-${activePlan.id}`,
      async () => {
        const tenantId = activePlan.ownerTenantId ?? currentTenant?.id ?? null;
        const updated = await updateVisibility(activePlan.id, {
          visibility,
          owner_tenant_id: tenantId,
        });
        updatePlanState(updated);
        return updated;
      },
      { errorMessage: "Kunde inte uppdatera synlighet" }
    );
  };

  const handlePublish = async () => {
    if (!activePlan) return;
    await withFeedback(
      `publish-${activePlan.id}`,
      async () => {
        const result = await publishPlan(activePlan.id);
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
      { errorMessage: "Kunde inte publicera plan", successMessage: "Planen har publicerats!" }
    );
  };

  const handleDelete = async () => {
    if (!activePlan) return;
    await withFeedback(
      `delete-plan-${activePlan.id}`,
      async () => {
        await deletePlan(activePlan.id);
        setPlans((prev) => prev.filter((p) => p.id !== activePlan.id));
        setActivePlanId("");
      },
      { errorMessage: "Kunde inte ta bort plan" }
    );
  };

  const handleSavePrivateNotes = async () => {
    if (!activePlan || privateNotes === (activePlan.notes?.privateNote?.content ?? "")) return;
    await withSilentFeedback(
      `save-notes-${activePlan.id}`,
      async () => {
        await savePrivateNote(activePlan.id, privateNotes);
      },
      { errorMessage: "Kunde inte spara anteckning" }
    );
  };

  const handleSaveTenantNotes = async () => {
    if (!activePlan || activePlan.visibility === "private") return;
    if (!currentTenant?.id) return;
    if (tenantNotes === (activePlan.notes?.tenantNote?.content ?? "")) return;
    await withSilentFeedback(
      `save-tenant-notes-${activePlan.id}`,
      async () => {
        await saveTenantNote(activePlan.id, tenantNotes, currentTenant.id);
      },
      { errorMessage: "Kunde inte spara delad anteckning" }
    );
  };

  const handleOpenVersions = () => {
    setShowVersionsDialog(true);
  };

  const handlePreview = () => {
    setShowPreviewDialog(true);
  };

  const handleShare = () => {
    setShowShareDialog(true);
  };

  const handleExport = () => {
    if (!activePlan) return;
    // Simple CSV export
    const lines: string[] = [
      "Position,Type,Title,Duration (min),Optional,Notes",
    ];
    activePlan.blocks.forEach((block, index) => {
      const title = block.blockType === "game" 
        ? block.game?.title ?? "Okänd lek"
        : block.title ?? block.blockType;
      lines.push(
        [
          index + 1,
          block.blockType,
          `"${title.replace(/"/g, '""')}"`,
          block.durationMinutes ?? 0,
          block.isOptional ? "Ja" : "Nej",
          `"${(block.notes ?? "").replace(/"/g, '""')}"`,
        ].join(",")
      );
    });
    
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activePlan.name || "plan"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleAddBlockType = (type: PlannerBlock["blockType"]) => {
    if (type === "game") {
      setShowGamePicker(true);
    } else {
      void handleAddNonGameBlock(type);
    }
  };

  const handleAddNonGameBlock = async (type: PlannerBlock["blockType"]) => {
    if (!activePlan) return;
    const defaultDuration = type === "pause" ? 5 : type === "preparation" ? 3 : 2;
    await withFeedback(
      `add-block-${activePlan.id}`,
      async () => {
        const block = await addBlock(activePlan.id, {
          block_type: type,
          duration_minutes: defaultDuration,
          position: activePlan.blocks.length,
        });
        addBlockToState(activePlan.id, block);
        return block;
      },
      { errorMessage: "Kunde inte lägga till block" }
    );
  };

  const handleGameSelected = async (game: { id: string; title: string; duration: number | null }) => {
    if (!activePlan) return;
    await withFeedback(
      `add-game-block-${activePlan.id}`,
      async () => {
        const block = await addBlock(activePlan.id, {
          block_type: "game",
          game_id: game.id,
          duration_minutes: game.duration ?? 5,
          position: activePlan.blocks.length,
        });
        addBlockToState(activePlan.id, block);
        return block;
      },
      { errorMessage: "Kunde inte lägga till lek" }
    );
  };

  const handleStartRun = async () => {
    if (!activePlan) return;
    // Navigate to play route
    router.push(`/app/play/${activePlan.id}/start`);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  if (initialLoadError) {
    return (
      <ErrorState
        title="Kunde inte ladda Planner"
        description={initialLoadError}
        onRetry={() => void loadPlans()}
      />
    );
  }

  const hasBlocks = (activePlan?.blocks.length ?? 0) > 0;
  const isPlanPublished = activePlan?.status === "published";
  const isSaving =
    isPending(`update-plan-name-${activePlan?.id}`) ||
    isPending(`update-plan-desc-${activePlan?.id}`);
  const showTenantNotes = activePlan?.visibility !== "private";
  const canEditTenantNotes = Boolean(showTenantNotes && currentTenant);
  const plannerIcon = appNavItems.find((item) => item.href === "/app/planner")?.icon;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <PageTitleHeader
          icon={plannerIcon ?? <span className="text-sm font-semibold">P</span>}
          title="PLANERA"
          subtitle="Planläggaren"
        />
        <div className="flex flex-col gap-3 lg:hidden">
          <Sheet open={showPlanList} onOpenChange={setShowPlanList}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                Mina planer
                <ChevronDownIcon className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full sm:max-w-sm">
              <SheetHeader>
                <SheetTitle>Mina planer</SheetTitle>
              </SheetHeader>
              <div className="mt-4 h-full">
                <PlanListPanel
                  plans={plans}
                  activePlanId={activePlanId}
                  isLoading={isLoading}
                  onSelectPlan={(id) => {
                    setActivePlanId(id);
                    setShowPlanList(false);
                  }}
                  onCreatePlan={() => void handleCreate()}
                  isCreating={isPending("create-plan")}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="hidden lg:block">
            <PlanListPanel
              plans={plans}
              activePlanId={activePlanId}
              isLoading={isLoading}
              onSelectPlan={setActivePlanId}
              onCreatePlan={() => void handleCreate()}
              isCreating={isPending("create-plan")}
            />
          </div>

          <div className="space-y-6">
            {activePlan ? (
              <>
                <Card className="border-border/60">
                  <CardContent className="space-y-6 p-6">
                    <PlanHeaderBar
                      plan={activePlan}
                      capabilities={capabilities}
                      totalDuration={totalDuration}
                      blockCount={activePlan.blocks.length}
                      hasBlocks={hasBlocks}
                      isPlanPublished={isPlanPublished}
                      onPublish={() => void handlePublish()}
                      onChangeVisibility={(v) => void handleVisibilityChange(v)}
                      onOpenVersions={handleOpenVersions}
                      onPreview={handlePreview}
                      onShare={handleShare}
                      onExport={handleExport}
                      onDelete={() => void handleDelete()}
                      isPublishing={isPending(`publish-${activePlan.id}`)}
                      isSaving={isSaving}
                    />

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Titel</label>
                        <Input
                          value={planName}
                          onChange={(e) => setPlanName(e.target.value)}
                          onBlur={() => void handlePlanNameBlur()}
                          placeholder="Skriv planens titel"
                          disabled={!capabilities.canUpdate}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Beskrivning</label>
                        <Textarea
                          value={planDescription}
                          onChange={(e) => setPlanDescription(e.target.value)}
                          onBlur={() => void handlePlanDescriptionBlur()}
                          placeholder="Kort beskrivning av planen"
                          disabled={!capabilities.canUpdate}
                          rows={3}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/60">
                  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <CardTitle>Block i planen</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Dra, byt ordning och justera tidsåtgång.
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <BlockList
                      blocks={activePlan.blocks}
                      capabilities={capabilities}
                      onReorder={handleReorder}
                      onEditBlock={setEditingBlock}
                      onDeleteBlock={(id) => void handleDeleteBlock(id)}
                      onDurationChange={(id, dur) => void handleBlockDurationChange(id, dur)}
                      isReordering={isPending(`reorder-blocks-${activePlan.id}`)}
                    />
                    {capabilities.canEditBlocks && (
                      <AddGameButton onAdd={handleAddBlockType} />
                    )}
                  </CardContent>
                </Card>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="border-border/60">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Privata anteckningar</CardTitle>
                        <p className="text-sm text-muted-foreground">Syns bara för dig.</p>
                      </div>
                      <span className="text-xs text-muted-foreground">Autosparar</span>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={privateNotes}
                        onChange={(e) => setPrivateNotes(e.target.value)}
                        onBlur={() => void handleSavePrivateNotes()}
                        placeholder="Anteckningar som bara du kan se..."
                        className="text-sm resize-none"
                        rows={4}
                      />
                    </CardContent>
                  </Card>

                  {showTenantNotes ? (
                    <Card className="border-border/60">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle>Delade anteckningar</CardTitle>
                          <p className="text-sm text-muted-foreground">Syns för organisationen.</p>
                        </div>
                        <span className="text-xs text-muted-foreground">Delad</span>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          value={tenantNotes}
                          onChange={(e) => setTenantNotes(e.target.value)}
                          onBlur={() => void handleSaveTenantNotes()}
                          placeholder="Anteckningar som delas med organisationen..."
                          className="text-sm resize-none"
                          rows={4}
                          disabled={!canEditTenantNotes}
                        />
                      </CardContent>
                    </Card>
                  ) : null}
                </div>

                <ActionBar
                  canRun={capabilities.canRun}
                  hasBlocks={hasBlocks}
                  isPlanPublished={isPlanPublished}
                  onPreview={handlePreview}
                  onStartRun={() => void handleStartRun()}
                  isStartingRun={isPending(`start-run-${activePlan.id}`)}
                />

                <BlockDetailDrawer
                  block={editingBlock}
                  open={!!editingBlock}
                  onOpenChange={(open) => !open && setEditingBlock(null)}
                  onSave={(updates) => void handleBlockDetailSave(updates)}
                  onDelete={() => editingBlock && void handleDeleteBlock(editingBlock.id)}
                  canDelete={capabilities.canDeleteBlocks}
                  isSaving={isPending(`update-block-${editingBlock?.id}`)}
                />

                <GamePicker
                  open={showGamePicker}
                  onOpenChange={setShowGamePicker}
                  onSelect={(game) => void handleGameSelected(game)}
                />

                <VersionsDialog
                  open={showVersionsDialog}
                  onOpenChange={setShowVersionsDialog}
                  planId={activePlan.id}
                />

                <PreviewDialog
                  open={showPreviewDialog}
                  onOpenChange={setShowPreviewDialog}
                  plan={activePlan}
                />

                <ShareDialog
                  open={showShareDialog}
                  onOpenChange={setShowShareDialog}
                  planId={activePlan.id}
                  planName={activePlan.name}
                  visibility={activePlan.visibility}
                />
              </>
            ) : (
              <Card className="border-border/60">
                <CardContent className="py-12">
                  {isLoading ? (
                    <div className="space-y-4 w-full max-w-md px-8">
                      <Skeleton className="h-8 w-3/4" />
                      <Skeleton className="h-32 w-full" />
                      <Skeleton className="h-32 w-full" />
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <div className="text-xl font-semibold text-foreground">Ingen plan vald</div>
                      <p className="text-muted-foreground">Välj en plan eller skapa en ny</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
