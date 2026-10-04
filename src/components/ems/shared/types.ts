/**
 * Shared TypeScript interfaces for EMS components.
 * Extracted from duplicated implementations across 3+ component files.
 */

import type { LucideIcon } from 'lucide-react';

// ─── Activity Item (Dashboard) ────────────────────────────────

export interface ActivityItem {
  id: string;
  icon: LucideIcon;
  text: string;
  subtext?: string;
  time: string;
  color: string;
  badge?: string;
}

// ─── Comment Type (Request/Complaint Detail) ──────────────────

export interface CommentItem {
  id: string;
  author: string;
  text: string;
  timestamp: string;
  isReviewer: boolean;
}

// ─── SLA Status ───────────────────────────────────────────────

export interface SlaStatus {
  pct: number;
  status: 'on-track' | 'at-risk' | 'breached';
  daysRemaining: number;
}

// ─── Calendar Day ─────────────────────────────────────────────

export interface CalendarDay {
  date: string;
  day: number;
  isToday: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  status?: string;
  items?: Array<{ id: string; color: string }>;
}
