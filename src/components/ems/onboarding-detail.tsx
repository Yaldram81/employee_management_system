'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { StatCard } from './stat-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft, FileText, Monitor, GraduationCap, Users, ClipboardCheck,
  Plus, CheckCircle2, Circle, Trash2, Edit3, Calendar,
  Building2, Mail, Clock, Award, UserCheck,
  Save, Loader2, UserPlus, Sparkles,
} from 'lucide-react';
import { formatDate, getInitials } from './shared';

// ─── Types ────────────────────────────────────────────────────────
interface OnboardingTaskData {
  id: string;
  onboardingPlanId: string;
  title: string;
  category: string;
  isCompleted: boolean;
  dueDay: number;
  completedAt: string | null;
  notes: string | null;
}

interface OnboardingPlanData {
  id: string;
  userId: string | null;
  employeeName: string;
  email: string | null;
  departmentId: string | null;
  startDate: string;
  endDate: string | null;
  progress: number;
  status: string;
  buddyId: string | null;
  mentorId: string | null;
  createdAt: string;
  updatedAt: string;
  department?: { id: string; name: string; color: string } | null;
  buddy?: { id: string; name: string; email: string; position: string } | null;
  mentor?: { id: string; name: string; email: string; position: string } | null;
  tasks: OnboardingTaskData[];
}

interface DepartmentOption {
  id: string;
  name: string;
  color?: string;
}

interface UserOption {
  id: string;
  name: string;
  email?: string;
  position?: string;
  avatarUrl?: string;
}

// ─── Constants ────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; dot: string; progress: string }> = {
  NOT_STARTED: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20', dot: 'bg-slate-400', progress: 'bg-slate-400' },
  IN_PROGRESS: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400', progress: 'bg-emerald-400' },
  COMPLETED: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', dot: 'bg-cyan-400', progress: 'bg-cyan-400' },
  OVERDUE: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', dot: 'bg-rose-400', progress: 'bg-rose-400' },
};

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  DOCUMENTATION: { icon: FileText, color: 'text-slate-400', label: 'Documentation' },
  SETUP: { icon: Monitor, color: 'text-cyan-400', label: 'Setup' },
  TRAINING: { icon: GraduationCap, color: 'text-amber-400', label: 'Training' },
  INTRODUCTION: { icon: Users, color: 'text-violet-400', label: 'Introduction' },
  REVIEW: { icon: ClipboardCheck, color: 'text-emerald-400', label: 'Review' },
};

const STATUS_FLOW = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

// ─── Helpers ──────────────────────────────────────────────────────

function statusLabel(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function daysSinceStart(startDate: string): number {
  try {
    const start = new Date(startDate + 'T00:00:00');
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

function durationText(startDate: string, endDate: string | null): string {
  if (!endDate) return 'Open-ended';
  try {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return '0 days';
    if (days === 1) return '1 day';
    if (days < 7) return `${days} days`;
    if (days < 30) return `${Math.round(days / 7)} weeks`;
    return `${Math.round(days / 30)} months`;
  } catch {
    return '—';
  }
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────
export function OnboardingDetail() {
  const { selectedOnboardingId, setActiveView, setSelectedOnboardingId } = useEMSStore();

  // Data state
  const [plan, setPlan] = useState<OnboardingPlanData | null>(null);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addTaskDialogOpen, setAddTaskDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    employeeName: '',
    email: '',
    departmentId: '',
    startDate: '',
    endDate: '',
    buddyId: '',
    mentorId: '',
    status: '',
  });
  const [saving, setSaving] = useState(false);

  // Add task form state
  const [addTaskForm, setAddTaskForm] = useState({
    title: '',
    category: 'SETUP',
    dueDay: 1,
  });

  // ─── Navigate back ────────────────────────────────────────────
  const goBack = useCallback(() => {
    setSelectedOnboardingId(null);
    setActiveView('onboarding');
  }, [setSelectedOnboardingId, setActiveView]);

  // ─── Load plan data ───────────────────────────────────────────
  const loadPlan = useCallback(async () => {
    if (!selectedOnboardingId) {
      goBack();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/onboarding');
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        const found = json.data.find((p: OnboardingPlanData) => p.id === selectedOnboardingId);
        if (found) {
          setPlan(found);
        } else {
          setError('Onboarding plan not found');
        }
      } else {
        setError('Failed to load onboarding plan');
      }
    } catch {
      setError('Network error while loading plan');
    } finally {
      setLoading(false);
    }
  }, [selectedOnboardingId, goBack]);

  // Load departments and users
  useEffect(() => {
    async function loadDeps() {
      try {
        const [deptRes, userRes] = await Promise.all([
          fetch('/api/departments'),
          fetch('/api/users'),
        ]);
        const deptJson = await deptRes.json();
        const userJson = await userRes.json();
        if (deptJson.status === 'success' && deptJson.data) setDepartments(deptJson.data);
        if (userJson.status === 'success' && userJson.data) setUsers(userJson.data);
      } catch {
        // Non-critical, will just show empty dropdowns
      }
    }
    loadDeps();
  }, []);

  // Load plan on mount / id change
  useEffect(() => {
    if (!selectedOnboardingId) {
      goBack();
      return;
    }
    loadPlan();
  }, [selectedOnboardingId, loadPlan, goBack]);

  // ─── Computed values ──────────────────────────────────────────
  const taskStats = useMemo(() => {
    if (!plan) return { completed: 0, total: 0, percent: 0 };
    const completed = plan.tasks.filter(t => t.isCompleted).length;
    const total = plan.tasks.length;
    return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [plan]);

  const daysSince = useMemo(() => {
    if (!plan) return 0;
    return daysSinceStart(plan.startDate);
  }, [plan]);

  const groupedTasks = useMemo(() => {
    if (!plan) return {};
    const groups: Record<string, OnboardingTaskData[]> = {};
    // Ensure all categories appear in order
    const categoryOrder = ['DOCUMENTATION', 'SETUP', 'TRAINING', 'INTRODUCTION', 'REVIEW'];
    categoryOrder.forEach(cat => { groups[cat] = []; });
    plan.tasks.forEach(t => {
      const cat = t.category || 'SETUP';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    });
    // Remove empty categories
    return groups;
  }, [plan]);

  const statusStyle = useMemo(() => {
    if (!plan) return STATUS_COLORS.NOT_STARTED;
    return STATUS_COLORS[plan.status] || STATUS_COLORS.NOT_STARTED;
  }, [plan]);

  // ─── Handlers ─────────────────────────────────────────────────
  const handleToggleTask = async (taskId: string, currentState: boolean) => {
    try {
      const res = await fetch('/api/onboarding-tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, isCompleted: !currentState }),
      });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success(!currentState ? 'Task completed' : 'Task reopened');
        await loadPlan();
      } else {
        toast.error(json.message || 'Failed to update task');
      }
    } catch {
      toast.error('Failed to update task');
    }
  };

  const handleAddTask = async () => {
    if (!plan || !addTaskForm.title.trim()) {
      toast.error('Task title is required');
      return;
    }
    try {
      setSaving(true);
      const res = await fetch('/api/onboarding-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onboardingPlanId: plan.id,
          title: addTaskForm.title.trim(),
          category: addTaskForm.category,
          dueDay: addTaskForm.dueDay,
        }),
      });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success('Task added successfully');
        setAddTaskDialogOpen(false);
        setAddTaskForm({ title: '', category: 'SETUP', dueDay: 1 });
        await loadPlan();
      } else {
        toast.error(json.message || 'Failed to add task');
      }
    } catch {
      toast.error('Failed to add task');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/onboarding-tasks?id=${taskId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success('Task removed');
        await loadPlan();
      } else {
        toast.error(json.message || 'Failed to delete task');
      }
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const handleDeletePlan = async () => {
    if (!plan) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/onboarding?id=${plan.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success('Onboarding plan deleted');
        setDeleteDialogOpen(false);
        goBack();
      } else {
        toast.error(json.message || 'Failed to delete plan');
      }
    } catch {
      toast.error('Failed to delete plan');
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = () => {
    if (!plan) return;
    setEditForm({
      employeeName: plan.employeeName,
      email: plan.email || '',
      departmentId: plan.departmentId || '',
      startDate: plan.startDate,
      endDate: plan.endDate || '',
      buddyId: plan.buddyId || '',
      mentorId: plan.mentorId || '',
      status: plan.status,
    });
    setEditDialogOpen(true);
  };

  const handleUpdatePlan = async () => {
    if (!plan) return;
    try {
      setSaving(true);
      const body: Record<string, unknown> = { id: plan.id };
      if (editForm.employeeName) body.employeeName = editForm.employeeName;
      if (editForm.email !== undefined) body.email = editForm.email || null;
      if (editForm.departmentId !== undefined) body.departmentId = editForm.departmentId || null;
      if (editForm.startDate) body.startDate = editForm.startDate;
      if (editForm.endDate !== undefined) body.endDate = editForm.endDate || null;
      if (editForm.buddyId !== undefined) body.buddyId = editForm.buddyId || null;
      if (editForm.mentorId !== undefined) body.mentorId = editForm.mentorId || null;

      const res = await fetch('/api/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success('Plan updated successfully');
        setEditDialogOpen(false);
        await loadPlan();
      } else {
        toast.error(json.message || 'Failed to update plan');
      }
    } catch {
      toast.error('Failed to update plan');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeStatus = async (newStatus: string) => {
    if (!plan) return;
    try {
      const res = await fetch('/api/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: plan.id, status: newStatus }),
      });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success(`Status changed to ${statusLabel(newStatus)}`);
        setStatusDialogOpen(false);
        await loadPlan();
      } else {
        toast.error(json.message || 'Failed to change status');
      }
    } catch {
      toast.error('Failed to change status');
    }
  };

  const handleAssignBuddyMentor = async (buddyId: string | null, mentorId: string | null) => {
    if (!plan) return;
    try {
      const body: Record<string, unknown> = { id: plan.id };
      if (buddyId !== undefined) body.buddyId = buddyId;
      if (mentorId !== undefined) body.mentorId = mentorId;
      const res = await fetch('/api/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success('Assignment updated');
        await loadPlan();
      } else {
        toast.error(json.message || 'Failed to update assignment');
      }
    } catch {
      toast.error('Failed to update assignment');
    }
  };

  // ─── Loading state ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
        <p className="text-sm text-muted-foreground">Loading onboarding plan…</p>
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────
  if (error || !plan) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="h-16 w-16 rounded-full bg-rose-500/10 flex items-center justify-center">
          <FileText className="h-8 w-8 text-rose-400" />
        </div>
        <p className="text-sm text-muted-foreground">{error || 'Plan not found'}</p>
        <Button variant="outline" onClick={goBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />Back to Onboarding
        </Button>
      </div>
    );
  }

  // ─── RENDER ────────────────────────────────────────────────────
  return (
    <motion.div
      className="space-y-6 pb-4"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {/* ═══ BACK BUTTON ═══ */}
      <motion.div variants={staggerItem} initial="initial" animate="animate">
        <Button
          variant="ghost"
          size="sm"
          onClick={goBack}
          className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Onboarding
        </Button>
      </motion.div>

      {/* ═══ HEADER CARD ═══ */}
      <motion.div variants={staggerItem} initial="initial" animate="animate">
        <GlassCard className="p-6 relative overflow-hidden" glow={plan.status === 'IN_PROGRESS' ? 'emerald' : plan.status === 'COMPLETED' ? 'cyan' : plan.status === 'OVERDUE' ? 'rose' : 'none'}>
          {/* Decorative background */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-violet-500/8 via-cyan-500/5 to-transparent rounded-full -translate-y-40 translate-x-40 pointer-events-none" />

          <div className="relative z-10">
            {/* Top row: Avatar + Name + Status + Actions */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <Avatar className="h-14 w-14 shrink-0 ring-2 ring-violet-500/20">
                  <AvatarFallback className="bg-gradient-to-br from-violet-600 to-cyan-600 text-white text-lg font-bold">
                    {getInitials(plan.employeeName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold truncate">{plan.employeeName}</h1>
                  {plan.email && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{plan.email}</span>
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {plan.department && (
                      <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20 text-xs gap-1">
                        <Building2 className="h-3 w-3" />{plan.department.name}
                      </Badge>
                    )}
                    <Badge className={`${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border} text-xs gap-1`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                      {statusLabel(plan.status)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <Button variant="outline" size="sm" onClick={openEditDialog} className="gap-1.5 text-xs">
                  <Edit3 className="h-3.5 w-3.5" />Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => setStatusDialogOpen(true)} className="gap-1.5 text-xs">
                  <Clock className="h-3.5 w-3.5" />Status
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(true)} className="gap-1.5 text-xs text-rose-400 hover:text-rose-300 hover:border-rose-500/30">
                  <Trash2 className="h-3.5 w-3.5" />Delete
                </Button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className={`font-bold ${statusStyle.text}`}>{plan.progress}%</span>
              </div>
              <Progress value={plan.progress} className="h-3 bg-black/[0.03] dark:bg-white/[0.05]" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{taskStats.completed} of {taskStats.total} tasks completed</span>
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  {taskStats.percent === 100 ? 'All done!' : `${taskStats.total - taskStats.completed} remaining`}
                </span>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ═══ QUICK STATS ═══ */}
      <motion.div variants={staggerItem} initial="initial" animate="animate">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            title="Tasks Done"
            value={`${taskStats.completed}/${taskStats.total}`}
            subtitle={taskStats.percent === 100 ? 'All completed' : `${taskStats.total - taskStats.completed} remaining`}
            icon={CheckCircle2}
            color="cyan"
            hero
            progressRing={taskStats.total > 0 ? { value: taskStats.completed, max: taskStats.total } : undefined}
          />
          <StatCard
            title="Progress"
            value={`${taskStats.percent}%`}
            subtitle="Completion rate"
            icon={Award}
            color="violet"
            hero
          />
          <StatCard
            title="Days In"
            value={daysSince}
            subtitle={daysSince === 1 ? 'day since start' : 'days since start'}
            icon={Calendar}
            color="amber"
            hero
          />
          <StatCard
            title="Status"
            value={statusLabel(plan.status)}
            subtitle="Current state"
            icon={plan.status === 'COMPLETED' ? CheckCircle2 : plan.status === 'OVERDUE' ? Clock : Circle}
            color={plan.status === 'COMPLETED' ? 'cyan' : plan.status === 'OVERDUE' ? 'rose' : plan.status === 'IN_PROGRESS' ? 'emerald' : 'slate'}
            hero
          />
        </div>
      </motion.div>

      {/* ═══ SCHEDULE + ASSIGNMENTS ROW ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Schedule Info */}
        <motion.div variants={staggerItem} initial="initial" animate="animate">
          <GlassCard className="p-5 h-full">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-cyan-400" />
              Schedule Information
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Start Date
                </div>
                <span className="text-sm font-medium">{formatDate(plan.startDate)}</span>
              </div>
              <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  End Date
                </div>
                <span className="text-sm font-medium">{formatDate(plan.endDate)}</span>
              </div>
              <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Duration
                </div>
                <span className="text-sm font-medium">{durationText(plan.startDate, plan.endDate)}</span>
              </div>
              <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Days Since Start
                </div>
                <Badge variant="outline" className="text-xs">
                  {daysSince} {daysSince === 1 ? 'day' : 'days'}
                </Badge>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Assignments */}
        <motion.div variants={staggerItem} initial="initial" animate="animate">
          <GlassCard className="p-5 h-full">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-violet-400" />
              Assignments
            </h3>
            <div className="space-y-4">
              {/* Buddy */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Buddy</span>
                  <Select
                    value={plan.buddyId || '__none__'}
                    onValueChange={v => handleAssignBuddyMentor(v === '__none__' ? null : v, undefined as unknown as null)}
                  >
                    <SelectTrigger className="h-7 w-auto min-w-[80px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs">
                      <SelectValue placeholder="Reassign" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {plan.buddy ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="bg-cyan-600/20 text-cyan-400 text-xs">
                        {getInitials(plan.buddy.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{plan.buddy.name}</p>
                      {plan.buddy.position && (
                        <p className="text-xs text-muted-foreground truncate">{plan.buddy.position}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-black/[0.01] dark:bg-white/[0.02] border border-dashed border-black/[0.1] dark:border-white/[0.1] text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    No buddy assigned
                  </div>
                )}
              </div>

              <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />

              {/* Mentor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Mentor</span>
                  <Select
                    value={plan.mentorId || '__none__'}
                    onValueChange={v => handleAssignBuddyMentor(undefined as unknown as null, v === '__none__' ? null : v)}
                  >
                    <SelectTrigger className="h-7 w-auto min-w-[80px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs">
                      <SelectValue placeholder="Reassign" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {plan.mentor ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="bg-violet-600/20 text-violet-400 text-xs">
                        {getInitials(plan.mentor.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{plan.mentor.name}</p>
                      {plan.mentor.position && (
                        <p className="text-xs text-muted-foreground truncate">{plan.mentor.position}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-black/[0.01] dark:bg-white/[0.02] border border-dashed border-black/[0.1] dark:border-white/[0.1] text-sm text-muted-foreground">
                    <Award className="h-4 w-4" />
                    No mentor assigned
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* ═══ TASKS SECTION ═══ */}
      <motion.div variants={staggerItem} initial="initial" animate="animate">
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-emerald-400" />
              Onboarding Tasks
              <Badge variant="outline" className="text-[10px] ml-1">
                {taskStats.completed}/{taskStats.total}
              </Badge>
            </h3>
            <Button
              size="sm"
              onClick={() => setAddTaskDialogOpen(true)}
              className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />Add Task
            </Button>
          </div>

          {plan.tasks.length === 0 ? (
            <div className="text-center py-10">
              <ClipboardCheck className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-1">No tasks yet</p>
              <p className="text-xs text-muted-foreground/60 mb-4">Add tasks to build the onboarding checklist</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddTaskDialogOpen(true)}
                className="gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />Add First Task
              </Button>
            </div>
          ) : (
            <motion.div
              className="space-y-5"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {Object.entries(groupedTasks).map(([category, tasks]) => {
                if (tasks.length === 0) return null;
                const catConfig = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.SETUP;
                const CatIcon = catConfig.icon;
                const completedInCat = tasks.filter(t => t.isCompleted).length;

                return (
                  <motion.div key={category} variants={staggerItem}>
                    <div className="flex items-center gap-2 mb-3">
                      <CatIcon className={`h-4 w-4 ${catConfig.color}`} />
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {catConfig.label}
                      </span>
                      <Badge variant="outline" className="text-[10px] ml-1">
                        {completedInCat}/{tasks.length}
                      </Badge>
                      <div className="flex-1 h-px bg-black/[0.03] dark:bg-white/[0.05]" />
                    </div>

                    <div className="space-y-1.5">
                      <AnimatePresence>
                        {tasks.map(task => (
                          <motion.div
                            key={task.id}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                              task.isCompleted
                                ? 'bg-emerald-500/[0.04] border-emerald-500/10'
                                : 'bg-black/[0.01] dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.02] dark:hover:bg-white/[0.04]'
                            }`}
                          >
                            {/* Checkbox */}
                            <Checkbox
                              checked={task.isCompleted}
                              onCheckedChange={() => handleToggleTask(task.id, task.isCompleted)}
                              className={`${task.isCompleted ? 'data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500' : ''}`}
                            />

                            {/* Category icon */}
                            <CatIcon className={`h-3.5 w-3.5 shrink-0 ${task.isCompleted ? 'text-muted-foreground/40' : catConfig.color}`} />

                            {/* Title + notes */}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm truncate ${task.isCompleted ? 'line-through text-muted-foreground/60' : ''}`}>
                                {task.title}
                              </p>
                              {task.notes && (
                                <p className="text-[10px] text-muted-foreground/50 truncate mt-0.5">{task.notes}</p>
                              )}
                            </div>

                            {/* Due day badge */}
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              Day {task.dueDay}
                            </Badge>

                            {/* Delete button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground/40 hover:text-rose-400 shrink-0"
                              onClick={() => handleDeleteTask(task.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </GlassCard>
      </motion.div>

      {/* ═══ EDIT PLAN DIALOG ═══ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-background border-black/[0.1] dark:border-white/[0.1] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-violet-400" />
              Edit Onboarding Plan
            </DialogTitle>
            <DialogDescription>Update plan details for {plan.employeeName}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Employee Name</label>
                <Input
                  value={editForm.employeeName}
                  onChange={e => setEditForm(prev => ({ ...prev, employeeName: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Department</label>
              <Select value={editForm.departmentId || '__none__'} onValueChange={v => setEditForm(prev => ({ ...prev, departmentId: v === '__none__' ? '' : v }))}>
                <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
                <Input
                  type="date"
                  value={editForm.startDate}
                  onChange={e => setEditForm(prev => ({ ...prev, startDate: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">End Date</label>
                <Input
                  type="date"
                  value={editForm.endDate}
                  onChange={e => setEditForm(prev => ({ ...prev, endDate: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"
                />
              </div>
            </div>

            <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                  <Users className="h-3 w-3" />Buddy
                </label>
                <Select value={editForm.buddyId || '__none__'} onValueChange={v => setEditForm(prev => ({ ...prev, buddyId: v === '__none__' ? '' : v }))}>
                  <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Select buddy" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                  <Award className="h-3 w-3" />Mentor
                </label>
                <Select value={editForm.mentorId || '__none__'} onValueChange={v => setEditForm(prev => ({ ...prev, mentorId: v === '__none__' ? '' : v }))}>
                  <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Select mentor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="text-xs">Cancel</Button>
            <Button onClick={handleUpdatePlan} disabled={saving} className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white text-xs gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ CHANGE STATUS DIALOG ═══ */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="bg-background border-black/[0.1] dark:border-white/[0.1] max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-400" />
              Change Status
            </DialogTitle>
            <DialogDescription>Select a new status for this onboarding plan</DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            {STATUS_FLOW.map(status => {
              const style = STATUS_COLORS[status] || STATUS_COLORS.NOT_STARTED;
              const isCurrent = plan.status === status;
              return (
                <button
                  key={status}
                  onClick={() => handleChangeStatus(status)}
                  disabled={isCurrent}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    isCurrent
                      ? `${style.bg} ${style.border} opacity-60 cursor-not-allowed`
                      : `${style.bg} ${style.border} hover:opacity-80 cursor-pointer`
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${style.dot} ${!isCurrent ? 'animate-pulse' : ''}`} />
                  <div>
                    <p className={`text-sm font-medium ${style.text}`}>{statusLabel(status)}</p>
                    {isCurrent && <p className="text-[10px] text-muted-foreground">Current status</p>}
                  </div>
                </button>
              );
            })}
            {/* Overdue option */}
            <button
              onClick={() => handleChangeStatus('OVERDUE')}
              disabled={plan.status === 'OVERDUE'}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                plan.status === 'OVERDUE'
                  ? 'bg-rose-500/10 border-rose-500/20 opacity-60 cursor-not-allowed'
                  : 'bg-rose-500/10 border-rose-500/20 hover:opacity-80 cursor-pointer'
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full bg-rose-400 ${plan.status !== 'OVERDUE' ? 'animate-pulse' : ''}`} />
              <div>
                <p className="text-sm font-medium text-rose-400">Overdue</p>
                {plan.status === 'OVERDUE' && <p className="text-[10px] text-muted-foreground">Current status</p>}
              </div>
            </button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)} className="text-xs">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ ADD TASK DIALOG ═══ */}
      <Dialog open={addTaskDialogOpen} onOpenChange={setAddTaskDialogOpen}>
        <DialogContent className="bg-background border-black/[0.1] dark:border-white/[0.1] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-cyan-400" />
              Add Task
            </DialogTitle>
            <DialogDescription>Add a new task to this onboarding plan</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Task Title *</label>
              <Input
                placeholder="e.g. Complete IT setup"
                value={addTaskForm.title}
                onChange={e => setAddTaskForm(prev => ({ ...prev, title: e.target.value }))}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"
                onKeyDown={e => {
                  if (e.key === 'Enter' && addTaskForm.title.trim()) handleAddTask();
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                <Select value={addTaskForm.category} onValueChange={v => setAddTaskForm(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-1.5">
                          <config.icon className={`h-3.5 w-3.5 ${config.color}`} />
                          {config.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Due Day</label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={addTaskForm.dueDay}
                  onChange={e => setAddTaskForm(prev => ({ ...prev, dueDay: parseInt(e.target.value) || 1 }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTaskDialogOpen(false)} className="text-xs">Cancel</Button>
            <Button
              onClick={handleAddTask}
              disabled={saving || !addTaskForm.title.trim()}
              className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white text-xs gap-1.5"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ DELETE CONFIRMATION DIALOG ═══ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-background border-black/[0.1] dark:border-white/[0.1]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-400" />
              Delete Onboarding Plan
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the onboarding plan for <strong className="text-foreground">{plan.employeeName}</strong>?
              This action cannot be undone. All tasks and progress will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePlan}
              disabled={saving}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1.5"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete Plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
