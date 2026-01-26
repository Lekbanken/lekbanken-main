'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { SandboxShell } from '@/app/sandbox/components/shell/SandboxShellV2';
import { useInventoryStore } from '@/app/sandbox/atlas/store/inventory-store';
import { useAnnotations } from '@/app/sandbox/atlas/hooks/useAnnotations';
import { GroupedNodeList } from '@/app/sandbox/atlas/components/GroupedNodeList';
import { AtlasInspectorV2 } from '@/app/sandbox/atlas/components/AtlasInspectorV2';
import { AtlasFindings } from '@/app/sandbox/atlas/components/AtlasFindings';
import { AtlasGraphCanvas } from '@/app/sandbox/atlas/components/AtlasGraphCanvas';
import { RiskDashboard } from '@/app/sandbox/atlas/components/RiskDashboard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
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
  CheckCircleIcon,
  ChartBarIcon,
  ShareIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import {
  ATLAS_VIEW_MODES,
  type AtlasViewMode,
  type InventoryDomain,
  type InventoryUsageStatus,
  type InventoryRiskLevel,
} from '@/app/sandbox/atlas/lib/inventory-types';
import type { AtlasEdge, AtlasSelection } from './types';

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

// Safety level options for filter
const SAFETY_OPTIONS: { id: 'safe' | 'partial' | 'not-safe'; label: string; color: string }[] = [
  { id: 'safe', label: 'Safe to refactor', color: 'text-green-600' },
  { id: 'partial', label: 'Partially reviewed', color: 'text-yellow-600' },
  { id: 'not-safe', label: 'Needs review', color: 'text-red-500' },
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
              isActive && 'bg-primary text-primary-foreground shadow-sm'
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
    toggleSafetyFilter,
    clearFilters,
  } = useInventoryStore();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const activeFilterCount =
    filters.domains.length +
    filters.usageStatuses.length +
    filters.riskLevels.length +
    filters.safetyLevels.length;

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

      {/* Safety level filter (Safe to refactor) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <CheckCircleIcon className="h-3.5 w-3.5 mr-1.5" />
            Safety
            {filters.safetyLevels.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                {filters.safetyLevels.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Filter by refactor safety</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {SAFETY_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.id}
              onClick={() => toggleSafetyFilter(option.id)}
              className={cn("flex items-center gap-2", option.color)}
            >
              <span className={cn(
                "h-3 w-3 rounded border",
                filters.safetyLevels.includes(option.id) 
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
    searchQuery,
    setFilters,
    loadInventory,
    toggleGroupExpanded,
    selectNode,
    computeImpact,
    clearImpactTrace,
  } = useInventoryStore();

  // Annotations for review state management (Sprint 2/3)
  const {
    getAnnotation,
    toggleReviewFlag,
    setCleanupStatus,
    setTranslationStatus,
    setOwner,
    setNotes,
    markAllReviewed,
    save: saveAnnotations,
    hasUnsavedChanges,
    lastSavedAt,
  } = useAnnotations();

  // Display mode: 'list' | 'graph' | 'risk' | 'findings'
  const [displayMode, setDisplayMode] = useState<'list' | 'graph' | 'risk' | 'findings'>('list');
  const [activeDomain, setActiveDomain] = useState<string | null>(null);

  // Convert mappedEdges to AtlasEdge format for inspector
  // Note: mappedEdges uses source/target, we need fromType/fromId/toType/toId
  const atlasEdges = useMemo<AtlasEdge[]>(() => {
    if (!inventoryData?.edges) return [];
    return inventoryData.edges.map(edge => ({
      fromType: (edge.from.split(':')[0] || 'component') as 'frame' | 'component' | 'table' | 'endpoint',
      fromId: edge.from,
      toType: (edge.to.split(':')[0] || 'component') as 'frame' | 'component' | 'table' | 'endpoint',
      toId: edge.to,
      relation: (edge.type || 'uses') as 'navigates' | 'reads' | 'writes' | 'uses' | 'calls' | 'emits',
    }));
  }, [inventoryData?.edges]);

  // Build node lookup for inspector
  const nodeLookup = useMemo(() => {
    const lookup: Record<string, any> = {};
    filteredNodes.forEach(node => {
      const key = `${node.type}:${node.id}`;
      lookup[key] = {
        ...node,
        type: node.type,
        name: node.name,
        route: node.path,
        fileRef: node.path,
      };
    });
    return lookup;
  }, [filteredNodes]);

  // Create selection object for inspector
  const selection = useMemo<AtlasSelection | null>(() => {
    if (!selectedNodeId || !selectedNode) return null;
    return {
      type: selectedNode.type as 'frame' | 'component' | 'table' | 'endpoint',
      id: selectedNodeId,
    };
  }, [selectedNodeId, selectedNode]);

  // Convert filteredNodes to xyflow format for graph view
  const graphNodes = useMemo(() => {
    return filteredNodes.slice(0, 200).map((node) => ({
      id: node.id,
      type: node.type, // Use inventory node type directly (route, component, db_table, etc.)
      label: node.name,
      subtitle: node.path,
    }));
  }, [filteredNodes]);

  // Convert edges for graph view (only edges between visible nodes)
  const graphEdges = useMemo(() => {
    const visibleNodeIds = new Set(graphNodes.map(n => n.id));
    return atlasEdges
      .filter(e => visibleNodeIds.has(e.fromId) && visibleNodeIds.has(e.toId))
      .map(e => ({
        source: e.fromId,
        target: e.toId,
        relation: e.relation,
      }));
  }, [atlasEdges, graphNodes]);

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
        <AtlasInspectorV2
          selection={selection}
          nodeLookup={nodeLookup}
          edges={atlasEdges}
          lastSystemSyncAt={lastLoadedAt}
          systemSyncSource="inventory.json"
          onSelectNode={(type, id) => selectNode(id)}
          getAnnotation={getAnnotation}
          onToggleReviewFlag={toggleReviewFlag}
          onSetCleanupStatus={setCleanupStatus}
          onSetTranslationStatus={setTranslationStatus}
          onSetOwner={setOwner}
          onSetNotes={setNotes}
          onMarkAllReviewed={markAllReviewed}
          onSave={saveAnnotations}
          hasUnsavedChanges={hasUnsavedChanges}
          lastSavedAt={lastSavedAt}
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
                variant={displayMode === 'graph' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={() => setDisplayMode('graph')}
              >
                <ShareIcon className="h-3.5 w-3.5 mr-1.5" />
                Graph
              </Button>
              <Button
                variant={displayMode === 'findings' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={() => setDisplayMode('findings')}
              >
                <ChartBarIcon className="h-3.5 w-3.5 mr-1.5" />
                Findings
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

          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-orange-600 border-orange-300">
                Unsaved changes
              </Badge>
            )}
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
        </div>

        {/* Summary bar with review progress */}
        <SummaryBar />

        {/* Filters (shown in list and graph mode) */}
        {(displayMode === 'list' || displayMode === 'graph') && <FilterToolbar />}

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

          {displayMode === 'graph' && (
            <div className="h-[600px] rounded-lg border bg-background overflow-hidden">
              <AtlasGraphCanvas
                nodes={graphNodes}
                edges={graphEdges}
                selection={selectedNodeId ? { id: selectedNodeId, type: selectedNode?.type || 'component' } : null}
                onSelectNode={(id, _type) => selectNode(id)}
                highlightNodeId={selectedNodeId}
              />
            </div>
          )}

          {displayMode === 'findings' && (
            <AtlasFindings
              nodes={inventoryData?.nodes ?? []}
              filteredNodes={filteredNodes as unknown as typeof inventoryData.nodes}
              getAnnotation={(nodeId) => {
                try {
                  return getAnnotation(nodeId);
                } catch {
                  return undefined;
                }
              }}
              onFilterByDomain={setActiveDomain}
              activeDomain={activeDomain}
              hasActiveFilters={
                filters.domains.length > 0 ||
                filters.usageStatuses.length > 0 ||
                filters.riskLevels.length > 0 ||
                filters.safetyLevels.length > 0 ||
                Boolean(searchQuery)
              }
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
