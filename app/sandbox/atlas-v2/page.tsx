'use client';

import { useEffect, useRef, useState } from 'react';
import { SandboxShell } from '@/app/sandbox/components/shell/SandboxShellV2';
import { useInventoryStore } from '@/app/sandbox/atlas/store/inventory-store';
import { GroupedNodeList } from '@/app/sandbox/atlas/components/GroupedNodeList';
import { InventoryInspector } from '@/app/sandbox/atlas/components/InventoryInspector';
import { RiskDashboard } from '@/app/sandbox/atlas/components/RiskDashboard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowPathIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  Squares2X2Icon,
  CircleStackIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  QuestionMarkCircleIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import {
  ATLAS_VIEW_MODES,
  type AtlasViewMode,
  type InventoryDomain,
  type InventoryUsageStatus,
  type InventoryRiskLevel,
} from '@/app/sandbox/atlas/lib/inventory-types';

// Domain options for filter
const DOMAIN_OPTIONS: { id: InventoryDomain; label: string }[] = [
  { id: 'admin', label: 'Admin' },
  { id: 'app', label: 'App' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'sandbox', label: 'Sandbox' },
  { id: 'demo', label: 'Demo' },
  { id: 'shared', label: 'Shared' },
  { id: 'db', label: 'Database' },
];

// Usage status options for filter
const USAGE_OPTIONS: { id: InventoryUsageStatus; label: string; color: string }[] = [
  { id: 'unknown', label: 'Unknown', color: 'text-red-500' },
  { id: 'dormant_flagged', label: 'Dormant', color: 'text-orange-500' },
  { id: 'dead_orphan', label: 'Dead orphan', color: 'text-orange-400' },
  { id: 'legacy_deprecated', label: 'Deprecated', color: 'text-yellow-500' },
  { id: 'reachable_but_off', label: 'Reachable (off)', color: 'text-yellow-400' },
  { id: 'used_referenced', label: 'Used (ref)', color: 'text-green-500' },
  { id: 'used_runtime', label: 'Used (runtime)', color: 'text-green-600' },
];

// Risk level options for filter
const RISK_OPTIONS: { id: InventoryRiskLevel; label: string; color: string }[] = [
  { id: 'critical', label: 'Critical', color: 'text-red-500' },
  { id: 'high', label: 'High', color: 'text-orange-500' },
  { id: 'medium', label: 'Medium', color: 'text-yellow-500' },
  { id: 'low', label: 'Low', color: 'text-green-500' },
];

// View mode icons
const VIEW_MODE_ICONS: Record<AtlasViewMode, typeof EyeIcon> = {
  surface: Squares2X2Icon,
  system: EyeIcon,
  data: CircleStackIcon,
  risk: ExclamationTriangleIcon,
};

function ViewModeSelector({
  currentMode,
  onChange,
}: {
  currentMode: AtlasViewMode;
  onChange: (mode: AtlasViewMode) => void;
}) {
  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
      {ATLAS_VIEW_MODES.map((mode) => {
        const Icon = VIEW_MODE_ICONS[mode.id];
        const isActive = currentMode === mode.id;

        return (
          <Button
            key={mode.id}
            variant={isActive ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              'h-8 px-3 text-xs',
              isActive && 'bg-background shadow-sm'
            )}
            onClick={() => onChange(mode.id)}
            title={mode.description}
          >
            <Icon className="h-3.5 w-3.5 mr-1.5" />
            {mode.label}
          </Button>
        );
      })}
    </div>
  );
}

function FilterToolbar() {
  const {
    filters,
    searchQuery,
    setSearchQuery,
    toggleDomainFilter,
    toggleUsageFilter,
    toggleRiskFilter,
    clearFilters,
  } = useInventoryStore();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const activeFilterCount =
    filters.domains.length +
    filters.usageStatuses.length +
    filters.riskLevels.length;

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          type="text"
          placeholder="Search nodes... (press /)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => setSearchQuery('')}
          >
            <XMarkIcon className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Domain filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <FunnelIcon className="h-3.5 w-3.5 mr-1.5" />
            Domain
            {filters.domains.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                {filters.domains.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Filter by domain</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {DOMAIN_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.id}
              onClick={() => toggleDomainFilter(option.id)}
              className="flex items-center gap-2"
            >
              <span className={cn(
                "h-3 w-3 rounded border",
                filters.domains.includes(option.id) 
                  ? "bg-primary border-primary" 
                  : "border-muted-foreground"
              )} />
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Usage status filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <QuestionMarkCircleIcon className="h-3.5 w-3.5 mr-1.5" />
            Status
            {filters.usageStatuses.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                {filters.usageStatuses.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Filter by usage status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {USAGE_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.id}
              onClick={() => toggleUsageFilter(option.id)}
              className={cn("flex items-center gap-2", option.color)}
            >
              <span className={cn(
                "h-3 w-3 rounded border",
                filters.usageStatuses.includes(option.id) 
                  ? "bg-primary border-primary" 
                  : "border-muted-foreground"
              )} />
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Risk level filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <ExclamationTriangleIcon className="h-3.5 w-3.5 mr-1.5" />
            Risk
            {filters.riskLevels.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                {filters.riskLevels.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Filter by risk level</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {RISK_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.id}
              onClick={() => toggleRiskFilter(option.id)}
              className={cn("flex items-center gap-2", option.color)}
            >
              <span className={cn(
                "h-3 w-3 rounded border",
                filters.riskLevels.includes(option.id) 
                  ? "bg-primary border-primary" 
                  : "border-muted-foreground"
              )} />
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear filters */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-muted-foreground"
          onClick={clearFilters}
        >
          <XMarkIcon className="h-3.5 w-3.5 mr-1" />
          Clear ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}

function SummaryBar() {
  const { inventoryData, riskSummary, usageBreakdown } =
    useInventoryStore();

  if (!inventoryData) return null;

  const unknownCount = usageBreakdown['unknown'] || 0;
  const unknownPct = Math.round((unknownCount / inventoryData.metrics.nodeCount) * 100);

  return (
    <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg text-xs">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Total:</span>
        <span className="font-semibold">{inventoryData.metrics.nodeCount} nodes</span>
      </div>
      <div className="h-4 w-px bg-border" />
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Edges:</span>
        <span className="font-semibold">{inventoryData.metrics.edgeCount}</span>
      </div>
      <div className="h-4 w-px bg-border" />
      <div className="flex items-center gap-2">
        <QuestionMarkCircleIcon className="h-3 w-3 text-orange-500" />
        <span className="text-orange-500 font-medium">
          {unknownCount} unknown ({unknownPct}%)
        </span>
      </div>
      <div className="h-4 w-px bg-border" />
      <div className="flex items-center gap-2">
        <ExclamationTriangleIcon className="h-3 w-3 text-red-500" />
        <span className="text-red-500 font-medium">{riskSummary.critical} critical</span>
      </div>
      <div className="h-4 w-px bg-border" />
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Findings:</span>
        <span className="font-semibold">{inventoryData.findings.length}</span>
      </div>
    </div>
  );
}

export default function AtlasV2Page() {
  const {
    inventoryData,
    isLoading,
    loadError,
    lastLoadedAt,
    viewMode,
    setViewMode,
    nodeGroups,
    expandedGroupIds,
    selectedNodeId,
    selectedNode,
    selectedNodeEdges,
    impactTrace,
    recentNodes,
    relatedNodes,
    filteredNodes,
    riskSummary,
    filters,
    setFilters,
    loadInventory,
    toggleGroupExpanded,
    selectNode,
    computeImpact,
    clearImpactTrace,
  } = useInventoryStore();

  // Display mode: 'list' | 'risk'
  const [displayMode, setDisplayMode] = useState<'list' | 'risk'>('list');

  // Load inventory on mount
  useEffect(() => {
    if (!inventoryData && !isLoading) {
      loadInventory();
    }
  }, [inventoryData, isLoading, loadInventory]);

  // Loading state
  if (isLoading) {
    return (
      <SandboxShell
        moduleId="atlas-v2"
        title="Atlas Evolution"
        description="System graph visualization with inventory data"
        contentWidth="full"
      >
        <div className="flex flex-col items-center justify-center py-24">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">Loading inventory data...</p>
        </div>
      </SandboxShell>
    );
  }

  // Error state
  if (loadError) {
    return (
      <SandboxShell
        moduleId="atlas-v2"
        title="Atlas Evolution"
        description="System graph visualization with inventory data"
        contentWidth="full"
      >
        <div className="flex flex-col items-center justify-center py-24">
          <ExclamationCircleIcon className="h-8 w-8 text-destructive mb-4" />
          <p className="text-sm text-destructive mb-2">Failed to load inventory</p>
          <p className="text-xs text-muted-foreground mb-4">{loadError}</p>
          <Button variant="outline" size="sm" onClick={loadInventory}>
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </SandboxShell>
    );
  }

  // No data state
  if (!inventoryData) {
    return (
      <SandboxShell
        moduleId="atlas-v2"
        title="Atlas Evolution"
        description="System graph visualization with inventory data"
        contentWidth="full"
      >
        <div className="flex flex-col items-center justify-center py-24">
          <CircleStackIcon className="h-8 w-8 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground mb-4">No inventory data available</p>
          <Button variant="outline" size="sm" onClick={loadInventory}>
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Load inventory
          </Button>
        </div>
      </SandboxShell>
    );
  }

  return (
    <SandboxShell
      moduleId="atlas-v2"
      title="Atlas Evolution"
      description="Decision support for system understanding and safe refactoring"
      contentWidth="full"
      contextTitle="Node Inspector"
      contextContent={
        <InventoryInspector
          selectedNode={selectedNode}
          incomingEdges={selectedNodeEdges.incoming}
          outgoingEdges={selectedNodeEdges.outgoing}
          impactTrace={impactTrace}
          recentNodes={recentNodes}
          relatedNodes={relatedNodes}
          onSelectNode={selectNode}
          onComputeImpact={(direction) =>
            selectedNodeId && computeImpact(selectedNodeId, direction)
          }
          onClearImpact={clearImpactTrace}
          lastLoadedAt={lastLoadedAt}
        />
      }
    >
      <div className="space-y-4">
        {/* View mode selector + display mode toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ViewModeSelector currentMode={viewMode} onChange={setViewMode} />
            
            {/* Display mode toggle */}
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
              <Button
                variant={displayMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={() => setDisplayMode('list')}
              >
                <ListBulletIcon className="h-3.5 w-3.5 mr-1.5" />
                List
              </Button>
              <Button
                variant={displayMode === 'risk' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={() => setDisplayMode('risk')}
              >
                <ExclamationTriangleIcon className="h-3.5 w-3.5 mr-1.5" />
                Risk
              </Button>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadInventory}
            className="text-xs"
          >
            <ArrowPathIcon className="h-3.5 w-3.5 mr-1.5" />
            Reload
          </Button>
        </div>

        {/* Summary bar */}
        <SummaryBar />

        {/* Filters (hidden in risk mode) */}
        {displayMode !== 'risk' && <FilterToolbar />}

        {/* Main content based on display mode */}
        <div className="min-h-[500px]">
          {displayMode === 'list' && (
            <GroupedNodeList
              groups={nodeGroups}
              expandedGroupIds={expandedGroupIds}
              selectedNodeId={selectedNodeId}
              onToggleGroup={toggleGroupExpanded}
              onSelectNode={selectNode}
            />
          )}

          {displayMode === 'risk' && (
            <RiskDashboard
              nodes={filteredNodes}
              risks={riskSummary}
              onSelectNode={(id) => {
                selectNode(id);
                setDisplayMode('list');
              }}
              onFilterByRisk={(risk) => {
                setFilters({ ...filters, riskLevels: [risk] });
                setDisplayMode('list');
              }}
            />
          )}
        </div>
      </div>
    </SandboxShell>
  );
}
