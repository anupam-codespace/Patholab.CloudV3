/**
 * Centralized Timezone Utility — All timestamps in the system use IST (Asia/Kolkata, GMT+5:30)
 *
 * Problem solved: Previously, `new Date()` used server time and `toLocaleString('en-IN')`
 * used the server's timezone, which could be UTC or any other timezone. This caused:
 * 1. Report timestamps showing wrong times
 * 2. Collected/Received times changing on edit
 * 3. Print date appearing before collected date
 *
 * Solution: ALL date formatting goes through this module, which forces IST timezone.
 */

const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Get current time in IST. Always returns a Date object (which is timezone-agnostic internally,
 * but we use this for consistency and documentation).
 */
export function nowIST(): Date {
  return new Date();
}

/**
 * Format a date in IST timezone with full date+time.
 * Output: "22 Jul 2026, 03:45 PM"
 */
export function formatIST(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format a date in IST timezone with date only.
 * Output: "22 Jul 2026"
 */
export function formatDateIST(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a date in IST timezone with time only.
 * Output: "03:45 PM"
 */
export function formatTimeIST(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-IN', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format a date in IST with seconds (for NABL reports).
 * Output: "22/07/26 03:45:12 PM"
 */
export function formatISTWithSeconds(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  const formatted = d.toLocaleString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  return formatted;
}

/**
 * Get the current IST timestamp as a formatted string for reports.
 */
export function printedAtIST(): string {
  return formatISTWithSeconds(new Date());
}

/**
 * Safe date parser — handles Prisma DateTime objects, ISO strings, and Date objects.
 * Returns null for invalid dates.
 */
export function parseDate(date: any): Date | null {
  if (!date) return null;
  if (date instanceof Date) return isNaN(date.getTime()) ? null : date;
  if (typeof date === 'string') {
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d;
  }
  // Prisma DateTime may come as an object with toString
  try {
    const d = new Date(date.toString());
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/**
 * Parse a datetime-local input value (e.g., "2026-08-31T15:30") as an IST timestamp
 * and return a Date object representing that instant in UTC.
 *
 * This is the CRITICAL fix for the timezone bug. When a browser sends a datetime-local
 * string (without timezone suffix), `new Date("2026-08-31T15:30")` interprets it using
 * the SERVER's local timezone — which is UTC in our Docker/CI environment, causing
 * a 5.5-hour shift in saved timestamps.
 *
 * This function ALWAYS interprets the input as IST (Asia/Kolkata, UTC+5:30),
 * regardless of the server's local timezone, and returns the correct UTC Date.
 *
 * Accepts:
 *   - "2026-08-31T15:30"         (datetime-local)
 *   - "2026-08-31T15:30:00"      (datetime-local with seconds)
 *   - "2026-08-31T15:30:00.000Z" (ISO with Z — pass through)
 *   - "2026-08-31T15:30+05:30"   (ISO with offset — pass through)
 *   - Date object                (pass through)
 */
export function parseISTInput(input: string | Date | null | undefined): Date | null {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;

  const str = String(input).trim();
  if (!str) return null;

  // If the string already carries explicit timezone info (Z or ±HH:MM), let Date parse it
  if (/Z$|[+-]\d{2}:\d{2}$/.test(str)) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  // Match "YYYY-MM-DDTHH:mm" or "YYYY-MM-DDTHH:mm:ss" or "YYYY-MM-DD HH:mm:ss"
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) {
    // Date-only string like "2026-08-31" — treat as midnight IST
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  const [, y, mo, d, h, mi, s] = m;
  // Construct an ISO UTC string by adding 5:30 to the IST wall-clock time
  // Equivalent to: new Date(Date.UTC(y, mo-1, d, h, mi, s) - 330*60*1000)
  const utcMs = Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(s || 0)
  ) - 330 * 60 * 1000; // subtract 5h30m to convert IST wall-clock -> UTC instant

  return new Date(utcMs);
}

/**
 * Convert a Date (UTC instant) to a datetime-local string in IST for HTML input.
 * Output: "2026-08-31T15:30"
 *
 * This is the inverse of parseISTInput. Use it when pre-filling datetime-local inputs
 * from server-provided UTC Date objects.
 */
export function toISTInputValue(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  // Get IST wall-clock components by formatting in IST timezone
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

export { IST_TIMEZONE };
