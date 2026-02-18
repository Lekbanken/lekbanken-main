'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
import {
  UserPlusIcon,
  UsersIcon,
  CheckBadgeIcon,
  EnvelopeIcon,
  UserMinusIcon,
  NoSymbolIcon,
  ArrowPathIcon,
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
import { removeUserMemberships, lookupUserByEmail, deleteUser } from "./userActions.server";
import type {
  AdminUserListItem,
  AdminUserStatus,
  UserListFilters,
  UserRole,
} from "./types";
import { userStatusLabels } from "./types";
import { UserListToolbar, UserListTable, UserListTableSkeleton } from "./components/list";
import { UserInviteDialog } from "./components/UserInviteDialog";
import { UserCreateDialog } from "./components/UserCreateDialog";
import { UserDetailDrawer } from "./components/UserDetailDrawer";

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

/**
 * UserAdminPage - System-wide user management
 * 
 * Architecture notes:
 * - Uses table view for dense scanning of many users (100s-1000s)
 * - Drawer-based detail view for quick editing without losing list context
 * - Consistent with Organisations admin page patterns
 * - Separates system-level info from tenant/organisation membership
 */
export function UserAdminPage({
  initialUsers,
  initialError = null,
}: UserAdminPageProps) {
  const router = useRouter();
  const { success, error: toastError, info } = useToast();
  const { can, isLoading: rbacLoading } = useRbac();
  const t = useTranslations('admin.users');
  
  // State
  const [users, setUsers] = useState(initialUsers);
  const [filters, setFilters] = useState<UserListFilters>(defaultFilters);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState(initialError);
  const [isRefreshing, startRefresh] = useTransition();
  
  // Drawer state for user detail panel
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  // Sync with initial data
  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  useEffect(() => {
    setError(initialError);
  }, [initialError]);

  // Handlers
  const handleRefresh = useCallback(() => {
    startRefresh(() => router.refresh());
  }, [router]);

  const handleFiltersChange = useCallback((next: Partial<UserListFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    setFilters((prev) => ({ ...prev, search: value }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(defaultFilters);
    setSearchInput("");
    setDebouncedSearch("");
  }, []);

  const handleSelectUser = useCallback((user: AdminUserListItem) => {
    setSelectedUser(user);
    setDrawerOpen(true);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
    // Delay clearing selected user to avoid UI flash during close animation
    setTimeout(() => setSelectedUser(null), 300);
  }, []);

  const handleStatusChange = useCallback(async (userId: string, status: AdminUserStatus) => {
    try {
      // Update local state optimistically
      setUsers((prev) =>
        prev.map((userItem) => (userItem.id === userId ? { ...userItem, status } : userItem))
      );
      
      // Update selected user if it's the one being changed
      setSelectedUser((prev) => 
        prev?.id === userId ? { ...prev, status } : prev
      );
      
      success(t('messages.statusUpdated', { status: userStatusLabels[status] }), t('messages.statusUpdatedTitle'));
      handleRefresh();
    } catch (err) {
      console.error("Failed to update user status", err);
      const message = err instanceof Error ? err.message : t('errors.statusUpdateFailed');
      setError(message);
      toastError(message);
    }
  }, [success, toastError, handleRefresh, t]);

  const handleRemove = useCallback(async (userId: string) => {
    try {
      // Delete all memberships first via server action
      const membershipResult = await removeUserMemberships(userId);

      if (!membershipResult.success) {
        console.warn("Failed to remove memberships:", membershipResult.error);
      }

      // Delete the user from auth + DB
      const deleteResult = await deleteUser(userId);

      if (!deleteResult.success) {
        throw new Error(deleteResult.error || 'Failed to delete user');
      }

      // Remove from local state
      setUsers((prev) => prev.filter((userItem) => userItem.id !== userId));
      success(t('messages.userRemoved'));
      handleRefresh();
    } catch (err) {
      console.error("Failed to remove user", err);
      const message = err instanceof Error ? err.message : t('errors.removeFailed');
      setError(message);
      toastError(message);
    }
  }, [success, toastError, handleRefresh, t]);

  const handleInviteSubmit = useCallback(async (payload: InvitePayload) => {
    try {
      const result = await lookupUserByEmail(payload.email);

      if (result.error) throw new Error(result.error);
      
      if (!result.found) {
        info(
          t('messages.userNotFound'),
          t('messages.userNotFoundTitle')
        );
        setInviteOpen(false);
        return;
      }

      success(t('messages.userFound', { email: payload.email }), t('messages.userFoundTitle'));
      setInviteOpen(false);
      handleRefresh();
    } catch (err) {
      console.error("Failed to invite user", err);
      const message = err instanceof Error ? err.message : t('errors.inviteFailed');
      setError(message);
      toastError(message);
    }
  }, [success, info, toastError, handleRefresh, t]);

  const handleCreateSuccess = useCallback((_userId: string) => {
    success(t('messages.userCreated'), t('messages.newUser'));
    handleRefresh();
  }, [success, handleRefresh, t]);

  const filteredUsers = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();

    // Search filter
    let result = query
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
    if (filters.status !== "all") {
      result = result.filter((userItem) => userItem.status === filters.status);
    }

    // Global role filter
    if (filters.globalRole !== "all") {
      result = result.filter((userItem) => userItem.globalRole === filters.globalRole);
    }

    // Membership role filter
    if (filters.membershipRole !== "all") {
      result = result.filter((userItem) =>
        userItem.memberships.some((m) => m.role === filters.membershipRole)
      );
    }

    // Membership presence filter
    if (filters.membershipPresence !== "all") {
      result = filters.membershipPresence === "has"
        ? result.filter((userItem) => userItem.membershipsCount > 0)
        : result.filter((userItem) => userItem.membershipsCount === 0);
    }

    // Primary tenant filter
    if (filters.primaryTenant !== "all") {
      result = filters.primaryTenant === "has"
        ? result.filter((userItem) => userItem.primaryMembership !== null)
        : result.filter((userItem) => userItem.primaryMembership === null);
    }

    // Sorting
    return [...result].sort((a, b) => {
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

  // Loading state
  if (rbacLoading) {
    return (
      <AdminPageLayout>
        <AdminBreadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: t('title') }]} />
        <UserListTableSkeleton rows={6} />
      </AdminPageLayout>
    );
  }

  // Access denied state
  if (!canViewUsers) {
    return (
      <AdminPageLayout>
        <EmptyState
          title={t('noAccess.title')}
          description={t('noAccess.description')}
          action={{ label: t('noAccess.goToDashboard'), onClick: () => router.push("/admin") }}
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: t('title') }]} />

      {/* Page Header */}
      <AdminPageHeader
        title={t('pageTitle')}
        description={t('pageDescription')}
        icon={<UsersIcon className="h-6 w-6" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <ArrowPathIcon className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              {t('actions.refresh')}
            </Button>
            {canInviteUser && (
              <>
                <Button variant="outline" onClick={() => setInviteOpen(true)} className="gap-2">
                  <EnvelopeIcon className="h-4 w-4" />
                  {t('actions.invite')}
                </Button>
                <Button onClick={() => setCreateOpen(true)} className="gap-2">
                  <UserPlusIcon className="h-4 w-4" />
                  {t('actions.createUser')}
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Error Banner */}
      {error && (
        <Card className="border-amber-500/40 bg-amber-500/10 mb-6">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-amber-700">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-amber-700">
              !
            </div>
            <div className="flex-1">
              <p className="font-medium">{error}</p>
              <p className="text-xs text-amber-700/80">
                {t('errors.retryHint')}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={handleRefresh}>
              {t('actions.reload')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Row */}
      <AdminStatGrid cols={5} className="mb-6">
        <AdminStatCard
          label={t('stats.total')}
          value={users.length}
          icon={<UsersIcon className="h-5 w-5" />}
          iconColor="primary"
        />
        <AdminStatCard
          label={t('stats.active')}
          value={statusCounts.active ?? 0}
          icon={<CheckBadgeIcon className="h-5 w-5" />}
          iconColor="green"
        />
        <AdminStatCard
          label={t('stats.invited')}
          value={statusCounts.invited ?? 0}
          icon={<EnvelopeIcon className="h-5 w-5" />}
          iconColor="amber"
        />
        <AdminStatCard
          label={t('stats.disabled')}
          value={statusCounts.disabled ?? 0}
          icon={<NoSymbolIcon className="h-5 w-5" />}
          iconColor="red"
        />
        <AdminStatCard
          label={t('stats.withoutOrg')}
          value={usersWithoutMemberships}
          icon={<UserMinusIcon className="h-5 w-5" />}
          iconColor="slate"
        />
      </AdminStatGrid>

      {/* Filters & Search */}
      <div className="space-y-4">
        <UserListToolbar
          filters={filters}
          searchValue={searchInput}
          onSearchChange={handleSearchChange}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
        />

        {/* User List */}
        {isRefreshing ? (
          <UserListTableSkeleton rows={6} />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            title={hasActiveFilters ? t('noUsers.titleWithFilters') : t('noUsers.title')}
            description={
              hasActiveFilters
                ? t('noUsers.descriptionWithFilters')
                : t('noUsers.description')
            }
            action={
              !hasActiveFilters && canInviteUser
                ? { label: t('actions.inviteUser'), onClick: () => setInviteOpen(true) }
                : undefined
            }
            secondaryAction={
              hasActiveFilters ? { label: t('actions.clearFilters'), onClick: handleClearFilters } : undefined
            }
          />
        ) : (
          <UserListTable
            users={filteredUsers}
            canEdit={canEditUser}
            canDelete={canDeleteUser}
            onSelectUser={handleSelectUser}
            onStatusChange={canEditUser ? handleStatusChange : undefined}
            onRemove={canDeleteUser ? handleRemove : undefined}
          />
        )}
      </div>

      {/* Invite Dialog */}
      <UserInviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvite={handleInviteSubmit}
      />

      {/* Create User Dialog */}
      <UserCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleCreateSuccess}
      />

      {/* User Detail Drawer */}
      <UserDetailDrawer
        user={selectedUser}
        open={drawerOpen}
        onOpenChange={handleDrawerClose}
        canEdit={canEditUser}
        canDelete={canDeleteUser}
        onStatusChange={canEditUser ? handleStatusChange : undefined}
        onRemove={canDeleteUser ? handleRemove : undefined}
        onRefresh={handleRefresh}
      />
    </AdminPageLayout>
  );
}
