'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { StatCard } from './stat-card';
import { StatusBadge } from './status-badge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  format, subMonths, addMonths, parseISO,
  startOfMonth, endOfMonth, eachDayOfInterval, getDay, getWeek,
  isWeekend, isSameDay, isToday, differenceInMinutes,
} from 'date-fns';
import type { AttendanceRecord, AttendanceLog } from '@/lib/types';
import {
  Clock, CheckCircle2, Timer, TrendingUp, Zap, Calendar,
  Play, Square, Sun, ArrowRight, AlertTriangle,
  ChevronLeft, ChevronRight, Activity,
  Flame, Award, BarChart3, Loader2,
  Download, Eye, Pencil, Info,
  CircleDot, Monitor, Fingerprint, Globe,
  X, Send, FileEdit, Clock4, Repeat, ArrowLeftRight,
  HandCoins, Briefcase, MapPin, BadgeDollarSign,
  Coffee, Navigation, MapPinned,
} from 'lucide-react';
import { attendanceStatusColorMap as statusColorMap, attendanceStatusDotMap as statusDotMap, workModeConfig, fadeIn, MiniDonut, PageSkeleton } from './shared';

// statusColorMap and statusDotMap imported from ./shared

// ─── Method Icon ────────────────────────────────────────────────
function MethodIcon({ method, className }: { method?: string; className?: string }) {
  const cls = cn('h-3.5 w-3.5', className);
  switch (method) {
    case 'face': return <Fingerprint className={cls} />;
    case 'pin': return <CircleDot className={cls} />;
    case 'web': return <Globe className={cls} />;
    case 'manual': return <Pencil className={cls} />;
    default: return <Monitor className={cls} />;
  }
}

// ─── GPS Location Hook ─────────────────────────────────────────
type GPSStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';
type GPSData = { latitude: number; longitude: number; accuracy: number } | null;

function useGPSLocation() {
  const [gpsData, setGpsData] = useState<GPSData>(null);
  const [gpsStatus, setGpsStatus] = useState<GPSStatus>('idle');

  const requestGPS = useCallback((): Promise<GPSData> => {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setGpsStatus('unavailable');
        resolve(null);
        return;
      }

      setGpsStatus('requesting');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const data: GPSData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setGpsData(data);
          setGpsStatus('granted');
          resolve(data);
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setGpsStatus('denied');
          } else {
            setGpsStatus('unavailable');
          }
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }, []);

  return { gpsData, gpsStatus, requestGPS };
}

// ─── Day Names ──────────────────────────────────────────────────
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ProgressRing imported from ./shared

// ─── MiniBarChart (for weekly hours) ────────────────────────────
function MiniBarChart({ data, target = 8 }: { data: { day: string; hours: number; ot: number }[]; target?: number }) {
  const maxHours = Math.max(target + 2, ...data.map(d => d.hours));
  const barWidth = 36;
  const chartHeight = 180;
  const barGap = 16;
  const totalWidth = data.length * (barWidth + barGap) - barGap + 40;
  const leftPad = 20;
  const bottomPad = 28;

  return (
    <svg width="100%" viewBox={`0 0 ${totalWidth} ${chartHeight + bottomPad + 10}`} className="w-full max-w-md">
      {/* Grid lines */}
      {[0, target / 2, target, target + 2].map((val) => {
        const y = chartHeight - (val / maxHours) * chartHeight;
        return (
          <g key={val}>
            <line x1={leftPad} y1={y} x2={totalWidth} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={leftPad - 4} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="9">{val}h</text>
          </g>
        );
      })}
      {/* Target line */}
      <line
        x1={leftPad} y1={chartHeight - (target / maxHours) * chartHeight}
        x2={totalWidth} y2={chartHeight - (target / maxHours) * chartHeight}
        stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 3" opacity="0.5"
      />
      {/* Bars */}
      {data.map((d, i) => {
        const x = leftPad + 10 + i * (barWidth + barGap);
        const regH = Math.max(0, d.hours - d.ot);
        const regHeight = (regH / maxHours) * chartHeight;
        const otHeight = (d.ot / maxHours) * chartHeight;
        const totalBarHeight = regHeight + otHeight;
        return (
          <g key={d.day}>
            <title>{`${d.day}: ${d.hours.toFixed(1)}h${d.ot > 0 ? ` (${d.ot.toFixed(1)}h OT)` : ''}`}</title>
            {/* Regular hours */}
            <rect
              x={x} y={chartHeight - regHeight - otHeight}
              width={barWidth} height={regHeight}
              fill="rgba(6,182,212,0.6)" rx="4" ry="4"
              className="transition-all duration-300"
            />
            {/* OT hours */}
            {d.ot > 0 && (
              <rect
                x={x} y={chartHeight - otHeight}
                width={barWidth} height={otHeight}
                fill="rgba(245,158,11,0.6)" rx="0" ry="0"
                className="transition-all duration-300"
              />
            )}
            {/* Total bar outline */}
            <rect
              x={x} y={chartHeight - totalBarHeight}
              width={barWidth} height={totalBarHeight}
              fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" rx="4" ry="4"
            />
            {/* Day label */}
            <text x={x + barWidth / 2} y={chartHeight + 16} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="11">{d.day}</text>
            {/* Hours label on top */}
            <text x={x + barWidth / 2} y={chartHeight - totalBarHeight - 4} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="10">{d.hours.toFixed(1)}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Mini Trend Line (30-day) ──────────────────────────────────
function MiniTrendLine({ data }: { data: { date: string; hours: number }[] }) {
  if (data.length === 0) return <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">No data</div>;
  const width = 300;
  const height = 100;
  const padX = 5;
  const padY = 10;
  const maxH = Math.max(10, ...data.map(d => d.hours));
  const minH = 0;

  const points = data.map((d, i) => ({
    x: padX + (i / Math.max(data.length - 1, 1)) * (width - padX * 2),
    y: padY + (1 - (d.hours - minH) / (maxH - minH || 1)) * (height - padY * 2),
  }));

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const fillPath = pathData + ` L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="w-full">
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(6,182,212,0.3)" />
          <stop offset="100%" stopColor="rgba(6,182,212,0.02)" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill="url(#trendGrad)" />
      <path d={pathData} fill="none" stroke="rgba(6,182,212,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.length > 0 && (
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3" fill="#06b6d4" />
      )}
    </svg>
  );
}

// MiniDonut imported from ./shared

// workModeConfig imported from ./shared

// fadeIn imported from ./shared

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export function EmployeeAttendancePortal() {
  const {
    user, attendance, attendanceLogs, shifts, requests,
    clockIn, clockInWithPin, clockInWithFace,
    startBreak, endBreak,
    createRequest,
  } = useEMSStore();

  // ─── Loading state ──────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (user) setLoading(false);
  }, [user]);

  // ─── GPS Location ────────────────────────────────────────────
  const { gpsData, gpsStatus, requestGPS } = useGPSLocation();

  // ─── State ──────────────────────────────────────────────────
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [clockingIn, setClockingIn] = useState(false);
  const [calendarDirection, setCalendarDirection] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Dialog states
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [faceDialogOpen, setFaceDialogOpen] = useState(false);
  const [regDialogOpen, setRegDialogOpen] = useState(false);
  const [otDialogOpen, setOtDialogOpen] = useState(false);
  const [shiftSwapDialogOpen, setShiftSwapDialogOpen] = useState(false);
  const [missedPunchDialogOpen, setMissedPunchDialogOpen] = useState(false);

  // Form states
  const [regForm, setRegForm] = useState({ date: '', punchType: 'clock-in', requestedTime: '', reason: '' });
  const [otForm, setOtForm] = useState({ date: '', hours: '', reason: '' });
  const [shiftSwapForm, setShiftSwapForm] = useState({ targetShiftId: '', reason: '' });
  const [missedPunchForm, setMissedPunchForm] = useState({ date: '', punchType: 'clock-in', requestedTime: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [breakLoading, setBreakLoading] = useState(false);
  const [showDailySummary, setShowDailySummary] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState<Date | null>(null);

  // ─── Live clock ─────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  // ─── My attendance data ────────────────────────────────────
  const myAttendance = useMemo(() => {
    if (!user?.id) return [];
    return attendance.filter(a => a.userId === user.id);
  }, [attendance, user?.id]);

  const myLogs = useMemo(() => {
    if (!user?.id) return [];
    return attendanceLogs.filter(l => l.userId === user.id);
  }, [attendanceLogs, user?.id]);

  const myRequests = useMemo(() => {
    if (!user?.id) return [];
    return requests.filter(r => r.userId === user.id);
  }, [requests, user?.id]);

  const monthRecords = useMemo(() => {
    return myAttendance.filter(a => {
      const d = new Date(a.date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
  }, [myAttendance, year, month]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const todayRecord = useMemo(() => {
    return myAttendance.find(a => a.date === todayStr);
  }, [myAttendance, todayStr]);

  const todayLogs = useMemo(() => {
    return myLogs.filter(l => {
      try {
        return format(new Date(l.punchTime), 'yyyy-MM-dd') === todayStr;
      } catch { return false; }
    }).sort((a, b) => new Date(b.punchTime).getTime() - new Date(a.punchTime).getTime());
  }, [myLogs, todayStr]);

  // ─── Is clocked in? ────────────────────────────────────────
  const isClockedIn = useMemo(() => {
    const firstIn = todayRecord?.firstIn || todayRecord?.clockIn;
    const lastOut = todayRecord?.lastOut || todayRecord?.clockOut;
    if (!firstIn) return false;
    return !lastOut;
  }, [todayRecord]);

  // ─── Is on break? ──────────────────────────────────────────
  const isOnBreak = useMemo(() => {
    if (!isClockedIn || todayLogs.length === 0) return false;
    // Sort logs chronologically and check if the last non-clock-out log is break-start
    const sorted = [...todayLogs].sort((a, b) => new Date(a.punchTime).getTime() - new Date(b.punchTime).getTime());
    const lastLog = sorted[sorted.length - 1];
    return lastLog?.punchType === 'break-start';
  }, [todayLogs, isClockedIn]);

  // ─── Daily Summary ─────────────────────────────────────────
  const dailySummary = useMemo(() => {
    if (!todayRecord) return null;
    const totalHours = todayRecord.totalHours || 0;
    const breakMinutes = todayRecord.breakMinutes || 0;
    const breakHrs = todayRecord.breakHours || (breakMinutes / 60);
    const netHours = todayRecord.netWorkHours || (totalHours - breakHrs);
    const overtime = todayRecord.overtimeHours || 0;
    return { totalHours, breakMinutes, breakHrs, netHours, overtime };
  }, [todayRecord]);

  // ─── Break timer ───────────────────────────────────────────
  const breakTimerRef = useRef<Date | null>(null);
  const [breakElapsed, setBreakElapsed] = useState(0);

  useEffect(() => {
    if (isOnBreak) {
      // Find the break-start time from logs
      const sorted = [...todayLogs].sort((a, b) => new Date(a.punchTime).getTime() - new Date(b.punchTime).getTime());
      const breakStart = sorted.find(l => l.punchType === 'break-start');
      if (breakStart) {
        breakTimerRef.current = new Date(breakStart.punchTime);
        setBreakStartTime(breakTimerRef.current);
      }
    } else {
      breakTimerRef.current = null;
      setBreakStartTime(null);
      setBreakElapsed(0);
    }
  }, [isOnBreak, todayLogs]);

  useEffect(() => {
    if (!isOnBreak || !breakStartTime) return;
    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - breakStartTime.getTime()) / 1000);
      setBreakElapsed(diff);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOnBreak, breakStartTime]);

  // Show daily summary when user clocks out
  useEffect(() => {
    if (!isClockedIn && todayRecord?.lastOut && dailySummary) {
      setShowDailySummary(true);
    }
  }, [isClockedIn, todayRecord?.lastOut, dailySummary]);

  // ─── Monthly break time total ──────────────────────────────
  const monthlyBreakMinutes = useMemo(() => {
    return monthRecords.reduce((sum, a) => sum + (a.breakMinutes || 0), 0);
  }, [monthRecords]);

  // ─── Stats ────────────────────────────────────────────────
  const stats = useMemo(() => {
    const presentDays = monthRecords.filter(a => a.status === 'present').length;
    const totalDays = monthRecords.length;
    const rate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    const totalHours = monthRecords.reduce((sum, a) => sum + (a.totalHours || 0), 0);
    const avgDaily = totalDays > 0 ? (totalHours / totalDays) : 0;

    const totalOvertime = monthRecords.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);

    const onTimeDays = monthRecords.filter(a => a.status === 'present').length;
    const lateDays = monthRecords.filter(a => a.status === 'late').length;
    const onTimeRate = (onTimeDays + lateDays) > 0 ? Math.round((onTimeDays / (onTimeDays + lateDays)) * 100) : 0;

    let streak = 0;
    const sorted = [...monthRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    for (const rec of sorted) {
      if (rec.status === 'present' || rec.status === 'late') streak++;
      else break;
    }

    const absentDays = monthRecords.filter(a => a.status === 'absent').length;
    const halfDays = monthRecords.filter(a => a.status === 'half-day').length;
    const holidays = monthRecords.filter(a => a.status === 'holiday').length;

    // Count working days in the month
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(new Date(year, month - 1));
    const allDays = eachDayOfInterval({ start, end });
    const workDays = allDays.filter(d => !isWeekend(d)).length;
    const daysPassed = allDays.filter(d => d <= new Date() && !isWeekend(d)).length;

    return { rate, avgDaily, totalOvertime, streak, onTimeRate, totalHours, presentDays, absentDays, lateDays, halfDays, holidays, totalDays, workDays, daysPassed };
  }, [monthRecords, year, month]);

  const defaultShift = useMemo(() => {
    if (user?.shiftId) {
      return shifts.find(s => s.id === user.shiftId) || shifts.find(s => s.isDefault) || shifts[0];
    }
    return shifts.find(s => s.isDefault) || shifts[0];
  }, [shifts, user?.shiftId]);

  // ─── Shift timer ───────────────────────────────────────────
  const shiftTimer = useMemo(() => {
    if (!defaultShift) return null;
    const now = currentTime;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = defaultShift.startTime.split(':').map(Number);
    const [eh, em] = defaultShift.endTime.split(':').map(Number);
    const shiftStartMin = sh * 60 + sm;
    const shiftEndMin = eh * 60 + em;

    if (isClockedIn) {
      if (nowMinutes >= shiftEndMin) {
        // Overtime
        const otMins = nowMinutes - shiftEndMin;
        const otH = Math.floor(otMins / 60);
        const otM = otMins % 60;
        return { type: 'overtime' as const, label: `Overtime +${otH}h ${otM}m`, color: 'text-amber-400' };
      } else {
        // Countdown to shift end
        const remaining = shiftEndMin - nowMinutes;
        const rH = Math.floor(remaining / 60);
        const rM = remaining % 60;
        return { type: 'countdown' as const, label: `${rH}h ${rM}m remaining`, color: 'text-cyan-400' };
      }
    }
    return null;
  }, [currentTime, defaultShift, isClockedIn]);

  // ─── Real-time hours worked today ──────────────────────────
  const todayHoursWorked = useMemo(() => {
    if (!todayRecord) return 0;
    const firstIn = todayRecord.firstIn || todayRecord.clockIn;
    const lastOut = todayRecord.lastOut || todayRecord.clockOut;
    if (!firstIn) return 0;
    if (lastOut) return todayRecord.totalHours || 0;
    // Currently clocked in - calculate from firstIn to now
    const [h, m, s] = firstIn.split(':').map(Number);
    const clockInMinutes = (h || 0) * 60 + (m || 0) + (s || 0) / 60;
    const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes() + currentTime.getSeconds() / 60;
    return Math.max(0, (nowMinutes - clockInMinutes) / 60);
  }, [todayRecord, currentTime]);

  // ─── Calendar data ────────────────────────────────────────
  const calendarData = useMemo(() => {
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(new Date(year, month - 1));
    const days = eachDayOfInterval({ start, end });
    const startDay = getDay(start);
    return { start, end, days, startDay };
  }, [year, month]);

  const getRecordForDate = useCallback((dateStr: string) => {
    return monthRecords.find(r => r.date === dateStr);
  }, [monthRecords]);

  const getDayStatus = useCallback((day: Date) => {
    if (isWeekend(day)) return 'weekend';
    const dateStr = format(day, 'yyyy-MM-dd');
    const record = getRecordForDate(dateStr);
    return record?.status || '';
  }, [getRecordForDate]);

  // ─── Calendar month summary ───────────────────────────────
  const calendarSummary = useMemo(() => {
    let present = 0, late = 0, absent = 0, holiday = 0, halfDay = 0, weekend = 0;
    calendarData.days.forEach(day => {
      const status = getDayStatus(day);
      if (status === 'present') present++;
      else if (status === 'late') late++;
      else if (status === 'absent') absent++;
      else if (status === 'holiday') holiday++;
      else if (status === 'half-day') halfDay++;
      else if (status === 'weekend') weekend++;
    });
    return { present, late, absent, holiday, halfDay, weekend };
  }, [calendarData.days, getDayStatus]);

  // ─── Weekly hours chart data ──────────────────────────────
  const weeklyChartData = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    return days.map((dayName, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const rec = myAttendance.find(a => a.date === dateStr);
      const hours = rec?.totalHours || 0;
      const ot = rec?.overtimeHours || 0;
      return { day: dayName, hours, ot };
    });
  }, [myAttendance]);

  // ─── 30-day trend data ───────────────────────────────────
  const trendData = useMemo(() => {
    const data: { date: string; hours: number }[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const rec = myAttendance.find(a => a.date === dateStr);
      data.push({ date: dateStr, hours: rec?.totalHours || 0 });
    }
    return data;
  }, [myAttendance]);

  // ─── Punch timeline data ──────────────────────────────────
  const punchTimelineData = useMemo(() => {
    if (todayLogs.length === 0) return [];
    const sorted = [...todayLogs].sort((a, b) => new Date(a.punchTime).getTime() - new Date(b.punchTime).getTime());
    let runningHours = 0;
    let lastClockInTime: Date | null = null;

    return sorted.map((log, i) => {
      const punchDate = new Date(log.punchTime);
      if (log.punchType === 'clock-in') {
        lastClockInTime = punchDate;
      } else if (lastClockInTime) {
        const diff = (punchDate.getTime() - lastClockInTime.getTime()) / (1000 * 60 * 60);
        runningHours += diff;
        lastClockInTime = null;
      }

      let gap: string | null = null;
      let gapLarge = false;
      if (i > 0) {
        const prevDate = new Date(sorted[i - 1].punchTime);
        const gapMs = punchDate.getTime() - prevDate.getTime();
        const gapMins = Math.round(gapMs / (1000 * 60));
        gapLarge = gapMins > 240; // 4 hours
        if (gapMins >= 60) {
          gap = `${Math.floor(gapMins / 60)}h ${gapMins % 60}m`;
        } else {
          gap = `${gapMins}m`;
        }
      }

      return { ...log, runningHours, gap, gapLarge, punchDate };
    });
  }, [todayLogs]);

  // ─── Overtime log data ────────────────────────────────────
  const overtimeLog = useMemo(() => {
    return monthRecords
      .filter(r => (r.overtimeHours || 0) > 0)
      .map(r => ({
        date: r.date,
        hours: r.overtimeHours || 0,
        status: r.isEdited ? 'approved' as const : 'auto' as const,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [monthRecords]);

  // ─── Regularization requests ──────────────────────────────
  const regRequests = useMemo(() => {
    return myRequests.filter(r =>
      r.type === 'shift-swap' || r.title.toLowerCase().includes('regulari') || r.title.toLowerCase().includes('correction') || r.title.toLowerCase().includes('missed punch')
    );
  }, [myRequests]);

  // ─── Handlers ─────────────────────────────────────────────
  const handleWebClockIn = async () => {
    setClockingIn(true);
    try {
      const gps = await requestGPS();
      await clockIn('pin', gps ?? undefined);
      const isClockOut = isClockedIn;
      toast.success(isClockOut ? 'Clocked out successfully' : 'Clocked in successfully');
      if (isClockOut && dailySummary) {
        setShowDailySummary(true);
      }
    } catch {
      toast.error('Clock operation failed');
    } finally {
      setClockingIn(false);
    }
  };

  const handleStartBreak = async () => {
    setBreakLoading(true);
    try {
      const gps = await requestGPS();
      await startBreak(gps ?? undefined);
      toast.success('Break started');
    } catch {
      toast.error('Failed to start break');
    } finally {
      setBreakLoading(false);
    }
  };

  const handleEndBreak = async () => {
    setBreakLoading(true);
    try {
      const gps = await requestGPS();
      await endBreak(gps ?? undefined);
      toast.success('Break ended');
    } catch {
      toast.error('Failed to end break');
    } finally {
      setBreakLoading(false);
    }
  };

  const handlePinClockIn = async () => {
    if (!pinValue || pinValue.length < 4) {
      toast.error('Please enter a valid PIN (at least 4 digits)');
      return;
    }
    setClockingIn(true);
    try {
      await clockInWithPin(pinValue);
      toast.success(isClockedIn ? 'Clocked out successfully' : 'Clocked in successfully via PIN');
      setPinDialogOpen(false);
      setPinValue('');
    } catch {
      toast.error('PIN clock-in failed');
    } finally {
      setClockingIn(false);
    }
  };

  const handleFaceClockIn = async () => {
    setClockingIn(true);
    try {
      await clockInWithFace('face-scan-placeholder');
      toast.success(isClockedIn ? 'Clocked out successfully' : 'Clocked in successfully via Face ID');
      setFaceDialogOpen(false);
    } catch {
      toast.error('Face ID clock-in failed');
    } finally {
      setClockingIn(false);
    }
  };

  const handleMonthNav = (direction: -1 | 1) => {
    setCalendarDirection(direction);
    setCurrentDate(direction === -1 ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
  };

  const handleToday = () => {
    setCalendarDirection(0);
    setCurrentDate(new Date());
  };

  const handleRegSubmit = async () => {
    if (!regForm.date || !regForm.requestedTime || !regForm.reason) {
      toast.error('Please fill all fields');
      return;
    }
    setSubmitting(true);
    try {
      await createRequest({
        userId: user!.id,
        userName: user!.name,
        type: 'shift-swap',
        title: `Attendance Regularization - ${regForm.punchType === 'clock-in' ? 'Clock In' : 'Clock Out'}`,
        description: `Date: ${regForm.date}, ${regForm.punchType === 'clock-in' ? 'Clock In' : 'Clock Out'} at ${regForm.requestedTime}. Reason: ${regForm.reason}`,
        status: 'pending',
        priority: 'medium',
      });
      toast.success('Regularization request submitted');
      setRegDialogOpen(false);
      setRegForm({ date: '', punchType: 'clock-in', requestedTime: '', reason: '' });
    } catch {
      toast.error('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtSubmit = async () => {
    if (!otForm.date || !otForm.hours || !otForm.reason) {
      toast.error('Please fill all fields');
      return;
    }
    setSubmitting(true);
    try {
      await createRequest({
        userId: user!.id,
        userName: user!.name,
        type: 'shift-swap',
        title: `Overtime Request - ${otForm.date}`,
        description: `Date: ${otForm.date}, Hours: ${otForm.hours}. Reason: ${otForm.reason}`,
        status: 'pending',
        priority: 'medium',
      });
      toast.success('Overtime request submitted');
      setOtDialogOpen(false);
      setOtForm({ date: '', hours: '', reason: '' });
    } catch {
      toast.error('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShiftSwapSubmit = async () => {
    if (!shiftSwapForm.targetShiftId || !shiftSwapForm.reason) {
      toast.error('Please fill all fields');
      return;
    }
    setSubmitting(true);
    try {
      const targetShift = shifts.find(s => s.id === shiftSwapForm.targetShiftId);
      await createRequest({
        userId: user!.id,
        userName: user!.name,
        type: 'shift-swap',
        title: `Shift Swap Request - ${targetShift?.name || 'Unknown'}`,
        description: `Requesting shift change to: ${targetShift?.name || 'Unknown'} (${targetShift?.startTime} - ${targetShift?.endTime}). Reason: ${shiftSwapForm.reason}`,
        status: 'pending',
        priority: 'medium',
      });
      toast.success('Shift swap request submitted');
      setShiftSwapDialogOpen(false);
      setShiftSwapForm({ targetShiftId: '', reason: '' });
    } catch {
      toast.error('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMissedPunchSubmit = async () => {
    if (!missedPunchForm.date || !missedPunchForm.requestedTime || !missedPunchForm.reason) {
      toast.error('Please fill all fields');
      return;
    }
    setSubmitting(true);
    try {
      await createRequest({
        userId: user!.id,
        userName: user!.name,
        type: 'shift-swap',
        title: `Missed Punch - ${missedPunchForm.punchType === 'clock-in' ? 'Clock In' : 'Clock Out'}`,
        description: `Date: ${missedPunchForm.date}, ${missedPunchForm.punchType === 'clock-in' ? 'Clock In' : 'Clock Out'} at ${missedPunchForm.requestedTime}. Reason: ${missedPunchForm.reason}`,
        status: 'pending',
        priority: 'high',
      });
      toast.success('Missed punch request submitted');
      setMissedPunchDialogOpen(false);
      setMissedPunchForm({ date: '', punchType: 'clock-in', requestedTime: '', reason: '' });
    } catch {
      toast.error('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Week number helper ──────────────────────────────────
  const getWeekNumbers = useCallback(() => {
    const weeks: { weekNum: number; days: Date[] }[] = [];
    let currentWeek: Date[] = [];
    let currentWeekNum = -1;

    // Add leading blanks as null dates
    for (let i = 0; i < calendarData.startDay; i++) {
      currentWeek.push(new Date(0));
    }

    for (const day of calendarData.days) {
      const wn = getWeek(day, { weekStartsOn: 1 });
      if (wn !== currentWeekNum && currentWeek.length > 0 && currentWeek.length < 7) {
        weeks.push({ weekNum: currentWeekNum, days: currentWeek });
        currentWeek = [];
      }
      currentWeekNum = wn;
      currentWeek.push(day);
    }

    if (currentWeek.length > 0) {
      weeks.push({ weekNum: currentWeekNum, days: currentWeek });
    }

    return weeks;
  }, [calendarData]);

  const weekRows = useMemo(() => getWeekNumbers(), [getWeekNumbers]);

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  if (loading) return <div className="p-4"><PageSkeleton /></div>;

  return (
    <TooltipProvider>
      <div className="space-y-6">

        {/* ═══════════════════════════════════════════════════════
            SECTION 1: Live Status Hero — Enhanced
        ═══════════════════════════════════════════════════════ */}
        <motion.div {...fadeIn} transition={{ delay: 0 }}>
          <GlassCard className="p-6 relative overflow-hidden" glow={isClockedIn ? 'emerald' : 'none'}>
            {/* Decorative background */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-emerald-500/8 to-transparent rounded-full -translate-y-20 translate-x-20" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-cyan-500/5 to-transparent rounded-full translate-y-16 -translate-x-16" />

            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
              {/* Left: Status + Clock */}
              <div className="space-y-3 flex-1">
                {/* Status indicator with animated ping */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className={cn(
                      "h-3.5 w-3.5 rounded-full",
                      isClockedIn ? "bg-emerald-400" : todayRecord?.firstIn || todayRecord?.clockIn ? "bg-rose-400" : "bg-slate-400"
                    )} />
                    {isClockedIn && (
                      <div className="absolute inset-0 h-3.5 w-3.5 rounded-full bg-emerald-400 animate-ping opacity-40" />
                    )}
                  </div>
                  <span className="text-sm font-semibold uppercase tracking-wider">
                    {isClockedIn ? 'Currently Clocked In' : (todayRecord?.firstIn || todayRecord?.clockIn) ? 'Clocked Out for Today' : 'Not Clocked In'}
                  </span>
                  {isClockedIn && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                      <Zap className="h-3 w-3 mr-0.5" /> Active
                    </Badge>
                  )}
                  {/* Work Mode Badge */}
                  {user?.workMode && workModeConfig[user.workMode] && (
                    <Badge className={cn('text-[10px] border', workModeConfig[user.workMode].bg)}>
                      {(() => { const WMI = workModeConfig[user.workMode!].icon; return <WMI className="h-3 w-3 mr-0.5" />; })()}
                      {user.workMode}
                    </Badge>
                  )}
                  {/* GPS Status Indicator */}
                  {gpsStatus !== 'idle' && (
                    <Badge className={cn(
                      'text-[10px] border',
                      gpsStatus === 'granted' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                      gpsStatus === 'denied' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                      gpsStatus === 'requesting' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 animate-pulse' :
                      'bg-slate-500/20 text-slate-400 border-slate-500/30'
                    )}>
                      {gpsStatus === 'granted' && <><MapPin className="h-3 w-3 mr-0.5" /> GPS</>}
                      {gpsStatus === 'denied' && <><AlertTriangle className="h-3 w-3 mr-0.5" /> No GPS</>}
                      {gpsStatus === 'requesting' && <><Navigation className="h-3 w-3 mr-0.5 animate-spin" /> Locating</>}
                      {gpsStatus === 'unavailable' && <><MapPin className="h-3 w-3 mr-0.5" /> N/A</>}
                    </Badge>
                  )}
                  {/* Geofence Badge */}
                  {todayRecord?.isGeofenceOk === true && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                      <MapPinned className="h-3 w-3 mr-0.5" /> Office (Verified)
                    </Badge>
                  )}
                  {todayRecord?.isGeofenceOk === false && (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                      <AlertTriangle className="h-3 w-3 mr-0.5" /> Outside Geofence
                    </Badge>
                  )}
                  {/* Detected Work Mode Suggestion */}
                  {todayRecord?.workMode && todayRecord.workMode !== user?.workMode && (
                    <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-[10px]">
                      Detected: {todayRecord.workMode}
                    </Badge>
                  )}
                </div>

                {/* Huge live clock */}
                <p className="text-5xl sm:text-6xl font-bold font-mono tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                  {format(currentTime, 'HH:mm:ss')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(currentTime, 'EEEE, MMMM d, yyyy')}
                </p>

                {/* Today's times */}
                {(todayRecord?.firstIn || todayRecord?.clockIn) && (
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                      <Play className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">{(todayRecord.firstIn || todayRecord.clockIn)?.substring(0, 5)}</span>
                    </span>
                    {(todayRecord.lastOut || todayRecord.clockOut) && (
                      <span className="flex items-center gap-1.5 bg-rose-500/10 px-2.5 py-1 rounded-full">
                        <Square className="h-3 w-3 text-rose-400" />
                        <span className="text-rose-400 font-medium">{(todayRecord.lastOut || todayRecord.clockOut)?.substring(0, 5)}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 bg-cyan-500/10 px-2.5 py-1 rounded-full">
                      <Timer className="h-3 w-3 text-cyan-400" />
                      <span className="text-cyan-400 font-medium">{todayHoursWorked.toFixed(1)}h</span>
                    </span>
                    {shiftTimer && (
                      <span className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full', shiftTimer.type === 'overtime' ? 'bg-amber-500/10' : 'bg-cyan-500/10')}>
                        {shiftTimer.type === 'overtime' ? <Flame className="h-3 w-3 text-amber-400" /> : <Clock4 className="h-3 w-3 text-cyan-400" />}
                        <span className={cn('font-medium', shiftTimer.color)}>{shiftTimer.label}</span>
                      </span>
                    )}
                    {todayRecord?.locationName && (
                      <span className="flex items-center gap-1.5 bg-slate-500/10 px-2.5 py-1 rounded-full">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        <span className="text-slate-400 font-medium">{todayRecord.locationName}</span>
                      </span>
                    )}
                    {isOnBreak && (
                      <span className="flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-full">
                        <Coffee className="h-3 w-3 text-amber-400" />
                        <span className="text-amber-400 font-medium">
                          Break {Math.floor(breakElapsed / 60)}m {breakElapsed % 60}s
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Multi-method Clock Buttons + Shift Info */}
              <div className="flex flex-col items-end gap-3">
                {/* Multi-method clock buttons */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    size="lg"
                    onClick={handleWebClockIn}
                    disabled={clockingIn || breakLoading}
                    className={cn(
                      "gap-2 text-base px-6 shadow-lg relative overflow-hidden group",
                      isClockedIn
                        ? "bg-rose-600 hover:bg-rose-500 shadow-rose-500/20"
                        : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20"
                    )}
                  >
                    {clockingIn ? <Loader2 className="h-5 w-5 animate-spin" /> : isClockedIn ? <><Square className="h-5 w-5" /> Web Clock Out</> : <><Globe className="h-5 w-5" /> Web Clock In</>}
                  </Button>
                  {/* Break Buttons */}
                  {isClockedIn && !isOnBreak && (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={handleStartBreak}
                      disabled={breakLoading || clockingIn}
                      className="gap-2 px-6 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                    >
                      {breakLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Coffee className="h-5 w-5" /> Start Break</>}
                    </Button>
                  )}
                  {isOnBreak && (
                    <Button
                      size="lg"
                      onClick={handleEndBreak}
                      disabled={breakLoading}
                      className="gap-2 px-6 bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20"
                    >
                      {breakLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Play className="h-5 w-5" /> End Break</>}
                    </Button>
                  )}
                  {!isClockedIn && (
                    <>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => setPinDialogOpen(true)}
                        className="gap-2 px-6 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                      >
                        <CircleDot className="h-5 w-5" /> PIN Clock In
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => setFaceDialogOpen(true)}
                        className="gap-2 px-6 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                      >
                        <Fingerprint className="h-5 w-5" /> Face ID
                      </Button>
                    </>
                  )}
                </div>

                {/* Shift info card */}
                {defaultShift && (
                  <div className="bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1] rounded-xl p-3 text-xs space-y-1.5 min-w-[200px]">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      {defaultShift.color && <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: defaultShift.color }} />}
                      <Sun className="h-3.5 w-3.5 text-amber-400" />
                      {defaultShift.name}
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3 w-3 text-cyan-400" />
                      {defaultShift.startTime} - {defaultShift.endTime}
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <AlertTriangle className="h-3 w-3 text-amber-400" />
                      Grace: {defaultShift.gracePeriod}min
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Flame className="h-3 w-3 text-amber-400" />
                      OT after: {defaultShift.overtimeThreshold}h
                    </div>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════
            Daily Summary Notification Card
        ═══════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {showDailySummary && dailySummary && !isClockedIn && (todayRecord?.lastOut || todayRecord?.clockOut) && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <GlassCard className="p-5 border-emerald-500/20 bg-emerald-500/5" glow="emerald">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="font-semibold text-sm">Today&apos;s Summary</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          You worked <span className="text-emerald-400 font-medium">{Math.floor(dailySummary.totalHours)}h {Math.round((dailySummary.totalHours % 1) * 60)}m</span> today
                          {dailySummary.breakMinutes > 0 && (
                            <>, including <span className="text-amber-400 font-medium">{Math.floor(dailySummary.breakMinutes / 60)}h {dailySummary.breakMinutes % 60}m</span> break</>
                          )}
                          {dailySummary.overtime > 0 && (
                            <>, <span className="text-amber-400 font-medium">{dailySummary.overtime.toFixed(1)}h</span> overtime</>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className="flex items-center gap-1.5 bg-cyan-500/10 px-2.5 py-1 rounded-full">
                          <Timer className="h-3 w-3 text-cyan-400" />
                          <span className="text-cyan-400 font-medium">Net: {dailySummary.netHours.toFixed(1)}h</span>
                        </span>
                        {dailySummary.breakMinutes > 0 && (
                          <span className="flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-full">
                            <Coffee className="h-3 w-3 text-amber-400" />
                            <span className="text-amber-400 font-medium">Break: {Math.floor(dailySummary.breakMinutes / 60)}h {dailySummary.breakMinutes % 60}m</span>
                          </span>
                        )}
                        {dailySummary.overtime > 0 && (
                          <span className="flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-full">
                            <Flame className="h-3 w-3 text-amber-400" />
                            <span className="text-amber-400 font-medium">OT: {dailySummary.overtime.toFixed(1)}h</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-white shrink-0"
                    onClick={() => setShowDailySummary(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════════════════════
            SECTION 2: Hero Stat Cards (2×4 = 8 cards)
        ═══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { title: 'Attendance Rate', value: `${stats.rate}%`, icon: CheckCircle2, color: 'emerald' as const, subtitle: `${stats.presentDays} of ${stats.totalDays} days`, progressRing: { value: stats.rate, max: 100 } },
            { title: 'Avg Daily Hours', value: `${stats.avgDaily.toFixed(1)}h`, icon: Clock, color: 'cyan' as const, subtitle: 'this month', trend: stats.avgDaily >= 7 ? { value: 5, label: 'vs target' } : { value: -3, label: 'vs target' } },
            { title: 'Total Overtime', value: `${stats.totalOvertime.toFixed(1)}h`, icon: Flame, color: 'amber' as const, subtitle: 'extra hours' },
            { title: 'Current Streak', value: stats.streak, icon: Award, color: 'emerald' as const, subtitle: 'consecutive days', pulse: stats.streak > 0 },
            { title: 'On-Time Rate', value: `${stats.onTimeRate}%`, icon: TrendingUp, color: 'cyan' as const, subtitle: 'punctuality', progressRing: { value: stats.onTimeRate, max: 100 } },
            { title: 'This Month Days', value: stats.presentDays, icon: Calendar, color: 'emerald' as const, subtitle: 'present count' },
            { title: 'Break Time', value: monthlyBreakMinutes >= 60 ? `${(monthlyBreakMinutes / 60).toFixed(1)}h` : `${monthlyBreakMinutes}m`, icon: Coffee, color: 'amber' as const, subtitle: 'this month' },
            { title: 'Absences', value: stats.absentDays, icon: X, color: stats.absentDays > 0 ? 'rose' as const : 'emerald' as const, subtitle: stats.absentDays > 0 ? 'review needed' : 'perfect', pulse: stats.absentDays > 0 },
          ].map((s, i) => (
            <motion.div key={s.title} {...fadeIn} transition={{ delay: i * 0.04 }}>
              <StatCard
                hero
                title={s.title}
                value={s.value}
                icon={s.icon}
                color={s.color}
                subtitle={s.subtitle}
                progressRing={'progressRing' in s ? s.progressRing : undefined}
                pulse={'pulse' in s ? s.pulse : undefined}
                trend={'trend' in s ? s.trend : undefined}
              />
            </motion.div>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════
            SECTION 3: Monthly Summary Strip
        ═══════════════════════════════════════════════════════ */}
        <motion.div {...fadeIn} transition={{ delay: 0.3 }}>
          <GlassCard className="p-5" glow="emerald">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-400" />
                <h3 className="font-semibold">Monthly Summary — {format(currentDate, 'MMMM yyyy')}</h3>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4">
              {[
                { label: 'Present', value: calendarSummary.present, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                { label: 'Late', value: calendarSummary.late, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                { label: 'Absent', value: calendarSummary.absent, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
                { label: 'Half-Day', value: calendarSummary.halfDay, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
                { label: 'Holiday', value: calendarSummary.holiday, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
                { label: 'Weekend', value: calendarSummary.weekend, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
              ].map(item => (
                <div key={item.label} className={cn('rounded-xl p-3 border text-center', item.bg)}>
                  <p className={cn('text-2xl font-bold', item.color)}>{item.value}</p>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-1">{item.label}</p>
                </div>
              ))}
            </div>
            {/* Working days progress */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Working Days Progress</span>
                <span>{stats.daysPassed} / {stats.workDays} days</span>
              </div>
              <Progress value={stats.workDays > 0 ? (stats.daysPassed / stats.workDays) * 100 : 0} className="h-2" />
            </div>
          </GlassCard>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════
            SECTION 4: Premium Attendance Calendar
        ═══════════════════════════════════════════════════════ */}
        <motion.div {...fadeIn} transition={{ delay: 0.35 }}>
          <GlassCard className="p-6" glow="cyan">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-cyan-400" />
                <h3 className="font-semibold text-lg">Attendance Calendar</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleToday} className="text-xs bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] h-8">
                  Today
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMonthNav(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold min-w-[140px] text-center">{format(currentDate, 'MMMM yyyy')}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMonthNav(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Calendar Grid with week numbers */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${year}-${month}`}
                initial={{ opacity: 0, x: calendarDirection >= 0 ? 30 : -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: calendarDirection >= 0 ? -30 : 30 }}
                transition={{ duration: 0.2 }}
              >
                {/* Day Headers with week number column */}
                <div className="grid grid-cols-[2rem_1fr] gap-1 mb-1">
                  <div className="text-[9px] text-muted-foreground/50 font-medium text-center py-2">Wk</div>
                  <div className="grid grid-cols-7 gap-1">
                    {DAY_NAMES.map(d => (
                      <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2 uppercase tracking-wider">
                        {d}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Week rows */}
                {weekRows.map((week, wi) => (
                  <div key={`week-${wi}`} className="grid grid-cols-[2rem_1fr] gap-1 mb-1">
                    <div className="text-[9px] text-muted-foreground/50 font-mono flex items-center justify-center">
                      {week.weekNum}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {/* Fill blanks at start */}
                      {week.days[0]?.getTime() === 0 && Array.from({ length: calendarData.startDay }, (_, i) => (
                        <div key={`blank-start-${i}`} className="aspect-square" />
                      ))}
                      {/* Day cells */}
                      {week.days.filter(d => d.getTime() !== 0).map((day) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const status = getDayStatus(day);
                        const record = getRecordForDate(dateStr);
                        const dayIsToday = isSameDay(day, new Date());
                        const isSelected = selectedDay === dateStr;
                        const hasRecord = !!record;

                        return (
                          <Popover key={dateStr}>
                            <PopoverTrigger asChild>
                              <button
                                onClick={() => setSelectedDay(dateStr)}
                                className={cn(
                                  'aspect-square rounded-lg border p-1.5 sm:p-2 text-left transition-all duration-200 relative group/cell',
                                  'hover:scale-[1.03] hover:z-10',
                                  dayIsToday && 'ring-2 ring-emerald-500/50 ring-offset-1 ring-offset-transparent',
                                  isSelected && 'ring-2 ring-cyan-500/50',
                                  status === 'present' && 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15',
                                  status === 'late' && 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15',
                                  status === 'absent' && 'bg-rose-500/8 border-rose-500/15 hover:bg-rose-500/12',
                                  status === 'half-day' && 'bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/15',
                                  status === 'holiday' && 'bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/15',
                                  status === 'weekend' && 'bg-slate-500/5 border-slate-500/10 hover:bg-slate-500/10',
                                  !status && !isWeekend(day) && 'bg-black/[0.01] dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] hover:border-black/[0.1] dark:hover:border-white/[0.1]',
                                )}
                              >
                                <div className="flex flex-col h-full justify-between">
                                  <div className="flex items-center justify-between">
                                    <span className={cn(
                                      'text-xs sm:text-sm font-medium leading-none',
                                      dayIsToday ? 'text-emerald-400 font-bold' :
                                      status === 'weekend' ? 'text-slate-500' :
                                      hasRecord ? 'text-white' : 'text-muted-foreground'
                                    )}>
                                      {format(day, 'd')}
                                    </span>
                                    {dayIsToday && (
                                      <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                    )}
                                    {status && status !== 'weekend' && (
                                      <div className={cn('h-1.5 w-1.5 rounded-full', statusDotMap[status])} />
                                    )}
                                  </div>
                                  {record && (
                                    <div className="hidden sm:block mt-0.5 space-y-0.5">
                                      {(record.firstIn || record.clockIn) && (
                                        <p className="text-[9px] text-muted-foreground leading-none truncate">
                                          → {(record.firstIn || record.clockIn)?.substring(0, 5)}
                                        </p>
                                      )}
                                      {(record.lastOut || record.clockOut) && (
                                        <p className="text-[9px] text-muted-foreground leading-none truncate">
                                          ← {(record.lastOut || record.clockOut)?.substring(0, 5)}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-0 bg-background/95 backdrop-blur-xl border border-border shadow-2xl" side="top" align="center">
                              <div className={cn('p-3 rounded-t-lg', statusColorMap[status] || 'bg-black/[0.03] dark:bg-white/[0.05]')}>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-bold">{format(day, 'EEEE, MMMM d')}</p>
                                    <p className="text-xs opacity-70 mt-0.5">{format(day, 'yyyy')}</p>
                                  </div>
                                  {status ? <StatusBadge status={status} /> : <Badge variant="outline" className="text-[10px] border-black/[0.1] dark:border-white/[0.1] text-muted-foreground">No Record</Badge>}
                                </div>
                              </div>
                              {record ? (
                                <div className="p-3 space-y-2.5">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-black/[0.03] dark:bg-white/[0.05] rounded-lg p-2">
                                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Clock In</p>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <p className="text-sm font-mono font-medium text-emerald-400">{(record.firstIn || record.clockIn)?.substring(0, 5) || '—'}</p>
                                        {record.isEdited && <Pencil className="h-2.5 w-2.5 text-amber-400" />}
                                      </div>
                                    </div>
                                    <div className="bg-black/[0.03] dark:bg-white/[0.05] rounded-lg p-2">
                                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Clock Out</p>
                                      <p className="text-sm font-mono font-medium text-rose-400 mt-0.5">{(record.lastOut || record.clockOut)?.substring(0, 5) || '—'}</p>
                                    </div>
                                    <div className="bg-black/[0.03] dark:bg-white/[0.05] rounded-lg p-2">
                                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Hours</p>
                                      <p className={cn(
                                        'text-sm font-mono font-bold mt-0.5',
                                        (record.totalHours ?? 0) >= 8 ? 'text-emerald-400' :
                                        (record.totalHours ?? 0) >= 6 ? 'text-amber-400' : 'text-rose-400'
                                      )}>
                                        {record.totalHours != null ? `${record.totalHours.toFixed(1)}h` : '—'}
                                      </p>
                                    </div>
                                    <div className="bg-black/[0.03] dark:bg-white/[0.05] rounded-lg p-2">
                                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Overtime</p>
                                      <p className="text-sm font-mono font-medium text-amber-400 mt-0.5">
                                        {record.overtimeHours != null && record.overtimeHours > 0 ? `${record.overtimeHours.toFixed(1)}h` : '—'}
                                      </p>
                                    </div>
                                  </div>
                                  {record.method && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <MethodIcon method={record.method} className="h-3 w-3" />
                                      <span className="capitalize">via {record.method}</span>
                                    </div>
                                  )}
                                  {record.note && (
                                    <div className="text-xs text-muted-foreground bg-black/[0.03] dark:bg-white/[0.05] rounded-lg p-2">
                                      <p className="text-[10px] uppercase tracking-wider mb-0.5">Note</p>
                                      {record.note}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                  <Calendar className="h-6 w-6 mx-auto mb-1.5 opacity-30" />
                                  No attendance record
                                </div>
                              )}
                            </PopoverContent>
                          </Popover>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>

            {/* Legend Strip */}
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.05]">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                {[
                  { label: 'Present', color: 'bg-emerald-500' },
                  { label: 'Late', color: 'bg-amber-500' },
                  { label: 'Absent', color: 'bg-rose-500' },
                  { label: 'Half-day', color: 'bg-cyan-400' },
                  { label: 'Weekend', color: 'bg-slate-600' },
                  { label: 'Holiday', color: 'bg-purple-500' },
                ].map(l => (
                  <span key={l.label} className="flex items-center gap-1.5">
                    <div className={cn('h-2.5 w-2.5 rounded', l.color)} />
                    {l.label}
                  </span>
                ))}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════
            SECTION 5: Punch Timeline (Today)
        ═══════════════════════════════════════════════════════ */}
        <motion.div {...fadeIn} transition={{ delay: 0.4 }}>
          <GlassCard className="p-6" glow="cyan">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-cyan-400" />
                <h3 className="font-semibold">Today&apos;s Punch Timeline</h3>
              </div>
              <div className="flex items-center gap-2">
                {todayRecord?.totalHours != null && (
                  <Badge variant="outline" className="text-xs border-cyan-500/20 text-cyan-400 bg-cyan-500/5">
                    <Timer className="h-3 w-3 mr-1" /> {todayRecord.totalHours.toFixed(1)}h total
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMissedPunchDialogOpen(true)}
                  className="text-xs gap-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                >
                  <AlertTriangle className="h-3 w-3" /> Add Missed Punch
                </Button>
              </div>
            </div>
            {punchTimelineData.length > 0 ? (
              <div className="relative pl-8 space-y-3">
                {/* Vertical line */}
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-emerald-500/30 via-cyan-500/20 to-rose-500/30" />
                {punchTimelineData.map((log, i) => {
                  const time = (() => { try { return format(log.punchDate, 'HH:mm:ss'); } catch { return ''; } })();
                  const isCI = log.punchType === 'clock-in';
                  const isBreakStart = log.punchType === 'break-start';
                  const isBreakEnd = log.punchType === 'break-end';
                  const isBreak = isBreakStart || isBreakEnd;

                  // Find break duration: if this is break-end, find the matching break-start
                  let breakDuration: string | null = null;
                  if (isBreakEnd) {
                    const sorted = [...punchTimelineData];
                    for (let j = i - 1; j >= 0; j--) {
                      if (sorted[j].punchType === 'break-start') {
                        const diffMins = Math.round((log.punchDate.getTime() - sorted[j].punchDate.getTime()) / (1000 * 60));
                        if (diffMins >= 60) {
                          breakDuration = `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
                        } else {
                          breakDuration = `${diffMins}m`;
                        }
                        break;
                      }
                    }
                  }

                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="relative"
                    >
                      {/* Timeline dot */}
                      <div className={cn(
                        "absolute left-[-26px] top-3 h-5 w-5 rounded-full flex items-center justify-center z-10 border-2",
                        isBreakStart ? "bg-amber-500/20 border-amber-500/40 text-amber-400" :
                        isBreakEnd ? "bg-orange-500/20 border-orange-500/40 text-orange-400" :
                        isCI ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" :
                        "bg-rose-500/20 border-rose-500/40 text-rose-400"
                      )}>
                        {isBreakStart ? <Coffee className="h-2 w-2" /> :
                         isBreakEnd ? <Play className="h-2 w-2" /> :
                         isCI ? <Play className="h-2 w-2" /> : <Square className="h-2 w-2" />}
                      </div>
                      {/* Content card */}
                      <div className={cn(
                        "p-3 rounded-xl border transition-colors",
                        isBreak ? "bg-amber-500/5 border-amber-500/10 hover:bg-amber-500/8" :
                        log.gapLarge ? "border-amber-500/30 bg-amber-500/5" :
                        isCI ? "bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/8" :
                        "bg-rose-500/5 border-rose-500/10 hover:bg-rose-500/8"
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">
                              {isBreakStart ? '☕ Break Started' :
                               isBreakEnd ? '▶️ Break Ended' :
                               isCI ? 'Clock In' : 'Clock Out'}
                            </span>
                            {isBreak && (
                              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                                Break
                              </Badge>
                            )}
                            {log.isFlagged && (
                              <Badge variant="outline" className="text-[10px] border-amber-500/20 text-amber-400 bg-amber-500/5">
                                <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> Flagged
                              </Badge>
                            )}
                            {log.gapLarge && (
                              <Badge variant="outline" className="text-[10px] border-amber-500/20 text-amber-400 bg-amber-500/5">
                                <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> Long Gap
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs font-mono text-muted-foreground">{time}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MethodIcon method={log.method} />
                            <span className="capitalize">{log.method}</span>
                            {log.confidence != null && (
                              <span className="text-[10px] opacity-60">({log.confidence}%)</span>
                            )}
                            {'locationName' in log && log.locationName && (
                              <span className="flex items-center gap-0.5 text-[10px]">
                                <MapPin className="h-2.5 w-2.5" /> {log.locationName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            {breakDuration && (
                              <span className="text-amber-400 font-medium">
                                <Timer className="h-3 w-3 inline mr-0.5" />
                                {breakDuration} break
                              </span>
                            )}
                            {log.gap && (
                              <span className={cn(log.gapLarge ? 'text-amber-400 font-medium' : 'text-muted-foreground')}>
                                <ArrowRight className="h-3 w-3 inline mr-0.5" />
                                {log.gap} gap
                              </span>
                            )}
                            {log.runningHours > 0 && !isCI && !isBreak && (
                              <span className="text-cyan-400 font-medium">
                                <Timer className="h-3 w-3 inline mr-0.5" />
                                {log.runningHours.toFixed(1)}h total
                              </span>
                            )}
                          </div>
                        </div>
                        {log.flagReason && (
                          <p className="text-[10px] text-amber-400/70 mt-1">Flag: {log.flagReason}</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No punches recorded today
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════
            SECTION 6 & 7: Weekly Hours Chart + Attendance Trends
        ═══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Weekly Hours Chart */}
          <motion.div {...fadeIn} transition={{ delay: 0.45 }}>
            <GlassCard className="p-6" glow="cyan">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-cyan-400" />
                  <h3 className="font-semibold">Weekly Hours</h3>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><div className="h-2 w-2 rounded bg-cyan-500/60" /> Regular</span>
                  <span className="flex items-center gap-1"><div className="h-2 w-2 rounded bg-amber-500/60" /> Overtime</span>
                  <span className="flex items-center gap-1"><div className="h-2 w-1 bg-amber-500/40" style={{ borderLeft: '1px dashed rgba(245,158,11,0.5)' }} /> 8h target</span>
                </div>
              </div>
              <MiniBarChart data={weeklyChartData} />
            </GlassCard>
          </motion.div>

          {/* Attendance Trends */}
          <motion.div {...fadeIn} transition={{ delay: 0.5 }}>
            <GlassCard className="p-6" glow="emerald">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <h3 className="font-semibold">30-Day Trends</h3>
                </div>
              </div>
              <div className="grid grid-cols-[1fr_80px] gap-4 items-center">
                <MiniTrendLine data={trendData} />
                <div className="flex flex-col items-center gap-1">
                  <MiniDonut onTime={stats.presentDays} late={stats.lateDays} />
                  <p className="text-[10px] text-muted-foreground text-center">On-time vs Late</p>
                  <p className="text-xs font-semibold text-emerald-400">{stats.onTimeRate}%</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            SECTION 8: Regularization Requests
        ═══════════════════════════════════════════════════════ */}
        <motion.div {...fadeIn} transition={{ delay: 0.55 }}>
          <GlassCard className="p-6" glow="amber">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileEdit className="h-4 w-4 text-amber-400" />
                <h3 className="font-semibold">Regularization Requests</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRegDialogOpen(true)}
                className="gap-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              >
                <FileEdit className="h-3 w-3" /> Request Regularization
              </Button>
            </div>
            {regRequests.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {regRequests.map(req => (
                  <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.05] hover:border-black/[0.1] dark:hover:border-white/[0.1] transition-colors">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{req.title}</p>
                      <p className="text-xs text-muted-foreground">{req.description.substring(0, 80)}...</p>
                      <p className="text-[10px] text-muted-foreground">{format(new Date(req.createdAt), 'MMM d, yyyy')}</p>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <FileEdit className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No regularization requests
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════
            SECTION 9: Overtime Section + Shift Info (side by side)
        ═══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Overtime Section */}
          <motion.div {...fadeIn} transition={{ delay: 0.6 }}>
            <GlassCard className="p-6" glow="amber">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-400" />
                  <h3 className="font-semibold">Overtime</h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOtDialogOpen(true)}
                  className="gap-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                >
                  <HandCoins className="h-3 w-3" /> Request Overtime
                </Button>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-amber-400">{stats.totalOvertime.toFixed(1)}h</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total OT This Month</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-400">
                    ${(stats.totalOvertime * (user?.salary ? user.salary / 160 : 25)).toFixed(0)}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Est. OT Pay</p>
                </div>
              </div>

              {/* Overtime log */}
              {overtimeLog.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {overtimeLog.map(ot => (
                    <div key={ot.date} className="flex items-center justify-between p-2.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.05]">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{format(new Date(ot.date), 'MMM d')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-amber-400">{ot.hours.toFixed(1)}h</span>
                        <Badge variant="outline" className={cn(
                          'text-[9px]',
                          ot.status === 'auto' ? 'border-cyan-500/20 text-cyan-400 bg-cyan-500/5' :
                          ot.status === 'approved' ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' :
                          'border-amber-500/20 text-amber-400 bg-amber-500/5'
                        )}>
                          {ot.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-4">No overtime logged this month</p>
              )}
            </GlassCard>
          </motion.div>

          {/* Shift Information Card */}
          <motion.div {...fadeIn} transition={{ delay: 0.65 }}>
            <GlassCard className="p-6" glow="cyan">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-cyan-400" />
                  <h3 className="font-semibold">Shift Information</h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShiftSwapDialogOpen(true)}
                  className="gap-1 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                >
                  <ArrowLeftRight className="h-3 w-3" /> Request Shift Swap
                </Button>
              </div>

              {defaultShift ? (
                <div className="space-y-3">
                  {/* Shift header */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.05]">
                    {defaultShift.color && (
                      <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: defaultShift.color + '20' }}>
                        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: defaultShift.color }} />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">{defaultShift.name}</p>
                      <p className="text-xs text-muted-foreground">{defaultShift.startTime} - {defaultShift.endTime}</p>
                    </div>
                    {defaultShift.isDefault && (
                      <Badge className="ml-auto text-[10px] bg-cyan-500/20 text-cyan-400 border-cyan-500/30">Default</Badge>
                    )}
                  </div>

                  {/* Shift details grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Start Time', value: defaultShift.startTime, icon: Sun, color: 'text-amber-400' },
                      { label: 'End Time', value: defaultShift.endTime, icon: Clock, color: 'text-cyan-400' },
                      { label: 'Grace Period', value: `${defaultShift.gracePeriod} min`, icon: AlertTriangle, color: 'text-amber-400' },
                      { label: 'Half-Day Min', value: `${defaultShift.halfDayMin}h`, icon: Timer, color: 'text-emerald-400' },
                      { label: 'OT Threshold', value: `${defaultShift.overtimeThreshold}h`, icon: Flame, color: 'text-amber-400' },
                      { label: 'Shift ID', value: defaultShift.id.substring(0, 8), icon: Info, color: 'text-slate-400' },
                    ].map(detail => (
                      <div key={detail.label} className="flex items-center gap-2 p-2.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.05]">
                        <detail.icon className={cn('h-3.5 w-3.5 shrink-0', detail.color)} />
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{detail.label}</p>
                          <p className="text-xs font-medium truncate">{detail.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No shift assigned
                </div>
              )}
            </GlassCard>
          </motion.div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            DIALOGS
        ═══════════════════════════════════════════════════════ */}

        {/* PIN Clock-In Dialog */}
        <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
          <DialogContent className="bg-background/95 border-border max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CircleDot className="h-5 w-5 text-cyan-400" /> PIN Clock In
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">Enter your PIN code to clock in securely.</p>
              <Input
                type="password"
                placeholder="Enter PIN"
                value={pinValue}
                onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
                className="text-center text-2xl font-mono tracking-[0.5em] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setPinDialogOpen(false)}>Cancel</Button>
              <Button onClick={handlePinClockIn} disabled={clockingIn || pinValue.length < 4} className="bg-cyan-600 hover:bg-cyan-500">
                {clockingIn ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CircleDot className="h-4 w-4 mr-2" />}
                Verify & Clock In
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Face ID Dialog */}
        <Dialog open={faceDialogOpen} onOpenChange={setFaceDialogOpen}>
          <DialogContent className="bg-background/95 border-border max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Fingerprint className="h-5 w-5 text-amber-400" /> Face ID Clock In
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="mx-auto w-40 h-40 rounded-full border-2 border-dashed border-amber-500/40 flex items-center justify-center bg-amber-500/5">
                <div className="text-center">
                  <Fingerprint className="h-12 w-12 text-amber-400/50 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Face scanning...</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">Position your face within the frame for verification.</p>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setFaceDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleFaceClockIn} disabled={clockingIn} className="bg-amber-600 hover:bg-amber-500">
                {clockingIn ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Fingerprint className="h-4 w-4 mr-2" />}
                Verify & Clock In
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Regularization Request Dialog */}
        <Dialog open={regDialogOpen} onOpenChange={setRegDialogOpen}>
          <DialogContent className="bg-background/95 border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileEdit className="h-5 w-5 text-amber-400" /> Request Regularization
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Date</label>
                <Input
                  type="date"
                  value={regForm.date}
                  onChange={(e) => setRegForm(f => ({ ...f, date: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Punch Type</label>
                <Select value={regForm.punchType} onValueChange={(v) => setRegForm(f => ({ ...f, punchType: v }))}>
                  <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    <SelectItem value="clock-in">Clock In</SelectItem>
                    <SelectItem value="clock-out">Clock Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Requested Time</label>
                <Input
                  type="time"
                  value={regForm.requestedTime}
                  onChange={(e) => setRegForm(f => ({ ...f, requestedTime: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Reason</label>
                <Textarea
                  value={regForm.reason}
                  onChange={(e) => setRegForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Explain why you need this regularization..."
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] mt-1 min-h-[80px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRegDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleRegSubmit} disabled={submitting} className="bg-amber-600 hover:bg-amber-500">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Overtime Request Dialog */}
        <Dialog open={otDialogOpen} onOpenChange={setOtDialogOpen}>
          <DialogContent className="bg-background/95 border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-amber-400" /> Request Overtime
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Date</label>
                <Input
                  type="date"
                  value={otForm.date}
                  onChange={(e) => setOtForm(f => ({ ...f, date: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Hours</label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="12"
                  value={otForm.hours}
                  onChange={(e) => setOtForm(f => ({ ...f, hours: e.target.value }))}
                  placeholder="e.g. 2.5"
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Reason</label>
                <Textarea
                  value={otForm.reason}
                  onChange={(e) => setOtForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Explain why overtime is needed..."
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] mt-1 min-h-[80px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOtDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleOtSubmit} disabled={submitting} className="bg-amber-600 hover:bg-amber-500">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Shift Swap Request Dialog */}
        <Dialog open={shiftSwapDialogOpen} onOpenChange={setShiftSwapDialogOpen}>
          <DialogContent className="bg-background/95 border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 text-cyan-400" /> Request Shift Swap
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Current Shift</label>
                <p className="text-sm font-medium mt-1 p-2 bg-black/[0.03] dark:bg-white/[0.05] rounded-lg border border-black/[0.1] dark:border-white/[0.1]">
                  {defaultShift?.name || 'Not assigned'} ({defaultShift?.startTime} - {defaultShift?.endTime})
                </p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Target Shift</label>
                <Select value={shiftSwapForm.targetShiftId} onValueChange={(v) => setShiftSwapForm(f => ({ ...f, targetShiftId: v }))}>
                  <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] mt-1">
                    <SelectValue placeholder="Select shift" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    {shifts.filter(s => s.id !== defaultShift?.id).map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.startTime} - {s.endTime})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Reason</label>
                <Textarea
                  value={shiftSwapForm.reason}
                  onChange={(e) => setShiftSwapForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Explain why you want to swap shifts..."
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] mt-1 min-h-[80px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShiftSwapDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleShiftSwapSubmit} disabled={submitting} className="bg-cyan-600 hover:bg-cyan-500">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Missed Punch Dialog */}
        <Dialog open={missedPunchDialogOpen} onOpenChange={setMissedPunchDialogOpen}>
          <DialogContent className="bg-background/95 border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" /> Add Missed Punch
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Date</label>
                <Input
                  type="date"
                  value={missedPunchForm.date}
                  onChange={(e) => setMissedPunchForm(f => ({ ...f, date: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Punch Type</label>
                <Select value={missedPunchForm.punchType} onValueChange={(v) => setMissedPunchForm(f => ({ ...f, punchType: v }))}>
                  <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    <SelectItem value="clock-in">Clock In</SelectItem>
                    <SelectItem value="clock-out">Clock Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Requested Time</label>
                <Input
                  type="time"
                  value={missedPunchForm.requestedTime}
                  onChange={(e) => setMissedPunchForm(f => ({ ...f, requestedTime: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Reason</label>
                <Textarea
                  value={missedPunchForm.reason}
                  onChange={(e) => setMissedPunchForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Explain the missed punch..."
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] mt-1 min-h-[80px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setMissedPunchDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleMissedPunchSubmit} disabled={submitting} className="bg-amber-600 hover:bg-amber-500">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </TooltipProvider>
  );
}
