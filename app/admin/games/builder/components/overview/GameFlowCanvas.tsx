/**
 * GameFlowCanvas Component
 *
 * React Flow-based visualization of the game structure.
 * Shows phases as containers, steps inside phases, and trigger edges between entities.
 */

'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
  SelectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTranslations } from 'next-intl';
import { Card, Button } from '@/components/ui';
import {
  BoltIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  ArrowsPointingOutIcon,
  RectangleStackIcon,
  CubeIcon,
  PuzzlePieceIcon,
} from '@heroicons/react/24/outline';
import type { GameBuilderState } from '@/types/game-builder-state';
import type { BuilderSection } from '../BuilderSectionNav';
import { useGameFlowGraph, type FlowNodeData, type TriggerEdgeData } from './useGameFlowGraph';
import { flowNodeTypes } from './FlowNodes';
import { flowEdgeTypes } from './FlowEdges';

// ============================================================================
// Context Menu Component
// ============================================================================

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onAddPhase: () => void;
  onAddStep: () => void;
  onAddArtifact: () => void;
  onAddTrigger: () => void;
}

function ContextMenu({ x, y, onClose, onAddPhase, onAddStep, onAddArtifact, onAddTrigger }: ContextMenuProps) {
  const t = useTranslations('admin.games.builder.overview');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute z-50 bg-white border border-border rounded-lg shadow-lg py-1 min-w-[160px]"
      style={{ left: x, top: y }}
    >
      <button
        className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
        onClick={() => { onAddPhase(); onClose(); }}
      >
        <RectangleStackIcon className="h-4 w-4 text-blue-500" />
        {t('contextMenu.addPhase')}
      </button>
      <button
        className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
        onClick={() => { onAddStep(); onClose(); }}
      >
        <CubeIcon className="h-4 w-4 text-emerald-500" />
        {t('contextMenu.addStep')}
      </button>
      <button
        className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
        onClick={() => { onAddArtifact(); onClose(); }}
      >
        <PuzzlePieceIcon className="h-4 w-4 text-amber-500" />
        {t('contextMenu.addArtifact')}
      </button>
      <div className="border-t border-border my-1" />
      <button
        className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
        onClick={() => { onAddTrigger(); onClose(); }}
      >
        <BoltIcon className="h-4 w-4 text-purple-500" />
        {t('contextMenu.addTrigger')}
      </button>
    </div>
  );
}

// ============================================================================
// Auto-Layout Helper (simple grid layout - no external dependencies)
// ============================================================================

const getLayoutedElements = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nodes: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  edges: any[],
  _direction = 'LR' // Left to Right (kept for API compatibility)
) => {
  // Simple left-to-right layout algorithm
  // Group nodes by type and arrange in columns
  const NODE_WIDTH = 280;
  const NODE_HEIGHT = 100;
  const H_GAP = 120; // Horizontal gap between columns
  const V_GAP = 40;  // Vertical gap between nodes
  
  // Separate nodes by type (skip child nodes like steps in phases)
  const phases = nodes.filter(n => !n.parentId && n.type === 'phase');
  const artifacts = nodes.filter(n => !n.parentId && n.type === 'artifact');
  const orphanSteps = nodes.filter(n => !n.parentId && n.type === 'step');
  
  // Calculate column positions
  let currentX = 50;
  
  // Layout phases in first column
  phases.forEach((node, index) => {
    node.position = {
      x: currentX,
      y: 50 + index * (NODE_HEIGHT + V_GAP + 100), // Extra space for nested steps
    };
  });
  
  if (phases.length > 0) {
    currentX += NODE_WIDTH + H_GAP;
  }
  
  // Layout orphan steps in second column (if any)
  if (orphanSteps.length > 0) {
    orphanSteps.forEach((node, index) => {
      node.position = {
        x: currentX,
        y: 50 + index * (NODE_HEIGHT + V_GAP),
      };
    });
    currentX += NODE_WIDTH + H_GAP;
  }
  
  // Layout artifacts in last column
  artifacts.forEach((node, index) => {
    node.position = {
      x: currentX,
      y: 50 + index * (NODE_HEIGHT + V_GAP),
    };
  });

  return {
    nodes: nodes.map(node => {
      // Child nodes keep their relative positions
      if (node.parentId) return node;
      // Find the updated position
      const updated = [...phases, ...orphanSteps, ...artifacts].find(n => n.id === node.id);
      return updated || node;
    }),
    edges,
  };
};

// ============================================================================
// Types
// ============================================================================

interface GameFlowCanvasProps {
  state: GameBuilderState;
  onNavigate: (section: BuilderSection, entityId?: string) => void;
}

// ============================================================================
// Inner Component (needs ReactFlowProvider context)
// ============================================================================

function GameFlowCanvasInner({ state, onNavigate }: GameFlowCanvasProps) {
  const t = useTranslations('admin.games.builder.overview');
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Derive nodes and edges from state (includes validation)
  const { nodes: derivedNodes, edges: derivedEdges, validationResult } = useGameFlowGraph(state);

  // React Flow state (allows for internal updates like dragging)
  // Using 'any' to avoid React Flow's strict generic typing issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [nodes, setNodes, onNodesChange] = useNodesState(derivedNodes as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [edges, setEdges, onEdgesChange] = useEdgesState(derivedEdges as any);

  // Sync derived data with React Flow state when state changes
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setNodes(derivedNodes as any);
    setEdges(derivedEdges.map(edge => ({
      ...edge,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: (edge.style?.stroke as string) || '#6b7280',
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })) as any);
  }, [derivedNodes, derivedEdges, setNodes, setEdges]);

  // Handle right-click context menu
  const onPaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
    event.preventDefault();
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setContextMenu({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  }, []);

  // Context menu actions
  const handleAddPhase = useCallback(() => onNavigate('faser'), [onNavigate]);
  const handleAddStep = useCallback(() => onNavigate('steg'), [onNavigate]);
  const handleAddArtifact = useCallback(() => onNavigate('artifacts'), [onNavigate]);
  const handleAddTrigger = useCallback(() => onNavigate('triggers'), [onNavigate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if focus is on the canvas area
      if (!canvasRef.current?.contains(document.activeElement) && 
          document.activeElement !== document.body) {
        return;
      }

      // Zoom in/out with +/- keys
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      }
      if (e.key === '-') {
        e.preventDefault();
        zoomOut();
      }
      // Fit view with 'f' key
      if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        fitView({ padding: 0.2 });
      }
      // Close context menu on Escape
      if (e.key === 'Escape') {
        setContextMenu(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [fitView, zoomIn, zoomOut]);

  // Handle node click to navigate
  const onNodeClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_event: React.MouseEvent, node: any) => {
      const data = node.data as FlowNodeData;
      if (!data) return;

      switch (data.type) {
        case 'phase':
          if (data.phase.id === 'orphan') {
            onNavigate('steg');
          } else {
            onNavigate('faser', data.phase.id);
          }
          break;
        case 'step':
          onNavigate('steg', data.step.id);
          break;
        case 'artifact':
          onNavigate('artifacts', data.artifact.id);
          break;
        case 'trigger':
          onNavigate('triggers', data.triggerId);
          break;
      }
    },
    [onNavigate]
  );

  // Handle edge click to navigate to trigger
  const onEdgeClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_event: React.MouseEvent, edge: any) => {
      const data = edge.data as TriggerEdgeData | undefined;
      if (data?.triggerId) {
        onNavigate('triggers', data.triggerId);
      }
    },
    [onNavigate]
  );

  // Auto-layout function (simple grid layout)
  const onLayout = useCallback(() => {
    const layouted = getLayoutedElements(nodes, edges, 'LR');
    setNodes([...layouted.nodes]);
    setEdges([...layouted.edges]);
    // Fit view after layout with small delay to allow React to update
    window.requestAnimationFrame(() => {
      fitView({ padding: 0.2 });
    });
  }, [nodes, edges, setNodes, setEdges, fitView]);

  // Count stats
  const phaseCount = state.phases.length;
  const stepCount = state.steps.length;
  const artifactCount = state.artifacts.length;
  const triggerCount = state.triggers.length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unresolvedCount = edges.filter((e: any) => e.data?.unresolved).length;
  const errorCount = validationResult.counts.errors;
  const warningCount = validationResult.counts.warnings;

  // Empty state
  if (phaseCount === 0 && stepCount === 0 && artifactCount === 0) {
    return (
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-1">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>

        <Card className="p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <BoltIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">{t('empty.title')}</h3>
          <p className="text-sm text-muted-foreground max-w-md">{t('empty.description')}</p>
          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={() => onNavigate('steg')}>
              {t('empty.addSteps')}
            </Button>
            <Button variant="outline" onClick={() => onNavigate('faser')}>
              {t('empty.addPhases')}
            </Button>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-1">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-4">
          {/* Auto-layout button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onLayout}
            className="gap-2"
          >
            <ArrowsPointingOutIcon className="h-4 w-4" />
            {t('autoLayout')}
          </Button>

          {/* Quick stats */}
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <div className="font-bold text-foreground">{phaseCount}</div>
              <div className="text-xs text-muted-foreground">{t('stats.phases')}</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-foreground">{stepCount}</div>
              <div className="text-xs text-muted-foreground">{t('stats.steps')}</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-foreground">{artifactCount}</div>
              <div className="text-xs text-muted-foreground">{t('stats.artifacts')}</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-foreground">{triggerCount}</div>
              <div className="text-xs text-muted-foreground">{t('stats.triggers')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Validation summary */}
      {(errorCount > 0 || warningCount > 0 || unresolvedCount > 0) && (
        <div className="flex flex-wrap gap-3">
          {errorCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
              <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
              <span className="text-sm text-red-700">
                {errorCount} {errorCount === 1 ? 'fel' : 'fel'}
              </span>
            </div>
          )}
          {warningCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
              <span className="text-sm text-amber-700">
                {warningCount} {warningCount === 1 ? 'varning' : 'varningar'}
              </span>
            </div>
          )}
          {unresolvedCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
              <BoltIcon className="h-5 w-5 text-red-500" />
              <span className="text-sm text-red-700">
                {t('unresolvedWarning', { count: unresolvedCount })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-200 border border-blue-300" />
          <span>{t('legend.phase')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-200 border border-emerald-300" />
          <span>{t('legend.step')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-200 border border-amber-300" />
          <span>{t('legend.artifact')}</span>
        </div>
        <span className="text-muted-foreground/50">|</span>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-green-500" />
          <span>{t('legend.unlocks')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-blue-500" />
          <span>{t('legend.reveals')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-2 border-red-500 bg-red-50" />
          <span>{t('legend.error')}</span>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div ref={canvasRef} className="relative">
        <Card className="overflow-hidden" style={{ height: 600 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneContextMenu={onPaneContextMenu}
            onPaneClick={() => setContextMenu(null)}
            nodeTypes={flowNodeTypes}
            edgeTypes={flowEdgeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={2}
            attributionPosition="bottom-left"
            proOptions={{ hideAttribution: true }}
            // Multi-select with shift/ctrl
            selectionOnDrag
          selectionMode={SelectionMode.Partial}
          selectNodesOnDrag={false}
          // Snap to grid
          snapToGrid
          snapGrid={[20, 20]}
          // Zoom to cursor for better UX
          zoomOnScroll
          zoomOnPinch
          zoomOnDoubleClick
        >
          <Background color="#e5e7eb" gap={20} />
          <Controls
            showInteractive={false}
            className="!bg-white !border !border-border !rounded-lg !shadow-sm"
          />
          <MiniMap
            nodeColor={(node) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const data = (node as any).data as FlowNodeData | undefined;
              if (!data) return '#6b7280';
              // Show validation colors in minimap
              if ('validation' in data && data.validation) {
                if (data.validation.hasErrors) return '#ef4444'; // red-500
                if (data.validation.hasWarnings) return '#f59e0b'; // amber-500
              }
              switch (data.type) {
                case 'phase':
                  return '#93c5fd'; // blue-300
                case 'step':
                  return '#6ee7b7'; // emerald-300
                case 'artifact':
                  return '#fcd34d'; // amber-300
                default:
                  return '#d1d5db'; // gray-300
              }
            }}
            className="!bg-white !border !border-border !rounded-lg"
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        </ReactFlow>

        {/* Context Menu */}
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            onAddPhase={handleAddPhase}
            onAddStep={handleAddStep}
            onAddArtifact={handleAddArtifact}
            onAddTrigger={handleAddTrigger}
          />
        )}
        </Card>
      </div>

      {/* Triggers quick access */}
      {state.triggers.length > 0 && (
        <div className="pt-4 border-t border-border">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            {t('triggersSection', { count: state.triggers.length })}
          </h3>
          <div className="flex flex-wrap gap-2">
            {state.triggers.slice(0, 8).map((trigger) => (
              <Button
                key={trigger.id}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => onNavigate('triggers', trigger.id)}
              >
                <BoltIcon className="h-3 w-3 mr-1" />
                {trigger.name}
                {!trigger.enabled && (
                  <span className="ml-1 text-muted-foreground">(off)</span>
                )}
              </Button>
            ))}
            {state.triggers.length > 8 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => onNavigate('triggers')}
              >
                +{state.triggers.length - 8} {t('more')}
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// ============================================================================
// Exported Component with Provider
// ============================================================================

export function GameFlowCanvas(props: GameFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <GameFlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
