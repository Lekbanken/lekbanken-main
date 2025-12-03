'use client';

import { useEffect, useMemo, useState } from "react";
import {
  BuildingOffice2Icon,
  PlusIcon,
  CheckBadgeIcon,
  PauseCircleIcon,
} from "@heroicons/react/24/outline";
import { Button, Card, CardContent, EmptyState, LoadingState, useToast } from "@/components/ui";
import { SkeletonStats } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/supabase/auth";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";
import { mockOrganisations, createMockOrganisation } from "./data";
import { OrganisationAdminItem, OrganisationFilters, OrganisationStatus } from "./types";
import { OrganisationTable } from "./components/OrganisationTable";
import { OrganisationTableToolbar } from "./components/OrganisationTableToolbar";
import { OrganisationEditDialog } from "./components/OrganisationEditDialog";
import { OrganisationCreateDialog } from "./components/OrganisationCreateDialog";
import { OrganisationTablePagination } from "./components/OrganisationTablePagination";

type TenantRow = Database["public"]["Tables"]["tenants"]["Row"];

const ORGS_PER_PAGE = 15;

export function OrganisationAdminPage() {
  const { user } = useAuth();
  const { success, info, warning } = useToast();

  const [organisations, setOrganisations] = useState<OrganisationAdminItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<OrganisationFilters>({
    search: "",
    status: "all",
    sort: "recent",
  });
  const [editingOrg, setEditingOrg] = useState<OrganisationAdminItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const loadOrganisations = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: queryError } = await supabase
          .from("tenants")
          .select("*")
          .order("created_at", { ascending: false });

        if (queryError) {
          throw queryError;
        }

        const mapped: OrganisationAdminItem[] = (data || []).map((tenant: TenantRow) => ({
          id: tenant.id,
          name: tenant.name,
          contactEmail: null,
          contactName: null,
          contactPhone: null,
          status: (tenant.status as OrganisationStatus) || "active",
          membersCount: null,
          subscriptionPlan: null,
          createdAt: tenant.created_at,
          updatedAt: tenant.updated_at,
        }));

        if (!isMounted) return;
        setOrganisations(mapped);
      } catch (err) {
        console.error("Failed to load organisations", err);
        if (!isMounted) return;
        setError("Failed to load organisations from Supabase. Showing sample data instead.");
        setOrganisations(mockOrganisations);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadOrganisations();
    return () => {
      isMounted = false;
    };
  }, [user, user?.id]);

  const handleFiltersChange = (next: Partial<OrganisationFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setCurrentPage(1);
  };

  const handleCreate = (payload: Omit<OrganisationAdminItem, "id">) => {
    const newOrg: OrganisationAdminItem =
      payload.name && payload.contactEmail
        ? { ...payload, id: `org-${Date.now()}` }
        : createMockOrganisation(payload.name, payload.contactEmail || "contact@example.com");
    setOrganisations((prev) => [newOrg, ...prev]);
    setCreateOpen(false);
    info("Saved locally. Connect API to persist.", "Organisation created");
  };

  const handleEditSubmit = (payload: OrganisationAdminItem) => {
    setOrganisations((prev) => prev.map((org) => (org.id === payload.id ? payload : org)));
    setEditingOrg(null);
    void supabase
      .from("tenants")
      .update({
        name: payload.name,
        status: payload.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payload.id);
    success("Changes saved.", "Organisation updated");
  };

  const handleStatusChange = (orgId: string, status: OrganisationStatus) => {
    const updatedAt = new Date().toISOString();
    setOrganisations((prev) =>
      prev.map((org) => (org.id === orgId ? { ...org, status, updatedAt } : org)),
    );
    void supabase
      .from("tenants")
      .update({ status, updated_at: updatedAt })
      .eq("id", orgId);
    success(`Organisation is now ${status}.`, "Status updated");
  };

  const handleRemove = (orgId: string) => {
    setOrganisations((prev) => prev.filter((org) => org.id !== orgId));
    warning("Removed from list.", "Organisation removed");
  };

  const filteredOrganisations = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    const bySearch = organisations.filter((org) => {
      const haystack = [
        org.name,
        org.contactName ?? "",
        org.contactEmail ?? "",
        org.subscriptionPlan ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });

    const byStatus =
      filters.status === "all" ? bySearch : bySearch.filter((org) => org.status === filters.status);

    const sorted = [...byStatus].sort((a, b) => {
      if (filters.sort === "name") {
        return a.name.localeCompare(b.name);
      }
      if (filters.sort === "members") {
        const aMembers = a.membersCount ?? 0;
        const bMembers = b.membersCount ?? 0;
        return bMembers - aMembers;
      }
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });

    return sorted;
  }, [filters.search, filters.sort, filters.status, organisations]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredOrganisations.length / ORGS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedOrganisations = filteredOrganisations.slice(
    (safePage - 1) * ORGS_PER_PAGE,
    safePage * ORGS_PER_PAGE,
  );

  const statusCounts = useMemo(
    () =>
      organisations.reduce(
        (acc, org) => {
          acc[org.status] += 1;
          return acc;
        },
        { active: 0, inactive: 0 } as Record<OrganisationStatus, number>,
      ),
    [organisations],
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.status]);

  if (isLoading && organisations.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
            <BuildingOffice2Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Organisations</h1>
            <p className="text-sm text-muted-foreground">Manage organisations, contacts, and subscription status.</p>
          </div>
        </div>
        <SkeletonStats />
        <LoadingState message="Loading organisations..." />
      </div>
    );
  }

  if (!user) {
    return (
      <EmptyState
        title="No access"
        description="You need to be signed in to manage organisations."
        action={{ label: "Go to login", onClick: () => (window.location.href = "/auth/login") }}
      />
    );
  }

  const hasActiveFilters = filters.search !== "" || filters.status !== "all" || filters.sort !== "recent";

  return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
              <BuildingOffice2Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Organisations</h1>
              <p className="text-sm text-muted-foreground">
                Manage organisations, contacts, and subscription status.
              </p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <PlusIcon className="h-4 w-4" />
            Create organisation
          </Button>
        </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="group border-border/60 transition-all duration-200 hover:border-primary/30 hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <BuildingOffice2Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{organisations.length}</p>
              <p className="text-sm text-muted-foreground">Total organisations</p>
            </div>
          </CardContent>
        </Card>
        <Card className="group border-border/60 transition-all duration-200 hover:border-emerald-500/30 hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5">
              <CheckBadgeIcon className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{statusCounts.active}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card className="group border-border/60 transition-all duration-200 hover:border-muted-foreground/30 hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <PauseCircleIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{statusCounts.inactive}</p>
              <p className="text-sm text-muted-foreground">Inactive</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Directory Card */}
      {/* Directory Card */}
      <Card className="overflow-hidden border-border/60">
        <CardContent className="p-0">
          <OrganisationTableToolbar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onCreateClick={() => setCreateOpen(true)}
            hasActiveFilters={hasActiveFilters}
          />
          <div className="border-t border-border/40">
            <OrganisationTable
              organisations={paginatedOrganisations}
              isLoading={isLoading}
              searchQuery={filters.search}
              onEdit={setEditingOrg}
              onStatusChange={handleStatusChange}
              onRemove={handleRemove}
              onCreateClick={() => setCreateOpen(true)}
            />
          </div>
          {filteredOrganisations.length > ORGS_PER_PAGE && (
            <OrganisationTablePagination
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={filteredOrganisations.length}
              itemsPerPage={ORGS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          )}
          {error && (
            <div className="border-t border-border/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-600">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <OrganisationCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
      />

      <OrganisationEditDialog
        open={Boolean(editingOrg)}
        organisation={editingOrg}
        onOpenChange={(open) => {
          if (!open) setEditingOrg(null);
        }}
        onSubmit={handleEditSubmit}
      />
    </div>
  );
}
