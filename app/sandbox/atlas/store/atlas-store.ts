import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AtlasDomain,
  AtlasMode,
  AtlasReviewFlag,
  AtlasReviewFlags,
  AtlasReviewStatus,
  AtlasRole,
  AtlasSelection,
} from '../types';
import { createDefaultReviewFlags } from '../types';

interface AtlasFilters {
  domains: AtlasDomain[];
  roles: AtlasRole[];
  route: string | null;
  table: string | null;
  statuses: AtlasReviewStatus[];
}

interface FrameReviewEntry {
  reviewFlags: AtlasReviewFlags;
  lastReviewedAt?: string;
  notes?: string;
}

interface AtlasState {
  mode: AtlasMode;
  searchQuery: string;
  filters: AtlasFilters;
  selection: AtlasSelection | null;
  reviewByFrameId: Record<string, FrameReviewEntry>;
  lastSystemSyncAt: string | null;
  systemSyncSource: string | null;

  setMode: (mode: AtlasMode) => void;
  setSearchQuery: (query: string) => void;
  toggleDomain: (domain: AtlasDomain) => void;
  toggleRole: (role: AtlasRole) => void;
  toggleStatus: (status: AtlasReviewStatus) => void;
  setRouteFilter: (route: string | null) => void;
  setTableFilter: (table: string | null) => void;
  clearFilters: () => void;
  selectNode: (selection: AtlasSelection) => void;
  clearSelection: () => void;

  toggleReviewFlag: (frameId: string, flag: AtlasReviewFlag) => void;
  markReviewed: (frameId: string) => void;
  setNotes: (frameId: string, notes: string) => void;
  syncSystemMap: () => void;
}

const createDefaultFilters = (): AtlasFilters => ({
  domains: ['admin', 'games'],
  roles: [],
  route: null,
  table: null,
  statuses: [],
});

const toggleItem = <T,>(items: T[], item: T) => {
  if (items.includes(item)) {
    return items.filter((entry) => entry !== item);
  }
  return [...items, item];
};

export const useAtlasStore = create<AtlasState>()(
  persist(
    (set, get) => ({
      mode: 'data',
      searchQuery: '',
      filters: createDefaultFilters(),
      selection: null,
      reviewByFrameId: {},
      lastSystemSyncAt: null,
      systemSyncSource: null,

      setMode: (mode) => set({ mode }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      toggleDomain: (domain) =>
        set((state) => ({
          filters: {
            ...state.filters,
            domains: toggleItem(state.filters.domains, domain),
          },
        })),
      toggleRole: (role) =>
        set((state) => ({
          filters: {
            ...state.filters,
            roles: toggleItem(state.filters.roles, role),
          },
        })),
      toggleStatus: (status) =>
        set((state) => ({
          filters: {
            ...state.filters,
            statuses: toggleItem(state.filters.statuses, status),
          },
        })),
      setRouteFilter: (route) =>
        set((state) => ({
          filters: {
            ...state.filters,
            route,
          },
        })),
      setTableFilter: (table) =>
        set((state) => ({
          filters: {
            ...state.filters,
            table,
          },
        })),
      clearFilters: () => set({ filters: createDefaultFilters() }),
      selectNode: (selection) => set({ selection }),
      clearSelection: () => set({ selection: null }),

      toggleReviewFlag: (frameId, flag) =>
        set((state) => {
          const current = state.reviewByFrameId[frameId]?.reviewFlags ?? createDefaultReviewFlags();
          const nextFlags = { ...current, [flag]: !current[flag] };
          return {
            reviewByFrameId: {
              ...state.reviewByFrameId,
              [frameId]: {
                ...state.reviewByFrameId[frameId],
                reviewFlags: nextFlags,
              },
            },
          };
        }),
      markReviewed: (frameId) =>
        set((state) => {
          const current = state.reviewByFrameId[frameId]?.reviewFlags ?? createDefaultReviewFlags();
          return {
            reviewByFrameId: {
              ...state.reviewByFrameId,
              [frameId]: {
                ...state.reviewByFrameId[frameId],
                reviewFlags: {
                  ...current,
                  ux_reviewed: true,
                },
                lastReviewedAt: new Date().toISOString(),
              },
            },
          };
        }),
      setNotes: (frameId, notes) =>
        set((state) => ({
          reviewByFrameId: {
            ...state.reviewByFrameId,
            [frameId]: {
              ...state.reviewByFrameId[frameId],
              reviewFlags:
                state.reviewByFrameId[frameId]?.reviewFlags ?? createDefaultReviewFlags(),
              notes,
            },
          },
        })),
      syncSystemMap: () =>
        set({
          lastSystemSyncAt: new Date().toISOString(),
          systemSyncSource: 'MVP registry only',
        }),
    }),
    {
      name: 'sandbox-atlas-store',
      version: 1,
      migrate: (state) => state as AtlasState,
    }
  )
);

export const useAtlasFilters = () => useAtlasStore((state) => state.filters);
export const useAtlasMode = () => useAtlasStore((state) => state.mode);
export const useAtlasSearch = () => useAtlasStore((state) => state.searchQuery);
export const useAtlasSelection = () => useAtlasStore((state) => state.selection);
export const useAtlasReviewState = () => useAtlasStore((state) => state.reviewByFrameId);
export const useAtlasSyncInfo = () =>
  useAtlasStore((state) => ({
    lastSystemSyncAt: state.lastSystemSyncAt,
    systemSyncSource: state.systemSyncSource,
  }));
