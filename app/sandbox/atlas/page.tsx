'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { SandboxShell } from '../components/shell/SandboxShellV2';
import { atlasRegistry } from './registry';
import { AtlasToolbar } from './components/AtlasToolbar';
import { AtlasFilters } from './components/AtlasFilters';
import { AtlasCanvas, type AtlasCanvasNode } from './components/AtlasCanvas';
import { AtlasInspector } from './components/AtlasInspector';
import {
  createDefaultReviewFlags,
  getReviewStatus,
  reviewStatusOrder,
  type AtlasEdgeRelation,
  type AtlasEntity,
  type AtlasFrameWithReview,
  type AtlasMode,
  type AtlasNodeType,
} from './types';
import { useAtlasStore } from './store/atlas-store';

const nodeLimit = 150;

const modeConfig: Record<AtlasMode, { nodeTypes: AtlasNodeType[]; relations: AtlasEdgeRelation[] }> = {
  ux: { nodeTypes: ['frame', 'component'], relations: ['uses', 'navigates'] },
  data: { nodeTypes: ['frame', 'endpoint', 'table'], relations: ['reads', 'writes', 'calls', 'emits'] },
  quality: { nodeTypes: ['frame'], relations: ['navigates'] },
};

const getNodeKey = (type: AtlasNodeType, id: string) => `${type}:${id}`;

function buildSearchText(value: string | undefined | null) {
  return value ? value.toLowerCase() : '';
}

export default function AtlasPage() {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const {
    mode,
    setMode,
    searchQuery,
    setSearchQuery,
    filters,
    toggleDomain,
    toggleRole,
    toggleStatus,
    setRouteFilter,
    setTableFilter,
    clearFilters,
    selection,
    selectNode,
    clearSelection,
    reviewByFrameId,
    lastSystemSyncAt,
    systemSyncSource,
    toggleReviewFlag,
    markReviewed,
    setNotes,
    syncSystemMap,
  } = useAtlasStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          (target as HTMLElement).isContentEditable);
      if (isTyping) return;

      if (event.key === '/') {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }

      if (event.key === 'Escape') {
        clearSelection();
      }

      if (event.key === '?') {
        event.preventDefault();
        setHelpOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearSelection]);

  const framesWithReview = useMemo<AtlasFrameWithReview[]>(() => {
    return atlasRegistry.frames.map((frame) => {
      const stored = reviewByFrameId[frame.id];
      const reviewFlags = stored?.reviewFlags ?? frame.reviewFlags ?? createDefaultReviewFlags();
      const reviewStatus = getReviewStatus(reviewFlags);
      return {
        ...frame,
        reviewFlags,
        reviewStatus,
        lastReviewedAt: stored?.lastReviewedAt ?? frame.lastReviewedAt,
        notes: stored?.notes ?? frame.notes,
      };
    });
  }, [reviewByFrameId]);

  const filteredFrames = useMemo(() => {
    return framesWithReview.filter((frame) => {
      const domainMatch =
        filters.domains.length === 0 || filters.domains.includes(frame.domain);
      const roleMatch =
        filters.roles.length === 0 || frame.roles.some((role) => filters.roles.includes(role));
      const statusMatch =
        filters.statuses.length === 0 || filters.statuses.includes(frame.reviewStatus);
      const routeMatch = !filters.route || frame.route === filters.route;
      const tableMatch =
        !filters.table || frame.reads.includes(filters.table) || frame.writes.includes(filters.table);

      return domainMatch && roleMatch && statusMatch && routeMatch && tableMatch;
    });
  }, [filters, framesWithReview]);

  const derivedNodes = useMemo(() => {
    const componentIds = new Set<string>();
    const tableIds = new Set<string>();
    const endpointIds = new Set<string>();

    filteredFrames.forEach((frame) => {
      frame.components.forEach((componentId) => componentIds.add(componentId));
      frame.reads.forEach((tableId) => tableIds.add(tableId));
      frame.writes.forEach((tableId) => tableIds.add(tableId));
      frame.endpoints.forEach((endpointId) => endpointIds.add(endpointId));
    });

    const frameNodes: AtlasCanvasNode[] = filteredFrames.map((frame) => ({
      id: frame.id,
      type: 'frame',
      label: frame.name,
      subtitle: frame.route,
      reviewStatus: frame.reviewStatus,
      searchText: [
        frame.name,
        frame.route,
        frame.id,
        frame.fileRef ?? '',
        frame.tags.join(' '),
      ]
        .join(' ')
        .toLowerCase(),
    }));

    const componentNodes: AtlasCanvasNode[] = atlasRegistry.components
      .filter((component) => componentIds.has(component.id))
      .map((component) => ({
        id: component.id,
        type: 'component',
        label: component.name,
        subtitle: component.fileRef,
        searchText: [component.name, component.id, component.fileRef ?? ''].join(' ').toLowerCase(),
      }));

    const endpointNodes: AtlasCanvasNode[] = atlasRegistry.endpoints
      .filter((endpoint) => endpointIds.has(endpoint.id))
      .map((endpoint) => ({
        id: endpoint.id,
        type: 'endpoint',
        label: endpoint.path,
        subtitle: endpoint.method ?? 'GET',
        searchText: [
          endpoint.path,
          endpoint.method ?? '',
          endpoint.id,
          endpoint.fileRef ?? '',
        ]
          .join(' ')
          .toLowerCase(),
      }));

    const tableNodes: AtlasCanvasNode[] = atlasRegistry.tables
      .filter((table) => tableIds.has(table.id))
      .map((table) => ({
        id: table.id,
        type: 'table',
        label: table.name,
        subtitle: table.schema ?? 'public',
        searchText: [table.name, table.id, table.schema ?? ''].join(' ').toLowerCase(),
      }));

    return {
      frameNodes,
      componentNodes,
      endpointNodes,
      tableNodes,
    };
  }, [filteredFrames]);

  const { nodes, edges } = useMemo(() => {
    const modeSettings = modeConfig[mode];

    const allNodes = [
      ...derivedNodes.frameNodes,
      ...derivedNodes.componentNodes,
      ...derivedNodes.endpointNodes,
      ...derivedNodes.tableNodes,
    ].filter((node) => modeSettings.nodeTypes.includes(node.type));

    const nodeKeys = new Set(allNodes.map((node) => getNodeKey(node.type, node.id)));
    const baseEdges = atlasRegistry.edges.filter(
      (edge) =>
        modeSettings.relations.includes(edge.relation) &&
        nodeKeys.has(getNodeKey(edge.fromType, edge.fromId)) &&
        nodeKeys.has(getNodeKey(edge.toType, edge.toId))
    );

    const query = buildSearchText(searchQuery.trim());
    if (!query) {
      return { nodes: allNodes, edges: baseEdges };
    }

    const matchingKeys = new Set(
      allNodes
        .filter((node) => node.searchText?.includes(query))
        .map((node) => getNodeKey(node.type, node.id))
    );

    if (matchingKeys.size === 0) {
      return { nodes: [], edges: [] };
    }

    const connectedKeys = new Set(matchingKeys);
    baseEdges.forEach((edge) => {
      const fromKey = getNodeKey(edge.fromType, edge.fromId);
      const toKey = getNodeKey(edge.toType, edge.toId);
      if (matchingKeys.has(fromKey) || matchingKeys.has(toKey)) {
        connectedKeys.add(fromKey);
        connectedKeys.add(toKey);
      }
    });

    const filteredNodes = allNodes.filter((node) =>
      connectedKeys.has(getNodeKey(node.type, node.id))
    );
    const filteredEdges = baseEdges.filter(
      (edge) =>
        connectedKeys.has(getNodeKey(edge.fromType, edge.fromId)) &&
        connectedKeys.has(getNodeKey(edge.toType, edge.toId))
    );

    return { nodes: filteredNodes, edges: filteredEdges };
  }, [derivedNodes, mode, searchQuery]);

  const sortedNodes = useMemo(() => {
    const typeOrder: Record<AtlasNodeType, number> = {
      frame: 0,
      component: 1,
      endpoint: 2,
      table: 3,
    };

    return [...nodes].sort((a, b) => {
      if (a.type === 'frame' && b.type === 'frame') {
        const aRank = reviewStatusOrder[a.reviewStatus ?? 'missing'] ?? 0;
        const bRank = reviewStatusOrder[b.reviewStatus ?? 'missing'] ?? 0;
        if (aRank !== bRank) return aRank - bRank;
      }
      if (a.type !== b.type) {
        return typeOrder[a.type] - typeOrder[b.type];
      }
      return a.label.localeCompare(b.label);
    });
  }, [nodes]);

  const isCapped = sortedNodes.length > nodeLimit;
  const cappedNodes = isCapped ? sortedNodes.slice(0, nodeLimit) : sortedNodes;
  const cappedKeys = useMemo(
    () => new Set(cappedNodes.map((node) => getNodeKey(node.type, node.id))),
    [cappedNodes]
  );
  const cappedEdges = useMemo(
    () =>
      edges.filter(
        (edge) =>
          cappedKeys.has(getNodeKey(edge.fromType, edge.fromId)) &&
          cappedKeys.has(getNodeKey(edge.toType, edge.toId))
      ),
    [cappedKeys, edges]
  );

  useEffect(() => {
    if (!selection) return;
    const selectionKey = getNodeKey(selection.type, selection.id);
    if (!cappedKeys.has(selectionKey)) {
      clearSelection();
    }
  }, [cappedKeys, clearSelection, selection]);

  const entityLookup = useMemo<Record<string, AtlasEntity>>(() => {
    const lookup: Record<string, AtlasEntity> = {};

    framesWithReview.forEach((frame) => {
      lookup[getNodeKey('frame', frame.id)] = { ...frame, type: 'frame' };
    });

    atlasRegistry.components.forEach((component) => {
      lookup[getNodeKey('component', component.id)] = { ...component, type: 'component' };
    });

    atlasRegistry.tables.forEach((table) => {
      lookup[getNodeKey('table', table.id)] = { ...table, type: 'table' };
    });

    atlasRegistry.endpoints.forEach((endpoint) => {
      lookup[getNodeKey('endpoint', endpoint.id)] = { ...endpoint, type: 'endpoint' };
    });

    return lookup;
  }, [framesWithReview]);

  const routeOptions = useMemo(() => {
    return [...new Set(atlasRegistry.frames.map((frame) => frame.route))].sort();
  }, []);

  const tableOptions = useMemo(() => {
    return [...atlasRegistry.tables]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((table) => ({ id: table.id, name: table.name }));
  }, []);

  return (
    <SandboxShell
      moduleId="atlas"
      title="Sandbox Atlas"
      description="Enterprise system map for routes, data, and components."
      contentWidth="full"
      contextTitle="Atlas Inspector"
      contextContent={
        <AtlasInspector
          selection={selection}
          nodeLookup={entityLookup}
          edges={atlasRegistry.edges}
          lastSystemSyncAt={lastSystemSyncAt}
          systemSyncSource={systemSyncSource}
          onToggleReviewFlag={toggleReviewFlag}
          onMarkReviewed={markReviewed}
          onSetNotes={setNotes}
        />
      }
    >
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <AtlasFilters
          filters={filters}
          routes={routeOptions}
          tables={tableOptions}
          onToggleDomain={toggleDomain}
          onToggleRole={toggleRole}
          onToggleStatus={toggleStatus}
          onRouteChange={setRouteFilter}
          onTableChange={setTableFilter}
          onClearFilters={clearFilters}
        />

        <div className="space-y-4">
          <AtlasToolbar
            mode={mode}
            onModeChange={setMode}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSync={syncSystemMap}
            lastSystemSyncAt={lastSystemSyncAt}
            helpOpen={helpOpen}
            onHelpOpenChange={setHelpOpen}
            searchInputRef={searchInputRef}
          />

          <AtlasCanvas
            nodes={cappedNodes}
            edges={cappedEdges}
            mode={mode}
            selection={selection}
            onSelectNode={selectNode}
            totalNodes={sortedNodes.length}
            isCapped={isCapped}
          />
        </div>
      </div>
    </SandboxShell>
  );
}
