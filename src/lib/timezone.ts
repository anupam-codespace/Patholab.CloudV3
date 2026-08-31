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

export { IST_TIMEZONE };
