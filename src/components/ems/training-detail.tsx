'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  GraduationCap,
  Loader2,
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
  FileText,
  Trophy,
  Search,
  AlertTriangle,
  User,
  ChevronRight,
} from 'lucide-react';
import { formatDate, getInitials } from './shared';

// ─── Types ──────────────────────────────────────────────────────

interface TrainingProgramData {
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

interface EnrollmentData {
  id: string;
  trainingProgramId: string;
  userId: string;
  status: string;
  enrolledAt: string;
  completedAt?: string | null;
  score?: number | null;
  certificateUrl?: string | null;
  feedback?: string | null;
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
            'h-4 w-4',
            i <= Math.floor(rating)
              ? 'text-amber-400 fill-amber-400'
              : i - 0.5 <= rating
                ? 'text-amber-400 fill-amber-400/50'
                : 'text-slate-600'
          )}
        />
      ))}
      <span className="text-sm text-muted-foreground ml-1.5 font-medium">{rating.toFixed(1)}</span>
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
    return curriculum.split(',').map((s) => s.trim()).filter(Boolean);
  }
}

// ─── Main Component ─────────────────────────────────────────────

export function TrainingDetail() {
  const { selectedTrainingId, setActiveView, setSelectedTrainingId, authToken } = useEMSStore();

  // ─── Data State ───────────────────────────────────────────
  const [program, setProgram] = useState<TrainingProgramData | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Edit Dialog State ────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<ProgramForm>({ ...emptyForm });
  const [editSaving, setEditSaving] = useState(false);

  // ─── Enroll Dialog State ──────────────────────────────────
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollSearch, setEnrollSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [enrolling, setEnrolling] = useState(false);
  const [existingEnrollmentIds, setExistingEnrollmentIds] = useState<Set<string>>(new Set());

  // ─── Delete Dialog State ──────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ─── Complete Enrollment Dialog State ─────────────────────
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<EnrollmentData | null>(null);
  const [completeScore, setCompleteScore] = useState('');
  const [completeFeedback, setCompleteFeedback] = useState('');
  const [completeSaving, setCompleteSaving] = useState(false);

  // ─── Cancel Enrollment Dialog State ───────────────────────
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<EnrollmentData | null>(null);

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

  // ─── Load Data ────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!selectedTrainingId) return;
    setLoading(true);
    setError(null);
    try {
      const [programsRes, enrollmentsRes, usersRes] = await Promise.all([
        apiFetch('/api/training'),
        apiFetch(`/api/training-enrollments?trainingProgramId=${selectedTrainingId}`),
        apiFetch('/api/users'),
      ]);

      // Find program by ID
      const found = (programsRes.data || []).find(
        (p: TrainingProgramData) => p.id === selectedTrainingId
      );
      if (!found) {
        setError('Training program not found');
        return;
      }
      setProgram(found);
      setEnrollments(enrollmentsRes.data || []);
      setUsers(
        (usersRes.data || []).map((u: Record<string, unknown>) => ({
          id: u.id as string,
          name: u.name as string,
          email: u.email as string,
          isActive: u.isActive as boolean,
          department: u.department as { id: string; name: string } | null,
        }))
      );
    } catch (err) {
      console.error('Failed to load training detail:', err);
      setError(err instanceof Error ? err.message : 'Failed to load training program');
    } finally {
      setLoading(false);
    }
  }, [selectedTrainingId, apiFetch]);

  useEffect(() => {
    if (!selectedTrainingId) {
      setActiveView('training-mgmt');
      return;
    }
    loadData();
  }, [selectedTrainingId, loadData, setActiveView]);

  // ─── Navigation ───────────────────────────────────────────
  const goBack = useCallback(() => {
    setSelectedTrainingId(null);
    setActiveView('training-mgmt');
  }, [setSelectedTrainingId, setActiveView]);

  // ─── Computed Values ──────────────────────────────────────
  const enrollmentCount = useMemo(
    () => program?._count?.enrollments ?? program?.enrollmentCount ?? 0,
    [program]
  );
  const enrollmentPct = useMemo(
    () =>
      program?.maxEnrollment && program.maxEnrollment > 0
        ? Math.min((enrollmentCount / program.maxEnrollment) * 100, 100)
        : 0,
    [program, enrollmentCount]
  );

  const curriculumItems = useMemo(
    () => parseCurriculum(program?.curriculum),
    [program?.curriculum]
  );

  // ─── Edit Program ─────────────────────────────────────────
  const openEdit = useCallback(() => {
    if (!program) return;
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
  }, [program]);

  const handleEditSave = useCallback(async () => {
    if (!program) return;
    if (!editForm.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setEditSaving(true);
    try {
      const body: Record<string, unknown> = {
        id: program.id,
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
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update training program');
    } finally {
      setTimeout(() => setEditSaving(false), 400);
    }
  }, [program, editForm, apiFetch, loadData]);

  // ─── Enroll Employees ─────────────────────────────────────
  const openEnrollModal = useCallback(async () => {
    if (!program) return;
    setEnrollSearch('');
    setSelectedUserIds(new Set());
    try {
      const res = await apiFetch(`/api/training-enrollments?trainingProgramId=${program.id}`);
      if (res.status === 'success') {
        const enrolledIds = new Set(res.data.map((e: EnrollmentData) => e.userId));
        setExistingEnrollmentIds(enrolledIds);
      }
    } catch {
      setExistingEnrollmentIds(new Set());
    }
    setEnrollOpen(true);
  }, [program, apiFetch]);

  const enrollFilteredUsers = useMemo(() => {
    const activeUsers = users.filter((u) => u.isActive !== false);
    if (!enrollSearch) return activeUsers;
    const q = enrollSearch.toLowerCase();
    return activeUsers.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, enrollSearch]);

  const handleEnrollSelected = useCallback(async () => {
    if (!program) return;
    if (selectedUserIds.size === 0) {
      toast.error('Please select at least one employee');
      return;
    }
    const currentCount = existingEnrollmentIds.size;
    const maxEnrollment = program.maxEnrollment;
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
          body: JSON.stringify({ trainingProgramId: program.id, userId }),
        });
        successCount++;
      } catch {
        failCount++;
      }
    }
    if (successCount > 0) toast.success(`Successfully enrolled ${successCount} employee(s)`);
    if (failCount > 0) toast.error(`Failed to enroll ${failCount} employee(s)`);
    setEnrollOpen(false);
    setSelectedUserIds(new Set());
    await loadData();
    setTimeout(() => setEnrolling(false), 400);
  }, [program, selectedUserIds, existingEnrollmentIds, apiFetch, loadData]);

  // ─── Delete Program ───────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!program) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/training?id=${program.id}`, { method: 'DELETE' });
      toast.success('Training program deleted successfully');
      setDeleteOpen(false);
      goBack();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete training program');
    } finally {
      setTimeout(() => setDeleting(false), 400);
    }
  }, [program, apiFetch, goBack]);

  // ─── Complete Enrollment ──────────────────────────────────
  const openCompleteEnrollment = useCallback((enrollment: EnrollmentData) => {
    setCompleteTarget(enrollment);
    setCompleteScore(enrollment.score != null ? String(enrollment.score) : '');
    setCompleteFeedback(enrollment.feedback || '');
    setCompleteOpen(true);
  }, []);

  const handleCompleteEnrollment = useCallback(async () => {
    if (!completeTarget) return;
    setCompleteSaving(true);
    try {
      await apiFetch('/api/training-enrollments', {
        method: 'PUT',
        body: JSON.stringify({
          id: completeTarget.id,
          status: 'COMPLETED',
          score: completeScore ? Number(completeScore) : null,
          feedback: completeFeedback.trim() || null,
        }),
      });
      toast.success('Enrollment marked as completed');
      setCompleteOpen(false);
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update enrollment');
    } finally {
      setTimeout(() => setCompleteSaving(false), 400);
    }
  }, [completeTarget, completeScore, completeFeedback, apiFetch, loadData]);

  // ─── Cancel Enrollment ────────────────────────────────────
  const openCancelEnrollment = useCallback((enrollment: EnrollmentData) => {
    setCancelTarget(enrollment);
    setCancelOpen(true);
  }, []);

  const handleCancelEnrollment = useCallback(async () => {
    if (!cancelTarget) return;
    try {
      await apiFetch('/api/training-enrollments', {
        method: 'PUT',
        body: JSON.stringify({ id: cancelTarget.id, status: 'CANCELLED' }),
      });
      toast.success('Enrollment cancelled');
      setCancelOpen(false);
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel enrollment');
    }
  }, [cancelTarget, apiFetch, loadData]);

  // ─── Toggle user selection for enrollment ─────────────────
  const toggleUserSelection = useCallback((userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  // ─── Render: Loading ──────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        <p className="text-sm text-muted-foreground">Loading training program details...</p>
      </div>
    );
  }

  // ─── Render: Error ────────────────────────────────────────
  if (error || !program) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle className="h-10 w-10 text-amber-400" />
        <p className="text-sm text-muted-foreground">{error || 'Program not found'}</p>
        <Button variant="outline" size="sm" onClick={goBack} className="gap-1.5 border-black/[0.1] dark:border-white/[0.1]">
          <ArrowLeft className="h-3.5 w-3.5" /> Go Back
        </Button>
      </div>
    );
  }

  // ─── Derived Values ───────────────────────────────────────
  const catColor = getCategoryColor(program.category);
  const fmtConfig = getFormatConfig(program.format);
  const statusColor = getStatusColor(program.status);
  const FormatIcon = fmtConfig.icon;

  // ─── Render: Main ─────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ═══ BACK BUTTON + HEADER ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-4"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={goBack}
          className="gap-1.5 text-muted-foreground hover:text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Training Programs
        </Button>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                  {program.title}
                </span>
              </h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={cn('text-[10px]', catColor.bg, catColor.text, catColor.border, 'border')}>
                <span className={cn('h-1.5 w-1.5 rounded-full mr-1', catColor.dot)} />
                {program.category.replace('_', ' ')}
              </Badge>
              <Badge className={cn('text-[10px] gap-1', fmtConfig.bg, fmtConfig.color, 'border border-black/[0.1] dark:border-white/[0.1]')}>
                <FormatIcon className="h-2.5 w-2.5" />
                {fmtConfig.text}
              </Badge>
              <Badge className={cn('text-[10px]', statusColor.bg, statusColor.text, statusColor.border, 'border')}>
                {program.status}
              </Badge>
              {program.hasCertification && (
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-[10px] gap-1 border">
                  <Award className="h-2.5 w-2.5" /> Certified
                </Badge>
              )}
            </div>
            <div>{renderStars(program.rating)}</div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={openEdit}
              className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-emerald-500/10 hover:border-emerald-500/30"
            >
              <Edit className="h-3.5 w-3.5" /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={openEnrollModal}
              className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-cyan-500/10 hover:border-cyan-500/30"
            >
              <UserPlus className="h-3.5 w-3.5" /> Enroll
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-rose-500/10 hover:border-rose-500/30 text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ═══ KEY INFO CARDS ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.3 }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
      >
        <StatCard
          title="Duration"
          value={program.duration || '—'}
          icon={Clock}
          color="cyan"
          compact
        />
        <StatCard
          title="Instructor"
          value={program.instructor || 'TBD'}
          icon={User}
          color="violet"
          compact
        />
        <StatCard
          title="Start Date"
          value={formatDate(program.startDate)}
          icon={Calendar}
          color="emerald"
          compact
        />
        <StatCard
          title="End Date"
          value={formatDate(program.endDate)}
          icon={Calendar}
          color="amber"
          compact
        />
        <StatCard
          title="Enrolled"
          value={program.maxEnrollment ? `${enrollmentCount}/${program.maxEnrollment}` : String(enrollmentCount)}
          icon={Users}
          color="cyan"
          compact
          subtitle={program.maxEnrollment ? `${Math.round(enrollmentPct)}% full` : undefined}
        />
        <StatCard
          title="Certification"
          value={program.hasCertification ? 'Yes' : 'No'}
          icon={Award}
          color={program.hasCertification ? 'emerald' : 'slate'}
          compact
        />
      </motion.div>

      {/* Enrollment progress bar */}
      {program.maxEnrollment && program.maxEnrollment > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <GlassCard className="p-4" glow="emerald">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Enrollment Capacity</span>
              <span className="text-xs font-bold text-emerald-400">
                {enrollmentCount} / {program.maxEnrollment}
              </span>
            </div>
            <Progress
              value={enrollmentPct}
              className="h-2 bg-black/[0.03] dark:bg-white/[0.05] [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-emerald-500 [&>[data-slot=progress-indicator]]:to-cyan-500"
            />
          </GlassCard>
        </motion.div>
      )}

      {/* ═══ DESCRIPTION + CURRICULUM ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Description */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
        >
          <GlassCard className="p-6" glow="cyan">
            <div className="flex items-center gap-2 mb-4">
              <div className="rounded-lg bg-cyan-500/10 p-2">
                <FileText className="h-4 w-4 text-cyan-400" />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </h3>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
              {program.description || 'No description provided for this training program.'}
            </p>
          </GlassCard>
        </motion.div>

        {/* Curriculum */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <GlassCard className="p-6" glow="emerald">
            <div className="flex items-center gap-2 mb-4">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <GraduationCap className="h-4 w-4 text-emerald-400" />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Curriculum
              </h3>
              {curriculumItems.length > 0 && (
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-[10px] ml-auto border">
                  {curriculumItems.length} Sessions
                </Badge>
              )}
            </div>
            {curriculumItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No curriculum defined for this program.</p>
            ) : (
              <div className="space-y-2">
                {curriculumItems.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.04 }}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors group"
                  >
                    <div className="flex items-center justify-center h-7 w-7 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    <span className="text-sm text-foreground/80 flex-1">{item}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-emerald-400 transition-colors" />
                  </motion.div>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>

      {/* ═══ ENROLLED PARTICIPANTS ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.3 }}
      >
        <GlassCard className="p-6" glow="emerald">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <Users className="h-4 w-4 text-emerald-400" />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Enrolled Participants
              </h3>
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-[10px] border">
                {enrollments.length}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={openEnrollModal}
              className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-emerald-500/10 hover:border-emerald-500/30 text-xs"
            >
              <UserPlus className="h-3 w-3" /> Add More
            </Button>
          </div>

          {enrollments.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No participants enrolled yet.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Click &quot;Enroll Employees&quot; to add participants.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="min-w-[700px]">
                {/* Table Header */}
                <div className="grid grid-cols-[1fr_1.5fr_1fr_0.8fr_0.6fr_1fr] gap-3 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 border-b border-black/[0.06] dark:border-white/[0.06]">
                  <span className="whitespace-nowrap">Employee</span>
                  <span className="whitespace-nowrap">Email</span>
                  <span className="whitespace-nowrap">Department</span>
                  <span>Status</span>
                  <span>Score</span>
                  <span className="text-right whitespace-nowrap">Actions</span>
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-white/[0.04]">
                  {enrollments.map((enrollment, i) => {
                    const enrollStatusColor = getEnrollmentStatusColor(enrollment.status);
                    const userName = enrollment.user?.name || 'Unknown';
                    const userEmail = enrollment.user?.email || '—';
                    const userDept = enrollment.user?.department?.name || '—';

                    return (
                      <motion.div
                        key={enrollment.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.03 }}
                        className="grid grid-cols-[1fr_1.5fr_1fr_0.8fr_0.6fr_1fr] gap-3 px-3 py-3 items-center hover:bg-black/[0.01] dark:hover:bg-white/[0.02] transition-colors"
                      >
                        {/* Employee */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarFallback className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                              {getInitials(userName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium truncate">{userName}</span>
                        </div>
                        {/* Email */}
                        <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
                        {/* Department */}
                        <span className="text-xs text-muted-foreground truncate">{userDept}</span>
                        {/* Status */}
                        <Badge
                          className={cn(
                            'text-[10px] w-fit',
                            enrollStatusColor.bg,
                            enrollStatusColor.text,
                            enrollStatusColor.border,
                            'border'
                          )}
                        >
                          {enrollment.status.replace('_', ' ')}
                        </Badge>
                        {/* Score */}
                        <span className="text-xs font-medium">
                          {enrollment.score != null ? (
                            <span
                              className={cn(
                                enrollment.score >= 80
                                  ? 'text-emerald-400'
                                  : enrollment.score >= 60
                                    ? 'text-amber-400'
                                    : 'text-rose-400'
                              )}
                            >
                              {enrollment.score}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </span>
                        {/* Actions */}
                        <div className="flex items-center justify-end gap-1.5">
                          {(enrollment.status === 'ENROLLED' || enrollment.status === 'IN_PROGRESS') && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openCompleteEnrollment(enrollment)}
                                className="h-7 px-2 text-[10px] gap-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                              >
                                <CheckCircle2 className="h-3 w-3" /> Complete
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openCancelEnrollment(enrollment)}
                                className="h-7 px-2 text-[10px] gap-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                              >
                                <XCircle className="h-3 w-3" /> Cancel
                              </Button>
                            </>
                          )}
                          {enrollment.status === 'COMPLETED' && (
                            <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px] border">
                              <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Done
                            </Badge>
                          )}
                          {enrollment.status === 'CANCELLED' && (
                            <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-[10px] border">
                              <XCircle className="h-2.5 w-2.5 mr-0.5" /> Void
                            </Badge>
                          )}
                          {enrollment.status === 'FAILED' && (
                            <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px] border">
                              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> Failed
                            </Badge>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* ═══ DIALOGS ═══ */}

      {/* ─── Edit Program Dialog ─── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-4 w-4 text-emerald-400" />
              Edit Training Program
            </DialogTitle>
            <DialogDescription>Update the training program details below.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Title <span className="text-rose-400">*</span></Label>
                <Input
                  placeholder="e.g. Advanced React Patterns"
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Textarea
                  placeholder="Program description..."
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 min-h-[80px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <Select value={editForm.category} onValueChange={(v) => setEditForm((f) => ({ ...f, category: v }))}>
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
                  <Select value={editForm.format} onValueChange={(v) => setEditForm((f) => ({ ...f, format: v }))}>
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
                    value={editForm.duration}
                    onChange={(e) => setEditForm((f) => ({ ...f, duration: e.target.value }))}
                    className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Instructor</Label>
                  <Input
                    placeholder="e.g. John Smith"
                    value={editForm.instructor}
                    onChange={(e) => setEditForm((f) => ({ ...f, instructor: e.target.value }))}
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
                    value={editForm.maxEnrollment}
                    onChange={(e) => setEditForm((f) => ({ ...f, maxEnrollment: e.target.value }))}
                    className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                  />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Checkbox
                    id="edit-certification"
                    checked={editForm.hasCertification}
                    onCheckedChange={(checked) => setEditForm((f) => ({ ...f, hasCertification: !!checked }))}
                    className="border-black/[0.12] dark:border-white/[0.2] data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                  />
                  <Label htmlFor="edit-certification" className="text-xs text-muted-foreground cursor-pointer">
                    Has Certification
                  </Label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Start Date</Label>
                  <Input
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">End Date</Label>
                  <Input
                    type="date"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm((f) => ({ ...f, endDate: e.target.value }))}
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
                  value={editForm.curriculum}
                  onChange={(e) => setEditForm((f) => ({ ...f, curriculum: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 min-h-[80px]"
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={editSaving}
              className="bg-emerald-600 hover:bg-emerald-500 gap-1.5"
            >
              {editSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Enroll Employees Dialog ─── */}
      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-cyan-400" />
              Enroll Employees
            </DialogTitle>
            <DialogDescription>
              Select employees to enroll in &quot;{program.title}&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={enrollSearch}
                onChange={(e) => setEnrollSearch(e.target.value)}
                className="pl-9 h-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-cyan-500/30"
              />
            </div>
            {selectedUserIds.size > 0 && (
              <div className="flex items-center gap-2">
                <Badge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/25 text-[10px] border">
                  {selectedUserIds.size} selected
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUserIds(new Set())}
                  className="h-6 text-[10px] text-muted-foreground hover:text-foreground"
                >
                  Clear
                </Button>
              </div>
            )}
            <ScrollArea className="max-h-[350px]">
              <div className="space-y-1 pr-2">
                {enrollFilteredUsers.length === 0 ? (
                  <div className="text-center py-6">
                    <Users className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No employees found</p>
                  </div>
                ) : (
                  enrollFilteredUsers.map((u) => {
                    const isEnrolled = existingEnrollmentIds.has(u.id);
                    const isSelected = selectedUserIds.has(u.id);
                    return (
                      <div
                        key={u.id}
                        className={cn(
                          'flex items-center gap-3 p-2.5 rounded-lg transition-colors',
                          isEnrolled
                            ? 'opacity-50 cursor-not-allowed'
                            : 'cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.04]',
                          isSelected && !isEnrolled && 'bg-emerald-500/10'
                        )}
                        onClick={() => !isEnrolled && toggleUserSelection(u.id)}
                      >
                        <Checkbox
                          checked={isEnrolled || isSelected}
                          disabled={isEnrolled}
                          className="border-black/[0.12] dark:border-white/[0.2] data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                          onCheckedChange={() => !isEnrolled && toggleUserSelection(u.id)}
                        />
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                            {getInitials(u.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{u.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                        </div>
                        {isEnrolled && (
                          <Badge className="bg-slate-500/15 text-slate-400 border-slate-500/25 text-[9px] border">
                            Enrolled
                          </Badge>
                        )}
                        {u.department && (
                          <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">
                            {u.department.name}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEnrollOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">
              Cancel
            </Button>
            <Button
              onClick={handleEnrollSelected}
              disabled={enrolling || selectedUserIds.size === 0}
              className="bg-cyan-600 hover:bg-cyan-500 gap-1.5"
            >
              {enrolling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserPlus className="h-3.5 w-3.5" />
              )}
              Enroll {selectedUserIds.size > 0 ? `(${selectedUserIds.size})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Program Confirmation ─── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-rose-400" />
              Delete Training Program
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{program.title}&quot;? This action cannot be undone.
              All enrollment data associated with this program will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-black/[0.1] dark:border-white/[0.1]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-500 gap-1.5"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete Program
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Complete Enrollment Dialog ─── */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="sm:max-w-[420px] bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Complete Enrollment
            </DialogTitle>
            <DialogDescription>
              Mark {completeTarget?.user?.name || 'participant'}&apos;s enrollment as completed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Score (0-100)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                placeholder="e.g. 85"
                value={completeScore}
                onChange={(e) => setCompleteScore(e.target.value)}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Feedback</Label>
              <Textarea
                placeholder="Optional feedback for the participant..."
                value={completeFeedback}
                onChange={(e) => setCompleteFeedback(e.target.value)}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCompleteOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">
              Cancel
            </Button>
            <Button
              onClick={handleCompleteEnrollment}
              disabled={completeSaving}
              className="bg-emerald-600 hover:bg-emerald-500 gap-1.5"
            >
              {completeSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Mark Completed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Cancel Enrollment Confirmation ─── */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent className="bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-amber-400" />
              Cancel Enrollment
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel {cancelTarget?.user?.name || 'this participant'}&apos;s enrollment
              in &quot;{program.title}&quot;? This action can be reviewed later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-black/[0.1] dark:border-white/[0.1]">Keep Enrollment</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelEnrollment}
              className="bg-amber-600 hover:bg-amber-500 gap-1.5"
            >
              <XCircle className="h-3.5 w-3.5" /> Cancel Enrollment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
