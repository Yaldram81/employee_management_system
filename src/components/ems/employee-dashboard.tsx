'use client';

import { useEMSStore } from '@/lib/store';
import { StatCard } from './stat-card';
import { GlassCard } from './glass-card';
import { StatusBadge } from './status-badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import {
  Clock, CalendarDays, ListTodo, CheckCircle2, Timer,
  Award, Target, Flame, ArrowRight, Zap, Eye,
  AlertCircle, DollarSign, FileText, MessageSquare,
  ChevronRight, Activity, ClipboardList, Star,
  LogIn, LogOut, Monitor, Home, RefreshCw, Laptop,
  TrendingUp, TrendingDown, FileCheck, GraduationCap,
  Shield, AlertTriangle, Bell, Plus, Calendar,
  Users, Briefcase, Building2, Settings,
  HeartPulse, HandMetal, Clock4, UserCheck,
  Coffee, BookOpen, PenTool, Overtime,
  Lightbulb, Inbox,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  ProgressRing, MiniBarChart, DonutChart, PipelineStage, TaskKanbanMini,
  getGreeting, getGreetingEmoji, formatCurrency, timeAgo, fadeIn, actionColorMap,
} from '@/components/ems/shared';
import type { ActivityItem } from '@/components/ems/shared';

// ─── Daily Productivity Tips ────────────────────────────────────
const dailyTips = [
  { text: 'Break large tasks into smaller steps. Small wins build momentum!', icon: '\u{1F3AF}' },
  { text: 'Try the Pomodoro technique: 25 min focus, 5 min break.', icon: '\u23F1\uFE0F' },
  { text: 'Start your day with the hardest task — eat the frog first!', icon: '\u{1F438}' },
  { text: 'Batch similar tasks together to reduce context switching.', icon: '\u{1F4E6}' },
  { text: 'Take a 5-minute walk every hour. Movement boosts creativity.', icon: '\u{1F6B6}' },
  { text: 'Review your goals every Monday. Alignment drives progress.', icon: '\u{1F4CB}' },
  { text: 'End each day by writing tomorrow\'s top 3 priorities.', icon: '\u270D\uFE0F' },
  { text: 'Single-task when possible. Multitasking reduces quality by 40%.', icon: '\u0031\uFE0F\u20E3' },
  { text: 'Declutter your workspace. A tidy desk = a tidy mind.', icon: '\u{1F9F9}' },
  { text: 'Celebrate small wins. Progress fuels motivation.', icon: '\u{1F389}' },
  { text: 'Block distracting websites during focus hours.', icon: '\u{1F6AB}' },
  { text: 'Hydrate! Drinking water improves concentration by 14%.', icon: '\u{1F4A7}' },
  { text: 'Practice the 2-minute rule: if it takes less than 2 min, do it now.', icon: '\u26A1' },
  { text: 'Use keyboard shortcuts. They save an average of 8 days per year.', icon: '\u2328\uFE0F' },
];

// ─── Motivational Quotes (daily rotation by day-of-year) ────────
const motivationalQuotes = [
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill' },
  { text: 'Believe you can and you\'re halfway there.', author: 'Theodore Roosevelt' },
  { text: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Eleanor Roosevelt' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'Don\'t watch the clock; do what it does. Keep going.', author: 'Sam Levenson' },
  { text: 'Everything you\'ve ever wanted is on the other side of fear.', author: 'George Addair' },
  { text: 'You are never too old to set another goal or to dream a new dream.', author: 'C.S. Lewis' },
  { text: 'The only limit to our realization of tomorrow is our doubts of today.', author: 'Franklin D. Roosevelt' },
  { text: 'Act as if what you do makes a difference. It does.', author: 'William James' },
  { text: 'What you get by achieving your goals is not as important as what you become.', author: 'Zig Ziglar' },
  { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese Proverb' },
  { text: 'Your limitation—it\'s only your imagination.', author: 'Unknown' },
  { text: 'Push yourself, because no one else is going to do it for you.', author: 'Unknown' },
  { text: 'Great things never come from comfort zones.', author: 'Unknown' },
  { text: 'Dream it. Wish it. Do it.', author: 'Unknown' },
  { text: 'Success doesn\'t just find you. You have to go out and get it.', author: 'Unknown' },
  { text: 'The harder you work for something, the greater you\'ll feel when you achieve it.', author: 'Unknown' },
  { text: 'Don\'t stop when you\'re tired. Stop when you\'re done.', author: 'Unknown' },
  { text: 'Wake up with determination. Go to bed with satisfaction.', author: 'Unknown' },
  { text: 'Do something today that your future self will thank you for.', author: 'Sean Patrick Flanery' },
  { text: 'Little things make big days.', author: 'Unknown' },
  { text: 'It\'s going to be hard, but hard does not mean impossible.', author: 'Unknown' },
  { text: 'Don\'t wait for opportunity. Create it.', author: 'Unknown' },
  { text: 'Sometimes we\'re tested not to show our weaknesses, but to discover our strengths.', author: 'Unknown' },
  { text: 'The key to success is to focus on goals, not obstacles.', author: 'Unknown' },
  { text: 'Dream bigger. Do bigger.', author: 'Unknown' },
  { text: 'Stay positive, work hard, make it happen.', author: 'Unknown' },
  { text: 'You don\'t have to be great to start, but you have to start to be great.', author: 'Zig Ziglar' },
  { text: 'The way to get started is to quit talking and begin doing.', author: 'Walt Disney' },
  { text: 'If you are working on something that you really care about, you don\'t have to be pushed. The vision pulls you.', author: 'Steve Jobs' },
  { text: 'Hardships often prepare ordinary people for an extraordinary destiny.', author: 'C.S. Lewis' },
  { text: 'Knowing is not enough; we must apply. Wishing is not enough; we must do.', author: 'Johann Wolfgang von Goethe' },
  { text: 'We generate fears while we sit. We overcome them by action.', author: 'Dr. Henry Link' },
  { text: 'Whether you think you can or you think you can\'t, you\'re right.', author: 'Henry Ford' },
];

function getDailyQuote() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return motivationalQuotes[dayOfYear % motivationalQuotes.length];
}

// ─── Achievement Badges ─────────────────────────────────────────
interface Achievement {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  condition: boolean;
  description: string;
}

export function EmployeeDashboard() {
  const { user, attendance, tasks, leaves, leaveBalance, notifications, payroll, complaints, requests, shifts, users, departments, setActiveView, setClockInModalOpen, clockIn, markNotificationRead } = useEMSStore();

  // ── Live Clock State ──────────────────────────────────────
  const [liveTime, setLiveTime] = useState(new Date());
  const [tipIndex, setTipIndex] = useState(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    return dayOfYear % dailyTips.length;
  });

  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const now = liveTime;
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const secondsStr = String(now.getSeconds()).padStart(2, '0');

  const today = new Date().toISOString().split('T')[0];

  // ── Employee-scoped data ──────────────────────────────────
  const myAttendance = useMemo(() => attendance.filter(a => a.userId === user?.id), [attendance, user]);
  const myTasks = useMemo(() => tasks.filter(t => t.assigneeId === user?.id), [tasks, user]);
  const myLeaves = useMemo(() => leaves.filter(l => l.userId === user?.id), [leaves, user]);
  const myPayroll = useMemo(() => payroll.filter(p => p.userId === user?.id), [payroll, user]);
  const myComplaints = useMemo(() => complaints.filter(c => c.userId === user?.id), [complaints, user]);
  const myRequests = useMemo(() => requests.filter(r => r.userId === user?.id), [requests, user]);

  const todayRecord = myAttendance.find(a => a.date === today);
  const isClockedIn = !!todayRecord?.firstIn || !!todayRecord?.clockIn;
  const isClockedOut = !!todayRecord?.lastOut || !!todayRecord?.clockOut;
  const [clockingIn, setClockingIn] = useState(false);

  // ── AI Insights State ───────────────────────────────────
  const [aiInsights, setAiInsights] = useState<{
    briefing: string;
    aiAlerts: string;
    alerts: Array<{ text: string; action: string; severity: 'warning' | 'danger' | 'info' }>;
    suggestions: Array<{ text: string; action: string; type: 'attendance' | 'tasks' | 'balance' }>;
    priorityInbox: Array<{
      id: string;
      type: 'task' | 'leave' | 'request' | 'complaint' | 'notification';
      title: string;
      description: string;
      priority: 'urgent' | 'high' | 'medium' | 'low';
      dueDate?: string;
      actionUrl: string;
      actionLabel: string;
      createdAt: string;
    }>;
    generatedAt: string;
  } | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsError, setInsightsError] = useState(false);

  // ── Fetch AI Insights ───────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    setInsightsLoading(true);
    setInsightsError(false);
    fetch('/api/ai-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id }),
    })
      .then(r => r.ok ? r.json() : Promise.reject('Failed'))
      .then(data => {
        setAiInsights(data.data || data);
        setInsightsLoading(false);
      })
      .catch(() => {
        setInsightsError(true);
        setInsightsLoading(false);
      });
  }, [user?.id]);

  // ── Today's Hours ─────────────────────────────────────────
  const todayTotalHours = useMemo(() => {
    if (!todayRecord?.firstIn && !todayRecord?.clockIn) return 0;
    const clockInTime = todayRecord?.firstIn || todayRecord?.clockIn;
    const clockOutTime = todayRecord?.lastOut || todayRecord?.clockOut;

    if (clockOutTime) return todayRecord?.totalHours ?? 0;
    if (clockInTime && isClockedIn) {
      try {
        const [h, m, s] = clockInTime.split(':').map(Number);
        const inMinutes = (h * 60) + m + (s || 0) / 60;
        const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
        return Math.max(0, (nowMinutes - inMinutes) / 60);
      } catch {
        return todayRecord?.totalHours ?? 0;
      }
    }
    return todayRecord?.totalHours ?? 0;
  }, [todayRecord, isClockedIn, now]);

  // ── Shift timer ───────────────────────────────────────────
  const myShift = useMemo(() => {
    if (!user?.shiftId) return shifts.find(s => s.isDefault) || null;
    return shifts.find(s => s.id === user.shiftId) || shifts.find(s => s.isDefault) || null;
  }, [shifts, user]);

  const shiftTimerInfo = useMemo(() => {
    if (!myShift || !isClockedIn || isClockedOut) {
      if (isClockedOut && myShift) {
        return { label: 'Day Complete', value: '', isOvertime: false };
      }
      return null;
    }
    try {
      const [eH, eM] = myShift.endTime.split(':').map(Number);
      const endMinutes = eH * 60 + eM;
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const diff = endMinutes - nowMinutes;
      const isOvertime = diff < 0;
      const absDiff = Math.abs(diff);
      const hours = Math.floor(absDiff / 60);
      const mins = absDiff % 60;
      if (isOvertime) {
        return { label: 'Overtime', value: `${hours}h ${mins}m`, isOvertime: true };
      }
      return { label: 'Shift Ends In', value: `${hours}h ${mins}m`, isOvertime: false };
    } catch {
      return null;
    }
  }, [myShift, isClockedIn, isClockedOut, now]);

  // ── Task metrics ──────────────────────────────────────────
  const doneCount = myTasks.filter(t => t.status === 'done').length;
  const todoCount = myTasks.filter(t => t.status === 'todo').length;
  const inProgressCount = myTasks.filter(t => t.status === 'in-progress').length;
  const overdueTasks = myTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done');
  const taskDoneRate = myTasks.length > 0 ? Math.round((doneCount / myTasks.length) * 100) : 0;

  // ── Attendance rate (monthly) ─────────────────────────────
  const currentMonth = format(new Date(), 'yyyy-MM');
  const monthlyAttendance = useMemo(() => {
    const monthStart = format(new Date(), 'yyyy-MM-01');
    return myAttendance.filter(a => a.date >= monthStart);
  }, [myAttendance]);
  const attendanceRate = monthlyAttendance.length > 0
    ? Math.round((monthlyAttendance.filter(a => a.status === 'present' || a.status === 'late').length / monthlyAttendance.length) * 100)
    : 0;

  // ── Pending leaves ────────────────────────────────────────
  const pendingLeaves = myLeaves.filter(l => l.status === 'pending').length;

  // ── On-time streak ────────────────────────────────────────
  const streakCount = useMemo(() => {
    const sortedAttendance = [...myAttendance]
      .filter(a => a.status === 'present' || a.status === 'late')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let streak = 0;
    const lateThreshold = '09:15';
    for (const record of sortedAttendance) {
      const clockInTime = record.firstIn || record.clockIn;
      if (record.status === 'late' || (clockInTime && clockInTime > lateThreshold)) break;
      if (record.status === 'present') streak++;
    }
    return streak;
  }, [myAttendance]);

  // ── Overtime this month ───────────────────────────────────
  const totalOvertime = useMemo(() => {
    const monthStart = format(new Date(), 'yyyy-MM-01');
    return myAttendance
      .filter(a => a.date >= monthStart)
      .reduce((sum, a) => sum + (a.overtimeHours || 0), 0);
  }, [myAttendance]);

  // ── Net salary (current month) ────────────────────────────
  const currentPayroll = myPayroll.find(p => p.month === currentMonth);
  const lastMonth = format(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), 'yyyy-MM');
  const lastMonthPayroll = myPayroll.find(p => p.month === lastMonth);
  const netSalary = currentPayroll?.netSalary ?? 0;
  const salaryTrend = useMemo(() => {
    if (!lastMonthPayroll) return 0;
    return netSalary - lastMonthPayroll.netSalary;
  }, [netSalary, lastMonthPayroll]);

  // ── Open requests ─────────────────────────────────────────
  const openRequests = myRequests.filter(r => r.status === 'pending').length;

  // ── Unread notifications ──────────────────────────────────
  const unreadNotifications = useMemo(() => notifications.filter(n => !n.isRead), [notifications]);
  const unreadCount = unreadNotifications.length;

  // ── Training progress (computed from task completion + attendance) ──
  const trainingProgress = useMemo(() => {
    const baseProgress = Math.min(100, Math.round((attendanceRate * 0.4) + (taskDoneRate * 0.6)));
    return baseProgress;
  }, [attendanceRate, taskDoneRate]);

  // ── Upcoming section ──────────────────────────────────────
  const upcoming = useMemo(() => {
    const nowDate = new Date();
    const nextDeadline = myTasks
      .filter(t => t.dueDate && t.status !== 'done')
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())[0];
    const nextLeave = myLeaves
      .filter(l => l.status === 'approved' && new Date(l.startDate) >= nowDate)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];
    const pendingApprovals = myRequests.filter(r => r.status === 'pending').length + pendingLeaves;
    return { nextDeadline, nextLeave, pendingApprovals };
  }, [myTasks, myLeaves, myRequests, pendingLeaves]);

  // ── Achievement Badges ────────────────────────────────────
  const achievements: Achievement[] = useMemo(() => [
    {
      id: 'first-clock-in',
      label: 'First Clock-in',
      icon: Zap,
      color: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 text-emerald-400',
      condition: myAttendance.length > 0,
      description: 'Clocked in for the first time',
    },
    {
      id: 'perfect-week',
      label: 'Perfect Week',
      icon: Star,
      color: 'from-amber-500/20 to-amber-600/5 border-amber-500/30 text-amber-400',
      condition: streakCount >= 5,
      description: '5+ days on time in a row',
    },
    {
      id: 'task-master',
      label: 'Task Master',
      icon: Target,
      color: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/30 text-cyan-400',
      condition: doneCount >= 3,
      description: 'Completed 3+ tasks',
    },
    {
      id: 'fire-streak',
      label: 'On Fire',
      icon: Flame,
      color: 'from-rose-500/20 to-rose-600/5 border-rose-500/30 text-rose-400',
      condition: streakCount >= 10,
      description: '10+ days on-time streak',
    },
    {
      id: 'early-bird',
      label: 'Early Bird',
      icon: Clock4,
      color: 'from-violet-500/20 to-violet-600/5 border-violet-500/30 text-violet-400',
      condition: !!todayRecord?.firstIn && todayRecord.firstIn < '09:00',
      description: 'Arrived before 9 AM today',
    },
  ], [myAttendance, streakCount, doneCount, todayRecord]);

  const earnedBadges = achievements.filter(a => a.condition);

  // ── Goals / OKRs (simulated) ──────────────────────────────
  const goals = useMemo(() => [
    { id: 'g1', title: 'Complete Q1 deliverables', progress: Math.min(taskDoneRate, 100), color: 'emerald' },
    { id: 'g2', title: 'Maintain 95% attendance', progress: Math.min(attendanceRate, 100), color: 'cyan' },
    { id: 'g3', title: 'Zero overdue tasks', progress: overdueTasks.length === 0 ? 100 : Math.max(0, 100 - overdueTasks.length * 20), color: 'amber' },
  ], [taskDoneRate, attendanceRate, overdueTasks.length]);

  const performanceRating = useMemo(() => {
    const raw = (attendanceRate * 0.3) + (taskDoneRate * 0.4) + (streakCount >= 5 ? 30 : streakCount * 6);
    return Math.min(5, Math.round((raw / 100) * 5 * 10) / 10);
  }, [attendanceRate, taskDoneRate, streakCount]);

  // ── Weekly attendance data ────────────────────────────────
  const weeklyData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const counts = days.map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - d.getDay() + i + 1);
      const ds = d.toISOString().split('T')[0];
      return myAttendance.filter(a => a.date === ds && (a.status === 'present' || a.status === 'late')).length;
    });
    return days.map((day, i) => ({ label: day, value: counts[i] }));
  }, [myAttendance]);

  // ── My attendance segments for donut ──────────────────────
  const myAttendanceSegments = useMemo(() => {
    const present = monthlyAttendance.filter(a => a.status === 'present').length;
    const late = monthlyAttendance.filter(a => a.status === 'late').length;
    const absent = monthlyAttendance.filter(a => a.status === 'absent').length;
    const onLeave = myLeaves.filter(l => {
      const lMonth = l.startDate.slice(0, 7);
      return lMonth === currentMonth && l.status === 'approved';
    }).length;
    return [
      { value: present, color: '#10b981', label: 'Present' },
      { value: late, color: '#f59e0b', label: 'Late' },
      { value: onLeave, color: '#06b6d4', label: 'On Leave' },
      { value: absent, color: '#f43f5e', label: 'Absent' },
    ];
  }, [monthlyAttendance, myLeaves, currentMonth]);

  // ── Salary donut segments ─────────────────────────────────
  const salarySegments = useMemo(() => {
    if (!currentPayroll) return [];
    return [
      { value: Math.round(currentPayroll.baseSalary / 1000), color: '#10b981', label: 'Base' },
      { value: Math.round(currentPayroll.overtime / 1000) || 1, color: '#06b6d4', label: 'OT' },
      { value: Math.round(currentPayroll.allowances / 1000) || 1, color: '#f59e0b', label: 'Allow.' },
      { value: Math.round(currentPayroll.deductions / 1000) || 1, color: '#f43f5e', label: 'Deduct.' },
    ];
  }, [currentPayroll]);

  // ── YTD summary ──────────────────────────────────────────
  const ytdEarnings = useMemo(() => {
    const yearStart = format(new Date(), 'yyyy-01');
    return myPayroll
      .filter(p => p.month >= yearStart && p.status === 'paid')
      .reduce((sum, p) => sum + p.netSalary, 0);
  }, [myPayroll]);

  // ── Live activity items (employee-scoped) ─────────────────
  const activityItems = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];

    myAttendance.filter(a => a.date === today).forEach(a => {
      items.push({
        id: `att-${a.id}`,
        icon: CheckCircle2,
        text: 'You clocked in',
        subtext: a.status === 'late' ? 'Late arrival' : 'On time',
        time: a.clockIn || a.firstIn || a.date,
        color: a.status === 'late' ? 'text-amber-400' : 'text-emerald-400',
      });
    });

    if (isClockedOut && todayRecord?.lastOut) {
      items.push({
        id: `att-out-${todayRecord.id}`,
        icon: LogOut,
        text: 'You clocked out',
        subtext: `${todayRecord.totalHours?.toFixed(1) || '0'}h total`,
        time: todayRecord.clockOut || todayRecord.lastOut || today,
        color: 'text-cyan-400',
      });
    }

    myLeaves.filter(l => l.status !== 'pending').slice(0, 3).forEach(l => {
      items.push({
        id: `leave-${l.id}`,
        icon: CalendarDays,
        text: `${l.type} leave ${l.status}`,
        subtext: `${l.startDate} to ${l.endDate || l.startDate}`,
        time: l.createdAt,
        color: l.status === 'approved' ? 'text-emerald-400' : l.status === 'rejected' ? 'text-rose-400' : 'text-amber-400',
      });
    });

    myTasks.filter(t => t.status === 'done').slice(0, 4).forEach(t => {
      items.push({
        id: `task-${t.id}`,
        icon: ListTodo,
        text: `Completed: ${t.title}`,
        subtext: `Priority: ${t.priority}`,
        time: t.completedAt || t.createdAt,
        color: 'text-cyan-400',
      });
    });

    myRequests.filter(r => r.status !== 'pending').slice(0, 3).forEach(r => {
      items.push({
        id: `req-${r.id}`,
        icon: FileCheck,
        text: `Request ${r.status}: ${r.type}`,
        subtext: r.status,
        time: r.createdAt,
        color: r.status === 'approved' ? 'text-emerald-400' : 'text-amber-400',
      });
    });

    myComplaints.filter(c => c.status !== 'open').slice(0, 2).forEach(c => {
      items.push({
        id: `comp-${c.id}`,
        icon: MessageSquare,
        text: `Complaint ${c.status}: ${c.subject}`,
        subtext: c.category,
        time: c.createdAt,
        color: c.status === 'resolved' ? 'text-emerald-400' : 'text-amber-400',
      });
    });

    items.sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime());
    return items.slice(0, 12);
  }, [myAttendance, myLeaves, myTasks, myRequests, myComplaints, today, isClockedOut, todayRecord]);

  // ── Team members (same department) ────────────────────────
  const teamMembers = useMemo(() => {
    if (!user?.departmentId) return [];
    return users.filter(u => u.departmentId === user.departmentId && u.id !== user.id).slice(0, 8);
  }, [users, user]);

  const teamWorkModeDist = useMemo(() => {
    const all = users.filter(u => u.departmentId === user?.departmentId);
    const remote = all.filter(u => u.workMode === 'remote').length;
    const office = all.filter(u => u.workMode === 'office').length;
    const hybrid = all.filter(u => u.workMode === 'hybrid').length;
    return { remote, office, hybrid, total: all.length };
  }, [users, user]);

  // ── Quick actions (12 enterprise actions) ─────────────────
  const quickActions = useMemo(() => [
    { icon: CalendarDays, label: 'Apply Leave', desc: 'Time off request', color: 'amber', action: () => { setActiveView('leaves'); toast.info('Opening Leave Application'); } },
    { icon: FileText, label: 'New Request', desc: 'Submit a request', color: 'cyan', action: () => { setActiveView('requests'); toast.info('Opening Request Form'); } },
    { icon: MessageSquare, label: 'File Complaint', desc: 'Report an issue', color: 'rose', action: () => { setActiveView('complaints'); toast.info('Opening Complaint Form'); } },
    { icon: Clock, label: isClockedIn && !isClockedOut ? 'Clock Out' : 'Clock In', desc: isClockedIn && !isClockedOut ? 'End your shift' : 'Record attendance', color: 'emerald', action: () => { setClockInModalOpen(true); } },
    { icon: ListTodo, label: 'My Tasks', desc: 'View task board', color: 'orange', action: () => { setActiveView('tasks'); toast.info('Opening Tasks'); } },
    { icon: DollarSign, label: 'View Payslip', desc: 'Salary details', color: 'emerald', action: () => { setActiveView('payroll'); toast.info('Opening Payroll'); } },
    { icon: GraduationCap, label: 'My Training', desc: 'Learning programs', color: 'violet', action: () => { setActiveView('training'); toast.info('Opening Training'); } },
    { icon: AlertTriangle, label: 'Report Blocker', desc: 'Flag an issue', color: 'rose', action: () => { setActiveView('tasks'); toast.info('Opening Tasks - Report Blocker'); } },
    { icon: PenTool, label: 'Regularization', desc: 'Request correction', color: 'cyan', action: () => { setActiveView('requests'); toast.info('Opening Regularization Request'); } },
    { icon: Timer, label: 'Overtime Request', desc: 'Claim overtime', color: 'amber', action: () => { setActiveView('requests'); toast.info('Opening Overtime Request'); } },
    { icon: UserCheck, label: 'View Profile', desc: 'Your profile', color: 'violet', action: () => { setActiveView('settings'); toast.info('Opening Profile'); } },
    { icon: Activity, label: 'My Attendance', desc: 'Full records', color: 'cyan', action: () => { setActiveView('attendance'); toast.info('Opening Attendance'); } },
  ], [setActiveView, setClockInModalOpen, isClockedIn, isClockedOut]);

  const handleClockIn = useCallback(async () => {
    setClockingIn(true);
    try {
      await clockIn('pin');
      toast.success(isClockedIn ? 'Clocked out successfully!' : 'Clocked in successfully!');
    } catch {
      toast.error('Clock operation failed. Please try again.');
    } finally {
      setClockingIn(false);
    }
  }, [clockIn, isClockedIn]);

  const handleMarkNotificationRead = useCallback(async (id: string) => {
    try {
      await markNotificationRead(id);
    } catch {
      /* ignore */
    }
  }, [markNotificationRead]);

  const workModeIcon = user?.workMode === 'REMOTE' ? Home : user?.workMode === 'HYBRID' ? Laptop : Monitor;
  const workModeLabel = user?.workMode === 'REMOTE' ? 'Remote' : user?.workMode === 'HYBRID' ? 'Hybrid' : 'Office';
  const WorkModeIcon = workModeIcon;

  const notifTypeIcon: Record<string, LucideIcon> = {
    leave: CalendarDays,
    attendance: Clock,
    task: ListTodo,
    payroll: DollarSign,
    complaint: MessageSquare,
    request: FileCheck,
    system: Settings,
    general: Bell,
  };

  return (
    <div className="space-y-6 pb-4">
      {/* ═══════════════════════════════════════════════════════════
          HERO WELCOME SECTION (ENHANCED)
          ═══════════════════════════════════════════════════════════ */}
      <motion.div {...fadeIn} transition={{ duration: 0.5 }} className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500/10 via-emerald-500/10 to-amber-500/10 border border-black/[0.1] dark:border-white/[0.1] p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-cyan-500/8 to-transparent rounded-full -translate-y-40 translate-x-40" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-emerald-500/6 to-transparent rounded-full translate-y-24 -translate-x-24" />
        <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-gradient-to-bl from-amber-500/4 to-transparent rounded-full" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14 ring-2 ring-cyan-500/30 ring-offset-2 ring-offset-background">
                <AvatarFallback className="bg-gradient-to-br from-cyan-600 to-emerald-600 text-white text-lg font-bold">
                  {user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'EM'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">
                  {getGreeting()}, <span className="bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-400 bg-clip-text text-transparent">{user?.name?.split(' ')[0] || 'there'}</span> {getGreetingEmoji()}
                </h1>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  {todayRecord ? (todayRecord.status === 'present' ? 'You\'re on track today. Keep it up!' : todayRecord.status === 'late' ? 'You clocked in late today. Stay focused!' : 'Have a productive day!') : 'Ready to start your day?'}
                </p>
              </div>
            </div>

            {/* Quick status pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />{isClockedIn ? (isClockedOut ? 'Day Complete' : 'Clocked In') : 'Not Clocked In'}
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-400">
                <CalendarDays className="h-3 w-3" />{pendingLeaves} Pending Leaves
              </div>
              {overdueTasks.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-400 animate-pulse">
                  <AlertCircle className="h-3 w-3" />{overdueTasks.length} Overdue
                </div>
              )}
              {streakCount > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-xs font-medium text-orange-400">
                  <Flame className="h-3 w-3" />{streakCount} Day Streak
                </div>
              )}
              {unreadCount > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-medium text-cyan-400">
                  <Bell className="h-3 w-3" />{unreadCount} Notifications
                </div>
              )}
            </div>
          </div>

          {/* ── Your Status Card (Clock In/Out + Live Clock) ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative shrink-0 w-full lg:w-auto"
          >
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/20 via-emerald-500/15 to-amber-500/10 border border-black/[0.1] dark:border-white/[0.1] p-5 lg:min-w-[300px]">
              {/* Animated background orbs */}
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-bl from-cyan-400/15 to-transparent rounded-full" />
              <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-gradient-to-tr from-emerald-400/10 to-transparent rounded-full" />

              <div className="relative space-y-3">
                {/* Live Clock */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Clock className="h-4 w-4 text-cyan-400" />
                      <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Live</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1]">
                    <WorkModeIcon className="h-3 w-3 text-cyan-400" />
                    <span className="text-[10px] font-medium text-cyan-400">{workModeLabel}</span>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-3xl font-bold tracking-tight tabular-nums">
                    {timeStr}<span className="text-lg text-muted-foreground">:{secondsStr}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{dateStr}</p>
                </div>

                {/* Clock-in/out status & buttons */}
                <div className="border-t border-black/[0.1] dark:border-white/[0.1] pt-3">
                  {isClockedIn && !isClockedOut ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          </span>
                          <div>
                            <p className="text-xs font-medium text-emerald-400">
                              {todayRecord?.status === 'late' ? 'Clocked In (Late)' : 'Clocked In'}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              In at {todayRecord?.firstIn?.slice(0, 5) || todayRecord?.clockIn?.slice(0, 5) || '--:--'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-[10px] text-emerald-400 font-medium">{todayTotalHours.toFixed(1)}h</span>
                        </div>
                      </div>
                      {/* Shift timer */}
                      {shiftTimerInfo && (
                        <div className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-[10px] font-medium ${shiftTimerInfo.isOvertime ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'}`}>
                          <Timer className="h-3 w-3" />
                          {shiftTimerInfo.label}: {shiftTimerInfo.value}
                        </div>
                      )}
                      {/* Clock Out button */}
                      <Button
                        onClick={handleClockIn}
                        disabled={clockingIn}
                        className="w-full bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-semibold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all duration-300 hover:scale-[1.02]"
                      >
                        {clockingIn ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <LogOut className="h-4 w-4 mr-2" />
                        )}
                        {clockingIn ? 'Clocking Out...' : 'Clock Out'}
                      </Button>
                    </div>
                  ) : isClockedOut ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/20">
                          <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                        </span>
                        <div>
                          <p className="text-xs font-medium text-cyan-400">Day Complete</p>
                          <p className="text-[10px] text-muted-foreground">
                            In at {todayRecord?.firstIn?.slice(0, 5) || todayRecord?.clockIn?.slice(0, 5) || '--:--'} — Out at {todayRecord?.lastOut?.slice(0, 5) || todayRecord?.clockOut?.slice(0, 5) || '--:--'}
                          </p>
                        </div>
                      </div>
                      <p className="text-center text-xs text-muted-foreground">
                        Total: <span className="font-bold text-emerald-400">{todayRecord?.totalHours?.toFixed(1) || '0'}h</span>
                      </p>
                    </div>
                  ) : (
                    <Button
                      onClick={handleClockIn}
                      disabled={clockingIn}
                      className="w-full bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white font-semibold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all duration-300 hover:scale-[1.02]"
                    >
                      {clockingIn ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <LogIn className="h-4 w-4 mr-2" />
                      )}
                      {clockingIn ? 'Clocking In...' : 'Clock In Now'}
                    </Button>
                  )}
                </div>

                {/* Personal health indicators */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Shield className="h-2.5 w-2.5" />You
                  </span>
                  <div className="flex items-center gap-0.5" title="Attendance">
                    <span className={`h-1 w-1 rounded-full ${attendanceRate >= 80 ? 'bg-emerald-400' : attendanceRate >= 50 ? 'bg-amber-400 animate-pulse' : 'bg-rose-400 animate-pulse'}`} />
                    <Activity className="h-2.5 w-2.5 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-0.5" title="Tasks">
                    <span className={`h-1 w-1 rounded-full ${taskDoneRate >= 70 ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                    <ListTodo className="h-2.5 w-2.5 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-0.5" title="Leaves">
                    <span className={`h-1 w-1 rounded-full ${pendingLeaves === 0 ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                    <CalendarDays className="h-2.5 w-2.5 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-0.5" title="Notifications">
                    <span className={`h-1 w-1 rounded-full ${unreadCount === 0 ? 'bg-emerald-400' : 'bg-cyan-400 animate-pulse'}`} />
                    <Bell className="h-2.5 w-2.5 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-0.5" title="Performance">
                    <span className={`h-1 w-1 rounded-full ${performanceRating >= 3.5 ? 'bg-emerald-400' : performanceRating >= 2.5 ? 'bg-amber-400' : 'bg-rose-400'}`} />
                    <HeartPulse className="h-2.5 w-2.5 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════
          AI DAILY BRIEFING
          ═══════════════════════════════════════════════════════════ */}
      <motion.div {...fadeIn} transition={{ duration: 0.5, delay: 0.1 }}>
        <GlassCard className="p-5 sm:p-6 relative overflow-hidden" glow="emerald" hover>
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-full -translate-y-32 translate-x-32" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20">
                  <Zap className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">AI Daily Briefing</h3>
                  <p className="text-[10px] text-muted-foreground">Powered by Google Gemini · {aiInsights ? new Date(aiInsights.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Loading...'}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 gap-1"
                onClick={() => {
                  setInsightsLoading(true);
                  fetch('/api/ai-insights', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user?.id }),
                  })
                    .then(r => r.ok ? r.json() : Promise.reject('Failed'))
                    .then(data => { setAiInsights(data.data || data); setInsightsLoading(false); })
                    .catch(() => { setInsightsError(true); setInsightsLoading(false); });
                }}
                disabled={insightsLoading}
              >
                <RefreshCw className={`h-3 w-3 ${insightsLoading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            </div>

            {insightsLoading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-4 bg-black/[0.04] dark:bg-white/[0.05] rounded w-3/4" />
                <div className="h-4 bg-black/[0.04] dark:bg-white/[0.05] rounded w-1/2" />
                <div className="h-4 bg-black/[0.04] dark:bg-white/[0.05] rounded w-2/3" />
                <div className="h-3 bg-black/[0.04] dark:bg-white/[0.05] rounded w-1/3 mt-2" />
                <div className="h-3 bg-black/[0.04] dark:bg-white/[0.05] rounded w-1/2" />
              </div>
            ) : insightsError ? (
              <div className="flex items-center gap-2 py-3 text-muted-foreground">
                <AlertCircle className="h-4 w-4 text-amber-400" />
                <span className="text-xs">AI insights temporarily unavailable. Showing computed insights.</span>
              </div>
            ) : aiInsights?.briefing ? (
              <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                {aiInsights.briefing}
              </div>
            ) : null}
          </div>
        </GlassCard>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════
          KPI COMMAND STRIP - 10 Hero Cards (2x5)
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-4">
        <StatCard
          title="Today's Hours"
          value={`${todayTotalHours.toFixed(1)}h`}
          subtitle="of 8h target"
          icon={Clock}
          color="cyan"
          hero
          progressRing={{ value: Math.min((todayTotalHours / 8) * 100, 100), max: 100 }}
        />
        <StatCard
          title="Attendance Rate"
          value={`${attendanceRate}%`}
          subtitle={attendanceRate >= 85 ? 'On target' : 'Below target'}
          icon={Activity}
          color="emerald"
          hero
          progressRing={{ value: attendanceRate, max: 100 }}
        />
        <StatCard
          title="Tasks Completed"
          value={doneCount}
          subtitle={`${todoCount + inProgressCount} remaining`}
          icon={CheckCircle2}
          color="violet"
          hero
          progressRing={{ value: myTasks.length > 0 ? (doneCount / myTasks.length) * 100 : 0, max: 100 }}
        />
        <StatCard
          title="Pending Leaves"
          value={pendingLeaves}
          subtitle="Awaiting approval"
          icon={CalendarDays}
          color="amber"
          hero
          pulse={pendingLeaves > 0}
        />
        <StatCard
          title="On-Time Streak"
          value={`${streakCount}d`}
          subtitle={streakCount >= 5 ? 'Excellent' : streakCount >= 3 ? 'Good' : 'Keep going'}
          icon={Flame}
          color="orange"
          hero
          progressRing={{ value: Math.min((streakCount / 30) * 100, 100), max: 100 }}
        />
        <StatCard
          title="Total Overtime"
          value={`${totalOvertime.toFixed(1)}h`}
          subtitle="This month"
          icon={Timer}
          color="cyan"
          hero
        />
        <StatCard
          title="Net Salary"
          value={formatCurrency(netSalary)}
          subtitle={
            salaryTrend > 0 ? `+${formatCurrency(salaryTrend)} vs last month` :
            salaryTrend < 0 ? `${formatCurrency(salaryTrend)} vs last month` :
            'Current month'
          }
          icon={DollarSign}
          color="emerald"
          hero
          trend={salaryTrend !== 0 ? { value: lastMonthPayroll ? Math.round((salaryTrend / lastMonthPayroll.netSalary) * 100) : 0, label: 'vs last mo.' } : undefined}
        />
        <StatCard
          title="Open Requests"
          value={openRequests}
          subtitle="Pending review"
          icon={ClipboardList}
          color="rose"
          hero
          pulse={openRequests > 0}
        />
        <StatCard
          title="Unread Notifications"
          value={unreadCount}
          subtitle={unreadCount > 0 ? 'Needs attention' : 'All caught up'}
          icon={Bell}
          color="amber"
          hero
          pulse={unreadCount > 0}
        />
        <StatCard
          title="Training Progress"
          value={`${trainingProgress}%`}
          subtitle={trainingProgress >= 70 ? 'On track' : 'Needs focus'}
          icon={GraduationCap}
          color="violet"
          hero
          progressRing={{ value: trainingProgress, max: 100 }}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════
          AI-POWERED INSIGHTS ROW
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* ── Predictive Alerts ── */}
        <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
          <GlassCard className="p-5 h-full" glow={aiInsights?.alerts?.some(a => a.severity === 'danger') ? 'rose' : 'amber'}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                </div>
                <h3 className="font-semibold text-sm">Predictive Alerts</h3>
              </div>
              <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-400 border-amber-500/20">
                {aiInsights?.alerts?.length || 0}
              </Badge>
            </div>

            {insightsLoading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2].map(i => <div key={i} className="h-12 bg-black/[0.04] dark:bg-white/[0.05] rounded-lg" />)}
              </div>
            ) : (aiInsights?.alerts || []).length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {(aiInsights?.alerts || []).map((alert, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${
                    alert.severity === 'danger'
                      ? 'bg-rose-500/5 border-rose-500/15'
                      : alert.severity === 'warning'
                      ? 'bg-amber-500/5 border-amber-500/15'
                      : 'bg-cyan-500/5 border-cyan-500/15'
                  }`}>
                    <div className="flex items-start gap-2">
                      {alert.severity === 'danger' ? (
                        <AlertCircle className="h-3.5 w-3.5 text-rose-400 mt-0.5 shrink-0" />
                      ) : alert.severity === 'warning' ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                      ) : (
                        <Bell className="h-3.5 w-3.5 text-cyan-400 mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium leading-snug">{alert.text}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">→ {alert.action}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-400/30 mb-2" />
                <p className="text-xs text-muted-foreground">No alerts — everything looks good!</p>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* ── Smart Suggestions ── */}
        <motion.div {...fadeIn} transition={{ delay: 0.25 }}>
          <GlassCard className="p-5 h-full" glow="cyan">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <Lightbulb className="h-4 w-4 text-cyan-400" />
                </div>
                <h3 className="font-semibold text-sm">Smart Suggestions</h3>
              </div>
              <Badge variant="outline" className="text-[9px] bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                AI-Powered
              </Badge>
            </div>

            {insightsLoading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2].map(i => <div key={i} className="h-12 bg-black/[0.04] dark:bg-white/[0.05] rounded-lg" />)}
              </div>
            ) : (aiInsights?.suggestions || []).length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {(aiInsights?.suggestions || []).map((sug, i) => {
                  const typeConfig = {
                    attendance: { icon: Clock, color: 'text-emerald-400', bg: 'bg-emerald-500/5 border-emerald-500/15' },
                    tasks: { icon: ListTodo, color: 'text-amber-400', bg: 'bg-amber-500/5 border-amber-500/15' },
                    balance: { icon: CalendarDays, color: 'text-cyan-400', bg: 'bg-cyan-500/5 border-cyan-500/15' },
                  };
                  const config = typeConfig[sug.type] || typeConfig.balance;
                  const TypeIcon = config.icon;
                  return (
                    <div key={i} className={`p-3 rounded-lg border ${config.bg}`}>
                      <div className="flex items-start gap-2">
                        <TypeIcon className={`h-3.5 w-3.5 ${config.color} mt-0.5 shrink-0`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium leading-snug">{sug.text}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">→ {sug.action}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <Lightbulb className="h-8 w-8 text-cyan-400/30 mb-2" />
                <p className="text-xs text-muted-foreground">No suggestions right now</p>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* ── Priority Inbox ── */}
        <motion.div {...fadeIn} transition={{ delay: 0.3 }}>
          <GlassCard className="p-5 h-full" glow="emerald">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Inbox className="h-4 w-4 text-emerald-400" />
                </div>
                <h3 className="font-semibold text-sm">Priority Inbox</h3>
              </div>
              {(aiInsights?.priorityInbox || []).length > 0 && (
                <Badge className="text-[9px] bg-emerald-500/15 text-emerald-400 border-emerald-500/25">
                  {(aiInsights?.priorityInbox || []).filter(i => i.priority === 'urgent' || i.priority === 'high').length} urgent
                </Badge>
              )}
            </div>

            {insightsLoading ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="h-10 bg-black/[0.04] dark:bg-white/[0.05] rounded-lg" />)}
              </div>
            ) : (aiInsights?.priorityInbox || []).length > 0 ? (
              <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                {(aiInsights?.priorityInbox || []).map((item) => {
                  const typeIcon: Record<string, LucideIcon> = {
                    task: ListTodo,
                    leave: CalendarDays,
                    request: FileText,
                    complaint: MessageSquare,
                    notification: Bell,
                  };
                  const priorityColor: Record<string, string> = {
                    urgent: 'bg-rose-400',
                    high: 'bg-amber-400',
                    medium: 'bg-cyan-400',
                    low: 'bg-slate-400',
                  };
                  const ItemIcon = typeIcon[item.type] || Bell;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 p-2.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer group"
                      onClick={() => { setActiveView(item.actionUrl as typeof activeView); toast.info(`Opening ${item.actionLabel}`); }}
                    >
                      <span className={`h-2 w-2 rounded-full shrink-0 ${priorityColor[item.priority]} ${item.priority === 'urgent' ? 'animate-pulse' : ''}`} />
                      <ItemIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
                      </div>
                      <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-400/30 mb-2" />
                <p className="text-xs text-muted-foreground">No pending items — you&apos;re all caught up!</p>
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          BENTO GRID - Main Section (3 columns)
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* ── My Attendance ── */}
        <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
          <GlassCard className="p-5 h-full" glow="cyan">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-cyan-400" />My Attendance</h3>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-cyan-400 hover:text-cyan-300"
                onClick={() => { setActiveView('attendance'); toast.info('Opening Attendance'); }}>
                View All <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <DonutChart segments={myAttendanceSegments} size={110} strokeWidth={14} />
              <div className="space-y-1.5 flex-1">
                {myAttendanceSegments.map(seg => (
                  <div key={seg.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: seg.color }} />
                      <span className="text-xs text-muted-foreground">{seg.label}</span>
                    </div>
                    <span className="text-xs font-bold">{seg.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-black/[0.06] dark:border-white/[0.05] pt-3">
              <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">This Week</p>
              <MiniBarChart data={weeklyData} color="cyan" height={60} />
            </div>
          </GlassCard>
        </motion.div>

        {/* ── My Tasks Pipeline ── */}
        <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
          <GlassCard className="p-5 h-full" glow={overdueTasks.length > 0 ? 'amber' : 'none'}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><ListTodo className="h-4 w-4 text-amber-400" />My Tasks Pipeline</h3>
              <div className="flex items-center gap-2">
                {overdueTasks.length > 0 && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/20 text-[10px] font-bold text-rose-400 animate-pulse">
                    {overdueTasks.length}
                  </span>
                )}
                <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-400 hover:text-amber-300"
                  onClick={() => { setActiveView('tasks'); toast.info('Opening Tasks'); }}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Kanban bar */}
            <div className="mb-4">
              <TaskKanbanMini tasks={myTasks} />
            </div>

            {/* Task list preview (top 5) */}
            <div className="space-y-2 max-h-[180px] overflow-y-auto">
              {myTasks.filter(t => t.status !== 'done').slice(0, 5).map(task => (
                <div key={task.id} className="flex items-center justify-between p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all cursor-pointer"
                  onClick={() => { setActiveView('tasks'); }}>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <StatusBadge status={task.priority} />
                    <span className="text-sm truncate">{task.title}</span>
                  </div>
                  {task.dueDate && (
                    <span className={`text-[10px] ml-2 shrink-0 ${
                      new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-rose-400 font-bold' : 'text-muted-foreground'
                    }`}>
                      {task.dueDate.slice(5)}
                    </span>
                  )}
                </div>
              ))}
              {myTasks.filter(t => t.status !== 'done').length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">All tasks completed!</p>
              )}
            </div>

            {/* Overdue alert */}
            {overdueTasks.length > 0 && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                <span className="text-xs text-rose-400">{overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''} need attention</span>
              </div>
            )}

            {/* Quick Add Task */}
            <Button variant="ghost" size="sm" className="w-full mt-3 h-8 text-xs text-amber-400 hover:text-amber-300 border border-dashed border-amber-500/20 hover:border-amber-500/40"
              onClick={() => { setActiveView('tasks'); toast.info('Opening Tasks to Add'); }}>
              <Plus className="h-3 w-3 mr-1" /> Quick Add Task
            </Button>
          </GlassCard>
        </motion.div>

        {/* ── Leave Balance ── */}
        <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
          <GlassCard className="p-5 h-full" glow="emerald">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><CalendarDays className="h-4 w-4 text-emerald-400" />Leave Balance</h3>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-400 hover:text-emerald-300"
                onClick={() => { setActiveView('leaves'); toast.info('Opening Leave Application'); }}>
                Apply <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
            </div>

            <div className="space-y-3">
              {leaveBalance && Object.entries(leaveBalance).map(([type, data]) => {
                const usedPct = data.total > 0 ? (data.used / data.total) * 100 : 0;
                const remainingPct = data.total > 0 ? (data.remaining / data.total) * 100 : 0;
                const typeColors: Record<string, string> = {
                  sick: 'bg-cyan-500',
                  casual: 'bg-emerald-500',
                  vacation: 'bg-amber-500',
                  maternity: 'bg-rose-500',
                };
                const typeIcons: Record<string, LucideIcon> = {
                  sick: HeartPulse,
                  casual: Coffee,
                  vacation: CalendarDays,
                  maternity: Users,
                };
                const TypeIcon = typeIcons[type] || CalendarDays;
                return (
                  <div key={type} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1.5">
                        <TypeIcon className="h-3 w-3 text-muted-foreground" />
                        <span className="capitalize text-muted-foreground">{type}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-emerald-500/20 text-emerald-400">
                          {data.remaining} left
                        </Badge>
                        <span className="text-xs font-medium">{data.remaining}/{data.total}</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-black/[0.04] dark:bg-white/[0.05] overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${typeColors[type] || 'bg-emerald-500'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${remainingPct}%` }}
                        transition={{ duration: 0.6 }}
                      />
                    </div>
                  </div>
                );
              })}
              {!leaveBalance && (
                <p className="text-sm text-muted-foreground">No leave data available</p>
              )}
            </div>

            {/* Upcoming leave indicator */}
            {upcoming.nextLeave && (
              <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.05]">
                <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">Next Leave</p>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CalendarDays className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-emerald-400 truncate">{upcoming.nextLeave.type} Leave</p>
                    <p className="text-[10px] text-muted-foreground">{upcoming.nextLeave.startDate} to {upcoming.nextLeave.endDate || upcoming.nextLeave.startDate}</p>
                  </div>
                </div>
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECONDARY GRID - 3 columns
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* ── Salary Snapshot ── */}
        <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
          <GlassCard className="p-5 h-full" glow="emerald">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4 text-emerald-400" />Salary Snapshot</h3>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-400 hover:text-emerald-300"
                onClick={() => { setActiveView('payroll'); toast.info('Opening Payroll'); }}>
                View All <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
            </div>

            {currentPayroll ? (
              <>
                {/* Net pay */}
                <div className="text-center mb-4">
                  <p className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                    {formatCurrency(netSalary)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Net Pay - {currentMonth}</p>
                  {salaryTrend !== 0 && (
                    <div className={`flex items-center justify-center gap-1 mt-1 text-xs font-medium ${salaryTrend > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {salaryTrend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {salaryTrend > 0 ? '+' : ''}{formatCurrency(salaryTrend)} vs last month
                    </div>
                  )}
                </div>

                {/* Donut chart */}
                <div className="flex items-center gap-3 mb-4">
                  <DonutChart segments={salarySegments} size={90} strokeWidth={12} />
                  <div className="space-y-1 flex-1">
                    {salarySegments.map(seg => (
                      <div key={seg.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: seg.color }} />
                          <span className="text-[10px] text-muted-foreground">{seg.label}</span>
                        </div>
                        <span className="text-[10px] font-bold">{seg.value}k</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* YTD summary */}
                <div className="border-t border-black/[0.06] dark:border-white/[0.05] pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">YTD Earnings</span>
                    <span className="text-sm font-bold text-emerald-400">{formatCurrency(ytdEarnings)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <DollarSign className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No payroll data for this month</p>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* ── Notifications Center ── */}
        <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
          <GlassCard className="p-5 h-full" glow={unreadCount > 0 ? 'amber' : 'none'}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <div className="relative">
                  <Bell className="h-4 w-4 text-amber-400" />
                  {unreadCount > 0 && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-rose-400 animate-pulse" />}
                </div>
                Notifications
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-amber-500/20 text-amber-400 animate-pulse">
                    {unreadCount} new
                  </Badge>
                )}
                <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-400 hover:text-amber-300"
                  onClick={() => { setActiveView('dashboard'); toast.info('Opening All Notifications'); }}>
                  View All <ChevronRight className="h-3 w-3 ml-0.5" />
                </Button>
              </div>
            </div>

            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {notifications.slice(0, 8).map(n => {
                const NotifIcon = notifTypeIcon[n.type] || Bell;
                return (
                  <div
                    key={n.id}
                    onClick={() => { if (!n.isRead) handleMarkNotificationRead(n.id); }}
                    className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                      n.isRead ? 'bg-black/[0.01] dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]' : 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10'
                    }`}
                  >
                    <span className={`mt-0.5 rounded-lg p-1.5 shrink-0 ${n.isRead ? 'text-muted-foreground bg-black/[0.04] dark:bg-white/[0.05]' : 'text-amber-400 bg-amber-500/10'}`}>
                      <NotifIcon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-medium ${n.isRead ? '' : 'text-amber-400'}`}>{n.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{n.message}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[9px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                      {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
                    </div>
                  </div>
                );
              })}
              {notifications.length === 0 && (
                <div className="text-center py-6">
                  <Bell className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No notifications yet</p>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* ── Upcoming & Deadlines ── */}
        <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
          <GlassCard className="p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Calendar className="h-4 w-4 text-violet-400" />Upcoming & Deadlines</h3>
            </div>
            <div className="space-y-3">
              {/* Next deadline */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all">
                <div className="h-9 w-9 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                  <Target className="h-4 w-4 text-rose-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Next Deadline</p>
                  <p className="text-sm font-medium truncate">
                    {upcoming.nextDeadline ? upcoming.nextDeadline.title : 'No upcoming deadlines'}
                  </p>
                  {upcoming.nextDeadline?.dueDate && (
                    <p className="text-[10px] text-rose-400">Due: {upcoming.nextDeadline.dueDate}</p>
                  )}
                </div>
              </div>

              {/* Next leave */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <CalendarDays className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Next Leave</p>
                  <p className="text-sm font-medium truncate">
                    {upcoming.nextLeave ? `${upcoming.nextLeave.type} Leave` : 'No upcoming leaves'}
                  </p>
                  {upcoming.nextLeave && (
                    <p className="text-[10px] text-muted-foreground">{upcoming.nextLeave.startDate} to {upcoming.nextLeave.endDate || upcoming.nextLeave.startDate}</p>
                  )}
                </div>
              </div>

              {/* Pending approvals */}
              {upcoming.pendingApprovals > 0 && (
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all">
                  <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <ClipboardList className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pending Approvals</p>
                    <p className="text-sm font-medium text-amber-400">{upcoming.pendingApprovals} items awaiting</p>
                  </div>
                </div>
              )}

              {/* Overdue items */}
              {overdueTasks.length > 0 && (
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/20">
                  <div className="h-9 w-9 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Overdue</p>
                    <p className="text-sm font-medium text-rose-400">{overdueTasks.length} task{overdueTasks.length > 1 ? 's' : ''} past due</p>
                  </div>
                </div>
              )}

              {/* No upcoming items */}
              {!upcoming.nextDeadline && !upcoming.nextLeave && upcoming.pendingApprovals === 0 && overdueTasks.length === 0 && (
                <div className="text-center py-4">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400/50 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">All clear! Nothing upcoming.</p>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TERTIARY GRID - 2 columns
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        {/* ── Activity Feed (12 items) ── */}
        <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
          <GlassCard className="p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <div className="relative">
                  <Activity className="h-4 w-4 text-cyan-400" />
                  <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
                </div>
                Activity Feed
              </h3>
              <span className="text-[10px] text-muted-foreground">{activityItems.length} recent</span>
            </div>
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {activityItems.map(item => {
                const ItemIcon = item.icon;
                return (
                  <div key={item.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-black/[0.01] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-all">
                    <span className={`mt-0.5 rounded-lg p-1.5 ${item.color} bg-black/[0.04] dark:bg-white/[0.05]`}>
                      <ItemIcon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium">{item.text}</p>
                      {item.subtext && <p className="text-[10px] text-muted-foreground">{item.subtext}</p>}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(item.time)}</span>
                  </div>
                );
              })}
              {activityItems.length === 0 && (
                <div className="text-center py-6">
                  <Activity className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No recent activity</p>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* ── Goals & Performance ── */}
        <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
          <GlassCard className="p-5 h-full" glow="violet">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Target className="h-4 w-4 text-violet-400" />Goals & Performance</h3>
              <div className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                <span className="text-sm font-bold text-amber-400">{performanceRating}</span>
                <span className="text-[10px] text-muted-foreground">/5</span>
              </div>
            </div>

            {/* OKR / Goals */}
            <div className="space-y-3 mb-4">
              {goals.map(goal => {
                const goalColorMap: Record<string, string> = {
                  emerald: 'text-emerald-400',
                  cyan: 'text-cyan-400',
                  amber: 'text-amber-400',
                };
                return (
                  <div key={goal.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground truncate max-w-[70%]">{goal.title}</span>
                      <span className={`text-xs font-bold ${goalColorMap[goal.color] || 'text-emerald-400'}`}>{goal.progress}%</span>
                    </div>
                    <Progress value={goal.progress} className="h-1.5" />
                  </div>
                );
              })}
            </div>

            {/* Achievement badges */}
            <div className="border-t border-black/[0.06] dark:border-white/[0.05] pt-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Achievements</span>
                <span className="text-[10px] text-muted-foreground">{earnedBadges.length}/{achievements.length} earned</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {achievements.map(badge => {
                  const BadgeIcon = badge.icon;
                  return (
                    <motion.div
                      key={badge.id}
                      whileHover={badge.condition ? { scale: 1.05 } : {}}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg border bg-gradient-to-br transition-all ${
                        badge.condition
                          ? `${badge.color} border`
                          : 'bg-black/[0.01] dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.05] text-muted-foreground/30'
                      }`}
                      title={badge.description}
                    >
                      <BadgeIcon className={`h-3 w-3 ${badge.condition ? '' : 'opacity-30'}`} />
                      <span className={`text-[9px] font-medium ${badge.condition ? '' : 'line-through opacity-50'}`}>
                        {badge.label}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Daily productivity tip */}
            <div className="border-t border-black/[0.06] dark:border-white/[0.05] pt-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs font-medium">Daily Tip</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                  onClick={() => setTipIndex((prev) => (prev + 1) % dailyTips.length)}
                >
                  Next <ArrowRight className="h-2.5 w-2.5 ml-0.5" />
                </Button>
              </div>
              <motion.div
                key={tipIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10 mb-2"
              >
                <span className="text-base mt-0.5 shrink-0">{dailyTips[tipIndex].icon}</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{dailyTips[tipIndex].text}</p>
              </motion.div>

              {/* Motivational quote */}
              <div className="flex items-start gap-2 pt-2">
                <span className="text-emerald-400/60 text-sm shrink-0">&ldquo;</span>
                <div>
                  <p className="text-[10px] text-muted-foreground/70 italic leading-relaxed">{getDailyQuote().text}</p>
                  <p className="text-[9px] text-muted-foreground/40 mt-0.5 not-italic">&mdash; {getDailyQuote().author}</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          BOTTOM GRID - 2 columns
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        {/* ── Quick Actions (12 enterprise actions) ── */}
        <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
          <GlassCard className="p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-cyan-400" />Quick Actions</h3>
              <span className="text-[10px] text-muted-foreground">{quickActions.length} actions</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {quickActions.map(action => {
                const cm = actionColorMap[action.color] || actionColorMap.cyan;
                return (
                  <button
                    key={action.label}
                    onClick={action.action}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border border-black/[0.06] dark:border-white/[0.05] ${cm.hover} ${cm.border} transition-all duration-200 text-center group`}
                  >
                    <div className={`rounded-lg p-2 ${cm.bg} ${cm.text} group-hover:scale-110 transition-transform`}>
                      <action.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 w-full">
                      <p className="text-[10px] font-medium truncate">{action.label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>

        {/* ── Team Snapshot ── */}
        <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
          <GlassCard className="p-5 h-full" glow="cyan">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-cyan-400" />Team Snapshot</h3>
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-cyan-500/20 text-cyan-400">
                {teamWorkModeDist.total} members
              </Badge>
            </div>

            {/* Team members mini list */}
            <div className="space-y-2 mb-4 max-h-[180px] overflow-y-auto pr-1">
              {teamMembers.map(member => {
                const isPresent = attendance.some(a => a.userId === member.id && a.date === today && (a.status === 'present' || a.status === 'late'));
                const isOnLeave = leaves.some(l => l.userId === member.id && l.status === 'approved' && today >= l.startDate && today <= (l.endDate || l.startDate));
                const statusColor = isPresent ? 'bg-emerald-400' : isOnLeave ? 'bg-amber-400' : 'bg-slate-400';
                const memberWorkMode = member.workMode === 'remote' ? Home : member.workMode === 'hybrid' ? Laptop : Monitor;
                const MemberWorkIcon = memberWorkMode;
                return (
                  <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg bg-black/[0.01] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-all">
                    <div className="relative">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-gradient-to-br from-cyan-600/60 to-emerald-600/60 text-white text-[9px] font-bold">
                          {member.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??'}
                        </AvatarFallback>
                      </Avatar>
                      <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${statusColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{member.name}</p>
                      <p className="text-[9px] text-muted-foreground truncate">{member.position || member.email}</p>
                    </div>
                    <MemberWorkIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                  </div>
                );
              })}
              {teamMembers.length === 0 && (
                <div className="text-center py-4">
                  <Users className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No team members found</p>
                </div>
              )}
            </div>

            {/* Work mode distribution */}
            <div className="border-t border-black/[0.06] dark:border-white/[0.05] pt-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Work Mode Distribution</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Home className="h-3 w-3 text-cyan-400" />
                  <span className="text-[10px] text-muted-foreground">Remote</span>
                  <span className="text-[10px] font-bold text-cyan-400">{teamWorkModeDist.remote}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Monitor className="h-3 w-3 text-emerald-400" />
                  <span className="text-[10px] text-muted-foreground">Office</span>
                  <span className="text-[10px] font-bold text-emerald-400">{teamWorkModeDist.office}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Laptop className="h-3 w-3 text-amber-400" />
                  <span className="text-[10px] text-muted-foreground">Hybrid</span>
                  <span className="text-[10px] font-bold text-amber-400">{teamWorkModeDist.hybrid}</span>
                </div>
              </div>

              {/* Mini team stats */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="text-center p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                  <p className="text-sm font-bold text-cyan-400">{teamWorkModeDist.total}</p>
                  <p className="text-[9px] text-muted-foreground">Total</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                  <p className="text-sm font-bold text-emerald-400">{attendance.filter(a => teamMembers.some(m => m.id === a.userId) && a.date === today && (a.status === 'present' || a.status === 'late')).length + (isClockedIn ? 1 : 0)}</p>
                  <p className="text-[9px] text-muted-foreground">Present</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                  <p className="text-sm font-bold text-amber-400">{leaves.filter(l => teamMembers.some(m => m.id === l.userId) && l.status === 'approved' && today >= l.startDate && today <= (l.endDate || l.startDate)).length}</p>
                  <p className="text-[9px] text-muted-foreground">On Leave</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
