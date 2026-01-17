/**
 * Inventory Types for Atlas
 *
 * These types match the inventory.json schema (INVENTORY_SCHEMA.json)
 * and provide Atlas-specific view types
 */

// ============================================
// Inventory Schema Types (from inventory.json)
// ============================================

export type InventoryNodeType =
  | 'route'
  | 'route_handler'
  | 'layout'
  | 'component'
  | 'hook'
  | 'service'
  | 'api'
  | 'server_action'
  | 'middleware / proxy'
  | 'edge_function'
  | 'job'
  | 'asset'
  | 'db_table'
  | 'db_view'
  | 'db_function'
  | 'db_trigger'
  | 'rls_policy'
  | 'storage_bucket'
  | 'feature_flag';

export type InventoryDomain =
  | 'marketing'
  | 'app'
  | 'admin'
  | 'sandbox'
  | 'demo'
  | 'shared'
  | 'db';

export type InventoryUsageStatus =
  | 'used_runtime'
  | 'used_referenced'
  | 'reachable_but_off'
  | 'dormant_flagged'
  | 'legacy_deprecated'
  | 'dead_orphan'
  | 'unknown';

export type InventoryRiskLevel = 'critical' | 'high' | 'medium' | 'low';

export type InventoryExposure =
  | 'public'
  | 'authenticated'
  | 'tenant_scoped'
  | 'admin_only'
  | 'internal';

export type InventoryDataClass =
  | 'pii'
  | 'auth'
  | 'billing'
  | 'tenant_core'
  | 'content'
  | 'telemetry'
  | 'misc'
  | null;

export interface InventoryEvidence {
  kind:
    | 'import_path'
    | 'route_reachability'
    | 'link_ref'
    | 'flag_gate'
    | 'role_gate'
    | 'tenant_gate'
    | 'runtime_signal'
    | 'db_usage'
    | 'manual_note';
  detail: string;
}

export interface InventoryNodeStatus {
  usage: InventoryUsageStatus;
  confidence: number; // 0.0-1.0
  evidence: InventoryEvidence[];
}

export interface InventoryNode {
  id: string;
  type: InventoryNodeType;
  name: string;
  path: string | null;
  ownerDomain: InventoryDomain;
  status: InventoryNodeStatus;
  guards: string[];
  risk: string;
  notes: string;
  runtime_scope: 'prod' | 'dev_only' | 'test_only' | 'build_only';
  exposure: InventoryExposure;
  data_class?: InventoryDataClass;
  rls_required?: boolean | null;
  rls_covered?: 'true' | 'false' | 'unknown' | null;
  tenant_key?: string | null;
}

export type InventoryEdgeType =
  | 'route_renders'
  | 'protected_by'
  | 'triggers'
  | 'db_reads'
  | 'db_writes'
  | 'db_rpc'
  | 'calls'
  | 'uses';

export interface InventoryEdge {
  from: string;
  to: string;
  type: InventoryEdgeType;
  details: string;
}

export interface InventoryFinding {
  category: 'orphan' | 'unreachable' | 'security' | 'deprecated';
  summary: string;
  affected: string[];
  recommendation: string;
  prechecks: string;
  rollback: string;
}

export interface InventoryMeta {
  version: string;
  generatedAt: string;
  root: string;
  notes?: string[];
}

export interface InventoryMetrics {
  nodeCount: number;
  edgeCount: number;
  findingCount: number;
}

export interface InventoryData {
  meta: InventoryMeta;
  nodes: InventoryNode[];
  edges: InventoryEdge[];
  findings: InventoryFinding[];
  metrics: InventoryMetrics;
}

// ============================================
// Atlas View Types (for UI rendering)
// ============================================

/**
 * The four mental views from the Master Prompt
 */
export type AtlasViewMode = 'surface' | 'system' | 'data' | 'risk';

export const ATLAS_VIEW_MODES: { id: AtlasViewMode; label: string; description: string }[] = [
  {
    id: 'surface',
    label: 'Surface (IA)',
    description: 'How does Lekbanken look to the user? Routes, layouts, components.',
  },
  {
    id: 'system',
    label: 'System',
    description: 'How does functionality connect? Services, actions, handlers.',
  },
  {
    id: 'data',
    label: 'Data',
    description: 'How does data flow and get protected? Tables, RLS, triggers.',
  },
  {
    id: 'risk',
    label: 'Risk',
    description: 'Where should I be careful? All nodes, color-coded by status.',
  },
];

/**
 * Mapped node for Atlas display
 */
export interface AtlasMappedNode {
  id: string;
  type: InventoryNodeType;
  name: string;
  path?: string;
  ownerDomain: InventoryDomain;
  risk: 'critical' | 'high' | 'medium' | 'low';
  usage: InventoryUsageStatus;
  confidence: number;
  exposure: InventoryExposure;
  notes?: string;
  searchText: string;
}

/**
 * Mapped edge for Atlas display
 * Note: Uses source/target (Atlas convention) instead of from/to (inventory)
 */
export interface AtlasMappedEdge {
  source: string;
  target: string;
  type: InventoryEdgeType;
  details: string;
}

/**
 * Grouped nodes for hierarchical rendering
 * Key performance optimization: render groups, not 1634 individual nodes
 */
export interface AtlasNodeGroup {
  id: string;
  domain: string;
  type: string;
  label: string;
  nodeCount: number;
  unknownCount: number;
  criticalCount: number;
  nodes: AtlasMappedNode[]; // First N nodes, rest loaded on expand
  hasMore: boolean;
  expanded: boolean;
}

/**
 * Domain summary for overview panel
 */
export interface AtlasDomainSummary {
  id: string;
  label: string;
  total: number;
  unknown: number;
  critical: number;
}

/**
 * Risk summary for overview panel
 */
export interface AtlasRiskSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

/**
 * Filter state for Atlas views
 */
export interface AtlasInventoryFilters {
  domains: InventoryDomain[];
  types: InventoryNodeType[];
  usageStatuses: InventoryUsageStatus[];
  riskLevels: InventoryRiskLevel[];
  searchQuery: string;
}

/**
 * Selection state
 */
export interface AtlasInventorySelection {
  nodeId: string;
  node: AtlasMappedNode | null;
  incomingEdges: AtlasMappedEdge[];
  outgoingEdges: AtlasMappedEdge[];
}

/**
 * Impact trace result
 */
export interface AtlasImpactTrace {
  startNodeId: string;
  affectedNodes: AtlasMappedNode[];
  affectedEdges: AtlasMappedEdge[];
  securityCriticalInChain: boolean;
  depth: number;
}
