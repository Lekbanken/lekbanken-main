/**
 * Custom Flow Nodes for Game Builder Overview
 *
 * These are React Flow custom node components for visualizing game structure.
 */

'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';
import {
  ClockIcon,
  ListBulletIcon,
  PlayIcon,
  FlagIcon,
  PauseIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import type { PhaseNodeData, StepNodeData, ArtifactNodeData, NodeValidation } from './useGameFlowGraph';

// ============================================================================
// Validation Indicator Component
// ============================================================================

function ValidationIndicator({ validation }: { validation: NodeValidation }) {
  if (!validation.hasErrors && !validation.hasWarnings) return null;

  const totalIssues = validation.errors.length + validation.warnings.length;

  return (
    <div
      className={cn(
        'absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 rounded-full text-white text-xs font-bold z-10',
        validation.hasErrors ? 'bg-red-500' : 'bg-amber-500'
      )}
      title={
        validation.hasErrors
          ? `${validation.errors.length} fel`
          : `${validation.warnings.length} varningar`
      }
    >
      {totalIssues > 9 ? '9+' : totalIssues}
    </div>
  );
}

// ============================================================================
// Phase Node
// ============================================================================

interface PhaseNodeProps {
  data: PhaseNodeData;
  selected: boolean;
}

function PhaseNodeComponent({ data, selected }: PhaseNodeProps) {
  const { phase, label, phaseIndex: _phaseIndex, stepCount, validation } = data;

  const isOrphan = phase.id === 'orphan';

  // Render the appropriate icon based on phase type
  const renderPhaseIcon = () => {
    const iconClass = cn('h-5 w-5', isOrphan ? 'text-gray-500' : 'text-blue-600');
    switch (phase.phase_type) {
      case 'intro':
        return <PlayIcon className={iconClass} />;
      case 'round':
        return <ArrowPathIcon className={iconClass} />;
      case 'finale':
        return <FlagIcon className={iconClass} />;
      case 'break':
        return <PauseIcon className={iconClass} />;
      default:
        return <ClockIcon className={iconClass} />;
    }
  };

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 bg-gradient-to-b transition-all',
        selected ? 'ring-2 ring-primary ring-offset-2' : '',
        // Validation styling takes precedence
        validation?.hasErrors
          ? 'border-red-500 from-red-50 to-red-100'
          : validation?.hasWarnings
            ? 'border-amber-400 from-amber-50 to-amber-100'
            : isOrphan
              ? 'border-dashed border-gray-300 from-gray-50 to-gray-100'
              : 'border-blue-300 from-blue-50 to-blue-100'
      )}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Validation indicator */}
      {validation && <ValidationIndicator validation={validation} />}

      {/* Phase Header */}
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-3 border-b rounded-t-xl',
          isOrphan ? 'border-gray-200 bg-gray-100' : 'border-blue-200 bg-blue-100'
        )}
      >
        {renderPhaseIcon()}
        <div className="flex-1 min-w-0">
          <div className={cn('font-semibold text-sm truncate', isOrphan ? 'text-gray-600' : 'text-blue-800')}>
            {label}
          </div>
          {!isOrphan && (
            <div className="text-xs text-blue-600">
              {phase.phase_type}
              {phase.duration_seconds ? ` · ${Math.round(phase.duration_seconds / 60)} min` : ''}
            </div>
          )}
        </div>
        {stepCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <ListBulletIcon className="h-3 w-3" />
            {stepCount}
          </div>
        )}
      </div>

      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white"
      />
    </div>
  );
}

export const PhaseNode = memo(PhaseNodeComponent);

// ============================================================================
// Step Node
// ============================================================================

interface StepNodeProps {
  data: StepNodeData;
  selected: boolean;
}

function StepNodeComponent({ data, selected }: StepNodeProps) {
  const { step, label, stepIndex, validation } = data;

  return (
    <div
      className={cn(
        'relative px-3 py-2 rounded-lg border bg-white transition-all cursor-pointer',
        // Validation styling takes precedence
        validation?.hasErrors
          ? 'border-red-500 bg-red-50'
          : validation?.hasWarnings
            ? 'border-amber-400 bg-amber-50'
            : selected
              ? 'border-emerald-500 ring-2 ring-emerald-200'
              : 'border-emerald-200 hover:border-emerald-400 hover:shadow-sm'
      )}
    >
      {/* Validation indicator */}
      {validation && <ValidationIndicator validation={validation} />}
      
      <div className="flex items-center gap-2">
        <span className={cn(
          'flex-shrink-0 w-5 h-5 rounded-full text-xs font-medium flex items-center justify-center',
          validation?.hasErrors
            ? 'bg-red-100 text-red-700'
            : validation?.hasWarnings
              ? 'bg-amber-100 text-amber-700'
              : 'bg-emerald-100 text-emerald-700'
        )}>
          {stepIndex + 1}
        </span>
        <span className="text-sm text-gray-700 truncate flex-1">{label}</span>
        {step.duration_seconds && (
          <span className="text-xs text-muted-foreground">{Math.round(step.duration_seconds / 60)}m</span>
        )}
      </div>

      {/* Connection handles for trigger edges */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-emerald-400 !border !border-white !-left-1"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-emerald-400 !border !border-white !-right-1"
      />
    </div>
  );
}

export const StepNode = memo(StepNodeComponent);

// ============================================================================
// Artifact Node
// ============================================================================

interface ArtifactNodeProps {
  data: ArtifactNodeData;
  selected: boolean;
}

function ArtifactNodeComponent({ data, selected }: ArtifactNodeProps) {
  const { artifact, label, validation } = data;

  // Get artifact type icon/color
  const getArtifactStyle = () => {
    switch (artifact.artifact_type) {
      case 'keypad':
        return { icon: '🔐', color: 'amber' };
      case 'riddle':
        return { icon: '❓', color: 'purple' };
      case 'document':
        return { icon: '📄', color: 'slate' };
      case 'image':
        return { icon: '🖼️', color: 'pink' };
      case 'audio':
        return { icon: '🔊', color: 'cyan' };
      case 'card':
        return { icon: '🃏', color: 'orange' };
      case 'conversationCards':
        return { icon: '💬', color: 'teal' };
      case 'hotspot':
        return { icon: '📍', color: 'rose' };
      default:
        return { icon: '📦', color: 'gray' };
    }
  };

  const style = getArtifactStyle();

  return (
    <div
      className={cn(
        'relative px-3 py-2 rounded-lg border bg-white transition-all cursor-pointer',
        // Validation styling takes precedence
        validation?.hasErrors
          ? 'border-red-500 bg-red-50'
          : validation?.hasWarnings
            ? 'border-amber-400 bg-amber-50'
            : selected
              ? 'border-amber-500 ring-2 ring-amber-200'
              : 'border-amber-200 hover:border-amber-400 hover:shadow-sm'
      )}
    >
      {/* Validation indicator */}
      {validation && <ValidationIndicator validation={validation} />}
      
      <div className="flex items-center gap-2">
        <span className="text-lg">{style.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-700 truncate">{label}</div>
          <div className="text-xs text-muted-foreground">{artifact.artifact_type}</div>
        </div>
      </div>

      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-amber-400 !border !border-white !-top-1"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-amber-400 !border !border-white !-bottom-1"
      />
    </div>
  );
}

export const ArtifactNode = memo(ArtifactNodeComponent);

// ============================================================================
// Node Types Export
// ============================================================================

export const flowNodeTypes = {
  phaseNode: PhaseNode,
  stepNode: StepNode,
  artifactNode: ArtifactNode,
};
