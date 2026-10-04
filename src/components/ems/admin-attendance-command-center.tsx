'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isWeekend, isSameDay, addMonths, subMonths } from 'date-fns';
import type { RosterEntry, MissedPunch, IPMismatch, RuleViolation } from '@/lib/types';
import {
  Users, UserCheck, AlertTriangle, CalendarOff, Clock, Search,
  MapPin, Wifi, Shield, Ghost, FileDown, Settings2,
  ChevronRight, X, Check, Loader2, RefreshCw, AlertCircle,
  Timer, TrendingUp, Eye, Edit3, ArrowRight, ShieldAlert,
  Fingerprint, Globe, MonitorSmartphone, Zap, ClipboardCheck,
  ChevronLeft, Calendar as CalendarIcon,
} from 'lucide-react';
import { ProgressRing } from './shared';

// ─── Mini Sparkline ────────────────────────────────────────────
function Sparkline({ data, width = 60, height = 24 }: { data: number[]; width?: number; height?: number }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 8);
  const barWidth = width / data.length;
  return (
    <svg width={width} height={height} className="inline-block">
      {data.map((val, i) => {
        const barHeight = Math.max(2, (val / max) * (height - 4));
        const y = height - barHeight - 2;
        const color = val === 0 ? 'rgba(255,255,255,0.1)' : val >= 8 ? '#10b981' : val >= 4 ? '#06b6d4' : '#f59e0b';
        return (
          <rect key={i} x={i * barWidth + 1} y={y} width={barWidth - 2} height={barHeight}
            rx={1.5} fill={color} className="transition-all duration-300" />
        );
      })}
    </svg>
  );
}

// ─── Status Dot ────────────────────────────────────────────────
const statusConfig: Record<string, { dot: string; label: string; bg: string; text: string }> = {
  'in-office': { dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]', label: 'In Office', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  'left': { dot: 'bg-slate-400', label: 'Left', bg: 'bg-slate-500/10', text: 'text-slate-400' },
  'not-arrived': { dot: 'bg-slate-500', label: 'Not Arrived', bg: 'bg-slate-500/10', text: 'text-slate-500' },
  'late': { dot: 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]', label: 'Late', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  'on-leave': { dot: 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)]', label: 'On Leave', bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
  'absent': { dot: 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.4)]', label: 'Absent', bg: 'bg-rose-500/10', text: 'text-rose-400' },
  'flagged': { dot: 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]', label: 'Flagged', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  'remote': { dot: 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]', label: 'Remote', bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
};

// ─── Monthly Calendar View ──────────────────────────────────────
const CAL_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const calStatusColors: Record<string, string> = {
  present: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  late: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  absent: 'bg-rose-500/8 border-rose-500/15 text-rose-400',
  'half-day': 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
  weekend: 'bg-slate-500/5 border-slate-500/10 text-slate-500',
  holiday: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
};

const calStatusDot: Record<string, string> = {
  present: 'bg-emerald-400',
  late: 'bg-amber-400',
  absent: 'bg-rose-400',
  'half-day': 'bg-cyan-400',
  holiday: 'bg-purple-400',
};

function MonthlyAttendanceCalendar({ records }: { records: Array<{ date: string; status: string; firstIn?: string | null; lastOut?: string | null; totalHours?: number | null }> }) {
  const [calDate, setCalDate] = useState(new Date());
  const [calDirection, setCalDirection] = useState(0);

  const year = calDate.getFullYear();
  const month = calDate.getMonth() + 1;

  const calData = useMemo(() => {
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(new Date(year, month - 1));
    const days = eachDayOfInterval({ start, end });
    const startDay = getDay(start);
    return { days, startDay };
  }, [year, month]);

  const getRecord = useCallback((dateStr: string) => {
    return records.find(r => r.date === dateStr);
  }, [records]);

  const getStatus = useCallback((day: Date) => {
    if (isWeekend(day)) return 'weekend';
    const dateStr = format(day, 'yyyy-MM-dd');
    const rec = getRecord(dateStr);
    return rec?.status?.toLowerCase() || '';
  }, [getRecord]);

  // Summary counts
  const summary = useMemo(() => {
    let p = 0, l = 0, a = 0, h = 0, hd = 0;
    calData.days.forEach(day => {
      const s = getStatus(day);
      if (s === 'present') p++;
      else if (s === 'late') l++;
      else if (s === 'absent') a++;
      else if (s === 'holiday') h++;
      else if (s === 'half-day') hd++;
    });
    return { present: p, late: l, absent: a, holiday: h, halfDay: hd };
  }, [calData.days, getStatus]);

  const handleNav = (dir: -1 | 1) => {
    setCalDirection(dir);
    setCalDate(dir === -1 ? subMonths(calDate, 1) : addMonths(calDate, 1));
  };

  const handleToday = () => {
    setCalDirection(0);
    setCalDate(new Date());
  };

  return (
    <div className="space-y-3">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Attendance Calendar
        </h4>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={handleToday} className="text-[10px] h-6 px-2 bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.1]">
            Today
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleNav(-1)}>
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span className="text-xs font-semibold min-w-[100px] text-center">{format(calDate, 'MMMM yyyy')}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleNav(1)}>
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${year}-${month}`}
          initial={{ opacity: 0, x: calDirection >= 0 ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: calDirection >= 0 ? -20 : 20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {CAL_DAY_NAMES.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Day Cells */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: calData.startDay }, (_, i) => (
              <div key={`blank-${i}`} className="aspect-square" />
            ))}
            {calData.days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const status = getStatus(day);
              const record = getRecord(dateStr);
              const isToday = isSameDay(day, new Date());
              const hasRecord = !!record;

              return (
                <div
                  key={dateStr}
                  className={cn(
                    'aspect-square rounded-md border p-1 text-left transition-all',
                    isToday && 'ring-1.5 ring-emerald-500/50',
                    status === 'present' && 'bg-emerald-500/10 border-emerald-500/20',
                    status === 'late' && 'bg-amber-500/10 border-amber-500/20',
                    status === 'absent' && 'bg-rose-500/8 border-rose-500/15',
                    status === 'half-day' && 'bg-cyan-500/10 border-cyan-500/20',
                    status === 'holiday' && 'bg-purple-500/10 border-purple-500/20',
                    status === 'weekend' && 'bg-slate-500/5 border-slate-500/10',
                    !status && !isWeekend(day) && 'bg-black/[0.01] dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.05]',
                  )}
                  title={`${format(day, 'MMM d')}: ${status || 'no record'}`}
                >
                  <div className="flex flex-col h-full justify-between">
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        'text-[10px] font-medium leading-none',
                        isToday ? 'text-emerald-400 font-bold' :
                        status === 'weekend' ? 'text-slate-500' :
                        hasRecord ? 'text-white' : 'text-muted-foreground'
                      )}>
                        {format(day, 'd')}
                      </span>
                      {status && status !== 'weekend' && (
                        <div className={cn('h-1 w-1 rounded-full', calStatusDot[status])} />
                      )}
                    </div>
                    {record && (record.firstIn || record.lastOut) && (
                      <div className="mt-0.5 space-y-0">
                        {record.firstIn && (
                          <p className="text-[7px] text-muted-foreground leading-none truncate">
                            → {record.firstIn.substring(0, 5)}
                          </p>
                        )}
                        {record.lastOut && (
                          <p className="text-[7px] text-muted-foreground leading-none truncate">
                            ← {record.lastOut.substring(0, 5)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Summary Strip */}
      <div className="flex flex-wrap items-center gap-2 text-[10px]">
        {[
          { label: 'Present', count: summary.present, dot: 'bg-emerald-400', text: 'text-emerald-400' },
          { label: 'Late', count: summary.late, dot: 'bg-amber-400', text: 'text-amber-400' },
          { label: 'Absent', count: summary.absent, dot: 'bg-rose-400', text: 'text-rose-400' },
          { label: 'Half Day', count: summary.halfDay, dot: 'bg-cyan-400', text: 'text-cyan-400' },
          { label: 'Holiday', count: summary.holiday, dot: 'bg-purple-400', text: 'text-purple-400' },
        ].map(s => (
          <span key={s.label} className="flex items-center gap-1">
            <div className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
            <span className={s.text}>{s.count}</span>
            <span className="text-muted-foreground">{s.label}</span>
          </span>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        {[
          { label: 'Present', color: 'bg-emerald-500' },
          { label: 'Late', color: 'bg-amber-500' },
          { label: 'Absent', color: 'bg-rose-500' },
          { label: 'Half-day', color: 'bg-cyan-400' },
          { label: 'Weekend', color: 'bg-slate-600' },
          { label: 'Holiday', color: 'bg-purple-500' },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1">
            <div className={cn('h-2 w-2 rounded', l.color)} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────
export function AdminAttendanceCommandCenter() {
  const {
    adminAttendanceData, adminAttendanceLoading, loadAdminAttendanceData,
    ghostClockOut, resolveMissedPunch, adminOverrideAttendance,
    manualAttendance, bulkManualAttendance,
    shifts, departments, recalculateAttendance, users,
  } = useEMSStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState<RosterEntry | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [resolveModal, setResolveModal] = useState<MissedPunch | null>(null);
  const [resolveTime, setResolveTime] = useState('17:00');
  const [ghostModalOpen, setGhostModalOpen] = useState(false);
  const [ghostTime, setGhostTime] = useState('17:00');
  const [payrollView, setPayrollView] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  // Manual attendance state
  const [manualAttendanceOpen, setManualAttendanceOpen] = useState(false);
  const [manualMode, setManualMode] = useState<'single' | 'bulk'>('single');
  const [manualUserId, setManualUserId] = useState('');
  const [manualStatus, setManualStatus] = useState('PRESENT');
  const [manualClockIn, setManualClockIn] = useState('09:00');
  const [manualClockOut, setManualClockOut] = useState('17:00');
  const [manualNote, setManualNote] = useState('');
  const [selectedBulkUsers, setSelectedBulkUsers] = useState<string[]>([]);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [bulkDeptFilter, setBulkDeptFilter] = useState('all');

  // Load admin data on mount
  useEffect(() => {
    loadAdminAttendanceData();
  }, [loadAdminAttendanceData]);

  // Open drawer when employee selected
  const openDrawer = useCallback((entry: RosterEntry) => {
    setSelectedEmployee(entry);
    setDrawerOpen(true);
  }, []);

  // Filtered roster
  const filteredRoster = useMemo(() => {
    if (!adminAttendanceData?.roster) return [];
    return adminAttendanceData.roster.filter((entry) => {
      const matchSearch = !searchQuery ||
        entry.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDept = filterDept === 'all' || entry.department === filterDept;
      const matchStatus = filterStatus === 'all' || entry.status === filterStatus;
      return matchSearch && matchDept && matchStatus;
    });
  }, [adminAttendanceData?.roster, searchQuery, filterDept, filterStatus]);

  const metrics = adminAttendanceData?.metrics;
  const anomalies = adminAttendanceData?.anomalies;
  const totalAnomalies = (anomalies?.missedPunches?.length || 0) +
    (anomalies?.ipMismatches?.length || 0) + (anomalies?.ruleViolations?.length || 0);

  // Employee year data for drawer
  const employeeYearData = useMemo(() => {
    if (!selectedEmployee || !adminAttendanceData?.employeeYearMap) return [];
    return adminAttendanceData.employeeYearMap[selectedEmployee.userId] || [];
  }, [selectedEmployee, adminAttendanceData?.employeeYearMap]);

  // Handle resolve missed punch
  const handleResolve = async () => {
    if (!resolveModal) return;
    try {
      await resolveMissedPunch(
        resolveModal.userId, 'CLOCK_OUT', resolveTime, adminAttendanceData?.date || ''
      );
      toast.success(`Resolved clock-out for ${resolveModal.userName}`);
      setResolveModal(null);
    } catch {
      toast.error('Failed to resolve punch');
    }
  };

  // Handle ghost clock-out
  const handleGhostClockOut = async () => {
    try {
      await ghostClockOut(adminAttendanceData?.date || '', ghostTime);
      toast.success('Ghost clock-out completed');
      setGhostModalOpen(false);
    } catch {
      toast.error('Ghost clock-out failed');
    }
  };

  // Handle manual attendance submit (single)
  const handleManualAttendance = async () => {
    if (!manualUserId) {
      toast.error('Please select an employee');
      return;
    }
    setManualSubmitting(true);
    try {
      await manualAttendance(
        manualUserId, manualStatus,
        manualClockIn || undefined, manualClockOut || undefined,
        manualNote || undefined
      );
      toast.success('Manual attendance marked successfully');
      setManualAttendanceOpen(false);
      resetManualForm();
    } catch {
      toast.error('Failed to mark manual attendance');
    } finally {
      setManualSubmitting(false);
    }
  };

  // Handle bulk manual attendance submit
  const handleBulkManualAttendance = async () => {
    if (selectedBulkUsers.length === 0) {
      toast.error('Please select at least one employee');
      return;
    }
    setManualSubmitting(true);
    try {
      await bulkManualAttendance(
        selectedBulkUsers, manualStatus,
        manualClockIn || undefined, manualClockOut || undefined,
        manualNote || undefined
      );
      toast.success(`Marked attendance for ${selectedBulkUsers.length} employee(s)`);
      setManualAttendanceOpen(false);
      resetManualForm();
    } catch {
      toast.error('Failed to mark bulk manual attendance');
    } finally {
      setManualSubmitting(false);
    }
  };

  const resetManualForm = () => {
    setManualUserId('');
    setManualStatus('PRESENT');
    setManualClockIn('09:00');
    setManualClockOut('17:00');
    setManualNote('');
    setSelectedBulkUsers([]);
    setManualMode('single');
    setManualSearchQuery('');
    setBulkDeptFilter('all');
  };

  // Filtered employees for manual attendance selector
  const manualAttendanceEmployees = useMemo(() => {
    return (adminAttendanceData?.roster || []).filter(e => {
      const matchSearch = !manualSearchQuery ||
        e.userName.toLowerCase().includes(manualSearchQuery.toLowerCase()) ||
        e.email.toLowerCase().includes(manualSearchQuery.toLowerCase());
      return matchSearch;
    });
  }, [adminAttendanceData?.roster, manualSearchQuery]);

  // Filtered employees for bulk mode (by department)
  const bulkFilteredEmployees = useMemo(() => {
    return (adminAttendanceData?.roster || []).filter(e => {
      const matchDept = bulkDeptFilter === 'all' || e.department === bulkDeptFilter;
      return matchDept;
    });
  }, [adminAttendanceData?.roster, bulkDeptFilter]);

  const toggleBulkUser = (userId: string) => {
    setSelectedBulkUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllBulk = () => {
    const allIds = bulkFilteredEmployees.map(e => e.userId);
    const allSelected = allIds.every(id => selectedBulkUsers.includes(id));
    if (allSelected) {
      setSelectedBulkUsers(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelectedBulkUsers(prev => {
        const newSet = new Set([...prev, ...allIds]);
        return Array.from(newSet);
      });
    }
  };

  // Handle recalculate
  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await recalculateAttendance(adminAttendanceData?.date || new Date().toISOString().split('T')[0]);
      await loadAdminAttendanceData();
      toast.success('Attendance recalculated');
    } catch {
      toast.error('Recalculation failed');
    } finally {
      setRecalculating(false);
    }
  };

  // Payroll calculations for export preview
  const payrollData = useMemo(() => {
    if (!adminAttendanceData?.roster) return [];
    return adminAttendanceData.roster.map(entry => {
      const regularHours = entry.totalHours || 0;
      const overtimeHours = entry.overtimeHours || 0;
      const hourlyRate = 25; // Simplified
      const regularPay = regularHours * hourlyRate;
      const overtimePay = overtimeHours * hourlyRate * 1.5;
      return {
        ...entry,
        regularPay: Math.round(regularPay * 100) / 100,
        overtimePay: Math.round(overtimePay * 100) / 100,
        totalPay: Math.round((regularPay + overtimePay) * 100) / 100,
      };
    });
  }, [adminAttendanceData?.roster]);

  if (adminAttendanceLoading && !adminAttendanceData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <p className="text-sm text-muted-foreground">Loading Command Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header Bar ────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Attendance Command Center</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {adminAttendanceData?.date ? format(parseISO(adminAttendanceData.date), 'EEEE, MMMM d, yyyy') : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={handleRecalculate} disabled={recalculating}
            className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-emerald-500/10 hover:border-emerald-500/30"
          >
            {recalculating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Recalculate
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={() => loadAdminAttendanceData()}
            className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-cyan-500/10 hover:border-cyan-500/30"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          TIER 1: THE LIVE PULSE — Hero Metrics
          Four glassmorphism cards showing today's live status
      ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Workforce */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[120px] max-h-[140px]" glow="cyan">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full -translate-y-8 translate-x-8" />
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate max-w-[140px]">Total Workforce</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1 truncate">{metrics?.totalWorkforce || 0}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate max-w-[160px]">Active employees</p>
              </div>
              <div className="rounded-xl p-3 bg-cyan-500/10">
                <Users className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Present Today with Progress Ring */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[120px] max-h-[140px]" glow="emerald">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -translate-y-8 translate-x-8" />
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate max-w-[140px]">Present Today</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-emerald-400 truncate">{metrics?.presentToday || 0}</p>
                  <p className="text-sm text-muted-foreground shrink-0">+ {metrics?.lateToday || 0} late</p>
                </div>
                <p className="text-xs text-emerald-400/80 mt-1 truncate max-w-[160px]">{metrics?.attendanceRate || 0}% attendance rate</p>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                <ProgressRing value={metrics?.attendanceRate || 0} size={64} strokeWidth={5} color="#10b981" />
                <span className="absolute text-xs font-bold text-emerald-400">{metrics?.attendanceRate || 0}%</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Anomalies */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard className={cn("p-4 sm:p-5 relative overflow-hidden min-h-[120px] max-h-[140px]", totalAnomalies > 0 ? "glow-amber" : "")} glow={totalAnomalies > 0 ? 'amber' : 'none'}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -translate-y-8 translate-x-8" />
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate max-w-[140px]">Anomalies</p>
                <p className={cn("text-xl sm:text-2xl lg:text-3xl font-bold mt-1 truncate", totalAnomalies > 0 ? "text-amber-400" : "text-slate-400")}>
                  {totalAnomalies}
                </p>
                <div className="flex flex-col gap-0.5 mt-1 overflow-hidden max-h-[48px]">
                  {anomalies && anomalies.missedPunches.length > 0 && (
                    <p className="text-xs text-amber-400/80 truncate">⚠ {anomalies.missedPunches.length} missed punch{anomalies.missedPunches.length > 1 ? 'es' : ''}</p>
                  )}
                  {anomalies && anomalies.ipMismatches.length > 0 && (
                    <p className="text-xs text-amber-400/80 truncate">🌐 {anomalies.ipMismatches.length} IP mismatch{anomalies.ipMismatches.length > 1 ? 'es' : ''}</p>
                  )}
                  {anomalies && anomalies.ruleViolations.length > 0 && (
                    <p className="text-xs text-amber-400/80 truncate">🚫 {anomalies.ruleViolations.length} rule violation{anomalies.ruleViolations.length > 1 ? 's' : ''}</p>
                  )}
                  {totalAnomalies === 0 && <p className="text-xs text-emerald-400/80 truncate">✓ All clear</p>}
                </div>
              </div>
              <div className={cn("rounded-xl p-3 shrink-0", totalAnomalies > 0 ? "bg-amber-500/10" : "bg-slate-500/10")}>
                <AlertTriangle className={cn("h-5 w-5", totalAnomalies > 0 ? "text-amber-400" : "text-slate-500")} />
              </div>
            </div>
            {totalAnomalies > 0 && (
              <div className="absolute inset-0 rounded-xl pointer-events-none animate-pulse">
                <div className="absolute inset-0 rounded-xl ring-1 ring-amber-500/20" />
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* On Leave */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[120px] max-h-[140px]" glow="rose">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -translate-y-8 translate-x-8" />
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate max-w-[140px]">On Leave</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1 truncate">{metrics?.onLeaveToday || 0}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate max-w-[160px]">Approved absences</p>
              </div>
              <div className="rounded-xl p-3 bg-rose-500/10">
                <CalendarOff className="h-5 w-5 text-rose-400" />
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          TIER 2: SMART ACTION CENTER — Needs Attention
      ═══════════════════════════════════════════════════════ */}
      {totalAnomalies > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <GlassCard className="p-6" glow="amber">
            <div className="flex items-center gap-2 mb-4">
              <div className="rounded-lg p-2 bg-amber-500/10">
                <Zap className="h-4 w-4 text-amber-400" />
              </div>
              <h3 className="font-semibold">Needs Attention</h3>
              <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs">
                {totalAnomalies} issue{totalAnomalies > 1 ? 's' : ''}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Missed Punches */}
              {anomalies && anomalies.missedPunches.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Clock className="h-3 w-3 text-amber-400" />
                    Missed Punches
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {anomalies.missedPunches.map((mp, i) => (
                      <motion.div
                        key={mp.userId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-amber-500/10 hover:border-amber-500/20 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{mp.userName}</p>
                            <p className="text-xs text-muted-foreground">
                              Clocked in at {mp.firstIn?.substring(0, 5)} — no clock-out
                            </p>
                          </div>
                          <Button
                            size="sm" variant="outline"
                            className="shrink-0 ml-2 text-xs h-7 gap-1 border-amber-500/20 hover:bg-amber-500/10 text-amber-400"
                            onClick={() => { setResolveModal(mp); setResolveTime('17:00'); }}
                          >
                            <Edit3 className="h-3 w-3" /> Resolve
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* IP Mismatches */}
              {anomalies && anomalies.ipMismatches.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Globe className="h-3 w-3 text-amber-400" />
                    IP / Location Mismatches
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {anomalies.ipMismatches.map((ip, i) => (
                      <motion.div
                        key={ip.logId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-amber-500/10"
                      >
                        <p className="text-sm font-medium">{ip.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          Clocked in via {ip.method} from unrecognized IP
                        </p>
                        {ip.ipAddress && (
                          <p className="text-xs text-amber-400/80 font-mono mt-1">{ip.ipAddress}</p>
                        )}
                        {ip.flagReason && (
                          <Badge variant="outline" className="mt-1 text-[10px] border-amber-500/20 text-amber-400">
                            {ip.flagReason.replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rule Violations */}
              {anomalies && anomalies.ruleViolations.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <ShieldAlert className="h-3 w-3 text-amber-400" />
                    Rule Violations
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {anomalies.ruleViolations.map((rv, i) => (
                      <motion.div
                        key={rv.userId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-rose-500/10"
                      >
                        <p className="text-sm font-medium">{rv.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          Late {rv.lateCount} times this week
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="outline"
                            className="text-xs h-6 gap-1 border-rose-500/20 hover:bg-rose-500/10 text-rose-400"
                            onClick={() => toast.info('Leave deduction triggered (demo)')}
                          >
                            <AlertCircle className="h-3 w-3" /> Trigger Deduction
                          </Button>
                          <Button size="sm" variant="outline"
                            className="text-xs h-6 gap-1 border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                            onClick={() => toast.success('Violation dismissed')}
                          >
                            Ignore
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════
          ADMIN SUPERPOWERS BAR
      ═══════════════════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <GlassCard className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium">Admin Superpowers</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm" variant="outline"
                className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-emerald-500/10 hover:border-emerald-500/30 text-xs"
                onClick={() => { resetManualForm(); setManualAttendanceOpen(true); }}
              >
                <ClipboardCheck className="h-3.5 w-3.5 text-emerald-400" /> Manual Attendance
              </Button>
              <Button
                size="sm" variant="outline"
                className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-amber-500/10 hover:border-amber-500/30 text-xs"
                onClick={() => setGhostModalOpen(true)}
              >
                <Ghost className="h-3.5 w-3.5 text-amber-400" /> Ghost Clock-Out
              </Button>
              <Button
                size="sm" variant="outline"
                className={cn(
                  "gap-1.5 text-xs transition-all",
                  payrollView
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-black/[0.1] dark:border-white/[0.1] hover:bg-emerald-500/10 hover:border-emerald-500/30"
                )}
                onClick={() => setPayrollView(!payrollView)}
              >
                <FileDown className="h-3.5 w-3.5" />
                {payrollView ? 'Back to Time View' : 'Payroll Export'}
              </Button>
              <Button
                size="sm" variant="outline"
                className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-cyan-500/10 hover:border-cyan-500/30 text-xs"
                onClick={() => toast.info('Shift management — use Shifts in sidebar')}
              >
                <Settings2 className="h-3.5 w-3.5 text-cyan-400" /> Shift Management
              </Button>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════
          TIER 3: UNIVERSAL ROSTER
      ═══════════════════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        {/* Search & Filters — Sticky above the GlassCard */}
        <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background/80 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.05] mb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="font-semibold">Universal Roster</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search employee..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 w-48 pl-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-cyan-500/30"
                />
              </div>
              {/* Department filter */}
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="h-8 w-36 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.filter(d => d.name).map(d => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Status filter */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 w-32 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="in-office">In Office</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="not-arrived">Not Arrived</SelectItem>
                  <SelectItem value="on-leave">On Leave</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status Summary Bar */}
          <div className="flex flex-wrap gap-3 mt-3">
            {Object.entries(statusConfig).map(([key, config]) => {
              const count = adminAttendanceData?.roster?.filter(e => e.status === key).length || 0;
              if (count === 0) return null;
              return (
                <button
                  key={key}
                  onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all",
                    filterStatus === key ? "bg-black/[0.06] dark:bg-white/[0.1] ring-1 ring-white/20" : "hover:bg-black/[0.03] dark:hover:bg-white/[0.05]",
                  )}
                >
                  <div className={cn("h-2 w-2 rounded-full", config.dot)} />
                  <span className="text-muted-foreground">{config.label}</span>
                  <span className="font-medium">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <GlassCard className="p-0 overflow-hidden">
          {/* Roster List */}
          {payrollView ? (
            /* ── Payroll Export Preview ── */
            <div className="max-h-[500px] overflow-y-auto p-4 sm:p-6">
              <div className="grid grid-cols-[1fr_100px_100px_100px_100px] gap-2 text-xs font-medium text-muted-foreground pb-2 border-b border-black/[0.06] dark:border-white/[0.05]">
                <span>Employee</span>
                <span className="text-right">Regular</span>
                <span className="text-right">Overtime</span>
                <span className="text-right">Deductions</span>
                <span className="text-right">Total Pay</span>
              </div>
              <div className="space-y-1 mt-2">
                {filteredRoster.map((entry, i) => {
                  const pd = payrollData.find(p => p.userId === entry.userId);
                  return (
                    <motion.div
                      key={entry.userId} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="grid grid-cols-[1fr_100px_100px_100px_100px] gap-2 text-sm py-2 px-3 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.05] cursor-pointer transition-colors"
                      onClick={() => openDrawer(entry)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn("h-2 w-2 rounded-full shrink-0", statusConfig[entry.status]?.dot || 'bg-slate-500')} />
                        <span className="truncate">{entry.userName}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{entry.department}</span>
                      </div>
                      <span className="text-right font-mono">${pd?.regularPay.toFixed(2) || '0.00'}</span>
                      <span className="text-right font-mono text-amber-400">${pd?.overtimePay.toFixed(2) || '0.00'}</span>
                      <span className="text-right font-mono text-rose-400">$0.00</span>
                      <span className="text-right font-mono font-medium text-emerald-400">${pd?.totalPay.toFixed(2) || '0.00'}</span>
                    </motion.div>
                  );
                })}
              </div>
              {/* Totals row */}
              <div className="grid grid-cols-[1fr_100px_100px_100px_100px] gap-2 text-sm font-medium py-2 px-3 mt-2 border-t border-black/[0.1] dark:border-white/[0.1]">
                <span>TOTAL</span>
                <span className="text-right font-mono">${payrollData.reduce((s, p) => s + p.regularPay, 0).toFixed(2)}</span>
                <span className="text-right font-mono text-amber-400">${payrollData.reduce((s, p) => s + p.overtimePay, 0).toFixed(2)}</span>
                <span className="text-right font-mono text-rose-400">$0.00</span>
                <span className="text-right font-mono text-emerald-400">${payrollData.reduce((s, p) => s + p.totalPay, 0).toFixed(2)}</span>
              </div>
            </div>
          ) : (
            /* ── Table View with Column Headings ── */
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-black/[0.1] dark:border-white/[0.1] hover:bg-transparent">
                    <TableHead className="text-muted-foreground text-xs">Employee</TableHead>
                    <TableHead className="text-muted-foreground text-xs">Clock In</TableHead>
                    <TableHead className="text-muted-foreground text-xs">Clock Out</TableHead>
                    <TableHead className="text-muted-foreground text-xs">Hours</TableHead>
                    <TableHead className="text-muted-foreground text-xs">Status</TableHead>
                    <TableHead className="text-muted-foreground text-xs hidden md:table-cell">Mode</TableHead>
                    <TableHead className="text-muted-foreground text-xs hidden lg:table-cell">Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoster.map((entry) => {
                    const config = statusConfig[entry.status] || statusConfig['not-arrived'];
                    return (
                      <TableRow
                        key={entry.userId}
                        onClick={() => openDrawer(entry)}
                        className={cn(
                          "cursor-pointer border-black/[0.06] dark:border-white/[0.05] group",
                          entry.isFlagged && "bg-amber-500/[0.02]",
                          selectedEmployee?.userId === entry.userId && "bg-black/[0.03] dark:bg-white/[0.05]",
                        )}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative shrink-0">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center text-xs font-medium border border-black/[0.1] dark:border-white/[0.1]">
                                {entry.userName?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background", config.dot)} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate group-hover:text-cyan-400 transition-colors">
                                {entry.userName}
                                {entry.isEdited && <Edit3 className="h-3 w-3 text-amber-400 inline ml-1" />}
                              </p>
                              <span className="text-[10px] text-muted-foreground">{entry.department}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {entry.firstIn ? entry.firstIn.substring(0, 5) : '—'}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {entry.lastOut ? entry.lastOut.substring(0, 5) : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {entry.totalHours ? `${entry.totalHours}h` : '—'}
                          {entry.overtimeHours ? <span className="text-amber-400 ml-1">+{entry.overtimeHours}h</span> : ''}
                        </TableCell>
                        <TableCell>
                          <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs", config.bg, config.text)}>
                            <div className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
                            <span>{config.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {entry.workMode === 'remote' ? (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-cyan-500/20 text-cyan-400">Remote</Badge>
                          ) : entry.workMode === 'hybrid' ? (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-amber-500/20 text-amber-400">Hybrid</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Office</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Sparkline data={entry.sparklineData} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredRoster.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No employees match your filters
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════
          DEEP DIVE DRAWER — Employee Slide-Out Panel
      ═══════════════════════════════════════════════════════ */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg border-l border-black/[0.1] dark:border-white/[0.1]">
          {selectedEmployee && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center text-lg font-medium border border-black/[0.1] dark:border-white/[0.1]">
                    {selectedEmployee.userName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <SheetTitle className="text-lg">{selectedEmployee.userName}</SheetTitle>
                    <SheetDescription className="text-xs">
                      {selectedEmployee.department} • {selectedEmployee.workMode.charAt(0).toUpperCase() + selectedEmployee.workMode.slice(1)}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <Separator className="bg-black/[0.03] dark:bg-white/[0.05] mb-4" />

              {/* Today's Status */}
              <div className="space-y-3 mb-6">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Today&apos;s Status</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.05] text-center">
                    <p className="text-xs text-muted-foreground">First In</p>
                    <p className="text-sm font-mono font-medium">{selectedEmployee.firstIn?.substring(0, 5) || '—'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.05] text-center">
                    <p className="text-xs text-muted-foreground">Last Out</p>
                    <p className="text-sm font-mono font-medium">{selectedEmployee.lastOut?.substring(0, 5) || '—'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.05] text-center">
                    <p className="text-xs text-muted-foreground">Total Hrs</p>
                    <p className="text-sm font-mono font-medium">
                      {selectedEmployee.totalHours != null ? `${selectedEmployee.totalHours.toFixed(1)}h` : '—'}
                    </p>
                  </div>
                </div>
                {selectedEmployee.overtimeHours != null && selectedEmployee.overtimeHours > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <Timer className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs text-amber-400">{selectedEmployee.overtimeHours.toFixed(1)}h overtime</span>
                  </div>
                )}
                {selectedEmployee.isEdited && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <Edit3 className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs text-amber-400">Edited by {selectedEmployee.editedBy || 'admin'}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className={cn("h-2.5 w-2.5 rounded-full", statusConfig[selectedEmployee.status]?.dot || 'bg-slate-500')} />
                  <span className={cn("text-sm font-medium", statusConfig[selectedEmployee.status]?.text || 'text-slate-400')}>
                    {statusConfig[selectedEmployee.status]?.label || selectedEmployee.status}
                  </span>
                </div>
              </div>

              <Separator className="bg-black/[0.03] dark:bg-white/[0.05] mb-4" />

              {/* Monthly Calendar */}
              <div className="mb-6">
                <MonthlyAttendanceCalendar records={employeeYearData} />
              </div>

              <Separator className="bg-black/[0.03] dark:bg-white/[0.05] mb-4" />

              {/* Raw Punch Log (Today) */}
              <div className="space-y-3 mb-6">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Raw Punch Log</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedEmployee.punchLogs.length > 0 ? (
                    selectedEmployee.punchLogs.map((log, i) => {
                      const time = (() => {
                        try { return format(parseISO(log.punchTime), 'hh:mm a'); } catch { return log.punchTime; }
                      })();
                      const methodIcon = log.method === 'FACE' ? Fingerprint : log.method === 'PIN' ? Shield : log.method === 'WEB' ? MonitorSmartphone : Edit3;
                      const MethodIcon = methodIcon;
                      return (
                        <motion.div
                          key={log.id} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-start gap-3 p-2.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.05]"
                        >
                          <div className="mt-0.5">
                            <div className={cn(
                              "h-7 w-7 rounded-full flex items-center justify-center",
                              log.punchType === 'CLOCK_IN' ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                            )}>
                              <MethodIcon className={cn(
                                "h-3.5 w-3.5",
                                log.punchType === 'CLOCK_IN' ? 'text-emerald-400' : 'text-rose-400'
                              )} />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium font-mono">{time}</span>
                              <Badge variant="outline" className={cn(
                                "text-[10px] h-4 px-1",
                                log.punchType === 'CLOCK_IN'
                                  ? "border-emerald-500/20 text-emerald-400"
                                  : "border-rose-500/20 text-rose-400"
                              )}>
                                {log.punchType === 'CLOCK_IN' ? 'In' : 'Out'}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] h-4 px-1 border-black/[0.1] dark:border-white/[0.1]">
                                {log.method}
                              </Badge>
                            </div>
                            {log.confidence && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Confidence: {Math.round(log.confidence * 100)}%
                              </p>
                            )}
                            {log.ipAddress && (
                              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                IP: {log.ipAddress}
                              </p>
                            )}
                            {log.isFlagged && (
                              <div className="flex items-center gap-1 mt-1">
                                <AlertTriangle className="h-3 w-3 text-amber-400" />
                                <span className="text-xs text-amber-400">{log.flagReason?.replace(/_/g, ' ') || 'Flagged'}</span>
                              </div>
                            )}
                            {log.editedBy && (
                              <p className="text-xs text-amber-400/80 mt-0.5">Manual entry by admin</p>
                            )}
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">No punch logs for today</p>
                  )}
                </div>
              </div>

              <Separator className="bg-black/[0.03] dark:bg-white/[0.05] mb-4" />

              {/* Manager Override History */}
              <div className="space-y-3 mb-6">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Override History</h4>
                <div className="space-y-2">
                  {employeeYearData.filter(r => r.isEdited).length > 0 ? (
                    employeeYearData.filter(r => r.isEdited).slice(0, 5).map((record, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.05]">
                        <Edit3 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium">{record.date}</p>
                          <p className="text-xs text-muted-foreground">
                            Edited by {record.editedBy || 'admin'}
                            {record.note && ` — ${record.note}`}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">No overrides recorded</p>
                  )}
                </div>
              </div>

              {/* Admin Actions at bottom */}
              <div className="space-y-2 pt-4 border-t border-black/[0.06] dark:border-white/[0.05]">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Admin Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm" variant="outline"
                    className="gap-1.5 text-xs border-black/[0.1] dark:border-white/[0.1] hover:bg-cyan-500/10 hover:border-cyan-500/30"
                    onClick={async () => {
                      if (!selectedEmployee.attendanceId) {
                        toast.error('No attendance record to edit');
                        return;
                      }
                      try {
                        await adminOverrideAttendance(selectedEmployee.attendanceId, {
                          note: 'Admin review — confirmed correct',
                        });
                        toast.success('Marked as reviewed');
                      } catch {
                        toast.error('Failed to update');
                      }
                    }}
                  >
                    <Check className="h-3.5 w-3.5" /> Mark Reviewed
                  </Button>
                  {(!selectedEmployee.lastOut && selectedEmployee.firstIn) && (
                    <Button
                      size="sm" variant="outline"
                      className="gap-1.5 text-xs border-amber-500/20 hover:bg-amber-500/10 text-amber-400"
                      onClick={async () => {
                        try {
                          await resolveMissedPunch(
                            selectedEmployee.userId, 'CLOCK_OUT', '17:00',
                            adminAttendanceData?.date || ''
                          );
                          toast.success('Clock-out resolved');
                        } catch {
                          toast.error('Failed to resolve');
                        }
                      }}
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Add Clock-Out (5PM)
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ═══════════════════════════════════════════════════════
          RESOLVE MISSED PUNCH MODAL
      ═══════════════════════════════════════════════════════ */}
      <Dialog open={!!resolveModal} onOpenChange={(open) => !open && setResolveModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-400" />
              Resolve Missed Punch
            </DialogTitle>
            <DialogDescription>
              {resolveModal && `${resolveModal.userName} clocked in at ${resolveModal.firstIn?.substring(0, 5)} but never clocked out.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Clock-Out Time</label>
              <Input
                type="time"
                value={resolveTime}
                onChange={(e) => setResolveTime(e.target.value)}
                className="mt-1 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"
              />
            </div>
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-400/80">
                  This action will insert a manual CLOCK_OUT record and recalculate the daily attendance. The edit will be logged with your admin ID.
                </p>
              </div>
            </div>
          </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveModal(null)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleResolve} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
              <Check className="h-4 w-4" /> Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════
          MANUAL ATTENDANCE DIALOG
      ═══════════════════════════════════════════════════════ */}
      <Dialog open={manualAttendanceOpen} onOpenChange={(open) => { setManualAttendanceOpen(open); if (!open) resetManualForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-emerald-400" />
              Manual Attendance
            </DialogTitle>
            <DialogDescription>
              Mark attendance manually when face recognition is unavailable.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">

          {/* Warning banner */}
          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400/80">
                Manual attendance overrides system records. Use when face recognition is unavailable.
              </p>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={manualMode === 'single' ? 'default' : 'outline'}
              className={cn(
                "text-xs gap-1.5",
                manualMode === 'single'
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
              )}
              onClick={() => setManualMode('single')}
            >
              <UserCheck className="h-3.5 w-3.5" /> Single Employee
            </Button>
            <Button
              size="sm"
              variant={manualMode === 'bulk' ? 'default' : 'outline'}
              className={cn(
                "text-xs gap-1.5",
                manualMode === 'bulk'
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
              )}
              onClick={() => setManualMode('bulk')}
            >
              <Users className="h-3.5 w-3.5" /> Bulk Mode
            </Button>
          </div>

          <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />

          {/* Single Employee Mode */}
          {manualMode === 'single' && (
            <div className="space-y-4">
              {/* Employee selector */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Select Employee</label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={manualSearchQuery}
                    onChange={(e) => setManualSearchQuery(e.target.value)}
                    className="pl-8 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs"
                  />
                </div>
                <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-black/[0.06] dark:border-white/[0.05]">
                  {(manualSearchQuery ? manualAttendanceEmployees : adminAttendanceData?.roster || []).slice(0, 20).map((entry) => (
                    <button
                      key={entry.userId}
                      onClick={() => { setManualUserId(entry.userId); setManualSearchQuery(''); }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors text-left",
                        manualUserId === entry.userId && "bg-emerald-500/10 text-emerald-400"
                      )}
                    >
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center text-[10px] font-medium border border-black/[0.1] dark:border-white/[0.1] shrink-0">
                        {entry.userName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{entry.userName}</p>
                        <p className="text-muted-foreground truncate">{entry.department}</p>
                      </div>
                      {manualUserId === entry.userId && <Check className="h-3.5 w-3.5 text-emerald-400 ml-auto shrink-0" />}
                    </button>
                  ))}
                  {manualUserId && (
                    <div className="px-3 py-2 bg-emerald-500/5 border-t border-emerald-500/10">
                      <p className="text-xs text-emerald-400 font-medium">
                        Selected: {adminAttendanceData?.roster?.find(e => e.userId === manualUserId)?.userName || 'Unknown'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Bulk Mode */}
          {manualMode === 'bulk' && (
            <div className="space-y-3">
              {/* Department filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Filter by Department</label>
                <Select value={bulkDeptFilter} onValueChange={setBulkDeptFilter}>
                  <SelectTrigger className="mt-1 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs h-8">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.filter(d => d.name).map(d => (
                      <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Select All */}
              <div className="flex items-center justify-between">
                <Button
                  size="sm" variant="outline"
                  className="text-xs h-7 gap-1 border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                  onClick={selectAllBulk}
                >
                  {bulkFilteredEmployees.length > 0 && bulkFilteredEmployees.every(e => selectedBulkUsers.includes(e.userId))
                    ? <><X className="h-3 w-3" /> Deselect All</>
                    : <><Check className="h-3 w-3" /> Select All</>
                  }
                </Button>
                <Badge variant="outline" className="text-[10px] border-black/[0.1] dark:border-white/[0.1]">
                  {selectedBulkUsers.length} selected
                </Badge>
              </div>

              {/* Employee checkboxes */}
              <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-black/[0.06] dark:border-white/[0.05] p-2">
                {bulkFilteredEmployees.map((entry) => (
                  <label
                    key={entry.userId}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs transition-colors",
                      selectedBulkUsers.includes(entry.userId) ? "bg-emerald-500/10" : "hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedBulkUsers.includes(entry.userId)}
                      onChange={() => toggleBulkUser(entry.userId)}
                      className="rounded border-black/[0.12] dark:border-white/[0.2] bg-black/[0.03] dark:bg-white/[0.05] accent-emerald-500"
                    />
                    <div className="h-5 w-5 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center text-[9px] font-medium border border-black/[0.1] dark:border-white/[0.1] shrink-0">
                      {entry.userName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <span className="truncate">{entry.userName}</span>
                    <span className="text-muted-foreground ml-auto shrink-0">{entry.department}</span>
                  </label>
                ))}
                {bulkFilteredEmployees.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">No employees in this department</p>
                )}
              </div>
            </div>
          )}

          <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />

          {/* Common fields: Status, Clock-in, Clock-out, Note */}
          <div className="space-y-3">
            {/* Status selector */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Attendance Status</label>
              <Select value={manualStatus} onValueChange={setManualStatus}>
                <SelectTrigger className="mt-1 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs h-8">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRESENT">✅ Present</SelectItem>
                  <SelectItem value="ABSENT">❌ Absent</SelectItem>
                  <SelectItem value="LATE">⏰ Late</SelectItem>
                  <SelectItem value="HALF_DAY">🕐 Half-Day</SelectItem>
                  <SelectItem value="ON_LEAVE">🏖️ On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clock-in / Clock-out */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Clock-In Time</label>
                <Input
                  type="time"
                  value={manualClockIn}
                  onChange={(e) => setManualClockIn(e.target.value)}
                  className="mt-1 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs h-8"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Clock-Out Time</label>
                <Input
                  type="time"
                  value={manualClockOut}
                  onChange={(e) => setManualClockOut(e.target.value)}
                  className="mt-1 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs h-8"
                />
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Note / Reason</label>
              <textarea
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                placeholder="Reason for manual marking..."
                rows={2}
                className="mt-1 w-full rounded-md bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1] text-xs px-3 py-2 placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/30 resize-none"
              />
            </div>
          </div>

          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setManualAttendanceOpen(false)} className="border-black/[0.1] dark:border-white/[0.1] text-xs">
              Cancel
            </Button>
            <Button
              onClick={manualMode === 'single' ? handleManualAttendance : handleBulkManualAttendance}
              disabled={manualSubmitting || (manualMode === 'single' ? !manualUserId : selectedBulkUsers.length === 0)}
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 text-xs"
            >
              {manualSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ClipboardCheck className="h-4 w-4" />
              )}
              {manualMode === 'single' ? 'Mark Attendance' : `Apply to ${selectedBulkUsers.length} Selected`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════
          GHOST CLOCK-OUT MODAL
      ═══════════════════════════════════════════════════════ */}
      <Dialog open={ghostModalOpen} onOpenChange={setGhostModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ghost className="h-5 w-5 text-amber-400" />
              Ghost Clock-Out
            </DialogTitle>
            <DialogDescription>
              Auto-resolve all open punches for employees who forgot to clock out.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Default Clock-Out Time</label>
              <Input
                type="time"
                value={ghostTime}
                onChange={(e) => setGhostTime(e.target.value)}
                className="mt-1 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"
              />
            </div>
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-400/80">
                  <p className="font-medium">This will affect all employees with open punches today.</p>
                  <p className="mt-1">
                    Currently {anomalies?.missedPunches?.length || 0} employee{(anomalies?.missedPunches?.length || 0) !== 1 ? 's' : ''} will be clocked out at {ghostTime}.
                  </p>
                  <p className="mt-1">Each edit will be logged with your admin ID.</p>
                </div>
              </div>
            </div>
          </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGhostModalOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleGhostClockOut} className="bg-amber-600 hover:bg-amber-700 gap-1.5">
              <Ghost className="h-4 w-4" /> Execute Ghost Clock-Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
