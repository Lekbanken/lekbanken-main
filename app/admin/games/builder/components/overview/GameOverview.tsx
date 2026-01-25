'use client';

import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Card, Button } from '@/components/ui';
import {
  ArrowRightIcon,
  ExclamationTriangleIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ClockIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import type { GameBuilderState, StepData, PhaseData } from '@/types/game-builder-state';
import type { ArtifactFormData } from '@/types/games';
import {
  deriveOverviewGraph,
  getNodeColor,
  getEdgeColor,
  type OverviewEdge,
} from './deriveOverviewGraph';
import type { BuilderSection } from '../BuilderSectionNav';

// ============================================================================
// Types
// ============================================================================

interface GameOverviewProps {
  state: GameBuilderState;
  onNavigate: (section: BuilderSection, entityId?: string) => void;
}

interface NodePosition {
  nodeId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================================================
// Helper Components
// ============================================================================

function PhaseContainer({
  phase,
  steps,
  phaseIndex,
  onPhaseClick,
  onStepClick,
  registerNode,
}: {
  phase: PhaseData;
  steps: StepData[];
  phaseIndex: number;
  onPhaseClick: () => void;
  onStepClick: (step: StepData) => void;
  registerNode: (nodeId: string, el: HTMLElement | null) => void;
}) {
  const t = useTranslations('admin.games.builder.overview');
  const colors = getNodeColor('phase');

  return (
    <div
      ref={(el) => registerNode(`phase-${phase.id}`, el)}
      className={cn(
        'flex flex-col min-w-[220px] max-w-[280px] rounded-xl border-2 transition-shadow hover:shadow-md cursor-pointer',
        colors.bg,
        colors.border
      )}
      onClick={(e) => {
        e.stopPropagation();
        onPhaseClick();
      }}
    >
      {/* Phase header */}
      <div className={cn('px-4 py-3 border-b', colors.border)}>
        <div className="flex items-center gap-2">
          <ClockIcon className="h-4 w-4 text-blue-500" />
          <span className={cn('font-semibold text-sm', colors.text)}>
            {phase.name || `${t('phaseLabel')} ${phaseIndex + 1}`}
          </span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {phase.phase_type} {phase.duration_seconds ? `· ${Math.round(phase.duration_seconds / 60)} min` : ''}
        </div>
      </div>

      {/* Steps inside phase */}
      <div className="p-3 flex flex-col gap-2">
        {steps.length === 0 ? (
          <div className="text-xs text-muted-foreground italic py-2 text-center">
            {t('noSteps')}
          </div>
        ) : (
          steps.map((step, idx) => (
            <StepNode
              key={step.id}
              step={step}
              index={idx}
              onClick={() => onStepClick(step)}
              registerNode={registerNode}
            />
          ))
        )}
      </div>
    </div>
  );
}

function StepNode({
  step,
  index,
  onClick,
  registerNode,
}: {
  step: StepData;
  index: number;
  onClick: () => void;
  registerNode: (nodeId: string, el: HTMLElement | null) => void;
}) {
  const colors = getNodeColor('step');

  return (
    <div
      ref={(el) => registerNode(`step-${step.id}`, el)}
      className={cn(
        'px-3 py-2 rounded-lg border transition-all hover:shadow-sm cursor-pointer',
        colors.bg,
        colors.border,
        'hover:border-emerald-400'
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <div className="flex items-center gap-2">
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-200 text-emerald-700 text-xs font-medium flex items-center justify-center">
          {index + 1}
        </span>
        <span className={cn('text-sm truncate', colors.text)}>
          {step.title || `Steg ${index + 1}`}
        </span>
      </div>
    </div>
  );
}

function OrphanStepsContainer({
  steps,
  onStepClick,
  registerNode,
}: {
  steps: StepData[];
  onStepClick: (step: StepData) => void;
  registerNode: (nodeId: string, el: HTMLElement | null) => void;
}) {
  const t = useTranslations('admin.games.builder.overview');

  if (steps.length === 0) return null;

  return (
    <div className="flex flex-col min-w-[220px] max-w-[280px] rounded-xl border-2 border-dashed border-gray-300 bg-gray-50">
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <ListBulletIcon className="h-4 w-4 text-gray-500" />
          <span className="font-semibold text-sm text-gray-600">
            {t('orphanPhase')}
          </span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {t('orphanDescription')}
        </div>
      </div>

      <div className="p-3 flex flex-col gap-2">
        {steps.map((step, idx) => (
          <StepNode
            key={step.id}
            step={step}
            index={idx}
            onClick={() => onStepClick(step)}
            registerNode={registerNode}
          />
        ))}
      </div>
    </div>
  );
}

function ArtifactNode({
  artifact,
  index,
  onClick,
  registerNode,
}: {
  artifact: ArtifactFormData;
  index: number;
  onClick: () => void;
  registerNode: (nodeId: string, el: HTMLElement | null) => void;
}) {
  const colors = getNodeColor('artifact');

  return (
    <div
      ref={(el) => registerNode(`artifact-${artifact.id}`, el)}
      className={cn(
        'px-3 py-2 rounded-lg border transition-all hover:shadow-sm cursor-pointer flex items-center gap-2',
        colors.bg,
        colors.border,
        'hover:border-amber-400'
      )}
      onClick={onClick}
    >
      <Squares2X2Icon className="h-4 w-4 text-amber-500 flex-shrink-0" />
      <span className={cn('text-sm truncate', colors.text)}>
        {artifact.title || `Artifakt ${index + 1}`}
      </span>
      <span className="text-xs text-muted-foreground">
        ({artifact.artifact_type})
      </span>
    </div>
  );
}

function TriggerEdgeLabel({
  edge,
  positions,
}: {
  edge: OverviewEdge;
  positions: Map<string, NodePosition>;
}) {
  const sourcePos = positions.get(edge.source);
  const targetPos = positions.get(edge.target);

  if (!sourcePos || !targetPos) return null;

  // Calculate midpoint
  const midX = (sourcePos.x + sourcePos.width / 2 + targetPos.x + targetPos.width / 2) / 2;
  const midY = (sourcePos.y + sourcePos.height / 2 + targetPos.y + targetPos.height / 2) / 2;

  return (
    <g>
      {edge.unresolved && (
        <foreignObject x={midX - 10} y={midY - 10} width={20} height={20}>
          <div className="flex items-center justify-center w-5 h-5 bg-red-100 rounded-full">
            <ExclamationTriangleIcon className="h-3 w-3 text-red-500" />
          </div>
        </foreignObject>
      )}
    </g>
  );
}

// ============================================================================
// SVG Edge Rendering
// ============================================================================

function EdgesSvg({
  edges,
  positions,
  containerRef,
}: {
  edges: OverviewEdge[];
  positions: Map<string, NodePosition>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setSize({
          width: containerRef.current.scrollWidth,
          height: containerRef.current.scrollHeight,
        });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [containerRef]);

  // Only render trigger edges, not sequence edges (those are implied by layout)
  const triggerEdges = edges.filter((e) => e.triggerId);

  return (
    <svg
      className="absolute inset-0 pointer-events-none overflow-visible"
      width={size.width}
      height={size.height}
      style={{ zIndex: 0 }}
    >
      <defs>
        <marker
          id="arrowhead-unlocks"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
        </marker>
        <marker
          id="arrowhead-reveals"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
        </marker>
        <marker
          id="arrowhead-other"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#a855f7" />
        </marker>
        <marker
          id="arrowhead-unresolved"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
        </marker>
      </defs>

      {triggerEdges.map((edge) => {
        const sourcePos = positions.get(edge.source);
        const targetPos = positions.get(edge.target);

        if (!sourcePos || !targetPos) return null;

        // Calculate edge points (center to center with offset)
        const x1 = sourcePos.x + sourcePos.width / 2;
        const y1 = sourcePos.y + sourcePos.height;
        const x2 = targetPos.x + targetPos.width / 2;
        const y2 = targetPos.y;

        // Create a curved path
        const midY = (y1 + y2) / 2;
        const path = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

        const color = edge.unresolved ? '#ef4444' : getEdgeColor(edge.type);
        const markerId = edge.unresolved
          ? 'arrowhead-unresolved'
          : edge.type === 'unlocks'
            ? 'arrowhead-unlocks'
            : edge.type === 'reveals'
              ? 'arrowhead-reveals'
              : 'arrowhead-other';

        return (
          <g key={edge.id}>
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeDasharray={edge.unresolved ? '5,5' : undefined}
              markerEnd={`url(#${markerId})`}
              opacity={0.7}
            />
            <TriggerEdgeLabel edge={edge} positions={positions} />
          </g>
        );
      })}
    </svg>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function GameOverview({ state, onNavigate }: GameOverviewProps) {
  const t = useTranslations('admin.games.builder.overview');
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodePositions, setNodePositions] = useState<Map<string, NodePosition>>(new Map());

  // Derive graph
  const graph = useMemo(() => deriveOverviewGraph(state), [state]);

  // Register node positions for edge rendering
  const registerNode = useCallback((nodeId: string, el: HTMLElement | null) => {
    if (!el || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const nodeRect = el.getBoundingClientRect();

    setNodePositions((prev) => {
      const next = new Map(prev);
      next.set(nodeId, {
        nodeId,
        x: nodeRect.left - containerRect.left + containerRef.current!.scrollLeft,
        y: nodeRect.top - containerRect.top + containerRef.current!.scrollTop,
        width: nodeRect.width,
        height: nodeRect.height,
      });
      return next;
    });
  }, []);

  // Recalculate positions on scroll/resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const recalcPositions = () => {
      // Force recalculation by clearing and rebuilding
      setNodePositions(new Map());
    };

    const observer = new ResizeObserver(recalcPositions);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  // Navigation handlers
  const handlePhaseClick = useCallback(
    (phase: PhaseData) => {
      onNavigate('faser', phase.id);
    },
    [onNavigate]
  );

  const handleStepClick = useCallback(
    (step: StepData) => {
      onNavigate('steg', step.id);
    },
    [onNavigate]
  );

  const handleArtifactClick = useCallback(
    (artifact: ArtifactFormData) => {
      onNavigate('artifacts', artifact.id);
    },
    [onNavigate]
  );

  // Get orphan steps
  const orphanSteps = graph.stepsByPhase.get('orphan') || [];

  // Count unresolved edges
  const unresolvedCount = graph.edges.filter((e) => e.unresolved).length;

  // Empty state
  if (graph.phases.length === 0 && state.steps.length === 0 && state.artifacts.length === 0) {
    return (
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-1">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>

        <Card className="p-8 flex flex-col items-center justify-center text-center">
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
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>

      {/* Validation warnings */}
      {unresolvedCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
          <span className="text-sm text-red-700">
            {t('unresolvedWarning', { count: unresolvedCount })}
          </span>
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
        <div className="flex items-center gap-1.5">
          <ArrowRightIcon className="h-3 w-3 text-green-500" />
          <span>{t('legend.unlocks')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ArrowRightIcon className="h-3 w-3 text-blue-500" />
          <span>{t('legend.reveals')}</span>
        </div>
      </div>

      {/* Main canvas */}
      <Card className="relative overflow-auto p-6 min-h-[400px]">
        <div ref={containerRef} className="relative">
          {/* Edges SVG layer */}
          <EdgesSvg
            edges={graph.edges}
            positions={nodePositions}
            containerRef={containerRef}
          />

          {/* Phases row */}
          <div className="flex gap-6 flex-wrap relative z-10">
            {/* Orphan steps first if any */}
            <OrphanStepsContainer
              steps={orphanSteps}
              onStepClick={handleStepClick}
              registerNode={registerNode}
            />

            {/* Phase containers */}
            {graph.phases.map((phase, idx) => {
              const phaseSteps = graph.stepsByPhase.get(phase.id) || [];
              return (
                <PhaseContainer
                  key={phase.id}
                  phase={phase}
                  steps={phaseSteps}
                  phaseIndex={idx}
                  onPhaseClick={() => handlePhaseClick(phase)}
                  onStepClick={handleStepClick}
                  registerNode={registerNode}
                />
              );
            })}
          </div>

          {/* Artifacts section */}
          {state.artifacts.length > 0 && (
            <div className="mt-8 pt-6 border-t border-border">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {t('artifactsSection')}
              </h3>
              <div className="flex flex-wrap gap-3">
                {state.artifacts.map((artifact, idx) => (
                  <ArtifactNode
                    key={artifact.id}
                    artifact={artifact}
                    index={idx}
                    onClick={() => handleArtifactClick(artifact)}
                    registerNode={registerNode}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Triggers summary */}
          {state.triggers.length > 0 && (
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {t('triggersSection', { count: state.triggers.length })}
              </h3>
              <div className="flex flex-wrap gap-2">
                {state.triggers.slice(0, 5).map((trigger) => (
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
                {state.triggers.length > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => onNavigate('triggers')}
                  >
                    +{state.triggers.length - 5} {t('more')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="px-4 py-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold text-foreground">{graph.phases.length}</div>
          <div className="text-xs text-muted-foreground">{t('stats.phases')}</div>
        </div>
        <div className="px-4 py-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold text-foreground">{state.steps.length}</div>
          <div className="text-xs text-muted-foreground">{t('stats.steps')}</div>
        </div>
        <div className="px-4 py-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold text-foreground">{state.artifacts.length}</div>
          <div className="text-xs text-muted-foreground">{t('stats.artifacts')}</div>
        </div>
        <div className="px-4 py-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold text-foreground">{state.triggers.length}</div>
          <div className="text-xs text-muted-foreground">{t('stats.triggers')}</div>
        </div>
      </div>
    </section>
  );
}
