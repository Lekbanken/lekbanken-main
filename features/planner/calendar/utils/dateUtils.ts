/**
 * Calendar Date Utilities
 * 
 * Helper functions for date manipulation in the calendar.
 */

// =============================================================================
// Date Formatting
// =============================================================================

/**
 * Format a Date to ISO date string (YYYY-MM-DD) in local time
 * Note: Using manual formatting to avoid timezone issues with toISOString()
 */
export function toISODateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse an ISO date string to Date object (local time, midnight)
 */
export function parseISODate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format time string from Date
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format date for display
 */
export function formatDisplayDate(date: Date, locale: string = 'sv-SE'): string {
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/**
 * Format short date for display
 */
export function formatShortDate(date: Date, locale: string = 'sv-SE'): string {
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
  });
}

// =============================================================================
// Date Calculations
// =============================================================================

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate < today;
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Get the first day of a month
 */
export function getFirstDayOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

/**
 * Get the last day of a month
 */
export function getLastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0);
}

/**
 * Get the first day of a week (Monday)
 */
export function getFirstDayOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Adjust for Monday start
  result.setDate(result.getDate() + diff);
  return result;
}

/**
 * Get week number in year (ISO 8601)
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add months to a date
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Add weeks to a date
 */
export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

// =============================================================================
// Month/Week Helpers
// =============================================================================

/**
 * Get month name
 */
export function getMonthName(month: number, locale: string = 'sv-SE'): string {
  const date = new Date(2024, month, 1);
  return date.toLocaleDateString(locale, { month: 'long' });
}

/**
 * Get short weekday names starting from Monday
 */
export function getWeekdayNames(locale: string = 'sv-SE', format: 'narrow' | 'short' = 'narrow'): string[] {
  const days: string[] = [];
  const baseDate = new Date(2024, 0, 1); // A Monday
  
  for (let i = 0; i < 7; i++) {
    const date = addDays(baseDate, i);
    days.push(date.toLocaleDateString(locale, { weekday: format }));
  }
  
  return days;
}

/**
 * Get the number of days in a month
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// =============================================================================
// Range Helpers
// =============================================================================

/**
 * Get a date range from start to end
 */
export function getDateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  let current = new Date(start);
  
  while (current <= end) {
    dates.push(new Date(current));
    current = addDays(current, 1);
  }
  
  return dates;
}

/**
 * Get the date range for a month view (includes surrounding days)
 */
export function getMonthViewRange(year: number, month: number): { start: Date; end: Date } {
  const firstDay = getFirstDayOfMonth(year, month);
  const lastDay = getLastDayOfMonth(year, month);
  
  // Get the Monday before or on the first day
  const start = getFirstDayOfWeek(firstDay);
  
  // Get the Sunday after or on the last day
  const end = addDays(getFirstDayOfWeek(addDays(lastDay, 7)), -1);
  
  return { start, end };
}

/**
 * Get the date range for a week view
 */
export function getWeekViewRange(date: Date): { start: Date; end: Date } {
  const start = getFirstDayOfWeek(date);
  const end = addDays(start, 6);
  return { start, end };
}
