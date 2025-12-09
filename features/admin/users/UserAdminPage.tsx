'use client';

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  UserPlusIcon,
  UsersIcon,
  CheckBadgeIcon,
  EnvelopeIcon,
  UserMinusIcon,
} from "@heroicons/react/24/outline";
import { Button, Card, CardContent, EmptyState, LoadingState, useToast } from "@/components/ui";
import { SkeletonStats } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/auth";
import { useTenant } from "@/lib/context/TenantContext";
import type { Database } from "@/types/supabase";
import { createMockUsers } from "./data";
import { UserAdminItem, UserFilters, UserRole, UserStatus } from "./types";
import { UserTable } from "./components/UserTable";
import { UserTableToolbar } from "./components/UserTableToolbar";
import { UserInviteDialog } from "./components/UserInviteDialog";
import { UserEditDialog } from "./components/UserEditDialog";
import { UserTablePagination } from "./components/UserTablePagination";

const USERS_PER_PAGE = 15;

type MembershipRow = any & {
  users: { email: string | null; full_name: string | null } | null;
  tenants: { name: string | null } | null;
};

type InvitePayload = {
  email: string;
  name?: string;
  role: UserRole;
  organisationName?: string;
};

type EditPayload = {
  name?: string | null;
  roles: UserRole[];
  status: UserStatus;
};

export function UserAdminPage() {
  const { user, userRole } = useAuth();
  const { currentTenant, isLoadingTenants } = useTenant();
  const { success, info, warning } = useToast();

  const [users, setUsers] = useState<UserAdminItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const defaultFilters: UserFilters = {
    search: "",
    role: "all",
    status: "all",
    organisation: "all",
    sort: "recent",
  };
  const [filters, setFilters] = useState<UserFilters>(defaultFilters);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAdminItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const loadUsers = useCallback(async () => {
    const isGlobalAdmin = userRole === "admin" || userRole === "superadmin";
    const tenantId = currentTenant?.id;
    const tenantName = currentTenant?.name;

    if (!user) {
      setIsLoadingUsers(false);
      return;
    }

    if (!currentTenant && !isGlobalAdmin) {
      setIsLoadingUsers(false);
      return;
    }

    setIsLoadingUsers(true);
    setError(null);
    try {
      const query = (supabase as any)
        .from("user_tenant_memberships")
        .select("id, user_id, role, tenant_id, created_at, tenants ( name ), users ( email, full_name )")
        .order("created_at", { ascending: false });

      const { data, error: queryError } = tenantId ? (query as any).eq("tenant_id", tenantId) : (query as any);

      if (queryError) {
        throw queryError;
      }

      const mapped: UserAdminItem[] = (data || []).map((row: any) => {
        const membership = row as MembershipRow;
        return {
          id: membership.id,
          userId: membership.user_id,
          email: membership.users?.email ?? "unknown@example.com",
          name: membership.users?.full_name ?? null,
          roles: [membership.role as UserRole],
          organisationName: membership.tenants?.name ?? tenantName,
          status: "active",
          createdAt: membership.created_at,
        };
      });

      setUsers(mapped);
    } catch (err) {
      console.error("Failed to load users", err);
      setError("Failed to load users from Supabase. Showing sample data instead.");
      setUsers(createMockUsers(tenantName || "Global"));
    } finally {
      setIsLoadingUsers(false);
    }
  }, [currentTenant, user, userRole]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await loadUsers();
      if (cancelled) return;
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [loadUsers]);

  const handleFiltersChange = (next: Partial<UserFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters(defaultFilters);
    setCurrentPage(1);
  };

  const handleStatusChange = (userId: string, status: UserStatus) => {
    setUsers((prev) =>
      prev.map((userItem) => (userItem.id === userId ? { ...userItem, status } : userItem)),
    );
    success(`User is now ${status}`, "Status updated");
  };

  const handleEditSubmit = async (payload: EditPayload) => {
    if (!editingUser) return;
    if (editingUser.id.startsWith("temp-")) {
      setUsers((prev) =>
        prev.map((userItem) =>
          userItem.id === editingUser.id
            ? { ...userItem, name: payload.name ?? userItem.name, roles: payload.roles, status: payload.status }
            : userItem,
        ),
      );
      success("Pending invite uppdaterad lokalt.", "Updated");
      setEditingUser(null);
      return;
    }
    try {
      // Update membership role/status in DB
      const { error: updateError } = await (supabase as any)
        .from("user_tenant_memberships")
        .update({ role: payload.roles[0] })
        .eq("id", editingUser.id);
      if (updateError) throw updateError;

      if (payload.name) {
        // Best-effort update of user full_name
        void supabase.from("users").update({ full_name: payload.name }).eq("id", editingUser.userId ?? editingUser.id);
      }

      setUsers((prev) =>
        prev.map((userItem) =>
          userItem.id === editingUser.id
            ? {
                ...userItem,
                name: payload.name ?? userItem.name,
                roles: payload.roles,
                status: payload.status,
              }
            : userItem,
        ),
      );
      success("Changes saved.", "User updated");
    } catch (err) {
      console.error("Failed to update user", err);
      setError("Kunde inte uppdatera användaren.");
    } finally {
      setEditingUser(null);
    }
  };

  const handleInviteSubmit = async (payload: InvitePayload) => {
    if (!currentTenant) {
      setError("Ingen organisation vald för inbjudan.");
      return;
    }

    try {
      // Find user by email
      const { data: userRow, error: userError } = await supabase
        .from("users")
        .select("id, full_name")
        .ilike("email", payload.email)
        .maybeSingle();

      if (userError) throw userError;
      if (!userRow) {
        const pending: UserAdminItem = {
          id: `temp-${Date.now()}`,
          email: payload.email,
          name: payload.name || payload.email,
          roles: [payload.role],
          organisationName: currentTenant.name,
          status: "invited",
          createdAt: new Date().toISOString(),
        };
        setUsers((prev) => [pending, ...prev]);
        setInviteOpen(false);
        info("Inbjudan sparad lokalt. Skapa användare i auth för att slutföra.", "Pending invite");
        return;
      }

      // Insert membership
      const { data: membership, error: membershipError } = await (supabase as any)
        .from("user_tenant_memberships")
        .insert({
          user_id: userRow.id,
          tenant_id: currentTenant.id,
          role: payload.role,
        })
        .select("id, role, created_at, tenants(name), users(email, full_name)")
        .single();

      if (membershipError) throw membershipError;

      const newUser: UserAdminItem = {
        id: membership.id,
        userId: userRow.id,
        email: membership.users?.email ?? payload.email,
        name: payload.name || membership.users?.full_name || payload.email,
        roles: [payload.role],
        organisationName: membership.tenants?.name || currentTenant.name,
        status: "active",
        createdAt: membership.created_at,
      };

      setUsers((prev) => [newUser, ...prev]);
      setInviteOpen(false);
      success(`Användare tillagd i ${newUser.organisationName}.`, "Invite/membership saved");
    } catch (err) {
      console.error("Failed to invite user", err);
      setError("Kunde inte lägga till användaren. Kontrollera e-post och försök igen.");
    }
  };

  const handleRemove = async (userId: string) => {
    setUsers((prev) => prev.filter((userItem) => userItem.id !== userId));
    if (userId.startsWith("temp-")) {
      warning("Pending invite removed from list.", "Invite removed");
      return;
    }
    try {
      const { error: deleteError } = await (supabase as any).from("user_tenant_memberships").delete().eq("id", userId);
      if (deleteError) throw deleteError;
      warning("User removed from organisation list.", "User removed");
    } catch (err) {
      console.error("Failed to remove user", err);
      setError("Kunde inte ta bort användaren.");
    }
  };

  const handleResendInvite = (userItem: UserAdminItem) => {
    info(`Invite resent to ${userItem.email}`, "Invite resent");
  };

  const filteredUsers = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    const bySearch = users.filter((userItem) => {
      const haystack = [
        userItem.name ?? "",
        userItem.email,
        userItem.organisationName ?? "",
        userItem.roles.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });

    const byRole =
      filters.role === "all"
        ? bySearch
        : bySearch.filter((userItem) => userItem.roles.includes(filters.role as UserRole));

    const byStatus =
      filters.status === "all"
        ? byRole
        : byRole.filter((userItem) => userItem.status === filters.status);

    const byOrg =
      filters.organisation === "all"
        ? byStatus
        : byStatus.filter((userItem) => userItem.organisationName === filters.organisation);

    const statusOrder: Record<UserStatus, number> = { active: 0, invited: 1, inactive: 2 };

    const sorted = [...byOrg].sort((a, b) => {
      if (filters.sort === "name") {
        const aName = (a.name || a.email).toLowerCase();
        const bName = (b.name || b.email).toLowerCase();
        return aName.localeCompare(bName);
      }
      if (filters.sort === "status") {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });

    return sorted;
  }, [filters.organisation, filters.role, filters.search, filters.sort, filters.status, users]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = useMemo(() => {
    const start = (safePage - 1) * USERS_PER_PAGE;
    return filteredUsers.slice(start, start + USERS_PER_PAGE);
  }, [filteredUsers, safePage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.role, filters.status, filters.organisation]);

  const statusCounts = useMemo(
    () =>
      users.reduce(
        (acc, userItem) => {
          acc[userItem.status] += 1;
          return acc;
        },
        { active: 0, inactive: 0, invited: 0 } as Record<UserStatus, number>,
      ),
    [users],
  );

  const organisations = useMemo(
    () =>
      Array.from(
        new Set(
          users
            .map((userItem) => userItem.organisationName)
            .filter((name): name is string => Boolean(name)),
        ),
      ),
    [users],
  );

  const hasActiveFilters =
    filters.search !== "" ||
    filters.role !== "all" ||
    filters.status !== "all" ||
    filters.organisation !== "all" ||
    filters.sort !== "recent";

  if (isLoadingTenants || (isLoadingUsers && users.length === 0)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
              <UsersIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Users</h1>
              <p className="text-sm text-muted-foreground">Manage user accounts, roles and permissions.</p>
            </div>
          </div>
        </div>
        <SkeletonStats />
        <LoadingState message="Loading users..." />
      </div>
    );
  }

  const isGlobalAdmin = userRole === "admin" || userRole === "superadmin";

  if (!user || (!currentTenant && !isGlobalAdmin)) {
    return (
      <EmptyState
        title="No organisation access"
        description="You need to be signed in and assigned to an organisation to manage users."
        action={{ label: "Go to login", onClick: () => (window.location.href = "/auth/login") }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
            <UsersIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Users</h1>
            <p className="text-sm text-muted-foreground">
              Manage user accounts, roles and permissions across your organisation.
            </p>
          </div>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-2">
          <UserPlusIcon className="h-4 w-4" />
          Invite user
        </Button>
      </div>

      {error && (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-amber-700">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-amber-700">!</div>
            <div className="flex-1">
              <p className="font-medium">{error}</p>
              <p className="text-xs text-amber-700/80">Försök igen eller använd mock-data för att fortsätta arbetet.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => void loadUsers()}>
              Ladda om
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Status Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="group border-border/60 transition-all duration-200 hover:border-primary/30 hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <UsersIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{users.length}</p>
              <p className="text-sm text-muted-foreground">Total users</p>
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
        <Card className="group border-border/60 transition-all duration-200 hover:border-amber-500/30 hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5">
              <EnvelopeIcon className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{statusCounts.invited}</p>
              <p className="text-sm text-muted-foreground">Invited</p>
            </div>
          </CardContent>
        </Card>
        <Card className="group border-border/60 transition-all duration-200 hover:border-muted-foreground/30 hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <UserMinusIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{statusCounts.inactive}</p>
              <p className="text-sm text-muted-foreground">Inactive</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Directory Card */}
      <Card className="overflow-hidden border-border/60">
        <CardContent className="p-0">
          <UserTableToolbar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            organisationOptions={organisations}
            onInviteClick={() => setInviteOpen(true)}
            hasActiveFilters={hasActiveFilters}
          />
          <div className="border-t border-border/40">
            <UserTable
              users={paginatedUsers}
              isLoading={isLoadingUsers}
              searchQuery={filters.search}
              onEdit={setEditingUser}
              onStatusChange={handleStatusChange}
              onRemove={handleRemove}
              onResendInvite={handleResendInvite}
              onRowClick={setEditingUser}
              onInviteClick={() => setInviteOpen(true)}
              onClearFilters={handleClearFilters}
            />
          </div>
          {filteredUsers.length > USERS_PER_PAGE && (
            <UserTablePagination
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={filteredUsers.length}
              itemsPerPage={USERS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          )}
        </CardContent>
      </Card>

      <UserInviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvite={handleInviteSubmit}
        defaultOrganisation={currentTenant?.name}
      />

      <UserEditDialog
        open={Boolean(editingUser)}
        user={editingUser}
        onOpenChange={(open) => {
          if (!open) setEditingUser(null);
        }}
        onSubmit={handleEditSubmit}
      />
    </div>
  );
}
