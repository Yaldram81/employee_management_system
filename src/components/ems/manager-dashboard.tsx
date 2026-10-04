'use client';

import { useEMSStore } from '@/lib/store';
import { StatCard } from './stat-card';
import { GlassCard } from './glass-card';
import { StatusBadge } from './status-badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import {
  Users, AlertCircle, CalendarDays, DollarSign,
  Settings, BarChart3, Activity,
  Clock, Shield, FileCheck, ClipboardList, Zap,
  ArrowRight, CheckCircle2,
  ListTodo, Briefcase, ChevronRight,
  Target, Award,
  Flame, GitBranch, AlertTriangle, Eye, Timer,
  LogIn, Monitor, Home, RefreshCw, HeartPulse,
  TrendingUp, Laptop, UsersRound,
  ArrowUpRight, ArrowDownRight, Minus,
  FileText, ThumbsUp, MessageSquareWarning, PieChart,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  ProgressRing, MiniBarChart, DonutChart, PipelineStage, TaskKanbanMini,
  getGreeting, getGreetingEmoji, formatCurrency, getInitials, timeAgo, fadeIn, actionColorMap,
} from '@/components/ems/shared';
import type { ActivityItem } from '@/components/ems/shared';

// ─── Sparkline SVG ──────────────────────────────────────────────
function Sparkline({ data, color = '#06b6d4', height = 32, width = 80 }: {
  data: number[]; color?: string; height?: number; width?: number;
}) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ');
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  const id = `spark-${color.replace('#', '')}`;

  return (
    <svg width={width} height={height} className="shrink-0" viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${id})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={width} cy={height - ((data[data.length - 1] - min) / range) * (height - 4) - 2} r="2" fill={color} />
    </svg>
  );
}

// ─── Trend Indicator ────────────────────────────────────────────
function TrendIndicator({ value, label }: { value: number; label?: string }) {
  if (value > 0) return (
    <span className="flex items-center gap-0.5 text-emerald-400">
      <ArrowUpRight className="h-3 w-3" />
      <span className="text-[10px] font-medium">+{value}%</span>
      {label && <span className="text-[9px] text-muted-foreground ml-0.5">{label}</span>}
    </span>
  );
  if (value < 0) return (
    <span className="flex items-center gap-0.5 text-rose-400">
      <ArrowDownRight className="h-3 w-3" />
      <span className="text-[10px] font-medium">{value}%</span>
      {label && <span className="text-[9px] text-muted-foreground ml-0.5">{label}</span>}
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-muted-foreground">
      <Minus className="h-3 w-3" />
      <span className="text-[10px] font-medium">0%</span>
      {label && <span className="text-[9px] text-muted-foreground ml-0.5">{label}</span>}
    </span>
  );
}

// ─── Time Ago Helper ────────────────────────────────────────────
// ─── Activity Item ──────────────────────────────────────────────

export function ManagerDashboard() {
  const { users, tasks, leaves, attendance, user, complaints, departments, payroll, requests, teams, setActiveView, clockIn } = useEMSStore();
  const [showAllMembers, setShowAllMembers] = useState(false);

  // ── Department-scoped data (null-safe) ────────────────────────
  const deptUsers = users?.filter(u => u?.departmentId === user?.departmentId) ?? [];
  const deptTasks = tasks?.filter(t => t?.departmentId === user?.departmentId) ?? [];
  const deptComplaints = complaints?.filter(c => deptUsers.some(u => u.id === c?.userId) || c?.departmentId === user?.departmentId) ?? [];
  const deptRequests = requests?.filter(r => deptUsers.some(u => u.id === r?.userId) || r?.departmentId === user?.departmentId) ?? [];
  const deptPayroll = payroll?.filter(p => deptUsers.some(u => u.id === p?.userId)) ?? [];
  const deptName = departments?.find(d => d?.id === user?.departmentId)?.name || user?.department || 'Your Department';
  const deptColor = departments?.find(d => d?.id === user?.departmentId)?.color || '#06b6d4';

  const today = new Date().toISOString().split('T')[0];

  // ── Today's attendance (department-scoped) ────────────────
  const deptAttendanceToday = attendance?.filter(a => a?.date === today && deptUsers.some(u => u.id === a?.userId)) ?? [];
  const presentToday = deptAttendanceToday.filter(a => a?.status === 'present').length;
  const lateToday = deptAttendanceToday.filter(a => a?.status === 'late').length;

  // ── Pending leaves for manager approval ───────────────────
  const pendingLeaves = leaves?.filter(l => l?.status === 'pending' && deptUsers.some(u => u.id === l?.userId)).length ?? 0;
  const openComplaints = deptComplaints.filter(c => c?.status === 'open').length;
  const pendingRequests = deptRequests.filter(r => r?.status === 'pending').length;

  // ── Task metrics ──────────────────────────────────────────
  const completedTasks = deptTasks.filter(t => t?.status === 'done').length;
  const taskDoneRate = deptTasks.length > 0
    ? Math.round((completedTasks / deptTasks.length) * 100) : 0;
  const activeTasks = deptTasks.filter(t => t?.status === 'in-progress').length;
  const inReviewTasks = deptTasks.filter(t => t?.status === 'in-review').length;
  const overdueTasks = deptTasks.filter(t => t?.dueDate && new Date(t.dueDate) < new Date() && t?.status !== 'done').length;
  const urgentTasks = deptTasks.filter(t => t?.priority === 'urgent' && t?.status !== 'done').length;

  // ── Complaint priority breakdown ─────────────────────────
  const criticalComplaints = deptComplaints.filter(c => c?.status === 'open' && (c as Record<string, unknown>)?.priority === 'critical').length;
  const highComplaints = deptComplaints.filter(c => c?.status === 'open' && (c as Record<string, unknown>)?.priority === 'high').length;
  const normalComplaints = deptComplaints.filter(c => c?.status === 'open' && (!(((c as Record<string, unknown>)?.priority === 'critical') || ((c as Record<string, unknown>)?.priority === 'high')))).length;

  // ── Attendance rate (department-scoped) ───────────────────
  const deptAttendanceAll = attendance?.filter(a => deptUsers.some(u => u.id === a?.userId)) ?? [];
  const attendanceRate = deptAttendanceAll.length > 0
    ? Math.round((deptAttendanceAll.filter(a => a?.status === 'present' || a?.status === 'late').length / deptAttendanceAll.length) * 100) : 0;

  // ── On leave today (department) ──────────────────────────
  const onLeaveToday = leaves?.filter(l => {
    const start = l?.startDate;
    const end = l?.endDate || l?.startDate;
    return start && today >= start && today <= (end ?? start) && l?.status === 'approved' && deptUsers.some(u => u.id === l?.userId);
  }).length ?? 0;

  // ── Payroll (department) ──────────────────────────────────
  const totalPayroll = deptPayroll.reduce((sum, p) => sum + (p?.netSalary ?? 0), 0);
  const paidPayroll = deptPayroll.filter(p => p?.status === 'paid');
  const totalPaid = paidPayroll.reduce((s, p) => s + (p?.netSalary ?? 0), 0);
  const pendingPayroll = deptPayroll.filter(p => p?.status === 'draft' || p?.status === 'reviewed');

  // ── Pending Approvals (combined) ─────────────────────────
  const pendingApprovals = pendingLeaves + pendingRequests + openComplaints;

  // ── Team Productivity Score ──────────────────────────────
  const productivityScore = useMemo(() => {
    const attScore = attendanceRate * 0.3;
    const taskScore = taskDoneRate * 0.4;
    const complaintScore = (openComplaints === 0 ? 100 : Math.max(0, 100 - openComplaints * 15)) * 0.15;
    const leaveScore = (pendingLeaves <= 2 ? 100 : Math.max(0, 100 - pendingLeaves * 10)) * 0.15;
    return Math.min(Math.round(attScore + taskScore + complaintScore + leaveScore), 100);
  }, [attendanceRate, taskDoneRate, openComplaints, pendingLeaves]);

  // ── Weekly activity (department-scoped) ───────────────────
  const weeklyData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const counts = days.map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - d.getDay() + i + 1);
      const ds = d.toISOString().split('T')[0];
      return (attendance ?? []).filter(a => a?.date === ds && (a?.status === 'present' || a?.status === 'late') && deptUsers.some(u => u.id === a?.userId)).length;
    });
    return days.map((day, i) => ({ label: day, value: counts[i] }));
  }, [attendance, deptUsers]);

  // ── Weekly task completion trend ──────────────────────────
  const weeklyTaskTrend = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const counts = days.map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - d.getDay() + i + 1);
      const ds = d.toISOString().split('T')[0];
      return deptTasks.filter(t => t?.status === 'done' && t?.completedAt?.startsWith(ds)).length;
    });
    return days.map((day, i) => ({ label: day, value: counts[i] }));
  }, [deptTasks]);

  // ── Sparkline data (7-day attendance) ─────────────────────
  const attendanceSparkData = useMemo(() => {
    const data: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const dayAtt = (attendance ?? []).filter(a => a?.date === ds && (a?.status === 'present' || a?.status === 'late') && deptUsers.some(u => u.id === a?.userId));
      const rate = deptUsers.length > 0 ? Math.round((dayAtt.length / deptUsers.length) * 100) : 0;
      data.push(rate);
    }
    return data;
  }, [attendance, deptUsers]);

  // ── Task sparkline data ──────────────────────────────────
  const taskSparkData = useMemo(() => {
    const data: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      data.push(deptTasks.filter(t => t?.status === 'done' && t?.completedAt?.startsWith(ds)).length);
    }
    return data;
  }, [deptTasks]);

  // ── Payroll trend (department) ────────────────────────────
  const payrollTrend = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(m => ({
      label: m,
      value: Math.round(totalPayroll / 6 * (0.85 + Math.random() * 0.3)),
    }));
  }, [totalPayroll]);

  // ── Team health indicators ────────────────────────────────
  const teamHealth = useMemo(() => [
    { label: 'Attendance', icon: Activity, status: attendanceRate >= 80 ? 'green' as const : attendanceRate >= 50 ? 'yellow' as const : 'red' as const },
    { label: 'Tasks', icon: ListTodo, status: taskDoneRate >= 70 ? 'green' as const : taskDoneRate >= 40 ? 'yellow' as const : 'red' as const },
    { label: 'Leaves', icon: CalendarDays, status: pendingLeaves <= 2 ? 'green' as const : pendingLeaves <= 5 ? 'yellow' as const : 'red' as const },
    { label: 'Complaints', icon: AlertCircle, status: openComplaints === 0 ? 'green' as const : openComplaints <= 2 ? 'yellow' as const : 'red' as const },
  ], [attendanceRate, taskDoneRate, pendingLeaves, openComplaints]);

  const healthColor: Record<string, string> = { green: 'bg-emerald-400', yellow: 'bg-amber-400 animate-pulse', red: 'bg-rose-400 animate-pulse' };

  // ── Attendance distribution for donut (department) ────────
  const attendanceSegments = useMemo(() => [
    { value: presentToday, color: '#10b981', label: 'Present' },
    { value: lateToday, color: '#f59e0b', label: 'Late' },
    { value: onLeaveToday, color: '#06b6d4', label: 'On Leave' },
    { value: Math.max(deptUsers.length - presentToday - lateToday - onLeaveToday, 0), color: '#f43f5e', label: 'Absent' },
  ], [presentToday, lateToday, onLeaveToday, deptUsers.length]);

  // ── Complaint distribution for donut ──────────────────────
  const complaintSegments = useMemo(() => [
    { value: criticalComplaints, color: '#f43f5e', label: 'Critical' },
    { value: highComplaints, color: '#f59e0b', label: 'High' },
    { value: normalComplaints, color: '#06b6d4', label: 'Normal' },
  ], [criticalComplaints, highComplaints, normalComplaints]);

  // ── Team member performance metrics ───────────────────────
  const teamMemberMetrics = useMemo(() => {
    return deptUsers.map(member => {
      const memberAttendance = (attendance ?? []).filter(a => a?.userId === member.id && (a?.status === 'present' || a?.status === 'late'));
      const memberAttendanceRate = (attendance ?? []).filter(a => a?.userId === member.id).length > 0
        ? Math.round((memberAttendance.length / (attendance ?? []).filter(a => a?.userId === member.id).length) * 100) : 0;
      const memberTasks = (tasks ?? []).filter(t => t?.assigneeId === member.id);
      const memberCompletedTasks = memberTasks.filter(t => t?.status === 'done').length;
      const memberTaskRate = memberTasks.length > 0 ? Math.round((memberCompletedTasks / memberTasks.length) * 100) : 0;
      return {
        id: member.id,
        name: member.name ?? 'Unknown',
        position: member.position || 'Member',
        attendanceRate: memberAttendanceRate,
        taskCompletion: memberTaskRate,
        completedTasks: memberCompletedTasks,
        totalTasks: memberTasks.length,
        avatar: getInitials(member.name),
      };
    });
  }, [deptUsers, attendance, tasks]);

  // ── Top performers (department) ───────────────────────────
  const topPerformers = useMemo(() => {
    const taskCounts: Record<string, { name: string; completed: number; position: string; taskRate: number }> = {};
    deptTasks.filter(t => t?.status === 'done' && t?.assigneeId).forEach(t => {
      if (!taskCounts[t.assigneeId!]) {
        const u = deptUsers.find(u2 => u2.id === t.assigneeId);
        const memberTasks = (tasks ?? []).filter(tk => tk?.assigneeId === t.assigneeId);
        const rate = memberTasks.length > 0 ? Math.round((memberTasks.filter(tk => tk?.status === 'done').length / memberTasks.length) * 100) : 0;
        taskCounts[t.assigneeId!] = { name: t.assigneeName || u?.name || 'Unknown', completed: 0, position: u?.position || '', taskRate: rate };
      }
      taskCounts[t.assigneeId!].completed++;
    });
    return Object.entries(taskCounts)
      .sort(([, a], [, b]) => b.completed - a.completed)
      .slice(0, 5)
      .map(([id, data]) => ({ id, ...data }));
  }, [deptTasks, deptUsers, tasks]);

  // ── Live activity items (department-scoped, enhanced) ─────
  const activityItems = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];

    deptAttendanceToday.slice(0, 5).forEach(a => {
      items.push({
        id: `att-${a.id}`,
        icon: CheckCircle2,
        text: `${a.userName || 'Someone'} clocked in`,
        subtext: a?.status === 'late' ? 'Late arrival' : 'On time',
        time: a?.clockIn || a?.firstIn || '',
        color: a?.status === 'late' ? 'text-amber-400' : 'text-emerald-400',
        badge: a?.status === 'late' ? 'Late' : 'On Time',
      });
    });

    (leaves ?? []).filter(l => l?.status === 'pending' && deptUsers.some(u => u.id === l?.userId)).slice(0, 4).forEach(l => {
      items.push({
        id: `leave-${l.id}`,
        icon: CalendarDays,
        text: `${l.userName || 'Someone'} requested ${l?.type || ''} leave`,
        subtext: `${l?.startDate ?? '?'} to ${l?.endDate ?? '?'}`,
        time: l?.createdAt || '',
        color: 'text-amber-400',
        badge: 'Leave',
      });
    });

    deptTasks.filter(t => t?.status === 'done').slice(0, 4).forEach(t => {
      items.push({
        id: `task-${t.id}`,
        icon: ListTodo,
        text: `${t.assigneeName || 'Someone'} completed a task`,
        subtext: `Priority: ${t?.priority || 'Normal'}`,
        time: t?.completedAt || t?.createdAt || '',
        color: 'text-cyan-400',
        badge: 'Task',
      });
    });

    deptComplaints.filter(c => c?.status === 'open').slice(0, 3).forEach(c => {
      items.push({
        id: `comp-${c.id}`,
        icon: AlertCircle,
        text: `${c?.isAnonymous ? 'Anonymous' : c?.userName || 'Someone'} filed a complaint`,
        subtext: c?.category || 'General',
        time: c?.createdAt || '',
        color: 'text-rose-400',
        badge: 'Complaint',
      });
    });

    deptRequests.filter(r => r?.status === 'pending').slice(0, 3).forEach(r => {
      items.push({
        id: `req-${r.id}`,
        icon: FileCheck,
        text: `${r?.userName || 'Someone'} submitted a request`,
        subtext: r?.type || 'General',
        time: r?.createdAt || '',
        color: 'text-orange-400',
        badge: 'Request',
      });
    });

    // Payroll events
    deptPayroll.filter(p => p?.status === 'paid').slice(0, 2).forEach(p => {
      const u = deptUsers.find(u2 => u2.id === p?.userId);
      items.push({
        id: `pay-${p.id}`,
        icon: DollarSign,
        text: `${u?.name || 'Someone'} payroll processed`,
        subtext: formatCurrency(p?.netSalary ?? 0),
        time: p?.createdAt || '',
        color: 'text-emerald-400',
        badge: 'Payroll',
      });
    });

    items.sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime());
    return items;
  }, [deptAttendanceToday, leaves, deptUsers, deptTasks, deptComplaints, deptRequests, deptPayroll]);

  // ── Quick actions for managers (enterprise) ───────────────
  const quickActions = useMemo(() => [
    { icon: ThumbsUp, label: 'Approve Leave', desc: `${pendingLeaves} pending`, color: 'amber', view: 'leaves' as const },
    { icon: FileText, label: 'Review Request', desc: `${pendingRequests} pending`, color: 'cyan', view: 'requests' as const },
    { icon: ListTodo, label: 'Assign Task', desc: 'Create & assign', color: 'orange', view: 'tasks' as const },
    { icon: MessageSquareWarning, label: 'View Complaint', desc: `${openComplaints} open`, color: 'rose', view: 'complaints' as const },
    { icon: LogIn, label: 'Clock In', desc: 'Mark attendance', color: 'emerald', view: 'attendance' as const },
    { icon: PieChart, label: 'Team Report', desc: 'View insights', color: 'violet', view: 'analytics' as const },
    { icon: UsersRound, label: 'Team HRM', desc: `${deptUsers.length} members`, color: 'cyan', view: 'hrm' as const },
    { icon: DollarSign, label: 'Payroll', desc: 'Team payroll', color: 'emerald', view: 'payroll' as const },
  ], [pendingLeaves, pendingRequests, openComplaints, deptUsers.length]);

  // ── Live Clock State ──────────────────────────────────────
  const [liveTime, setLiveTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const now = liveTime;
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const secondsStr = String(now.getSeconds()).padStart(2, '0');

  // ── Today's Attendance Status for Current User ──────────
  const myAttendanceToday = useMemo(() => {
    if (!user) return null;
    return (attendance ?? []).find(a => a?.userId === user.id && a?.date === today) || null;
  }, [attendance, user, today]);
  const isClockedIn = !!myAttendanceToday && !!myAttendanceToday.firstIn;
  const isClockedOut = !!myAttendanceToday && !!myAttendanceToday.lastOut;
  const [clockingIn, setClockingIn] = useState(false);

  const handleClockIn = useCallback(async () => {
    setClockingIn(true);
    try {
      await clockIn('pin');
      toast.success('Clocked in successfully!');
    } catch {
      toast.error('Clock-in failed. Please try again.');
    } finally {
      setClockingIn(false);
    }
  }, [clockIn]);

  const workModeIcon = user?.workMode === 'REMOTE' ? Home : user?.workMode === 'HYBRID' ? Laptop : Monitor;
  const workModeLabel = user?.workMode === 'REMOTE' ? 'Remote' : user?.workMode === 'HYBRID' ? 'Hybrid' : 'Office';
  const WorkModeIcon = workModeIcon;

  // ── Activity badge color map ──────────────────────────────
  const badgeColorMap: Record<string, string> = {
    'Late': 'bg-amber-500/20 text-amber-400',
    'On Time': 'bg-emerald-500/20 text-emerald-400',
    'Leave': 'bg-amber-500/20 text-amber-400',
    'Task': 'bg-cyan-500/20 text-cyan-400',
    'Complaint': 'bg-rose-500/20 text-rose-400',
    'Request': 'bg-orange-500/20 text-orange-400',
    'Payroll': 'bg-emerald-500/20 text-emerald-400',
  };

  return (
    <div className="space-y-6 pb-4">
      {/* ═══════════════════════════════════════════════════════════
          HERO WELCOME SECTION
          ═══════════════════════════════════════════════════════════ */}
      <motion.div {...fadeIn} transition={{ duration: 0.5 }} className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500/10 via-emerald-500/10 to-amber-500/10 border border-black/[0.1] dark:border-white/[0.1] p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-cyan-500/8 to-transparent rounded-full -translate-y-40 translate-x-40" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-emerald-500/6 to-transparent rounded-full translate-y-24 -translate-x-24" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 ring-2 ring-cyan-500/30">
                <AvatarFallback className="bg-gradient-to-br from-cyan-600 to-emerald-600 text-white text-sm font-bold">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">
                  {getGreeting()}, <span className="bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-400 bg-clip-text text-transparent">{user?.name?.split(' ')[0] || 'Manager'}</span> {getGreetingEmoji()}
                </h1>
                <p className="text-muted-foreground mt-0.5 text-sm">Here&apos;s what&apos;s happening in <span className="font-medium text-foreground">{deptName}</span> today.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />{presentToday} Present
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-400">
                <CalendarDays className="h-3 w-3" />{pendingLeaves} Pending Leaves
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-400">
                <AlertCircle className="h-3 w-3" />{openComplaints} Open Complaints
              </div>
              {urgentTasks > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-xs font-medium text-orange-400 animate-pulse">
                  <Flame className="h-3 w-3" />{urgentTasks} Urgent
                </div>
              )}
            </div>
          </div>

          {/* ── Your Status Card (Quick Clock-In) ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative shrink-0 w-full lg:w-auto"
          >
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/20 via-emerald-500/15 to-amber-500/10 border border-black/[0.1] dark:border-white/[0.1] p-5 lg:min-w-[280px]">
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-bl from-cyan-400/15 to-transparent rounded-full" />
              <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-gradient-to-tr from-emerald-400/10 to-transparent rounded-full" />

              <div className="relative space-y-3">
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

                <div className="border-t border-black/[0.1] dark:border-white/[0.1] pt-3">
                  {isClockedIn ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          </span>
                          <div>
                            <p className="text-xs font-medium text-emerald-400">
                              {myAttendanceToday?.status === 'late' ? 'Clocked In (Late)' : 'Clocked In'}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              In at {myAttendanceToday?.firstIn?.slice(0, 5) || myAttendanceToday?.clockIn?.slice(0, 5) || '--:--'}
                            </p>
                          </div>
                        </div>
                        {!isClockedOut && (
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[10px] text-emerald-400 font-medium">Working</span>
                          </div>
                        )}
                      </div>
                      {isClockedOut && (
                        <p className="text-[10px] text-muted-foreground">
                          Out at {myAttendanceToday?.lastOut?.slice(0, 5) || myAttendanceToday?.clockOut?.slice(0, 5) || '--:--'}
                        </p>
                      )}
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

                {/* Team health mini */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Shield className="h-2.5 w-2.5" />Team
                  </span>
                  {teamHealth.slice(0, 4).map((s) => {
                    const HealthIcon = s.icon;
                    return (
                      <div key={s.label} className="flex items-center gap-0.5 group/health relative" title={s.label}>
                        <span className={`h-1 w-1 rounded-full ${healthColor[s.status]}`} />
                        <HealthIcon className="h-2.5 w-2.5 text-muted-foreground group-hover/health:text-foreground transition-colors" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════
          KPI COMMAND STRIP - 10 Enterprise Hero Cards
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
        <StatCard title="Team Members" value={deptUsers.length} subtitle={`${presentToday} present today`} icon={Users} color="cyan" hero progressRing={{ value: presentToday, max: deptUsers.length || 1 }} />
        <StatCard title="Attendance Rate" value={`${attendanceRate}%`} subtitle={attendanceRate >= 85 ? 'On target' : 'Below target'} icon={Activity} color="emerald" hero progressRing={{ value: attendanceRate, max: 100 }} />
        <StatCard title="Pending Leaves" value={pendingLeaves} subtitle="Awaiting your approval" icon={CalendarDays} color="amber" hero pulse={pendingLeaves > 0} />
        <StatCard title="Open Complaints" value={openComplaints} subtitle={openComplaints > 3 ? 'Needs attention' : 'All managed'} icon={AlertCircle} color="rose" hero pulse={openComplaints > 0} />
        <StatCard title="Task Completion" value={`${taskDoneRate}%`} subtitle={taskDoneRate >= 70 ? 'On track' : 'Needs improvement'} icon={Target} color="violet" hero progressRing={{ value: taskDoneRate, max: 100 }} />
        <StatCard title="Pending Approvals" value={pendingApprovals} subtitle={`${pendingLeaves}L / ${pendingRequests}R / ${openComplaints}C`} icon={ClipboardList} color="orange" hero pulse={pendingApprovals > 0} />
        <StatCard title="Active Tasks" value={activeTasks} subtitle={`${inReviewTasks} in review`} icon={GitBranch} color="cyan" hero />
        <StatCard title="Team Payroll" value={formatCurrency(totalPayroll)} subtitle={`${paidPayroll.length} paid records`} icon={DollarSign} color="emerald" hero />
        <StatCard title="Productivity" value={`${productivityScore}%`} subtitle={productivityScore >= 70 ? 'Excellent' : productivityScore >= 40 ? 'Moderate' : 'Low'} icon={HeartPulse} color="violet" hero progressRing={{ value: productivityScore, max: 100 }} />
        <StatCard title="Overdue Tasks" value={overdueTasks} subtitle={overdueTasks > 0 ? 'Action required' : 'All on schedule'} icon={Timer} color="rose" hero pulse={overdueTasks > 0} />
      </div>

      {/* ═══════════════════════════════════════════════════════════
          BENTO GRID - Main Section (3 columns)
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* ── Team Attendance Overview ── */}
        <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
          <GlassCard className="p-5 h-full" glow="cyan">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-cyan-400" />Team Attendance</h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <ProgressRing value={attendanceRate} size={36} strokeWidth={4} color={attendanceRate >= 80 ? '#10b981' : attendanceRate >= 50 ? '#f59e0b' : '#f43f5e'} />
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold">{attendanceRate}</span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-cyan-400 hover:text-cyan-300"
                  onClick={() => { setActiveView('attendance'); toast.info('Opening Attendance'); }}>
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <DonutChart segments={attendanceSegments} size={110} strokeWidth={14} />
              <div className="space-y-1.5 flex-1">
                {attendanceSegments.map(seg => (
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
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">This Week</p>
                <TrendIndicator value={attendanceRate >= 80 ? 5 : attendanceRate >= 50 ? -2 : -8} label="vs last week" />
              </div>
              <MiniBarChart data={weeklyData} color="cyan" height={60} />
            </div>
          </GlassCard>
        </motion.div>

        {/* ── Approval Pipeline ── */}
        <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
          <GlassCard className="p-5 h-full" glow={pendingApprovals > 0 ? 'amber' : 'none'}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><ClipboardList className="h-4 w-4 text-amber-400" />Approval Pipeline</h3>
              {pendingApprovals > 0 && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-400 animate-pulse">
                  {pendingApprovals}
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              <PipelineStage label="Leave Requests" count={pendingLeaves} color="amber" icon={CalendarDays}
                onClick={() => { setActiveView('leaves'); toast.info('Opening Leave Management'); }} />
              <PipelineStage label="General Requests" count={pendingRequests} color="cyan" icon={FileCheck}
                onClick={() => { setActiveView('requests'); toast.info('Opening Requests'); }} />
              <PipelineStage label="Open Complaints" count={openComplaints} color="rose" icon={AlertCircle}
                onClick={() => { setActiveView('complaints'); toast.info('Opening Complaints'); }} />
              <PipelineStage label="Overdue Tasks" count={overdueTasks} color="orange" icon={Timer}
                onClick={() => { setActiveView('tasks'); toast.info('Opening Tasks'); }} />
              {pendingPayroll.length > 0 && (
                <PipelineStage label="Pending Payroll" count={pendingPayroll.length} color="violet" icon={DollarSign}
                  onClick={() => { setActiveView('payroll'); toast.info('Opening Payroll'); }} />
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* ── Team Performance ── */}
        <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
          <GlassCard className="p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><UsersRound className="h-4 w-4 text-violet-400" />Team Performance</h3>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-violet-400 hover:text-violet-300"
                onClick={() => { setActiveView('hrm'); toast.info('Opening Team'); }}>
                View All <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {teamMemberMetrics.slice(0, showAllMembers ? undefined : 5).map((member) => (
                <div key={member.id} className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all duration-200 cursor-pointer"
                  onClick={() => { setActiveView('hrm'); toast.info('Opening ' + (member.name || 'Member')); }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-gradient-to-br from-cyan-600/40 to-emerald-600/40 text-[9px] text-white font-bold">
                          {member.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate">{member.name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{member.totalTasks} tasks</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">Attendance</span>
                        <span className={`text-[10px] font-bold ${member.attendanceRate >= 80 ? 'text-emerald-400' : member.attendanceRate >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {member.attendanceRate}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.05] overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${member.attendanceRate >= 80 ? 'bg-emerald-500' : member.attendanceRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${member.attendanceRate}%` }}
                          transition={{ duration: 0.6 }}
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">Tasks</span>
                        <span className={`text-[10px] font-bold ${member.taskCompletion >= 70 ? 'text-cyan-400' : 'text-amber-400'}`}>
                          {member.taskCompletion}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.05] overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${member.taskCompletion >= 70 ? 'bg-cyan-500' : 'bg-amber-500'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${member.taskCompletion}%` }}
                          transition={{ duration: 0.6 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {teamMemberMetrics.length > 5 && (
                <button onClick={() => setShowAllMembers(!showAllMembers)} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                  {showAllMembers ? 'Show less' : `+${teamMemberMetrics.length - 5} more members`}
                </button>
              )}
              {teamMemberMetrics.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Users className="h-8 w-8 text-muted-foreground/20" />
                  <p className="text-xs text-muted-foreground">No team members yet</p>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECONDARY GRID (3 columns)
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* ── Task Board Summary ── */}
        <motion.div {...fadeIn} transition={{ delay: 0.25 }}>
          <GlassCard className="p-5 h-full" glow="emerald">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><ListTodo className="h-4 w-4 text-emerald-400" />Task Board</h3>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-400 hover:text-emerald-300"
                onClick={() => { setActiveView('tasks'); toast.info('Opening Tasks'); }}>
                View All <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] text-center">
                <p className="text-lg font-bold text-cyan-400">{deptTasks.filter(t => t?.status !== 'done').length}</p>
                <p className="text-[9px] text-muted-foreground uppercase">Active</p>
              </div>
              <div className="p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] text-center">
                <p className="text-lg font-bold text-emerald-400">{completedTasks}</p>
                <p className="text-[9px] text-muted-foreground uppercase">Completed</p>
              </div>
              <div className="p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] text-center">
                <p className="text-lg font-bold text-rose-400">{overdueTasks}</p>
                <p className="text-[9px] text-muted-foreground uppercase">Overdue</p>
              </div>
            </div>

            <TaskKanbanMini tasks={deptTasks} />

            <div className="border-t border-black/[0.06] dark:border-white/[0.05] pt-3 mt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Weekly Completion</p>
                <Sparkline data={taskSparkData} color="#10b981" />
              </div>
              <MiniBarChart data={weeklyTaskTrend} color="emerald" height={50} />
            </div>

            {urgentTasks > 0 && (
              <div className="mt-3 p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <div className="flex items-center gap-2">
                  <Flame className="h-3.5 w-3.5 text-orange-400" />
                  <span className="text-xs font-medium text-orange-400">{urgentTasks} urgent task{urgentTasks > 1 ? 's' : ''} need attention</span>
                </div>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* ── Payroll Snapshot ── */}
        <motion.div {...fadeIn} transition={{ delay: 0.3 }}>
          <GlassCard className="p-5 h-full" glow="emerald">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4 text-emerald-400" />Team Payroll</h3>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-400 hover:text-emerald-300"
                onClick={() => { setActiveView('payroll'); toast.info('Opening Payroll'); }}>
                View All <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Total Disbursement</p>
                  <p className="text-xl font-bold text-emerald-400">{formatCurrency(totalPayroll)}</p>
                </div>
                <div className="rounded-lg p-2 bg-emerald-500/10">
                  <DollarSign className="h-5 w-5 text-emerald-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                  <p className="text-[9px] text-muted-foreground uppercase">Paid</p>
                  <p className="text-sm font-bold text-emerald-400">{formatCurrency(totalPaid)}</p>
                  <p className="text-[9px] text-muted-foreground">{paidPayroll.length} records</p>
                </div>
                <div className="p-2.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                  <p className="text-[9px] text-muted-foreground uppercase">Pending</p>
                  <p className="text-sm font-bold text-amber-400">{formatCurrency(totalPayroll - totalPaid)}</p>
                  <p className="text-[9px] text-muted-foreground">{pendingPayroll.length} records</p>
                </div>
              </div>
            </div>

            <div className="border-t border-black/[0.06] dark:border-white/[0.05] pt-3">
              <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">6-Month Trend</p>
              <MiniBarChart data={payrollTrend} color="emerald" height={50} />
            </div>
          </GlassCard>
        </motion.div>

        {/* ── Top Performers + Complaint Priority ── */}
        <motion.div {...fadeIn} transition={{ delay: 0.35 }}>
          <GlassCard className="p-5 h-full" glow={topPerformers.length > 0 ? 'amber' : 'none'}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Award className="h-4 w-4 text-amber-400" />Top Performers</h3>
              <span className="text-[10px] text-muted-foreground">Tasks completed</span>
            </div>

            <div className="space-y-2 max-h-[140px] overflow-y-auto">
              {topPerformers.length > 0 ? topPerformers.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors">
                  <div className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold shrink-0 ${
                    i === 0 ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30' :
                    i === 1 ? 'bg-slate-400/20 text-slate-300 ring-1 ring-slate-400/30' :
                    i === 2 ? 'bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/30' :
                    'bg-black/[0.04] dark:bg-white/[0.05] text-muted-foreground'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{p.position || deptName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-emerald-400">{p.completed}</p>
                    <p className="text-[9px] text-muted-foreground">{p.taskRate}% rate</p>
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <Award className="h-8 w-8 text-muted-foreground/20" />
                  <p className="text-xs text-muted-foreground">No completed tasks yet</p>
                </div>
              )}
            </div>

            {/* Complaint Priority Breakdown */}
            {openComplaints > 0 && (
              <div className="mt-4 border-t border-black/[0.06] dark:border-white/[0.05] pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 text-rose-400" />Complaint Priority</h4>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] text-rose-400 hover:text-rose-300 px-2"
                    onClick={() => { setActiveView('complaints'); toast.info('Opening Complaints'); }}>
                    View All
                  </Button>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <DonutChart segments={complaintSegments} size={60} strokeWidth={8} />
                  <div className="flex-1 space-y-1">
                    {complaintSegments.filter(s => s.value > 0).map(seg => (
                      <div key={seg.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: seg.color }} />
                          <span className="text-[10px] text-muted-foreground">{seg.label}</span>
                        </div>
                        <span className="text-[10px] font-bold">{seg.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Recent complaints list (if no priority chart) */}
            {openComplaints === 0 && deptComplaints.length > 0 && (
              <div className="mt-4 border-t border-black/[0.06] dark:border-white/[0.05] pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 text-rose-400" />Recent Complaints</h4>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] text-rose-400 hover:text-rose-300 px-2"
                    onClick={() => { setActiveView('complaints'); toast.info('Opening Complaints'); }}>
                    View All
                  </Button>
                </div>
                <div className="space-y-1.5 max-h-[100px] overflow-y-auto">
                  {deptComplaints.slice(0, 3).map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                      onClick={() => { setActiveView('complaints'); }}>
                      <div className="min-w-0 flex-1 mr-2">
                        <p className="text-[11px] font-medium truncate">{c.subject || 'No subject'}</p>
                        <p className="text-[9px] text-muted-foreground">{c?.isAnonymous ? 'Anonymous' : c?.userName || 'Unknown'}</p>
                      </div>
                      <StatusBadge status={c?.status || 'open'} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          BOTTOM GRID (2 columns)
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        {/* ── Live Activity Feed (Enhanced) ── */}
        <motion.div {...fadeIn} transition={{ delay: 0.4 }}>
          <GlassCard className="p-5 h-full" glow="cyan">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <Zap className="h-4 w-4 text-amber-400" />
                Live Activity Feed
              </h3>
              <span className="text-[10px] text-emerald-400 font-medium">{activityItems.length} events</span>
            </div>

            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {activityItems.length > 0 ? activityItems.slice(0, 12).map((item, i) => {
                const ActivityIcon = item.icon;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-black/[0.01] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors"
                  >
                    <div className={`rounded-lg p-1.5 bg-black/[0.04] dark:bg-white/[0.05] ${item.color} shrink-0`}>
                      <ActivityIcon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs truncate">{item.text}</p>
                        {item.badge && (
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold shrink-0 ${badgeColorMap[item.badge] || 'bg-white/10 text-muted-foreground'}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtext && <p className="text-[10px] text-muted-foreground truncate">{item.subtext}</p>}
                    </div>
                    <span className="text-[9px] text-muted-foreground whitespace-nowrap shrink-0">{timeAgo(item.time)}</span>
                  </motion.div>
                );
              }) : (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Clock className="h-8 w-8 text-muted-foreground/20" />
                  <p className="text-xs text-muted-foreground">No recent activity</p>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* ── Quick Actions + Team Snapshot ── */}
        <motion.div {...fadeIn} transition={{ delay: 0.45 }} className="space-y-4">
          {/* Quick Actions (Enterprise) */}
          <GlassCard className="p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Zap className="h-4 w-4 text-amber-400" />Quick Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {quickActions.map((a) => {
                const cm = actionColorMap[a.color] || actionColorMap.slate;
                return (
                  <Button key={a.label} variant="outline"
                    className={`h-auto py-3 flex-col gap-1 border-black/[0.1] dark:border-white/[0.1] ${cm.hover} ${cm.border} transition-all duration-200 hover:scale-[1.03]`}
                    onClick={() => { setActiveView(a.view); toast.info('Opening ' + a.label); }}>
                    <div className={`rounded-lg p-1.5 ${cm.bg}`}>
                      <a.icon className={`h-4 w-4 ${cm.text}`} />
                    </div>
                    <span className="text-[11px] font-medium">{a.label}</span>
                    <span className="text-[9px] text-muted-foreground">{a.desc}</span>
                  </Button>
                );
              })}
            </div>
          </GlassCard>

          {/* Team Snapshot - Enhanced Enterprise */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Briefcase className="h-4 w-4 text-cyan-400" />Team Snapshot</h3>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <HeartPulse className="h-3 w-3 text-emerald-400" />
                <span className="text-[10px] font-medium text-emerald-400">Health: {productivityScore}%</span>
              </div>
            </div>

            {/* Work Mode Breakdown */}
            <div className="mb-4">
              <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Work Mode</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { mode: 'Office', icon: Monitor, count: deptUsers.filter(u => (u?.workMode || 'OFFICE') === 'OFFICE').length, color: 'cyan' },
                  { mode: 'Remote', icon: Home, count: deptUsers.filter(u => u?.workMode === 'REMOTE').length, color: 'emerald' },
                  { mode: 'Hybrid', icon: Laptop, count: deptUsers.filter(u => u?.workMode === 'HYBRID').length, color: 'amber' },
                ].map(({ mode, icon: ModeIcon, count, color }) => (
                  <div key={mode} className={`flex flex-col items-center gap-1 p-2 rounded-lg bg-${color}-500/5 border border-${color}-500/10`}>
                    <ModeIcon className={`h-4 w-4 text-${color}-400`} />
                    <span className="text-sm font-bold">{count}</span>
                    <span className="text-[9px] text-muted-foreground">{mode}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-3.5 w-3.5 text-violet-400" />
                  <span className="text-[10px] text-muted-foreground uppercase">Members</span>
                </div>
                <p className="text-xl font-bold text-violet-400">{deptUsers.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                <div className="flex items-center gap-2 mb-1">
                  <GitBranch className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="text-[10px] text-muted-foreground uppercase">Teams</span>
                </div>
                <p className="text-xl font-bold text-cyan-400">{(teams ?? []).filter(t => t?.departmentId === user?.departmentId).length}</p>
              </div>
              <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarDays className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-[10px] text-muted-foreground uppercase">On Leave</span>
                </div>
                <p className="text-xl font-bold text-emerald-400">{onLeaveToday}</p>
              </div>
              <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-[10px] text-muted-foreground uppercase">On Time Rate</span>
                </div>
                <p className="text-xl font-bold text-amber-400">{attendanceRate}%</p>
              </div>
            </div>

            {/* Attendance Trend Sparkline */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />Attendance Trend
                </p>
                <TrendIndicator value={attendanceRate >= 80 ? 5 : attendanceRate >= 50 ? -2 : -8} />
              </div>
              <div className="flex items-center gap-2">
                <Sparkline data={attendanceSparkData} color="#06b6d4" width={180} height={40} />
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-lg font-bold">{attendanceRate}%</span>
                  <span className="text-[9px] text-muted-foreground">7-day avg</span>
                </div>
              </div>
              <div className="flex justify-between text-[8px] text-muted-foreground mt-0.5">
                <span>7d ago</span>
                <span>3d</span>
                <span>Today</span>
              </div>
            </div>

            {/* Department Budget Indicator */}
            <div className="mt-4 border-t border-black/[0.06] dark:border-white/[0.05] pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />Budget Indicator
                </p>
                <span className="text-[10px] text-muted-foreground">{formatCurrency(totalPayroll)} disbursed</span>
              </div>
              <div className="h-2 rounded-full bg-black/[0.04] dark:bg-white/[0.05] overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${totalPaid / (totalPayroll || 1) >= 0.8 ? 'bg-emerald-500' : totalPaid / (totalPayroll || 1) >= 0.5 ? 'bg-amber-500' : 'bg-rose-500'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((totalPaid / (totalPayroll || 1)) * 100, 100)}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[9px] text-muted-foreground">Paid: {formatCurrency(totalPaid)}</span>
                <span className="text-[9px] text-muted-foreground">Pending: {formatCurrency(totalPayroll - totalPaid)}</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
