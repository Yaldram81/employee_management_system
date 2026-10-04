'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { StatusBadge } from './status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format, subMonths, addMonths, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isWeekend, isSameDay, subDays, differenceInMinutes } from 'date-fns';
import type { AttendanceRecord, AttendanceLog } from '@/lib/types';
import {
  Clock, CheckCircle2, Timer, TrendingUp, Zap, Calendar,
  Play, Square, AlertTriangle, Users, UserCheck,
  ChevronLeft, ChevronRight, Search, Bell, Eye, Shield,
  Activity, Moon, Coffee, BarChart3,
  MapPin, Wifi, XCircle, Loader2, RefreshCw,
  UserX, Briefcase, Clock4, AlertCircle,
  FileDown, ClipboardCheck, Edit3, ArrowUpDown,
  Download, CalendarOff, Globe, ShieldAlert,
  Fingerprint, MonitorSmartphone, UserPlus, X, Check,
  Flame,
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
        return <rect key={i} x={i * barWidth + 1} y={y} width={barWidth - 2} height={barHeight} rx={1.5} fill={color} className="transition-all duration-300" />;
      })}
    </svg>
  );
}

// ─── Status Config ──────────────────────────────────────────────
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
const calStatusDot: Record<string, string> = {
  present: 'bg-emerald-400', late: 'bg-amber-400', absent: 'bg-rose-400',
  'half-day': 'bg-cyan-400', holiday: 'bg-purple-400',
};

function MonthlyAttendanceCalendar({ records }: { records: Array<{ date: string; status: string; firstIn?: string | null; lastOut?: string | null; totalHours?: number | null }> }) {
  const [calDate, setCalDate] = useState(new Date());
  const [calDir, setCalDir] = useState(0);
  const year = calDate.getFullYear();
  const month = calDate.getMonth() + 1;

  const calData = useMemo(() => {
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(new Date(year, month - 1));
    return { days: eachDayOfInterval({ start, end }), startDay: getDay(start) };
  }, [year, month]);

  const getRecord = useCallback((d: string) => records.find(r => r.date === d), [records]);
  const getStatus = useCallback((day: Date) => {
    if (isWeekend(day)) return 'weekend';
    return getRecord(format(day, 'yyyy-MM-dd'))?.status?.toLowerCase() || '';
  }, [getRecord]);

  const summary = useMemo(() => {
    let p = 0, l = 0, a = 0, hd = 0;
    calData.days.forEach(day => { const s = getStatus(day); if (s === 'present') p++; else if (s === 'late') l++; else if (s === 'absent') a++; else if (s === 'half-day') hd++; });
    return { present: p, late: l, absent: a, halfDay: hd };
  }, [calData.days, getStatus]);

  const handleNav = (dir: -1 | 1) => { setCalDir(dir); setCalDate(dir === -1 ? subMonths(calDate, 1) : addMonths(calDate, 1)); };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Team Attendance Calendar</h4>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => { setCalDir(0); setCalDate(new Date()); }} className="text-[10px] h-6 px-2 bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.1]">Today</Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleNav(-1)}><ChevronLeft className="h-3 w-3" /></Button>
          <span className="text-xs font-semibold min-w-[100px] text-center">{format(calDate, 'MMMM yyyy')}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleNav(1)}><ChevronRight className="h-3 w-3" /></Button>
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={`${year}-${month}`} initial={{ opacity: 0, x: calDir >= 0 ? 20 : -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: calDir >= 0 ? -20 : 20 }} transition={{ duration: 0.2 }}>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {CAL_DAY_NAMES.map(d => <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1 uppercase tracking-wider">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: calData.startDay }, (_, i) => <div key={`b-${i}`} className="aspect-square" />)}
            {calData.days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const status = getStatus(day);
              const record = getRecord(dateStr);
              const isToday = isSameDay(day, new Date());
              return (
                <div key={dateStr} className={cn('aspect-square rounded-md border p-1 text-left transition-all',
                  isToday && 'ring-1.5 ring-emerald-500/50',
                  status === 'present' && 'bg-emerald-500/10 border-emerald-500/20',
                  status === 'late' && 'bg-amber-500/10 border-amber-500/20',
                  status === 'absent' && 'bg-rose-500/8 border-rose-500/15',
                  status === 'half-day' && 'bg-cyan-500/10 border-cyan-500/20',
                  status === 'weekend' && 'bg-slate-500/5 border-slate-500/10',
                  !status && !isWeekend(day) && 'bg-black/[0.01] dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.05]',
                )} title={`${format(day, 'MMM d')}: ${status || 'no record'}`}>
                  <div className="flex flex-col h-full justify-between">
                    <div className="flex items-center justify-between">
                      <span className={cn('text-[10px] font-medium leading-none', isToday ? 'text-emerald-400 font-bold' : status === 'weekend' ? 'text-slate-500' : record ? 'text-white' : 'text-muted-foreground')}>{format(day, 'd')}</span>
                      {status && status !== 'weekend' && <div className={cn('h-1 w-1 rounded-full', calStatusDot[status])} />}
                    </div>
                    {record?.firstIn && <p className="text-[7px] text-muted-foreground leading-none truncate">→ {record.firstIn.substring(0, 5)}</p>}
                    {record?.lastOut && <p className="text-[7px] text-muted-foreground leading-none truncate">← {record.lastOut.substring(0, 5)}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="flex flex-wrap items-center gap-2 text-[10px]">
        {[{ l: 'Present', c: summary.present, d: 'bg-emerald-400', t: 'text-emerald-400' }, { l: 'Late', c: summary.late, d: 'bg-amber-400', t: 'text-amber-400' }, { l: 'Absent', c: summary.absent, d: 'bg-rose-400', t: 'text-rose-400' }, { l: 'Half Day', c: summary.halfDay, d: 'bg-cyan-400', t: 'text-cyan-400' }].map(s => (
          <span key={s.l} className="flex items-center gap-1"><div className={cn('h-1.5 w-1.5 rounded-full', s.d)} /><span className={s.t}>{s.c}</span><span className="text-muted-foreground">{s.l}</span></span>
        ))}
      </div>
    </div>
  );
}

// ─── Sort type ────────────────────────────────────────────────
type SortField = 'name' | 'status' | 'clockIn' | 'totalHours';
type SortDir = 'asc' | 'desc';

// ─── Main Component ────────────────────────────────────────────
export function ManagerAttendancePortal() {
  const { user, attendance, attendanceLogs, users, departments, shifts, recalculateAttendance, manualAttendance, resolveMissedPunch } = useEMSStore();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [recalculating, setRecalculating] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Detail sheet
  const [selectedEmployee, setSelectedEmployee] = useState<{ userId: string; userName: string; department: string; status: string; firstIn: string | null; lastOut: string | null; totalHours: number | null; workMode: string; attendanceId?: string } | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  // Manual attendance dialog
  const [manualOpen, setManualOpen] = useState(false);
  const [manualUserId, setManualUserId] = useState('');
  const [manualStatus, setManualStatus] = useState('PRESENT');
  const [manualClockIn, setManualClockIn] = useState('09:00');
  const [manualClockOut, setManualClockOut] = useState('17:00');
  const [manualNote, setManualNote] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualSearchQuery, setManualSearchQuery] = useState('');

  // Resolve missed punch dialog
  const [resolveModal, setResolveModal] = useState<{ userId: string; userName: string; firstIn: string } | null>(null);
  const [resolveTime, setResolveTime] = useState('17:00');

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const today = new Date().toISOString().split('T')[0];

  // ─── Department data ──────────────────────────────────────
  const deptUsers = useMemo(() => {
    if (!user?.departmentId) return users;
    return users.filter(u => u.departmentId === user.departmentId);
  }, [users, user?.departmentId]);

  const deptAttendance = useMemo(() => {
    const ids = new Set(deptUsers.map(u => u.id));
    return attendance.filter(a => ids.has(a.userId));
  }, [attendance, deptUsers]);

  const deptLogs = useMemo(() => {
    const ids = new Set(deptUsers.map(u => u.id));
    return attendanceLogs.filter(l => ids.has(l.userId));
  }, [attendanceLogs, deptUsers]);

  // ─── Metrics ──────────────────────────────────────────────
  const todayRecs = useMemo(() => deptAttendance.filter(a => a.date === today), [deptAttendance, today]);
  const presentCount = todayRecs.filter(a => a.status === 'present' || a.status === 'half-day').length;
  const lateCount = todayRecs.filter(a => a.status === 'late').length;
  const absentCount = todayRecs.filter(a => a.status === 'absent').length;
  const onLeaveCount = Math.max(0, deptUsers.length - todayRecs.length - absentCount);
  const attendanceRate = deptUsers.length > 0 ? Math.round(((presentCount + lateCount) / deptUsers.length) * 100) : 0;
  const avgHours = todayRecs.length > 0 ? todayRecs.reduce((s, a) => s + (a.totalHours || 0), 0) / todayRecs.filter(a => a.totalHours).length : 0;
  const totalAnomalies = (() => {
    const todayLogs = deptLogs.filter(l => { try { return format(new Date(l.punchTime), 'yyyy-MM-dd') === today; } catch { return false; } });
    const missed = todayLogs.filter(l => l.punchType === 'clock-in' && !todayLogs.some(o => o.userId === l.userId && o.punchType === 'clock-out')).length;
    const flagged = todayLogs.filter(l => l.isFlagged).length;
    const lateArr = todayRecs.filter(a => a.status === 'late').length;
    return missed + flagged + lateArr;
  })();

  // ─── Team Status (enhanced) ──────────────────────────────
  const teamStatus = useMemo(() => {
    return deptUsers.map(u => {
      const rec = todayRecs.find(a => a.userId === u.id);
      let status = 'not-arrived';
      if (rec) {
        if (rec.status === 'present' || rec.status === 'half-day') status = rec.firstIn && !rec.lastOut ? 'in-office' : rec.lastOut ? 'left' : 'in-office';
        else if (rec.status === 'late') status = 'late';
        else if (rec.status === 'absent') status = 'absent';
      }
      const userTodayLogs = deptLogs.filter(l => { try { return l.userId === u.id && format(new Date(l.punchTime), 'yyyy-MM-dd') === today; } catch { return false; } }).sort((a, b) => new Date(a.punchTime).getTime() - new Date(b.punchTime).getTime());
      const lastLog = userTodayLogs[userTodayLogs.length - 1];
      return {
        userId: u.id, userName: u.name, department: u.department || '', status,
        firstIn: rec?.firstIn || null, lastOut: rec?.lastOut || null,
        totalHours: rec?.totalHours || null, overtimeHours: rec?.overtimeHours || null,
        workMode: (u as Record<string, unknown>).workMode as string || 'office',
        isEdited: rec?.isEdited || false, editedBy: rec?.editedBy || null,
        attendanceId: rec?.id || '', ipAddress: lastLog?.ipAddress || null,
        isFlagged: userTodayLogs.some(l => l.isFlagged),
        sparklineData: Array.from({ length: 7 }, (_, i) => { const d = subDays(new Date(), 6 - i); const r = deptAttendance.find(a => a.userId === u.id && a.date === format(d, 'yyyy-MM-dd')); return r?.totalHours || 0; }),
        punchLogs: userTodayLogs,
      };
    });
  }, [deptUsers, todayRecs, deptLogs, deptAttendance, today]);

  // ─── Anomalies ────────────────────────────────────────────
  const anomalies = useMemo(() => {
    const todayLogs = deptLogs.filter(l => { try { return format(new Date(l.punchTime), 'yyyy-MM-dd') === today; } catch { return false; } });
    // Missed punches: clocked in but no clock-out
    const missedPunches = todayLogs.filter(l => l.punchType === 'clock-in' && !todayLogs.some(o => o.userId === l.userId && o.punchType === 'clock-out'))
      .map(l => ({ userId: l.userId, userName: l.userName || deptUsers.find(u => u.id === l.userId)?.name || 'Unknown', firstIn: (() => { try { return format(new Date(l.punchTime), 'HH:mm:ss'); } catch { return ''; } })(), attendanceId: deptAttendance.find(a => a.userId === l.userId && a.date === today)?.id || '' }));

    // Late arrivals with streak
    const lateArrivals = todayRecs.filter(a => a.status === 'late').map(a => {
      const shift = shifts.find(s => s.isDefault);
      const lateMinutes = shift && a.firstIn ? (() => { const [h, m] = (a.firstIn || '00:00').split(':').map(Number); const [sh, sm] = (shift.startTime || '09:00').split(':').map(Number); return Math.max(0, (h * 60 + m) - (sh * 60 + sm + (shift.gracePeriod || 0))); })() : 0;
      const streak = deptAttendance.filter(r => r.userId === a.userId && r.status === 'late' && r.date >= subDays(new Date(), 30).toISOString().split('T')[0]).length;
      return { ...a, userName: a.userName || deptUsers.find(u => u.id === a.userId)?.name || 'Unknown', lateMinutes, streak };
    });

    // Early departures
    const earlyDepartures = todayRecs.filter(a => a.lastOut && a.totalHours && a.totalHours < 7).map(a => ({
      ...a, userName: a.userName || deptUsers.find(u => u.id === a.userId)?.name || 'Unknown', departedAt: a.lastOut!, shortBy: +(7 - a.totalHours).toFixed(1),
    }));

    // Flagged entries
    const flaggedEntries = todayLogs.filter(l => l.isFlagged).map(l => ({
      userId: l.userId, userName: l.userName || deptUsers.find(u => u.id === l.userId)?.name || 'Unknown',
      punchType: l.punchType, method: l.method, ipAddress: l.ipAddress || null, flagReason: l.flagReason || 'Flagged',
      time: (() => { try { return format(new Date(l.punchTime), 'HH:mm:ss'); } catch { return l.punchTime; } })(),
    }));

    return { missedPunches, lateArrivals, earlyDepartures, flaggedEntries };
  }, [deptLogs, deptAttendance, deptUsers, shifts, today]);

  // ─── Attendance Table (full featured) ──────────────────────
  const tableData = useMemo(() => {
    const records = dateFrom || dateTo
      ? deptAttendance.filter(a => { const d = a.date; return (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo); })
      : deptAttendance.filter(a => a.date === today);
    return records.map(a => {
      const u = deptUsers.find(du => du.id === a.userId);
      let displayStatus = a.status;
      if (a.date === today) { const ts = teamStatus.find(t => t.userId === a.userId); if (ts) displayStatus = ts.status; }
      return { ...a, userName: a.userName || u?.name || 'Unknown', department: u?.department || '', displayStatus, workMode: (u as Record<string, unknown>)?.workMode as string || 'office' };
    });
  }, [deptAttendance, deptUsers, teamStatus, today, dateFrom, dateTo]);

  const filteredTable = useMemo(() => {
    let data = tableData;
    if (searchQuery) data = data.filter(r => (r.userName || '').toLowerCase().includes(searchQuery.toLowerCase()));
    if (filterStatus !== 'all') data = data.filter(r => r.displayStatus === filterStatus || r.status === filterStatus);
    if (filterEmployee !== 'all') data = data.filter(r => r.userId === filterEmployee);
    return data.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = (a.userName || '').localeCompare(b.userName || '');
      else if (sortField === 'status') cmp = (a.displayStatus || '').localeCompare(b.displayStatus || '');
      else if (sortField === 'clockIn') cmp = (a.firstIn || '').localeCompare(b.firstIn || '');
      else if (sortField === 'totalHours') cmp = (a.totalHours || 0) - (b.totalHours || 0);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [tableData, searchQuery, filterStatus, filterEmployee, sortField, sortDir]);

  // ─── Employee detail data ─────────────────────────────────
  const employeeMonthRecords = useMemo(() => {
    if (!selectedEmployee) return [];
    return deptAttendance.filter(a => a.userId === selectedEmployee.userId)
      .filter(a => { const d = new Date(a.date); return d.getFullYear() === year && d.getMonth() + 1 === month; });
  }, [selectedEmployee, deptAttendance, year, month]);

  const employeeRecentLogs = useMemo(() => {
    if (!selectedEmployee) return [];
    return deptLogs.filter(l => l.userId === selectedEmployee.userId)
      .sort((a, b) => new Date(b.punchTime).getTime() - new Date(a.punchTime).getTime()).slice(0, 20);
  }, [selectedEmployee, deptLogs]);

  const employeeWeekSummary = useMemo(() => {
    if (!selectedEmployee) return { present: 0, late: 0, absent: 0, avgHours: 0 };
    const weekStart = subDays(new Date(), 6);
    const weekRecs = deptAttendance.filter(a => a.userId === selectedEmployee.userId && a.date >= format(weekStart, 'yyyy-MM-dd'));
    return {
      present: weekRecs.filter(a => a.status === 'present' || a.status === 'half-day').length,
      late: weekRecs.filter(a => a.status === 'late').length,
      absent: weekRecs.filter(a => a.status === 'absent').length,
      avgHours: weekRecs.filter(a => a.totalHours).length > 0 ? weekRecs.reduce((s, a) => s + (a.totalHours || 0), 0) / weekRecs.filter(a => a.totalHours).length : 0,
    };
  }, [selectedEmployee, deptAttendance]);

  // ─── Handlers ─────────────────────────────────────────────
  const handleRecalculate = async () => {
    setRecalculating(true);
    try { await recalculateAttendance(today); toast.success('Attendance recalculated'); }
    catch { toast.error('Recalculation failed'); }
    finally { setRecalculating(false); }
  };

  const handleSendReminder = () => {
    const notArrived = teamStatus.filter(m => m.status === 'not-arrived');
    toast.success(`Reminder sent to ${notArrived.length} employee${notArrived.length !== 1 ? 's' : ''}`);
  };

  const openEmployeeDetail = (emp: { userId: string; userName: string; department?: string; status: string; firstIn: string | null; lastOut: string | null; totalHours: number | null; workMode?: string; attendanceId?: string }) => {
    setSelectedEmployee({ userId: emp.userId, userName: emp.userName, department: emp.department || '', status: emp.status, firstIn: emp.firstIn, lastOut: emp.lastOut, totalHours: emp.totalHours, workMode: emp.workMode || 'office', attendanceId: emp.attendanceId });
    setDetailSheetOpen(true);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const toggleRow = (id: string) => setSelectedRows(prev => { const next = new Set(prev); if (next.has(id)) { next.delete(id); } else { next.add(id); } return next; });
  const toggleAll = () => { if (selectedRows.size === filteredTable.length) setSelectedRows(new Set()); else setSelectedRows(new Set(filteredTable.map(r => r.id))); };

  const handleManualAttendance = async () => {
    if (!manualUserId) { toast.error('Select an employee'); return; }
    setManualSubmitting(true);
    try {
      await manualAttendance(manualUserId, manualStatus, manualClockIn || undefined, manualClockOut || undefined, manualNote || undefined);
      toast.success('Manual attendance marked');
      setManualOpen(false); resetManualForm();
    } catch { toast.error('Failed to mark attendance'); }
    finally { setManualSubmitting(false); }
  };

  const handleResolve = async () => {
    if (!resolveModal) return;
    try {
      await resolveMissedPunch(resolveModal.userId, 'CLOCK_OUT', resolveTime, today);
      toast.success(`Resolved clock-out for ${resolveModal.userName}`);
      setResolveModal(null);
    } catch { toast.error('Failed to resolve punch'); }
  };

  const handleCSVExport = () => {
    const headers = ['Date', 'Employee', 'Clock In', 'Clock Out', 'Hours', 'OT', 'Status'];
    const rows = filteredTable.map(r => [r.date, r.userName, r.firstIn || '', r.lastOut || '', r.totalHours?.toFixed(1) || '0', r.overtimeHours?.toFixed(1) || '0', r.status]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `attendance-${today}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const resetManualForm = () => { setManualUserId(''); setManualStatus('PRESENT'); setManualClockIn('09:00'); setManualClockOut('17:00'); setManualNote(''); setManualSearchQuery(''); };

  // ─── Sort icon ────────────────────────────────────────────
  const SortIcon = ({ field }: { field: SortField }) => (
    <ArrowUpDown className={cn('h-3 w-3 ml-1 inline', sortField === field ? 'text-cyan-400' : 'text-muted-foreground/50')} />
  );

  return (
    <div className="space-y-6">
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {departments.find(d => d.id === user?.departmentId)?.name || 'Department'} Attendance Portal
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {format(currentTime, 'EEEE, MMMM d, yyyy')} • {format(currentTime, 'HH:mm:ss')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleRecalculate} disabled={recalculating}
            className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-emerald-500/10 text-xs">
            {recalculating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Recalculate
          </Button>
          <Button size="sm" variant="outline" onClick={() => { resetManualForm(); setManualOpen(true); }}
            className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-emerald-500/10 text-xs">
            <ClipboardCheck className="h-3.5 w-3.5 text-emerald-400" /> Manual Entry
          </Button>
          <Button size="sm" variant="outline" onClick={handleCSVExport}
            className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-cyan-500/10 text-xs">
            <Download className="h-3.5 w-3.5 text-cyan-400" /> Export CSV
          </Button>
        </div>
      </div>

      {/* ═══ Stat Cards ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Present Today', value: presentCount, sub: `${attendanceRate}% rate`, icon: UserCheck, color: 'emerald', glow: true },
          { label: 'Late Arrivals', value: lateCount, sub: anomalies.lateArrivals.reduce((m, a) => Math.max(m, (a as Record<string, unknown>).streak as number || 0), 0) > 0 ? `max ${(anomalies.lateArrivals.reduce((m, a) => Math.max(m, (a as Record<string, unknown>).streak as number || 0), 0))}x streak` : 'no streaks', icon: Clock4, color: 'amber', glow: lateCount > 0 },
          { label: 'Absent', value: absentCount, sub: deptUsers.length > 0 ? `avg ${Math.round(absentCount / deptUsers.length * 100)}%` : '', icon: UserX, color: 'rose', glow: absentCount > 0 },
          { label: 'On Leave', value: onLeaveCount, sub: 'approved', icon: CalendarOff, color: 'cyan', glow: false },
          { label: 'Avg Hours', value: avgHours.toFixed(1), sub: 'today', icon: Timer, color: 'cyan', glow: false },
          { label: 'Anomalies', value: totalAnomalies, sub: totalAnomalies > 0 ? 'needs attention' : 'all clear', icon: AlertTriangle, color: totalAnomalies > 0 ? 'amber' : 'emerald', glow: totalAnomalies > 0 },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <GlassCard className={cn('p-4 relative overflow-hidden', stat.glow && `glow-${stat.color}`)} glow={stat.glow ? stat.color as 'emerald' | 'amber' | 'rose' | 'cyan' : 'none'}>
              <div className={cn('rounded-lg p-2 w-fit mb-2', `bg-${stat.color}-500/10`)}>
                <stat.icon className={cn('h-4 w-4', `text-${stat.color}-400`)} />
              </div>
              <p className={cn('text-2xl font-bold', `text-${stat.color}-400`)}>{stat.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{stat.label}</p>
              <p className={cn('text-[10px] mt-0.5', totalAnomalies > 0 && stat.label === 'Anomalies' ? 'text-amber-400/80' : 'text-muted-foreground/60')}>{stat.sub}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* ═══ Tabs ═══ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1]">
          <TabsTrigger value="overview" className="text-xs data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400">
            <Users className="h-3.5 w-3.5 mr-1.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400">
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Attendance
          </TabsTrigger>
          <TabsTrigger value="calendar" className="text-xs data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-400">
            <Calendar className="h-3.5 w-3.5 mr-1.5" /> Calendar
          </TabsTrigger>
          <TabsTrigger value="anomalies" className="text-xs data-[state=active]:bg-rose-500/10 data-[state=active]:text-rose-400">
            <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Anomalies {totalAnomalies > 0 && <Badge className="ml-1 h-4 px-1 text-[9px] bg-amber-500/20 text-amber-400 border-0">{totalAnomalies}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-xs data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400">
            <FileDown className="h-3.5 w-3.5 mr-1.5" /> Reports
          </TabsTrigger>
        </TabsList>

        {/* ═══ OVERVIEW TAB ═══ */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Quick Actions + Attendance Rate */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="relative flex items-center justify-center">
                    <ProgressRing value={attendanceRate} size={100} strokeWidth={8} color="#10b981" />
                    <div className="absolute text-center"><p className="text-2xl font-bold text-emerald-400">{attendanceRate}%</p><p className="text-[10px] text-muted-foreground">Attendance</p></div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Team Attendance Rate</p>
                    <p className="text-xs text-muted-foreground">{presentCount + lateCount} of {deptUsers.length} employees present</p>
                    <div className="flex items-center gap-1 text-xs text-emerald-400"><TrendingUp className="h-3 w-3" /><span>Live tracking</span></div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="outline" className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-amber-500/10 text-xs" onClick={handleSendReminder}>
                    <Bell className="h-3.5 w-3.5 text-amber-400" /> Send Reminder
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-emerald-500/10 text-xs" onClick={() => { resetManualForm(); setManualOpen(true); }}>
                    <UserPlus className="h-3.5 w-3.5 text-emerald-400" /> Manual Entry
                  </Button>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Enhanced Team Status Grid */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <GlassCard className="p-6" glow="emerald">
              <div className="flex items-center gap-2 mb-4">
                <UserCheck className="h-4 w-4 text-emerald-400" />
                <h3 className="font-semibold">Team Status</h3>
                <Badge variant="outline" className="border-emerald-500/20 text-emerald-400 text-xs">{teamStatus.length} members</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[480px] overflow-y-auto">
                {teamStatus.map((member, i) => {
                  const config = statusConfig[member.status] || statusConfig['not-arrived'];
                  return (
                    <motion.div key={member.userId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                      className="p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.05] hover:border-black/[0.1] dark:hover:border-white/[0.1] cursor-pointer transition-all hover:bg-black/[0.04] dark:hover:bg-white/[0.07]"
                      onClick={() => openEmployeeDetail(member)}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="relative shrink-0">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="text-xs bg-gradient-to-br from-emerald-600 to-cyan-600 text-white">{member.userName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background', config.dot)} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{member.userName}</p>
                            <div className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px]', config.bg, config.text)}>
                              <div className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />{config.label}
                            </div>
                          </div>
                        </div>
                        {member.isFlagged && <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                        <div className="flex items-center gap-3">
                          <span className="font-mono">In: {member.firstIn ? member.firstIn.substring(0, 5) : '—'}</span>
                          <span className="font-mono">Out: {member.lastOut ? member.lastOut.substring(0, 5) : '—'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {member.totalHours != null && <span className="font-mono font-medium">{member.totalHours.toFixed(1)}h</span>}
                          {member.workMode === 'remote' && <Badge variant="outline" className="text-[8px] h-4 px-1 border-cyan-500/20 text-cyan-400">Remote</Badge>}
                          {member.workMode === 'hybrid' && <Badge variant="outline" className="text-[8px] h-4 px-1 border-amber-500/20 text-amber-400">Hybrid</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        {member.ipAddress && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><Wifi className="h-2.5 w-2.5" />{member.ipAddress}</div>
                        )}
                        <div className="flex items-center gap-1 ml-auto">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-black/[0.06] dark:hover:bg-white/[0.1]" onClick={(e) => { e.stopPropagation(); openEmployeeDetail(member); }}>
                            <Eye className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>
        </TabsContent>

        {/* ═══ ATTENDANCE TABLE TAB ═══ */}
        <TabsContent value="attendance" className="space-y-4 mt-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard className="p-0 overflow-hidden">
              {/* Filters */}
              <div className="p-4 border-b border-black/[0.06] dark:border-white/[0.05] space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input placeholder="Search employee..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className="h-8 w-48 pl-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-cyan-500/30" />
                    </div>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="h-8 w-32 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="in-office">In Office</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                        <SelectItem value="not-arrived">Not Arrived</SelectItem>
                        <SelectItem value="on-leave">On Leave</SelectItem>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                      <SelectTrigger className="h-8 w-36 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Employee" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Employees</SelectItem>
                        {deptUsers.filter(u => u.id).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 w-32 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 w-32 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
                  </div>
                </div>
                {/* Status summary bar */}
                <div className="flex flex-wrap gap-2">
                  {Object.entries(statusConfig).map(([key, cfg]) => {
                    const count = teamStatus.filter(e => e.status === key).length;
                    if (count === 0) return null;
                    return (
                      <button key={key} onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}
                        className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all', filterStatus === key ? 'bg-black/[0.06] dark:bg-white/[0.1] ring-1 ring-white/20' : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.05]')}>
                        <div className={cn('h-2 w-2 rounded-full', cfg.dot)} /><span className="text-muted-foreground">{cfg.label}</span><span className="font-medium">{count}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Bulk actions */}
                {selectedRows.size > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                    <span className="text-xs text-cyan-400 font-medium">{selectedRows.size} selected</span>
                    <Button size="sm" variant="outline" className="text-[10px] h-6 gap-1 border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-400"
                      onClick={() => { resetManualForm(); setManualOpen(true); toast.info('Use manual entry for selected employees'); }}>
                      <ClipboardCheck className="h-3 w-3" /> Mark Attendance
                    </Button>
                    <Button size="sm" variant="outline" className="text-[10px] h-6 gap-1 border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]" onClick={() => setSelectedRows(new Set())}>
                      <X className="h-3 w-3" /> Clear
                    </Button>
                  </div>
                )}
              </div>

              {/* Table */}
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-black/[0.1] dark:border-white/[0.1] hover:bg-transparent">
                      <TableHead className="w-10"><Checkbox checked={selectedRows.size === filteredTable.length && filteredTable.length > 0} onCheckedChange={toggleAll} /></TableHead>
                      <TableHead className="text-muted-foreground text-xs cursor-pointer" onClick={() => toggleSort('name')}>Employee {SortIcon({ field: "name" })}</TableHead>
                      <TableHead className="text-muted-foreground text-xs cursor-pointer" onClick={() => toggleSort('clockIn')}>Clock In {SortIcon({ field: "clockIn" })}</TableHead>
                      <TableHead className="text-muted-foreground text-xs">Clock Out</TableHead>
                      <TableHead className="text-muted-foreground text-xs cursor-pointer" onClick={() => toggleSort('totalHours')}>Hours {SortIcon({ field: "totalHours" })}</TableHead>
                      <TableHead className="text-muted-foreground text-xs cursor-pointer" onClick={() => toggleSort('status')}>Status {SortIcon({ field: "status" })}</TableHead>
                      <TableHead className="text-muted-foreground text-xs hidden md:table-cell">Mode</TableHead>
                      <TableHead className="text-muted-foreground text-xs hidden lg:table-cell">Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTable.map((entry) => {
                      const cfg = statusConfig[entry.displayStatus || entry.status] || statusConfig['not-arrived'];
                      const ts = teamStatus.find(t => t.userId === entry.userId);
                      return (
                        <TableRow key={entry.id} onClick={() => openEmployeeDetail({ userId: entry.userId, userName: entry.userName || '', department: entry.department, status: entry.displayStatus || entry.status, firstIn: entry.firstIn || null, lastOut: entry.lastOut || null, totalHours: entry.totalHours ?? null, workMode: entry.workMode, attendanceId: entry.id })}
                          className={cn('cursor-pointer border-black/[0.06] dark:border-white/[0.05] group', entry.isEdited && 'bg-amber-500/[0.02]')}>
                          <TableCell onClick={e => e.stopPropagation()}>
                            <Checkbox checked={selectedRows.has(entry.id)} onCheckedChange={() => toggleRow(entry.id)} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="relative shrink-0">
                                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center text-[10px] font-medium border border-black/[0.1] dark:border-white/[0.1]">
                                  {(entry.userName || '?').charAt(0).toUpperCase()}
                                </div>
                                <div className={cn('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background', cfg.dot)} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate group-hover:text-cyan-400 transition-colors">
                                  {entry.userName}{entry.isEdited && <Edit3 className="h-3 w-3 text-amber-400 inline ml-1" />}
                                </p>
                                <span className="text-[10px] text-muted-foreground">{entry.date}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{entry.firstIn ? entry.firstIn.substring(0, 5) : '—'}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{entry.lastOut ? entry.lastOut.substring(0, 5) : '—'}</TableCell>
                          <TableCell className="text-xs">
                            {entry.totalHours ? `${entry.totalHours.toFixed(1)}h` : '—'}
                            {entry.overtimeHours ? <span className="text-amber-400 ml-0.5">+{entry.overtimeHours.toFixed(1)}h</span> : ''}
                          </TableCell>
                          <TableCell>
                            <div className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs', cfg.bg, cfg.text)}>
                              <div className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />{cfg.label}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {entry.workMode === 'remote' ? <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-cyan-500/20 text-cyan-400">Remote</Badge>
                              : entry.workMode === 'hybrid' ? <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-amber-500/20 text-amber-400">Hybrid</Badge>
                              : <span className="text-xs text-muted-foreground">Office</span>}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">{ts && <Sparkline data={ts.sparklineData} />}</TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredTable.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No records found</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </GlassCard>
          </motion.div>
        </TabsContent>

        {/* ═══ CALENDAR TAB ═══ */}
        <TabsContent value="calendar" className="space-y-4 mt-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard className="p-6" glow="emerald">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-4 w-4 text-emerald-400" />
                <h3 className="font-semibold">Team Monthly Calendar</h3>
              </div>
              {/* Per-employee calendar view */}
              <div className="space-y-6">
                {deptUsers.slice(0, 10).map(u => {
                  const empRecs = deptAttendance.filter(a => a.userId === u.id)
                    .filter(a => { const d = new Date(a.date); return d.getFullYear() === year && d.getMonth() + 1 === month; });
                  return (
                    <div key={u.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-6 w-6"><AvatarFallback className="text-[8px] bg-gradient-to-br from-emerald-600 to-cyan-600 text-white">{u.name.charAt(0)}</AvatarFallback></Avatar>
                        <span className="text-sm font-medium">{u.name}</span>
                        <span className="text-xs text-muted-foreground">{empRecs.filter(r => r.status === 'present' || r.status === 'half-day').length}/{new Date(year, month, 0).getDate()} days</span>
                      </div>
                      <MonthlyAttendanceCalendar records={empRecs} />
                    </div>
                  );
                })}
                {deptUsers.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No team members found</p>}
              </div>
            </GlassCard>
          </motion.div>
        </TabsContent>

        {/* ═══ ANOMALIES TAB ═══ */}
        <TabsContent value="anomalies" className="space-y-4 mt-4">
          {totalAnomalies === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard className="p-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold">All Clear</h3>
                <p className="text-sm text-muted-foreground mt-1">No attendance anomalies detected for your team today</p>
              </GlassCard>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Missed Punches */}
              {anomalies.missedPunches.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <GlassCard className="p-6" glow="amber">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="rounded-lg p-2 bg-amber-500/10"><Clock className="h-4 w-4 text-amber-400" /></div>
                      <h3 className="font-semibold">Missed Punches</h3>
                      <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs">{anomalies.missedPunches.length}</Badge>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {anomalies.missedPunches.map((mp, i) => (
                        <motion.div key={mp.userId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                          className="p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-amber-500/10 hover:border-amber-500/20 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{mp.userName}</p>
                              <p className="text-xs text-muted-foreground">Clocked in at {mp.firstIn?.substring(0, 5)} — no clock-out</p>
                            </div>
                            <Button size="sm" variant="outline" className="shrink-0 ml-2 text-xs h-7 gap-1 border-amber-500/20 hover:bg-amber-500/10 text-amber-400"
                              onClick={() => { setResolveModal({ userId: mp.userId, userName: mp.userName, firstIn: mp.firstIn }); setResolveTime('17:00'); }}>
                              <Edit3 className="h-3 w-3" /> Resolve
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {/* Late Arrivals */}
              {anomalies.lateArrivals.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                  <GlassCard className="p-6" glow="amber">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="rounded-lg p-2 bg-amber-500/10"><Clock4 className="h-4 w-4 text-amber-400" /></div>
                      <h3 className="font-semibold">Late Arrivals</h3>
                      <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs">{anomalies.lateArrivals.length}</Badge>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {anomalies.lateArrivals.map((entry: Record<string, unknown>, i: number) => (
                        <motion.div key={entry.userId as string} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                          className="p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-amber-500/10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center h-7 w-7 rounded-full bg-amber-500/10 text-amber-400 text-sm font-bold">{i + 1}</div>
                              <div>
                                <p className="text-sm font-medium">{entry.userName as string}</p>
                                <p className="text-xs text-muted-foreground">Arrived at {(entry.firstIn as string)?.substring(0, 5) || '—'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="border-amber-500/20 text-amber-400 text-xs">+{entry.lateMinutes as number} min</Badge>
                              {(entry.streak as number) > 1 && (
                                <Badge variant="outline" className="border-rose-500/20 text-rose-400 text-[10px] gap-0.5">
                                  <Flame className="h-2.5 w-2.5" />{entry.streak as number}x
                                </Badge>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {/* Early Departures */}
              {anomalies.earlyDepartures.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <GlassCard className="p-6" glow="amber">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="rounded-lg p-2 bg-amber-500/10"><Moon className="h-4 w-4 text-amber-400" /></div>
                      <h3 className="font-semibold">Early Departures</h3>
                      <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs">{anomalies.earlyDepartures.length}</Badge>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {anomalies.earlyDepartures.map((entry: Record<string, unknown>, i: number) => (
                        <motion.div key={entry.userId as string} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                          className="p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-amber-500/10">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{entry.userName as string}</p>
                              <p className="text-xs text-muted-foreground">Left at {(entry.departedAt as string)?.substring(0, 5)} — {entry.shortBy as number}h short</p>
                            </div>
                            <Badge variant="outline" className="border-amber-500/20 text-amber-400 text-xs">-{entry.shortBy as number}h</Badge>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {/* Flagged Entries */}
              {anomalies.flaggedEntries.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                  <GlassCard className="p-6" glow="rose">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="rounded-lg p-2 bg-rose-500/10"><ShieldAlert className="h-4 w-4 text-rose-400" /></div>
                      <h3 className="font-semibold">Flagged Entries</h3>
                      <Badge variant="outline" className="border-rose-500/30 text-rose-400 text-xs">{anomalies.flaggedEntries.length}</Badge>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {anomalies.flaggedEntries.map((entry: Record<string, unknown>, i: number) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                          className="p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-rose-500/10">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{entry.userName as string}</p>
                              <p className="text-xs text-muted-foreground">{(entry.punchType as string) === 'clock-in' ? 'Clock-in' : 'Clock-out'} at {entry.time as string} via {entry.method as string}</p>
                              {entry.ipAddress && <p className="text-xs text-amber-400/80 font-mono mt-0.5">IP: {entry.ipAddress as string}</p>}
                            </div>
                            <Badge variant="outline" className="border-rose-500/20 text-rose-400 text-[10px]">
                              {(entry.flagReason as string)?.replace(/_/g, ' ') || 'Flagged'}
                            </Badge>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ═══ REPORTS TAB ═══ */}
        <TabsContent value="reports" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CSV Export */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileDown className="h-4 w-4 text-cyan-400" /><h3 className="font-semibold">Export Data</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Download attendance records as CSV for payroll or analysis.</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-muted-foreground">From</label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="mt-1 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs h-8" /></div>
                    <div><label className="text-xs font-medium text-muted-foreground">To</label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="mt-1 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs h-8" /></div>
                  </div>
                  <Button onClick={handleCSVExport} className="w-full bg-cyan-600 hover:bg-cyan-700 gap-2 text-xs">
                    <Download className="h-4 w-4" /> Download CSV ({filteredTable.length} records)
                  </Button>
                </div>
              </GlassCard>
            </motion.div>

            {/* Attendance Summary Report */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <GlassCard className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-4 w-4 text-emerald-400" /><h3 className="font-semibold">Attendance Summary</h3>
                </div>
                <div className="space-y-3">
                  {/* 7-day trend */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">7-Day Trend</p>
                    <div className="flex items-end gap-1 h-16">
                      {Array.from({ length: 7 }, (_, i) => {
                        const d = subDays(new Date(), 6 - i);
                        const dayRecs = deptAttendance.filter(a => a.date === format(d, 'yyyy-MM-dd'));
                        const rate = dayRecs.length > 0 ? Math.round(dayRecs.filter(a => a.status === 'present' || a.status === 'late').length / Math.max(deptUsers.length, 1) * 100) : 0;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div className={cn('w-full rounded-t', rate >= 80 ? 'bg-emerald-500/40' : rate >= 50 ? 'bg-amber-500/40' : 'bg-rose-500/40')}
                              style={{ height: `${Math.max(rate, 5)}%` }} />
                            <span className="text-[8px] text-muted-foreground">{format(d, 'EEE')}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />
                  {/* Summary stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-emerald-500/5"><span className="text-muted-foreground">Present Rate</span><p className="font-bold text-emerald-400">{attendanceRate}%</p></div>
                    <div className="p-2 rounded-lg bg-amber-500/5"><span className="text-muted-foreground">Late Rate</span><p className="font-bold text-amber-400">{deptUsers.length > 0 ? Math.round(lateCount / deptUsers.length * 100) : 0}%</p></div>
                    <div className="p-2 rounded-lg bg-cyan-500/5"><span className="text-muted-foreground">Avg Hours</span><p className="font-bold text-cyan-400">{avgHours.toFixed(1)}h</p></div>
                    <div className="p-2 rounded-lg bg-rose-500/5"><span className="text-muted-foreground">Anomaly Rate</span><p className="font-bold text-rose-400">{deptUsers.length > 0 ? Math.round(totalAnomalies / deptUsers.length * 100) : 0}%</p></div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* Overtime Report */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <GlassCard className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Timer className="h-4 w-4 text-amber-400" /><h3 className="font-semibold">Overtime Report</h3>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {todayRecs.filter(a => a.overtimeHours && a.overtimeHours > 0).map(a => (
                    <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.05]">
                      <div><p className="text-sm font-medium">{a.userName || 'Unknown'}</p><p className="text-xs text-muted-foreground">{a.totalHours?.toFixed(1)}h total</p></div>
                      <Badge variant="outline" className="border-amber-500/20 text-amber-400 text-xs">+{a.overtimeHours?.toFixed(1)}h OT</Badge>
                    </div>
                  ))}
                  {todayRecs.filter(a => a.overtimeHours && a.overtimeHours > 0).length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No overtime today</p>}
                </div>
              </GlassCard>
            </motion.div>

            {/* Team Availability */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <GlassCard className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-4 w-4 text-cyan-400" /><h3 className="font-semibold">Team Availability</h3>
                </div>
                <div className="space-y-2">
                  {teamStatus.slice(0, 8).map(m => {
                    const cfg = statusConfig[m.status] || statusConfig['not-arrived'];
                    return (
                      <div key={m.userId} className="flex items-center justify-between p-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.05]">
                        <div className="flex items-center gap-2">
                          <div className={cn('h-2 w-2 rounded-full', cfg.dot)} />
                          <span className="text-sm">{m.userName}</span>
                        </div>
                        <span className={cn('text-xs', cfg.text)}>{cfg.label}</span>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══ ATTENDANCE DETAIL SHEET ═══ */}
      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg bg-background/95 backdrop-blur-xl border-l border-black/[0.1] dark:border-white/[0.1] overflow-y-auto">
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
                  <div className="ml-auto">
                    <div className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs', (statusConfig[selectedEmployee.status] || statusConfig['not-arrived']).bg, (statusConfig[selectedEmployee.status] || statusConfig['not-arrived']).text)}>
                      <div className={cn('h-1.5 w-1.5 rounded-full', (statusConfig[selectedEmployee.status] || statusConfig['not-arrived']).dot)} />
                      {(statusConfig[selectedEmployee.status] || statusConfig['not-arrived']).label}
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <Separator className="bg-black/[0.03] dark:bg-white/[0.05] mb-4" />

              {/* Today's Timeline */}
              <div className="space-y-3 mb-6">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Today&apos;s Timeline</h4>
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
                    <p className="text-sm font-mono font-medium">{selectedEmployee.totalHours != null ? `${selectedEmployee.totalHours.toFixed(1)}h` : '—'}</p>
                  </div>
                </div>
                {/* Visual timeline bar */}
                {selectedEmployee.firstIn && (
                  <div className="relative h-6 bg-black/[0.03] dark:bg-white/[0.05] rounded-full overflow-hidden">
                    {(() => {
                      const startH = parseInt(selectedEmployee.firstIn?.split(':')[0] || '9');
                      const endH = selectedEmployee.lastOut ? parseInt(selectedEmployee.lastOut?.split(':')[0] || '17') : new Date().getHours();
                      const left = Math.max(0, ((startH - 6) / 14) * 100);
                      const width = Math.max(2, ((Math.min(endH, 20) - Math.max(startH, 6)) / 14) * 100);
                      return <div className="absolute top-0 h-full bg-gradient-to-r from-emerald-500/40 to-cyan-500/40 rounded-full" style={{ left: `${left}%`, width: `${width}%` }} />;
                    })()}
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">
                      {selectedEmployee.firstIn?.substring(0, 5)} → {selectedEmployee.lastOut?.substring(0, 5) || 'now'}
                    </div>
                  </div>
                )}
              </div>

              {/* Week Summary */}
              <div className="space-y-3 mb-6">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Week Summary</h4>
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/5 text-center"><p className="text-lg font-bold text-emerald-400">{employeeWeekSummary.present}</p><p className="text-[10px] text-muted-foreground">Present</p></div>
                  <div className="p-2 rounded-lg bg-amber-500/5 text-center"><p className="text-lg font-bold text-amber-400">{employeeWeekSummary.late}</p><p className="text-[10px] text-muted-foreground">Late</p></div>
                  <div className="p-2 rounded-lg bg-rose-500/5 text-center"><p className="text-lg font-bold text-rose-400">{employeeWeekSummary.absent}</p><p className="text-[10px] text-muted-foreground">Absent</p></div>
                  <div className="p-2 rounded-lg bg-cyan-500/5 text-center"><p className="text-lg font-bold text-cyan-400">{employeeWeekSummary.avgHours.toFixed(1)}</p><p className="text-[10px] text-muted-foreground">Avg Hrs</p></div>
                </div>
              </div>

              <Separator className="bg-black/[0.03] dark:bg-white/[0.05] mb-4" />

              {/* Monthly Calendar */}
              <div className="mb-6">
                <MonthlyAttendanceCalendar records={employeeMonthRecords} />
              </div>

              <Separator className="bg-black/[0.03] dark:bg-white/[0.05] mb-4" />

              {/* Recent Punch Logs (last 30 days) */}
              <div className="space-y-3 mb-6">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent Punch Logs</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {employeeRecentLogs.length > 0 ? employeeRecentLogs.map((log, i) => {
                    const time = (() => { try { return format(new Date(log.punchTime), 'MMM d, HH:mm:ss'); } catch { return log.punchTime; } })();
                    const isClockIn = log.punchType === 'clock-in';
                    const methodIcon = log.method === 'face' ? Fingerprint : log.method === 'pin' ? Shield : log.method === 'web' ? MonitorSmartphone : Edit3;
                    const MethodIcon = methodIcon;
                    return (
                      <motion.div key={log.id} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                        className="flex items-start gap-3 p-2.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.05]">
                        <div className={cn('h-7 w-7 rounded-full flex items-center justify-center shrink-0', isClockIn ? 'bg-emerald-500/10' : 'bg-rose-500/10')}>
                          <MethodIcon className={cn('h-3.5 w-3.5', isClockIn ? 'text-emerald-400' : 'text-rose-400')} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium font-mono">{time}</span>
                            <Badge variant="outline" className={cn('text-[10px] h-4 px-1', isClockIn ? 'border-emerald-500/20 text-emerald-400' : 'border-rose-500/20 text-rose-400')}>
                              {isClockIn ? 'In' : 'Out'}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] h-4 px-1 border-black/[0.1] dark:border-white/[0.1]">{log.method}</Badge>
                          </div>
                          {log.ipAddress && <p className="text-xs text-muted-foreground font-mono mt-0.5">IP: {log.ipAddress}</p>}
                          {log.isFlagged && <div className="flex items-center gap-1 mt-1"><AlertTriangle className="h-3 w-3 text-amber-400" /><span className="text-xs text-amber-400">{log.flagReason?.replace(/_/g, ' ') || 'Flagged'}</span></div>}
                        </div>
                      </motion.div>
                    );
                  }) : <p className="text-xs text-muted-foreground text-center py-4">No punch logs found</p>}
                </div>
              </div>

              {/* Manager Actions */}
              <div className="space-y-2 pt-4 border-t border-black/[0.06] dark:border-white/[0.05]">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Manager Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs border-black/[0.1] dark:border-white/[0.1] hover:bg-emerald-500/10 text-emerald-400"
                    onClick={() => { resetManualForm(); setManualUserId(selectedEmployee.userId); setManualOpen(true); }}>
                    <Edit3 className="h-3.5 w-3.5" /> Edit Attendance
                  </Button>
                  {!selectedEmployee.lastOut && selectedEmployee.firstIn && (
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs border-amber-500/20 hover:bg-amber-500/10 text-amber-400"
                      onClick={() => { setResolveModal({ userId: selectedEmployee.userId, userName: selectedEmployee.userName, firstIn: selectedEmployee.firstIn || '' }); setResolveTime('17:00'); }}>
                      <Edit3 className="h-3.5 w-3.5" /> Add Clock-Out
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs border-rose-500/20 hover:bg-rose-500/10 text-rose-400"
                    onClick={() => toast.info('Entry flagged for review')}>
                    <AlertTriangle className="h-3.5 w-3.5" /> Flag Entry
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ═══ MANUAL ATTENDANCE DIALOG ═══ */}
      <Dialog open={manualOpen} onOpenChange={open => { setManualOpen(open); if (!open) resetManualForm(); }}>
        <DialogContent className="bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-emerald-400" /> Manual Attendance</DialogTitle>
            <DialogDescription>Mark attendance manually for a team member.</DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400/80">Manual entries are logged with your manager ID. Use only when face recognition is unavailable.</p>
            </div>
          </div>
          <div className="space-y-4">
            {/* Employee selector */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Select Team Member</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search by name..." value={manualSearchQuery} onChange={e => setManualSearchQuery(e.target.value)}
                  className="pl-8 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs" />
              </div>
              <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-black/[0.06] dark:border-white/[0.05]">
                {deptUsers.filter(u => !manualSearchQuery || u.name.toLowerCase().includes(manualSearchQuery.toLowerCase())).slice(0, 15).map(u => (
                  <button key={u.id} onClick={() => { setManualUserId(u.id); setManualSearchQuery(''); }}
                    className={cn('w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors text-left', manualUserId === u.id && 'bg-emerald-500/10 text-emerald-400')}>
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center text-[10px] font-medium border border-black/[0.1] dark:border-white/[0.1] shrink-0">{u.name.charAt(0)}</div>
                    <span className="truncate font-medium">{u.name}</span>
                    {manualUserId === u.id && <Check className="h-3.5 w-3.5 text-emerald-400 ml-auto shrink-0" />}
                  </button>
                ))}
                {manualUserId && (
                  <div className="px-3 py-2 bg-emerald-500/5 border-t border-emerald-500/10">
                    <p className="text-xs text-emerald-400 font-medium">Selected: {deptUsers.find(u => u.id === manualUserId)?.name || 'Unknown'}</p>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Attendance Status</label>
              <Select value={manualStatus} onValueChange={setManualStatus}>
                <SelectTrigger className="mt-1 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRESENT">✅ Present</SelectItem>
                  <SelectItem value="ABSENT">❌ Absent</SelectItem>
                  <SelectItem value="LATE">⏰ Late</SelectItem>
                  <SelectItem value="HALF_DAY">🕐 Half-Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Clock-In</label><Input type="time" value={manualClockIn} onChange={e => setManualClockIn(e.target.value)} className="mt-1 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs h-8" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Clock-Out</label><Input type="time" value={manualClockOut} onChange={e => setManualClockOut(e.target.value)} className="mt-1 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs h-8" /></div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Reason</label>
              <textarea value={manualNote} onChange={e => setManualNote(e.target.value)} placeholder="Reason for manual entry..." rows={2}
                className="mt-1 w-full rounded-md bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1] text-xs px-3 py-2 placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/30 resize-none" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setManualOpen(false)} className="border-black/[0.1] dark:border-white/[0.1] text-xs">Cancel</Button>
            <Button onClick={handleManualAttendance} disabled={manualSubmitting || !manualUserId} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 text-xs">
              {manualSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />} Mark Attendance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ RESOLVE MISSED PUNCH DIALOG ═══ */}
      <Dialog open={!!resolveModal} onOpenChange={open => !open && setResolveModal(null)}>
        <DialogContent className="bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-amber-400" /> Resolve Missed Punch</DialogTitle>
            <DialogDescription>
              {resolveModal && `${resolveModal.userName} clocked in at ${resolveModal.firstIn?.substring(0, 5)} but never clocked out.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div><label className="text-xs font-medium text-muted-foreground">Clock-Out Time</label>
              <Input type="time" value={resolveTime} onChange={e => setResolveTime(e.target.value)} className="mt-1 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-400/80">This will insert a manual CLOCK_OUT record. The edit will be logged with your manager ID.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveModal(null)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleResolve} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"><Check className="h-4 w-4" /> Resolve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
