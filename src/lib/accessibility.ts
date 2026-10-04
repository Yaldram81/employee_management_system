/**
 * Accessibility (a11y) utility module for EMS application.
 * Provides ARIA label generation, screen reader text for charts,
 * keyboard navigation instructions, focus trap, and motion preference utilities.
 */

// ─── Status ARIA Labels ────────────────────────────────────────────

const statusAriaLabels: Record<string, string> = {
  // Attendance
  present: 'Status: Present (On time)',
  absent: 'Status: Absent',
  late: 'Status: Late arrival',
  'half-day': 'Status: Half day',
  holiday: 'Status: Holiday',
  weekend: 'Status: Weekend',

  // Request / Leave
  pending: 'Status: Pending review',
  approved: 'Status: Approved',
  rejected: 'Status: Rejected',
  'under-review': 'Status: Under review',

  // Complaints
  open: 'Status: Open',
  'in-progress': 'Status: In progress',
  investigating: 'Status: Investigating',
  resolved: 'Status: Resolved',
  closed: 'Status: Closed',

  // Payroll
  generated: 'Status: Payslip generated',
  reviewed: 'Status: Reviewed',
  paid: 'Status: Paid',
  draft: 'Status: Draft',
  'on-hold': 'Status: On hold',
  cancelled: 'Status: Cancelled',
  escalated: 'Status: Escalated',

  // Tasks
  todo: 'Status: To do',
  'in-review': 'Status: In review',
  done: 'Status: Done',
  blocked: 'Status: Blocked',

  // Priority
  low: 'Priority: Low',
  medium: 'Priority: Medium',
  high: 'Priority: High',
  urgent: 'Priority: Urgent',

  // General
  active: 'Status: Active',
  inactive: 'Status: Inactive',
};

/**
 * Maps a status string to an accessible description suitable for aria-label.
 * Falls back to a humanised version of the key when the status is unknown.
 */
export function getAriaLabel(status: string): string {
  const key = status?.toLowerCase().replace(/_/g, '-') || '';
  if (statusAriaLabels[key]) return statusAriaLabels[key];

  // Fallback: capitalise the first letter and wrap in "Status: …"
  const humanised = key
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return `Status: ${humanised}`;
}

// ─── Screen Reader Text for Charts ─────────────────────────────────

export interface BarChartData {
  labels: string[];
  values: number[];
}

export interface PieChartData {
  segments: Array<{ name: string; value: number }>;
}

export interface LineChartData {
  period: string;
  values: number[];
  labels?: string[];
}

/**
 * Generate descriptive text for chart visualizations so that
 * screen-reader users receive an equivalent of the visual content.
 */
export function getScreenReaderText(
  chartType: 'bar' | 'donut' | 'pie' | 'line',
  data: BarChartData | PieChartData | LineChartData,
): string {
  switch (chartType) {
    case 'bar': {
      const d = data as BarChartData;
      if (!d.labels?.length || !d.values?.length) return 'Empty bar chart';
      const max = Math.max(...d.values);
      const min = Math.min(...d.values);
      const maxLabel = d.labels[d.values.indexOf(max)] || '';
      const minLabel = d.labels[d.values.indexOf(min)] || '';
      return `Bar chart showing ${d.labels.join(', ')} with values ${d.values.join(', ')}. Highest: ${maxLabel} at ${max}, Lowest: ${minLabel} at ${min}`;
    }

    case 'donut':
    case 'pie': {
      const d = data as PieChartData;
      if (!d.segments?.length) return 'Empty pie chart';
      const largest = d.segments.reduce((prev, cur) =>
        cur.value > prev.value ? cur : prev,
      );
      const segmentDescriptions = d.segments
        .map((s) => `${s.name}: ${s.value}`)
        .join(', ');
      return `Pie chart showing ${segmentDescriptions}. Largest segment: ${largest.name} at ${largest.value}`;
    }

    case 'line': {
      const d = data as LineChartData;
      if (!d.values?.length) return 'Empty line chart';
      const first = d.values[0];
      const last = d.values[d.values.length - 1];
      let trend: string;
      if (last > first) trend = 'up';
      else if (last < first) trend = 'down';
      else trend = 'stable';
      return `Line chart showing trend over ${d.period}. Start: ${first}, End: ${last}, Trend: ${trend}`;
    }

    default:
      return '';
  }
}

// ─── Keyboard Navigation Instructions ──────────────────────────────

/**
 * Returns a human-readable string describing keyboard navigation
 * shortcuts available in the application.
 */
export function getKeyboardNavInstructions(): string {
  return [
    'Keyboard navigation shortcuts:',
    '⌘K or Ctrl+K — Open command palette',
    '⌘1 or Ctrl+1 — Go to Dashboard',
    '⌘2 or Ctrl+2 — Go to Attendance',
    '⌘L or Ctrl+L — Go to Leaves',
    '⌘T or Ctrl+T — Go to Tasks',
    '⌘P or Ctrl+P — Go to Payroll',
    '⌘N or Ctrl+N — Open Notifications panel',
    '⌘B or Ctrl+B — Toggle sidebar',
    '⌘/ or Ctrl+/ — Keyboard shortcuts help',
    '⌘⇧C or Ctrl+Shift+C — Clock in/out modal',
    '⌘⇧L or Ctrl+Shift+L — Apply for leave',
    '⌘⇧T or Ctrl+Shift+T — Create new task',
    '⌘⇧R or Ctrl+Shift+R — Submit request',
    '⌘⇧F or Ctrl+Shift+F — File complaint',
    '⌘Enter or Ctrl+Enter — Submit current form',
    'Escape — Close modal, panel, or cancel',
    'Tab — Move to next focusable element',
    'Shift+Tab — Move to previous focusable element',
    'Enter or Space — Activate focused element',
  ].join('\n');
}

// ─── Screen Reader Announcements ───────────────────────────────────

const POLITE_REGION_ID = 'a11y-announce-polite';
const ASSERTIVE_REGION_ID = 'a11y-announce-assertive';

/**
 * Announce a message to screen readers by injecting text into a
 * visually-hidden `aria-live` region. This creates the region on the
 * fly if it doesn't already exist.
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite',
): void {
  if (typeof document === 'undefined') return;

  const regionId =
    priority === 'assertive' ? ASSERTIVE_REGION_ID : POLITE_REGION_ID;

  let region = document.getElementById(regionId);

  if (!region) {
    region = document.createElement('div');
    region.id = regionId;
    region.setAttribute('aria-live', priority);
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('role', priority === 'assertive' ? 'alert' : 'status');
    // Visually hidden styles
    Object.assign(region.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      borderWidth: '0',
    });
    document.body.appendChild(region);
  }

  // Clear the region first, then set the new message after a micro-task
  // so that screen readers detect the change even when the same message
  // is announced consecutively.
  region.textContent = '';
  requestAnimationFrame(() => {
    region!.textContent = message;
  });
}

// ─── Focus Trap ────────────────────────────────────────────────────

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]',
  'details > summary',
].join(', ');

/**
 * Returns a cleanup function that removes the focus-trap listeners.
 */
export function trapFocus(element: HTMLElement): () => void {
  function getFocusableChildren(): HTMLElement[] {
    return Array.from(element.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
      (el) => {
        const htmlEl = el as HTMLElement;
        return htmlEl.tabIndex >= 0 && !htmlEl.hasAttribute('disabled');
      },
    ) as HTMLElement[];
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;

    const focusable = getFocusableChildren();
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      // Shift+Tab: if focus is on the first element, wrap to last
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // Tab: if focus is on the last element, wrap to first
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  element.addEventListener('keydown', handleKeyDown);

  // Auto-focus the first focusable child
  const focusable = getFocusableChildren();
  if (focusable.length > 0) {
    requestAnimationFrame(() => focusable[0].focus());
  }

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleKeyDown);
  };
}

// ─── Reduced Motion ────────────────────────────────────────────────

/**
 * Check whether the user has requested reduced motion via their
 * operating system or browser accessibility settings.
 */
export function isReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check whether the user has requested high contrast mode.
 */
export function isHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: more)').matches;
}

/**
 * Check whether the user prefers forced colors (Windows High Contrast mode).
 */
export function isForcedColors(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(forced-colors: active)').matches;
}
