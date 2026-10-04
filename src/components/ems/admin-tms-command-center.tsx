'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { StatCard } from './stat-card';
import { StatusBadge } from './status-badge';
import { CreateTaskModal } from './create-task-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format, isPast, parseISO } from 'date-fns';
import type { Task, TaskComment } from '@/lib/types';
import {
  LayoutDashboard, ListTodo, CheckCircle2, Shield, Clock, AlertTriangle,
  Search, RefreshCw, Loader2, Zap, Rocket, FileText, Users,
  ArrowUpDown, Filter, ChevronRight, Plus, BarChart3,
  FolderKanban, Eye, Edit3, Trash2, GripVertical,
  X, Flag, MessageSquare, Activity, Calendar, UserCircle,
  ArrowRight, Save, Send, AlertOctagon, CircleDot,
} from 'lucide-react';
import { ProgressRing } from './shared';

// ─── Mock Activity Timeline ────────────────────────────────────
function getMockActivity(task: Task) {
  const activities: Array<{ icon: React.ReactNode; text: string; time: string; color: string }> = [];
  activities.push({
    icon: <Plus className="h-3 w-3" />,
    text: 'Task created',
    time: task.createdAt,
    color: 'text-cyan-400',
  });
  if (task.assigneeId) {
    activities.push({
      icon: <UserCircle className="h-3 w-3" />,
      text: `Assigned to ${task.assigneeName || 'Unknown'}`,
      time: task.createdAt,
      color: 'text-amber-400',
    });
  }
  if (task.status !== 'todo') {
    activities.push({
      icon: <CircleDot className="h-3 w-3" />,
      text: `Status changed to ${task.status}`,
      time: task.createdAt,
      color: task.status === 'done' ? 'text-emerald-400' : task.status === 'blocked' ? 'text-rose-400' : 'text-amber-400',
    });
  }
  if (task.isBlocked) {
    activities.push({
      icon: <AlertOctagon className="h-3 w-3" />,
      text: 'Task flagged as blocked',
      time: task.createdAt,
      color: 'text-rose-400',
    });
  }
  if (task.status === 'done' && task.completedAt) {
    activities.push({
      icon: <CheckCircle2 className="h-3 w-3" />,
      text: 'Task completed',
      time: task.completedAt,
      color: 'text-emerald-400',
    });
  }
  return activities;
}

export function AdminTMSCommandCenter() {
  const { tasks, users, departments, teams, createTask, updateTask, deleteTask, loadTaskComments, addTaskComment, taskComments, setSelectedTaskId, setActiveView } = useEMSStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDept, setFilterDept] = useState('all');
  const [activeTab, setActiveTab] = useState('tasks');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Computed Metrics ──────────────────────────────────────
  const metrics = useMemo(() => {
    const total = tasks.length;
    const open = tasks.filter(t => t.status === 'todo' || t.status === 'in-progress').length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const blocked = tasks.filter(t => t.status === 'blocked').length;
    const inReview = tasks.filter(t => t.status === 'in-review').length;
    const overdue = tasks.filter(t => t.dueDate && isPast(parseISO(t.dueDate)) && t.status !== 'done').length;
    return { totalTasks: total, openTasks: open, completedTasks: completed, blockedTasks: blocked, inReviewTasks: inReview, overdueTasks: overdue };
  }, [tasks]);

  // ─── Bottleneck Radar ──────────────────────────────────────
  const bottleneckRadar = useMemo(() => {
    return departments.map(dept => {
      const deptTasks = tasks.filter(t => t.departmentId === dept.id);
      const open = deptTasks.filter(t => t.status !== 'done' && t.status !== 'blocked').length;
      const completed = deptTasks.filter(t => t.status === 'done').length;
      const ratio = deptTasks.length > 0 ? Math.round((completed / deptTasks.length) * 100) : 0;
      return { department: dept.name, openTasks: open, completedTasks: completed, ratio };
    });
  }, [tasks, departments]);

  // ─── Filtered Tasks ───────────────────────────────────────
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchSearch = !searchQuery ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.assigneeName || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = filterStatus === 'all' || task.status === filterStatus;
      const matchDept = filterDept === 'all' || task.departmentId === filterDept;
      return matchSearch && matchStatus && matchDept;
    });
  }, [tasks, searchQuery, filterStatus, filterDept]);

  // ─── Handlers ──────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      toast.success('Task data refreshed');
    }, 800);
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const handleApplyTemplate = () => {
    toast.info('Template applied — demo tasks created');
  };

  const handleCreateEpic = () => {
    setCreateModalOpen(true);
  };

  // ─── Task sheet handlers ───────────────────────────────────
  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await updateTask(taskId, { status: newStatus as Task['status'] });
      toast.success(`Status updated to ${newStatus}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handlePriorityChange = async (taskId: string, newPriority: string) => {
    try {
      await updateTask(taskId, { priority: newPriority as Task['priority'] });
      toast.success(`Priority updated to ${newPriority}`);
    } catch {
      toast.error('Failed to update priority');
    }
  };

  const handleAssignReassign = async (taskId: string, userId: string) => {
    const user = users.find(u => u.id === userId);
    try {
      await updateTask(taskId, { assigneeId: userId, assigneeName: user?.name || 'Unknown' });
      toast.success(`Task reassigned to ${user?.name || 'Unknown'}`);
    } catch {
      toast.error('Failed to reassign task');
    }
  };

  const handleFlagBlock = async (taskId: string, isBlocked: boolean) => {
    try {
      await updateTask(taskId, { isBlocked, status: isBlocked ? 'blocked' : 'todo', blockedReason: isBlocked ? 'Flagged by admin' : undefined });
      toast.success(isBlocked ? 'Task flagged as blocked' : 'Task unblocked');
    } catch {
      toast.error('Failed to update task');
    }
  };

  // ─── Department name helper ────────────────────────────────
  const getDeptName = (deptId?: string) => {
    if (!deptId) return '—';
    return departments.find(d => d.id === deptId)?.name || '—';
  };

  const getDeptColor = (deptId?: string) => {
    if (!deptId) return '#64748b';
    return departments.find(d => d.id === deptId)?.color || '#64748b';
  };

  const getTeamName = (teamId?: string) => {
    if (!teamId) return null;
    const team = teams.find(t => t.id === teamId);
    return team?.name || teamId;
  };

  const getReporterName = (reporterId?: string) => {
    if (!reporterId) return null;
    const user = users.find(u => u.id === reporterId);
    return user?.name || null;
  };

  const getParentTask = (parentTaskId?: string) => {
    if (!parentTaskId) return null;
    return tasks.find(t => t.id === parentTaskId) || null;
  };

  // ─── Task row for table ────────────────────────────────────
  const TaskRow = ({ task, index }: { task: Task; index: number }) => (
    <motion.tr
      key={task.id}
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
      className="border-b border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors cursor-pointer group"
      onClick={() => { setSelectedTaskId(task.id); setActiveView('task-detail'); }}
    >
      <TableCell className="text-sm font-medium max-w-[200px] truncate">
        <div className="flex items-center gap-2">
          {task.parentTaskId && <span className="text-xs text-muted-foreground">└</span>}
          <span className="truncate">{task.title}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center text-[10px] font-medium border border-black/[0.1] dark:border-white/[0.1]">
            {task.assigneeName?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <span className="text-sm text-muted-foreground truncate max-w-[100px]">{task.assigneeName || 'Unassigned'}</span>
        </div>
      </TableCell>
      <TableCell><StatusBadge status={task.status} /></TableCell>
      <TableCell><StatusBadge status={task.priority} /></TableCell>
      <TableCell className="text-sm text-muted-foreground">{getDeptName(task.departmentId)}</TableCell>
      <TableCell>
        {task.teamName && (
          <Badge variant="outline" className="text-[10px] border-cyan-500/20 text-cyan-400 bg-cyan-500/5">
            {task.teamName}
          </Badge>
        )}
        {!task.teamName && <span className="text-xs text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground font-mono">
        {task.dueDate || '—'}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-rose-500/10" onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}>
            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
          </Button>
        </div>
      </TableCell>
    </motion.tr>
  );


  return (
    <div className="space-y-6">
      {/* ── Header Bar ────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Task Command Center</h2>
          <p className="text-sm text-muted-foreground mt-1">Enterprise task management &amp; team orchestration</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={handleRefresh} disabled={refreshing}
            className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-emerald-500/10 hover:border-emerald-500/30"
          >
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={handleRefresh} disabled={refreshing}
            className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-cyan-500/10 hover:border-cyan-500/30"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Recalculate
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          TIER 1: METRICS GRID — 6 Cards
      ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <StatCard title="Total Tasks" value={metrics.totalTasks} icon={ListTodo} color="cyan" hero />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <StatCard title="Open Tasks" value={metrics.openTasks} icon={FolderKanban} color="amber" hero />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <StatCard title="Completed" value={metrics.completedTasks} icon={CheckCircle2} color="emerald" hero />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <StatCard title="Blocked" value={metrics.blockedTasks} icon={Shield} color="rose" hero pulse={metrics.blockedTasks > 0} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <StatCard title="In Review" value={metrics.inReviewTasks} icon={Eye} color="cyan" hero />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <StatCard title="Overdue" value={metrics.overdueTasks} icon={AlertTriangle} color="rose" hero pulse={metrics.overdueTasks > 0} subtitle={metrics.overdueTasks > 0 ? 'Needs attention' : 'All on track'} />
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          TIER 2: BOTTLENECK RADAR — Department Progress
      ═══════════════════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <GlassCard className="p-6" glow="amber">
          <div className="flex items-center gap-2 mb-4">
            <div className="rounded-lg p-2 bg-amber-500/10">
              <Zap className="h-4 w-4 text-amber-400" />
            </div>
            <h3 className="font-semibold">Bottleneck Radar</h3>
            <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs">
              {bottleneckRadar.length} departments
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bottleneckRadar.map((dept, i) => (
              <motion.div
                key={dept.department}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.05] hover:border-black/[0.1] dark:hover:border-white/[0.1] transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{dept.department}</span>
                  <span className={cn(
                    "text-xs font-bold",
                    dept.ratio >= 70 ? "text-emerald-400" : dept.ratio >= 40 ? "text-amber-400" : "text-rose-400"
                  )}>
                    {dept.ratio}%
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                  <span>{dept.openTasks} open</span>
                  <span>•</span>
                  <span>{dept.completedTasks} done</span>
                </div>
                {/* Progress bar */}
                <div className="h-2 rounded-full bg-black/[0.06] dark:bg-white/[0.1] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${dept.ratio}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className={cn(
                      "h-full rounded-full",
                      dept.ratio >= 70 ? "bg-emerald-500" : dept.ratio >= 40 ? "bg-amber-500" : "bg-rose-500"
                    )}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════
          ADMIN SUPERPOWERS BAR
      ═══════════════════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
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
                onClick={handleCreateEpic}
              >
                <Rocket className="h-3.5 w-3.5 text-emerald-400" /> Create Epic
              </Button>
              <Button
                size="sm" variant="outline"
                className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-cyan-500/10 hover:border-cyan-500/30 text-xs"
                onClick={handleApplyTemplate}
              >
                <FileText className="h-3.5 w-3.5 text-cyan-400" /> Apply Template
              </Button>
              <Button
                size="sm" variant="outline"
                className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-amber-500/10 hover:border-amber-500/30 text-xs"
                onClick={() => setCreateModalOpen(true)}
              >
                <Plus className="h-3.5 w-3.5 text-amber-400" /> New Task
              </Button>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════
          TAB TOGGLE: Tasks | Team Tasks
          FIX: Only tab nav is sticky with z-30; content
          containers are NOT sticky.
      ═══════════════════════════════════════════════════════ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Sticky tab navigation — z-30 to stay above all content */}
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl pb-2 -mx-6 px-6 border-b border-black/[0.06] dark:border-white/[0.05]">
          <TabsList className="bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1]">
            <TabsTrigger value="tasks" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <ListTodo className="h-3.5 w-3.5 mr-1.5" /> Tasks
            </TabsTrigger>
            <TabsTrigger value="team-tasks" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Users className="h-3.5 w-3.5 mr-1.5" /> Team Tasks
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Tasks Tab ────────────────────────────────────────── */}
        <TabsContent value="tasks">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            {/* FIX: Container is NOT sticky. Only search/filter area is sticky below tabs. */}
            <GlassCard className="p-6">
              {/* Sticky Search & Filters — z-20, positioned below tabs */}
              <div className="sticky top-[49px] z-20 bg-background/80 backdrop-blur-xl -mx-6 px-6 pb-4 mb-4 border-b border-black/[0.06] dark:border-white/[0.05]">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
                  <h3 className="font-semibold">All Tasks</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 w-48 pl-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-cyan-500/30"
                      />
                    </div>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="h-8 w-32 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="in-review">In Review</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterDept} onValueChange={setFilterDept}>
                      <SelectTrigger className="h-8 w-36 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                        <SelectValue placeholder="Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.filter(d => d.id).map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Status Summary Bar */}
                <div className="flex flex-wrap gap-3">
                  {[
                    { key: 'todo', label: 'To Do', color: 'bg-slate-400' },
                    { key: 'in-progress', label: 'In Progress', color: 'bg-amber-400' },
                    { key: 'in-review', label: 'In Review', color: 'bg-cyan-400' },
                    { key: 'done', label: 'Done', color: 'bg-emerald-400' },
                    { key: 'blocked', label: 'Blocked', color: 'bg-rose-400' },
                  ].map(s => {
                    const count = tasks.filter(t => t.status === s.key).length;
                    if (count === 0) return null;
                    return (
                      <button
                        key={s.key}
                        onClick={() => setFilterStatus(filterStatus === s.key ? 'all' : s.key)}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all",
                          filterStatus === s.key ? "bg-black/[0.06] dark:bg-white/[0.1] ring-1 ring-white/20" : "hover:bg-black/[0.03] dark:hover:bg-white/[0.05]",
                        )}
                      >
                        <div className={cn("h-2 w-2 rounded-full", s.color)} />
                        <span className="text-muted-foreground">{s.label}</span>
                        <span className="font-medium">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Task Table — scrollable, NOT sticky */}
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-black/[0.1] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.03]">
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Task Name</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assignee</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Department</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Team</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Due Date</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task, i) => (
                      TaskRow({ task, index: i })
                    ))}
                    {filteredTasks.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No tasks match your filters
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </GlassCard>
          </motion.div>
        </TabsContent>

        {/* ── Team Tasks Tab ────────────────────────────────────── */}
        <TabsContent value="team-tasks">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard className="p-6">
              <h3 className="font-semibold mb-4">Tasks by Team</h3>
              {(() => {
                // Group tasks by team
                const teamTasksMap = new Map<string, { teamName: string; tasks: Task[] }>();
                const unassigned: Task[] = [];
                
                filteredTasks.forEach(task => {
                  if (task.teamName) {
                    const existing = teamTasksMap.get(task.teamName);
                    if (existing) {
                      existing.tasks.push(task);
                    } else {
                      teamTasksMap.set(task.teamName, { teamName: task.teamName, tasks: [task] });
                    }
                  } else {
                    unassigned.push(task);
                  }
                });

                const teamGroups = Array.from(teamTasksMap.values());
                
                if (teamGroups.length === 0 && unassigned.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No tasks to display</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {teamGroups.map(group => {
                      const completed = group.tasks.filter(t => t.status === 'done').length;
                      const total = group.tasks.length;
                      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                      return (
                        <div key={group.teamName} className="rounded-lg border border-black/[0.06] dark:border-white/[0.05] overflow-hidden">
                          <div className="flex items-center justify-between p-3 bg-black/[0.01] dark:bg-white/[0.02] border-b border-black/[0.06] dark:border-white/[0.05]">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-cyan-400" />
                              <span className="text-sm font-medium">{group.teamName}</span>
                              <Badge variant="outline" className="text-[10px] border-cyan-500/20 text-cyan-400">
                                {total} task{total !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{completed}/{total} done</span>
                              <div className="h-2 w-20 rounded-full bg-black/[0.06] dark:bg-white/[0.1] overflow-hidden">
                                <div className={cn(
                                  "h-full rounded-full transition-all",
                                  pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-500"
                                )} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs font-medium">{pct}%</span>
                            </div>
                          </div>
                          <div className="divide-y divide-white/5">
                            {group.tasks.map(task => (
                              <div
                                key={task.id}
                                className="flex items-center justify-between p-3 hover:bg-black/[0.01] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                                onClick={() => openTaskSheet(task.id)}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <StatusBadge status={task.status} />
                                  <span className="text-sm truncate">{task.title}</span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 ml-3">
                                  <span className="text-xs text-muted-foreground">{task.assigneeName || 'Unassigned'}</span>
                                  <StatusBadge status={task.priority} />
                                  <span className="text-xs text-muted-foreground font-mono">{task.dueDate || '—'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    
                    {unassigned.length > 0 && (
                      <div className="rounded-lg border border-black/[0.06] dark:border-white/[0.05] overflow-hidden">
                        <div className="flex items-center justify-between p-3 bg-black/[0.01] dark:bg-white/[0.02] border-b border-black/[0.06] dark:border-white/[0.05]">
                          <div className="flex items-center gap-2">
                            <ListTodo className="h-4 w-4 text-amber-400" />
                            <span className="text-sm font-medium">Unassigned Tasks</span>
                            <Badge variant="outline" className="text-[10px] border-amber-500/20 text-amber-400">
                              {unassigned.length}
                            </Badge>
                          </div>
                        </div>
                        <div className="divide-y divide-white/5">
                          {unassigned.map(task => (
                            <div
                              key={task.id}
                              className="flex items-center justify-between p-3 hover:bg-black/[0.01] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                              onClick={() => openTaskSheet(task.id)}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <StatusBadge status={task.status} />
                                <span className="text-sm truncate">{task.title}</span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0 ml-3">
                                <span className="text-xs text-muted-foreground">{task.assigneeName || 'Unassigned'}</span>
                                <StatusBadge status={task.priority} />
                                <span className="text-xs text-muted-foreground font-mono">{task.dueDate || '—'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </GlassCard>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* ── Create Task Modal ──────────────────────────────────── */}
      <CreateTaskModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
    </div>
  );
}
