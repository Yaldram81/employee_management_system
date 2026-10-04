'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { StatCard } from './stat-card';
import { StatusBadge } from './status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import type { Leave, CompanyHoliday } from '@/lib/types';
import {
  CalendarDays, Plus,
  CheckCircle2, XCircle, Clock, AlertCircle, ChevronLeft, ChevronRight,
  ChevronDown, Send, Loader2, Calendar, TrendingUp, TrendingDown, Zap, Phone,
  Users, Star, FileText, Upload, Shield, ArrowRight, RotateCcw, Sun, Moon,
  Handover, Eye, Search, Filter, ArrowUpDown, BookOpen, Flag, Info,
  Plane, Stethoscope, Coffee, BabyIcon, UserMinus, Sparkles,
  AlertTriangle, Map, LayoutList,
} from 'lucide-react';
import {
  timeAgo, formatDate, daysBetween, workingDaysBetween, daysUntil,
  daysUntilYearEnd, getGreeting, stagger, fadeIn,
  ProgressRing, leaveTypeConfig,
  TeamAvailabilityHeatMap,
  LeavePlanner,
  PageSkeleton,
} from './shared';
import type { LeaveTypeConfig, HeatmapDay } from './shared';

/* ═══════════════════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════════════════ */

// leaveTypeConfig and LeaveTypeConfig imported from ./shared

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */

// timeAgo, formatDate, daysBetween, workingDaysBetween, daysUntil,
// daysUntilYearEnd, getGreeting, stagger, fadeIn imported from ./shared

/* ═══════════════════════════════════════════════════════
   PROGRESS RING
   ═══════════════════════════════════════════════════════ */

// ProgressRing imported from ./shared

/* ═══════════════════════════════════════════════════════
   MINI CALENDAR (ENHANCED)
   ═══════════════════════════════════════════════════════ */

function MiniCalendar({ leaves, holidays, onDateClick }: {
  leaves: Leave[];
  holidays: CompanyHoliday[];
  onDateClick: (d: string) => void;
}) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const startDay = (new Date(month.y, month.m, 1).getDay() + 6) % 7;

  const leaveMap = useMemo(() => {
    const m: Record<string, Leave[]> = {};
    leaves.forEach(l => {
      const s = new Date(l.startDate);
      const e = new Date(l.endDate);
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        if (d.getMonth() === month.m && d.getFullYear() === month.y) {
          const key = d.getDate().toString();
          (m[key] ??= []).push(l);
        }
      }
    });
    return m;
  }, [leaves, month]);

  const holidayMap = useMemo(() => {
    const m: Record<string, CompanyHoliday> = {};
    holidays.forEach(h => {
      const d = new Date(h.date);
      if (d.getMonth() === month.m && d.getFullYear() === month.y) {
        m[d.getDate().toString()] = h;
      }
    });
    return m;
  }, [holidays, month]);

  const prev = () => setMonth(p => p.m === 0 ? { y: p.y - 1, m: 11 } : { y: p.y, m: p.m - 1 });
  const next = () => setMonth(p => p.m === 11 ? { y: p.y + 1, m: 0 } : { y: p.y, m: p.m + 1 });
  const monthName = new Date(month.y, month.m).toLocaleString('default', { month: 'long', year: 'numeric' });

  const statusDot: Record<string, string> = {
    approved: 'bg-emerald-400',
    pending: 'bg-amber-400',
    rejected: 'bg-rose-400',
  };

  return (
    <div className="space-y-2 max-w-[320px] sm:max-w-none">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold">{monthName}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={next}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
          <div key={d} className="text-[10px] text-muted-foreground font-medium py-1">{d}</div>
        ))}
        {Array.from({ length: startDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dayLeaves = leaveMap[day.toString()] || [];
          const dayHoliday = holidayMap[day.toString()];
          const today = new Date();
          const isToday = day === today.getDate() && month.m === today.getMonth() && month.y === today.getFullYear();
          return (
            <button
              key={day}
              onClick={() => onDateClick(`${month.y}-${String(month.m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)}
              className={`calendar-touch-target relative h-10 w-10 sm:h-9 sm:w-9 rounded-md text-xs flex flex-col items-center justify-center gap-0.5 transition-colors hover:bg-black/[0.06] dark:hover:bg-white/[0.1]
                ${isToday ? 'bg-emerald-500/20 text-emerald-400 font-bold ring-1 ring-emerald-500/40' : 'text-foreground/80'}
                ${dayHoliday ? 'bg-amber-500/10' : ''}`}
            >
              {day}
              {dayHoliday && <Star className="absolute top-0.5 right-0.5 h-2 w-2 text-amber-400" />}
              {dayLeaves.length > 0 && (
                <div className="flex gap-0.5">
                  {dayLeaves.slice(0, 3).map((l, j) => (
                    <span key={j} className={`w-1.5 h-1.5 rounded-full ${statusDot[l.status] || 'bg-slate-400'}`} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-3 pt-1 text-[10px] text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Approved</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Pending</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400" /> Rejected</span>
        <span className="flex items-center gap-1"><Star className="h-2 w-2 text-amber-400" /> Holiday</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */

export function EmployeeLeavePortal() {
  const { user, leaves, leaveBalance, applyLeave, approveLeave, users, departments } = useEMSStore();

  // ─── Loading state ──────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (user) setLoading(false);
  }, [user]);


  // Local state for policies & holidays (fetched from employee-accessible endpoints)
  const [policies, setPolicies] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(false);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelLeaveId, setCancelLeaveId] = useState<string | null>(null);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawLeaveId, setWithdrawLeaveId] = useState<string | null>(null);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showPolicies, setShowPolicies] = useState(false);
  const [showHolidayCal, setShowHolidayCal] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showPlanner, setShowPlanner] = useState(false);
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [conflictAnalysis, setConflictAnalysis] = useState<{
    coverageRisk: string;
    riskScore: number;
    overlapCount: number;
    teamSize: number;
    warningMessage: string;
    alternatives: Array<{ startDate: string; endDate: string; coverageRisk: string; riskScore: number; label: string; reason: string }>;
  } | null>(null);
  const [conflictLoading, setConflictLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'date' | 'status' | 'type'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [form, setForm] = useState({
    type: 'vacation' as Leave['type'],
    startDate: '',
    endDate: '',
    reason: '',
    priority: 'normal' as 'normal' | 'urgent',
    contactDuringLeave: false,
    contactInfo: '',
    halfDay: false,
    halfDayPeriod: 'am' as 'am' | 'pm',
    delegate: '',
  });

  // Employee sees only their own leaves
  const myLeaves = useMemo(
    () => leaves.filter(l => l.userId === user?.id),
    [leaves, user?.id]
  );

  // Fetch policies & holidays from employee-accessible endpoints
  useEffect(() => {
    if (policiesLoading) return;
    setPoliciesLoading(true);
    Promise.all([
      fetch('/api/leave-policies', { headers: { Authorization: `Bearer ${useEMSStore.getState().authToken || ''}` } })
        .then(r => r.ok ? r.json() : { data: [] })
        .then(j => j.data || [])
        .catch(() => []),
      fetch('/api/company-holidays', { headers: { Authorization: `Bearer ${useEMSStore.getState().authToken || ''}` } })
        .then(r => r.ok ? r.json() : { data: [] })
        .then(j => j.data || [])
        .catch(() => []),
    ]).then(([p, h]) => {
      setPolicies(p);
      setHolidays(h);
      setPoliciesLoading(false);
    });
  }, []);

  // Stats
  const stats = useMemo(() => {
    const approved = myLeaves.filter(l => l.status === 'approved');
    const totalDaysUsed = approved.reduce((s, l) => s + daysBetween(l.startDate, l.endDate), 0);
    const totalBalance = leaveBalance
      ? (leaveBalance.sick?.total || 0) + (leaveBalance.casual?.total || 0) + (leaveBalance.vacation?.total || 0)
      : 0;
    const totalRemaining = leaveBalance
      ? (leaveBalance.sick?.remaining || 0) + (leaveBalance.casual?.remaining || 0) + (leaveBalance.vacation?.remaining || 0)
      : 0;
    const pendingCount = myLeaves.filter(l => l.status === 'pending').length;
    const thisMonth = new Date().toISOString().slice(0, 7);
    const thisMonthUsed = approved
      .filter(l => l.startDate.startsWith(thisMonth))
      .reduce((s, l) => s + daysBetween(l.startDate, l.endDate), 0);
    // Year-end projection: at current rate, how many days left by year end
    const monthsElapsed = new Date().getMonth() + 1;
    const monthlyRate = monthsElapsed > 0 ? totalDaysUsed / monthsElapsed : 0;
    const projectedYearEndUsed = Math.round(monthlyRate * 12);
    const projectedRemaining = Math.max(0, totalBalance - projectedYearEndUsed);
    return { totalBalance, totalDaysUsed, pendingCount, totalRemaining, thisMonthUsed, projectedRemaining };
  }, [myLeaves, leaveBalance]);

  // Upcoming approved leaves
  const upcomingLeaves = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return myLeaves
      .filter(l => (l.status === 'approved' || l.status === 'pending') && l.endDate >= today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 5);
  }, [myLeaves]);

  // Team availability
  const teamAvailability = useMemo(() => {
    if (!user?.departmentId) return { away: [], total: 0, available: 0 };
    const today = new Date().toISOString().split('T')[0];
    const deptUsers = users.filter(u => u.departmentId === user.departmentId && u.isActive !== false);
    const awayOnLeave = deptUsers.filter(u => {
      return leaves.some(l =>
        l.userId === u.id &&
        l.status === 'approved' &&
        l.startDate <= today &&
        l.endDate >= today
      );
    });
    return {
      away: awayOnLeave.map(u => {
        const currentLeave = leaves.find(l =>
          l.userId === u.id && l.status === 'approved' && l.startDate <= today && l.endDate >= today
        );
        return {
          id: u.id,
          name: u.name,
          type: currentLeave?.type || 'unknown',
          returnDate: currentLeave?.endDate || '',
        };
      }),
      total: deptUsers.length,
      available: deptUsers.length - awayOnLeave.length,
    };
  }, [users, leaves, user?.departmentId]);

  // Filtered, searched, and sorted history
  const filteredLeaves = useMemo(() => {
    let result = activeTab === 'all' ? myLeaves : myLeaves.filter(l => l.status === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l => {
        const cfg = leaveTypeConfig[l.type];
        return (cfg?.label || l.type).toLowerCase().includes(q)
          || l.startDate.includes(q)
          || l.endDate.includes(q)
          || l.reason.toLowerCase().includes(q);
      });
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = a.startDate.localeCompare(b.startDate);
      else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortField === 'type') cmp = a.type.localeCompare(b.type);
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return result;
  }, [myLeaves, activeTab, searchQuery, sortField, sortDir]);

  // Balance cards data
  const balanceCards = useMemo(() => {
    if (!leaveBalance) return [];
    return [
      { key: 'vacation', ...leaveBalance.vacation },
      { key: 'sick', ...leaveBalance.sick },
      { key: 'casual', ...leaveBalance.casual },
      { key: 'maternity', ...(leaveBalance.maternity || { total: 0, used: 0, remaining: 0 }) },
    ].filter(b => b.total > 0);
  }, [leaveBalance]);

  // Team overlap check for apply dialog
  const teamOverlap = useMemo(() => {
    if (!form.startDate || !form.endDate || !user?.departmentId) return [];
    const deptUsers = users.filter(u => u.departmentId === user.departmentId && u.id !== user.id);
    return deptUsers.filter(u => {
      return leaves.some(l =>
        l.userId === u.id &&
        l.status === 'approved' &&
        l.startDate <= form.endDate &&
        l.endDate >= form.startDate
      );
    }).map(u => u.name);
  }, [form.startDate, form.endDate, users, leaves, user?.departmentId, user?.id]);

  // Coverage risk calculation (client-side, used for instant badge in apply dialog)
  const coverageRisk = useMemo(() => {
    if (!form.startDate || !form.endDate || !user?.departmentId) return null;
    const deptUsers = users.filter(u => u.departmentId === user.departmentId && u.isActive !== false);
    const teamSize = deptUsers.length;
    if (teamSize === 0) return null;
    const overlapCount = teamOverlap.length;
    // +1 for the applicant themselves being away
    const totalAway = overlapCount + 1;
    const availableRatio = (teamSize - totalAway) / teamSize;
    if (availableRatio >= 0.7) return { risk: 'low' as const, score: Math.round((1 - availableRatio) * 100) / 100 };
    if (availableRatio >= 0.5) return { risk: 'medium' as const, score: Math.round((1 - availableRatio) * 100) / 100 };
    if (availableRatio >= 0.3) return { risk: 'high' as const, score: Math.round((1 - availableRatio) * 100) / 100 };
    return { risk: 'critical' as const, score: Math.round((1 - availableRatio) * 100) / 100 };
  }, [form.startDate, form.endDate, user?.departmentId, users, teamOverlap]);

  // Fetch conflict analysis + alternatives when dates change
  useEffect(() => {
    if (!form.startDate || !form.endDate || !user?.id) {
      setConflictAnalysis(null);
      return;
    }
    let cancelled = false;
    setConflictLoading(true);
    Promise.all([
      fetch('/api/leave-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check-conflict',
          userId: user.id,
          startDate: form.startDate,
          endDate: form.endDate,
        }),
      }).then(r => r.json()).catch(() => null),
      fetch('/api/leave-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest-alternatives',
          userId: user.id,
          startDate: form.startDate,
          endDate: form.endDate,
        }),
      }).then(r => r.json()).catch(() => null),
    ]).then(([conflictData, altData]) => {
      if (cancelled) return;
      const conflict = conflictData?.data;
      const alternatives = altData?.data?.alternatives || [];
      if (conflict) {
        setConflictAnalysis({
          coverageRisk: conflict.coverageRisk || 'low',
          riskScore: conflict.riskScore || 0,
          overlapCount: conflict.overlapCount || 0,
          teamSize: conflict.teamSize || 0,
          warningMessage: conflict.warningMessage || '',
          alternatives,
        });
      }
      setConflictLoading(false);
    }).catch(() => {
      if (!cancelled) setConflictLoading(false);
    });
    return () => { cancelled = true; };
  }, [form.startDate, form.endDate, user?.id]);

  // Fetch heatmap data when heatmap section is shown
  useEffect(() => {
    if (!showHeatmap || !user?.id) return;
    const now = new Date();
    let cancelled = false;
    setHeatmapLoading(true);
    fetch('/api/leave-conflict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'team-heatmap',
        userId: user.id,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data.data?.days) {
          setHeatmapData(data.data.days);
        }
      })
      .catch(() => {}) // Silent fail
      .finally(() => { if (!cancelled) setHeatmapLoading(false); });
    return () => { cancelled = true; };
  }, [showHeatmap, user?.id]);

  // Form duration calculation
  const formDuration = useMemo(() => {
    if (!form.startDate || !form.endDate) return 0;
    if (form.startDate > form.endDate) return 0;
    return form.halfDay ? 0.5 : workingDaysBetween(form.startDate, form.endDate);
  }, [form.startDate, form.endDate, form.halfDay]);

  // Balance check for selected type
  const balanceForType = useMemo(() => {
    if (!leaveBalance || !form.type) return null;
    return leaveBalance[form.type] || null;
  }, [leaveBalance, form.type]);

  // Submit handler
  const handleSubmit = async () => {
    if (!form.startDate || !form.endDate) { toast.error('Please select start and end dates'); return; }
    if (!form.reason.trim()) { toast.error('Please provide a reason'); return; }
    if (form.startDate > form.endDate) { toast.error('End date must be after start date'); return; }
    setSubmitting(true);
    try {
      await applyLeave({
        userId: user!.id,
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason.trim(),
      });
      toast.success('Leave application submitted successfully');
      setDialogOpen(false);
      setPreviewMode(false);
      setForm({
        type: 'vacation', startDate: '', endDate: '', reason: '', priority: 'normal',
        contactDuringLeave: false, contactInfo: '', halfDay: false, halfDayPeriod: 'am', delegate: '',
      });
    } catch {
      toast.error('Failed to apply for leave');
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel pending leave
  const handleCancel = async () => {
    if (!cancelLeaveId) return;
    try {
      await approveLeave(cancelLeaveId, 'rejected', 'Cancelled by employee');
      toast.success('Leave cancelled successfully');
      setCancelDialogOpen(false);
      setCancelLeaveId(null);
    } catch {
      toast.error('Failed to cancel leave');
    }
  };

  // Withdraw approved leave
  const handleWithdraw = async () => {
    if (!withdrawLeaveId) return;
    if (!withdrawReason.trim()) { toast.error('Please provide a reason for withdrawal'); return; }
    try {
      await approveLeave(withdrawLeaveId, 'rejected', `Withdrawal requested: ${withdrawReason}`);
      toast.success('Withdrawal request submitted');
      setWithdrawDialogOpen(false);
      setWithdrawLeaveId(null);
      setWithdrawReason('');
    } catch {
      toast.error('Failed to request withdrawal');
    }
  };

  // Quick apply from calendar click
  const openQuickApply = useCallback((date: string) => {
    setForm(f => ({ ...f, startDate: date, endDate: date }));
    setPreviewMode(false);
    setDialogOpen(true);
  }, []);

  // Re-apply from rejected leave
  const handleReapply = (leave: Leave) => {
    setForm({
      type: leave.type,
      startDate: leave.startDate,
      endDate: leave.endDate,
      reason: leave.reason,
      priority: 'normal',
      contactDuringLeave: false,
      contactInfo: '',
      halfDay: false,
      halfDayPeriod: 'am',
      delegate: '',
    });
    setPreviewMode(false);
    setDialogOpen(true);
  };

  const firstName = user?.name?.split(' ')[0] || 'there';
  const defaultForm = {
    type: 'vacation' as Leave['type'], startDate: '', endDate: '', reason: '', priority: 'normal' as const,
    contactDuringLeave: false, contactInfo: '', halfDay: false, halfDayPeriod: 'am' as const, delegate: '',
  };

  // Upcoming holidays sorted by date
  const upcomingHolidays = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return holidays
      .filter(h => h.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6);
  }, [holidays]);

  if (loading) return <div className="p-4"><PageSkeleton /></div>;

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════
          HEADER SECTION (ENHANCED)
      ═══════════════════════════════════════════ */}
      <motion.div {...fadeIn} transition={{ duration: 0.4 }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Leave Management Center
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {getGreeting()}, {firstName}! You have{' '}
              <span className="inline-flex items-center gap-1 text-cyan-400 font-medium">
                <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-[10px] px-1.5">
                  {stats.totalRemaining}
                </Badge>
                days remaining
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => { setForm(defaultForm); setPreviewMode(false); setDialogOpen(true); }}
              className="gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20 shrink-0"
            >
              <Plus className="h-4 w-4" /> Apply Leave
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] text-muted-foreground hover:text-foreground hover:border-black/[0.12] dark:hover:border-white/[0.2]"
              onClick={() => setShowPolicies(!showPolicies)}
            >
              <BookOpen className="h-3.5 w-3.5" /> Policies
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] text-muted-foreground hover:text-foreground hover:border-black/[0.12] dark:hover:border-white/[0.2]"
              onClick={() => setShowHolidayCal(!showHolidayCal)}
            >
              <Star className="h-3.5 w-3.5" /> Holidays
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:border-black/[0.12] dark:hover:border-white/[0.2] ${showHeatmap ? 'text-cyan-400 border-cyan-500/30' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setShowHeatmap(!showHeatmap)}
            >
              <Map className="h-3.5 w-3.5" /> Heat Map
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:border-black/[0.12] dark:hover:border-white/[0.2] ${showPlanner ? 'text-emerald-400 border-emerald-500/30' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setShowPlanner(!showPlanner)}
            >
              <LayoutList className="h-3.5 w-3.5" /> Planner
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════
          HERO STATS CARDS (4 ENHANCED)
      ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <motion.div {...fadeIn} transition={{ delay: 0 }}>
          <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[130px]" hover glow="emerald">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-emerald-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Balance</p>
                <p className="text-2xl font-bold text-emerald-400">{stats.totalBalance}</p>
                <p className="text-[10px] text-emerald-400/80">Days allocated this year</p>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                <ProgressRing value={stats.totalBalance} max={Math.max(stats.totalBalance, 1)} size={48} color="#10b981" />
                <span className="absolute text-[10px] font-bold text-emerald-400">100%</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div {...fadeIn} transition={{ delay: 0.05 }}>
          <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[130px]" hover glow="amber">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-amber-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Used</p>
                <p className="text-2xl font-bold text-amber-400">{stats.totalDaysUsed}</p>
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="text-amber-400/80">{stats.thisMonthUsed} this month</span>
                  {stats.thisMonthUsed > 0 && <TrendingUp className="h-3 w-3 text-amber-400" />}
                </div>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                <ProgressRing value={stats.totalDaysUsed} max={Math.max(stats.totalBalance, 1)} size={48} color="#f59e0b" />
                <span className="absolute text-[10px] font-bold text-amber-400">
                  {stats.totalBalance > 0 ? Math.round((stats.totalDaysUsed / stats.totalBalance) * 100) : 0}%
                </span>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
          <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[130px]" hover glow="rose">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-rose-500/5" />
            {stats.pendingCount > 0 && (
              <div className="absolute inset-0 rounded-xl pointer-events-none">
                <div className="absolute inset-0 rounded-xl ring-2 ring-amber-500/20 animate-pulse" />
              </div>
            )}
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending</p>
                <p className="text-2xl font-bold text-amber-400">{stats.pendingCount}</p>
                <p className="text-[10px] text-amber-400/80">
                  {stats.pendingCount > 0 ? 'Est. 1-2 days for approval' : 'No pending requests'}
                </p>
              </div>
              <div className="rounded-xl p-3 bg-amber-500/10 text-amber-400 shrink-0">
                {stats.pendingCount > 0 ? (
                  <Clock className="h-5 w-5 animate-pulse" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
          <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[130px]" hover glow="cyan">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-cyan-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Remaining</p>
                <p className="text-2xl font-bold text-cyan-400">{stats.totalRemaining}</p>
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="text-cyan-400/80">{stats.projectedRemaining} by year-end</span>
                  {stats.projectedRemaining < stats.totalRemaining && (
                    <TrendingDown className="h-3 w-3 text-cyan-400" />
                  )}
                </div>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                <ProgressRing value={stats.totalRemaining} max={Math.max(stats.totalBalance, 1)} size={48} color="#06b6d4" />
                <span className="absolute text-[10px] font-bold text-cyan-400">
                  {stats.totalBalance > 0 ? Math.round((stats.totalRemaining / stats.totalBalance) * 100) : 0}%
                </span>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════
          LEAVE BALANCE CARDS (ENHANCED)
      ═══════════════════════════════════════════ */}
      {balanceCards.length > 0 && (
        <motion.div
          variants={stagger.container}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
        >
          {balanceCards.map((b) => {
            const cfg = leaveTypeConfig[b.key] || leaveTypeConfig.unpaid;
            const Icon = cfg.icon;
            const pct = b.total > 0 ? (b.remaining / b.total) * 100 : 0;
            const isLow = b.remaining < 3 && b.remaining > 0;
            const isEmpty = b.remaining === 0;
            // Year-end projection
            const monthsElapsed = new Date().getMonth() + 1;
            const monthlyRate = monthsElapsed > 0 ? b.used / monthsElapsed : 0;
            const projectedRemaining = Math.max(0, Math.round(b.total - monthlyRate * 12));
            return (
              <motion.div key={b.key} variants={stagger.item}>
                <GlassCard className={`p-4 sm:p-5 relative overflow-hidden ${isLow ? 'ring-1 ring-rose-500/30' : ''}`} hover glow={isLow ? 'rose' : (cfg.glowColor as any)}>
                  {isLow && (
                    <div className="absolute top-2 right-2 z-20">
                      <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 text-[9px] px-1.5 animate-pulse">
                        <AlertCircle className="h-2.5 w-2.5 mr-0.5" /> Low
                      </Badge>
                    </div>
                  )}
                  {isEmpty && (
                    <div className="absolute top-2 right-2 z-20">
                      <Badge className="bg-rose-500/30 text-rose-300 border-rose-500/30 text-[9px] px-1.5">
                        <XCircle className="h-2.5 w-2.5 mr-0.5" /> Exhausted
                      </Badge>
                    </div>
                  )}
                  <div className="space-y-3 relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`rounded-lg p-2 ${cfg.iconBg} ${cfg.iconText}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium">{cfg.label}</span>
                      </div>
                      <Badge variant="outline" className={`text-[10px] border-0 ${cfg.badgeBg}`}>
                        {b.remaining}/{b.total}
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{b.used} used of {b.total}</span>
                        <span className={isLow || isEmpty ? 'text-rose-400 font-medium' : cfg.iconText}>
                          {Math.round(pct)}% remaining
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-black/[0.03] dark:bg-white/[0.05] overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full bg-gradient-to-r ${cfg.progressGradient}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground/70">
                      At current rate, {projectedRemaining} day{projectedRemaining !== 1 ? 's' : ''} left by year end
                    </p>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════
          BENTO GRID
      ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Upcoming Leaves Panel (Enhanced) */}
        <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
          <GlassCard className="p-5 h-full" hover glow="emerald">
            <div className="flex items-center gap-2 mb-4">
              <div className="rounded-lg p-2 bg-emerald-500/10 text-emerald-400">
                <CalendarDays className="h-4 w-4" />
              </div>
              <h3 className="font-semibold">Upcoming Leaves</h3>
              {upcomingLeaves.length > 0 && (
                <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
                  {upcomingLeaves.length}
                </Badge>
              )}
            </div>
            {upcomingLeaves.length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                {upcomingLeaves.map((l) => {
                  const cfg = leaveTypeConfig[l.type] || leaveTypeConfig.unpaid;
                  const TypeIcon = cfg.icon;
                  const dUntil = daysUntil(l.startDate);
                  const days = daysBetween(l.startDate, l.endDate);
                  return (
                    <motion.div
                      key={l.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.04] dark:hover:bg-white/[0.07] transition-colors group"
                    >
                      <div className={`rounded-lg p-2 shrink-0 ${cfg.iconBg} ${cfg.iconText}`}>
                        <TypeIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{cfg.label}</span>
                          <Badge variant="outline" className={`text-[10px] border-0 ${cfg.badgeBg}`}>
                            {days} day{days !== 1 ? 's' : ''}
                          </Badge>
                          <StatusBadge status={l.status} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(l.startDate)} → {formatDate(l.endDate)}
                        </p>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        {dUntil > 0 ? (
                          <span className="text-xs text-emerald-400 font-medium">
                            {dUntil}d away
                          </span>
                        ) : dUntil === 0 ? (
                          <span className="text-xs text-amber-400 font-medium animate-pulse">
                            Today!
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Started
                          </span>
                        )}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          {l.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 text-[10px] px-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                              onClick={() => { setCancelLeaveId(l.id); setCancelDialogOpen(true); }}
                            >
                              Cancel
                            </Button>
                          )}
                          {l.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 text-[10px] px-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                              onClick={() => { setWithdrawLeaveId(l.id); setWithdrawReason(''); setWithdrawDialogOpen(true); }}
                            >
                              Withdraw
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="rounded-full p-4 bg-black/[0.03] dark:bg-white/[0.05]">
                  <CalendarDays className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No upcoming leaves</p>
                <Button size="sm" variant="outline" className="gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                  onClick={() => { setForm(defaultForm); setPreviewMode(false); setDialogOpen(true); }}>
                  <Plus className="h-3.5 w-3.5" /> Apply Now
                </Button>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Team Availability Panel (NEW) */}
        <motion.div {...fadeIn} transition={{ delay: 0.25 }}>
          <GlassCard className="p-5 h-full" hover glow="cyan">
            <div className="flex items-center gap-2 mb-4">
              <div className="rounded-lg p-2 bg-cyan-500/10 text-cyan-400">
                <Users className="h-4 w-4" />
              </div>
              <h3 className="font-semibold">Team Availability</h3>
            </div>
            {/* Mini availability indicator */}
            <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.05]">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="text-xs text-emerald-400 font-medium">{teamAvailability.available} Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="text-xs text-amber-400 font-medium">{teamAvailability.away.length} Away</span>
              </div>
              <span className="text-xs text-muted-foreground ml-auto">
                {teamAvailability.available} of {teamAvailability.total}
              </span>
            </div>
            {/* Availability bar */}
            <div className="h-2 rounded-full bg-black/[0.03] dark:bg-white/[0.05] overflow-hidden mb-4">
              {teamAvailability.total > 0 && (
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(teamAvailability.available / teamAvailability.total) * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              )}
            </div>
            {teamAvailability.away.length > 0 ? (
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Who&apos;s Away Today</p>
                {teamAvailability.away.map((a) => {
                  const cfg = leaveTypeConfig[a.type] || leaveTypeConfig.unpaid;
                  const TypeIcon = cfg.icon;
                  return (
                    <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.05]">
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-cyan-400">
                        {a.name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{a.name}</p>
                        <div className="flex items-center gap-1">
                          <TypeIcon className={`h-3 w-3 ${cfg.iconText}`} />
                          <span className="text-[10px] text-muted-foreground">{cfg.label}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground">Returns</p>
                        <p className="text-[10px] font-medium">{a.returnDate ? formatDate(a.returnDate) : 'N/A'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                <p className="text-xs text-muted-foreground">Everyone is available today!</p>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Leave Calendar (Enhanced) */}
        <motion.div {...fadeIn} transition={{ delay: 0.3 }}>
          <GlassCard className="p-5 h-full" hover>
            <div className="flex items-center gap-2 mb-4">
              <div className="rounded-lg p-2 bg-cyan-500/10 text-cyan-400">
                <Calendar className="h-4 w-4" />
              </div>
              <h3 className="font-semibold">Leave Calendar</h3>
            </div>
            <MiniCalendar leaves={myLeaves} holidays={holidays} onDateClick={openQuickApply} />
            <p className="text-[10px] text-muted-foreground/60 text-center mt-2">Click a date to quick-apply</p>
          </GlassCard>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════
          TEAM AVAILABILITY HEAT MAP (NEW)
      ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {showHeatmap && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard className="p-5" hover glow="cyan">
              <div className="flex items-center gap-2 mb-4">
                <div className="rounded-lg p-2 bg-cyan-500/10 text-cyan-400">
                  <Map className="h-4 w-4" />
                </div>
                <h3 className="font-semibold">Team Availability Heat Map</h3>
                <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-400">
                  {teamAvailability.total} members
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Visual overview of your team&apos;s availability. Color intensity indicates coverage risk — darker cells mean fewer members available.
              </p>
              {heatmapLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading team availability...</span>
                </div>
              ) : heatmapData.length > 0 ? (
                <TeamAvailabilityHeatMap
                  days={heatmapData}
                  teamSize={teamAvailability.total}
                  onDateClick={openQuickApply}
                />
              ) : (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Users className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No team availability data available</p>
                  <p className="text-xs text-muted-foreground/60">Make sure you are assigned to a department with team members</p>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════
          LEAVE PLANNER (NEW)
      ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {showPlanner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard className="p-5" hover glow="emerald">
              <div className="flex items-center gap-2 mb-4">
                <div className="rounded-lg p-2 bg-emerald-500/10 text-emerald-400">
                  <LayoutList className="h-4 w-4" />
                </div>
                <h3 className="font-semibold">Leave Planner</h3>
                <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
                  Plan & Preview
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Plan your leaves with instant balance preview and coverage risk assessment. Select date ranges on the calendar, then preview the impact before applying.
              </p>
              <LeavePlanner
                leaveBalance={leaveBalance ? Object.fromEntries(
                  Object.entries(leaveBalance).filter(([, v]) => v && typeof v === 'object' && 'total' in v)
                ) as Record<string, { total: number; used: number; remaining: number }> : null}
                existingLeaves={leaves.filter(l => l.userId === user?.id).map(l => ({
                  id: l.id,
                  type: l.type,
                  startDate: l.startDate,
                  endDate: l.endDate,
                  status: l.status,
                }))}
                teamSize={teamAvailability.total}
                onApplyPlan={async (plan) => {
                  await applyLeave({
                    userId: user!.id,
                    type: plan.type,
                    startDate: plan.startDate,
                    endDate: plan.endDate,
                    reason: `Planned leave via Leave Planner (${plan.days} working days)`,
                  });
                }}
                departmentMembers={users.filter(u => u.departmentId === user?.departmentId && u.id !== user?.id).map(u => ({ id: u.id, name: u.name }))}
              />
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════
          HOLIDAY CALENDAR SECTION (NEW)
      ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {showHolidayCal && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard className="p-3 sm:p-5" hover glow="amber">
              <div className="flex items-center gap-2 mb-4">
                <div className="rounded-lg p-2 bg-amber-500/10 text-amber-400">
                  <Star className="h-4 w-4" />
                </div>
                <h3 className="font-semibold">Company Holidays</h3>
                <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">
                  {holidays.length} holidays
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                {upcomingHolidays.map((h) => {
                  const typeConfig: Record<string, { label: string; color: string; bg: string }> = {
                    public: { label: 'Public', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' },
                    company: { label: 'Company', color: 'text-cyan-400', bg: 'bg-cyan-500/15 border-cyan-500/30' },
                    optional: { label: 'Optional', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' },
                  };
                  const tc = typeConfig[h.type] || typeConfig.optional;
                  const dUntil = daysUntil(h.date);
                  return (
                    <div key={h.id} className="flex items-center gap-3 p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.04] dark:hover:bg-white/[0.07] transition-colors">
                      <div className="flex flex-col items-center shrink-0 w-12 text-center">
                        <span className="text-[10px] text-muted-foreground uppercase">
                          {new Date(h.date).toLocaleString('default', { month: 'short' })}
                        </span>
                        <span className="text-lg font-bold">{new Date(h.date).getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-medium truncate">{h.name}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[9px] border-0 ${tc.bg} ${tc.color}`}>
                            {tc.label}
                          </Badge>
                          {h.isRecurring && (
                            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                              <RotateCcw className="h-2.5 w-2.5" /> Yearly
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {dUntil > 0 ? (
                          <span className="text-[10px] text-amber-400 font-medium">{dUntil}d away</span>
                        ) : dUntil === 0 ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400 text-[9px]">Today!</Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Passed</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════
          LEAVE POLICY INFORMATION (NEW)
      ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {showPolicies && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard className="p-3 sm:p-5" hover glow="cyan">
              <div className="flex items-center gap-2 mb-4">
                <div className="rounded-lg p-2 bg-cyan-500/10 text-cyan-400">
                  <BookOpen className="h-4 w-4" />
                </div>
                <h3 className="font-semibold">Leave Policies</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                {policies.filter(p => p.isActive).map((p) => {
                  const cfg = leaveTypeConfig[p.type];
                  const Icon = cfg?.icon || FileText;
                  return (
                    <div key={p.id} className="p-4 rounded-lg border bg-black/[0.01] dark:bg-white/[0.02] border-black/[0.1] dark:border-white/[0.1] space-y-2"
                      style={{ borderLeftColor: p.color, borderLeftWidth: '3px' }}>
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${cfg?.iconText || 'text-muted-foreground'}`} />
                        <span className="text-sm font-medium">{p.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <CalendarDays className="h-3 w-3" />
                          <span>Quota: <span className="text-foreground font-medium">{p.annualQuota}d</span></span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Shield className="h-3 w-3" />
                          <span>{p.requiresApproval ? 'Approval needed' : 'Auto-approved'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          <span>{p.requiresDocument ? `Doc needed (>${p.documentThresholdDays}d)` : 'No docs needed'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <TrendingUp className="h-3 w-3" />
                          <span>{p.carriesForward ? `Carry fwd: ${p.maxCarryForward}d` : 'No carry forward'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Coins className="h-3 w-3" />
                          <span>{p.isEncashable ? 'Encashable' : 'Non-encashable'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Banknote className="h-3 w-3" />
                          <span>{p.isPaid ? 'Paid leave' : 'Unpaid leave'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════
          LEAVE HISTORY TABLE (ENHANCED)
      ═══════════════════════════════════════════ */}
      <motion.div {...fadeIn} transition={{ delay: 0.35 }}>
        <GlassCard className="p-5">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h3 className="font-semibold">Leave History</h3>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="h-8 text-xs pl-8 w-32 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"
                  />
                </div>
                {/* Sort */}
                <Select value={sortField} onValueChange={(v) => setSortField(v as any)}>
                  <SelectTrigger className="h-8 text-xs w-24 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                    <ArrowUpDown className="h-3 w-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">By Date</SelectItem>
                    <SelectItem value="status">By Status</SelectItem>
                    <SelectItem value="type">By Type</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                >
                  {sortDir === 'asc' ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                </Button>
                {/* Tab Filters */}
                <TabsList className="bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1] h-auto flex-wrap">
                  {['all', 'pending', 'approved', 'rejected'].map(f => (
                    <TabsTrigger key={f} value={f} className="text-xs capitalize data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">
                      {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                      {f !== 'all' && (
                        <span className="ml-1 text-[10px] text-muted-foreground">
                          ({myLeaves.filter(l => l.status === f).length})
                        </span>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </div>

            <TabsContent value={activeTab} className="mt-0">
              {filteredLeaves.length > 0 ? (
                <>
                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                    {filteredLeaves.map((l, i) => {
                      const cfg = leaveTypeConfig[l.type] || leaveTypeConfig.unpaid;
                      const TypeIcon = cfg.icon;
                      const days = daysBetween(l.startDate, l.endDate);
                      const isExpanded = expandedRow === l.id;

                      return (
                        <motion.div
                          key={l.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ delay: i * 0.02 }}
                          className="rounded-lg border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.01] dark:bg-white/[0.02] overflow-hidden"
                        >
                          <div
                            className="p-3 cursor-pointer"
                            onClick={() => setExpandedRow(isExpanded ? null : l.id)}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`rounded p-1.5 shrink-0 ${cfg.iconBg} ${cfg.iconText}`}>
                                  <TypeIcon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium">{cfg.label}</span>
                                    <StatusBadge status={l.status} />
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {formatDate(l.startDate)} → {formatDate(l.endDate)}
                                    <Badge variant="outline" className="text-[10px] border-black/[0.1] dark:border-white/[0.1] ml-2">
                                      {days}d
                                    </Badge>
                                  </p>
                                </div>
                              </div>
                              <motion.div
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                                className="shrink-0"
                              >
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              </motion.div>
                            </div>
                          </div>

                          {/* Expanded Mobile Card */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-3 pb-3 border-t border-black/[0.06] dark:border-white/[0.05] pt-3 space-y-3">
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Reason</p>
                                    <p className="text-sm">{l.reason || 'No reason provided'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Timeline</p>
                                    <div className="space-y-1 text-xs text-muted-foreground">
                                      <p className="flex items-center gap-1.5">
                                        <Clock className="h-3 w-3" /> Applied: {timeAgo(l.createdAt)}
                                      </p>
                                      <p className="flex items-center gap-1.5">
                                        <CalendarDays className="h-3 w-3" /> Duration: {days} day{days !== 1 ? 's' : ''} ({workingDaysBetween(l.startDate, l.endDate)} working)
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 flex-wrap">
                                    {l.status === 'pending' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-xs gap-1.5 border-rose-500/20 text-rose-400 hover:bg-rose-500/10"
                                        onClick={() => { setCancelLeaveId(l.id); setCancelDialogOpen(true); }}
                                      >
                                        <XCircle className="h-3.5 w-3.5" /> Cancel
                                      </Button>
                                    )}
                                    {l.status === 'approved' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-xs gap-1.5 border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
                                        onClick={() => { setWithdrawLeaveId(l.id); setWithdrawReason(''); setWithdrawDialogOpen(true); }}
                                      >
                                        <RotateCcw className="h-3.5 w-3.5" /> Withdraw
                                      </Button>
                                    )}
                                    {l.status === 'rejected' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-xs gap-1.5 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
                                        onClick={() => handleReapply(l)}
                                      >
                                        <RotateCcw className="h-3.5 w-3.5" /> Re-apply
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block space-y-1">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-black/[0.06] dark:border-white/[0.05]">
                      <div className="col-span-2">Type</div>
                      <div className="col-span-2">Start</div>
                      <div className="col-span-2">End</div>
                      <div className="col-span-1">Days</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-2">Actions</div>
                      <div className="col-span-1" />
                    </div>

                    <AnimatePresence mode="popLayout">
                      {filteredLeaves.map((l, i) => {
                        const cfg = leaveTypeConfig[l.type] || leaveTypeConfig.unpaid;
                        const TypeIcon = cfg.icon;
                        const days = daysBetween(l.startDate, l.endDate);
                        const isExpanded = expandedRow === l.id;

                        return (
                          <motion.div
                            key={l.id}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ delay: i * 0.02 }}
                          >
                            <div
                              className={`grid grid-cols-12 gap-2 px-3 py-3 items-center rounded-lg hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors cursor-pointer ${isExpanded ? 'bg-black/[0.02] dark:bg-white/[0.03]' : ''}`}
                              onClick={() => setExpandedRow(isExpanded ? null : l.id)}
                            >
                              <div className="col-span-2 flex items-center gap-2">
                                <div className={`rounded p-1 shrink-0 ${cfg.iconBg} ${cfg.iconText}`}>
                                  <TypeIcon className="h-3 w-3" />
                                </div>
                                <span className="text-sm font-medium truncate">{cfg.label}</span>
                              </div>
                              <div className="col-span-2 text-xs text-muted-foreground font-mono">{formatDate(l.startDate)}</div>
                              <div className="col-span-2 text-xs text-muted-foreground font-mono">{formatDate(l.endDate)}</div>
                              <div className="col-span-1">
                                <Badge variant="outline" className="text-[10px] border-black/[0.1] dark:border-white/[0.1]">
                                  {days}d
                                </Badge>
                              </div>
                              <div className="col-span-2">
                                <StatusBadge status={l.status} />
                              </div>
                              <div className="col-span-2 flex gap-1" onClick={e => e.stopPropagation()}>
                                {l.status === 'pending' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-[10px] gap-1 border-rose-500/20 text-rose-400 hover:bg-rose-500/10"
                                    onClick={() => { setCancelLeaveId(l.id); setCancelDialogOpen(true); }}
                                  >
                                    <XCircle className="h-3 w-3" /> Cancel
                                  </Button>
                                )}
                                {l.status === 'approved' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-[10px] gap-1 border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
                                    onClick={() => { setWithdrawLeaveId(l.id); setWithdrawReason(''); setWithdrawDialogOpen(true); }}
                                  >
                                    <RotateCcw className="h-3 w-3" /> Withdraw
                                  </Button>
                                )}
                                {l.status === 'rejected' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-[10px] gap-1 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
                                    onClick={() => handleReapply(l)}
                                  >
                                    <RotateCcw className="h-3 w-3" /> Re-apply
                                  </Button>
                                )}
                              </div>
                              <div className="col-span-1 flex justify-center">
                                <motion.div
                                  animate={{ rotate: isExpanded ? 180 : 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                </motion.div>
                              </div>
                            </div>

                            {/* Expanded Row (Enhanced) */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-3 pb-3 border-t border-black/[0.06] dark:border-white/[0.05] pt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-1">Reason</p>
                                      <p className="text-sm">{l.reason || 'No reason provided'}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-1">Timeline</p>
                                      <div className="space-y-1 text-xs text-muted-foreground">
                                        <p className="flex items-center gap-1.5">
                                          <Clock className="h-3 w-3" /> Applied: {timeAgo(l.createdAt)}
                                        </p>
                                        <p className="flex items-center gap-1.5">
                                          <CalendarDays className="h-3 w-3" /> Duration: {days} day{days !== 1 ? 's' : ''} ({workingDaysBetween(l.startDate, l.endDate)} working)
                                        </p>
                                        <p className="flex items-center gap-1.5">
                                          <Calendar className="h-3 w-3" /> Applied on: {formatDate(l.createdAt)}
                                        </p>
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-1">Approval</p>
                                      <div className="space-y-1 text-xs text-muted-foreground">
                                        {l.managerId && (
                                          <p className="flex items-center gap-1.5">
                                            <Users className="h-3 w-3" /> Approved by: Manager
                                          </p>
                                        )}
                                        {l.managerComment && (
                                          <p className="flex items-center gap-1.5">
                                            <FileText className="h-3 w-3" /> Note: <span className="text-foreground">{l.managerComment}</span>
                                          </p>
                                        )}
                                        {!l.managerComment && l.status === 'approved' && (
                                          <p className="flex items-center gap-1.5">
                                            <CheckCircle2 className="h-3 w-3 text-emerald-400" /> <span className="text-emerald-400">Approved without comment</span>
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 py-12">
                  <div className="rounded-full p-4 bg-black/[0.03] dark:bg-white/[0.05]">
                    <CalendarDays className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium">
                    {activeTab === 'all' ? 'No leave history yet' : `No ${activeTab} leaves`}
                  </p>
                  <p className="text-xs text-muted-foreground/70 max-w-xs text-center">
                    {searchQuery ? 'Try adjusting your search query' : activeTab === 'all'
                      ? "You haven't applied for any leaves yet. Click Apply Leave to get started."
                      : `No ${activeTab} leaves found. They'll appear here when the status changes.`}
                  </p>
                  {!searchQuery && (
                    <Button size="sm" variant="outline" className="mt-2 gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                      onClick={() => { setForm(defaultForm); setPreviewMode(false); setDialogOpen(true); }}>
                      <Plus className="h-3.5 w-3.5" /> Apply for Leave
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </GlassCard>
      </motion.div>

      {/* ═══════════════════════════════════════════
          APPLY LEAVE DIALOG (ENHANCED - TWO STEP)
      ═══════════════════════════════════════════ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2] max-w-[calc(100%-1rem)] sm:max-w-xl max-h-[85vh] sm:max-h-none overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewMode ? (
                <>
                  <Eye className="h-5 w-5 text-cyan-400" /> Review Your Leave
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-emerald-400" /> Apply for Leave
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {!previewMode ? (
            /* ── STEP 1: FORM ── */
            <div className="space-y-5 py-2">
              {/* Leave Type Selector Grid */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Leave Type</Label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {Object.entries(leaveTypeConfig).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    const isSelected = form.type === key;
                    const typeBalance = leaveBalance?.[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, type: key as Leave['type'] }))}
                        className={`flex flex-col items-center gap-1 rounded-lg p-2.5 border transition-all text-center ${
                          isSelected
                            ? `border-current ${cfg.iconBg} ${cfg.iconText} ring-1 ring-current/30`
                            : 'border-black/[0.1] dark:border-white/[0.1] bg-black/[0.01] dark:bg-white/[0.02] text-muted-foreground hover:border-black/[0.12] dark:hover:border-white/[0.2]'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-[9px] font-medium">{cfg.label}</span>
                        {typeBalance && (
                          <span className="text-[8px] text-muted-foreground">{typeBalance.remaining}d left</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date Range + Half Day */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Start Date</Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-9 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">End Date</Label>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-9 text-sm"
                  />
                </div>
              </div>

              {/* Instant Coverage Risk Indicator */}
              {coverageRisk && form.startDate && form.endDate && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
                  {coverageRisk.risk === 'critical' ? (
                    <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                  ) : coverageRisk.risk === 'high' ? (
                    <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0" />
                  ) : (
                    <Shield className="h-4 w-4 text-emerald-400 shrink-0" />
                  )}
                  <span className="text-xs text-muted-foreground flex-1">
                    Coverage risk:
                  </span>
                  <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${
                    coverageRisk.risk === 'critical' ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' :
                    coverageRisk.risk === 'high' ? 'bg-orange-500/15 border-orange-500/30 text-orange-400' :
                    coverageRisk.risk === 'medium' ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' :
                    'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  }`}>
                    {coverageRisk.risk.toUpperCase()}
                  </Badge>
                  {teamOverlap.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      ({teamOverlap.length} colleague{teamOverlap.length !== 1 ? 's' : ''} away)
                    </span>
                  )}
                  {conflictLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                </div>
              )}

              {/* Half Day Option */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                <Switch
                  id="halfDay"
                  checked={form.halfDay}
                  onCheckedChange={checked => setForm(f => ({ ...f, halfDay: checked }))}
                />
                <Label htmlFor="halfDay" className="text-xs font-medium cursor-pointer flex-1">Half-Day Leave</Label>
                {form.halfDay && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={form.halfDayPeriod === 'am' ? 'default' : 'outline'}
                      className={`h-7 text-[10px] ${form.halfDayPeriod === 'am' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'border-black/[0.1] dark:border-white/[0.1]'}`}
                      onClick={() => setForm(f => ({ ...f, halfDayPeriod: 'am' }))}
                    >
                      <Sun className="h-3 w-3 mr-1" /> AM
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={form.halfDayPeriod === 'pm' ? 'default' : 'outline'}
                      className={`h-7 text-[10px] ${form.halfDayPeriod === 'pm' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'border-black/[0.1] dark:border-white/[0.1]'}`}
                      onClick={() => setForm(f => ({ ...f, halfDayPeriod: 'pm' }))}
                    >
                      <Moon className="h-3 w-3 mr-1" /> PM
                    </Button>
                  </div>
                )}
              </div>

              {/* Duration preview */}
              {form.startDate && form.endDate && (
                <div className="flex items-center gap-2 text-xs p-2 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                  <CalendarDays className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="text-cyan-400 font-medium">
                    {formDuration} working day{formDuration !== 1 ? 's' : ''}
                    {form.halfDay ? ' (half day)' : ''} (excl. weekends)
                  </span>
                  {form.startDate > form.endDate && (
                    <span className="text-rose-400 ml-2">End date must be after start date</span>
                  )}
                </div>
              )}

              {/* Reason */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Reason</Label>
                  <span className="text-[10px] text-muted-foreground">{form.reason.length}/500</span>
                </div>
                <Textarea
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value.slice(0, 500) }))}
                  placeholder="Describe the reason for your leave..."
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] min-h-[80px] text-sm"
                />
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Priority</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, priority: 'normal' }))}
                    className={`flex items-center gap-2 rounded-lg p-3 border transition-all ${
                      form.priority === 'normal'
                        ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/30'
                        : 'border-black/[0.1] dark:border-white/[0.1] text-muted-foreground hover:border-black/[0.12] dark:hover:border-white/[0.2]'
                    }`}
                  >
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Normal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, priority: 'urgent' }))}
                    className={`flex items-center gap-2 rounded-lg p-3 border transition-all ${
                      form.priority === 'urgent'
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30'
                        : 'border-black/[0.1] dark:border-white/[0.1] text-muted-foreground hover:border-black/[0.12] dark:hover:border-white/[0.2]'
                    }`}
                  >
                    <Zap className="h-4 w-4" />
                    <span className="text-sm">Urgent</span>
                  </button>
                </div>
              </div>

              {/* Contact During Leave */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                <Switch
                  id="contactDuring"
                  checked={form.contactDuringLeave}
                  onCheckedChange={checked => setForm(f => ({ ...f, contactDuringLeave: checked }))}
                />
                <Label htmlFor="contactDuring" className="text-xs font-medium cursor-pointer flex-1">
                  Reachable during leave
                </Label>
              </div>
              {form.contactDuringLeave && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Contact Information</Label>
                  <Input
                    value={form.contactInfo}
                    onChange={e => setForm(f => ({ ...f, contactInfo: e.target.value }))}
                    placeholder="Phone number or email..."
                    className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-9 text-sm"
                  />
                </div>
              )}

              {/* Delegate / Handover */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Delegate / Handover</Label>
                <Input
                  value={form.delegate}
                  onChange={e => setForm(f => ({ ...f, delegate: e.target.value }))}
                  placeholder="Who will cover your work?"
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-9 text-sm"
                />
              </div>

              {/* Attachment */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Attachment (Sick notes, etc.)</Label>
                <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-black/[0.1] dark:border-white/[0.1] hover:border-black/[0.12] dark:hover:border-white/[0.2] transition-colors cursor-pointer">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Click to upload or drag & drop</span>
                </div>
              </div>

              {/* Preview Button */}
              <DialogFooter>
                <Button
                  variant="outline"
                  className="border-black/[0.1] dark:border-white/[0.1]"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="gap-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white"
                  onClick={() => setPreviewMode(true)}
                  disabled={!form.startDate || !form.endDate || !form.reason.trim() || form.startDate > form.endDate}
                >
                  Preview <ArrowRight className="h-4 w-4" />
                </Button>
              </DialogFooter>
            </div>
          ) : (
            /* ── STEP 2: PREVIEW ── */
            <div className="space-y-4 py-2">
              <GlassCard className="p-4" glow="emerald">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Leave Type</span>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const cfg = leaveTypeConfig[form.type];
                        const Icon = cfg.icon;
                        return (
                          <>
                            <Icon className={`h-4 w-4 ${cfg.iconText}`} />
                            <span className={`text-sm font-medium ${cfg.iconText}`}>{cfg.label}</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Date Range</span>
                    <span className="text-sm font-medium">{formatDate(form.startDate)} → {formatDate(form.endDate)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Duration</span>
                    <span className="text-sm font-medium">
                      {formDuration} working day{formDuration !== 1 ? 's' : ''}
                      {form.halfDay ? ` (${form.halfDayPeriod.toUpperCase()} half)` : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Priority</span>
                    <Badge variant="outline" className={form.priority === 'urgent'
                      ? 'border-amber-500/30 text-amber-400'
                      : 'border-cyan-500/30 text-cyan-400'}>
                      {form.priority === 'urgent' ? <Zap className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                      {form.priority.charAt(0).toUpperCase() + form.priority.slice(1)}
                    </Badge>
                  </div>
                  <div className="border-t border-black/[0.06] dark:border-white/[0.05] pt-2">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Reason</span>
                    <p className="text-sm mt-1">{form.reason}</p>
                  </div>
                  {form.contactDuringLeave && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Contact</span>
                      <span className="text-sm">{form.contactInfo || 'Not provided'}</span>
                    </div>
                  )}
                  {form.delegate && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Delegate</span>
                      <span className="text-sm">{form.delegate}</span>
                    </div>
                  )}
                </div>
              </GlassCard>

              {/* Balance Warning */}
              {balanceForType && formDuration > balanceForType.remaining && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-rose-400">Insufficient Leave Balance</p>
                    <p className="text-[10px] text-rose-400/80">
                      You have {balanceForType.remaining} day{balanceForType.remaining !== 1 ? 's' : ''} remaining but requesting {formDuration} day{formDuration !== 1 ? 's' : ''}.
                      This application may be flagged.
                    </p>
                  </div>
                </div>
              )}

              {/* Smart Conflict Detection Warning */}
              {(teamOverlap.length > 0 || (conflictAnalysis && conflictAnalysis.coverageRisk !== 'low')) && (
                <div className={`p-3 rounded-lg border ${
                  coverageRisk?.risk === 'critical' ? 'bg-rose-500/10 border-rose-500/20' :
                  coverageRisk?.risk === 'high' ? 'bg-orange-500/10 border-orange-500/20' :
                  'bg-amber-500/10 border-amber-500/20'
                }`}>
                  <div className="flex items-start gap-2">
                    {coverageRisk?.risk === 'critical' || coverageRisk?.risk === 'high' ? (
                      <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <p className={`text-xs font-medium ${
                          coverageRisk?.risk === 'critical' ? 'text-rose-400' :
                          coverageRisk?.risk === 'high' ? 'text-orange-400' :
                          'text-amber-400'
                        }`}>
                          {conflictAnalysis?.warningMessage || 'Team Overlap Detected'}
                        </p>
                        {coverageRisk && (
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${
                            coverageRisk.risk === 'critical' ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' :
                            coverageRisk.risk === 'high' ? 'bg-orange-500/15 border-orange-500/30 text-orange-400' :
                            coverageRisk.risk === 'medium' ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' :
                            'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          }`}>
                            {coverageRisk.risk.toUpperCase()} RISK
                          </Badge>
                        )}
                      </div>
                      {teamOverlap.length > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          {teamOverlap.join(', ')} {teamOverlap.length === 1 ? 'is' : 'are'} also on leave during this period.
                        </p>
                      )}
                      {/* Daily breakdown mini-chart */}
                      {conflictAnalysis?.overlapCount && conflictAnalysis.overlapCount > 0 && (
                        <p className="text-[10px] text-muted-foreground/70">
                          {conflictAnalysis.overlapCount} of {conflictAnalysis.teamSize} team members on leave | Coverage: {conflictAnalysis.teamSize - conflictAnalysis.overlapCount - 1} remaining
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Alternative Dates Suggestions */}
              {conflictAnalysis && conflictAnalysis.alternatives.length > 0 && (coverageRisk?.risk === 'high' || coverageRisk?.risk === 'critical') && (
                <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <p className="text-xs font-medium text-cyan-400">Consider Alternative Dates</p>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                        {conflictAnalysis.alternatives.slice(0, 3).map((alt, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setForm(f => ({ ...f, startDate: alt.startDate, endDate: alt.endDate }));
                              setPreviewMode(false);
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.06] transition-colors text-left"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">{alt.label}</span>
                              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${
                                alt.coverageRisk === 'low' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' :
                                alt.coverageRisk === 'medium' ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' :
                                'bg-orange-500/15 border-orange-500/30 text-orange-400'
                              }`}>
                                {alt.coverageRisk.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-muted-foreground">{alt.reason}</span>
                              <ArrowRight className="h-3 w-3 text-cyan-400" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Conflict loading indicator */}
              {conflictLoading && form.startDate && form.endDate && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                  <span className="text-[10px] text-muted-foreground">Analyzing team coverage...</span>
                </div>
              )}

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  className="border-black/[0.1] dark:border-white/[0.1]"
                  onClick={() => setPreviewMode(false)}
                >
                  Back to Edit
                </Button>
                <Button
                  className="gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit Application
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════
          CANCEL PENDING LEAVE DIALOG
      ═══════════════════════════════════════════ */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-rose-400" /> Cancel Leave Request
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this leave request? This action cannot be undone. Your manager will be notified of the cancellation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-black/[0.1] dark:border-white/[0.1]">Keep Leave</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-rose-600 hover:bg-rose-500 text-white"
            >
              Yes, Cancel Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══════════════════════════════════════════
          WITHDRAW APPROVED LEAVE DIALOG
      ═══════════════════════════════════════════ */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2] max-w-[calc(100%-1rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-400" /> Request Withdrawal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-amber-400">Withdrawal Policy</p>
                <p className="text-[10px] text-amber-400/80">
                  Withdrawing an approved leave may require manager re-approval. Please provide a valid reason for the withdrawal.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Reason for Withdrawal *</Label>
              <Textarea
                value={withdrawReason}
                onChange={e => setWithdrawReason(e.target.value.slice(0, 300))}
                placeholder="Explain why you need to withdraw this leave..."
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] min-h-[80px] text-sm"
              />
              <p className="text-[10px] text-muted-foreground">{withdrawReason.length}/300</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-black/[0.1] dark:border-white/[0.1]" onClick={() => setWithdrawDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="gap-2 bg-amber-600 hover:bg-amber-500 text-white"
              onClick={handleWithdraw}
              disabled={!withdrawReason.trim()}
            >
              <Send className="h-4 w-4" /> Submit Withdrawal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Small helper components for policies
function Coins({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="8" cy="8" r="6" />
      <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
      <path d="M7 6h1v4" />
      <path d="m16.71 13.88.7.71-2.82 2.82" />
    </svg>
  );
}

function Banknote({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="12" x="2" y="6" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}
