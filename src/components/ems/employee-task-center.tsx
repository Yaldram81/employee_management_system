'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun, Coffee, Moon, Plus, AlertTriangle, Download, List, LayoutGrid,
  Calendar, GitBranch, Search, Filter, SortAsc, ChevronLeft, ChevronRight,
  Clock, MessageSquare, Play, Send, CheckCircle2, AlertOctagon, XCircle,
  Eye, ArrowRight, GripVertical, Tag, User, Timer, FileText, ArrowUpRight,
  ChevronDown, MoreHorizontal, CheckSquare, Square, Trash2, Activity,
  X, Flag, CalendarDays, Users, BarChart3, Sparkles, Paperclip,
  TrendingUp, TrendingDown, Target, Zap, ArrowUp, ArrowDown, Minus,
  PieChart, LineChart as LineChartIcon, Gauge, RotateCcw, CircleDot,
  Layers, Hourglass, Award, Flame, Server
} from 'lucide-react';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { StatusBadge } from './status-badge';
import { cn } from '@/lib/utils';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  formatDate, formatDateShort, formatDateTime,
  getInitials, fadeIn, ProgressRing,
  isOverdue,
} from './shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import type { Task, TaskComment } from '@/lib/types';

// ─── Types ───────────────────────────────────────────────────────────────────
type TabKey = 'my-tasks' | 'team-tasks' | 'watched' | 'activity' | 'analytics';
type ViewMode = 'board' | 'list' | 'calendar' | 'timeline';
type SortField = 'dueDate' | 'priority' | 'status' | 'createdAt' | 'age' | 'assignee';

interface TimeLogEntry {
  id: string;
  taskId: string;
  hours: number;
  description: string;
  loggedAt: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const STATUS_COLUMNS: { key: Task['status']; label: string; color: string; icon: React.ReactNode }[] = [
  { key: 'todo', label: 'To Do', color: 'border-l-slate-400', icon: <List className="h-3.5 w-3.5 text-slate-400" /> },
  { key: 'in-progress', label: 'In Progress', color: 'border-l-amber-400', icon: <Play className="h-3.5 w-3.5 text-amber-400" /> },
  { key: 'in-review', label: 'In Review', color: 'border-l-cyan-400', icon: <Eye className="h-3.5 w-3.5 text-cyan-400" /> },
  { key: 'blocked', label: 'Blocked', color: 'border-l-rose-400', icon: <AlertOctagon className="h-3.5 w-3.5 text-rose-400" /> },
  { key: 'done', label: 'Done', color: 'border-l-emerald-400', icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> },
];

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  low: { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-l-slate-400' },
  medium: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-l-cyan-400' },
  high: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-l-amber-400' },
  urgent: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-l-rose-400' },
};

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

const STATUS_ORDER: Record<string, number> = { 'in-progress': 0, 'in-review': 1, 'todo': 2, 'blocked': 3, 'done': 4 };

const TAB_CONFIG: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'my-tasks', label: 'My Tasks', icon: <List className="h-4 w-4" /> },
  { key: 'team-tasks', label: 'Team Tasks', icon: <Users className="h-4 w-4" /> },
  { key: 'watched', label: 'Watched', icon: <Eye className="h-4 w-4" /> },
  { key: 'activity', label: 'Activity', icon: <Activity className="h-4 w-4" /> },
  { key: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
];

const STATUS_PROGRESSION = ['todo', 'in-progress', 'in-review', 'done'];

const SLA_CONFIG: Record<string, { days: number; color: string; bg: string; label: string }> = {
  urgent: { days: 1, color: 'text-rose-400', bg: 'bg-rose-500/20', label: '1 Day' },
  high: { days: 3, color: 'text-amber-400', bg: 'bg-amber-500/20', label: '3 Days' },
  medium: { days: 7, color: 'text-cyan-400', bg: 'bg-cyan-500/20', label: '7 Days' },
  low: { days: 14, color: 'text-slate-400', bg: 'bg-slate-500/20', label: '14 Days' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
// formatDate, formatDateShort, formatDateTime, getInitials imported from ./shared

function getGreeting(): { text: string; icon: React.ReactNode } {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good Morning', icon: <Sun className="h-5 w-5 text-amber-400" /> };
  if (h < 17) return { text: 'Good Afternoon', icon: <Coffee className="h-5 w-5 text-cyan-400" /> };
  return { text: 'Good Evening', icon: <Moon className="h-5 w-5 text-violet-400" /> };
}

// isOverdue imported from ./shared

function isDueToday(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') return false;
  return new Date(task.dueDate).toDateString() === new Date().toDateString();
}

function getDaysUntilDue(task: Task): number | null {
  if (!task.dueDate) return null;
  const diff = new Date(task.dueDate).getTime() - new Date(new Date().toDateString()).getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getTaskAge(task: Task): number {
  return Math.floor((Date.now() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24));
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
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

// ─── Live Clock Component (task-specific — includes Clock icon) ───────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Clock className="h-3.5 w-3.5 text-cyan-400" />
      <span className="font-mono tabular-nums">
        {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    </div>
  );
}

// ─── Productivity Score Ring ─────────────────────────────────────────────────
function ProductivityScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const radius = (size - 6) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#06b6d4' : score >= 40 ? '#f59e0b' : '#f43f5e';

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--svg-track)" strokeWidth={4} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-700 ease-out" />
      </svg>
      <span className="absolute text-xs font-bold text-foreground">{score}%</span>
    </div>
  );
}

// ─── Fade In Animation (imported from ./shared) ─────────────────────────────

// ─── Progress Ring (imported from ./shared) ──────────────────────────────────

// ─── SVG Bar Chart ───────────────────────────────────────────────────────────
function SVGBarChart({ data, labels, color = '#06b6d4', height = 180 }: {
  data: number[]; labels: string[]; color?: string; height?: number
}) {
  const max = Math.max(...data, 1);
  const width = 400;
  const barWidth = Math.max(12, (width - 40) / data.length - 8);
  const chartH = height - 30;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: height }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(pct => (
        <line key={pct} x1={30} y1={chartH * (1 - pct) + 5} x2={width - 10} y2={chartH * (1 - pct) + 5}
          stroke="var(--svg-grid)" strokeWidth={1} />
      ))}
      {/* Bars */}
      {data.map((v, i) => {
        const x = 35 + i * ((width - 50) / data.length);
        const barH = (v / max) * (chartH - 15);
        return (
          <g key={i}>
            <rect x={x} y={chartH - barH + 5} width={barWidth} height={barH}
              rx={3} fill={color} opacity={0.7} className="transition-all duration-300 hover:opacity-100" />
            <text x={x + barWidth / 2} y={height - 2} textAnchor="middle" fill="var(--svg-text)" fontSize={9}>
              {labels[i]}
            </text>
            {v > 0 && (
              <text x={x + barWidth / 2} y={chartH - barH} textAnchor="middle" fill="var(--svg-text)" fontSize={9}>
                {v}
              </text>
            )}
          </g>
        );
      })}
      {/* Y axis labels */}
      {[0, Math.round(max / 2), max].map((v, i) => (
        <text key={i} x={25} y={chartH - (v / max) * (chartH - 15) + 8} textAnchor="end" fill="var(--svg-text-dim)" fontSize={8}>
          {v}
        </text>
      ))}
    </svg>
  );
}

// ─── SVG Donut Chart ─────────────────────────────────────────────────────────
function SVGDonutChart({ segments, size = 180 }: {
  segments: { label: string; value: number; color: string }[]; size?: number
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 8;
  const innerR = outerR * 0.6;

  // Precompute arc paths to avoid mutation during render
  const arcPaths = segments.reduce<Array<{ path: string; color: string }>>((acc, seg, i) => {
    const prevEnd = i === 0 ? 0 : acc[i - 1]._endAngle;
    const angle = (seg.value / total) * 360;
    const endAngle = prevEnd + angle;
    const startRad = ((prevEnd - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;
    const largeArc = angle > 180 ? 1 : 0;
    const x1 = cx + outerR * Math.cos(startRad);
    const y1 = cy + outerR * Math.sin(startRad);
    const x2 = cx + outerR * Math.cos(endRad);
    const y2 = cy + outerR * Math.sin(endRad);
    const ix1 = cx + innerR * Math.cos(endRad);
    const iy1 = cy + innerR * Math.sin(endRad);
    const ix2 = cx + innerR * Math.cos(startRad);
    const iy2 = cy + innerR * Math.sin(startRad);
    const path = seg.value === 0 ? '' : `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;
    acc.push({ path, color: seg.color, _endAngle: endAngle } as any);
    return acc;
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {arcPaths.map((arc, i) => (
          <path key={i} d={arc.path} fill={arc.color} opacity={0.8} className="transition-opacity hover:opacity-100" />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--svg-fill-text)" fontSize={18} fontWeight="bold">{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--svg-text)" fontSize={9}>Tasks</text>
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-muted-foreground">{seg.label}</span>
            <span className="text-foreground font-medium">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SVG Velocity Line Chart ─────────────────────────────────────────────────
function SVGVelocityChart({ data, labels, height = 160 }: {
  data: number[]; labels: string[]; height?: number
}) {
  const max = Math.max(...data, 1);
  const width = 400;
  const chartH = height - 25;
  const padX = 30;

  const points = data.map((v, i) => ({
    x: padX + (i / (data.length - 1 || 1)) * (width - padX - 10),
    y: chartH - (v / max) * (chartH - 15) + 5,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const fillD = pathD + ` L ${points[points.length - 1].x} ${chartH + 5} L ${points[0].x} ${chartH + 5} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: height }}>
      {/* Grid */}
      {[0, 0.5, 1].map(pct => (
        <line key={pct} x1={padX} y1={chartH * (1 - pct) + 5} x2={width - 10} y2={chartH * (1 - pct) + 5}
          stroke="var(--svg-grid)" strokeWidth={1} />
      ))}
      {/* Area fill */}
      <path d={fillD} fill="var(--svg-area)" />
      {/* Line */}
      <path d={pathD} fill="none" stroke="#06b6d4" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="#06b6d4" stroke="#0e7490" strokeWidth={1} />
      ))}
      {/* Labels */}
      {labels.map((l, i) => (
        <text key={i} x={points[i]?.x ?? 0} y={height - 2} textAnchor="middle" fill="var(--svg-text)" fontSize={8}>
          {l}
        </text>
      ))}
      {/* Y axis */}
      {[0, max].map((v, i) => (
        <text key={i} x={padX - 4} y={chartH - (v / max) * (chartH - 15) + 9} textAnchor="end" fill="var(--svg-text-dim)" fontSize={8}>
          {v}
        </text>
      ))}
    </svg>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function EmployeeTaskCenter() {
  const { user, tasks, teams, users, updateTask, loadTaskComments, addTaskComment, taskComments, setActiveView, setSelectedTaskId, createTask, taskTemplates, loadTaskTemplates } = useEMSStore();

  // Tab & view state
  const [activeTab, setActiveTab] = useState<TabKey>('my-tasks');
  const [viewMode, setViewMode] = useState<ViewMode>('board');

  // Mobile-first: default to list view on small screens
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setViewMode('list');
    }
  }, []);

  // Dialogs
  const [blockerDialogOpen, setBlockerDialogOpen] = useState(false);
  const [timeLogDialogOpen, setTimeLogDialogOpen] = useState(false);
  const [timeLogTaskId, setTimeLogTaskId] = useState<string | null>(null);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);

  // Bulk select
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  // Blocker form
  const [blockerForm, setBlockerForm] = useState({ taskId: '', reason: '' });

  // Time log form
  const [timeLogForm, setTimeLogForm] = useState({ hours: 1, description: '' });

  // Local time logs
  const [timeLogs, setTimeLogs] = useState<TimeLogEntry[]>([]);

  // Team member filter for team tasks tab
  const [teamMemberFilter, setTeamMemberFilter] = useState<string>('all');

  // ─── Board View State ─────────────────────────────────────────────────────
  // Active timers for tasks in "in-progress" status
  const [activeTimers, setActiveTimers] = useState<Record<string, { startedAt: number; elapsed: number }>>({});

  // Timer display tick counter (forces re-render every second)
  const [timerTick, setTimerTick] = useState(0);

  // Task dependencies (lazy-loaded)
  const [taskDependencies, setTaskDependencies] = useState<Record<string, { dependsOn: Array<{ id: string; title: string; status: string }> }>>({});
  const [depsLoading, setDepsLoading] = useState<Record<string, boolean>>({});

  // Template dialog
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  // Add task dialog (per-column quick add)
  const [addTaskDialogOpen, setAddTaskDialogOpen] = useState(false);
  const [addTaskStatus, setAddTaskStatus] = useState<Task['status']>('todo');
  const [addTaskForm, setAddTaskForm] = useState({ title: '', priority: 'medium' as Task['priority'], dueDate: '' });

  // Add dependency dialog
  const [depDialogOpen, setDepDialogOpen] = useState(false);
  const [depDialogTaskId, setDepDialogTaskId] = useState<string | null>(null);
  const [depDialogSearch, setDepDialogSearch] = useState('');
  const [selectedDepId, setSelectedDepId] = useState<string>('');

  // DnD state
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  // Completion celebration state
  const [celebratingTaskId, setCelebratingTaskId] = useState<string | null>(null);

  // ─── Derived Data ─────────────────────────────────────────────────────────
  const myTasks = useMemo(() => {
    if (!user) return [];
    return tasks.filter(t => t.assigneeId === user.id);
  }, [tasks, user]);

  const userTeamIds = useMemo(() => {
    if (!user) return new Set<string>();
    const teamIds = new Set<string>();
    teams.forEach(team => {
      const isMember = team.members?.some(m => m.userId === user.id);
      if (isMember) teamIds.add(team.id);
    });
    return teamIds;
  }, [teams, user]);

  const teamMemberUserIds = useMemo(() => {
    if (!user) return new Set<string>();
    const userIds = new Set<string>();
    teams.forEach(team => {
      if (userTeamIds.has(team.id)) {
        team.members?.forEach(m => {
          if (m.userId !== user.id) userIds.add(m.userId);
        });
      }
    });
    return userIds;
  }, [teams, userTeamIds, user]);

  const teamTasks = useMemo(() => {
    return tasks.filter(t => teamMemberUserIds.has(t.assigneeId || '') && t.assigneeId !== user?.id);
  }, [tasks, teamMemberUserIds, user]);

  const watchedTasks = useMemo(() => {
    if (!user) return [];
    return tasks.filter(t => t.reporterId === user.id && t.assigneeId !== user.id);
  }, [tasks, user]);

  // Stats (enhanced)
  const stats = useMemo(() => {
    const inProgress = myTasks.filter(t => t.status === 'in-progress').length;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const completedThisWeek = myTasks.filter(t => t.status === 'done' && t.completedAt && new Date(t.completedAt) >= weekAgo).length;
    const overdue = myTasks.filter(isOverdue).length;
    const dueToday = myTasks.filter(isDueToday).length;
    const blocked = myTasks.filter(t => t.isBlocked || t.status === 'blocked').length;
    const completed = myTasks.filter(t => t.status === 'done').length;
    const completionRate = myTasks.length > 0 ? Math.round((completed / myTasks.length) * 100) : 0;
    const avgAge = myTasks.length > 0 ? Math.round(myTasks.reduce((s, t) => s + getTaskAge(t), 0) / myTasks.length) : 0;
    const totalHours = timeLogs.filter(l => myTasks.some(t => t.id === l.taskId)).reduce((s, l) => s + l.hours, 0);
    return { total: myTasks.length, inProgress, completedThisWeek, overdue, dueToday, blocked, completed, completionRate, avgAge, totalHours };
  }, [myTasks, timeLogs]);

  // Productivity score
  const productivityScore = useMemo(() => {
    if (myTasks.length === 0) return 0;
    const completionWeight = stats.completionRate * 0.4;
    const onTimeWeight = myTasks.length > 0 ? Math.max(0, (1 - stats.overdue / myTasks.length)) * 100 * 0.3 : 0;
    const velocityWeight = Math.min(100, stats.completedThisWeek * 20) * 0.2;
    const blockerWeight = myTasks.length > 0 ? Math.max(0, (1 - stats.blocked / myTasks.length)) * 100 * 0.1 : 0;
    return Math.round(completionWeight + onTimeWeight + velocityWeight + blockerWeight);
  }, [stats, myTasks]);

  // Weekly velocity data (last 8 weeks)
  const weeklyVelocityData = useMemo(() => {
    const now = new Date();
    const weeks: { label: string; completed: number; created: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i * 7 + now.getDay()) * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      const label = `W${8 - i}`;
      const completed = myTasks.filter(t => t.status === 'done' && t.completedAt &&
        new Date(t.completedAt) >= weekStart && new Date(t.completedAt) < weekEnd).length;
      const created = myTasks.filter(t =>
        new Date(t.createdAt) >= weekStart && new Date(t.createdAt) < weekEnd).length;
      weeks.push({ label, completed, created });
    }
    return weeks;
  }, [myTasks]);

  // Task status distribution for donut
  const statusDistribution = useMemo(() => [
    { label: 'To Do', value: myTasks.filter(t => t.status === 'todo').length, color: '#94a3b8' },
    { label: 'In Progress', value: myTasks.filter(t => t.status === 'in-progress').length, color: '#f59e0b' },
    { label: 'In Review', value: myTasks.filter(t => t.status === 'in-review').length, color: '#06b6d4' },
    { label: 'Blocked', value: myTasks.filter(t => t.status === 'blocked').length, color: '#f43f5e' },
    { label: 'Done', value: myTasks.filter(t => t.status === 'done').length, color: '#10b981' },
  ], [myTasks]);

  // Average cycle time (created → done)
  const avgCycleTime = useMemo(() => {
    const doneTasks = myTasks.filter(t => t.status === 'done' && t.completedAt);
    if (doneTasks.length === 0) return 0;
    const totalDays = doneTasks.reduce((s, t) => {
      return s + (new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    }, 0);
    return Math.round(totalDays / doneTasks.length * 10) / 10;
  }, [myTasks]);

  // Task aging analysis
  const agingAnalysis = useMemo(() => {
    const activeTasks = myTasks.filter(t => t.status !== 'done');
    const buckets = [
      { label: '0-2 days', count: 0, color: '#10b981' },
      { label: '3-5 days', count: 0, color: '#06b6d4' },
      { label: '6-10 days', count: 0, color: '#f59e0b' },
      { label: '11-20 days', count: 0, color: '#f97316' },
      { label: '20+ days', count: 0, color: '#f43f5e' },
    ];
    activeTasks.forEach(t => {
      const age = getTaskAge(t);
      if (age <= 2) buckets[0].count++;
      else if (age <= 5) buckets[1].count++;
      else if (age <= 10) buckets[2].count++;
      else if (age <= 20) buckets[3].count++;
      else buckets[4].count++;
    });
    return buckets;
  }, [myTasks]);

  // Burndown data
  const burndownData = useMemo(() => {
    const total = myTasks.length;
    const done = myTasks.filter(t => t.status === 'done').length;
    const remaining = total - done;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, remaining, pct };
  }, [myTasks]);

  // Filtered & sorted tasks (enhanced with more sort fields)
  const getFilteredTasks = useCallback((taskList: Task[]) => {
    let filtered = taskList;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') filtered = filtered.filter(t => t.status === statusFilter);
    if (priorityFilter !== 'all') filtered = filtered.filter(t => t.priority === priorityFilter);
    if (teamFilter !== 'all') filtered = filtered.filter(t => t.teamId === teamFilter);
    return filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'dueDate': cmp = (a.dueDate || '9999') < (b.dueDate || '9999') ? -1 : 1; break;
        case 'priority': cmp = (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3); break;
        case 'status': cmp = (STATUS_ORDER[a.status] ?? 5) - (STATUS_ORDER[b.status] ?? 5); break;
        case 'createdAt': cmp = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); break;
        case 'age': cmp = getTaskAge(b) - getTaskAge(a); break;
        case 'assignee': cmp = (a.assigneeName || '').localeCompare(b.assigneeName || ''); break;
        default: cmp = 0;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [searchQuery, statusFilter, priorityFilter, teamFilter, sortField, sortDir]);

  const currentTasks = useMemo(() => {
    if (activeTab === 'my-tasks') return getFilteredTasks(myTasks);
    if (activeTab === 'team-tasks') {
      let filtered = getFilteredTasks(teamTasks);
      if (teamMemberFilter !== 'all') filtered = filtered.filter(t => t.assigneeId === teamMemberFilter);
      return filtered;
    }
    if (activeTab === 'watched') return getFilteredTasks(watchedTasks);
    return [];
  }, [activeTab, myTasks, teamTasks, watchedTasks, getFilteredTasks, teamMemberFilter]);

  // ─── Activity Feed ────────────────────────────────────────────────────────
  const activityFeed = useMemo(() => {
    const allRelated = [...myTasks, ...teamTasks, ...watchedTasks];
    const seen = new Set<string>();
    const activities: Array<{ id: string; type: string; message: string; taskTitle: string; timestamp: string; color: string; icon: React.ReactNode }> = [];

    allRelated.forEach(t => {
      if (seen.has(t.id)) return;
      seen.add(t.id);

      if (t.completedAt) {
        activities.push({ id: `${t.id}-done`, type: 'completed', message: 'Task completed', taskTitle: t.title, timestamp: t.completedAt, color: 'text-emerald-400', icon: <CheckCircle2 className="h-3 w-3" /> });
      }
      if (t.isBlocked && t.blockedReason) {
        activities.push({ id: `${t.id}-blocked`, type: 'blocked', message: `Blocker reported: ${t.blockedReason}`, taskTitle: t.title, timestamp: t.createdAt, color: 'text-rose-400', icon: <AlertOctagon className="h-3 w-3" /> });
      }
      if (t.status === 'in-review') {
        activities.push({ id: `${t.id}-review`, type: 'review', message: 'Submitted for review', taskTitle: t.title, timestamp: t.createdAt, color: 'text-cyan-400', icon: <Eye className="h-3 w-3" /> });
      }
      if (t.status === 'in-progress') {
        activities.push({ id: `${t.id}-progress`, type: 'started', message: 'Work started', taskTitle: t.title, timestamp: t.createdAt, color: 'text-amber-400', icon: <Play className="h-3 w-3" /> });
      }
      if (isOverdue(t)) {
        activities.push({ id: `${t.id}-overdue`, type: 'overdue', message: 'Task is overdue', taskTitle: t.title, timestamp: t.dueDate || t.createdAt, color: 'text-rose-400', icon: <AlertTriangle className="h-3 w-3" /> });
      }
      activities.push({ id: `${t.id}-created`, type: 'created', message: 'Task created', taskTitle: t.title, timestamp: t.createdAt, color: 'text-slate-400', icon: <FileText className="h-3 w-3" /> });
    });

    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50);
  }, [myTasks, teamTasks, watchedTasks]);

  // ─── Calendar helpers ─────────────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
    const startPad = firstDay.getDay();
    const days: Array<{ date: Date; isCurrentMonth: boolean; dateStr: string }> = [];

    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(calendarYear, calendarMonth, -i);
      days.push({ date: d, isCurrentMonth: false, dateStr: d.toISOString().split('T')[0] });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(calendarYear, calendarMonth, d);
      days.push({ date, isCurrentMonth: true, dateStr: date.toISOString().split('T')[0] });
    }
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(calendarYear, calendarMonth + 1, d);
      days.push({ date, isCurrentMonth: false, dateStr: date.toISOString().split('T')[0] });
    }
    return days;
  }, [calendarYear, calendarMonth]);

  const tasksByDueDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    const allTasks = activeTab === 'my-tasks' ? myTasks : activeTab === 'team-tasks' ? teamTasks : watchedTasks;
    allTasks.forEach(t => {
      if (t.dueDate) {
        const key = new Date(t.dueDate).toISOString().split('T')[0];
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(t);
      }
    });
    return map;
  }, [myTasks, teamTasks, watchedTasks, activeTab]);

  // ─── Team overview for team tasks tab ──────────────────────────────────────
  const teamMembersOverview = useMemo(() => {
    const memberMap = new Map<string, { name: string; todo: number; inProgress: number; done: number; total: number }>();
    teamTasks.forEach(t => {
      if (!t.assigneeId || !t.assigneeName) return;
      if (!memberMap.has(t.assigneeId)) {
        memberMap.set(t.assigneeId, { name: t.assigneeName, todo: 0, inProgress: 0, done: 0, total: 0 });
      }
      const m = memberMap.get(t.assigneeId)!;
      m.total++;
      if (t.status === 'todo') m.todo++;
      else if (t.status === 'in-progress' || t.status === 'in-review') m.inProgress++;
      else if (t.status === 'done') m.done++;
    });
    return Array.from(memberMap.entries()).map(([id, data]) => ({ id, ...data }));
  }, [teamTasks]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleOpenDetail = useCallback((task: Task) => {
    setSelectedTaskId(task.id);
    setActiveView('task-detail');
  }, [setSelectedTaskId, setActiveView]);

  // ─── Board View: Timer Logic (must be before handleStatusChange) ──────────
  // Timer tick effect - update every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format elapsed milliseconds to HH:MM:SS
  const formatTimerDisplay = useCallback((ms: number): string => {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, []);

  // Get current timer display for a task
  const getTaskTimerDisplay = useCallback((taskId: string): string | null => {
    const timer = activeTimers[taskId];
    if (!timer) return null;
    const currentElapsed = timer.elapsed + (Date.now() - timer.startedAt);
    return formatTimerDisplay(currentElapsed);
  }, [activeTimers, timerTick, formatTimerDisplay]);

  // Start timer for a task
  const startTimer = useCallback((taskId: string) => {
    setActiveTimers(prev => {
      if (prev[taskId]) return prev; // already running
      return { ...prev, [taskId]: { startedAt: Date.now(), elapsed: 0 } };
    });
  }, []);

  // Stop timer for a task and log elapsed time
  const stopTimer = useCallback((taskId: string) => {
    setActiveTimers(prev => {
      const timer = prev[taskId];
      if (!timer) return prev;
      const totalElapsed = timer.elapsed + (Date.now() - timer.startedAt);
      const hours = Math.round((totalElapsed / (1000 * 60 * 60)) * 100) / 100;
      // Log the time
      const entry: TimeLogEntry = {
        id: `tl-auto-${Date.now()}`,
        taskId,
        hours,
        description: 'Auto-tracked time',
        loggedAt: new Date().toISOString(),
      };
      setTimeLogs(prevLogs => [...prevLogs, entry]);
      // Remove timer
      const { [taskId]: _, ...rest } = prev;
      return rest;
    });
  }, [formatTimerDisplay]);

  // ─── Board View: Confetti Celebration ────────────────────────────────────────
  const triggerConfetti = useCallback(async (element?: HTMLElement | null) => {
    try {
      const confetti = (await import('canvas-confetti')).default;
      const rect = element?.getBoundingClientRect();
      const x = rect ? (rect.left + rect.width / 2) / window.innerWidth : 0.5;
      const y = rect ? (rect.top + rect.height / 2) / window.innerHeight : 0.5;
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { x, y },
        colors: ['#10b981', '#06b6d4', '#f59e0b', '#8b5cf6', '#ec4899'],
        ticks: 60,
        gravity: 1.2,
        scalar: 0.9,
        shapes: ['circle', 'square'],
      });
    } catch {
      // confetti not available - silent fail
    }
  }, []);

  // ─── Board View: Dependency Loading ──────────────────────────────────────────
  const loadTaskDeps = useCallback(async (taskId: string) => {
    if (taskDependencies[taskId] || depsLoading[taskId]) return;
    setDepsLoading(prev => ({ ...prev, [taskId]: true }));
    try {
      const res = await fetch(`/api/task-dependencies?taskId=${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setTaskDependencies(prev => ({
          ...prev,
          [taskId]: { dependsOn: data.dependsOn || [] },
        }));
      } else {
        // If API doesn't exist yet, set empty deps
        setTaskDependencies(prev => ({
          ...prev,
          [taskId]: { dependsOn: [] },
        }));
      }
    } catch {
      setTaskDependencies(prev => ({
        ...prev,
        [taskId]: { dependsOn: [] },
      }));
    } finally {
      setDepsLoading(prev => ({ ...prev, [taskId]: false }));
    }
  }, [taskDependencies, depsLoading]);

  const handleStatusChange = useCallback(async (taskId: string, newStatus: Task['status'], cardElement?: HTMLElement | null) => {
    // Find the current task to check old status
    const currentTask = tasks.find(t => t.id === taskId);
    const oldStatus = currentTask?.status;

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
      await updateTask(taskId, updates);

      // Timer logic: auto-start when moving to in-progress, stop when leaving
      if (newStatus === 'in-progress') {
        startTimer(taskId);
      } else if (oldStatus === 'in-progress' && newStatus !== 'in-progress') {
        stopTimer(taskId);
      }

      // Confetti celebration when moving to done
      if (newStatus === 'done') {
        setCelebratingTaskId(taskId);
        triggerConfetti(cardElement);
        setTimeout(() => setCelebratingTaskId(null), 1500);
      }

      toast.success(`Task moved to ${newStatus.replace('-', ' ')}`);
    } catch {
      toast.error('Failed to update task');
    }
  }, [updateTask, tasks, startTimer, stopTimer, triggerConfetti]);

  const handleReportBlocker = useCallback(async () => {
    if (!blockerForm.taskId || !blockerForm.reason.trim()) {
      toast.error('Please select a task and provide a reason');
      return;
    }
    try {
      await updateTask(blockerForm.taskId, { isBlocked: true, blockedReason: blockerForm.reason, status: 'blocked' });
      setBlockerDialogOpen(false);
      setBlockerForm({ taskId: '', reason: '' });
      toast.success('Blocker reported');
    } catch {
      toast.error('Failed to report blocker');
    }
  }, [blockerForm, updateTask]);

  const handleLogTime = useCallback(() => {
    if (!timeLogTaskId || timeLogForm.hours <= 0) {
      toast.error('Please enter valid hours');
      return;
    }
    const entry: TimeLogEntry = {
      id: `tl-${Date.now()}`,
      taskId: timeLogTaskId,
      hours: timeLogForm.hours,
      description: timeLogForm.description,
      loggedAt: new Date().toISOString(),
    };
    setTimeLogs(prev => [...prev, entry]);
    setTimeLogDialogOpen(false);
    setTimeLogForm({ hours: 1, description: '' });
    setTimeLogTaskId(null);
    toast.success(`Logged ${timeLogForm.hours}h`);
  }, [timeLogTaskId, timeLogForm]);

  const handleExportCSV = useCallback(() => {
    const headers = ['Title', 'Status', 'Priority', 'Assignee', 'Team', 'Due Date', 'Created', 'Age (days)', 'SLA Status', 'Blocked'];
    const rows = currentTasks.map(t => {
      const sla = getSLAStatus(t);
      return [
        `"${t.title}"`, t.status, t.priority, t.assigneeName || '', t.teamName || '',
        t.dueDate ? formatDate(t.dueDate) : '', formatDate(t.createdAt), getTaskAge(t),
        sla.isBreached ? 'Breached' : sla.isAtRisk ? 'At Risk' : 'On Track',
        t.isBlocked ? 'Yes' : 'No',
      ];
    });
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  }, [currentTasks]);

  const handleBulkAction = useCallback(async (action: 'in-progress' | 'done' | 'blocked') => {
    try {
      await Promise.all(
        Array.from(selectedTaskIds).map(id => handleStatusChange(id, action))
      );
      setSelectedTaskIds(new Set());
      toast.success(`${selectedTaskIds.size} tasks updated`);
    } catch {
      toast.error('Bulk action failed');
    }
  }, [selectedTaskIds, handleStatusChange]);

  const handleAddComment = useCallback(async (taskId: string, comment: string) => {
    if (!comment.trim()) return;
    try {
      await addTaskComment(taskId, comment);
      toast.success('Comment added');
    } catch {
      toast.error('Failed to add comment');
    }
  }, [addTaskComment]);

  const [commentText, setCommentText] = useState('');

  // ─── Board View: Add Dependency ──────────────────────────────────────────────
  const handleAddDependency = useCallback(async (taskId: string, dependsOnId: string) => {
    try {
      await fetch('/api/task-dependencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, dependsOnId }),
      });
      // Invalidate and reload deps
      setTaskDependencies(prev => {
        const { [taskId]: _, ...rest } = prev;
        return rest;
      });
      loadTaskDeps(taskId);
      toast.success('Dependency added');
    } catch {
      toast.error('Failed to add dependency');
    }
  }, [loadTaskDeps]);

  // ─── Board View: Template Quick-Create ───────────────────────────────────────
  const handleCreateFromTemplate = useCallback(async (templateId: string) => {
    const template = taskTemplates.find(t => t.id === templateId);
    if (!template || !user) return;
    try {
      let taskItems: string[] = [];
      try {
        taskItems = JSON.parse(template.taskItems);
      } catch {
        taskItems = [template.taskItems];
      }
      // Create a task for each item in the template
      for (const item of taskItems) {
        await createTask({
          title: typeof item === 'string' ? item : (item as any).title || template.name,
          description: template.description || `Created from template: ${template.name}`,
          status: 'todo',
          priority: 'medium',
          assigneeId: user.id,
          assigneeName: user.name,
          reporterId: user.id,
          reporterName: user.name,
          isBlocked: false,
          tags: [template.category],
        });
      }
      setTemplateDialogOpen(false);
      toast.success(`Created ${taskItems.length} task${taskItems.length > 1 ? 's' : ''} from template`);
    } catch {
      toast.error('Failed to create task from template');
    }
  }, [taskTemplates, user, createTask]);

  // ─── Board View: Quick Add Task to Column ────────────────────────────────────
  const handleQuickAddTask = useCallback(async () => {
    if (!addTaskForm.title.trim() || !user) return;
    try {
      await createTask({
        title: addTaskForm.title.trim(),
        status: addTaskStatus,
        priority: addTaskForm.priority,
        dueDate: addTaskForm.dueDate || undefined,
        assigneeId: user.id,
        assigneeName: user.name,
        reporterId: user.id,
        reporterName: user.name,
        isBlocked: false,
      });
      setAddTaskDialogOpen(false);
      setAddTaskForm({ title: '', priority: 'medium', dueDate: '' });
      toast.success(`Task added to ${addTaskStatus.replace('-', ' ')}`);
    } catch {
      toast.error('Failed to create task');
    }
  }, [addTaskForm, addTaskStatus, user, createTask]);

  // Load templates on mount
  useEffect(() => {
    loadTaskTemplates();
  }, [loadTaskTemplates]);

  const greeting = getGreeting();

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    sortField === field ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <Minus className="h-3 w-3 opacity-30" />
  );

  // ─── Render: Workspace Header ──────────────────────────────────────────────
  const renderHeader = () => (
    <GlassCard className="p-4 sm:p-6 mb-6" glow="cyan">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-cyan-500/10 p-2.5">
            {greeting.icon}
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white">
              {greeting.text}, {user?.name?.split(' ')[0] || 'there'}
            </h1>
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <LiveClock />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Productivity Score */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1]">
            <ProductivityScoreRing score={productivityScore} size={36} />
            <div>
              <p className="text-[10px] text-muted-foreground">Productivity</p>
              <p className={cn('text-xs font-bold', productivityScore >= 80 ? 'text-emerald-400' : productivityScore >= 60 ? 'text-cyan-400' : productivityScore >= 40 ? 'text-amber-400' : 'text-rose-400')}>
                {productivityScore >= 80 ? 'Excellent' : productivityScore >= 60 ? 'Good' : productivityScore >= 40 ? 'Fair' : 'Needs Focus'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {stats.dueToday > 0 && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1">
                <CalendarDays className="h-3 w-3" />
                {stats.dueToday} due today
              </Badge>
            )}
            {stats.overdue > 0 && (
              <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 gap-1 animate-pulse">
                <AlertTriangle className="h-3 w-3" />
                {stats.overdue} overdue
              </Badge>
            )}

            <Button size="sm" variant="outline" className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 gap-1.5" onClick={() => setBlockerDialogOpen(true)}>
              <AlertOctagon className="h-3.5 w-3.5" /> Report Blocker
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handleExportCSV}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </div>
        </div>
      </div>

      {stats.overdue > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 flex items-center gap-2"
        >
          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
          <span className="text-sm text-rose-300">
            You have <strong>{stats.overdue}</strong> overdue task{stats.overdue > 1 ? 's' : ''} that need attention.
          </span>
        </motion.div>
      )}
    </GlassCard>
  );

  // ─── Render: Stat Cards ────────────────────────────────────────────────────
  const renderStatCards = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {/* Total Assigned */}
      <motion.div {...fadeIn} transition={{ delay: 0 }}>
        <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[130px]" hover glow="cyan">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-cyan-500/5" />
          <div className="flex items-start justify-between relative z-10">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Assigned</p>
              <p className="text-2xl font-bold text-cyan-400">{stats.total}</p>
              <p className="text-[10px] text-cyan-400/80">All your tasks</p>
            </div>
            <div className="relative flex items-center justify-center shrink-0">
              <ProgressRing value={stats.total} max={Math.max(stats.total, 1)} size={48} color="#06b6d4" />
              <span className="absolute text-[10px] font-bold text-cyan-400">100%</span>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* In Progress */}
      <motion.div {...fadeIn} transition={{ delay: 0.05 }}>
        <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[130px]" hover glow="amber">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-amber-500/5" />
          <div className="flex items-start justify-between relative z-10">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">In Progress</p>
              <p className="text-2xl font-bold text-amber-400">{stats.inProgress}</p>
              <p className="text-[10px] text-amber-400/80">Active work</p>
            </div>
            <div className="relative flex items-center justify-center shrink-0">
              <ProgressRing value={stats.inProgress} max={Math.max(stats.total, 1)} size={48} color="#f59e0b" />
              <span className="absolute text-[10px] font-bold text-amber-400">
                {stats.total > 0 ? Math.round((stats.inProgress / stats.total) * 100) : 0}%
              </span>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Completed */}
      <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
        <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[130px]" hover glow="emerald">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-emerald-500/5" />
          <div className="flex items-start justify-between relative z-10">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completed</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.completedThisWeek}</p>
              <p className="text-[10px] text-emerald-400/80">+this week</p>
            </div>
            <div className="relative flex items-center justify-center shrink-0">
              <ProgressRing value={stats.completedThisWeek} max={Math.max(stats.total, 1)} size={48} color="#10b981" />
              <span className="absolute text-[10px] font-bold text-emerald-400">
                {stats.total > 0 ? Math.round((stats.completedThisWeek / stats.total) * 100) : 0}%
              </span>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Overdue */}
      <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
        <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[130px]" hover glow="rose">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-rose-500/5" />
          {stats.overdue > 0 && (
            <div className="absolute inset-0 rounded-xl pointer-events-none">
              <div className="absolute inset-0 rounded-xl ring-2 ring-rose-500/20 animate-pulse" />
            </div>
          )}
          <div className="flex items-start justify-between relative z-10">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Overdue</p>
              <p className="text-2xl font-bold text-rose-400">{stats.overdue}</p>
              <p className="text-[10px] text-rose-400/80">Need attention</p>
            </div>
            <div className="relative flex items-center justify-center shrink-0">
              <ProgressRing value={stats.overdue} max={Math.max(stats.total, 1)} size={48} color="#f43f5e" />
              <span className="absolute text-[10px] font-bold text-rose-400">
                {stats.total > 0 ? Math.round((stats.overdue / stats.total) * 100) : 0}%
              </span>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Due Today */}
      <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
        <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[130px]" hover glow="amber">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-amber-500/5" />
          <div className="flex items-start justify-between relative z-10">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Due Today</p>
              <p className="text-2xl font-bold text-amber-400">{stats.dueToday}</p>
              <p className="text-[10px] text-amber-400/80">Today&apos;s deadline</p>
            </div>
            <div className="relative flex items-center justify-center shrink-0">
              <ProgressRing value={stats.dueToday} max={Math.max(stats.total, 1)} size={48} color="#f59e0b" />
              <span className="absolute text-[10px] font-bold text-amber-400">
                {stats.total > 0 ? Math.round((stats.dueToday / stats.total) * 100) : 0}%
              </span>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Blocked */}
      <motion.div {...fadeIn} transition={{ delay: 0.25 }}>
        <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[130px]" hover glow="rose">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-rose-500/5" />
          {stats.blocked > 0 && (
            <div className="absolute inset-0 rounded-xl pointer-events-none">
              <div className="absolute inset-0 rounded-xl ring-2 ring-rose-500/20 animate-pulse" />
            </div>
          )}
          <div className="flex items-start justify-between relative z-10">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Blocked</p>
              <p className="text-2xl font-bold text-rose-400">{stats.blocked}</p>
              <p className="text-[10px] text-rose-400/80">Waiting</p>
            </div>
            <div className="relative flex items-center justify-center shrink-0">
              <ProgressRing value={stats.blocked} max={Math.max(stats.total, 1)} size={48} color="#f43f5e" />
              <span className="absolute text-[10px] font-bold text-rose-400">
                {stats.total > 0 ? Math.round((stats.blocked / stats.total) * 100) : 0}%
              </span>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Completion Rate */}
      <motion.div {...fadeIn} transition={{ delay: 0.3 }}>
        <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[130px]" hover glow="emerald">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-emerald-500/5" />
          <div className="flex items-start justify-between relative z-10">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completion Rate</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.completionRate}%</p>
              <p className="text-[10px] text-emerald-400/80">Done / Total</p>
            </div>
            <div className="relative flex items-center justify-center shrink-0">
              <ProgressRing value={stats.completionRate} max={100} size={48} color="#10b981" />
              <span className="absolute text-[10px] font-bold text-emerald-400">{stats.completionRate}%</span>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Avg Task Age */}
      <motion.div {...fadeIn} transition={{ delay: 0.35 }}>
        <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[130px]" hover glow="cyan">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-cyan-500/5" />
          <div className="flex items-start justify-between relative z-10">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Task Age</p>
              <p className="text-2xl font-bold text-cyan-400">{stats.avgAge}d</p>
              <p className="text-[10px] text-cyan-400/80">Days since created</p>
            </div>
            <div className="relative flex items-center justify-center shrink-0">
              <ProgressRing value={stats.avgAge} max={Math.max(stats.avgAge * 2, 30)} size={48} color="#06b6d4" />
              <span className="absolute text-[10px] font-bold text-cyan-400">
                {Math.round((stats.avgAge / Math.max(stats.avgAge * 2, 30)) * 100)}%
              </span>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );

  // ─── Render: Tab Bar ───────────────────────────────────────────────────────
  const renderTabBar = () => (
    <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
      {TAB_CONFIG.map(tab => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
            activeTab === tab.key
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
              : 'text-muted-foreground hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.05] border border-transparent'
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.key === 'my-tasks' && myTasks.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-[10px] bg-cyan-500/20 text-cyan-400">
              {myTasks.length}
            </Badge>
          )}
        </button>
      ))}
    </div>
  );

  // ─── Render: View Mode Toggle & Filters ────────────────────────────────────
  const renderViewControls = () => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-1 bg-black/[0.03] dark:bg-white/[0.05] rounded-lg p-1">
        {([
          { key: 'board' as ViewMode, icon: <LayoutGrid className="h-4 w-4" />, label: 'Board' },
          { key: 'list' as ViewMode, icon: <List className="h-4 w-4" />, label: 'List' },
          { key: 'calendar' as ViewMode, icon: <Calendar className="h-4 w-4" />, label: 'Calendar' },
          { key: 'timeline' as ViewMode, icon: <GitBranch className="h-4 w-4" />, label: 'Timeline' },
        ]).map(v => (
          <button
            key={v.key}
            onClick={() => setViewMode(v.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              viewMode === v.key ? 'bg-black/[0.06] dark:bg-white/[0.1] text-white' : 'text-muted-foreground hover:text-white'
            )}
            aria-label={v.label}
          >
            {v.icon}
            <span className="hidden sm:inline">{v.label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 h-8 w-full sm:w-48 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-full sm:w-28 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="in-review">In Review</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-8 w-full sm:w-28 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortField} onValueChange={v => setSortField(v as SortField)}>
          <SelectTrigger className="h-8 w-full sm:w-28 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
            <SortAsc className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dueDate">Due Date</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="createdAt">Created</SelectItem>
            <SelectItem value="age">Age</SelectItem>
            <SelectItem value="assignee">Assignee</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  // ─── SLA Indicator for task cards ──────────────────────────────────────────
  const SLAIndicator = ({ task }: { task: Task }) => {
    const sla = getSLAStatus(task);
    if (task.status === 'done') return null;
    const config = SLA_CONFIG[task.priority];
    if (!config) return null;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium', config.bg, sla.isBreached ? 'text-rose-400' : sla.isAtRisk ? 'text-amber-400' : config.color)}>
            <Hourglass className="h-2.5 w-2.5" />
            {sla.isBreached ? 'SLA Breached' : sla.isAtRisk ? 'At Risk' : `${sla.daysRemaining}d left`}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">SLA: {config.label} | Progress: {Math.round(sla.pct)}%</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  // ─── Render: Board View ────────────────────────────────────────────────────
  // Status-to-glow mapping for task cards
  const statusGlowMap: Record<string, 'none' | 'amber' | 'cyan' | 'rose' | 'emerald'> = {
    'todo': 'none',
    'in-progress': 'amber',
    'in-review': 'cyan',
    'blocked': 'rose',
    'done': 'emerald',
  };

  // Status-to-icon config for task cards
  const statusIconMap: Record<string, { icon: React.ElementType; bg: string; text: string }> = {
    'todo': { icon: List, bg: 'bg-slate-500/10', text: 'text-slate-400' },
    'in-progress': { icon: Play, bg: 'bg-amber-500/10', text: 'text-amber-400' },
    'in-review': { icon: Eye, bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
    'blocked': { icon: AlertOctagon, bg: 'bg-rose-500/10', text: 'text-rose-400' },
    'done': { icon: CheckCircle2, bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  };

  // Priority-to-decorative-circle mapping
  const priorityCircleMap: Record<string, string> = {
    urgent: 'bg-rose-500/5',
    high: 'bg-amber-500/5',
    medium: 'bg-cyan-500/5',
    low: 'bg-slate-500/5',
  };

  // Priority-to-dot mapping
  const priorityDotMap: Record<string, string> = {
    urgent: 'bg-rose-500',
    high: 'bg-amber-500',
    medium: 'bg-cyan-500',
    low: 'bg-slate-500',
  };

  // Status chip colors for the filter row
  const statusChipColorMap: Record<string, string> = {
    all: 'bg-black/[0.06] dark:bg-white/[0.1] text-white border-black/[0.12] dark:border-white/[0.2]',
    todo: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    'in-progress': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'in-review': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    blocked: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    done: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  };

  // ─── Board View: Sortable Task Card Component ───────────────────────────────
  const BoardTaskCard = memo(({ task, isOverlay = false }: { task: Task; isOverlay?: boolean }) => {
    const iconConfig = statusIconMap[task.status] || statusIconMap['todo'];
    const StatusIcon = iconConfig.icon;
    const decorCircle = priorityCircleMap[task.priority] || 'bg-slate-500/5';
    const priorityDot = priorityDotMap[task.priority] || 'bg-slate-500';
    const overdue = isOverdue(task);
    const dueSoon = isDueToday(task);
    const daysUntil = getDaysUntilDue(task);
    const timerDisplay = getTaskTimerDisplay(task.id);
    const deps = taskDependencies[task.id];
    const isCelebrating = celebratingTaskId === task.id;
    const totalLoggedHours = timeLogs.filter(l => l.taskId === task.id).reduce((s, l) => s + l.hours, 0);

    // Lazy-load dependencies on first render
    useEffect(() => {
      if (!taskDependencies[task.id] && !depsLoading[task.id]) {
        loadTaskDeps(task.id);
      }
    }, [task.id]);

    const cardRef = useRef<HTMLDivElement>(null);

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: task.id,
      data: { task },
    });

    const style = !isOverlay ? {
      transform: CSS.Transform.toString(transform),
      transition,
    } : undefined;

    // Combine refs for non-overlay cards
    const combinedRef = !isOverlay ? (node: HTMLDivElement | null) => {
      setNodeRef(node);
      (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    } : undefined;

    return (
      <motion.div
        ref={combinedRef}
        style={style}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: isDragging && !isOverlay ? 0.4 : 1, y: 0, scale: isCelebrating ? 1.05 : 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: isCelebrating ? 0.3 : 0.2 }}
        className={cn(isOverlay && 'z-50 rotate-2')}
      >
        <GlassCard
          className={cn(
            'p-3 sm:p-4 relative overflow-hidden cursor-pointer group',
            overdue && 'ring-1 ring-rose-500/30',
            isCelebrating && 'ring-2 ring-emerald-400/60 shadow-lg shadow-emerald-500/20',
            isOverlay ? 'shadow-2xl shadow-black/40 min-w-[220px] sm:min-w-[260px]' : 'min-h-[120px]',
          )}
          hover={!isDragging}
          glow={statusGlowMap[task.status] || 'none'}
          onClick={() => !isDragging && !isOverlay && handleOpenDetail(task)}
        >
          {/* Decorative circle based on priority */}
          <div className={cn('absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-6 translate-x-6', decorCircle)} />

          {/* Celebration overlay */}
          {isCelebrating && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex items-center justify-center bg-emerald-500/20 rounded-xl"
            >
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/30 border border-emerald-400/40">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-300">Completed!</span>
              </div>
            </motion.div>
          )}

          {/* Drag handle */}
          {!isOverlay && (
            <div
              {...attributes}
              {...listeners}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-60 transition-opacity cursor-grab active:cursor-grabbing z-10"
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          )}

          <div className="relative z-10 space-y-1.5">
            {/* Top row: priority indicator + status icon + team badge + dep badge */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={cn('h-2 w-2 rounded-full shrink-0', priorityDot)} />
              <div className={cn('rounded-md p-1', iconConfig.bg, iconConfig.text)}>
                <StatusIcon className="h-3 w-3" />
              </div>
              {task.teamName && (
                <Badge variant="outline" className="h-4 text-[8px] px-1 bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                  {task.teamName}
                </Badge>
              )}
              {/* Dependency badge */}
              {deps && deps.dependsOn.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className={cn(
                        'h-4 text-[8px] px-1 gap-0.5 cursor-default',
                        deps.dependsOn.some(d => d.status !== 'done')
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      )}
                    >
                      <GitBranch className="h-2.5 w-2.5" />
                      {deps.dependsOn.length}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px]">
                    <p className="text-xs font-medium mb-1">Dependencies</p>
                    {deps.dependsOn.map((dep, i) => (
                      <div key={i} className={cn(
                        'text-[10px] flex items-center gap-1',
                        dep.status === 'done' ? 'text-emerald-400' : dep.status === 'blocked' ? 'text-rose-400' : 'text-amber-400'
                      )}>
                        <span className="truncate">{dep.title}</span>
                        <span className="opacity-60 shrink-0">({dep.status})</span>
                      </div>
                    ))}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Title */}
            <p className="text-xs sm:text-sm font-medium text-white line-clamp-2 leading-snug">{task.title}</p>

            {/* Due date */}
            {task.dueDate && (
              <span className={cn(
                'text-[10px] flex items-center gap-0.5',
                overdue ? 'text-rose-400 font-medium' :
                dueSoon ? 'text-amber-400 font-medium' :
                'text-muted-foreground'
              )}>
                <CalendarDays className="h-2.5 w-2.5" />
                {formatDateShort(task.dueDate)}
                {overdue && ' (overdue)'}
                {dueSoon && ' (today)'}
                {!overdue && !dueSoon && daysUntil !== null && daysUntil <= 3 && ` (${daysUntil}d)`}
              </span>
            )}

            {/* SLA indicator */}
            <SLAIndicator task={task} />

            {/* Timer display for in-progress tasks */}
            {timerDisplay && (
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
                <span className="text-[10px] font-mono tabular-nums text-amber-400">{timerDisplay}</span>
                {totalLoggedHours > 0 && (
                  <span className="text-[9px] text-muted-foreground ml-1">(+{totalLoggedHours.toFixed(1)}h logged)</span>
                )}
              </div>
            )}

            {/* Accumulated time display (non-in-progress) */}
            {!timerDisplay && totalLoggedHours > 0 && (
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <Clock className="h-2.5 w-2.5" />
                {totalLoggedHours.toFixed(1)}h logged
              </div>
            )}

            {/* Quick action buttons + dropdown */}
            <div className="flex items-center gap-1 pt-0.5">
              {task.status === 'todo' && (
                <button
                  onClick={e => { e.stopPropagation(); handleStatusChange(task.id, 'in-progress', cardRef.current); }}
                  className="h-5 px-1.5 rounded text-[9px] font-medium bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors flex items-center gap-0.5"
                >
                  <Play className="h-2.5 w-2.5" /> Start
                </button>
              )}
              {task.status === 'in-progress' && (
                <button
                  onClick={e => { e.stopPropagation(); handleStatusChange(task.id, 'in-review', cardRef.current); }}
                  className="h-5 px-1.5 rounded text-[9px] font-medium bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors flex items-center gap-0.5"
                >
                  <Send className="h-2.5 w-2.5" /> Submit
                </button>
              )}
              {task.status === 'in-review' && (
                <button
                  onClick={e => { e.stopPropagation(); handleStatusChange(task.id, 'done', cardRef.current); }}
                  className="h-5 px-1.5 rounded text-[9px] font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center gap-0.5"
                >
                  <CheckCircle2 className="h-2.5 w-2.5" /> Approve
                </button>
              )}
              {task.status === 'blocked' && (
                <button
                  onClick={e => { e.stopPropagation(); handleStatusChange(task.id, 'in-progress', cardRef.current); }}
                  className="h-5 px-1.5 rounded text-[9px] font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center gap-0.5"
                >
                  <CheckCircle2 className="h-2.5 w-2.5" /> Resolve
                </button>
              )}
              {(task.commentCount ?? 0) > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground ml-auto">
                  <MessageSquare className="h-2.5 w-2.5" /> {task.commentCount}
                </span>
              )}
              {/* More actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                  <button className="h-5 w-5 rounded flex items-center justify-center hover:bg-black/[0.06] dark:hover:bg-white/[0.1] transition-colors ml-auto opacity-0 group-hover:opacity-100">
                    <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background/95 border-border">
                  <DropdownMenuItem onClick={e => { e.stopPropagation(); setDepDialogTaskId(task.id); setDepDialogOpen(true); }}>
                    <GitBranch className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    Add Dependency
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={e => { e.stopPropagation(); setTimeLogTaskId(task.id); setTimeLogDialogOpen(true); }}>
                    <Timer className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    Log Time
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={e => { e.stopPropagation(); handleOpenDetail(task); }}>
                    <ArrowUpRight className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    View Details
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    );
  });

  // ─── Board View: Kanban Column Component ────────────────────────────────────
  const KanbanColumn = memo(({ status, columnTasks }: { status: typeof STATUS_COLUMNS[number]; columnTasks: Task[] }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: status.key,
      data: { status: status.key },
    });

    const isDropTarget = isOver || overColumnId === status.key;

    return (
      <div
        className={cn(
          'flex flex-col rounded-xl border transition-all duration-200',
          isDropTarget
            ? 'border-cyan-400/50 bg-cyan-500/5 shadow-lg shadow-cyan-500/10'
            : 'border-black/[0.06] dark:border-white/[0.05] bg-black/[0.01] dark:bg-white/[0.02]',
        )}
      >
        {/* Column header */}
        <div className={cn('flex items-center gap-2 px-3 py-2.5 border-b-2', status.color)}>
          {status.icon}
          <span className="text-xs font-semibold text-white">{status.label}</span>
          <span className="text-[10px] font-medium text-muted-foreground bg-black/[0.06] dark:bg-white/[0.1] rounded-full px-1.5 py-0.5 ml-auto">
            {columnTasks.length}
          </span>
          {/* Quick add button */}
          <button
            onClick={() => {
              setAddTaskStatus(status.key);
              setAddTaskDialogOpen(true);
            }}
            className="h-5 w-5 rounded flex items-center justify-center hover:bg-black/[0.06] dark:hover:bg-white/[0.1] transition-colors text-muted-foreground hover:text-white"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        {/* Column body - droppable + sortable area */}
        <SortableContext items={columnTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div
            ref={setNodeRef}
            className={cn(
              'flex-1 p-2 space-y-2 min-h-[80px] overflow-y-auto',
              'max-h-[calc(100vh-320px)]',
              '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/[0.06] dark:bg-white/[0.1] [&::-webkit-scrollbar-thumb]:rounded-full',
            )}
          >
            <AnimatePresence mode="popLayout">
              {columnTasks.map((task) => (
                <BoardTaskCard key={task.id} task={task} />
              ))}
            </AnimatePresence>
            {columnTasks.length === 0 && (
              <div className={cn(
                'flex items-center justify-center py-8 rounded-lg border border-dashed transition-colors',
                isDropTarget ? 'border-cyan-400/40 text-cyan-400' : 'border-black/[0.1] dark:border-white/[0.1] text-muted-foreground/40'
              )}>
                <span className="text-xs">Drop tasks here</span>
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    );
  });

  // ─── Board View: DnD Sensors & Handlers ──────────────────────────────────────
  const boardSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const boardDragStart = useCallback((event: DragStartEvent) => {
    const id = event.active.id as string;
    setActiveDragId(id);
    const task = tasks.find(t => t.id === id);
    setActiveDragTask(task || null);
  }, [tasks]);

  const boardDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setOverColumnId(null);
      return;
    }
    // Check if over a column
    const colKey = STATUS_COLUMNS.find(c => c.key === over.id)?.key;
    if (colKey) {
      setOverColumnId(colKey);
      return;
    }
    // Check if over a task - find that task's column
    const overTask = tasks.find(t => t.id === over.id);
    if (overTask) {
      setOverColumnId(overTask.status);
    }
  }, [tasks]);

  const boardDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    setActiveDragTask(null);
    setOverColumnId(null);

    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Determine target column
    let targetStatus: Task['status'] | null = null;

    // Check if dropped on a column
    for (const col of STATUS_COLUMNS) {
      if (over.id === col.key) {
        targetStatus = col.key;
        break;
      }
    }

    // Check if dropped on another task
    if (!targetStatus) {
      const overTask = tasks.find(t => t.id === over.id);
      if (overTask) {
        targetStatus = overTask.status;
      }
    }

    if (targetStatus && targetStatus !== task.status) {
      await handleStatusChange(taskId, targetStatus);
    }
  }, [tasks, handleStatusChange]);

  // ─── Render: Board View (Kanban) ─────────────────────────────────────────────
  const renderBoardView = () => {
    // Group tasks by status using filtered tasks
    const tasksByStatus = STATUS_COLUMNS.reduce<Record<string, Task[]>>((acc, col) => {
      acc[col.key] = currentTasks.filter(t => t.status === col.key);
      return acc;
    }, {});

    return (
      <div className="space-y-4">
        {/* Top bar: Filter Chips + Templates button */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { value: 'all', label: 'All' },
              { value: 'todo', label: 'To Do' },
              { value: 'in-progress', label: 'In Progress' },
              { value: 'in-review', label: 'In Review' },
              { value: 'blocked', label: 'Blocked' },
              { value: 'done', label: 'Done' },
            ].map((chip) => (
              <button
                key={chip.value}
                onClick={() => setStatusFilter(chip.value)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border transition-all',
                  statusFilter === chip.value
                    ? (statusChipColorMap[chip.value] || 'bg-black/[0.06] dark:bg-white/[0.1] text-white border-black/[0.12] dark:border-white/[0.2]')
                    : 'bg-transparent border-black/[0.1] dark:border-white/[0.1] text-muted-foreground hover:border-black/[0.12] dark:hover:border-white/[0.2] hover:text-foreground'
                )}
              >
                {chip.label}
                {chip.value !== 'all' && (
                  <span className="ml-1 opacity-60">
                    {(tasksByStatus[chip.value]?.length ?? 0) || myTasks.filter(t => t.status === chip.value).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Templates button */}
          {taskTemplates.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
              onClick={() => setTemplateDialogOpen(true)}
            >
              <Sparkles className="h-3.5 w-3.5" /> Templates
            </Button>
          )}
        </div>

        {/* Kanban Board — desktop only */}
        {currentTasks.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <List className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No tasks match your filters</p>
          </GlassCard>
        ) : (
          <>
            {/* Desktop: Kanban columns */}
            <div className="hidden md:block">
              <DndContext
                sensors={boardSensors}
                collisionDetection={closestCorners}
                onDragStart={boardDragStart}
                onDragOver={boardDragOver}
                onDragEnd={boardDragEnd}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 min-h-[500px]">
                  {STATUS_COLUMNS.map((col) => (
                    <KanbanColumn
                      key={col.key}
                      status={col}
                      columnTasks={tasksByStatus[col.key] || []}
                    />
                  ))}
                </div>

                {/* Drag Overlay - ghost card */}
                <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
                  {activeDragTask ? (
                    <BoardTaskCard task={activeDragTask} isOverlay />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>

            {/* Mobile: Stacked list grouped by status */}
            <div className="md:hidden space-y-4">
              {STATUS_COLUMNS.map((col) => {
                const colTasks = tasksByStatus[col.key] || [];
                if (colTasks.length === 0) return null;
                return (
                  <div key={col.key}>
                    {/* Section header */}
                    <div className={cn('flex items-center gap-2 px-3 py-2 rounded-t-xl border-b-2', col.color, 'border-black/[0.06] dark:border-white/[0.05] bg-black/[0.01] dark:bg-white/[0.02]')}>
                      {col.icon}
                      <span className="text-xs font-semibold text-white">{col.label}</span>
                      <span className="text-[10px] font-medium text-muted-foreground bg-black/[0.06] dark:bg-white/[0.1] rounded-full px-1.5 py-0.5 ml-auto">
                        {colTasks.length}
                      </span>
                    </div>
                    {/* Stacked cards */}
                    <div className="space-y-2 mt-2">
                      <AnimatePresence mode="popLayout">
                        {colTasks.map((task) => (
                          <BoardTaskCard key={task.id} task={task} />
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Template Dialog */}
        <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
          <DialogContent className="bg-background/95 border-border backdrop-blur-xl max-w-[calc(100%-2rem)] sm:max-w-lg max-h-[85vh] sm:max-h-none overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-400" /> Task Templates
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                Quick-create tasks from pre-defined templates
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
              {taskTemplates.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No templates available</p>
                </div>
              ) : (
                taskTemplates.map(template => {
                  let itemCount = 0;
                  try { itemCount = JSON.parse(template.taskItems).length; } catch { itemCount = 1; }

                  return (
                    <GlassCard key={template.id} className="p-3" hover>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-medium text-white">{template.name}</p>
                          {template.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-2">{template.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="h-4 text-[9px] px-1.5 bg-violet-500/10 text-violet-400 border-violet-500/20">
                              {template.category}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 gap-1 text-xs border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 h-7"
                          onClick={() => handleCreateFromTemplate(template.id)}
                        >
                          <Plus className="h-3 w-3" /> Create
                        </Button>
                      </div>
                    </GlassCard>
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Quick Add Task Dialog */}
        <Dialog open={addTaskDialogOpen} onOpenChange={setAddTaskDialogOpen}>
          <DialogContent className="bg-background/95 border-border backdrop-blur-xl max-w-[calc(100%-2rem)] sm:max-w-md max-h-[85vh] sm:max-h-none overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-cyan-400" /> Add Task to {addTaskStatus.replace('-', ' ')}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                Quick-create a new task
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Title *</Label>
                <Input
                  value={addTaskForm.title}
                  onChange={e => setAddTaskForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Task title..."
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-white"
                  onKeyDown={e => { if (e.key === 'Enter') handleQuickAddTask(); }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Priority</Label>
                  <Select value={addTaskForm.priority} onValueChange={v => setAddTaskForm(p => ({ ...p, priority: v as Task['priority'] }))}>
                    <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Due Date</Label>
                  <Input
                    type="date"
                    value={addTaskForm.dueDate}
                    onChange={e => setAddTaskForm(p => ({ ...p, dueDate: e.target.value }))}
                    className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-white"
                  />
                </div>
              </div>
              <Button onClick={handleQuickAddTask} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white">
                Create Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Dependency Dialog */}
        <Dialog open={depDialogOpen} onOpenChange={setDepDialogOpen}>
          <DialogContent className="bg-background/95 border-border backdrop-blur-xl max-w-[calc(100%-2rem)] sm:max-w-md max-h-[85vh] sm:max-h-none overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-amber-400" /> Add Dependency
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                Link this task to another task it depends on
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Search tasks</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={depDialogSearch}
                    onChange={e => setDepDialogSearch(e.target.value)}
                    placeholder="Search by title..."
                    className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-white pl-8"
                  />
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                {currentTasks
                  .filter(t => t.id !== depDialogTaskId && t.title.toLowerCase().includes(depDialogSearch.toLowerCase()))
                  .slice(0, 20)
                  .map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedDepId(t.id)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-2',
                        selectedDepId === t.id
                          ? 'bg-cyan-500/20 border border-cyan-500/30 text-white'
                          : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.05] text-muted-foreground border border-transparent'
                      )}
                    >
                      <span className={cn(
                        'h-1.5 w-1.5 rounded-full shrink-0',
                        t.status === 'done' ? 'bg-emerald-400' : t.status === 'blocked' ? 'bg-rose-400' : 'bg-amber-400'
                      )} />
                      <span className="truncate flex-1">{t.title}</span>
                      <span className="opacity-50 text-[9px] shrink-0">{t.status}</span>
                    </button>
                  ))}
              </div>
              <Button
                onClick={() => {
                  if (depDialogTaskId && selectedDepId) {
                    handleAddDependency(depDialogTaskId, selectedDepId);
                    setDepDialogOpen(false);
                    setSelectedDepId('');
                    setDepDialogSearch('');
                  }
                }}
                disabled={!selectedDepId}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white"
              >
                Add Dependency
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  // ─── Render: List View (Enhanced) ──────────────────────────────────────────
  const renderListView = () => (
    <GlassCard className="overflow-hidden">
      {/* Bulk action bar */}
      <AnimatePresence>
        {selectedTaskIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-cyan-500/10 border-b border-cyan-500/20 px-4 py-2 flex items-center gap-3"
          >
            <span className="text-xs text-cyan-400 font-medium">{selectedTaskIds.size} selected</span>
            <Button size="sm" variant="ghost" className="h-6 text-[10px] text-amber-400 hover:bg-amber-500/10" onClick={() => handleBulkAction('in-progress')}>
              <Play className="h-3 w-3 mr-1" /> Mark In Progress
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-[10px] text-emerald-400 hover:bg-emerald-500/10" onClick={() => handleBulkAction('done')}>
              <CheckCircle2 className="h-3 w-3 mr-1" /> Mark Done
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-[10px] text-rose-400 hover:bg-rose-500/10" onClick={() => handleBulkAction('blocked')}>
              <AlertOctagon className="h-3 w-3 mr-1" /> Report Blocker
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-[10px] ml-auto" onClick={() => setSelectedTaskIds(new Set())}>
              <X className="h-3 w-3" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-black/[0.1] dark:border-white/[0.1]">
              <th className="p-3 w-8">
                <Checkbox
                  checked={currentTasks.length > 0 && selectedTaskIds.size === currentTasks.length}
                  onCheckedChange={checked => {
                    if (checked) setSelectedTaskIds(new Set(currentTasks.map(t => t.id)));
                    else setSelectedTaskIds(new Set());
                  }}
                />
              </th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-white transition-colors" onClick={() => toggleSort('createdAt')}>
                <div className="flex items-center gap-1">Task <SortIcon field="createdAt" /></div>
              </th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-white transition-colors" onClick={() => toggleSort('status')}>
                <div className="flex items-center gap-1">Status <SortIcon field="status" /></div>
              </th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-white transition-colors" onClick={() => toggleSort('priority')}>
                <div className="flex items-center gap-1">Priority <SortIcon field="priority" /></div>
              </th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-white transition-colors" onClick={() => toggleSort('assignee')}>
                <div className="flex items-center gap-1">Assignee <SortIcon field="assignee" /></div>
              </th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-white transition-colors" onClick={() => toggleSort('createdAt')}>
                <div className="flex items-center gap-1">Created <SortIcon field="createdAt" /></div>
              </th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-white transition-colors" onClick={() => toggleSort('age')}>
                <div className="flex items-center gap-1">Age <SortIcon field="age" /></div>
              </th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground">SLA</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-white transition-colors" onClick={() => toggleSort('dueDate')}>
                <div className="flex items-center gap-1">Due Date <SortIcon field="dueDate" /></div>
              </th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground">Team</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentTasks.map((task, i) => {
              const sla = getSLAStatus(task);
              const age = getTaskAge(task);
              const taskTimeH = timeLogs.filter(l => l.taskId === task.id).reduce((s, l) => s + l.hours, 0);

              return (
                <motion.tr
                  key={task.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className={cn(
                    'border-b border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.01] dark:hover:bg-white/[0.02] transition-colors cursor-pointer',
                    selectedTaskIds.has(task.id) && 'bg-cyan-500/5',
                    isOverdue(task) && 'bg-rose-500/[0.03]',
                    sla.isBreached && task.status !== 'done' && 'bg-rose-500/[0.02]'
                  )}
                  onClick={() => handleOpenDetail(task)}
                >
                  <td className="p-3" onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedTaskIds.has(task.id)}
                      onCheckedChange={checked => {
                        const next = new Set(selectedTaskIds);
                        if (checked) next.add(task.id); else next.delete(task.id);
                        setSelectedTaskIds(next);
                      }}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-1 h-8 rounded-full', PRIORITY_CONFIG[task.priority]?.bg?.replace('/10', '') || 'bg-slate-500')} />
                      <div>
                        <p className="text-sm font-medium text-white">{task.title}</p>
                        {task.description && (
                          <p className="text-[11px] text-muted-foreground truncate max-w-[300px]">{task.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-3"><StatusBadge status={task.status} /></td>
                  <td className="p-3"><StatusBadge status={task.priority} /></td>
                  <td className="p-3">
                    {task.assigneeName ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[8px] bg-black/[0.06] dark:bg-white/[0.1]">{getInitials(task.assigneeName)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-white truncate max-w-[80px]">{task.assigneeName}</span>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="p-3">
                    <span className="text-xs text-muted-foreground">{formatDateShort(task.createdAt)}</span>
                  </td>
                  <td className="p-3">
                    <span className={cn('text-xs font-medium', age > 10 ? 'text-rose-400' : age > 5 ? 'text-amber-400' : 'text-muted-foreground')}>
                      {age}d
                    </span>
                  </td>
                  <td className="p-3">
                    {task.status !== 'done' && SLA_CONFIG[task.priority] && (
                      <div className="flex items-center gap-1">
                        <div className="w-12 h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.1] overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all', sla.isBreached ? 'bg-rose-500' : sla.isAtRisk ? 'bg-amber-500' : 'bg-cyan-500')}
                            style={{ width: `${Math.min(100, sla.pct)}%` }}
                          />
                        </div>
                        <span className={cn('text-[9px]', sla.isBreached ? 'text-rose-400' : sla.isAtRisk ? 'text-amber-400' : 'text-muted-foreground')}>
                          {sla.isBreached ? '!' : `${sla.daysRemaining}d`}
                        </span>
                      </div>
                    )}
                    {task.status === 'done' && <span className="text-[9px] text-emerald-400">Done</span>}
                  </td>
                  <td className="p-3">
                    <span className={cn(
                      'text-xs',
                      isOverdue(task) ? 'text-rose-400' : isDueToday(task) ? 'text-amber-400' : 'text-muted-foreground'
                    )}>
                      {formatDateShort(task.dueDate)}
                    </span>
                  </td>
                  <td className="p-3">
                    {task.teamName ? (
                      <Badge variant="outline" className="text-[10px] bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                        {task.teamName}
                      </Badge>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="p-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      {task.status === 'todo' && (
                        <Tooltip><TooltipTrigger asChild>
                          <button onClick={() => handleStatusChange(task.id, 'in-progress')} className="p-1 rounded hover:bg-amber-500/10 text-amber-400 transition-colors">
                            <Play className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger><TooltipContent>Start</TooltipContent></Tooltip>
                      )}
                      {task.status === 'in-progress' && (
                        <Tooltip><TooltipTrigger asChild>
                          <button onClick={() => handleStatusChange(task.id, 'in-review')} className="p-1 rounded hover:bg-cyan-500/10 text-cyan-400 transition-colors">
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger><TooltipContent>Submit for Review</TooltipContent></Tooltip>
                      )}
                      {task.status === 'in-review' && (
                        <Tooltip><TooltipTrigger asChild>
                          <button onClick={() => handleStatusChange(task.id, 'done')} className="p-1 rounded hover:bg-emerald-500/10 text-emerald-400 transition-colors">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger><TooltipContent>Mark Done</TooltipContent></Tooltip>
                      )}
                      {task.status === 'blocked' && (
                        <Tooltip><TooltipTrigger asChild>
                          <button onClick={() => handleStatusChange(task.id, 'in-progress')} className="p-1 rounded hover:bg-emerald-500/10 text-emerald-400 transition-colors">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger><TooltipContent>Resolve Blocker</TooltipContent></Tooltip>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.1] text-muted-foreground transition-colors">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background border-border">
                          <DropdownMenuItem onClick={() => { setTimeLogTaskId(task.id); setTimeLogDialogOpen(true); }}>
                            <Timer className="h-3.5 w-3.5 mr-2" /> Log Time
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenDetail(task)}>
                            <FileText className="h-3.5 w-3.5 mr-2" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setBlockerForm(prev => ({ ...prev, taskId: task.id })); setBlockerDialogOpen(true); }}>
                            <AlertOctagon className="h-3.5 w-3.5 mr-2" /> Report Blocker
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {currentTasks.length === 0 && (
        <div className="p-12 text-center">
          <List className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No tasks found</p>
        </div>
      )}
    </GlassCard>
  );

  // ─── Render: Calendar View ─────────────────────────────────────────────────
  const renderCalendarView = () => {
    const monthName = new Date(calendarYear, calendarMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
      <div className="space-y-4">
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">{monthName}</h3>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1); }
                else setCalendarMonth(m => m - 1);
              }}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                setCalendarMonth(new Date().getMonth());
                setCalendarYear(new Date().getFullYear());
              }}>
                Today
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1); }
                else setCalendarMonth(m => m + 1);
              }}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px bg-black/[0.03] dark:bg-white/[0.05] rounded-lg overflow-hidden calendar-touch-target">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="p-2 text-center text-[10px] font-medium text-muted-foreground bg-black/[0.01] dark:bg-white/[0.02]">
                {d}
              </div>
            ))}
            {calendarDays.map((day, i) => {
              const dayTasks = tasksByDueDate.get(day.dateStr) || [];
              const isToday = day.dateStr === new Date().toISOString().split('T')[0];
              const isSelected = day.dateStr === selectedCalDate;

              return (
                <button
                  key={i}
                  onClick={() => setSelectedCalDate(day.dateStr)}
                  className={cn(
                    'p-1.5 sm:p-1.5 min-h-[60px] sm:min-h-[60px] text-left transition-colors relative',
                    day.isCurrentMonth ? 'bg-black/[0.01] dark:bg-white/[0.02] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]' : 'bg-transparent',
                    isToday && 'ring-1 ring-cyan-500/50',
                    isSelected && 'bg-cyan-500/10'
                  )}
                >
                  <span className={cn(
                    'text-xs',
                    day.isCurrentMonth ? 'text-white' : 'text-muted-foreground/40',
                    isToday && 'text-cyan-400 font-bold'
                  )}>
                    {day.date.getDate()}
                  </span>
                  {dayTasks.length > 0 && (
                    <div className="flex gap-0.5 mt-1 flex-wrap">
                      {dayTasks.slice(0, 3).map(t => (
                        <div
                          key={t.id}
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            t.status === 'done' ? 'bg-emerald-400' :
                            t.status === 'blocked' ? 'bg-rose-400' :
                            t.status === 'in-progress' ? 'bg-amber-400' :
                            t.status === 'in-review' ? 'bg-cyan-400' :
                            'bg-slate-400'
                          )}
                        />
                      ))}
                      {dayTasks.length > 3 && (
                        <span className="text-[8px] text-muted-foreground">+{dayTasks.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </GlassCard>

        {/* Selected day detail */}
        <AnimatePresence>
          {selectedCalDate && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <GlassCard className="p-4">
                <h4 className="text-sm font-medium text-white mb-3">
                  Tasks due on {new Date(selectedCalDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h4>
                {(tasksByDueDate.get(selectedCalDate) || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No tasks due on this date</p>
                ) : (
                  <div className="space-y-2">
                    {(tasksByDueDate.get(selectedCalDate) || []).map(task => (
                      <div
                        key={task.id}
                        onClick={() => handleOpenDetail(task)}
                        className={cn(
                          'flex items-center gap-3 p-2 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.05] cursor-pointer transition-colors',
                          'border-l-2',
                          PRIORITY_CONFIG[task.priority]?.border || 'border-l-slate-400'
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{task.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <StatusBadge status={task.status} />
                            {task.teamName && <span className="text-[10px] text-cyan-400">{task.teamName}</span>}
                          </div>
                        </div>
                        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // ─── Timeline weeks (memoized at component level) ─────────────────────────
  const timelineWeeks = useMemo(() => {
    const weekMap = new Map<string, Task[]>();
    currentTasks.forEach(t => {
      const refDate = t.dueDate ? new Date(t.dueDate) : new Date(t.createdAt);
      const weekKey = `W${getWeekNumber(refDate)} - ${refDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      if (!weekMap.has(weekKey)) weekMap.set(weekKey, []);
      weekMap.get(weekKey)!.push(t);
    });
    return Array.from(weekMap.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [currentTasks]);

  // ─── Render: Timeline View ─────────────────────────────────────────────────
  const renderTimelineView = () => {
    const weeks = timelineWeeks;

    return (
      <div className="space-y-6">
        {weeks.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <GitBranch className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No tasks to display on timeline</p>
          </GlassCard>
        ) : (
          weeks.map(([weekLabel, weekTasks]) => (
            <GlassCard key={weekLabel} className="p-4">
              <h4 className="text-sm font-medium text-cyan-400 mb-3 flex items-center gap-2">
                <GitBranch className="h-4 w-4" /> {weekLabel}
                <Badge variant="secondary" className="text-[10px] bg-black/[0.06] dark:bg-white/[0.1] text-muted-foreground">
                  {weekTasks.length} task{weekTasks.length !== 1 ? 's' : ''}
                </Badge>
              </h4>
              <div className="relative pl-6">
                <div className="absolute left-2 top-0 bottom-0 w-px bg-black/[0.06] dark:bg-white/[0.1]" />
                {weekTasks.map((task, i) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative mb-3 last:mb-0"
                  >
                    <div className={cn(
                      'absolute left-[-18px] top-2 h-2.5 w-2.5 rounded-full border-2',
                      task.status === 'done' ? 'bg-emerald-400 border-emerald-400' :
                      task.status === 'blocked' ? 'bg-rose-400 border-rose-400' :
                      task.status === 'in-progress' ? 'bg-amber-400 border-amber-400' :
                      task.status === 'in-review' ? 'bg-cyan-400 border-cyan-400' :
                      'bg-slate-400 border-slate-400'
                    )} />
                    <div
                      onClick={() => handleOpenDetail(task)}
                      className="ml-2 p-2.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer transition-colors border border-black/[0.06] dark:border-white/[0.05]"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white">{task.title}</p>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={task.status} />
                          <StatusBadge status={task.priority} />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                        {task.dueDate && <span>Due: {formatDateShort(task.dueDate)}</span>}
                        {task.teamName && <span className="text-cyan-400">{task.teamName}</span>}
                        {task.assigneeName && <span>{task.assigneeName}</span>}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          ))
        )}
      </div>
    );
  };

  // ─── Render: Team Tasks Tab ────────────────────────────────────────────────
  const renderTeamTasksTab = () => (
    <div className="space-y-4">
      {/* Team member overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {teamMembersOverview.map(member => (
          <GlassCard
            key={member.id}
            hover
            className={cn('p-3 cursor-pointer', teamMemberFilter === member.id && 'ring-1 ring-cyan-500/30')}
            onClick={() => setTeamMemberFilter(teamMemberFilter === member.id ? 'all' : member.id)}
          >
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[9px] bg-cyan-500/10 text-cyan-400">
                  {getInitials(member.name)}
                </AvatarFallback>
              </Avatar>
              <p className="text-xs font-medium text-white truncate">{member.name}</p>
            </div>
            <div className="grid grid-cols-3 gap-1 text-center">
              <div>
                <p className="text-sm font-bold text-slate-400">{member.todo}</p>
                <p className="text-[9px] text-muted-foreground">To Do</p>
              </div>
              <div>
                <p className="text-sm font-bold text-amber-400">{member.inProgress}</p>
                <p className="text-[9px] text-muted-foreground">Active</p>
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-400">{member.done}</p>
                <p className="text-[9px] text-muted-foreground">Done</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {teamMemberFilter !== 'all' && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filtered by:</span>
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
            {teamMembersOverview.find(m => m.id === teamMemberFilter)?.name}
          </Badge>
          <button onClick={() => setTeamMemberFilter('all')} className="text-xs text-muted-foreground hover:text-white">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {renderViewControls()}

      {viewMode === 'board' && renderBoardView()}
      {viewMode === 'list' && renderListView()}
      {viewMode === 'calendar' && renderCalendarView()}
      {viewMode === 'timeline' && renderTimelineView()}
    </div>
  );

  // ─── Render: Watched Tab ───────────────────────────────────────────────────
  const renderWatchedTab = () => (
    <div className="space-y-3">
      {watchedTasks.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <Eye className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No watched tasks</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Tasks you reported but are not assigned to will appear here</p>
        </GlassCard>
      ) : (
        watchedTasks.map((task, i) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <GlassCard
              hover
              className="p-4 cursor-pointer"
              onClick={() => handleOpenDetail(task)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{task.title}</p>
                    <StatusBadge status={task.status} />
                    <StatusBadge status={task.priority} />
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                    {task.assigneeName && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" /> {task.assigneeName}
                      </span>
                    )}
                    {task.teamName && <span className="text-cyan-400">{task.teamName}</span>}
                    {task.dueDate && <span>Due: {formatDateShort(task.dueDate)}</span>}
                  </div>
                  {/* SLA indicator */}
                  <div className="mt-2">
                    <SLAIndicator task={task} />
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </GlassCard>
          </motion.div>
        ))
      )}
    </div>
  );

  // ─── Render: Activity Tab ──────────────────────────────────────────────────
  const renderActivityTab = () => (
    <GlassCard className="p-4 sm:p-6">
      <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
        <Activity className="h-4 w-4 text-cyan-400" /> Recent Activity
      </h3>
      {activityFeed.length === 0 ? (
        <div className="py-8 text-center">
          <Activity className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No recent activity</p>
        </div>
      ) : (
        <ScrollArea className="max-h-[calc(100vh-350px)]">
          <div className="space-y-1">
            {activityFeed.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
              >
                <div className={cn('mt-1 shrink-0', item.color)}>{item.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white">
                    <span className={cn('font-medium', item.color)}>{item.message}</span>
                    {' — '}
                    <span className="text-muted-foreground">{item.taskTitle}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      )}
    </GlassCard>
  );

  // ─── Render: Analytics Tab (NEW) ───────────────────────────────────────────
  const renderAnalyticsTab = () => {
    const completedByWeek = weeklyVelocityData.map(w => w.completed);
    const createdByWeek = weeklyVelocityData.map(w => w.created);
    const weekLabels = weeklyVelocityData.map(w => w.label);

    return (
      <div className="space-y-6">
        {/* Productivity Score Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassCard className="p-5" glow="emerald">
            <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-400" /> Productivity Score
            </h4>
            <div className="flex items-center gap-6">
              <ProductivityScoreRing score={productivityScore} size={100} />
              <div className="space-y-2 flex-1">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Completion Rate</span>
                    <span className="text-emerald-400 font-medium">{stats.completionRate}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.1] overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${stats.completionRate}%` }} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">On-Time Delivery</span>
                    <span className="text-cyan-400 font-medium">{myTasks.length > 0 ? Math.round(Math.max(0, (1 - stats.overdue / myTasks.length)) * 100) : 100}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.1] overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${myTasks.length > 0 ? Math.max(0, (1 - stats.overdue / myTasks.length)) * 100 : 100}%` }} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Velocity ({stats.completedThisWeek}/wk)</span>
                    <span className="text-amber-400 font-medium">{Math.min(100, stats.completedThisWeek * 20)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.1] overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${Math.min(100, stats.completedThisWeek * 20)}%` }} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Blocker-Free</span>
                    <span className="text-violet-400 font-medium">{myTasks.length > 0 ? Math.round(Math.max(0, (1 - stats.blocked / myTasks.length)) * 100) : 100}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.1] overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${myTasks.length > 0 ? Math.max(0, (1 - stats.blocked / myTasks.length)) * 100 : 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5" glow="cyan">
            <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
              <PieChart className="h-4 w-4 text-cyan-400" /> Task Distribution
            </h4>
            <SVGDonutChart segments={statusDistribution} size={180} />
          </GlassCard>
        </div>

        {/* Velocity & Burndown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassCard className="p-5" glow="amber">
            <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
              <LineChartIcon className="h-4 w-4 text-amber-400" /> Velocity Trend
              <Badge variant="secondary" className="text-[9px] bg-amber-500/20 text-amber-400 ml-auto">Last 8 Weeks</Badge>
            </h4>
            <SVGBarChart data={completedByWeek} labels={weekLabels} color="#f59e0b" height={180} />
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-amber-400">{stats.completedThisWeek}</p>
                <p className="text-[10px] text-muted-foreground">This Week</p>
              </div>
              <div>
                <p className="text-lg font-bold text-cyan-400">{completedByWeek.length > 0 ? (completedByWeek.reduce((a, b) => a + b, 0) / completedByWeek.length).toFixed(1) : 0}</p>
                <p className="text-[10px] text-muted-foreground">Avg/Week</p>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-400">{Math.max(...completedByWeek)}</p>
                <p className="text-[10px] text-muted-foreground">Best Week</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5" glow="emerald">
            <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-400" /> Burndown Progress
            </h4>
            <div className="flex items-center gap-6 mb-6">
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="text-emerald-400 font-medium">{burndownData.done} / {burndownData.total}</span>
                </div>
                <div className="h-4 rounded-full bg-black/[0.06] dark:bg-white/[0.1] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${burndownData.pct}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{burndownData.pct}% complete</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                <p className="text-xl font-bold text-white">{burndownData.total}</p>
                <p className="text-[10px] text-muted-foreground">Total Tasks</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-xl font-bold text-emerald-400">{burndownData.done}</p>
                <p className="text-[10px] text-muted-foreground">Completed</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-xl font-bold text-amber-400">{burndownData.remaining}</p>
                <p className="text-[10px] text-muted-foreground">Remaining</p>
              </div>
            </div>

            {/* Velocity line chart */}
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Completion Velocity</p>
              <SVGVelocityChart data={completedByWeek} labels={weekLabels} height={120} />
            </div>
          </GlassCard>
        </div>

        {/* Cycle Time & Aging */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassCard className="p-5" glow="cyan">
            <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-cyan-400" /> Cycle Time & Metrics
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] text-center">
                <p className="text-2xl font-bold text-cyan-400">{avgCycleTime}</p>
                <p className="text-xs text-muted-foreground mt-1">Avg Cycle Time (days)</p>
                <p className="text-[10px] text-muted-foreground/60">Created → Done</p>
              </div>
              <div className="p-4 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] text-center">
                <p className="text-2xl font-bold text-amber-400">{stats.avgAge}</p>
                <p className="text-xs text-muted-foreground mt-1">Avg Task Age (days)</p>
                <p className="text-[10px] text-muted-foreground/60">Across all tasks</p>
              </div>
              <div className="p-4 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] text-center">
                <p className="text-2xl font-bold text-emerald-400">{stats.completionRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">Completion Rate</p>
                <p className="text-[10px] text-muted-foreground/60">{stats.completed} of {stats.total}</p>
              </div>
              <div className="p-4 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] text-center">
                <p className="text-2xl font-bold text-violet-400">{stats.totalHours}h</p>
                <p className="text-xs text-muted-foreground mt-1">Time Tracked</p>
                <p className="text-[10px] text-muted-foreground/60">Total logged hours</p>
              </div>
            </div>

            {/* SLA compliance */}
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">SLA Compliance by Priority</p>
              {Object.entries(SLA_CONFIG).map(([priority, config]) => {
                const priorityTasks = myTasks.filter(t => t.priority === priority && t.status !== 'done');
                const breached = priorityTasks.filter(t => getSLAStatus(t).isBreached).length;
                const atRisk = priorityTasks.filter(t => getSLAStatus(t).isAtRisk).length;
                const onTrack = priorityTasks.length - breached - atRisk;
                return (
                  <div key={priority} className="flex items-center gap-3 py-1.5">
                    <span className={cn('text-xs font-medium w-14', config.color)}>{config.label}</span>
                    <div className="flex-1 flex gap-1 h-4">
                      {priorityTasks.length > 0 ? (
                        <>
                          <div className="h-full bg-emerald-500/30 rounded-l" style={{ width: `${(onTrack / priorityTasks.length) * 100}%` }} />
                          <div className="h-full bg-amber-500/30" style={{ width: `${(atRisk / priorityTasks.length) * 100}%` }} />
                          <div className="h-full bg-rose-500/30 rounded-r" style={{ width: `${(breached / priorityTasks.length) * 100}%` }} />
                        </>
                      ) : (
                        <div className="h-full bg-black/[0.03] dark:bg-white/[0.05] rounded w-full" />
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground w-20 text-right">
                      {priorityTasks.length > 0 ? `${onTrack} ok / ${atRisk} risk / ${breached} breached` : 'No tasks'}
                    </span>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          <GlassCard className="p-5" glow="rose">
            <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
              <Flame className="h-4 w-4 text-rose-400" /> Task Aging Analysis
            </h4>
            <div className="space-y-3">
              {agingAnalysis.map(bucket => {
                const maxCount = Math.max(...agingAnalysis.map(b => b.count), 1);
                return (
                  <div key={bucket.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{bucket.label}</span>
                      <span className="text-white font-medium">{bucket.count} task{bucket.count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="h-2 rounded-full bg-black/[0.06] dark:bg-white/[0.1] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(bucket.count / maxCount) * 100}%`, backgroundColor: bucket.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Status breakdown bar */}
            <div className="mt-6">
              <p className="text-xs text-muted-foreground mb-2">Status Breakdown</p>
              <div className="flex h-6 rounded-lg overflow-hidden">
                {statusDistribution.map((seg, i) => {
                  const pct = myTasks.length > 0 ? (seg.value / myTasks.length) * 100 : 0;
                  return pct > 0 ? (
                    <div key={i} className="flex items-center justify-center text-[9px] font-medium text-white"
                      style={{ width: `${pct}%`, backgroundColor: seg.color, opacity: 0.7 }}>
                      {pct > 8 ? seg.value : ''}
                    </div>
                  ) : null;
                })}
              </div>
              <div className="flex justify-center gap-3 mt-2">
                {statusDistribution.map((seg, i) => (
                  <div key={i} className="flex items-center gap-1 text-[10px]">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: seg.color }} />
                    <span className="text-muted-foreground">{seg.label} ({seg.value})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Created vs completed trend */}
            <div className="mt-6">
              <p className="text-xs text-muted-foreground mb-2">Created vs Completed</p>
              <SVGVelocityChart data={createdByWeek} labels={weekLabels} height={100} />
            </div>
          </GlassCard>
        </div>
      </div>
    );
  };

  // ─── Render: Report Blocker Dialog ────────────────────────────────────────
  const renderBlockerDialog = () => (
    <Dialog open={blockerDialogOpen} onOpenChange={setBlockerDialogOpen}>
      <DialogContent className="bg-background/95 border-border backdrop-blur-xl max-w-[calc(100%-2rem)] sm:max-w-md max-h-[85vh] sm:max-h-none overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-rose-400" /> Report Blocker
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">Flag a task as blocked with a reason</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Task *</Label>
            <Select value={blockerForm.taskId} onValueChange={v => setBlockerForm(p => ({ ...p, taskId: v }))}>
              <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-white">
                <SelectValue placeholder="Select task" />
              </SelectTrigger>
              <SelectContent>
                {myTasks.filter(t => t.status !== 'done' && !t.isBlocked).map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Reason *</Label>
            <Textarea
              placeholder="What is blocking this task?"
              value={blockerForm.reason}
              onChange={e => setBlockerForm(p => ({ ...p, reason: e.target.value }))}
              className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-white min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setBlockerDialogOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">
            Cancel
          </Button>
          <Button onClick={handleReportBlocker} className="bg-rose-600 hover:bg-rose-700 text-white">
            Report Blocker
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ─── Render: Time Log Dialog ──────────────────────────────────────────────
  const renderTimeLogDialog = () => (
    <Dialog open={timeLogDialogOpen} onOpenChange={setTimeLogDialogOpen}>
      <DialogContent className="bg-background/95 border-border backdrop-blur-xl max-w-[calc(100%-2rem)] sm:max-w-md max-h-[85vh] sm:max-h-none overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Timer className="h-5 w-5 text-cyan-400" /> Log Time
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">Record time spent on this task</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Hours *</Label>
            <Input
              type="number"
              min={0.5}
              max={24}
              step={0.5}
              value={timeLogForm.hours}
              onChange={e => setTimeLogForm(p => ({ ...p, hours: parseFloat(e.target.value) || 0 }))}
              className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea
              placeholder="What did you work on?"
              value={timeLogForm.description}
              onChange={e => setTimeLogForm(p => ({ ...p, description: e.target.value }))}
              className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-white min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setTimeLogDialogOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">
            Cancel
          </Button>
          <Button onClick={handleLogTime} className="bg-cyan-600 hover:bg-cyan-700 text-white">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ─── Main Render ───────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="space-y-0"
      >
        {renderHeader()}
        {renderStatCards()}
        {renderTabBar()}

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'my-tasks' && (
              <>
                {renderViewControls()}
                {viewMode === 'board' && renderBoardView()}
                {viewMode === 'list' && renderListView()}
                {viewMode === 'calendar' && renderCalendarView()}
                {viewMode === 'timeline' && renderTimelineView()}
              </>
            )}

            {activeTab === 'team-tasks' && renderTeamTasksTab()}
            {activeTab === 'watched' && renderWatchedTab()}
            {activeTab === 'activity' && renderActivityTab()}
            {activeTab === 'analytics' && renderAnalyticsTab()}
          </motion.div>
        </AnimatePresence>

        {/* Dialogs */}
        {renderBlockerDialog()}
        {renderTimeLogDialog()}
      </motion.div>
    </TooltipProvider>
  );
}

// Missing helper component
function Circle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}
