'use client';

import { ChangeEvent } from "react";
import { Input, Select, Button, Card, CardContent } from "@/components/ui";
import { AchievementFilters, AchievementItem, AchievementTheme } from "../types";
import { AchievementCard } from "./AchievementCard";

type AchievementListProps = {
  achievements: AchievementItem[];
  themes: Record<string, AchievementTheme>;
  filters: AchievementFilters;
  onFiltersChange: (next: AchievementFilters) => void;
  onEdit: (item: AchievementItem) => void;
  onCreate: () => void;
};

export function AchievementList({ achievements, themes, filters, onFiltersChange, onEdit, onCreate }: AchievementListProps) {
  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, search: event.target.value });
  };

  const handleTheme = (event: ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...filters, theme: event.target.value as AchievementFilters["theme"] });
  };

  const handleSort = (event: ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...filters, sort: event.target.value as AchievementFilters["sort"] });
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px]">
          <Input
            value={filters.search}
            onChange={handleSearch}
            placeholder="Search achievements"
            aria-label="Search achievements"
          />
        </div>
        <Select
          aria-label="Filter by theme"
          value={filters.theme}
          onChange={handleTheme}
          options={[
            { value: "all", label: "All themes" },
            ...Object.entries(themes).map(([id, theme]) => ({ value: id, label: theme.name })),
          ]}
        />
        <Select
          aria-label="Sort achievements"
          value={filters.sort}
          onChange={handleSort}
          options={[
            { value: "recent", label: "Most rewarding" },
            { value: "name", label: "Name A-Z" },
          ]}
        />
        <Button size="sm" onClick={onCreate}>
          + Create
        </Button>
      </div>

      {achievements.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="p-6 text-sm text-muted-foreground">No achievements match your filters.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {achievements.map((achievement) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              theme={achievement.icon.themeId ? themes[achievement.icon.themeId] : undefined}
              onEdit={() => onEdit(achievement)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
