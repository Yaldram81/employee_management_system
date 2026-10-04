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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { User, AttendanceRecord, Task, PayrollRecord, Complaint, Request } from '@/lib/types';
import {
  Users,
  Shield,
  UserCheck,
  Plus,
  Loader2,
  RefreshCw,
  Search,
  Eye,
  Edit,
  Power,
  PowerOff,
  ArrowLeft,
  Calendar,
  Activity,
  Settings,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCog,
  UserPlus,
  MoreHorizontal,
  LayoutGrid,
  List,
  KeyRound,
  DollarSign,
  Home,
  Wifi,
  ListTodo,
  MessageSquare,
  FileText,
  Timer,
  Flame,
} from 'lucide-react';
import { formatCurrency, getInitials } from './shared';

// ─── Helpers ───────────────────────────────────────────────────

function getAvatarColor(name: string) {
  const colors = [
    'from-emerald-500 to-cyan-500',
    'from-amber-500 to-orange-500',
    'from-rose-500 to-pink-500',
    'from-cyan-500 to-teal-500',
    'from-lime-500 to-green-500',
    'from-fuchsia-500 to-pink-500',
    'from-violet-500 to-purple-500',
    'from-teal-500 to-emerald-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getWorkModeIcon(mode?: string) {
  switch (mode) {
    case 'remote':
      return <Home className="h-3.5 w-3.5" />;
    case 'hybrid':
      return <Wifi className="h-3.5 w-3.5" />;
    case 'office':
    default:
      return <Building2 className="h-3.5 w-3.5" />;
  }
}

function getWorkModeLabel(mode?: string) {
  switch (mode) {
    case 'remote':
      return 'Remote';
    case 'hybrid':
      return 'Hybrid';
    case 'office':
      return 'On-site';
    default:
      return 'Not set';
  }
}

// ─── Role Badge Config ─────────────────────────────────────────
const ROLE_BADGE: Record<string, { bg: string; text: string; border: string; icon: typeof Shield }> = {
  admin: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/25', icon: Shield },
  manager: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/25', icon: UserCheck },
  employee: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/25', icon: Users },
};

// TODO: Move to seed data — this should be fetched from an activity-log API endpoint
const MOCK_USER_ACTIVITIES = [
  { id: '1', type: 'login' as const, description: 'Logged in from 192.168.1.42', time: '2 hours ago', icon: Clock },
  { id: '2', type: 'task_completed' as const, description: 'Completed task "Q4 Budget Review"', time: '5 hours ago', icon: CheckCircle2 },
  { id: '3', type: 'leave_applied' as const, description: 'Applied for casual leave (Mar 15-16)', time: '1 day ago', icon: Calendar },
  { id: '4', type: 'profile_update' as const, description: 'Updated phone number', time: '2 days ago', icon: UserCog },
  { id: '5', type: 'login' as const, description: 'Logged in from 10.0.0.15', time: '3 days ago', icon: Clock },
  { id: '6', type: 'task_completed' as const, description: 'Completed task "API Documentation"', time: '4 days ago', icon: CheckCircle2 },
  { id: '7', type: 'team_joined' as const, description: 'Joined team "Backend Services"', time: '1 week ago', icon: Users },
  { id: '8', type: 'login' as const, description: 'Logged in from 172.16.0.8', time: '1 week ago', icon: Clock },
];

// ─── Form State Type ───────────────────────────────────────────
interface UserForm {
  name: string;
  email: string;
  password: string;
  role: string;
  departmentId: string;
  phone: string;
  position: string;
  workMode: string;
  salary: string;
  joinDate: string;
}

const emptyForm: UserForm = {
  name: '',
  email: '',
  password: '',
  role: 'employee',
  departmentId: '',
  phone: '',
  position: '',
  workMode: 'office',
  salary: '',
  joinDate: new Date().toISOString().split('T')[0],
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

// ─── Main Component ────────────────────────────────────────────
export function UserManagement() {
  const {
    users,
    departments,
    teams,
    attendance,
    tasks,
    payroll,
    complaints,
    requests,
    createUser,
    updateUser,
    deactivateUser,
    loadUsers,
  } = useEMSStore();

  // ─── Load Data on Mount ───────────────────────────────────
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // ─── View Mode State ─────────────────────────────────────
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // ─── Filter State ────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterWorkMode, setFilterWorkMode] = useState<string>('all');

  // ─── Selection State ─────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ─── Create dialog ───────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<UserForm>({ ...emptyForm });
  const [creating, setCreating] = useState(false);

  // ─── Edit dialog ─────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<UserForm>({ ...emptyForm });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // ─── Deactivate confirmation ─────────────────────────────
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  // ─── Change Password dialog ──────────────────────────────
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  // ─── Selected User (from store) ──────────────────────────
  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    return users.find((u) => u.id === selectedUserId) || null;
  }, [selectedUserId, users]);

  // ─── Filtered Users ──────────────────────────────────────
  const filteredUsers = useMemo(() => {
    let result = [...users];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.position || '').toLowerCase().includes(q) ||
          (u.phone || '').toLowerCase().includes(q)
      );
    }

    if (filterRole !== 'all') {
      result = result.filter((u) => u.role === filterRole);
    }

    if (filterDept !== 'all') {
      result = result.filter((u) => u.departmentId === filterDept);
    }

    if (filterStatus === 'active') {
      result = result.filter((u) => u.isActive !== false);
    } else if (filterStatus === 'inactive') {
      result = result.filter((u) => u.isActive === false);
    }

    if (filterWorkMode !== 'all') {
      result = result.filter((u) => u.workMode === filterWorkMode);
    }

    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [users, searchQuery, filterRole, filterDept, filterStatus, filterWorkMode]);

  // ─── Metrics ─────────────────────────────────────────────
  const metrics = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.isActive !== false).length;
    const adminsManagers = users.filter(
      (u) => (u.role === 'admin' || u.role === 'manager') && u.isActive !== false
    ).length;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const newThisMonth = users.filter(
      (u) => u.joinDate && u.joinDate >= monthStart
    ).length;
    return { totalUsers, activeUsers, adminsManagers, newThisMonth };
  }, [users]);

  // ─── User Teams Map ──────────────────────────────────────
  const userTeamsMap = useMemo(() => {
    const map: Record<string, typeof teams> = {};
    for (const t of teams) {
      if (t.members) {
        for (const m of t.members) {
          if (!map[m.userId]) map[m.userId] = [];
          map[m.userId].push(t);
        }
      }
    }
    return map;
  }, [teams]);

  // ─── Employee Attendance Data ───────────────────────────
  const employeeAttendance = useMemo(() => {
    if (!selectedUserId) return [];
    return attendance.filter(a => a.userId === selectedUserId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendance, selectedUserId]);

  const employeeAttendanceStats = useMemo(() => {
    const present = employeeAttendance.filter(a => a.status === 'present').length;
    const late = employeeAttendance.filter(a => a.status === 'late').length;
    const absent = employeeAttendance.filter(a => a.status === 'absent').length;
    const totalHours = employeeAttendance.reduce((s, a) => s + (a.totalHours || 0), 0);
    return { present, late, absent, totalHours };
  }, [employeeAttendance]);

  // ─── Employee Tasks ─────────────────────────────────────
  const employeeTasks = useMemo(() => {
    if (!selectedUserId) return [];
    return tasks.filter(t => t.assigneeId === selectedUserId);
  }, [tasks, selectedUserId]);

  const employeeTaskStats = useMemo(() => {
    const total = employeeTasks.length;
    const completed = employeeTasks.filter(t => t.status === 'done').length;
    const inProgress = employeeTasks.filter(t => t.status === 'in-progress').length;
    const todo = employeeTasks.filter(t => t.status === 'todo').length;
    return { total, completed, inProgress, todo };
  }, [employeeTasks]);

  // ─── Employee Payroll ───────────────────────────────────
  const employeePayroll = useMemo(() => {
    if (!selectedUserId) return [];
    return payroll.filter(p => p.userId === selectedUserId)
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [payroll, selectedUserId]);

  // ─── Employee Complaints ────────────────────────────────
  const employeeComplaints = useMemo(() => {
    if (!selectedUserId) return [];
    return complaints.filter(c => c.userId === selectedUserId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [complaints, selectedUserId]);

  const employeeComplaintStats = useMemo(() => {
    const total = employeeComplaints.length;
    const open = employeeComplaints.filter(c => c.status === 'open' || c.status === 'in-progress' || c.status === 'investigating').length;
    const resolved = employeeComplaints.filter(c => c.status === 'resolved' || c.status === 'closed').length;
    return { total, open, resolved };
  }, [employeeComplaints]);

  // ─── Employee Requests ──────────────────────────────────
  const employeeRequests = useMemo(() => {
    if (!selectedUserId) return [];
    return requests.filter(r => r.userId === selectedUserId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [requests, selectedUserId]);

  const employeeRequestStats = useMemo(() => {
    const total = employeeRequests.length;
    const pending = employeeRequests.filter(r => r.status === 'pending' || r.status === 'under-review').length;
    const approved = employeeRequests.filter(r => r.status === 'approved').length;
    return { total, pending, approved };
  }, [employeeRequests]);

  // ─── Get Department Name ─────────────────────────────────
  const getDeptName = useCallback(
    (id: string) => departments.find((d) => d.id === id)?.name || '—',
    [departments]
  );

  // ─── Handlers ─────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUsers();
    setTimeout(() => {
      setRefreshing(false);
      toast.success('Users refreshed');
    }, 400);
  }, [loadUsers]);

  const handleCreate = useCallback(async () => {
    if (!createForm.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!createForm.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!createForm.password.trim()) {
      toast.error('Password is required');
      return;
    }
    setCreating(true);
    try {
      await createUser({
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role || undefined,
        departmentId: createForm.departmentId || undefined,
        phone: createForm.phone.trim() || undefined,
        position: createForm.position.trim() || undefined,
        workMode: createForm.workMode || undefined,
        salary: createForm.salary ? parseFloat(createForm.salary) : undefined,
        joinDate: createForm.joinDate || undefined,
      });
      toast.success('User created successfully');
      setCreateOpen(false);
      setCreateForm({ ...emptyForm });
    } catch {
      toast.error('Failed to create user');
    } finally {
      setTimeout(() => setCreating(false), 400);
    }
  }, [createForm, createUser]);

  const openEdit = useCallback(
    (user: User) => {
      setEditingUser(user);
      setEditForm({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        departmentId: user.departmentId || '',
        phone: user.phone || '',
        position: user.position || '',
        workMode: user.workMode || 'office',
        salary: user.salary ? String(user.salary) : '',
        joinDate: user.joinDate ? user.joinDate.split('T')[0] : '',
      });
      setEditOpen(true);
    },
    []
  );

  const handleEditSave = useCallback(async () => {
    if (!editingUser) return;
    if (!editForm.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!editForm.email.trim()) {
      toast.error('Email is required');
      return;
    }
    setEditSaving(true);
    try {
      await updateUser(editingUser.id, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
        departmentId: editForm.departmentId || null,
        phone: editForm.phone.trim() || null,
        position: editForm.position.trim() || null,
        workMode: editForm.workMode || null,
        salary: editForm.salary ? parseFloat(editForm.salary) : null,
        joinDate: editForm.joinDate || null,
      });
      toast.success('User updated successfully');
      setEditOpen(false);
    } catch {
      toast.error('Failed to update user');
    } finally {
      setTimeout(() => setEditSaving(false), 400);
    }
  }, [editingUser, editForm, updateUser]);

  const handleToggleActive = useCallback(
    async (user: User) => {
      if (user.isActive !== false) {
        setDeactivateTarget(user);
        setDeactivateConfirmOpen(true);
      } else {
        try {
          await updateUser(user.id, { isActive: true });
          toast.success('User reactivated');
        } catch {
          toast.error('Failed to reactivate user');
        }
      }
    },
    [updateUser]
  );

  const handleDeactivate = useCallback(async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      await deactivateUser(deactivateTarget.id);
      toast.success('User deactivated');
      setDeactivateConfirmOpen(false);
      if (selectedUserId === deactivateTarget.id) {
        setSelectedUserId(null);
      }
    } catch {
      toast.error('Failed to deactivate user');
    } finally {
      setTimeout(() => setDeactivating(false), 400);
    }
  }, [deactivateTarget, deactivateUser, selectedUserId]);

  const handleChangePassword = useCallback(async () => {
    if (!passwordUser) return;
    if (!newPassword.trim() || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setPasswordSaving(true);
    try {
      await updateUser(passwordUser.id, { password: newPassword });
      toast.success('Password updated successfully');
      setPasswordOpen(false);
      setNewPassword('');
    } catch {
      toast.error('Failed to update password');
    } finally {
      setTimeout(() => setPasswordSaving(false), 400);
    }
  }, [passwordUser, newPassword, updateUser]);

  // ─── Bulk Selection ──────────────────────────────────────
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredUsers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredUsers.map((u) => u.id)));
    }
  }, [selectedIds.size, filteredUsers]);

  const handleBulkDeactivate = useCallback(async () => {
    try {
      for (const id of selectedIds) {
        await deactivateUser(id);
      }
      toast.success(`${selectedIds.size} user(s) deactivated`);
      setSelectedIds(new Set());
    } catch {
      toast.error('Failed to deactivate some users');
    }
  }, [selectedIds, deactivateUser]);

  const handleBulkChangeDept = useCallback(
    async (deptId: string) => {
      const deptName = departments.find((d) => d.id === deptId)?.name || 'Unknown';
      try {
        for (const id of selectedIds) {
          await updateUser(id, { departmentId: deptId });
        }
        toast.success(`${selectedIds.size} user(s) moved to ${deptName}`);
        setSelectedIds(new Set());
      } catch {
        toast.error('Failed to move some users');
      }
    },
    [selectedIds, departments, updateUser]
  );

  // ─── User Form (shared for create/edit) ──────────────────
  function UserFormFields({
    form,
    setForm,
    isEdit,
  }: {
    form: UserForm;
    setForm: React.Dispatch<React.SetStateAction<UserForm>>;
    isEdit?: boolean;
  }) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Name <span className="text-rose-400">*</span>
            </Label>
            <Input
              placeholder="John Doe"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Email <span className="text-rose-400">*</span>
            </Label>
            <Input
              placeholder="john@company.com"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
            />
          </div>
        </div>
        {!isEdit && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Password <span className="text-rose-400">*</span>
            </Label>
            <Input
              placeholder="Minimum 6 characters"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Role</Label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
            >
              <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Department</Label>
            <Select
              value={form.departmentId || '__none__'}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, departmentId: v === '__none__' ? '' : v }))
              }
            >
              <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No Department</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Position</Label>
            <Input
              placeholder="e.g. Senior Developer"
              value={form.position}
              onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
              className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Phone</Label>
            <Input
              placeholder="e.g. +1 555-0123"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Work Mode</Label>
            <Select
              value={form.workMode}
              onValueChange={(v) => setForm((f) => ({ ...f, workMode: v }))}
            >
              <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30">
                <SelectValue placeholder="Select work mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="office">On-site</SelectItem>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Salary</Label>
            <Input
              type="number"
              placeholder="e.g. 75000"
              value={form.salary}
              onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))}
              className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Join Date</Label>
          <Input
            type="date"
            value={form.joinDate}
            onChange={(e) => setForm((f) => ({ ...f, joinDate: e.target.value }))}
            className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
          />
        </div>
      </div>
    );
  }

  // ─── Render: User List ───────────────────────────────────
  function renderListView() {
    return (
      <motion.div
        key="user-list"
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
                Employee Management
              </span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {metrics.totalUsers} employees &middot; {metrics.activeUsers} active
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
              <Plus className="h-3.5 w-3.5" /> Add Employee
            </Button>
          </div>
        </div>

        {/* ═══ STAT CARDS ROW ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { title: 'Total Employees', value: metrics.totalUsers, icon: Users, color: 'cyan' as const, subtitle: 'All registered' },
            { title: 'Active Employees', value: metrics.activeUsers, icon: UserCheck, color: 'emerald' as const, subtitle: 'Currently active' },
            { title: 'Admins & Managers', value: metrics.adminsManagers, icon: Shield, color: 'amber' as const, subtitle: 'Privileged roles' },
            { title: 'New This Month', value: metrics.newThisMonth, icon: UserPlus, color: 'rose' as const, subtitle: 'Recent additions' },
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
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl">
        <GlassCard className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name, email, position, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="h-9 w-32 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="h-9 w-36 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Depts</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 w-32 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterWorkMode} onValueChange={setFilterWorkMode}>
              <SelectTrigger className="h-9 w-32 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                <SelectValue placeholder="Work Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="office">On-site</SelectItem>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
            {/* View Toggle */}
            <div className="flex items-center gap-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'h-9 w-9 p-0',
                  viewMode === 'grid'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
                )}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'h-9 w-9 p-0',
                  viewMode === 'table'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
                )}
                onClick={() => setViewMode('table')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </GlassCard>
        </div>

        {/* ═══ BULK ACTIONS TOOLBAR ═══ */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
            >
              <span className="text-xs font-medium text-emerald-400">
                {selectedIds.size} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 border-black/[0.1] dark:border-white/[0.1] text-xs gap-1"
                onClick={handleBulkDeactivate}
              >
                <PowerOff className="h-3 w-3" /> Deactivate
              </Button>
              <Select onValueChange={handleBulkChangeDept}>
                <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] w-36 h-7 text-xs">
                  <SelectValue placeholder="Move to dept..." />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground ml-auto"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ USER GRID / TABLE ═══ */}
        {filteredUsers.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                {searchQuery || filterRole !== 'all' || filterDept !== 'all' || filterStatus !== 'all'
                  ? 'No users match your filters'
                  : 'No users yet. Add one to get started.'}
              </p>
            </GlassCard>
          </motion.div>
        ) : viewMode === 'grid' ? (
          /* ─── GRID VIEW ─── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredUsers.map((user, i) => {
                const badge = ROLE_BADGE[user.role] || ROLE_BADGE.employee;
                const BadgeIcon = badge.icon;
                const isActive = user.isActive !== false;
                const isSelected = selectedIds.has(user.id);

                return (
                  <motion.div
                    key={user.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <GlassCard
                      hover
                      onClick={() => setSelectedUserId(user.id)}
                      className={cn(
                        'overflow-hidden',
                        isSelected && 'border-emerald-500/40 ring-1 ring-emerald-500/20'
                      )}
                    >
                      <div className="p-5 space-y-3">
                        {/* Avatar + Name + Badge */}
                        <div className="flex items-start gap-3">
                          <div className="relative shrink-0">
                            <div
                              className={cn(
                                'h-10 w-10 rounded-full bg-gradient-to-br flex items-center justify-center text-xs font-bold text-white',
                                getAvatarColor(user.name)
                              )}
                            >
                              {getInitials(user.name)}
                            </div>
                            <span
                              className={cn(
                                'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background',
                                isActive ? 'bg-emerald-400' : 'bg-slate-500'
                              )}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold truncate">{user.name}</h3>
                              <Badge
                                className={cn(
                                  'shrink-0 text-[9px] border px-1.5 py-0',
                                  badge.bg,
                                  badge.text,
                                  badge.border
                                )}
                              >
                                <BadgeIcon className="h-2.5 w-2.5 mr-0.5" />
                                {user.role}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {user.email}
                            </p>
                          </div>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(user.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0"
                          />
                        </div>

                        {/* Details */}
                        <div className="space-y-1.5">
                          {user.position && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Briefcase className="h-3 w-3 shrink-0" />
                              <span className="truncate">{user.position}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">{getDeptName(user.departmentId)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            {getWorkModeIcon(user.workMode)}
                            <span className="truncate">{getWorkModeLabel(user.workMode)}</span>
                          </div>
                          {user.joinDate && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3 shrink-0" />
                              <span className="truncate">
                                Joined {new Date(user.joinDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] gap-1 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUserId(user.id);
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
                              openEdit(user);
                            }}
                          >
                            <Edit className="h-3 w-3" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              'h-7 text-[10px] gap-1',
                              isActive
                                ? 'text-orange-400 hover:bg-orange-500/10 hover:text-orange-300'
                                : 'text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300'
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleActive(user);
                            }}
                          >
                            {isActive ? (
                              <><PowerOff className="h-3 w-3" /></>
                            ) : (
                              <><Power className="h-3 w-3" /></>
                            )}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 ml-auto text-muted-foreground hover:text-foreground"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-background border-black/[0.1] dark:border-white/[0.1]">
                              <DropdownMenuItem
                                onClick={() => {
                                  setPasswordUser(user);
                                  setNewPassword('');
                                  setPasswordOpen(true);
                                }}
                                className="gap-2"
                              >
                                <KeyRound className="h-3.5 w-3.5" /> Change Password
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUserId(user.id);
                                }}
                                className="gap-2"
                              >
                                <Eye className="h-3.5 w-3.5" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleActive(user)}
                                className="gap-2"
                              >
                                {isActive ? (
                                  <><PowerOff className="h-3.5 w-3.5" /> Deactivate</>
                                ) : (
                                  <><Power className="h-3.5 w-3.5" /> Reactivate</>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          /* ─── TABLE VIEW ─── */
          <GlassCard className="p-4">
            <div className="max-h-[560px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-black/[0.1] dark:border-white/[0.1] hover:bg-transparent">
                    <TableHead className="w-8">
                      <Checkbox
                        checked={
                          selectedIds.size === filteredUsers.length &&
                          filteredUsers.length > 0
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="text-muted-foreground">User</TableHead>
                    <TableHead className="text-muted-foreground">Role</TableHead>
                    <TableHead className="text-muted-foreground">Department</TableHead>
                    <TableHead className="text-muted-foreground">Work Mode</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Joined</TableHead>
                    <TableHead className="text-right text-muted-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredUsers.map((user) => {
                      const badge = ROLE_BADGE[user.role] || ROLE_BADGE.employee;
                      const BadgeIcon = badge.icon;
                      const isActive = user.isActive !== false;
                      const isSelected = selectedIds.has(user.id);

                      return (
                        <motion.tr
                          key={user.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className={cn(
                            'border-b border-black/[0.06] dark:border-white/[0.05] cursor-pointer transition-colors',
                            isSelected
                              ? 'bg-emerald-500/5'
                              : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
                          )}
                          onClick={() => setSelectedUserId(user.id)}
                        >
                          <TableCell
                            className="py-2.5 px-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelect(user.id)}
                            />
                          </TableCell>
                          <TableCell className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  'h-7 w-7 rounded-full bg-gradient-to-br flex items-center justify-center text-[10px] font-bold text-white shrink-0',
                                  getAvatarColor(user.name)
                                )}
                              >
                                {getInitials(user.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{user.name}</p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5 px-3">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border',
                                badge.bg,
                                badge.text,
                                badge.border
                              )}
                            >
                              <BadgeIcon className="h-2.5 w-2.5" />
                              {user.role}
                            </span>
                          </TableCell>
                          <TableCell className="py-2.5 px-3 text-xs text-muted-foreground">
                            {getDeptName(user.departmentId)}
                          </TableCell>
                          <TableCell className="py-2.5 px-3">
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              {getWorkModeIcon(user.workMode)}
                              {getWorkModeLabel(user.workMode)}
                            </span>
                          </TableCell>
                          <TableCell className="py-2.5 px-3">
                            <span className="inline-flex items-center gap-1">
                              <span
                                className={cn(
                                  'h-2 w-2 rounded-full',
                                  isActive ? 'bg-emerald-400' : 'bg-slate-500'
                                )}
                              />
                              <span
                                className={cn(
                                  'text-xs',
                                  isActive ? 'text-emerald-400' : 'text-slate-500'
                                )}
                              >
                                {isActive ? 'Active' : 'Inactive'}
                              </span>
                            </span>
                          </TableCell>
                          <TableCell className="py-2.5 px-3 text-xs text-muted-foreground">
                            {user.joinDate
                              ? new Date(user.joinDate).toLocaleDateString()
                              : '—'}
                          </TableCell>
                          <TableCell
                            className="py-2.5 px-3 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-amber-400 hover:bg-amber-500/10"
                                onClick={() => openEdit(user)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  'h-7 w-7 p-0',
                                  isActive
                                    ? 'text-orange-400 hover:bg-orange-500/10'
                                    : 'text-emerald-400 hover:bg-emerald-500/10'
                                )}
                                onClick={() => handleToggleActive(user)}
                              >
                                {isActive ? (
                                  <PowerOff className="h-3 w-3" />
                                ) : (
                                  <Power className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </GlassCard>
        )}
      </motion.div>
    );
  }

  // ─── Render: User Detail Page ────────────────────────────
  function renderDetailPage() {
    if (!selectedUser) return null;
    const u = selectedUser;
    const isActive = u.isActive !== false;
    const badge = ROLE_BADGE[u.role] || ROLE_BADGE.employee;
    const BadgeIcon = badge.icon;
    const userTeams = userTeamsMap[u.id] || [];

    return (
      <motion.div
        key="user-detail"
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
          onClick={() => setSelectedUserId(null)}
          className="gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Employees
        </Button>

        {/* ═══ USER HEADER ═══ */}
        <GlassCard className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative shrink-0">
                <div
                  className={cn(
                    'h-14 w-14 rounded-xl bg-gradient-to-br flex items-center justify-center text-lg font-bold text-white',
                    getAvatarColor(u.name)
                  )}
                >
                  {getInitials(u.name)}
                </div>
                <span
                  className={cn(
                    'absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background',
                    isActive ? 'bg-emerald-400' : 'bg-slate-500'
                  )}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold truncate">{u.name}</h2>
                  <Badge
                    className={cn(
                      'shrink-0 text-[10px] border',
                      badge.bg,
                      badge.text,
                      badge.border
                    )}
                  >
                    <BadgeIcon className="h-3 w-3 mr-0.5" />
                    {u.role}
                  </Badge>
                  <Badge
                    className={cn(
                      'shrink-0 text-[10px] border',
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                        : 'bg-slate-500/15 text-slate-400 border-slate-500/25'
                    )}
                  >
                    {isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 truncate">{u.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-amber-500/10 hover:border-amber-500/30"
                onClick={() => openEdit(u)}
              >
                <Edit className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'gap-1.5 border-black/[0.1] dark:border-white/[0.1]',
                  isActive
                    ? 'hover:bg-orange-500/10 hover:border-orange-500/30'
                    : 'hover:bg-emerald-500/10 hover:border-emerald-500/30'
                )}
                onClick={() => handleToggleActive(u)}
              >
                {isActive ? (
                  <><PowerOff className="h-3.5 w-3.5" /> Deactivate</>
                ) : (
                  <><Power className="h-3.5 w-3.5" /> Activate</>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-cyan-500/10 hover:border-cyan-500/30"
                onClick={() => {
                  setPasswordUser(u);
                  setNewPassword('');
                  setPasswordOpen(true);
                }}
              >
                <KeyRound className="h-3.5 w-3.5" /> Password
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* ═══ TABS ═══ */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08]">
            <TabsTrigger
              value="overview"
              className="gap-1.5 data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-400"
            >
              <Activity className="h-3.5 w-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="gap-1.5 data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-400"
            >
              <Clock className="h-3.5 w-3.5" /> Activity
            </TabsTrigger>
            <TabsTrigger
              value="teams"
              className="gap-1.5 data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-400"
            >
              <Users className="h-3.5 w-3.5" /> Teams
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="gap-1.5 data-[state=active]:bg-rose-500/15 data-[state=active]:text-rose-400"
            >
              <Settings className="h-3.5 w-3.5" /> Settings
            </TabsTrigger>
            <TabsTrigger
              value="attendance"
              className="gap-1.5 data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-400"
            >
              <Clock className="h-3.5 w-3.5" /> Attendance
            </TabsTrigger>
            <TabsTrigger
              value="tasks"
              className="gap-1.5 data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-400"
            >
              <ListTodo className="h-3.5 w-3.5" /> Tasks
            </TabsTrigger>
            <TabsTrigger
              value="salary"
              className="gap-1.5 data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-400"
            >
              <DollarSign className="h-3.5 w-3.5" /> Salary
            </TabsTrigger>
            <TabsTrigger
              value="complaints"
              className="gap-1.5 data-[state=active]:bg-rose-500/15 data-[state=active]:text-rose-400"
            >
              <MessageSquare className="h-3.5 w-3.5" /> Complaints
            </TabsTrigger>
            <TabsTrigger
              value="requests"
              className="gap-1.5 data-[state=active]:bg-violet-500/15 data-[state=active]:text-violet-400"
            >
              <FileText className="h-3.5 w-3.5" /> Requests
            </TabsTrigger>
          </TabsList>

          {/* ═══ OVERVIEW TAB ═══ */}
          <TabsContent value="overview" className="space-y-4">
            {/* Info Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {/* Email */}
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-cyan-500/15 flex items-center justify-center shrink-0">
                    <Mail className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Email
                    </p>
                    <p className="text-sm font-medium truncate">{u.email}</p>
                  </div>
                </div>
              </GlassCard>

              {/* Phone */}
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Phone
                    </p>
                    <p className="text-sm font-medium truncate">
                      {u.phone || 'Not set'}
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* Position */}
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                    <Briefcase className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Position
                    </p>
                    <p className="text-sm font-medium truncate">
                      {u.position || 'Not set'}
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* Department */}
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-rose-500/15 flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4 text-rose-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Department
                    </p>
                    <p className="text-sm font-medium truncate">
                      {getDeptName(u.departmentId)}
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* Work Mode */}
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-teal-500/15 flex items-center justify-center shrink-0">
                    {getWorkModeIcon(u.workMode)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Work Mode
                    </p>
                    <p className="text-sm font-medium truncate">
                      {getWorkModeLabel(u.workMode)}
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* Join Date */}
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
                    <Calendar className="h-4 w-4 text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Join Date
                    </p>
                    <p className="text-sm font-medium truncate">
                      {u.joinDate
                        ? new Date(u.joinDate).toLocaleDateString()
                        : 'Not set'}
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* Salary */}
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Salary
                    </p>
                    <p className="text-sm font-medium text-emerald-400 truncate">
                      {u.salary ? formatCurrency(u.salary) : 'Not set'}
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* Status */}
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                      isActive
                        ? 'bg-emerald-500/15'
                        : 'bg-slate-500/15'
                    )}
                  >
                    {isActive ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Status
                    </p>
                    <p
                      className={cn(
                        'text-sm font-medium truncate',
                        isActive ? 'text-emerald-400' : 'text-slate-400'
                      )}
                    >
                      {isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* Role */}
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                      badge.bg
                    )}
                  >
                    <BadgeIcon className={cn('h-4 w-4', badge.text)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Role
                    </p>
                    <p className={cn('text-sm font-medium truncate capitalize', badge.text)}>
                      {u.role}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                title="Attendance Rate"
                value="94%"
                icon={Clock}
                color="emerald"
                compact
              />
              <StatCard
                title="Tasks Completed"
                value="28"
                icon={CheckCircle2}
                color="cyan"
                compact
              />
              <StatCard
                title="Leave Used"
                value="5/27"
                icon={Calendar}
                color="amber"
                compact
              />
              <StatCard
                title="Teams"
                value={userTeams.length}
                icon={Users}
                color="rose"
                compact
              />
            </div>
          </TabsContent>

          {/* ═══ ACTIVITY TAB ═══ */}
          <TabsContent value="activity" className="space-y-4">
            <GlassCard className="p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-cyan-400" /> Recent Activity
              </h3>
              <div className="space-y-0">
                {MOCK_USER_ACTIVITIES.map((activity, i) => {
                  const ActivityIcon = activity.icon;
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 relative"
                    >
                      {/* Timeline line */}
                      {i < MOCK_USER_ACTIVITIES.length - 1 && (
                        <div className="absolute left-[15px] top-7 bottom-0 w-px bg-black/[0.04] dark:bg-white/[0.06]" />
                      )}
                      {/* Icon */}
                      <div
                        className={cn(
                          'h-7 w-7 rounded-full flex items-center justify-center shrink-0 z-10',
                          activity.type === 'login'
                            ? 'bg-cyan-500/15'
                            : activity.type === 'task_completed'
                            ? 'bg-emerald-500/15'
                            : activity.type === 'leave_applied'
                            ? 'bg-amber-500/15'
                            : activity.type === 'profile_update'
                            ? 'bg-rose-500/15'
                            : 'bg-slate-500/15'
                        )}
                      >
                        <ActivityIcon
                          className={cn(
                            'h-3.5 w-3.5',
                            activity.type === 'login'
                              ? 'text-cyan-400'
                              : activity.type === 'task_completed'
                              ? 'text-emerald-400'
                              : activity.type === 'leave_applied'
                              ? 'text-amber-400'
                              : activity.type === 'profile_update'
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          )}
                        />
                      </div>
                      {/* Content */}
                      <div className="flex-1 pb-4 min-w-0">
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </TabsContent>

          {/* ═══ TEAMS TAB ═══ */}
          <TabsContent value="teams" className="space-y-4">
            {userTeams.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">
                  This user is not a member of any team
                </p>
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {userTeams.map((team) => {
                  const isLead = team.members?.some(
                    (m) => m.userId === u.id && m.role === 'LEAD'
                  );
                  const memberRole = team.members?.find(
                    (m) => m.userId === u.id
                  )?.role || 'MEMBER';

                  return (
                    <GlassCard key={team.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold text-white"
                          style={{
                            backgroundColor: `${team.color || '#10b981'}20`,
                            border: `1px solid ${team.color || '#10b981'}40`,
                            color: team.color || '#10b981',
                          }}
                        >
                          {getInitials(team.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold truncate">{team.name}</h4>
                            {isLead && (
                              <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25 text-[9px] border px-1.5 py-0">
                                Lead
                              </Badge>
                            )}
                          </div>
                          {team.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {team.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {team.memberCount ?? team.members?.length ?? 0} members
                            </span>
                            <span className="inline-flex items-center gap-1">
                              Role:{' '}
                              <span className="text-foreground font-medium">
                                {memberRole}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ═══ SETTINGS TAB ═══ */}
          <TabsContent value="settings" className="space-y-4">
            {/* Edit Form */}
            <GlassCard className="p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <UserCog className="h-4 w-4 text-amber-400" /> Edit User Information
              </h3>
              <UserDetailSettingsForm user={u} />
            </GlassCard>

            {/* Change Password */}
            <GlassCard className="p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-cyan-400" /> Change Password
              </h3>
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs text-muted-foreground">New Password</Label>
                  <Input
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleChangePasswordDirect(u)}
                  className="bg-cyan-600 hover:bg-cyan-500 gap-1.5"
                  disabled={passwordSaving}
                >
                  {passwordSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="h-3.5 w-3.5" />
                  )}{' '}
                  Update
                </Button>
              </div>
            </GlassCard>

            {/* Danger Zone */}
            <GlassCard className="p-5 border-rose-500/20">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-rose-400">
                <AlertTriangle className="h-4 w-4" /> Danger Zone
              </h3>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {isActive ? 'Deactivate this user' : 'Reactivate this user'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isActive
                      ? 'The user will lose access to the system but their data will be preserved.'
                      : 'Reactivate the user to restore their access to the system.'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'gap-1.5 shrink-0',
                    isActive
                      ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10'
                      : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                  )}
                  onClick={() => handleToggleActive(u)}
                >
                  {isActive ? (
                    <><PowerOff className="h-3.5 w-3.5" /> Deactivate</>
                  ) : (
                    <><Power className="h-3.5 w-3.5" /> Reactivate</>
                  )}
                </Button>
              </div>
            </GlassCard>
          </TabsContent>

          {/* ═══ ATTENDANCE TAB ═══ */}
          <TabsContent value="attendance" className="space-y-4">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard title="Present Days" value={employeeAttendanceStats.present} icon={CheckCircle2} color="emerald" hero subtitle="On time" />
              <StatCard title="Late Days" value={employeeAttendanceStats.late} icon={Clock} color="amber" hero subtitle="Late arrivals" />
              <StatCard title="Absent Days" value={employeeAttendanceStats.absent} icon={XCircle} color="rose" hero subtitle="Missed days" />
              <StatCard title="Total Hours" value={employeeAttendanceStats.totalHours.toFixed(1)} icon={Timer} color="cyan" hero subtitle="Logged" />
            </div>

            {/* Attendance Records Table */}
            {employeeAttendance.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No attendance records</p>
              </GlassCard>
            ) : (
              <GlassCard className="p-4">
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-black/[0.1] dark:border-white/[0.1] hover:bg-transparent">
                        <TableHead className="text-muted-foreground">Date</TableHead>
                        <TableHead className="text-muted-foreground">Clock In</TableHead>
                        <TableHead className="text-muted-foreground">Clock Out</TableHead>
                        <TableHead className="text-muted-foreground">Total Hours</TableHead>
                        <TableHead className="text-muted-foreground">Status</TableHead>
                        <TableHead className="text-muted-foreground">Method</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employeeAttendance.map((rec) => {
                        const statusColor: Record<string, string> = {
                          present: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
                          late: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
                          absent: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
                          'half-day': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
                          holiday: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
                          weekend: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
                        };
                        return (
                          <TableRow key={rec.id} className="border-b border-black/[0.06] dark:border-white/[0.05]">
                            <TableCell className="py-2.5 px-3 text-xs">
                              {new Date(rec.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-xs text-muted-foreground">
                              {rec.clockIn || rec.firstIn || '—'}
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-xs text-muted-foreground">
                              {rec.clockOut || rec.lastOut || '—'}
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-xs text-muted-foreground">
                              {rec.totalHours ? `${rec.totalHours.toFixed(1)}h` : '—'}
                            </TableCell>
                            <TableCell className="py-2.5 px-3">
                              <Badge className={cn('text-[9px] border px-1.5 py-0', statusColor[rec.status] || 'bg-slate-500/15 text-slate-400 border-slate-500/25')}>
                                {rec.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-xs text-muted-foreground capitalize">
                              {rec.method || '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </GlassCard>
            )}
          </TabsContent>

          {/* ═══ TASKS TAB ═══ */}
          <TabsContent value="tasks" className="space-y-4">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard title="Total Tasks" value={employeeTaskStats.total} icon={ListTodo} color="cyan" hero subtitle="Assigned" />
              <StatCard title="Completed" value={employeeTaskStats.completed} icon={CheckCircle2} color="emerald" hero subtitle="Done" />
              <StatCard title="In Progress" value={employeeTaskStats.inProgress} icon={Activity} color="amber" hero subtitle="Active" />
              <StatCard title="To Do" value={employeeTaskStats.todo} icon={Flame} color="rose" hero subtitle="Pending" />
            </div>

            {/* Task List */}
            {employeeTasks.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <ListTodo className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No tasks assigned</p>
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {employeeTasks.map((task) => {
                  const taskStatusColor: Record<string, string> = {
                    todo: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
                    'in-progress': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
                    'in-review': 'bg-amber-500/15 text-amber-400 border-amber-500/25',
                    done: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
                    blocked: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
                  };
                  const priorityColor: Record<string, string> = {
                    low: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
                    medium: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
                    high: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
                    urgent: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
                  };
                  return (
                    <GlassCard key={task.id} className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-bold truncate">{task.title}</h4>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge className={cn('text-[9px] border px-1.5 py-0', taskStatusColor[task.status] || 'bg-slate-500/15 text-slate-400 border-slate-500/25')}>
                              {task.status}
                            </Badge>
                            <Badge className={cn('text-[9px] border px-1.5 py-0', priorityColor[task.priority] || 'bg-slate-500/15 text-slate-400 border-slate-500/25')}>
                              {task.priority}
                            </Badge>
                          </div>
                        </div>
                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {task.dueDate && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Due {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          {task.teamName && (
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {task.teamName}
                            </span>
                          )}
                        </div>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ═══ SALARY TAB ═══ */}
          <TabsContent value="salary" className="space-y-4">
            {employeePayroll.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <DollarSign className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No salary records</p>
              </GlassCard>
            ) : (
              <>
                {/* Current Month Salary Card */}
                {employeePayroll[0] && (
                  <GlassCard className="p-5" glow="emerald">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-emerald-400" /> Current Month — {employeePayroll[0].month}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Gross</p>
                        <p className="text-sm font-medium text-foreground">{formatCurrency(employeePayroll[0].grossSalary)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Deductions</p>
                        <p className="text-sm font-medium text-rose-400">{formatCurrency(employeePayroll[0].deductions)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Overtime</p>
                        <p className="text-sm font-medium text-amber-400">{formatCurrency(employeePayroll[0].overtime)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Net Salary</p>
                        <p className="text-lg font-bold text-emerald-400">{formatCurrency(employeePayroll[0].netSalary)}</p>
                      </div>
                    </div>
                  </GlassCard>
                )}

                {/* Payroll History Table */}
                <GlassCard className="p-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-cyan-400" /> Payroll History
                  </h3>
                  <div className="max-h-80 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-black/[0.1] dark:border-white/[0.1] hover:bg-transparent">
                          <TableHead className="text-muted-foreground">Month</TableHead>
                          <TableHead className="text-muted-foreground">Base</TableHead>
                          <TableHead className="text-muted-foreground">OT</TableHead>
                          <TableHead className="text-muted-foreground">Gross</TableHead>
                          <TableHead className="text-muted-foreground">Deductions</TableHead>
                          <TableHead className="text-muted-foreground">Net</TableHead>
                          <TableHead className="text-muted-foreground">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employeePayroll.map((rec) => {
                          const payStatusColor: Record<string, string> = {
                            draft: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
                            reviewed: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
                            approved: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
                            paid: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
                            'on-hold': 'bg-rose-500/15 text-rose-400 border-rose-500/25',
                            cancelled: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
                          };
                          return (
                            <TableRow key={rec.id} className="border-b border-black/[0.06] dark:border-white/[0.05]">
                              <TableCell className="py-2.5 px-3 text-xs font-medium">{rec.month}</TableCell>
                              <TableCell className="py-2.5 px-3 text-xs text-muted-foreground">{formatCurrency(rec.baseSalary)}</TableCell>
                              <TableCell className="py-2.5 px-3 text-xs text-amber-400">{formatCurrency(rec.overtime)}</TableCell>
                              <TableCell className="py-2.5 px-3 text-xs text-muted-foreground">{formatCurrency(rec.grossSalary)}</TableCell>
                              <TableCell className="py-2.5 px-3 text-xs text-rose-400">{formatCurrency(rec.deductions)}</TableCell>
                              <TableCell className="py-2.5 px-3 text-xs font-medium text-emerald-400">{formatCurrency(rec.netSalary)}</TableCell>
                              <TableCell className="py-2.5 px-3">
                                <Badge className={cn('text-[9px] border px-1.5 py-0', payStatusColor[rec.status] || 'bg-slate-500/15 text-slate-400 border-slate-500/25')}>
                                  {rec.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </GlassCard>
              </>
            )}
          </TabsContent>

          {/* ═══ COMPLAINTS TAB ═══ */}
          <TabsContent value="complaints" className="space-y-4">
            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-4">
              <StatCard title="Total" value={employeeComplaintStats.total} icon={MessageSquare} color="cyan" hero subtitle="Filed" />
              <StatCard title="Open" value={employeeComplaintStats.open} icon={AlertTriangle} color="rose" hero subtitle="Active" />
              <StatCard title="Resolved" value={employeeComplaintStats.resolved} icon={CheckCircle2} color="emerald" hero subtitle="Closed" />
            </div>

            {/* Complaint List */}
            {employeeComplaints.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No complaints filed</p>
              </GlassCard>
            ) : (
              <div className="space-y-3">
                {employeeComplaints.map((comp) => {
                  const compStatusColor: Record<string, string> = {
                    open: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
                    investigating: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
                    'in-progress': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
                    resolved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
                    closed: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
                    escalated: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
                  };
                  const catColor: Record<string, string> = {
                    hr: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
                    it: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
                    facilities: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
                    finance: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
                    management: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
                    security: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
                    general: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
                    other: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
                  };
                  const priorityDot: Record<string, string> = {
                    low: 'bg-slate-400',
                    medium: 'bg-cyan-400',
                    high: 'bg-amber-400',
                    critical: 'bg-rose-400',
                  };
                  return (
                    <GlassCard key={comp.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold truncate">{comp.subject}</h4>
                            <Badge className={cn('text-[9px] border px-1.5 py-0 shrink-0', catColor[comp.category] || 'bg-slate-500/15 text-slate-400 border-slate-500/25')}>
                              {comp.category}
                            </Badge>
                            <Badge className={cn('text-[9px] border px-1.5 py-0 shrink-0', compStatusColor[comp.status] || 'bg-slate-500/15 text-slate-400 border-slate-500/25')}>
                              {comp.status}
                            </Badge>
                            <span className={cn('h-2 w-2 rounded-full shrink-0', priorityDot[comp.priority] || 'bg-slate-400')} />
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{comp.description}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Filed {new Date(comp.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ═══ REQUESTS TAB ═══ */}
          <TabsContent value="requests" className="space-y-4">
            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-4">
              <StatCard title="Total" value={employeeRequestStats.total} icon={FileText} color="cyan" hero subtitle="Submitted" />
              <StatCard title="Pending" value={employeeRequestStats.pending} icon={Clock} color="amber" hero subtitle="Awaiting" />
              <StatCard title="Approved" value={employeeRequestStats.approved} icon={CheckCircle2} color="emerald" hero subtitle="Accepted" />
            </div>

            {/* Request List */}
            {employeeRequests.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No requests submitted</p>
              </GlassCard>
            ) : (
              <div className="space-y-3">
                {employeeRequests.map((req) => {
                  const reqStatusColor: Record<string, string> = {
                    pending: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
                    'under-review': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
                    approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
                    rejected: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
                    cancelled: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
                    escalated: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
                  };
                  const typeColor: Record<string, string> = {
                    leave: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
                    expense: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
                    asset: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
                    'shift-swap': 'bg-violet-500/15 text-violet-400 border-violet-500/25',
                    training: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
                    equipment: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
                    travel: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
                    'it-support': 'bg-rose-500/15 text-rose-400 border-rose-500/25',
                  };
                  const priorityDot: Record<string, string> = {
                    low: 'bg-slate-400',
                    medium: 'bg-cyan-400',
                    high: 'bg-amber-400',
                    urgent: 'bg-rose-400',
                  };
                  return (
                    <GlassCard key={req.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold truncate">{req.title}</h4>
                            <Badge className={cn('text-[9px] border px-1.5 py-0 shrink-0', typeColor[req.type] || 'bg-slate-500/15 text-slate-400 border-slate-500/25')}>
                              {req.type}
                            </Badge>
                            <Badge className={cn('text-[9px] border px-1.5 py-0 shrink-0', reqStatusColor[req.status] || 'bg-slate-500/15 text-slate-400 border-slate-500/25')}>
                              {req.status}
                            </Badge>
                            <span className={cn('h-2 w-2 rounded-full shrink-0', priorityDot[req.priority] || 'bg-slate-400')} />
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{req.description}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Submitted {new Date(req.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    );
  }

  // Helper for password change from settings tab
  function handleChangePasswordDirect(user: User) {
    return async () => {
      if (!newPassword.trim() || newPassword.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
      setPasswordSaving(true);
      try {
        await updateUser(user.id, { password: newPassword });
        toast.success('Password updated successfully');
        setNewPassword('');
      } catch {
        toast.error('Failed to update password');
      } finally {
        setTimeout(() => setPasswordSaving(false), 400);
      }
    };
  }

  // ─── Inline Settings Form Component ──────────────────────
  function UserDetailSettingsForm({ user }: { user: User }) {
    const [form, setForm] = useState<UserForm>({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      departmentId: user.departmentId || '',
      phone: user.phone || '',
      position: user.position || '',
      workMode: user.workMode || 'office',
      salary: user.salary ? String(user.salary) : '',
      joinDate: user.joinDate ? user.joinDate.split('T')[0] : '',
    });
    const [saving, setSaving] = useState(false);

    // Sync form when user changes
    useEffect(() => {
      setForm({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        departmentId: user.departmentId || '',
        phone: user.phone || '',
        position: user.position || '',
        workMode: user.workMode || 'office',
        salary: user.salary ? String(user.salary) : '',
        joinDate: user.joinDate ? user.joinDate.split('T')[0] : '',
      });
    }, [user]);

    const handleSave = async () => {
      if (!form.name.trim() || !form.email.trim()) {
        toast.error('Name and email are required');
        return;
      }
      setSaving(true);
      try {
        await updateUser(user.id, {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          departmentId: form.departmentId || null,
          phone: form.phone.trim() || null,
          position: form.position.trim() || null,
          workMode: form.workMode || null,
          salary: form.salary ? parseFloat(form.salary) : null,
          joinDate: form.joinDate || null,
        });
        toast.success('User updated successfully');
      } catch {
        toast.error('Failed to update user');
      } finally {
        setTimeout(() => setSaving(false), 400);
      }
    };

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 h-9"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Position</Label>
            <Input
              value={form.position}
              onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
              className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 h-9"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Department</Label>
            <Select
              value={form.departmentId || '__none__'}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, departmentId: v === '__none__' ? '' : v }))
              }
            >
              <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 h-9">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No Department</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Role</Label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
            >
              <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 h-9">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Work Mode</Label>
            <Select
              value={form.workMode}
              onValueChange={(v) => setForm((f) => ({ ...f, workMode: v }))}
            >
              <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 h-9">
                <SelectValue placeholder="Select work mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="office">On-site</SelectItem>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Join Date</Label>
            <Input
              type="date"
              value={form.joinDate}
              onChange={(e) => setForm((f) => ({ ...f, joinDate: e.target.value }))}
              className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 h-9"
            />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-500"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}{' '}
            Save Changes
          </Button>
        </div>
      </div>
    );
  }

  // ─── MAIN RENDER ─────────────────────────────────────────
  return (
    <div className="space-y-0">
      <AnimatePresence mode="wait">
        {selectedUserId ? renderDetailPage() : renderListView()}
      </AnimatePresence>

      {/* ═══ CREATE USER DIALOG ═══ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-background border-black/[0.1] dark:border-white/[0.1] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-emerald-400" /> Add New User
            </DialogTitle>
            <DialogDescription>
              Create a new user account with the details below.
            </DialogDescription>
          </DialogHeader>
          <UserFormFields form={createForm} setForm={setCreateForm} />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              className="border-black/[0.1] dark:border-white/[0.1]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="bg-emerald-600 hover:bg-emerald-500 gap-1.5"
            >
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}{' '}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ EDIT USER DIALOG ═══ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-background border-black/[0.1] dark:border-white/[0.1] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-4 w-4 text-amber-400" /> Edit User
            </DialogTitle>
            <DialogDescription>
              Update user account details.
            </DialogDescription>
          </DialogHeader>
          <UserFormFields form={editForm} setForm={setEditForm} isEdit />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              className="border-black/[0.1] dark:border-white/[0.1]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={editSaving}
              className="bg-amber-600 hover:bg-amber-500 gap-1.5"
            >
              {editSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}{' '}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ CHANGE PASSWORD DIALOG ═══ */}
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="bg-background border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-cyan-400" /> Change Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for {passwordUser?.name || 'user'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">New Password</Label>
              <Input
                type="password"
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPasswordOpen(false)}
              className="border-black/[0.1] dark:border-white/[0.1]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={passwordSaving}
              className="bg-cyan-600 hover:bg-cyan-500 gap-1.5"
            >
              {passwordSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <KeyRound className="h-3.5 w-3.5" />
              )}{' '}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ DEACTIVATE CONFIRMATION ═══ */}
      <AlertDialog open={deactivateConfirmOpen} onOpenChange={setDeactivateConfirmOpen}>
        <AlertDialogContent className="bg-background border-black/[0.1] dark:border-white/[0.1]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-400" /> Deactivate User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate{' '}
              <span className="font-medium text-foreground">
                {deactivateTarget?.name}
              </span>
              ? They will lose access to the system but their data will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-black/[0.1] dark:border-white/[0.1]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              disabled={deactivating}
              className="bg-rose-600 hover:bg-rose-500 gap-1.5"
            >
              {deactivating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PowerOff className="h-3.5 w-3.5" />
              )}{' '}
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
