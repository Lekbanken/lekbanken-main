'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import type {
  AtlasNodeGroup,
  AtlasMappedNode,
  InventoryUsageStatus,
  InventoryRiskLevel,
} from '../lib/inventory-types';

interface GroupedNodeListProps {
  groups: AtlasNodeGroup[];
  expandedGroupIds: Set<string>;
  selectedNodeId: string | null;
  onToggleGroup: (groupId: string) => void;
  onSelectNode: (nodeId: string) => void;
}

// Risk color mapping
const riskColors: Record<InventoryRiskLevel, string> = {
  critical: 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30',
};

// Usage status colors and icons
const usageConfig: Record<
  InventoryUsageStatus,
  { color: string; icon: typeof ExclamationTriangleIcon; label: string }
> = {
  unknown: {
    color: 'text-red-500',
    icon: QuestionMarkCircleIcon,
    label: 'Unknown - needs audit',
  },
  dormant_flagged: {
    color: 'text-orange-500',
    icon: ExclamationTriangleIcon,
    label: 'Dormant - flagged for review',
  },
  dead_orphan: {
    color: 'text-orange-400',
    icon: ExclamationTriangleIcon,
    label: 'Dead orphan',
  },
  legacy_deprecated: {
    color: 'text-yellow-500',
    icon: ExclamationTriangleIcon,
    label: 'Legacy deprecated',
  },
  reachable_but_off: {
    color: 'text-yellow-400',
    icon: ExclamationTriangleIcon,
    label: 'Reachable but off',
  },
  used_referenced: {
    color: 'text-green-500',
    icon: CheckCircleIcon,
    label: 'Used (referenced)',
  },
  used_runtime: {
    color: 'text-green-600',
    icon: CheckCircleIcon,
    label: 'Used (runtime verified)',
  },
};

function NodeRow({
  node,
  isSelected,
  onClick,
}: {
  node: AtlasMappedNode;
  isSelected: boolean;
  onClick: () => void;
}) {
  const UsageIcon = usageConfig[node.usage]?.icon || QuestionMarkCircleIcon;
  const usageColor = usageConfig[node.usage]?.color || 'text-muted-foreground';
  const riskStyle = riskColors[node.risk] || riskColors.low;

  return (
    <button
      data-node-id={node.id}
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-2 rounded-md transition-colors',
        'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50',
        'flex items-start gap-3',
        isSelected && 'bg-primary/10 ring-1 ring-primary/30'
      )}
    >
      <UsageIcon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', usageColor)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{node.name}</span>
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', riskStyle)}>
            {node.risk}
          </Badge>
        </div>
        {node.path && (
          <div className="text-xs text-muted-foreground truncate mt-0.5">{node.path}</div>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted-foreground">{node.type}</span>
          <span className="text-[10px] text-muted-foreground">•</span>
          <span className="text-[10px] text-muted-foreground">{node.exposure}</span>
          {node.confidence < 0.5 && (
            <>
              <span className="text-[10px] text-muted-foreground">•</span>
              <span className="text-[10px] text-orange-500">
                {Math.round(node.confidence * 100)}% confidence
              </span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

function GroupHeader({
  group,
  isExpanded,
  onToggle,
}: {
  group: AtlasNodeGroup;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const hasProblems = group.unknownCount > 0 || group.criticalCount > 0;

  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
        'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50',
        'text-left',
        hasProblems && 'bg-red-500/5'
      )}
    >
      {isExpanded ? (
        <ChevronDownIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      ) : (
        <ChevronRightIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{group.label}</span>
          <Badge variant="secondary" className="text-[10px]">
            {group.nodeCount}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {group.criticalCount > 0 && (
          <Badge variant="destructive" className="text-[10px]">
            {group.criticalCount} critical
          </Badge>
        )}
        {group.unknownCount > 0 && (
          <Badge variant="outline" className="text-[10px] border-orange-500/50 text-orange-600">
            {group.unknownCount} unknown
          </Badge>
        )}
      </div>
    </button>
  );
}

export function GroupedNodeList({
  groups,
  expandedGroupIds,
  selectedNodeId,
  onToggleGroup,
  onSelectNode,
}: GroupedNodeListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Calculate total stats
  const stats = useMemo(() => {
    let total = 0;
    let unknown = 0;
    let critical = 0;

    groups.forEach((group) => {
      total += group.nodeCount;
      unknown += group.unknownCount;
      critical += group.criticalCount;
    });

    return { total, unknown, critical };
  }, [groups]);

  // Flatten visible nodes for keyboard navigation
  const visibleNodes = useMemo(() => {
    const nodes: { id: string; groupId: string }[] = [];
    groups.forEach((group) => {
      if (expandedGroupIds.has(group.id)) {
        group.nodes.forEach((node) => {
          nodes.push({ id: node.id, groupId: group.id });
        });
      }
    });
    return nodes;
  }, [groups, expandedGroupIds]);

  // Get current index
  const currentIndex = useMemo(() => {
    if (!selectedNodeId) return -1;
    return visibleNodes.findIndex((n) => n.id === selectedNodeId);
  }, [selectedNodeId, visibleNodes]);

  // Keyboard navigation handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Only handle arrow keys when not in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        if (visibleNodes.length === 0) return;
        
        const nextIndex = currentIndex < visibleNodes.length - 1 ? currentIndex + 1 : 0;
        onSelectNode(visibleNodes[nextIndex].id);
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        if (visibleNodes.length === 0) return;
        
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : visibleNodes.length - 1;
        onSelectNode(visibleNodes[prevIndex].id);
      } else if (e.key === 'Enter' && selectedNodeId) {
        // Enter could be used for expand/collapse or other actions
        e.preventDefault();
      }
    },
    [currentIndex, visibleNodes, onSelectNode, selectedNodeId]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Scroll selected node into view
  useEffect(() => {
    if (selectedNodeId && containerRef.current) {
      const selectedElement = containerRef.current.querySelector(
        `[data-node-id="${selectedNodeId}"]`
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedNodeId]);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <QuestionMarkCircleIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-sm text-muted-foreground">No nodes match the current filters.</p>
        <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or search.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-2">
      {/* Summary header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
        <div className="text-sm">
          <span className="font-semibold">{stats.total}</span>
          <span className="text-muted-foreground"> nodes in </span>
          <span className="font-semibold">{groups.length}</span>
          <span className="text-muted-foreground"> groups</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {stats.unknown > 0 && (
            <span className="text-orange-500">
              <QuestionMarkCircleIcon className="inline h-3 w-3 mr-1" />
              {stats.unknown} unknown ({Math.round((stats.unknown / stats.total) * 100)}%)
            </span>
          )}
          {stats.critical > 0 && (
            <span className="text-red-500">
              <ExclamationTriangleIcon className="inline h-3 w-3 mr-1" />
              {stats.critical} critical
            </span>
          )}
          <span className="text-muted-foreground" title="Use ↑/↓ or j/k to navigate">
            ⌨️ ↑↓
          </span>
        </div>
      </div>

      {/* Groups */}
      <div className="space-y-1">
        {groups.map((group) => {
          const isExpanded = expandedGroupIds.has(group.id);

          return (
            <div key={group.id} className="border border-border rounded-lg overflow-hidden">
              <GroupHeader
                group={group}
                isExpanded={isExpanded}
                onToggle={() => onToggleGroup(group.id)}
              />

              {isExpanded && (
                <div className="border-t border-border bg-background/50">
                  <div className="max-h-[400px] overflow-y-auto">
                    {group.nodes.map((node) => (
                      <NodeRow
                        key={node.id}
                        node={node}
                        isSelected={node.id === selectedNodeId}
                        onClick={() => onSelectNode(node.id)}
                      />
                    ))}
                  </div>

                  {group.hasMore && (
                    <div className="px-3 py-2 border-t border-border bg-muted/20 text-center">
                      <span className="text-xs text-muted-foreground">
                        Showing {group.nodes.length} of {group.nodeCount} nodes.
                        Click to load all.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
