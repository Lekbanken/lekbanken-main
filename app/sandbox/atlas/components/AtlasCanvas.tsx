'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { AtlasEdge, AtlasMode, AtlasNodeType, AtlasReviewStatus, AtlasSelection } from '../types';
import { reviewStatusOrder } from '../types';

export interface AtlasCanvasNode {
  id: string;
  type: AtlasNodeType;
  label: string;
  subtitle?: string;
  reviewStatus?: AtlasReviewStatus;
  searchText?: string;
}

interface AtlasCanvasProps {
  nodes: AtlasCanvasNode[];
  edges: AtlasEdge[];
  mode: AtlasMode;
  selection: AtlasSelection | null;
  onSelectNode: (selection: AtlasSelection) => void;
  totalNodes: number;
  isCapped: boolean;
}

const columnOrder: AtlasNodeType[] = ['frame', 'component', 'endpoint', 'table'];

const columnLabels: Record<AtlasNodeType, string> = {
  frame: 'Frames',
  component: 'Components',
  endpoint: 'Endpoints',
  table: 'Tables',
};

const layoutConfig = {
  columnWidth: 220,
  columnGap: 90,
  rowHeight: 72,
  rowGap: 22,
  paddingX: 24,
  paddingY: 32,
  headerHeight: 20,
};

function getReviewBorderColor(status?: AtlasReviewStatus) {
  if (!status) return 'hsl(var(--border))';
  if (status === 'complete') return 'var(--success)';
  if (status === 'partial') return 'var(--warning)';
  return 'var(--destructive)';
}

export function AtlasCanvas({
  nodes,
  edges,
  mode,
  selection,
  onSelectNode,
  totalNodes,
  isCapped,
}: AtlasCanvasProps) {
  const layout = useMemo(() => {
    const nodesByType = columnOrder.reduce<Record<AtlasNodeType, AtlasCanvasNode[]>>(
      (acc, type) => {
        acc[type] = [];
        return acc;
      },
      {
        frame: [],
        component: [],
        endpoint: [],
        table: [],
      }
    );

    nodes.forEach((node) => {
      nodesByType[node.type].push(node);
    });

    const activeTypes = columnOrder.filter((type) => nodesByType[type].length > 0);
    const columns: AtlasNodeType[] = activeTypes.length > 0 ? activeTypes : ['frame'];

    const columnIndex = new Map<AtlasNodeType, number>();
    columns.forEach((type, index) => columnIndex.set(type as AtlasNodeType, index));

    const sortedByType: Record<AtlasNodeType, AtlasCanvasNode[]> = {
      frame: [...nodesByType.frame].sort((a, b) => {
        const aRank = reviewStatusOrder[a.reviewStatus ?? 'missing'] ?? 0;
        const bRank = reviewStatusOrder[b.reviewStatus ?? 'missing'] ?? 0;
        if (aRank !== bRank) return aRank - bRank;
        return a.label.localeCompare(b.label);
      }),
      component: [...nodesByType.component].sort((a, b) => a.label.localeCompare(b.label)),
      endpoint: [...nodesByType.endpoint].sort((a, b) => a.label.localeCompare(b.label)),
      table: [...nodesByType.table].sort((a, b) => a.label.localeCompare(b.label)),
    };

    const positionedNodes = new Map<
      string,
      AtlasCanvasNode & { x: number; y: number; width: number; height: number; column: number }
    >();

    let maxRows = 0;

    columnOrder.forEach((type) => {
      const column = columnIndex.get(type);
      if (column === undefined) return;
      const columnNodes = sortedByType[type];
      maxRows = Math.max(maxRows, columnNodes.length);

      columnNodes.forEach((node, index) => {
        const x =
          layoutConfig.paddingX +
          column * (layoutConfig.columnWidth + layoutConfig.columnGap);
        const y =
          layoutConfig.paddingY +
          layoutConfig.headerHeight +
          index * (layoutConfig.rowHeight + layoutConfig.rowGap);

        positionedNodes.set(`${node.type}:${node.id}`, {
          ...node,
          x,
          y,
          width: layoutConfig.columnWidth,
          height: layoutConfig.rowHeight,
          column,
        });
      });
    });

    const width =
      layoutConfig.paddingX * 2 +
      columns.length * layoutConfig.columnWidth +
      Math.max(0, columns.length - 1) * layoutConfig.columnGap;
    const height =
      layoutConfig.paddingY * 2 +
      layoutConfig.headerHeight +
      Math.max(1, maxRows) * (layoutConfig.rowHeight + layoutConfig.rowGap);

    return {
      positionedNodes,
      width,
      height,
      columns,
    };
  }, [nodes]);

  const edgePaths = useMemo(() => {
    return edges
      .map((edge) => {
        const fromKey = `${edge.fromType}:${edge.fromId}`;
        const toKey = `${edge.toType}:${edge.toId}`;
        const from = layout.positionedNodes.get(fromKey);
        const to = layout.positionedNodes.get(toKey);
        if (!from || !to) return null;

        const startX = from.x + (to.column >= from.column ? from.width : 0);
        const endX = to.x + (to.column >= from.column ? 0 : to.width);
        const startY = from.y + from.height / 2;
        const endY = to.y + to.height / 2;
        const curve = Math.max(40, Math.abs(endX - startX) * 0.4);
        const controlX1 = startX + (to.column >= from.column ? curve : -curve);
        const controlX2 = endX + (to.column >= from.column ? -curve : curve);
        const d = `M ${startX} ${startY} C ${controlX1} ${startY}, ${controlX2} ${endY}, ${endX} ${endY}`;

        return { key: `${fromKey}:${toKey}:${edge.relation}`, d, fromKey, toKey };
      })
      .filter((edge): edge is { key: string; d: string; fromKey: string; toKey: string } => Boolean(edge));
  }, [edges, layout.positionedNodes]);

  const selectedKey = selection ? `${selection.type}:${selection.id}` : null;

  if (nodes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-10 text-center text-sm text-muted-foreground">
        No nodes match the current filters.
      </div>
    );
  }

  return (
    <div className="relative overflow-auto rounded-lg border border-border bg-muted/10">
      <div
        className="relative"
        style={{ minWidth: layout.width, minHeight: layout.height }}
      >
        <svg
          width={layout.width}
          height={layout.height}
          className="absolute inset-0"
          role="presentation"
        >
          {edgePaths.map((edge) => {
            const isActive = selectedKey && (edge.fromKey === selectedKey || edge.toKey === selectedKey);
            return (
              <path
                key={edge.key}
                d={edge.d}
                fill="none"
                stroke={isActive ? 'hsl(var(--foreground))' : 'hsl(var(--border))'}
                strokeWidth={isActive ? 2 : 1.2}
                opacity={isActive ? 0.9 : 0.6}
              />
            );
          })}
        </svg>

        {layout.columns.map((type) => {
          const columnIndex = layout.columns.indexOf(type);
          const x =
            layoutConfig.paddingX +
            columnIndex * (layoutConfig.columnWidth + layoutConfig.columnGap);
          return (
            <div
              key={type}
              className="absolute top-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
              style={{ left: x }}
            >
              {columnLabels[type]}
            </div>
          );
        })}

        {Array.from(layout.positionedNodes.values()).map((node) => {
          const isSelected = selectedKey === `${node.type}:${node.id}`;
          const borderColor =
            mode === 'quality' && node.type === 'frame'
              ? getReviewBorderColor(node.reviewStatus)
              : 'hsl(var(--border))';

          return (
            <button
              key={`${node.type}:${node.id}`}
              type="button"
              className={cn(
                'absolute rounded-lg border bg-background p-3 text-left text-sm shadow-sm transition',
                'hover:border-foreground/30 hover:shadow-md',
                isSelected && 'ring-2 ring-primary'
              )}
              style={{
                left: node.x,
                top: node.y,
                width: node.width,
                height: node.height,
                borderColor,
              }}
              onClick={() => onSelectNode({ type: node.type, id: node.id })}
            >
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {node.type}
              </div>
              <div className="mt-1 font-semibold text-foreground">{node.label}</div>
              {node.subtitle && (
                <div className="mt-1 text-xs text-muted-foreground">{node.subtitle}</div>
              )}
            </button>
          );
        })}

        {isCapped && (
          <div className="absolute right-4 top-4 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm">
            Showing {nodes.length} of {totalNodes} nodes. Add filters to narrow the view.
          </div>
        )}
      </div>
    </div>
  );
}
