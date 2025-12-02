'use client';

import { ChangeEvent } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button, Input, Select } from "@/components/ui";
import { ProductFilters, ProductStatus, statusLabels } from "../types";

type ProductTableToolbarProps = {
  filters: ProductFilters;
  onFiltersChange: (next: Partial<ProductFilters>) => void;
  categories: string[];
  hasActiveFilters: boolean;
};

const statusOptions: { value: ProductStatus | "all"; label: string }[] = [
  { value: "all", label: "All status" },
  { value: "active", label: statusLabels.active },
  { value: "inactive", label: statusLabels.inactive },
];

const sortOptions = [
  { value: "recent", label: "Newest first" },
  { value: "name", label: "Name A-Z" },
  { value: "capabilities", label: "Most capabilities" },
];

export function ProductTableToolbar({
  filters,
  onFiltersChange,
  categories,
  hasActiveFilters,
}: ProductTableToolbarProps) {
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ search: event.target.value });
  };

  const handleStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ status: event.target.value as ProductStatus | "all" });
  };

  const handleCategoryChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ category: event.target.value as string | "all" });
  };

  const handleSortChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ sort: event.target.value as ProductFilters["sort"] });
  };

  const resetFilters = () => {
    onFiltersChange({ search: "", status: "all", category: "all", sort: "recent" });
  };

  const activeFilterCount = [
    filters.search !== "",
    filters.status !== "all",
    filters.category !== "all",
    filters.sort !== "recent",
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Search */}
      <div className="relative w-full sm:max-w-xs">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={handleSearchChange}
          placeholder="Search products..."
          className="pl-9"
          aria-label="Search products"
        />
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Status filter"
          value={filters.status}
          onChange={handleStatusChange}
          options={statusOptions}
          className="min-w-[120px]"
        />
        <Select
          aria-label="Category filter"
          value={filters.category}
          onChange={handleCategoryChange}
          options={[{ value: "all", label: "All categories" }, ...categories.map((c) => ({ value: c, label: c }))]}
          className="min-w-[140px]"
        />
        <Select
          aria-label="Sort products"
          value={filters.sort}
          onChange={handleSortChange}
          options={sortOptions}
          className="min-w-[140px]"
        />
        
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground hover:text-foreground">
            <XMarkIcon className="mr-1 h-4 w-4" />
            Clear
            {activeFilterCount > 0 && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {activeFilterCount}
              </span>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
