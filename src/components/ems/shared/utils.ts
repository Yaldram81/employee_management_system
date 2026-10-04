/**
 * Shared utility functions for EMS components.
 * Extracted from duplicated implementations across 16+ component files.
 */

// ─── Time Formatting ──────────────────────────────────────────

/**
 * Returns a human-readable relative time string.
 * Handles null/undefined input gracefully.
 * Supports: just now, minutes, hours, days, weeks, months
 */
export function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return '';
  const now = new Date();
  const past = new Date(dateStr);
  const diffMs = now.getTime() - past.getTime();
  if (diffMs < 0) return 'just now';
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

// ─── Date Formatting ──────────────────────────────────────────

/**
 * Formats a date string as "Jan 5, 2026"
 * Handles null/undefined by returning '—'
 */
export function formatDate(date?: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats a date string as "Jan 5"
 */
export function formatDateShort(date?: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats a date string with time: "Jan 5, 2026, 3:30 PM"
 */
export function formatDateTime(date?: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ─── Currency Formatting ──────────────────────────────────────

/**
 * Formats a number as USD currency: "$1,234"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Name Helpers ─────────────────────────────────────────────

/**
 * Extracts initials from a name string. Returns '?' if name is empty.
 * E.g. "John Doe" -> "JD", "Alice" -> "A"
 */
export function getInitials(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Greeting Helpers ─────────────────────────────────────────

/**
 * Returns a time-based greeting: "Good morning", "Good afternoon", or "Good evening"
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Returns a greeting emoji based on time of day
 */
export function getGreetingEmoji(): string {
  const hour = new Date().getHours();
  if (hour < 12) return '\u{1F305}'; // 🌅
  if (hour < 17) return '\u2600\uFE0F'; // ☀️
  return '\u{1F319}'; // 🌙
}

// ─── Date Calculations ────────────────────────────────────────

/**
 * Returns the number of calendar days between two dates (inclusive).
 */
export function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1);
}

/**
 * Returns the number of working days between two dates (excluding weekends).
 */
export function workingDaysBetween(start: string, end: string): number {
  let count = 0;
  const current = new Date(start);
  const endDate = new Date(end);
  while (current <= endDate) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return Math.max(1, count);
}

/**
 * Returns the number of days from now until the given date.
 */
export function daysUntil(date: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

/**
 * Returns the age of a request/record in days.
 */
export function getRequestAge(createdAt: string): number {
  return Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
}

/**
 * Returns the number of days until the end of the current year.
 */
export function daysUntilYearEnd(): number {
  const now = new Date();
  const endOfYear = new Date(now.getFullYear(), 11, 31);
  return Math.ceil((endOfYear.getTime() - now.getTime()) / 86400000);
}

/**
 * Returns the number of priority weight for sorting.
 */
export function priorityWeight(p: string): number {
  return ({ urgent: 4, high: 3, medium: 2, low: 1 } as Record<string, number>)[p] || 0;
}

// ─── Overdue & Due Date Helpers ───────────────────────────────

/**
 * Check if a record with a dueDate is overdue.
 * Works for complaints, requests, tasks, etc.
 */
export function isOverdue(item: { dueDate?: string | null; status?: string }): boolean {
  if (!item.dueDate) return false;
  if (item.status === 'resolved' || item.status === 'closed' || item.status === 'done') return false;
  return new Date(item.dueDate) < new Date();
}

/**
 * Returns the number of days until a due date, or null if no due date.
 */
export function daysUntilDue(dueDate?: string | null): number | null {
  if (!dueDate) return null;
  const diff = new Date(dueDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Format date as "January 5, 2026" (long format)
 */
export function formatDateLong(date?: string | null): string {
  if (!date) return 'Not set';
  try {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return date;
  }
}

// ─── Avatar & Greeting Helpers ────────────────────────────────

/**
 * Returns a deterministic avatar background color based on a name string.
 * Uses a hash of the name to pick from a palette of Tailwind bg classes.
 */
export function getAvatarColor(name?: string | null): string {
  if (!name) return 'bg-slate-500';
  const colors = [
    'bg-emerald-500', 'bg-cyan-500', 'bg-amber-500', 'bg-rose-500',
    'bg-violet-500', 'bg-orange-500', 'bg-teal-500', 'bg-pink-500',
    'bg-indigo-500', 'bg-lime-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Returns a time-based greeting with an associated icon name for rendering.
 * e.g. { text: 'Good Morning', iconName: 'sun' }
 */
export function getGreetingWithIcon(): { text: string; iconName: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good Morning', iconName: 'sun' };
  if (hour < 17) return { text: 'Good Afternoon', iconName: 'coffee' };
  return { text: 'Good Evening', iconName: 'moon' };
}
