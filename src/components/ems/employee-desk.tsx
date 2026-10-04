'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { StatCard } from './stat-card';
import { StatusBadge } from './status-badge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { isOverdue } from './shared';
import type { Task } from '@/lib/types';
import {
  ListTodo, CheckCircle2, Shield, Clock, AlertTriangle,
  MessageSquare, Send, Flag, Calendar, ChevronRight, ChevronLeft,
  X, Loader2, ArrowRight, User, LayoutGrid, List, CalendarDays,
  Zap, Target, Flame, Sun, Moon, Coffee, Play, Eye, Unlock,
  ChevronDown, ChevronUp, Sparkles, AlertCircle, CheckCircle,
} from 'lucide-react';

// ─── Helpers ───────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getGreetingIcon() {
  const h = new Date().getHours();
  if (h < 12) return Sun;
  if (h < 17) return Coffee;
  return Moon;
}

// isOverdue imported from ./shared

function isDueToday(dueDate?: string) {
  if (!dueDate) return false;
  return new Date(dueDate).toDateString() === new Date().toDateString();
}

function isDueSoon(dueDate?: string) {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const now = new Date();
  const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 3;
}

function daysUntilDue(dueDate?: string): number | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date(new Date().toDateString());
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDueCountdown(dueDate?: string) {
  const days = daysUntilDue(dueDate);
  if (days === null) return null;
  if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''}`;
  if (days === 0) return 'Due today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

const STATUS_COLUMNS: { key: Task['status']; label: string; color: string }[] = [
  { key: 'todo', label: 'To Do', color: 'slate' },
  { key: 'in-progress', label: 'In Progress', color: 'amber' },
  { key: 'in-review', label: 'In Review', color: 'cyan' },
  { key: 'blocked', label: 'Blocked', color: 'rose' },
  { key: 'done', label: 'Done', color: 'emerald' },
];

const PRIORITY_BORDER: Record<string, string> = {
  low: 'border-l-slate-400',
  medium: 'border-l-cyan-400',
  high: 'border-l-amber-400',
  urgent: 'border-l-rose-400',
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ─── Status Progression Bar ────────────────────────────────────
function StatusProgression({ status }: { status: Task['status'] }) {
  const steps = ['todo', 'in-progress', 'in-review', 'done'];
  const currentIndex = steps.indexOf(status);
  const isBlocked = status === 'blocked';

  return (
    <div className="flex items-center gap-1 w-full">
      {steps.map((step, i) => {
        const isCompleted = !isBlocked && currentIndex > i;
        const isCurrent = !isBlocked && currentIndex === i;
        const isFuture = isBlocked || currentIndex < i;
        return (
          <div key={step} className="flex-1 flex items-center gap-1">
            <div className={cn(
              'h-2 flex-1 rounded-full transition-all',
              isCompleted && 'bg-emerald-500',
              isCurrent && 'bg-cyan-400 animate-pulse',
              isFuture && 'bg-black/[0.06] dark:bg-white/[0.1]',
            )} />
            {i < steps.length - 1 && (
              <div className={cn(
                'h-0.5 w-2',
                isCompleted ? 'bg-emerald-500' : 'bg-black/[0.06] dark:bg-white/[0.1]',
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Task Detail Sheet ─────────────────────────────────────────
function TaskDetailSheet({ task, open, onOpenChange }: { task: Task | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { updateTask, user, loadTaskComments, addTaskComment, taskComments } = useEMSStore();
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (task?.id && open) {
      loadTaskComments(task.id);
    }
  }, [task?.id, open, loadTaskComments]);

  if (!task) return null;

  const handleAddComment = async () => {
    if (!comment.trim() || sending) return;
    setSending(true);
    try {
      await addTaskComment(task.id, comment.trim());
      setComment('');
      toast.success('Comment added');
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = (newStatus: Task['status']) => {
    updateTask(task.id, { status: newStatus, isBlocked: false, blockedReason: undefined });
    toast.success(`Task moved to ${newStatus.replace('-', ' ')}`);
    onOpenChange(false);
  };

  const handleResolveBlocker = () => {
    updateTask(task.id, { status: 'in-progress', isBlocked: false, blockedReason: undefined });
    toast.success('Blocker resolved — task is now in progress');
    onOpenChange(false);
  };

  const handleReportBlocker = () => {
    updateTask(task.id, { isBlocked: true, blockedReason: 'Reported by employee', status: 'blocked' });
    toast.success('Blocker reported — manager notified');
    onOpenChange(false);
  };

  const countdown = formatDueCountdown(task.dueDate);
  const overdue = isOverdue(task);

  const comments = task.comments?.length ? task.comments : taskComments;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg bg-background/95 backdrop-blur-xl border-l border-black/[0.1] dark:border-white/[0.1] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-lg">{task.title}</SheetTitle>
          <SheetDescription className="text-xs">
            {task.description || 'No description provided'}
          </SheetDescription>
        </SheetHeader>

        {/* Status Progression Bar */}
        <div className="mb-5">
          <p className="text-xs text-muted-foreground mb-2">Status Progress</p>
          <StatusProgression status={task.status} />
          <div className="flex justify-between mt-1.5">
            {['To Do', 'In Progress', 'In Review', 'Done'].map((label, i) => {
              const stepKeys = ['todo', 'in-progress', 'in-review', 'done'];
              const isCurrent = task.status === stepKeys[i];
              const isBlocked = task.status === 'blocked';
              return (
                <span key={label} className={cn(
                  'text-[10px]',
                  isCurrent && !isBlocked ? 'text-cyan-400 font-medium' : 'text-muted-foreground/60',
                )}>{label}</span>
              );
            })}
          </div>
          {task.status === 'blocked' && (
            <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Blocked — resolve to continue progression
            </p>
          )}
        </div>

        {/* Status, Priority, Team */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Status</p>
            <StatusBadge status={task.status} />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Priority</p>
            <StatusBadge status={task.priority} />
          </div>
          {task.teamName && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Team</p>
              <Badge variant="outline" className="border-cyan-500/20 text-cyan-400 text-xs">
                {task.teamName}
              </Badge>
            </div>
          )}
        </div>

        <Separator className="mb-4 bg-black/[0.03] dark:bg-white/[0.05]" />

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> Assignee</p>
            <p className="text-sm">{task.assigneeName || 'Unassigned'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Due Date</p>
            <p className={cn('text-sm', overdue && 'text-rose-400 font-medium')}>
              {task.dueDate || 'Not set'}
            </p>
            {countdown && (
              <p className={cn('text-[10px]', overdue ? 'text-rose-400' : 'text-amber-400')}>
                {countdown}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Reporter</p>
            <p className="text-sm">{task.reporterName || '—'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="text-sm">{task.createdAt ? new Date(task.createdAt).toLocaleDateString() : '—'}</p>
          </div>
        </div>

        {/* Subtasks */}
        {task.subTasks && task.subTasks.length > 0 && (
          <GlassCard className="p-3 mb-5">
            <p className="text-xs font-medium mb-2 flex items-center gap-1">
              <ListTodo className="h-3.5 w-3.5 text-cyan-400" /> Subtasks ({task.subTasks.length})
            </p>
            <div className="space-y-1">
              {task.subTasks.map((st) => (
                <div key={st.id} className="flex items-center gap-2 text-xs">
                  <StatusBadge status={st.status} />
                  <span className="truncate">{st.title}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Parent task link */}
        {task.parentTaskId && (
          <div className="mb-5 p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowRight className="h-3 w-3" /> Part of a parent task
            </p>
          </div>
        )}

        {/* Blocker Info */}
        {task.isBlocked && task.blockedReason && (
          <GlassCard className="p-4 mb-5" glow="rose">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              <span className="text-sm font-medium text-rose-400">Blocked</span>
            </div>
            <p className="text-sm text-muted-foreground">{task.blockedReason}</p>
          </GlassCard>
        )}

        <Separator className="mb-4 bg-black/[0.03] dark:bg-white/[0.05]" />

        {/* Contextual Action Buttons */}
        <div className="mb-5 space-y-2">
          {task.status === 'todo' && (
            <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500" onClick={() => handleStatusChange('in-progress')}>
              <Play className="h-4 w-4" /> Start Working
            </Button>
          )}
          {task.status === 'in-progress' && (
            <>
              <Button className="w-full gap-2 bg-cyan-600 hover:bg-cyan-500" onClick={() => handleStatusChange('in-review')}>
                <Eye className="h-4 w-4" /> Submit for Review
              </Button>
              <Button variant="outline" className="w-full gap-2 border-rose-500/20 text-rose-400 hover:bg-rose-500/10" onClick={handleReportBlocker}>
                <Flag className="h-4 w-4" /> Report Blocker
              </Button>
            </>
          )}
          {task.status === 'in-review' && (
            <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />
              <span className="text-sm text-amber-400 font-medium">Waiting for review</span>
            </div>
          )}
          {task.status === 'blocked' && (
            <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500" onClick={handleResolveBlocker}>
              <Unlock className="h-4 w-4" /> Resolve Blocker
            </Button>
          )}
          {task.status === 'done' && (
            <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-emerald-400 font-medium">Completed ✓</span>
              {task.completedAt && (
                <span className="text-xs text-emerald-400/60">on {new Date(task.completedAt).toLocaleDateString()}</span>
              )}
            </div>
          )}
        </div>

        <Separator className="mb-4 bg-black/[0.03] dark:bg-white/[0.05]" />

        {/* Comments Section */}
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-cyan-400" />
            Comments
            {comments.length > 0 && (
              <Badge variant="outline" className="text-[10px] border-black/[0.1] dark:border-white/[0.1]">{comments.length}</Badge>
            )}
          </h4>

          <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
            {comments.length > 0 ? comments.map((c) => (
              <div key={c.id} className="p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.05]">
                <div className="flex items-center gap-2 mb-1">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[8px] bg-gradient-to-br from-emerald-600 to-cyan-600 text-white">
                      {c.userName?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium">{c.userName || 'Unknown'}</span>
                  <span className="text-[10px] text-muted-foreground">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}</span>
                </div>
                <p className="text-sm text-muted-foreground">{c.comment}</p>
              </div>
            )) : (
              <p className="text-xs text-muted-foreground text-center py-4">No comments yet</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              className="text-sm bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
            />
            <Button size="icon" variant="ghost" onClick={handleAddComment} disabled={sending} className="shrink-0 hover:bg-emerald-500/10">
              {sending ? <Loader2 className="h-4 w-4 animate-spin text-emerald-400" /> : <Send className="h-4 w-4 text-emerald-400" />}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Component ────────────────────────────────────────────
export function EmployeeDesk() {
  const { user, tasks, updateTask, loadTaskComments, addTaskComment } = useEMSStore();

  const [viewMode, setViewMode] = useState<string>('board');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [blockerModalOpen, setBlockerModalOpen] = useState(false);
  const [blockerTaskId, setBlockerTaskId] = useState<string | null>(null);
  const [blockerReason, setBlockerReason] = useState('');
  const [listFilter, setListFilter] = useState<string>('all');
  const [listPriority, setListPriority] = useState<string>('all');
  const [listSort, setListSort] = useState<string>('dueDate');
  const [listSearch, setListSearch] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [completedCollapsed, setCompletedCollapsed] = useState(false);

  // ─── My Tasks ─────────────────────────────────────────────
  const myTasks = useMemo(() => {
    if (!user?.id) return [];
    return tasks.filter(t => t.assigneeId === user.id);
  }, [tasks, user]);

  const taskStats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      assigned: myTasks.length,
      inProgress: myTasks.filter(t => t.status === 'in-progress').length,
      completedWeek: myTasks.filter(t => t.status === 'done' && t.completedAt && new Date(t.completedAt) >= weekAgo).length,
      overdue: myTasks.filter(t => isOverdue(t)).length,
    };
  }, [myTasks]);

  const dueSoonTasks = useMemo(() =>
    myTasks.filter(t => t.status !== 'done' && isDueSoon(t.dueDate) && !isOverdue(t)),
  [myTasks]);

  const overdueTasks = useMemo(() =>
    myTasks.filter(t => isOverdue(t)),
  [myTasks]);

  const recentlyCompleted = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return myTasks.filter(t => t.status === 'done' && t.completedAt && new Date(t.completedAt) >= weekAgo);
  }, [myTasks]);

  const dueTodayCount = useMemo(() =>
    myTasks.filter(t => t.status !== 'done' && isDueToday(t.dueDate)).length,
  [myTasks]);

  const completionStreak = useMemo(() => {
    let streak = 0;
    const sorted = [...recentlyCompleted].sort((a, b) =>
      new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()
    );
    for (const t of sorted) {
      if (t.status === 'done') streak++;
      else break;
    }
    return streak;
  }, [recentlyCompleted]);

  // ─── Calendar helpers ─────────────────────────────────────
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [calendarMonth, calendarYear]);

  const tasksForDay = useCallback((day: number) => {
    return myTasks.filter(t => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d.getDate() === day && d.getMonth() === calendarMonth && d.getFullYear() === calendarYear;
    });
  }, [myTasks, calendarMonth, calendarYear]);

  // ─── List View filtered/sorted ────────────────────────────
  const filteredListTasks = useMemo(() => {
    let list = [...myTasks];
    if (listSearch) list = list.filter(t => t.title.toLowerCase().includes(listSearch.toLowerCase()));
    if (listFilter !== 'all') list = list.filter(t => t.status === listFilter);
    if (listPriority !== 'all') list = list.filter(t => t.priority === listPriority);
    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    const statusOrder: Record<string, number> = { 'in-progress': 0, 'todo': 1, 'in-review': 2, 'blocked': 3, 'done': 4 };
    if (listSort === 'dueDate') list.sort((a, b) => (a.dueDate || 'z').localeCompare(b.dueDate || 'z'));
    else if (listSort === 'priority') list.sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9));
    else if (listSort === 'status') list.sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9));
    return list;
  }, [myTasks, listSearch, listFilter, listPriority, listSort]);

  // ─── Handlers ─────────────────────────────────────────────
  const openTaskDetail = (task: Task) => {
    setSelectedTask(task);
    setSheetOpen(true);
  };

  const handleReportBlocker = () => {
    if (!blockerTaskId || !blockerReason.trim()) {
      toast.error('Please describe the blocker');
      return;
    }
    updateTask(blockerTaskId, { isBlocked: true, blockedReason: blockerReason, status: 'blocked' });
    toast.success('Blocker reported — your manager has been notified');
    setBlockerModalOpen(false);
    setBlockerTaskId(null);
    setBlockerReason('');
  };

  const openBlockerModal = (taskId: string) => {
    setBlockerTaskId(taskId);
    setBlockerReason('');
    setBlockerModalOpen(true);
  };

  const handleQuickAction = (task: Task, newStatus: Task['status']) => {
    updateTask(task.id, { status: newStatus, isBlocked: false, blockedReason: undefined });
    toast.success(`Task moved to ${newStatus.replace('-', ' ')}`);
  };

  const GreetingIcon = getGreetingIcon();
  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="space-y-6">
      {/* ── Workspace Header ────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative">
        <GlassCard className="p-6" glow="cyan">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <GreetingIcon className="h-6 w-6 text-amber-400" />
                <span>{getGreeting()}, </span>
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">{firstName}</span>
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="text-right">
              {dueTodayCount > 0 ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                  <Clock className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-medium text-amber-400">{dueTodayCount} task{dueTodayCount !== 1 ? 's' : ''} due today</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400">All clear for today!</span>
                </div>
              )}
              {overdueTasks.length > 0 && (
                <p className="text-xs text-rose-400 mt-1">{overdueTasks.length} overdue</p>
              )}
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ── Stats Row ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <StatCard title="Assigned to Me" value={taskStats.assigned} icon={ListTodo} color="cyan" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <StatCard title="In Progress" value={taskStats.inProgress} icon={Clock} color="amber" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <StatCard title="Completed This Week" value={taskStats.completedWeek} icon={CheckCircle2} color="emerald" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <StatCard title="Overdue" value={taskStats.overdue} icon={AlertTriangle} color="rose" />
        </motion.div>
      </div>

      {/* ── View Tabs ───────────────────────────────────────── */}
      <Tabs value={viewMode} onValueChange={setViewMode}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList className="bg-black/[0.03] dark:bg-white/[0.05]">
            <TabsTrigger value="board" className="gap-1.5"><LayoutGrid className="h-3.5 w-3.5" /> Board</TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5"><List className="h-3.5 w-3.5" /> List</TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Calendar</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" className="gap-2 border-rose-500/20 text-rose-400 hover:bg-rose-500/10" onClick={() => { setBlockerTaskId(null); setBlockerReason(''); setBlockerModalOpen(true); }}>
            <Flag className="h-3.5 w-3.5" /> Report Blocker
          </Button>
        </div>

        {/* ── Board View ────────────────────────────────────── */}
        <TabsContent value="board">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
            {STATUS_COLUMNS.map((col, colIdx) => {
              const colTasks = myTasks.filter(t => t.status === col.key);
              return (
                <motion.div key={col.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: colIdx * 0.05 }}>
                  <GlassCard className="p-3">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold">{col.label}</h4>
                      <Badge variant="outline" className="text-[10px] border-black/[0.1] dark:border-white/[0.1]">{colTasks.length}</Badge>
                    </div>
                    <ScrollArea className="max-h-[400px]">
                      <div className="space-y-2">
                        <AnimatePresence>
                          {colTasks.map((task) => (
                            <motion.div
                              key={task.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className={cn(
                                "p-3 rounded-lg border-l-2 cursor-pointer transition-all hover:bg-black/[0.03] dark:hover:bg-white/[0.05]",
                                PRIORITY_BORDER[task.priority] || 'border-l-slate-400',
                                task.status === 'blocked' && "border-l-rose-400 bg-rose-500/[0.03]",
                              )}
                              onClick={() => openTaskDetail(task)}
                            >
                              <p className="text-sm font-medium truncate mb-1.5">{task.title}</p>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <StatusBadge status={task.priority} />
                                {task.dueDate && (
                                  <span className={cn('text-[10px] flex items-center gap-0.5',
                                    isOverdue(task) ? 'text-rose-400 font-medium' : 'text-muted-foreground'
                                  )}>
                                    <Clock className="h-2.5 w-2.5" /> {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                                {task.teamName && (
                                  <Badge variant="outline" className="text-[8px] h-4 px-1 border-cyan-500/20 text-cyan-400">
                                    {task.teamName}
                                  </Badge>
                                )}
                                {(task.commentCount ?? 0) > 0 && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                    <MessageSquare className="h-2.5 w-2.5" /> {task.commentCount}
                                  </span>
                                )}
                              </div>
                              {/* Quick actions */}
                              {task.status === 'todo' && (
                                <Button size="sm" variant="ghost" className="mt-2 h-6 text-[10px] gap-1 text-emerald-400 hover:bg-emerald-500/10 w-full" onClick={(e) => { e.stopPropagation(); handleQuickAction(task, 'in-progress'); }}>
                                  <Play className="h-3 w-3" /> Start
                                </Button>
                              )}
                              {task.status === 'in-progress' && (
                                <Button size="sm" variant="ghost" className="mt-2 h-6 text-[10px] gap-1 text-cyan-400 hover:bg-cyan-500/10 w-full" onClick={(e) => { e.stopPropagation(); handleQuickAction(task, 'in-review'); }}>
                                  <Eye className="h-3 w-3" /> Submit
                                </Button>
                              )}
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        {colTasks.length === 0 && (
                          <p className="text-xs text-muted-foreground/50 text-center py-4">No tasks</p>
                        )}
                      </div>
                    </ScrollArea>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        {/* ── List View ─────────────────────────────────────── */}
        <TabsContent value="list">
          <GlassCard className="p-4 mt-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Input
                placeholder="Search tasks..."
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                className="max-w-[200px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-sm"
              />
              <Select value={listFilter} onValueChange={setListFilter}>
                <SelectTrigger className="w-[130px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="in-review">In Review</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
              <Select value={listPriority} onValueChange={setListPriority}>
                <SelectTrigger className="w-[130px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-sm"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={listSort} onValueChange={setListSort}>
                <SelectTrigger className="w-[130px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-sm"><SelectValue placeholder="Sort by" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dueDate">Due Date</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* List */}
            <div className="space-y-1">
              <AnimatePresence>
                {filteredListTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border-l-2 cursor-pointer transition-all group",
                      PRIORITY_BORDER[task.priority] || 'border-l-slate-400',
                      "bg-black/[0.01] dark:bg-white/[0.02] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]",
                      task.status === 'blocked' && "border-l-rose-400 bg-rose-500/[0.03]",
                    )}
                    onClick={() => openTaskDetail(task)}
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-3">
                      <p className="text-sm font-medium truncate group-hover:text-cyan-400 transition-colors">{task.title}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <StatusBadge status={task.status} />
                      <StatusBadge status={task.priority} />
                      {task.dueDate && (
                        <span className={cn('text-[10px] text-muted-foreground flex items-center gap-1',
                          isOverdue(task) && 'text-rose-400 font-medium'
                        )}>
                          <Calendar className="h-3 w-3" /> {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      {task.teamName && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-cyan-500/20 text-cyan-400">
                          {task.teamName}
                        </Badge>
                      )}
                      {task.status !== 'done' && task.status !== 'blocked' && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); openBlockerModal(task.id); }}>
                          <Flag className="h-3 w-3" />
                        </Button>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-cyan-400 transition-colors" />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {filteredListTasks.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No tasks match your filters</p>
                </div>
              )}
            </div>
          </GlassCard>
        </TabsContent>

        {/* ── Calendar View ─────────────────────────────────── */}
        <TabsContent value="calendar">
          <GlassCard className="p-4 mt-4">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon" onClick={() => {
                if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1); }
                else setCalendarMonth(m => m - 1);
              }}><ChevronLeft className="h-4 w-4" /></Button>
              <h4 className="text-sm font-semibold">{MONTHS[calendarMonth]} {calendarYear}</h4>
              <Button variant="ghost" size="icon" onClick={() => {
                if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1); }
                else setCalendarMonth(m => m + 1);
              }}><ChevronRight className="h-4 w-4" /></Button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                if (day === null) return <div key={`empty-${i}`} className="h-20" />;
                const dayTasks = tasksForDay(day);
                const isToday = day === new Date().getDate() && calendarMonth === new Date().getMonth() && calendarYear === new Date().getFullYear();
                const hasOverdue = dayTasks.some(t => isOverdue(t));

                return (
                  <motion.div
                    key={day}
                    className={cn(
                      "h-20 p-1 rounded-lg border border-black/[0.06] dark:border-white/[0.05] cursor-pointer transition-all hover:bg-black/[0.03] dark:hover:bg-white/[0.05] overflow-hidden",
                      isToday && "border-cyan-500/30 bg-cyan-500/[0.05]",
                      selectedDay === day && "border-emerald-500/30 bg-emerald-500/[0.05]",
                    )}
                    onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                    whileHover={{ scale: 1.02 }}
                  >
                    <span className={cn(
                      'text-[10px] font-medium',
                      isToday ? 'text-cyan-400' : 'text-muted-foreground',
                    )}>{day}</span>
                    <div className="mt-0.5 space-y-0.5">
                      {dayTasks.slice(0, 2).map(t => (
                        <div key={t.id} className={cn(
                          'text-[8px] px-1 py-0.5 rounded truncate',
                          isOverdue(t) ? 'bg-rose-500/20 text-rose-400' :
                          isDueToday(t.dueDate) ? 'bg-amber-500/20 text-amber-400' :
                          'bg-cyan-500/15 text-cyan-400',
                        )} onClick={(e) => { e.stopPropagation(); openTaskDetail(t); }}>
                          {t.title}
                        </div>
                      ))}
                      {dayTasks.length > 2 && (
                        <div className="text-[8px] text-muted-foreground text-center">+{dayTasks.length - 2} more</div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Selected day detail */}
            <AnimatePresence>
              {selectedDay !== null && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 overflow-hidden"
                >
                  <Separator className="mb-3 bg-black/[0.03] dark:bg-white/[0.05]" />
                  <h5 className="text-sm font-semibold mb-2">
                    {MONTHS[calendarMonth]} {selectedDay}, {calendarYear}
                    <Badge variant="outline" className="ml-2 text-[10px] border-black/[0.1] dark:border-white/[0.1]">{tasksForDay(selectedDay).length} task{tasksForDay(selectedDay).length !== 1 ? 's' : ''}</Badge>
                  </h5>
                  {tasksForDay(selectedDay).length > 0 ? (
                    <div className="space-y-2">
                      {tasksForDay(selectedDay).map(t => (
                        <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-all"
                          onClick={() => openTaskDetail(t)}>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={t.status} />
                            <StatusBadge status={t.priority} />
                            <span className="text-sm">{t.title}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No tasks for this day</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </TabsContent>
      </Tabs>

      {/* ── Due Soon + Quick Actions Row ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Due Soon */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
          <GlassCard className="p-4" glow={dueSoonTasks.length > 0 || overdueTasks.length > 0 ? 'amber' : 'none'}>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" /> Due Soon
              {(dueSoonTasks.length + overdueTasks.length) > 0 && (
                <Badge variant="outline" className="text-[10px] border-amber-500/20 text-amber-400">{dueSoonTasks.length + overdueTasks.length}</Badge>
              )}
            </h3>
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {/* Overdue first */}
                {overdueTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-rose-500/[0.05] border border-rose-500/10 cursor-pointer hover:bg-rose-500/10 transition-all"
                    onClick={() => openTaskDetail(task)}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-rose-400 font-medium flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Overdue
                        </span>
                        <StatusBadge status={task.priority} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {task.status === 'todo' && (
                        <Button size="sm" className="h-7 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-500" onClick={(e) => { e.stopPropagation(); handleQuickAction(task, 'in-progress'); }}>
                          <Play className="h-3 w-3" /> Start
                        </Button>
                      )}
                      {task.status === 'in-progress' && (
                        <Button size="sm" className="h-7 text-[10px] gap-1 bg-cyan-600 hover:bg-cyan-500" onClick={(e) => { e.stopPropagation(); handleQuickAction(task, 'in-review'); }}>
                          <Eye className="h-3 w-3" /> Submit
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {/* Due soon */}
                {dueSoonTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-500/[0.03] border border-amber-500/10 cursor-pointer hover:bg-amber-500/[0.06] transition-all"
                    onClick={() => openTaskDetail(task)}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-amber-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatDueCountdown(task.dueDate)}
                        </span>
                        <StatusBadge status={task.priority} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {task.status === 'todo' && (
                        <Button size="sm" className="h-7 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-500" onClick={(e) => { e.stopPropagation(); handleQuickAction(task, 'in-progress'); }}>
                          <Play className="h-3 w-3" /> Start
                        </Button>
                      )}
                      {task.status === 'in-progress' && (
                        <Button size="sm" className="h-7 text-[10px] gap-1 bg-cyan-600 hover:bg-cyan-500" onClick={(e) => { e.stopPropagation(); handleQuickAction(task, 'in-review'); }}>
                          <Eye className="h-3 w-3" /> Submit
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {dueSoonTasks.length === 0 && overdueTasks.length === 0 && (
                  <div className="text-center py-4">
                    <CheckCircle className="h-6 w-6 text-emerald-400 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Nothing due soon — you&apos;re on track!</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </GlassCard>
        </motion.div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <GlassCard className="p-4 h-full">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-cyan-400" /> Quick Actions
            </h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full gap-2 border-rose-500/20 text-rose-400 hover:bg-rose-500/10 justify-start text-sm" onClick={() => { setBlockerTaskId(null); setBlockerReason(''); setBlockerModalOpen(true); }}>
                <Flag className="h-4 w-4" /> Report Blocker
              </Button>

              <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Flame className="h-3 w-3 text-amber-400" /> My Activity
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-center">
                    <p className="text-lg font-bold text-emerald-400">{taskStats.completedWeek}</p>
                    <p className="text-[10px] text-muted-foreground">This Week</p>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/10 text-center">
                    <p className="text-lg font-bold text-amber-400">{completionStreak}</p>
                    <p className="text-[10px] text-muted-foreground">Streak</p>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* ── Recently Completed ──────────────────────────────── */}
      {recentlyCompleted.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-3 cursor-pointer" onClick={() => setCompletedCollapsed(!completedCollapsed)}>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Recently Completed
                <Badge variant="outline" className="text-[10px] border-emerald-500/20 text-emerald-400">{recentlyCompleted.length}</Badge>
              </h3>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                {completedCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </div>
            <AnimatePresence>
              {!completedCollapsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2">
                    {recentlyCompleted.map(task => (
                      <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/[0.03] border border-emerald-500/10 cursor-pointer hover:bg-emerald-500/[0.06] transition-all"
                        onClick={() => openTaskDetail(task)}>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                          <span className="text-sm line-through text-muted-foreground">{task.title}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {task.completedAt ? new Date(task.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </motion.div>
      )}

      {/* ── Blocker Report Dialog ────────────────────────────── */}
      <Dialog open={blockerModalOpen} onOpenChange={setBlockerModalOpen}>
        <DialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-rose-400" /> Report Blocker
            </DialogTitle>
            <DialogDescription>
              Describe what is preventing you from completing this task. Your manager will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Select value={blockerTaskId || ''} onValueChange={setBlockerTaskId}>
              <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                <SelectValue placeholder="Select a task..." />
              </SelectTrigger>
              <SelectContent>
                {myTasks.filter(t => t.status !== 'done' && t.status !== 'blocked').map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={blockerReason}
              onChange={(e) => setBlockerReason(e.target.value)}
              placeholder="Describe the blocker..."
              className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockerModalOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleReportBlocker} className="bg-rose-600 hover:bg-rose-500 gap-2">
              <AlertTriangle className="h-4 w-4" /> Report Blocker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Task Detail Sheet ────────────────────────────────── */}
      <TaskDetailSheet task={selectedTask} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
