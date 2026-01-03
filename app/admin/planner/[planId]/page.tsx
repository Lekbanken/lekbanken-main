"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminSection,
  AdminCard,
  AdminEmptyState,
  AdminErrorState,
  AdminConfirmDialog,
} from "@/components/admin/shared";
import { Badge, Button, LoadingState, useToast } from "@/components/ui";
import { useRbac } from "@/features/admin/shared/hooks/useRbac";
import { useTenant } from "@/lib/context/TenantContext";
import type {
  PlannerPlan,
  PlannerBlock,
  PlannerStatus,
  PlannerVisibility,
  PlannerVersion,
} from "@/types/planner";

type PlanCapabilities = {
  canRead?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  canPublish?: boolean;
  canSetVisibilityPublic?: boolean;
  canCreateTemplate?: boolean;
  canStartRun?: boolean;
};

type PlanWithCapabilities = PlannerPlan & { _capabilities?: PlanCapabilities };

const STATUS_LABELS: Record<PlannerStatus, string> = {
  draft: "Utkast",
  published: "Publicerad",
  modified: "Andrad",
  archived: "Arkiverad",
};

const STATUS_VARIANTS: Record<
  PlannerStatus,
  "secondary" | "success" | "warning" | "outline"
> = {
  draft: "secondary",
  published: "success",
  modified: "warning",
  archived: "outline",
};

const VISIBILITY_LABELS: Record<PlannerVisibility, string> = {
  private: "Privat",
  tenant: "Organisation",
  public: "Publik",
};

const VISIBILITY_VARIANTS: Record<
  PlannerVisibility,
  "outline" | "accent" | "primary"
> = {
  private: "outline",
  tenant: "accent",
  public: "primary",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("sv-SE");
}

function formatDuration(totalMinutes?: number | null) {
  if (!totalMinutes || totalMinutes <= 0) return "0 min";
  return `${totalMinutes} min`;
}

function canSetVisibility(plan: PlanWithCapabilities, visibility: PlannerVisibility) {
  const caps = plan._capabilities ?? {};
  if (!caps.canUpdate) return false;
  if (visibility === "public") return Boolean(caps.canSetVisibilityPublic);
  return true;
}

export default function AdminPlannerDetailPage() {
  const params = useParams<{ planId: string }>();
  const planId = Array.isArray(params.planId) ? params.planId[0] : params.planId;
  const router = useRouter();
  const { success, warning } = useToast();
  const { can, isLoading: isRbacLoading } = useRbac();
  const { currentTenant } = useTenant();

  const [plan, setPlan] = useState<PlanWithCapabilities | null>(null);
  const [versions, setVersions] = useState<PlannerVersion[]>([]);
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const canView = can("admin.planner.list");

  const loadPlan = useCallback(async () => {
    if (!planId || !canView) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/plans/${planId}`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to load plan");
      }
      const data = (await res.json()) as {
        plan: PlannerPlan;
        _capabilities?: PlanCapabilities;
      };
      setPlan({ ...data.plan, _capabilities: data._capabilities });
    } catch (err) {
      console.error("[admin/planner] load detail error", err);
      setError("Kunde inte ladda plan.");
    } finally {
      setIsLoading(false);
    }
  }, [planId, canView]);

  const loadVersions = useCallback(async () => {
    if (!planId || !canView) return;
    try {
      const res = await fetch(`/api/plans/${planId}/versions`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to load versions");
      }
      const data = (await res.json()) as {
        versions: PlannerVersion[];
        currentVersionId: string | null;
      };
      setVersions(data.versions ?? []);
      setCurrentVersionId(data.currentVersionId ?? null);
    } catch (err) {
      console.error("[admin/planner] load versions error", err);
    }
  }, [planId, canView]);

  useEffect(() => {
    void loadPlan();
    void loadVersions();
  }, [loadPlan, loadVersions]);

  const latestVersion = useMemo(() => versions[0] ?? null, [versions]);
  const sortedBlocks = useMemo(() => {
    return [...(plan?.blocks ?? [])].sort((a, b) => a.position - b.position);
  }, [plan?.blocks]);

  const handlePublish = async () => {
    if (!plan || !plan._capabilities?.canPublish) return;
    setPendingPlanId(plan.id);
    try {
      const res = await fetch(`/api/plans/${plan.id}/publish`, { method: "POST" });
      if (!res.ok) {
        throw new Error("Failed to publish");
      }
      const payload = (await res.json()) as {
        plan: { id: string; status: string; currentVersionId: string };
      };
      setPlan((prev) =>
        prev
          ? {
              ...prev,
              status: payload.plan.status as PlannerStatus,
              currentVersionId: payload.plan.currentVersionId,
              updatedAt: new Date().toISOString(),
            }
          : prev
      );
      success("Plan publicerad.");
      void loadVersions();
    } catch (err) {
      console.error("[admin/planner] publish error", err);
      warning("Kunde inte publicera plan.");
    } finally {
      setPendingPlanId(null);
    }
  };

  const handleVisibilityChange = async (visibility: PlannerVisibility) => {
    if (!plan || !canSetVisibility(plan, visibility)) return;
    setPendingPlanId(plan.id);
    try {
      const res = await fetch(`/api/plans/${plan.id}/visibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visibility,
          owner_tenant_id: plan.ownerTenantId ?? currentTenant?.id ?? null,
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to update visibility");
      }
      const payload = (await res.json()) as { plan: PlannerPlan };
      setPlan((prev) =>
        prev ? { ...prev, ...payload.plan, _capabilities: prev._capabilities } : prev
      );
      success("Synlighet uppdaterad.");
    } catch (err) {
      console.error("[admin/planner] visibility error", err);
      warning("Kunde inte uppdatera synlighet.");
    } finally {
      setPendingPlanId(null);
    }
  };

  const handleDelete = async () => {
    if (!plan) return;
    setPendingPlanId(plan.id);
    try {
      const res = await fetch(`/api/plans/${plan.id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete plan");
      }
      success("Plan borttagen.");
      router.push("/admin/planner");
    } catch (err) {
      console.error("[admin/planner] delete error", err);
      warning("Kunde inte ta bort plan.");
    } finally {
      setPendingPlanId(null);
      setDeleteOpen(false);
    }
  };

  if (!isRbacLoading && !canView) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          icon={<DocumentTextIcon className="h-6 w-6" />}
          title="Ingen behorighet"
          description="Du saknar behorighet for att visa planner-admin."
        />
      </AdminPageLayout>
    );
  }

  if (isLoading) {
    return (
      <AdminPageLayout>
        <LoadingState message="Laddar plan..." />
      </AdminPageLayout>
    );
  }

  if (error) {
    return (
      <AdminPageLayout>
        <AdminErrorState
          title="Kunde inte ladda plan"
          description={error}
          onRetry={() => void loadPlan()}
        />
      </AdminPageLayout>
    );
  }

  if (!plan) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          icon={<DocumentTextIcon className="h-6 w-6" />}
          title="Plan saknas"
          description="Planen kunde inte hittas eller saknar access."
        />
      </AdminPageLayout>
    );
  }

  const isPending = pendingPlanId === plan.id;

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title={plan.name}
        description={plan.description ?? "Ingen beskrivning"}
        icon={<DocumentTextIcon className="h-6 w-6" />}
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Planner", href: "/admin/planner" },
          { label: plan.name },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            {plan._capabilities?.canPublish && (
              <Button size="sm" onClick={() => void handlePublish()} disabled={isPending}>
                Publicera
              </Button>
            )}
            {plan._capabilities?.canDelete && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
                disabled={isPending}
              >
                Ta bort
              </Button>
            )}
          </div>
        }
      />

      <AdminSection title="Status och synlighet">
        <AdminCard>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={STATUS_VARIANTS[plan.status]}>{STATUS_LABELS[plan.status]}</Badge>
            <Badge variant={VISIBILITY_VARIANTS[plan.visibility]}>
              {VISIBILITY_LABELS[plan.visibility]}
            </Badge>
            {plan._capabilities?.canUpdate && (
              <select
                value={plan.visibility}
                onChange={(event) =>
                  void handleVisibilityChange(event.target.value as PlannerVisibility)
                }
                disabled={isPending}
                className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
              >
                {(["private", "tenant", "public"] as const).map((value) => (
                  <option key={value} value={value} disabled={!canSetVisibility(plan, value)}>
                    {VISIBILITY_LABELS[value]}
                  </option>
                ))}
              </select>
            )}
            {plan._capabilities?.canStartRun && (
              <Button size="sm" variant="outline" href={`/app/play/${plan.id}/start`}>
                Starta run
              </Button>
            )}
          </div>
        </AdminCard>
      </AdminSection>

      <AdminSection title="Metadata">
        <AdminCard>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Owner user</p>
              <p className="text-sm font-medium text-foreground">{plan.ownerUserId}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Owner tenant</p>
              <p className="text-sm font-medium text-foreground">
                {plan.ownerTenantId ?? "Global"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total tid</p>
              <p className="text-sm font-medium text-foreground">
                {formatDuration(plan.totalTimeMinutes)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Senast uppdaterad</p>
              <p className="text-sm font-medium text-foreground">{formatDate(plan.updatedAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current version</p>
              <p className="text-sm font-medium text-foreground">
                {plan.currentVersionId ?? "Ingen"}
              </p>
            </div>
          </div>
        </AdminCard>
      </AdminSection>

      <AdminSection title="Blocks">
        <AdminCard>
          {sortedBlocks.length === 0 ? (
            <AdminEmptyState
              icon={<DocumentTextIcon className="h-6 w-6" />}
              title="Inga block"
              description="Planen innehaller inga block."
            />
          ) : (
            <div className="space-y-3">
              {sortedBlocks.map((block: PlannerBlock) => (
                <div
                  key={block.id}
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">
                        {block.blockType === "game"
                          ? block.game?.title ?? "Game"
                          : block.title ?? "Block"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Type: {block.blockType} • Position {block.position + 1}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDuration(block.durationMinutes ?? block.game?.durationMinutes ?? 0)}
                    </div>
                  </div>
                  {block.notes ? (
                    <p className="mt-1 text-xs text-muted-foreground">{block.notes}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      </AdminSection>

      <AdminSection title="Versions">
        <AdminCard
          actions={
            <Button size="sm" variant="outline" href={`/admin/planner/${plan.id}/versions`}>
              Visa alla
            </Button>
          }
        >
          {latestVersion ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Version {latestVersion.versionNumber}</span>
                {currentVersionId === latestVersion.id && (
                  <Badge variant="primary" size="sm">
                    Current
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Publicerad {formatDate(latestVersion.publishedAt)} •
                {" "}
                {latestVersion.name}
              </p>
            </div>
          ) : (
            <AdminEmptyState
              icon={<DocumentTextIcon className="h-6 w-6" />}
              title="Inga versioner"
              description="Planen har inga publicerade versioner."
            />
          )}
        </AdminCard>
      </AdminSection>

      <AdminConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Ta bort plan"
        description={`Ar du saker pa att du vill ta bort plan \"${plan.name}\"?`}
        confirmLabel="Ta bort"
        variant="danger"
        onConfirm={handleDelete}
      />
    </AdminPageLayout>
  );
}
