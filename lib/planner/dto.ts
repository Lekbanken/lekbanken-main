/**
 * Planner DTO (Data Transfer Object) Schemas
 * 
 * Zod schemas for validating and typing API responses.
 * Provides a stable contract between server and client.
 */

import { z } from 'zod'

// =============================================================================
// ENUMS
// =============================================================================

export const PlannerStatusSchema = z.enum(['draft', 'published', 'modified', 'archived'])
export const PlannerVisibilitySchema = z.enum(['private', 'tenant', 'public'])
export const PlannerBlockTypeSchema = z.enum(['game', 'pause', 'preparation', 'custom'])

// =============================================================================
// GAME SUMMARY (embedded in blocks)
// =============================================================================

export const PlannerGameSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  shortDescription: z.string().nullable().optional(),
  durationMinutes: z.number().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
  energyLevel: z.string().nullable().optional(),
  locationType: z.string().nullable().optional(),
})

export type PlannerGameSummaryDTO = z.infer<typeof PlannerGameSummarySchema>

// =============================================================================
// BLOCK
// =============================================================================

export const PlannerBlockSchema = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid(),
  position: z.number().int().min(0),
  blockType: PlannerBlockTypeSchema,
  durationMinutes: z.number().nullable().optional(),
  title: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  isOptional: z.boolean().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  game: PlannerGameSummarySchema.nullable().optional(),
})

export type PlannerBlockDTO = z.infer<typeof PlannerBlockSchema>

// =============================================================================
// NOTE
// =============================================================================

export const PlannerNoteSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string().uuid(),
})

export const PlannerNotesSchema = z.object({
  privateNote: PlannerNoteSchema.nullable().optional(),
  tenantNote: PlannerNoteSchema.nullable().optional(),
})

export type PlannerNoteDTO = z.infer<typeof PlannerNoteSchema>
export type PlannerNotesDTO = z.infer<typeof PlannerNotesSchema>

// =============================================================================
// VERSION
// =============================================================================

export const PlannerVersionSchema = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid(),
  versionNumber: z.number().int().positive(),
  name: z.string(),
  description: z.string().nullable().optional(),
  totalTimeMinutes: z.number().int().min(0),
  publishedAt: z.string(),
  publishedBy: z.string().uuid(),
})

export type PlannerVersionDTO = z.infer<typeof PlannerVersionSchema>

// =============================================================================
// PLAN (main entity)
// =============================================================================

export const PlannerPlanSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  visibility: PlannerVisibilitySchema,
  status: PlannerStatusSchema,
  ownerUserId: z.string().uuid(),
  ownerTenantId: z.string().uuid().nullable().optional(),
  totalTimeMinutes: z.number().nullable().optional(),
  currentVersionId: z.string().uuid().nullable().optional(),
  currentVersion: PlannerVersionSchema.nullable().optional(),
  updatedAt: z.string(),
  metadata: z.record(z.unknown()).nullable().optional(),
  blocks: z.array(PlannerBlockSchema),
  notes: PlannerNotesSchema.optional(),
})

export type PlannerPlanDTO = z.infer<typeof PlannerPlanSchema>

// =============================================================================
// CAPABILITIES
// =============================================================================

export const PlanCapabilitiesSchema = z.object({
  canRead: z.boolean(),
  canUpdate: z.boolean(),
  canDelete: z.boolean(),
  canPublish: z.boolean(),
  canSetVisibilityPublic: z.boolean(),
  canCreateTemplate: z.boolean(),
  canStartRun: z.boolean(),
})

export type PlanCapabilitiesDTO = z.infer<typeof PlanCapabilitiesSchema>

// =============================================================================
// API RESPONSE SCHEMAS
// =============================================================================

// Single plan response
export const PlanResponseSchema = z.object({
  plan: PlannerPlanSchema,
  _capabilities: PlanCapabilitiesSchema.optional(),
})

export type PlanResponseDTO = z.infer<typeof PlanResponseSchema>

// Plan list with pagination
export const PlanSearchResponseSchema = z.object({
  plans: z.array(PlannerPlanSchema.extend({
    _capabilities: PlanCapabilitiesSchema.optional(),
  })),
  pagination: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().min(0),
    hasMore: z.boolean(),
  }),
})

export type PlanSearchResponseDTO = z.infer<typeof PlanSearchResponseSchema>

// Publish response
export const PublishResponseSchema = z.object({
  version: PlannerVersionSchema,
  plan: z.object({
    id: z.string().uuid(),
    status: PlannerStatusSchema,
    currentVersionId: z.string().uuid(),
  }),
})

export type PublishResponseDTO = z.infer<typeof PublishResponseSchema>

// Versions list response
export const VersionsResponseSchema = z.object({
  versions: z.array(PlannerVersionSchema.extend({
    isCurrent: z.boolean(),
  })),
  currentVersionId: z.string().uuid().nullable(),
})

export type VersionsResponseDTO = z.infer<typeof VersionsResponseSchema>

// Copy/template response
export const CopyPlanResponseSchema = z.object({
  plan: PlannerPlanSchema,
})

export type CopyPlanResponseDTO = z.infer<typeof CopyPlanResponseSchema>

// =============================================================================
// REQUEST SCHEMAS
// =============================================================================

export const CreatePlanRequestSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  visibility: PlannerVisibilitySchema.optional().default('private'),
  owner_tenant_id: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export type CreatePlanRequestDTO = z.infer<typeof CreatePlanRequestSchema>

export const UpdatePlanRequestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export type UpdatePlanRequestDTO = z.infer<typeof UpdatePlanRequestSchema>

export const UpdateVisibilityRequestSchema = z.object({
  visibility: PlannerVisibilitySchema,
  owner_tenant_id: z.string().uuid().nullable().optional(),
})

export type UpdateVisibilityRequestDTO = z.infer<typeof UpdateVisibilityRequestSchema>

export const UpdateStatusRequestSchema = z.object({
  status: PlannerStatusSchema,
})

export type UpdateStatusRequestDTO = z.infer<typeof UpdateStatusRequestSchema>

export const SearchPlansRequestSchema = z.object({
  search: z.string().optional(),
  tenantId: z.string().uuid().nullable().optional(),
  visibility: PlannerVisibilitySchema.optional(),
  status: PlannerStatusSchema.optional(),
  includeArchived: z.boolean().optional().default(false),
  page: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().min(1).max(100).optional().default(20),
})

export type SearchPlansRequestDTO = z.infer<typeof SearchPlansRequestSchema>

export const CopyPlanRequestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  visibility: PlannerVisibilitySchema.optional(),
  owner_tenant_id: z.string().uuid().nullable().optional(),
})

export type CopyPlanRequestDTO = z.infer<typeof CopyPlanRequestSchema>

export const CreateBlockRequestSchema = z.object({
  block_type: PlannerBlockTypeSchema,
  game_id: z.string().uuid().nullable().optional(),
  duration_minutes: z.number().int().min(0).nullable().optional(),
  title: z.string().max(200).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  position: z.number().int().min(0).optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  is_optional: z.boolean().nullable().optional(),
})

export type CreateBlockRequestDTO = z.infer<typeof CreateBlockRequestSchema>

export const UpdateBlockRequestSchema = CreateBlockRequestSchema.partial()

export type UpdateBlockRequestDTO = z.infer<typeof UpdateBlockRequestSchema>

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate and parse a plan response.
 * Throws ZodError if validation fails.
 */
export function validatePlanResponse(data: unknown): PlanResponseDTO {
  return PlanResponseSchema.parse(data)
}

/**
 * Validate and parse a plan search response.
 * Throws ZodError if validation fails.
 */
export function validatePlanSearchResponse(data: unknown): PlanSearchResponseDTO {
  return PlanSearchResponseSchema.parse(data)
}

/**
 * Safe validation that returns a result object instead of throwing.
 */
export function safeParsePlanResponse(data: unknown) {
  return PlanResponseSchema.safeParse(data)
}

export function safeParsePlanSearchResponse(data: unknown) {
  return PlanSearchResponseSchema.safeParse(data)
}
