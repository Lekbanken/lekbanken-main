/**
 * FilterSheetV2 Component
 *
 * Registry-driven filter modal with progressive disclosure.
 * Basic filters always visible, super filters shown based on
 * user capabilities and data coverage.
 */

'use client';

import { useMemo, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { BrowseFilters, FilterOptions, FilterDefinition } from '../types';
import type { VisibleFilterGroups } from '../hooks/useBrowseFilters';
import { FilterAccordion } from './FilterAccordion';

// =============================================================================
// TYPES
// =============================================================================

type FilterSheetV2Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: BrowseFilters;
  options: FilterOptions | null;
  visibleGroups: VisibleFilterGroups;
  hasSuperFilters: boolean;
  onApply: (filters: BrowseFilters) => void;
  onClearAll: () => void;
};

// =============================================================================
// CONSTANTS
// =============================================================================

const groupOptions = [
  { label: '2-6', value: 'small' as const, icon: '👥' },
  { label: '6-14', value: 'medium' as const, icon: '👥' },
  { label: '15+', value: 'large' as const, icon: '👥' },
];

const energyOptions = [
  { label: 'Låg', value: 'low' as const, icon: '🔋', color: 'text-emerald-600 dark:text-emerald-400' },
  { label: 'Medel', value: 'medium' as const, icon: '⚡', color: 'text-amber-600 dark:text-amber-400' },
  { label: 'Hög', value: 'high' as const, icon: '🔥', color: 'text-rose-600 dark:text-rose-400' },
];

const environmentOptions = [
  { label: 'Inne', value: 'indoor' as const, icon: '🏠' },
  { label: 'Ute', value: 'outdoor' as const, icon: '🌳' },
  { label: 'Både', value: 'both' as const, icon: '🔄' },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function FilterSheetV2({
  open,
  onOpenChange,
  filters,
  options,
  visibleGroups,
  hasSuperFilters,
  onApply,
  onClearAll,
}: FilterSheetV2Props) {
  const [localFilters, setLocalFilters] = useState<BrowseFilters>(filters);
  const t = useTranslations('browse');

  // Count active filters
  const activeCount = useMemo(() => {
    const {
      products,
      mainPurposes,
      subPurposes,
      groupSizes,
      energyLevels,
      environment,
      minPlayers,
      maxPlayers,
      minAge,
      maxAge,
      minTime,
      maxTime,
      showLiked,
      playMode,
      hasPhases,
      hasRoles,
      hasArtifacts,
      hasMaterials,
      categories,
      difficulty,
    } = localFilters;

    return (
      products.length +
      mainPurposes.length +
      subPurposes.length +
      groupSizes.length +
      energyLevels.length +
      (environment ? 1 : 0) +
      (minPlayers ? 1 : 0) +
      (maxPlayers ? 1 : 0) +
      (minAge ? 1 : 0) +
      (maxAge ? 1 : 0) +
      (minTime ? 1 : 0) +
      (maxTime ? 1 : 0) +
      (showLiked ? 1 : 0) +
      (playMode ? 1 : 0) +
      (hasPhases ? 1 : 0) +
      (hasRoles ? 1 : 0) +
      (hasArtifacts ? 1 : 0) +
      (hasMaterials ? 1 : 0) +
      (categories?.length ?? 0) +
      (difficulty ? 1 : 0)
    );
  }, [localFilters]);

  // Count active super filters per group
  const superGroupActiveCount = useCallback(
    (groupFilters: FilterDefinition[]): number => {
      return groupFilters.reduce((count, filter) => {
        const key = filter.key as keyof BrowseFilters;
        const value = localFilters[key];
        if (Array.isArray(value)) return count + value.length;
        if (typeof value === 'boolean') return count + (value ? 1 : 0);
        if (value !== null && value !== undefined) return count + 1;
        return count;
      }, 0);
    },
    [localFilters]
  );

  // Toggle array value
  const toggleValue = <T extends string>(key: keyof BrowseFilters, value: T) => {
    setLocalFilters((prev) => {
      const current = prev[key] as T[];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [key]: next };
    });
  };

  // Set any field
  const setField = <K extends keyof BrowseFilters>(key: K, value: BrowseFilters[K]) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Apply and close
  const handleApply = () => {
    onApply(localFilters);
    onOpenChange(false);
  };

  // Reset local state when closing without applying
  const handleOpenChange = (state: boolean) => {
    if (!state) {
      setLocalFilters(filters);
    }
    onOpenChange(state);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] w-full max-w-2xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border/40 px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
            </span>
            {t('filter.title')}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{t('filter.description')}</p>
        </DialogHeader>

        <div className="max-h-[calc(85vh-180px)] overflow-y-auto px-6 py-4">
          <div className="space-y-3">
          {/* ─────────────────────────────────────────────────────────────── */}
          {/* Show Liked Toggle (Personal filter) */}
          {/* ─────────────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">❤️</span>
              <div>
                <span className="font-medium">{t('filter.showLiked')}</span>
                <p className="text-xs text-muted-foreground">{t('filter.showLikedDescription')}</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={localFilters.showLiked ?? false}
              onClick={() => setField('showLiked', !localFilters.showLiked)}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                localFilters.showLiked ? 'bg-primary' : 'bg-input'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
                  localFilters.showLiked ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {/* ─────────────────────────────────────────────────────────────── */}
          {/* Basic Filters (always visible) */}
          {/* ─────────────────────────────────────────────────────────────── */}
          <BasicFilterSection
            title="Produkt"
            icon="📦"
            options={(options?.products ?? []).map((p) => ({ label: p.name ?? 'Okänd produkt', value: p.id }))}
            selected={localFilters.products}
            onToggle={(value) => toggleValue('products', value)}
            emptyLabel="Inga produkter tillgängliga"
          />
          <BasicFilterSection
            title="Syfte"
            icon="🎯"
            options={(options?.mainPurposes ?? []).map((p) => ({ label: p.name ?? 'Syfte', value: p.id }))}
            selected={localFilters.mainPurposes}
            onToggle={(value) => toggleValue('mainPurposes', value)}
            emptyLabel="Inga syften tillgängliga"
          />
          <BasicFilterSection
            title="Del-syfte"
            icon="📌"
            options={(options?.subPurposes ?? []).map((p) => ({ label: p.name ?? 'Del-syfte', value: p.id }))}
            selected={localFilters.subPurposes}
            onToggle={(value) => toggleValue('subPurposes', value)}
            emptyLabel="Inga del-syften tillgängliga"
          />
          <BasicFilterSection
            title="Gruppstorlek"
            icon="👥"
            options={groupOptions}
            selected={localFilters.groupSizes}
            onToggle={(value) => toggleValue('groupSizes', value)}
          />
          <BasicFilterSection
            title="Energi"
            icon="⚡"
            options={energyOptions}
            selected={localFilters.energyLevels}
            onToggle={(value) => toggleValue('energyLevels', value)}
            colorMode
          />
          <BasicFilterSection
            title={t('environment')}
            icon="🌍"
            options={environmentOptions}
            selected={localFilters.environment ? [localFilters.environment] : []}
            onToggle={(value) => setField('environment', localFilters.environment === value ? null : value)}
          />

          {/* Range filters */}
          <RangeFilterSection
            title={t('players')}
            icon="🎮"
            minValue={localFilters.minPlayers}
            maxValue={localFilters.maxPlayers}
            onMinChange={(value) => setField('minPlayers', value)}
            onMaxChange={(value) => setField('maxPlayers', value)}
            placeholder={t('count')}
          />
          <RangeFilterSection
            title="Tid (min)"
            icon="⏱️"
            minValue={localFilters.minTime}
            maxValue={localFilters.maxTime}
            onMinChange={(value) => setField('minTime', value)}
            onMaxChange={(value) => setField('maxTime', value)}
            placeholder="Minuter"
          />

          {/* ─────────────────────────────────────────────────────────────── */}
          {/* Super Filters (progressive disclosure) */}
          {/* ─────────────────────────────────────────────────────────────── */}
          {hasSuperFilters && (
            <div className="mt-6">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm font-semibold text-muted-foreground">{t('filter.super.title')}</span>
                <div className="h-px flex-1 bg-border/40" />
              </div>
              <div className="space-y-2">
                {visibleGroups.super.map((group) => (
                  <FilterAccordion
                    key={group.groupKey}
                    label={group.label}
                    icon={group.icon}
                    filters={group.filters}
                    currentFilters={localFilters}
                    onFilterChange={setField}
                    activeCount={superGroupActiveCount(group.filters)}
                  />
                ))}
              </div>
            </div>
          )}
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-3 border-t border-border/40 px-6 py-4 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={onClearAll} className="w-full border-primary/30 hover:bg-primary/5 sm:w-auto">
            {t('filter.clearAll')}
          </Button>
          <Button onClick={handleApply} className="w-full shadow-lg shadow-primary/25 sm:w-auto">
            {t('filter.apply')} {activeCount > 0 ? `(${activeCount})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// BASIC FILTER SECTION
// =============================================================================

type Option<T extends string> = { label: string; value: T; icon?: string; color?: string };

type BasicFilterSectionProps<T extends string> = {
  title: string;
  icon?: string;
  options: Option<T>[];
  selected: T[];
  onToggle: (value: T) => void;
  emptyLabel?: string;
  colorMode?: boolean;
};

function BasicFilterSection<T extends string>({
  title,
  icon,
  options,
  selected,
  onToggle,
  emptyLabel,
  colorMode,
}: BasicFilterSectionProps<T>) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/50 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon && <span className="text-base">{icon}</span>}
        {title}
      </h3>
      {options.length === 0 ? (
        <p className="text-sm italic text-primary/60">{emptyLabel || 'Inga alternativ'}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const active = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onToggle(option.value)}
                aria-pressed={active}
                className={cn(
                  'rounded-full px-3.5 py-2 text-sm font-medium transition-all active:scale-95',
                  active
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                    : 'bg-muted/80 text-foreground ring-1 ring-border/50 hover:bg-primary/10 hover:ring-primary/30',
                  colorMode && option.color && !active && option.color
                )}
              >
                {option.icon && <span className="mr-1">{option.icon}</span>}
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// RANGE FILTER SECTION
// =============================================================================

type RangeFilterSectionProps = {
  title: string;
  icon?: string;
  minValue: number | null;
  maxValue: number | null;
  onMinChange: (value: number | null) => void;
  onMaxChange: (value: number | null) => void;
  placeholder?: string;
};

function RangeFilterSection({
  title,
  icon,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  placeholder,
}: RangeFilterSectionProps) {
  const parseValue = (val: string) => {
    if (val === '') return null;
    const parsed = Number(val);
    return Number.isNaN(parsed) ? null : parsed;
  };

  return (
    <div className="rounded-xl border border-border/40 bg-card/50 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon && <span className="text-base">{icon}</span>}
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Min</label>
          <input
            type="number"
            inputMode="numeric"
            value={minValue ?? ''}
            onChange={(e) => onMinChange(parseValue(e.target.value))}
            placeholder={placeholder}
            className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Max</label>
          <input
            type="number"
            inputMode="numeric"
            value={maxValue ?? ''}
            onChange={(e) => onMaxChange(parseValue(e.target.value))}
            placeholder={placeholder}
            className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>
    </div>
  );
}
