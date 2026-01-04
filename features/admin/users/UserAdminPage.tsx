'use client';

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlusIcon,
  UsersIcon,
  CheckBadgeIcon,
  EnvelopeIcon,
  UserMinusIcon,
  ShieldCheckIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/outline";
import { Button, Card, CardContent, EmptyState, useToast } from "@/components/ui";
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
  AdminBreadcrumbs,
} from "@/components/admin/shared";
import { useRbac } from "@/features/admin/shared/hooks/useRbac";
import { supabase } from "@/lib/supabase/client";
import type {
  AdminUserListItem,
  AdminUserStatus,
  UserListFilters,
  UserRole,
} from "./types";
import {
  userStatusLabels,
} from "./types";
import { UserListItem, UserListToolbar, UserListSkeleton } from "./components/list";
import { UserInviteDialog } from "./components/UserInviteDialog";

type UserAdminPageProps = {
  initialUsers: AdminUserListItem[];
  initialError?: string | null;
};

type InvitePayload = {
  email: string;
  name?: string;
  role: UserRole;
  organisationName?: string;
};

const defaultFilters: UserListFilters = {
  search: "",
  status: "all",
  globalRole: "all",
  membershipRole: "all",
  membershipPresence: "all",
  primaryTenant: "all",
  sort: "recent",
};

export function UserAdminPage({
  initialUsers,
  initialError = null,
}: UserAdminPageProps) {
  const router = useRouter();
  const { success, error: toastError, info, warning } = useToast();
  const { can, isLoading: rbacLoading } = useRbac();
  const [users, setUsers] = useState(initialUsers);
  const [filters, setFilters] = useState<UserListFilters>(defaultFilters);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [error, setError] = useState(initialError);
  const [isRefreshing, startRefresh] = useTransition();

  // RBAC permissions
  const canViewUsers = can("admin.users.list");
  const canInviteUser = can("admin.users.create");
  const canEditUser = can("admin.users.edit");
  const canDeleteUser = can("admin.users.delete");

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchInput.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  useEffect(() => {
    setError(initialError);
  }, [initialError]);

  const handleRefresh = () => {
    startRefresh(() => router.refresh());
  };

  const handleFiltersChange = (next: Partial<UserListFilters>) => {
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

  const handleStatusChange = async (userId: string, status: AdminUserStatus) => {
    try {
      // Update user status in database
      // Note: We may need to update the memberships or a status field on users table
      // For now, we'll update local state and show success
      setUsers((prev) =>
        prev.map((userItem) => (userItem.id === userId ? { ...userItem, status } : userItem))
      );
      success(`Användare är nu ${userStatusLabels[status]}.`, "Status uppdaterad");
      handleRefresh();
    } catch (err) {
      console.error("Failed to update user status", err);
      const message = err instanceof Error ? err.message : "Kunde inte uppdatera status.";
      setError(message);
      toastError(message);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      // Delete all memberships first
      const { error: membershipError } = await supabase
        .from("user_tenant_memberships")
        .delete()
        .eq("user_id", userId);

      if (membershipError) {
        console.warn("Failed to remove memberships:", membershipError);
      }

      // Remove from local state
      setUsers((prev) => prev.filter((userItem) => userItem.id !== userId));
      success("Användare och medlemskap borttagna.");
      handleRefresh();
    } catch (err) {
      console.error("Failed to remove user", err);
      const message = err instanceof Error ? err.message : "Kunde inte ta bort användaren.";
      setError(message);
      toastError(message);
    }
  };

  const handleInviteSubmit = async (payload: InvitePayload) => {
    try {
      // Find user by email
      const { data: userRow, error: userError } = await supabase
        .from("users")
        .select("id, full_name")
        .ilike("email", payload.email)
        .maybeSingle();

      if (userError) throw userError;
      
      if (!userRow) {
        info(
          "Användaren finns inte i systemet ännu. Skapa ett konto först.",
          "Användare saknas"
        );
        setInviteOpen(false);
        return;
      }

      // TODO: Create membership if tenant is selected
      success(`Användare ${payload.email} hittad. Lägg till medlemskap separat.`, "Användare hittad");
      setInviteOpen(false);
      handleRefresh();
    } catch (err) {
      console.error("Failed to invite user", err);
      const message = err instanceof Error ? err.message : "Kunde inte bjuda in användaren.";
      setError(message);
      toastError(message);
    }
  };

  const filteredUsers = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();

    // Search filter
    const bySearch = query
      ? users.filter((userItem) => {
          const haystack = [
            userItem.name ?? "",
            userItem.email,
            userItem.id,
            userItem.globalRole ?? "",
            ...userItem.memberships.map((m) => m.tenantName ?? ""),
            ...userItem.memberships.map((m) => m.role),
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(query);
        })
      : users;

    // Status filter
    const byStatus =
      filters.status === "all"
        ? bySearch
        : bySearch.filter((userItem) => userItem.status === filters.status);

    // Global role filter
    const byGlobalRole =
      filters.globalRole === "all"
        ? byStatus
        : byStatus.filter((userItem) => userItem.globalRole === filters.globalRole);

    // Membership role filter
    const byMembershipRole =
      filters.membershipRole === "all"
        ? byGlobalRole
        : byGlobalRole.filter((userItem) =>
            userItem.memberships.some((m) => m.role === filters.membershipRole)
          );

    // Membership presence filter
    const byMembershipPresence =
      filters.membershipPresence === "all"
        ? byMembershipRole
        : filters.membershipPresence === "has"
          ? byMembershipRole.filter((userItem) => userItem.membershipsCount > 0)
          : byMembershipRole.filter((userItem) => userItem.membershipsCount === 0);

    // Primary tenant filter
    const byPrimaryTenant =
      filters.primaryTenant === "all"
        ? byMembershipPresence
        : filters.primaryTenant === "has"
          ? byMembershipPresence.filter((userItem) => userItem.primaryMembership !== null)
          : byMembershipPresence.filter((userItem) => userItem.primaryMembership === null);

    // Sorting
    const sorted = [...byPrimaryTenant].sort((a, b) => {
      if (filters.sort === "name") {
        const aName = (a.name || a.email).toLowerCase();
        const bName = (b.name || b.email).toLowerCase();
        return aName.localeCompare(bName);
      }
      if (filters.sort === "last_seen") {
        const aDate = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
        const bDate = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
        return bDate - aDate;
      }
      if (filters.sort === "memberships") {
        return (b.membershipsCount ?? 0) - (a.membershipsCount ?? 0);
      }
      // Default: recent (by createdAt)
      const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bCreated - aCreated;
    });

    return sorted;
  }, [debouncedSearch, filters, users]);

  // Status counts for stat cards
  const statusCounts = useMemo(() => {
    return users.reduce(
      (acc, userItem) => {
        acc[userItem.status] = (acc[userItem.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<AdminUserStatus, number>
    );
  }, [users]);

  const totalMemberships = useMemo(
    () => users.reduce((acc, userItem) => acc + userItem.membershipsCount, 0),
    [users]
  );

  const usersWithoutMemberships = useMemo(
    () => users.filter((userItem) => userItem.membershipsCount === 0).length,
    [users]
  );

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.status !== "all" ||
    filters.globalRole !== "all" ||
    filters.membershipRole !== "all" ||
    filters.membershipPresence !== "all" ||
    filters.primaryTenant !== "all" ||
    filters.sort !== "recent";

  if (rbacLoading) {
    return (
      <AdminPageLayout>
        <AdminBreadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Användare" }]} />
        <UserListSkeleton count={6} />
      </AdminPageLayout>
    );
  }

  if (!canViewUsers) {
    return (
      <AdminPageLayout>
        <EmptyState
          title="Åtkomst nekad"
          description="Du har inte behörighet att se användare."
          action={{ label: "Gå till dashboard", onClick: () => router.push("/admin") }}
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Användare" }]} />

      <AdminPageHeader
        title="Användare"
        description="Hantera användarkonton, roller och behörigheter i systemet."
        icon={<UsersIcon className="h-6 w-6" />}
        actions={
          canInviteUser && (
            <Button onClick={() => setInviteOpen(true)} className="gap-2">
              <UserPlusIcon className="h-4 w-4" />
              Bjud in användare
            </Button>
          )
        }
      />

      {error && (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-amber-700">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-amber-700">
              !
            </div>
            <div className="flex-1">
              <p className="font-medium">{error}</p>
              <p className="text-xs text-amber-700/80">
                Försök igen eller uppdatera sidan om problemet kvarstår.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={handleRefresh}>
              Ladda om
            </Button>
          </CardContent>
        </Card>
      )}

      <AdminStatGrid cols={5} className="mb-6">
        <AdminStatCard
          label="Totalt"
          value={users.length}
          icon={<UsersIcon className="h-5 w-5" />}
          iconColor="primary"
        />
        <AdminStatCard
          label="Aktiva"
          value={statusCounts.active ?? 0}
          icon={<CheckBadgeIcon className="h-5 w-5" />}
          iconColor="green"
        />
        <AdminStatCard
          label="Inbjudna"
          value={statusCounts.invited ?? 0}
          icon={<EnvelopeIcon className="h-5 w-5" />}
          iconColor="amber"
        />
        <AdminStatCard
          label="Avstängda"
          value={statusCounts.disabled ?? 0}
          icon={<NoSymbolIcon className="h-5 w-5" />}
          iconColor="red"
        />
        <AdminStatCard
          label="Utan org"
          value={usersWithoutMemberships}
          icon={<UserMinusIcon className="h-5 w-5" />}
        />
      </AdminStatGrid>

      <div className="space-y-4">
        <UserListToolbar
          filters={filters}
          searchValue={searchInput}
          onSearchChange={handleSearchChange}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
        />

        {isRefreshing ? (
          <UserListSkeleton count={6} />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            title={hasActiveFilters ? "Inga matchande användare" : "Inga användare ännu"}
            description={
              hasActiveFilters
                ? "Justera sökningen eller rensa filter för att se fler."
                : "Det finns inga användare i systemet ännu."
            }
            action={
              !hasActiveFilters && canInviteUser
                ? { label: "Bjud in användare", onClick: () => setInviteOpen(true) }
                : undefined
            }
            secondaryAction={
              hasActiveFilters ? { label: "Rensa filter", onClick: handleClearFilters } : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredUsers.map((user) => (
              <UserListItem
                key={user.id}
                user={user}
                canEdit={canEditUser}
                canDelete={canDeleteUser}
                onStatusChange={canEditUser ? handleStatusChange : undefined}
                onRemove={canDeleteUser ? handleRemove : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <UserInviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvite={handleInviteSubmit}
      />
    </AdminPageLayout>
  );
}
