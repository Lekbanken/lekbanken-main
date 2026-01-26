/**
 * useInventoryLegacy Hook
 *
 * Loads inventory.json and transforms it to legacy Atlas format.
 * This is a bridge between the new inventory system and existing UI components.
 */

import { useEffect, useMemo, useState } from 'react';
import type {
  InventoryData,
  InventoryNode,
  InventoryEdge,
  InventoryDomain,
} from '../lib/inventory-types';
import type {
  AtlasFrame,
  AtlasComponent,
  AtlasTable,
  AtlasEndpoint,
  AtlasEdge,
  AtlasDomain,
  AtlasEdgeRelation,
  AtlasNodeType,
} from '../types';

// Map inventory domains to legacy Atlas domains
const DOMAIN_MAP: Record<InventoryDomain, AtlasDomain> = {
  marketing: 'other',
  app: 'product',
  admin: 'admin',
  sandbox: 'other',
  demo: 'other',
  shared: 'other',
  db: 'other',
};

// Map inventory node types to legacy Atlas node types
type LegacyNodeType = 'frame' | 'component' | 'endpoint' | 'table' | 'skip';

const NODE_TYPE_MAP: Record<string, LegacyNodeType> = {
  route: 'frame',
  layout: 'frame',
  component: 'component',
  hook: 'component',
  service: 'component',
  api: 'endpoint',
  route_handler: 'endpoint',
  server_action: 'endpoint',
  edge_function: 'endpoint',
  middleware: 'endpoint',
  db_table: 'table',
  db_view: 'table',
  db_function: 'skip',
  db_trigger: 'skip',
  rls_policy: 'skip',
  storage_bucket: 'skip',
  feature_flag: 'skip',
  job: 'skip',
  asset: 'skip',
};

// Map inventory edge types to legacy Atlas edge relations
const EDGE_RELATION_MAP: Record<string, AtlasEdgeRelation> = {
  route_renders: 'uses',
  protected_by: 'uses',
  triggers: 'calls',
  db_reads: 'reads',
  db_writes: 'writes',
  db_rpc: 'calls',
  calls: 'calls',
  uses: 'uses',
};

function mapToFrames(nodes: InventoryNode[]): AtlasFrame[] {
  return nodes
    .filter((node) => NODE_TYPE_MAP[node.type] === 'frame')
    .map((node): AtlasFrame => ({
      id: node.id,
      name: node.name,
      route: node.path || '/',
      domain: DOMAIN_MAP[node.ownerDomain] || 'other',
      inventoryDomain: node.ownerDomain,
      roles: [],
      components: [],
      reads: [],
      writes: [],
      endpoints: [],
      tags: Array.isArray(node.guards) ? node.guards : [],
      notes: node.notes || undefined,
      fileRef: node.path || undefined,
    }));
}

function mapToComponents(nodes: InventoryNode[]): AtlasComponent[] {
  return nodes
    .filter((node) => NODE_TYPE_MAP[node.type] === 'component')
    .map((node): AtlasComponent => ({
      id: node.id,
      name: node.name,
      fileRef: node.path || undefined,
      notes: node.notes || undefined,
    }));
}

function mapToTables(nodes: InventoryNode[]): AtlasTable[] {
  return nodes
    .filter((node) => NODE_TYPE_MAP[node.type] === 'table')
    .map((node): AtlasTable => ({
      id: node.id,
      name: node.name,
      schema: 'public',
      description: node.notes || undefined,
      fileRef: node.path || undefined,
    }));
}

function mapToEndpoints(nodes: InventoryNode[]): AtlasEndpoint[] {
  return nodes
    .filter((node) => NODE_TYPE_MAP[node.type] === 'endpoint')
    .map((node): AtlasEndpoint => {
      // Extract method from path if present (e.g., "GET /api/users")
      const pathParts = node.path?.split(' ') || [];
      const method = pathParts.length > 1 ? pathParts[0] : undefined;
      const path = pathParts.length > 1 ? pathParts.slice(1).join(' ') : node.path || '/';

      return {
        id: node.id,
        path,
        method,
        fileRef: node.path || undefined,
        notes: node.notes || undefined,
      };
    });
}

function mapToEdges(
  edges: InventoryEdge[],
  nodes: InventoryNode[]
): AtlasEdge[] {
  // Build node type lookup
  const nodeTypeMap = new Map<string, AtlasNodeType>();
  nodes.forEach((node) => {
    const legacyType = NODE_TYPE_MAP[node.type];
    if (legacyType && legacyType !== 'skip') {
      nodeTypeMap.set(node.id, legacyType);
    }
  });

  return edges
    .filter((edge) => {
      const fromType = nodeTypeMap.get(edge.from);
      const toType = nodeTypeMap.get(edge.to);
      return fromType && toType;
    })
    .map((edge): AtlasEdge => ({
      fromId: edge.from,
      fromType: nodeTypeMap.get(edge.from)!,
      toId: edge.to,
      toType: nodeTypeMap.get(edge.to)!,
      relation: EDGE_RELATION_MAP[edge.type] || 'uses',
    }));
}

export interface DomainCount {
  domain: InventoryDomain;
  count: number;
}

export interface UseInventoryLegacyResult {
  frames: AtlasFrame[];
  components: AtlasComponent[];
  tables: AtlasTable[];
  endpoints: AtlasEndpoint[];
  edges: AtlasEdge[];
  rawNodes: InventoryNode[];
  domainCounts: DomainCount[];
  totalNodes: number;
  isLoading: boolean;
  error: string | null;
}

export function useInventoryLegacy(): UseInventoryLegacyResult {
  const [inventory, setInventory] = useState<InventoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load inventory.json on mount
  useEffect(() => {
    const loadInventory = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch via API route since inventory.json is in project root, not public/
        const response = await fetch('/api/atlas/inventory');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to load inventory: ${response.status} ${response.statusText}`);
        }
        
        const data: InventoryData = await response.json();
        setInventory(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error loading inventory';
        setError(message);
        console.error('Failed to load inventory.json:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadInventory();
  }, []);

  // Transform inventory to legacy format
  const frames = useMemo(() => {
    if (!inventory) return [];
    return mapToFrames(inventory.nodes);
  }, [inventory]);

  const components = useMemo(() => {
    if (!inventory) return [];
    return mapToComponents(inventory.nodes);
  }, [inventory]);

  const tables = useMemo(() => {
    if (!inventory) return [];
    return mapToTables(inventory.nodes);
  }, [inventory]);

  const endpoints = useMemo(() => {
    if (!inventory) return [];
    return mapToEndpoints(inventory.nodes);
  }, [inventory]);

  const edges = useMemo(() => {
    if (!inventory) return [];
    return mapToEdges(inventory.edges, inventory.nodes);
  }, [inventory]);

  // Compute domain counts for DomainTabs
  const domainCounts = useMemo((): DomainCount[] => {
    if (!inventory) return [];
    
    const counts = new Map<InventoryDomain, number>();
    
    inventory.nodes.forEach((node) => {
      const domain = node.ownerDomain;
      counts.set(domain, (counts.get(domain) || 0) + 1);
    });
    
    return Array.from(counts.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count);
  }, [inventory]);

  const totalNodes = useMemo(() => {
    if (!inventory) return 0;
    return inventory.nodes.length;
  }, [inventory]);

  const rawNodes = useMemo(() => {
    if (!inventory) return [];
    return inventory.nodes;
  }, [inventory]);

  return {
    frames,
    components,
    tables,
    endpoints,
    edges,
    rawNodes,
    domainCounts,
    totalNodes,
    isLoading,
    error,
  };
}
