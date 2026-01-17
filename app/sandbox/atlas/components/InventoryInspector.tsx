'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentIcon,
  CircleStackIcon,
  GlobeAltIcon,
  ShareIcon,
  ClipboardIcon,
  CheckIcon,
  ArrowTopRightOnSquareIcon,
  ClockIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import type {
  AtlasMappedNode,
  AtlasMappedEdge,
  InventoryUsageStatus,
  InventoryRiskLevel,
} from '../lib/inventory-types';

interface InventoryInspectorProps {
  selectedNode: AtlasMappedNode | null;
  incomingEdges: AtlasMappedEdge[];
  outgoingEdges: AtlasMappedEdge[];
  impactTrace: {
    affectedNodes: AtlasMappedNode[];
    affectedEdges: AtlasMappedEdge[];
    securityCriticalInChain: boolean;
  } | null;
  onComputeImpact: (direction: 'upstream' | 'downstream' | 'both') => void;
  onClearImpact: () => void;
  lastLoadedAt: string | null;
  // New props for enhanced features
  recentNodes?: AtlasMappedNode[];
  relatedNodes?: AtlasMappedNode[];
  onSelectNode?: (nodeId: string) => void;
}

// Usage status styling
const usageStyles: Record<InventoryUsageStatus, { color: string; label: string }> = {
  unknown: { color: 'text-red-500', label: 'Unknown - needs audit' },
  dormant_flagged: { color: 'text-orange-500', label: 'Dormant (flagged)' },
  dead_orphan: { color: 'text-orange-400', label: 'Dead orphan' },
  legacy_deprecated: { color: 'text-yellow-500', label: 'Legacy deprecated' },
  reachable_but_off: { color: 'text-yellow-400', label: 'Reachable but off' },
  used_referenced: { color: 'text-green-500', label: 'Used (referenced)' },
  used_runtime: { color: 'text-green-600', label: 'Verified at runtime' },
};

// Risk badge variants
const riskVariants: Record<InventoryRiskLevel, 'destructive' | 'warning' | 'secondary' | 'success'> = {
  critical: 'destructive',
  high: 'warning',
  medium: 'secondary',
  low: 'success',
};

function formatTimestamp(value?: string | null) {
  if (!value) return 'Never';
  return new Date(value).toLocaleString('sv-SE');
}

// Quick Actions component
function QuickActions({ node }: { node: AtlasMappedNode }) {
  const [copied, setCopied] = useState(false);

  const copyPath = useCallback(async () => {
    if (!node.path) return;
    try {
      await navigator.clipboard.writeText(node.path);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [node.path]);

  const openInVSCode = useCallback(() => {
    if (!node.path) return;
    // VS Code URL scheme to open file
    window.open(`vscode://file/${node.path}`, '_blank');
  }, [node.path]);

  return (
    <div className="flex items-center gap-1.5">
      {node.path && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={copyPath}
            title="Kopiera sökväg"
          >
            {copied ? (
              <CheckIcon className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <ClipboardIcon className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={openInVSCode}
            title="Öppna i VS Code"
          >
            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}

// Recent nodes section
function RecentNodesSection({
  recentNodes,
  currentNodeId,
  onSelectNode,
}: {
  recentNodes: AtlasMappedNode[];
  currentNodeId: string;
  onSelectNode: (nodeId: string) => void;
}) {
  // Filter out current node and limit to 5
  const displayNodes = recentNodes
    .filter((n) => n.id !== currentNodeId)
    .slice(0, 5);

  if (displayNodes.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <ClockIcon className="h-3 w-3" />
        Senast visade
      </div>
      <div className="space-y-1">
        {displayNodes.map((node) => (
          <button
            key={node.id}
            onClick={() => onSelectNode(node.id)}
            className={cn(
              'w-full text-left text-xs p-2 rounded',
              'bg-muted/30 hover:bg-muted transition-colors',
              'flex items-center justify-between gap-2'
            )}
          >
            <span className="truncate font-medium">{node.name}</span>
            <Badge
              variant={riskVariants[node.risk] || 'secondary'}
              className="text-[9px] px-1 h-4"
            >
              {node.risk}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  );
}

// Related nodes section (similar nodes by domain/type/risk)
function RelatedNodesSection({
  relatedNodes,
  currentNodeId,
  onSelectNode,
}: {
  relatedNodes: AtlasMappedNode[];
  currentNodeId: string;
  onSelectNode: (nodeId: string) => void;
}) {
  // Filter out current node and limit to 5
  const displayNodes = relatedNodes
    .filter((n) => n.id !== currentNodeId)
    .slice(0, 5);

  if (displayNodes.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <SparklesIcon className="h-3 w-3" />
        Liknande noder
      </div>
      <p className="text-[10px] text-muted-foreground">
        Samma domain/typ med liknande risk
      </p>
      <div className="space-y-1">
        {displayNodes.map((node) => (
          <button
            key={node.id}
            onClick={() => onSelectNode(node.id)}
            className={cn(
              'w-full text-left text-xs p-2 rounded',
              'bg-muted/30 hover:bg-muted transition-colors',
              'flex items-center justify-between gap-2'
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={cn('w-1.5 h-1.5 rounded-full shrink-0', {
                  'bg-red-500': node.usage === 'unknown',
                  'bg-orange-500': node.usage === 'dormant_flagged',
                  'bg-green-500': node.usage === 'used_runtime' || node.usage === 'used_referenced',
                  'bg-muted-foreground': !['unknown', 'dormant_flagged', 'used_runtime', 'used_referenced'].includes(node.usage),
                })}
              />
              <span className="truncate">{node.name}</span>
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {node.type.replace(/_/g, ' ')}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function EdgeSection({
  title,
  icon: Icon,
  edges,
  iconColor,
}: {
  title: string;
  icon: typeof ArrowDownRightIcon;
  edges: AtlasMappedEdge[];
  iconColor: string;
}) {
  const [isExpanded, setIsExpanded] = useState(edges.length <= 5);

  if (edges.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic">No {title.toLowerCase()}</div>
    );
  }

  const displayEdges = isExpanded ? edges : edges.slice(0, 3);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium">
          <Icon className={cn('h-3 w-3', iconColor)} />
          <span>{title}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5">
            {edges.length}
          </Badge>
        </div>
        {edges.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 text-xs"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUpIcon className="h-3 w-3 mr-1" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDownIcon className="h-3 w-3 mr-1" />
                Show all
              </>
            )}
          </Button>
        )}
      </div>

      <div className="space-y-1 pl-5">
        {displayEdges.map((edge, i) => (
          <div
            key={`${edge.source}-${edge.target}-${i}`}
            className="text-xs flex items-start gap-2 p-1.5 rounded bg-muted/30"
          >
            <span className="text-muted-foreground">{edge.type}:</span>
            <span className="font-mono text-[11px] break-all">
              {title === 'Depends on' ? edge.target : edge.source}
            </span>
          </div>
        ))}
        {!isExpanded && edges.length > 3 && (
          <div className="text-[11px] text-muted-foreground">
            +{edges.length - 3} more...
          </div>
        )}
      </div>
    </div>
  );
}

function ImpactTraceSection({
  impactTrace,
  onClear,
}: {
  impactTrace: {
    affectedNodes: AtlasMappedNode[];
    affectedEdges: AtlasMappedEdge[];
    securityCriticalInChain: boolean;
  };
  onClear: () => void;
}) {
  const [isExpanded, _setIsExpanded] = useState(true);

  // Group affected nodes by domain
  const byDomain = impactTrace.affectedNodes.reduce<Record<string, AtlasMappedNode[]>>(
    (acc, node) => {
      const domain = node.ownerDomain || 'unknown';
      if (!acc[domain]) acc[domain] = [];
      acc[domain].push(node);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShareIcon className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Impact Trace</span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onClear}>
          Clear
        </Button>
      </div>

      {impactTrace.securityCriticalInChain && (
        <div className="flex items-center gap-2 p-2 rounded bg-red-500/10 border border-red-500/30">
          <ShieldCheckIcon className="h-4 w-4 text-red-500" />
          <span className="text-xs text-red-600 dark:text-red-400 font-medium">
            Security-critical nodes in impact chain
          </span>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        {impactTrace.affectedNodes.length} nodes affected across{' '}
        {Object.keys(byDomain).length} domains
      </div>

      {isExpanded && (
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {Object.entries(byDomain).map(([domain, nodes]) => (
            <div key={domain} className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {domain}
              </div>
              {nodes.slice(0, 5).map((node) => (
                <div
                  key={node.id}
                  className="text-xs pl-2 py-0.5 flex items-center gap-2"
                >
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      node.risk === 'critical'
                        ? 'bg-red-500'
                        : node.risk === 'high'
                        ? 'bg-orange-500'
                        : 'bg-muted-foreground'
                    )}
                  />
                  <span className="truncate">{node.name}</span>
                </div>
              ))}
              {nodes.length > 5 && (
                <div className="text-[10px] text-muted-foreground pl-2">
                  +{nodes.length - 5} more
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function InventoryInspector({
  selectedNode,
  incomingEdges,
  outgoingEdges,
  impactTrace,
  onComputeImpact,
  onClearImpact,
  lastLoadedAt,
  recentNodes = [],
  relatedNodes = [],
  onSelectNode,
}: InventoryInspectorProps) {
  if (!selectedNode) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Select a node to see details.
        </div>

        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
          <div className="text-xs text-muted-foreground space-y-2">
            <p>
              <strong>Tip:</strong> Expand a group and click on a node to see:
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px]">
              <li>Node identity and metadata</li>
              <li>Usage status and risk level</li>
              <li>Dependencies (edges in/out)</li>
              <li>Impact trace for safe refactoring</li>
            </ul>
          </div>
        </div>

        {/* Show recent nodes even when nothing selected */}
        {recentNodes.length > 0 && onSelectNode && (
          <>
            <hr className="border-border" />
            <RecentNodesSection
              recentNodes={recentNodes}
              currentNodeId=""
              onSelectNode={onSelectNode}
            />
          </>
        )}

        <hr className="border-border" />

        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Data Source
          </div>
          <div className="text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <CircleStackIcon className="h-3 w-3" />
              inventory.json
            </div>
            <div className="mt-1">Last loaded: {formatTimestamp(lastLoadedAt)}</div>
          </div>
        </div>
      </div>
    );
  }

  const usageStyle = usageStyles[selectedNode.usage] || usageStyles.unknown;
  const riskVariant = riskVariants[selectedNode.risk as InventoryRiskLevel] || 'secondary';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {selectedNode.type.replace(/_/g, ' ')}
            </div>
            <h3 className="text-lg font-semibold leading-tight mt-1">{selectedNode.name}</h3>
          </div>
          <div className="flex items-center gap-1">
            <QuickActions node={selectedNode} />
            <Badge variant={riskVariant as "secondary" | "destructive" | "success" | "warning"}>{selectedNode.risk}</Badge>
          </div>
        </div>

        {selectedNode.path && (
          <div className="flex items-center gap-2 text-xs">
            <DocumentIcon className="h-3 w-3 text-muted-foreground" />
            <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] break-all flex-1">
              {selectedNode.path}
            </code>
          </div>
        )}
      </div>

      <hr className="border-border" />

      {/* Status & Metadata */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-muted-foreground mb-1">Status</div>
          <div className={cn('font-medium', usageStyle.color)}>{usageStyle.label}</div>
        </div>
        <div>
          <div className="text-muted-foreground mb-1">Confidence</div>
          <div className="font-medium">
            {Math.round(selectedNode.confidence * 100)}%
          </div>
        </div>
        <div>
          <div className="text-muted-foreground mb-1">Domain</div>
          <div className="font-medium capitalize">{selectedNode.ownerDomain}</div>
        </div>
        <div>
          <div className="text-muted-foreground mb-1">Exposure</div>
          <div className="flex items-center gap-1 font-medium">
            <GlobeAltIcon className="h-3 w-3" />
            {selectedNode.exposure}
          </div>
        </div>
      </div>

      {selectedNode.notes && (
        <div className="text-xs bg-muted/50 rounded p-2 text-muted-foreground">
          {selectedNode.notes}
        </div>
      )}

      <hr className="border-border" />

      {/* Dependencies */}
      <div className="space-y-4">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Dependencies
        </div>

        <EdgeSection
          title="Depends on"
          icon={ArrowUpRightIcon}
          edges={outgoingEdges}
          iconColor="text-blue-500"
        />

        <EdgeSection
          title="Depended on by"
          icon={ArrowDownRightIcon}
          edges={incomingEdges}
          iconColor="text-purple-500"
        />
      </div>

      <hr className="border-border" />

      {/* Impact Trace */}
      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Impact Analysis
        </div>

        {impactTrace ? (
          <ImpactTraceSection impactTrace={impactTrace} onClear={onClearImpact} />
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => onComputeImpact('downstream')}
            >
              <ArrowDownRightIcon className="h-3 w-3 mr-1" />
              What uses this?
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => onComputeImpact('upstream')}
            >
              <ArrowUpRightIcon className="h-3 w-3 mr-1" />
              What does this need?
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => onComputeImpact('both')}
            >
              <ShareIcon className="h-3 w-3 mr-1" />
              Full trace
            </Button>
          </div>
        )}
      </div>

      {/* Risk assessment */}
      {selectedNode.usage === 'unknown' && (
        <>
          <hr className="border-border" />
          <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
            <ExclamationTriangleIcon className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs space-y-1">
              <div className="font-medium text-orange-600 dark:text-orange-400">
                Audit Required
              </div>
              <div className="text-muted-foreground">
                This node has unknown usage status. Verify it before making changes.
              </div>
            </div>
          </div>
        </>
      )}

      {/* Related nodes */}
      {relatedNodes.length > 0 && onSelectNode && (
        <>
          <hr className="border-border" />
          <RelatedNodesSection
            relatedNodes={relatedNodes}
            currentNodeId={selectedNode.id}
            onSelectNode={onSelectNode}
          />
        </>
      )}

      {/* Recent nodes */}
      {recentNodes.length > 0 && onSelectNode && (
        <>
          <hr className="border-border" />
          <RecentNodesSection
            recentNodes={recentNodes}
            currentNodeId={selectedNode.id}
            onSelectNode={onSelectNode}
          />
        </>
      )}
    </div>
  );
}
