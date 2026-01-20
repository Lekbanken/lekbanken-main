'use client';

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BuildingOffice2Icon,
  CheckBadgeIcon,
  PauseCircleIcon,
  PlusIcon,
  CreditCardIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import {
  AdminBreadcrumbs,
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
} from "@/components/admin/shared";
import { Button, Card, CardContent, EmptyState, useToast } from "@/components/ui";
import { useRbac } from "@/features/admin/shared/hooks/useRbac";
import { supabase } from "@/lib/supabase/client";
import type {
  AdminOrganisationListItem,
  OrganisationCreatePayload,
  OrganisationListFilters,
  OrganisationListStatus,
} from "./types";
import { tenantStatusLabels } from "./types";
import { OrganisationListToolbar } from "./components/list/OrganisationListToolbar";
import { OrganisationListItem } from "./components/list/OrganisationListItem";
import { OrganisationListSkeleton } from "./components/list/OrganisationListSkeleton";
import { OrganisationCreateDialog } from "./components/OrganisationCreateDialog";

type OrganisationAdminPageProps = {
  initialOrganisations: AdminOrganisationListItem[];
  initialError?: string | null;
};

const defaultFilters: OrganisationListFilters = {
  search: "",
  status: "all",
  billing: "all",
  language: "all",
  domain: "all",
  sort: "recent",
};

const statusOrder: OrganisationListStatus[] = [
  "active",
  "trial",
  "demo",
  "inactive",
  "suspended",
  "archived",
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function OrganisationAdminPage({
  initialOrganisations,
  initialError = null,
}: OrganisationAdminPageProps) {
  const t = useTranslations('admin.organizations');
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const { can, isLoading: rbacLoading } = useRbac();
  const [organisations, setOrganisations] = useState(initialOrganisations);
  const [filters, setFilters] = useState<OrganisationListFilters>(defaultFilters);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState(initialError);
  const [isRefreshing, startRefresh] = useTransition();

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchInput.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    setOrganisations(initialOrganisations);
  }, [initialOrganisations]);

  useEffect(() => {
    setError(initialError);
  }, [initialError]);

  const canViewTenants = can("admin.tenants.list");
  const canCreateTenant = can("admin.tenants.create");
  const canEditTenant = can("admin.tenants.edit");
  const canDeleteTenant = can("admin.tenants.delete");
  const canManageBilling = can("admin.billing.manage");

  const handleRefresh = () => {
    startRefresh(() => router.refresh());
  };

  const handleFiltersChange = (next: Partial<OrganisationListFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setFilters((prev) => ({ ...prev, search: value }));
  };

  const handleClearFilters = () => {
    setFilters(defaultFilters);
    setSearchInput("");
    setDebouncedSearch("");
  };

  const handleCreate = async (payload: OrganisationCreatePayload) => {
    try {
      const slug = payload.slug?.trim() || slugify(payload.name);
      const { data, error: insertError } = await supabase
        .from("tenants")
        .insert({
          name: payload.name,
          status: payload.status,
          type: "organisation",
          slug: slug || null,
          contact_name: payload.contactName,
          contact_email: payload.contactEmail,
          contact_phone: payload.contactPhone,
        })
        .select(
          "id, name, slug, status, contact_name, contact_email, contact_phone, created_at, updated_at, default_language, main_language, logo_url"
        )
        .single();

      if (insertError) {
        throw insertError;
      }

      if (!data) {
        throw new Error("Supabase returned no data for tenant insert");
      }

      const newItem: AdminOrganisationListItem = {
        id: data.id,
        name: data.name,
        slug: data.slug,
        status: payload.status,
        contactName: data.contact_name,
        contactEmail: data.contact_email,
        contactPhone: data.contact_phone,
        membersCount: 0,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        language: data.default_language ?? data.main_language ?? null,
        branding: {
          logoUrl: data.logo_url,
        },
        billing: {
          status: null,
          plan: null,
          connected: false,
          customerId: null,
          subscriptionId: null,
        },
        domain: null,
      };

      setOrganisations((prev) => [newItem, ...prev]);
      void supabase.rpc("add_initial_tenant_owner", { target_tenant: data.id });
      success("Organisation skapad.");
      handleRefresh();
    } catch (err) {
      console.error("Failed to create organisation", err);
      const message = err instanceof Error ? err.message : "Kunde inte skapa organisation.";
      setError(message);
      toastError(message);
    }
  };

  const handleStatusChange = async (orgId: string, status: OrganisationListStatus) => {
    try {
      const { error: updateError } = await supabase
        .from("tenants")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", orgId);

      if (updateError) {
        throw updateError;
      }

      setOrganisations((prev) =>
        prev.map((org) => (org.id === orgId ? { ...org, status } : org))
      );
      success(`Organisation uppdaterad till ${tenantStatusLabels[status]}.`);
      handleRefresh();
    } catch (err) {
      console.error("Failed to update organisation status", err);
      const message = err instanceof Error ? err.message : "Kunde inte uppdatera status.";
      setError(message);
      toastError(message);
    }
  };

  const handleRemove = async (orgId: string) => {
    try {
      const { error: deleteError } = await supabase.from("tenants").delete().eq("id", orgId);

      if (deleteError) {
        throw deleteError;
      }

      setOrganisations((prev) => prev.filter((org) => org.id !== orgId));
      success("Organisation borttagen.");
      handleRefresh();
    } catch (err) {
      console.error("Failed to delete organisation", err);
      const message = err instanceof Error ? err.message : "Kunde inte ta bort organisation.";
      setError(message);
      toastError(message);
    }
  };

  const statusOptions = useMemo(() => {
    return [
      { value: "all" as const, label: "Alla statusar" },
      ...statusOrder.map((status) => ({
        value: status,
        label: tenantStatusLabels[status],
      })),
    ];
  }, []);

  const languageOptions = useMemo(() => {
    const languages = Array.from(
      new Set(
        organisations
          .map((org) => org.language)
          .filter((language): language is string => Boolean(language))
      )
    ).sort((a, b) => a.localeCompare(b));

    return [
      { value: "all", label: t('allLanguages') },
      ...languages.map((language) => ({
        value: language ?? "unknown",
        label: language?.toUpperCase() ?? t('unknown'),
      })),
    ];
  }, [organisations, t]);

  const filteredOrganisations = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();

    const bySearch = query
      ? organisations.filter((org) => {
          const haystack = [
            org.name,
            org.slug ?? "",
            org.id,
            org.contactName ?? "",
            org.contactEmail ?? "",
            org.contactPhone ?? "",
            org.domain?.hostname ?? "",
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(query);
        })
      : organisations;

    const byStatus =
      filters.status === "all" ? bySearch : bySearch.filter((org) => org.status === filters.status);

    const byBilling =
      filters.billing === "all"
        ? byStatus
        : byStatus.filter((org) =>
            filters.billing === "connected" ? org.billing.connected : !org.billing.connected
          );

    const byLanguage =
      filters.language === "all"
        ? byBilling
        : byBilling.filter(
            (org) =>
              (org.language ?? "").toLowerCase() === filters.language.toLowerCase()
          );

    const byDomain =
      filters.domain === "all"
        ? byLanguage
        : byLanguage.filter((org) =>
            filters.domain === "yes" ? Boolean(org.domain) : !org.domain
          );

    const sorted = [...byDomain].sort((a, b) => {
      if (filters.sort === "name") {
        return a.name.localeCompare(b.name);
      }
      if (filters.sort === "members") {
        return (b.membersCount ?? 0) - (a.membersCount ?? 0);
      }
      if (filters.sort === "updated") {
        const aUpdated = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bUpdated = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bUpdated - aUpdated;
      }
      const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bCreated - aCreated;
    });

    return sorted;
  }, [debouncedSearch, filters, organisations]);

  const statusCounts = useMemo(() => {
    return organisations.reduce(
      (acc, org) => {
        acc[org.status] = (acc[org.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<OrganisationListStatus, number>
    );
  }, [organisations]);

  const trialOrDemoCount = (statusCounts.trial ?? 0) + (statusCounts.demo ?? 0);
  const inactiveCount =
    (statusCounts.inactive ?? 0) +
    (statusCounts.archived ?? 0) +
    (statusCounts.suspended ?? 0);
  const connectedBillingCount = organisations.filter((org) => org.billing.connected).length;

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.status !== "all" ||
    filters.billing !== "all" ||
    filters.language !== "all" ||
    filters.domain !== "all" ||
    filters.sort !== "recent";

  if (rbacLoading) {
    return (
      <AdminPageLayout>
        <AdminBreadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Organisationer" }]} />
        <OrganisationListSkeleton rows={4} />
      </AdminPageLayout>
    );
  }

  if (!canViewTenants) {
    return (
      <AdminPageLayout>
        <EmptyState
          title={t('accessDenied')}
          description={t('noPermissionOrgs')}
          action={{ label: t('goToDashboard'), onClick: () => router.push("/admin") }}
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Organisationer" }]} />

      <AdminPageHeader
        title="Organisationer"
        description="Hantera organisationer, kontaktinfo och prenumerationsstatus."
        icon={<BuildingOffice2Icon className="h-6 w-6" />}
        actions={
          canCreateTenant && (
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <PlusIcon className="h-4 w-4" />
              Skapa organisation
            </Button>
          )
        }
      />

      {error && (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-amber-700">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-amber-700">!</div>
            <div className="flex-1">
              <p className="font-medium">{error}</p>
              <p className="text-xs text-amber-700/80">
                {t('retryOrRefresh')}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={handleRefresh}>
              {t('reload')}
            </Button>
          </CardContent>
        </Card>
      )}

      <AdminStatGrid cols={5} className="mb-6">
        <AdminStatCard
          label="Totalt"
          value={organisations.length}
          icon={<BuildingOffice2Icon className="h-5 w-5" />}
          iconColor="primary"
        />
        <AdminStatCard
          label="Aktiva"
          value={statusCounts.active ?? 0}
          icon={<CheckBadgeIcon className="h-5 w-5" />}
          iconColor="green"
        />
        <AdminStatCard
          label="Inaktiva"
          value={inactiveCount}
          icon={<PauseCircleIcon className="h-5 w-5" />}
          iconColor="amber"
        />
        <AdminStatCard
          label="Trial/Demo"
          value={trialOrDemoCount}
          icon={<ClockIcon className="h-5 w-5" />}
          iconColor="purple"
        />
        <AdminStatCard
          label="Billing kopplad"
          value={connectedBillingCount}
          icon={<CreditCardIcon className="h-5 w-5" />}
          iconColor="blue"
        />
      </AdminStatGrid>

      <div className="space-y-4">
        <OrganisationListToolbar
          filters={filters}
          searchValue={searchInput}
          statusOptions={statusOptions}
          languageOptions={languageOptions}
          onSearchChange={handleSearchChange}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
        />

        {isRefreshing ? (
          <OrganisationListSkeleton rows={4} />
        ) : filteredOrganisations.length === 0 ? (
          <EmptyState
            title={hasActiveFilters ? t('noMatchingOrgs') : t('noOrgsYet')}
            description={
              hasActiveFilters
                ? t('adjustSearchOrClear')
                : t('createFirstOrg')
            }
            action={
              !hasActiveFilters && canCreateTenant
                ? { label: "Skapa organisation", onClick: () => setCreateOpen(true) }
                : undefined
            }
            secondaryAction={
              hasActiveFilters ? { label: "Rensa filter", onClick: handleClearFilters } : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredOrganisations.map((organisation) => (
              <OrganisationListItem
                key={organisation.id}
                organisation={organisation}
                canEdit={canEditTenant}
                canDelete={canDeleteTenant}
                canManageBilling={canManageBilling}
                onStatusChange={canEditTenant ? handleStatusChange : undefined}
                onRemove={canDeleteTenant ? handleRemove : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <OrganisationCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
      />
    </AdminPageLayout>
  );
}
