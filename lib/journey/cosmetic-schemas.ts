/**
 * Zod validation schemas for cosmetic admin CRUD.
 * render_config is validated per render_type (discriminated).
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// render_config schemas — one per render_type
// ---------------------------------------------------------------------------

export const svgFrameConfigSchema = z.object({
  variant: z.string().min(1),
  glowColor: z.string().optional(),
});

export const cssBackgroundConfigSchema = z.object({
  className: z.string().min(1),
  keyframes: z.string().optional(),
});

export const cssParticlesConfigSchema = z.object({
  className: z.string().min(1),
  count: z.number().int().min(1).max(32).optional(),
});

export const xpSkinConfigSchema = z.object({
  skin: z.string().min(1),
  colorMode: z.string().optional(),
});

export const cssDividerConfigSchema = z.object({
  variant: z.string().min(1),
  className: z.string().optional(),
});

export const titleConfigSchema = z.object({
  label: z.string().min(1),
});

export const RENDER_TYPE_SCHEMAS: Record<string, z.ZodType> = {
  svg_frame: svgFrameConfigSchema,
  css_background: cssBackgroundConfigSchema,
  css_particles: cssParticlesConfigSchema,
  xp_skin: xpSkinConfigSchema,
  css_divider: cssDividerConfigSchema,
  title: titleConfigSchema,
};

// ---------------------------------------------------------------------------
// Cosmetic create / update schema
// ---------------------------------------------------------------------------

export const cosmeticCreateSchema = z.object({
  key: z.string().min(1).max(200),
  category: z.enum(['avatar_frame', 'scene_background', 'particles', 'xp_bar', 'section_divider', 'title']),
  factionId: z.enum(['forest', 'sea', 'desert', 'void']).nullable().optional(),
  rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']).default('common'),
  nameKey: z.string().min(1).max(300),
  descriptionKey: z.string().min(1).max(300),
  renderType: z.enum(['svg_frame', 'css_background', 'css_particles', 'xp_skin', 'css_divider', 'title']),
  renderConfig: z.record(z.unknown()),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  requiredLevel: z.number().int().min(1).nullable().optional(),
});

export const cosmeticUpdateSchema = cosmeticCreateSchema.partial();

// ---------------------------------------------------------------------------
// Unlock rule schema
// ---------------------------------------------------------------------------

export const unlockRuleCreateSchema = z.object({
  cosmeticId: z.string().uuid(),
  unlockType: z.enum(['level', 'achievement', 'shop', 'event', 'manual']),
  unlockConfig: z.record(z.unknown()),
  priority: z.number().int().default(0),
});

// ---------------------------------------------------------------------------
// Grant schema
// ---------------------------------------------------------------------------

export const grantSchema = z.object({
  cosmeticId: z.string().uuid(),
  userId: z.string().uuid(),
  reason: z.string().min(1).max(500),
});

/**
 * Validate render_config against the schema for the given render_type.
 * Returns { success: true, data } or { success: false, error }.
 */
export function validateRenderConfig(renderType: string, renderConfig: unknown) {
  const schema = RENDER_TYPE_SCHEMAS[renderType];
  if (!schema) {
    return { success: false as const, error: `Unknown render_type: ${renderType}` };
  }
  const result = schema.safeParse(renderConfig);
  if (!result.success) {
    return { success: false as const, error: result.error.flatten() };
  }
  return { success: true as const, data: result.data };
}
