'use client';

/**
 * LeavePlanner — Visual leave planning tool with instant balance preview,
 * coverage risk calculation, and alternative date suggestions.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Send,
  Star,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  CalendarDays,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  formatDate,
  workingDaysBetween,
  leaveTypeConfig,
  staggerFast,
} from './index';
import type { LeaveTypeConfig } from './config-maps';

// ─── Types ────────────────────────────────────────────────────

export interface PlannedLeave {
  id: string; // temp ID
  type: 'sick' | 'casual' | 'vacation' | 'maternity' | 'paternity' | 'unpaid';
  startDate: string;
  endDate: string;
  days: number;
}

export interface LeaveTypeBalance {
  total: number;
  used: number;
  remaining: number;
}

export interface LeavePlannerProps {
  leaveBalance: Record<string, LeaveTypeBalance> | null;
  existingLeaves: Array<{
    id: string;
    type: string;
    startDate: string;
    endDate: string;
    status: string;
  }>;
  teamSize: number;
  onApplyPlan: (plan: PlannedLeave) => void;
  departmentMembers?: Array<{ id: string; name: string }>;
}

// ─── Risk Calculation ─────────────────────────────────────────

function calculateCoverageRisk(
  startDate: string,
  endDate: string,
  existingLeaves: Array<{ startDate: string; endDate: string; status: string }>,
  teamSize: number
): 'low' | 'medium' | 'high' | 'critical' {
  if (teamSize <= 0) return 'low';
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Find maximum overlap on any single day
  let maxAway = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const ds = d.toISOString().slice(0, 10);
    const awayCount = existingLeaves.filter((l) => {
      if (l.status === 'rejected' || l.status === 'cancelled') return false;
      return l.startDate <= ds && l.endDate >= ds;
    }).length;
    // +1 for the planned leave itself
    maxAway = Math.max(maxAway, awayCount + 1);
  }

  const coverageRatio = (teamSize - maxAway) / teamSize;
  if (coverageRatio >= 0.7) return 'low';
  if (coverageRatio >= 0.5) return 'medium';
  if (coverageRatio >= 0.3) return 'high';
  return 'critical';
}

const riskBadge: Record<string, { bg: string; text: string; label: string }> = {
  low: {
    bg: 'bg-emerald-500/15 border-emerald-500/30',
    text: 'text-emerald-400',
    label: 'Low Risk',
  },
  medium: {
    bg: 'bg-amber-500/15 border-amber-500/30',
    text: 'text-amber-400',
    label: 'Medium Risk',
  },
  high: {
    bg: 'bg-orange-500/15 border-orange-500/30',
    text: 'text-orange-400',
    label: 'High Risk',
  },
  critical: {
    bg: 'bg-rose-500/15 border-rose-500/30',
    text: 'text-rose-400',
    label: 'Critical',
  },
};

// ─── Weekday Headers ──────────────────────────────────────────

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

// ─── Alternative Suggestion Type ──────────────────────────────

interface AlternativeDate {
  startDate: string;
  endDate: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  workingDays: number;
}

// ─── Main Component ───────────────────────────────────────────

export function LeavePlanner({
  leaveBalance,
  existingLeaves,
  teamSize,
  onApplyPlan,
  departmentMembers,
}: LeavePlannerProps) {
  // Calendar state
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  // Range selection state
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);

  // Planned leaves
  const [plannedLeaves, setPlannedLeaves] = useState<PlannedLeave[]>([]);
  const [selectedType, setSelectedType] = useState<string>('vacation');
  const [applying, setApplying] = useState(false);

  // Alternatives loading
  const [alternatives, setAlternatives] = useState<AlternativeDate[]>([]);
  const [altLoading, setAltLoading] = useState(false);

  // Derived: working days in range
  const workingDays = useMemo(() => {
    if (!rangeStart || !rangeEnd) return 0;
    return workingDaysBetween(rangeStart, rangeEnd);
  }, [rangeStart, rangeEnd]);

  // Coverage risk
  const coverageRisk = useMemo(() => {
    if (!rangeStart || !rangeEnd) return null;
    return calculateCoverageRisk(
      rangeStart,
      rangeEnd,
      existingLeaves,
      teamSize
    );
  }, [rangeStart, rangeEnd, existingLeaves, teamSize]);

  // Balance preview
  const balancePreview = useMemo(() => {
    if (!leaveBalance || !selectedType) return null;
    const bal = leaveBalance[selectedType];
    if (!bal) return null;
    return {
      type: selectedType,
      total: bal.total,
      used: bal.used,
      remainingBefore: bal.remaining,
      remainingAfter: Math.max(0, bal.remaining - workingDays),
    };
  }, [leaveBalance, selectedType, workingDays]);

  // Computed balance after all planned leaves
  const projectedBalance = useMemo(() => {
    if (!leaveBalance) return null;
    const result: Record<string, LeaveTypeBalance> = {};
    for (const [type, bal] of Object.entries(leaveBalance)) {
      const plannedDays = plannedLeaves
        .filter((p) => p.type === type)
        .reduce((sum, p) => sum + p.days, 0);
      result[type] = {
        total: bal.total,
        used: bal.used,
        remaining: Math.max(0, bal.remaining - plannedDays),
      };
    }
    return result;
  }, [leaveBalance, plannedLeaves]);

  // Auto-select leave type with highest remaining balance
  useEffect(() => {
    if (leaveBalance) {
      let best = 'vacation';
      let bestRemaining = -1;
      for (const [type, bal] of Object.entries(leaveBalance)) {
        if (bal.remaining > bestRemaining) {
          bestRemaining = bal.remaining;
          best = type;
        }
      }
      setSelectedType(best);
    }
  }, [leaveBalance]);

  // Fetch alternatives when range changes
  useEffect(() => {
    if (!rangeStart || !rangeEnd) {
      setAlternatives([]);
      return;
    }
    let cancelled = false;
    setAltLoading(true);
    fetch('/api/leave-conflict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'suggest-alternatives',
        startDate: rangeStart,
        endDate: rangeEnd,
        teamSize,
        existingLeaves,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.alternatives) {
          setAlternatives(data.alternatives);
        }
      })
      .catch(() => {
        // Silently fail - alternatives are optional
      })
      .finally(() => {
        if (!cancelled) setAltLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rangeStart, rangeEnd, teamSize, existingLeaves]);

  // Calendar helpers
  const daysInMonth = new Date(calMonth.y, calMonth.m + 1, 0).getDate();
  const startDay = (new Date(calMonth.y, calMonth.m, 1).getDay() + 6) % 7;

  const prevMonth = () =>
    setCalMonth((p) =>
      p.m === 0 ? { y: p.y - 1, m: 11 } : { y: p.y, m: p.m - 1 }
    );
  const nextMonth = () =>
    setCalMonth((p) =>
      p.m === 11 ? { y: p.y + 1, m: 0 } : { y: p.y, m: p.m + 1 }
    );

  const monthLabel = new Date(calMonth.y, calMonth.m).toLocaleString(
    'default',
    { month: 'long', year: 'numeric' }
  );

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Build leave map for calendar bars
  const leaveDateMap = useMemo(() => {
    const m: Record<string, Array<{ type: string; status: string }>> = {};
    existingLeaves.forEach((l) => {
      const s = new Date(l.startDate);
      const e = new Date(l.endDate);
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        (m[key] ??= []).push({ type: l.type, status: l.status });
      }
    });
    return m;
  }, [existingLeaves]);

  // Build planned leave map for calendar
  const plannedDateMap = useMemo(() => {
    const m: Record<string, boolean> = {};
    plannedLeaves.forEach((p) => {
      const s = new Date(p.startDate);
      const e = new Date(p.endDate);
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        m[key] = true;
      }
    });
    return m;
  }, [plannedLeaves]);

  // Date click handler for range selection
  const handleDateClick = useCallback(
    (day: number) => {
      const dateStr = `${calMonth.y}-${String(calMonth.m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (!rangeStart || (rangeStart && rangeEnd)) {
        // Start new selection
        setRangeStart(dateStr);
        setRangeEnd(null);
      } else {
        // Complete selection
        if (dateStr < rangeStart) {
          setRangeStart(dateStr);
          setRangeEnd(rangeStart);
        } else {
          setRangeEnd(dateStr);
        }
      }
    },
    [calMonth, rangeStart, rangeEnd]
  );

  // Clear selection
  const clearSelection = () => {
    setRangeStart(null);
    setRangeEnd(null);
  };

  // Select an alternative date
  const selectAlternative = (alt: AlternativeDate) => {
    setRangeStart(alt.startDate);
    setRangeEnd(alt.endDate);
  };

  // Add to plan
  const addToPlan = () => {
    if (!rangeStart || !rangeEnd) {
      toast.error('Please select a date range first');
      return;
    }
    const type = selectedType as PlannedLeave['type'];
    const plan: PlannedLeave = {
      id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      startDate: rangeStart,
      endDate: rangeEnd,
      days: workingDays,
    };
    setPlannedLeaves((prev) => [...prev, plan]);
    clearSelection();
    toast.success('Leave added to plan');
  };

  // Apply now (single)
  const applyNow = async () => {
    if (!rangeStart || !rangeEnd) {
      toast.error('Please select a date range first');
      return;
    }
    setApplying(true);
    try {
      const type = selectedType as PlannedLeave['type'];
      await onApplyPlan({
        id: `plan-${Date.now()}`,
        type,
        startDate: rangeStart,
        endDate: rangeEnd,
        days: workingDays,
      });
      clearSelection();
      toast.success('Leave application submitted');
    } catch {
      toast.error('Failed to apply leave');
    } finally {
      setApplying(false);
    }
  };

  // Apply all planned leaves
  const applyAll = async () => {
    if (plannedLeaves.length === 0) {
      toast.error('No leaves planned');
      return;
    }
    setApplying(true);
    try {
      for (const plan of plannedLeaves) {
        await onApplyPlan(plan);
      }
      setPlannedLeaves([]);
      toast.success(`All ${plannedLeaves.length} leave(s) submitted`);
    } catch {
      toast.error('Failed to apply some leaves');
    } finally {
      setApplying(false);
    }
  };

  // Remove a planned leave
  const removePlan = (id: string) => {
    setPlannedLeaves((prev) => prev.filter((p) => p.id !== id));
  };

  // Total planned days
  const totalPlannedDays = plannedLeaves.reduce((s, p) => s + p.days, 0);

  return (
    <div className="w-full space-y-6">
      {/* Two-panel layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── A. Date Range Selector Panel ── */}
        <div className="flex-1 min-w-0">
          <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.04] backdrop-blur-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-cyan-400" />
              Select Date Range
            </h3>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={prevMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold">{monthLabel}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={nextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="text-[10px] text-muted-foreground font-medium py-1"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty offset cells */}
              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`e${i}`} />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dateStr = `${calMonth.y}-${String(calMonth.m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isToday = dateStr === todayStr;
                const dow = new Date(calMonth.y, calMonth.m, day).getDay();
                const isWeekend = dow === 0 || dow === 6;

                // Range highlight
                const inRange =
                  rangeStart &&
                  rangeEnd &&
                  dateStr >= rangeStart &&
                  dateStr <= rangeEnd;
                const isStart = dateStr === rangeStart;
                const isEnd = dateStr === rangeEnd;

                // Existing leaves
                const dayLeaves = leaveDateMap[dateStr] || [];
                const isPlanned = plannedDateMap[dateStr];

                return (
                  <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={`
                      relative h-9 rounded-md text-xs flex flex-col items-center justify-center gap-0.5
                      transition-colors cursor-pointer hover:bg-black/[0.06] dark:hover:bg-white/[0.1]
                      ${isToday ? 'bg-emerald-500/20 text-emerald-400 font-bold ring-1 ring-emerald-500/40' : ''}
                      ${inRange ? 'bg-cyan-500/20 text-cyan-400' : ''}
                      ${isStart ? 'ring-1 ring-cyan-500/50 bg-cyan-500/30' : ''}
                      ${isEnd ? 'ring-1 ring-cyan-500/50 bg-cyan-500/30' : ''}
                      ${isWeekend && !inRange ? 'opacity-50' : ''}
                      ${!inRange && !isToday ? 'text-foreground/80' : ''}
                    `}
                  >
                    {day}
                    {/* Existing leave dots */}
                    {dayLeaves.length > 0 && (
                      <div className="flex gap-0.5">
                        {dayLeaves.slice(0, 3).map((l, j) => {
                          const cfg = leaveTypeConfig[l.type];
                          const dotColor =
                            l.status === 'approved'
                              ? 'bg-emerald-400'
                              : l.status === 'pending'
                                ? 'bg-amber-400'
                                : 'bg-slate-400';
                          return (
                            <span
                              key={j}
                              className={`w-1.5 h-1.5 rounded-full ${dotColor}`}
                            />
                          );
                        })}
                      </div>
                    )}
                    {/* Planned indicator */}
                    {isPlanned && !dayLeaves.length && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend + Clear */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />{' '}
                  Approved
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />{' '}
                  Pending
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />{' '}
                  Planned
                </span>
              </div>
              {(rangeStart || rangeEnd) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={clearSelection}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {/* Department members on leave (faded bars) */}
            {departmentMembers && departmentMembers.length > 0 && (
              <div className="text-[10px] text-muted-foreground pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
                <span className="font-medium">Team members: </span>
                {departmentMembers.slice(0, 5).map((m) => m.name).join(', ')}
                {departmentMembers.length > 5 &&
                  ` +${departmentMembers.length - 5} more`}
              </div>
            )}
          </div>
        </div>

        {/* ── B. Plan Preview Panel ── */}
        <div className="flex-1 min-w-0">
          <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.04] backdrop-blur-xl p-4 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Plan Preview
            </h3>

            {/* Leave type selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground font-medium">
                Leave Type
              </label>
              <Select
                value={selectedType}
                onValueChange={setSelectedType}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(leaveTypeConfig).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <cfg.icon className={`h-3.5 w-3.5 ${cfg.iconText}`} />
                        {cfg.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date range display */}
            <div className="rounded-lg border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.03] p-3 space-y-1.5">
              <div className="text-[10px] text-muted-foreground font-medium">
                Date Range
              </div>
              {rangeStart && rangeEnd ? (
                <>
                  <div className="text-sm font-medium">
                    {formatDate(rangeStart)} - {formatDate(rangeEnd)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {workingDays} working day{workingDays !== 1 ? 's' : ''}
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Click a start date, then an end date on the calendar
                </div>
              )}
            </div>

            {/* Balance preview */}
            {balancePreview && (
              <div className="space-y-2">
                <div className="text-[10px] text-muted-foreground font-medium">
                  Balance Impact
                </div>
                {/* Before */}
                <div className="rounded-lg border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.03] p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Current</span>
                    <span className="font-medium">
                      {leaveTypeConfig[balancePreview.type]?.label || balancePreview.type}:{' '}
                      {balancePreview.remainingBefore} remaining
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-black/[0.04] dark:bg-white/[0.06] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${leaveTypeConfig[balancePreview.type]?.progressColor || 'bg-cyan-500'} transition-all duration-500`}
                      style={{
                        width: `${Math.min(100, (balancePreview.remainingBefore / balancePreview.total) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                {/* After */}
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.05] p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      If approved
                    </span>
                    <span className="font-medium text-amber-400">
                      {leaveTypeConfig[balancePreview.type]?.label || balancePreview.type}:{' '}
                      {balancePreview.remainingAfter} remaining
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-black/[0.04] dark:bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (balancePreview.remainingAfter / balancePreview.total) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Coverage risk badge */}
            {coverageRisk && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground font-medium">
                  Coverage Risk:
                </span>
                <Badge
                  variant="outline"
                  className={`${riskBadge[coverageRisk].bg} ${riskBadge[coverageRisk].text} text-[10px]`}
                >
                  {coverageRisk === 'high' || coverageRisk === 'critical' ? (
                    <AlertTriangle className="h-3 w-3 mr-1" />
                  ) : null}
                  {riskBadge[coverageRisk].label}
                </Badge>
              </div>
            )}

            {/* Alternative date suggestions */}
            {rangeStart && rangeEnd && (
              <div className="space-y-2">
                <div className="text-[10px] text-muted-foreground font-medium">
                  Alternative Dates
                </div>
                {altLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton
                        key={i}
                        className="h-12 w-full rounded-lg"
                      />
                    ))}
                  </div>
                ) : alternatives.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                    {alternatives.map((alt, i) => {
                      const rBadge = riskBadge[alt.riskLevel] || riskBadge.low;
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-lg border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.03] p-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span>
                              {formatDate(alt.startDate)} -{' '}
                              {formatDate(alt.endDate)}
                            </span>
                            <span className="text-muted-foreground">
                              ({alt.workingDays}d)
                            </span>
                            <Badge
                              variant="outline"
                              className={`${rBadge.bg} ${rBadge.text} text-[9px] px-1.5 py-0`}
                            >
                              {rBadge.label}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-2"
                            onClick={() => selectAlternative(alt)}
                          >
                            Select
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    No alternatives found
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={!rangeStart || !rangeEnd || applying}
                onClick={addToPlan}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add to Plan
              </Button>
              <Button
                size="sm"
                className="flex-1"
                disabled={!rangeStart || !rangeEnd || applying}
                onClick={applyNow}
              >
                {applying ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5 mr-1" />
                )}
                Apply Now
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── C. Plan Summary ── */}
      {plannedLeaves.length > 0 && (
        <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.04] backdrop-blur-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Plan Summary ({plannedLeaves.length} leave
              {plannedLeaves.length !== 1 ? 's' : ''})
            </h3>
            <span className="text-xs text-muted-foreground">
              {totalPlannedDays} working day{totalPlannedDays !== 1 ? 's' : ''}{' '}
              planned
            </span>
          </div>

          {/* Planned leave cards */}
          <motion.div
            className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar"
            variants={staggerFast.container}
            initial="initial"
            animate="animate"
          >
            <AnimatePresence mode="popLayout">
              {plannedLeaves.map((plan) => {
                const cfg: LeaveTypeConfig | undefined =
                  leaveTypeConfig[plan.type];
                const Icon = cfg?.icon || CalendarDays;
                const risk = calculateCoverageRisk(
                  plan.startDate,
                  plan.endDate,
                  existingLeaves,
                  teamSize
                );
                const rBadge = riskBadge[risk] || riskBadge.low;

                return (
                  <motion.div
                    key={plan.id}
                    variants={staggerFast.item}
                    exit={{ opacity: 0, x: -20, height: 0 }}
                    className="flex items-center justify-between rounded-lg border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.03] p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center ${cfg?.iconBg || 'bg-black/[0.06] dark:bg-white/[0.1]'}`}
                      >
                        <Icon
                          className={`h-4 w-4 ${cfg?.iconText || 'text-foreground'}`}
                        />
                      </div>
                      <div>
                        <div className="text-xs font-medium">
                          {cfg?.label || plan.type}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatDate(plan.startDate)} -{' '}
                          {formatDate(plan.endDate)} ({plan.days}d)
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`${rBadge.bg} ${rBadge.text} text-[9px] px-1.5 py-0`}
                      >
                        {rBadge.label}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                        onClick={() => removePlan(plan.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>

          {/* Balance summary table */}
          {projectedBalance && (
            <div className="rounded-lg border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.03] p-3 space-y-2">
              <div className="text-[10px] text-muted-foreground font-medium">
                Balance Summary
              </div>
              <div className="grid grid-cols-5 gap-2 text-[10px]">
                <div className="text-muted-foreground font-medium">Type</div>
                <div className="text-muted-foreground font-medium text-right">
                  Total
                </div>
                <div className="text-muted-foreground font-medium text-right">
                  Used
                </div>
                <div className="text-muted-foreground font-medium text-right">
                  Planned
                </div>
                <div className="text-muted-foreground font-medium text-right">
                  Remaining
                </div>
                {Object.entries(projectedBalance).map(([type, bal]) => {
                  const cfg = leaveTypeConfig[type];
                  const planned = plannedLeaves
                    .filter((p) => p.type === type)
                    .reduce((s, p) => s + p.days, 0);
                  const afterPlan = Math.max(
                    0,
                    bal.remaining - planned
                  );
                  return (
                    <div
                      key={type}
                      className="col-span-5 grid grid-cols-5 gap-2 items-center"
                    >
                      <div className="flex items-center gap-1.5">
                        {cfg && (
                          <cfg.icon
                            className={`h-3 w-3 ${cfg.iconText}`}
                          />
                        )}
                        <span>{cfg?.label || type}</span>
                      </div>
                      <div className="text-right">{bal.total}</div>
                      <div className="text-right">{bal.used}</div>
                      <div className="text-right text-cyan-400">
                        {planned || '-'}
                      </div>
                      <div
                        className={`text-right font-medium ${
                          afterPlan <= 2
                            ? 'text-rose-400'
                            : afterPlan <= 5
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                        }`}
                      >
                        {afterPlan}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Apply All button */}
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={applying || plannedLeaves.length === 0}
              onClick={applyAll}
            >
              {applying ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5 mr-1" />
              )}
              Apply All ({plannedLeaves.length})
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
