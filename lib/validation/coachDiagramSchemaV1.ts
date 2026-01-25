import { z } from 'zod';

const positionSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

const objectSchemaV1 = z.object({
  id: z.string().min(1),
  type: z.enum(['player', 'ball', 'marker']),
  position: positionSchema,
  style: z.object({
    color: z.string().min(1),
    size: z.enum(['sm', 'md', 'lg']),
    label: z.string().max(16).optional(),
  }),
});

const arrowSchemaV1 = z.object({
  id: z.string().min(1),
  from: positionSchema,
  to: positionSchema,
  style: z.object({
    color: z.string().min(1),
    pattern: z.enum(['solid', 'dashed']),
    arrowhead: z.boolean(),
  }),
  label: z.string().max(32).optional(),
});

// Zone types for highlighting areas on the field
const zoneRectSchemaV1 = z.object({
  id: z.string().min(1),
  type: z.literal('rect'),
  // Normalized position (0-1)
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  // Normalized size (0-1)
  width: z.number().min(0.02).max(1),
  height: z.number().min(0.02).max(1),
  style: z.object({
    fill: z.string().min(1),
    fillOpacity: z.number().min(0).max(1).default(0.2),
  }),
});

const zoneCircleSchemaV1 = z.object({
  id: z.string().min(1),
  type: z.literal('circle'),
  // Normalized center (0-1)
  cx: z.number().min(0).max(1),
  cy: z.number().min(0).max(1),
  // Normalized radius (0-0.5)
  r: z.number().min(0.02).max(0.5),
  style: z.object({
    fill: z.string().min(1),
    fillOpacity: z.number().min(0).max(1).default(0.2),
  }),
});

const zoneTriangleSchemaV1 = z.object({
  id: z.string().min(1),
  type: z.literal('triangle'),
  // Normalized points (0-1)
  points: z.tuple([positionSchema, positionSchema, positionSchema]),
  style: z.object({
    fill: z.string().min(1),
    fillOpacity: z.number().min(0).max(1).default(0.2),
  }),
});

const zoneSchemaV1 = z.discriminatedUnion('type', [
  zoneRectSchemaV1,
  zoneCircleSchemaV1,
  zoneTriangleSchemaV1,
]);

export type ZoneV1 = z.infer<typeof zoneSchemaV1>;
export type ZoneRectV1 = z.infer<typeof zoneRectSchemaV1>;
export type ZoneCircleV1 = z.infer<typeof zoneCircleSchemaV1>;
export type ZoneTriangleV1 = z.infer<typeof zoneTriangleSchemaV1>;

export const coachDiagramDocumentSchemaV1 = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().uuid(),
    title: z.string().min(1).max(120),
    sportType: z.enum(['football', 'basketball', 'handball', 'hockey', 'innebandy', 'custom']),
    fieldTemplateId: z.string().min(1).max(64),
    objects: z.array(objectSchemaV1),
    arrows: z.array(arrowSchemaV1),
    zones: z.array(zoneSchemaV1).default([]),
    metadata: z.record(z.unknown()).optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .superRefine((doc, ctx) => {
    const ballCount = doc.objects.filter((o) => o.type === 'ball').length;
    if (ballCount > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['objects'],
        message: 'Max 1 ball is allowed',
      });
    }
  });

export type CoachDiagramDocumentV1 = z.infer<typeof coachDiagramDocumentSchemaV1>;
