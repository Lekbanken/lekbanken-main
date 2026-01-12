"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminSection,
  AdminCard,
  AdminEmptyState,
  AdminErrorState,
} from "@/components/admin/shared";
import { Badge, Button, LoadingState } from "@/components/ui";
import { useRbac } from "@/features/admin/shared/hooks/useRbac";
import type { PlannerVersion } from "@/types/planner";

type VersionsResponse = {
  versions: PlannerVersion[];
  currentVersionId: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("sv-SE");
}

export default function AdminPlannerVersionsPage() {
  const params = useParams<{ planId: string }>();
  const planId = Array.isArray(params.planId) ? params.planId[0] : params.planId;
  const { can, isLoading: isRbacLoading } = useRbac();
  const t = useTranslations("admin.planner");

  const [versions, setVersions] = useState<PlannerVersion[]>([]);
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canView = can("admin.planner.list");

  const loadVersions = useCallback(async () => {
    if (!planId || !canView) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/plans/${planId}/versions`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to load versions");
      }
      const data = (await res.json()) as VersionsResponse;
      setVersions(data.versions ?? []);
      setCurrentVersionId(data.currentVersionId ?? null);
    } catch (err) {
      console.error("[admin/planner] versions error", err);
      setError(t("errorLoadVersions"));
    } finally {
      setIsLoading(false);
    }
  }, [planId, canView]);

  useEffect(() => {
    void loadVersions();
  }, [loadVersions]);

  const sortedVersions = useMemo(() => {
    return [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
  }, [versions]);

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
        <LoadingState message={t("loadingVersions")} />
      </AdminPageLayout>
    );
  }

  if (error) {
    return (
      <AdminPageLayout>
        <AdminErrorState
          title={t("errorLoadVersionsTitle")}
          description={error}
          onRetry={() => void loadVersions()}
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title={t("sections.versions")}
        description={t("detailDescription")}
        icon={<DocumentTextIcon className="h-6 w-6" />}
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: t("pageTitle"), href: "/admin/planner" },
          { label: t("sections.versions") },
        ]}
        actions={
          <Button size="sm" variant="outline" href={`/admin/planner/${planId}`}>
            {t("actions.backToPlan")}
          </Button>
        }
      />

      <AdminSection title={t("sections.versionList")}>
        <AdminCard>
          {sortedVersions.length === 0 ? (
            <AdminEmptyState
              icon={<DocumentTextIcon className="h-6 w-6" />}
              title={t("noVersions")}
              description={t("noVersionsDescription")}
            />
          ) : (
            <div className="space-y-3">
              {sortedVersions.map((version) => (
                <div
                  key={version.id}
                  className="flex flex-col gap-2 rounded-lg border border-border px-4 py-3 text-sm md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">Version {version.versionNumber}</span>
                      {currentVersionId === version.id && (
                        <Badge variant="primary" size="sm">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {version.name} • {t("publishedAt", { date: formatDate(version.publishedAt) })}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total tid: {version.totalTimeMinutes} min
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      </AdminSection>
    </AdminPageLayout>
  );
}
