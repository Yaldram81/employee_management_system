'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  UserPlus, FileText, Monitor, GraduationCap, Users, ClipboardCheck,
  Search, Plus, Eye, CheckCircle2, Circle, Trash2, Edit3, Calendar,
  Building2, Mail, Clock, Award, MoreHorizontal, ChevronRight,
  AlertTriangle, Sparkles, ArrowRight, UserCheck, LayoutGrid,
  X, Save, Loader2, Briefcase, RefreshCw,
} from 'lucide-react';
import { formatDate, getInitials } from './shared';

// ─── Types ────────────────────────────────────────────────────────
interface OnboardingTask {
  id: string;
  onboardingPlanId: string;
  title: string;
  category: string;
  isCompleted: boolean;
  dueDay: number;
  completedAt: string | null;
  notes: string | null;
}

interface Department {
  id: string;
  name: string;
  color?: string;
}

interface UserOption {
  id: string;
  name: string;
  email?: string;
  position?: string;
}

interface OnboardingPlan {
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
  tasks: OnboardingTask[];
}

// ─── Constants ────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  NOT_STARTED: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
  IN_PROGRESS: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  COMPLETED: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  OVERDUE: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
};

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  DOCUMENTATION: { icon: FileText, color: 'text-slate-400', label: 'Documentation' },
  SETUP: { icon: Monitor, color: 'text-cyan-400', label: 'Setup' },
  TRAINING: { icon: GraduationCap, color: 'text-amber-400', label: 'Training' },
  INTRODUCTION: { icon: Users, color: 'text-violet-400', label: 'Introduction' },
  REVIEW: { icon: ClipboardCheck, color: 'text-emerald-400', label: 'Review' },
};

const DEFAULT_TASKS = [
  { title: 'HR Documentation', category: 'DOCUMENTATION', dueDay: 1 },
  { title: 'Setup Environment', category: 'SETUP', dueDay: 2 },
  { title: 'Company Orientation', category: 'TRAINING', dueDay: 3 },
  { title: 'Team Introduction', category: 'INTRODUCTION', dueDay: 5 },
  { title: 'First Project', category: 'TRAINING', dueDay: 14 },
  { title: '30-Day Review', category: 'REVIEW', dueDay: 30 },
];

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

// ─── Helper ───────────────────────────────────────────────────────

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────
export function OnboardingManagement() {
  // Data state
  const [plans, setPlans] = useState<OnboardingPlan[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter / search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDept, setFilterDept] = useState('ALL');

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addTaskDialogOpen, setAddTaskDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Selected plan
  const [selectedPlan, setSelectedPlan] = useState<OnboardingPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<OnboardingPlan | null>(null);

  // Create form state
  const [createForm, setCreateForm] = useState({
    employeeName: '',
    email: '',
    departmentId: '',
    startDate: '',
    endDate: '',
    buddyId: '',
    mentorId: '',
  });
  const [selectedDefaultTasks, setSelectedDefaultTasks] = useState<number[]>(DEFAULT_TASKS.map((_, i) => i));
  const [customTasks, setCustomTasks] = useState<{ title: string; category: string; dueDay: number }[]>([]);

  // Edit form state
  const [editForm, setEditForm] = useState({
    id: '',
    employeeName: '',
    email: '',
    departmentId: '',
    startDate: '',
    endDate: '',
    buddyId: '',
    mentorId: '',
    status: '',
  });

  // Add task form state
  const [addTaskForm, setAddTaskForm] = useState({
    title: '',
    category: 'SETUP',
    dueDay: 1,
  });

  // Task notes editing
  const [editingTaskNotes, setEditingTaskNotes] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Load Data ────────────────────────────────────────────────
  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch('/api/onboarding');
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        setPlans(json.data);
      }
    } catch (e) {
      console.error('Failed to load plans:', e);
      toast.error('Failed to load onboarding plans');
    }
  }, []);

  const loadDepartments = useCallback(async () => {
    try {
      const token = localStorage.getItem('ems-auth-token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/departments', { headers });
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        setDepartments(json.data);
      }
    } catch (e) {
      console.error('Failed to load departments:', e);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem('ems-auth-token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/users', { headers });
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        setUsers(json.data);
      }
    } catch (e) {
      console.error('Failed to load users:', e);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchPlans(), loadDepartments(), loadUsers()]);
      toast.success('Data refreshed');
    } catch {
      toast.error('Failed to refresh');
    } finally {
      setTimeout(() => setRefreshing(false), 400);
    }
  }, [fetchPlans, loadDepartments, loadUsers]);

  // Initial load
  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchPlans(), loadDepartments(), loadUsers()]);
      setLoading(false);
    }
    init();
  }, [fetchPlans, loadDepartments, loadUsers]);

  // ─── Computed Values ─────────────────────────────────────────
  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      const matchesSearch = !searchQuery ||
        p.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.email && p.email.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = filterStatus === 'ALL' || p.status === filterStatus;
      const matchesDept = filterDept === 'ALL' || p.departmentId === filterDept;
      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [plans, searchQuery, filterStatus, filterDept]);

  const totalPlans = plans.length;
  const inProgressPlans = plans.filter(p => p.status === 'IN_PROGRESS').length;
  const completedPlans = plans.filter(p => p.status === 'COMPLETED').length;
  const overduePlans = plans.filter(p => p.status === 'OVERDUE').length;

  // ─── CRUD Handlers ──────────────────────────────────────────
  const handleCreate = async () => {
    if (!createForm.employeeName || !createForm.startDate) {
      toast.error('Employee name and start date are required');
      return;
    }

    try {
      const tasks = [
        ...selectedDefaultTasks.map(i => DEFAULT_TASKS[i]),
        ...customTasks,
      ];

      const body = {
        employeeName: createForm.employeeName,
        email: createForm.email || null,
        departmentId: createForm.departmentId || null,
        startDate: createForm.startDate,
        endDate: createForm.endDate || null,
        buddyId: createForm.buddyId || null,
        mentorId: createForm.mentorId || null,
        tasks,
      };

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (json.status === 'success') {
        toast.success('Onboarding plan created successfully');
        setCreateDialogOpen(false);
        resetCreateForm();
        await fetchPlans();
      } else {
        toast.error(json.message || 'Failed to create plan');
      }
    } catch {
      toast.error('Failed to create onboarding plan');
    }
  };

  const handleUpdate = async () => {
    if (!editForm.id) return;

    try {
      const body: Record<string, unknown> = { id: editForm.id };
      if (editForm.employeeName) body.employeeName = editForm.employeeName;
      if (editForm.email !== undefined) body.email = editForm.email || null;
      if (editForm.departmentId !== undefined) body.departmentId = editForm.departmentId || null;
      if (editForm.startDate) body.startDate = editForm.startDate;
      if (editForm.endDate !== undefined) body.endDate = editForm.endDate || null;
      if (editForm.buddyId !== undefined) body.buddyId = editForm.buddyId || null;
      if (editForm.mentorId !== undefined) body.mentorId = editForm.mentorId || null;
      if (editForm.status) body.status = editForm.status;

      const res = await fetch('/api/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (json.status === 'success') {
        toast.success('Plan updated successfully');
        setEditDialogOpen(false);
        await fetchPlans();
        // Refresh detail if open
        if (selectedPlan?.id === editForm.id && json.data) {
          setSelectedPlan(json.data);
        }
      } else {
        toast.error(json.message || 'Failed to update plan');
      }
    } catch {
      toast.error('Failed to update plan');
    }
  };

  const handleDelete = async () => {
    if (!planToDelete) return;
    try {
      const res = await fetch(`/api/onboarding?id=${planToDelete.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success('Plan deleted successfully');
        setDeleteDialogOpen(false);
        setPlanToDelete(null);
        await fetchPlans();
      } else {
        toast.error(json.message || 'Failed to delete plan');
      }
    } catch {
      toast.error('Failed to delete plan');
    }
  };

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
        await fetchPlans();
        // Update detail view if open
        if (selectedPlan) {
          const freshRes = await fetch(`/api/onboarding?status=`);
          const freshJson = await freshRes.json();
          if (freshJson.data) {
            const updated = freshJson.data.find((p: OnboardingPlan) => p.id === selectedPlan.id);
            if (updated) setSelectedPlan(updated);
          }
        }
      } else {
        toast.error(json.message || 'Failed to update task');
      }
    } catch {
      toast.error('Failed to update task');
    }
  };

  const handleAddTask = async () => {
    if (!selectedPlan || !addTaskForm.title) {
      toast.error('Task title is required');
      return;
    }

    try {
      const res = await fetch('/api/onboarding-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onboardingPlanId: selectedPlan.id,
          title: addTaskForm.title,
          category: addTaskForm.category,
          dueDay: addTaskForm.dueDay,
        }),
      });

      const json = await res.json();
      if (json.status === 'success') {
        toast.success('Task added successfully');
        setAddTaskDialogOpen(false);
        setAddTaskForm({ title: '', category: 'SETUP', dueDay: 1 });
        await fetchPlans();
        // Refresh detail view
        const freshRes = await fetch(`/api/onboarding`);
        const freshJson = await freshRes.json();
        if (freshJson.data) {
          const updated = freshJson.data.find((p: OnboardingPlan) => p.id === selectedPlan.id);
          if (updated) setSelectedPlan(updated);
        }
      } else {
        toast.error(json.message || 'Failed to add task');
      }
    } catch {
      toast.error('Failed to add task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/onboarding-tasks?id=${taskId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success('Task removed');
        await fetchPlans();
        if (selectedPlan) {
          const freshRes = await fetch(`/api/onboarding`);
          const freshJson = await freshRes.json();
          if (freshJson.data) {
            const updated = freshJson.data.find((p: OnboardingPlan) => p.id === selectedPlan.id);
            if (updated) setSelectedPlan(updated);
          }
        }
      } else {
        toast.error(json.message || 'Failed to delete task');
      }
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const handleUpdateTaskNotes = async (taskId: string, notes: string) => {
    try {
      const res = await fetch('/api/onboarding-tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, notes }),
      });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success('Notes saved');
        setEditingTaskNotes(null);
        await fetchPlans();
        if (selectedPlan) {
          const freshRes = await fetch(`/api/onboarding`);
          const freshJson = await freshRes.json();
          if (freshJson.data) {
            const updated = freshJson.data.find((p: OnboardingPlan) => p.id === selectedPlan.id);
            if (updated) setSelectedPlan(updated);
          }
        }
      }
    } catch {
      toast.error('Failed to save notes');
    }
  };

  const handleChangeStatus = async (planId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: planId, status: newStatus }),
      });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success(`Status changed to ${statusLabel(newStatus)}`);
        await fetchPlans();
        if (selectedPlan?.id === planId && json.data) {
          setSelectedPlan(json.data);
        }
      } else {
        toast.error(json.message || 'Failed to change status');
      }
    } catch {
      toast.error('Failed to change status');
    }
  };

  const handleAssignBuddyMentor = async (planId: string, buddyId: string | null, mentorId: string | null) => {
    try {
      const body: Record<string, unknown> = { id: planId };
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
        await fetchPlans();
        if (selectedPlan?.id === planId && json.data) {
          setSelectedPlan(json.data);
        }
      } else {
        toast.error(json.message || 'Failed to update assignment');
      }
    } catch {
      toast.error('Failed to update assignment');
    }
  };

  // ─── Dialog openers ─────────────────────────────────────────
  const openDetail = (plan: OnboardingPlan) => {
    useEMSStore.getState().setSelectedOnboardingId(plan.id);
    useEMSStore.getState().setActiveView('onboarding-detail');
  };

  const openEdit = (plan: OnboardingPlan) => {
    setEditForm({
      id: plan.id,
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

  const openCreate = () => {
    resetCreateForm();
    setCreateDialogOpen(true);
  };

  const resetCreateForm = () => {
    setCreateForm({
      employeeName: '',
      email: '',
      departmentId: '',
      startDate: '',
      endDate: '',
      buddyId: '',
      mentorId: '',
    });
    setSelectedDefaultTasks(DEFAULT_TASKS.map((_, i) => i));
    setCustomTasks([]);
  };

  // ─── Loading State ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="h-8 w-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading onboarding data…</p>
      </div>
    );
  }

  // ─── Group tasks by category ────────────────────────────────
  const groupTasksByCategory = (tasks: OnboardingTask[]) => {
    const groups: Record<string, OnboardingTask[]> = {};
    tasks.forEach(t => {
      const cat = t.category || 'SETUP';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    });
    return groups;
  };

  // ─── RENDER ──────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-4">
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-violet-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Employee Onboarding Management
            </span>
          </h2>
          <div className="flex items-center gap-3 mt-1.5">
            <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block mr-1 animate-pulse" />{inProgressPlans} Active
            </Badge>
            <Badge className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />{completedPlans} Completed
            </Badge>
            {overduePlans > 0 && (
              <Badge className="bg-rose-500/15 text-rose-400 border border-rose-500/25 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />{overduePlans} Overdue
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-violet-500/10 hover:border-violet-500/30"
          >
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => { setForm({ ...emptyForm }); setCreateOpen(true); }}
            className="gap-1.5 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white"
          >
            <Plus className="h-3.5 w-3.5" /> Create Plan
          </Button>
        </div>
      </div>

      {/* ═══ STATS BAR ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Plans" value={totalPlans} subtitle="All onboarding plans" icon={LayoutGrid} color="violet" hero />
        <StatCard title="In Progress" value={inProgressPlans} subtitle="Currently active" icon={Clock} color="emerald" hero pulse={inProgressPlans > 0} />
        <StatCard title="Completed" value={completedPlans} subtitle="Successfully done" icon={CheckCircle2} color="cyan" hero />
        <StatCard title="Overdue" value={overduePlans} subtitle="Needs attention" icon={AlertTriangle} color="rose" hero pulse={overduePlans > 0} />
      </div>

      {/* ═══ TOOLBAR ═══ */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by employee name or email…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[170px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="NOT_STARTED">Not Started</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-[170px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Departments</SelectItem>
            {departments.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={openCreate}
          className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white gap-2 shrink-0"
        >
          <UserPlus className="h-4 w-4" />Create Onboarding Plan
        </Button>
      </div>

      {/* ═══ CONTENT AREA ═══ */}
      {filteredPlans.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <UserPlus className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-1">No Onboarding Plans Found</h3>
          <p className="text-sm text-muted-foreground/60 mb-4">
            {searchQuery || filterStatus !== 'ALL' || filterDept !== 'ALL'
              ? 'Try adjusting your filters or search query'
              : 'Create your first onboarding plan to get started'}
          </p>
          <Button onClick={openCreate} className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white gap-2">
            <Plus className="h-4 w-4" />Create Onboarding Plan
          </Button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredPlans.map((plan, idx) => {
              const completedTasks = plan.tasks.filter(t => t.isCompleted).length;
              const totalTasks = plan.tasks.length;
              const statusStyle = STATUS_COLORS[plan.status] || STATUS_COLORS.NOT_STARTED;
              const glowColor = plan.status === 'IN_PROGRESS' ? 'emerald' as const
                : plan.status === 'OVERDUE' ? 'rose' as const
                : plan.status === 'COMPLETED' ? 'cyan' as const : 'none' as const;

              return (
                <motion.div key={plan.id} {...fadeIn} transition={{ delay: idx * 0.05, duration: 0.3 }}>
                  <GlassCard className="p-5 h-full flex flex-col" glow={glowColor} hover>
                    {/* Employee Info */}
                    <div
                      className="flex items-start justify-between mb-3 cursor-pointer"
                      onClick={() => openDetail(plan)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className="bg-gradient-to-br from-violet-600 to-cyan-600 text-white text-xs">
                            {getInitials(plan.employeeName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{plan.employeeName}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{plan.email || 'No email'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <Eye className="h-3.5 w-3.5 text-muted-foreground/50" />
                        <Badge className={`${statusStyle.bg} ${statusStyle.text} border-0 text-[9px] font-medium`}>
                          {statusLabel(plan.status)}
                        </Badge>
                      </div>
                    </div>

                    {/* Department Badge */}
                    {plan.department && (
                      <div className="mb-3">
                        <Badge className="bg-black/[0.03] dark:bg-white/[0.05] text-muted-foreground border-black/[0.1] dark:border-white/[0.1] text-[10px] gap-1">
                          <Building2 className="h-3 w-3" />{plan.department.name}
                        </Badge>
                      </div>
                    )}

                    {/* Progress */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">Progress</span>
                        <span className="text-[10px] font-bold">{plan.progress}%</span>
                      </div>
                      <Progress value={plan.progress} className="h-2 bg-black/[0.03] dark:bg-white/[0.05]" />
                    </div>

                    {/* Task Ratio */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">Tasks</span>
                        <span className="text-[10px] font-medium">
                          <span className={completedTasks === totalTasks && totalTasks > 0 ? 'text-emerald-400' : ''}>
                            {completedTasks}
                          </span>
                          /{totalTasks}
                        </span>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />{formatDate(plan.startDate)}
                      </span>
                      {plan.endDate && (
                        <>
                          <ChevronRight className="h-3 w-3" />
                          <span>{formatDate(plan.endDate)}</span>
                        </>
                      )}
                    </div>

                    {/* Buddy / Mentor */}
                    {(plan.buddy || plan.mentor) && (
                      <div className="flex gap-3 mb-3">
                        {plan.buddy && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />Buddy: {plan.buddy.name}
                          </span>
                        )}
                        {plan.mentor && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Award className="h-3 w-3" />Mentor: {plan.mentor.name}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div className="flex items-center gap-2 mt-auto pt-2 border-t border-black/[0.06] dark:border-white/[0.05]">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px] text-violet-400 hover:text-violet-300 gap-1"
                        onClick={() => openDetail(plan)}
                      >
                        <Eye className="h-3 w-3" />Detail
                      </Button>
                      {plan.tasks.some(t => !t.isCompleted) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] text-emerald-400 hover:text-emerald-300 gap-1"
                          onClick={() => {
                            const nextTask = plan.tasks.find(t => !t.isCompleted);
                            if (nextTask) handleToggleTask(nextTask.id, nextTask.isCompleted);
                          }}
                        >
                          <CheckCircle2 className="h-3 w-3" />Next Task
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px] text-cyan-400 hover:text-cyan-300 gap-1 ml-auto"
                        onClick={() => {
                          setSelectedPlan(plan);
                          setAddTaskDialogOpen(true);
                        }}
                      >
                        <Plus className="h-3 w-3" />Task
                      </Button>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ═══ CREATE ONBOARDING PLAN DIALOG ═══ */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-background border-black/[0.1] dark:border-white/[0.1] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-violet-400" />
              Create Onboarding Plan
            </DialogTitle>
            <DialogDescription>Set up a new employee onboarding workflow with tasks and assignments</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Employee Info */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee Information</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Employee Name *</label>
                  <Input
                    placeholder="Full name"
                    value={createForm.employeeName}
                    onChange={e => setCreateForm(prev => ({ ...prev, employeeName: e.target.value }))}
                    className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                  <Input
                    type="email"
                    placeholder="email@company.com"
                    value={createForm.email}
                    onChange={e => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Department</label>
                <Select value={createForm.departmentId} onValueChange={v => setCreateForm(prev => ({ ...prev, departmentId: v }))}>
                  <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />

            {/* Dates */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Schedule</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Start Date *</label>
                  <Input
                    type="date"
                    value={createForm.startDate}
                    onChange={e => setCreateForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Expected End Date</label>
                  <Input
                    type="date"
                    value={createForm.endDate}
                    onChange={e => setCreateForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"
                  />
                </div>
              </div>
            </div>

            <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />

            {/* Buddy & Mentor */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assignments</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                    <Users className="h-3 w-3" />Buddy
                  </label>
                  <Select value={createForm.buddyId} onValueChange={v => setCreateForm(prev => ({ ...prev, buddyId: v }))}>
                    <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Select buddy" /></SelectTrigger>
                    <SelectContent>
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
                  <Select value={createForm.mentorId} onValueChange={v => setCreateForm(prev => ({ ...prev, mentorId: v }))}>
                    <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Select mentor" /></SelectTrigger>
                    <SelectContent>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />

            {/* Default Tasks */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Default Onboarding Tasks</p>
              <div className="space-y-2">
                {DEFAULT_TASKS.map((task, i) => {
                  const CatIcon = CATEGORY_CONFIG[task.category]?.icon || FileText;
                  const catColor = CATEGORY_CONFIG[task.category]?.color || 'text-muted-foreground';
                  const isSelected = selectedDefaultTasks.includes(i);
                  return (
                    <label
                      key={i}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-violet-500/10 border-violet-500/20'
                          : 'bg-black/[0.01] dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.02] dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedDefaultTasks(prev => [...prev, i]);
                          } else {
                            setSelectedDefaultTasks(prev => prev.filter(x => x !== i));
                          }
                        }}
                      />
                      <CatIcon className={`h-4 w-4 ${catColor} shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{task.title}</p>
                        <p className="text-[10px] text-muted-foreground">Day {task.dueDay} · {CATEGORY_CONFIG[task.category]?.label}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />

            {/* Custom Tasks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Custom Tasks</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] text-violet-400 hover:text-violet-300 gap-1"
                  onClick={() => setCustomTasks(prev => [...prev, { title: '', category: 'SETUP', dueDay: 7 }])}
                >
                  <Plus className="h-3 w-3" />Add Custom Task
                </Button>
              </div>
              {customTasks.length > 0 && (
                <div className="space-y-2">
                  {customTasks.map((task, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        placeholder="Task title"
                        value={task.title}
                        onChange={e => {
                          const updated = [...customTasks];
                          updated[i] = { ...updated[i], title: e.target.value };
                          setCustomTasks(updated);
                        }}
                        className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] flex-1"
                      />
                      <Select
                        value={task.category}
                        onValueChange={v => {
                          const updated = [...customTasks];
                          updated[i] = { ...updated[i], category: v };
                          setCustomTasks(updated);
                        }}
                      >
                        <SelectTrigger className="w-[130px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                            <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="Day"
                        value={task.dueDay}
                        onChange={e => {
                          const updated = [...customTasks];
                          updated[i] = { ...updated[i], dueDay: parseInt(e.target.value) || 1 };
                          setCustomTasks(updated);
                        }}
                        className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] w-16"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-rose-400 hover:text-rose-300 shrink-0"
                        onClick={() => setCustomTasks(prev => prev.filter((_, j) => j !== i))}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateDialogOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">
              Cancel
            </Button>
            <Button onClick={handleCreate} className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white gap-2">
              <Sparkles className="h-4 w-4" />Create Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ EDIT PLAN DIALOG ═══ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-background border-black/[0.1] dark:border-white/[0.1] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-amber-400" />
              Edit Onboarding Plan
            </DialogTitle>
            <DialogDescription>Update plan details, assignments, and status</DialogDescription>
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
                  value={editForm.email}
                  onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Department</label>
                <Select value={editForm.departmentId} onValueChange={v => setEditForm(prev => ({ ...prev, departmentId: v }))}>
                  <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None</SelectItem>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                <Select value={editForm.status} onValueChange={v => setEditForm(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="OVERDUE">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                  <Users className="h-3 w-3" />Buddy
                </label>
                <Select value={editForm.buddyId} onValueChange={v => setEditForm(prev => ({ ...prev, buddyId: v }))}>
                  <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None</SelectItem>
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
                <Select value={editForm.mentorId} onValueChange={v => setEditForm(prev => ({ ...prev, mentorId: v }))}>
                  <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditDialogOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">
              Cancel
            </Button>
            <Button onClick={handleUpdate} className="bg-gradient-to-r from-amber-600 to-emerald-600 text-white gap-2">
              <Save className="h-4 w-4" />Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ ADD TASK DIALOG ═══ */}
      <Dialog open={addTaskDialogOpen} onOpenChange={setAddTaskDialogOpen}>
        <DialogContent className="bg-background border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-cyan-400" />
              Add Task
            </DialogTitle>
            <DialogDescription>
              Add a new task to {selectedPlan?.employeeName}&apos;s onboarding plan
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Task Title *</label>
              <Input
                placeholder="Enter task title"
                value={addTaskForm.title}
                onChange={e => setAddTaskForm(prev => ({ ...prev, title: e.target.value }))}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                <Select value={addTaskForm.category} onValueChange={v => setAddTaskForm(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Due Day</label>
                <Input
                  type="number"
                  min={1}
                  value={addTaskForm.dueDay}
                  onChange={e => setAddTaskForm(prev => ({ ...prev, dueDay: parseInt(e.target.value) || 1 }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddTaskDialogOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">
              Cancel
            </Button>
            <Button onClick={handleAddTask} className="bg-gradient-to-r from-cyan-600 to-emerald-600 text-white gap-2">
              <Plus className="h-4 w-4" />Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ DELETE CONFIRMATION DIALOG ═══ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-background border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="h-5 w-5" />
              Delete Onboarding Plan
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the onboarding plan for <strong>{planToDelete?.employeeName}</strong>?
              This action cannot be undone and will remove all associated tasks.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">
              Cancel
            </Button>
            <Button onClick={handleDelete} className="bg-rose-600 text-white gap-2 hover:bg-rose-700">
              <Trash2 className="h-4 w-4" />Delete Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
