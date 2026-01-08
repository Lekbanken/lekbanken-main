/**
 * Badge publish validation rules
 * Shared between client and server to ensure consistency
 */

import { z } from 'zod';
import type { AchievementItem, AchievementIconConfig } from './types';

// Constants
export const REWARD_COINS_MIN = 0;
export const REWARD_COINS_MAX = 10_000;
export const TITLE_MIN_LENGTH = 1;
export const TITLE_MAX_LENGTH = 100;

// Zod schema for publish validation
export const badgePublishSchema = z.object({
  title: z
    .string()
    .min(TITLE_MIN_LENGTH, 'Title is required')
    .max(TITLE_MAX_LENGTH, `Title must be at most ${TITLE_MAX_LENGTH} characters`),
  
  rewardCoins: z
    .number()
    .min(REWARD_COINS_MIN, `Reward coins must be at least ${REWARD_COINS_MIN}`)
    .max(REWARD_COINS_MAX, `Reward coins must be at most ${REWARD_COINS_MAX}`)
    .optional()
    .default(0),
  
  icon: z.object({
    base: z.object({ id: z.string().min(1) }).nullable().optional(),
    symbol: z.object({ id: z.string().min(1) }).nullable().optional(),
  }).refine(
    (icon) => icon.base?.id || icon.symbol?.id,
    { message: 'Badge must have at least a base shape or a symbol' }
  ),
});

export type BadgePublishInput = z.infer<typeof badgePublishSchema>;

export type ValidationError = {
  field: string;
  message: string;
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
};

/**
 * Check if a badge icon has at least one visual anchor (base or symbol)
 */
export function hasVisualAnchor(icon: AchievementIconConfig): boolean {
  const hasBase = Boolean(icon.base?.id);
  const hasSymbol = Boolean(icon.symbol?.id);
  return hasBase || hasSymbol;
}

/**
 * Validate a badge for publishing (draft can skip this)
 * Returns array of validation errors, empty if valid
 */
export function validateForPublish(badge: AchievementItem): ValidationResult {
  const errors: ValidationError[] = [];

  // Title is required
  if (!badge.title || badge.title.trim().length === 0) {
    errors.push({
      field: 'title',
      message: 'Title is required for publishing'
    });
  } else if (badge.title.length > TITLE_MAX_LENGTH) {
    errors.push({
      field: 'title',
      message: `Title must be at most ${TITLE_MAX_LENGTH} characters`
    });
  }

  // Must have visual anchor
  if (!hasVisualAnchor(badge.icon)) {
    errors.push({
      field: 'icon',
      message: 'Badge must have at least a base shape or a symbol'
    });
  }

  // Reward coins must be in valid range
  const coins = badge.rewardCoins ?? 0;
  if (coins < REWARD_COINS_MIN) {
    errors.push({
      field: 'rewardCoins',
      message: `Reward coins must be at least ${REWARD_COINS_MIN}`
    });
  } else if (coins > REWARD_COINS_MAX) {
    errors.push({
      field: 'rewardCoins',
      message: `Reward coins must be at most ${REWARD_COINS_MAX}`
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate badge using Zod schema (for API layer)
 * More strict and returns detailed error info
 */
export function validateForPublishZod(badge: AchievementItem): ValidationResult {
  const result = badgePublishSchema.safeParse({
    title: badge.title,
    rewardCoins: badge.rewardCoins,
    icon: {
      base: badge.icon.base,
      symbol: badge.icon.symbol,
    }
  });

  if (result.success) {
    return { valid: true, errors: [] };
  }

  const errors: ValidationError[] = result.error.issues.map(issue => ({
    field: issue.path.join('.') || 'badge',
    message: issue.message
  }));

  return { valid: false, errors };
}

/**
 * Check if badge can be saved as draft (minimal validation)
 */
export function validateForDraft(badge: AchievementItem): ValidationResult {
  const errors: ValidationError[] = [];

  // Reward coins must be valid even for drafts
  const coins = badge.rewardCoins ?? 0;
  if (coins < REWARD_COINS_MIN) {
    errors.push({
      field: 'rewardCoins',
      message: `Reward coins cannot be negative`
    });
  } else if (coins > REWARD_COINS_MAX) {
    errors.push({
      field: 'rewardCoins',
      message: `Reward coins must be at most ${REWARD_COINS_MAX}`
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get user-friendly validation summary
 */
export function getValidationSummary(result: ValidationResult): string {
  if (result.valid) return '';
  
  return result.errors.map(e => e.message).join('. ');
}
