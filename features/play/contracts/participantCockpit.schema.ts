/**
 * Participant Cockpit Contract — Zod Schemas
 *
 * Runtime-validated shapes for every payload the participant UI receives.
 * Explicitly **forbids** host-only fields so that regressions are caught
 * instantly (dev-only safeParse in the API client layer).
 *
 * These schemas do NOT change user-facing UI — they only validate and log.
 *
 * @see PARTICIPANT_PLAY_AUDIT.md § B "Locked Visibility Rules"
 */

import { z } from 'zod';

// =============================================================================
// Forbidden-field refinements
// =============================================================================

/** Fields that must NEVER appear in participant step responses */
const HOST_ONLY_STEP_FIELDS = ['leaderScript', 'boardText', 'leaderTips'] as const;

/** Fields that must NEVER appear in participant role responses */
const HOST_ONLY_ROLE_FIELDS = [
  'assignment_strategy',
  'scaling_rules',
  'conflicts_with',
  'min_count',
  'max_count',
] as const;

// =============================================================================
// Step schema (participant-safe)
// =============================================================================

export const ParticipantGameStepSchema = z
  .object({
    id: z.string(),
    index: z.number().optional(),
    title: z.string(),
    description: z.string(),
    content: z.string().optional(),
    durationMinutes: z.number().optional(),
    duration: z.number().nullable().optional(),
    display_mode: z.enum(['instant', 'typewriter', 'dramatic']).nullable().optional(),
    media: z
      .object({ type: z.string(), url: z.string(), altText: z.string().optional() })
      .optional(),
    materials: z.array(z.string()).optional(),
    safety: z.string().optional(),
    tag: z.string().optional(),
    note: z.string().optional(),
  })
  .passthrough()
  .superRefine((val, ctx) => {
    for (const field of HOST_ONLY_STEP_FIELDS) {
      if (field in val) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `[CONTRACT] Host-only field "${field}" present in participant step response`,
          path: [field],
        });
      }
    }
  });

export type ParticipantGameStep = z.infer<typeof ParticipantGameStepSchema>;

// =============================================================================
// Phase schema
// =============================================================================

export const ParticipantPhaseSchema = z.object({
  id: z.string().optional(),
  index: z.number().optional(),
  name: z.string(),
  description: z.string().optional(),
  duration: z.number().nullable().optional(),
});

export type ParticipantPhase = z.infer<typeof ParticipantPhaseSchema>;

// =============================================================================
// Role schema (participant-safe)
// =============================================================================

export const ParticipantRoleSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    icon: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    public_description: z.string().nullable().optional(),
    private_instructions: z.string().nullable().optional(),
    private_hints: z.string().nullable().optional(),
  })
  .passthrough()
  .superRefine((val, ctx) => {
    for (const field of HOST_ONLY_ROLE_FIELDS) {
      if (field in val) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `[CONTRACT] Host-only field "${field}" present in participant role response`,
          path: [field],
        });
      }
    }
  });

export type ParticipantRole = z.infer<typeof ParticipantRoleSchema>;

// =============================================================================
// Safety schema (participant-safe — leaderTips forbidden)
// =============================================================================

export const ParticipantSafetySchema = z
  .object({
    safetyNotes: z.string().optional(),
    accessibilityNotes: z.string().optional(),
    spaceRequirements: z.string().optional(),
  })
  .passthrough()
  .superRefine((val, ctx) => {
    if ('leaderTips' in val && val.leaderTips != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '[CONTRACT] Host-only field "leaderTips" present in participant safety response',
        path: ['leaderTips'],
      });
    }
  });

// =============================================================================
// Game response (the full /sessions/:id/game payload for participants)
// =============================================================================

export const ParticipantGameResponseSchema = z.object({
  title: z.string().optional(),
  playMode: z.enum(['basic', 'facilitated', 'participants']).optional(),
  board: z
    .object({
      theme: z.string().optional(),
    })
    .optional(),
  steps: z.array(ParticipantGameStepSchema),
  phases: z.array(ParticipantPhaseSchema),
  tools: z.array(z.object({ tool_key: z.string() }).passthrough()).optional(),
  safety: ParticipantSafetySchema.optional(),
});

export type ParticipantGameResponse = z.infer<typeof ParticipantGameResponseSchema>;

// =============================================================================
// Artifact variant schema
// =============================================================================

export const ParticipantArtifactVariantSchema = z.object({
  id: z.string(),
  session_artifact_id: z.string(),
  title: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
  media_ref: z.unknown().optional(),
  variant_order: z.number().nullable().optional(),
  metadata: z.unknown().optional(),
  visibility: z.enum(['public', 'leader_only', 'role_private']).nullable().optional(),
  visible_to_session_role_id: z.string().nullable().optional(),
  revealed_at: z.string().nullable().optional(),
  highlighted_at: z.string().nullable().optional(),
  // v1.1 canonical "used" column — optional until DB migration lands.
  // When present, this is the SOLE source of truth for "variant is done".
  // Compat: isVariantUsed() falls back to metadata.solved/metadata.used.
  used_at: z.string().nullable().optional(),
});

// =============================================================================
// Artifact schema
// =============================================================================

export const ParticipantArtifactSchema = z.object({
  id: z.string(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  artifact_type: z.string().nullable().optional(),
  artifact_order: z.number().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

// =============================================================================
// Artifacts response
// =============================================================================

export const ParticipantArtifactsResponseSchema = z.object({
  artifacts: z.array(ParticipantArtifactSchema),
  variants: z.array(ParticipantArtifactVariantSchema),
});

// =============================================================================
// Decision schemas
// =============================================================================

export const ParticipantDecisionSchema = z.object({
  id: z.string(),
  title: z.string(),
  prompt: z.string().nullable().optional(),
  decision_type: z.string().nullable().optional(),
  options: z
    .array(z.object({ key: z.string(), label: z.string() }))
    .nullable()
    .optional(),
  status: z.enum(['draft', 'open', 'closed', 'revealed']),
  allow_anonymous: z.boolean().nullable().optional(),
  max_choices: z.number().nullable().optional(),
  opened_at: z.string().nullable().optional(),
  closed_at: z.string().nullable().optional(),
  revealed_at: z.string().nullable().optional(),
});

export const ParticipantDecisionsResponseSchema = z.object({
  decisions: z.array(ParticipantDecisionSchema),
});

// =============================================================================
// Role endpoint response
// =============================================================================

export const ParticipantRoleResponseSchema = z.object({
  role: ParticipantRoleSchema.nullable(),
  revealedAt: z.string().nullable().optional(),
  secretRevealedAt: z.string().nullable().optional(),
});

// =============================================================================
// Dev-only helpers
// =============================================================================

const IS_DEV = process.env.NODE_ENV !== 'production';

/**
 * Validate a participant-facing payload in dev.
 * Logs `[CONTRACT]` warnings for any violations.
 * Returns the data unchanged — never crashes the UI.
 */
export function validateParticipantPayload<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  label: string,
): T {
  if (!IS_DEV) return data as T;

  const result = schema.safeParse(data);
  if (!result.success) {
    for (const issue of result.error.issues) {
      console.error(
        `[CONTRACT] ${label} — ${issue.message}`,
        { path: issue.path.join('.'), code: issue.code },
      );
    }
  }
  // Always return the original data so UI doesn't break
  return data as T;
}

/**
 * List of all host-only step fields — importable by server routes
 * for hard-strip assertions.
 */
export const FORBIDDEN_PARTICIPANT_STEP_KEYS = HOST_ONLY_STEP_FIELDS;
export const FORBIDDEN_PARTICIPANT_ROLE_KEYS = HOST_ONLY_ROLE_FIELDS;
