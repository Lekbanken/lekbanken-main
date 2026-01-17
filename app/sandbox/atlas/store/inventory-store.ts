/**
 * Inventory Store for Atlas
 *
 * Manages inventory data loading, view modes, filtering, and selection.
 * Designed to work alongside the existing atlas-store for review state.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  InventoryData,
  InventoryDomain,
  InventoryNodeType,
  InventoryUsageStatus,
  InventoryRiskLevel,
  AtlasViewMode,
  AtlasNodeGroup,
  AtlasMappedNode,
  AtlasMappedEdge,
  AtlasDomainSummary,
  AtlasRiskSummary,
  AtlasInventoryFilters,
} from '../lib/inventory-types';
import {
  loadInventoryData,
  computeSummaries,
  groupNodes,
  filterNodes,
  getNodeEdges,
  computeImpactTrace,
  mapNode,
} from '../lib/inventory-adapter';

interface InventoryStoreState {
  // Data state
  inventoryData: InventoryData | null;
  isLoading: boolean;
  loadError: string | null;
  lastLoadedAt: string | null;

  // Computed summaries (cached)
  domainSummaries: AtlasDomainSummary[];
  riskSummary: AtlasRiskSummary;
  usageBreakdown: Record<string, number>;

  // View state
  viewMode: AtlasViewMode;
  filters: AtlasInventoryFilters;
  searchQuery: string;

  // Filtered data for current view
  filteredNodes: AtlasMappedNode[];
  mappedEdges: AtlasMappedEdge[];

  // Selection state
  selectedNodeId: string | null;
  selectedNode: AtlasMappedNode | null;
  selectedNodeEdges: { incoming: AtlasMappedEdge[]; outgoing: AtlasMappedEdge[] };

  // Impact trace (computed on demand)
  impactTrace: {
    affectedNodes: AtlasMappedNode[];
    affectedEdges: AtlasMappedEdge[];
    securityCriticalInChain: boolean;
  } | null;

  // Grouped nodes for current view (performance optimization)
  nodeGroups: AtlasNodeGroup[];
  expandedGroupIds: Set<string>;

  // History and suggestions
  recentNodes: AtlasMappedNode[];
  relatedNodes: AtlasMappedNode[];

  // Actions
  loadInventory: () => Promise<void>;
  setViewMode: (mode: AtlasViewMode) => void;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: AtlasInventoryFilters) => void;
  toggleDomainFilter: (domain: InventoryDomain) => void;
  toggleTypeFilter: (type: InventoryNodeType) => void;
  toggleUsageFilter: (usage: InventoryUsageStatus) => void;
  toggleRiskFilter: (risk: InventoryRiskLevel) => void;
  clearFilters: () => void;
  selectNode: (nodeId: string | null) => void;
  toggleGroupExpanded: (groupId: string) => void;
  computeImpact: (nodeId: string, direction: 'upstream' | 'downstream' | 'both') => void;
  clearImpactTrace: () => void;
}

const createDefaultFilters = (): AtlasInventoryFilters => ({
  domains: [],
  types: [],
  usageStatuses: [],
  riskLevels: [],
  searchQuery: '',
});

const toggleItem = <T>(items: T[], item: T): T[] => {
  if (items.includes(item)) {
    return items.filter((entry) => entry !== item);
  }
  return [...items, item];
};

export const useInventoryStore = create<InventoryStoreState>()(
  persist(
    (set, get) => ({
      // Initial data state
      inventoryData: null,
      isLoading: false,
      loadError: null,
      lastLoadedAt: null,

      // Initial summaries
      domainSummaries: [],
      riskSummary: { critical: 0, high: 0, medium: 0, low: 0 },
      usageBreakdown: {},

      // Initial view state
      viewMode: 'risk', // Start with risk view to see unknown nodes
      filters: createDefaultFilters(),
      searchQuery: '',

      // Initial filtered data
      filteredNodes: [],
      mappedEdges: [],

      // Initial selection state
      selectedNodeId: null,
      selectedNode: null,
      selectedNodeEdges: { incoming: [], outgoing: [] },

      // Initial impact trace
      impactTrace: null,

      // Initial grouped nodes
      nodeGroups: [],
      expandedGroupIds: new Set<string>(),

      // Initial history and suggestions
      recentNodes: [],
      relatedNodes: [],

      // Actions
      loadInventory: async () => {
        set({ isLoading: true, loadError: null });

        try {
          const data = await loadInventoryData();
          if (!data) {
            set({
              isLoading: false,
              loadError: 'Failed to load inventory.json',
            });
            return;
          }

          // Compute summaries
          const summaries = computeSummaries(data.nodes);

          // Compute initial node groups based on current view mode
          const state = get();
          const filteredNodes = filterNodes(data.nodes, {
            domains: state.filters.domains,
            types: state.filters.types,
            usageStatuses: state.filters.usageStatuses,
            riskLevels: state.filters.riskLevels,
            searchQuery: state.searchQuery,
          });
          const groups = groupNodes(filteredNodes, state.viewMode);

          // Map edges for canvas
          const mappedEdges: AtlasMappedEdge[] = data.edges.map((edge) => ({
            source: edge.from,
            target: edge.to,
            type: edge.type,
            details: edge.details || '',
          }));

          set({
            inventoryData: data,
            isLoading: false,
            lastLoadedAt: new Date().toISOString(),
            domainSummaries: summaries.domains,
            riskSummary: summaries.risks,
            usageBreakdown: summaries.usageBreakdown,
            nodeGroups: groups,
            filteredNodes: filteredNodes.map(mapNode),
            mappedEdges,
          });
        } catch (error) {
          set({
            isLoading: false,
            loadError: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },

      setViewMode: (mode) => {
        const state = get();
        if (!state.inventoryData) return;

        const filteredNodes = filterNodes(state.inventoryData.nodes, {
          domains: state.filters.domains,
          types: state.filters.types,
          usageStatuses: state.filters.usageStatuses,
          riskLevels: state.filters.riskLevels,
          searchQuery: state.searchQuery,
        });
        const groups = groupNodes(filteredNodes, mode);

        set({
          viewMode: mode,
          nodeGroups: groups,
          expandedGroupIds: new Set<string>(),
          impactTrace: null, // Clear impact on view change
        });
      },

      setSearchQuery: (query) => {
        const state = get();
        if (!state.inventoryData) {
          set({ searchQuery: query });
          return;
        }

        const filteredNodes = filterNodes(state.inventoryData.nodes, {
          domains: state.filters.domains,
          types: state.filters.types,
          usageStatuses: state.filters.usageStatuses,
          riskLevels: state.filters.riskLevels,
          searchQuery: query,
        });
        const groups = groupNodes(filteredNodes, state.viewMode);

        set({
          searchQuery: query,
          nodeGroups: groups,
          filteredNodes: filteredNodes.map(mapNode),
        });
      },

      setFilters: (newFilters) => {
        const state = get();
        if (!state.inventoryData) {
          set({ filters: newFilters });
          return;
        }

        const filteredNodes = filterNodes(state.inventoryData.nodes, {
          ...newFilters,
          searchQuery: state.searchQuery,
        });
        const groups = groupNodes(filteredNodes, state.viewMode);

        set({
          filters: newFilters,
          nodeGroups: groups,
          filteredNodes: filteredNodes.map(mapNode),
        });
      },

      toggleDomainFilter: (domain) => {
        const state = get();
        const newDomains = toggleItem(state.filters.domains, domain);
        const newFilters = { ...state.filters, domains: newDomains };

        if (!state.inventoryData) {
          set({ filters: newFilters });
          return;
        }

        const filteredNodes = filterNodes(state.inventoryData.nodes, {
          ...newFilters,
          searchQuery: state.searchQuery,
        });
        const groups = groupNodes(filteredNodes, state.viewMode);

        set({ filters: newFilters, nodeGroups: groups, filteredNodes: filteredNodes.map(mapNode) });
      },

      toggleTypeFilter: (type) => {
        const state = get();
        const newTypes = toggleItem(state.filters.types, type);
        const newFilters = { ...state.filters, types: newTypes };

        if (!state.inventoryData) {
          set({ filters: newFilters });
          return;
        }

        const filteredNodes = filterNodes(state.inventoryData.nodes, {
          ...newFilters,
          searchQuery: state.searchQuery,
        });
        const groups = groupNodes(filteredNodes, state.viewMode);

        set({ filters: newFilters, nodeGroups: groups, filteredNodes: filteredNodes.map(mapNode) });
      },

      toggleUsageFilter: (usage) => {
        const state = get();
        const newUsages = toggleItem(state.filters.usageStatuses, usage);
        const newFilters = { ...state.filters, usageStatuses: newUsages };

        if (!state.inventoryData) {
          set({ filters: newFilters });
          return;
        }

        const filteredNodes = filterNodes(state.inventoryData.nodes, {
          ...newFilters,
          searchQuery: state.searchQuery,
        });
        const groups = groupNodes(filteredNodes, state.viewMode);

        set({ filters: newFilters, nodeGroups: groups, filteredNodes: filteredNodes.map(mapNode) });
      },

      toggleRiskFilter: (risk) => {
        const state = get();
        const newRisks = toggleItem(state.filters.riskLevels, risk);
        const newFilters = { ...state.filters, riskLevels: newRisks };

        if (!state.inventoryData) {
          set({ filters: newFilters });
          return;
        }

        const filteredNodes = filterNodes(state.inventoryData.nodes, {
          ...newFilters,
          searchQuery: state.searchQuery,
        });
        const groups = groupNodes(filteredNodes, state.viewMode);

        set({ filters: newFilters, nodeGroups: groups, filteredNodes: filteredNodes.map(mapNode) });
      },

      clearFilters: () => {
        const state = get();
        const newFilters = createDefaultFilters();

        if (!state.inventoryData) {
          set({ filters: newFilters, searchQuery: '' });
          return;
        }

        const allNodes = state.inventoryData.nodes;
        const groups = groupNodes(allNodes, state.viewMode);

        set({
          filters: newFilters,
          searchQuery: '',
          nodeGroups: groups,
          filteredNodes: allNodes.map(mapNode),
        });
      },

      selectNode: (nodeId) => {
        const state = get();

        if (!nodeId || !state.inventoryData) {
          set({
            selectedNodeId: null,
            selectedNode: null,
            selectedNodeEdges: { incoming: [], outgoing: [] },
            impactTrace: null,
            relatedNodes: [],
          });
          return;
        }

        const node = state.inventoryData.nodes.find((n) => n.id === nodeId);
        if (!node) {
          set({
            selectedNodeId: null,
            selectedNode: null,
            selectedNodeEdges: { incoming: [], outgoing: [] },
            impactTrace: null,
            relatedNodes: [],
          });
          return;
        }

        const mappedNode = mapNode(node);
        const edges = getNodeEdges(nodeId, state.inventoryData.edges);

        // Update recent nodes history (max 10, no duplicates)
        const newRecentNodes = [
          mappedNode,
          ...state.recentNodes.filter((n) => n.id !== nodeId),
        ].slice(0, 10);

        // Compute related nodes (same domain or type, sorted by risk similarity)
        const relatedNodes = state.inventoryData.nodes
          .filter((n) => {
            if (n.id === nodeId) return false;
            const sameOwner = n.ownerDomain === node.ownerDomain;
            const sameType = n.type === node.type;
            return sameOwner || sameType;
          })
          .map(mapNode)
          .sort((a, b) => {
            // Prioritize same domain + type
            const aScore =
              (a.ownerDomain === mappedNode.ownerDomain ? 2 : 0) +
              (a.type === mappedNode.type ? 1 : 0);
            const bScore =
              (b.ownerDomain === mappedNode.ownerDomain ? 2 : 0) +
              (b.type === mappedNode.type ? 1 : 0);
            return bScore - aScore;
          })
          .slice(0, 5);

        set({
          selectedNodeId: nodeId,
          selectedNode: mappedNode,
          selectedNodeEdges: edges,
          impactTrace: null, // Clear previous impact trace
          recentNodes: newRecentNodes,
          relatedNodes,
        });
      },

      toggleGroupExpanded: (groupId) => {
        const state = get();
        const newExpanded = new Set(state.expandedGroupIds);

        if (newExpanded.has(groupId)) {
          newExpanded.delete(groupId);
        } else {
          newExpanded.add(groupId);
        }

        // If expanding, load all nodes for that group
        if (newExpanded.has(groupId) && state.inventoryData) {
          const groups = state.nodeGroups.map((group) => {
            if (group.id !== groupId || !group.hasMore) return group;

            // Load all nodes for this group
            const [domain, type] = groupId.split(':');
            const allGroupNodes = state.inventoryData!.nodes
              .filter((n) => n.ownerDomain === domain && n.type === type)
              .map(mapNode);

            return {
              ...group,
              nodes: allGroupNodes,
              hasMore: false,
              expanded: true,
            };
          });

          set({ expandedGroupIds: newExpanded, nodeGroups: groups });
        } else {
          set({ expandedGroupIds: newExpanded });
        }
      },

      computeImpact: (nodeId, direction) => {
        const state = get();
        if (!state.inventoryData) return;

        const trace = computeImpactTrace(
          nodeId,
          state.inventoryData.edges,
          state.inventoryData.nodes,
          direction,
          3 // max depth
        );

        set({ impactTrace: trace });
      },

      clearImpactTrace: () => {
        set({ impactTrace: null });
      },
    }),
    {
      name: 'atlas-inventory-store',
      version: 1,
      partialize: (state) => ({
        // Only persist view preferences, not data
        viewMode: state.viewMode,
        filters: state.filters,
        lastLoadedAt: state.lastLoadedAt,
      }),
    }
  )
);
