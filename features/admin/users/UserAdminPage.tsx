'use client';

import { useEffect, useMemo, useState } from "react";
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

type MembershipRow = Database["public"]["Tables"]["user_tenant_memberships"]["Row"] & {
  users: { email: string | null; full_name: string | null } | null;
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
  const { user } = useAuth();
  const { currentTenant, isLoadingTenants } = useTenant();
  const { success, info, warning } = useToast();

  const [users, setUsers] = useState<UserAdminItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UserFilters>({
    search: "",
    role: "all",
    status: "all",
    organisation: "all",
    sort: "recent",
  });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAdminItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!user) {
      setIsLoadingUsers(false);
      return;
    }
    if (!currentTenant) {
      setIsLoadingUsers(false);
      return;
    }

    let isMounted = true;
    const tenantId = currentTenant.id;
    const tenantName = currentTenant.name;

    const loadUsers = async () => {
      setIsLoadingUsers(true);
      setError(null);
      try {
        const { data, error: queryError } = await supabase
          .from("user_tenant_memberships")
          .select("id, user_id, role, created_at, users ( email, full_name )")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false });

        if (queryError) {
          throw queryError;
        }

        const mapped: UserAdminItem[] = (data || []).map((row) => {
          const membership = row as MembershipRow;
          return {
            id: membership.id,
            email: membership.users?.email ?? "unknown@example.com",
            name: membership.users?.full_name ?? null,
            roles: [membership.role as UserRole],
            organisationName: tenantName,
            status: "active",
            createdAt: membership.created_at,
          };
        });

        if (!isMounted) return;
        setUsers(mapped);
      } catch (err) {
        console.error("Failed to load users", err);
        if (!isMounted) return;
        setError("Failed to load users from Supabase. Showing sample data instead.");
        setUsers(createMockUsers(tenantName));
      } finally {
        if (isMounted) {
          setIsLoadingUsers(false);
        }
      }
    };

    void loadUsers();
    return () => {
      isMounted = false;
    };
  }, [currentTenant, currentTenant?.id, currentTenant?.name, user, user?.id]);

  const handleFiltersChange = (next: Partial<UserFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setCurrentPage(1);
  };

  const handleStatusChange = (userId: string, status: UserStatus) => {
    setUsers((prev) =>
      prev.map((userItem) => (userItem.id === userId ? { ...userItem, status } : userItem)),
    );
    success(`User is now ${status}`, "Status updated");
  };

  const handleEditSubmit = (payload: EditPayload) => {
    if (!editingUser) return;
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
    setEditingUser(null);
    success("Changes saved.", "User updated");
  };

  const handleInviteSubmit = (payload: InvitePayload) => {
    const newUser: UserAdminItem = {
      id: `invite-${Date.now()}`,
      email: payload.email,
      name: payload.name || payload.email,
      roles: [payload.role],
      organisationName: payload.organisationName || currentTenant?.name,
      status: "invited",
      createdAt: new Date().toISOString(),
    };
    setUsers((prev) => [newUser, ...prev]);
    setInviteOpen(false);
    info(`Invitation prepared for ${payload.email}`, "Invite sent");
  };

  const handleRemove = (userId: string) => {
    setUsers((prev) => prev.filter((userItem) => userItem.id !== userId));
    warning("User removed from organisation list.", "User removed");
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

  if (!user || !currentTenant) {
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
          {error && (
            <div className="border-t border-border/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-600">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <UserInviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvite={handleInviteSubmit}
        defaultOrganisation={currentTenant.name}
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
