/**
 * Inventory Adapter for Atlas
 *
 * Maps inventory.json data to Atlas-compatible format with:
 * - Lazy loading support
 * - Smart grouping for performance (1634 nodes → manageable chunks)
 * - On-demand edge resolution
 *
 * Risk mitigation strategy:
 * 1. Group nodes by domain/type to avoid rendering 1634 items at once
 * 2. Edges only computed for visible/selected nodes
 * 3. Summary statistics pre-computed for instant overview
 */

import type {
  InventoryNode,
  InventoryEdge,
  InventoryData,
  AtlasViewMode,
  AtlasNodeGroup,
  AtlasMappedNode,
  AtlasMappedEdge,
  AtlasDomainSummary,
  AtlasRiskSummary,
} from '@/app/sandbox/atlas/lib/inventory-types';

// Node type mappings: inventory types → Atlas view categories
const VIEW_NODE_TYPES: Record<AtlasViewMode, string[]> = {
  surface: ['route', 'layout', 'component'],
  system: ['service', 'server_action', 'route_handler', 'edge_function', 'api'],
  data: ['db_table', 'db_view', 'rls_policy', 'db_trigger', 'db_function'],
  risk: [], // All nodes, filtered by status
};

// Risk level ordering for sorting
const RISK_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

// Usage status ordering (unknown first for audit focus)
const USAGE_ORDER: Record<string, number> = {
  unknown: 0,
  dormant_flagged: 1,
  dead_orphan: 2,
  legacy_deprecated: 3,
  reachable_but_off: 4,
  used_referenced: 5,
  used_runtime: 6,
};

/**
 * Pre-compute domain and risk summaries for instant overview
 */
export function computeSummaries(nodes: InventoryNode[]): {
  domains: AtlasDomainSummary[];
  risks: AtlasRiskSummary;
  usageBreakdown: Record<string, number>;
} {
  const domainCounts: Record<string, { total: number; unknown: number; critical: number }> = {};
  const riskCounts: AtlasRiskSummary = { critical: 0, high: 0, medium: 0, low: 0 };
  const usageCounts: Record<string, number> = {};

  nodes.forEach((node) => {
    // Domain aggregation
    const domain = node.ownerDomain || 'unknown';
    if (!domainCounts[domain]) {
      domainCounts[domain] = { total: 0, unknown: 0, critical: 0 };
    }
    domainCounts[domain].total++;
    if (node.status.usage === 'unknown') {
      domainCounts[domain].unknown++;
    }
    if (node.risk === 'critical') {
      domainCounts[domain].critical++;
    }

    // Risk aggregation
    const risk = (node.risk || 'low') as keyof AtlasRiskSummary;
    if (risk in riskCounts) {
      riskCounts[risk]++;
    }

    // Usage aggregation
    const usage = node.status.usage || 'unknown';
    usageCounts[usage] = (usageCounts[usage] || 0) + 1;
  });

  const domains = Object.entries(domainCounts)
    .map(([id, counts]) => ({
      id,
      label: id.charAt(0).toUpperCase() + id.slice(1),
      ...counts,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    domains,
    risks: riskCounts,
    usageBreakdown: usageCounts,
  };
}

/**
 * Map inventory node to Atlas display format
 */
export function mapNode(node: InventoryNode): AtlasMappedNode {
  return {
    id: node.id,
    type: node.type,
    name: node.name,
    path: node.path || undefined,
    ownerDomain: node.ownerDomain,
    risk: node.risk as 'critical' | 'high' | 'medium' | 'low',
    usage: node.status.usage,
    confidence: node.status.confidence,
    exposure: node.exposure,
    notes: node.notes || undefined,
    // Searchable text for filtering
    searchText: [
      node.id,
      node.name,
      node.path || '',
      node.ownerDomain,
      node.type,
      node.notes || '',
    ]
      .join(' ')
      .toLowerCase(),
  };
}

/**
 * Map inventory edge to Atlas format
 * Note: inventory uses from/to, Atlas interface uses source/target
 */
export function mapEdge(edge: InventoryEdge): AtlasMappedEdge {
  return {
    source: edge.from,
    target: edge.to,
    type: edge.type,
    details: edge.details,
  };
}

/**
 * Group nodes by domain and type for hierarchical rendering
 * This is the key performance optimization
 */
export function groupNodes(
  nodes: InventoryNode[],
  viewMode: AtlasViewMode
): AtlasNodeGroup[] {
  const allowedTypes = VIEW_NODE_TYPES[viewMode];
  const isRiskView = viewMode === 'risk';

  // Filter nodes by view mode
  const filteredNodes = isRiskView
    ? nodes // Risk view shows all
    : nodes.filter((node) => allowedTypes.includes(node.type));

  // Group by domain first
  const byDomain: Record<string, InventoryNode[]> = {};
  filteredNodes.forEach((node) => {
    const domain = node.ownerDomain || 'unknown';
    if (!byDomain[domain]) {
      byDomain[domain] = [];
    }
    byDomain[domain].push(node);
  });

  // Create groups with sorting
  const groups: AtlasNodeGroup[] = [];

  Object.entries(byDomain).forEach(([domain, domainNodes]) => {
    // Sub-group by type within domain
    const byType: Record<string, InventoryNode[]> = {};
    domainNodes.forEach((node) => {
      const type = node.type;
      if (!byType[type]) {
        byType[type] = [];
      }
      byType[type].push(node);
    });

    Object.entries(byType).forEach(([type, typeNodes]) => {
      // Sort nodes within group
      const sortedNodes = [...typeNodes].sort((a, b) => {
        // Unknown/critical first in risk view
        if (isRiskView) {
          const usageA = USAGE_ORDER[a.status.usage] ?? 99;
          const usageB = USAGE_ORDER[b.status.usage] ?? 99;
          if (usageA !== usageB) return usageA - usageB;

          const riskA = RISK_ORDER[a.risk] ?? 99;
          const riskB = RISK_ORDER[b.risk] ?? 99;
          if (riskA !== riskB) return riskA - riskB;
        }
        return a.name.localeCompare(b.name);
      });

      // Count risk indicators
      const unknownCount = sortedNodes.filter(
        (n) => n.status.usage === 'unknown'
      ).length;
      const criticalCount = sortedNodes.filter(
        (n) => n.risk === 'critical'
      ).length;

      groups.push({
        id: `${domain}:${type}`,
        domain,
        type,
        label: `${domain} / ${type.replace(/_/g, ' ')}`,
        nodeCount: sortedNodes.length,
        unknownCount,
        criticalCount,
        // Only include first N nodes; rest loaded on expand
        nodes: sortedNodes.slice(0, 20).map(mapNode),
        hasMore: sortedNodes.length > 20,
        expanded: false,
      });
    });
  });

  // Sort groups: domains with most critical/unknown first
  return groups.sort((a, b) => {
    // Critical count first
    if (a.criticalCount !== b.criticalCount) {
      return b.criticalCount - a.criticalCount;
    }
    // Then unknown count
    if (a.unknownCount !== b.unknownCount) {
      return b.unknownCount - a.unknownCount;
    }
    // Then total count
    return b.nodeCount - a.nodeCount;
  });
}

/**
 * Get edges for a specific node (on-demand)
 * Returns both incoming and outgoing edges
 */
export function getNodeEdges(
  nodeId: string,
  edges: InventoryEdge[]
): { incoming: AtlasMappedEdge[]; outgoing: AtlasMappedEdge[] } {
  const incoming: AtlasMappedEdge[] = [];
  const outgoing: AtlasMappedEdge[] = [];

  edges.forEach((edge) => {
    if (edge.to === nodeId) {
      incoming.push(mapEdge(edge));
    }
    if (edge.from === nodeId) {
      outgoing.push(mapEdge(edge));
    }
  });

  return { incoming, outgoing };
}

/**
 * Compute impact trace: what nodes are affected if this node changes?
 * Uses BFS to traverse edges up to maxDepth
 */
export function computeImpactTrace(
  startNodeId: string,
  edges: InventoryEdge[],
  nodes: InventoryNode[],
  direction: 'upstream' | 'downstream' | 'both' = 'both',
  maxDepth: number = 3
): {
  affectedNodes: AtlasMappedNode[];
  affectedEdges: AtlasMappedEdge[];
  securityCriticalInChain: boolean;
} {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const visited = new Set<string>([startNodeId]);
  const affectedEdges: AtlasMappedEdge[] = [];
  const queue = [{ id: startNodeId, depth: 0 }];
  let securityCriticalInChain = false;

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;

    edges.forEach((edge) => {
      let targetId: string | null = null;

      if (direction !== 'upstream' && edge.from === id && !visited.has(edge.to)) {
        targetId = edge.to;
      }
      if (direction !== 'downstream' && edge.to === id && !visited.has(edge.from)) {
        targetId = edge.from;
      }

      if (targetId) {
        visited.add(targetId);
        affectedEdges.push(mapEdge(edge));
        queue.push({ id: targetId, depth: depth + 1 });

        // Check if security-critical
        const targetNode = nodeMap.get(targetId);
        if (targetNode?.risk === 'critical') {
          securityCriticalInChain = true;
        }
      }
    });
  }

  // Remove start node from affected
  visited.delete(startNodeId);

  const affectedNodes = Array.from(visited)
    .map((id) => nodeMap.get(id))
    .filter((n): n is InventoryNode => !!n)
    .map(mapNode);

  return {
    affectedNodes,
    affectedEdges,
    securityCriticalInChain,
  };
}

/**
 * Filter nodes by various criteria
 */
export function filterNodes(
  nodes: InventoryNode[],
  filters: {
    domains?: string[];
    types?: string[];
    usageStatuses?: string[];
    riskLevels?: string[];
    searchQuery?: string;
  }
): InventoryNode[] {
  return nodes.filter((node) => {
    if (filters.domains?.length && !filters.domains.includes(node.ownerDomain)) {
      return false;
    }
    if (filters.types?.length && !filters.types.includes(node.type)) {
      return false;
    }
    if (filters.usageStatuses?.length && !filters.usageStatuses.includes(node.status.usage)) {
      return false;
    }
    if (filters.riskLevels?.length && !filters.riskLevels.includes(node.risk)) {
      return false;
    }
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const searchable = [
        node.id,
        node.name,
        node.path || '',
        node.notes || '',
      ]
        .join(' ')
        .toLowerCase();
      if (!searchable.includes(query)) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Load and parse inventory data
 * Returns null if loading fails
 */
export async function loadInventoryData(): Promise<InventoryData | null> {
  try {
    // Fetch inventory.json from public or root
    const response = await fetch('/api/sandbox/inventory');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return data as InventoryData;
  } catch (error) {
    console.error('Failed to load inventory.json:', error);
    return null;
  }
}
