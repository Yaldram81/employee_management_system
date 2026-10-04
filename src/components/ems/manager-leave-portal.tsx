'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { StatCard } from './stat-card';
import { StatusBadge } from './status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Leave, LeaveBalance } from '@/lib/types';
import type { LucideIcon } from 'lucide-react';
import {
  Users, Plane, AlertTriangle, Shield, CalendarDays, Plus,
  RefreshCw, Loader2, CheckCircle2, XCircle, Clock, ChevronLeft,
  ChevronRight, TrendingUp, Zap, Calendar, Heart, Palmtree,
  Briefcase, Baby, UserX, Eye, MessageSquare, Send,
  BarChart3, PieChart as PieIcon, FileText, ArrowRight,
  AlertCircle, ThumbsUp, ThumbsDown, Search, Filter,
  UserCheck, Activity, BookOpen, Settings2, ChevronDown,
  Info, ArrowUpRight, Handshake, Maximize2,
} from 'lucide-react';


/* ═══════════════════════════════════════════════════════════════════
   CONFIG & HELPERS
   ═══════════════════════════════════════════════════════════════════ */

interface LeaveTypeConfig {
  icon: LucideIcon;
  label: string;
  color: string;
  iconBg: string;
  iconText: string;
  progressColor: string;
  badgeBg: string;
  hex: string;
}

const leaveTypeConfig: Record<string, LeaveTypeConfig> = {
  SICK: {
    icon: Heart, label: 'Sick Leave', color: 'rose',
    iconBg: 'bg-rose-500/20', iconText: 'text-rose-400',
    progressColor: 'bg-rose-500', badgeBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    hex: '#f43f5e',
  },
  CASUAL: {
    icon: Briefcase, label: 'Casual Leave', color: 'amber',
    iconBg: 'bg-amber-500/20', iconText: 'text-amber-400',
    progressColor: 'bg-amber-500', badgeBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    hex: '#f59e0b',
  },
  VACATION: {
    icon: Palmtree, label: 'Vacation', color: 'emerald',
    iconBg: 'bg-emerald-500/20', iconText: 'text-emerald-400',
    progressColor: 'bg-emerald-500', badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    hex: '#10b981',
  },
  MATERNITY: {
    icon: Baby, label: 'Maternity', color: 'pink',
    iconBg: 'bg-pink-500/20', iconText: 'text-pink-400',
    progressColor: 'bg-pink-500', badgeBg: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
    hex: '#ec4899',
  },
  PATERNITY: {
    icon: Baby, label: 'Paternity', color: 'cyan',
    iconBg: 'bg-cyan-500/20', iconText: 'text-cyan-400',
    progressColor: 'bg-cyan-500', badgeBg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    hex: '#06b6d4',
  },
  UNPAID: {
    icon: UserX, label: 'Unpaid', color: 'slate',
    iconBg: 'bg-slate-500/20', iconText: 'text-slate-400',
    progressColor: 'bg-slate-500', badgeBg: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    hex: '#64748b',
  },
};

// Alias for lowercase keys
const leaveTypeConfigLower: Record<string, LeaveTypeConfig> = {};
Object.entries(leaveTypeConfig).forEach(([k, v]) => { leaveTypeConfigLower[k.toLowerCase()] = v; });

function getTypeConfig(type: string): LeaveTypeConfig {
  return leaveTypeConfig[type.toUpperCase()] || leaveTypeConfigLower[type.toLowerCase()] || leaveTypeConfig.CASUAL;
}

function isEscalated(createdAt: string): boolean {
  const hours = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  return hours >= 48;
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1);
}

/* ─── SVG Progress Ring ───────────────────────────────────────── */
function Ring({ value, max, size = 56, strokeWidth = 5, color = '#10b981' }: {
  value: number; max: number; size?: number; strokeWidth?: number; color?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        className="transition-all duration-700 ease-out" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TEAM CALENDAR
   ═══════════════════════════════════════════════════════════════════ */

function TeamCalendar({
  upcomingLeaves,
  holidays,
  overlapDates,
  onDateClick,
}: {
  upcomingLeaves: Array<{ id: string; userId: string; userName: string; type: string; startDate: string; endDate: string }>;
  holidays: Array<{ id: string; name: string; date: string; type: string }>;
  overlapDates: Array<{ date: string; count: number; members: string[] }>;
  onDateClick: (date: string, members: string[]) => void;
}) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const startDay = (new Date(month.y, month.m, 1).getDay() + 6) % 7;
  const monthName = new Date(month.y, month.m).toLocaleString('default', { month: 'long', year: 'numeric' });
  const prev = () => setMonth(p => p.m === 0 ? { y: p.y - 1, m: 11 } : { y: p.y, m: p.m - 1 });
  const next = () => setMonth(p => p.m === 11 ? { y: p.y + 1, m: 0 } : { y: p.y, m: p.m + 1 });

  const holidaySet = useMemo(() => {
    const s = new Map<string, string>();
    for (const h of holidays) {
      try {
        const d = h.date.split('T')[0];
        s.set(d, h.name);
      } catch { /* skip */ }
    }
    return s;
  }, [holidays]);

  const overlapMap = useMemo(() => {
    const m = new Map<string, { count: number; members: string[] }>();
    for (const o of overlapDates) {
      m.set(o.date.split('T')[0], { count: o.count, members: o.members });
    }
    return m;
  }, [overlapDates]);

  const leaveMap = useMemo(() => {
    const m: Record<string, Array<{ userName: string; type: string; status: string }>> = {};
    for (const leave of upcomingLeaves) {
      const s = new Date(leave.startDate);
      const e = new Date(leave.endDate);
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        if (d.getMonth() === month.m && d.getFullYear() === month.y) {
          const key = d.getDate().toString();
          (m[key] ??= []).push({ userName: leave.userName, type: leave.type, status: 'approved' });
        }
      }
    }
    return m;
  }, [upcomingLeaves, month]);

  const typeColorMap: Record<string, string> = {
    SICK: 'bg-rose-400', CASUAL: 'bg-amber-400', VACATION: 'bg-emerald-400',
    MATERNITY: 'bg-pink-400', PATERNITY: 'bg-cyan-400', UNPAID: 'bg-slate-400',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold">{monthName}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={next}>
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
          const dateStr = `${month.y}-${String(month.m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayLeaves = leaveMap[day.toString()] || [];
          const isHoliday = holidaySet.has(dateStr);
          const holidayName = holidaySet.get(dateStr);
          const overlap = overlapMap.get(dateStr);
          const today = new Date();
          const isToday = day === today.getDate() && month.m === today.getMonth() && month.y === today.getFullYear();
          const isWeekend = new Date(month.y, month.m, day).getDay() % 6 === 0;

          return (
            <button
              key={day}
              onClick={() => {
                const members = dayLeaves.map(l => l.userName);
                if (overlap) members.push(...overlap.members.filter(m => !members.includes(m)));
                onDateClick(dateStr, members);
              }}
              className={cn(
                'relative h-12 rounded-lg text-xs flex flex-col items-center justify-center gap-0.5 transition-colors hover:bg-black/[0.06] dark:hover:bg-white/[0.1]',
                isToday ? 'bg-emerald-500/20 text-emerald-400 font-bold ring-1 ring-emerald-500/40' :
                isHoliday ? 'bg-amber-500/10 text-amber-400' :
                isWeekend ? 'bg-black/[0.01] dark:bg-white/[0.02] text-muted-foreground/60' :
                'text-foreground/80',
              )}
              title={isHoliday ? holidayName : overlap ? `${overlap.count} on leave` : ''}
            >
              <span>{day}</span>
              <div className="flex gap-0.5 flex-wrap justify-center">
                {isHoliday && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                {dayLeaves.slice(0, 4).map((l, j) => (
                  <span key={j} className={`w-1.5 h-1.5 rounded-full ${typeColorMap[l.type.toUpperCase()] || 'bg-emerald-400'}`} />
                ))}
                {dayLeaves.length > 4 && <span className="text-[8px] text-muted-foreground">+{dayLeaves.length - 4}</span>}
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-3 pt-1 text-[10px] text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Vacation</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400" /> Sick</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Casual</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Holiday</span>
      </div>
    </div>
  );
}

/* ─── Stable today string (avoids TDZ & re-render issues) ──────── */
const TODAY = new Date().toISOString().split('T')[0];

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export function ManagerLeavePortal() {
  const {
    managerLeaveData, managerLeaveLoading, loadManagerLeaveData,
    bulkApproveLeaves, approveLeave, applyLeave,
    approveLeaveSingle, cancelTeamLeave, modifyTeamLeave,
    delegateLeaveApproval, requestLeaveDocument, markReturnToWork,
    carryForwardLeave, encashLeave, getTeamAvailability, getLeaveReport,
    user, leaves, leaveBalance, users, departments,
    setActiveView, setSelectedLeaveId,
  } = useEMSStore();

  // ─── Local State ────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('approvals');
  const [selectedLeaves, setSelectedLeaves] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'escalated'>('all');
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historySearch, setHistorySearch] = useState('');
  const [expandedBalance, setExpandedBalance] = useState<string | null>(null);

  // Dialogs
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [commentAction, setCommentAction] = useState<{ id: string; status: 'approved' | 'rejected'; isBulk?: boolean } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [applyPreview, setApplyPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [calendarDayDetail, setCalendarDayDetail] = useState<{ date: string; members: string[] } | null>(null);

  // Enterprise dialog states
  const [requestDocDialogOpen, setRequestDocDialogOpen] = useState(false);
  const [requestDocLeave, setRequestDocLeave] = useState<{id: string; userName: string} | null>(null);
  const [requestDocText, setRequestDocText] = useState('');

  const [delegateDialogOpen, setDelegateDialogOpen] = useState(false);
  const [delegateLeave, setDelegateLeave] = useState<{id: string; userName: string} | null>(null);
  const [delegateEmail, setDelegateEmail] = useState('');
  const [delegateComment, setDelegateComment] = useState('');

  const [modifyDialogOpen, setModifyDialogOpen] = useState(false);
  const [modifyLeave, setModifyLeave] = useState<{id: string; type: string; startDate: string; endDate: string; reason: string} | null>(null);
  const [modifyForm, setModifyForm] = useState({type: '', startDate: '', endDate: '', reason: ''});
  const [modifyReason, setModifyReason] = useState('');

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelLeave, setCancelLeave] = useState<{id: string; userName: string} | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const [returnToWorkDialogOpen, setReturnToWorkDialogOpen] = useState(false);
  const [returnToWorkLeave, setReturnToWorkLeave] = useState<{id: string; userName: string} | null>(null);
  const [returnToWorkNotes, setReturnToWorkNotes] = useState('');

  const [carryForwardDialogOpen, setCarryForwardDialogOpen] = useState(false);
  const [carryForwardData, setCarryForwardData] = useState<{userId: string; leaveType: string; maxDays: number; remaining: number} | null>(null);
  const [carryForwardDays, setCarryForwardDays] = useState(0);

  const [encashDialogOpen, setEncashDialogOpen] = useState(false);
  const [encashData, setEncashData] = useState<{userId: string; leaveType: string; maxDays: number; remaining: number} | null>(null);
  const [encashDays, setEncashDays] = useState(0);

  const [availabilityDialogOpen, setAvailabilityDialogOpen] = useState(false);
  const [availabilityRange, setAvailabilityRange] = useState({start: '', end: ''});
  const [availabilityData, setAvailabilityData] = useState<any>(null);

  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportRange, setReportRange] = useState({start: '', end: ''});
  const [reportData, setReportData] = useState<any>(null);

  const [enterpriseSubmitting, setEnterpriseSubmitting] = useState(false);

  const [applyForm, setApplyForm] = useState({
    type: 'vacation' as Leave['type'],
    startDate: '',
    endDate: '',
    reason: '',
    priority: 'normal' as 'normal' | 'urgent',
    delegateNote: '',
  });

  // ─── Load data on mount ─────────────────────────────────────────
  useEffect(() => {
    loadManagerLeaveData();
  }, [loadManagerLeaveData]);

  const data = managerLeaveData;
  const metrics = data?.metrics;
  const pendingLeaves = data?.pendingLeaves || [];
  const teamBalances = data?.teamBalances || [];
  const upcomingLeaves = data?.upcomingLeaves || [];
  const allTeamLeaves = data?.allTeamLeaves || [];
  const holidays = data?.holidays || [];
  const policies = data?.policies || [];
  const overlapDates = data?.overlapDates || [];
  const coverageRiskDays = data?.coverageRiskDays || [];
  const monthlyStats = data?.monthlyStats || [];
  const typeDistribution = data?.typeDistribution || {};
  const teamMembers = data?.teamMembers || [];

  // ─── Filtered pending leaves ────────────────────────────────────
  const filteredPending = useMemo(() => {
    if (approvalFilter === 'escalated') return pendingLeaves.filter(l => l.isEscalated);
    return pendingLeaves;
  }, [pendingLeaves, approvalFilter]);

  // ─── Filtered history ───────────────────────────────────────────
  const filteredHistory = useMemo(() => {
    let result = allTeamLeaves;
    if (historyFilter !== 'all') result = result.filter(l => l.status === historyFilter);
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      result = result.filter(l => l.userName.toLowerCase().includes(q) || l.type.toLowerCase().includes(q));
    }
    return result;
  }, [allTeamLeaves, historyFilter, historySearch]);

  // ─── Team balances grouped by user ──────────────────────────────
  const balancesByUser = useMemo(() => {
    const map = new Map<string, { userName: string; department: string; balances: typeof teamBalances }>();
    for (const b of teamBalances) {
      if (!map.has(b.userId)) map.set(b.userId, { userName: b.userName, department: b.department, balances: [] });
      map.get(b.userId)!.balances.push(b);
    }
    return Array.from(map.entries());
  }, [teamBalances]);

  // ─── Balance check for a pending leave ──────────────────────────
  const getBalanceForLeave = useCallback((userId: string, leaveType: string) => {
    const bal = teamBalances.find(b => b.userId === userId && b.leaveType.toUpperCase() === leaveType.toUpperCase());
    return bal || null;
  }, [teamBalances]);

  // ─── Selection handlers ─────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedLeaves(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedLeaves(new Set());
      setSelectAll(false);
    } else {
      setSelectedLeaves(new Set(filteredPending.map(l => l.id)));
      setSelectAll(true);
    }
  };

  // ─── Approve/Reject handlers ────────────────────────────────────
  const handleAction = (id: string, status: 'approved' | 'rejected', isBulk = false) => {
    setCommentAction({ id, status, isBulk });
    setCommentText('');
    setCommentDialogOpen(true);
  };

  const confirmAction = async () => {
    if (!commentAction) return;
    try {
      if (commentAction.isBulk) {
        const ids = Array.from(selectedLeaves);
        await bulkApproveLeaves(ids, commentAction.status, commentText || undefined);
        toast.success(`${ids.length} leaves ${commentAction.status}`);
        setSelectedLeaves(new Set());
        setSelectAll(false);
      } else {
        await approveLeave(commentAction.id, commentAction.status, commentText || undefined);
        toast.success(`Leave ${commentAction.status}`);
      }
      setCommentDialogOpen(false);
      setCommentAction(null);
      setCommentText('');
    } catch {
      toast.error(`Failed to ${commentAction.status} leave`);
    }
  };

  // ─── Apply leave handler ────────────────────────────────────────
  const handleApplyLeave = async () => {
    if (!applyForm.startDate || !applyForm.endDate) { toast.error('Please select dates'); return; }
    if (!applyForm.reason.trim()) { toast.error('Please provide a reason'); return; }
    if (applyForm.startDate > applyForm.endDate) { toast.error('End date must be after start date'); return; }
    setSubmitting(true);
    try {
      await applyLeave({
        userId: user!.id,
        type: applyForm.type,
        startDate: applyForm.startDate,
        endDate: applyForm.endDate,
        reason: applyForm.reason.trim(),
      });
      toast.success('Leave application submitted');
      setApplyDialogOpen(false);
      setApplyPreview(false);
      setApplyForm({ type: 'vacation', startDate: '', endDate: '', reason: '', priority: 'normal', delegateNote: '' });
    } catch {
      toast.error('Failed to apply for leave');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Enterprise action handlers ─────────────────────────────────
  const handleRequestDoc = async () => {
    if (!requestDocLeave || !requestDocText.trim()) { toast.error('Please enter a document request message'); return; }
    setEnterpriseSubmitting(true);
    try {
      await requestLeaveDocument(requestDocLeave.id, requestDocText.trim());
      toast.success(`Document requested from ${requestDocLeave.userName}`);
      setRequestDocDialogOpen(false);
      setRequestDocLeave(null);
      setRequestDocText('');
    } catch { toast.error('Failed to request document'); }
    finally { setEnterpriseSubmitting(false); }
  };

  const handleDelegate = async () => {
    if (!delegateLeave || !delegateEmail.trim()) { toast.error('Please enter delegate manager email'); return; }
    setEnterpriseSubmitting(true);
    try {
      await delegateLeaveApproval(delegateLeave.id, delegateEmail.trim(), delegateComment.trim() || 'Delegated by manager');
      toast.success(`Approval delegated for ${delegateLeave.userName}'s leave`);
      setDelegateDialogOpen(false);
      setDelegateLeave(null);
      setDelegateEmail('');
      setDelegateComment('');
    } catch { toast.error('Failed to delegate approval'); }
    finally { setEnterpriseSubmitting(false); }
  };

  const handleModify = async () => {
    if (!modifyLeave || !modifyReason.trim()) { toast.error('Please provide a reason for modification'); return; }
    setEnterpriseSubmitting(true);
    try {
      const changes: { startDate?: string; endDate?: string; type?: string; reason?: string } = {};
      if (modifyForm.startDate && modifyForm.startDate !== modifyLeave.startDate) changes.startDate = modifyForm.startDate;
      if (modifyForm.endDate && modifyForm.endDate !== modifyLeave.endDate) changes.endDate = modifyForm.endDate;
      if (modifyForm.type && modifyForm.type !== modifyLeave.type) changes.type = modifyForm.type;
      if (modifyForm.reason && modifyForm.reason !== modifyLeave.reason) changes.reason = modifyForm.reason;
      await modifyTeamLeave(modifyLeave.id, changes, modifyReason.trim());
      toast.success('Leave modified successfully');
      setModifyDialogOpen(false);
      setModifyLeave(null);
      setModifyForm({ type: '', startDate: '', endDate: '', reason: '' });
      setModifyReason('');
    } catch { toast.error('Failed to modify leave'); }
    finally { setEnterpriseSubmitting(false); }
  };

  const handleCancel = async () => {
    if (!cancelLeave || !cancelReason.trim()) { toast.error('Please provide a cancellation reason'); return; }
    setEnterpriseSubmitting(true);
    try {
      await cancelTeamLeave(cancelLeave.id, cancelReason.trim());
      toast.success(`Leave cancelled for ${cancelLeave.userName}`);
      setCancelDialogOpen(false);
      setCancelLeave(null);
      setCancelReason('');
    } catch { toast.error('Failed to cancel leave'); }
    finally { setEnterpriseSubmitting(false); }
  };

  const handleReturnToWork = async () => {
    if (!returnToWorkLeave || !returnToWorkNotes.trim()) { toast.error('Please add return-to-work notes'); return; }
    setEnterpriseSubmitting(true);
    try {
      await markReturnToWork(returnToWorkLeave.id, returnToWorkNotes.trim());
      toast.success(`${returnToWorkLeave.userName} cleared for return to work`);
      setReturnToWorkDialogOpen(false);
      setReturnToWorkLeave(null);
      setReturnToWorkNotes('');
    } catch { toast.error('Failed to mark return-to-work'); }
    finally { setEnterpriseSubmitting(false); }
  };

  const handleCarryForward = async () => {
    if (!carryForwardData || carryForwardDays <= 0) { toast.error('Please select days to carry forward'); return; }
    setEnterpriseSubmitting(true);
    try {
      await carryForwardLeave(carryForwardData.userId, carryForwardData.leaveType, carryForwardDays, `Carry forward ${carryForwardDays} days`);
      toast.success(`${carryForwardDays} days carried forward for ${carryForwardData.leaveType}`);
      setCarryForwardDialogOpen(false);
      setCarryForwardData(null);
      setCarryForwardDays(0);
    } catch { toast.error('Failed to carry forward leave'); }
    finally { setEnterpriseSubmitting(false); }
  };

  const handleEncash = async () => {
    if (!encashData || encashDays <= 0) { toast.error('Please select days to encash'); return; }
    setEnterpriseSubmitting(true);
    try {
      await encashLeave(encashData.userId, encashData.leaveType, encashDays, `Encash ${encashDays} days`);
      toast.success(`${encashDays} days encashed for ${encashData.leaveType}`);
      setEncashDialogOpen(false);
      setEncashData(null);
      setEncashDays(0);
    } catch { toast.error('Failed to encash leave'); }
    finally { setEnterpriseSubmitting(false); }
  };

  const handleCheckAvailability = async () => {
    if (!availabilityRange.start || !availabilityRange.end) { toast.error('Please select a date range'); return; }
    setEnterpriseSubmitting(true);
    try {
      const result = await getTeamAvailability(availabilityRange.start, availabilityRange.end);
      setAvailabilityData(result);
      toast.success('Team availability loaded');
    } catch { toast.error('Failed to check availability'); }
    finally { setEnterpriseSubmitting(false); }
  };

  const handleGenerateReport = async () => {
    if (!reportRange.start || !reportRange.end) { toast.error('Please select a date range'); return; }
    setEnterpriseSubmitting(true);
    try {
      const result = await getLeaveReport(reportRange.start, reportRange.end);
      setReportData(result);
      toast.success('Report generated');
    } catch { toast.error('Failed to generate report'); }
    finally { setEnterpriseSubmitting(false); }
  };

  // ─── Recently-ended leaves (for Return-to-Work) ─────────────────
  const recentlyEndedLeaves = useMemo(() => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    return allTeamLeaves.filter(l =>
      l.status === 'approved' && l.endDate >= sevenDaysAgo && l.endDate <= TODAY
    );
  }, [allTeamLeaves]);

  // ─── Leaves with pending document requests ──────────────────────
  const pendingDocLeaves = useMemo(() => {
    return allTeamLeaves.filter(l =>
      (l as any).documentRequested === true || (l as any).docRequested === true
    );
  }, [allTeamLeaves]);

  // ─── Delegated leaves (from pending) ────────────────────────────
  const delegatedLeaves = useMemo(() => {
    return pendingLeaves.filter(l => (l as any).delegatedTo || (l as any).isDelegated);
  }, [pendingLeaves]);

  // ─── Loading state ──────────────────────────────────────────────
  if (managerLeaveLoading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <p className="text-sm text-muted-foreground">Loading Team Leave Command Center...</p>
        </div>
      </div>
    );
  }

  // TODAY is defined at module level above
  const teamAvailable = (metrics?.teamSize || 0) - (metrics?.onLeaveToday || 0);
  const riskDaysCount = coverageRiskDays.length;

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════
          1. HEADER SECTION
      ═══════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-3 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20">
              <Shield className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Team Leave Command Center</h1>
                {data?.departmentName && (
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs">
                    {data.departmentName}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {data?.teamSize ? `${data.teamSize} team members` : 'Managing team leaves'} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => loadManagerLeaveData()}
              className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-emerald-500/10 hover:border-emerald-500/30">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button size="sm" onClick={() => { setApplyForm({ type: 'vacation', startDate: '', endDate: '', reason: '', priority: 'normal', delegateNote: '' }); setApplyPreview(false); setApplyDialogOpen(true); }}
              className="gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-lg shadow-emerald-500/20">
              <Plus className="h-3.5 w-3.5" /> My Leave
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════
          2. HERO METRIC CARDS (4 in a row)
      ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* On Leave Today */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="p-5 relative overflow-hidden" hover glow="emerald">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-emerald-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">On Leave Today</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-emerald-400">{metrics?.onLeaveToday || 0}</p>
                  <p className="text-sm text-muted-foreground">/ {metrics?.teamSize || 0}</p>
                </div>
                <p className="text-xs text-emerald-400/80">{teamAvailable} available today</p>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                <Ring value={metrics?.onLeaveToday || 0} max={metrics?.teamSize || 1} size={56} color="#10b981" />
                <span className="absolute text-xs font-bold text-emerald-400">{metrics?.teamSize ? Math.round(((metrics.teamSize - metrics.onLeaveToday) / metrics.teamSize) * 100) : 0}%</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Pending Approvals */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <GlassCard className={cn("p-5 relative overflow-hidden", (metrics?.pendingApprovals || 0) > 0 ? "" : "")} hover glow={(metrics?.pendingApprovals || 0) > 0 ? 'amber' : 'none'}>
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-amber-500/5" />
            {(metrics?.pendingApprovals || 0) > 0 && (
              <div className="absolute inset-0 rounded-xl pointer-events-none">
                <div className="absolute inset-0 rounded-xl ring-1 ring-amber-500/20 animate-pulse" />
              </div>
            )}
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending Approvals</p>
                <p className={cn("text-3xl font-bold", (metrics?.pendingApprovals || 0) > 0 ? "text-amber-400" : "text-slate-400")}>
                  {metrics?.pendingApprovals || 0}
                </p>
                {(metrics?.escalatedCount || 0) > 0 ? (
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-rose-400" />
                    <p className="text-xs text-rose-400">{metrics?.escalatedCount} escalated</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">All caught up</p>
                )}
              </div>
              <div className={cn("rounded-xl p-3 shrink-0", (metrics?.pendingApprovals || 0) > 0 ? "bg-amber-500/10" : "bg-slate-500/10")}>
                <Clock className={cn("h-5 w-5", (metrics?.pendingApprovals || 0) > 0 ? "text-amber-400" : "text-slate-500")} />
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Team Utilization */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard className="p-5 relative overflow-hidden" hover glow="cyan">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-cyan-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Team Utilization</p>
                <p className="text-3xl font-bold text-cyan-400">{metrics?.teamUtilization || 0}%</p>
                <p className="text-xs text-cyan-400/80">{teamAvailable} of {metrics?.teamSize || 0} active</p>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                <Ring value={metrics?.teamUtilization || 0} max={100} size={56} color="#06b6d4" />
                <span className="absolute text-xs font-bold text-cyan-400">{metrics?.teamUtilization || 0}%</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Coverage Risk */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <GlassCard className={cn("p-5 relative overflow-hidden")} hover glow={riskDaysCount > 0 ? 'rose' : 'emerald'}>
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-rose-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Coverage Risk</p>
                <p className={cn("text-3xl font-bold", riskDaysCount > 0 ? "text-rose-400" : "text-emerald-400")}>
                  {riskDaysCount}
                </p>
                <p className={cn("text-xs", riskDaysCount > 0 ? "text-rose-400/80" : "text-emerald-400/80")}>
                  {riskDaysCount > 0 ? 'Risk days in next 14d' : 'No coverage risks'}
                </p>
              </div>
              <div className={cn("rounded-xl p-3 shrink-0", riskDaysCount > 0 ? "bg-rose-500/10" : "bg-emerald-500/10")}>
                <AlertTriangle className={cn("h-5 w-5", riskDaysCount > 0 ? "text-rose-400" : "text-emerald-400")} />
              </div>
            </div>
            {riskDaysCount > 0 && (
              <div className="absolute inset-0 rounded-xl pointer-events-none">
                <div className="absolute inset-0 rounded-xl ring-1 ring-rose-500/15 animate-pulse" />
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════
          3. APPROVAL QUEUE SECTION
      ═══════════════════════════════════════════ */}
      {pendingLeaves.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <GlassCard className="p-6" glow="amber">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="rounded-lg p-2 bg-amber-500/10"><Zap className="h-4 w-4 text-amber-400" /></div>
                <h3 className="font-semibold">Approval Queue</h3>
                <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs">
                  {pendingLeaves.length} pending
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant={approvalFilter === 'all' ? 'default' : 'outline'}
                  className={cn("text-xs h-7", approvalFilter === 'all' ? 'bg-black/[0.06] dark:bg-white/[0.1]' : 'border-black/[0.1] dark:border-white/[0.1]')}
                  onClick={() => setApprovalFilter('all')}>
                  All
                </Button>
                <Button size="sm" variant={approvalFilter === 'escalated' ? 'default' : 'outline'}
                  className={cn("text-xs h-7 gap-1", approvalFilter === 'escalated' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'border-black/[0.1] dark:border-white/[0.1]')}
                  onClick={() => setApprovalFilter('escalated')}>
                  <AlertTriangle className="h-3 w-3" /> Escalated ({pendingLeaves.filter(l => l.isEscalated).length})
                </Button>
              </div>
            </div>

            {/* Bulk actions bar */}
            {selectedLeaves.size > 0 && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1]">
                <span className="text-sm text-muted-foreground">{selectedLeaves.size} selected</span>
                <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-500"
                  onClick={() => handleAction('', 'approved', true)}>
                  <CheckCircle2 className="h-3 w-3" /> Bulk Approve
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-rose-500/20 text-rose-400 hover:bg-rose-500/10"
                  onClick={() => handleAction('', 'rejected', true)}>
                  <XCircle className="h-3 w-3" /> Bulk Reject
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setSelectedLeaves(new Set()); setSelectAll(false); }}>
                  Clear
                </Button>
              </motion.div>
            )}

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {/* Select All */}
              {filteredPending.length > 0 && (
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-black/[0.01] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.05]">
                  <Checkbox checked={selectAll} onCheckedChange={toggleSelectAll} />
                  <span className="text-xs text-muted-foreground">Select All ({filteredPending.length})</span>
                </div>
              )}

              <AnimatePresence>
                {filteredPending.map((leave, i) => {
                  const cfg = getTypeConfig(leave.type);
                  const TypeIcon = cfg.icon;
                  const escalated = leave.isEscalated || isEscalated(leave.createdAt);
                  const balance = getBalanceForLeave(leave.userId, leave.type);
                  const insufficient = balance && balance.remaining < leave.daysCount;

                  return (
                    <motion.div key={leave.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }} transition={{ delay: i * 0.03 }}
                      className={cn(
                        "p-4 rounded-xl border transition-colors group",
                        escalated ? "bg-rose-500/[0.03] border-rose-500/10 hover:border-rose-500/20" :
                        "bg-black/[0.01] dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.05] hover:border-black/[0.1] dark:hover:border-white/[0.1]",
                      )}>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedLeaves.has(leave.id)}
                          onCheckedChange={() => toggleSelect(leave.id)}
                          className="mt-1"
                        />
                        {/* Avatar */}
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center text-sm font-medium border border-black/[0.1] dark:border-white/[0.1] shrink-0">
                          {leave.userName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{leave.userName}</span>
                            <Badge variant="outline" className="text-[10px]" style={{ borderColor: cfg.hex, color: cfg.hex }}>
                              <TypeIcon className="h-2.5 w-2.5 mr-1" />{cfg.label}
                            </Badge>
                            {escalated && (
                              <Badge variant="outline" className="text-[10px] border-rose-500/20 text-rose-400">
                                <AlertTriangle className="h-2.5 w-2.5 mr-1" />48h+
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px] border-black/[0.1] dark:border-white/[0.1]">
                              {leave.daysCount}d
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {leave.startDate} → {leave.endDate}
                          </p>
                          <p className="text-xs text-muted-foreground/80 mt-0.5 truncate">
                            {leave.reason || 'No reason provided'}
                          </p>
                          {/* Balance check */}
                          {balance && (
                            <div className={cn("text-[10px] mt-1 flex items-center gap-1", insufficient ? "text-rose-400" : "text-muted-foreground")}>
                              {insufficient && <AlertCircle className="h-3 w-3" />}
                              Balance: {balance.remaining}/{balance.total} remaining
                              {insufficient && ' — Insufficient balance!'}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1.5 shrink-0 flex-wrap">
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                            onClick={() => { setSelectedLeaveId(leave.id); setActiveView('leave-detail'); }}>
                            <Maximize2 className="h-3 w-3" /> View
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-400"
                            onClick={() => handleAction(leave.id, 'approved')}>
                            <ThumbsUp className="h-3 w-3" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-rose-500/20 hover:bg-rose-500/10 text-rose-400"
                            onClick={() => handleAction(leave.id, 'rejected')}>
                            <ThumbsDown className="h-3 w-3" /> Reject
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-cyan-500/20 hover:bg-cyan-500/10 text-cyan-400"
                            onClick={() => { setRequestDocLeave({ id: leave.id, userName: leave.userName }); setRequestDocText(''); setRequestDocDialogOpen(true); }}>
                            <FileText className="h-3 w-3" /> Doc
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-amber-500/20 hover:bg-amber-500/10 text-amber-400"
                            onClick={() => { setDelegateLeave({ id: leave.id, userName: leave.userName }); setDelegateEmail(''); setDelegateComment(''); setDelegateDialogOpen(true); }}>
                            <UserCheck className="h-3 w-3" /> Delegate
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] text-muted-foreground"
                            onClick={() => {
                              setModifyLeave({ id: leave.id, type: leave.type, startDate: leave.startDate, endDate: leave.endDate, reason: leave.reason || '' });
                              setModifyForm({ type: leave.type, startDate: leave.startDate, endDate: leave.endDate, reason: leave.reason || '' });
                              setModifyReason('');
                              setModifyDialogOpen(true);
                            }}>
                            <Settings2 className="h-3 w-3" /> Modify
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {filteredPending.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <div className="rounded-full p-4 bg-emerald-500/10">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  </div>
                  <p className="text-sm text-emerald-400 font-medium">
                    {approvalFilter === 'escalated' ? 'No escalated leaves' : 'All caught up!'}
                  </p>
                  <p className="text-xs text-muted-foreground">No pending approvals at this time</p>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════
          4. TABS SECTION
      ═══════════════════════════════════════════ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl pb-2">
          <TabsList className="bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1] flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="approvals" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Zap className="h-3 w-3 mr-1" /> Approvals
              {pendingLeaves.length > 0 && <span className="ml-1 bg-amber-500 text-white text-[9px] rounded-full px-1.5 py-0.5">{pendingLeaves.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Calendar className="h-3 w-3 mr-1" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="balances" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Users className="h-3 w-3 mr-1" /> Balances
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <FileText className="h-3 w-3 mr-1" /> History
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <BarChart3 className="h-3 w-3 mr-1" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="actions" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Zap className="h-3 w-3 mr-1" /> Actions
            </TabsTrigger>
            <TabsTrigger value="policies" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <BookOpen className="h-3 w-3 mr-1" /> Policies
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Actions Tab ── */}
        <TabsContent value="actions">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Return-to-Work Panel */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard className="p-6" hover glow="emerald">
                <div className="flex items-center gap-2 mb-4">
                  <div className="rounded-lg p-2 bg-emerald-500/10"><UserCheck className="h-4 w-4 text-emerald-400" /></div>
                  <h3 className="font-semibold">Return-to-Work Clearance</h3>
                  {recentlyEndedLeaves.length > 0 && (
                    <Badge variant="outline" className="text-[10px] border-emerald-500/20 text-emerald-400">{recentlyEndedLeaves.length}</Badge>
                  )}
                </div>
                {recentlyEndedLeaves.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {recentlyEndedLeaves.map(leave => {
                      const cfg = getTypeConfig(leave.type);
                      const Icon = cfg.icon;
                      return (
                        <div key={leave.id} className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] hover:border-black/[0.1] dark:hover:border-white/[0.1] transition-colors">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`rounded p-0.5 shrink-0 ${cfg.iconBg} ${cfg.iconText}`}><Icon className="h-3 w-3" /></div>
                            <span className="text-xs font-medium">{leave.userName}</span>
                            <span className="text-[10px] text-muted-foreground">Ended {leave.endDate}</span>
                          </div>
                          <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 mt-1 border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-400"
                            onClick={() => { setReturnToWorkLeave({ id: leave.id, userName: leave.userName }); setReturnToWorkNotes(''); setReturnToWorkDialogOpen(true); }}>
                            <CheckCircle2 className="h-3 w-3" /> Clear Return
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-6">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400/40" />
                    <p className="text-xs text-muted-foreground">No pending return clearances</p>
                  </div>
                )}
              </GlassCard>
            </motion.div>

            {/* Pending Document Requests */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <GlassCard className="p-6" hover glow="amber">
                <div className="flex items-center gap-2 mb-4">
                  <div className="rounded-lg p-2 bg-amber-500/10"><FileText className="h-4 w-4 text-amber-400" /></div>
                  <h3 className="font-semibold">Pending Documents</h3>
                  {pendingDocLeaves.length > 0 && (
                    <Badge variant="outline" className="text-[10px] border-amber-500/20 text-amber-400">{pendingDocLeaves.length}</Badge>
                  )}
                </div>
                {pendingDocLeaves.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {pendingDocLeaves.map(leave => {
                      const cfg = getTypeConfig(leave.type);
                      const Icon = cfg.icon;
                      return (
                        <div key={leave.id} className="p-3 rounded-lg bg-amber-500/[0.03] border border-amber-500/10">
                          <div className="flex items-center gap-2">
                            <div className={`rounded p-0.5 shrink-0 ${cfg.iconBg} ${cfg.iconText}`}><Icon className="h-3 w-3" /></div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium truncate">{leave.userName}</p>
                              <p className="text-[10px] text-muted-foreground">{cfg.label} · Document pending</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-6">
                    <FileText className="h-6 w-6 text-amber-400/40" />
                    <p className="text-xs text-muted-foreground">No pending document requests</p>
                  </div>
                )}
              </GlassCard>
            </motion.div>

            {/* Delegated Approvals */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <GlassCard className="p-6" hover glow="cyan">
                <div className="flex items-center gap-2 mb-4">
                  <div className="rounded-lg p-2 bg-cyan-500/10"><UserCheck className="h-4 w-4 text-cyan-400" /></div>
                  <h3 className="font-semibold">Delegated Approvals</h3>
                  {delegatedLeaves.length > 0 && (
                    <Badge variant="outline" className="text-[10px] border-cyan-500/20 text-cyan-400">{delegatedLeaves.length}</Badge>
                  )}
                </div>
                {delegatedLeaves.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {delegatedLeaves.map(leave => {
                      const cfg = getTypeConfig(leave.type);
                      const Icon = cfg.icon;
                      return (
                        <div key={leave.id} className="p-3 rounded-lg bg-cyan-500/[0.03] border border-cyan-500/10">
                          <div className="flex items-center gap-2">
                            <div className={`rounded p-0.5 shrink-0 ${cfg.iconBg} ${cfg.iconText}`}><Icon className="h-3 w-3" /></div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium truncate">{leave.userName}</p>
                              <p className="text-[10px] text-muted-foreground">{cfg.label} · Delegated</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-6">
                    <UserCheck className="h-6 w-6 text-cyan-400/40" />
                    <p className="text-xs text-muted-foreground">No delegated approvals</p>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </div>
        </TabsContent>

        {/* ── Approvals Tab (same as section 3 but embedded) ── */}
        <TabsContent value="approvals">
          {pendingLeaves.length === 0 && (
            <GlassCard className="p-8">
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-full p-4 bg-emerald-500/10">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
                <p className="text-lg font-medium text-emerald-400">No Pending Approvals</p>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  All leave requests have been processed. New requests from your team will appear here for approval.
                </p>
              </div>
            </GlassCard>
          )}
        </TabsContent>

        {/* ── Calendar Tab ── */}
        <TabsContent value="calendar">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2">
              <GlassCard className="p-6" hover glow="cyan">
                <div className="flex items-center gap-2 mb-4">
                  <div className="rounded-lg p-2 bg-cyan-500/10 text-cyan-400"><Calendar className="h-4 w-4" /></div>
                  <h3 className="font-semibold">Team Leave Calendar</h3>
                </div>
                <TeamCalendar
                  upcomingLeaves={upcomingLeaves}
                  holidays={holidays}
                  overlapDates={overlapDates}
                  onDateClick={(date, members) => setCalendarDayDetail({ date, members })}
                />
              </GlassCard>
            </motion.div>

            {/* Side panel - upcoming & overlaps */}
            <div className="space-y-4">
              {/* Upcoming leaves list */}
              <GlassCard className="p-5" hover glow="emerald">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays className="h-4 w-4 text-emerald-400" />
                  <h4 className="text-sm font-semibold">Upcoming Leaves</h4>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {upcomingLeaves.length > 0 ? upcomingLeaves.map(l => {
                    const cfg = getTypeConfig(l.type);
                    const Icon = cfg.icon;
                    return (
                      <div key={l.id} className="flex items-center gap-2 p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors">
                        <div className={`rounded p-1 shrink-0 ${cfg.iconBg} ${cfg.iconText}`}><Icon className="h-3 w-3" /></div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{l.userName}</p>
                          <p className="text-[10px] text-muted-foreground">{l.startDate} → {l.endDate}</p>
                        </div>
                      </div>
                    );
                  }) : (
                    <p className="text-xs text-muted-foreground text-center py-4">No upcoming leaves</p>
                  )}
                </div>
              </GlassCard>

              {/* Coverage risk days */}
              {coverageRiskDays.length > 0 && (
                <GlassCard className="p-5" hover glow="rose">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                    <h4 className="text-sm font-semibold">Coverage Risks</h4>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {coverageRiskDays.map((r, i) => (
                      <div key={i} className="p-2 rounded-lg bg-rose-500/[0.05] border border-rose-500/10">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-rose-400">{r.date}</span>
                          <Badge variant="outline" className="text-[10px] border-rose-500/20 text-rose-400">{r.count} away</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{r.members.join(', ')}</p>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}
            </div>
          </div>

          {/* Team Availability Check */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-4">
            <GlassCard className="p-6" hover glow="emerald">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg p-2 bg-emerald-500/10"><Users className="h-4 w-4 text-emerald-400" /></div>
                  <h3 className="font-semibold">Team Availability</h3>
                </div>
                <Button size="sm" variant="outline" className="gap-1.5 border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-400"
                  onClick={() => { setAvailabilityRange({ start: '', end: '' }); setAvailabilityData(null); setAvailabilityDialogOpen(true); }}>
                  <Eye className="h-3.5 w-3.5" /> Check Availability
                </Button>
              </div>
              {availabilityData ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-black/[0.1] dark:border-white/[0.1]">
                        <th className="text-left py-2 px-2 text-muted-foreground font-medium">Member</th>
                        {availabilityData.dates && availabilityData.dates.map((d: string) => (
                          <th key={d} className="py-2 px-1 text-muted-foreground font-medium text-center">{d.slice(5)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {availabilityData.members && availabilityData.members.map((m: any) => (
                        <tr key={m.userId || m.name} className="border-b border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.01] dark:hover:bg-white/[0.02]">
                          <td className="py-2 px-2 font-medium">{m.name || m.userName}</td>
                          {m.availability && m.availability.map((a: any, idx: number) => (
                            <td key={idx} className="py-2 px-1 text-center">
                              <span className={cn("inline-block w-5 h-5 rounded text-[9px] leading-5",
                                a.status === 'available' ? 'bg-emerald-500/20 text-emerald-400' :
                                a.status === 'on-leave' ? 'bg-rose-500/20 text-rose-400' :
                                a.status === 'partial' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-black/[0.03] dark:bg-white/[0.05] text-muted-foreground'
                              )}>
                                {a.status === 'available' ? '✓' : a.status === 'on-leave' ? '✗' : a.status === 'partial' ? '◐' : '—'}
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">Click "Check Availability" to view team availability over a date range</p>
              )}
            </GlassCard>
          </motion.div>
        </TabsContent>
        <TabsContent value="balances">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {balancesByUser.map(([userId, userData], i) => {
              const isExpanded = expandedBalance === userId;
              const mainBalances = ['SICK', 'CASUAL', 'VACATION'];
              const visibleBalances = isExpanded ? userData.balances : userData.balances.filter(b => mainBalances.includes(b.leaveType.toUpperCase()));
              const hasLow = userData.balances.some(b => b.remaining < 3 && b.remaining > 0);

              return (
                <motion.div key={userId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <GlassCard className={cn("p-5 relative overflow-hidden cursor-pointer", hasLow && "border-amber-500/10")} hover glow={hasLow ? 'amber' : 'emerald'}
                    onClick={() => setExpandedBalance(isExpanded ? null : userId)}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center text-sm font-medium border border-black/[0.1] dark:border-white/[0.1]">
                            {userData.userName?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{userData.userName}</p>
                            <p className="text-[10px] text-muted-foreground">{userData.department}</p>
                          </div>
                        </div>
                        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                      </div>

                      {/* Balance rings */}
                      <div className="flex items-center justify-around gap-2">
                        {visibleBalances.map(bal => {
                          const cfg = getTypeConfig(bal.leaveType);
                          const pct = bal.total > 0 ? (bal.remaining / bal.total) * 100 : 0;
                          const isLow = bal.remaining < 3 && bal.remaining > 0;
                          const isZero = bal.remaining === 0;
                          return (
                            <div key={bal.leaveType} className="flex flex-col items-center gap-1">
                              <div className="relative">
                                <Ring value={bal.remaining} max={bal.total} size={40} strokeWidth={4} color={isZero ? '#64748b' : isLow ? '#f59e0b' : cfg.hex} />
                                <span className={cn("absolute text-[10px] font-bold", isZero ? "text-slate-500" : isLow ? "text-amber-400" : cfg.iconText)}
                                  style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
                                  {bal.remaining}
                                </span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">{cfg.label.split(' ')[0]}</span>
                              {isLow && <span className="text-[8px] text-amber-400">Low!</span>}
                            </div>
                          );
                        })}
                      </div>

                      {/* Expanded details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="space-y-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.05]">
                              {userData.balances.map(bal => {
                                const cfg = getTypeConfig(bal.leaveType);
                                const pct = bal.total > 0 ? (bal.remaining / bal.total) * 100 : 0;
                                return (
                                  <div key={bal.leaveType} className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">{cfg.label}</span>
                                    <div className="flex items-center gap-2">
                                      <div className="w-20 h-1.5 rounded-full bg-black/[0.03] dark:bg-white/[0.05] overflow-hidden">
                                        <div className={cn("h-full rounded-full", cfg.progressColor)} style={{ width: `${pct}%` }} />
                                      </div>
                                      <span className="text-[10px] font-medium min-w-[40px] text-right">{bal.remaining}/{bal.total}</span>
                                      {bal.carriedForward > 0 && <span className="text-[8px] text-cyan-400">+{bal.carriedForward}CF</span>}
                                      {/* Carry Forward & Encash buttons */}
                                      {(() => {
                                        const policy = policies.find(p => p.leaveType?.toUpperCase() === bal.leaveType.toUpperCase() || p.name?.toUpperCase().includes(bal.leaveType.toUpperCase()));
                                        return (
                                          <div className="flex gap-1 ml-auto">
                                            {policy?.carriesForward && (
                                              <Button size="sm" variant="outline" className="h-5 text-[8px] gap-0.5 px-1.5 border-cyan-500/20 hover:bg-cyan-500/10 text-cyan-400"
                                                onClick={(e) => { e.stopPropagation(); setCarryForwardData({ userId, leaveType: bal.leaveType, maxDays: policy.maxCarryForward || bal.remaining, remaining: bal.remaining }); setCarryForwardDays(0); setCarryForwardDialogOpen(true); }}>
                                                <ArrowUpRight className="h-2.5 w-2.5" /> CF
                                              </Button>
                                            )}
                                            {policy?.isEncashable && (
                                              <Button size="sm" variant="outline" className="h-5 text-[8px] gap-0.5 px-1.5 border-amber-500/20 hover:bg-amber-500/10 text-amber-400"
                                                onClick={(e) => { e.stopPropagation(); setEncashData({ userId, leaveType: bal.leaveType, maxDays: bal.remaining, remaining: bal.remaining }); setEncashDays(0); setEncashDialogOpen(true); }}>
                                                <Handshake className="h-2.5 w-2.5" /> Encash
                                              </Button>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}

            {balancesByUser.length === 0 && (
              <GlassCard className="p-8 col-span-full">
                <div className="flex flex-col items-center gap-3">
                  <Users className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No team balance data available</p>
                </div>
              </GlassCard>
            )}
          </div>
        </TabsContent>

        {/* ── History Tab ── */}
        <TabsContent value="history">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h3 className="font-semibold">Team Leave History</h3>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input value={historySearch} onChange={e => setHistorySearch(e.target.value)}
                    placeholder="Search employee..."
                    className="pl-8 h-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] w-48" />
                </div>
                <div className="flex gap-1">
                  {['all', 'approved', 'rejected', 'pending'].map(f => (
                    <Button key={f} size="sm" variant={historyFilter === f ? 'default' : 'outline'}
                      className={cn("text-xs h-7", historyFilter === f ? 'bg-black/[0.06] dark:bg-white/[0.1]' : 'border-black/[0.1] dark:border-white/[0.1]')}
                      onClick={() => setHistoryFilter(f)}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                      {f !== 'all' && <span className="ml-1 text-[10px] text-muted-foreground">({allTeamLeaves.filter(l => l.status === f).length})</span>}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {filteredHistory.length > 0 ? (
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className="min-w-[700px]">
                  {/* Table Header */}
                  <div className="grid grid-cols-14 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-black/[0.06] dark:border-white/[0.05]">
                    <div className="col-span-2 whitespace-nowrap">Employee</div>
                    <div className="col-span-2 whitespace-nowrap">Type</div>
                    <div className="col-span-2 whitespace-nowrap">Start</div>
                    <div className="col-span-2 whitespace-nowrap">End</div>
                    <div className="col-span-1">Days</div>
                    <div className="col-span-1">Status</div>
                    <div className="col-span-2 whitespace-nowrap">By</div>
                    <div className="col-span-2 whitespace-nowrap">Actions</div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {filteredHistory.map((leave, i) => {
                      const cfg = getTypeConfig(leave.type);
                      const TypeIcon = cfg.icon;
                      const days = daysBetween(leave.startDate, leave.endDate);
                      return (
                        <motion.div key={leave.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className="grid grid-cols-14 gap-2 px-3 py-3 items-center text-sm hover:bg-black/[0.01] dark:hover:bg-white/[0.02] transition-colors border-b border-black/[0.03] dark:border-white/[0.03]">
                          <div className="col-span-2 flex items-center gap-2 min-w-0">
                            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center text-[10px] font-medium border border-black/[0.1] dark:border-white/[0.1] shrink-0">
                              {leave.userName?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <span className="truncate text-xs font-medium">{leave.userName}</span>
                          </div>
                          <div className="col-span-2 flex items-center gap-1.5">
                            <div className={`rounded p-0.5 shrink-0 ${cfg.iconBg} ${cfg.iconText}`}><TypeIcon className="h-3 w-3" /></div>
                            <span className="text-xs truncate">{cfg.label}</span>
                          </div>
                          <div className="col-span-2 text-xs text-muted-foreground font-mono">{leave.startDate}</div>
                          <div className="col-span-2 text-xs text-muted-foreground font-mono">{leave.endDate}</div>
                          <div className="col-span-1"><Badge variant="outline" className="text-[10px] border-black/[0.1] dark:border-white/[0.1]">{days}d</Badge></div>
                          <div className="col-span-1"><StatusBadge status={leave.status} /></div>
                          <div className="col-span-2 text-[10px] text-muted-foreground truncate">{leave.managerName || '—'}</div>
                          <div className="col-span-2 flex gap-1 justify-end">
                            <Button size="sm" variant="outline" className="h-6 text-[10px] gap-0.5 px-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] text-muted-foreground"
                              onClick={() => { setSelectedLeaveId(leave.id); setActiveView('leave-detail'); }}>
                              <Maximize2 className="h-2.5 w-2.5" /> View
                            </Button>
                            {leave.status === 'approved' && (
                              <Button size="sm" variant="outline" className="h-6 text-[10px] gap-0.5 px-1.5 border-rose-500/20 hover:bg-rose-500/10 text-rose-400"
                                onClick={() => { setCancelLeave({ id: leave.id, userName: leave.userName }); setCancelReason(''); setCancelDialogOpen(true); }}>
                                <XCircle className="h-2.5 w-2.5" /> Cancel
                              </Button>
                            )}
                            {leave.status === 'pending' && (
                              <Button size="sm" variant="outline" className="h-6 text-[10px] gap-0.5 px-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] text-muted-foreground"
                                onClick={() => {
                                  setModifyLeave({ id: leave.id, type: leave.type, startDate: leave.startDate, endDate: leave.endDate, reason: leave.reason || '' });
                                  setModifyForm({ type: leave.type, startDate: leave.startDate, endDate: leave.endDate, reason: leave.reason || '' });
                                  setModifyReason('');
                                  setModifyDialogOpen(true);
                                }}>
                                <Settings2 className="h-2.5 w-2.5" /> Modify
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-12">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground font-medium">No leave history found</p>
                <p className="text-xs text-muted-foreground/70">
                  {historySearch ? 'Try a different search term' : 'Team leave records will appear here'}
                </p>
              </div>
            )}
          </GlassCard>
        </TabsContent>

        {/* ── Analytics Tab ── */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Monthly leave trend - SVG bars */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard className="p-6" hover glow="cyan">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-4 w-4 text-cyan-400" />
                  <h3 className="font-semibold">Monthly Leave Trend</h3>
                </div>
                {monthlyStats.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-end gap-2 h-40">
                      {monthlyStats.slice(-6).map((stat, i) => {
                        const maxDays = Math.max(...monthlyStats.map(s => s.leaveDays), 1);
                        const height = Math.max(8, (stat.leaveDays / maxDays) * 140);
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[10px] text-cyan-400 font-medium">{stat.leaveDays}d</span>
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height }}
                              transition={{ duration: 0.5, delay: i * 0.1 }}
                              className="w-full rounded-t-md bg-gradient-to-t from-cyan-500/60 to-cyan-400/20 min-w-[20px]"
                            />
                            <span className="text-[10px] text-muted-foreground">{stat.month.slice(0, 3)}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-[10px] text-muted-foreground text-center">Leave days per month (last 6 months)</div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No monthly data available</p>
                )}
              </GlassCard>
            </motion.div>

            {/* Leave type distribution - SVG pie */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <GlassCard className="p-6" hover glow="emerald">
                <div className="flex items-center gap-2 mb-4">
                  <PieIcon className="h-4 w-4 text-emerald-400" />
                  <h3 className="font-semibold">Leave Type Distribution</h3>
                </div>
                {Object.keys(typeDistribution).length > 0 ? (
                  <div className="flex items-center gap-6">
                    {/* SVG Pie Chart */}
                    <div className="shrink-0">
                      <svg width={120} height={120} viewBox="-50 -50 100 100">
                        {(() => {
                          const entries = Object.entries(typeDistribution);
                          const total = entries.reduce((s, [, v]) => s + v, 0);
                          let cumulative = 0;
                          return entries.map(([type, count], i) => {
                            const cfg = getTypeConfig(type);
                            const pct = total > 0 ? count / total : 0;
                            const startAngle = cumulative * 360;
                            cumulative += pct;
                            const endAngle = cumulative * 360;
                            const startRad = (startAngle - 90) * Math.PI / 180;
                            const endRad = (endAngle - 90) * Math.PI / 180;
                            const largeArc = pct > 0.5 ? 1 : 0;
                            const x1 = 40 * Math.cos(startRad);
                            const y1 = 40 * Math.sin(startRad);
                            const x2 = 40 * Math.cos(endRad);
                            const y2 = 40 * Math.sin(endRad);
                            if (pct === 0) return null;
                            return (
                              <path key={i}
                                d={`M 0 0 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                fill={cfg.hex}
                                opacity={0.8}
                                className="transition-opacity hover:opacity-100"
                              />
                            );
                          });
                        })()}
                        <circle cx="0" cy="0" r="22" fill="hsl(var(--background))" />
                        <text x="0" y="1" textAnchor="middle" className="text-[10px] fill-foreground font-medium">
                          {Object.values(typeDistribution).reduce((s, v) => s + v, 0)}
                        </text>
                      </svg>
                    </div>
                    {/* Legend */}
                    <div className="space-y-2 flex-1">
                      {Object.entries(typeDistribution).map(([type, count]) => {
                        const cfg = getTypeConfig(type);
                        const total = Object.values(typeDistribution).reduce((s, v) => s + v, 0);
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        return (
                          <div key={type} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cfg.hex }} />
                              <span className="text-xs">{cfg.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">{count}</span>
                              <span className="text-[10px] text-muted-foreground">({pct}%)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No distribution data available</p>
                )}
              </GlassCard>
            </motion.div>

            {/* Team utilization trend */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <GlassCard className="p-6" hover glow="amber">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4 text-amber-400" />
                  <h3 className="font-semibold">Team Utilization Trend</h3>
                </div>
                {monthlyStats.length > 0 ? (
                  <div className="space-y-3">
                    <svg width="100%" height={100} viewBox="0 0 300 100" className="overflow-visible">
                      {(() => {
                        const points = monthlyStats.slice(-6).map((s, i) => ({
                          x: 30 + (i * 48),
                          y: 90 - Math.max(5, (s.leaveCount / (Math.max(...monthlyStats.map(m => m.leaveCount)) || 1)) * 70),
                          count: s.leaveCount,
                          month: s.month,
                        }));
                        const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                        const fillD = pathD + ` L ${points[points.length - 1].x} 90 L ${points[0].x} 90 Z`;
                        return (
                          <>
                            <defs>
                              <linearGradient id="utilGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
                              </linearGradient>
                            </defs>
                            <path d={fillD} fill="url(#utilGrad)" />
                            <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            {points.map((p, i) => (
                              <g key={i}>
                                <circle cx={p.x} cy={p.y} r="3" fill="#f59e0b" />
                                <text x={p.x} y={p.y - 8} textAnchor="middle" className="text-[9px] fill-amber-400">{p.count}</text>
                                <text x={p.x} y={98} textAnchor="middle" className="text-[8px] fill-muted-foreground">{p.month.slice(0, 3)}</text>
                              </g>
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                    <p className="text-[10px] text-muted-foreground text-center">Leave applications per month</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No trend data available</p>
                )}
              </GlassCard>
            </motion.div>

            {/* Key insights */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <GlassCard className="p-6" hover>
                <div className="flex items-center gap-2 mb-4">
                  <Info className="h-4 w-4 text-cyan-400" />
                  <h3 className="font-semibold">Key Insights</h3>
                </div>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                    <div className="flex items-center gap-2 mb-1">
                      <Activity className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-xs font-medium">Team Health</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(metrics?.teamUtilization || 0) >= 85
                        ? 'Team utilization is strong. Most members are available.'
                        : (metrics?.teamUtilization || 0) >= 60
                          ? 'Team utilization is moderate. Monitor upcoming leaves.'
                          : 'Low utilization. Consider redistributing workloads.'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-xs font-medium">Coverage Alert</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {riskDaysCount > 0
                        ? `${riskDaysCount} day(s) with coverage risk in the next 14 days. Consider cross-training.`
                        : 'No coverage risks detected in the next 14 days.'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                    <div className="flex items-center gap-2 mb-1">
                      <CalendarDays className="h-3.5 w-3.5 text-cyan-400" />
                      <span className="text-xs font-medium">This Month</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {metrics?.thisMonthLeaves || 0} leave day(s) used this month by the team.
                    </p>
                  </div>
                  {overlapDates.length > 0 && (
                    <div className="p-3 rounded-lg bg-rose-500/[0.05] border border-rose-500/10">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                        <span className="text-xs font-medium text-rose-400">Overlap Warning</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {overlapDates.length} date(s) with multiple team members on leave simultaneously.
                      </p>
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>

            {/* Leave Report */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
              <GlassCard className="p-6" hover glow="emerald">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg p-2 bg-emerald-500/10"><BarChart3 className="h-4 w-4 text-emerald-400" /></div>
                    <h3 className="font-semibold">Leave Report</h3>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1.5 border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-400"
                    onClick={() => { setReportRange({ start: '', end: '' }); setReportData(null); setReportDialogOpen(true); }}>
                    <BarChart3 className="h-3.5 w-3.5" /> Generate Report
                  </Button>
                </div>
                {reportData ? (
                  <div className="space-y-4">
                    {/* Summary stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                        <p className="text-[10px] text-muted-foreground uppercase">Total Leaves</p>
                        <p className="text-xl font-bold text-emerald-400">{reportData.totalLeaves || 0}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                        <p className="text-[10px] text-muted-foreground uppercase">Total Days</p>
                        <p className="text-xl font-bold text-cyan-400">{reportData.totalDays || 0}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                        <p className="text-[10px] text-muted-foreground uppercase">Avg Days/Member</p>
                        <p className="text-xl font-bold text-amber-400">{reportData.avgDaysPerMember || 0}</p>
                      </div>
                    </div>
                    {/* Breakdown by type */}
                    {reportData.typeBreakdown && Object.keys(reportData.typeBreakdown).length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-2">Breakdown by Type</p>
                        <div className="space-y-2">
                          {Object.entries(reportData.typeBreakdown).map(([type, count]: [string, any]) => {
                            const cfg = getTypeConfig(type);
                            const maxVal = Math.max(...Object.values(reportData.typeBreakdown).map(Number), 1);
                            const pct = (Number(count) / maxVal) * 100;
                            return (
                              <div key={type} className="flex items-center gap-2">
                                <span className="text-xs w-20 text-muted-foreground">{cfg.label}</span>
                                <div className="flex-1 h-3 rounded-full bg-black/[0.03] dark:bg-white/[0.05] overflow-hidden">
                                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: cfg.hex }} />
                                </div>
                                <span className="text-xs font-medium min-w-[30px] text-right">{String(count)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* Breakdown by member */}
                    {reportData.memberBreakdown && Object.keys(reportData.memberBreakdown).length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-2">Breakdown by Member</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {Object.entries(reportData.memberBreakdown).map(([name, days]: [string, any]) => (
                            <div key={name} className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{name}</span>
                              <span className="font-medium">{String(days)} days</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">Click "Generate Report" to create a leave report for a date range</p>
                )}
              </GlassCard>
            </motion.div>
          </div>
        </TabsContent>

        {/* ── Holidays & Policies Tab ── */}
        <TabsContent value="policies">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Holidays */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard className="p-6" hover glow="amber">
                <div className="flex items-center gap-2 mb-4">
                  <CalendarDays className="h-4 w-4 text-amber-400" />
                  <h3 className="font-semibold">Company Holidays</h3>
                  <Badge variant="outline" className="text-[10px] border-amber-500/20 text-amber-400">{holidays.length}</Badge>
                </div>
                {holidays.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {holidays.map(h => {
                      const isPast = h.date < TODAY;
                      const isUpcoming = h.date >= TODAY && h.date <= new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
                      return (
                        <div key={h.id} className={cn(
                          "p-3 rounded-lg border transition-colors",
                          isPast ? "bg-black/[0.005] dark:bg-white/[0.01] border-black/[0.06] dark:border-white/[0.05] opacity-50" :
                          isUpcoming ? "bg-amber-500/[0.05] border-amber-500/10" :
                          "bg-black/[0.02] dark:bg-white/[0.03] border-black/[0.06] dark:border-white/[0.05] hover:border-black/[0.1] dark:hover:border-white/[0.1]",
                        )}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{h.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground font-mono">{h.date.split('T')[0]}</span>
                                <Badge variant="outline" className={cn("text-[10px] h-4",
                                  h.type === 'PUBLIC' ? "border-emerald-500/20 text-emerald-400" :
                                  h.type === 'COMPANY' ? "border-cyan-500/20 text-cyan-400" :
                                  "border-amber-500/20 text-amber-400"
                                )}>{h.type}</Badge>
                                {h.isRecurring && <span className="text-[10px] text-muted-foreground">↻ Annual</span>}
                              </div>
                            </div>
                            {isUpcoming && <Badge className="text-[10px] bg-amber-500/15 text-amber-400 border-0">Upcoming</Badge>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No holidays configured</p>
                )}
              </GlassCard>
            </motion.div>

            {/* Policies */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <GlassCard className="p-6" hover glow="cyan">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="h-4 w-4 text-cyan-400" />
                  <h3 className="font-semibold">Leave Policies</h3>
                  <Badge variant="outline" className="text-[10px] border-cyan-500/20 text-cyan-400">{policies.length}</Badge>
                </div>
                <div className="text-[10px] text-muted-foreground/60 mb-3 flex items-center gap-1">
                  <Info className="h-3 w-3" /> Read-only — Contact HR to modify policies
                </div>
                {policies.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {policies.map(p => (
                      <div key={p.id} className="p-4 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] hover:border-black/[0.1] dark:hover:border-white/[0.1] transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color || '#10b981' }} />
                            <span className="text-sm font-medium">{p.name}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">{p.annualQuota} days/yr</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-[10px] text-muted-foreground">
                          <div className="flex justify-between"><span>Approval</span><span className={p.requiresApproval ? 'text-amber-400' : 'text-emerald-400'}>{p.requiresApproval ? 'Required' : 'Auto'}</span></div>
                          <div className="flex justify-between"><span>Document</span><span>{p.requiresDocument ? `After ${p.documentThresholdDays}d` : 'No'}</span></div>
                          <div className="flex justify-between"><span>Carry Forward</span><span className={p.carriesForward ? 'text-emerald-400' : ''}>{p.carriesForward ? `Max ${p.maxCarryForward}` : 'No'}</span></div>
                          <div className="flex justify-between"><span>Paid</span><span className={p.isPaid ? 'text-emerald-400' : 'text-slate-400'}>{p.isPaid ? 'Yes' : 'No'}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No leave policies configured</p>
                )}
              </GlassCard>
            </motion.div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════
          5. MANAGER'S OWN LEAVE SECTION
      ═══════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <GlassCard className="p-5" hover>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/10">
                <UserCheck className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">My Leave Balance</h3>
                <p className="text-xs text-muted-foreground">Your personal leave allocation</p>
              </div>
            </div>
            <Button size="sm" onClick={() => { setApplyForm({ type: 'vacation', startDate: '', endDate: '', reason: '', priority: 'normal', delegateNote: '' }); setApplyPreview(false); setApplyDialogOpen(true); }}
              className="gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-xs shadow-lg shadow-emerald-500/20">
              <Plus className="h-3.5 w-3.5" /> Apply Leave
            </Button>
          </div>
          {leaveBalance ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {['vacation', 'sick', 'casual', 'maternity'].filter(k => leaveBalance[k]).map(key => {
                const b = leaveBalance[key];
                const cfg = getTypeConfig(key);
                const Icon = cfg.icon;
                const pct = b.total > 0 ? (b.remaining / b.total) * 100 : 0;
                return (
                  <div key={key} className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`rounded p-1 ${cfg.iconBg} ${cfg.iconText}`}><Icon className="h-3 w-3" /></div>
                      <span className="text-xs font-medium">{cfg.label}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold" style={{ color: cfg.hex }}>{b.remaining}</span>
                      <span className="text-[10px] text-muted-foreground">/ {b.total}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/[0.03] dark:bg-white/[0.05] mt-1.5 overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", cfg.progressColor)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-3">No leave balance data available</p>
          )}
        </GlassCard>
      </motion.div>

      {/* ═══════════════════════════════════════════
          6. APPLY LEAVE DIALOG
      ═══════════════════════════════════════════ */}
      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-400" /> Apply for Leave
            </DialogTitle>
            <DialogDescription>Submit a leave application for yourself</DialogDescription>
          </DialogHeader>

          {!applyPreview ? (
            <div className="space-y-5 py-2">
              {/* Leave type selector grid */}
              <div className="space-y-2">
                <Label>Leave Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(leaveTypeConfig).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    const isSelected = applyForm.type.toUpperCase() === key;
                    return (
                      <button key={key} type="button"
                        onClick={() => setApplyForm(f => ({ ...f, type: key.toLowerCase() as Leave['type'] }))}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-lg p-3 border transition-all text-center",
                          isSelected
                            ? `border-current ${cfg.iconBg} ${cfg.iconText} ring-1 ring-current/30`
                            : 'border-black/[0.1] dark:border-white/[0.1] bg-black/[0.01] dark:bg-white/[0.02] text-muted-foreground hover:border-black/[0.12] dark:hover:border-white/[0.2]',
                        )}>
                        <Icon className="h-4 w-4" />
                        <span className="text-[10px] font-medium">{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={applyForm.startDate} onChange={e => setApplyForm(f => ({ ...f, startDate: e.target.value }))}
                    className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" value={applyForm.endDate} onChange={e => setApplyForm(f => ({ ...f, endDate: e.target.value }))}
                    className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
                </div>
              </div>

              {/* Duration preview */}
              {applyForm.startDate && applyForm.endDate && (
                <div className="flex items-center gap-2 text-xs">
                  <CalendarDays className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="text-cyan-400 font-medium">
                    {daysBetween(applyForm.startDate, applyForm.endDate)} day{daysBetween(applyForm.startDate, applyForm.endDate) !== 1 ? 's' : ''}
                  </span>
                  {applyForm.startDate > applyForm.endDate && (
                    <span className="text-rose-400 ml-2">End date must be after start date</span>
                  )}
                </div>
              )}

              {/* Reason */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Reason</Label>
                  <span className="text-xs text-muted-foreground">{applyForm.reason.length}/500</span>
                </div>
                <Textarea value={applyForm.reason} onChange={e => setApplyForm(f => ({ ...f, reason: e.target.value.slice(0, 500) }))}
                  placeholder="Describe the reason for your leave..."
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] min-h-[80px]" />
              </div>

              {/* Priority selector */}
              <div className="space-y-2">
                <Label>Priority</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setApplyForm(f => ({ ...f, priority: 'normal' }))}
                    className={cn("flex items-center gap-2 rounded-lg p-3 border transition-all",
                      applyForm.priority === 'normal'
                        ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/30'
                        : 'border-black/[0.1] dark:border-white/[0.1] text-muted-foreground hover:border-black/[0.12] dark:hover:border-white/[0.2]')}>
                    <Clock className="h-4 w-4" /><span className="text-sm">Normal</span>
                  </button>
                  <button type="button" onClick={() => setApplyForm(f => ({ ...f, priority: 'urgent' }))}
                    className={cn("flex items-center gap-2 rounded-lg p-3 border transition-all",
                      applyForm.priority === 'urgent'
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30'
                        : 'border-black/[0.1] dark:border-white/[0.1] text-muted-foreground hover:border-black/[0.12] dark:hover:border-white/[0.2]')}>
                    <Zap className="h-4 w-4" /><span className="text-sm">Urgent</span>
                  </button>
                </div>
              </div>

              {/* Delegate/handover note */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Handshake className="h-3.5 w-3.5 text-cyan-400" /> Delegate / Handover Note
                </Label>
                <Textarea value={applyForm.delegateNote} onChange={e => setApplyForm(f => ({ ...f, delegateNote: e.target.value }))}
                  placeholder="Who will cover your responsibilities? Any handover notes..."
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] min-h-[60px]" />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setApplyDialogOpen(false)} className="flex-1">Cancel</Button>
                <Button onClick={() => setApplyPreview(true)} className="flex-1 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 gap-1.5">
                  <Eye className="h-3.5 w-3.5" /> Preview
                </Button>
              </div>
            </div>
          ) : (
            /* Preview mode */
            <div className="space-y-4 py-2">
              <GlassCard className="p-4" glow="emerald">
                <h4 className="text-sm font-semibold mb-3">Leave Application Preview</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Type</span><span className="font-medium">{getTypeConfig(applyForm.type).label}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Start</span><span className="font-mono">{applyForm.startDate || '—'}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">End</span><span className="font-mono">{applyForm.endDate || '—'}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Duration</span><span className="font-medium text-cyan-400">
                    {applyForm.startDate && applyForm.endDate ? `${daysBetween(applyForm.startDate, applyForm.endDate)} day(s)` : '—'}
                  </span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Priority</span>
                    <Badge variant="outline" className={applyForm.priority === 'urgent' ? "border-amber-500/20 text-amber-400 text-[10px]" : "border-cyan-500/20 text-cyan-400 text-[10px]"}>
                      {applyForm.priority === 'urgent' ? 'Urgent' : 'Normal'}
                    </Badge>
                  </div>
                  <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.05]">
                    <p className="text-xs text-muted-foreground mb-1">Reason</p>
                    <p className="text-sm">{applyForm.reason || 'No reason provided'}</p>
                  </div>
                  {applyForm.delegateNote && (
                    <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.05]">
                      <p className="text-xs text-muted-foreground mb-1">Handover Note</p>
                      <p className="text-sm">{applyForm.delegateNote}</p>
                    </div>
                  )}
                  {/* Balance warning */}
                  {leaveBalance && applyForm.type && leaveBalance[applyForm.type] && (() => {
                    const bal = leaveBalance[applyForm.type];
                    const needed = applyForm.startDate && applyForm.endDate ? daysBetween(applyForm.startDate, applyForm.endDate) : 0;
                    if (needed > bal.remaining) return (
                      <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 mt-2 flex items-center gap-2">
                        <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                        <span className="text-xs text-rose-400">Insufficient balance: {bal.remaining} days remaining, {needed} requested</span>
                      </div>
                    );
                    return null;
                  })()}
                </div>
              </GlassCard>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setApplyPreview(false)} className="flex-1">
                  <ArrowRight className="h-3.5 w-3.5 mr-1 rotate-180" /> Back to Edit
                </Button>
                <Button onClick={handleApplyLeave} disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 gap-1.5">
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════
          7. APPROVE/REJECT COMMENT DIALOG
      ═══════════════════════════════════════════ */}
      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {commentAction?.status === 'approved' ? (
                <><CheckCircle2 className="h-5 w-5 text-emerald-400" /> Approve Leave</>
              ) : (
                <><XCircle className="h-5 w-5 text-rose-400" /> Reject Leave</>
              )}
            </DialogTitle>
            <DialogDescription>
              {commentAction?.isBulk
                ? `${selectedLeaves.size} leave(s) will be ${commentAction.status}`
                : `This leave will be ${commentAction?.status}`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                Comment <span className="text-[10px] text-muted-foreground">(optional)</span>
              </Label>
              <Textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                placeholder={commentAction?.status === 'approved' ? 'Add an optional note to the employee...' : 'Please provide a reason for rejection...'}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] min-h-[80px]" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setCommentDialogOpen(false); setCommentAction(null); }}>Cancel</Button>
            <Button
              onClick={confirmAction}
              className={cn("gap-1.5",
                commentAction?.status === 'approved'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400'
                  : 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400'
              )}>
              {commentAction?.status === 'approved' ? <ThumbsUp className="h-3.5 w-3.5" /> : <ThumbsDown className="h-3.5 w-3.5" />}
              {commentAction?.status === 'approved' ? 'Confirm Approval' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Calendar day detail dialog */}
      <Dialog open={!!calendarDayDetail} onOpenChange={() => setCalendarDayDetail(null)}>
        <DialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-cyan-400" />
              {calendarDayDetail?.date}
            </DialogTitle>
            <DialogDescription>Team members on leave</DialogDescription>
          </DialogHeader>
          {calendarDayDetail && calendarDayDetail.members.length > 0 ? (
            <div className="space-y-2 py-2">
              {calendarDayDetail.members.map((name, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.03]">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center text-[10px] font-medium border border-black/[0.1] dark:border-white/[0.1]">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm">{name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No one on leave this day</p>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════
          8. REQUEST DOCUMENT DIALOG
      ═══════════════════════════════════════════ */}
      <Dialog open={requestDocDialogOpen} onOpenChange={setRequestDocDialogOpen}>
        <DialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-400" /> Request Document
            </DialogTitle>
            <DialogDescription>
              Request supporting document from {requestDocLeave?.userName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Request Message</Label>
              <Textarea value={requestDocText} onChange={e => setRequestDocText(e.target.value)}
                placeholder="e.g., Please provide a sick note from your doctor..."
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] min-h-[80px]" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRequestDocDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRequestDoc} disabled={enterpriseSubmitting}
              className="gap-1.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400">
              {enterpriseSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {enterpriseSubmitting ? 'Sending...' : 'Send Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════
          9. DELEGATE APPROVAL DIALOG
      ═══════════════════════════════════════════ */}
      <Dialog open={delegateDialogOpen} onOpenChange={setDelegateDialogOpen}>
        <DialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-amber-400" /> Delegate Approval
            </DialogTitle>
            <DialogDescription>
              Delegate approval for {delegateLeave?.userName}&apos;s leave to another manager
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Delegate Manager Email</Label>
              <Input value={delegateEmail} onChange={e => setDelegateEmail(e.target.value)}
                placeholder="manager@example.com"
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
            </div>
            <div className="space-y-2">
              <Label>Comment</Label>
              <Textarea value={delegateComment} onChange={e => setDelegateComment(e.target.value)}
                placeholder="Reason for delegation..."
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] min-h-[60px]" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDelegateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDelegate} disabled={enterpriseSubmitting}
              className="gap-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400">
              {enterpriseSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
              {enterpriseSubmitting ? 'Delegating...' : 'Delegate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════
          10. MODIFY LEAVE DIALOG
      ═══════════════════════════════════════════ */}
      <Dialog open={modifyDialogOpen} onOpenChange={setModifyDialogOpen}>
        <DialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-muted-foreground" /> Modify Leave
            </DialogTitle>
            <DialogDescription>Modify leave details for {modifyLeave?.userName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <select value={modifyForm.type} onChange={e => setModifyForm(f => ({ ...f, type: e.target.value }))}
                className="w-full rounded-md border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.05] px-3 py-2 text-sm">
                {Object.entries(leaveTypeConfig).map(([key, cfg]) => (
                  <option key={key} value={key.toLowerCase()}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={modifyForm.startDate} onChange={e => setModifyForm(f => ({ ...f, startDate: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={modifyForm.endDate} onChange={e => setModifyForm(f => ({ ...f, endDate: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea value={modifyForm.reason} onChange={e => setModifyForm(f => ({ ...f, reason: e.target.value }))}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] min-h-[60px]" />
            </div>
            <div className="space-y-2">
              <Label>Modification Reason <span className="text-rose-400">*</span></Label>
              <Textarea value={modifyReason} onChange={e => setModifyReason(e.target.value)}
                placeholder="Why is this leave being modified?"
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] min-h-[60px]" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModifyDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleModify} disabled={enterpriseSubmitting}
              className="gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400">
              {enterpriseSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Settings2 className="h-3.5 w-3.5" />}
              {enterpriseSubmitting ? 'Modifying...' : 'Modify Leave'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════
          11. CANCEL LEAVE DIALOG
      ═══════════════════════════════════════════ */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-rose-400" /> Cancel Leave
            </DialogTitle>
            <DialogDescription>Cancel approved leave for {cancelLeave?.userName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <span className="text-xs text-rose-400">This will cancel an approved leave. The employee will be notified.</span>
            </div>
            <div className="space-y-2">
              <Label>Cancellation Reason <span className="text-rose-400">*</span></Label>
              <Textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                placeholder="Why is this leave being cancelled?"
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] min-h-[80px]" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Keep Leave</Button>
            <Button onClick={handleCancel} disabled={enterpriseSubmitting}
              className="gap-1.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400">
              {enterpriseSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              {enterpriseSubmitting ? 'Cancelling...' : 'Cancel Leave'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════
          12. RETURN-TO-WORK DIALOG
      ═══════════════════════════════════════════ */}
      <Dialog open={returnToWorkDialogOpen} onOpenChange={setReturnToWorkDialogOpen}>
        <DialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-400" /> Return-to-Work Clearance
            </DialogTitle>
            <DialogDescription>Clear {returnToWorkLeave?.userName} for return to work</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Notes <span className="text-rose-400">*</span></Label>
              <Textarea value={returnToWorkNotes} onChange={e => setReturnToWorkNotes(e.target.value)}
                placeholder="Any observations or fitness notes..."
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] min-h-[80px]" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReturnToWorkDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleReturnToWork} disabled={enterpriseSubmitting}
              className="gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400">
              {enterpriseSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {enterpriseSubmitting ? 'Clearing...' : 'Clear Return'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════
          13. CARRY FORWARD DIALOG
      ═══════════════════════════════════════════ */}
      <Dialog open={carryForwardDialogOpen} onOpenChange={setCarryForwardDialogOpen}>
        <DialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-cyan-400" /> Carry Forward Leave
            </DialogTitle>
            <DialogDescription>
              Carry forward {carryForwardData?.leaveType} days (max {carryForwardData?.maxDays}, remaining {carryForwardData?.remaining})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Days to Carry Forward</Label>
              <Input type="number" min={0} max={carryForwardData?.maxDays || 0}
                value={carryForwardDays} onChange={e => setCarryForwardDays(Number(e.target.value))}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
              {carryForwardData && (
                <p className="text-[10px] text-muted-foreground">
                  Available: {carryForwardData.remaining} days · Max carry forward: {carryForwardData.maxDays} days
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCarryForwardDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCarryForward} disabled={enterpriseSubmitting || carryForwardDays <= 0}
              className="gap-1.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400">
              {enterpriseSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
              {enterpriseSubmitting ? 'Processing...' : 'Carry Forward'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════
          14. ENCASH LEAVE DIALOG
      ═══════════════════════════════════════════ */}
      <Dialog open={encashDialogOpen} onOpenChange={setEncashDialogOpen}>
        <DialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Handshake className="h-5 w-5 text-amber-400" /> Encash Leave
            </DialogTitle>
            <DialogDescription>
              Encash {encashData?.leaveType} days (available: {encashData?.remaining})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Days to Encash</Label>
              <Input type="number" min={0} max={encashData?.remaining || 0}
                value={encashDays} onChange={e => setEncashDays(Number(e.target.value))}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
              {encashData && (
                <p className="text-[10px] text-muted-foreground">
                  Available: {encashData.remaining} days for encashment
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEncashDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEncash} disabled={enterpriseSubmitting || encashDays <= 0}
              className="gap-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400">
              {enterpriseSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Handshake className="h-3.5 w-3.5" />}
              {enterpriseSubmitting ? 'Processing...' : 'Encash'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════
          15. TEAM AVAILABILITY DIALOG
      ═══════════════════════════════════════════ */}
      <Dialog open={availabilityDialogOpen} onOpenChange={setAvailabilityDialogOpen}>
        <DialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-400" /> Check Team Availability
            </DialogTitle>
            <DialogDescription>Select a date range to check team availability</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={availabilityRange.start} onChange={e => setAvailabilityRange(r => ({ ...r, start: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={availabilityRange.end} onChange={e => setAvailabilityRange(r => ({ ...r, end: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAvailabilityDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCheckAvailability} disabled={enterpriseSubmitting}
              className="gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400">
              {enterpriseSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
              {enterpriseSubmitting ? 'Checking...' : 'Check Availability'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════
          16. LEAVE REPORT DIALOG
      ═══════════════════════════════════════════ */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-400" /> Generate Leave Report
            </DialogTitle>
            <DialogDescription>Select a date range for the leave report</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={reportRange.start} onChange={e => setReportRange(r => ({ ...r, start: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={reportRange.end} onChange={e => setReportRange(r => ({ ...r, end: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerateReport} disabled={enterpriseSubmitting}
              className="gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400">
              {enterpriseSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BarChart3 className="h-3.5 w-3.5" />}
              {enterpriseSubmitting ? 'Generating...' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
