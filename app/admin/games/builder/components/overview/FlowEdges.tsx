/**
 * Custom Flow Edges for Game Builder Overview
 *
 * Custom edge component for trigger relationships.
 */

'use client';

import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type Position,
} from '@xyflow/react';
import { ExclamationTriangleIcon, BoltIcon } from '@heroicons/react/24/outline';
import type { TriggerEdgeData } from './useGameFlowGraph';

// ============================================================================
// Trigger Edge
// ============================================================================

interface TriggerEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  data?: TriggerEdgeData;
  style?: React.CSSProperties;
  markerEnd?: string;
}

function TriggerEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
  markerEnd,
}: TriggerEdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeColor = data?.unresolved ? '#ef4444' : (style?.stroke as string) || '#6b7280';

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: edgeColor,
          strokeWidth: 2,
        }}
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          {data?.unresolved ? (
            <div className="flex items-center justify-center w-5 h-5 bg-red-100 rounded-full border border-red-300">
              <ExclamationTriangleIcon className="h-3 w-3 text-red-500" />
            </div>
          ) : (
            <div
              className="flex items-center justify-center w-5 h-5 rounded-full border"
              style={{
                backgroundColor: `${edgeColor}20`,
                borderColor: edgeColor,
              }}
            >
              <BoltIcon className="h-3 w-3" style={{ color: edgeColor }} />
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const TriggerEdge = memo(TriggerEdgeComponent);

// ============================================================================
// Edge Types Export
// ============================================================================

export const flowEdgeTypes = {
  triggerEdge: TriggerEdge,
};
