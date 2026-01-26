'use client';

import { useCallback, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ShieldExclamationIcon,
  UsersIcon,
  QuestionMarkCircleIcon,
  ClipboardDocumentCheckIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import type { InventoryNode } from '../lib/inventory-types';
import type { Annotation } from '../lib/annotations-schema';

interface DomainStats {
  domain: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  unknownUsage: number;
  notReviewed: number;
  withoutOwner: number;
  cleaned: number;
}

interface AtlasFindingsProps {
  nodes: InventoryNode[];
  /** Optional: filtered subset of nodes for export */
  filteredNodes?: InventoryNode[];
  getAnnotation: (nodeId: string) => Annotation | undefined;
  onFilterByRisk?: (risk: string) => void;
  onFilterByDomain?: (domain: string) => void;
  activeDomain: string | null;
  /** Whether filters are currently active */
  hasActiveFilters?: boolean;
}

const RISK_ICONS: Record<string, React.ElementType> = {
  critical: ExclamationCircleIcon,
  high: ExclamationTriangleIcon,
  medium: InformationCircleIcon,
  low: CheckCircleIcon,
};

export function AtlasFindings({
  nodes,
  filteredNodes,
  getAnnotation,
  onFilterByRisk,
  onFilterByDomain,
  activeDomain,
  hasActiveFilters = false,
}: AtlasFindingsProps) {
  // State for export mode
  const [exportFiltered, setExportFiltered] = useState(true);
  
  // Export findings as CSV
  const handleExportCSV = useCallback(() => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const csvHeader = 'node_id,type,domain,risk,usage,cleanup_status,translation_status,owner,notes';
    
    // Use filtered nodes if export filtered is enabled and filters are active
    const nodesToExport = (exportFiltered && hasActiveFilters && filteredNodes) 
      ? filteredNodes 
      : nodes;
    
    const csvRows = nodesToExport.map((node) => {
      const annotation = getAnnotation(node.id);
      const escapeCSV = (str: string | undefined | null) => {
        if (!str) return '';
        // Escape quotes and wrap in quotes if contains comma or newline
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      
      return [
        escapeCSV(node.id),
        escapeCSV(node.type),
        escapeCSV(node.ownerDomain),
        escapeCSV(node.risk),
        escapeCSV(node.status?.usage),
        escapeCSV(annotation?.cleanup_status ?? 'not_started'),
        escapeCSV(annotation?.translation_status ?? 'n/a'),
        escapeCSV(annotation?.owner),
        escapeCSV(annotation?.notes),
      ].join(',');
    });
    
    const csvContent = [csvHeader, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filterSuffix = (exportFiltered && hasActiveFilters && filteredNodes) ? '-filtered' : '';
    link.download = `atlas-findings${filterSuffix}-${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [nodes, filteredNodes, getAnnotation, exportFiltered, hasActiveFilters]);

  // Calculate stats per domain
  const domainStats = useMemo(() => {
    const stats: Record<string, DomainStats> = {};

    for (const node of nodes) {
      const domain = node.ownerDomain ?? 'unknown';
      
      if (!stats[domain]) {
        stats[domain] = {
          domain,
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          unknownUsage: 0,
          notReviewed: 0,
          withoutOwner: 0,
          cleaned: 0,
        };
      }

      const s = stats[domain];
      s.total++;

      // Risk level (from inventory)
      const risk = node.risk ?? 'medium';
      if (risk === 'critical') s.critical++;
      else if (risk === 'high') s.high++;
      else if (risk === 'medium') s.medium++;
      else s.low++;

      // Usage (from status)
      if (node.status?.usage === 'unknown') s.unknownUsage++;

      // Annotations
      const annotation = getAnnotation(node.id);
      if (annotation) {
        const flags = Object.values(annotation.reviewFlags);
        const reviewedCount = flags.filter(Boolean).length;
        if (reviewedCount < flags.length) s.notReviewed++;
        if (!annotation.owner) s.withoutOwner++;
        if (annotation.cleanup_status === 'cleaned' || annotation.cleanup_status === 'locked') {
          s.cleaned++;
        }
      } else {
        // No annotation = not reviewed and no owner
        s.notReviewed++;
        s.withoutOwner++;
      }
    }

    return Object.values(stats).sort((a, b) => {
      // Sort by critical count (most critical first)
      if (a.critical !== b.critical) return b.critical - a.critical;
      if (a.high !== b.high) return b.high - a.high;
      return a.domain.localeCompare(b.domain);
    });
  }, [nodes, getAnnotation]);

  // Aggregate totals
  const totals = useMemo(() => {
    return domainStats.reduce(
      (acc, s) => ({
        total: acc.total + s.total,
        critical: acc.critical + s.critical,
        high: acc.high + s.high,
        medium: acc.medium + s.medium,
        low: acc.low + s.low,
        unknownUsage: acc.unknownUsage + s.unknownUsage,
        notReviewed: acc.notReviewed + s.notReviewed,
        withoutOwner: acc.withoutOwner + s.withoutOwner,
        cleaned: acc.cleaned + s.cleaned,
      }),
      {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        unknownUsage: 0,
        notReviewed: 0,
        withoutOwner: 0,
        cleaned: 0,
      }
    );
  }, [domainStats]);

  const reviewProgress = totals.total > 0 
    ? Math.round(((totals.total - totals.notReviewed) / totals.total) * 100)
    : 0;

  const cleanupProgress = totals.total > 0
    ? Math.round((totals.cleaned / totals.total) * 100)
    : 0;

  return (
    <div className="space-y-6 p-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Risk Summary */}
        <div className="rounded-lg border bg-card p-3">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Risk Levels</h3>
          <div className="space-y-1">
            {(['critical', 'high', 'medium', 'low'] as const).map((risk) => {
              const Icon = RISK_ICONS[risk];
              const count = totals[risk];
              return (
                <button
                  key={risk}
                  onClick={() => onFilterByRisk?.(risk)}
                  className="flex items-center justify-between w-full px-2 py-1 rounded hover:bg-muted/50 transition-colors"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <Icon className={`h-4 w-4 ${risk === 'critical' ? 'text-red-500' : risk === 'high' ? 'text-orange-500' : risk === 'medium' ? 'text-yellow-500' : 'text-green-500'}`} />
                    <span className="capitalize">{risk}</span>
                  </span>
                  <Badge variant={count > 0 ? 'destructive' : 'secondary'} className="text-xs">
                    {count}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>

        {/* Issues Summary */}
        <div className="rounded-lg border bg-card p-3">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Issues</h3>
          <div className="space-y-1">
            <button
              onClick={() => onFilterByRisk?.('unknown')}
              className="flex items-center justify-between w-full px-2 py-1 rounded hover:bg-muted/50 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm">
                <QuestionMarkCircleIcon className="h-4 w-4 text-purple-500" />
                Unknown usage
              </span>
              <Badge variant={totals.unknownUsage > 0 ? 'destructive' : 'secondary'} className="text-xs">
                {totals.unknownUsage}
              </Badge>
            </button>
            <button
              onClick={() => onFilterByRisk?.('not-reviewed')}
              className="flex items-center justify-between w-full px-2 py-1 rounded hover:bg-muted/50 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm">
                <ClipboardDocumentCheckIcon className="h-4 w-4 text-blue-500" />
                Not reviewed
              </span>
              <Badge variant={totals.notReviewed > 0 ? 'default' : 'secondary'} className="text-xs">
                {totals.notReviewed}
              </Badge>
            </button>
            <button
              onClick={() => onFilterByRisk?.('no-owner')}
              className="flex items-center justify-between w-full px-2 py-1 rounded hover:bg-muted/50 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm">
                <UsersIcon className="h-4 w-4 text-gray-500" />
                No owner
              </span>
              <Badge variant={totals.withoutOwner > 0 ? 'default' : 'secondary'} className="text-xs">
                {totals.withoutOwner}
              </Badge>
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Review Progress</span>
            <span className="font-medium">{reviewProgress}%</span>
          </div>
          <Progress value={reviewProgress} className="h-2" />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Cleanup Progress</span>
            <span className="font-medium">{cleanupProgress}%</span>
          </div>
          <Progress value={cleanupProgress} className="h-2" />
        </div>
      </div>

      {/* Domain Breakdown */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">By Domain</h3>
        <div className="space-y-1 max-h-[300px] overflow-y-auto">
          {domainStats.map((stat) => {
            const isActive = activeDomain === stat.domain;
            const hasIssues = stat.critical > 0 || stat.high > 0;
            
            return (
              <button
                key={stat.domain}
                onClick={() => onFilterByDomain?.(stat.domain)}
                className={`flex items-center justify-between w-full px-3 py-2 rounded text-sm transition-colors ${
                  isActive 
                    ? 'bg-primary/10 border border-primary/30' 
                    : 'hover:bg-muted/50'
                }`}
              >
                <span className="flex items-center gap-2">
                  {hasIssues && <ShieldExclamationIcon className="h-3 w-3 text-red-500" />}
                  <span className="font-medium">{stat.domain}</span>
                </span>
                <div className="flex items-center gap-1">
                  {stat.critical > 0 && (
                    <Badge variant="destructive" className="text-xs px-1">
                      {stat.critical}
                    </Badge>
                  )}
                  {stat.high > 0 && (
                    <Badge className="text-xs px-1 bg-orange-500">
                      {stat.high}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {stat.total}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Total Summary + Export */}
      <div className="space-y-3">
        <div className="rounded-lg bg-muted/30 p-3 text-center">
          <div className="text-2xl font-bold">{totals.total}</div>
          <div className="text-sm text-muted-foreground">Total nodes tracked</div>
        </div>
        
        {/* Export options */}
        {hasActiveFilters && filteredNodes && (
          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={exportFiltered}
                onChange={(e) => setExportFiltered(e.target.checked)}
                className="h-3 w-3 rounded border-gray-300"
              />
              <span className="text-muted-foreground">
                Export filtered only ({filteredNodes.length} nodes)
              </span>
            </label>
          </div>
        )}
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleExportCSV}
        >
          <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
          Export {exportFiltered && hasActiveFilters && filteredNodes 
            ? `${filteredNodes.length} filtered` 
            : `${nodes.length} total`} nodes
        </Button>
      </div>
    </div>
  );
}
