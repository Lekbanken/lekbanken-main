// =============================================================================
// Spatial Editor – Core Types (v1)
// =============================================================================
// A4 portrait ratio ≈ 1 : √2 → world default 1000 × 1414
// All object coordinates are normalized 0..1 relative to world dimensions.
// =============================================================================

/** Default world dimensions – A4 portrait ratio */
export const WORLD_WIDTH = 1000;
export const WORLD_HEIGHT = 1414;

/** Snap grid step in normalized coords (2% like Coach Diagram) */
export const SNAP_STEP = 0.02;

// ---------------------------------------------------------------------------
// Object types – point-based (single position)
// ---------------------------------------------------------------------------

/** Original game/coach objects */
export const CORE_OBJECT_TYPES = [
  'player',
  'ball',
  'cone',
  'label',
  'checkpoint',
] as const;

/** Surroundings: landmarks & terrain */
export const LANDMARK_OBJECT_TYPES = [
  'tree',
  'bush',
  'house',
  'building',
  'path-segment',
  'bridge',
  'water',
  'hill',
  'bench',
  'fence',
  'playground',
] as const;

/** Surroundings: game objects (treasure-hunt, etc.) */
export const GAME_ASSET_TYPES = [
  'flag-start',
  'trophy',
  'x-mark',
  'treasure',
  'key',
  'clue',
  'danger',
] as const;

/** Surroundings: UI helpers */
export const HELPER_OBJECT_TYPES = [
  'compass',
  'num-badge',
] as const;

/** Surroundings: indoor/classroom */
export const INDOOR_OBJECT_TYPES = [
  'table',
  'chair',
  'whiteboard',
  'door',
] as const;

export const POINT_OBJECT_TYPES = [
  ...CORE_OBJECT_TYPES,
  ...LANDMARK_OBJECT_TYPES,
  ...GAME_ASSET_TYPES,
  ...HELPER_OBJECT_TYPES,
  ...INDOOR_OBJECT_TYPES,
] as const;

export type PointObjectType = (typeof POINT_OBJECT_TYPES)[number];

// All object types including two-click types (for backward compat)
export const SPATIAL_OBJECT_TYPES = [
  ...POINT_OBJECT_TYPES,
  'arrow' as const,
  'zone' as const,
  'arrow-chain' as const,
];

export type SpatialObjectType = PointObjectType | 'arrow' | 'zone' | 'arrow-chain';

/** Kind variants for checkpoint objects */
export type CheckpointKind = 'station' | 'checkpoint' | 'start' | 'finish';

// ---------------------------------------------------------------------------
// Transform (normalized 0..1)
// ---------------------------------------------------------------------------

export interface SpatialTransform {
  /** Horizontal position, 0..1 */
  x: number;
  /** Vertical position, 0..1 */
  y: number;
  /** Degrees, clockwise. Optional – default 0 */
  rotation?: number;
  /** Uniform scale factor. Optional – default 1 */
  scale?: number;
}

// ---------------------------------------------------------------------------
// Objects
// ---------------------------------------------------------------------------

export interface SpatialObjectBase {
  id: string;
  type: SpatialObjectType;
  t: SpatialTransform;
  /** Arrow: from/to endpoints (normalized) */
  from?: { x: number; y: number };
  to?: { x: number; y: number };
  /** Type-specific properties (label text, team color, zone style …) */
  props: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------

export interface SpatialLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  objects: SpatialObjectBase[];
}

// ---------------------------------------------------------------------------
// Background
// ---------------------------------------------------------------------------

export type BackgroundType = 'grid' | 'image' | 'sport-field';

export interface SpatialBackground {
  type: BackgroundType;
  /** URL (or data-URL) for "image" backgrounds */
  src?: string;
  /** Native width of uploaded image in px (for contain-fit) */
  imageWidth?: number;
  /** Native height of uploaded image in px (for contain-fit) */
  imageHeight?: number;
  /** e.g. "football", "handball" for sport-field */
  variant?: string;
  /** Background layer opacity 0..1 (default 1) */
  opacity?: number;
}

// ---------------------------------------------------------------------------
// Document (v1)
// ---------------------------------------------------------------------------

export interface SpatialDocumentV1 {
  version: 1;
  /** World dimensions in abstract units – defines aspect ratio */
  world: { width: number; height: number };
  background: SpatialBackground;
  layers: SpatialLayer[];
}

// ---------------------------------------------------------------------------
// Editor state (non-document)
// ---------------------------------------------------------------------------

export type EditorTool = 'select' | 'hand' | 'place' | 'arrow' | 'zone' | 'polygon' | 'path' | 'arrow-chain';

/** Sticky = stay in place-mode after each placement. One-shot = return to select. */
export type PlacePolicy = 'sticky' | 'one-shot';

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Pending start point for two-click creation (arrows, zones) */
export interface PendingStart {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Mode system (declared now, activated later)
// ---------------------------------------------------------------------------

export interface ModeConfig {
  id: string;
  label: string;
  /** Which background types are available */
  backgroundPolicy: BackgroundType[];
  /** Which object types appear in the palette */
  assetPalette: SpatialObjectType[];
  /** Which tools are enabled */
  tools: EditorTool[];
  /** Optional constraints */
  constraints?: {
    snapGrid?: number;
    maxObjects?: number;
  };
}

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

export function createDefaultDocument(): SpatialDocumentV1 {
  return {
    version: 1,
    world: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
    background: { type: 'grid' },
    layers: [
      {
        id: 'layer-objects',
        name: 'Objects',
        visible: true,
        locked: false,
        objects: [],
      },
    ],
  };
}

let _playerCounter = 1;
let _checkpointCounter = 1;
let _numBadgeCounter = 1;

// ---------------------------------------------------------------------------
// Sport-specific marker images for player & ball
// ---------------------------------------------------------------------------

export const PLAYER_MARKER_BY_SPORT: Record<string, string> = {
  basketball: '/coach-diagram/markers/basketball-player_v2.webp',
  football: '/coach-diagram/markers/football-player_v2.webp',
  handball: '/coach-diagram/markers/football-player_v2.webp',
  hockey: '/coach-diagram/markers/hockeyjersey-player_v2.webp',
  innebandy: '/coach-diagram/markers/football-player_v2.webp',
};

export const BALL_MARKER_BY_SPORT: Record<string, string> = {
  basketball: '/coach-diagram/markers/basketball-ball_v2.webp',
  football: '/coach-diagram/markers/football-ball_v2.webp',
  handball: '/coach-diagram/markers/handball-ball_v2.webp',
  hockey: '/coach-diagram/markers/hockeypuck-ball_v2.webp',
  innebandy: '/coach-diagram/markers/innebandyball-ball_v2.webp',
};

/** All available player marker images (for inspector dropdown) */
export const ALL_PLAYER_MARKERS = [
  { id: 'football', label: 'Fotboll', src: '/coach-diagram/markers/football-player_v2.webp' },
  { id: 'basketball', label: 'Basket', src: '/coach-diagram/markers/basketball-player_v2.webp' },
  { id: 'hockey', label: 'Hockey', src: '/coach-diagram/markers/hockeyjersey-player_v2.webp' },
];

export const ALL_BALL_MARKERS = [
  { id: 'football', label: 'Fotboll', src: '/coach-diagram/markers/football-ball_v2.webp' },
  { id: 'basketball', label: 'Basket', src: '/coach-diagram/markers/basketball-ball_v2.webp' },
  { id: 'handball', label: 'Handboll', src: '/coach-diagram/markers/handball-ball_v2.webp' },
  { id: 'hockey', label: 'Hockey', src: '/coach-diagram/markers/hockeypuck-ball_v2.webp' },
  { id: 'innebandy', label: 'Innebandy', src: '/coach-diagram/markers/innebandyball-ball_v2.webp' },
];

function stableId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `obj-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create a point-based object.
 */
export function createObject(
  type: PointObjectType,
  x: number,
  y: number,
): SpatialObjectBase {
  const id = stableId();
  const defaultProps: Record<string, unknown> = {};

  switch (type) {
    // ---- Core ----
    case 'player':
      defaultProps.number = _playerCounter++;
      defaultProps.color = '#3b82f6';
      break;
    case 'ball':
      defaultProps.color = '#f97316';
      break;
    case 'cone':
      defaultProps.color = '#eab308';
      break;
    case 'label':
      defaultProps.text = 'Text';
      defaultProps.fontSize = 16;
      break;
    case 'checkpoint':
      defaultProps.label = String(_checkpointCounter++);
      defaultProps.order = _checkpointCounter - 1;
      defaultProps.kind = 'checkpoint';
      defaultProps.notes = '';
      defaultProps.color = '#10b981';
      break;

    // ---- Landmarks & Terrain ----
    case 'tree':
      defaultProps.variant = 'deciduous'; // deciduous | conifer
      defaultProps.color = '#22c55e';
      break;
    case 'bush':
      defaultProps.color = '#16a34a';
      break;
    case 'house':
      defaultProps.variant = 'small'; // small | medium | large
      defaultProps.color = '#d97706';
      break;
    case 'building':
      defaultProps.color = '#6b7280';
      break;
    case 'path-segment':
      defaultProps.color = '#a8a29e';
      break;
    case 'bridge':
      defaultProps.color = '#78716c';
      break;
    case 'water':
      defaultProps.color = '#38bdf8';
      break;
    case 'hill':
      defaultProps.color = '#84cc16';
      break;
    case 'bench':
      defaultProps.color = '#92400e';
      break;
    case 'fence':
      defaultProps.color = '#78716c';
      break;
    case 'playground':
      defaultProps.color = '#f59e0b';
      break;

    // ---- Game objects ----
    case 'flag-start':
      defaultProps.color = '#22c55e';
      break;
    case 'trophy':
      defaultProps.color = '#eab308';
      break;
    case 'x-mark':
      defaultProps.color = '#ef4444';
      break;
    case 'treasure':
      defaultProps.color = '#d97706';
      break;
    case 'key':
      defaultProps.color = '#eab308';
      break;
    case 'clue':
      defaultProps.color = '#8b5cf6';
      break;
    case 'danger':
      defaultProps.color = '#ef4444';
      break;

    // ---- Helpers ----
    case 'compass':
      defaultProps.color = '#1e40af';
      break;
    case 'num-badge':
      defaultProps.number = _numBadgeCounter++;
      defaultProps.color = '#6366f1';
      break;

    // ---- Indoor ----
    case 'table':
      defaultProps.color = '#92400e';
      break;
    case 'chair':
      defaultProps.color = '#78716c';
      break;
    case 'whiteboard':
      defaultProps.color = '#f1f5f9';
      break;
    case 'door':
      defaultProps.color = '#a16207';
      break;
  }

  return {
    id,
    type,
    t: { x: clamp01(x), y: clamp01(y) },
    props: defaultProps,
  };
}

/** Minimum arrow length in normalized coords – prevents degenerate zero-length arrows */
export const MIN_ARROW_LEN = 0.02;

/**
 * Create an arrow from two normalized points (Coach Diagram pattern).
 * If from ≈ to, auto-expands to MIN_ARROW_LEN.
 */
export function createArrow(
  from: { x: number; y: number },
  to: { x: number; y: number },
): SpatialObjectBase {
  // Guard: if endpoints are too close, push 'to' rightward
  const dist = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
  if (dist < MIN_ARROW_LEN) {
    to = { x: clamp01(from.x + MIN_ARROW_LEN), y: from.y };
  }

  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  return {
    id: stableId(),
    type: 'arrow',
    t: { x: midX, y: midY }, // midpoint for compatibility
    from: { x: clamp01(from.x), y: clamp01(from.y) },
    to: { x: clamp01(to.x), y: clamp01(to.y) },
    props: {
      color: '#6b7280',
      pattern: 'solid' as string,
      arrowhead: true,
    },
  };
}

/**
 * Create a zone from two corner points (Coach Diagram pattern).
 */
export function createZone(
  corner1: { x: number; y: number },
  corner2: { x: number; y: number },
): SpatialObjectBase {
  const x = Math.min(corner1.x, corner2.x);
  const y = Math.min(corner1.y, corner2.y);
  const width = Math.max(0.05, Math.abs(corner2.x - corner1.x));
  const height = Math.max(0.05, Math.abs(corner2.y - corner1.y));

  return {
    id: stableId(),
    type: 'zone',
    t: { x: clamp01(x + width / 2), y: clamp01(y + height / 2) },
    props: {
      width,
      height,
      color: '#8b5cf6',
      fillOpacity: 0.2,
    },
  };
}

/**
 * Create a polygon-based area object (zone or water) from an array of normalized points.
 * The object's t position is the centroid of the polygon.
 */
export function createPolygonObject(
  variant: 'zone' | 'water',
  points: { x: number; y: number }[],
): SpatialObjectBase {
  if (points.length < 3) {
    throw new Error('Polygon requires at least 3 points');
  }

  const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;

  const color = variant === 'water' ? '#3b82f6' : '#8b5cf6';
  const fillOpacity = variant === 'water' ? 0.35 : 0.2;

  return {
    id: stableId(),
    type: 'zone',
    t: { x: clamp01(cx), y: clamp01(cy) },
    props: {
      points: points.map((p) => ({ x: clamp01(p.x), y: clamp01(p.y) })),
      color,
      fillOpacity,
      polygonVariant: variant,
    },
  };
}

/**
 * Create an arrow-chain (polyline with arrowhead) from an array of normalized points.
 * Like a path but rendered with an arrowhead on the last segment.
 */
export function createArrowChainObject(
  points: { x: number; y: number }[],
): SpatialObjectBase {
  if (points.length < 2) {
    throw new Error('Arrow chain requires at least 2 points');
  }

  const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;

  return {
    id: stableId(),
    type: 'arrow-chain',
    t: { x: clamp01(cx), y: clamp01(cy) },
    props: {
      points: points.map((p) => ({ x: clamp01(p.x), y: clamp01(p.y) })),
      color: '#6b7280',
      strokeWidth: 3,
      pattern: 'solid',
      arrowhead: true,
    },
  };
}

/**
 * Create a path (polyline) object from an array of normalized points.
 * Uses type 'path-segment' with props.points for multi-point chain.
 */
export function createPathObject(
  points: { x: number; y: number }[],
): SpatialObjectBase {
  if (points.length < 2) {
    throw new Error('Path requires at least 2 points');
  }

  const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;

  return {
    id: stableId(),
    type: 'path-segment',
    t: { x: clamp01(cx), y: clamp01(cy) },
    props: {
      points: points.map((p) => ({ x: clamp01(p.x), y: clamp01(p.y) })),
      color: '#a16207',
      strokeWidth: 3,
    },
  };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Snap a normalized value to the nearest grid step */
export function snap(v: number, step = SNAP_STEP): number {
  return Math.round(v / step) * step;
}

