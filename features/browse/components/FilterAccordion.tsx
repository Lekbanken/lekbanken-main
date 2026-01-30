/**
 * FilterAccordion Component
 *
 * Collapsible accordion section for super filter groups.
 * Renders filter definitions dynamically from the registry.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { FilterDefinition, BrowseFilters } from '../types';

// =============================================================================
// TYPES
// =============================================================================

type FilterAccordionProps = {
  /** Group label i18n key or display text */
  label: string;
  /** Icon emoji for the group */
  icon: string;
  /** Whether the accordion is expanded by default */
  defaultOpen?: boolean;
  /** Filter definitions to render */
  filters: FilterDefinition[];
  /** Current filter values */
  currentFilters: BrowseFilters;
  /** Callback when a filter value changes */
  onFilterChange: <K extends keyof BrowseFilters>(key: K, value: BrowseFilters[K]) => void;
  /** Badge count for active filters in this group */
  activeCount?: number;
};

// =============================================================================
// COMPONENT
// =============================================================================

export function FilterAccordion({
  label,
  icon,
  defaultOpen = false,
  filters,
  currentFilters,
  onFilterChange,
  activeCount = 0,
}: FilterAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const t = useTranslations();

  // Try to translate the label, fall back to raw string
  const displayLabel = (() => {
    try {
      return t(label);
    } catch {
      return label;
    }
  })();

  if (filters.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/40 bg-card/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex w-full items-center justify-between p-4 text-left transition-colors',
          'hover:bg-muted/50',
          isOpen && 'border-b border-border/40'
        )}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-semibold text-foreground">{displayLabel}</span>
          {activeCount > 0 && (
            <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
              {activeCount}
            </span>
          )}
        </div>
        <svg
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="space-y-4 p-4">
          {filters.map((filter) => (
            <FilterRenderer
              key={filter.key}
              filter={filter}
              currentFilters={currentFilters}
              onFilterChange={onFilterChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// FILTER RENDERER
// =============================================================================

type FilterRendererProps = {
  filter: FilterDefinition;
  currentFilters: BrowseFilters;
  onFilterChange: <K extends keyof BrowseFilters>(key: K, value: BrowseFilters[K]) => void;
};

function FilterRenderer({ filter, currentFilters, onFilterChange }: FilterRendererProps) {
  const t = useTranslations();

  // Get the translated label
  const label = (() => {
    try {
      return t(filter.labelKey);
    } catch {
      return filter.key;
    }
  })();

  switch (filter.type) {
    case 'enum':
    case 'multi-select':
      return (
        <EnumFilter
          filter={filter}
          label={label}
          currentFilters={currentFilters}
          onFilterChange={onFilterChange}
        />
      );
    case 'range':
      return (
        <RangeFilter
          filter={filter}
          label={label}
          currentFilters={currentFilters}
          onFilterChange={onFilterChange}
        />
      );
    case 'boolean':
      return (
        <BooleanFilter
          filter={filter}
          label={label}
          currentFilters={currentFilters}
          onFilterChange={onFilterChange}
        />
      );
    default:
      return null;
  }
}

// =============================================================================
// ENUM FILTER
// =============================================================================

type EnumFilterProps = {
  filter: FilterDefinition;
  label: string;
  currentFilters: BrowseFilters;
  onFilterChange: <K extends keyof BrowseFilters>(key: K, value: BrowseFilters[K]) => void;
};

function EnumFilter({ filter, label, currentFilters, onFilterChange }: EnumFilterProps) {
  const t = useTranslations();
  const options = filter.options ?? [];
  const filterKey = filter.key as keyof BrowseFilters;
  const selected = (currentFilters[filterKey] as string[]) ?? [];

  const handleToggle = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    onFilterChange(filterKey, newSelected as BrowseFilters[typeof filterKey]);
  };

  return (
    <div>
      <h4 className="mb-2 text-xs font-medium text-muted-foreground">{label}</h4>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = selected.includes(option.value);
          const optionLabel = (() => {
            try {
              return t(option.labelKey);
            } catch {
              return option.value;
            }
          })();

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleToggle(option.value)}
              aria-pressed={isActive}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium transition-all active:scale-95',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                  : 'bg-muted/80 text-foreground ring-1 ring-border/50 hover:bg-primary/10 hover:ring-primary/30'
              )}
            >
              {option.icon && <span className="mr-1">{option.icon}</span>}
              {optionLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// RANGE FILTER
// =============================================================================

type RangeFilterProps = {
  filter: FilterDefinition;
  label: string;
  currentFilters: BrowseFilters;
  onFilterChange: <K extends keyof BrowseFilters>(key: K, value: BrowseFilters[K]) => void;
};

function RangeFilter({ filter, label, currentFilters, onFilterChange }: RangeFilterProps) {
  const t = useTranslations();
  const range = filter.range;

  if (!range) return null;

  const minKey = range.minKey as keyof BrowseFilters;
  const maxKey = range.maxKey as keyof BrowseFilters;
  const minValue = currentFilters[minKey] as number | null;
  const maxValue = currentFilters[maxKey] as number | null;

  const handleMinChange = (value: string) => {
    const parsed = value === '' ? null : Number(value);
    onFilterChange(minKey, (Number.isNaN(parsed) ? null : parsed) as BrowseFilters[typeof minKey]);
  };

  const handleMaxChange = (value: string) => {
    const parsed = value === '' ? null : Number(value);
    onFilterChange(maxKey, (Number.isNaN(parsed) ? null : parsed) as BrowseFilters[typeof maxKey]);
  };

  const unitLabel = range.unit
    ? (() => {
        try {
          return t(range.unit);
        } catch {
          return range.unit;
        }
      })()
    : '';

  return (
    <div>
      <h4 className="mb-2 text-xs font-medium text-muted-foreground">{label}</h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground/70">Min</label>
          <input
            type="number"
            inputMode="numeric"
            value={minValue ?? ''}
            onChange={(e) => handleMinChange(e.target.value)}
            placeholder={unitLabel}
            min={range.min}
            max={range.max}
            step={range.step}
            className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground/70">Max</label>
          <input
            type="number"
            inputMode="numeric"
            value={maxValue ?? ''}
            onChange={(e) => handleMaxChange(e.target.value)}
            placeholder={unitLabel}
            min={range.min}
            max={range.max}
            step={range.step}
            className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// BOOLEAN FILTER
// =============================================================================

type BooleanFilterProps = {
  filter: FilterDefinition;
  label: string;
  currentFilters: BrowseFilters;
  onFilterChange: <K extends keyof BrowseFilters>(key: K, value: BrowseFilters[K]) => void;
};

function BooleanFilter({ filter, label, currentFilters, onFilterChange }: BooleanFilterProps) {
  const filterKey = filter.key as keyof BrowseFilters;
  const value = currentFilters[filterKey] as boolean | null | undefined;

  const handleToggle = () => {
    onFilterChange(filterKey, !value as BrowseFilters[typeof filterKey]);
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value ?? false}
        onClick={handleToggle}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          value ? 'bg-primary' : 'bg-input'
        )}
      >
        <span
          className={cn(
            'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
            value ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
}
