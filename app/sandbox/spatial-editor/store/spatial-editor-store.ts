// =============================================================================
// Spatial Editor – Zustand Store
// =============================================================================
// Manages document state + editor UI state.
// Now supports two-click creation (arrows, zones) following Coach Diagram patterns.
// =============================================================================

import { create } from 'zustand';
import type {
  SpatialDocumentV1,
  PointObjectType,
  SpatialTransform,
  SpatialBackground,
  EditorTool,
  PlacePolicy,
  PendingStart,
  ViewBox,
} from '../lib/types';
import {
  createDefaultDocument,
  createObject,
  createArrow,
  createZone,
  createPolygonObject,
  createPathObject,
  clamp01,
  SNAP_STEP,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PLAYER_MARKER_BY_SPORT,
  BALL_MARKER_BY_SPORT,
} from '../lib/types';
import { defaultViewBox } from '../lib/geometry';
import { saveDocument, loadDocument, clearDocument } from '../lib/storage';
import { getContentBox, computeContainFit } from '../components/SportFieldBackgrounds';

// ---------------------------------------------------------------------------
// ContentBox helper – computes normalized rect for the active background
// ---------------------------------------------------------------------------

/** Returns the normalized content box {x,y,w,h} for the active background, or null (= full world). */
export function getActiveContentBox(doc: SpatialDocumentV1): { x: number; y: number; w: number; h: number } | null {
  const bg = doc.background;

  if (bg.type === 'sport-field' && bg.variant) {
    return getContentBox(bg.variant);
  }

  if (bg.type === 'image' && bg.src && bg.imageWidth && bg.imageHeight) {
    const fit = computeContainFit(WORLD_WIDTH, WORLD_HEIGHT, bg.imageWidth, bg.imageHeight);
    return {
      x: fit.x / WORLD_WIDTH,
      y: fit.y / WORLD_HEIGHT,
      w: fit.width / WORLD_WIDTH,
      h: fit.height / WORLD_HEIGHT,
    };
  }

  return null; // grid = full world
}

/** Clamp normalized coords to a contentBox rect */
export function clampToBox(
  nx: number,
  ny: number,
  box: { x: number; y: number; w: number; h: number },
): { nx: number; ny: number } {
  return {
    nx: Math.max(box.x, Math.min(box.x + box.w, nx)),
    ny: Math.max(box.y, Math.min(box.y + box.h, ny)),
  };
}

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface SpatialEditorState {
  // ---- Document ----
  doc: SpatialDocumentV1;

  // ---- Editor UI ----
  selectedIds: string[];
  activeTool: EditorTool;
  activePlaceType: PointObjectType | null;
  placePolicy: PlacePolicy;
  viewBox: ViewBox;
  dirty: boolean;

  /** Pending first-click position for two-click creation (arrow, zone) */
  pendingStart: PendingStart | null;

  /** Accumulated polygon vertices for multi-click polygon creation */
  pendingPolygonPoints: { x: number; y: number }[];
  /** Which polygon variant is being drawn ('zone' | 'water') */
  pendingPolygonType: 'zone' | 'water' | null;

  /** Accumulated path vertices for multi-click path creation */
  pendingPathPoints: { x: number; y: number }[];

  /** Whether snap-to-grid is enabled (default true, Alt key temporarily disables) */
  snapEnabled: boolean;

  /** Constrain placement/drag to the active background's contentBox */
  constrainToContentBox: boolean;

  /** Show trail line connecting checkpoints in order */
  showTrail: boolean;

  /** Lock background (prevent accidental interaction with background-only areas) */
  backgroundLocked: boolean;

  /** Currently loaded artifact ID (null = not saved to library yet) */
  artifactId: string | null;
  /** Title of the currently loaded artifact */
  artifactTitle: string;

  // ---- Actions: tool ----
  setActivePlaceType: (type: PointObjectType | null) => void;
  setTool: (tool: EditorTool) => void;
  setPlacePolicy: (policy: PlacePolicy) => void;
  toggleSnap: () => void;
  toggleConstrainToContentBox: () => void;
  toggleShowTrail: () => void;
  toggleBackgroundLocked: () => void;

  // ---- Actions: objects ----
  placeAt: (normalizedX: number, normalizedY: number) => void;
  /** Two-click arrow: handles first click (pending) and second click (create) */
  handleArrowClick: (nx: number, ny: number) => void;
  /** Two-click zone: handles first click (pending) and second click (create) */
  handleZoneClick: (nx: number, ny: number) => void;
  /** Start multi-click polygon creation for zone or water area */
  startPolygon: (variant: 'zone' | 'water') => void;
  /** Add a vertex to the pending polygon; closes if near first point */
  handlePolygonClick: (nx: number, ny: number) => void;
  /** Finalize the pending polygon (close and create object) */
  finalizePolygon: () => void;
  /** Cancel the pending polygon */
  cancelPolygon: () => void;
  /** Start multi-click path creation */
  startPath: () => void;
  /** Add a vertex to the pending path */
  handlePathClick: (nx: number, ny: number) => void;
  /** Finalize the pending path (create polyline object) */
  finalizePath: () => void;
  /** Cancel the pending path */
  cancelPath: () => void;
  select: (id: string | null) => void;
  toggleSelect: (id: string) => void;
  moveSelected: (positions: Map<string, { nx: number; ny: number }>) => void;
  /** Move a single arrow endpoint */
  moveArrowEndpoint: (id: string, handle: 'from' | 'to', nx: number, ny: number) => void;
  deleteSelected: () => void;
  /** Duplicate selected objects with a small offset */
  duplicateSelected: () => void;
  /** Nudge selected objects by normalized delta */
  nudgeSelected: (dnx: number, dny: number) => void;
  updateObjectProps: (id: string, props: Record<string, unknown>) => void;
  updateObjectTransform: (id: string, t: Partial<SpatialTransform>) => void;

  // ---- Actions: checkpoints ----
  /** Auto-number checkpoints by spatial position (top→bottom, left→right) */
  autoNumberCheckpoints: () => void;
  /** Renumber checkpoints sequentially 1..N preserving current sort order */
  renumberCheckpoints: () => void;
  /** Export checkpoint manifest (JSON string) */
  exportCheckpointManifest: () => string;

  // ---- Actions: background ----
  setBackground: (bg: SpatialBackground) => void;

  // ---- Actions: view ----
  setViewBox: (vb: ViewBox) => void;
  resetView: () => void;

  // ---- Actions: persistence ----
  save: () => void;
  load: () => void;
  reset: () => void;
  getDocJson: () => string;

  // ---- Actions: library ----
  /** Load a document from the artifact library */
  loadArtifactDocument: (doc: SpatialDocumentV1, artifactId: string, title: string) => void;
  /** Update artifact tracking after successful save-to-library */
  setArtifactMeta: (id: string, title: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addObjectToDoc(doc: SpatialDocumentV1, obj: SpatialDocumentV1['layers'][0]['objects'][0]) {
  const targetLayer =
    doc.layers.find((l) => l.visible && !l.locked) ?? doc.layers[0];
  if (!targetLayer) return doc;
  return {
    ...doc,
    layers: doc.layers.map((l) =>
      l.id === targetLayer.id
        ? { ...l, objects: [...l.objects, obj] }
        : l,
    ),
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSpatialEditorStore = create<SpatialEditorState>()((set, get) => ({
  // ---- Initial state ----
  doc: createDefaultDocument(),
  artifactId: null,
  artifactTitle: 'Untitled',
  selectedIds: [],
  activeTool: 'select',
  activePlaceType: null,
  placePolicy: 'sticky',
  viewBox: defaultViewBox(),
  dirty: false,
  pendingStart: null,
  pendingPolygonPoints: [],
  pendingPolygonType: null,
  pendingPathPoints: [],
  snapEnabled: true,
  constrainToContentBox: false,
  showTrail: true,
  backgroundLocked: false,

  // ---- Tool actions ----
  setActivePlaceType: (type) =>
    set({
      activePlaceType: type,
      activeTool: type ? 'place' : 'select',
      selectedIds: type ? [] : get().selectedIds,
      pendingStart: null,
    }),

  setTool: (tool) =>
    set({
      activeTool: tool,
      activePlaceType: tool === 'place' ? get().activePlaceType : null,
      pendingStart: null,
      pendingPolygonPoints: tool === 'polygon' ? get().pendingPolygonPoints : [],
      pendingPolygonType: tool === 'polygon' ? get().pendingPolygonType : null,
      pendingPathPoints: tool === 'path' ? get().pendingPathPoints : [],
      selectedIds: (tool === 'select' || tool === 'hand') ? get().selectedIds : [],
    }),

  setPlacePolicy: (policy) => set({ placePolicy: policy }),

  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),
  toggleConstrainToContentBox: () => set((s) => ({ constrainToContentBox: !s.constrainToContentBox })),
  toggleShowTrail: () => set((s) => ({ showTrail: !s.showTrail })),
  toggleBackgroundLocked: () => set((s) => ({ backgroundLocked: !s.backgroundLocked })),

  // ---- Object actions ----
  placeAt: (normalizedX, normalizedY) => {
    const { activePlaceType, doc, placePolicy, constrainToContentBox } = get();
    if (!activePlaceType) return;

    let px = normalizedX;
    let py = normalizedY;
    if (constrainToContentBox) {
      const box = getActiveContentBox(doc);
      if (box) {
        const clamped = clampToBox(px, py, box);
        px = clamped.nx;
        py = clamped.ny;
      }
    }

    const obj = createObject(activePlaceType, px, py);

    // Auto-assign sport marker image for player/ball when a sport background is active
    const bg = doc.background;
    if (bg.type === 'sport-field' && bg.variant) {
      if (activePlaceType === 'player' && PLAYER_MARKER_BY_SPORT[bg.variant]) {
        obj.props.markerImage = PLAYER_MARKER_BY_SPORT[bg.variant];
      }
      if (activePlaceType === 'ball' && BALL_MARKER_BY_SPORT[bg.variant]) {
        obj.props.markerImage = BALL_MARKER_BY_SPORT[bg.variant];
      }
    }

    const newDoc = addObjectToDoc(doc, obj);

    const stayInPlaceMode = placePolicy === 'sticky';

    set({
      doc: newDoc,
      selectedIds: [obj.id],
      activeTool: stayInPlaceMode ? 'place' : 'select',
      activePlaceType: stayInPlaceMode ? activePlaceType : null,
      dirty: true,
    });
  },

  // ---- Two-click arrow creation (Coach Diagram pattern) ----
  handleArrowClick: (nx, ny) => {
    const { pendingStart, doc, constrainToContentBox } = get();
    const box = constrainToContentBox ? getActiveContentBox(doc) : null;
    let cx = nx, cy = ny;
    if (box) { const c = clampToBox(cx, cy, box); cx = c.nx; cy = c.ny; }

    if (!pendingStart) {
      // First click — record start
      set({ pendingStart: { x: cx, y: cy } });
      return;
    }

    // Second click — create arrow
    const arrow = createArrow(pendingStart, { x: cx, y: cy });
    const newDoc = addObjectToDoc(doc, arrow);

    set({
      doc: newDoc,
      selectedIds: [arrow.id],
      activeTool: 'select',
      pendingStart: null,
      dirty: true,
    });
  },

  // ---- Two-click zone creation (Coach Diagram pattern) ----
  handleZoneClick: (nx, ny) => {
    const { pendingStart, doc, constrainToContentBox } = get();
    const box = constrainToContentBox ? getActiveContentBox(doc) : null;
    let cx = nx, cy = ny;
    if (box) { const c = clampToBox(cx, cy, box); cx = c.nx; cy = c.ny; }

    if (!pendingStart) {
      // First click — record start corner
      set({ pendingStart: { x: cx, y: cy } });
      return;
    }

    // Second click — create zone from two corners
    const zone = createZone(pendingStart, { x: cx, y: cy });
    const newDoc = addObjectToDoc(doc, zone);

    set({
      doc: newDoc,
      selectedIds: [zone.id],
      activeTool: 'select',
      pendingStart: null,
      dirty: true,
    });
  },

  // ---- Multi-click polygon creation ----
  startPolygon: (variant) => {
    set({
      activeTool: 'polygon',
      pendingPolygonPoints: [],
      pendingPolygonType: variant,
      activePlaceType: null,
      selectedIds: [],
      pendingStart: null,
    });
  },

  handlePolygonClick: (nx, ny) => {
    const { pendingPolygonPoints, pendingPolygonType, doc, constrainToContentBox } = get();
    if (!pendingPolygonType) return;

    const box = constrainToContentBox ? getActiveContentBox(doc) : null;
    let cx = nx, cy = ny;
    if (box) { const c = clampToBox(cx, cy, box); cx = c.nx; cy = c.ny; }

    // Close polygon: if >= 3 points and click is near the first point
    if (pendingPolygonPoints.length >= 3) {
      const first = pendingPolygonPoints[0];
      const dist = Math.sqrt((cx - first.x) ** 2 + (cy - first.y) ** 2);
      if (dist < 0.025) {
        // Close — finalize without adding the duplicate point
        get().finalizePolygon();
        return;
      }
    }

    // Add vertex
    set({ pendingPolygonPoints: [...pendingPolygonPoints, { x: cx, y: cy }] });
  },

  finalizePolygon: () => {
    const { pendingPolygonPoints, pendingPolygonType, doc } = get();
    if (!pendingPolygonType || pendingPolygonPoints.length < 3) {
      // Not enough points — cancel
      set({
        pendingPolygonPoints: [],
        pendingPolygonType: null,
        activeTool: 'select',
      });
      return;
    }

    const obj = createPolygonObject(pendingPolygonType, pendingPolygonPoints);
    const newDoc = addObjectToDoc(doc, obj);

    set({
      doc: newDoc,
      selectedIds: [obj.id],
      activeTool: 'select',
      pendingPolygonPoints: [],
      pendingPolygonType: null,
      dirty: true,
    });
  },

  cancelPolygon: () => {
    set({
      pendingPolygonPoints: [],
      pendingPolygonType: null,
      activeTool: 'select',
    });
  },

  // ---- Multi-click path creation ----
  startPath: () => {
    set({
      activeTool: 'path',
      pendingPathPoints: [],
      activePlaceType: null,
      selectedIds: [],
      pendingStart: null,
      pendingPolygonPoints: [],
      pendingPolygonType: null,
    });
  },

  handlePathClick: (nx, ny) => {
    const { pendingPathPoints, doc, constrainToContentBox } = get();
    const box = constrainToContentBox ? getActiveContentBox(doc) : null;
    let cx = nx, cy = ny;
    if (box) { const c = clampToBox(cx, cy, box); cx = c.nx; cy = c.ny; }

    // Add vertex
    set({ pendingPathPoints: [...pendingPathPoints, { x: cx, y: cy }] });
  },

  finalizePath: () => {
    const { pendingPathPoints, doc } = get();
    if (pendingPathPoints.length < 2) {
      // Not enough points — cancel
      set({
        pendingPathPoints: [],
        activeTool: 'select',
      });
      return;
    }

    const obj = createPathObject(pendingPathPoints);
    const newDoc = addObjectToDoc(doc, obj);

    set({
      doc: newDoc,
      selectedIds: [obj.id],
      activeTool: 'select',
      pendingPathPoints: [],
      dirty: true,
    });
  },

  cancelPath: () => {
    set({
      pendingPathPoints: [],
      activeTool: 'select',
    });
  },

  select: (id) => set({ selectedIds: id ? [id] : [] }),

  toggleSelect: (id) => {
    const { selectedIds } = get();
    if (selectedIds.includes(id)) {
      set({ selectedIds: selectedIds.filter((sid) => sid !== id) });
    } else {
      set({ selectedIds: [...selectedIds, id] });
    }
  },

  /**
   * Move selected objects by setting absolute positions.
   * For arrows, moves both endpoints by the same delta.
   */
  moveSelected: (positions: Map<string, { nx: number; ny: number }>) => {
    const { doc, constrainToContentBox } = get();
    if (positions.size === 0) return;

    const box = constrainToContentBox ? getActiveContentBox(doc) : null;

    const newLayers = doc.layers.map((layer) => ({
      ...layer,
      objects: layer.objects.map((obj) => {
        const pos = positions.get(obj.id);
        if (!pos) return obj;

        let { nx, ny } = pos;
        if (box) {
          const clamped = clampToBox(nx, ny, box);
          nx = clamped.nx;
          ny = clamped.ny;
        }

        // For arrows, compute delta from current midpoint and move both endpoints
        if (obj.type === 'arrow' && obj.from && obj.to) {
          const dx = nx - obj.t.x;
          const dy = ny - obj.t.y;
          return {
            ...obj,
            t: { ...obj.t, x: clamp01(nx), y: clamp01(ny) },
            from: { x: clamp01(obj.from.x + dx), y: clamp01(obj.from.y + dy) },
            to: { x: clamp01(obj.to.x + dx), y: clamp01(obj.to.y + dy) },
          };
        }

        // For polygon zones / path-segment polylines, move all vertices by the same delta
        const polyPts = obj.props.points as { x: number; y: number }[] | undefined;
        if (polyPts && polyPts.length >= 2) {
          const dx = nx - obj.t.x;
          const dy = ny - obj.t.y;
          return {
            ...obj,
            t: { ...obj.t, x: clamp01(nx), y: clamp01(ny) },
            props: {
              ...obj.props,
              points: polyPts.map((p) => ({
                x: clamp01(p.x + dx),
                y: clamp01(p.y + dy),
              })),
            },
          };
        }

        return {
          ...obj,
          t: {
            ...obj.t,
            x: clamp01(nx),
            y: clamp01(ny),
          },
        };
      }),
    }));

    set({ doc: { ...doc, layers: newLayers }, dirty: true });
  },

  /** Move a single arrow endpoint (from or to) — used for endpoint drag handles */
  moveArrowEndpoint: (id, handle, nx, ny) => {
    const { doc } = get();

    const newLayers = doc.layers.map((layer) => ({
      ...layer,
      objects: layer.objects.map((obj) => {
        if (obj.id !== id || obj.type !== 'arrow') return obj;

        const newFrom = handle === 'from' ? { x: clamp01(nx), y: clamp01(ny) } : obj.from!;
        const newTo = handle === 'to' ? { x: clamp01(nx), y: clamp01(ny) } : obj.to!;

        return {
          ...obj,
          from: newFrom,
          to: newTo,
          // Update midpoint
          t: { ...obj.t, x: (newFrom.x + newTo.x) / 2, y: (newFrom.y + newTo.y) / 2 },
        };
      }),
    }));

    set({ doc: { ...doc, layers: newLayers }, dirty: true });
  },

  deleteSelected: () => {
    const { doc, selectedIds } = get();
    if (selectedIds.length === 0) return;

    const idSet = new Set(selectedIds);

    const newLayers = doc.layers.map((layer) => ({
      ...layer,
      objects: layer.objects.filter((o) => !idSet.has(o.id)),
    }));

    set({
      doc: { ...doc, layers: newLayers },
      selectedIds: [],
      dirty: true,
    });
  },

  duplicateSelected: () => {
    const { doc, selectedIds } = get();
    if (selectedIds.length === 0) return;

    const allObjects = doc.layers.flatMap((l) => l.objects);
    const originals = selectedIds
      .map((id) => allObjects.find((o) => o.id === id))
      .filter(Boolean) as typeof allObjects;

    const offset = SNAP_STEP; // +2% offset
    const newIds: string[] = [];
    let newDoc = doc;

    for (const orig of originals) {
      const clone = JSON.parse(JSON.stringify(orig)) as typeof orig;
      clone.id = crypto.randomUUID();
      clone.t.x = clamp01(clone.t.x + offset);
      clone.t.y = clamp01(clone.t.y + offset);
      if (clone.from) {
        clone.from.x = clamp01(clone.from.x + offset);
        clone.from.y = clamp01(clone.from.y + offset);
      }
      if (clone.to) {
        clone.to.x = clamp01(clone.to.x + offset);
        clone.to.y = clamp01(clone.to.y + offset);
      }
      // Offset polygon/path vertices
      const clonePts = clone.props.points as { x: number; y: number }[] | undefined;
      if (clonePts && clonePts.length >= 2) {
        clone.props.points = clonePts.map((p) => ({
          x: clamp01(p.x + offset),
          y: clamp01(p.y + offset),
        }));
      }
      newDoc = addObjectToDoc(newDoc, clone);
      newIds.push(clone.id);
    }

    set({ doc: newDoc, selectedIds: newIds, dirty: true });
  },

  nudgeSelected: (dnx, dny) => {
    const { doc, selectedIds, constrainToContentBox } = get();
    if (selectedIds.length === 0) return;
    const idSet = new Set(selectedIds);
    const box = constrainToContentBox ? getActiveContentBox(doc) : null;

    const newLayers = doc.layers.map((layer) => ({
      ...layer,
      objects: layer.objects.map((obj) => {
        if (!idSet.has(obj.id)) return obj;

        let newX = clamp01(obj.t.x + dnx);
        let newY = clamp01(obj.t.y + dny);
        if (box) {
          const clamped = clampToBox(newX, newY, box);
          newX = clamped.nx;
          newY = clamped.ny;
        }

        if (obj.type === 'arrow' && obj.from && obj.to) {
          return {
            ...obj,
            t: { ...obj.t, x: newX, y: newY },
            from: { x: clamp01(obj.from.x + dnx), y: clamp01(obj.from.y + dny) },
            to: { x: clamp01(obj.to.x + dnx), y: clamp01(obj.to.y + dny) },
          };
        }

        // Nudge polygon/path vertices
        const nudgePts = obj.props.points as { x: number; y: number }[] | undefined;
        if (nudgePts && nudgePts.length >= 2) {
          return {
            ...obj,
            t: { ...obj.t, x: newX, y: newY },
            props: {
              ...obj.props,
              points: nudgePts.map((p) => ({
                x: clamp01(p.x + dnx),
                y: clamp01(p.y + dny),
              })),
            },
          };
        }

        return { ...obj, t: { ...obj.t, x: newX, y: newY } };
      }),
    }));

    set({ doc: { ...doc, layers: newLayers }, dirty: true });
  },

  updateObjectProps: (id, props) => {
    const { doc } = get();

    const newLayers = doc.layers.map((layer) => ({
      ...layer,
      objects: layer.objects.map((obj) => {
        if (obj.id !== id) return obj;
        return { ...obj, props: { ...obj.props, ...props } };
      }),
    }));

    set({ doc: { ...doc, layers: newLayers }, dirty: true });
  },

  updateObjectTransform: (id, t) => {
    const { doc } = get();

    const newLayers = doc.layers.map((layer) => ({
      ...layer,
      objects: layer.objects.map((obj) => {
        if (obj.id !== id) return obj;
        return { ...obj, t: { ...obj.t, ...t } };
      }),
    }));

    set({ doc: { ...doc, layers: newLayers }, dirty: true });
  },

  // ---- Checkpoint actions ----
  autoNumberCheckpoints: () => {
    const { doc } = get();
    // Gather all checkpoints, sort by y then x (top-to-bottom, left-to-right)
    const checkpoints: { layerIdx: number; objIdx: number; obj: typeof doc.layers[0]['objects'][0] }[] = [];
    doc.layers.forEach((layer, li) => {
      layer.objects.forEach((obj, oi) => {
        if (obj.type === 'checkpoint') {
          checkpoints.push({ layerIdx: li, objIdx: oi, obj });
        }
      });
    });
    if (checkpoints.length === 0) return;

    // Sort: primary by y (top→bottom), secondary by x (left→right)
    checkpoints.sort((a, b) => {
      const dy = a.obj.t.y - b.obj.t.y;
      if (Math.abs(dy) > 0.02) return dy; // tolerance band
      return a.obj.t.x - b.obj.t.x;
    });

    const newLayers = doc.layers.map((layer) => ({
      ...layer,
      objects: layer.objects.map((obj) => {
        if (obj.type !== 'checkpoint') return obj;
        const idx = checkpoints.findIndex((c) => c.obj.id === obj.id);
        if (idx === -1) return obj;
        const order = idx + 1;
        return { ...obj, props: { ...obj.props, order, label: String(order) } };
      }),
    }));

    set({ doc: { ...doc, layers: newLayers }, dirty: true });
  },

  renumberCheckpoints: () => {
    const { doc } = get();
    // Gather all checkpoints, sort by current order
    const checkpoints: { id: string; order: number }[] = [];
    doc.layers.forEach((layer) => {
      layer.objects.forEach((obj) => {
        if (obj.type === 'checkpoint') {
          checkpoints.push({ id: obj.id, order: (obj.props.order as number) ?? 999 });
        }
      });
    });
    if (checkpoints.length === 0) return;

    checkpoints.sort((a, b) => a.order - b.order);

    const orderMap = new Map(checkpoints.map((c, i) => [c.id, i + 1]));

    const newLayers = doc.layers.map((layer) => ({
      ...layer,
      objects: layer.objects.map((obj) => {
        const newOrder = orderMap.get(obj.id);
        if (newOrder == null) return obj;
        return { ...obj, props: { ...obj.props, order: newOrder, label: String(newOrder) } };
      }),
    }));

    set({ doc: { ...doc, layers: newLayers }, dirty: true });
  },

  exportCheckpointManifest: () => {
    const { doc } = get();
    const checkpoints: {
      id: string;
      order: number;
      label: string;
      kind: string;
      nx: number;
      ny: number;
      notes: string;
    }[] = [];

    doc.layers.forEach((layer) => {
      layer.objects.forEach((obj) => {
        if (obj.type === 'checkpoint') {
          checkpoints.push({
            id: obj.id,
            order: (obj.props.order as number) ?? 0,
            label: (obj.props.label as string) ?? '',
            kind: (obj.props.kind as string) ?? 'checkpoint',
            nx: obj.t.x,
            ny: obj.t.y,
            notes: (obj.props.notes as string) ?? '',
          });
        }
      });
    });

    checkpoints.sort((a, b) => a.order - b.order);
    return JSON.stringify(checkpoints, null, 2);
  },

  // ---- Background actions ----
  setBackground: (bg) => {
    const { doc } = get();
    set({ doc: { ...doc, background: bg }, dirty: true });
  },

  // ---- View actions ----
  setViewBox: (vb) => set({ viewBox: vb }),
  resetView: () => set({ viewBox: defaultViewBox() }),

  // ---- Persistence ----
  save: () => {
    saveDocument(get().doc);
    set({ dirty: false });
  },

  load: () => {
    const loaded = loadDocument();
    if (loaded) {
      set({
        doc: loaded,
        selectedIds: [],
        activeTool: 'select',
        activePlaceType: null,
        viewBox: defaultViewBox(),
        dirty: false,
        pendingStart: null,
      });
    }
  },

  reset: () => {
    clearDocument();
    set({
      doc: createDefaultDocument(),
      selectedIds: [],
      activeTool: 'select',
      activePlaceType: null,
      viewBox: defaultViewBox(),
      dirty: false,
      pendingStart: null,
      pendingPolygonPoints: [],
      pendingPolygonType: null,
      pendingPathPoints: [],
      artifactId: null,
      artifactTitle: 'Untitled',
    });
  },

  getDocJson: () => JSON.stringify(get().doc, null, 2),

  // ---- Library actions ----
  loadArtifactDocument: (doc, artifactId, title) => {
    set({
      doc,
      artifactId,
      artifactTitle: title,
      selectedIds: [],
      activeTool: 'select',
      activePlaceType: null,
      viewBox: defaultViewBox(),
      dirty: false,
      pendingStart: null,
    });
  },

  setArtifactMeta: (id, title) => {
    set({ artifactId: id, artifactTitle: title, dirty: false });
  },
}));
