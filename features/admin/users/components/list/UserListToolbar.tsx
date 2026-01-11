"use client";

import type { ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button, Select } from "@/components/ui";
import type {
  UserListFilters,
  AdminUserStatus,
  AdminUserGlobalRole,
  AdminUserMembershipRole,
  UserListSort,
} from "../../types";

type UserListToolbarProps = {
  filters: UserListFilters;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onFiltersChange: (next: Partial<UserListFilters>) => void;
  onClearFilters: () => void;
};

export function UserListToolbar({
  filters,
  searchValue,
  onSearchChange,
  onFiltersChange,
  onClearFilters,
}: UserListToolbarProps) {
  const t = useTranslations('admin.users');

  const statusOptions: Array<{ value: AdminUserStatus | "all"; label: string }> = [
    { value: "all", label: t('filters.status.all') },
    { value: "active", label: t('filters.status.active') },
    { value: "inactive", label: t('filters.status.inactive') },
    { value: "invited", label: t('filters.status.invited') },
    { value: "pending", label: t('filters.status.pending') },
    { value: "disabled", label: t('filters.status.disabled') },
  ];

  const globalRoleOptions: Array<{ value: AdminUserGlobalRole | "all"; label: string }> = [
    { value: "all", label: t('filters.globalRole.all') },
    { value: "system_admin", label: t('filters.globalRole.system_admin') },
    { value: "superadmin", label: t('filters.globalRole.superadmin') },
    { value: "admin", label: t('filters.globalRole.admin') },
    { value: "member", label: t('filters.globalRole.member') },
    { value: "user", label: t('filters.globalRole.user') },
    { value: "none", label: t('filters.globalRole.none') },
  ];

  const membershipRoleOptions: Array<{ value: AdminUserMembershipRole | "all"; label: string }> = [
    { value: "all", label: t('filters.membershipRole.all') },
    { value: "owner", label: t('filters.membershipRole.owner') },
    { value: "admin", label: t('filters.membershipRole.admin') },
    { value: "editor", label: t('filters.membershipRole.editor') },
    { value: "member", label: t('filters.membershipRole.member') },
    { value: "viewer", label: t('filters.membershipRole.viewer') },
  ];

  const membershipPresenceOptions = [
    { value: "all", label: t('filters.membershipPresence.all') },
    { value: "has", label: t('filters.membershipPresence.has') },
    { value: "none", label: t('filters.membershipPresence.none') },
  ];

  const _primaryTenantOptions = [
    { value: "all", label: t('filters.primaryTenant.all') },
    { value: "has", label: t('filters.primaryTenant.has') },
    { value: "none", label: t('filters.primaryTenant.none') },
  ];

  const sortOptions: Array<{ value: UserListSort; label: string }> = [
    { value: "recent", label: t('filters.sort.recent') },
    { value: "name", label: t('filters.sort.name') },
    { value: "last_seen", label: t('filters.sort.last_seen') },
    { value: "memberships", label: t('filters.sort.memberships') },
  ];

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.target.value);
  };

  const handleStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ status: event.target.value as AdminUserStatus | "all" });
  };

  const handleGlobalRoleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ globalRole: event.target.value as AdminUserGlobalRole | "all" });
  };

  const handleMembershipRoleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ membershipRole: event.target.value as AdminUserMembershipRole | "all" });
  };

  const handleMembershipPresenceChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ membershipPresence: event.target.value as UserListFilters["membershipPresence"] });
  };

  const _handlePrimaryTenantChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ primaryTenant: event.target.value as UserListFilters["primaryTenant"] });
  };

  const handleSortChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ sort: event.target.value as UserListSort });
  };

  const activeFilterCount = [
    filters.status !== "all",
    filters.globalRole !== "all",
    filters.membershipRole !== "all",
    filters.membershipPresence !== "all",
    filters.primaryTenant !== "all",
  ].filter(Boolean).length;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Search and filters */}
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search input */}
          <div className="relative min-w-[240px] flex-1 lg:max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchValue}
              onChange={handleSearchChange}
              placeholder={t('filters.searchPlaceholder')}
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label={t('filters.searchAriaLabel')}
            />
          </div>

          {/* Filter dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <Select
              aria-label="Status"
              value={filters.status}
              onChange={handleStatusChange}
              options={statusOptions}
              placeholder="Status"
              className="w-auto min-w-[130px]"
            />
            <Select
              aria-label="Global roll"
              value={filters.globalRole}
              onChange={handleGlobalRoleChange}
              options={globalRoleOptions}
              placeholder="Global roll"
              className="w-auto min-w-[160px]"
            />
            <Select
              aria-label="Medlemsroll"
              value={filters.membershipRole}
              onChange={handleMembershipRoleChange}
              options={membershipRoleOptions}
              placeholder="Medlemsroll"
              className="w-auto min-w-[160px]"
            />
            <Select
              aria-label="Medlemskap"
              value={filters.membershipPresence}
              onChange={handleMembershipPresenceChange}
              options={membershipPresenceOptions}
              placeholder="Medlemskap"
              className="w-auto min-w-[150px]"
            />
          </div>
        </div>

        {/* Sort and clear */}
        <div className="flex items-center gap-2">
          <Select
            aria-label="Sortera"
            value={filters.sort}
            onChange={handleSortChange}
            options={sortOptions}
            placeholder="Sortera"
            className="w-auto min-w-[140px]"
          />
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <XMarkIcon className="mr-1 h-4 w-4" />
              {t('filters.clear', { count: activeFilterCount })}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
