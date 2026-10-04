'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  CheckCircle2, XCircle, AlertTriangle, Clock, CalendarHeart, Coffee,
  Hourglass, ThumbsUp, ThumbsDown, Eye, CircleDot, Loader2, Search,
  CheckCircle, Archive, FileText, FileCheck, DollarSign, FileEdit, Ban,
  AlertOctagon, ListTodo, FileSearch, CheckCircle2 as DoneIcon, Lock,
  ArrowDown, ArrowRight, ArrowUp, Zap, Power, PowerOff, Pause,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type StatusType = 
  | 'present' | 'absent' | 'late' | 'half-day' | 'holiday' | 'weekend'
  | 'pending' | 'approved' | 'rejected' | 'under-review'
  | 'open' | 'in-progress' | 'investigating' | 'resolved' | 'closed'
  | 'generated' | 'reviewed' | 'approved' | 'paid' | 'draft' | 'on-hold' | 'cancelled' | 'escalated'
  | 'todo' | 'in-review' | 'done' | 'blocked'
  | 'low' | 'medium' | 'high' | 'urgent'
  | 'active' | 'inactive';

// ─── Color-blind friendly shape indicators ──────────────────────
// Each status has a distinct icon + pattern so it's not just color-dependent.
// Shape categories:
// ✓ Circle = positive/good (present, approved, done, active, paid)
// ✗ Diagonal = negative/bad (absent, rejected, blocked, cancelled, urgent)
// ⚠ Triangle = caution/waiting (late, pending, in-progress, on-hold, high)
// ○ Square/neutral = informational (draft, todo, low, weekend, closed)
// ◇ Diamond = special (holiday, half-day, escalated, under-review)

interface StatusConfig {
  label: string;
  className: string;
  icon: LucideIcon;
  ariaLabel: string;
  pattern: 'solid' | 'striped' | 'dotted' | 'none'; // CSS pattern for extra distinction
}

const statusConfig: Record<string, StatusConfig> = {
  // Attendance — ✓ positive, ⚠ caution, ✗ negative
  present: { label: 'Present', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle2, ariaLabel: 'Status: Present (On time)', pattern: 'solid' },
  absent: { label: 'Absent', className: 'bg-rose-500/20 text-rose-400 border-rose-500/30', icon: XCircle, ariaLabel: 'Status: Absent', pattern: 'striped' },
  late: { label: 'Late', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: AlertTriangle, ariaLabel: 'Status: Late arrival', pattern: 'dotted' },
  'half-day': { label: 'Half Day', className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', icon: Clock, ariaLabel: 'Status: Half day', pattern: 'dotted' },
  holiday: { label: 'Holiday', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: CalendarHeart, ariaLabel: 'Status: Holiday', pattern: 'solid' },
  weekend: { label: 'Weekend', className: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: Coffee, ariaLabel: 'Status: Weekend', pattern: 'none' },
  // Request/Leave status — ⚠ pending, ✓ approved, ✗ rejected
  pending: { label: 'Pending', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Hourglass, ariaLabel: 'Status: Pending review', pattern: 'dotted' },
  approved: { label: 'Approved', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: ThumbsUp, ariaLabel: 'Status: Approved', pattern: 'solid' },
  rejected: { label: 'Rejected', className: 'bg-rose-500/20 text-rose-400 border-rose-500/30', icon: ThumbsDown, ariaLabel: 'Status: Rejected', pattern: 'striped' },
  'under-review': { label: 'Under Review', className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', icon: Eye, ariaLabel: 'Status: Under review', pattern: 'dotted' },
  // Complaints
  open: { label: 'Open', className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', icon: CircleDot, ariaLabel: 'Status: Open', pattern: 'solid' },
  'in-progress': { label: 'In Progress', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Loader2, ariaLabel: 'Status: In progress', pattern: 'dotted' },
  investigating: { label: 'Investigating', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Search, ariaLabel: 'Status: Investigating', pattern: 'dotted' },
  resolved: { label: 'Resolved', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle, ariaLabel: 'Status: Resolved', pattern: 'solid' },
  closed: { label: 'Closed', className: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: Archive, ariaLabel: 'Status: Closed', pattern: 'none' },
  // Payroll
  generated: { label: 'Generated', className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', icon: FileText, ariaLabel: 'Status: Generated', pattern: 'solid' },
  reviewed: { label: 'Reviewed', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: FileCheck, ariaLabel: 'Status: Reviewed', pattern: 'dotted' },
  paid: { label: 'Paid', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: DollarSign, ariaLabel: 'Status: Paid', pattern: 'solid' },
  draft: { label: 'Draft', className: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: FileEdit, ariaLabel: 'Status: Draft', pattern: 'none' },
  'on-hold': { label: 'On Hold', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Pause, ariaLabel: 'Status: On hold', pattern: 'dotted' },
  cancelled: { label: 'Cancelled', className: 'bg-rose-500/20 text-rose-400 border-rose-500/30', icon: Ban, ariaLabel: 'Status: Cancelled', pattern: 'striped' },
  escalated: { label: 'Escalated', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: AlertOctagon, ariaLabel: 'Status: Escalated', pattern: 'striped' },
  // Tasks
  todo: { label: 'To Do', className: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: ListTodo, ariaLabel: 'Status: To do', pattern: 'none' },
  'in-review': { label: 'In Review', className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', icon: FileSearch, ariaLabel: 'Status: In review', pattern: 'dotted' },
  done: { label: 'Done', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: DoneIcon, ariaLabel: 'Status: Done', pattern: 'solid' },
  blocked: { label: 'Blocked', className: 'bg-rose-500/20 text-rose-400 border-rose-500/30', icon: Lock, ariaLabel: 'Status: Blocked', pattern: 'striped' },
  // Priority — arrows for visual distinction beyond color
  low: { label: 'Low', className: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: ArrowDown, ariaLabel: 'Priority: Low', pattern: 'none' },
  medium: { label: 'Medium', className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', icon: ArrowRight, ariaLabel: 'Priority: Medium', pattern: 'solid' },
  high: { label: 'High', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: ArrowUp, ariaLabel: 'Priority: High', pattern: 'dotted' },
  urgent: { label: 'Urgent', className: 'bg-rose-500/20 text-rose-400 border-rose-500/30', icon: Zap, ariaLabel: 'Priority: Urgent', pattern: 'striped' },
  // General
  active: { label: 'Active', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: Power, ariaLabel: 'Status: Active', pattern: 'solid' },
  inactive: { label: 'Inactive', className: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: PowerOff, ariaLabel: 'Status: Inactive', pattern: 'none' },
};

// Pattern styles for color-blind distinction
const patternStyles: Record<string, string> = {
  solid: '', // default, no extra pattern
  striped: 'bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(255,255,255,0.05)_3px,rgba(255,255,255,0.05)_6px)]',
  dotted: 'bg-[radial-gradient(circle,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[length:6px_6px]',
  none: '',
};

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
  /** If true, shows the icon alongside the label for color-blind accessibility */
  showIcon?: boolean;
  /** Size variant */
  size?: 'sm' | 'default';
}

export function StatusBadge({ status, className, showIcon = false, size = 'default' }: StatusBadgeProps) {
  const normalizedStatus = status?.toLowerCase()?.replace(/_/g, '-') || '';
  const config = statusConfig[normalizedStatus] || {
    label: status,
    className: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    icon: CircleDot,
    ariaLabel: `Status: ${status}`,
    pattern: 'none' as const,
  };
  const Icon = config.icon;
  const patternClass = patternStyles[config.pattern] || '';

  return (
    <Badge
      variant="outline"
      role="status"
      aria-label={config.ariaLabel}
      className={cn(
        'font-medium inline-flex items-center gap-1',
        size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs',
        config.className,
        patternClass,
        className,
      )}
    >
      {showIcon && <Icon className={cn(size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3')} aria-hidden="true" />}
      {config.label}
      {/* Screen reader only: full accessible description */}
      <span className="sr-only">{config.ariaLabel}</span>
    </Badge>
  );
}
