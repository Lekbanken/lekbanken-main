/**
 * DiceCoin Currency Utilities
 * 
 * Canonical naming and formatting for the in-product virtual currency.
 * 
 * NAMING RULES:
 * - Full name: "DiceCoin" (singular and plural are both "DiceCoin")
 * - Abbreviation: "DC" (for tight UI contexts only)
 * - Never use: "Coins", "Mynt", "Tokens", etc. in code - use these constants
 * 
 * Note: i18n translations may use localized terms (e.g., "Mynt" in Swedish),
 * but internal code should use these constants for consistency.
 */

/** Canonical currency name (singular and plural) */
export const DICECOIN_NAME = "DiceCoin";

/** Short abbreviation for tight UI spaces */
export const DICECOIN_SHORT = "DC";

/** Currency symbol/emoji for inline text */
export const DICECOIN_SYMBOL = "🪙";

/**
 * Format a DiceCoin amount for display
 * 
 * @param amount - The number of DiceCoin
 * @param options - Formatting options
 * @returns Formatted string
 * 
 * @example
 * formatDiceCoin(100) // "100 DiceCoin"
 * formatDiceCoin(100, { short: true }) // "100 DC"
 * formatDiceCoin(100, { withSymbol: true }) // "🪙 100"
 * formatDiceCoin(100, { compact: true }) // "100" (number only)
 */
export function formatDiceCoin(
  amount: number,
  options: {
    /** Use short abbreviation "DC" instead of "DiceCoin" */
    short?: boolean;
    /** Prefix with emoji symbol */
    withSymbol?: boolean;
    /** Return number only (for UI that shows icon separately) */
    compact?: boolean;
    /** Use locale-aware number formatting */
    locale?: string;
  } = {}
): string {
  const { short = false, withSymbol = false, compact = false, locale = "sv-SE" } = options;

  const formattedNumber = new Intl.NumberFormat(locale).format(amount);

  if (compact) {
    return formattedNumber;
  }

  if (withSymbol) {
    return `${DICECOIN_SYMBOL} ${formattedNumber}`;
  }

  return `${formattedNumber} ${short ? DICECOIN_SHORT : DICECOIN_NAME}`;
}

/**
 * Format XP amount for display
 * 
 * @param amount - The XP amount
 * @param options - Formatting options
 * @returns Formatted string
 * 
 * @example
 * formatXP(500) // "500 XP"
 * formatXP(500, { compact: true }) // "500"
 */
export function formatXP(
  amount: number,
  options: {
    /** Return number only */
    compact?: boolean;
    /** Use locale-aware number formatting */
    locale?: string;
  } = {}
): string {
  const { compact = false, locale = "sv-SE" } = options;

  const formattedNumber = new Intl.NumberFormat(locale).format(amount);

  if (compact) {
    return formattedNumber;
  }

  return `${formattedNumber} XP`;
}

/**
 * i18n key paths for currency-related translations
 * Use these to ensure consistent i18n key usage across the app.
 */
export const CURRENCY_I18N_KEYS = {
  /** Gamification balance label */
  balance: "app.gamification.balance",
  /** Shop insufficient balance error */
  insufficientBalance: "app.shop.errors.insufficientBalance",
  /** Coin transaction earned */
  earned: "app.gamification.notifications.coinEarned",
  /** Coin transaction spent */
  spent: "app.gamification.notifications.coinSpent",
} as const;
