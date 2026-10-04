'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Briefcase,
  Plus,
  Loader2,
  Search,
  LayoutGrid,
  List,
  MapPin,
  DollarSign,
  Clock,
  Users,
  FileText,
  Edit,
  Trash2,
  MoreVertical,
  Eye,
  RefreshCw,
  Building2,
  Star,
  ChevronRight,
  CalendarDays,
  GraduationCap,
  X,
  CheckCircle2,
  Image as ImageIcon,
  Upload,
} from 'lucide-react';
import { formatCurrency, getInitials, formatDate } from './shared';

// ─── Types ───────────────────────────────────────────────────────
interface Department {
  id: string;
  name: string;
  color?: string;
}

interface JobPosting {
  id: string;
  title: string;
  departmentId: string | null;
  type: string;
  status: string;
  salaryMin: number | null;
  salaryMax: number | null;
  location: string;
  experience: string;
  skills: string; // JSON array string
  description: string | null;
  imageUrl: string | null;
  postedDate: string | null;
  closingDate: string | null;
  applicantCount: number;
  createdAt: string;
  updatedAt: string;
  department: Department | null;
  _count: { candidates: number };
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  jobPostingId: string;
  stage: string;
  rating: number;
  source: string;
  appliedDate: string;
  notes: string | null;
  avatar: string | null;
  createdAt: string;
  jobPosting: {
    id: string;
    title: string;
    department: { id: string; name: string } | null;
    status: string;
  };
}

// ─── Job Form Type ───────────────────────────────────────────────
interface JobForm {
  title: string;
  departmentId: string;
  type: string;
  status: string;
  salaryMin: string;
  salaryMax: string;
  location: string;
  experience: string;
  skills: string;
  description: string;
  imageUrl: string;
  postedDate: string;
  closingDate: string;
}

const emptyForm: JobForm = {
  title: '',
  departmentId: '',
  type: 'FULL_TIME',
  status: 'DRAFT',
  salaryMin: '',
  salaryMax: '',
  location: 'On-site',
  experience: '',
  skills: '',
  description: '',
  imageUrl: '',
  postedDate: new Date().toISOString().split('T')[0],
  closingDate: '',
};

// ─── Status Color Config ─────────────────────────────────────────
const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  DRAFT: { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/25', dot: 'bg-slate-400' },
  OPEN: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
  PAUSED: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/25', dot: 'bg-amber-400' },
  CLOSED: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/25', dot: 'bg-rose-400' },
  FILLED: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/25', dot: 'bg-cyan-400' },
};

const TYPE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  FULL_TIME: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Full-time' },
  PART_TIME: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Part-time' },
  CONTRACT: { bg: 'bg-violet-500/10', text: 'text-violet-400', label: 'Contract' },
  INTERNSHIP: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', label: 'Internship' },
};

const CANDIDATE_STAGE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  APPLIED: { bg: 'bg-slate-500/15', text: 'text-slate-400', label: 'Applied' },
  SCREENING: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Screening' },
  INTERVIEW: { bg: 'bg-violet-500/15', text: 'text-violet-400', label: 'Interview' },
  ASSESSMENT: { bg: 'bg-orange-500/15', text: 'text-orange-400', label: 'Assessment' },
  OFFER: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', label: 'Offer' },
  HIRED: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Hired' },
  REJECTED: { bg: 'bg-rose-500/15', text: 'text-rose-400', label: 'Rejected' },
};

// ─── Helpers ─────────────────────────────────────────────────────

function parseSkills(skillsJson: string): string[] {
  try {
    const parsed = JSON.parse(skillsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ─── Animation Variants ──────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

// ─── Main Component ──────────────────────────────────────────────
export function JobManagement() {
  // ─── Data State ──────────────────────────────────────────────
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Filter State ────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // ─── Create/Edit Dialog ──────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [formData, setFormData] = useState<JobForm>({ ...emptyForm });
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ─── Delete Confirmation ─────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<JobPosting | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Load Data ───────────────────────────────────────────────
  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs');
      const json = await res.json();
      if (json.status === 'success') {
        setJobs(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
      toast.error('Failed to load job postings');
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch('/api/departments');
      const json = await res.json();
      if (json.status === 'success') {
        setDepartments(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchJobs(), fetchDepartments()]);
    setLoading(false);
  }, [fetchJobs, fetchDepartments]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
    toast.success('Job postings refreshed');
  }, [fetchJobs]);

  // ─── Computed Data ───────────────────────────────────────────
  const filteredJobs = useMemo(() => {
    let result = [...jobs];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          (j.department?.name || '').toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q) ||
          j.experience.toLowerCase().includes(q) ||
          parseSkills(j.skills).some((s) => s.toLowerCase().includes(q))
      );
    }
    if (filterDepartment !== 'all') {
      result = result.filter((j) => j.departmentId === filterDepartment);
    }
    if (filterStatus !== 'all') {
      result = result.filter((j) => j.status === filterStatus);
    }
    if (filterType !== 'all') {
      result = result.filter((j) => j.type === filterType);
    }
    return result;
  }, [jobs, searchQuery, filterDepartment, filterStatus, filterType]);

  const metrics = useMemo(() => {
    const total = jobs.length;
    const open = jobs.filter((j) => j.status === 'OPEN').length;
    const inPipeline = jobs.reduce((sum, j) => sum + j._count.candidates, 0);
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const filledThisMonth = jobs.filter(
      (j) => j.status === 'FILLED' && j.updatedAt && j.updatedAt.startsWith(thisMonth)
    ).length;
    return { total, open, inPipeline, filledThisMonth };
  }, [jobs]);

  const getDeptName = useCallback(
    (id: string | null) => departments.find((d) => d.id === id)?.name || '—',
    [departments]
  );

  // ─── Open Detail Page ────────────────────────────────────────
  const openDetail = useCallback((job: JobPosting) => {
    useEMSStore.getState().setSelectedJobId(job.id);
    useEMSStore.getState().setActiveView('job-detail');
  }, []);

  // ─── Create Job ──────────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    if (!formData.title.trim()) {
      toast.error('Job title is required');
      return;
    }
    setSaving(true);
    try {
      const skillsArray = formData.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          departmentId: formData.departmentId || null,
          type: formData.type,
          status: formData.status,
          salaryMin: formData.salaryMin ? Number(formData.salaryMin) : null,
          salaryMax: formData.salaryMax ? Number(formData.salaryMax) : null,
          location: formData.location,
          experience: formData.experience,
          skills: skillsArray,
          description: formData.description || null,
          imageUrl: formData.imageUrl || null,
          postedDate: formData.postedDate || null,
          closingDate: formData.closingDate || null,
        }),
      });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success('Job posting created successfully');
        setCreateOpen(false);
        setFormData({ ...emptyForm });
        await fetchJobs();
      } else {
        toast.error(json.message || 'Failed to create job posting');
      }
    } catch {
      toast.error('Failed to create job posting');
    } finally {
      setSaving(false);
    }
  }, [formData, fetchJobs]);

  // ─── Open Edit Dialog ────────────────────────────────────────
  const openEdit = useCallback((job: JobPosting) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      departmentId: job.departmentId || '',
      type: job.type,
      status: job.status,
      salaryMin: job.salaryMin != null ? String(job.salaryMin) : '',
      salaryMax: job.salaryMax != null ? String(job.salaryMax) : '',
      location: job.location,
      experience: job.experience,
      skills: parseSkills(job.skills).join(', '),
      description: job.description || '',
      imageUrl: job.imageUrl || '',
      postedDate: job.postedDate || '',
      closingDate: job.closingDate || '',
    });
    setEditOpen(true);
  }, []);

  // ─── Save Edit ───────────────────────────────────────────────
  const handleEditSave = useCallback(async () => {
    if (!editingJob) return;
    if (!formData.title.trim()) {
      toast.error('Job title is required');
      return;
    }
    setSaving(true);
    try {
      const skillsArray = formData.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch('/api/jobs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingJob.id,
          title: formData.title.trim(),
          departmentId: formData.departmentId || null,
          type: formData.type,
          status: formData.status,
          salaryMin: formData.salaryMin ? Number(formData.salaryMin) : null,
          salaryMax: formData.salaryMax ? Number(formData.salaryMax) : null,
          location: formData.location,
          experience: formData.experience,
          skills: skillsArray,
          description: formData.description || null,
          imageUrl: formData.imageUrl || null,
          postedDate: formData.postedDate || null,
          closingDate: formData.closingDate || null,
        }),
      });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success('Job posting updated successfully');
        setEditOpen(false);
        await fetchJobs();
      } else {
        toast.error(json.message || 'Failed to update job posting');
      }
    } catch {
      toast.error('Failed to update job posting');
    } finally {
      setSaving(false);
    }
  }, [editingJob, formData, fetchJobs]);

  // ─── Change Status ───────────────────────────────────────────
  const handleChangeStatus = useCallback(
    async (job: JobPosting, newStatus: string) => {
      try {
        const res = await fetch('/api/jobs', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: job.id, status: newStatus }),
        });
        const json = await res.json();
        if (json.status === 'success') {
          toast.success(`Status changed to ${newStatus}`);
          await fetchJobs();
        } else {
          toast.error(json.message || 'Failed to change status');
        }
      } catch {
        toast.error('Failed to change status');
      }
    },
    [fetchJobs]
  );

  // ─── Delete Job ──────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/jobs?id=${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success('Job posting deleted');
        setDeleteOpen(false);
        setDeleteTarget(null);
        await fetchJobs();
      } else {
        toast.error(json.message || 'Failed to delete job posting');
      }
    } catch {
      toast.error('Failed to delete job posting');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, fetchJobs]);

  // ─── Form Fields Component ───────────────────────────────────
  function JobFormFields({
    form,
    setForm,
  }: {
    form: JobForm;
    setForm: React.Dispatch<React.SetStateAction<JobForm>>;
  }) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);

    const handleFileUpload = useCallback(async (file: File) => {
      if (!file) return;
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid file type. Only images are allowed.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File too large. Maximum size is 5MB.');
        return;
      }
      setUploading(true);
      try {
        const data = new FormData();
        data.append('file', file);
        data.append('subfolder', 'jobs');
        const res = await fetch('/api/upload', { method: 'POST', body: data });
        const json = await res.json();
        if (json.status === 'success') {
          setForm((f) => ({ ...f, imageUrl: json.data.url }));
          toast.success('Image uploaded successfully');
        } else {
          toast.error(json.message || 'Failed to upload image');
        }
      } catch {
        toast.error('Failed to upload image');
      } finally {
        setUploading(false);
      }
    }, [setForm]);

    const handleDrop = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFileUpload(file);
    }, [handleFileUpload]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
      setDragOver(false);
    }, []);

    const handleRemoveImage = useCallback(() => {
      setForm((f) => ({ ...f, imageUrl: '' }));
    }, [setForm]);

    return (
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        {/* Title */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Job Title <span className="text-rose-400">*</span>
          </Label>
          <Input
            placeholder="e.g. Senior Frontend Developer"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
          />
        </div>

        {/* Ad Image / Banner Upload */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Ad Image / Banner</Label>
          {form.imageUrl ? (
            <div className="relative group rounded-lg overflow-hidden border border-black/[0.1] dark:border-white/[0.1]">
              <img
                src={form.imageUrl}
                alt="Job banner preview"
                className="w-full h-40 object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-black/[0.12] dark:border-white/[0.2] bg-black/[0.06] dark:bg-white/[0.1] hover:bg-black/[0.1] dark:hover:bg-white/[0.2] text-white"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300"
                  onClick={handleRemoveImage}
                >
                  <X className="h-3.5 w-3.5" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors',
                dragOver
                  ? 'border-emerald-500/50 bg-emerald-500/5'
                  : 'border-black/[0.1] dark:border-white/[0.1] bg-black/[0.01] dark:bg-white/[0.02] hover:border-emerald-500/30 hover:bg-emerald-500/5'
              )}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
                  <p className="text-xs text-muted-foreground">Uploading...</p>
                </>
              ) : (
                <>
                  <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Drag & drop an image here, or click to browse</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">PNG, JPG, GIF, WebP up to 5MB</p>
                  </div>
                </>
              )}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
              e.target.value = '';
            }}
          />
        </div>

        {/* Department + Type */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Department</Label>
            <Select
              value={form.departmentId || '__none__'}
              onValueChange={(v) => setForm((f) => ({ ...f, departmentId: v === '__none__' ? '' : v }))}
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
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Employment Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
              <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FULL_TIME">Full-time</SelectItem>
                <SelectItem value="PART_TIME">Part-time</SelectItem>
                <SelectItem value="CONTRACT">Contract</SelectItem>
                <SelectItem value="INTERNSHIP">Internship</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Location + Experience */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Location</Label>
            <Input
              placeholder="e.g. On-site, Remote, Hybrid"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Experience</Label>
            <Input
              placeholder="e.g. 3-5 years"
              value={form.experience}
              onChange={(e) => setForm((f) => ({ ...f, experience: e.target.value }))}
              className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
            />
          </div>
        </div>

        {/* Salary Range */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Min Salary</Label>
            <Input
              type="number"
              placeholder="e.g. 60000"
              value={form.salaryMin}
              onChange={(e) => setForm((f) => ({ ...f, salaryMin: e.target.value }))}
              className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Max Salary</Label>
            <Input
              type="number"
              placeholder="e.g. 90000"
              value={form.salaryMax}
              onChange={(e) => setForm((f) => ({ ...f, salaryMax: e.target.value }))}
              className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
            />
          </div>
        </div>

        {/* Skills */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Skills (comma-separated)</Label>
          <Input
            placeholder="e.g. React, TypeScript, Node.js, PostgreSQL"
            value={form.skills}
            onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value }))}
            className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Description</Label>
          <Textarea
            placeholder="Job description and requirements..."
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 min-h-[100px]"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Posted Date</Label>
            <Input
              type="date"
              value={form.postedDate}
              onChange={(e) => setForm((f) => ({ ...f, postedDate: e.target.value }))}
              className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Closing Date</Label>
            <Input
              type="date"
              value={form.closingDate}
              onChange={(e) => setForm((f) => ({ ...f, closingDate: e.target.value }))}
              className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
            />
          </div>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
            <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="PAUSED">Paused</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
              <SelectItem value="FILLED">Filled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  // ─── Render: Loading Skeleton ────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <p className="text-sm text-muted-foreground">Loading job postings...</p>
        </div>
      </div>
    );
  }

  // ─── Render: Main ────────────────────────────────────────────
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ═══ HEADER ═══ */}
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Job Postings Management
            </span>
          </h2>
          <div className="flex items-center gap-3 mt-1.5">
            <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-xs">
              {metrics.open} Open
            </Badge>
            <Badge className="bg-slate-500/15 text-slate-400 border border-slate-500/25 text-xs">
              {jobs.filter((j) => j.status === 'DRAFT').length} Draft
            </Badge>
            <Badge className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 text-xs">
              {jobs.filter((j) => j.status === 'FILLED').length} Filled
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
              setFormData({ ...emptyForm });
              setCreateOpen(true);
            }}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-500"
          >
            <Plus className="h-3.5 w-3.5" /> Create Job Posting
          </Button>
        </div>
      </motion.div>

      {/* ═══ STAT CARDS ═══ */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { title: 'Total Jobs', value: metrics.total, icon: Briefcase, color: 'cyan' as const, subtitle: 'All postings' },
          { title: 'Open Positions', value: metrics.open, icon: FileText, color: 'emerald' as const, subtitle: 'Accepting applications' },
          { title: 'In Pipeline', value: metrics.inPipeline, icon: Users, color: 'amber' as const, subtitle: 'Total candidates' },
          { title: 'Filled This Month', value: metrics.filledThisMonth, icon: CheckCircle2, color: 'rose' as const, subtitle: 'Hires completed' },
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
      </motion.div>

      {/* ═══ TOOLBAR ═══ */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, department, location, skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
              />
            </div>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="h-9 w-36 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 w-32 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="PAUSED">Paused</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
                <SelectItem value="FILLED">Filled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-9 w-32 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="FULL_TIME">Full-time</SelectItem>
                <SelectItem value="PART_TIME">Part-time</SelectItem>
                <SelectItem value="CONTRACT">Contract</SelectItem>
                <SelectItem value="INTERNSHIP">Internship</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'h-9 w-9 p-0',
                  viewMode === 'grid' ? 'bg-emerald-600 hover:bg-emerald-500' : 'border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
                )}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'h-9 w-9 p-0',
                  viewMode === 'list' ? 'bg-emerald-600 hover:bg-emerald-500' : 'border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
                )}
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ═══ CONTENT ═══ */}
      {filteredJobs.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="p-12 text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              {searchQuery || filterDepartment !== 'all' || filterStatus !== 'all' || filterType !== 'all'
                ? 'No job postings match your filters'
                : 'No job postings yet. Create one to get started.'}
            </p>
          </GlassCard>
        </motion.div>
      ) : viewMode === 'grid' ? (
        /* ─── GRID VIEW ─── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredJobs.map((job, i) => {
              const statusCfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.DRAFT;
              const typeCfg = TYPE_CONFIG[job.type] || TYPE_CONFIG.FULL_TIME;
              const skills = parseSkills(job.skills);

              return (
                <motion.div
                  key={job.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <GlassCard
                    hover
                    onClick={() => openDetail(job)}
                    glow={job.status === 'OPEN' ? 'emerald' : job.status === 'FILLED' ? 'cyan' : 'none'}
                  >
                    <div className="space-y-0">
                      {/* Image Banner */}
                      {job.imageUrl && (
                        <div className="relative -mx-0 -mt-0 mb-3 rounded-t-lg overflow-hidden">
                          <img
                            src={job.imageUrl}
                            alt={job.title}
                            className="w-full h-32 object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        </div>
                      )}
                      <div className={cn(job.imageUrl ? 'px-5 pb-5 pt-0' : 'p-5', 'space-y-3')}>
                      {/* Header: Title + Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold truncate">{job.title}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {job.department?.name || 'No Department'}
                          </p>
                        </div>
                        <Badge className={cn('shrink-0 text-[10px] border px-2 py-0.5', statusCfg.bg, statusCfg.text, statusCfg.border)}>
                          {job.status}
                        </Badge>
                      </div>

                      {/* Type + Location */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={cn('text-[10px] border px-1.5 py-0', typeCfg.bg, typeCfg.text)}>
                          {typeCfg.label}
                        </Badge>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {job.location}
                        </span>
                      </div>

                      {/* Salary Range */}
                      {job.salaryMin != null && job.salaryMax != null && (
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span className="text-xs font-medium text-emerald-400">
                            {formatCurrency(job.salaryMin)} – {formatCurrency(job.salaryMax)}
                          </span>
                        </div>
                      )}

                      {/* Skills */}
                      {skills.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {skills.slice(0, 3).map((skill) => (
                            <span
                              key={skill}
                              className="inline-flex items-center rounded-md bg-black/[0.04] dark:bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-muted-foreground border border-black/[0.06] dark:border-white/[0.06]"
                            >
                              {skill}
                            </span>
                          ))}
                          {skills.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{skills.length - 3} more</span>
                          )}
                        </div>
                      )}

                      {/* Footer: Applicants + Date */}
                      <div className="flex items-center justify-between pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {job._count.candidates} applicant{job._count.candidates !== 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <CalendarDays className="h-3 w-3" />
                          {formatDate(job.postedDate)}
                        </span>
                      </div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        /* ─── LIST VIEW ─── */
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-black/[0.08] dark:border-white/[0.08]">
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Title</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Department</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Type</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Applicants</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Salary</th>
                  <th className="text-right text-xs font-medium text-muted-foreground p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredJobs.map((job, i) => {
                    const statusCfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.DRAFT;
                    const typeCfg = TYPE_CONFIG[job.type] || TYPE_CONFIG.FULL_TIME;

                    return (
                      <motion.tr
                        key={job.id}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 16 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b border-black/[0.04] dark:border-white/[0.04] hover:bg-black/[0.01] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                        onClick={() => openDetail(job)}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {job.imageUrl && (
                              <img
                                src={job.imageUrl}
                                alt={job.title}
                                className="h-8 w-12 rounded object-cover shrink-0 border border-black/[0.1] dark:border-white/[0.1]"
                              />
                            )}
                            <div>
                              <p className="text-sm font-medium truncate max-w-[200px]">{job.title}</p>
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="h-2.5 w-2.5" /> {job.location}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">{job.department?.name || '—'}</td>
                        <td className="p-3">
                          <Badge className={cn('text-[10px] border px-1.5 py-0', typeCfg.bg, typeCfg.text)}>
                            {typeCfg.label}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge className={cn('text-[10px] border px-2 py-0.5', statusCfg.bg, statusCfg.text, statusCfg.border)}>
                            {job.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <span className="flex items-center gap-1 text-xs">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            {job._count.candidates}
                          </span>
                        </td>
                        <td className="p-3 text-xs font-medium text-emerald-400">
                          {job.salaryMin != null && job.salaryMax != null
                            ? `${formatCurrency(job.salaryMin)}–${formatCurrency(job.salaryMax)}`
                            : '—'}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-emerald-500/10"
                              onClick={() => openDetail(job)}
                            >
                              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-amber-500/10"
                              onClick={() => openEdit(job)}
                            >
                              <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-rose-500/10"
                              onClick={() => {
                                setDeleteTarget(job);
                                setDeleteOpen(true);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* ═══ CREATE DIALOG ═══ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg bg-background border-black/[0.1] dark:border-white/[0.1] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-emerald-400" />
              Create Job Posting
            </DialogTitle>
            <DialogDescription>Add a new job posting to the system.</DialogDescription>
          </DialogHeader>
          <JobFormFields form={formData} setForm={setFormData} />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              className="border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-500 gap-1.5"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create Posting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ EDIT DIALOG ═══ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg bg-background border-black/[0.1] dark:border-white/[0.1] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-amber-400" />
              Edit Job Posting
            </DialogTitle>
            <DialogDescription>Update job posting details.</DialogDescription>
          </DialogHeader>
          <JobFormFields form={formData} setForm={setFormData} />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              className="border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-500 gap-1.5"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ DELETE CONFIRMATION ═══ */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-background border-black/[0.1] dark:border-white/[0.1]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-400" />
              Delete Job Posting
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;?
              {deleteTarget && deleteTarget._count.candidates > 0 && (
                <span className="block mt-2 text-rose-400">
                  This posting has {deleteTarget._count.candidates} candidate(s). Remove candidates first before deleting.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting || (deleteTarget ? deleteTarget._count.candidates > 0 : false)}
              className="bg-rose-600 hover:bg-rose-500 gap-1.5"
            >
              {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


    </motion.div>
  );
}
