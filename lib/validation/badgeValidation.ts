/**
 * Server-side badge validation for API routes
 * Mirrors client validation but designed for API usage
 */

import { z } from 'zod';

// Constants (must match client-side)
export const REWARD_COINS_MIN = 0;
export const REWARD_COINS_MAX = 10_000;
export const TITLE_MIN_LENGTH = 1;
export const TITLE_MAX_LENGTH = 100;

/**
 * Schema for badge data within the export JSON
 * Used in POST/PUT routes to validate badge content when status is 'published'
 */
export const badgeContentSchema = z.object({
  title: z.string().min(TITLE_MIN_LENGTH).max(TITLE_MAX_LENGTH),
  description: z.string().optional(),
  status: z.enum(['draft', 'published']).optional().default('draft'),
  version: z.number().int().positive().optional(),
  rewardCoins: z.number().min(REWARD_COINS_MIN).max(REWARD_COINS_MAX).optional().default(0),
  icon: z.object({
    themeId: z.string().optional(),
    base: z.object({ 
      id: z.string().min(1), 
      color: z.string().optional() 
    }).nullable().optional(),
    symbol: z.object({ 
      id: z.string().min(1), 
      color: z.string().optional() 
    }).nullable().optional(),
    backgrounds: z.array(z.unknown()).optional(),
    foregrounds: z.array(z.unknown()).optional(),
  }),
});

/**
 * Check if a badge icon has at least one visual anchor
 */
function hasVisualAnchor(icon: { base?: { id: string } | null; symbol?: { id: string } | null }): boolean {
  return Boolean(icon.base?.id) || Boolean(icon.symbol?.id);
}

export type BadgeValidationError = {
  field: string;
  message: string;
};

export type BadgeValidationResult = {
  valid: boolean;
  errors: BadgeValidationError[];
};

/**
 * Validate badge for publishing (server-side)
 * Called on POST/PUT when status is 'published'
 */
export function validateBadgeForPublish(badge: unknown): BadgeValidationResult {
  const errors: BadgeValidationError[] = [];

  // First, validate basic structure
  const parsed = badgeContentSchema.safeParse(badge);
  if (!parsed.success) {
    return {
      valid: false,
      errors: parsed.error.issues.map(issue => ({
        field: issue.path.join('.') || 'badge',
        message: issue.message,
      })),
    };
  }

  const data = parsed.data;

  // Check visual anchor requirement
  if (!hasVisualAnchor(data.icon)) {
    errors.push({
      field: 'icon',
      message: 'Badge must have at least a base shape or a symbol for publishing',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Extract badge item from canonical export format
 * Returns null if extraction fails
 */
export function extractBadgeFromExport(exportJson: unknown): unknown | null {
  if (!exportJson || typeof exportJson !== 'object') return null;
  
  const exp = exportJson as Record<string, unknown>;
  if (!exp.items || !Array.isArray(exp.items)) return null;
  
  const badges = exp.items.filter(
    (item: unknown) => item && typeof item === 'object' && (item as Record<string, unknown>).type === 'badge'
  );
  
  if (badges.length === 0) return null;
  
  const badge = badges[0] as Record<string, unknown>;
  return badge.data ?? null;
}

/**
 * Determine if validation should be applied
 * Only published badges need full validation
 */
export function shouldValidateForPublish(exportJson: unknown): boolean {
  const badge = extractBadgeFromExport(exportJson);
  if (!badge || typeof badge !== 'object') return false;
  
  return (badge as Record<string, unknown>).status === 'published';
}
