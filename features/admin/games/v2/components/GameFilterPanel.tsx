'use client';

import { useState, useCallback, useMemo } from 'react';
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
};

function FilterChip({ label, value, onRemove }: FilterChipProps) {
  return (
    <Badge variant="secondary" className="flex items-center gap-1 pr-1">
      <span className="text-xs">
        {label}
        {value && <>: <strong>{value}</strong></>}
      </span>
      <button
        onClick={onRemove}
        className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
        aria-label={`Ta bort filter: ${label}`}
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

const PLAY_MODE_OPTIONS: SelectOption[] = Object.values(PLAY_MODE_META).map(m => ({
  value: m.key,
  label: m.label,
}));

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'published', label: 'Publicerad' },
  { value: 'draft', label: 'Utkast' },
];

const ENERGY_OPTIONS: SelectOption[] = [
  { value: 'low', label: 'Låg' },
  { value: 'medium', label: 'Medel' },
  { value: 'high', label: 'Hög' },
];

const LOCATION_OPTIONS: SelectOption[] = [
  { value: 'indoor', label: 'Inomhus' },
  { value: 'outdoor', label: 'Utomhus' },
  { value: 'both', label: 'Båda' },
];

const VALIDATION_OPTIONS: SelectOption[] = [
  { value: 'valid', label: 'Godkänd' },
  { value: 'warnings', label: 'Varningar' },
  { value: 'errors', label: 'Fel' },
  { value: 'pending', label: 'Väntar' },
];

const OWNER_SOURCE_OPTIONS: SelectOption[] = [
  { value: 'system', label: 'System' },
  { value: 'imported', label: 'Importerad' },
  { value: 'tenant', label: 'Tenant-skapad' },
  { value: 'ai_generated', label: 'AI-genererad' },
];

const CONTENT_VERSION_OPTIONS: SelectOption[] = [
  { value: 'v1', label: 'v1 (Legacy)' },
  { value: 'v2', label: 'v2 (Builder)' },
];

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
                        const name = prompt('Namn på filterpreset:');
                        if (name) onSavePreset(name);
                      }}>
                        Spara nuvarande filter...
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
          title="Klassificering"
          expanded={expandedGroups.classification}
          onToggle={() => toggleGroup('classification')}
          activeCount={classificationCount}
        >
          <MultiSelect
            label="Huvudsyfte"
            options={purposes}
            selected={filters.classification?.mainPurposes || []}
            onChange={(values) => updateClassification({ mainPurposes: values })}
            placeholder="Välj syften..."
          />
          <RangeInput
            label="Ålder"
            minValue={filters.classification?.ageMin}
            maxValue={filters.classification?.ageMax}
            onMinChange={(v) => updateClassification({ ageMin: v })}
            onMaxChange={(v) => updateClassification({ ageMax: v })}
          />
          <RangeInput
            label="Speltid (minuter)"
            minValue={filters.classification?.durationMin}
            maxValue={filters.classification?.durationMax}
            onMinChange={(v) => updateClassification({ durationMin: v })}
            onMaxChange={(v) => updateClassification({ durationMax: v })}
          />
        </FilterGroup>

        {/* Play Execution Filters */}
        <FilterGroup
          title="Spel & Utförande"
          expanded={expandedGroups.playExecution}
          onToggle={() => toggleGroup('playExecution')}
          activeCount={playExecutionCount}
        >
          <MultiSelect
            label="Spelläge"
            options={PLAY_MODE_OPTIONS}
            selected={filters.playExecution?.playModes || []}
            onChange={(values) => updatePlayExecution({ playModes: values as PlayMode[] })}
            placeholder="Välj spellägen..."
          />
          <RangeInput
            label="Antal spelare"
            minValue={filters.playExecution?.minPlayers}
            maxValue={filters.playExecution?.maxPlayers}
            onMinChange={(v) => updatePlayExecution({ minPlayers: v })}
            onMaxChange={(v) => updatePlayExecution({ maxPlayers: v })}
          />
          <MultiSelect
            label="Energinivå"
            options={ENERGY_OPTIONS}
            selected={filters.playExecution?.energyLevels || []}
            onChange={(values) => updatePlayExecution({ energyLevels: values as ('low' | 'medium' | 'high')[] })}
            placeholder="Välj energinivå..."
          />
          <MultiSelect
            label="Platstyp"
            options={LOCATION_OPTIONS}
            selected={filters.playExecution?.locationType || []}
            onChange={(values) => updatePlayExecution({ locationType: values as ('indoor' | 'outdoor' | 'both')[] })}
            placeholder="Välj platstyp..."
          />
        </FilterGroup>

        {/* Lifecycle Filters */}
        <FilterGroup
          title="Livscykel & Kvalitet"
          expanded={expandedGroups.lifecycle}
          onToggle={() => toggleGroup('lifecycle')}
          activeCount={lifecycleCount}
        >
          <MultiSelect
            label="Status"
            options={STATUS_OPTIONS}
            selected={filters.lifecycle?.statuses || []}
            onChange={(values) => updateLifecycle({ statuses: values as ('draft' | 'published')[] })}
            placeholder="Välj status..."
          />
          <MultiSelect
            label="Valideringsstatus"
            options={VALIDATION_OPTIONS}
            selected={filters.lifecycle?.validationStates || []}
            onChange={(values) => updateLifecycle({ validationStates: values as ValidationState[] })}
            placeholder="Välj valideringsstatus..."
          />
        </FilterGroup>

        {/* Ownership Filters */}
        <FilterGroup
          title="Ägarskap & Scope"
          expanded={expandedGroups.ownership}
          onToggle={() => toggleGroup('ownership')}
          activeCount={ownershipCount}
        >
          <MultiSelect
            label="Källa"
            options={OWNER_SOURCE_OPTIONS}
            selected={filters.ownership?.ownerSources || []}
            onChange={(values) => updateOwnership({ ownerSources: values as ('system' | 'imported' | 'tenant' | 'ai_generated')[] })}
            placeholder="Välj källa..."
          />
          <MultiSelect
            label="Tenant"
            options={[{ value: '__global__', label: 'Global' }, ...tenants]}
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
            placeholder="Välj ägare..."
          />
        </FilterGroup>

        {/* Technical Filters */}
        <FilterGroup
          title="Tekniska Filter"
          expanded={expandedGroups.technical}
          onToggle={() => toggleGroup('technical')}
          activeCount={technicalCount}
        >
          <MultiSelect
            label="Content Version"
            options={CONTENT_VERSION_OPTIONS}
            selected={filters.technical?.gameContentVersions || []}
            onChange={(values) => updateTechnical({ gameContentVersions: values })}
            placeholder="Välj version..."
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
  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; value?: string; onRemove: () => void }> = [];

    // Lifecycle - Status
    if (filters.lifecycle?.statuses?.length) {
      chips.push({
        key: 'status',
        label: 'Status',
        value: filters.lifecycle.statuses.join(', '),
        onRemove: () => onChange({
          ...filters,
          lifecycle: { ...filters.lifecycle, statuses: undefined },
        }),
      });
    }

    // Play modes
    if (filters.playExecution?.playModes?.length) {
      const modeLabels = filters.playExecution.playModes.map(m => PLAY_MODE_META[m].labelShort);
      chips.push({
        key: 'playMode',
        label: 'Spelläge',
        value: modeLabels.join(', '),
        onRemove: () => onChange({
          ...filters,
          playExecution: { ...filters.playExecution, playModes: undefined },
        }),
      });
    }

    // Ownership
    if (filters.ownership?.isGlobal) {
      chips.push({
        key: 'global',
        label: 'Global',
        onRemove: () => onChange({
          ...filters,
          ownership: { ...filters.ownership, isGlobal: undefined },
        }),
      });
    }

    return chips;
  }, [filters, onChange]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative flex-1 max-w-sm">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={filters.search || ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value, page: 1 })}
          placeholder="Sök på namn, syfte eller ID..."
          className="pl-9"
        />
      </div>

      <Button variant="outline" size="sm" onClick={onOpenFullPanel}>
        <AdjustmentsHorizontalIcon className="mr-2 h-4 w-4" />
        Filter
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
        />
      ))}
    </div>
  );
}
