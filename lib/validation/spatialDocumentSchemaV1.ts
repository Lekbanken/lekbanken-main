import { z } from 'zod';

// =============================================================================
// Spatial Document V1 — Zod validation schema
// =============================================================================
// Mirrors the TypeScript interfaces in
//   features/admin/library/spatial-editor/lib/types.ts
// Used for runtime validation of the `document` field in saveSpatialArtifact.
// =============================================================================

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** Normalized 0..1 coordinate */
const norm01 = z.number().min(0).max(1);

/** Position { x, y } in normalized coords */
const positionSchema = z.object({
  x: norm01,
  y: norm01,
});

// ---------------------------------------------------------------------------
// Transform
// ---------------------------------------------------------------------------

const spatialTransformSchema = z.object({
  x: norm01,
  y: norm01,
  rotation: z.number().optional(),
  scale: z.number().min(0).optional(),
});

// ---------------------------------------------------------------------------
// Object types (union of all known types)
// ---------------------------------------------------------------------------

const pointObjectTypes = [
  // Core
  'player', 'ball', 'cone', 'label', 'checkpoint',
  // Landmarks
  'tree', 'bush', 'house', 'building', 'path-segment', 'bridge', 'water', 'hill', 'bench', 'fence', 'playground',
  // Game assets
  'flag-start', 'trophy', 'x-mark', 'treasure', 'key', 'clue', 'danger',
  // Helpers
  'compass', 'num-badge',
  // Indoor
  'table', 'chair', 'whiteboard', 'door',
] as const;

const spatialObjectTypeSchema = z.enum([
  ...pointObjectTypes,
  'arrow',
  'zone',
]);

// ---------------------------------------------------------------------------
// Object
// ---------------------------------------------------------------------------

const spatialObjectSchema = z.object({
  id: z.string().min(1),
  type: spatialObjectTypeSchema,
  t: spatialTransformSchema,
  from: positionSchema.optional(),
  to: positionSchema.optional(),
  props: z.record(z.unknown()),
});

// ---------------------------------------------------------------------------
// Layer
// ---------------------------------------------------------------------------

const spatialLayerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  visible: z.boolean(),
  locked: z.boolean(),
  objects: z.array(spatialObjectSchema),
});

// ---------------------------------------------------------------------------
// Background
// ---------------------------------------------------------------------------

const backgroundTypeSchema = z.enum(['grid', 'image', 'sport-field']);

const spatialBackgroundSchema = z.object({
  type: backgroundTypeSchema,
  src: z.string().optional(),
  imageWidth: z.number().positive().optional(),
  imageHeight: z.number().positive().optional(),
  variant: z.string().max(64).optional(),
  opacity: z.number().min(0).max(1).optional(),
});

// ---------------------------------------------------------------------------
// Document (root)
// ---------------------------------------------------------------------------

export const spatialDocumentSchemaV1 = z
  .object({
    version: z.literal(1),
    world: z.object({
      width: z.number().int().positive().max(10_000),
      height: z.number().int().positive().max(20_000),
    }),
    background: spatialBackgroundSchema,
    layers: z.array(spatialLayerSchema).min(1).max(50),
  })
  .superRefine((doc, ctx) => {
    // Guard: total object count must be reasonable
    const totalObjects = doc.layers.reduce((n, l) => n + l.objects.length, 0);
    if (totalObjects > 2_000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['layers'],
        message: `Document contains ${totalObjects} objects (max 2 000)`,
      });
    }

    // Guard: unique layer IDs
    const layerIds = doc.layers.map((l) => l.id);
    const dupes = layerIds.filter((id, i) => layerIds.indexOf(id) !== i);
    if (dupes.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['layers'],
        message: `Duplicate layer IDs: ${dupes.join(', ')}`,
      });
    }
  });

export type ValidatedSpatialDocumentV1 = z.infer<typeof spatialDocumentSchemaV1>;
