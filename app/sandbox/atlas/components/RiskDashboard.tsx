'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  ShieldExclamationIcon,
  CheckCircleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import type { AtlasMappedNode, AtlasRiskSummary } from '../lib/inventory-types';

// =============================================================================
// Types
// =============================================================================

interface RiskDashboardProps {
  nodes: AtlasMappedNode[];
  risks: AtlasRiskSummary;
  onSelectNode: (nodeId: string) => void;
  onFilterByRisk: (risk: 'critical' | 'high' | 'medium' | 'low') => void;
}

interface RiskCategory {
  level: 'critical' | 'high' | 'medium' | 'low';
  label: string;
  description: string;
  icon: typeof ExclamationCircleIcon;
  color: string;
  bgColor: string;
  borderColor: string;
}

// =============================================================================
// Constants
// =============================================================================

const RISK_CATEGORIES: RiskCategory[] = [
  {
    level: 'critical',
    label: 'Critical',
    description: 'Security exposure, data integrity risks',
    icon: ShieldExclamationIcon,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-900',
  },
  {
    level: 'high',
    label: 'High',
    description: 'Unknown usage, orphaned dependencies',
    icon: ExclamationCircleIcon,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-900',
  },
  {
    level: 'medium',
    label: 'Medium',
    description: 'Deprecated, needs review',
    icon: ExclamationTriangleIcon,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    borderColor: 'border-yellow-200 dark:border-yellow-900',
  },
  {
    level: 'low',
    label: 'Low',
    description: 'Healthy, well-understood',
    icon: CheckCircleIcon,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-900',
  },
];

// =============================================================================
// Helper Components
// =============================================================================

function RiskCard({
  category,
  count,
  total,
  topNodes,
  onViewAll,
  onSelectNode,
}: {
  category: RiskCategory;
  count: number;
  total: number;
  topNodes: AtlasMappedNode[];
  onViewAll: () => void;
  onSelectNode: (nodeId: string) => void;
}) {
  const Icon = category.icon;
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div
      className={cn(
        'rounded-lg border p-4 space-y-3',
        category.bgColor,
        category.borderColor
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-5 w-5', category.color)} />
          <span className={cn('font-semibold', category.color)}>
            {category.label}
          </span>
        </div>
        <Badge variant="outline" className={cn('text-xs', category.color)}>
          {count} ({percentage}%)
        </Badge>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground">{category.description}</p>

      {/* Progress bar */}
      <div className="h-1.5 bg-background rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', {
            'bg-red-500': category.level === 'critical',
            'bg-orange-500': category.level === 'high',
            'bg-yellow-500': category.level === 'medium',
            'bg-green-500': category.level === 'low',
          })}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Top nodes */}
      {topNodes.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Top items
          </div>
          {topNodes.slice(0, 3).map((node) => (
            <button
              key={node.id}
              onClick={() => onSelectNode(node.id)}
              className={cn(
                'w-full text-left text-xs p-2 rounded bg-background/60',
                'hover:bg-background transition-colors',
                'flex items-center justify-between gap-2'
              )}
            >
              <span className="truncate font-medium">{node.name}</span>
              <span className="text-muted-foreground text-[10px] shrink-0">
                {node.type}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* View all button */}
      {count > 3 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewAll}
          className={cn('w-full text-xs h-7', category.color)}
        >
          View all {count} items
          <ArrowRightIcon className="h-3 w-3 ml-1" />
        </Button>
      )}
    </div>
  );
}

function RiskHotspots({
  nodes,
  onSelectNode,
}: {
  nodes: AtlasMappedNode[];
  onSelectNode: (nodeId: string) => void;
}) {
  // Find nodes with highest dependency count (potential blast radius)
  const hotspots = useMemo(() => {
    // This would ideally use edge data to calculate actual dependency count
    // For now, we'll identify critical/high risk nodes as hotspots
    return nodes
      .filter((n) => n.risk === 'critical' || n.risk === 'high')
      .filter((n) => n.type === 'db_table' || n.type === 'api' || n.type === 'hook' || n.type === 'server_action')
      .slice(0, 5);
  }, [nodes]);

  if (hotspots.length === 0) return null;

  return (
    <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldExclamationIcon className="h-5 w-5 text-red-500" />
        <span className="font-semibold text-red-600 dark:text-red-400">
          Risk Hotspots
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        High-impact nodes that require careful handling when modifying
      </p>
      <div className="space-y-1.5">
        {hotspots.map((node) => (
          <button
            key={node.id}
            onClick={() => onSelectNode(node.id)}
            className={cn(
              'w-full text-left text-xs p-2 rounded bg-background',
              'hover:bg-muted transition-colors',
              'flex items-center justify-between gap-2'
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={cn('w-2 h-2 rounded-full shrink-0', {
                  'bg-red-500': node.risk === 'critical',
                  'bg-orange-500': node.risk === 'high',
                })}
              />
              <span className="truncate font-medium">{node.name}</span>
            </div>
            <Badge variant="outline" className="text-[10px] shrink-0">
              {node.type}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function RiskDashboard({
  nodes,
  risks,
  onSelectNode,
  onFilterByRisk,
}: RiskDashboardProps) {
  // Group nodes by risk level
  const nodesByRisk = useMemo(() => {
    const grouped: Record<string, AtlasMappedNode[]> = {
      critical: [],
      high: [],
      medium: [],
      low: [],
    };

    nodes.forEach((node) => {
      if (grouped[node.risk]) {
        grouped[node.risk].push(node);
      }
    });

    return grouped;
  }, [nodes]);

  const total = nodes.length;

  // Calculate overall risk score (0-100, higher = worse)
  const riskScore = useMemo(() => {
    if (total === 0) return 0;
    const weights = { critical: 100, high: 60, medium: 30, low: 0 };
    const weighted =
      risks.critical * weights.critical +
      risks.high * weights.high +
      risks.medium * weights.medium +
      risks.low * weights.low;
    return Math.round(weighted / total);
  }, [risks, total]);

  const riskLevel =
    riskScore >= 50 ? 'Critical' : riskScore >= 30 ? 'Elevated' : riskScore >= 15 ? 'Moderate' : 'Low';

  const riskColor =
    riskScore >= 50
      ? 'text-red-600 dark:text-red-400'
      : riskScore >= 30
        ? 'text-orange-600 dark:text-orange-400'
        : riskScore >= 15
          ? 'text-yellow-600 dark:text-yellow-400'
          : 'text-green-600 dark:text-green-400';

  return (
    <div className="space-y-6">
      {/* Overall risk score */}
      <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
        <div>
          <div className="text-sm text-muted-foreground">System Risk Score</div>
          <div className={cn('text-3xl font-bold', riskColor)}>{riskScore}</div>
          <div className={cn('text-sm font-medium', riskColor)}>{riskLevel}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Total Nodes</div>
          <div className="text-2xl font-semibold">{total.toLocaleString()}</div>
        </div>
      </div>

      {/* Risk hotspots */}
      <RiskHotspots nodes={nodes} onSelectNode={onSelectNode} />

      {/* Risk breakdown cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {RISK_CATEGORIES.map((category) => (
          <RiskCard
            key={category.level}
            category={category}
            count={risks[category.level]}
            total={total}
            topNodes={nodesByRisk[category.level] || []}
            onViewAll={() => onFilterByRisk(category.level)}
            onSelectNode={onSelectNode}
          />
        ))}
      </div>
    </div>
  );
}
