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

export const coachDiagramDocumentSchemaV1 = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().uuid(),
    title: z.string().min(1).max(120),
    sportType: z.enum(['football', 'basketball', 'handball', 'custom']),
    fieldTemplateId: z.string().min(1).max(64),
    objects: z.array(objectSchemaV1),
    arrows: z.array(arrowSchemaV1),
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
