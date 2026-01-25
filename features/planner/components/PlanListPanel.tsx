"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanListItem } from "./PlanListItem";
import { Skeleton } from "@/components/ui/skeleton";
import type { PlannerPlan, PlannerStatus, PlannerVisibility } from "@/types/planner";

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
);

interface PlanListPanelProps {
  plans: PlannerPlan[];
  activePlanId: string | null;
  isLoading: boolean;
  onSelectPlan: (planId: string) => void;
  onCreatePlan: () => void;
  isCreating?: boolean;
}

type SortOption = "name-asc" | "name-desc" | "updated-desc" | "updated-asc";

const STATUS_BUTTONS: { value: PlannerStatus | "all"; labelKey: string }[] = [
  { value: "all", labelKey: "filters.all" },
  { value: "draft", labelKey: "filters.draft" },
  { value: "published", labelKey: "filters.published" },
  { value: "modified", labelKey: "filters.modified" },
  { value: "archived", labelKey: "filters.archived" },
];

const VISIBILITY_OPTIONS_KEYS = [
  { value: "all", labelKey: "filters.all" },
  { value: "private", labelKey: "filters.private" },
  { value: "tenant", labelKey: "filters.tenant" },
  { value: "public", labelKey: "filters.public" },
];

const SORT_OPTIONS_KEYS = [
  { value: "updated-desc", labelKey: "sort.newest" },
  { value: "updated-asc", labelKey: "sort.oldest" },
  { value: "name-asc", labelKey: "sort.aToZ" },
  { value: "name-desc", labelKey: "sort.zToA" },
];

export function PlanListPanel({
  plans,
  activePlanId,
  isLoading,
  onSelectPlan,
  onCreatePlan,
  isCreating = false,
}: PlanListPanelProps) {
  const t = useTranslations('planner');
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PlannerStatus | "all">("all");
  const [visibilityFilter, setVisibilityFilter] = useState<PlannerVisibility | "all">("all");
  const [sort, setSort] = useState<SortOption>("updated-desc");

  const filteredAndSortedPlans = useMemo(() => {
    let result = [...plans];

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (plan) =>
          plan.name.toLowerCase().includes(searchLower) ||
          plan.description?.toLowerCase().includes(searchLower)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((plan) => plan.status === statusFilter);
    }

    if (visibilityFilter !== "all") {
      result = result.filter((plan) => plan.visibility === visibilityFilter);
    }

    result.sort((a, b) => {
      switch (sort) {
        case "name-asc":
          return a.name.localeCompare(b.name, "sv");
        case "name-desc":
          return b.name.localeCompare(a.name, "sv");
        case "updated-desc":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case "updated-asc":
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [plans, search, statusFilter, visibilityFilter, sort]);

  return (
    <Card className="border-border/60 h-full flex flex-col">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle>{t('myPlans')}</CardTitle>
          <Button size="sm" variant="outline" className="gap-1" onClick={onCreatePlan} disabled={isCreating}>
            <PlusIcon />
            {t('newPlan')}
          </Button>
        </div>
        <Input
          placeholder={t('search.placeholder')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {STATUS_BUTTONS.map((button) => (
            <Button
              key={button.value}
              size="sm"
              variant={statusFilter === button.value ? "default" : "outline"}
              onClick={() => setStatusFilter(button.value)}
            >
              {t(button.labelKey)}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={visibilityFilter}
            onChange={(event) => setVisibilityFilter(event.target.value as PlannerVisibility | "all")}
            options={VISIBILITY_OPTIONS_KEYS.map(o => ({ value: o.value, label: t(o.labelKey) }))}
            className="h-8 text-xs flex-1"
          />
          <Select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortOption)}
            options={SORT_OPTIONS_KEYS.map(o => ({ value: o.value, label: t(o.labelKey) }))}
            className="h-8 text-xs w-[120px]"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 overflow-y-auto">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))
        ) : filteredAndSortedPlans.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {search || statusFilter !== "all" || visibilityFilter !== "all"
              ? t('noPlansByFilter')
              : t('noPlansYet')}
          </div>
        ) : (
          filteredAndSortedPlans.map((plan) => (
            <PlanListItem
              key={plan.id}
              plan={plan}
              isActive={plan.id === activePlanId}
              onClick={() => onSelectPlan(plan.id)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
