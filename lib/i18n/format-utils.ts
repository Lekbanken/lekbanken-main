/**
 * Centralized i18n-aware formatting utilities
 * 
 * These functions provide locale-aware formatting for dates, currencies,
 * and numbers. They accept an optional locale parameter and fall back
 * to the system default locale.
 */

import { defaultLocale } from './config'

// =============================================================================
// Date Formatting
// =============================================================================

/**
 * Format a date to locale-aware short format
 * @param value - Date string, Date object, or null
 * @param locale - Locale code (defaults to system default)
 */
export function formatDate(value: string | Date | null | undefined, locale: string = defaultLocale): string {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(locale)
}

/**
 * Format a date with year, month name, and day
 * @param value - Date string, Date object, or null
 * @param locale - Locale code (defaults to system default)
 */
export function formatDateLong(value: string | Date | null | undefined, locale: string = defaultLocale): string {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format a date with time (short style)
 * @param value - Date string, Date object, or null
 * @param locale - Locale code (defaults to system default)
 */
export function formatDateTime(value: string | Date | null | undefined, locale: string = defaultLocale): string {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(locale, {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

/**
 * Format a date with full date and time
 * @param value - Date string, Date object, or null
 * @param locale - Locale code (defaults to system default)
 */
export function formatDateTimeLong(value: string | Date | null | undefined, locale: string = defaultLocale): string {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// =============================================================================
// Relative Time Formatting
// =============================================================================

type RelativeTimeLabels = {
  today: string
  yesterday: string
  daysAgo: (days: number) => string
  weeksAgo: (weeks: number) => string
  monthsAgo: (months: number) => string
}

const relativeTimeLabelsMap: Record<string, RelativeTimeLabels> = {
  sv: {
    today: 'Idag',
    yesterday: 'Igår',
    daysAgo: (d) => `${d} dagar sedan`,
    weeksAgo: (w) => `${w} veckor sedan`,
    monthsAgo: (m) => `${m} månader sedan`,
  },
  en: {
    today: 'Today',
    yesterday: 'Yesterday',
    daysAgo: (d) => `${d} days ago`,
    weeksAgo: (w) => `${w} weeks ago`,
    monthsAgo: (m) => `${m} months ago`,
  },
  no: {
    today: 'I dag',
    yesterday: 'I går',
    daysAgo: (d) => `${d} dager siden`,
    weeksAgo: (w) => `${w} uker siden`,
    monthsAgo: (m) => `${m} måneder siden`,
  },
}

/**
 * Format relative time (e.g., "2 days ago", "Yesterday")
 * @param value - Date string, Date object, or null
 * @param locale - Locale code (defaults to system default)
 */
export function formatRelativeTime(value: string | Date | null | undefined, locale: string = defaultLocale): string {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  // Get the base locale (sv, en, no) from full locale (sv-SE, en-US, etc.)
  const baseLocale = locale.split('-')[0]
  const labels = relativeTimeLabelsMap[baseLocale] || relativeTimeLabelsMap.en

  if (diffDays === 0) return labels.today
  if (diffDays === 1) return labels.yesterday
  if (diffDays < 7) return labels.daysAgo(diffDays)
  if (diffDays < 30) return labels.weeksAgo(Math.floor(diffDays / 7))
  return labels.monthsAgo(Math.floor(diffDays / 30))
}

// =============================================================================
// Number & Currency Formatting
// =============================================================================

/**
 * Format a number with locale-aware separators
 * @param value - Number to format
 * @param locale - Locale code (defaults to system default)
 */
export function formatNumber(value: number, locale: string = defaultLocale): string {
  return value.toLocaleString(locale)
}

/**
 * Format currency with proper locale formatting
 * @param amount - Amount in smallest unit (cents/öre)
 * @param currency - Currency code (e.g., 'SEK', 'USD')
 * @param locale - Locale code (defaults to system default)
 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale: string = defaultLocale
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(amount / 100)
}

/**
 * Format currency with decimal places
 * @param amount - Amount in smallest unit (cents/öre)
 * @param currency - Currency code (e.g., 'SEK', 'USD')
 * @param locale - Locale code (defaults to system default)
 */
export function formatCurrencyWithDecimals(
  amount: number,
  currency: string,
  locale: string = defaultLocale
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

/**
 * Format percentage
 * @param value - Value as decimal (0.25 = 25%)
 * @param locale - Locale code (defaults to system default)
 */
export function formatPercent(value: number, locale: string = defaultLocale): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value)
}

// =============================================================================
// Duration Formatting
// =============================================================================

type DurationLabels = {
  minutes: (m: number) => string
  hours: (h: number) => string
  hoursMinutes: (h: number, m: number) => string
}

const durationLabelsMap: Record<string, DurationLabels> = {
  sv: {
    minutes: (m) => `${m} min`,
    hours: (h) => `${h}h`,
    hoursMinutes: (h, m) => `${h}h ${m}m`,
  },
  en: {
    minutes: (m) => `${m} min`,
    hours: (h) => `${h}h`,
    hoursMinutes: (h, m) => `${h}h ${m}m`,
  },
  no: {
    minutes: (m) => `${m} min`,
    hours: (h) => `${h}t`,
    hoursMinutes: (h, m) => `${h}t ${m}m`,
  },
}

/**
 * Format duration in minutes to human-readable format
 * @param minutes - Duration in minutes
 * @param locale - Locale code (defaults to system default)
 */
export function formatDuration(minutes: number, locale: string = defaultLocale): string {
  const baseLocale = locale.split('-')[0]
  const labels = durationLabelsMap[baseLocale] || durationLabelsMap.en

  if (minutes < 60) return labels.minutes(minutes)
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? labels.hoursMinutes(hours, mins) : labels.hours(hours)
}
