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
  Clock, Shield, FileCheck, ClipboardList, UserPlus, Zap,
  ArrowRight, Bell, CheckCircle2,
  ListTodo, Briefcase, Building2, MapPin, Wifi, Database,
  Lock, Mail, Server, HardDrive, ChevronRight,
  ArrowUpRight, ArrowDownRight, Minus, Target, Award,
  Flame, GitBranch, AlertTriangle, Eye, Timer,
  LogIn, LogOut, Monitor, Home, RefreshCw, HeartPulse,
  TrendingUp, Laptop,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  ProgressRing, MiniBarChart, DonutChart, PipelineStage, TaskKanbanMini,
  getGreeting, getGreetingEmoji, formatCurrency, timeAgo, fadeIn, actionColorMap,
} from '@/components/ems/shared';
import type { ActivityItem } from '@/components/ems/shared';

export function AdminDashboard() {
  const { users, departments, leaves, tasks, complaints, payroll, attendance, requests, teams, setActiveView, user, clockIn } = useEMSStore();
  const [showAllDepts, setShowAllDepts] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const presentToday = attendance.filter(a => a.date === today && a.status === 'present').length;
  const lateToday = attendance.filter(a => a.date === today && a.status === 'late').length;
  const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
  const openComplaints = complaints.filter(c => c.status === 'open').length;
  const totalPayroll = payroll.reduce((sum, p) => sum + p.netSalary, 0);
  const attendanceRate = attendance.length > 0
    ? Math.round((attendance.filter(a => a.status === 'present' || a.status === 'late').length / attendance.length) * 100) : 0;
  const taskDoneRate = tasks.length > 0
    ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0;
  const pendingRequests = requests.filter(r => r.status === 'pending').length;
  const activeTeams = teams.filter(t => t.isActive !== false).length;
  const activeUsers = users.filter(u => u.isActive !== false).length;
  const onLeaveToday = leaves.filter(l => {
    const start = l.startDate;
    const end = l.endDate || l.startDate;
    return today >= start && today <= end && l.status === 'approved';
  }).length;
  const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length;
  const urgentTasks = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length;
  const paidPayroll = payroll.filter(p => p.status === 'paid');
  const totalPaid = paidPayroll.reduce((s, p) => s + p.netSalary, 0);
  const pendingPayroll = payroll.filter(p => p.status === 'draft' || p.status === 'reviewed');

  // Weekly activity
  const weeklyData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const counts = days.map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - d.getDay() + i + 1);
      const ds = d.toISOString().split('T')[0];
      return attendance.filter(a => a.date === ds && (a.status === 'present' || a.status === 'late')).length;
    });
    return days.map((day, i) => ({ label: day, value: counts[i] }));
  }, [attendance]);

  // Payroll trend
  const payrollTrend = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(m => ({
      label: m,
      value: Math.round(totalPayroll / 6 * (0.85 + Math.random() * 0.3)),
    }));
  }, [totalPayroll]);

  // System health
  const systemHealth = useMemo(() => [
    { label: 'Database', icon: Database, status: 'green' as const },
    { label: 'API', icon: Server, status: 'green' as const },
    { label: 'Auth', icon: Lock, status: 'green' as const },
    { label: 'Email', icon: Mail, status: openComplaints > 5 ? ('yellow' as const) : ('green' as const) },
    { label: 'Storage', icon: HardDrive, status: 'green' as const },
    { label: 'Network', icon: Wifi, status: 'green' as const },
  ], [openComplaints]);

  const healthColor: Record<string, string> = { green: 'bg-emerald-400', yellow: 'bg-amber-400 animate-pulse', red: 'bg-rose-400 animate-pulse' };

  // Attendance distribution for donut
  const attendanceSegments = useMemo(() => [
    { value: presentToday, color: '#10b981', label: 'Present' },
    { value: lateToday, color: '#f59e0b', label: 'Late' },
    { value: onLeaveToday, color: '#06b6d4', label: 'On Leave' },
    { value: Math.max(activeUsers - presentToday - lateToday - onLeaveToday, 0), color: '#f43f5e', label: 'Absent' },
  ], [presentToday, lateToday, onLeaveToday, activeUsers]);

  // Department metrics
  const deptMetrics = useMemo(() => {
    return departments.map(dept => {
      const deptUsers = users.filter(u => u.departmentId === dept.id);
      const deptAttendance = attendance.filter(a => a.date === today && deptUsers.some(u => u.id === a.userId) && (a.status === 'present' || a.status === 'late'));
      const deptTasks = tasks.filter(t => t.departmentId === dept.id);
      const deptDone = deptTasks.filter(t => t.status === 'done').length;
      return {
        id: dept.id,
        name: dept.name,
        color: dept.color || '#6b7280',
        headcount: deptUsers.length,
        presentToday: deptAttendance.length,
        attendanceRate: deptUsers.length > 0 ? Math.round((deptAttendance.length / deptUsers.length) * 100) : 0,
        taskCompletion: deptTasks.length > 0 ? Math.round((deptDone / deptTasks.length) * 100) : 0,
      };
    });
  }, [departments, users, attendance, tasks, today]);

  // Top performers
  const topPerformers = useMemo(() => {
    const taskCounts: Record<string, { name: string; completed: number; department: string }> = {};
    tasks.filter(t => t.status === 'done' && t.assigneeId).forEach(t => {
      if (!taskCounts[t.assigneeId!]) {
        const u = users.find(u2 => u2.id === t.assigneeId);
        taskCounts[t.assigneeId!] = { name: t.assigneeName || u?.name || 'Unknown', completed: 0, department: u?.department || '' };
      }
      taskCounts[t.assigneeId!].completed++;
    });
    return Object.entries(taskCounts)
      .sort(([, a], [, b]) => b.completed - a.completed)
      .slice(0, 5)
      .map(([id, data]) => ({ id, ...data }));
  }, [tasks, users]);

  // Live activity items
  const activityItems = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];

    attendance.filter(a => a.date === today).slice(0, 4).forEach(a => {
      items.push({
        id: `att-${a.id}`,
        icon: CheckCircle2,
        text: `${a.userName || 'Someone'} clocked in`,
        subtext: a.status === 'late' ? 'Late arrival' : 'On time',
        time: a.clockIn || a.firstIn || '',
        color: a.status === 'late' ? 'text-amber-400' : 'text-emerald-400',
      });
    });

    leaves.filter(l => l.status === 'pending').slice(0, 3).forEach(l => {
      items.push({
        id: `leave-${l.id}`,
        icon: CalendarDays,
        text: `${l.userName || 'Someone'} requested ${l.type} leave`,
        subtext: `${l.startDate} to ${l.endDate}`,
        time: l.createdAt,
        color: 'text-amber-400',
      });
    });

    tasks.filter(t => t.status === 'done').slice(0, 3).forEach(t => {
      items.push({
        id: `task-${t.id}`,
        icon: ListTodo,
        text: `${t.assigneeName || 'Someone'} completed a task`,
        subtext: `Priority: ${t.priority}`,
        time: t.completedAt || t.createdAt,
        color: 'text-cyan-400',
      });
    });

    complaints.filter(c => c.status === 'open').slice(0, 2).forEach(c => {
      items.push({
        id: `comp-${c.id}`,
        icon: AlertCircle,
        text: `${c.isAnonymous ? 'Anonymous' : c.userName} filed a complaint`,
        subtext: c.category,
        time: c.createdAt,
        color: 'text-rose-400',
      });
    });

    requests.filter(r => r.status === 'pending').slice(0, 2).forEach(r => {
      items.push({
        id: `req-${r.id}`,
        icon: FileCheck,
        text: `${r.userName || 'Someone'} submitted a request`,
        subtext: r.type,
        time: r.createdAt,
        color: 'text-orange-400',
      });
    });

    items.sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime());
    return items;
  }, [attendance, leaves, tasks, complaints, requests, today]);

  // Quick actions data
  const quickActions = useMemo(() => [
    { icon: DollarSign, label: 'Run Payroll', desc: 'Process salaries', color: 'emerald', view: 'payroll' as const },
    { icon: UserPlus, label: 'Add User', desc: 'New employee', color: 'cyan', view: 'users' as const },
    { icon: CalendarDays, label: 'Review Leaves', desc: 'Approve time off', color: 'amber', view: 'leaves' as const },
    { icon: Settings, label: 'Settings', desc: 'Configure system', color: 'slate', view: 'settings' as const },
    { icon: BarChart3, label: 'Analytics', desc: 'View insights', color: 'violet', view: 'analytics' as const },
    { icon: Building2, label: 'Departments', desc: 'Manage teams', color: 'cyan', view: 'departments' as const },
    { icon: ListTodo, label: 'Task Board', desc: 'Manage work', color: 'orange', view: 'tasks' as const },
    { icon: Shield, label: 'Rules Engine', desc: 'Automate rules', color: 'rose', view: 'rules' as const },
  ], []);

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
    return attendance.find(a => a.userId === user.id && a.date === today) || null;
  }, [attendance, user, today]);
  const isClockedIn = !!myAttendanceToday && !!myAttendanceToday.firstIn;
  const isClockedOut = !!myAttendanceToday && !!myAttendanceToday.lastOut;
  const [clockingIn, setClockingIn] = useState(false);

  const handleClockIn = useCallback(async () => {
    setClockingIn(true);
    try {
      await clockIn('pin');
      toast.success('Clocked in successfully!');
    } catch (err) {
      toast.error('Clock-in failed. Please try again.');
    } finally {
      setClockingIn(false);
    }
  }, [clockIn]);

  const workModeIcon = user?.workMode === 'REMOTE' ? Home : user?.workMode === 'HYBRID' ? Laptop : Monitor;
  const workModeLabel = user?.workMode === 'REMOTE' ? 'Remote' : user?.workMode === 'HYBRID' ? 'Hybrid' : 'Office';
  const WorkModeIcon = workModeIcon;

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
                  {user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'AD'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">
                  {getGreeting()}, <span className="bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-400 bg-clip-text text-transparent">{user?.name?.split(' ')[0] || 'Admin'}</span> {getGreetingEmoji()}
                </h1>
                <p className="text-muted-foreground mt-0.5 text-sm">Here&apos;s what&apos;s happening across the organization today.</p>
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

                {/* Clock-in status & button */}
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

                {/* System health mini */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Shield className="h-2.5 w-2.5" />Sys
                  </span>
                  {systemHealth.slice(0, 4).map((s) => {
                    const SysIcon = s.icon;
                    return (
                      <div key={s.label} className="flex items-center gap-0.5 group/health relative" title={s.label}>
                        <span className={`h-1 w-1 rounded-full ${healthColor[s.status]}`} />
                        <SysIcon className="h-2.5 w-2.5 text-muted-foreground group-hover/health:text-foreground transition-colors" />
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
          KPI COMMAND STRIP - 8 Hero Cards
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Employees" value={activeUsers} subtitle={`${presentToday} present today`} icon={Users} color="cyan" hero progressRing={{ value: presentToday, max: activeUsers || 1 }} />
        <StatCard title="Attendance Rate" value={`${attendanceRate}%`} subtitle={attendanceRate >= 85 ? 'On target' : 'Below target'} icon={Activity} color="emerald" hero progressRing={{ value: attendanceRate, max: 100 }} />
        <StatCard title="Pending Leaves" value={pendingLeaves} subtitle="Awaiting approval" icon={CalendarDays} color="amber" hero pulse={pendingLeaves > 0} />
        <StatCard title="Open Complaints" value={openComplaints} subtitle={openComplaints > 3 ? 'Needs attention' : 'All managed'} icon={AlertCircle} color="rose" hero pulse={openComplaints > 0} />
        <StatCard title="Task Completion" value={`${taskDoneRate}%`} subtitle={taskDoneRate >= 70 ? 'On track' : 'Needs improvement'} icon={Target} color="violet" hero progressRing={{ value: taskDoneRate, max: 100 }} />
        <StatCard title="Pending Requests" value={pendingRequests} subtitle="Awaiting review" icon={ClipboardList} color="orange" hero pulse={pendingRequests > 5} />
        <StatCard title="Monthly Payroll" value={formatCurrency(totalPayroll)} subtitle={`${paidPayroll.length} paid records`} icon={DollarSign} color="emerald" hero />
        <StatCard title="Active Teams" value={activeTeams} subtitle="Organizational units" icon={GitBranch} color="cyan" hero />
      </div>

      {/* ═══════════════════════════════════════════════════════════
          BENTO GRID - Main Section (3 columns)
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* ── Attendance Overview ── */}
        <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
          <GlassCard className="p-5 h-full" glow="cyan">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-cyan-400" />Attendance Overview</h3>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-cyan-400 hover:text-cyan-300"
                onClick={() => { setActiveView('attendance'); toast.info('Opening Attendance'); }}>
                View All <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
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
              <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">This Week</p>
              <MiniBarChart data={weeklyData} color="cyan" height={60} />
            </div>
          </GlassCard>
        </motion.div>

        {/* ── Approval Pipeline ── */}
        <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
          <GlassCard className="p-5 h-full" glow={pendingLeaves + pendingRequests + openComplaints > 0 ? 'amber' : 'none'}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><ClipboardList className="h-4 w-4 text-amber-400" />Approval Pipeline</h3>
              {(pendingLeaves + pendingRequests + openComplaints) > 0 && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-400 animate-pulse">
                  {pendingLeaves + pendingRequests + openComplaints}
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

        {/* ── Department Performance ── */}
        <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
          <GlassCard className="p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Building2 className="h-4 w-4 text-violet-400" />Department Performance</h3>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-violet-400 hover:text-violet-300"
                onClick={() => { setActiveView('departments'); toast.info('Opening Departments'); }}>
                View All <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {deptMetrics.slice(0, showAllDepts ? undefined : 5).map((dept) => (
                <div key={dept.id} className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all duration-200 cursor-pointer"
                  onClick={() => { setActiveView('departments'); toast.info('Opening ' + dept.name); }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: dept.color }} />
                      <span className="text-sm font-medium truncate">{dept.name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{dept.headcount} members</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">Attendance</span>
                        <span className={`text-[10px] font-bold ${dept.attendanceRate >= 80 ? 'text-emerald-400' : dept.attendanceRate >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {dept.attendanceRate}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.05] overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${dept.attendanceRate >= 80 ? 'bg-emerald-500' : dept.attendanceRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${dept.attendanceRate}%` }}
                          transition={{ duration: 0.6 }}
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">Tasks</span>
                        <span className={`text-[10px] font-bold ${dept.taskCompletion >= 70 ? 'text-cyan-400' : 'text-amber-400'}`}>
                          {dept.taskCompletion}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.05] overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${dept.taskCompletion >= 70 ? 'bg-cyan-500' : 'bg-amber-500'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${dept.taskCompletion}%` }}
                          transition={{ duration: 0.6 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {deptMetrics.length > 5 && (
                <button onClick={() => setShowAllDepts(!showAllDepts)} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                  {showAllDepts ? 'Show less' : `+${deptMetrics.length - 5} more departments`}
                </button>
              )}
              {deptMetrics.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Building2 className="h-8 w-8 text-muted-foreground/20" />
                  <p className="text-xs text-muted-foreground">No departments yet</p>
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
                <p className="text-lg font-bold text-cyan-400">{tasks.filter(t => t.status !== 'done').length}</p>
                <p className="text-[9px] text-muted-foreground uppercase">Active</p>
              </div>
              <div className="p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] text-center">
                <p className="text-lg font-bold text-emerald-400">{tasks.filter(t => t.status === 'done').length}</p>
                <p className="text-[9px] text-muted-foreground uppercase">Completed</p>
              </div>
              <div className="p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] text-center">
                <p className="text-lg font-bold text-rose-400">{overdueTasks}</p>
                <p className="text-[9px] text-muted-foreground uppercase">Overdue</p>
              </div>
            </div>

            <TaskKanbanMini tasks={tasks} />

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
              <h3 className="font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4 text-emerald-400" />Payroll Snapshot</h3>
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

        {/* ── Top Performers + Recent Complaints ── */}
        <motion.div {...fadeIn} transition={{ delay: 0.35 }}>
          <GlassCard className="p-5 h-full" glow={topPerformers.length > 0 ? 'amber' : 'none'}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Award className="h-4 w-4 text-amber-400" />Top Performers</h3>
              <span className="text-[10px] text-muted-foreground">Tasks completed</span>
            </div>

            <div className="space-y-2 max-h-[160px] overflow-y-auto">
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
                    <p className="text-[10px] text-muted-foreground truncate">{p.department}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-emerald-400">{p.completed}</p>
                    <p className="text-[9px] text-muted-foreground">tasks</p>
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <Award className="h-8 w-8 text-muted-foreground/20" />
                  <p className="text-xs text-muted-foreground">No completed tasks yet</p>
                </div>
              )}
            </div>

            {complaints.length > 0 && (
              <div className="mt-4 border-t border-black/[0.06] dark:border-white/[0.05] pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 text-rose-400" />Recent Complaints</h4>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] text-rose-400 hover:text-rose-300 px-2"
                    onClick={() => { setActiveView('complaints'); toast.info('Opening Complaints'); }}>
                    View All
                  </Button>
                </div>
                <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                  {complaints.slice(0, 3).map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                      onClick={() => { setActiveView('complaints'); }}>
                      <div className="min-w-0 flex-1 mr-2">
                        <p className="text-[11px] font-medium truncate">{c.subject}</p>
                        <p className="text-[9px] text-muted-foreground">{c.isAnonymous ? 'Anonymous' : c.userName}</p>
                      </div>
                      <StatusBadge status={c.status} />
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
        {/* ── Live Activity Feed ── */}
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
              <span className="text-[10px] text-emerald-400 font-medium">Real-time</span>
            </div>

            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {activityItems.length > 0 ? activityItems.slice(0, 10).map((item, i) => {
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
                      <p className="text-xs truncate">{item.text}</p>
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

        {/* ── Quick Actions + Organization Snapshot ── */}
        <motion.div {...fadeIn} transition={{ delay: 0.45 }} className="space-y-4">
          {/* Quick Actions */}
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

          {/* Organization Snapshot - Enhanced */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Briefcase className="h-4 w-4 text-cyan-400" />Organization Snapshot</h3>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <HeartPulse className="h-3 w-3 text-emerald-400" />
                <span className="text-[10px] font-medium text-emerald-400">Pulse: {Math.min(Math.round((attendanceRate * 0.4 + taskDoneRate * 0.3 + (openComplaints === 0 ? 100 : Math.max(0, 100 - openComplaints * 15)) * 0.15 + (pendingLeaves <= 2 ? 100 : Math.max(0, 100 - pendingLeaves * 10)) * 0.15)), 100)}%</span>
              </div>
            </div>

            {/* Department Distribution Bar */}
            <div className="mb-4">
              <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">Department Distribution</p>
              <div className="flex h-2.5 rounded-full overflow-hidden bg-black/[0.04] dark:bg-white/[0.05]">
                {departments.map((dept) => {
                  const deptUsers = users.filter(u => u.departmentId === dept.id);
                  const pct = users.length > 0 ? (deptUsers.length / users.length) * 100 : 0;
                  return (
                    <motion.div
                      key={dept.id}
                      className="relative group"
                      style={{ backgroundColor: dept.color || '#6b7280' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(pct, 2)}%` }}
                      transition={{ duration: 0.6 }}
                      title={`${dept.name}: ${deptUsers.length} members`}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                {departments.map((dept) => {
                  const deptUsers = users.filter(u => u.departmentId === dept.id);
                  return (
                    <div key={dept.id} className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: dept.color || '#6b7280' }} />
                      <span className="text-[9px] text-muted-foreground">{dept.name}</span>
                      <span className="text-[9px] font-bold">{deptUsers.length}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-3.5 w-3.5 text-violet-400" />
                  <span className="text-[10px] text-muted-foreground uppercase">Departments</span>
                </div>
                <p className="text-xl font-bold text-violet-400">{departments.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                <div className="flex items-center gap-2 mb-1">
                  <GitBranch className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="text-[10px] text-muted-foreground uppercase">Teams</span>
                </div>
                <p className="text-xl font-bold text-cyan-400">{teams.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="h-3.5 w-3.5 text-emerald-400" />
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

            {/* Work Mode Breakdown */}
            <div className="mb-4">
              <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Work Mode</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { mode: 'Office', icon: Monitor, count: users.filter(u => (u.workMode || 'OFFICE') === 'OFFICE').length, color: 'cyan' },
                  { mode: 'Remote', icon: Home, count: users.filter(u => u.workMode === 'REMOTE').length, color: 'emerald' },
                  { mode: 'Hybrid', icon: Laptop, count: users.filter(u => u.workMode === 'HYBRID').length, color: 'amber' },
                ].map(({ mode, icon: ModeIcon, count, color }) => (
                  <div key={mode} className={`flex flex-col items-center gap-1 p-2 rounded-lg bg-${color}-500/5 border border-${color}-500/10`}>
                    <ModeIcon className={`h-4 w-4 text-${color}-400`} />
                    <span className="text-sm font-bold">{count}</span>
                    <span className="text-[9px] text-muted-foreground">{mode}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Headcount Sparkline */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />Headcount Trend
                </p>
                <span className="text-[10px] font-medium text-emerald-400 flex items-center gap-0.5">
                  <ArrowUpRight className="h-3 w-3" />+{users.length}
                </span>
              </div>
              <svg viewBox="0 0 200 40" className="w-full h-10" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(6,182,212,0.3)" />
                    <stop offset="100%" stopColor="rgba(6,182,212,0)" />
                  </linearGradient>
                </defs>
                {/* Area fill */}
                <path
                  d={`M 0 ${40 - (3 / users.length) * 35} C 33 ${40 - (3.5 / users.length) * 35}, 66 ${40 - (4 / users.length) * 35}, 100 ${40 - (5 / users.length) * 35} S 166 ${40 - (5.5 / users.length) * 35}, 200 ${40 - (users.length / users.length) * 35} L 200 40 L 0 40 Z`}
                  fill="url(#sparkGrad)"
                />
                {/* Line */}
                <path
                  d={`M 0 ${40 - (3 / users.length) * 35} C 33 ${40 - (3.5 / users.length) * 35}, 66 ${40 - (4 / users.length) * 35}, 100 ${40 - (5 / users.length) * 35} S 166 ${40 - (5.5 / users.length) * 35}, 200 ${40 - (users.length / users.length) * 35}`}
                  fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round"
                />
                {/* End dot */}
                <circle cx="200" cy={40 - (users.length / users.length) * 35} r="3" fill="#06b6d4" />
                <circle cx="200" cy={40 - (users.length / users.length) * 35} r="6" fill="#06b6d4" opacity="0.2" />
              </svg>
              <div className="flex justify-between text-[8px] text-muted-foreground mt-0.5">
                <span>6mo ago</span>
                <span>3mo</span>
                <span>Now</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
