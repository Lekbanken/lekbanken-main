'use client';

import { ChangeEvent } from "react";
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { Button, Input, Select } from "@/components/ui";
import { UserFilters, UserRole, UserStatus, roleLabels, statusLabels } from "../types";

type UserTableToolbarProps = {
  filters: UserFilters;
  onFiltersChange: (filters: Partial<UserFilters>) => void;
  organisationOptions: string[];
  onInviteClick: () => void;
  hasActiveFilters: boolean;
};

const roleOptions: { value: UserRole | "all"; label: string }[] = [
  { value: "all", label: "All roles" },
  { value: "system_admin", label: roleLabels.system_admin },
  { value: "organisation_admin", label: roleLabels.organisation_admin },
  { value: "product_admin", label: roleLabels.product_admin },
  { value: "admin", label: roleLabels.admin },
  { value: "owner", label: roleLabels.owner },
  { value: "member", label: roleLabels.member },
  { value: "user", label: roleLabels.user },
  { value: "demo_user", label: roleLabels.demo_user },
];

const statusOptions: { value: UserStatus | "all"; label: string }[] = [
  { value: "all", label: "All status" },
  { value: "active", label: statusLabels.active },
  { value: "invited", label: statusLabels.invited },
  { value: "inactive", label: statusLabels.inactive },
];

const sortOptions = [
  { value: "recent", label: "Newest first" },
  { value: "name", label: "Name A–Z" },
  { value: "status", label: "By status" },
];

export function UserTableToolbar({
  filters,
  onFiltersChange,
  organisationOptions,
  onInviteClick,
  hasActiveFilters,
}: UserTableToolbarProps) {
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ search: event.target.value });
  };

  const handleRoleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ role: event.target.value as UserRole | "all" });
  };

  const handleStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ status: event.target.value as UserStatus | "all" });
  };

  const handleOrganisationChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ organisation: event.target.value as string | "all" });
  };

  const handleSortChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ sort: event.target.value as UserFilters["sort"] });
  };

  const handleResetFilters = () => {
    onFiltersChange({
      search: "",
      role: "all",
      status: "all",
      organisation: "all",
      sort: "recent",
    });
  };

  const activeFilterCount = [
    filters.role !== "all",
    filters.status !== "all",
    filters.organisation !== "all",
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-3 bg-muted/30 p-4 lg:flex-row lg:items-center lg:justify-between">
      {/* Search and Filters */}
      <div className="flex flex-1 flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative min-w-[240px] flex-1 lg:max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={filters.search}
            onChange={handleSearchChange}
            placeholder="Search users..."
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Search users"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Role filter"
            value={filters.role}
            onChange={handleRoleChange}
            options={roleOptions.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            placeholder="Role"
            className="w-auto min-w-[130px]"
          />
          <Select
            aria-label="Status filter"
            value={filters.status}
            onChange={handleStatusChange}
            options={statusOptions.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            placeholder="Status"
            className="w-auto min-w-[120px]"
          />
          {organisationOptions.length > 1 && (
            <Select
              aria-label="Organisation filter"
              value={filters.organisation}
              onChange={handleOrganisationChange}
              options={[
                { value: "all", label: "All orgs" },
                ...organisationOptions.map((name) => ({ value: name, label: name })),
              ]}
              placeholder="Organisation"
              className="w-auto min-w-[130px]"
            />
          )}
          <Select
            aria-label="Sort users"
            value={filters.sort}
            onChange={handleSortChange}
            options={sortOptions}
            placeholder="Sort"
            className="w-auto min-w-[130px]"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-muted-foreground">
            <XMarkIcon className="mr-1.5 h-4 w-4" />
            Clear{activeFilterCount > 0 && ` (${activeFilterCount})`}
          </Button>
        )}
        <Button size="sm" onClick={onInviteClick} className="gap-2">
          <UserPlusIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Invite user</span>
        </Button>
      </div>
    </div>
  );
}
