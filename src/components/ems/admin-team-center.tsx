'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { StatCard } from './stat-card';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import type { Team, TeamMemberRecord, User } from '@/lib/types';
import {
  UsersRound, CheckCircle2, Users, Shield,
  Plus, Loader2, Search, RefreshCw, Eye, Edit3, Trash2,
  MoreHorizontal, ArrowUpDown, ChevronUp, ChevronDown,
  Filter, X, UserPlus, Crown, Mail, Building2,
  CalendarDays, LayoutGrid, List, UserCircle, AlertTriangle,
  ArrowLeft, Settings, Activity, PieChart, BarChart3,
  Clock, Zap, Target, TrendingUp, ArrowRight,
  Camera, ImagePlus,
} from 'lucide-react';
import { getInitials } from './shared';

// ─── Color presets ──────────────────────────────────────────────
const COLOR_PRESETS = [
  { name: 'Emerald', value: '#10b981' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Sky', value: '#0ea5e9' },
  { name: 'Lime', value: '#84cc16' },
];

// ─── Sort helpers ───────────────────────────────────────────────
type SortDir = 'asc' | 'desc' | null;
type SortField = 'name' | 'department' | 'lead' | 'members' | 'tasks' | 'created';

// ─── Avatar helpers ─────────────────────────────────────────────

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
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ─── Status badge helper ────────────────────────────────────────
function TaskStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    'todo': { label: 'To Do', className: 'bg-slate-500/15 text-slate-400 border-slate-500/25' },
    'in-progress': { label: 'In Progress', className: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25' },
    'in-review': { label: 'In Review', className: 'bg-violet-500/15 text-violet-400 border-violet-500/25' },
    'done': { label: 'Done', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
    'blocked': { label: 'Blocked', className: 'bg-rose-500/15 text-rose-400 border-rose-500/25' },
  };
  const c = config[status] || config['todo'];
  return <Badge className={cn('text-[10px] gap-1', c.className)}>{c.label}</Badge>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, { label: string; className: string }> = {
    'low': { label: 'Low', className: 'bg-slate-500/15 text-slate-400 border-slate-500/25' },
    'medium': { label: 'Medium', className: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
    'high': { label: 'High', className: 'bg-orange-500/15 text-orange-400 border-orange-500/25' },
    'urgent': { label: 'Urgent', className: 'bg-rose-500/15 text-rose-400 border-rose-500/25' },
  };
  const c = config[priority] || config['medium'];
  return <Badge className={cn('text-[10px] gap-1', c.className)}>{c.label}</Badge>;
}

// ─── Main Component ─────────────────────────────────────────────
export function AdminTeamCenter() {
  const { teams, users, departments, tasks, loadTeams, createTeam, updateTeam, deleteTeam, setActiveView, createTask } = useEMSStore();

  // ─── Load Data on Mount ───────────────────────────────────
  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  // ─── State ────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterLead, setFilterLead] = useState('all');
  const [filterActive, setFilterActive] = useState('all');
  const [activeTab, setActiveTab] = useState('grid');
  const [refreshing, setRefreshing] = useState(false);

  // Sort state (table)
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Full-page detail mode
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState('overview');

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    color: '#10b981',
    departmentId: '',
    memberSearch: '',
    selectedMembers: [] as Array<{ userId: string; role: 'LEAD' | 'MEMBER' }>,
  });
  const [creating, setCreating] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    color: '#10b981',
    departmentId: '',
    memberSearch: '',
    selectedMembers: [] as Array<{ userId: string; role: 'LEAD' | 'MEMBER' }>,
    removeMembers: [] as string[],
  });
  const [editing, setEditing] = useState(false);

  // Add member dialog
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState('');
  const [addMemberUserId, setAddMemberUserId] = useState('');
  const [addMemberRole, setAddMemberRole] = useState<'LEAD' | 'MEMBER'>('MEMBER');
  const [addingMember, setAddingMember] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);

  // Detail page member search
  const [memberSearch, setMemberSearch] = useState('');

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    description: '',
    color: '#10b981',
    departmentId: '',
  });

  // Avatar upload for create team
  const [teamAvatar, setTeamAvatar] = useState<string | null>(null);

  // Create team task dialog
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as string,
    assigneeId: '',
    dueDate: '',
  });
  const [creatingTask, setCreatingTask] = useState(false);

  // Selected employee for profile view
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);

  // ─── Computed: Selected employee for profile view ──────────
  const selectedEmp = useMemo(() => {
    if (!selectedEmpId) return null;
    return users.find(u => u.id === selectedEmpId) || null;
  }, [selectedEmpId, users]);

  // ─── Computed: Selected team from store ───────────────────
  const selectedTeam = useMemo(() => {
    if (!selectedTeamId) return null;
    return teams.find(t => t.id === selectedTeamId) || null;
  }, [selectedTeamId, teams]);

  // Sync settings form when selected team changes
  useEffect(() => {
    if (selectedTeam) {
      setSettingsForm({
        name: selectedTeam.name,
        description: selectedTeam.description || '',
        color: selectedTeam.color || '#10b981',
        departmentId: selectedTeam.departmentId || '',
      });
    }
  }, [selectedTeam?.id, selectedTeam?.name, selectedTeam?.description, selectedTeam?.color, selectedTeam?.departmentId]);

  // ─── Computed Metrics ─────────────────────────────────────
  const metrics = useMemo(() => {
    const totalTeams = teams.length;
    const activeTeams = teams.filter(t => t.isActive !== false).length;
    const totalMembers = teams.reduce((sum, t) => sum + (t.memberCount ?? t.members?.length ?? 0), 0);
    const teamsWithLead = teams.filter(t => t.members?.some(m => m.role === 'LEAD')).length;
    return { totalTeams, activeTeams, totalMembers, teamsWithLead };
  }, [teams]);

  // ─── Team lead helper ─────────────────────────────────────
  const getTeamLead = useCallback((team: Team): TeamMemberRecord | undefined => {
    return team.members?.find(m => m.role === 'LEAD');
  }, []);

  // ─── Filtered & Sorted Teams ──────────────────────────────
  const filteredTeams = useMemo(() => {
    let result = [...teams];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.departmentName || '').toLowerCase().includes(q) ||
        t.members?.some(m => (m.userName || '').toLowerCase().includes(q))
      );
    }

    if (filterDept !== 'all') {
      result = result.filter(t => t.departmentId === filterDept);
    }

    if (filterLead === 'has-lead') {
      result = result.filter(t => t.members?.some(m => m.role === 'LEAD'));
    } else if (filterLead === 'no-lead') {
      result = result.filter(t => !t.members?.some(m => m.role === 'LEAD'));
    }

    if (filterActive === 'active') {
      result = result.filter(t => t.isActive !== false);
    } else if (filterActive === 'inactive') {
      result = result.filter(t => t.isActive === false);
    }

    return result;
  }, [teams, searchQuery, filterDept, filterLead, filterActive]);

  const sortedTeams = useMemo(() => {
    if (!sortField || !sortDir) return filteredTeams;
    return [...filteredTeams].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'department':
          aVal = (a.departmentName || '').toLowerCase();
          bVal = (b.departmentName || '').toLowerCase();
          break;
        case 'lead':
          aVal = getTeamLead(a)?.userName?.toLowerCase() || '';
          bVal = getTeamLead(b)?.userName?.toLowerCase() || '';
          break;
        case 'members':
          aVal = a.memberCount ?? a.members?.length ?? 0;
          bVal = b.memberCount ?? b.members?.length ?? 0;
          break;
        case 'tasks':
          aVal = a.taskCount ?? 0;
          bVal = b.taskCount ?? 0;
          break;
        case 'created':
          aVal = a.createdAt;
          bVal = b.createdAt;
          break;
        default:
          return 0;
      }

      const cmp = typeof aVal === 'number' && typeof bVal === 'number'
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredTeams, sortField, sortDir, getTeamLead]);

  // ─── Team tasks ──────────────────────────────────────────
  const teamTasks = useMemo(() => {
    if (!selectedTeamId) return [];
    return tasks.filter(t => t.teamId === selectedTeamId);
  }, [tasks, selectedTeamId]);

  const teamTaskStats = useMemo(() => {
    const todo = teamTasks.filter(t => t.status === 'todo').length;
    const inProgress = teamTasks.filter(t => t.status === 'in-progress').length;
    const done = teamTasks.filter(t => t.status === 'done').length;
    const blocked = teamTasks.filter(t => t.status === 'blocked').length;
    const total = teamTasks.length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    return { todo, inProgress, done, blocked, total, completionRate };
  }, [teamTasks]);

  // ─── User options ────────────────────────────────────────
  const availableUsersForCreate = useMemo(() => {
    const selectedIds = new Set(createForm.selectedMembers.map(m => m.userId));
    return users.filter(u => u.isActive !== false && !selectedIds.has(u.id));
  }, [users, createForm.selectedMembers]);

  const availableUsersForAdd = useMemo(() => {
    if (!selectedTeam) return [];
    const memberIds = new Set((selectedTeam.members || []).map(m => m.userId));
    return users.filter(u => u.isActive !== false && !memberIds.has(u.id));
  }, [users, selectedTeam]);

  const filteredAvailableUsersForAdd = useMemo(() => {
    if (!addMemberSearch) return availableUsersForAdd.slice(0, 20);
    const q = addMemberSearch.toLowerCase();
    return availableUsersForAdd.filter(u =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [availableUsersForAdd, addMemberSearch]);

  // ─── Handlers ─────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadTeams();
      toast.success('Teams refreshed');
    } catch {
      toast.error('Failed to refresh teams');
    } finally {
      setTimeout(() => setRefreshing(false), 400);
    }
  }, [loadTeams]);

  const handleSort = useCallback((field: SortField) => {
    setSortField(field);
    setSortDir(prev => {
      if (prev === null) return 'asc';
      if (prev === 'asc') return 'desc';
      return null;
    });
  }, []);

  const openDetail = useCallback((team: Team) => {
    setSelectedTeamId(team.id);
    setDetailTab('overview');
    setMemberSearch('');
  }, []);

  const openEdit = useCallback((team: Team) => {
    setEditTeam(team);
    setEditForm({
      name: team.name,
      description: team.description || '',
      color: team.color || '#10b981',
      departmentId: team.departmentId || '',
      memberSearch: '',
      selectedMembers: (team.members || []).map(m => ({ userId: m.userId, role: m.role })),
      removeMembers: [],
    });
    setEditOpen(true);
  }, []);

  // ─── Create Team ──────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    if (!createForm.name.trim()) {
      toast.error('Team name is required');
      return;
    }
    setCreating(true);
    try {
      await createTeam(createForm.name, createForm.description, createForm.selectedMembers);
      toast.success('Team created successfully');
      setCreateOpen(false);
      setTeamAvatar(null);
      setCreateForm({ name: '', description: '', color: '#10b981', departmentId: '', memberSearch: '', selectedMembers: [] });
    } catch {
      toast.error('Failed to create team');
    } finally {
      setTimeout(() => setCreating(false), 400);
    }
  }, [createForm, createTeam]);

  // ─── Update Team ──────────────────────────────────────────
  const handleEdit = useCallback(async () => {
    if (!editTeam || !editForm.name.trim()) {
      toast.error('Team name is required');
      return;
    }
    setEditing(true);
    try {
      const updates: Record<string, unknown> = {
        name: editForm.name,
        description: editForm.description,
        color: editForm.color,
        departmentId: editForm.departmentId || null,
      };
      if (editForm.removeMembers.length > 0) {
        updates.removeMembers = editForm.removeMembers;
      }
      const originalIds = new Set((editTeam.members || []).map(m => m.userId));
      const addedMembers = editForm.selectedMembers.filter(m => !originalIds.has(m.userId));
      if (addedMembers.length > 0) {
        updates.addMembers = addedMembers;
      }
      // Also detect removed members (were in original but not in editForm)
      const editIds = new Set(editForm.selectedMembers.map(m => m.userId));
      const implicitlyRemoved = (editTeam.members || []).filter(m => !editIds.has(m.userId)).map(m => m.userId);
      if (implicitlyRemoved.length > 0) {
        updates.removeMembers = [...(updates.removeMembers as string[] || []), ...implicitlyRemoved];
      }
      // Detect role changes
      const roleChanges: Array<{ userId: string; role: string }> = [];
      for (const sm of editForm.selectedMembers) {
        const orig = (editTeam.members || []).find(m => m.userId === sm.userId);
        if (orig && orig.role !== sm.role) {
          // Need to remove and re-add with new role
          const removeArr = (updates.removeMembers as string[]) || [];
          if (!removeArr.includes(sm.userId)) {
            removeArr.push(sm.userId);
          }
          updates.removeMembers = removeArr;
          roleChanges.push({ userId: sm.userId, role: sm.role });
        }
      }
      if (roleChanges.length > 0) {
        updates.addMembers = [...(updates.addMembers as Array<{ userId: string; role: string }> || []), ...roleChanges];
      }
      await updateTeam(editTeam.id, updates as Parameters<typeof updateTeam>[1]);
      toast.success('Team updated successfully');
      setEditOpen(false);
    } catch {
      toast.error('Failed to update team');
    } finally {
      setTimeout(() => setEditing(false), 400);
    }
  }, [editTeam, editForm, updateTeam]);

  // ─── Delete Team ──────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteTeam(deleteTarget.id);
      toast.success('Team deleted');
      setDeleteTarget(null);
      if (selectedTeamId === deleteTarget.id) {
        setSelectedTeamId(null);
      }
    } catch {
      toast.error('Failed to delete team');
    }
  }, [deleteTarget, deleteTeam, selectedTeamId]);

  // ─── Add Member to Team ───────────────────────────────────
  const handleAddMember = useCallback(async () => {
    if (!selectedTeam || !addMemberUserId) {
      toast.error('Select a user to add');
      return;
    }
    if (addMemberRole === 'LEAD' && selectedTeam.members?.some(m => m.role === 'LEAD')) {
      toast.error('Team already has a lead. Remove the current lead first.');
      return;
    }
    setAddingMember(true);
    try {
      await updateTeam(selectedTeam.id, {
        addMembers: [{ userId: addMemberUserId, role: addMemberRole }],
      });
      toast.success('Member added');
      setAddMemberOpen(false);
      setAddMemberUserId('');
      setAddMemberRole('MEMBER');
      setAddMemberSearch('');
      await loadTeams();
    } catch {
      toast.error('Failed to add member');
    } finally {
      setTimeout(() => setAddingMember(false), 400);
    }
  }, [selectedTeam, addMemberUserId, addMemberRole, updateTeam, loadTeams]);

  // ─── Remove Member ────────────────────────────────────────
  const handleRemoveMember = useCallback(async (memberId: string, memberName?: string) => {
    if (!selectedTeam) return;
    try {
      await updateTeam(selectedTeam.id, { removeMembers: [memberId] });
      toast.success(`${memberName || 'Member'} removed`);
      await loadTeams();
    } catch {
      toast.error('Failed to remove member');
    }
  }, [selectedTeam, updateTeam, loadTeams]);

  // ─── Change Lead ──────────────────────────────────────────
  const handleChangeLead = useCallback(async (newLeadUserId: string, newLeadName?: string) => {
    if (!selectedTeam) return;
    const currentLead = selectedTeam.members?.find(m => m.role === 'LEAD');
    try {
      const removeMembers: string[] = [];
      const addMembers: Array<{ userId: string; role: string }> = [];
      if (currentLead) {
        removeMembers.push(currentLead.userId);
        addMembers.push({ userId: currentLead.userId, role: 'MEMBER' });
      }
      const existingMember = selectedTeam.members?.find(m => m.userId === newLeadUserId);
      if (existingMember) {
        removeMembers.push(newLeadUserId);
      }
      addMembers.push({ userId: newLeadUserId, role: 'LEAD' });

      await updateTeam(selectedTeam.id, { addMembers, removeMembers });
      toast.success(`${newLeadName || 'User'} promoted to Lead`);
      await loadTeams();
    } catch {
      toast.error('Failed to change lead');
    }
  }, [selectedTeam, updateTeam, loadTeams]);

  // ─── Save Settings ───────────────────────────────────────
  const handleSaveSettings = useCallback(async () => {
    if (!selectedTeam || !settingsForm.name.trim()) {
      toast.error('Team name is required');
      return;
    }
    try {
      await updateTeam(selectedTeam.id, {
        name: settingsForm.name,
        description: settingsForm.description,
        color: settingsForm.color,
        departmentId: settingsForm.departmentId || null,
      });
      toast.success('Team settings updated');
      await loadTeams();
    } catch {
      toast.error('Failed to update settings');
    }
  }, [selectedTeam, settingsForm, updateTeam, loadTeams]);

  // ─── Create Team Task ────────────────────────────────────
  const handleCreateTeamTask = useCallback(async () => {
    if (!selectedTeamId || !taskForm.title.trim()) {
      toast.error('Task title is required');
      return;
    }
    setCreatingTask(true);
    try {
      await createTask({
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || undefined,
        teamId: selectedTeamId,
        priority: taskForm.priority,
        assigneeId: taskForm.assigneeId || undefined,
        dueDate: taskForm.dueDate || undefined,
        status: 'todo',
      });
      toast.success('Task created successfully');
      setCreateTaskOpen(false);
      setTaskForm({ title: '', description: '', priority: 'medium', assigneeId: '', dueDate: '' });
      await loadTeams();
    } catch {
      toast.error('Failed to create task');
    } finally {
      setTimeout(() => setCreatingTask(false), 400);
    }
  }, [selectedTeamId, taskForm, createTask, loadTeams]);

  // ─── Avatar Upload Handler ───────────────────────────────
  const handleAvatarUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setTeamAvatar(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // ─── Sort indicator component ─────────────────────────────
  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    if (sortDir === 'asc') return <ChevronUp className="h-3 w-3 text-emerald-400" />;
    if (sortDir === 'desc') return <ChevronDown className="h-3 w-3 text-emerald-400" />;
    return <ArrowUpDown className="h-3 w-3 opacity-30" />;
  }

  // ─── Department options ───────────────────────────────────
  const deptOptions = useMemo(() => {
    return departments.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [departments]);

  // ─── Member distribution for chart ────────────────────────
  const memberDistribution = useMemo(() => {
    if (!selectedTeam?.members) return [];
    const roleCount: Record<string, number> = {};
    selectedTeam.members.forEach(m => {
      const user = users.find(u => u.id === m.userId);
      const role = user?.role || 'employee';
      roleCount[role] = (roleCount[role] || 0) + 1;
    });
    return Object.entries(roleCount).map(([role, count]) => ({ role, count }));
  }, [selectedTeam, users]);

  const roleColors: Record<string, string> = {
    admin: '#f43f5e',
    manager: '#f59e0b',
    employee: '#10b981',
  };

  // ─── Filtered members for detail page ────────────────────
  const filteredMembers = useMemo(() => {
    if (!selectedTeam?.members) return [];
    const members = selectedTeam.members;
    if (!memberSearch) return members;
    const q = memberSearch.toLowerCase();
    return members.filter(m =>
      (m.userName || '').toLowerCase().includes(q) ||
      (m.userEmail || '').toLowerCase().includes(q)
    );
  }, [selectedTeam, memberSearch]);

  // ═══════════════════════════════════════════════════════════
  // ═══ RENDER: TEAM DETAIL PAGE ═════════════════════════════
  // ═══════════════════════════════════════════════════════════
  if (selectedTeam && selectedTeamId) {
    const lead = getTeamLead(selectedTeam);
    const members = selectedTeam.members || [];
    const memberCount = selectedTeam.memberCount ?? members.length;

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedTeamId}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="space-y-6"
        >
          {/* ═══ BACK BUTTON ═══ */}
          <Button variant="ghost" size="sm" onClick={() => setSelectedTeamId(null)} className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />Back to Teams
          </Button>

          {/* ═══ TEAM HEADER ═══ */}
          <GlassCard className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
                  style={{ backgroundColor: selectedTeam.color || '#10b981', opacity: 0.9 }}
                >
                  <span className="text-white drop-shadow-sm">{getInitials(selectedTeam.name)}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl font-bold truncate">{selectedTeam.name}</h2>
                    {selectedTeam.departmentName && (
                      <Badge variant="outline" className="text-[10px] border-cyan-500/20 text-cyan-400 bg-cyan-500/5">
                        <Building2 className="h-2.5 w-2.5 mr-1" />{selectedTeam.departmentName}
                      </Badge>
                    )}
                    <Badge className={cn(
                      'text-[10px]',
                      selectedTeam.isActive !== false
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                        : 'bg-slate-500/15 text-slate-400 border-slate-500/25'
                    )}>
                      {selectedTeam.isActive !== false ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {selectedTeam.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{selectedTeam.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => openEdit(selectedTeam)} className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-emerald-500/10 hover:border-emerald-500/30">
                  <Edit3 className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  if (lead) {
                    toast.info(`Current lead: ${lead.userName || 'Unknown'}. Select a new lead from the Members tab.`);
                  } else {
                    toast.info('Select a new lead from the Members tab.');
                  }
                }} className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-amber-500/10 hover:border-amber-500/30">
                  <Crown className="h-3.5 w-3.5" /> Change Lead
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAddMemberOpen(true)} className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-cyan-500/10 hover:border-cyan-500/30">
                  <UserPlus className="h-3.5 w-3.5" /> Add Member
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDeleteTarget(selectedTeam)} className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-rose-500/10 hover:border-rose-500/30 text-rose-400">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </div>
          </GlassCard>

          {/* ═══ DETAIL TABS ═══ */}
          <Tabs value={detailTab} onValueChange={setDetailTab}>
            <TabsList className="bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1]">
              <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs gap-1.5">
                <PieChart className="h-3.5 w-3.5" /> Overview
              </TabsTrigger>
              <TabsTrigger value="members" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs gap-1.5">
                <Users className="h-3.5 w-3.5" /> Members
              </TabsTrigger>
              <TabsTrigger value="tasks" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs gap-1.5">
                <Target className="h-3.5 w-3.5" /> Tasks
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs gap-1.5">
                <Settings className="h-3.5 w-3.5" /> Settings
              </TabsTrigger>
            </TabsList>

            {/* ── OVERVIEW TAB ── */}
            <TabsContent value="overview" className="mt-4 space-y-6">
              {/* Stats cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { title: 'Members', value: memberCount, icon: Users, color: 'cyan' as const },
                  { title: 'Tasks', value: teamTaskStats.total, icon: Target, color: 'emerald' as const },
                  { title: 'Active Tasks', value: teamTaskStats.inProgress, icon: Activity, color: 'amber' as const },
                  { title: 'Completion', value: `${teamTaskStats.completionRate}%`, icon: TrendingUp, color: 'violet' as const },
                ].map((m, i) => (
                  <motion.div key={m.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <StatCard title={m.title} value={m.value} icon={m.icon} color={m.color} compact />
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Team Lead Card */}
                <GlassCard glow="amber" className="p-6">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-400" /> Team Lead
                  </h3>
                  {lead ? (
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'h-14 w-14 rounded-xl bg-gradient-to-br flex items-center justify-center text-lg font-bold border-2 border-amber-400/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]',
                        getAvatarColor(lead.userName || lead.userId)
                      )}>
                        {getInitials(lead.userName || '?')}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-base font-bold truncate">{lead.userName || 'Unknown'}</p>
                          <Badge className="text-[10px] bg-amber-500/15 text-amber-400 border-amber-500/25 gap-0.5">
                            <Crown className="h-2.5 w-2.5" /> Team Lead
                          </Badge>
                        </div>
                        {lead.userEmail && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Mail className="h-3 w-3" /> {lead.userEmail}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/5 border border-amber-500/10">
                      <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-400">No Team Lead Assigned</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Assign a lead from the Members tab to improve team coordination.</p>
                      </div>
                    </div>
                  )}
                </GlassCard>

                {/* Department & Creation Info */}
                <GlassCard className="p-6">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-cyan-400" /> Team Information
                  </h3>
                  <div className="space-y-4">
                    {selectedTeam.departmentName && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Department</span>
                        <Badge variant="outline" className="text-[10px] border-cyan-500/20 text-cyan-400 bg-cyan-500/5">
                          {selectedTeam.departmentName}
                        </Badge>
                      </div>
                    )}
                    <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Status</span>
                      <Badge className={cn(
                        'text-[10px]',
                        selectedTeam.isActive !== false
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                          : 'bg-slate-500/15 text-slate-400 border-slate-500/25'
                      )}>
                        {selectedTeam.isActive !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Created</span>
                      <span className="text-xs font-medium flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" /> {format(parseISO(selectedTeam.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Members</span>
                      <span className="text-xs font-medium">{memberCount} total</span>
                    </div>
                    <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Tasks</span>
                      <span className="text-xs font-medium">{teamTaskStats.total} total</span>
                    </div>
                  </div>
                </GlassCard>
              </div>

              {/* Member Distribution Chart & Task Progress */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Member Distribution */}
                <GlassCard className="p-6">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-violet-400" /> Member Distribution
                  </h3>
                  {memberDistribution.length > 0 ? (
                    <div className="space-y-3">
                      {memberDistribution.map(({ role, count }) => (
                        <div key={role} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="capitalize font-medium">{role}s</span>
                            <span className="text-muted-foreground">{count} member{count !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="h-2 rounded-full bg-black/[0.03] dark:bg-white/[0.05] overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: roleColors[role] || '#6b7280' }}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max((count / memberCount) * 100, 4)}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No members to display</p>
                  )}
                </GlassCard>

                {/* Task Progress */}
                <GlassCard className="p-6">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-400" /> Task Progress
                  </h3>
                  {teamTaskStats.total > 0 ? (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-medium">Completion Rate</span>
                          <span className="text-emerald-400 font-bold">{teamTaskStats.completionRate}%</span>
                        </div>
                        <Progress value={teamTaskStats.completionRate} className="h-2.5" />
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="p-2.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.05]">
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <div className="h-1.5 w-1.5 rounded-full bg-slate-400" /> To Do
                          </div>
                          <p className="text-lg font-bold mt-0.5">{teamTaskStats.todo}</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.05]">
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> In Progress
                          </div>
                          <p className="text-lg font-bold mt-0.5">{teamTaskStats.inProgress}</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.05]">
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Done
                          </div>
                          <p className="text-lg font-bold mt-0.5">{teamTaskStats.done}</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.05]">
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <div className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Blocked
                          </div>
                          <p className="text-lg font-bold mt-0.5">{teamTaskStats.blocked}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-6 text-center">
                      <Target className="h-8 w-8 text-muted-foreground/30" />
                      <p className="text-xs text-muted-foreground">No tasks assigned to this team</p>
                    </div>
                  )}
                </GlassCard>
              </div>
            </TabsContent>

            {/* ── MEMBERS TAB ── */}
            <TabsContent value="members" className="mt-4 space-y-4">
              {/* Employee Profile View */}
              {selectedEmpId && selectedEmp ? (
                <div className="space-y-4">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedEmpId(null)} className="gap-1.5 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to Members
                  </Button>
                  <GlassCard className="p-6">
                    <div className="flex items-start gap-5">
                      <div className={cn(
                        'h-16 w-16 rounded-xl bg-gradient-to-br flex items-center justify-center text-xl font-bold text-white shrink-0 shadow-lg border-2',
                        getAvatarColor(selectedEmp.name),
                        selectedEmp.id === selectedTeam.members?.find(m => m.role === 'LEAD')?.userId ? 'border-amber-400/40' : 'border-black/[0.1] dark:border-white/[0.1]'
                      )}>
                        {getInitials(selectedEmp.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold">{selectedEmp.name}</h3>
                          {selectedEmp.id === selectedTeam.members?.find(m => m.role === 'LEAD')?.userId && (
                            <Badge className="text-[10px] bg-amber-500/15 text-amber-400 border-amber-500/25 gap-0.5">
                              <Crown className="h-2.5 w-2.5" /> Team Lead
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{selectedEmp.email}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
                      {[
                        { icon: Building2, label: 'Position', value: selectedEmp.position || 'Not set' },
                        { icon: Building2, label: 'Department', value: selectedEmp.department || 'Unassigned' },
                        { icon: Shield, label: 'Role', value: selectedEmp.role.charAt(0).toUpperCase() + selectedEmp.role.slice(1) },
                        { icon: Mail, label: 'Email', value: selectedEmp.email || 'Not set' },
                        { icon: CalendarDays, label: 'Join Date', value: selectedEmp.joinDate ? new Date(selectedEmp.joinDate).toLocaleDateString() : 'Not set' },
                        { icon: Activity, label: 'Status', value: selectedEmp.isActive !== false ? 'Active' : 'Inactive' },
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
                    {/* Team role and actions */}
                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-black/[0.1] dark:border-white/[0.1]">
                      {(() => {
                        const member = selectedTeam.members?.find(m => m.userId === selectedEmp.id);
                        const isLead = member?.role === 'LEAD';
                        return (
                          <>
                            <Badge className={cn(
                              'text-[10px] gap-0.5',
                              isLead ? 'bg-amber-500/15 text-amber-400 border-amber-500/25' : 'bg-slate-500/15 text-slate-400 border-slate-500/25'
                            )}>
                              {isLead ? <Crown className="h-2.5 w-2.5" /> : <UserCircle className="h-2.5 w-2.5" />}
                              {member?.role || 'Member'}
                            </Badge>
                            {!isLead && (
                              <Button variant="outline" size="sm" className="h-7 gap-1 text-[10px] text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border-amber-500/20" onClick={() => handleChangeLead(selectedEmp.id, selectedEmp.name)}>
                                <Crown className="h-3 w-3" /> Make Lead
                              </Button>
                            )}
                            <Button variant="outline" size="sm" className="h-7 gap-1 text-[10px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-rose-500/20" onClick={() => { handleRemoveMember(selectedEmp.id, selectedEmp.name); setSelectedEmpId(null); }}>
                              <Trash2 className="h-3 w-3" /> Remove from Team
                            </Button>
                          </>
                        );
                      })()}
                    </div>
                  </GlassCard>
                </div>
              ) : (
              <>
              {/* Search + Add Member */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    className="h-9 pl-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                  />
                </div>
                <Button size="sm" onClick={() => setAddMemberOpen(true)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-500">
                  <UserPlus className="h-3.5 w-3.5" /> Add Member
                </Button>
              </div>

              {/* Members Table */}
              <GlassCard className="p-0 overflow-hidden">
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-black/[0.1] dark:border-white/[0.1] hover:bg-transparent">
                        <TableHead>Member</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead className="w-28">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.map((m) => {
                        const user = users.find(u => u.id === m.userId);
                        const isLead = m.role === 'LEAD';
                        return (
                          <motion.tr
                            key={m.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={cn(
                              'border-b border-black/[0.06] dark:border-white/[0.05] transition-colors cursor-pointer',
                              isLead ? 'bg-amber-500/[0.03] hover:bg-amber-500/[0.06]' : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
                            )}
                            onClick={() => setSelectedEmpId(m.userId)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  'h-9 w-9 rounded-lg bg-gradient-to-br flex items-center justify-center text-sm font-medium border',
                                  getAvatarColor(m.userName || m.userId),
                                  isLead ? 'border-amber-400/30 shadow-[0_0_12px_rgba(245,158,11,0.12)]' : 'border-black/[0.1] dark:border-white/[0.1]'
                                )}>
                                  {getInitials(m.userName || '?')}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate flex items-center gap-1.5">
                                    {m.userName || 'Unknown'}
                                    {isLead && <Crown className="h-3 w-3 text-amber-400" />}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground truncate">{m.userEmail || '—'}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={cn(
                                'text-[10px] gap-0.5',
                                isLead
                                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                                  : 'bg-slate-500/15 text-slate-400 border-slate-500/25'
                              )}>
                                {isLead ? <Crown className="h-2.5 w-2.5" /> : <UserCircle className="h-2.5 w-2.5" />}
                                {m.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-muted-foreground">{user?.position || '—'}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-muted-foreground">
                                {user?.department || departments.find(d => d.id === user?.departmentId)?.name || '—'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {!isLead && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 gap-1 text-[10px] text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                                    onClick={() => handleChangeLead(m.userId, m.userName)}
                                  >
                                    <Crown className="h-3 w-3" /> Make Lead
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 gap-1 text-[10px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                  onClick={() => handleRemoveMember(m.userId, m.userName)}
                                >
                                  <Trash2 className="h-3 w-3" /> Remove
                                </Button>
                              </div>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                      {filteredMembers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                            <div className="flex flex-col items-center gap-2">
                              <Users className="h-8 w-8 text-muted-foreground/30" />
                              <p className="text-sm">{memberSearch ? 'No members match your search' : 'No members in this team'}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </GlassCard>
              </>
              )}
            </TabsContent>

            {/* ── TASKS TAB ── */}
            <TabsContent value="tasks" className="mt-4 space-y-4">
              {/* Add Task Button */}
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Team Tasks ({teamTaskStats.total})</h4>
                <Button size="sm" onClick={() => setCreateTaskOpen(true)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-500">
                  <Plus className="h-3.5 w-3.5" /> Add Task
                </Button>
              </div>
              {/* Task Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'To Do', count: teamTaskStats.todo, color: 'bg-slate-400', textColor: 'text-slate-400' },
                  { label: 'In Progress', count: teamTaskStats.inProgress, color: 'bg-cyan-400', textColor: 'text-cyan-400' },
                  { label: 'Done', count: teamTaskStats.done, color: 'bg-emerald-400', textColor: 'text-emerald-400' },
                  { label: 'Blocked', count: teamTaskStats.blocked, color: 'bg-rose-400', textColor: 'text-rose-400' },
                ].map((s, i) => (
                  <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <GlassCard className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={cn('h-2 w-2 rounded-full', s.color)} />
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</span>
                      </div>
                      <p className={cn('text-2xl font-bold', s.textColor)}>{s.count}</p>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>

              {/* Task List */}
              <GlassCard className="p-0 overflow-hidden">
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-black/[0.1] dark:border-white/[0.1] hover:bg-transparent">
                        <TableHead>Task</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Assignee</TableHead>
                        <TableHead>Due Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamTasks.length > 0 ? teamTasks.map((task) => (
                        <motion.tr
                          key={task.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border-b border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors"
                        >
                          <TableCell>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate max-w-[250px]">{task.title}</p>
                              {task.description && (
                                <p className="text-[10px] text-muted-foreground truncate max-w-[250px]">{task.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell><TaskStatusBadge status={task.status} /></TableCell>
                          <TableCell><PriorityBadge priority={task.priority} /></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {task.assigneeName ? (
                                <>
                                  <div className={cn('h-5 w-5 rounded-full bg-gradient-to-br flex items-center justify-center text-[8px] font-medium border border-black/[0.1] dark:border-white/[0.1]', getAvatarColor(task.assigneeName))}>
                                    {getInitials(task.assigneeName)}
                                  </div>
                                  <span className="text-xs truncate max-w-[100px]">{task.assigneeName}</span>
                                </>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">Unassigned</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {task.dueDate ? (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {format(parseISO(task.dueDate), 'MMM d')}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </motion.tr>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                            <div className="flex flex-col items-center gap-2">
                              <Target className="h-8 w-8 text-muted-foreground/30" />
                              <p className="text-sm">No tasks assigned to this team</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </GlassCard>
            </TabsContent>

            {/* ── SETTINGS TAB ── */}
            <TabsContent value="settings" className="mt-4 space-y-6">
              {/* Edit Team Form */}
              <GlassCard className="p-6">
                <h3 className="text-sm font-semibold mb-5 flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-cyan-400" /> General Information
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Team Name</Label>
                      <Input
                        value={settingsForm.name}
                        onChange={e => setSettingsForm(prev => ({ ...prev, name: e.target.value }))}
                        className="h-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Department</Label>
                      <Select
                        value={settingsForm.departmentId || 'none'}
                        onValueChange={v => setSettingsForm(prev => ({ ...prev, departmentId: v === 'none' ? '' : v }))}
                      >
                        <SelectTrigger className="h-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Department</SelectItem>
                          {deptOptions.map(d => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <Textarea
                      value={settingsForm.description}
                      onChange={e => setSettingsForm(prev => ({ ...prev, description: e.target.value }))}
                      className="min-h-[80px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Team Color</Label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {COLOR_PRESETS.map(c => (
                        <button
                          key={c.value}
                          onClick={() => setSettingsForm(prev => ({ ...prev, color: c.value }))}
                          className={cn(
                            'h-7 w-7 rounded-lg transition-all border-2',
                            settingsForm.color === c.value ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:border-black/[0.15] dark:hover:border-white/[0.3]'
                          )}
                          style={{ backgroundColor: c.value }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleSaveSettings} className="gap-1.5 bg-emerald-600 hover:bg-emerald-500">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Save Changes
                  </Button>
                </div>
              </GlassCard>

              {/* Change Team Lead */}
              <GlassCard className="p-6">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-400" /> Change Team Lead
                </h3>
                <div className="space-y-3">
                  {lead ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                      <div className={cn('h-8 w-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-xs font-medium border border-amber-400/30', getAvatarColor(lead.userName || lead.userId))}>
                        {getInitials(lead.userName || '?')}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{lead.userName || 'Unknown'}</p>
                        <p className="text-[10px] text-muted-foreground">Current Lead</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No lead assigned. Use the Members tab to assign a lead.</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">To change the team lead, go to the Members tab and click &quot;Make Lead&quot; on the desired member.</p>
                  <Button variant="outline" size="sm" onClick={() => setDetailTab('members')} className="gap-1.5 border-black/[0.1] dark:border-white/[0.1]">
                    <ArrowRight className="h-3.5 w-3.5" /> Go to Members
                  </Button>
                </div>
              </GlassCard>

              {/* Danger Zone */}
              <GlassCard glow="rose" className="p-6">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-rose-400">
                  <AlertTriangle className="h-4 w-4" /> Danger Zone
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-rose-500/5 border border-rose-500/10">
                    <div>
                      <p className="text-sm font-medium">Deactivate Team</p>
                      <p className="text-[10px] text-muted-foreground">Mark this team as inactive. Members will remain but the team won&apos;t appear in active lists.</p>
                    </div>
                    <Button variant="outline" size="sm" className="gap-1.5 border-rose-500/20 text-rose-400 hover:bg-rose-500/10">
                      Deactivate
                    </Button>
                  </div>
                  <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />
                  <div className="flex items-center justify-between p-3 rounded-lg bg-rose-500/5 border border-rose-500/10">
                    <div>
                      <p className="text-sm font-medium text-rose-400">Delete Team</p>
                      <p className="text-[10px] text-muted-foreground">Permanently delete this team and remove all member associations. This action cannot be undone.</p>
                    </div>
                    <Button variant="outline" size="sm" className="gap-1.5 border-rose-500/20 text-rose-400 hover:bg-rose-500/10" onClick={() => setDeleteTarget(selectedTeam)}>
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              </GlassCard>
            </TabsContent>
          </Tabs>

          {/* ═══ ADD MEMBER DIALOG ═══ */}
          <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-emerald-400" /> Add Member to Team
                </DialogTitle>
                <DialogDescription>Select a user and role to add them to this team.</DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto">
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Search Users</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={addMemberSearch}
                      onChange={e => setAddMemberSearch(e.target.value)}
                      className="h-9 pl-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Select User</Label>
                  <Select value={addMemberUserId} onValueChange={setAddMemberUserId}>
                    <SelectTrigger className="h-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs">
                      <SelectValue placeholder="Choose a user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredAvailableUsersForAdd.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Role</Label>
                  <Select value={addMemberRole} onValueChange={v => setAddMemberRole(v as 'LEAD' | 'MEMBER')}>
                    <SelectTrigger className="h-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEMBER">Member</SelectItem>
                      <SelectItem value="LEAD">Lead</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddMemberOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
                <Button onClick={handleAddMember} disabled={addingMember} className="gap-1.5 bg-emerald-600 hover:bg-emerald-500">
                  {addingMember ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />} Add Member
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ═══ DELETE CONFIRMATION ═══ */}
          <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-rose-400" /> Delete Team
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will remove all member associations and cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-black/[0.1] dark:border-white/[0.1]">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-500">Delete Team</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* ═══ CREATE TEAM TASK DIALOG ═══ */}
          <Dialog open={createTaskOpen} onOpenChange={setCreateTaskOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-emerald-400" /> Add Team Task
                </DialogTitle>
                <DialogDescription>Create a new task for the {selectedTeam?.name} team.</DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto">
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Task Title *</Label>
                  <Input
                    placeholder="e.g. Implement feature X"
                    value={taskForm.title}
                    onChange={e => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                    className="h-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <Textarea
                    placeholder="Task description..."
                    value={taskForm.description}
                    onChange={e => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                    className="min-h-[70px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Priority</Label>
                    <Select value={taskForm.priority} onValueChange={v => setTaskForm(prev => ({ ...prev, priority: v }))}>
                      <SelectTrigger className="h-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs">
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
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Due Date</Label>
                    <Input
                      type="date"
                      value={taskForm.dueDate}
                      onChange={e => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="h-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Assignee</Label>
                  <Select value={taskForm.assigneeId || 'none'} onValueChange={v => setTaskForm(prev => ({ ...prev, assigneeId: v === 'none' ? '' : v }))}>
                    <SelectTrigger className="h-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs">
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {(selectedTeam?.members || []).map(m => (
                        <SelectItem key={m.userId} value={m.userId}>{m.userName || 'Unknown'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateTaskOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
                <Button onClick={handleCreateTeamTask} disabled={creatingTask} className="gap-1.5 bg-emerald-600 hover:bg-emerald-500">
                  {creatingTask ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Create Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // ═══ RENDER: TEAM LIST PAGE (default) ═════════════════════
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">Team Management</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {metrics.totalTeams} teams &middot; {metrics.totalMembers} total members
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-emerald-500/10 hover:border-emerald-500/30">
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh
          </Button>
          <Button size="sm" onClick={() => setActiveView('create-team')} className="gap-1.5 bg-emerald-600 hover:bg-emerald-500">
            <Plus className="h-3.5 w-3.5" /> New Team
          </Button>
        </div>
      </div>

      {/* ═══ STAT CARDS ROW ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { title: 'Total Teams', value: metrics.totalTeams, icon: UsersRound, color: 'cyan' as const, subtitle: 'Organizational units' },
          { title: 'Active Teams', value: metrics.activeTeams, icon: CheckCircle2, color: 'emerald' as const, subtitle: 'Currently active' },
          { title: 'Total Members', value: metrics.totalMembers, icon: Users, color: 'amber' as const, subtitle: 'Across all teams' },
          { title: 'Teams with Lead', value: metrics.teamsWithLead, icon: Shield, color: 'violet' as const, subtitle: 'Leadership assigned' },
        ].map((m, i) => (
          <motion.div key={m.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <StatCard title={m.title} value={m.value} icon={m.icon} color={m.color} subtitle={m.subtitle} hero />
          </motion.div>
        ))}
      </div>

      {/* ═══ STICKY FILTER + TABS ═══ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl space-y-4 -mx-1 px-1 pt-1 pb-2">
          {/* ═══ SEARCH & FILTER ═══ */}
          <GlassCard className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search teams, members..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="h-9 pl-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30" />
              </div>
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="h-9 w-44 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {deptOptions.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterLead} onValueChange={setFilterLead}>
                <SelectTrigger className="h-9 w-36 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs">
                  <SelectValue placeholder="Lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  <SelectItem value="has-lead">Has Lead</SelectItem>
                  <SelectItem value="no-lead">No Lead</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterActive} onValueChange={setFilterActive}>
                <SelectTrigger className="h-9 w-32 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              {(searchQuery || filterDept !== 'all' || filterLead !== 'all' || filterActive !== 'all') && (
                <Button variant="ghost" size="sm" className="h-9 gap-1 text-xs text-muted-foreground"
                  onClick={() => { setSearchQuery(''); setFilterDept('all'); setFilterLead('all'); setFilterActive('all'); }}>
                  <X className="h-3 w-3" /> Clear
                </Button>
              )}
            </div>
          </GlassCard>

          {/* ═══ VIEW TABS ═══ */}
          <TabsList className="bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1]">
            <TabsTrigger value="grid" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs gap-1.5">
              <LayoutGrid className="h-3.5 w-3.5" /> Grid
            </TabsTrigger>
            <TabsTrigger value="table" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs gap-1.5">
              <List className="h-3.5 w-3.5" /> Table
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── GRID VIEW ── */}
        <TabsContent value="grid" className="mt-4">
          {sortedTeams.length === 0 ? (
            <GlassCard className="p-12">
              <div className="flex flex-col items-center gap-3 text-center">
                <UsersRound className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-muted-foreground">No teams found</p>
                <Button size="sm" onClick={() => setActiveView('create-team')} className="gap-1.5 bg-emerald-600 hover:bg-emerald-500">
                  <Plus className="h-3.5 w-3.5" /> Create your first team
                </Button>
              </div>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedTeams.map((team, i) => {
                const lead = getTeamLead(team);
                const members = team.members || [];
                const displayMembers = members.slice(0, 4);
                const extraCount = Math.max(0, members.length - 4);
                const memberCount = team.memberCount ?? members.length;

                return (
                  <motion.div key={team.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <GlassCard hover className="relative overflow-hidden group" onClick={() => openDetail(team)}>
                      {/* Color accent bar */}
                      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: team.color || '#10b981' }} />

                      <div className="p-5 pt-6">
                        {/* Header: Name + Actions */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-base font-bold truncate">{team.name}</h3>
                            {team.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{team.description}</p>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetail(team); }} className="gap-2 text-xs">
                                <Eye className="h-3.5 w-3.5" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(team); }} className="gap-2 text-xs">
                                <Edit3 className="h-3.5 w-3.5" /> Edit Team
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeleteTarget(team); }} className="gap-2 text-xs text-rose-400 focus:text-rose-400">
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Department badge */}
                        {team.departmentName && (
                          <Badge variant="outline" className="text-[10px] border-cyan-500/20 text-cyan-400 bg-cyan-500/5 mb-3">
                            <Building2 className="h-2.5 w-2.5 mr-1" />{team.departmentName}
                          </Badge>
                        )}

                        {/* Member avatars row */}
                        <div className="flex items-center gap-1 mb-3">
                          {displayMembers.map((m, idx) => (
                            <div
                              key={m.id}
                              className={cn(
                                'h-7 w-7 rounded-full bg-gradient-to-br flex items-center justify-center text-[10px] font-medium border-2 border-background',
                                getAvatarColor(m.userName || m.userId),
                                m.role === 'LEAD' && 'ring-2 ring-amber-400/50'
                              )}
                              title={`${m.userName || 'Unknown'} (${m.role})`}
                              style={{ zIndex: displayMembers.length - idx, marginLeft: idx > 0 ? '-6px' : 0 }}
                            >
                              {getInitials(m.userName || '?')}
                            </div>
                          ))}
                          {extraCount > 0 && (
                            <div className="h-7 w-7 rounded-full bg-black/[0.06] dark:bg-white/[0.1] flex items-center justify-center text-[10px] font-medium border-2 border-background" style={{ marginLeft: displayMembers.length > 0 ? '-6px' : 0 }}>
                              +{extraCount}
                            </div>
                          )}
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                          </div>
                          {(team.taskCount ?? 0) > 0 && (
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>{team.taskCount} task{team.taskCount !== 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </div>

                        {/* Team Lead */}
                        {lead && (
                          <div className="flex items-center gap-1.5 mb-3">
                            <Badge className="text-[10px] bg-amber-500/15 text-amber-400 border-amber-500/25 gap-1">
                              <Crown className="h-2.5 w-2.5" /> Lead
                            </Badge>
                            <span className="text-xs font-medium truncate">{lead.userName || 'Unknown'}</span>
                          </div>
                        )}

                        {/* Created date */}
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                          <CalendarDays className="h-2.5 w-2.5" />
                          Created {format(parseISO(team.createdAt), 'MMM d, yyyy')}
                        </div>

                        {/* Status indicator */}
                        {team.isActive === false && (
                          <Badge className="text-[10px] mt-2 bg-slate-500/15 text-slate-400 border-slate-500/25">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── TABLE VIEW ── */}
        <TabsContent value="table" className="mt-4">
          <GlassCard className="p-0 overflow-hidden">
            <ScrollArea className="max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-black/[0.1] dark:border-white/[0.1] hover:bg-transparent">
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('name')}>
                      <div className="flex items-center gap-1">Team Name {SortIcon({ field: "name" })}</div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('department')}>
                      <div className="flex items-center gap-1">Department {SortIcon({ field: "department" })}</div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('lead')}>
                      <div className="flex items-center gap-1">Lead {SortIcon({ field: "lead" })}</div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('members')}>
                      <div className="flex items-center gap-1">Members {SortIcon({ field: "members" })}</div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('tasks')}>
                      <div className="flex items-center gap-1">Tasks {SortIcon({ field: "tasks" })}</div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('created')}>
                      <div className="flex items-center gap-1">Created {SortIcon({ field: "created" })}</div>
                    </TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTeams.map((team, i) => {
                    const lead = getTeamLead(team);
                    const memberCount = team.memberCount ?? team.members?.length ?? 0;
                    return (
                      <motion.tr
                        key={team.id}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors cursor-pointer group"
                        onClick={() => openDetail(team)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: team.color || '#10b981' }} />
                            <div className="min-w-0">
                              <span className="text-sm font-medium truncate block">{team.name}</span>
                              {team.description && (
                                <span className="text-[10px] text-muted-foreground truncate block max-w-[200px]">{team.description}</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {team.departmentName ? (
                            <Badge variant="outline" className="text-[10px] border-cyan-500/20 text-cyan-400 bg-cyan-500/5">
                              {team.departmentName}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">&mdash;</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {lead ? (
                            <div className="flex items-center gap-1.5">
                              <div className={cn('h-6 w-6 rounded-full bg-gradient-to-br flex items-center justify-center text-[9px] font-medium border border-black/[0.1] dark:border-white/[0.1]', getAvatarColor(lead.userName || lead.userId))}>
                                {getInitials(lead.userName || '?')}
                              </div>
                              <span className="text-xs truncate max-w-[100px]">{lead.userName || 'Unknown'}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">No lead</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{memberCount}</TableCell>
                        <TableCell className="text-sm">{team.taskCount ?? 0}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {format(parseISO(team.createdAt), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-emerald-500/10" onClick={(e) => { e.stopPropagation(); openEdit(team); }}>
                              <Edit3 className="h-3.5 w-3.5 text-emerald-400" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-rose-500/10" onClick={(e) => { e.stopPropagation(); setDeleteTarget(team); }}>
                              <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                  {sortedTeams.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                        <div className="flex flex-col items-center gap-2">
                          <UsersRound className="h-8 w-8 text-muted-foreground/30" />
                          <p>No teams match your filters</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </GlassCard>
        </TabsContent>
      </Tabs>

      {/* ═══ CREATE TEAM DIALOG ═══ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-400" /> Create New Team
            </DialogTitle>
            <DialogDescription>Set up a new team with name, description, and initial members.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 py-2">
            {/* Avatar Upload */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                {teamAvatar ? (
                  <img src={teamAvatar} alt="Team avatar" className="h-16 w-16 rounded-xl object-cover border-2 border-black/[0.1] dark:border-white/[0.1]" />
                ) : (
                  <div
                    className="h-16 w-16 rounded-xl flex items-center justify-center text-lg font-bold border-2 border-dashed border-black/[0.12] dark:border-white/[0.2] transition-colors group-hover:border-emerald-500/30"
                    style={{ backgroundColor: createForm.color ? `${createForm.color}15` : undefined }}
                  >
                    {createForm.name ? (
                      <span className="text-white/80">{getInitials(createForm.name)}</span>
                    ) : (
                      <ImagePlus className="h-5 w-5 text-muted-foreground/50" />
                    )}
                  </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="h-5 w-5 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
              </div>
              <div>
                <p className="text-sm font-medium">Team Avatar</p>
                <p className="text-[10px] text-muted-foreground">Click to upload (max 2MB)</p>
                {teamAvatar && (
                  <Button variant="ghost" size="sm" className="h-5 text-[10px] text-rose-400 hover:text-rose-300 mt-1 p-0" onClick={() => setTeamAvatar(null)}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Team Name *</Label>
              <Input
                placeholder="e.g. Frontend Squad"
                value={createForm.name}
                onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                className="h-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea
                placeholder="What does this team do?"
                value={createForm.description}
                onChange={e => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                className="min-h-[70px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Team Color</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLOR_PRESETS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setCreateForm(prev => ({ ...prev, color: c.value }))}
                    className={cn(
                      'h-7 w-7 rounded-lg transition-all border-2',
                      createForm.color === c.value ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:border-black/[0.15] dark:hover:border-white/[0.3]'
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Department</Label>
              <Select value={createForm.departmentId || 'none'} onValueChange={v => setCreateForm(prev => ({ ...prev, departmentId: v === 'none' ? '' : v }))}>
                <SelectTrigger className="h-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Department</SelectItem>
                  {deptOptions.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Add Initial Members</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={createForm.memberSearch}
                  onChange={e => setCreateForm(prev => ({ ...prev, memberSearch: e.target.value }))}
                  className="h-9 pl-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                />
              </div>
              <ScrollArea className="max-h-[160px]">
                <div className="space-y-1">
                  {availableUsersForCreate
                    .filter(u => {
                      if (!createForm.memberSearch) return true;
                      const q = createForm.memberSearch.toLowerCase();
                      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
                    })
                    .slice(0, 15)
                    .map(u => {
                      const isSelected = createForm.selectedMembers.some(m => m.userId === u.id);
                      const existingRole = createForm.selectedMembers.find(m => m.userId === u.id)?.role || 'MEMBER';
                      return (
                        <div key={u.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={cn('h-7 w-7 rounded-full bg-gradient-to-br flex items-center justify-center text-[10px] font-medium border border-black/[0.1] dark:border-white/[0.1]', getAvatarColor(u.name))}>
                              {getInitials(u.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{u.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                            </div>
                          </div>
                          {isSelected ? (
                            <div className="flex items-center gap-1.5">
                              <Select value={existingRole} onValueChange={v => setCreateForm(prev => ({
                                ...prev,
                                selectedMembers: prev.selectedMembers.map(m => m.userId === u.id ? { ...m, role: v as 'LEAD' | 'MEMBER' } : m),
                              }))}>
                                <SelectTrigger className="h-6 w-20 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-[10px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="MEMBER">Member</SelectItem>
                                  <SelectItem value="LEAD">Lead</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-rose-500/10" onClick={() => setCreateForm(prev => ({
                                ...prev,
                                selectedMembers: prev.selectedMembers.filter(m => m.userId !== u.id),
                              }))}>
                                <X className="h-3 w-3 text-rose-400" />
                              </Button>
                            </div>
                          ) : (
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 hover:bg-emerald-500/10 text-emerald-400" onClick={() => setCreateForm(prev => ({
                              ...prev,
                              selectedMembers: [...prev.selectedMembers, { userId: u.id, role: 'MEMBER' as const }],
                            }))}>
                              <Plus className="h-3 w-3" /> Add
                            </Button>
                          )}
                        </div>
                      );
                    })}
                </div>
              </ScrollArea>
              {createForm.selectedMembers.length > 0 && (
                <p className="text-[10px] text-muted-foreground">{createForm.selectedMembers.length} member(s) selected</p>
              )}
            </div>
          </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="gap-1.5 bg-emerald-600 hover:bg-emerald-500">
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Create Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ EDIT TEAM DIALOG ═══ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-emerald-400" /> Edit Team
            </DialogTitle>
            <DialogDescription>Update team information and manage members.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Team Name *</Label>
              <Input
                value={editForm.name}
                onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                className="h-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea
                value={editForm.description}
                onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                className="min-h-[70px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Team Color</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLOR_PRESETS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setEditForm(prev => ({ ...prev, color: c.value }))}
                    className={cn(
                      'h-7 w-7 rounded-lg transition-all border-2',
                      editForm.color === c.value ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:border-black/[0.15] dark:hover:border-white/[0.3]'
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Department</Label>
              <Select value={editForm.departmentId || 'none'} onValueChange={v => setEditForm(prev => ({ ...prev, departmentId: v === 'none' ? '' : v }))}>
                <SelectTrigger className="h-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Department</SelectItem>
                  {deptOptions.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Manage Members</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search users to add..."
                  value={editForm.memberSearch}
                  onChange={e => setEditForm(prev => ({ ...prev, memberSearch: e.target.value }))}
                  className="h-9 pl-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                />
              </div>
              {/* Current members */}
              <ScrollArea className="max-h-[160px]">
                <div className="space-y-1">
                  {editForm.selectedMembers.map(m => {
                    const user = users.find(u => u.id === m.userId);
                    const isRemoved = editForm.removeMembers.includes(m.userId);
                    return (
                      <div key={m.userId} className={cn('flex items-center justify-between p-2 rounded-lg transition-colors', isRemoved && 'opacity-40 line-through')}>
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={cn('h-7 w-7 rounded-full bg-gradient-to-br flex items-center justify-center text-[10px] font-medium border border-black/[0.1] dark:border-white/[0.1]', getAvatarColor(user?.name || m.userId))}>
                            {getInitials(user?.name || '?')}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{user?.name || 'Unknown'}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Select value={m.role} onValueChange={v => setEditForm(prev => ({
                            ...prev,
                            selectedMembers: prev.selectedMembers.map(sm => sm.userId === m.userId ? { ...sm, role: v as 'LEAD' | 'MEMBER' } : sm),
                          }))}>
                            <SelectTrigger className="h-6 w-20 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-[10px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MEMBER">Member</SelectItem>
                              <SelectItem value="LEAD">Lead</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-rose-500/10" onClick={() => {
                            if (isRemoved) {
                              setEditForm(prev => ({ ...prev, removeMembers: prev.removeMembers.filter(id => id !== m.userId) }));
                            } else {
                              setEditForm(prev => ({ ...prev, removeMembers: [...prev.removeMembers, m.userId] }));
                            }
                          }}>
                            {isRemoved ? <Plus className="h-3 w-3 text-emerald-400" /> : <X className="h-3 w-3 text-rose-400" />}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {/* Users to add */}
                  {(() => {
                    const existingIds = new Set(editForm.selectedMembers.map(m => m.userId));
                    const toAdd = users.filter(u => u.isActive !== false && !existingIds.has(u.id));
                    const filtered = editForm.memberSearch
                      ? toAdd.filter(u => u.name.toLowerCase().includes(editForm.memberSearch.toLowerCase()) || u.email.toLowerCase().includes(editForm.memberSearch.toLowerCase()))
                      : toAdd;
                    return filtered.slice(0, 8).map(u => (
                      <div key={u.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={cn('h-7 w-7 rounded-full bg-gradient-to-br flex items-center justify-center text-[10px] font-medium border border-black/[0.1] dark:border-white/[0.1]', getAvatarColor(u.name))}>
                            {getInitials(u.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{u.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 hover:bg-emerald-500/10 text-emerald-400" onClick={() => setEditForm(prev => ({
                          ...prev,
                          selectedMembers: [...prev.selectedMembers, { userId: u.id, role: 'MEMBER' as const }],
                        }))}>
                          <Plus className="h-3 w-3" /> Add
                        </Button>
                      </div>
                    ));
                  })()}
                </div>
              </ScrollArea>
              {editForm.removeMembers.length > 0 && (
                <p className="text-[10px] text-rose-400">{editForm.removeMembers.length} member(s) will be removed</p>
              )}
            </div>
          </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleEdit} disabled={editing} className="gap-1.5 bg-emerald-600 hover:bg-emerald-500">
              {editing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Edit3 className="h-3.5 w-3.5" />} Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ DELETE CONFIRMATION ═══ */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-400" /> Delete Team
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will remove all member associations and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-black/[0.1] dark:border-white/[0.1]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-500">Delete Team</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
