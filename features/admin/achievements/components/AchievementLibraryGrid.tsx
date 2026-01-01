'use client';

import type { ChangeEvent } from "react";
import { MagnifyingGlassIcon, FunnelIcon, PlusIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui";
import type { AchievementFilters, AchievementItem, AchievementTheme } from "../types";
import { AchievementLibraryCard } from "./AchievementLibraryCard";

type AchievementLibraryGridProps = {
  achievements: AchievementItem[];
  themes: Record<string, AchievementTheme>;
  filters: AchievementFilters;
  onFiltersChange: (next: AchievementFilters) => void;
  onEdit: (item: AchievementItem) => void;
  onCreate: () => void;
  selectedId?: string;
};

export function AchievementLibraryGrid({ 
  achievements, 
  themes, 
  filters, 
  onFiltersChange, 
  onEdit, 
  onCreate,
  selectedId 
}: AchievementLibraryGridProps) {
  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, search: event.target.value });
  };

  const handleTheme = (event: ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...filters, theme: event.target.value as AchievementFilters["theme"] });
  };

  const handleSort = (event: ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...filters, sort: event.target.value as AchievementFilters["sort"] });
  };

  const handleStatus = (event: ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...filters, status: event.target.value as AchievementFilters["status"] });
  };

  return (
    <div>
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border/40 bg-muted/20 px-5 py-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={filters.search}
            onChange={handleSearch}
            placeholder="Search achievements..."
            className="w-full rounded-lg border border-border/60 bg-background pl-9 pr-3 py-2 text-sm 
                       placeholder:text-muted-foreground/60 transition-colors
                       focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Search achievements"
          />
        </div>

        {/* Theme Filter */}
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-4 w-4 text-muted-foreground" />
          <select
            aria-label="Filter by theme"
            value={filters.theme}
            onChange={handleTheme}
            className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm 
                       cursor-pointer transition-colors hover:border-primary/40
                       focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All themes</option>
            {Object.entries(themes).map(([id, theme]) => (
              <option key={id} value={id}>{theme.name}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <select
          aria-label="Filter by status"
          value={filters.status}
          onChange={handleStatus}
          className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm 
                     cursor-pointer transition-colors hover:border-primary/40
                     focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>

        {/* Sort */}
        <select
          aria-label="Sort achievements"
          value={filters.sort}
          onChange={handleSort}
          className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm 
                     cursor-pointer transition-colors hover:border-primary/40
                     focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="recent">Most rewarding</option>
          <option value="name">Name A-Z</option>
        </select>

        {/* Create Button */}
        <Button size="sm" onClick={onCreate} className="gap-1.5 ml-auto">
          <PlusIcon className="h-4 w-4" />
          Create
        </Button>
      </div>

      {/* Grid or Empty State */}
      {achievements.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
            <MagnifyingGlassIcon className="h-7 w-7" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No achievements found</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            {filters.search || filters.theme !== 'all' || filters.status !== 'all'
              ? "Try adjusting your search or filter criteria."
              : "Create your first achievement badge to get started."}
          </p>
          {(!filters.search && filters.theme === 'all' && filters.status === 'all') && (
            <Button onClick={onCreate} variant="outline" size="sm" className="mt-4 gap-1.5">
              <PlusIcon className="h-4 w-4" />
              Create first badge
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {achievements.map((achievement) => (
            <AchievementLibraryCard
              key={achievement.id}
              achievement={achievement}
              theme={achievement.icon.themeId ? themes[achievement.icon.themeId] : undefined}
              onEdit={() => onEdit(achievement)}
              isSelected={selectedId === achievement.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
