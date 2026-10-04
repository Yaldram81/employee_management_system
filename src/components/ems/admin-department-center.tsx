'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { StatCard } from './stat-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Department, User } from '@/lib/types';
import {
  Building2,
  Users,
  UsersRound,
  DollarSign,
  Plus,
  Loader2,
  RefreshCw,
  MapPin,
  Shield,
  Search,
  Eye,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Crown,
  FolderOpen,
  ArrowLeft,
  Calendar,
  Activity,
  Settings,
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  UserCog,
  UserPlus,
  ChevronRight,
  Briefcase,
  Phone,
} from 'lucide-react';
import { formatCurrency, getInitials } from './shared';

// ─── Helpers ───────────────────────────────────────────────────

function getAvatarColor(name: string) {
  const colors = [
    'from-emerald-500 to-cyan-500',
    'from-amber-500 to-orange-500',
    'from-violet-500 to-purple-500',
    'from-rose-500 to-pink-500',
    'from-cyan-500 to-teal-500',
    'from-lime-500 to-green-500',
    'from-fuchsia-500 to-pink-500',
    'from-sky-500 to-blue-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ─── Preset Colors ─────────────────────────────────────────────
const PRESET_COLORS = [
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#f43f5e', // rose
  '#8b5cf6', // violet
  '#3b82f6', // blue
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#84cc16', // lime
  '#6366f1', // indigo
  '#a855f7', // purple
];

// TODO: Move to seed data — this should be fetched from a department-activity API endpoint
const MOCK_ACTIVITIES = [
  { id: '1', type: 'member_added' as const, user: 'Alice Chen', description: 'joined the department', time: '2 hours ago', icon: UserPlus },
  { id: '2', type: 'budget_update' as const, user: 'Admin', description: 'Budget allocation updated to $520,000', time: '1 day ago', icon: DollarSign },
  { id: '3', type: 'team_created' as const, user: 'Bob Martinez', description: 'Created team "Backend Services"', time: '2 days ago', icon: FolderOpen },
  { id: '4', type: 'status_change' as const, user: 'Admin', description: 'Department status changed to Active', time: '3 days ago', icon: CheckCircle2 },
  { id: '5', type: 'manager_change' as const, user: 'Admin', description: 'Manager assigned: Carol Wu', time: '1 week ago', icon: Shield },
  { id: '6', type: 'member_added' as const, user: 'David Kim', description: 'joined the department', time: '1 week ago', icon: UserPlus },
];

// ─── Form State Type ───────────────────────────────────────────
interface DepartmentForm {
  name: string;
  description: string;
  color: string;
  location: string;
  budget: string;
  managerId: string;
}

const emptyForm: DepartmentForm = {
  name: '',
  description: '',
  color: PRESET_COLORS[0],
  location: '',
  budget: '',
  managerId: '',
};

// ─── Page transition variants ──────────────────────────────────
const pageVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

const listVariants = {
  enter: { opacity: 0, x: -40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 40 },
};

// ─── Color Picker Component ───────────────────────────────────
function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            'h-7 w-7 rounded-full border-2 transition-all duration-150 hover:scale-110',
            value === c
              ? 'border-white shadow-[0_0_8px_rgba(255,255,255,0.3)] scale-110'
              : 'border-transparent hover:border-black/[0.15] dark:hover:border-white/[0.3]'
          )}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

// ─── Department Form (shared for create/edit) ─────────────────
function DepartmentFormFields({
  form,
  setForm,
  managers,
}: {
  form: DepartmentForm;
  setForm: React.Dispatch<React.SetStateAction<DepartmentForm>>;
  managers: User[];
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Name <span className="text-rose-400">*</span>
        </Label>
        <Input
          placeholder="e.g. Engineering"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Description</Label>
        <Textarea
          placeholder="Brief description of the department..."
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
          className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 min-h-[80px] resize-none"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Color</Label>
        <ColorPicker
          value={form.color}
          onChange={(c) => setForm((f) => ({ ...f, color: c }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Location</Label>
          <Input
            placeholder="e.g. Floor 3, Building A"
            value={form.location}
            onChange={(e) =>
              setForm((f) => ({ ...f, location: e.target.value }))
            }
            className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Budget</Label>
          <Input
            type="number"
            placeholder="e.g. 500000"
            value={form.budget}
            onChange={(e) =>
              setForm((f) => ({ ...f, budget: e.target.value }))
            }
            className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Manager</Label>
        <Select
          value={form.managerId}
          onValueChange={(v) =>
            setForm((f) => ({ ...f, managerId: v === '__none__' ? '' : v }))
          }
        >
          <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30">
            <SelectValue placeholder="Select a manager" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No Manager</SelectItem>
            {managers.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name} ({m.role})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────
export function AdminDepartmentCenter() {
  const {
    departments,
    users,
    teams,
    shifts,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    loadDepartments,
    updateUser,
    createTeam,
    loadUsers,
    loadShifts,
  } = useEMSStore();

  // ─── Load Data on Mount ───────────────────────────────────
  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  // ─── View Mode State ─────────────────────────────────────
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);

  // ─── Filter State ────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterManager, setFilterManager] = useState<'all' | 'has-manager' | 'no-manager'>('all');

  // Employee search within detail view
  const [employeeSearch, setEmployeeSearch] = useState('');

  // Selected employee for detail view
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);

  // Edit employee dialog
  const [editEmpOpen, setEditEmpOpen] = useState(false);
  const [editEmpForm, setEditEmpForm] = useState({
    id: '', position: '', phone: '', salary: '', workMode: 'office', departmentId: '', shiftId: '',
  });
  const [editEmpSaving, setEditEmpSaving] = useState(false);

  // Add employee to department dialog
  const [addEmpOpen, setAddEmpOpen] = useState(false);
  const [addEmpSearch, setAddEmpSearch] = useState('');
  const [selectedAddEmpId, setSelectedAddEmpId] = useState<string | null>(null);
  const [addEmpSaving, setAddEmpSaving] = useState(false);

  // Create team dialog
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [createTeamForm, setCreateTeamForm] = useState({
    name: '', description: '', color: PRESET_COLORS[0],
  });
  const [createTeamSaving, setCreateTeamSaving] = useState(false);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<DepartmentForm>({ ...emptyForm });
  const [creating, setCreating] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<DepartmentForm>({ ...emptyForm });
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  // ─── Selected Department (from store) ─────────────────────
  const selectedDept = useMemo(() => {
    if (!selectedDeptId) return null;
    return departments.find((d) => d.id === selectedDeptId) || null;
  }, [selectedDeptId, departments]);

  // ─── Managers List ────────────────────────────────────────
  const managers = useMemo(() => {
    return users.filter(
      (u) => (u.role === 'manager' || u.role === 'admin') && u.isActive !== false
    );
  }, [users]);

  // ─── Filtered Departments ─────────────────────────────────
  const filteredDepartments = useMemo(() => {
    let result = [...departments];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.description || '').toLowerCase().includes(q) ||
          (d.location || '').toLowerCase().includes(q) ||
          (d.managerName || '').toLowerCase().includes(q)
      );
    }

    if (filterStatus === 'active') {
      result = result.filter((d) => d.isActive !== false);
    } else if (filterStatus === 'inactive') {
      result = result.filter((d) => d.isActive === false);
    }

    if (filterManager === 'has-manager') {
      result = result.filter((d) => d.managerId);
    } else if (filterManager === 'no-manager') {
      result = result.filter((d) => !d.managerId);
    }

    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [departments, searchQuery, filterStatus, filterManager]);

  // ─── Metrics ──────────────────────────────────────────────
  const metrics = useMemo(() => {
    const totalDepartments = departments.length;
    const totalEmployees = departments.reduce((s, d) => s + (d.employeeCount || 0), 0);
    const totalBudget = departments.reduce((s, d) => s + (d.budget || 0), 0);
    const activeDepts = departments.filter((d) => d.isActive !== false);
    const avgTeamSize =
      activeDepts.length > 0
        ? Math.round(
            activeDepts.reduce((s, d) => s + (d.employeeCount || 0), 0) /
              (activeDepts.filter((d) => (d.teamCount || 0) > 0).length || 1)
          )
        : 0;
    return { totalDepartments, totalEmployees, totalBudget, avgTeamSize };
  }, [departments]);

  // ─── Department Employees Map ─────────────────────────────
  const deptEmployeesMap = useMemo(() => {
    const map: Record<string, User[]> = {};
    for (const u of users) {
      if (u.departmentId) {
        if (!map[u.departmentId]) map[u.departmentId] = [];
        map[u.departmentId].push(u);
      }
    }
    return map;
  }, [users]);

  // ─── Department Teams Map ─────────────────────────────────
  const deptTeamsMap = useMemo(() => {
    const map: Record<string, typeof teams> = {};
    for (const t of teams) {
      if (t.departmentId) {
        if (!map[t.departmentId]) map[t.departmentId] = [];
        map[t.departmentId].push(t);
      }
    }
    return map;
  }, [teams]);

  // ─── Employees for selected department ────────────────────
  const selectedDeptEmployees = useMemo(() => {
    if (!selectedDeptId) return [];
    const emps = deptEmployeesMap[selectedDeptId] || [];
    if (!employeeSearch) return emps;
    const q = employeeSearch.toLowerCase();
    return emps.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.email || '').toLowerCase().includes(q) ||
        (e.position || '').toLowerCase().includes(q)
    );
  }, [selectedDeptId, deptEmployeesMap, employeeSearch]);

  // ─── Teams for selected department ────────────────────────
  const selectedDeptTeams = useMemo(() => {
    if (!selectedDeptId) return [];
    return deptTeamsMap[selectedDeptId] || [];
  }, [selectedDeptId, deptTeamsMap]);

  // ─── Handlers ─────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDepartments();
    await loadUsers();
    setTimeout(() => {
      setRefreshing(false);
      toast.success('Departments refreshed');
    }, 400);
  }, [loadDepartments, loadUsers]);

  const handleCreate = useCallback(async () => {
    if (!createForm.name.trim()) {
      toast.error('Department name is required');
      return;
    }
    setCreating(true);
    try {
      await createDepartment({
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        color: createForm.color || undefined,
        location: createForm.location.trim() || undefined,
        budget: createForm.budget ? parseFloat(createForm.budget) : undefined,
        managerId: createForm.managerId || undefined,
      });
      toast.success('Department created successfully');
      setCreateOpen(false);
      setCreateForm({ ...emptyForm });
    } catch {
      toast.error('Failed to create department');
    } finally {
      setTimeout(() => setCreating(false), 400);
    }
  }, [createForm, createDepartment]);

  const openEdit = useCallback(
    (dept: Department) => {
      setEditingDept(dept);
      setEditForm({
        name: dept.name,
        description: dept.description || '',
        color: dept.color || PRESET_COLORS[0],
        location: dept.location || '',
        budget: dept.budget ? String(dept.budget) : '',
        managerId: dept.managerId || '',
      });
      setEditOpen(true);
    },
    []
  );

  const handleEditSave = useCallback(async () => {
    if (!editingDept) return;
    if (!editForm.name.trim()) {
      toast.error('Department name is required');
      return;
    }
    setEditSaving(true);
    try {
      await updateDepartment(editingDept.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        color: editForm.color || null,
        location: editForm.location.trim() || null,
        budget: editForm.budget ? parseFloat(editForm.budget) : null,
        managerId: editForm.managerId || null,
      });
      toast.success('Department updated successfully');
      setEditOpen(false);
    } catch {
      toast.error('Failed to update department');
    } finally {
      setTimeout(() => setEditSaving(false), 400);
    }
  }, [editingDept, editForm, updateDepartment]);

  const handleToggleActive = useCallback(
    async (dept: Department) => {
      const newActive = dept.isActive === false;
      try {
        await updateDepartment(dept.id, { isActive: newActive });
        toast.success(
          newActive ? 'Department activated' : 'Department deactivated'
        );
      } catch {
        toast.error('Failed to update department status');
      }
    },
    [updateDepartment]
  );

  const openDeleteConfirm = useCallback(
    (dept: Department) => {
      const deptEmployees = users.filter((u) => u.departmentId === dept.id);
      if (deptEmployees.length > 0) {
        toast.error(
          `Cannot delete "${dept.name}" — it has ${deptEmployees.length} employee(s) assigned. Reassign employees first.`
        );
        return;
      }
      setDeleteTarget(dept);
      setDeleteConfirmOpen(true);
    },
    [users]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDepartment(deleteTarget.id);
      toast.success('Department deleted');
      setDeleteConfirmOpen(false);
      if (selectedDeptId === deleteTarget.id) {
        setSelectedDeptId(null);
      }
    } catch {
      toast.error('Failed to delete department');
    } finally {
      setTimeout(() => setDeleting(false), 400);
    }
  }, [deleteTarget, deleteDepartment, selectedDeptId]);

  // ─── Edit Employee Handlers ──────────────────────────────
  const openEditEmp = useCallback((emp: User) => {
    setEditEmpForm({
      id: emp.id,
      position: emp.position || '',
      phone: emp.phone || '',
      salary: emp.salary ? String(emp.salary) : '',
      workMode: emp.workMode || 'office',
      departmentId: emp.departmentId || '',
      shiftId: emp.shiftId || '',
    });
    setEditEmpOpen(true);
  }, []);

  const handleEditEmpSave = useCallback(async () => {
    if (!editEmpForm.id) return;
    setEditEmpSaving(true);
    try {
      const updates: Record<string, unknown> = {};
      if (editEmpForm.position) updates.position = editEmpForm.position;
      if (editEmpForm.phone) updates.phone = editEmpForm.phone;
      if (editEmpForm.salary) updates.salary = parseFloat(editEmpForm.salary);
      if (editEmpForm.workMode) updates.workMode = editEmpForm.workMode.toUpperCase();
      if (editEmpForm.departmentId) updates.departmentId = editEmpForm.departmentId;
      if (editEmpForm.shiftId) updates.shiftId = editEmpForm.shiftId;
      await updateUser(editEmpForm.id, updates);
      toast.success('Employee updated successfully');
      setEditEmpOpen(false);
      setSelectedEmpId(null);
    } catch {
      toast.error('Failed to update employee');
    } finally {
      setTimeout(() => setEditEmpSaving(false), 400);
    }
  }, [editEmpForm, updateUser]);

  // ─── Add Employee to Department ──────────────────────────
  const handleAddEmpToDept = useCallback(async () => {
    if (!selectedAddEmpId || !selectedDeptId) return;
    setAddEmpSaving(true);
    try {
      await updateUser(selectedAddEmpId, { departmentId: selectedDeptId });
      await loadDepartments();
      toast.success('Employee added to department');
      setAddEmpOpen(false);
      setSelectedAddEmpId(null);
      setAddEmpSearch('');
    } catch {
      toast.error('Failed to add employee to department');
    } finally {
      setTimeout(() => setAddEmpSaving(false), 400);
    }
  }, [selectedAddEmpId, selectedDeptId, updateUser, loadDepartments]);

  // ─── Create Team ─────────────────────────────────────────
  const handleCreateTeam = useCallback(async () => {
    if (!createTeamForm.name.trim()) {
      toast.error('Team name is required');
      return;
    }
    setCreateTeamSaving(true);
    try {
      await createTeam(
        createTeamForm.name.trim(),
        createTeamForm.description.trim(),
        [],
        { departmentId: selectedDeptId || undefined, color: createTeamForm.color },
      );
      toast.success('Team created successfully');
      setCreateTeamOpen(false);
      setCreateTeamForm({ name: '', description: '', color: PRESET_COLORS[0] });
    } catch {
      toast.error('Failed to create team');
    } finally {
      setTimeout(() => setCreateTeamSaving(false), 400);
    }
  }, [createTeamForm, createTeam]);

  // ─── Selected Employee ──────────────────────────────────
  const selectedEmp = useMemo(() => {
    if (!selectedEmpId) return null;
    return users.find(u => u.id === selectedEmpId) || null;
  }, [selectedEmpId, users]);



  // ─── Render: Department List ──────────────────────────────
  function renderListView() {
    return (
      <motion.div
        key="dept-list"
        variants={listVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="space-y-6"
      >
        {/* ═══ HEADER ═══ */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                Department Management
              </span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {metrics.totalDepartments} departments &middot;{' '}
              {metrics.totalEmployees} total employees
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-emerald-500/10 hover:border-emerald-500/30"
            >
              {refreshing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}{' '}
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setCreateForm({ ...emptyForm });
                setCreateOpen(true);
              }}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-500"
            >
              <Plus className="h-3.5 w-3.5" /> Create Department
            </Button>
          </div>
        </div>

        {/* ═══ STAT CARDS ROW ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { title: 'Total Departments', value: metrics.totalDepartments, icon: Building2, color: 'cyan' as const, subtitle: 'Organizational units' },
            { title: 'Total Employees', value: metrics.totalEmployees, icon: Users, color: 'emerald' as const, subtitle: 'Across all departments' },
            { title: 'Avg Team Size', value: metrics.avgTeamSize, icon: UsersRound, color: 'amber' as const, subtitle: 'Per department' },
            { title: 'Total Budget', value: formatCurrency(metrics.totalBudget), icon: DollarSign, color: 'violet' as const, subtitle: 'Combined allocation' },
          ].map((m, i) => (
            <motion.div
              key={m.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <StatCard title={m.title} value={m.value} icon={m.icon} color={m.color} subtitle={m.subtitle} hero />
            </motion.div>
          ))}
        </div>

        {/* ═══ SEARCH & FILTER ═══ */}
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl -mx-1 px-1 pt-1 pb-2">
        <GlassCard className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search departments by name, description, location, manager..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
              />
            </div>
            <Select
              value={filterStatus}
              onValueChange={(v) =>
                setFilterStatus(v as 'all' | 'active' | 'inactive')
              }
            >
              <SelectTrigger className="h-9 w-36 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filterManager}
              onValueChange={(v) =>
                setFilterManager(v as 'all' | 'has-manager' | 'no-manager')
              }
            >
              <SelectTrigger className="h-9 w-40 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                <SelectValue placeholder="Manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Managers</SelectItem>
                <SelectItem value="has-manager">Has Manager</SelectItem>
                <SelectItem value="no-manager">No Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </GlassCard>
        </div>

        {/* ═══ DEPARTMENT GRID ═══ */}
        {filteredDepartments.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard className="p-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                {searchQuery || filterStatus !== 'all' || filterManager !== 'all'
                  ? 'No departments match your filters'
                  : 'No departments yet. Create one to get started.'}
              </p>
            </GlassCard>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredDepartments.map((dept, i) => {
                const deptEmployees = deptEmployeesMap[dept.id] || [];
                const deptTeams = deptTeamsMap[dept.id] || [];
                const accentColor = dept.color || '#10b981';

                return (
                  <motion.div
                    key={dept.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <GlassCard
                      hover
                      onClick={() => setSelectedDeptId(dept.id)}
                      className="overflow-hidden"
                    >
                      {/* Color accent bar */}
                      <div
                        className="h-1.5 w-full"
                        style={{ backgroundColor: accentColor }}
                      />

                      <div className="p-5 space-y-3">
                        {/* Name + Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-base font-bold truncate">
                              {dept.name}
                            </h3>
                            {dept.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {dept.description}
                              </p>
                            )}
                          </div>
                          <Badge
                            className={cn(
                              'shrink-0 text-[10px] border',
                              dept.isActive !== false
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                                : 'bg-slate-500/15 text-slate-400 border-slate-500/25'
                            )}
                          >
                            {dept.isActive !== false ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>

                        {/* Location */}
                        {dept.location && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{dept.location}</span>
                          </div>
                        )}

                        {/* Manager */}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Shield className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            {dept.managerName || 'No manager assigned'}
                          </span>
                        </div>

                        {/* Stats Row */}
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-cyan-400" />
                            <span className="font-medium">
                              {dept.employeeCount || deptEmployees.length}
                            </span>
                            <span className="text-muted-foreground">
                              employee{(dept.employeeCount || deptEmployees.length) !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
                            <span className="font-medium">
                              {dept.teamCount || deptTeams.length}
                            </span>
                            <span className="text-muted-foreground">
                              team{(dept.teamCount || deptTeams.length) !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        {/* Budget */}
                        {dept.budget ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            <DollarSign className="h-3.5 w-3.5 text-violet-400" />
                            <span className="font-medium text-violet-400">
                              {formatCurrency(dept.budget)}
                            </span>
                            <span className="text-muted-foreground">budget</span>
                          </div>
                        ) : null}

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] gap-1 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDeptId(dept.id);
                            }}
                          >
                            <Eye className="h-3 w-3" /> View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] gap-1 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(dept);
                            }}
                          >
                            <Edit className="h-3 w-3" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              'h-7 text-[10px] gap-1',
                              dept.isActive !== false
                                ? 'text-orange-400 hover:bg-orange-500/10 hover:text-orange-300'
                                : 'text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300'
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleActive(dept);
                            }}
                          >
                            {dept.isActive !== false ? (
                              <><PowerOff className="h-3 w-3" /> Deactivate</>
                            ) : (
                              <><Power className="h-3 w-3" /> Activate</>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] gap-1 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 ml-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteConfirm(dept);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    );
  }

  // ─── Render: Department Detail Page ───────────────────────
  function renderDetailPage() {
    if (!selectedDept) return null;
    const accentColor = selectedDept.color || '#10b981';
    const budgetUtilization = selectedDept.budget ? Math.min(Math.round(((selectedDept.budget || 0) * 0.68) / (selectedDept.budget || 1) * 100), 100) : 0;

    return (
      <motion.div
        key="dept-detail"
        variants={pageVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="space-y-6"
      >
        {/* ═══ BACK BUTTON ═══ */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedDeptId(null)}
          className="gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Departments
        </Button>

        {/* ═══ DEPARTMENT HEADER ═══ */}
        <GlassCard className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${accentColor}20`, border: `1px solid ${accentColor}40` }}
              >
                <Building2 className="h-6 w-6" style={{ color: accentColor }} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold truncate">{selectedDept.name}</h2>
                  <Badge
                    className={cn(
                      'shrink-0 text-[10px] border',
                      selectedDept.isActive !== false
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                        : 'bg-slate-500/15 text-slate-400 border-slate-500/25'
                    )}
                  >
                    {selectedDept.isActive !== false ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 truncate">
                  {selectedDept.description || 'No description provided'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-amber-500/10 hover:border-amber-500/30"
                onClick={() => openEdit(selectedDept)}
              >
                <Edit className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'gap-1.5 border-black/[0.1] dark:border-white/[0.1]',
                  selectedDept.isActive !== false
                    ? 'hover:bg-orange-500/10 hover:border-orange-500/30'
                    : 'hover:bg-emerald-500/10 hover:border-emerald-500/30'
                )}
                onClick={() => handleToggleActive(selectedDept)}
              >
                {selectedDept.isActive !== false ? (
                  <><PowerOff className="h-3.5 w-3.5" /> Deactivate</>
                ) : (
                  <><Power className="h-3.5 w-3.5" /> Activate</>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-rose-500/10 hover:border-rose-500/30 text-rose-400"
                onClick={() => openDeleteConfirm(selectedDept)}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* ═══ TABS ═══ */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08]">
            <TabsTrigger value="overview" className="gap-1.5 data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-400">
              <Activity className="h-3.5 w-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="employees" className="gap-1.5 data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-400">
              <Users className="h-3.5 w-3.5" /> Employees
            </TabsTrigger>
            <TabsTrigger value="teams" className="gap-1.5 data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-400">
              <FolderOpen className="h-3.5 w-3.5" /> Teams
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 data-[state=active]:bg-violet-500/15 data-[state=active]:text-violet-400">
              <Settings className="h-3.5 w-3.5" /> Settings
            </TabsTrigger>
          </TabsList>

          {/* ═══ OVERVIEW TAB ═══ */}
          <TabsContent value="overview" className="space-y-4">
            {/* Info Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {/* Location */}
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-cyan-500/15 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Location</p>
                    <p className="text-sm font-medium truncate">{selectedDept.location || 'Not set'}</p>
                  </div>
                </div>
              </GlassCard>

              {/* Budget */}
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
                    <DollarSign className="h-4 w-4 text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Budget</p>
                    <p className="text-sm font-medium text-violet-400 truncate">
                      {selectedDept.budget ? formatCurrency(selectedDept.budget) : 'Not set'}
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* Manager */}
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  {selectedDept.managerId ? (
                    <div
                      className={cn(
                        'h-9 w-9 rounded-full bg-gradient-to-br flex items-center justify-center text-xs font-bold text-white shrink-0',
                        getAvatarColor(selectedDept.managerName || 'M')
                      )}
                    >
                      {getInitials(selectedDept.managerName || 'M')}
                    </div>
                  ) : (
                    <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                      <Shield className="h-4 w-4 text-amber-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Manager</p>
                    <p className="text-sm font-medium truncate">{selectedDept.managerName || 'Not assigned'}</p>
                  </div>
                </div>
              </GlassCard>

              {/* Status */}
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                    selectedDept.isActive !== false ? 'bg-emerald-500/15' : 'bg-slate-500/15'
                  )}>
                    {selectedDept.isActive !== false ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</p>
                    <p className="text-sm font-medium">
                      {selectedDept.isActive !== false ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* Created Date */}
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-rose-500/15 flex items-center justify-center shrink-0">
                    <Calendar className="h-4 w-4 text-rose-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Created</p>
                    <p className="text-sm font-medium truncate">
                      {selectedDept.createdAt
                        ? new Date(selectedDept.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Unknown'}
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* Employee Count */}
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <Users className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Employees</p>
                    <p className="text-sm font-medium">
                      {selectedDept.employeeCount || deptEmployeesMap[selectedDept.id]?.length || 0}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Budget Utilization */}
            {selectedDept.budget ? (
              <GlassCard className="p-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Budget Utilization</h4>
                    <span className="text-sm font-medium text-violet-400">{budgetUtilization}%</span>
                  </div>
                  <Progress
                    value={budgetUtilization}
                    className="h-2.5 bg-black/[0.04] dark:bg-white/[0.06]"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Spent: {formatCurrency(Math.round((selectedDept.budget || 0) * budgetUtilization / 100))}</span>
                    <span>Remaining: {formatCurrency(Math.round((selectedDept.budget || 0) * (100 - budgetUtilization) / 100))}</span>
                  </div>
                </div>
              </GlassCard>
            ) : null}

            {/* Activity Timeline */}
            <GlassCard className="p-5">
              <h4 className="text-sm font-semibold mb-4">Department Activity</h4>
              <div className="space-y-0">
                {MOCK_ACTIVITIES.map((activity, idx) => {
                  const IconComp = activity.icon;
                  return (
                    <div key={activity.id} className="flex gap-3">
                      {/* Timeline line + dot */}
                      <div className="flex flex-col items-center">
                        <div className="h-8 w-8 rounded-full bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center shrink-0 border border-black/[0.08] dark:border-white/[0.08]">
                          <IconComp className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        {idx < MOCK_ACTIVITIES.length - 1 && (
                          <div className="w-px flex-1 bg-black/[0.04] dark:bg-white/[0.06] my-1" />
                        )}
                      </div>
                      {/* Content */}
                      <div className={cn('pb-4 min-w-0', idx === MOCK_ACTIVITIES.length - 1 && 'pb-0')}>
                        <p className="text-sm">
                          <span className="font-medium">{activity.user}</span>{' '}
                          <span className="text-muted-foreground">{activity.description}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{activity.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </TabsContent>

          {/* ═══ EMPLOYEES TAB ═══ */}
          <TabsContent value="employees" className="space-y-4">
            <GlassCard className="p-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h4 className="text-sm font-semibold">
                  Employees ({selectedDeptEmployees.length})
                </h4>
                <div className="flex items-center gap-2">
                  <div className="relative w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search employees..."
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      className="h-8 pl-9 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-cyan-500/30"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                    onClick={() => { setAddEmpSearch(''); setSelectedAddEmpId(null); setAddEmpOpen(true); }}
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Add Employee
                  </Button>
                </div>
              </div>

              {/* Employee Detail View */}
              {selectedEmpId && selectedEmp ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedEmpId(null)} className="gap-1 text-muted-foreground">
                      <ArrowLeft className="h-3.5 w-3.5" /> Back to list
                    </Button>
                  </div>
                  <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] p-5 space-y-4">
                    {/* Employee Header */}
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'h-14 w-14 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-lg',
                        getAvatarColor(selectedEmp.name)
                      )}>
                        {getInitials(selectedEmp.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold truncate">{selectedEmp.name}</h3>
                          {selectedEmp.id === selectedDept.managerId && (
                            <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25 text-[10px]">
                              <Crown className="h-3 w-3 mr-1" />Manager
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{selectedEmp.email}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                        onClick={() => openEditEmp(selectedEmp)}
                      >
                        <Edit className="h-3.5 w-3.5" /> Edit
                      </Button>
                    </div>

                    {/* Employee Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        { icon: Briefcase, label: 'Position', value: selectedEmp.position || 'Not set' },
                        { icon: Building2, label: 'Department', value: selectedEmp.department || 'Unassigned' },
                        { icon: Shield, label: 'Role', value: selectedEmp.role.charAt(0).toUpperCase() + selectedEmp.role.slice(1) },
                        { icon: Phone, label: 'Phone', value: selectedEmp.phone || 'Not set' },
                        { icon: Calendar, label: 'Join Date', value: selectedEmp.joinDate ? new Date(selectedEmp.joinDate).toLocaleDateString() : 'Not set' },
                        { icon: DollarSign, label: 'Salary', value: selectedEmp.salary ? formatCurrency(selectedEmp.salary) : 'Not set' },
                        { icon: MapPin, label: 'Work Mode', value: (selectedEmp.workMode || 'office').charAt(0).toUpperCase() + (selectedEmp.workMode || 'office').slice(1) },
                        { icon: Activity, label: 'Status', value: selectedEmp.isActive !== false ? 'Active' : 'Inactive' },
                        { icon: Clock, label: 'Shift', value: selectedEmp.shiftName || 'Default' },
                      ].map(item => (
                        <div key={item.label} className="flex items-start gap-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] p-3">
                          <item.icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] text-muted-foreground">{item.label}</p>
                            <p className="text-xs font-medium truncate">{item.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {selectedDeptEmployees.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {employeeSearch ? 'No employees match your search' : 'No employees assigned to this department'}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-black/[0.06] dark:border-white/[0.06] overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-black/[0.06] dark:border-white/[0.06] hover:bg-transparent">
                            <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">Employee</TableHead>
                            <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">Position</TableHead>
                            <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">Email</TableHead>
                            <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">Role</TableHead>
                            <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedDeptEmployees.map((emp) => {
                            const isManager = emp.id === selectedDept.managerId;
                            return (
                              <TableRow
                                key={emp.id}
                                className={cn(
                                  'border-black/[0.04] dark:border-white/[0.04] cursor-pointer transition-colors',
                                  isManager ? 'bg-amber-500/[0.04] hover:bg-amber-500/[0.08]' : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
                                )}
                                onClick={() => setSelectedEmpId(emp.id)}
                              >
                                <TableCell>
                                  <div className="flex items-center gap-2.5">
                                    <div className="relative">
                                      <div
                                        className={cn(
                                          'h-8 w-8 rounded-full bg-gradient-to-br flex items-center justify-center text-[10px] font-bold text-white shrink-0',
                                          getAvatarColor(emp.name)
                                        )}
                                      >
                                        {getInitials(emp.name)}
                                      </div>
                                      {isManager && (
                                        <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center">
                                          <Crown className="h-2.5 w-2.5 text-white" />
                                        </div>
                                      )}
                                    </div>
                                    <span className={cn('text-sm font-medium', isManager && 'text-amber-300')}>
                                      {emp.name}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {emp.position || '—'}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1.5">
                                    <Mail className="h-3 w-3 shrink-0" />
                                    <span className="truncate max-w-[180px]">{emp.email}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={cn(
                                      'text-[9px] border',
                                      emp.role === 'admin'
                                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/25'
                                        : emp.role === 'manager'
                                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                                        : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25'
                                    )}
                                  >
                                    {isManager ? 'Manager' : emp.role}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5">
                                    <div className={cn(
                                      'h-1.5 w-1.5 rounded-full',
                                      emp.isActive !== false ? 'bg-emerald-400' : 'bg-slate-400'
                                    )} />
                                    <span className="text-xs text-muted-foreground">
                                      {emp.isActive !== false ? 'Active' : 'Inactive'}
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              )}
            </GlassCard>
          </TabsContent>

          {/* ═══ TEAMS TAB ═══ */}
          <TabsContent value="teams" className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">
                Teams ({selectedDeptTeams.length})
              </h4>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                onClick={() => setCreateTeamOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" /> Add Team
              </Button>
            </div>

            {selectedDeptTeams.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <FolderOpen className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No teams in this department</p>
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedDeptTeams.map((team) => {
                  const teamLead = team.members?.find((m) => m.role === 'LEAD');
                  return (
                    <GlassCard key={team.id} hover className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${team.color || '#6b7280'}20`, border: `1px solid ${team.color || '#6b7280'}40` }}
                        >
                          <FolderOpen className="h-4 w-4" style={{ color: team.color || '#6b7280' }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="text-sm font-bold truncate">{team.name}</h5>
                          {team.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{team.description}</p>
                          )}

                          <div className="flex items-center gap-4 mt-3 text-xs">
                            {/* Lead */}
                            {teamLead?.userName && (
                              <div className="flex items-center gap-1.5">
                                <div
                                  className={cn(
                                    'h-5 w-5 rounded-full bg-gradient-to-br flex items-center justify-center text-[8px] font-bold text-white',
                                    getAvatarColor(teamLead.userName)
                                  )}
                                >
                                  {getInitials(teamLead.userName)}
                                </div>
                                <span className="text-muted-foreground truncate max-w-[100px]">{teamLead.userName}</span>
                              </div>
                            )}

                            {/* Member count */}
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Users className="h-3 w-3" />
                              <span>{team.memberCount || team.members?.length || 0}</span>
                            </div>

                            {/* Task count */}
                            {(team.taskCount !== undefined) && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Activity className="h-3 w-3" />
                                <span>{team.taskCount} tasks</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-1" />
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ═══ SETTINGS TAB ═══ */}
          <TabsContent value="settings" className="space-y-4">
            <GlassCard className="p-6">
              <h4 className="text-sm font-semibold mb-4">Edit Department</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Name <span className="text-rose-400">*</span>
                    </Label>
                    <Input
                      value={editForm.name || selectedDept.name}
                      onChange={(e) => {
                        if (!editOpen) {
                          setEditingDept(selectedDept);
                          setEditForm({
                            name: selectedDept.name,
                            description: selectedDept.description || '',
                            color: selectedDept.color || PRESET_COLORS[0],
                            location: selectedDept.location || '',
                            budget: selectedDept.budget ? String(selectedDept.budget) : '',
                            managerId: selectedDept.managerId || '',
                          });
                        }
                        setEditForm((f) => ({ ...f, name: e.target.value }));
                      }}
                      className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Location</Label>
                    <Input
                      value={editForm.location !== '' || editOpen ? editForm.location : (selectedDept.location || '')}
                      onChange={(e) => {
                        if (!editOpen) {
                          setEditingDept(selectedDept);
                          setEditForm({
                            name: selectedDept.name,
                            description: selectedDept.description || '',
                            color: selectedDept.color || PRESET_COLORS[0],
                            location: selectedDept.location || '',
                            budget: selectedDept.budget ? String(selectedDept.budget) : '',
                            managerId: selectedDept.managerId || '',
                          });
                        }
                        setEditForm((f) => ({ ...f, location: e.target.value }));
                      }}
                      className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <Textarea
                    value={editForm.description !== '' || editOpen ? editForm.description : (selectedDept.description || '')}
                    onChange={(e) => {
                      if (!editOpen) {
                        setEditingDept(selectedDept);
                        setEditForm({
                          name: selectedDept.name,
                          description: selectedDept.description || '',
                          color: selectedDept.color || PRESET_COLORS[0],
                          location: selectedDept.location || '',
                          budget: selectedDept.budget ? String(selectedDept.budget) : '',
                          managerId: selectedDept.managerId || '',
                        });
                      }
                      setEditForm((f) => ({ ...f, description: e.target.value }));
                    }}
                    className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 min-h-[60px] resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Color</Label>
                  <ColorPicker
                    value={editForm.color || selectedDept.color || PRESET_COLORS[0]}
                    onChange={(c) => {
                      if (!editOpen) {
                        setEditingDept(selectedDept);
                        setEditForm({
                          name: selectedDept.name,
                          description: selectedDept.description || '',
                          color: selectedDept.color || PRESET_COLORS[0],
                          location: selectedDept.location || '',
                          budget: selectedDept.budget ? String(selectedDept.budget) : '',
                          managerId: selectedDept.managerId || '',
                        });
                      }
                      setEditForm((f) => ({ ...f, color: c }));
                    }}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Budget</Label>
                    <Input
                      type="number"
                      value={editForm.budget !== '' || editOpen ? editForm.budget : (selectedDept.budget ? String(selectedDept.budget) : '')}
                      onChange={(e) => {
                        if (!editOpen) {
                          setEditingDept(selectedDept);
                          setEditForm({
                            name: selectedDept.name,
                            description: selectedDept.description || '',
                            color: selectedDept.color || PRESET_COLORS[0],
                            location: selectedDept.location || '',
                            budget: selectedDept.budget ? String(selectedDept.budget) : '',
                            managerId: selectedDept.managerId || '',
                          });
                        }
                        setEditForm((f) => ({ ...f, budget: e.target.value }));
                      }}
                      className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Manager</Label>
                    <Select
                      value={editForm.managerId || selectedDept.managerId || '__none__'}
                      onValueChange={(v) => {
                        if (!editOpen) {
                          setEditingDept(selectedDept);
                          setEditForm({
                            name: selectedDept.name,
                            description: selectedDept.description || '',
                            color: selectedDept.color || PRESET_COLORS[0],
                            location: selectedDept.location || '',
                            budget: selectedDept.budget ? String(selectedDept.budget) : '',
                            managerId: selectedDept.managerId || '',
                          });
                        }
                        setEditForm((f) => ({ ...f, managerId: v === '__none__' ? '' : v }));
                      }}
                    >
                      <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30">
                        <SelectValue placeholder="Select a manager" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No Manager</SelectItem>
                        {managers.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name} ({m.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => {
                      if (!editingDept) {
                        setEditingDept(selectedDept);
                      }
                      // Use a micro-delay so state can settle
                      setTimeout(() => handleEditSave(), 50);
                    }}
                    disabled={editSaving}
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-500"
                  >
                    {editSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    {editSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </GlassCard>

            {/* Danger Zone */}
            <GlassCard className="p-6 border-rose-500/20">
              <h4 className="text-sm font-semibold text-rose-400 mb-1">Danger Zone</h4>
              <p className="text-xs text-muted-foreground mb-4">
                These actions are irreversible. Please be careful.
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-black/[0.01] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06]">
                  <div>
                    <p className="text-sm font-medium">
                      {selectedDept.isActive !== false ? 'Deactivate Department' : 'Activate Department'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedDept.isActive !== false
                        ? 'This will mark the department as inactive. Employees will remain assigned.'
                        : 'Reactivate this department.'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'gap-1.5 shrink-0',
                      selectedDept.isActive !== false
                        ? 'border-orange-500/30 text-orange-400 hover:bg-orange-500/10'
                        : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                    )}
                    onClick={() => handleToggleActive(selectedDept)}
                  >
                    {selectedDept.isActive !== false ? (
                      <><PowerOff className="h-3.5 w-3.5" /> Deactivate</>
                    ) : (
                      <><Power className="h-3.5 w-3.5" /> Activate</>
                    )}
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-black/[0.01] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06]">
                  <div>
                    <p className="text-sm font-medium">Delete Department</p>
                    <p className="text-xs text-muted-foreground">
                      Permanently delete this department. Cannot be undone.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 shrink-0 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                    onClick={() => openDeleteConfirm(selectedDept)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </div>
            </GlassCard>
          </TabsContent>
        </Tabs>
      </motion.div>
    );
  }

  // ─── Main Render ──────────────────────────────────────────
  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {selectedDeptId ? renderDetailPage() : renderListView()}
      </AnimatePresence>

      {/* ═══ CREATE DIALOG ═══ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">Create Department</DialogTitle>
            <DialogDescription>Add a new department to your organization.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
          <DepartmentFormFields form={createForm} setForm={setCreateForm} managers={managers} />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-500"
            >
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              {creating ? 'Creating...' : 'Create Department'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ EDIT DIALOG ═══ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">Edit Department</DialogTitle>
            <DialogDescription>Update department information.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
          <DepartmentFormFields form={editForm} setForm={setEditForm} managers={managers} />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={editSaving}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-500"
            >
              {editSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              {editSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ DELETE CONFIRMATION ═══ */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-400" />
              Delete Department
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.name}&rdquo;? This action cannot be undone. All associated data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-black/[0.1] dark:border-white/[0.1]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-500 gap-1.5"
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              {deleting ? 'Deleting...' : 'Delete Department'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══ EDIT EMPLOYEE DIALOG ═══ */}
      <Dialog open={editEmpOpen} onOpenChange={setEditEmpOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="rounded-lg p-2 bg-amber-500/10">
                <UserCog className="h-4 w-4 text-amber-400" />
              </div>
              Edit Employee
            </DialogTitle>
            <DialogDescription>Update employee information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Position</Label>
                <Input
                  value={editEmpForm.position}
                  onChange={(e) => setEditEmpForm(f => ({ ...f, position: e.target.value }))}
                  placeholder="e.g. Senior Developer"
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Phone</Label>
                <Input
                  value={editEmpForm.phone}
                  onChange={(e) => setEditEmpForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="e.g. +1234567890"
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Salary</Label>
                <Input
                  type="number"
                  value={editEmpForm.salary}
                  onChange={(e) => setEditEmpForm(f => ({ ...f, salary: e.target.value }))}
                  placeholder="e.g. 75000"
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Work Mode</Label>
                <Select value={editEmpForm.workMode} onValueChange={(v) => setEditEmpForm(f => ({ ...f, workMode: v }))}>
                  <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Department</Label>
                <Select value={editEmpForm.departmentId || '__none__'} onValueChange={(v) => setEditEmpForm(f => ({ ...f, departmentId: v === '__none__' ? '' : v }))}>
                  <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No Department</SelectItem>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Shift</Label>
                <Select value={editEmpForm.shiftId || '__none__'} onValueChange={(v) => setEditEmpForm(f => ({ ...f, shiftId: v === '__none__' ? '' : v }))}>
                  <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                    <SelectValue placeholder="Select shift" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Default Shift</SelectItem>
                    {shifts.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEmpOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleEditEmpSave} disabled={editEmpSaving} className="gap-1.5 bg-emerald-600 hover:bg-emerald-500">
              {editEmpSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {editEmpSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ ADD EMPLOYEE TO DEPARTMENT DIALOG ═══ */}
      <Dialog open={addEmpOpen} onOpenChange={setAddEmpOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="rounded-lg p-2 bg-cyan-500/10">
                <UserPlus className="h-4 w-4 text-cyan-400" />
              </div>
              Add Employee to {selectedDept?.name || 'Department'}
            </DialogTitle>
            <DialogDescription>Select an employee to reassign to this department.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={addEmpSearch}
                onChange={(e) => setAddEmpSearch(e.target.value)}
                className="h-9 pl-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"
              />
            </div>
            <ScrollArea className="max-h-64">
              <div className="space-y-1">
                {users
                  .filter(u => u.isActive !== false && u.departmentId !== selectedDeptId)
                  .filter(u => {
                    if (!addEmpSearch) return true;
                    const q = addEmpSearch.toLowerCase();
                    return u.name.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.position || '').toLowerCase().includes(q);
                  })
                  .map(emp => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => setSelectedAddEmpId(emp.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left',
                        selectedAddEmpId === emp.id
                          ? 'bg-emerald-500/15 border border-emerald-500/30'
                          : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03] border border-transparent'
                      )}
                    >
                      <div className={cn(
                        'h-9 w-9 rounded-full bg-gradient-to-br flex items-center justify-center text-[10px] font-bold text-white shrink-0',
                        getAvatarColor(emp.name)
                      )}>
                        {getInitials(emp.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{emp.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{emp.position || emp.email}</p>
                      </div>
                      <div className="text-xs text-muted-foreground">{emp.department || 'Unassigned'}</div>
                    </button>
                  ))}
                {users.filter(u => u.isActive !== false && u.departmentId !== selectedDeptId).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">All employees are already in this department</p>
                )}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEmpOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleAddEmpToDept} disabled={!selectedAddEmpId || addEmpSaving} className="gap-1.5 bg-emerald-600 hover:bg-emerald-500">
              {addEmpSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
              {addEmpSaving ? 'Adding...' : 'Add Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ CREATE TEAM DIALOG ═══ */}
      <Dialog open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="rounded-lg p-2 bg-amber-500/10">
                <FolderOpen className="h-4 w-4 text-amber-400" />
              </div>
              Create Team
            </DialogTitle>
            <DialogDescription>Add a new team to this department.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs">Team Name <span className="text-rose-400">*</span></Label>
              <Input
                value={createTeamForm.name}
                onChange={(e) => setCreateTeamForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Backend Services"
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Description</Label>
              <Textarea
                value={createTeamForm.description}
                onChange={(e) => setCreateTeamForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of the team..."
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] min-h-[60px] resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Color</Label>
              <ColorPicker
                value={createTeamForm.color}
                onChange={(c) => setCreateTeamForm(f => ({ ...f, color: c }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTeamOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleCreateTeam} disabled={createTeamSaving} className="gap-1.5 bg-emerald-600 hover:bg-emerald-500">
              {createTeamSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              {createTeamSaving ? 'Creating...' : 'Create Team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
