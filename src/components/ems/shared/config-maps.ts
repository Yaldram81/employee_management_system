/**
 * Shared configuration maps and color constants for EMS components.
 * Extracted from duplicated implementations across 12+ component files.
 */

import type { LucideIcon } from 'lucide-react';
import {
  Monitor, Wifi, Globe, Palmtree, Heart, Briefcase, Baby, UserX,
  DollarSign, ArrowLeftRight, GraduationCap, Wrench, Plane, Headphones,
} from 'lucide-react';

// ─── Priority Config ──────────────────────────────────────────

export const priorityDot: Record<string, string> = {
  low: 'bg-slate-400',
  medium: 'bg-cyan-400',
  high: 'bg-amber-400',
  urgent: 'bg-rose-400',
  critical: 'bg-rose-500',
};

export const priorityLabel: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
  critical: 'Critical',
};

export const priorityLabelEmoji: Record<string, string> = {
  low: '\u{1F7E2} Low',
  medium: '\u{1F535} Medium',
  high: '\u{1F7E1} High',
  urgent: '\u{1F534} Urgent',
};

export const priorityColor: Record<string, string> = {
  low: 'text-slate-400',
  medium: 'text-cyan-400',
  high: 'text-amber-400',
  urgent: 'text-rose-400',
  critical: 'text-rose-500',
};

export const priorityBg: Record<string, string> = {
  low: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  medium: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  high: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  urgent: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  critical: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
};

// ─── Attendance Status Colors ─────────────────────────────────

export const attendanceStatusColorMap: Record<string, string> = {
  present: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
  late: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
  absent: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
  'half-day': 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400',
  weekend: 'bg-slate-500/10 border-slate-500/20 text-slate-400',
  holiday: 'bg-purple-500/15 border-purple-500/30 text-purple-400',
};

export const attendanceStatusDotMap: Record<string, string> = {
  present: 'bg-emerald-400',
  late: 'bg-amber-400',
  absent: 'bg-rose-400',
  'half-day': 'bg-cyan-400',
  weekend: 'bg-slate-500',
  holiday: 'bg-purple-400',
};

// ─── Request Status Colors ────────────────────────────────────

export const requestStatusColorMap: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'under-review': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  rejected: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  cancelled: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  escalated: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
};

// ─── Complaint Status Colors ──────────────────────────────────

export const complaintStatusChipColor: Record<string, string> = {
  open: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  'in-progress': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  resolved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  closed: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  escalated: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

// ─── Leave Status Colors ──────────────────────────────────────

export const leaveStatusDotMap: Record<string, string> = {
  approved: 'bg-emerald-400',
  pending: 'bg-amber-400',
  rejected: 'bg-rose-400',
};

// ─── Work Mode Config ─────────────────────────────────────────

export const workModeConfig: Record<
  string,
  { icon: LucideIcon; color: string; bg: string }
> = {
  Office: {
    icon: Monitor,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/15 border-cyan-500/30',
  },
  Remote: {
    icon: Wifi,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15 border-emerald-500/30',
  },
  Hybrid: {
    icon: Globe,
    color: 'text-amber-400',
    bg: 'bg-amber-500/15 border-amber-500/30',
  },
};

// ─── Leave Type Config ────────────────────────────────────────

export interface LeaveTypeConfig {
  icon: LucideIcon;
  label: string;
  color: string;
  iconBg: string;
  iconText: string;
  progressColor: string;
  progressGradient: string;
  glowColor: string;
  badgeBg: string;
  hex: string;
}

export const leaveTypeConfig: Record<string, LeaveTypeConfig> = {
  vacation: {
    icon: Palmtree,
    label: 'Annual Leave',
    color: 'emerald',
    iconBg: 'bg-emerald-500/20',
    iconText: 'text-emerald-400',
    progressColor: 'bg-emerald-500',
    progressGradient: 'from-emerald-500 to-emerald-400',
    glowColor: 'emerald',
    badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    hex: '#10b981',
  },
  sick: {
    icon: Heart,
    label: 'Sick Leave',
    color: 'rose',
    iconBg: 'bg-rose-500/20',
    iconText: 'text-rose-400',
    progressColor: 'bg-rose-500',
    progressGradient: 'from-rose-500 to-rose-400',
    glowColor: 'rose',
    badgeBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    hex: '#f43f5e',
  },
  casual: {
    icon: Briefcase,
    label: 'Personal Leave',
    color: 'amber',
    iconBg: 'bg-amber-500/20',
    iconText: 'text-amber-400',
    progressColor: 'bg-amber-500',
    progressGradient: 'from-amber-500 to-amber-400',
    glowColor: 'amber',
    badgeBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    hex: '#f59e0b',
  },
  maternity: {
    icon: Baby,
    label: 'Maternity',
    color: 'pink',
    iconBg: 'bg-pink-500/20',
    iconText: 'text-pink-400',
    progressColor: 'bg-pink-500',
    progressGradient: 'from-pink-500 to-pink-400',
    glowColor: 'rose',
    badgeBg: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
    hex: '#ec4899',
  },
  paternity: {
    icon: Baby,
    label: 'Paternity',
    color: 'cyan',
    iconBg: 'bg-cyan-500/20',
    iconText: 'text-cyan-400',
    progressColor: 'bg-cyan-500',
    progressGradient: 'from-cyan-500 to-cyan-400',
    glowColor: 'cyan',
    badgeBg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    hex: '#06b6d4',
  },
  unpaid: {
    icon: UserX,
    label: 'Unpaid',
    color: 'slate',
    iconBg: 'bg-slate-500/20',
    iconText: 'text-slate-400',
    progressColor: 'bg-slate-500',
    progressGradient: 'from-slate-500 to-slate-400',
    glowColor: 'none',
    badgeBg: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    hex: '#64748b',
  },
};

// ─── Request Type Config ──────────────────────────────────────

export const requestTypeConfig: Record<
  string,
  { icon: LucideIcon; color: string; label: string; iconBg: string; iconText: string }
> = {
  leave: {
    icon: Palmtree,
    color: 'emerald',
    label: 'Leave',
    iconBg: 'bg-emerald-500/20',
    iconText: 'text-emerald-400',
  },
  expense: {
    icon: DollarSign,
    color: 'amber',
    label: 'Expense',
    iconBg: 'bg-amber-500/20',
    iconText: 'text-amber-400',
  },
  asset: {
    icon: Monitor,
    color: 'cyan',
    label: 'Asset',
    iconBg: 'bg-cyan-500/20',
    iconText: 'text-cyan-400',
  },
  'shift-swap': {
    icon: ArrowLeftRight,
    color: 'violet',
    label: 'Shift Swap',
    iconBg: 'bg-violet-500/20',
    iconText: 'text-violet-400',
  },
  training: {
    icon: GraduationCap,
    color: 'blue',
    label: 'Training',
    iconBg: 'bg-blue-500/20',
    iconText: 'text-blue-400',
  },
  equipment: {
    icon: Wrench,
    color: 'orange',
    label: 'Equipment',
    iconBg: 'bg-orange-500/20',
    iconText: 'text-orange-400',
  },
  travel: {
    icon: Plane,
    color: 'rose',
    label: 'Travel',
    iconBg: 'bg-rose-500/20',
    iconText: 'text-rose-400',
  },
  'it-support': {
    icon: Headphones,
    color: 'teal',
    label: 'IT Support',
    iconBg: 'bg-teal-500/20',
    iconText: 'text-teal-400',
  },
};

export const requestTypeColors: Record<string, string> = {
  leave: 'bg-emerald-500',
  expense: 'bg-amber-500',
  asset: 'bg-cyan-500',
  'shift-swap': 'bg-violet-500',
  training: 'bg-blue-500',
  equipment: 'bg-orange-500',
  travel: 'bg-rose-500',
  'it-support': 'bg-teal-500',
};

export const requestTypeColorHex: Record<string, string> = {
  leave: '#10b981',
  expense: '#f59e0b',
  asset: '#06b6d4',
  'shift-swap': '#8b5cf6',
  training: '#3b82f6',
  equipment: '#f97316',
  travel: '#f43f5e',
  'it-support': '#14b8a6',
};

// ─── SLA Config ───────────────────────────────────────────────

export const slaDays: Record<string, number> = {
  urgent: 1,
  high: 3,
  medium: 7,
  low: 14,
};

// ─── Action Color Map (Dashboard) ─────────────────────────────

export const actionColorMap: Record<
  string,
  { hover: string; border: string; text: string; bg: string }
> = {
  emerald: {
    hover: 'hover:bg-emerald-500/10',
    border: 'hover:border-emerald-500/30',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  cyan: {
    hover: 'hover:bg-cyan-500/10',
    border: 'hover:border-cyan-500/30',
    text: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
  amber: {
    hover: 'hover:bg-amber-500/10',
    border: 'hover:border-amber-500/30',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  slate: {
    hover: 'hover:bg-slate-500/10',
    border: 'hover:border-slate-500/30',
    text: 'text-slate-400',
    bg: 'bg-slate-500/10',
  },
  violet: {
    hover: 'hover:bg-violet-500/10',
    border: 'hover:border-violet-500/30',
    text: 'text-violet-400',
    bg: 'bg-violet-500/10',
  },
  orange: {
    hover: 'hover:bg-orange-500/10',
    border: 'hover:border-orange-500/30',
    text: 'text-orange-400',
    bg: 'bg-orange-500/10',
  },
  rose: {
    hover: 'hover:bg-rose-500/10',
    border: 'hover:border-rose-500/30',
    text: 'text-rose-400',
    bg: 'bg-rose-500/10',
  },
};
