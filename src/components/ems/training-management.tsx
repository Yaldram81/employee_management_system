'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { StatCard } from './stat-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  GraduationCap,
  Plus,
  Loader2,
  RefreshCw,
  Search,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Globe,
  School,
  Laptop,
  BookOpenCheck,
  Star,
  Award,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  FileText,
  Trophy,
  X,
} from 'lucide-react';
import { formatDate } from './shared';

// ─── Types ──────────────────────────────────────────────────────

interface TrainingProgram {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  format: string;
  duration: string;
  enrollmentCount: number;
  maxEnrollment?: number | null;
  rating: number;
  status: string;
  hasCertification: boolean;
  startDate: string;
  endDate?: string | null;
  instructor?: string | null;
  curriculum?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { enrollments: number };
}

interface TrainingEnrollment {
  id: string;
  trainingProgramId: string;
  userId: string;
  status: string;
  enrolledAt: string;
  completedAt?: string | null;
  score?: number | null;
  certificateUrl?: string | null;
  feedback?: string | null;
  trainingProgram?: {
    id: string;
    title: string;
    category: string;
    status: string;
    startDate: string;
    endDate?: string | null;
  };
  user?: {
    id: string;
    name: string;
    email: string;
    department?: { id: string; name: string } | null;
  };
}

interface SimpleUser {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  department?: { id: string; name: string } | null;
}

// ─── Form State ─────────────────────────────────────────────────

interface ProgramForm {
  title: string;
  description: string;
  category: string;
  format: string;
  duration: string;
  maxEnrollment: string;
  hasCertification: boolean;
  startDate: string;
  endDate: string;
  instructor: string;
  curriculum: string;
}

const emptyForm: ProgramForm = {
  title: '',
  description: '',
  category: 'TECHNICAL',
  format: 'ONLINE',
  duration: '',
  maxEnrollment: '',
  hasCertification: false,
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  instructor: '',
  curriculum: '',
};

// ─── Color / Icon Maps ──────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  TECHNICAL: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/25', dot: 'bg-cyan-400' },
  LEADERSHIP: { bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/25', dot: 'bg-violet-400' },
  COMPLIANCE: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/25', dot: 'bg-amber-400' },
  SOFT_SKILLS: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/25', dot: 'bg-rose-400' },
  SAFETY: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/25', dot: 'bg-orange-400' },
  ONBOARDING: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
};

const FORMAT_CONFIG: Record<string, { icon: typeof Globe; color: string; bg: string; text: string }> = {
  ONLINE: { icon: Globe, color: 'text-cyan-400', bg: 'bg-cyan-500/15', text: 'Online' },
  IN_PERSON: { icon: School, color: 'text-amber-400', bg: 'bg-amber-500/15', text: 'In Person' },
  HYBRID: { icon: Laptop, color: 'text-violet-400', bg: 'bg-violet-500/15', text: 'Hybrid' },
  SELF_PACED: { icon: BookOpenCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/15', text: 'Self-Paced' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  UPCOMING: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/25' },
  ACTIVE: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/25' },
  COMPLETED: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/25' },
  ARCHIVED: { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/25' },
};

const ENROLLMENT_STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  ENROLLED: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/25' },
  IN_PROGRESS: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/25' },
  COMPLETED: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/25' },
  CANCELLED: { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/25' },
  FAILED: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/25' },
};

// ─── Helpers ────────────────────────────────────────────────────

function getCategoryColor(cat: string) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS.TECHNICAL;
}

function getFormatConfig(fmt: string) {
  return FORMAT_CONFIG[fmt] || FORMAT_CONFIG.ONLINE;
}

function getStatusColor(status: string) {
  return STATUS_COLORS[status] || STATUS_COLORS.UPCOMING;
}

function getEnrollmentStatusColor(status: string) {
  return ENROLLMENT_STATUS_COLORS[status] || ENROLLMENT_STATUS_COLORS.ENROLLED;
}

function renderStars(rating: number) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            'h-3 w-3',
            i <= Math.floor(rating)
              ? 'text-amber-400 fill-amber-400'
              : i - 0.5 <= rating
                ? 'text-amber-400 fill-amber-400/50'
                : 'text-slate-600'
          )}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}


function parseCurriculum(curriculum: string | null | undefined): string[] {
  if (!curriculum) return [];
  try {
    const parsed = JSON.parse(curriculum);
    if (Array.isArray(parsed)) return parsed.map(String);
    return [];
  } catch {
    // Treat as comma-separated
    return curriculum.split(',').map((s) => s.trim()).filter(Boolean);
  }
}

// ─── Main Component ─────────────────────────────────────────────

export function TrainingManagement() {
  const { authToken, setSelectedTrainingId, setActiveView } = useEMSStore();

  // ─── Data State ───────────────────────────────────────────
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Filter State ─────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterFormat, setFilterFormat] = useState<string>('all');

  // ─── Dialog State ─────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ProgramForm>({ ...emptyForm });
  const [creating, setCreating] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<ProgramForm>({ ...emptyForm });
  const [editingProgram, setEditingProgram] = useState<TrainingProgram | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TrainingProgram | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Enrollment Modal ─────────────────────────────────────
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollProgram, setEnrollProgram] = useState<TrainingProgram | null>(null);
  const [enrollSearch, setEnrollSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [enrolling, setEnrolling] = useState(false);
  const [existingEnrollmentIds, setExistingEnrollmentIds] = useState<Set<string>>(new Set());

  // ─── Update Enrollment Dialog ─────────────────────────────
  const [updateEnrollmentOpen, setUpdateEnrollmentOpen] = useState(false);
  const [updateEnrollmentTarget, setUpdateEnrollmentTarget] = useState<TrainingEnrollment | null>(null);
  const [updateEnrollmentScore, setUpdateEnrollmentScore] = useState('');
  const [updateEnrollmentFeedback, setUpdateEnrollmentFeedback] = useState('');
  const [updateEnrollmentSaving, setUpdateEnrollmentSaving] = useState(false);

  // ─── API Helper ───────────────────────────────────────────
  const apiFetch = useCallback(
    async (url: string, options?: RequestInit) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string> || {}),
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      const res = await fetch(url, { ...options, headers });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'API request failed');
      }
      return data;
    },
    [authToken]
  );

  // ─── Load Programs ────────────────────────────────────────
  const loadPrograms = useCallback(async () => {
    try {
      const res = await apiFetch('/api/training');
      if (res.status === 'success') {
        setPrograms(res.data);
      }
    } catch (err) {
      console.error('Failed to load training programs:', err);
      toast.error('Failed to load training programs');
    }
  }, [apiFetch]);

  const loadUsers = useCallback(async () => {
    try {
      const res = await apiFetch('/api/users');
      if (res.status === 'success') {
        setUsers(
          res.data.map((u: Record<string, unknown>) => ({
            id: u.id as string,
            name: u.name as string,
            email: u.email as string,
            isActive: u.isActive as boolean,
            department: u.department as { id: string; name: string } | null,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  }, [apiFetch]);

  // ─── Initial Load ─────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadPrograms(), loadUsers()]);
      setLoading(false);
    })();
  }, [loadPrograms, loadUsers]);

  // ─── Refresh ──────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPrograms();
    setTimeout(() => {
      setRefreshing(false);
      toast.success('Training programs refreshed');
    }, 400);
  }, [loadPrograms]);

  // ─── Metrics ──────────────────────────────────────────────
  const metrics = useMemo(() => {
    const total = programs.length;
    const active = programs.filter((p) => p.status === 'ACTIVE').length;
    const upcoming = programs.filter((p) => p.status === 'UPCOMING').length;
    const totalEnrollments = programs.reduce((s, p) => s + (p._count?.enrollments ?? p.enrollmentCount), 0);
    return { total, active, upcoming, totalEnrollments };
  }, [programs]);

  // ─── Filtered Programs ────────────────────────────────────
  const filteredPrograms = useMemo(() => {
    let result = [...programs];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q) ||
          (p.instructor || '').toLowerCase().includes(q)
      );
    }
    if (filterCategory !== 'all') result = result.filter((p) => p.category === filterCategory);
    if (filterStatus !== 'all') result = result.filter((p) => p.status === filterStatus);
    if (filterFormat !== 'all') result = result.filter((p) => p.format === filterFormat);
    return result;
  }, [programs, searchQuery, filterCategory, filterStatus, filterFormat]);

  // ─── CRUD: Create ─────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    if (!createForm.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!createForm.startDate) {
      toast.error('Start date is required');
      return;
    }
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        title: createForm.title.trim(),
        description: createForm.description.trim() || null,
        category: createForm.category,
        format: createForm.format,
        duration: createForm.duration.trim(),
        maxEnrollment: createForm.maxEnrollment ? Number(createForm.maxEnrollment) : null,
        hasCertification: createForm.hasCertification,
        startDate: createForm.startDate,
        endDate: createForm.endDate.trim() || null,
        instructor: createForm.instructor.trim() || null,
        curriculum: createForm.curriculum.trim()
          ? createForm.curriculum.split('\n').filter(Boolean)
          : null,
      };
      await apiFetch('/api/training', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      toast.success('Training program created successfully');
      setCreateOpen(false);
      setCreateForm({ ...emptyForm });
      await loadPrograms();
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : 'Failed to create training program'));
    } finally {
      setTimeout(() => setCreating(false), 400);
    }
  }, [createForm, apiFetch, loadPrograms]);

  // ─── CRUD: Edit ───────────────────────────────────────────
  const openEdit = useCallback((program: TrainingProgram) => {
    setEditingProgram(program);
    setEditForm({
      title: program.title,
      description: program.description || '',
      category: program.category,
      format: program.format,
      duration: program.duration,
      maxEnrollment: program.maxEnrollment != null ? String(program.maxEnrollment) : '',
      hasCertification: program.hasCertification,
      startDate: program.startDate,
      endDate: program.endDate || '',
      instructor: program.instructor || '',
      curriculum: parseCurriculum(program.curriculum).join('\n'),
    });
    setEditOpen(true);
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editingProgram) return;
    if (!editForm.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setEditSaving(true);
    try {
      const body: Record<string, unknown> = {
        id: editingProgram.id,
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        category: editForm.category,
        format: editForm.format,
        duration: editForm.duration.trim(),
        maxEnrollment: editForm.maxEnrollment ? Number(editForm.maxEnrollment) : null,
        hasCertification: editForm.hasCertification,
        startDate: editForm.startDate,
        endDate: editForm.endDate.trim() || null,
        instructor: editForm.instructor.trim() || null,
        curriculum: editForm.curriculum.trim()
          ? editForm.curriculum.split('\n').filter(Boolean)
          : null,
      };
      await apiFetch('/api/training', {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      toast.success('Training program updated successfully');
      setEditOpen(false);
      await loadPrograms();
      // Refresh detail if open

    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : 'Failed to update training program'));
    } finally {
      setTimeout(() => setEditSaving(false), 400);
    }
  }, [editingProgram, editForm, apiFetch, loadPrograms]);

  // ─── CRUD: Delete ─────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/training?id=${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('Training program deleted successfully');
      setDeleteOpen(false);
      setDeleteTarget(null);

      await loadPrograms();
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : 'Failed to delete training program'));
    } finally {
      setTimeout(() => setDeleting(false), 400);
    }
  }, [deleteTarget, apiFetch, loadPrograms]);

  // ─── Detail Page ─────────────────────────────────────────
  const openDetail = useCallback(
    (program: TrainingProgram) => {
      setSelectedTrainingId(program.id);
      setActiveView('training-detail');
    },
    [setSelectedTrainingId, setActiveView]
  );

  // ─── Enrollment Modal ─────────────────────────────────────
  const openEnrollModal = useCallback(
    async (program: TrainingProgram) => {
      setEnrollProgram(program);
      setEnrollSearch('');
      setSelectedUserIds(new Set());
      // Load existing enrollments to know who is already enrolled
      try {
        const res = await apiFetch(`/api/training-enrollments?trainingProgramId=${program.id}`);
        if (res.status === 'success') {
          const enrolledIds = new Set(res.data.map((e: TrainingEnrollment) => e.userId));
          setExistingEnrollmentIds(enrolledIds);
        }
      } catch {
        setExistingEnrollmentIds(new Set());
      }
      setEnrollOpen(true);
    },
    [apiFetch]
  );

  const handleEnrollSelected = useCallback(async () => {
    if (!enrollProgram) return;
    if (selectedUserIds.size === 0) {
      toast.error('Please select at least one employee');
      return;
    }
    // Check max enrollment
    const currentCount = existingEnrollmentIds.size;
    const maxEnrollment = enrollProgram.maxEnrollment;
    if (maxEnrollment && currentCount + selectedUserIds.size > maxEnrollment) {
      toast.error(
        `Cannot enroll ${selectedUserIds.size} employee(s). Only ${maxEnrollment - currentCount} slot(s) remaining.`
      );
      return;
    }
    setEnrolling(true);
    let successCount = 0;
    let failCount = 0;
    for (const userId of selectedUserIds) {
      try {
        await apiFetch('/api/training-enrollments', {
          method: 'POST',
          body: JSON.stringify({ trainingProgramId: enrollProgram.id, userId }),
        });
        successCount++;
      } catch {
        failCount++;
      }
    }
    if (successCount > 0) {
      toast.success(`Successfully enrolled ${successCount} employee(s)`);
    }
    if (failCount > 0) {
      toast.error(`Failed to enroll ${failCount} employee(s)`);
    }
    setEnrollOpen(false);
    setSelectedUserIds(new Set());
    await loadPrograms();

    setTimeout(() => setEnrolling(false), 400);
  }, [enrollProgram, selectedUserIds, existingEnrollmentIds, apiFetch, loadPrograms]);

  // ─── Update Enrollment (Complete with score) ──────────────
  const openUpdateEnrollment = useCallback((enrollment: TrainingEnrollment) => {
    setUpdateEnrollmentTarget(enrollment);
    setUpdateEnrollmentScore(enrollment.score != null ? String(enrollment.score) : '');
    setUpdateEnrollmentFeedback(enrollment.feedback || '');
    setUpdateEnrollmentOpen(true);
  }, []);

  const handleUpdateEnrollment = useCallback(async () => {
    if (!updateEnrollmentTarget) return;
    setUpdateEnrollmentSaving(true);
    try {
      await apiFetch('/api/training-enrollments', {
        method: 'PUT',
        body: JSON.stringify({
          id: updateEnrollmentTarget.id,
          status: 'COMPLETED',
          score: updateEnrollmentScore ? Number(updateEnrollmentScore) : null,
          feedback: updateEnrollmentFeedback.trim() || null,
        }),
      });
      toast.success('Enrollment marked as completed');
      setUpdateEnrollmentOpen(false);
      await loadPrograms();

    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : 'Failed to update enrollment'));
    } finally {
      setTimeout(() => setUpdateEnrollmentSaving(false), 400);
    }
  }, [updateEnrollmentTarget, updateEnrollmentScore, updateEnrollmentFeedback, apiFetch, loadPrograms]);

  // ─── Cancel Enrollment ────────────────────────────────────
  const handleCancelEnrollment = useCallback(
    async (enrollmentId: string) => {
      try {
        await apiFetch('/api/training-enrollments', {
          method: 'PUT',
          body: JSON.stringify({ id: enrollmentId, status: 'CANCELLED' }),
        });
        toast.success('Enrollment cancelled');
        await loadPrograms();

      } catch (err: unknown) {
        toast.error((err instanceof Error ? err.message : 'Failed to cancel enrollment'));
      }
    },
    [apiFetch, loadPrograms]
  );

  // ─── Enrollment Modal Filtered Users ──────────────────────
  const enrollFilteredUsers = useMemo(() => {
    if (!enrollSearch) return users.filter((u) => u.isActive !== false);
    const q = enrollSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.isActive !== false &&
        (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    );
  }, [users, enrollSearch]);

  // ─── Program Form Fields (shared) ─────────────────────────
  function ProgramFormFields({
    form,
    setForm,
  }: {
    form: ProgramForm;
    setForm: React.Dispatch<React.SetStateAction<ProgramForm>>;
  }) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Title <span className="text-rose-400">*</span>
          </Label>
          <Input
            placeholder="e.g. Advanced React Patterns"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Description</Label>
          <Textarea
            placeholder="Program description..."
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 min-h-[80px]"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
              <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TECHNICAL">Technical</SelectItem>
                <SelectItem value="LEADERSHIP">Leadership</SelectItem>
                <SelectItem value="COMPLIANCE">Compliance</SelectItem>
                <SelectItem value="SOFT_SKILLS">Soft Skills</SelectItem>
                <SelectItem value="SAFETY">Safety</SelectItem>
                <SelectItem value="ONBOARDING">Onboarding</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Format</Label>
            <Select value={form.format} onValueChange={(v) => setForm((f) => ({ ...f, format: v }))}>
              <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ONLINE">Online</SelectItem>
                <SelectItem value="IN_PERSON">In Person</SelectItem>
                <SelectItem value="HYBRID">Hybrid</SelectItem>
                <SelectItem value="SELF_PACED">Self-Paced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Duration</Label>
            <Input
              placeholder="e.g. 4 weeks"
              value={form.duration}
              onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
              className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Instructor</Label>
            <Input
              placeholder="e.g. John Smith"
              value={form.instructor}
              onChange={(e) => setForm((f) => ({ ...f, instructor: e.target.value }))}
              className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Max Enrollment</Label>
            <Input
              type="number"
              placeholder="e.g. 30"
              value={form.maxEnrollment}
              onChange={(e) => setForm((f) => ({ ...f, maxEnrollment: e.target.value }))}
              className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
            />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Checkbox
              id="certification"
              checked={form.hasCertification}
              onCheckedChange={(checked) => setForm((f) => ({ ...f, hasCertification: !!checked }))}
              className="border-black/[0.12] dark:border-white/[0.2] data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
            />
            <Label htmlFor="certification" className="text-xs text-muted-foreground cursor-pointer">
              Has Certification
            </Label>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Start Date <span className="text-rose-400">*</span>
            </Label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">End Date</Label>
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Curriculum <span className="text-muted-foreground/60">(one session per line)</span>
          </Label>
          <Textarea
            placeholder={'Session 1: Introduction\nSession 2: Core Concepts\nSession 3: Advanced Topics'}
            value={form.curriculum}
            onChange={(e) => setForm((f) => ({ ...f, curriculum: e.target.value }))}
            className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 min-h-[80px]"
          />
        </div>
      </div>
    );
  }

  // ─── Render: Loading ──────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        <p className="text-sm text-muted-foreground">Loading training programs...</p>
      </div>
    );
  }

  // ─── Render: Main ─────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ═══ HEADER ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3"
      >
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Training Program Management
            </span>
          </h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-[10px]">
              <Trophy className="h-2.5 w-2.5 mr-0.5" />
              {metrics.active} Active
            </Badge>
            <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25 text-[10px]">
              <Calendar className="h-2.5 w-2.5 mr-0.5" />
              {metrics.upcoming} Upcoming
            </Badge>
            <Badge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/25 text-[10px]">
              <Users className="h-2.5 w-2.5 mr-0.5" />
              {metrics.totalEnrollments} Enrollments
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-emerald-500/10 hover:border-emerald-500/30"
          >
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
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
            <Plus className="h-3.5 w-3.5" /> Create Program
          </Button>
        </div>
      </motion.div>

      {/* ═══ STATS BAR ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { title: 'Total Programs', value: metrics.total, icon: GraduationCap, color: 'cyan' as const, subtitle: 'All programs' },
          { title: 'Active', value: metrics.active, icon: CheckCircle2, color: 'emerald' as const, subtitle: 'Currently running' },
          { title: 'Upcoming', value: metrics.upcoming, icon: Calendar, color: 'amber' as const, subtitle: 'Starting soon' },
          { title: 'Total Enrollments', value: metrics.totalEnrollments, icon: Users, color: 'violet' as const, subtitle: 'Across all programs' },
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

      {/* ═══ TOOLBAR ═══ */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search programs by title, description, instructor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-9 w-36 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="TECHNICAL">Technical</SelectItem>
              <SelectItem value="LEADERSHIP">Leadership</SelectItem>
              <SelectItem value="COMPLIANCE">Compliance</SelectItem>
              <SelectItem value="SOFT_SKILLS">Soft Skills</SelectItem>
              <SelectItem value="SAFETY">Safety</SelectItem>
              <SelectItem value="ONBOARDING">Onboarding</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-32 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="UPCOMING">Upcoming</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterFormat} onValueChange={setFilterFormat}>
            <SelectTrigger className="h-9 w-32 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Formats</SelectItem>
              <SelectItem value="ONLINE">Online</SelectItem>
              <SelectItem value="IN_PERSON">In Person</SelectItem>
              <SelectItem value="HYBRID">Hybrid</SelectItem>
              <SelectItem value="SELF_PACED">Self-Paced</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </GlassCard>

      {/* ═══ CONTENT: PROGRAM CARDS ═══ */}
      {filteredPrograms.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="p-12 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              {searchQuery || filterCategory !== 'all' || filterStatus !== 'all' || filterFormat !== 'all'
                ? 'No training programs match your filters'
                : 'No training programs yet. Create one to get started.'}
            </p>
          </GlassCard>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredPrograms.map((program, i) => {
              const catColor = getCategoryColor(program.category);
              const fmtConfig = getFormatConfig(program.format);
              const statusColor = getStatusColor(program.status);
              const FormatIcon = fmtConfig.icon;
              const enrollmentCount = program._count?.enrollments ?? program.enrollmentCount;
              const enrollmentPct =
                program.maxEnrollment && program.maxEnrollment > 0
                  ? Math.min((enrollmentCount / program.maxEnrollment) * 100, 100)
                  : 0;
              const isFull = program.maxEnrollment ? enrollmentCount >= program.maxEnrollment : false;

              return (
                <motion.div
                  key={program.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <GlassCard hover className="overflow-hidden">
                    <div className="p-5 space-y-3">
                      {/* Title + Badges Row */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-bold leading-tight line-clamp-2">{program.title}</h3>
                          {program.hasCertification && (
                            <Award className="h-4 w-4 text-amber-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {program.description || 'No description provided'}
                        </p>
                      </div>

                      {/* Category + Format + Status Badges */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge className={cn('text-[9px] border px-1.5 py-0', catColor.bg, catColor.text, catColor.border)}>
                          {program.category.replace('_', ' ')}
                        </Badge>
                        <Badge className={cn('text-[9px] border px-1.5 py-0 gap-0.5', fmtConfig.bg, fmtConfig.color)}>
                          <FormatIcon className="h-2.5 w-2.5" />
                          {fmtConfig.text}
                        </Badge>
                        <Badge className={cn('text-[9px] border px-1.5 py-0', statusColor.bg, statusColor.text, statusColor.border)}>
                          {program.status}
                        </Badge>
                      </div>

                      {/* Duration + Instructor */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {program.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {program.duration}
                          </span>
                        )}
                        {program.instructor && (
                          <span className="flex items-center gap-1">
                            <GraduationCap className="h-3 w-3" />
                            {program.instructor}
                          </span>
                        )}
                      </div>

                      {/* Enrollment Progress */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Enrollment: {enrollmentCount}
                            {program.maxEnrollment ? ` / ${program.maxEnrollment}` : ''}
                          </span>
                          {isFull && (
                            <Badge className="text-[8px] bg-rose-500/15 text-rose-400 border-rose-500/25 px-1 py-0">
                              FULL
                            </Badge>
                          )}
                        </div>
                        {program.maxEnrollment && program.maxEnrollment > 0 && (
                          <Progress
                            value={enrollmentPct}
                            className={cn(
                              'h-1.5',
                              enrollmentPct >= 100
                                ? '[&>div]:bg-rose-400'
                                : enrollmentPct >= 75
                                  ? '[&>div]:bg-amber-400'
                                  : '[&>div]:bg-emerald-400'
                            )}
                          />
                        )}
                      </div>

                      {/* Rating */}
                      {program.rating > 0 && renderStars(program.rating)}

                      {/* Dates */}
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" />
                          {formatDate(program.startDate)}
                          {program.endDate && ` — ${formatDate(program.endDate)}`}
                        </span>
                      </div>

                      {/* Actions */}
                      <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] gap-1 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                          onClick={() => { setSelectedTrainingId(program.id); setActiveView('training-detail'); }}
                        >
                          <Eye className="h-3 w-3" /> View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] gap-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                          onClick={() => openEnrollModal(program)}
                          disabled={isFull}
                        >
                          <UserPlus className="h-3 w-3" /> Enroll
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] gap-1 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                          onClick={() => openEdit(program)}
                        >
                          <Edit className="h-3 w-3" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] gap-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 ml-auto"
                          onClick={() => {
                            setDeleteTarget(program);
                            setDeleteOpen(true);
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

      {/* ═══ CREATE DIALOG ═══ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-emerald-400" />
              Create Training Program
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Set up a new training program for your organization.
            </DialogDescription>
          </DialogHeader>
          <ProgramFormFields form={createForm} setForm={setCreateForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-emerald-600 hover:bg-emerald-500 gap-1.5">
              {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create Program
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ EDIT DIALOG ═══ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-amber-400" />
              Edit Training Program
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update the training program details.
            </DialogDescription>
          </DialogHeader>
          <ProgramFormFields form={editForm} setForm={setEditForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={editSaving} className="bg-amber-600 hover:bg-amber-500 gap-1.5">
              {editSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ DELETE CONFIRMATION ═══ */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-400" />
              Delete Training Program
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete <strong className="text-foreground">{deleteTarget?.title}</strong>?
              This action cannot be undone. Programs with active enrollments cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-black/[0.1] dark:border-white/[0.1]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-500 gap-1.5"
            >
              {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══ DETAIL SHEET (removed - using full page detail) ═══ */}

      {/* ═══ ENROLLMENT MODAL ═══ */}
      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent className="bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-emerald-400" />
              Enroll Employees in {enrollProgram?.title || 'Program'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {enrollProgram && (
                <>
                  Current enrollment: {existingEnrollmentIds.size}
                  {enrollProgram.maxEnrollment ? ` / ${enrollProgram.maxEnrollment}` : ''} ·{' '}
                  {enrollProgram.maxEnrollment
                    ? `${Math.max(0, enrollProgram.maxEnrollment - existingEnrollmentIds.size)} slot(s) remaining`
                    : 'Unlimited slots'}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees by name or email..."
              value={enrollSearch}
              onChange={(e) => setEnrollSearch(e.target.value)}
              className="h-9 pl-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
            />
          </div>

          {/* Employee List */}
          <ScrollArea className="flex-1 max-h-96 -mx-1 px-1">
            <div className="space-y-1">
              {enrollFilteredUsers.length === 0 ? (
                <p className="text-xs text-muted-foreground/60 text-center py-6">
                  No employees found
                </p>
              ) : (
                enrollFilteredUsers.map((user) => {
                  const isAlreadyEnrolled = existingEnrollmentIds.has(user.id);
                  const isSelected = selectedUserIds.has(user.id);

                  return (
                    <div
                      key={user.id}
                      className={cn(
                        'flex items-center gap-3 p-2.5 rounded-lg transition-colors',
                        isAlreadyEnrolled
                          ? 'bg-black/[0.01] dark:bg-white/[0.02] opacity-60'
                          : isSelected
                            ? 'bg-emerald-500/10 border border-emerald-500/20'
                            : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03] border border-transparent'
                      )}
                    >
                      <Checkbox
                        checked={isAlreadyEnrolled || isSelected}
                        disabled={isAlreadyEnrolled}
                        onCheckedChange={(checked) => {
                          if (isAlreadyEnrolled) return;
                          setSelectedUserIds((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(user.id);
                            else next.delete(user.id);
                            return next;
                          });
                        }}
                        className={cn(
                          'border-black/[0.12] dark:border-white/[0.2]',
                          isAlreadyEnrolled
                            ? 'data-[state=checked]:bg-slate-500 data-[state=checked]:border-slate-500'
                            : 'data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500'
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium truncate">{user.name}</p>
                          {isAlreadyEnrolled && (
                            <Badge className="text-[8px] bg-slate-500/15 text-slate-400 border-slate-500/25 px-1 py-0">
                              Enrolled
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {user.email} · {user.department?.name || 'No Dept'}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Selection Summary + Action */}
          <div className="flex items-center justify-between pt-2 border-t border-black/[0.06] dark:border-white/[0.05]">
            <span className="text-xs text-muted-foreground">
              {selectedUserIds.size} employee(s) selected
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setEnrollOpen(false)} className="border-black/[0.1] dark:border-white/[0.1] h-8 text-xs">
                Cancel
              </Button>
              <Button
                onClick={handleEnrollSelected}
                disabled={enrolling || selectedUserIds.size === 0}
                className="bg-emerald-600 hover:bg-emerald-500 gap-1.5 h-8 text-xs"
              >
                {enrolling && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Enroll Selected
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ UPDATE ENROLLMENT DIALOG ═══ */}
      <Dialog open={updateEnrollmentOpen} onOpenChange={setUpdateEnrollmentOpen}>
        <DialogContent className="bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-cyan-400" />
              Mark Enrollment as Completed
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {updateEnrollmentTarget && (
                <>
                  For <strong className="text-foreground">{updateEnrollmentTarget.user?.name || 'Unknown'}</strong> in{' '}
                  <strong className="text-foreground">{updateEnrollmentTarget.trainingProgram?.title || 'Program'}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Score <span className="text-muted-foreground/60">(0-100, optional)</span>
              </Label>
              <Input
                type="number"
                min="0"
                max="100"
                placeholder="e.g. 85"
                value={updateEnrollmentScore}
                onChange={(e) => setUpdateEnrollmentScore(e.target.value)}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Feedback <span className="text-muted-foreground/60">(optional)</span>
              </Label>
              <Textarea
                placeholder="Provide feedback on the employee's performance..."
                value={updateEnrollmentFeedback}
                onChange={(e) => setUpdateEnrollmentFeedback(e.target.value)}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateEnrollmentOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">
              Cancel
            </Button>
            <Button
              onClick={handleUpdateEnrollment}
              disabled={updateEnrollmentSaving}
              className="bg-cyan-600 hover:bg-cyan-500 gap-1.5"
            >
              {updateEnrollmentSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <CheckCircle2 className="h-3.5 w-3.5" />
              Mark Completed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
