'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  FunnelIcon,
  BookmarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type {
  GameAdminFilters,
  ClassificationFilters,
  PlayExecutionFilters,
  LifecycleFilters,
  OwnershipFilters,
  TechnicalFilters,
  FilterPreset,
  SelectOption,
  PlayMode,
  ValidationState,
} from '../types';
import { PLAY_MODE_META } from '../types';

// ============================================================================
// FILTER CHIP COMPONENT
// ============================================================================

type FilterChipProps = {
  label: string;
  value?: string;
  onRemove: () => void;
  removeAriaLabel?: string;
};

function FilterChip({ label, value, onRemove, removeAriaLabel }: FilterChipProps) {
  return (
    <Badge variant="secondary" className="flex items-center gap-1 pr-1">
      <span className="text-xs">
        {label}
        {value && <>: <strong>{value}</strong></>}
      </span>
      <button
        onClick={onRemove}
        className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
        aria-label={removeAriaLabel}
      >
        <XMarkIcon className="h-3 w-3" />
      </button>
    </Badge>
  );
}

// ============================================================================
// FILTER GROUP COMPONENTS
// ============================================================================

type FilterGroupProps = {
  title: string;
  icon?: React.ReactNode;
  expanded?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
  activeCount?: number;
};

function FilterGroup({ title, icon, expanded = true, onToggle, children, activeCount = 0 }: FilterGroupProps) {
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{title}</span>
          {activeCount > 0 && (
            <Badge variant="default" className="ml-1 h-5 min-w-5 px-1.5">
              {activeCount}
            </Badge>
          )}
        </div>
        {expanded ? (
          <ChevronUpIcon className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {expanded && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

// ============================================================================
// MULTI-SELECT COMPONENT
// ============================================================================

type MultiSelectProps = {
  label: string;
  options: SelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
};

function MultiSelect({ label, options, selected, onChange, placeholder }: MultiSelectProps) {
  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const selectedLabels = options
    .filter(o => selected.includes(o.value))
    .map(o => o.label);

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between font-normal">
            <span className="truncate">
              {selectedLabels.length > 0 
                ? selectedLabels.join(', ') 
                : placeholder || 'Välj...'}
            </span>
            <ChevronDownIcon className="ml-2 h-4 w-4 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 max-h-64 overflow-y-auto">
          {options.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={(e) => {
                e.preventDefault();
                toggleOption(option.value);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => {}}
                className="h-4 w-4 rounded border-border"
              />
              <span>{option.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ============================================================================
// RANGE INPUT COMPONENT
// ============================================================================

type RangeInputProps = {
  label: string;
  minValue?: number;
  maxValue?: number;
  onMinChange: (value: number | undefined) => void;
  onMaxChange: (value: number | undefined) => void;
  minPlaceholder?: string;
  maxPlaceholder?: string;
};

function RangeInput({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  minPlaceholder = 'Min',
  maxPlaceholder = 'Max',
}: RangeInputProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={minValue ?? ''}
          onChange={(e) => onMinChange(e.target.value ? Number(e.target.value) : undefined)}
          placeholder={minPlaceholder}
          className="h-8 text-sm"
        />
        <span className="text-muted-foreground">–</span>
        <Input
          type="number"
          value={maxValue ?? ''}
          onChange={(e) => onMaxChange(e.target.value ? Number(e.target.value) : undefined)}
          placeholder={maxPlaceholder}
          className="h-8 text-sm"
        />
      </div>
    </div>
  );
}

// ============================================================================
// MAIN FILTER PANEL COMPONENT
// ============================================================================

type GameFilterPanelProps = {
  filters: GameAdminFilters;
  onChange: (filters: GameAdminFilters) => void;
  purposes: SelectOption[];
  tenants: SelectOption[];
  products: SelectOption[];
  presets?: FilterPreset[];
  onSavePreset?: (name: string) => void;
  onLoadPreset?: (preset: FilterPreset) => void;
  className?: string;
};

export function GameFilterPanel({
  filters,
  onChange,
  purposes,
  tenants,
  products: _products,
  presets = [],
  onSavePreset,
  onLoadPreset,
  className = '',
}: GameFilterPanelProps) {
  const t = useTranslations('admin.games.filters');
  
  const PLAY_MODE_OPTIONS: SelectOption[] = Object.values(PLAY_MODE_META).map(m => ({
    value: m.key,
    label: m.label,
  }));

  const STATUS_OPTIONS: SelectOption[] = [
    { value: 'published', label: t('status.published') },
    { value: 'draft', label: t('status.draft') },
  ];

  const ENERGY_OPTIONS: SelectOption[] = [
    { value: 'low', label: t('energy.low') },
    { value: 'medium', label: t('energy.medium') },
    { value: 'high', label: t('energy.high') },
  ];

  const LOCATION_OPTIONS: SelectOption[] = [
    { value: 'indoor', label: t('location.indoor') },
    { value: 'outdoor', label: t('location.outdoor') },
    { value: 'both', label: t('location.both') },
  ];

  const VALIDATION_OPTIONS: SelectOption[] = [
    { value: 'valid', label: t('validation.valid') },
    { value: 'warnings', label: t('validation.warnings') },
    { value: 'errors', label: t('validation.errors') },
    { value: 'pending', label: t('validation.pending') },
  ];

  const OWNER_SOURCE_OPTIONS: SelectOption[] = [
    { value: 'system', label: t('ownerSource.system') },
    { value: 'imported', label: t('ownerSource.imported') },
    { value: 'tenant', label: t('ownerSource.tenant') },
    { value: 'ai_generated', label: t('ownerSource.ai_generated') },
  ];

  const CONTENT_VERSION_OPTIONS: SelectOption[] = [
    { value: 'v1', label: t('contentVersion.v1') },
    { value: 'v2', label: t('contentVersion.v2') },
  ];

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    classification: true,
    playExecution: false,
    lifecycle: true,
    ownership: false,
    technical: false,
  });

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  // Count active filters in each group
  const classificationCount = useMemo(() => {
    const c = filters.classification;
    if (!c) return 0;
    let count = 0;
    if (c.mainPurposes?.length) count++;
    if (c.subPurposes?.length) count++;
    if (c.ageMin !== undefined || c.ageMax !== undefined) count++;
    if (c.durationMin !== undefined || c.durationMax !== undefined) count++;
    return count;
  }, [filters.classification]);

  const playExecutionCount = useMemo(() => {
    const p = filters.playExecution;
    if (!p) return 0;
    let count = 0;
    if (p.playModes?.length) count++;
    if (p.minPlayers !== undefined || p.maxPlayers !== undefined) count++;
    if (p.locationType?.length) count++;
    if (p.energyLevels?.length) count++;
    return count;
  }, [filters.playExecution]);

  const lifecycleCount = useMemo(() => {
    const l = filters.lifecycle;
    if (!l) return 0;
    let count = 0;
    if (l.statuses?.length) count++;
    if (l.validationStates?.length) count++;
    if (l.hasAssets !== undefined) count++;
    return count;
  }, [filters.lifecycle]);

  const ownershipCount = useMemo(() => {
    const o = filters.ownership;
    if (!o) return 0;
    let count = 0;
    if (o.tenantIds?.length) count++;
    if (o.isGlobal !== undefined) count++;
    if (o.ownerSources?.length) count++;
    return count;
  }, [filters.ownership]);

  const technicalCount = useMemo(() => {
    const t = filters.technical;
    if (!t) return 0;
    let count = 0;
    if (t.gameContentVersions?.length) count++;
    if (t.hasValidationErrors !== undefined) count++;
    return count;
  }, [filters.technical]);

  const totalActiveFilters = classificationCount + playExecutionCount + lifecycleCount + ownershipCount + technicalCount;

  // Update helpers
  const updateClassification = useCallback((update: Partial<ClassificationFilters>) => {
    onChange({
      ...filters,
      classification: { ...filters.classification, ...update },
    });
  }, [filters, onChange]);

  const updatePlayExecution = useCallback((update: Partial<PlayExecutionFilters>) => {
    onChange({
      ...filters,
      playExecution: { ...filters.playExecution, ...update },
    });
  }, [filters, onChange]);

  const updateLifecycle = useCallback((update: Partial<LifecycleFilters>) => {
    onChange({
      ...filters,
      lifecycle: { ...filters.lifecycle, ...update },
    });
  }, [filters, onChange]);

  const updateOwnership = useCallback((update: Partial<OwnershipFilters>) => {
    onChange({
      ...filters,
      ownership: { ...filters.ownership, ...update },
    });
  }, [filters, onChange]);

  const updateTechnical = useCallback((update: Partial<TechnicalFilters>) => {
    onChange({
      ...filters,
      technical: { ...filters.technical, ...update },
    });
  }, [filters, onChange]);

  const clearAllFilters = useCallback(() => {
    onChange({
      search: filters.search,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      page: 1,
      pageSize: filters.pageSize,
    });
  }, [filters, onChange]);

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FunnelIcon className="h-4 w-4" />
            Filter
            {totalActiveFilters > 0 && (
              <Badge variant="default">{totalActiveFilters}</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {totalActiveFilters > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                Rensa alla
              </Button>
            )}
            {presets.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <BookmarkIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {presets.map((preset) => (
                    <DropdownMenuItem
                      key={preset.id}
                      onClick={() => onLoadPreset?.(preset)}
                    >
                      {preset.name}
                    </DropdownMenuItem>
                  ))}
                  {onSavePreset && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => {
                        const name = prompt(t('presets.promptName'));
                        if (name) onSavePreset(name);
                      }}>
                        {t('presets.saveCurrent')}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Classification Filters */}
        <FilterGroup
          title={t('groups.classification')}
          expanded={expandedGroups.classification}
          onToggle={() => toggleGroup('classification')}
          activeCount={classificationCount}
        >
          <MultiSelect
            label={t('purposes')}
            options={purposes}
            selected={filters.classification?.mainPurposes || []}
            onChange={(values) => updateClassification({ mainPurposes: values })}
            placeholder={t('purposes')}
          />
          <RangeInput
            label={t('age.label')}
            minValue={filters.classification?.ageMin}
            maxValue={filters.classification?.ageMax}
            onMinChange={(v) => updateClassification({ ageMin: v })}
            onMaxChange={(v) => updateClassification({ ageMax: v })}
            minPlaceholder={t('age.min')}
            maxPlaceholder={t('age.max')}
          />
          <RangeInput
            label={t('time.label')}
            minValue={filters.classification?.durationMin}
            maxValue={filters.classification?.durationMax}
            onMinChange={(v) => updateClassification({ durationMin: v })}
            onMaxChange={(v) => updateClassification({ durationMax: v })}
            minPlaceholder={t('time.min')}
            maxPlaceholder={t('time.max')}
          />
        </FilterGroup>

        {/* Play Execution Filters */}
        <FilterGroup
          title={t('groups.playExecution')}
          expanded={expandedGroups.playExecution}
          onToggle={() => toggleGroup('playExecution')}
          activeCount={playExecutionCount}
        >
          <MultiSelect
            label={t('playMode')}
            options={PLAY_MODE_OPTIONS}
            selected={filters.playExecution?.playModes || []}
            onChange={(values) => updatePlayExecution({ playModes: values as PlayMode[] })}
            placeholder={t('playMode')}
          />
          <RangeInput
            label={t('players.label')}
            minValue={filters.playExecution?.minPlayers}
            maxValue={filters.playExecution?.maxPlayers}
            onMinChange={(v) => updatePlayExecution({ minPlayers: v })}
            onMaxChange={(v) => updatePlayExecution({ maxPlayers: v })}
            minPlaceholder={t('players.min')}
            maxPlaceholder={t('players.max')}
          />
          <MultiSelect
            label={t('energy.label')}
            options={ENERGY_OPTIONS}
            selected={filters.playExecution?.energyLevels || []}
            onChange={(values) => updatePlayExecution({ energyLevels: values as ('low' | 'medium' | 'high')[] })}
            placeholder={t('energy.label')}
          />
          <MultiSelect
            label={t('location.label')}
            options={LOCATION_OPTIONS}
            selected={filters.playExecution?.locationType || []}
            onChange={(values) => updatePlayExecution({ locationType: values as ('indoor' | 'outdoor' | 'both')[] })}
            placeholder={t('location.label')}
          />
        </FilterGroup>

        {/* Lifecycle Filters */}
        <FilterGroup
          title={t('groups.lifecycle')}
          expanded={expandedGroups.lifecycle}
          onToggle={() => toggleGroup('lifecycle')}
          activeCount={lifecycleCount}
        >
          <MultiSelect
            label={t('status.label')}
            options={STATUS_OPTIONS}
            selected={filters.lifecycle?.statuses || []}
            onChange={(values) => updateLifecycle({ statuses: values as ('draft' | 'published')[] })}
            placeholder={t('status.label')}
          />
          <MultiSelect
            label={t('validation.label')}
            options={VALIDATION_OPTIONS}
            selected={filters.lifecycle?.validationStates || []}
            onChange={(values) => updateLifecycle({ validationStates: values as ValidationState[] })}
            placeholder={t('validation.label')}
          />
        </FilterGroup>

        {/* Ownership Filters */}
        <FilterGroup
          title={t('groups.ownership')}
          expanded={expandedGroups.ownership}
          onToggle={() => toggleGroup('ownership')}
          activeCount={ownershipCount}
        >
          <MultiSelect
            label={t('ownerSource.label')}
            options={OWNER_SOURCE_OPTIONS}
            selected={filters.ownership?.ownerSources || []}
            onChange={(values) => updateOwnership({ ownerSources: values as ('system' | 'imported' | 'tenant' | 'ai_generated')[] })}
            placeholder={t('ownerSource.label')}
          />
          <MultiSelect
            label={t('tenants')}
            options={[{ value: '__global__', label: t('global') }, ...tenants]}
            selected={
              filters.ownership?.isGlobal 
                ? ['__global__'] 
                : filters.ownership?.tenantIds || []
            }
            onChange={(values) => {
              if (values.includes('__global__')) {
                updateOwnership({ isGlobal: true, tenantIds: undefined });
              } else {
                updateOwnership({ isGlobal: undefined, tenantIds: values.length ? values : undefined });
              }
            }}
            placeholder={t('tenants')}
          />
        </FilterGroup>

        {/* Technical Filters */}
        <FilterGroup
          title={t('groups.technical')}
          expanded={expandedGroups.technical}
          onToggle={() => toggleGroup('technical')}
          activeCount={technicalCount}
        >
          <MultiSelect
            label={t('contentVersion.label')}
            options={CONTENT_VERSION_OPTIONS}
            selected={filters.technical?.gameContentVersions || []}
            onChange={(values) => updateTechnical({ gameContentVersions: values })}
            placeholder={t('contentVersion.label')}
          />
        </FilterGroup>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COMPACT FILTER BAR (for inline use)
// ============================================================================

type GameFilterBarProps = {
  filters: GameAdminFilters;
  onChange: (filters: GameAdminFilters) => void;
  onOpenFullPanel: () => void;
  totalActiveFilters: number;
};

export function GameFilterBar({
  filters,
  onChange,
  onOpenFullPanel,
  totalActiveFilters,
}: GameFilterBarProps) {
  const t = useTranslations('admin.games.filters');
  
  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; value?: string; onRemove: () => void; removeAriaLabel: string }> = [];

    // Lifecycle - Status
    if (filters.lifecycle?.statuses?.length) {
      chips.push({
        key: 'status',
        label: t('chips.status'),
        value: filters.lifecycle.statuses.join(', '),
        onRemove: () => onChange({
          ...filters,
          lifecycle: { ...filters.lifecycle, statuses: undefined },
        }),
        removeAriaLabel: t('removeFilter', { label: t('chips.status') }),
      });
    }

    // Play modes
    if (filters.playExecution?.playModes?.length) {
      const modeLabels = filters.playExecution.playModes.map(m => PLAY_MODE_META[m].labelShort);
      chips.push({
        key: 'playMode',
        label: t('chips.playMode'),
        value: modeLabels.join(', '),
        onRemove: () => onChange({
          ...filters,
          playExecution: { ...filters.playExecution, playModes: undefined },
        }),
        removeAriaLabel: t('removeFilter', { label: t('chips.playMode') }),
      });
    }

    // Ownership
    if (filters.ownership?.isGlobal) {
      chips.push({
        key: 'global',
        label: t('chips.global'),
        onRemove: () => onChange({
          ...filters,
          ownership: { ...filters.ownership, isGlobal: undefined },
        }),
        removeAriaLabel: t('removeFilter', { label: t('chips.global') }),
      });
    }

    return chips;
  }, [filters, onChange, t]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative flex-1 max-w-sm">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={filters.search || ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value, page: 1 })}
          placeholder={t('search')}
          className="pl-9"
        />
      </div>

      <Button variant="outline" size="sm" onClick={onOpenFullPanel}>
        <AdjustmentsHorizontalIcon className="mr-2 h-4 w-4" />
        {t('title')}
        {totalActiveFilters > 0 && (
          <Badge variant="default" className="ml-2">
            {totalActiveFilters}
          </Badge>
        )}
      </Button>

      {activeChips.map((chip) => (
        <FilterChip
          key={chip.key}
          label={chip.label}
          value={chip.value}
          onRemove={chip.onRemove}
          removeAriaLabel={chip.removeAriaLabel}
        />
      ))}
    </div>
  );
}
