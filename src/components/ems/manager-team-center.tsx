'use client';

import { useState, useMemo, useCallback } from 'react';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { StatCard } from './stat-card';
import { StatusBadge } from './status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format, parseISO, addDays, startOfWeek, isToday, isWeekend } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';
import {
  Users, CheckCircle2, Clock, AlertCircle, Zap, TrendingUp, Activity, Coffee,
  CalendarDays, Shield, Search, MoreHorizontal, ArrowUpDown, ChevronUp, ChevronDown,
  Mail, Building2, Eye, Edit3, Send, UserPlus, Crown, Star, Award,
  Target, BarChart3, PieChart as PieIcon, Settings, Bell, FileText,
  ChevronRight, GripVertical, MapPin, Briefcase, Timer, MessageSquare,
  ArrowRight, Filter, X, Download, Plus, ChevronDown as ChevronDownIcon,
  LayoutDashboard, Network, Gauge, CalendarCheck, Cog, Sparkles,
  ThumbsUp, ThumbsDown, UsersRound, CircleDot, UserCheck, UserX,
  Calendar, Clock4, Laptop, MonitorSmartphone, Home,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────
function getInitials(name?: string) {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarColor(name: string) {
  const colors = [
    'from-emerald-500 to-cyan-500', 'from-amber-500 to-orange-500',
    'from-rose-500 to-pink-500', 'from-cyan-500 to-teal-500',
    'from-lime-500 to-green-500', 'from-fuchsia-500 to-pink-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const CHART_COLORS = ['#10b981', '#06b6d4', '#f59e0b', '#f43f5e', '#8b5cf6', '#f97316'];

// ─── Main Component ───────────────────────────────────────────────
export function ManagerTeamCenter() {
  const { user, users, tasks, attendance, leaves, departments, shifts, complaints, requests, notifications, teams } = useEMSStore();
  const [activeTab, setActiveTab] = useState('overview');

  // ─── Scoped data ─────────────────────────────────────────────
  const deptId = user?.departmentId;
  const teamMembers = useMemo(() => users.filter(u => u.departmentId === deptId && u.role !== 'manager'), [users, deptId]);
  const teamTasks = useMemo(() => tasks.filter(t => t.departmentId === deptId), [tasks, deptId]);
  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = useMemo(() => attendance.filter(a => a.date === today), [attendance, today]);
  const teamLeaves = useMemo(() => leaves.filter(l => teamMembers.some(m => m.id === l.userId)), [leaves, teamMembers]);
  const teamComplaints = useMemo(() => complaints.filter(c => c.departmentId === deptId), [complaints, deptId]);
  const teamRequests = useMemo(() => requests.filter(r => r.departmentId === deptId), [requests, deptId]);
  const dept = useMemo(() => departments.find(d => d.id === deptId), [departments, deptId]);

  // ─── KPI calculations ────────────────────────────────────────
  const presentCount = todayAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
  const onLeaveToday = teamLeaves.filter(l => l.status === 'approved' && l.startDate <= today && l.endDate >= today).length;
  const activeTasks = teamTasks.filter(t => t.status !== 'done').length;
  const doneTasks = teamTasks.filter(t => t.status === 'done').length;
  const productivity = teamTasks.length > 0 ? Math.round((doneTasks / teamTasks.length) * 100) : 0;
  const openComplaints = teamComplaints.filter(c => c.status !== 'resolved' && c.status !== 'closed').length;
  const pendingRequests = teamRequests.filter(r => r.status === 'pending' || r.status === 'under-review').length;
  const teamScore = useMemo(() => {
    const attendanceWt = teamMembers.length > 0 ? (presentCount / teamMembers.length) * 30 : 0;
    const taskWt = productivity * 0.4;
    const complaintWt = openComplaints === 0 ? 20 : Math.max(0, 20 - openComplaints * 5);
    const leaveWt = teamMembers.length > 0 ? Math.max(0, 10 - (onLeaveToday / teamMembers.length) * 30) : 10;
    return Math.round(attendanceWt + taskWt + complaintWt + leaveWt);
  }, [teamMembers.length, presentCount, productivity, openComplaints, onLeaveToday]);

  // ═══════════════════════════════════════════════════════════════
  // ═══ RENDER ═══════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-emerald-400" /> {dept?.name || 'Team'} Center
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Enterprise team management dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-emerald-500/20 text-emerald-400 bg-emerald-500/5">
            <Activity className="h-3 w-3 mr-1" /> Live
          </Badge>
          <Badge variant="outline" className="border-cyan-500/20 text-cyan-400 bg-cyan-500/5">
            {teamMembers.length} Members
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1] flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs gap-1.5">
            <LayoutDashboard className="h-3.5 w-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="members" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs gap-1.5">
            <Users className="h-3.5 w-3.5" /> Members
          </TabsTrigger>
          <TabsTrigger value="org" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs gap-1.5">
            <Network className="h-3.5 w-3.5" /> Org Structure
          </TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs gap-1.5">
            <Gauge className="h-3.5 w-3.5" /> Performance
          </TabsTrigger>
          <TabsTrigger value="schedule" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs gap-1.5">
            <CalendarCheck className="h-3.5 w-3.5" /> Schedule
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs gap-1.5">
            <Cog className="h-3.5 w-3.5" /> Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-6">
          <OverviewTab
            teamMembers={teamMembers} teamTasks={teamTasks} todayAttendance={todayAttendance}
            presentCount={presentCount} onLeaveToday={onLeaveToday} activeTasks={activeTasks}
            productivity={productivity} openComplaints={openComplaints} pendingRequests={pendingRequests}
            teamScore={teamScore} teamLeaves={teamLeaves} teamComplaints={teamComplaints}
            teamRequests={teamRequests} notifications={notifications} user={user} dept={dept} today={today}
          />
        </TabsContent>

        <TabsContent value="members" className="mt-4 space-y-4">
          <MembersTab
            teamMembers={teamMembers} teamTasks={teamTasks} todayAttendance={todayAttendance}
            teamLeaves={teamLeaves} attendance={attendance} dept={dept} user={user} today={today}
          />
        </TabsContent>

        <TabsContent value="org" className="mt-4 space-y-4">
          <OrgStructureTab teamMembers={teamMembers} user={user} dept={dept} />
        </TabsContent>

        <TabsContent value="performance" className="mt-4 space-y-4">
          <PerformanceTab
            teamMembers={teamMembers} teamTasks={teamTasks} todayAttendance={todayAttendance}
            attendance={attendance} teamLeaves={teamLeaves} teamComplaints={teamComplaints} today={today}
          />
        </TabsContent>

        <TabsContent value="schedule" className="mt-4 space-y-4">
          <ScheduleTab
            teamMembers={teamMembers} todayAttendance={todayAttendance} teamLeaves={teamLeaves}
            attendance={attendance} shifts={shifts} today={today}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-4">
          <SettingsTab user={user} dept={dept} teamMembers={teamMembers} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 1 — OVERVIEW
// ═══════════════════════════════════════════════════════════════════
function OverviewTab({ teamMembers, teamTasks, todayAttendance, presentCount, onLeaveToday, activeTasks, productivity, openComplaints, pendingRequests, teamScore, teamLeaves, teamComplaints, teamRequests, notifications, user, dept, today }: any) {
  // Activity feed
  const activityFeed = useMemo(() => {
    const items: Array<{ id: string; text: string; time: string; type: string; color: string }> = [];
    teamTasks.slice(-6).forEach((t: any) => {
      items.push({ id: t.id, text: `${t.assigneeName || 'Someone'} completed "${t.title}"`, time: t.completedAt || t.createdAt, type: 'task', color: 'emerald' });
    });
    todayAttendance.forEach((a: any) => {
      items.push({ id: a.id, text: `${a.userName || 'Someone'} ${a.status === 'present' ? 'checked in' : 'marked ' + a.status}`, time: a.date, type: 'attendance', color: a.status === 'late' ? 'amber' : 'cyan' });
    });
    teamLeaves.filter((l: any) => l.status === 'pending').slice(0, 3).forEach((l: any) => {
      items.push({ id: l.id, text: `${l.userName || 'Someone'} requested ${l.type} leave`, time: l.createdAt, type: 'leave', color: 'amber' });
    });
    return items.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 10);
  }, [teamTasks, todayAttendance, teamLeaves]);

  const insights = useMemo(() => {
    const list: string[] = [];
    if (productivity >= 75) list.push('Team productivity is strong at ' + productivity + '%. Keep up the momentum!');
    else if (productivity < 50) list.push('Productivity is below 50%. Consider reviewing workload distribution.');
    if (openComplaints > 3) list.push(`${openComplaints} open complaints need attention. Prioritize resolution.`);
    if (onLeaveToday > teamMembers.length * 0.3) list.push('High leave ratio today — consider coverage adjustments.');
    if (pendingRequests > 5) list.push(`${pendingRequests} pending requests. Review to avoid bottlenecks.`);
    if (teamScore >= 80) list.push('Team health score is excellent! Recognize top contributors.');
    if (list.length === 0) list.push('Team metrics look stable. No immediate actions required.');
    return list;
  }, [productivity, openComplaints, onLeaveToday, pendingRequests, teamScore, teamMembers.length]);

  const doneTasks = useMemo(() => teamTasks.filter((t: any) => t.status === 'done').length, [teamTasks]);
  const attendanceRate = teamMembers.length > 0 ? Math.round((presentCount / teamMembers.length) * 100) : 0;

  const kpis = [
    {
      title: 'Team Size',
      value: teamMembers.length,
      icon: Users,
      color: 'cyan' as const,
      subtitle: `${dept?.name || 'Department'} roster`,
      trend: { value: teamMembers.length, label: 'members total' },
    },
    {
      title: 'Present Today',
      value: presentCount,
      icon: UserCheck,
      color: 'emerald' as const,
      subtitle: `${attendanceRate}% on duty today`,
      progressRing: teamMembers.length > 0 ? { value: presentCount, max: teamMembers.length } : undefined,
    },
    {
      title: 'On Leave',
      value: onLeaveToday,
      icon: Coffee,
      color: 'amber' as const,
      subtitle: `${teamMembers.length - onLeaveToday} available today`,
      pulse: onLeaveToday > 0,
    },
    {
      title: 'Active Tasks',
      value: activeTasks,
      icon: Target,
      color: 'violet' as const,
      subtitle: `${doneTasks} completed`,
    },
    {
      title: 'Productivity',
      value: `${productivity}%`,
      icon: Zap,
      color: 'cyan' as const,
      subtitle: `${doneTasks} of ${teamTasks.length} tasks done`,
      trend: { value: productivity >= 70 ? 8 : -4, label: 'velocity' },
    },
    {
      title: 'Open Complaints',
      value: openComplaints,
      icon: AlertCircle,
      color: 'rose' as const,
      subtitle: openComplaints > 0 ? 'Requires attention' : 'All clear',
      pulse: openComplaints > 0,
    },
    {
      title: 'Pending Requests',
      value: pendingRequests,
      icon: Clock,
      color: 'amber' as const,
      subtitle: pendingRequests > 0 ? 'Awaiting response' : 'Queue clear',
      pulse: pendingRequests > 0,
    },
    {
      title: 'Team Health',
      value: `${teamScore}/100`,
      icon: Star,
      color: (teamScore >= 80 ? 'emerald' : teamScore >= 60 ? 'amber' : 'rose') as const,
      subtitle: teamScore >= 80 ? 'Excellent condition' : 'Needs attention',
      progressRing: { value: teamScore, max: 100 },
    },
  ];

  const quickActions = [
    { label: 'Approve Leave', icon: CheckCircle2, color: 'emerald', count: teamLeaves.filter((l: any) => l.status === 'pending').length, action: () => toast.info('Navigate to Leave portal') },
    { label: 'Assign Task', icon: Target, color: 'cyan', count: 0, action: () => toast.info('Navigate to Task board') },
    { label: 'View Complaints', icon: AlertCircle, color: 'rose', count: openComplaints, action: () => toast.info('Navigate to Complaints') },
    { label: 'Team Schedule', icon: CalendarDays, color: 'amber', count: 0, action: () => toast.info('Navigate to Schedule tab') },
    { label: 'Performance Review', icon: TrendingUp, color: 'cyan', count: 0, action: () => toast.info('Navigate to Performance tab') },
    { label: 'Send Notification', icon: Send, color: 'emerald', count: 0, action: () => toast.info('Notification feature') },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <StatCard
              title={kpi.title}
              value={kpi.value}
              icon={kpi.icon}
              color={kpi.color}
              subtitle={kpi.subtitle}
              progressRing={kpi.progressRing}
              trend={kpi.trend}
              pulse={kpi.pulse}
              hero
            />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Health Indicator */}
        <GlassCard glow="emerald" className="p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400" /> Team Health
          </h3>
          <div className="flex items-center gap-4">
            <div className="relative h-24 w-24">
              <svg className="h-24 w-24 transform -rotate-90">
                <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                <circle cx="48" cy="48" r="40" fill="none" stroke="#10b981" strokeWidth="8"
                  strokeDasharray={`${(teamScore / 100) * 251.2} 251.2`} strokeLinecap="round"
                  className="transition-all duration-700" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-emerald-400">{teamScore}</span>
            </div>
            <div className="space-y-1.5 text-xs flex-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Attendance</span><span className="text-emerald-400">{teamMembers.length > 0 ? Math.round((presentCount / teamMembers.length) * 100) : 0}%</span></div>
              <Progress value={teamMembers.length > 0 ? (presentCount / teamMembers.length) * 100 : 0} className="h-1.5" />
              <div className="flex justify-between"><span className="text-muted-foreground">Task Completion</span><span className="text-cyan-400">{productivity}%</span></div>
              <Progress value={productivity} className="h-1.5" />
              <div className="flex justify-between"><span className="text-muted-foreground">Satisfaction</span><span className="text-amber-400">{openComplaints === 0 ? 100 : Math.max(30, 100 - openComplaints * 15)}%</span></div>
              <Progress value={openComplaints === 0 ? 100 : Math.max(30, 100 - openComplaints * 15)} className="h-1.5" />
            </div>
          </div>
        </GlassCard>

        {/* Quick Actions */}
        <GlassCard className="p-5" glow="cyan">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-cyan-400" /> Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map(a => (
              <Button key={a.label} variant="ghost" size="sm" onClick={a.action}
                className={cn('h-auto py-2 px-2 justify-start gap-2 text-xs hover:bg-black/[0.03] dark:hover:bg-white/[0.05]',
                  a.color === 'emerald' && 'hover:bg-emerald-500/10 hover:text-emerald-400',
                  a.color === 'cyan' && 'hover:bg-cyan-500/10 hover:text-cyan-400',
                  a.color === 'amber' && 'hover:bg-amber-500/10 hover:text-amber-400',
                  a.color === 'rose' && 'hover:bg-rose-500/10 hover:text-rose-400',
                )}>
                <a.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{a.label}</span>
                {a.count > 0 && <Badge className="ml-auto text-[9px] h-4 px-1 bg-rose-500/20 text-rose-400 border-rose-500/30">{a.count}</Badge>}
              </Button>
            ))}
          </div>
        </GlassCard>

        {/* Team Activity Feed */}
        <GlassCard className="p-5" glow="amber">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-amber-400" /> Activity Feed
            <Badge variant="outline" className="text-[9px] border-black/[0.1] dark:border-white/[0.1] ml-auto">{activityFeed.length}</Badge>
          </h3>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {activityFeed.map(item => (
                <div key={item.id} className="flex items-start gap-2 text-xs py-1.5 border-b border-black/[0.06] dark:border-white/[0.05] last:border-0">
                  <div className={cn('h-1.5 w-1.5 rounded-full mt-1.5 shrink-0',
                    item.color === 'emerald' && 'bg-emerald-400',
                    item.color === 'amber' && 'bg-amber-400',
                    item.color === 'cyan' && 'bg-cyan-400',
                    item.color === 'rose' && 'bg-rose-400',
                  )} />
                  <span className="text-muted-foreground leading-relaxed">{item.text}</span>
                </div>
              ))}
              {activityFeed.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No recent activity</p>}
            </div>
          </ScrollArea>
        </GlassCard>
      </div>

      {/* AI Insights */}
      <GlassCard className="p-5" glow="emerald">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-400" /> AI Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((insight, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
              className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
              <span className="text-xs text-muted-foreground leading-relaxed">{insight}</span>
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 2 — TEAM MEMBERS
// ═══════════════════════════════════════════════════════════════════
function MembersTab({ teamMembers, teamTasks, todayAttendance, teamLeaves, attendance, dept, user, today }: any) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [positionFilter, setPositionFilter] = useState('all');
  const [sortField, setSortField] = useState<'name' | 'status' | 'tasks' | 'completion' | 'attendance'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  const positions = useMemo(() => [...new Set(teamMembers.map((m: any) => m.position).filter(Boolean))], [teamMembers]);

  const memberMetrics = useMemo(() => {
    return teamMembers.map((m: any) => {
      const memberTasks = teamTasks.filter((t: any) => t.assigneeId === m.id);
      const done = memberTasks.filter((t: any) => t.status === 'done').length;
      const total = memberTasks.length;
      const todayAtt = todayAttendance.find((a: any) => a.userId === m.id);
      const memberAtt = attendance.filter((a: any) => a.userId === m.id);
      const presentDays = memberAtt.filter((a: any) => a.status === 'present' || a.status === 'late').length;
      const attRate = memberAtt.length > 0 ? Math.round((presentDays / memberAtt.length) * 100) : 0;
      const mLeaves = teamLeaves.filter((l: any) => l.userId === m.id && l.status === 'approved');
      return { ...m, activeTaskCount: total - done, completionPct: total > 0 ? Math.round((done / total) * 100) : 0, attendanceRate: attRate, status: todayAtt?.status || 'absent', lastActive: todayAtt?.firstIn || 'Not today', leaveCount: mLeaves.length };
    });
  }, [teamMembers, teamTasks, todayAttendance, attendance, teamLeaves]);

  const filtered = useMemo(() => {
    let result = [...memberMetrics];
    if (search) { const q = search.toLowerCase(); result = result.filter((m: any) => m.name?.toLowerCase().includes(q) || m.position?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q)); }
    if (statusFilter !== 'all') result = result.filter((m: any) => m.status === statusFilter);
    if (positionFilter !== 'all') result = result.filter((m: any) => m.position === positionFilter);
    result.sort((a: any, b: any) => {
      let av: any, bv: any;
      switch (sortField) {
        case 'name': av = (a.name || '').toLowerCase(); bv = (b.name || '').toLowerCase(); break;
        case 'status': av = a.status; bv = b.status; break;
        case 'tasks': av = a.activeTaskCount; bv = b.activeTaskCount; break;
        case 'completion': av = a.completionPct; bv = b.completionPct; break;
        case 'attendance': av = a.attendanceRate; bv = b.attendanceRate; break;
        default: return 0;
      }
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [memberMetrics, search, statusFilter, positionFilter, sortField, sortDir]);

  const selectedMember = useMemo(() => memberMetrics.find((m: any) => m.id === selectedMemberId) || null, [memberMetrics, selectedMemberId]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const renderSortIcon = (field: typeof sortField) => {
    if (sortField === field) return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 text-emerald-400" /> : <ChevronDown className="h-3 w-3 text-emerald-400" />;
    return <ArrowUpDown className="h-3 w-3 opacity-30" />;
  };

  const toggleSelect = (id: string) => {
    setSelectedMembers(prev => { const n = new Set(prev); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });
  };

  return (
    <div className="space-y-4">
      {/* Filters & Bulk Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)}
            className="h-9 pl-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[130px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="present">Present</SelectItem><SelectItem value="late">Late</SelectItem><SelectItem value="absent">Absent</SelectItem></SelectContent>
        </Select>
        <Select value={positionFilter} onValueChange={setPositionFilter}>
          <SelectTrigger className="h-9 w-[150px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs"><SelectValue placeholder="Position" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Positions</SelectItem>{positions.map((p: string) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" onClick={() => setAddMemberOpen(true)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-500">
          <UserPlus className="h-3.5 w-3.5" /> Add Member
        </Button>
      </div>

      {/* Bulk Actions Bar */}
      {selectedMembers.size > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
          <span className="text-xs text-cyan-400 font-medium">{selectedMembers.size} selected</span>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 hover:bg-cyan-500/10" onClick={() => toast.success('Notification sent')}><Send className="h-3 w-3" /> Notify</Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 hover:bg-emerald-500/10" onClick={() => toast.info('Task assignment')}><Target className="h-3 w-3" /> Assign Task</Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 hover:bg-amber-500/10" onClick={() => toast.info('Exporting...')}><Download className="h-3 w-3" /> Export</Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs ml-auto" onClick={() => setSelectedMembers(new Set())}><X className="h-3 w-3" /></Button>
        </motion.div>
      )}

      {/* Members Table */}
      <GlassCard className="p-0 overflow-hidden">
        <ScrollArea className="max-h-[500px]">
          <Table>
            <TableHeader>
              <TableRow className="border-black/[0.1] dark:border-white/[0.1] hover:bg-transparent">
                <TableHead className="w-10"><Checkbox checked={selectedMembers.size === filtered.length && filtered.length > 0} onCheckedChange={(v) => { if (v) setSelectedMembers(new Set(filtered.map((m: any) => m.id))); else setSelectedMembers(new Set()); }} /></TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('name')}><div className="flex items-center gap-1">Member {renderSortIcon('name')}</div></TableHead>
                <TableHead>Position</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('status')}><div className="flex items-center gap-1">Status {renderSortIcon('status')}</div></TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('tasks')}><div className="flex items-center gap-1">Tasks {renderSortIcon('tasks')}</div></TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('completion')}><div className="flex items-center gap-1">Done % {renderSortIcon('completion')}</div></TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('attendance')}><div className="flex items-center gap-1">Att. Rate {renderSortIcon('attendance')}</div></TableHead>
                <TableHead>Last Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m: any) => (
                <TableRow key={m.id} className="border-black/[0.06] dark:border-white/[0.05] cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.05]" onClick={() => setSelectedMemberId(m.id)}>
                  <TableCell onClick={e => e.stopPropagation()}><Checkbox checked={selectedMembers.has(m.id)} onCheckedChange={() => toggleSelect(m.id)} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8 ring-1 ring-white/10"><AvatarFallback className={cn('bg-gradient-to-br text-white text-xs', getAvatarColor(m.name || ''))}>{getInitials(m.name)}</AvatarFallback></Avatar>
                      <div><p className="text-sm font-medium">{m.name}</p><p className="text-[10px] text-muted-foreground">{m.email}</p></div>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-xs">{m.position || '—'}</span></TableCell>
                  <TableCell><StatusBadge status={m.status} /></TableCell>
                  <TableCell><span className="text-xs font-medium">{m.activeTaskCount}</span></TableCell>
                  <TableCell><div className="flex items-center gap-1.5"><Progress value={m.completionPct} className="h-1.5 w-16" /><span className="text-xs text-muted-foreground">{m.completionPct}%</span></div></TableCell>
                  <TableCell><span className={cn('text-xs font-medium', m.attendanceRate >= 90 ? 'text-emerald-400' : m.attendanceRate >= 75 ? 'text-amber-400' : 'text-rose-400')}>{m.attendanceRate}%</span></TableCell>
                  <TableCell><span className="text-xs text-muted-foreground">{m.lastActive}</span></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">No members found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </ScrollArea>
      </GlassCard>

      {/* Member Detail Sheet */}
      <Sheet open={!!selectedMemberId} onOpenChange={(v) => { if (!v) setSelectedMemberId(null); }}>
        <SheetContent className="w-[450px] sm:max-w-[500px] bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1] overflow-y-auto">
          {selectedMember && (
            <div className="space-y-6 pt-6">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 ring-2 ring-emerald-500/30"><AvatarFallback className={cn('bg-gradient-to-br text-white', getAvatarColor(selectedMember.name || ''))}>{getInitials(selectedMember.name)}</AvatarFallback></Avatar>
                  <div><p className="text-lg">{selectedMember.name}</p><p className="text-xs text-muted-foreground">{selectedMember.position || selectedMember.role}</p></div>
                  <StatusBadge status={selectedMember.status} className="ml-auto" />
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-4">
                {/* Contact */}
                <GlassCard className="p-4">
                  <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Contact Info</h4>
                  <div className="space-y-2 text-xs">
                    {selectedMember.email && <div className="flex items-center gap-2"><Mail className="h-3 w-3 text-muted-foreground" />{selectedMember.email}</div>}
                    {selectedMember.phone && <div className="flex items-center gap-2"><MessageSquare className="h-3 w-3 text-muted-foreground" />{selectedMember.phone}</div>}
                    {selectedMember.workMode && <div className="flex items-center gap-2">{selectedMember.workMode === 'remote' ? <Home className="h-3 w-3 text-cyan-400" /> : selectedMember.workMode === 'hybrid' ? <Laptop className="h-3 w-3 text-amber-400" /> : <MonitorSmartphone className="h-3 w-3 text-emerald-400" />}{selectedMember.workMode}</div>}
                  </div>
                </GlassCard>

                {/* Current Tasks */}
                <GlassCard className="p-4">
                  <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Current Tasks</h4>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {teamTasks.filter((t: any) => t.assigneeId === selectedMember.id && t.status !== 'done').slice(0, 5).map((t: any) => (
                      <div key={t.id} className="flex items-center gap-2 text-xs"><CircleDot className="h-3 w-3 text-cyan-400" /><span className="truncate">{t.title}</span><StatusBadge status={t.status} className="ml-auto" /></div>
                    ))}
                    {teamTasks.filter((t: any) => t.assigneeId === selectedMember.id && t.status !== 'done').length === 0 && <p className="text-xs text-muted-foreground">No active tasks</p>}
                  </div>
                </GlassCard>

                {/* Metrics */}
                <GlassCard className="p-4">
                  <h4 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Performance Metrics</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.05]">
                      <p className="text-[10px] text-muted-foreground">Task Completion</p>
                      <p className="text-lg font-bold text-emerald-400">{selectedMember.completionPct}%</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.05]">
                      <p className="text-[10px] text-muted-foreground">Attendance Rate</p>
                      <p className="text-lg font-bold text-cyan-400">{selectedMember.attendanceRate}%</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.05]">
                      <p className="text-[10px] text-muted-foreground">Active Tasks</p>
                      <p className="text-lg font-bold text-amber-400">{selectedMember.activeTaskCount}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.05]">
                      <p className="text-[10px] text-muted-foreground">Leaves Taken</p>
                      <p className="text-lg font-bold text-rose-400">{selectedMember.leaveCount}</p>
                    </div>
                  </div>
                </GlassCard>

                {/* Manager Actions */}
                <GlassCard className="p-4">
                  <h4 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Actions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-emerald-500/10" onClick={() => toast.info('Edit role')}><Edit3 className="h-3 w-3" /> Edit Role</Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-cyan-500/10" onClick={() => toast.info('Send message')}><Send className="h-3 w-3" /> Message</Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-amber-500/10" onClick={() => toast.info('Assign task')}><Target className="h-3 w-3" /> Assign Task</Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-rose-500/10" onClick={() => toast.info('Full history')}><Eye className="h-3 w-3" /> Full History</Button>
                  </div>
                </GlassCard>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Member Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="bg-background/95 border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader><DialogTitle>Add Team Member</DialogTitle><DialogDescription>Create a new member in your department</DialogDescription></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label className="text-xs">Full Name</Label><Input placeholder="Enter name" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input placeholder="email@company.com" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Position</Label><Input placeholder="e.g. Developer" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Work Mode</Label>
              <Select defaultValue="office"><SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="office">Office</SelectItem><SelectItem value="remote">Remote</SelectItem><SelectItem value="hybrid">Hybrid</SelectItem></SelectContent></Select>
            </div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setAddMemberOpen(false)}>Cancel</Button><Button className="bg-emerald-600 hover:bg-emerald-500" onClick={() => { toast.success('Member creation requested'); setAddMemberOpen(false); }}>Create Member</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 3 — ORG STRUCTURE
// ═══════════════════════════════════════════════════════════════════
function OrgStructureTab({ teamMembers, user, dept }: any) {
  const [dragMode, setDragMode] = useState(false);

  const positionGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    teamMembers.forEach((m: any) => {
      const pos = m.position || 'Unassigned';
      if (!groups[pos]) groups[pos] = [];
      groups[pos].push(m);
    });
    return groups;
  }, [teamMembers]);

  const positionCounts = useMemo(() => Object.entries(positionGroups).map(([pos, members]) => ({ position: pos, count: members.length })), [positionGroups]);

  const pieData = useMemo(() => positionCounts.map((p, i) => ({ name: p.position, value: p.count, color: CHART_COLORS[i % CHART_COLORS.length] })), [positionCounts]);

  return (
    <div className="space-y-6">
      {/* Visual Org Chart */}
      <GlassCard glow="cyan" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Network className="h-4 w-4 text-cyan-400" /> Org Chart</h3>
          <Button size="sm" variant="outline" className={cn('gap-1.5 border-black/[0.1] dark:border-white/[0.1] text-xs', dragMode && 'bg-amber-500/10 border-amber-500/30 text-amber-400')}
            onClick={() => setDragMode(!dragMode)}>
            <GripVertical className="h-3.5 w-3.5" /> {dragMode ? 'Drag Mode On' : 'Restructure'}
          </Button>
        </div>

        {/* Manager Node */}
        <div className="flex flex-col items-center mb-6">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="relative p-4 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/5 border-2 border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 ring-2 ring-amber-400/50"><AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-500 text-white font-bold">{getInitials(user?.name)}</AvatarFallback></Avatar>
              <div>
                <p className="font-semibold text-sm">{user?.name || 'Manager'}</p>
                <Badge className="text-[9px] bg-amber-500/20 text-amber-400 border-amber-500/30 gap-0.5"><Crown className="h-2.5 w-2.5" /> Manager</Badge>
              </div>
            </div>
            {dragMode && <div className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center"><GripVertical className="h-3 w-3 text-white" /></div>}
          </motion.div>

          {/* Connector line */}
          <div className="w-0.5 h-8 bg-gradient-to-b from-amber-500/40 to-cyan-500/40" />
        </div>

        {/* Team Members by Position */}
        <div className="flex flex-wrap justify-center gap-6">
          {Object.entries(positionGroups).map(([pos, members], gi) => (
            <div key={pos} className="flex flex-col items-center">
              <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><Briefcase className="h-3 w-3" />{pos} <Badge variant="outline" className="text-[9px] border-black/[0.1] dark:border-white/[0.1]">{members.length}</Badge></div>
              <div className="space-y-2">
                {members.map((m: any) => (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className={cn('flex items-center gap-2 p-2 rounded-lg border transition-all',
                      dragMode ? 'cursor-grab border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40' : 'border-black/[0.1] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
                    )}>
                    <Avatar className="h-8 w-8 ring-1 ring-white/10"><AvatarFallback className={cn('bg-gradient-to-br text-white text-xs', getAvatarColor(m.name || ''))}>{getInitials(m.name)}</AvatarFallback></Avatar>
                    <div className="min-w-0"><p className="text-xs font-medium truncate">{m.name}</p><p className="text-[10px] text-muted-foreground truncate">{m.email}</p></div>
                    {dragMode && <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {dragMode && <p className="text-[10px] text-amber-400/80 text-center mt-4">Drag-and-drop restructuring is a preview feature. Changes are not saved.</p>}
      </GlassCard>

      {/* Distribution Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-emerald-400" /> Members by Position</h3>
          {positionCounts.length > 0 ? (
            <div className="space-y-3">
              {positionCounts.map((p, i) => (
                <div key={p.position} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs"><span className="font-medium">{p.position}</span><span className="text-muted-foreground">{p.count}</span></div>
                  <div className="h-2 rounded-full bg-black/[0.03] dark:bg-white/[0.05] overflow-hidden">
                    <motion.div className="h-full rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      initial={{ width: 0 }} animate={{ width: `${Math.max((p.count / teamMembers.length) * 100, 6)}%` }} transition={{ duration: 0.6 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-muted-foreground text-center py-4">No data</p>}
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><PieIcon className="h-4 w-4 text-cyan-400" /> Position Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
              </Pie><Tooltip contentStyle={{ backgroundColor: 'rgba(15,15,15,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} /></PieChart>
            </ResponsiveContainer>
          ) : <p className="text-xs text-muted-foreground text-center py-4">No data</p>}
          <div className="flex flex-wrap gap-2 mt-2">
            {pieData.map((d, i) => <Badge key={i} variant="outline" className="text-[10px] border-black/[0.1] dark:border-white/[0.1]" style={{ borderColor: d.color + '40', color: d.color }}>{d.name}: {d.value}</Badge>)}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 4 — PERFORMANCE
// ═══════════════════════════════════════════════════════════════════
function PerformanceTab({ teamMembers, teamTasks, todayAttendance, attendance, teamLeaves, teamComplaints, today }: any) {
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const memberPerformance = useMemo(() => {
    return teamMembers.map((m: any) => {
      const mTasks = teamTasks.filter((t: any) => t.assigneeId === m.id);
      const done = mTasks.filter((t: any) => t.status === 'done').length;
      const total = mTasks.length;
      const mAtt = attendance.filter((a: any) => a.userId === m.id);
      const presentDays = mAtt.filter((a: any) => a.status === 'present' || a.status === 'late').length;
      const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
      const attendanceRate = mAtt.length > 0 ? Math.round((presentDays / mAtt.length) * 100) : 0;
      const complaintsHandled = teamComplaints.filter((c: any) => c.assignedToId === m.id && c.status === 'resolved').length;
      const score = Math.round(completionRate * 0.5 + attendanceRate * 0.3 + (complaintsHandled > 0 ? 20 : 0));
      return { ...m, completionRate, attendanceRate, done, total, complaintsHandled, score };
    }).sort((a: any, b: any) => b.score - a.score);
  }, [teamMembers, teamTasks, attendance, teamComplaints]);

  const topPerformers = memberPerformance.slice(0, 3);
  const underPerformers = memberPerformance.filter((m: any) => m.score < 50);
  const leaderboard = memberPerformance.slice(0, 8);

  // Performance trend (simulated 6-month)
  const trendData = useMemo(() => {
    const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    return months.map(m => ({ month: m, score: 55 + Math.floor(Math.random() * 30) }));
  }, []);

  // Bar chart data for task completion per member
  const taskCompletionData = useMemo(() =>
    memberPerformance.slice(0, 8).map((m: any) => ({ name: (m.name || '').split(' ')[0], completion: m.completionRate, attendance: m.attendanceRate })),
    [memberPerformance]
  );

  // Comparison data
  const compareData = useMemo(() =>
    compareIds.map(id => memberPerformance.find((m: any) => m.id === id)).filter(Boolean).map((m: any) => ({
      name: m.name, completion: m.completionRate, attendance: m.attendanceRate, score: m.score, tasks: m.total, done: m.done,
    })),
    [compareIds, memberPerformance]
  );

  // Upcoming reviews (simulated)
  const upcomingReviews = useMemo(() =>
    memberPerformance.slice(0, 4).map((m: any, i: any) => ({ ...m, reviewDate: format(addDays(new Date(), 7 + i * 5), 'MMM d'), reviewType: i === 0 ? 'Annual' : i === 1 ? 'Quarterly' : 'Monthly' })),
    [memberPerformance]
  );

  const toggleCompare = (id: string) => {
    setCompareIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev);
  };

  return (
    <div className="space-y-6">
      {/* Performance Score */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Team Score"
          value={memberPerformance.length > 0 ? Math.round(memberPerformance.reduce((s: number, m: any) => s + m.score, 0) / memberPerformance.length) : 0}
          icon={Gauge}
          color="emerald"
          subtitle="Department performance index"
          progressRing={{ value: memberPerformance.length > 0 ? Math.round(memberPerformance.reduce((s: number, m: any) => s + m.score, 0) / memberPerformance.length) : 0, max: 100 }}
          hero
        />
        <StatCard
          title="Top Performer"
          value={topPerformers[0]?.name?.split(' ')[0] || '—'}
          icon={Award}
          color="cyan"
          subtitle={topPerformers[0]?.name ? `${topPerformers[0].name} (${topPerformers[0].score} pts)` : 'Leading team member'}
          hero
        />
        <StatCard
          title="Avg Completion"
          value={`${memberPerformance.length > 0 ? Math.round(memberPerformance.reduce((s: number, m: any) => s + m.completionRate, 0) / memberPerformance.length) : 0}%`}
          icon={Target}
          color="amber"
          subtitle="Task milestone velocity"
          trend={{ value: 6, label: 'vs last cycle' }}
          hero
        />
        <StatCard
          title="Underperformers"
          value={underPerformers.length}
          icon={ThumbsDown}
          color="rose"
          subtitle={underPerformers.length > 0 ? 'Requires guidance / 1-on-1' : 'All meeting standards'}
          pulse={underPerformers.length > 0}
          hero
        />
      </div>

      {/* Performance Trend */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-400" /> 6-Month Performance Trend</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trendData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={10} />
            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} domain={[0, 100]} />
            <Tooltip contentStyle={{ backgroundColor: 'rgba(15,15,15,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
            <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} /></LineChart>
        </ResponsiveContainer>
      </GlassCard>

      {/* Leaderboard + Bar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-5" glow="emerald">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Crown className="h-4 w-4 text-amber-400" /> Leaderboard</h3>
          <div className="space-y-2">
            {leaderboard.map((m: any, i: number) => (
              <motion.div key={m.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.05] cursor-pointer" onClick={() => toggleCompare(m.id)}>
                <span className={cn('text-xs font-bold w-5 text-center', i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-orange-400' : 'text-muted-foreground')}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </span>
                <Avatar className="h-7 w-7"><AvatarFallback className={cn('bg-gradient-to-br text-white text-[9px]', getAvatarColor(m.name || ''))}>{getInitials(m.name)}</AvatarFallback></Avatar>
                <span className="text-xs font-medium flex-1 truncate">{m.name}</span>
                <span className="text-xs font-bold text-emerald-400">{m.score}</span>
                {compareIds.includes(m.id) && <Badge className="text-[9px] bg-cyan-500/20 text-cyan-400 border-cyan-500/30">Comparing</Badge>}
              </motion.div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Click members to compare (max 4)</p>
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-cyan-400" /> Task Completion & Attendance</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={taskCompletionData} barGap={2} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(15,15,15,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="completion" fill="#10b981" radius={[4, 4, 0, 0]} name="Completion %" />
              <Bar dataKey="attendance" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Attendance %" />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Top & Under Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-5" glow="emerald">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Star className="h-4 w-4 text-amber-400" /> Top Performers</h3>
          <div className="space-y-2">
            {topPerformers.map((m: any, i: number) => (
              <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <div className="text-2xl">{i === 0 ? '🏆' : i === 1 ? '🥇' : '🥈'}</div>
                <Avatar className="h-9 w-9"><AvatarFallback className={cn('bg-gradient-to-br text-white text-xs', getAvatarColor(m.name || ''))}>{getInitials(m.name)}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{m.name}</p><p className="text-[10px] text-muted-foreground">{m.completionRate}% completion • {m.attendanceRate}% attendance</p></div>
                <Badge className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/25">{m.score} pts</Badge>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-5" glow={underPerformers.length > 0 ? 'rose' : 'none'}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><ThumbsDown className="h-4 w-4 text-rose-400" /> Needs Attention</h3>
          {underPerformers.length > 0 ? (
            <div className="space-y-2">
              {underPerformers.slice(0, 4).map((m: any) => (
                <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/10">
                  <Avatar className="h-9 w-9"><AvatarFallback className={cn('bg-gradient-to-br text-white text-xs', getAvatarColor(m.name || ''))}>{getInitials(m.name)}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{m.name}</p><p className="text-[10px] text-muted-foreground">Score: {m.score} • {m.completionRate}% completion</p></div>
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 hover:bg-amber-500/10 text-amber-400" onClick={() => toast.info('Review scheduled for ' + m.name)}><CalendarDays className="h-3 w-3" /> Review</Button>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-muted-foreground text-center py-4">All members performing well! 🎉</p>}
        </GlassCard>
      </div>

      {/* Comparison */}
      {compareIds.length >= 2 && (
        <GlassCard className="p-5" glow="cyan">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-cyan-400" /> Performance Comparison</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={compareData} barGap={4} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(15,15,15,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="completion" fill="#10b981" radius={[4, 4, 0, 0]} name="Completion" />
              <Bar dataKey="attendance" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Attendance" />
              <Bar dataKey="score" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Score" />
            </BarChart>
          </ResponsiveContainer>
          <Button size="sm" variant="ghost" className="mt-2 text-xs" onClick={() => setCompareIds([])}>Clear Comparison</Button>
        </GlassCard>
      )}

      {/* Review Schedule */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Calendar className="h-4 w-4 text-amber-400" /> Upcoming Reviews</h3>
        <div className="space-y-2">
          {upcomingReviews.map((r: any) => (
            <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.05]">
              <Avatar className="h-7 w-7"><AvatarFallback className={cn('bg-gradient-to-br text-white text-[9px]', getAvatarColor(r.name || ''))}>{getInitials(r.name)}</AvatarFallback></Avatar>
              <span className="text-xs font-medium flex-1">{r.name}</span>
              <Badge variant="outline" className="text-[10px] border-amber-500/20 text-amber-400">{r.reviewType}</Badge>
              <span className="text-xs text-muted-foreground">{r.reviewDate}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 5 — SCHEDULE & AVAILABILITY
// ═══════════════════════════════════════════════════════════════════
function ScheduleTab({ teamMembers, todayAttendance, teamLeaves, attendance, shifts, today }: any) {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 1 });

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const memberAvailability = useMemo(() => {
    return teamMembers.map((m: any) => {
      const dayStatus: Record<string, { status: string; detail?: string }> = {};
      weekDays.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const att = attendance.find((a: any) => a.userId === m.id && a.date === dateStr);
        const leave = teamLeaves.find((l: any) => l.userId === m.id && l.status === 'approved' && l.startDate <= dateStr && l.endDate >= dateStr);
        if (leave) dayStatus[dateStr] = { status: 'leave', detail: leave.type };
        else if (isWeekend(day)) dayStatus[dateStr] = { status: 'weekend' };
        else if (att) dayStatus[dateStr] = { status: att.status, detail: att.firstIn };
        else if (dateStr > today) dayStatus[dateStr] = { status: 'future' };
        else dayStatus[dateStr] = { status: 'absent' };
      });
      return { ...m, dayStatus, workMode: m.workMode || 'office' };
    });
  }, [teamMembers, weekDays, attendance, teamLeaves, today]);

  const upcomingLeaves = useMemo(() =>
    teamLeaves.filter((l: any) => l.status === 'approved' && l.startDate >= today).sort((a: any, b: any) => a.startDate.localeCompare(b.startDate)).slice(0, 8),
    [teamLeaves, today]
  );

  // Capacity forecast (next 2 weeks)
  const capacityForecast = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const date = format(addDays(new Date(), i), 'yyyy-MM-dd');
      const onLeave = teamLeaves.filter((l: any) => l.status === 'approved' && l.startDate <= date && l.endDate >= date).length;
      const available = Math.max(0, teamMembers.length - onLeave);
      return { date: format(addDays(new Date(), i), 'MMM d'), available, onLeave, total: teamMembers.length };
    });
  }, [teamLeaves, teamMembers.length]);

  const statusColorMap: Record<string, string> = {
    present: 'bg-emerald-500', late: 'bg-amber-500', absent: 'bg-rose-500', leave: 'bg-amber-400',
    weekend: 'bg-slate-500/30', future: 'bg-black/[0.06] dark:bg-white/[0.1]', holiday: 'bg-purple-500',
  };

  const workModeIcon: Record<string, any> = {
    office: MonitorSmartphone, remote: Home, hybrid: Laptop,
  };

  return (
    <div className="space-y-6">
      {/* Weekly Availability Grid */}
      <GlassCard glow="cyan" className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-cyan-400" /> Weekly Availability</h3>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setWeekOffset(o => o - 1)}>←</Button>
            <span className="text-xs text-muted-foreground min-w-[120px] text-center">
              {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d')}
            </span>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setWeekOffset(o => o + 1)}>→</Button>
            <Button size="sm" variant="ghost" className="h-7 text-[10px] hover:bg-cyan-500/10" onClick={() => setWeekOffset(0)}>Today</Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left p-2 text-muted-foreground font-medium min-w-[140px]">Member</th>
                {weekDays.map(day => (
                  <th key={day.toISOString()} className={cn('p-2 text-center font-medium', isToday(day) && 'text-emerald-400')}>
                    <div>{format(day, 'EEE')}</div><div className="text-[10px] text-muted-foreground">{format(day, 'd')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {memberAvailability.map((m: any) => {
                const WmIcon = workModeIcon[m.workMode] || MonitorSmartphone;
                return (
                  <tr key={m.id} className="border-t border-black/[0.06] dark:border-white/[0.05]">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6"><AvatarFallback className={cn('bg-gradient-to-br text-white text-[8px]', getAvatarColor(m.name || ''))}>{getInitials(m.name)}</AvatarFallback></Avatar>
                        <span className="truncate">{m.name}</span>
                        <WmIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                      </div>
                    </td>
                    {weekDays.map(day => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const ds = m.dayStatus[dateStr] || { status: 'future' };
                      return (
                        <td key={dateStr} className="p-2 text-center">
                          <div className={cn('h-7 w-7 rounded-md mx-auto flex items-center justify-center text-[9px] font-medium',
                            statusColorMap[ds.status] || 'bg-black/[0.06] dark:bg-white/[0.1]',
                            ds.status === 'leave' && 'text-black',
                            isToday(day) && 'ring-1 ring-emerald-500/50',
                          )} title={ds.detail || ds.status}>
                            {ds.status === 'leave' ? 'L' : ds.status === 'weekend' ? '' : ds.status === 'present' ? '✓' : ds.status === 'late' ? '!' : ds.status === 'absent' ? '✗' : ''}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.05]">
          {[
            { status: 'present', label: 'Present', color: 'bg-emerald-500' },
            { status: 'late', label: 'Late', color: 'bg-amber-500' },
            { status: 'absent', label: 'Absent', color: 'bg-rose-500' },
            { status: 'leave', label: 'On Leave', color: 'bg-amber-400' },
            { status: 'weekend', label: 'Weekend', color: 'bg-slate-500/30' },
          ].map(l => (
            <div key={l.status} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <div className={cn('h-2.5 w-2.5 rounded-sm', l.color)} />{l.label}
            </div>
          ))}
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Leaves */}
        <GlassCard className="p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Coffee className="h-4 w-4 text-amber-400" /> Upcoming Leaves</h3>
          <ScrollArea className="max-h-64">
            <div className="space-y-2">
              {upcomingLeaves.map((l: any) => (
                <div key={l.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.05]">
                  <Avatar className="h-7 w-7"><AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-500 text-white text-[9px]">{getInitials(l.userName)}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{l.userName}</p><p className="text-[10px] text-muted-foreground">{l.type} • {l.startDate} → {l.endDate}</p></div>
                  <Badge variant="outline" className="text-[9px] border-amber-500/20 text-amber-400">{l.status}</Badge>
                </div>
              ))}
              {upcomingLeaves.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No upcoming leaves</p>}
            </div>
          </ScrollArea>
        </GlassCard>

        {/* Work Mode Tracker */}
        <GlassCard className="p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Laptop className="h-4 w-4 text-cyan-400" /> Work Mode Distribution</h3>
          {(() => {
            const modes: Record<string, number> = {};
            teamMembers.forEach((m: any) => { const mode = m.workMode || 'office'; modes[mode] = (modes[mode] || 0) + 1; });
            const modeData = Object.entries(modes).map(([mode, count]) => ({ mode, count }));
            const modeIcons: Record<string, any> = { office: MonitorSmartphone, remote: Home, hybrid: Laptop };
            const modeColors: Record<string, string> = { office: 'emerald', remote: 'cyan', hybrid: 'amber' };
            return (
              <div className="space-y-3">
                {modeData.map(md => {
                  const Icon = modeIcons[md.mode] || MonitorSmartphone;
                  const color = modeColors[md.mode] || 'slate';
                  return (
                    <div key={md.mode} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-medium capitalize"><Icon className={cn('h-3.5 w-3.5', color === 'emerald' && 'text-emerald-400', color === 'cyan' && 'text-cyan-400', color === 'amber' && 'text-amber-400')} />{md.mode}</span>
                        <span className="text-muted-foreground">{md.count} members</span>
                      </div>
                      <div className="h-2 rounded-full bg-black/[0.03] dark:bg-white/[0.05] overflow-hidden">
                        <motion.div className={cn('h-full rounded-full', color === 'emerald' && 'bg-emerald-500', color === 'cyan' && 'bg-cyan-500', color === 'amber' && 'bg-amber-500')}
                          initial={{ width: 0 }} animate={{ width: `${Math.max((md.count / teamMembers.length) * 100, 6)}%` }} transition={{ duration: 0.6 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </GlassCard>
      </div>

      {/* Capacity Forecast */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-400" /> 2-Week Capacity Forecast</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={capacityForecast} barSize={14}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={9} />
            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={9} />
            <Tooltip contentStyle={{ backgroundColor: 'rgba(15,15,15,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
            <Bar dataKey="available" fill="#10b981" radius={[4, 4, 0, 0]} name="Available" stackId="a" />
            <Bar dataKey="onLeave" fill="#f59e0b" radius={[4, 4, 0, 0]} name="On Leave" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>

      {/* Shift Schedule & Meeting Scheduler placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Clock4 className="h-4 w-4 text-amber-400" /> Shift Schedule</h3>
          {shifts.length > 0 ? (
            <div className="space-y-2">
              {shifts.slice(0, 4).map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.05]">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center"><Clock4 className="h-4 w-4 text-amber-400" /></div>
                  <div className="flex-1"><p className="text-xs font-medium">{s.name}</p><p className="text-[10px] text-muted-foreground">{s.startTime} – {s.endTime}</p></div>
                  <Badge variant="outline" className="text-[10px] border-black/[0.1] dark:border-white/[0.1]">{s.employeeCount || 0} staff</Badge>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-muted-foreground text-center py-4">No shifts configured</p>}
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-cyan-400" /> Meeting / Event Scheduler</h3>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="h-16 w-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center"><CalendarDays className="h-8 w-8 text-cyan-400/50" /></div>
            <p className="text-xs text-muted-foreground">Schedule team meetings and events</p>
            <Button size="sm" variant="outline" className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-cyan-500/10 text-cyan-400" onClick={() => toast.info('Meeting scheduler coming soon')}>
              <Plus className="h-3.5 w-3.5" /> Schedule Meeting
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 6 — TEAM SETTINGS
// ═══════════════════════════════════════════════════════════════════
function SettingsTab({ user, dept, teamMembers }: any) {
  const [teamName, setTeamName] = useState(dept?.name || '');
  const [teamDesc, setTeamDesc] = useState(dept?.description || '');
  const [saved, setSaved] = useState(false);
  const [delegateId, setDelegateId] = useState('');
  const [notifyPrefs, setNotifyPrefs] = useState({ leave: true, task: true, complaint: true, attendance: false });
  const [policyWorkHours, setPolicyWorkHours] = useState('09:00 – 18:00');
  const [policyRemote, setPolicyRemote] = useState('hybrid');
  const [teamTags, setTeamTags] = useState(['engineering', 'product']);
  const [newTag, setNewTag] = useState('');
  const [archivedMembers, setArchivedMembers] = useState<string[]>([]);

  const handleSave = () => { setSaved(true); toast.success('Team settings saved'); setTimeout(() => setSaved(false), 2000); };

  const addTag = () => {
    if (newTag.trim() && !teamTags.includes(newTag.trim().toLowerCase())) {
      setTeamTags([...teamTags, newTag.trim().toLowerCase()]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => setTeamTags(teamTags.filter(t => t !== tag));

  const archiveMember = (id: string) => {
    setArchivedMembers([...archivedMembers, id]);
    toast.success('Member moved to inactive');
  };

  const activeMembers = teamMembers.filter((m: any) => !archivedMembers.includes(m.id));
  const inactiveMembers = teamMembers.filter((m: any) => archivedMembers.includes(m.id));

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Team Info */}
      <GlassCard className="p-5" glow="emerald">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Building2 className="h-4 w-4 text-emerald-400" /> Team Information</h3>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs">Team Name</Label><Input value={teamName} onChange={e => setTeamName(e.target.value)} className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
          <div className="space-y-1.5"><Label className="text-xs">Description</Label><Textarea value={teamDesc} onChange={e => setTeamDesc(e.target.value)} rows={3} className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] resize-none" /></div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> Department: {dept?.name || 'N/A'}</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {activeMembers.length} active members</span>
          </div>
        </div>
      </GlassCard>

      {/* Manage Roles */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Shield className="h-4 w-4 text-amber-400" /> Team Roles</h3>
        <div className="space-y-2">
          {activeMembers.slice(0, 6).map((m: any) => (
            <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.05]">
              <Avatar className="h-7 w-7"><AvatarFallback className={cn('bg-gradient-to-br text-white text-[9px]', getAvatarColor(m.name || ''))}>{getInitials(m.name)}</AvatarFallback></Avatar>
              <span className="text-xs font-medium flex-1">{m.name}</span>
              <Badge variant="outline" className="text-[10px] border-black/[0.1] dark:border-white/[0.1]">{m.position || m.role}</Badge>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Notification Preferences */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Bell className="h-4 w-4 text-cyan-400" /> Notification Preferences</h3>
        <div className="space-y-3">
          {[
            { key: 'leave', label: 'Leave Requests', icon: Coffee, color: 'amber' },
            { key: 'task', label: 'Task Updates', icon: Target, color: 'cyan' },
            { key: 'complaint', label: 'Complaint Alerts', icon: AlertCircle, color: 'rose' },
            { key: 'attendance', label: 'Attendance Anomalies', icon: Clock, color: 'emerald' },
          ].map(pref => (
            <div key={pref.key} className="flex items-center justify-between p-2 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.05]">
              <div className="flex items-center gap-2 text-xs">
                <pref.icon className={cn('h-3.5 w-3.5', pref.color === 'amber' && 'text-amber-400', pref.color === 'cyan' && 'text-cyan-400', pref.color === 'rose' && 'text-rose-400', pref.color === 'emerald' && 'text-emerald-400')} />
                <span>{pref.label}</span>
              </div>
              <button onClick={() => setNotifyPrefs(p => ({ ...p, [pref.key]: !p[pref.key as keyof typeof p] }))}
                className={cn('h-5 w-9 rounded-full transition-colors relative', notifyPrefs[pref.key as keyof typeof notifyPrefs] ? 'bg-emerald-500' : 'bg-black/[0.06] dark:bg-white/[0.1]')}>
                <div className={cn('h-4 w-4 rounded-full bg-white absolute top-0.5 transition-all', notifyPrefs[pref.key as keyof typeof notifyPrefs] ? 'left-[18px]' : 'left-0.5')} />
              </button>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Team Policies */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-amber-400" /> Team Policies</h3>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs">Working Hours</Label><Input value={policyWorkHours} onChange={e => setPolicyWorkHours(e.target.value)} className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-8 text-xs" /></div>
          <div className="space-y-1.5"><Label className="text-xs">Remote Policy</Label>
            <Select value={policyRemote} onValueChange={setPolicyRemote}>
              <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="office">Office Only</SelectItem><SelectItem value="hybrid">Hybrid</SelectItem><SelectItem value="remote">Fully Remote</SelectItem><SelectItem value="flexible">Flexible</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      </GlassCard>

      {/* Delegation Settings */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Crown className="h-4 w-4 text-amber-400" /> Delegation Settings</h3>
        <p className="text-[10px] text-muted-foreground mb-3">Choose who can approve requests when you&apos;re unavailable</p>
        <Select value={delegateId} onValueChange={setDelegateId}>
          <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-8 text-xs"><SelectValue placeholder="Select delegate" /></SelectTrigger>
          <SelectContent>
            {activeMembers.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </GlassCard>

      {/* Team Tags */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Zap className="h-4 w-4 text-cyan-400" /> Team Tags</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {teamTags.map(tag => (
            <Badge key={tag} variant="outline" className="text-[10px] border-cyan-500/20 text-cyan-400 gap-1">
              {tag}<X className="h-2.5 w-2.5 cursor-pointer" onClick={() => removeTag(tag)} />
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Add tag..." value={newTag} onChange={e => setNewTag(e.target.value)} className="h-8 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs" onKeyDown={e => e.key === 'Enter' && addTag()} />
          <Button size="sm" variant="outline" className="h-8 gap-1 border-black/[0.1] dark:border-white/[0.1]" onClick={addTag}><Plus className="h-3 w-3" /> Add</Button>
        </div>
      </GlassCard>

      {/* Archive Members */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><UsersRound className="h-4 w-4 text-rose-400" /> Archive Members</h3>
        <p className="text-[10px] text-muted-foreground mb-3">Move inactive members to archive</p>
        {inactiveMembers.length > 0 && (
          <div className="mb-3 p-2 rounded-lg bg-rose-500/5 border border-rose-500/10">
            <p className="text-[10px] text-rose-400 mb-1">Archived ({inactiveMembers.length})</p>
            {inactiveMembers.map((id: string) => {
              const m = teamMembers.find((mem: any) => mem.id === id);
              return m ? <span key={id} className="text-[10px] text-muted-foreground mr-2">{m.name}</span> : null;
            })}
          </div>
        )}
        <div className="space-y-1.5">
          {activeMembers.slice(0, 5).map((m: any) => (
            <div key={m.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-black/[0.03] dark:hover:bg-white/[0.05]">
              <span className="text-xs flex-1">{m.name}</span>
              <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 hover:bg-rose-500/10 text-rose-400" onClick={() => archiveMember(m.id)}><UserX className="h-3 w-3" /> Archive</Button>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="ghost" className="text-xs">Reset</Button>
        <Button className="bg-emerald-600 hover:bg-emerald-500 gap-1.5 text-xs" onClick={handleSave} disabled={saved}>
          {saved ? <><CheckCircle2 className="h-3.5 w-3.5" /> Saved</> : <><Settings className="h-3.5 w-3.5" /> Save Settings</>}
        </Button>
      </div>
    </div>
  );
}
