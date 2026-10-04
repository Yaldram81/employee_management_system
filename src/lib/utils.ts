import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date string according to the configured date format.
 * @param dateStr - ISO date string (e.g., '2024-01-15') or any date-parseable string
 * @param format - Format pattern: 'MM/DD/YYYY', 'DD/MM/YYYY', or 'YYYY-MM-DD' (default)
 * @param timezone - Optional IANA timezone string (e.g., 'America/New_York')
 */
export function formatDate(dateStr: string | undefined | null, format = 'YYYY-MM-DD', timezone?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: timezone || undefined,
    };

    const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(d);
    const get = (type: string) => parts.find(p => p.type === type)?.value || '';

    const mm = get('month');
    const dd = get('day');
    const yyyy = get('year');

    switch (format) {
      case 'MM/DD/YYYY': return `${mm}/${dd}/${yyyy}`;
      case 'DD/MM/YYYY': return `${dd}/${mm}/${yyyy}`;
      case 'YYYY-MM-DD':
      default: return `${yyyy}-${mm}-${dd}`;
    }
  } catch {
    return dateStr;
  }
}

/**
 * Format a date with time according to the configured timezone.
 * @param dateStr - ISO date string or any date-parseable string
 * @param timezone - Optional IANA timezone string
 */
export function formatDateTime(dateStr: string | undefined | null, timezone?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: timezone || undefined,
    });
  } catch {
    return dateStr;
  }
}
