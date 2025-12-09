import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SandboxState, TypographyState, ColorState, LogoState, SpacingState, ViewportMode } from '../types/sandbox';
import type { ModuleStatus } from '../config/sandbox-modules';

// -----------------------------------------------------------------------------
// Default Values
// -----------------------------------------------------------------------------

const defaultTypography: TypographyState = {
  fontPrimary: 'inter',
  fontSecondary: 'merriweather',
  baseFontSize: 16,
  typeScaleRatio: 1.25,
  fontWeight: 400,
  lineHeight: 1.5,
  letterSpacing: 0,
};

const defaultColors: ColorState = {
  colorScheme: 'light',
  accentHue: 262, // Lekbanken purple
  surfaceShade: 'white',
};

const defaultLogo: LogoState = {
  logoLayout: 'icon-left',
  logoCase: 'title',
  logoSize: 'md',
  logoLetterSpacing: 0,
};

const defaultSpacing: SpacingState = {
  spacingBase: 4,
  borderRadius: 8,
};

const defaultViewport: ViewportMode = 'desktop';

// -----------------------------------------------------------------------------
// Zustand Store
// -----------------------------------------------------------------------------

export const useSandboxStore = create<SandboxState>((set) => ({
  // Typography
  ...defaultTypography,

  // Colors
  ...defaultColors,

  // Logo
  ...defaultLogo,

  // Spacing
  ...defaultSpacing,

  // Viewport
  viewport: defaultViewport,

  // Actions
  setTypography: (partial) => set((state) => ({ ...state, ...partial })),
  setColors: (partial) => set((state) => ({ ...state, ...partial })),
  setLogo: (partial) => set((state) => ({ ...state, ...partial })),
  setSpacing: (partial) => set((state) => ({ ...state, ...partial })),
  setViewport: (viewport) => set({ viewport }),
  resetAll: () =>
    set({
      ...defaultTypography,
      ...defaultColors,
      ...defaultLogo,
      ...defaultSpacing,
      viewport: defaultViewport,
    }),
}));

// -----------------------------------------------------------------------------
// Selector Hooks (for selective re-renders)
// -----------------------------------------------------------------------------

export const useTypography = () =>
  useSandboxStore((s) => ({
    fontPrimary: s.fontPrimary,
    fontSecondary: s.fontSecondary,
    baseFontSize: s.baseFontSize,
    typeScaleRatio: s.typeScaleRatio,
    fontWeight: s.fontWeight,
    lineHeight: s.lineHeight,
    letterSpacing: s.letterSpacing,
    setTypography: s.setTypography,
  }));

export const useColors = () =>
  useSandboxStore((s) => ({
    colorScheme: s.colorScheme,
    accentHue: s.accentHue,
    surfaceShade: s.surfaceShade,
    setColors: s.setColors,
  }));

export const useLogo = () =>
  useSandboxStore((s) => ({
    logoLayout: s.logoLayout,
    logoCase: s.logoCase,
    logoSize: s.logoSize,
    logoLetterSpacing: s.logoLetterSpacing,
    setLogo: s.setLogo,
  }));

export const useSpacing = () =>
  useSandboxStore((s) => ({
    spacingBase: s.spacingBase,
    borderRadius: s.borderRadius,
    setSpacing: s.setSpacing,
  }));

export const useViewport = () =>
  useSandboxStore((s) => ({
    viewport: s.viewport,
    setViewport: s.setViewport,
  }));

// -----------------------------------------------------------------------------
// Status Filter Store (persisted)
// -----------------------------------------------------------------------------

interface StatusFilterState {
  statusFilter: ModuleStatus[] | null; // null = show all
  setStatusFilter: (filter: ModuleStatus[] | null) => void;
  toggleStatus: (status: ModuleStatus) => void;
  showAllStatuses: () => void;
}

export const useStatusFilterStore = create<StatusFilterState>()(
  persist(
    (set, get) => ({
      statusFilter: null,

      setStatusFilter: (filter) => set({ statusFilter: filter }),

      toggleStatus: (status) => {
        const current = get().statusFilter;
        
        if (current === null) {
          // Currently showing all, toggle to only this status
          set({ statusFilter: [status] });
        } else if (current.includes(status)) {
          // Remove this status
          const newFilter = current.filter((s) => s !== status);
          // If empty, show all
          set({ statusFilter: newFilter.length > 0 ? newFilter : null });
        } else {
          // Add this status
          set({ statusFilter: [...current, status] });
        }
      },

      showAllStatuses: () => set({ statusFilter: null }),
    }),
    {
      name: 'sandbox-status-filter',
    }
  )
);

// Convenience hooks
export const useStatusFilter = () => useStatusFilterStore((s) => s.statusFilter);
export const useToggleStatus = () => useStatusFilterStore((s) => s.toggleStatus);
