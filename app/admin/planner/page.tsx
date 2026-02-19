"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { DocumentTextIcon, PlusIcon } from "@heroicons/react/24/outline";
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminSection,
  AdminCard,
  AdminEmptyState,
  AdminErrorState,
  AdminConfirmDialog,
} from "@/components/admin/shared";
import { Badge, Button, Input, LoadingState, Select, useToast } from "@/components/ui";
import { useRbac } from "@/features/admin/shared/hooks/useRbac";
import { useTenant } from "@/lib/context/TenantContext";
import { StatusBadge } from "@/features/planner/components/StatusBadge";
import {
  VISIBILITY_LABELS,
  VISIBILITY_BADGE_VARIANTS,
  STATUS_FILTER_OPTIONS,
  VISIBILITY_FILTER_OPTIONS,
  SORT_OPTIONS,
  formatDate,
  formatDuration,
  type PlanSortOption,
} from "@/lib/planner";
import type { PlannerPlan, PlannerStatus, PlannerVisibility } from "@/types/planner";

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

type PlanSearchResult = {
  plans: PlanWithCapabilities[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
};

type Scope = "tenant" | "global";

function canSetVisibility(plan: PlanWithCapabilities, visibility: PlannerVisibility) {
  const caps = plan._capabilities ?? {};
  if (!caps.canUpdate) return false;
  if (visibility === "public") return Boolean(caps.canSetVisibilityPublic);
  return true;
}

export default function AdminPlannerPage() {
  const router = useRouter();
  const { success, warning } = useToast();
  const { can, isSystemAdmin, isLoading: isRbacLoading } = useRbac();
  const { currentTenant } = useTenant();
  const t = useTranslations("admin.planner");

  const [scope, setScope] = useState<Scope>("tenant");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PlannerStatus | "all">("all");
  const [visibilityFilter, setVisibilityFilter] = useState<PlannerVisibility | "all">("all");
  const [sort, setSort] = useState<PlanSortOption>("updated-desc");

  const [plans, setPlans] = useState<PlanWithCapabilities[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: false,
  });
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlanWithCapabilities | null>(null);

  const canView = can("admin.planner.list");
  const hasTenantScope = Boolean(currentTenant?.id);

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  useEffect(() => {
    if (!isSystemAdmin) {
      setScope("tenant");
      return;
    }
    if (!hasTenantScope && scope === "tenant") {
      setScope("global");
    }
  }, [isSystemAdmin, hasTenantScope, scope]);

  const loadPlans = useCallback(
    async (page: number, append: boolean) => {
      if (!canView || isRbacLoading) return;
      if (scope === "tenant" && !hasTenantScope) return;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const body: {
          search?: string;
          tenantId?: string | null;
          visibility?: PlannerVisibility;
          page?: number;
          pageSize?: number;
        } = {
          page,
          pageSize: pagination.pageSize,
        };

        if (search) {
          body.search = search;
        }

        if (scope === "tenant") {
          body.tenantId = currentTenant?.id ?? null;
        }

        if (scope === "global") {
          body.visibility = "public";
        }

        const res = await fetch("/api/plans/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          throw new Error("Failed to load plans");
        }

        const data = (await res.json()) as PlanSearchResult;

        setPlans((prev) => (append ? [...prev, ...data.plans] : data.plans));
        setPagination({
          page: data.pagination.page,
          pageSize: data.pagination.pageSize,
          total: data.pagination.total,
          hasMore: data.pagination.hasMore,
        });
      } catch (err) {
        console.error("[admin/planner] load error", err);
        setError(t("errorLoadPlans"));
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [
      canView,
      currentTenant?.id,
      hasTenantScope,
      isRbacLoading,
      pagination.pageSize,
      scope,
      search,
      t,
    ]
  );

  useEffect(() => {
    if (!canView || isRbacLoading) return;
    if (scope === "tenant" && !hasTenantScope) {
      setPlans([]);
      setError(null);
      setIsLoading(false);
      return;
    }
    setPagination((prev) => ({ ...prev, page: 1 }));
    void loadPlans(1, false);
  }, [canView, hasTenantScope, isRbacLoading, loadPlans, scope, search, currentTenant?.id]);

  const filteredPlans = useMemo(() => {
    let result = [...plans];

    if (statusFilter !== "all") {
      result = result.filter((plan) => plan.status === statusFilter);
    }

    if (visibilityFilter !== "all") {
      result = result.filter((plan) => plan.visibility === visibilityFilter);
    }

    result.sort((a, b) => {
      switch (sort) {
        case "name-asc":
          return a.name.localeCompare(b.name, "sv");
        case "name-desc":
          return b.name.localeCompare(a.name, "sv");
        case "updated-asc":
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case "updated-desc":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case "duration-asc":
          return (a.totalTimeMinutes ?? 0) - (b.totalTimeMinutes ?? 0);
        case "duration-desc":
          return (b.totalTimeMinutes ?? 0) - (a.totalTimeMinutes ?? 0);
        default:
          return 0;
      }
    });

    return result;
  }, [plans, sort, statusFilter, visibilityFilter]);

  const handleLoadMore = async () => {
    if (!pagination.hasMore || isLoadingMore) return;
    const nextPage = pagination.page + 1;
    await loadPlans(nextPage, true);
  };

  const handlePublish = async (plan: PlanWithCapabilities) => {
    if (!plan._capabilities?.canPublish) return;
    setPendingPlanId(plan.id);
    try {
      const res = await fetch(`/api/plans/${plan.id}/publish`, { method: "POST" });
      if (!res.ok) {
        throw new Error("Failed to publish plan");
      }
      const payload = (await res.json()) as {
        plan: { id: string; status: string; currentVersionId: string };
      };
      setPlans((prev) =>
        prev.map((item) =>
          item.id === plan.id
            ? {
                ...item,
                status: payload.plan.status as PlannerStatus,
                currentVersionId: payload.plan.currentVersionId,
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      );
      success(t("toasts.planPublished"));
    } catch (err) {
      console.error("[admin/planner] publish error", err);
      warning(t("toasts.planPublishError"));
    } finally {
      setPendingPlanId(null);
    }
  };

  const handleVisibilityChange = async (
    plan: PlanWithCapabilities,
    visibility: PlannerVisibility
  ) => {
    if (!canSetVisibility(plan, visibility)) return;
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
      setPlans((prev) =>
        prev.map((item) =>
          item.id === plan.id
            ? { ...item, ...payload.plan, _capabilities: item._capabilities }
            : item
        )
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
    if (!deleteTarget) return;
    setPendingPlanId(deleteTarget.id);
    try {
      const res = await fetch(`/api/plans/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to delete plan");
      }
      setPlans((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      success(t("toasts.planDeleted"));
    } catch (err) {
      console.error("[admin/planner] delete error", err);
      warning(t("toasts.planDeleteError"));
    } finally {
      setPendingPlanId(null);
      setDeleteTarget(null);
    }
  };

  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Ny plan",
          description: "",
          visibility: "private",
          owner_tenant_id: scope === "tenant" ? currentTenant?.id : null,
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to create plan");
      }
      const payload = (await res.json()) as { plan: PlannerPlan };
      success(t("toasts.planCreated"));
      router.push(`/admin/planner/${payload.plan.id}`);
    } catch (err) {
      console.error("[admin/planner] create error", err);
      warning(t("toasts.planCreateError"));
    } finally {
      setIsCreating(false);
    }
  };

  const resolveOwnerLabel = (plan: PlanWithCapabilities) => {
    if (!plan.ownerTenantId) {
      return "Global";
    }
    if (currentTenant?.id === plan.ownerTenantId) {
      return currentTenant.name ?? "Tenant";
    }
    return `Tenant ${plan.ownerTenantId.slice(0, 6)}`;
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

  if (scope === "tenant" && !hasTenantScope && !isLoading) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          icon={<DocumentTextIcon className="h-6 w-6" />}
          title={t("noOrganizationSelected")}
          description={t("noOrganizationDescription")}
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        icon={<DocumentTextIcon className="h-6 w-6" />}
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: t("pageTitle") }]}
        actions={
          <Button onClick={() => void handleCreate()} disabled={isCreating}>
            <PlusIcon className="mr-1.5 h-4 w-4" />
            {isCreating ? t("actions.creating") : t("actions.createPlan")}
          </Button>
        }
      />

      <AdminSection
        title={t("sections.scope")}
        description={
          scope === "tenant"
            ? t("scopeTenantDescription", { name: currentTenant?.name ?? "vald organisation" })
            : t("scopeGlobalDescription")
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={scope === "tenant" ? "default" : "outline"}
            onClick={() => setScope("tenant")}
            disabled={!hasTenantScope}
          >
            Tenant
          </Button>
          {isSystemAdmin && (
            <Button
              size="sm"
              variant={scope === "global" ? "default" : "outline"}
              onClick={() => setScope("global")}
            >
              Global
            </Button>
          )}
        </div>
      </AdminSection>

      <AdminSection title={t("sections.filter")}>
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="w-full md:w-72"
          />
          <Select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as PlannerStatus | "all")
            }
            options={STATUS_FILTER_OPTIONS}
            className="w-auto min-w-[150px]"
          />
          <Select
            value={visibilityFilter}
            onChange={(event) =>
              setVisibilityFilter(event.target.value as PlannerVisibility | "all")
            }
            options={VISIBILITY_FILTER_OPTIONS}
            className="w-auto min-w-[150px]"
          />
          <Select
            value={sort}
            onChange={(event) => setSort(event.target.value as PlanSortOption)}
            options={SORT_OPTIONS}
            className="w-auto min-w-[150px]"
          />
        </div>
      </AdminSection>

      <AdminSection title={t("sections.plans")}>
        <AdminCard>
          {error ? (
            <AdminErrorState
              title={t("errorLoadPlansTitle")}
              description={error}
              onRetry={() => void loadPlans(1, false)}
            />
          ) : isLoading ? (
            <LoadingState message={t("loadingPlans")} />
          ) : filteredPlans.length === 0 ? (
            <AdminEmptyState
              icon={<DocumentTextIcon className="h-6 w-6" />}
              title={t("noPlans")}
              description={t("noPlansByFilter")}
            />
          ) : (
            <div className="space-y-3">
              {filteredPlans.map((plan) => {
                const isPending = pendingPlanId === plan.id;
                return (
                  <div
                    key={plan.id}
                    className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => router.push(`/admin/planner/${plan.id}`)}
                          className="text-left text-sm font-semibold text-foreground hover:underline"
                        >
                          {plan.name}
                        </button>
                        <StatusBadge status={plan.status} size="sm" />
                        <Badge
                          variant={VISIBILITY_BADGE_VARIANTS[plan.visibility]}
                          size="sm"
                        >
                          {VISIBILITY_LABELS[plan.visibility]}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatDuration(plan.totalTimeMinutes)}</span>
                        <span>•</span>
                        <span>{t("updatedAt", { date: formatDate(plan.updatedAt) })}</span>
                        <span>•</span>
                        <span>{resolveOwnerLabel(plan)}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        href={`/admin/planner/${plan.id}`}
                      >
                        {t("actions.open")}
                      </Button>
                      {plan._capabilities?.canPublish && (
                        <Button
                          size="sm"
                          onClick={() => void handlePublish(plan)}
                          disabled={isPending}
                        >
                          {t("actions.publish")}
                        </Button>
                      )}
                      {plan._capabilities?.canUpdate && (
                        <Select
                          value={plan.visibility}
                          onChange={(event) =>
                            void handleVisibilityChange(
                              plan,
                              event.target.value as PlannerVisibility
                            )
                          }
                          disabled={isPending}
                          options={(["private", "tenant", "public"] as const).map(
                            (value) => ({
                              value,
                              label: VISIBILITY_LABELS[value],
                              disabled: !canSetVisibility(plan, value),
                            })
                          )}
                          className="w-auto min-w-[120px] text-xs"
                        />
                      )}
                      {plan._capabilities?.canDelete && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteTarget(plan)}
                          disabled={isPending}
                        >
                          {t("actions.delete")}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isLoading && pagination.hasMore && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleLoadMore()}
                loading={isLoadingMore}
              >
                {t("actions.loadMore")}
              </Button>
            </div>
          )}
        </AdminCard>
      </AdminSection>

      <AdminConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title={t("dialogs.deletePlanTitle")}
        description={
          deleteTarget
            ? t("dialogs.deletePlanConfirm", { name: deleteTarget.name })
            : t("dialogs.deletePlanConfirmGeneric")
        }
        confirmLabel={t("actions.delete")}
        variant="danger"
        onConfirm={handleDelete}
      />
    </AdminPageLayout>
  );
}
