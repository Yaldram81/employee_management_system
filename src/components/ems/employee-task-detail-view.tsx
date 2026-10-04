'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { StatCard } from './stat-card';
import { StatusBadge } from './status-badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Task } from '@/lib/types';
import {
  ArrowLeft,
  Share2,
  Download,
  Play,
  Send,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Calendar,
  User,
  Users,
  Tag,
  FileText,
  MessageSquare,
  Timer,
  ChevronRight,
  AlertTriangle,
  CheckSquare,
  Square,
  Activity,
  CircleDot,
  Layers,
  Hourglass,
  CalendarDays,
  Edit,
  Sparkles,
  XCircle,
  Plus,
  Loader2,
  TimerReset,
  Flag,
  GitBranch,
  Zap,
  CircleCheck,
  RotateCcw,
} from 'lucide-react';
import { formatDate, formatDateTime, getInitials, isOverdue } from './shared';

// ─── Constants ───────────────────────────────────────────────────────────────────
const SLA_CONFIG: Record<string, { days: number; color: string; bg: string; label: string; glow: 'cyan' | 'amber' | 'rose' | 'slate' }> = {
  urgent: { days: 1, color: 'text-rose-400', bg: 'bg-rose-500/20', label: '1 Day', glow: 'rose' },
  high: { days: 3, color: 'text-amber-400', bg: 'bg-amber-500/20', label: '3 Days', glow: 'amber' },
  medium: { days: 7, color: 'text-cyan-400', bg: 'bg-cyan-500/20', label: '7 Days', glow: 'cyan' },
  low: { days: 14, color: 'text-slate-400', bg: 'bg-slate-500/20', label: '14 Days', glow: 'slate' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; glow: 'cyan' | 'amber' | 'emerald' | 'rose' | 'slate' | 'violet' }> = {
  todo: { label: 'To Do', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', glow: 'slate' },
  'in-progress': { label: 'In Progress', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', glow: 'amber' },
  'in-review': { label: 'In Review', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', glow: 'cyan' },
  done: { label: 'Done', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'emerald' },
  blocked: { label: 'Blocked', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', glow: 'rose' },
};

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  low: { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: <Flag className="h-3 w-3" /> },
  medium: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', icon: <Flag className="h-3 w-3" /> },
  high: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: <Flag className="h-3 w-3" /> },
  urgent: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: <Zap className="h-3 w-3" /> },
};

const STATUS_PROGRESSION: Task['status'][] = ['todo', 'in-progress', 'in-review', 'done'];

interface TimeLogEntry {
  id: string;
  hours: number;
  description: string;
  loggedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────────

function formatRelativeTime(date?: string | null): string {
  if (!date) return '—';
  try {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return formatDate(date);
  } catch {
    return date;
  }
}

// isOverdue imported from ./shared

function getDaysUntilDue(task: Task): number | null {
  if (!task.dueDate) return null;
  const diff = new Date(task.dueDate).getTime() - new Date(new Date().toDateString()).getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}


function getAvatarGradient(name: string): string {
  const gradients = [
    'from-cyan-500 to-emerald-500',
    'from-amber-500 to-orange-500',
    'from-violet-500 to-purple-500',
    'from-rose-500 to-pink-500',
    'from-teal-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-pink-500 to-rose-500',
    'from-orange-500 to-amber-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return gradients[Math.abs(hash) % gradients.length];
}

function getSLAStatus(task: Task): { pct: number; isBreached: boolean; isAtRisk: boolean; daysRemaining: number } {
  const sla = SLA_CONFIG[task.priority];
  if (!sla || task.status === 'done') return { pct: 100, isBreached: false, isAtRisk: false, daysRemaining: Infinity };
  const created = new Date(task.createdAt);
  const due = new Date(created.getTime() + sla.days * 24 * 60 * 60 * 1000);
  const now = Date.now();
  const total = sla.days * 24 * 60 * 60 * 1000;
  const elapsed = now - created.getTime();
  const pct = Math.min(100, (elapsed / total) * 100);
  const daysRemaining = Math.ceil((due.getTime() - now) / (1000 * 60 * 60 * 24));
  return { pct, isBreached: daysRemaining < 0, isAtRisk: daysRemaining >= 0 && daysRemaining <= 1, daysRemaining };
}

function getStatusProgressPct(task: Task): number {
  switch (task.status) {
    case 'todo': return 0;
    case 'in-progress': return 35;
    case 'in-review': return 70;
    case 'blocked': return 35;
    case 'done': return 100;
    default: return 0;
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────────
export function EmployeeTaskDetailView() {
  const {
    user,
    tasks,
    teams,
    users,
    updateTask,
    reviewTask,
    deleteTask,
    loadTaskComments,
    addTaskComment,
    taskComments,
    selectedTaskId,
    setSelectedTaskId,
    setActiveView,
  } = useEMSStore();

  // Local state
  const [commentText, setCommentText] = useState('');
  const [timeLogs, setTimeLogs] = useState<TimeLogEntry[]>([]);
  const [timeLogDialogOpen, setTimeLogDialogOpen] = useState(false);
  const [timeLogForm, setTimeLogForm] = useState({ hours: 1, description: '' });
  const [blockerDialogOpen, setBlockerDialogOpen] = useState(false);
  const [blockerReason, setBlockerReason] = useState('');
  const [exporting, setExporting] = useState(false);

  // Find the task
  const task = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasks.find(t => t.id === selectedTaskId) || null;
  }, [selectedTaskId, tasks]);

  // Load comments when task changes
  useEffect(() => {
    if (task) {
      loadTaskComments(task.id);
    }
  }, [task?.id, loadTaskComments]);

  // ─── Derived Data ───────────────────────────────────────────────────────────
  const subTasks = useMemo(() => task?.subTasks || [], [task]);
  const completedSubTasks = useMemo(() => subTasks.filter(st => st.status === 'done').length, [subTasks]);
  const subtaskProgress = subTasks.length > 0 ? Math.round((completedSubTasks / subTasks.length) * 100) : 0;

  const daysUntilDue = task ? getDaysUntilDue(task) : null;
  const overdue = task ? isOverdue(task) : false;
  const statusProgress = task ? getStatusProgressPct(task) : 0;
  const totalHoursLogged = timeLogs.reduce((s, l) => s + l.hours, 0);
  const sla = task ? getSLAStatus(task) : null;

  // Related tasks (same team, excluding current)
  const relatedTasks = useMemo(() => {
    if (!task?.teamId) return [];
    return tasks.filter(t => t.teamId === task.teamId && t.id !== task.id).slice(0, 5);
  }, [tasks, task]);

  // Activity timeline
  const activityTimeline = useMemo(() => {
    if (!task) return [];
    const items: Array<{ id: string; type: string; message: string; timestamp: string; color: string; icon: React.ReactNode }> = [];

    // Task created
    items.push({
      id: `${task.id}-created`,
      type: 'created',
      message: 'Task created',
      timestamp: task.createdAt,
      color: 'text-slate-400',
      icon: <FileText className="h-3.5 w-3.5" />,
    });

    // Status progression hints
    if (task.status === 'in-progress' || task.status === 'in-review' || task.status === 'done' || task.status === 'blocked') {
      items.push({
        id: `${task.id}-started`,
        type: 'started',
        message: 'Work started',
        timestamp: task.createdAt,
        color: 'text-amber-400',
        icon: <Play className="h-3.5 w-3.5" />,
      });
    }

    if (task.status === 'in-review' || task.status === 'done') {
      items.push({
        id: `${task.id}-review`,
        type: 'review',
        message: 'Submitted for review',
        timestamp: task.createdAt,
        color: 'text-cyan-400',
        icon: <Send className="h-3.5 w-3.5" />,
      });
    }

    // Blocker reported
    if (task.isBlocked && task.blockedReason) {
      items.push({
        id: `${task.id}-blocked`,
        type: 'blocked',
        message: `Blocker reported: ${task.blockedReason}`,
        timestamp: task.createdAt,
        color: 'text-rose-400',
        icon: <AlertOctagon className="h-3.5 w-3.5" />,
      });
    }

    // Completed
    if (task.completedAt) {
      items.push({
        id: `${task.id}-done`,
        type: 'completed',
        message: 'Task completed',
        timestamp: task.completedAt,
        color: 'text-emerald-400',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      });
    }

    // Overdue warning
    if (overdue) {
      items.push({
        id: `${task.id}-overdue`,
        type: 'overdue',
        message: 'Task is overdue',
        timestamp: task.dueDate || task.createdAt,
        color: 'text-rose-400',
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
      });
    }

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [task, overdue]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const goBack = useCallback(() => {
    setSelectedTaskId(null);
    setActiveView('tasks');
  }, [setSelectedTaskId, setActiveView]);

  const handleStatusChange = useCallback(async (newStatus: Task['status']) => {
    if (!task) return;
    try {
      const updates: Partial<Task> = { status: newStatus };
      if (newStatus === 'done') {
        updates.completedAt = new Date().toISOString();
        updates.isBlocked = false;
        updates.blockedReason = undefined;
      }
      if (newStatus === 'in-progress') {
        updates.isBlocked = false;
        updates.blockedReason = undefined;
      }
      await updateTask(task.id, updates);
      toast.success(`Task moved to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
    } catch {
      toast.error('Failed to update task status');
    }
  }, [task, updateTask]);

  const handleSubtaskToggle = useCallback(async (subTask: Task) => {
    if (!task) return;
    const newStatus: Task['status'] = subTask.status === 'done' ? 'todo' : 'done';
    try {
      await updateTask(subTask.id, {
        status: newStatus,
        ...(newStatus === 'done' ? { completedAt: new Date().toISOString() } : {}),
      });
      toast.success(`Subtask ${newStatus === 'done' ? 'completed' : 'reopened'}`);
    } catch {
      toast.error('Failed to update subtask');
    }
  }, [task, updateTask]);

  const handleAddComment = useCallback(async () => {
    if (!task || !commentText.trim()) return;
    try {
      await addTaskComment(task.id, commentText.trim());
      setCommentText('');
      toast.success('Comment added');
    } catch {
      toast.error('Failed to add comment');
    }
  }, [task, commentText, addTaskComment]);

  const handleReportBlocker = useCallback(async () => {
    if (!task || !blockerReason.trim()) {
      toast.error('Please provide a blocker reason');
      return;
    }
    try {
      await updateTask(task.id, { isBlocked: true, blockedReason: blockerReason.trim(), status: 'blocked' });
      setBlockerDialogOpen(false);
      setBlockerReason('');
      toast.success('Blocker reported');
    } catch {
      toast.error('Failed to report blocker');
    }
  }, [task, blockerReason, updateTask]);

  const handleResolveBlocker = useCallback(async () => {
    if (!task) return;
    try {
      await updateTask(task.id, { isBlocked: false, blockedReason: undefined, status: 'in-progress' });
      toast.success('Blocker resolved, task resumed');
    } catch {
      toast.error('Failed to resolve blocker');
    }
  }, [task, updateTask]);

  const handleLogTime = useCallback(() => {
    if (!task || timeLogForm.hours <= 0) {
      toast.error('Please enter valid hours');
      return;
    }
    const entry: TimeLogEntry = {
      id: `tl-${Date.now()}`,
      hours: timeLogForm.hours,
      description: timeLogForm.description,
      loggedAt: new Date().toISOString(),
    };
    setTimeLogs(prev => [...prev, entry]);
    setTimeLogDialogOpen(false);
    setTimeLogForm({ hours: 1, description: '' });
    toast.success(`Logged ${timeLogForm.hours}h`);
  }, [task, timeLogForm]);

  const handleExport = useCallback(async () => {
    if (!task) return;
    setExporting(true);
    try {
      const headers = ['Field', 'Value'];
      const rows = [
        ['Title', `"${task.title}"`],
        ['Status', task.status],
        ['Priority', task.priority],
        ['Assignee', task.assigneeName || 'Unassigned'],
        ['Reporter', task.reporterName || '—'],
        ['Team', task.teamName || '—'],
        ['Due Date', task.dueDate ? formatDate(task.dueDate) : '—'],
        ['Created', formatDate(task.createdAt)],
        ['Completed', task.completedAt ? formatDate(task.completedAt) : '—'],
        ['Blocked', task.isBlocked ? `Yes - ${task.blockedReason || ''}` : 'No'],
        ['Description', `"${task.description || ''}"`],
      ];
      if (subTasks.length > 0) {
        rows.push(['Subtasks', `"${subTasks.map(st => `${st.title} (${st.status})`).join('; ')}"`]);
      }
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `task-${task.id}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Task exported');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  }, [task, subTasks]);

  const handleShare = useCallback(() => {
    if (!task) return;
    const shareText = `Task: ${task.title}\nStatus: ${task.status}\nPriority: ${task.priority}\nDue: ${task.dueDate ? formatDate(task.dueDate) : 'No due date'}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      toast.success('Task details copied to clipboard');
    }
  }, [task]);

  // ─── Animation Config ──────────────────────────────────────────────────────
  const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

  // ─── Not Found State ──────────────────────────────────────────────────────
  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="h-12 w-12 text-rose-400/50" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Task not found</p>
          <p className="text-xs text-muted-foreground mt-1">The task may have been deleted or the link is invalid.</p>
        </div>
        <Button variant="outline" size="sm" onClick={goBack} className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-cyan-500/10">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Tasks
        </Button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
  const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  // Quick action buttons based on current status
  const getQuickActions = () => {
    const actions: Array<{ label: string; icon: React.ReactNode; onClick: () => void; variant: 'default' | 'outline'; className: string }> = [];
    if (task.status === 'todo') {
      actions.push({
        label: 'Start',
        icon: <Play className="h-3.5 w-3.5" />,
        onClick: () => handleStatusChange('in-progress'),
        variant: 'default',
        className: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white',
      });
    }
    if (task.status === 'in-progress') {
      actions.push({
        label: 'Submit',
        icon: <Send className="h-3.5 w-3.5" />,
        onClick: () => handleStatusChange('in-review'),
        variant: 'default',
        className: 'bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white',
      });
    }
    if (task.status === 'in-review') {
      actions.push({
        label: 'Mark Done',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        onClick: () => handleStatusChange('done'),
        variant: 'default',
        className: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white',
      });
    }
    if (task.isBlocked) {
      actions.push({
        label: 'Resolve Blocker',
        icon: <XCircle className="h-3.5 w-3.5" />,
        onClick: handleResolveBlocker,
        variant: 'outline',
        className: 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10',
      });
    }

    if (user?.role === 'admin' || user?.role === 'manager') {
      if (task.status === 'in-review') {
        actions.push({
          label: 'Approve',
          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
          onClick: () => reviewTask(task.id, 'approve'),
          variant: 'default',
          className: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white',
        });
        actions.push({
          label: 'Request Changes',
          icon: <RotateCcw className="h-3.5 w-3.5" />,
          onClick: () => reviewTask(task.id, 'request-changes', 'Changes requested by ' + user.role),
          variant: 'outline',
          className: 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10',
        });
      }
      actions.push({
        label: 'Delete',
        icon: <XCircle className="h-3.5 w-3.5" />,
        onClick: async () => {
          if (confirm('Are you sure you want to delete this task?')) {
            await deleteTask(task.id);
            goBack();
          }
        },
        variant: 'outline',
        className: 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10',
      });
    }

    return actions;
  };

  // Primary action for bottom bar
  const getPrimaryAction = () => {
    if (task.status === 'todo') return { label: 'Start Task', icon: <Play className="h-4 w-4" />, onClick: () => handleStatusChange('in-progress'), className: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white' };
    if (task.status === 'in-progress') return { label: 'Submit for Review', icon: <Send className="h-4 w-4" />, onClick: () => handleStatusChange('in-review'), className: 'bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white' };
    if (task.status === 'in-review') return { label: 'Mark as Done', icon: <CheckCircle2 className="h-4 w-4" />, onClick: () => handleStatusChange('done'), className: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white' };
    if (task.isBlocked) return { label: 'Resolve Blocker', icon: <XCircle className="h-4 w-4" />, onClick: handleResolveBlocker, className: 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white' };
    if (task.status === 'done') return { label: 'Reopen Task', icon: <Play className="h-4 w-4" />, onClick: () => handleStatusChange('in-progress'), className: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white' };
    return null;
  };

  const quickActions = getQuickActions();
  const primaryAction = getPrimaryAction();

  return (
    <div className="space-y-6 pb-4">
      {/* ═══ TOP NAVIGATION BAR ═══ */}
      <motion.div {...fadeIn} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={goBack}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group shrink-0"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              <span className="hidden sm:inline">Tasks</span>
            </button>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
            <span className="text-sm text-muted-foreground truncate">Task Detail</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleShare} className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]">
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]">
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ═══ TASK HEADER SECTION ═══ */}
      <motion.div {...fadeIn} transition={{ delay: 0.05, duration: 0.4 }}>
        <GlassCard className="p-5 sm:p-6" glow={statusCfg.glow !== 'slate' ? statusCfg.glow : 'cyan'}>
          <div className="space-y-4">
            {/* Title row */}
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold text-white break-words leading-tight">{task.title}</h1>
                </div>
              </div>

              {/* Badges row */}
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={task.status} />
                <StatusBadge status={task.priority} />
                {task.teamName && (
                  <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/20 text-xs font-medium gap-1">
                    <Users className="h-3 w-3" />
                    {task.teamName}
                  </Badge>
                )}
                {overdue && (
                  <Badge variant="outline" className="bg-rose-500/20 text-rose-400 border-rose-500/30 text-xs font-medium gap-1 animate-pulse">
                    <AlertTriangle className="h-3 w-3" />
                    Overdue
                  </Badge>
                )}
                {task.isBlocked && (
                  <Badge variant="outline" className="bg-rose-500/20 text-rose-400 border-rose-500/30 text-xs font-medium gap-1">
                    <AlertOctagon className="h-3 w-3" />
                    Blocked
                  </Badge>
                )}
              </div>

              {/* Quick action buttons */}
              {quickActions.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {quickActions.map((action, i) => (
                    <Button
                      key={i}
                      size="sm"
                      variant={action.variant}
                      onClick={action.onClick}
                      className={cn('gap-1.5 text-xs', action.className)}
                    >
                      {action.icon}
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}

              {/* Meta info row */}
              <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  Created {formatDate(task.createdAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Updated {formatRelativeTime(task.createdAt)}
                </span>
                <span className="font-mono text-muted-foreground/50">
                  ID: {task.id.slice(0, 8)}
                </span>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ═══ 4-CARD STATS ROW ═══ */}
      <motion.div {...fadeIn} transition={{ delay: 0.1, duration: 0.4 }}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Status Progress"
            value={`${statusProgress}%`}
            icon={Layers}
            color={task.status === 'done' ? 'emerald' : task.status === 'blocked' ? 'rose' : 'cyan'}
            hero
            progressRing={{ value: statusProgress, max: 100 }}
            subtitle={statusCfg.label}
          />
          <StatCard
            title="Time Until Due"
            value={daysUntilDue !== null ? (daysUntilDue < 0 ? `${Math.abs(daysUntilDue)}d overdue` : daysUntilDue === 0 ? 'Today' : `${daysUntilDue}d`) : 'No date'}
            icon={CalendarDays}
            color={overdue ? 'rose' : daysUntilDue !== null && daysUntilDue <= 2 ? 'amber' : 'cyan'}
            hero
            progressRing={{ value: daysUntilDue !== null ? Math.max(0, daysUntilDue) : 0, max: Math.max(daysUntilDue || 0, 14) }}
            subtitle={task.dueDate ? formatDate(task.dueDate) : undefined}
          />
          <StatCard
            title="Time Logged"
            value={`${totalHoursLogged}h`}
            icon={Timer}
            color="violet"
            hero
            progressRing={{ value: totalHoursLogged, max: Math.max(totalHoursLogged * 2, 8) }}
            subtitle="This task"
          />
          <StatCard
            title="Subtask Progress"
            value={subTasks.length > 0 ? `${completedSubTasks}/${subTasks.length}` : 'None'}
            icon={CheckSquare}
            color={subTasks.length > 0 && completedSubTasks === subTasks.length ? 'emerald' : 'amber'}
            hero
            progressRing={{ value: completedSubTasks, max: Math.max(subTasks.length, 1) }}
            subtitle={subTasks.length > 0 ? `${subtaskProgress}% done` : 'No subtasks'}
          />
        </div>
      </motion.div>

      {/* ═══ MAIN CONTENT: 2-COLUMN LAYOUT ═══ */}
      <motion.div {...fadeIn} transition={{ delay: 0.15, duration: 0.4 }}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── LEFT COLUMN (2/3) ─── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <GlassCard className="p-5 sm:p-6">
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Description
                </h2>
                {task.description ? (
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {task.description}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground/40 italic">No description provided</p>
                )}
              </div>
            </GlassCard>

            {/* Subtasks */}
            {subTasks.length > 0 && (
              <GlassCard className="p-5 sm:p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <CheckSquare className="h-4 w-4" /> Subtasks
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      {completedSubTasks}/{subTasks.length} completed
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <Progress value={subtaskProgress} className="h-1.5" />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>0%</span>
                      <span>{subtaskProgress}%</span>
                      <span>100%</span>
                    </div>
                  </div>
                  {/* Subtask list */}
                  <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                    {subTasks.map((st) => (
                      <div
                        key={st.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors group"
                      >
                        <button
                          onClick={() => handleSubtaskToggle(st)}
                          className="shrink-0 transition-colors"
                        >
                          {st.status === 'done' ? (
                            <CheckSquare className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <Square className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground" />
                          )}
                        </button>
                        <span className={cn(
                          'text-sm flex-1',
                          st.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'
                        )}>
                          {st.title}
                        </span>
                        <StatusBadge status={st.status} />
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>
            )}

            {/* Blocker Info */}
            {task.isBlocked && task.blockedReason && (
              <GlassCard className="p-5 sm:p-6" glow="rose">
                <div className="space-y-3">
                  <h2 className="text-sm font-medium text-rose-400 uppercase tracking-wider flex items-center gap-2">
                    <AlertOctagon className="h-4 w-4" /> Blocker
                  </h2>
                  <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-4">
                    <p className="text-sm text-rose-300">{task.blockedReason}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleResolveBlocker}
                    className="gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Resolve Blocker
                  </Button>
                </div>
              </GlassCard>
            )}

            {/* Comments Section */}
            <GlassCard className="p-5 sm:p-6">
              <div className="space-y-4">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Comments
                  {taskComments.length > 0 && (
                    <Badge variant="outline" className="bg-black/[0.03] dark:bg-white/[0.05] text-muted-foreground border-black/[0.1] dark:border-white/[0.1] text-[10px] ml-1">
                      {taskComments.length}
                    </Badge>
                  )}
                </h2>

                {/* Comments list */}
                <ScrollArea className="max-h-72">
                  {taskComments.length > 0 ? (
                    <div className="space-y-3 pr-2">
                      {taskComments.map((comment) => (
                        <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05]">
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarFallback className={cn('text-[10px] font-bold bg-gradient-to-br text-white', getAvatarGradient(comment.userName || 'U'))}>
                              {getInitials(comment.userName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-foreground">{comment.userName || 'Unknown'}</span>
                              <span className="text-[10px] text-muted-foreground/60">{formatRelativeTime(comment.createdAt)}</span>
                            </div>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{comment.comment}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground/40 italic py-4 text-center">No comments yet</p>
                  )}
                </ScrollArea>

                {/* Add comment */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                    className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-cyan-500/30 h-9 text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddComment}
                    disabled={!commentText.trim()}
                    className="gap-1.5 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white shrink-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </GlassCard>

            {/* Activity Timeline */}
            <GlassCard className="p-5 sm:p-6">
              <div className="space-y-4">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Activity Timeline
                </h2>
                <div className="space-y-0">
                  {activityTimeline.map((item, i) => (
                    <div key={item.id} className="flex gap-3 relative">
                      {/* Timeline line */}
                      {i < activityTimeline.length - 1 && (
                        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-black/[0.04] dark:bg-white/[0.06]" />
                      )}
                      {/* Icon */}
                      <div className={cn('h-6 w-6 rounded-full flex items-center justify-center shrink-0 z-10', item.color.replace('text-', 'bg-').replace(/-\d+$/, '-500/20'))}>
                        {item.icon}
                      </div>
                      {/* Content */}
                      <div className="pb-4 min-w-0 flex-1">
                        <p className="text-sm text-foreground">{item.message}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{formatDateTime(item.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </div>

          {/* ─── RIGHT COLUMN (1/3) ─── */}
          <div className="space-y-6">
            {/* Details Card */}
            <GlassCard className="p-5 sm:p-6">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <CircleDot className="h-4 w-4" /> Details
              </h2>
              <div className="space-y-4">
                {/* Assignee */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={cn('text-xs font-bold bg-gradient-to-br text-white', task.assigneeName ? getAvatarGradient(task.assigneeName) : 'from-slate-500 to-slate-600')}>
                      {task.assigneeName ? getInitials(task.assigneeName) : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs text-muted-foreground">Assignee</p>
                    <p className="text-sm text-foreground">{task.assigneeName || 'Unassigned'}</p>
                  </div>
                </div>

                <Separator className="bg-black/[0.04] dark:bg-white/[0.06]" />

                {/* Reporter */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={cn('text-xs font-bold bg-gradient-to-br text-white', task.reporterName ? getAvatarGradient(task.reporterName) : 'from-slate-500 to-slate-600')}>
                      {task.reporterName ? getInitials(task.reporterName) : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs text-muted-foreground">Reporter</p>
                    <p className="text-sm text-foreground">{task.reporterName || '—'}</p>
                  </div>
                </div>

                <Separator className="bg-black/[0.04] dark:bg-white/[0.06]" />

                {/* Team */}
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Team</p>
                    <p className="text-sm text-foreground">{task.teamName || '—'}</p>
                  </div>
                </div>

                <Separator className="bg-black/[0.04] dark:bg-white/[0.06]" />

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Created</p>
                    <p className="text-xs text-foreground mt-0.5">{formatDate(task.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Due Date</p>
                    <p className={cn('text-xs mt-0.5', overdue ? 'text-rose-400 font-medium' : 'text-foreground')}>
                      {task.dueDate ? formatDate(task.dueDate) : '—'}
                    </p>
                  </div>
                </div>

                {task.completedAt && (
                  <>
                    <Separator className="bg-black/[0.04] dark:bg-white/[0.06]" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Completed</p>
                      <p className="text-xs text-emerald-400 mt-0.5">{formatDate(task.completedAt)}</p>
                    </div>
                  </>
                )}

                {/* Parent task */}
                {task.parentTaskId && (
                  <>
                    <Separator className="bg-black/[0.04] dark:bg-white/[0.06]" />
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                        <GitBranch className="h-4 w-4 text-cyan-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Parent Task</p>
                        <p className="text-xs text-cyan-400 font-mono">{task.parentTaskId.slice(0, 8)}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </GlassCard>

            {/* SLA Card */}
            {sla && task.status !== 'done' && (
              <GlassCard className="p-5 sm:p-6" glow={sla.isBreached ? 'rose' : sla.isAtRisk ? 'amber' : undefined}>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Hourglass className="h-4 w-4" /> SLA
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {SLA_CONFIG[task.priority]?.label || 'Standard'} SLA
                    </span>
                    {sla.isBreached ? (
                      <Badge variant="outline" className="bg-rose-500/20 text-rose-400 border-rose-500/30 text-[10px] animate-pulse">
                        Breached
                      </Badge>
                    ) : sla.isAtRisk ? (
                      <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                        At Risk
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                        On Track
                      </Badge>
                    )}
                  </div>
                  {/* SLA progress bar */}
                  <div className="space-y-1.5">
                    <Progress
                      value={Math.min(100, sla.pct)}
                      className={cn(
                        'h-2',
                        sla.isBreached ? '[&>div]:bg-rose-500' : sla.isAtRisk ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'
                      )}
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Time elapsed</span>
                      <span>{sla.isBreached ? 'Overdue' : sla.daysRemaining === Infinity ? '—' : `${sla.daysRemaining}d left`}</span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            )}

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <GlassCard className="p-5 sm:p-6">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Tag className="h-4 w-4" /> Tags
                </h2>
                <div className="flex flex-wrap gap-2">
                  {task.tags.map((tag, i) => (
                    <Badge key={i} variant="outline" className="bg-black/[0.03] dark:bg-white/[0.05] text-muted-foreground border-black/[0.1] dark:border-white/[0.1] text-xs gap-1">
                      <Sparkles className="h-2.5 w-2.5" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* Related Tasks */}
            {relatedTasks.length > 0 && (
              <GlassCard className="p-5 sm:p-6">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Layers className="h-4 w-4" /> Related Tasks
                </h2>
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {relatedTasks.map((rt) => (
                    <button
                      key={rt.id}
                      onClick={() => {
                        setSelectedTaskId(rt.id);
                        loadTaskComments(rt.id);
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition-colors text-left group"
                    >
                      <div className={cn('h-1.5 w-1.5 rounded-full shrink-0', STATUS_CONFIG[rt.status]?.color?.replace('text-', 'bg-') || 'bg-slate-400')} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate group-hover:text-cyan-400 transition-colors">{rt.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <StatusBadge status={rt.status} />
                          <StatusBadge status={rt.priority} />
                        </div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-cyan-400 transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* Time Tracking Card */}
            <GlassCard className="p-5 sm:p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Timer className="h-4 w-4" /> Time Tracking
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTimeLogDialogOpen(true)}
                    className="gap-1 text-[10px] border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] h-7"
                  >
                    <Plus className="h-3 w-3" /> Log Time
                  </Button>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05]">
                  <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <TimerReset className="h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-violet-400">{totalHoursLogged}h</p>
                    <p className="text-[10px] text-muted-foreground">Total logged</p>
                  </div>
                </div>

                {timeLogs.length > 0 && (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                    {timeLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between text-xs p-2 rounded bg-black/[0.01] dark:bg-white/[0.02]">
                        <div className="min-w-0 flex-1">
                          <span className="text-foreground">{log.description || 'Time logged'}</span>
                          <span className="text-muted-foreground ml-2">{formatRelativeTime(log.loggedAt)}</span>
                        </div>
                        <span className="text-violet-400 font-medium shrink-0">{log.hours}h</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      </motion.div>

      {/* ═══ STICKY BOTTOM ACTION BAR (mobile) ═══ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
        <div className="bg-background/95 backdrop-blur-xl border-t border-black/[0.1] dark:border-white/[0.1] px-4 py-3 flex items-center gap-3">
          {primaryAction && (
            <Button
              size="sm"
              onClick={primaryAction.onClick}
              className={cn('flex-1 gap-1.5', primaryAction.className)}
            >
              {primaryAction.icon}
              {primaryAction.label}
            </Button>
          )}
          {!task.isBlocked && task.status !== 'done' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBlockerDialogOpen(true)}
              className="gap-1.5 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
            >
              <AlertOctagon className="h-3.5 w-3.5" />
              <span className="hidden">Blocker</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTimeLogDialogOpen(true)}
            className="gap-1.5 border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
          >
            <Timer className="h-3.5 w-3.5" />
            <span className="hidden">Log</span>
          </Button>
        </div>
      </div>

      {/* Desktop action bar (embedded in page) */}
      <motion.div {...fadeIn} transition={{ delay: 0.2, duration: 0.4 }} className="hidden lg:block">
        <GlassCard className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {primaryAction && (
                <Button
                  size="sm"
                  onClick={primaryAction.onClick}
                  className={cn('gap-1.5', primaryAction.className)}
                >
                  {primaryAction.icon}
                  {primaryAction.label}
                </Button>
              )}
              {!task.isBlocked && task.status !== 'done' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBlockerDialogOpen(true)}
                  className="gap-1.5 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                >
                  <AlertOctagon className="h-3.5 w-3.5" /> Report Blocker
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTimeLogDialogOpen(true)}
                className="gap-1.5 border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
              >
                <Timer className="h-3.5 w-3.5" /> Log Time
              </Button>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CircleCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>{statusCfg.label}</span>
              <Separator orientation="vertical" className="h-4 bg-black/[0.04] dark:bg-white/[0.06]" />
              <span>Task {task.id.slice(0, 8)}</span>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ═══ DIALOGS ═══ */}

      {/* Report Blocker Dialog */}
      <Dialog open={blockerDialogOpen} onOpenChange={setBlockerDialogOpen}>
        <DialogContent className="bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-rose-400" /> Report Blocker
            </DialogTitle>
            <DialogDescription>
              Report a blocker for this task. The task will be moved to Blocked status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Blocker Reason</label>
              <Textarea
                value={blockerReason}
                onChange={(e) => setBlockerReason(e.target.value)}
                placeholder="Describe what is blocking this task..."
                rows={3}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-rose-500/30 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockerDialogOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button
              onClick={handleReportBlocker}
              disabled={!blockerReason.trim()}
              className="gap-1.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white"
            >
              <AlertOctagon className="h-3.5 w-3.5" /> Report Blocker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Time Dialog */}
      <Dialog open={timeLogDialogOpen} onOpenChange={setTimeLogDialogOpen}>
        <DialogContent className="bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-violet-400" /> Log Time
            </DialogTitle>
            <DialogDescription>
              Log time spent working on this task.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Hours</label>
                <Input
                  type="number"
                  min={0.5}
                  max={24}
                  step={0.5}
                  value={timeLogForm.hours}
                  onChange={(e) => setTimeLogForm(prev => ({ ...prev, hours: parseFloat(e.target.value) || 0 }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-violet-500/30"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  placeholder="What did you work on?"
                  value={timeLogForm.description}
                  onChange={(e) => setTimeLogForm(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-violet-500/30"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTimeLogDialogOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button
              onClick={handleLogTime}
              disabled={timeLogForm.hours <= 0}
              className="gap-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white"
            >
              <Timer className="h-3.5 w-3.5" /> Log {timeLogForm.hours}h
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bottom spacing for mobile action bar */}
      <div className="h-16 lg:hidden" />
    </div>
  );
}
