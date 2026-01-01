import { z } from 'zod'

/**
 * Canonical Award Builder export schema v1.
 * Source of truth: docs/gamification/AWARD_BUILDER_EXPORT_SCHEMA_V1.md
 */
export const awardBuilderExportSchemaV1 = z
  .object({
    schema_version: z.literal('1.0'),
    exported_at: z.string().datetime(),
    exported_by: z.object({
      user_id: z.string().uuid(),
      tool: z.string().min(1),
      tool_version: z.string().min(1).optional(),
    }),
    publish_scope: z.object({
      type: z.enum(['global', 'tenant']),
      tenant_id: z.string().uuid().nullable(),
    }),
    achievements: z
      .array(
        z.object({
          achievement_key: z.string().min(1),
          name: z.string(),
          description: z.string(),
          icon: z.object({
            icon_media_id: z.string().uuid().nullable(),
            icon_url_legacy: z.string().nullable(),
          }),
          badge: z.object({
            badge_color: z.string().nullable(),
          }),
          visibility: z.object({
            is_easter_egg: z.boolean(),
            hint_text: z.string().nullable(),
          }),
          unlock: z.object({
            condition_type: z.string().min(1),
            condition_value: z.number().nullable(),
            unlock_criteria: z.object({
              type: z.enum(['event', 'milestone', 'manual']),
              params: z.record(z.unknown()),
            }),
          }),
        }),
      )
      .min(1),
  })
  .superRefine((val, ctx) => {
    if (val.publish_scope.type === 'global') {
      if (val.publish_scope.tenant_id !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['publish_scope', 'tenant_id'],
          message: 'publish_scope.tenant_id must be null for global scope',
        })
      }
    }

    if (val.publish_scope.type === 'tenant') {
      if (val.publish_scope.tenant_id === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['publish_scope', 'tenant_id'],
          message: 'publish_scope.tenant_id is required for tenant scope',
        })
      }
    }
  })

export type AwardBuilderExportV1 = z.infer<typeof awardBuilderExportSchemaV1>
