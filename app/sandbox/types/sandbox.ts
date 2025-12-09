// -----------------------------------------------------------------------------
// Sandbox Type Definitions
// -----------------------------------------------------------------------------

export type FontWeight = 300 | 400 | 500 | 600 | 700 | 800;
export type ColorScheme = 'light' | 'dark';
export type SurfaceShade = 'white' | 'zinc-50' | 'zinc-100' | 'zinc-900' | 'zinc-950';
export type LogoLayout = 'icon-left' | 'icon-top' | 'icon-only' | 'text-only';
export type LogoCase = 'uppercase' | 'lowercase' | 'title';
export type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

// Viewport modes for responsive preview
export type ViewportMode = 'desktop' | 'tablet' | 'mobile';

export interface ViewportState {
  viewport: ViewportMode;
}

export const viewportConfig: Record<ViewportMode, { label: string; maxWidth: number; icon: string }> = {
  desktop: { label: 'Desktop', maxWidth: 1280, icon: '🖥️' },
  tablet: { label: 'Tablet', maxWidth: 834, icon: '📱' },
  mobile: { label: 'Mobil', maxWidth: 390, icon: '📲' },
};

export interface TypographyState {
  fontPrimary: string;
  fontSecondary: string;
  baseFontSize: number;
  typeScaleRatio: number;
  fontWeight: FontWeight;
  lineHeight: number;
  letterSpacing: number;
}

export interface ColorState {
  colorScheme: ColorScheme;
  accentHue: number;
  surfaceShade: SurfaceShade;
}

export interface LogoState {
  logoLayout: LogoLayout;
  logoCase: LogoCase;
  logoSize: LogoSize;
  logoLetterSpacing: number;
}

export interface SpacingState {
  spacingBase: number;
  borderRadius: number;
}

export interface SandboxState extends TypographyState, ColorState, LogoState, SpacingState, ViewportState {
  setTypography: (partial: Partial<TypographyState>) => void;
  setColors: (partial: Partial<ColorState>) => void;
  setLogo: (partial: Partial<LogoState>) => void;
  setSpacing: (partial: Partial<SpacingState>) => void;
  setViewport: (viewport: ViewportMode) => void;
  resetAll: () => void;
}

export interface SandboxModule {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}
