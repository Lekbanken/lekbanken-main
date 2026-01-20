"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { DocumentTextIcon, ArchiveBoxIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
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
import { StatusBadge } from "@/features/planner/components/StatusBadge";
import {
  VISIBILITY_LABELS,
  VISIBILITY_BADGE_VARIANTS,
  formatDate,
  formatDuration,
  canPerformAction,
} from "@/lib/planner";
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
  const t = useTranslations("admin.planner");

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
      setError(t("errorLoadPlan"));
    } finally {
      setIsLoading(false);
    }
  }, [planId, canView, t]);

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
      success(t("toasts.planPublished"));
      void loadVersions();
    } catch (err) {
      console.error("[admin/planner] publish error", err);
      warning(t("toasts.planPublishError"));
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
      success(t("toasts.visibilityUpdated"));
    } catch (err) {
      console.error("[admin/planner] visibility error", err);
      warning(t("toasts.visibilityError"));
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
      success(t("toasts.planDeleted"));
      router.push("/admin/planner");
    } catch (err) {
      console.error("[admin/planner] delete error", err);
      warning(t("toasts.planDeleteError"));
    } finally {
      setPendingPlanId(null);
      setDeleteOpen(false);
    }
  };

  const handleArchive = async () => {
    if (!plan || !plan._capabilities?.canUpdate) return;
    if (!canPerformAction(plan.status, 'archive')) return;
    setPendingPlanId(plan.id);
    try {
      const res = await fetch(`/api/plans/${plan.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      if (!res.ok) {
        throw new Error("Failed to archive plan");
      }
      const payload = (await res.json()) as { plan: PlannerPlan };
      setPlan((prev) =>
        prev ? { ...prev, ...payload.plan, _capabilities: prev._capabilities } : prev
      );
      success(t("toasts.planArchived"));
    } catch (err) {
      console.error("[admin/planner] archive error", err);
      warning(t("toasts.planArchiveError"));
    } finally {
      setPendingPlanId(null);
    }
  };

  const handleRestore = async () => {
    if (!plan || !plan._capabilities?.canUpdate) return;
    if (!canPerformAction(plan.status, 'restore')) return;
    setPendingPlanId(plan.id);
    try {
      const res = await fetch(`/api/plans/${plan.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      });
      if (!res.ok) {
        throw new Error("Failed to restore plan");
      }
      const payload = (await res.json()) as { plan: PlannerPlan };
      setPlan((prev) =>
        prev ? { ...prev, ...payload.plan, _capabilities: prev._capabilities } : prev
      );
      success(t("toasts.planRestored"));
    } catch (err) {
      console.error("[admin/planner] restore error", err);
      warning(t("toasts.planRestoreError"));
    } finally {
      setPendingPlanId(null);
    }
  };

  if (!isRbacLoading && !canView) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          icon={<DocumentTextIcon className="h-6 w-6" />}
          title={t("noPermission")}
          description={t("noPermissionDescription")}
        />
      </AdminPageLayout>
    );
  }

  if (isLoading) {
    return (
      <AdminPageLayout>
        <LoadingState message={t("loadingPlan")} />
      </AdminPageLayout>
    );
  }

  if (error) {
    return (
      <AdminPageLayout>
        <AdminErrorState
          title={t("errorLoadPlanTitle")}
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
          title={t("planNotFound")}
          description={t("planNotFoundDescription")}
        />
      </AdminPageLayout>
    );
  }

  const isPending = pendingPlanId === plan.id;

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title={plan.name}
        description={plan.description ?? t("noDescription")}
        icon={<DocumentTextIcon className="h-6 w-6" />}
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: t("pageTitle"), href: "/admin/planner" },
          { label: plan.name },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            {plan._capabilities?.canPublish && plan.status !== 'archived' && (
              <Button size="sm" onClick={() => void handlePublish()} disabled={isPending}>
                {t("actions.publish")}
              </Button>
            )}
            {plan._capabilities?.canUpdate && plan.status !== 'archived' && canPerformAction(plan.status, 'archive') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleArchive()}
                disabled={isPending}
              >
                <ArchiveBoxIcon className="mr-1 h-4 w-4" />
                {t("actions.archive")}
              </Button>
            )}
            {plan._capabilities?.canUpdate && plan.status === 'archived' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleRestore()}
                disabled={isPending}
              >
                <ArrowPathIcon className="mr-1 h-4 w-4" />
                {t("actions.restore")}
              </Button>
            )}
            {plan._capabilities?.canDelete && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
                disabled={isPending}
              >
                {t("actions.delete")}
              </Button>
            )}
          </div>
        }
      />

      <AdminSection title={t("sections.statusVisibility")}>
        <AdminCard>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={plan.status} />
            <Badge variant={VISIBILITY_BADGE_VARIANTS[plan.visibility]}>
              {VISIBILITY_LABELS[plan.visibility]}
            </Badge>
            {plan.status === 'modified' && (
              <span className="text-xs text-amber-600 font-medium">
                {t("unpublishedChanges")}
              </span>
            )}
            {plan._capabilities?.canUpdate && plan.status !== 'archived' && (
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
            {plan._capabilities?.canStartRun && plan.status !== 'archived' && (
              <Button size="sm" variant="outline" href={`/app/play/${plan.id}/start`}>
                {t("actions.startRun")}
              </Button>
            )}
          </div>
        </AdminCard>
      </AdminSection>

      <AdminSection title={t("sections.metadata")}>
        <AdminCard>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">{t("metadata.ownerUser")}</p>
              <p className="text-sm font-medium text-foreground">{plan.ownerUserId}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("metadata.ownerTenant")}</p>
              <p className="text-sm font-medium text-foreground">
                {plan.ownerTenantId ?? t("metadata.global")}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("metadata.totalTime")}</p>
              <p className="text-sm font-medium text-foreground">
                {formatDuration(plan.totalTimeMinutes)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("metadata.lastUpdated")}</p>
              <p className="text-sm font-medium text-foreground">{formatDate(plan.updatedAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("metadata.currentVersion")}</p>
              <p className="text-sm font-medium text-foreground">
                {plan.currentVersionId ?? t("metadata.none")}
              </p>
            </div>
          </div>
        </AdminCard>
      </AdminSection>

      <AdminSection title={t("sections.blocks")}>
        <AdminCard>
          {sortedBlocks.length === 0 ? (
            <AdminEmptyState
              icon={<DocumentTextIcon className="h-6 w-6" />}
              title={t("noBlocks")}
              description={t("noBlocksDescription")}
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

      <AdminSection title={t("sections.versions")}>
        <AdminCard
          actions={
            <Button size="sm" variant="outline" href={`/admin/planner/${plan.id}/versions`}>
              {t("actions.showAll")}
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
                {t("publishedAt", { date: formatDate(latestVersion.publishedAt) })} •
                {" "}
                {latestVersion.name}
              </p>
            </div>
          ) : (
            <AdminEmptyState
              icon={<DocumentTextIcon className="h-6 w-6" />}
              title={t("noVersions")}
              description={t("noVersionsDescription")}
            />
          )}
        </AdminCard>
      </AdminSection>

      <AdminConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("dialogs.deletePlanTitle")}
        description={t("dialogs.deletePlanConfirm", { name: plan.name })}
        confirmLabel={t("actions.delete")}
        variant="danger"
        onConfirm={handleDelete}
      />
    </AdminPageLayout>
  );
}
