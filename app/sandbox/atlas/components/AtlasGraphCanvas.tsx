/**
 * AtlasGraphCanvas Component
 *
 * xyflow-based graph visualization for Atlas.
 * Renders nodes and edges with interactive selection.
 */

'use client';

import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  type Node,
  type Edge,
  type NodeMouseHandler,
  Handle,
  Position,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { AtlasEdgeRelation } from '../types';

// Types for graph view - using string for flexible node types
export interface AtlasFlowNode {
  id: string;
  type: string; // Can be any InventoryNodeType
  label: string;
  subtitle?: string;
}

export interface AtlasFlowEdge {
  source: string;
  target: string;
  relation: AtlasEdgeRelation;
}

interface AtlasGraphCanvasProps {
  nodes: AtlasFlowNode[];
  edges: AtlasFlowEdge[];
  selection: { id: string; type: string } | null;
  onSelectNode: (id: string, type: string) => void;
  /** Optional: Highlight edges connected to this node ID */
  highlightNodeId?: string | null;
}

// Color scheme for all inventory node types
const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  // Routes/Pages - Blue family
  route: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  route_handler: { bg: '#bfdbfe', border: '#2563eb', text: '#1d4ed8' },
  layout: { bg: '#e0e7ff', border: '#6366f1', text: '#4338ca' },
  
  // Components - Green family
  component: { bg: '#dcfce7', border: '#22c55e', text: '#166534' },
  hook: { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
  
  // Services/Logic - Amber family
  service: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  api: { bg: '#fed7aa', border: '#ea580c', text: '#9a3412' },
  server_action: { bg: '#ffedd5', border: '#f97316', text: '#c2410c' },
  
  // Infrastructure - Purple family
  'middleware / proxy': { bg: '#f3e8ff', border: '#a855f7', text: '#6b21a8' },
  edge_function: { bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6' },
  job: { bg: '#e9d5ff', border: '#9333ea', text: '#7e22ce' },
  
  // Database - Cyan family
  db_table: { bg: '#cffafe', border: '#06b6d4', text: '#0e7490' },
  db_view: { bg: '#a5f3fc', border: '#0891b2', text: '#155e75' },
  db_function: { bg: '#99f6e4', border: '#14b8a6', text: '#0f766e' },
  db_trigger: { bg: '#5eead4', border: '#0d9488', text: '#115e59' },
  rls_policy: { bg: '#fecdd3', border: '#f43f5e', text: '#be123c' },
  storage_bucket: { bg: '#c7d2fe', border: '#818cf8', text: '#4f46e5' },
  
  // Other
  asset: { bg: '#f5f5f4', border: '#a8a29e', text: '#57534e' },
  feature_flag: { bg: '#fce7f3', border: '#ec4899', text: '#be185d' },
  
  // Fallback
  default: { bg: '#f3f4f6', border: '#9ca3af', text: '#4b5563' },
};

// Edge colors by relation
const EDGE_COLORS: Record<AtlasEdgeRelation, string> = {
  uses: '#94a3b8',
  reads: '#3b82f6',
  writes: '#f97316',
  calls: '#a855f7',
  navigates: '#06b6d4',
  emits: '#ec4899',
};

// Node data type
interface AtlasNodeData {
  label: string;
  subtitle?: string;
  nodeType: string;
}

// Custom node component
function AtlasNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as AtlasNodeData;
  const colors = NODE_COLORS[nodeData.nodeType] || NODE_COLORS.default;

  return (
    <div
      className={`rounded-lg border-2 px-3 py-2 shadow-sm transition-shadow ${
        selected ? 'ring-2 ring-offset-2 ring-primary shadow-lg' : ''
      }`}
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        minWidth: '120px',
        maxWidth: '200px',
      }}
    >
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.text }}>
        {nodeData.nodeType}
      </div>
      <div className="truncate text-sm font-medium text-gray-900">{nodeData.label}</div>
      {nodeData.subtitle && (
        <div className="truncate text-xs text-gray-500">{nodeData.subtitle}</div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-gray-400" />
    </div>
  );
}

// Register custom node types
const nodeTypes = {
  atlasNode: AtlasNodeComponent,
};

// Simple grid layout
function layoutNodes(nodes: AtlasFlowNode[]): Node[] {
  const COLS = 4;
  const X_GAP = 250;
  const Y_GAP = 100;

  return nodes.map((node, index) => ({
    id: node.id,
    type: 'atlasNode',
    position: {
      x: (index % COLS) * X_GAP,
      y: Math.floor(index / COLS) * Y_GAP,
    },
    data: {
      label: node.label,
      subtitle: node.subtitle,
      nodeType: node.type,
    },
  }));
}

// Map edges to xyflow format with optional highlighting
function mapEdges(edges: AtlasFlowEdge[], highlightNodeId?: string | null): Edge[] {
  return edges.map((edge, index) => {
    // Check if this edge is connected to the highlighted node
    const isHighlighted = highlightNodeId 
      ? edge.source === highlightNodeId || edge.target === highlightNodeId
      : false;
    
    const baseColor = EDGE_COLORS[edge.relation] || EDGE_COLORS.uses;
    
    return {
      id: `edge-${index}`,
      source: edge.source,
      target: edge.target,
      type: 'default',
      animated: edge.relation === 'writes' || isHighlighted,
      style: { 
        stroke: isHighlighted ? '#ef4444' : baseColor,
        strokeWidth: isHighlighted ? 2.5 : 1,
        opacity: highlightNodeId ? (isHighlighted ? 1 : 0.2) : 1,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isHighlighted ? '#ef4444' : baseColor,
      },
    };
  });
}

export function AtlasGraphCanvas({
  nodes,
  edges,
  selection: _selection,
  onSelectNode,
  highlightNodeId,
}: AtlasGraphCanvasProps) {
  // Transform data for xyflow
  const flowNodes = useMemo(() => layoutNodes(nodes), [nodes]);
  const flowEdges = useMemo(() => mapEdges(edges, highlightNodeId), [edges, highlightNodeId]);

  // Handle node click
  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const nodeData = node.data as unknown as AtlasNodeData;
      onSelectNode(node.id, nodeData.nodeType);
    },
    [onSelectNode]
  );

  if (nodes.length === 0) {
    return (
      <div className="flex h-[500px] items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25">
        <p className="text-muted-foreground">No nodes to display in graph view</p>
      </div>
    );
  }

  return (
    <div className="h-[600px] rounded-lg border bg-background">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'default',
        }}
      >
        <Background gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as unknown as AtlasNodeData;
            return NODE_COLORS[data.nodeType]?.border || '#94a3b8';
          }}
          maskColor="rgba(0,0,0,0.1)"
        />
      </ReactFlow>

      {/* Legend - show main categories only */}
      <div className="absolute bottom-4 left-4 flex flex-wrap gap-3 rounded-lg bg-background/90 p-2 shadow-lg backdrop-blur-sm text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded border" style={{ backgroundColor: '#dbeafe', borderColor: '#3b82f6' }} />
          <span className="text-muted-foreground">Routes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded border" style={{ backgroundColor: '#dcfce7', borderColor: '#22c55e' }} />
          <span className="text-muted-foreground">Components</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded border" style={{ backgroundColor: '#fef3c7', borderColor: '#f59e0b' }} />
          <span className="text-muted-foreground">Services</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded border" style={{ backgroundColor: '#cffafe', borderColor: '#06b6d4' }} />
          <span className="text-muted-foreground">Database</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded border" style={{ backgroundColor: '#f3e8ff', borderColor: '#a855f7' }} />
          <span className="text-muted-foreground">Infrastructure</span>
        </div>
      </div>
    </div>
  );
}
