/**
 * Parse a timestamp string from the database into a JavaScript Date.
 *
 * PostgREST returns bare `TIMESTAMP` columns (without timezone) as
 * `"2026-02-20T14:30:00"` — no `Z` or `+00:00` suffix. JavaScript's
 * `new Date()` treats such strings as **local time**, which silently
 * shifts the value by the user's UTC offset (e.g., 1 hour in CET).
 *
 * This helper appends `Z` (UTC) when no timezone indicator is present,
 * ensuring correctness regardless of column type.
 *
 * After running the TIMESTAMPTZ migration, PostgREST will include
 * `+00:00` and this function becomes a safe no-op passthrough.
 *
 * @example
 * ```ts
 * const d = parseDbTimestamp(row.delivered_at); // always UTC-correct
 * ```
 */
export function parseDbTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null;

  // If the string already carries timezone info (Z, +HH:MM, -HH:MM) parse as-is
  if (/[Zz]$/.test(value) || /[+-]\d{2}:\d{2}$/.test(value)) {
    return new Date(value);
  }

  // No timezone indicator → assume UTC
  return new Date(value + 'Z');
}
