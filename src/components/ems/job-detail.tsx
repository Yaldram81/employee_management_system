'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  Users,
  Edit,
  Trash2,
  MoreVertical,
  CalendarDays,
  Building2,
  Plus,
  ChevronRight,
  Star,
  Loader2,
  Eye,
  UserPlus,
  FileText,
  GraduationCap,
  CheckCircle2,
  X,
  RefreshCw,
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
  skills: string;
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
const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
  DRAFT: { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/25', dot: 'bg-slate-400', label: 'Draft' },
  OPEN: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/25', dot: 'bg-emerald-400', label: 'Open' },
  PAUSED: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/25', dot: 'bg-amber-400', label: 'Paused' },
  CLOSED: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/25', dot: 'bg-rose-400', label: 'Closed' },
  FILLED: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/25', dot: 'bg-cyan-400', label: 'Filled' },
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

const SOURCE_CONFIG: Record<string, { label: string }> = {
  REFERRAL: { label: 'Referral' },
  LINKEDIN: { label: 'LinkedIn' },
  WEBSITE: { label: 'Website' },
  JOB_BOARD: { label: 'Job Board' },
  AGENCY: { label: 'Agency' },
  OTHER: { label: 'Other' },
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

function formatRelativeDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`;
  } catch {
    return dateStr;
  }
}

// ─── Animation Variants ──────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ─── Image Upload Field Component ─────────────────────────────────
function ImageUploadField({
  imageUrl,
  onImageChange,
  uploading,
  setUploading,
}: {
  imageUrl: string;
  onImageChange: (url: string) => void;
  uploading: boolean;
  setUploading: (v: boolean) => void;
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
        onImageChange(json.data.url);
        toast.success('Image uploaded successfully');
      } else {
        toast.error(json.message || 'Failed to upload image');
      }
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  }, [onImageChange, setUploading]);

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

  return (
    <>
      {imageUrl ? (
        <div className="relative group rounded-lg overflow-hidden border border-black/[0.1] dark:border-white/[0.1]">
          <img
            src={imageUrl}
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
              onClick={() => onImageChange('')}
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
    </>
  );
}

// ─── Star Rating Component ───────────────────────────────────────
function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const iconSize = size === 'md' ? 'h-4 w-4' : 'h-3 w-3';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            iconSize,
            star <= rating
              ? 'fill-amber-400 text-amber-400'
              : 'fill-transparent text-white/10'
          )}
        />
      ))}
    </div>
  );
}

// ─── Pipeline Stage Order ──────────────────────────────────────
const PIPELINE_STAGES = ['APPLIED', 'SCREENING', 'INTERVIEW', 'ASSESSMENT', 'OFFER', 'HIRED'];

// ─── Main Component ──────────────────────────────────────────────
export function JobDetail() {
  const { selectedJobId, setActiveView, setSelectedJobId } = useEMSStore();

  // ─── Data State ──────────────────────────────────────────────
  const [job, setJob] = useState<JobPosting | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Edit Dialog State ───────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [formData, setFormData] = useState<JobForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ─── Status Change ───────────────────────────────────────────
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  // ─── Delete Job Confirmation ─────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ─── Add Candidate Dialog ────────────────────────────────────
  const [addCandidateOpen, setAddCandidateOpen] = useState(false);
  const [candidateForm, setCandidateForm] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'OTHER',
    notes: '',
  });
  const [addingCandidate, setAddingCandidate] = useState(false);

  // ─── Delete Candidate Confirmation ───────────────────────────
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [deleteCandidateName, setDeleteCandidateName] = useState('');
  const [deletingCandidate, setDeletingCandidate] = useState(false);

  // ─── Load Data ───────────────────────────────────────────────
  const fetchJobAndCandidates = useCallback(async () => {
    if (!selectedJobId) {
      setActiveView('jobs');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch job postings and find the one we need
      const [jobsRes, candidatesRes, deptsRes] = await Promise.all([
        fetch('/api/jobs'),
        fetch(`/api/candidates?jobPostingId=${selectedJobId}`),
        fetch('/api/departments'),
      ]);

      const jobsJson = await jobsRes.json();
      const candidatesJson = await candidatesRes.json();
      const deptsJson = await deptsRes.json();

      if (jobsJson.status === 'success') {
        const foundJob = jobsJson.data.find((j: JobPosting) => j.id === selectedJobId);
        if (!foundJob) {
          setError('Job posting not found');
          return;
        }
        setJob(foundJob);
      } else {
        setError('Failed to load job posting');
        return;
      }

      if (candidatesJson.status === 'success') {
        setCandidates(candidatesJson.data);
      }

      if (deptsJson.status === 'success') {
        setDepartments(deptsJson.data);
      }
    } catch (err) {
      console.error('Failed to load job detail:', err);
      setError('Failed to load job details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedJobId, setActiveView]);

  useEffect(() => {
    fetchJobAndCandidates();
  }, [fetchJobAndCandidates]);

  // ─── Refresh Handler ─────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchJobAndCandidates();
    setRefreshing(false);
    toast.success('Job details refreshed');
  }, [fetchJobAndCandidates]);

  // ─── Back Handler ────────────────────────────────────────────
  const goBack = useCallback(() => {
    setSelectedJobId(null);
    setActiveView('jobs');
  }, [setSelectedJobId, setActiveView]);

  // ─── Open Edit Dialog ────────────────────────────────────────
  const openEdit = useCallback(() => {
    if (!job) return;
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
  }, [job]);

  // ─── Save Edit ───────────────────────────────────────────────
  const handleEditSave = useCallback(async () => {
    if (!job || !formData.title.trim()) {
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
          id: job.id,
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
        setJob(json.data);
      } else {
        toast.error(json.message || 'Failed to update job posting');
      }
    } catch {
      toast.error('Failed to update job posting');
    } finally {
      setSaving(false);
    }
  }, [job, formData]);

  // ─── Change Status ───────────────────────────────────────────
  const handleChangeStatus = useCallback(async (newStatus: string) => {
    if (!job) return;
    try {
      const res = await fetch('/api/jobs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: job.id, status: newStatus }),
      });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success(`Status changed to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
        setJob(json.data);
      } else {
        toast.error(json.message || 'Failed to change status');
      }
    } catch {
      toast.error('Failed to change status');
    }
    setStatusDropdownOpen(false);
  }, [job]);

  // ─── Delete Job ──────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!job) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/jobs?id=${job.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success('Job posting deleted');
        setDeleteOpen(false);
        goBack();
      } else {
        toast.error(json.message || 'Failed to delete job posting');
      }
    } catch {
      toast.error('Failed to delete job posting');
    } finally {
      setDeleting(false);
    }
  }, [job, goBack]);

  // ─── Open Add Candidate Dialog ──────────────────────────────
  const openAddCandidateDialog = useCallback(() => {
    setCandidateForm({
      name: '',
      email: '',
      phone: '',
      source: 'OTHER',
      notes: '',
    });
    setAddCandidateOpen(true);
  }, []);

  // ─── Add Candidate ──────────────────────────────────────────
  const handleAddCandidate = useCallback(async () => {
    if (!candidateForm.name.trim() || !candidateForm.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    if (!job) return;
    setAddingCandidate(true);
    try {
      const res = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: candidateForm.name.trim(),
          email: candidateForm.email.trim(),
          phone: candidateForm.phone.trim() || null,
          jobPostingId: job.id,
          stage: 'APPLIED',
          rating: 0,
          source: candidateForm.source,
          appliedDate: new Date().toISOString().split('T')[0],
          notes: candidateForm.notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success('Candidate added successfully');
        setAddCandidateOpen(false);
        fetchJobAndCandidates();
      } else {
        toast.error(json.message || 'Failed to add candidate');
      }
    } catch {
      toast.error('Failed to add candidate');
    } finally {
      setAddingCandidate(false);
    }
  }, [candidateForm, job, fetchJobAndCandidates]);

  // ─── View Candidate Detail ──────────────────────────────────
  const handleViewCandidate = useCallback((candidateId: string) => {
    useEMSStore.getState().setSelectedCandidateId(candidateId);
    setActiveView('candidate-detail');
  }, [setActiveView]);

  // ─── Delete Candidate ───────────────────────────────────────
  const openDeleteCandidateDialog = useCallback((candidate: Candidate) => {
    setDeleteCandidateId(candidate.id);
    setDeleteCandidateName(candidate.name);
  }, []);

  const handleDeleteCandidate = useCallback(async () => {
    if (!deleteCandidateId) return;
    setDeletingCandidate(true);
    try {
      const res = await fetch(`/api/candidates?id=${deleteCandidateId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success('Candidate deleted');
        setDeleteCandidateId(null);
        setDeleteCandidateName('');
        fetchJobAndCandidates();
      } else {
        toast.error(json.message || 'Failed to delete candidate');
      }
    } catch {
      toast.error('Failed to delete candidate');
    } finally {
      setDeletingCandidate(false);
    }
  }, [deleteCandidateId, fetchJobAndCandidates]);

  // ─── Move Candidate to Next Stage ───────────────────────────
  const handleMoveStage = useCallback(async (candidate: Candidate) => {
    const currentIndex = PIPELINE_STAGES.indexOf(candidate.stage);
    if (currentIndex === -1 || currentIndex >= PIPELINE_STAGES.length - 1) {
      toast.info('Candidate is already at the final stage');
      return;
    }
    const nextStage = PIPELINE_STAGES[currentIndex + 1];
    try {
      const res = await fetch('/api/candidates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: candidate.id, stage: nextStage }),
      });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success(`Moved ${candidate.name} to ${CANDIDATE_STAGE_CONFIG[nextStage]?.label || nextStage}`);
        fetchJobAndCandidates();
      } else {
        toast.error(json.message || 'Failed to move candidate');
      }
    } catch {
      toast.error('Failed to move candidate');
    }
  }, [fetchJobAndCandidates]);

  // ─── Render: Loading ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <p className="text-sm text-muted-foreground">Loading job details...</p>
        </div>
      </div>
    );
  }

  // ─── Render: Error ───────────────────────────────────────────
  if (error || !job) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-full bg-rose-500/10 p-4">
            <X className="h-8 w-8 text-rose-400" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-foreground">
              {error || 'Job posting not found'}
            </p>
            <p className="text-xs text-muted-foreground">
              The job posting may have been deleted or is unavailable.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={goBack}
            className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-emerald-500/10 hover:border-emerald-500/30"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Job Postings
          </Button>
        </div>
      </div>
    );
  }

  // ─── Derived Data ────────────────────────────────────────────
  const statusCfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.DRAFT;
  const typeCfg = TYPE_CONFIG[job.type] || TYPE_CONFIG.FULL_TIME;
  const skills = parseSkills(job.skills);
  const hiredCandidates = candidates.filter((c) => c.stage === 'HIRED').length;
  const activeCandidates = candidates.filter((c) => !['HIRED', 'REJECTED'].includes(c.stage)).length;

  // Pipeline progress: percentage of candidates in advanced stages
  const pipelineProgress = candidates.length > 0
    ? Math.round((candidates.filter((c) => ['INTERVIEW', 'ASSESSMENT', 'OFFER', 'HIRED'].includes(c.stage)).length / candidates.length) * 100)
    : 0;

  // ─── Render: Main ────────────────────────────────────────────
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ═══ BACK BUTTON + HEADER ═══ */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            className="gap-1.5 text-muted-foreground hover:text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.05] -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          </Button>
        </div>

        {/* Hero Banner Image */}
        {job.imageUrl && (
          <div className="relative rounded-xl overflow-hidden mb-6 border border-black/[0.1] dark:border-white/[0.1]">
            <img
              src={job.imageUrl}
              alt={job.title}
              className="w-full h-48 sm:h-64 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-lg">
                {job.title}
              </h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {job.department && (
                  <span className="flex items-center gap-1 text-sm text-white/80">
                    <Building2 className="h-3.5 w-3.5" />
                    {job.department.name}
                  </span>
                )}
                <Badge className={cn('text-[10px] border px-2 py-0.5', statusCfg.bg, statusCfg.text, statusCfg.border)}>
                  <span className={cn('mr-1 inline-block h-1.5 w-1.5 rounded-full', statusCfg.dot)} />
                  {statusCfg.label}
                </Badge>
                <Badge className={cn('text-[10px] border px-1.5 py-0', typeCfg.bg, typeCfg.text)}>
                  {typeCfg.label}
                </Badge>
              </div>
            </div>
          </div>
        )}

        <GlassCard glow={job.status === 'OPEN' ? 'emerald' : job.status === 'FILLED' ? 'cyan' : 'none'} className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-3 min-w-0 flex-1">
              {/* Title + Badges */}
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
                  <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                    {job.title}
                  </span>
                </h1>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {job.department && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" />
                      {job.department.name}
                    </span>
                  )}
                  <Badge className={cn('text-[10px] border px-2 py-0.5', statusCfg.bg, statusCfg.text, statusCfg.border)}>
                    <span className={cn('mr-1 inline-block h-1.5 w-1.5 rounded-full', statusCfg.dot)} />
                    {statusCfg.label}
                  </Badge>
                  <Badge className={cn('text-[10px] border px-1.5 py-0', typeCfg.bg, typeCfg.text)}>
                    {typeCfg.label}
                  </Badge>
                </div>
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {job.location}
                </span>
                {job.experience && (
                  <span className="flex items-center gap-1">
                    <GraduationCap className="h-3 w-3" /> {job.experience}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> {job._count.candidates} applicant{job._count.candidates !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={openEdit}
                className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-emerald-500/10 hover:border-emerald-500/30"
              >
                <Edit className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </Button>

              <DropdownMenu open={statusDropdownOpen} onOpenChange={setStatusDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-cyan-500/10 hover:border-cyan-500/30"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Status</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <DropdownMenuItem
                      key={key}
                      onClick={() => handleChangeStatus(key)}
                      disabled={job.status === key}
                      className={cn('flex items-center gap-2', job.status === key && 'opacity-50')}
                    >
                      <span className={cn('h-2 w-2 rounded-full', cfg.dot)} />
                      {cfg.label}
                      {job.status === key && (
                        <CheckCircle2 className="h-3 w-3 ml-auto text-muted-foreground" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-rose-500/10 hover:border-rose-500/30 text-rose-400 hover:text-rose-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ═══ KEY INFO CARDS ═══ */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          {
            title: 'Salary Range',
            value: job.salaryMin != null && job.salaryMax != null
              ? `${formatCurrency(job.salaryMin)} - ${formatCurrency(job.salaryMax)}`
              : 'Not specified',
            icon: DollarSign,
            color: 'emerald' as const,
            subtitle: job.salaryMin != null ? 'Annual compensation' : undefined,
          },
          {
            title: 'Location',
            value: job.location,
            icon: MapPin,
            color: 'cyan' as const,
          },
          {
            title: 'Experience',
            value: job.experience || 'Not specified',
            icon: GraduationCap,
            color: 'amber' as const,
          },
          {
            title: 'Employment',
            value: typeCfg.label,
            icon: Clock,
            color: 'violet' as const,
            subtitle: job.type,
          },
          {
            title: 'Dates',
            value: formatDate(job.postedDate),
            icon: CalendarDays,
            color: 'slate' as const,
            subtitle: job.closingDate ? `Closes ${formatDate(job.closingDate)}` : 'No closing date',
          },
        ].map((m, i) => (
          <motion.div
            key={m.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <StatCard
              title={m.title}
              value={m.value}
              icon={m.icon}
              color={m.color}
              subtitle={m.subtitle}
              compact
            />
          </motion.div>
        ))}
      </motion.div>

      {/* ═══ SKILLS ═══ */}
      {skills.length > 0 && (
        <motion.div variants={itemVariants}>
          <GlassCard className="p-5" glow="emerald">
            <div className="flex items-center gap-2 mb-3">
              <div className="rounded-md p-1.5 bg-emerald-500/10">
                <Briefcase className="h-4 w-4 text-emerald-400" />
              </div>
              <h3 className="text-sm font-semibold">Required Skills</h3>
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] ml-auto">
                {skills.length} skill{skills.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {skills.map((skill, i) => (
                <motion.span
                  key={skill}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="inline-flex items-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-sm text-emerald-300 font-medium hover:bg-emerald-500/15 transition-colors"
                >
                  {skill}
                </motion.span>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* ═══ DESCRIPTION ═══ */}
      {job.description && (
        <motion.div variants={itemVariants}>
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="rounded-md p-1.5 bg-cyan-500/10">
                <FileText className="h-4 w-4 text-cyan-400" />
              </div>
              <h3 className="text-sm font-semibold">Job Description</h3>
            </div>
            <div className="prose prose-sm prose-invert max-w-none">
              <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {job.description}
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* ═══ CANDIDATES SECTION ═══ */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-5" glow={candidates.length > 0 ? 'cyan' : 'none'}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="rounded-md p-1.5 bg-cyan-500/10">
                <Users className="h-4 w-4 text-cyan-400" />
              </div>
              <h3 className="text-sm font-semibold">Candidates</h3>
              <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px]">
                {candidates.length} total
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={openAddCandidateDialog}
              className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-emerald-500/10 hover:border-emerald-500/30"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add Candidate
            </Button>
          </div>

          {/* Pipeline Summary */}
          {candidates.length > 0 && (
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Pipeline Progress</span>
                <span>{pipelineProgress}% advanced</span>
              </div>
              <Progress value={pipelineProgress} className="h-1.5 bg-black/[0.03] dark:bg-white/[0.05] [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-cyan-500" />
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {hiredCandidates} Hired
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  {activeCandidates} In Pipeline
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  {candidates.filter((c) => c.stage === 'REJECTED').length} Rejected
                </span>
              </div>
            </div>
          )}

          <Separator className="bg-black/[0.04] dark:bg-white/[0.06] mb-4" />

          {candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-10 w-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">No candidates yet for this position</p>
              <Button
                variant="outline"
                size="sm"
                onClick={openAddCandidateDialog}
                className="mt-3 gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-emerald-500/10 hover:border-emerald-500/30"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Add First Candidate
              </Button>
            </div>
          ) : (
            /* ─── Candidate Grid ─── */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
              <AnimatePresence>
                {candidates.map((candidate, i) => {
                  const stageCfg = CANDIDATE_STAGE_CONFIG[candidate.stage] || CANDIDATE_STAGE_CONFIG.APPLIED;
                  const sourceCfg = SOURCE_CONFIG[candidate.source] || SOURCE_CONFIG.OTHER;
                  const isTerminal = candidate.stage === 'HIRED' || candidate.stage === 'REJECTED';
                  const currentStageIndex = PIPELINE_STAGES.indexOf(candidate.stage);
                  const canMoveStage = currentStageIndex !== -1 && currentStageIndex < PIPELINE_STAGES.length - 1;

                  return (
                    <motion.div
                      key={candidate.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <GlassCard
                        hover
                        className="p-4 cursor-pointer group transition-all duration-200 hover:ring-1 hover:ring-cyan-500/20"
                        onClick={() => handleViewCandidate(candidate.id)}
                      >
                        <div className="space-y-3">
                          {/* Candidate Header */}
                          <div className="flex items-start gap-3">
                            <Avatar className="h-9 w-9 shrink-0 border border-black/[0.1] dark:border-white/[0.1]">
                              <AvatarFallback className="bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 text-xs font-semibold">
                                {getInitials(candidate.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate group-hover:text-cyan-300 transition-colors">{candidate.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{candidate.email}</p>
                            </div>
                            {/* Delete button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0 text-muted-foreground/40 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteCandidateDialog(candidate);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* Stage + Rating */}
                          <div className="flex items-center justify-between gap-2">
                            <Badge className={cn('text-[10px] border px-1.5 py-0', stageCfg.bg, stageCfg.text)}>
                              {stageCfg.label}
                            </Badge>
                            <StarRating rating={candidate.rating} />
                          </div>

                          {/* Meta */}
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>via {sourceCfg.label}</span>
                            <span>{formatRelativeDate(candidate.appliedDate)}</span>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[10px] gap-1 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewCandidate(candidate.id);
                              }}
                            >
                              <Eye className="h-3 w-3" />
                              View
                            </Button>
                            {!isTerminal && canMoveStage && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[10px] gap-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveStage(candidate);
                                }}
                              >
                                <ChevronRight className="h-3 w-3" />
                                {CANDIDATE_STAGE_CONFIG[PIPELINE_STAGES[currentStageIndex + 1]]?.label || 'Next'}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[10px] gap-1 ml-auto text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteCandidateDialog(candidate);
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
        </GlassCard>
      </motion.div>

      {/* ═══ TIMELINE / ACTIVITY ═══ */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="rounded-md p-1.5 bg-amber-500/10">
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <h3 className="text-sm font-semibold">Activity Timeline</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="h-2 w-2 rounded-full bg-emerald-400 mt-1.5" />
                <div className="w-px h-6 bg-black/[0.04] dark:bg-white/[0.06]" />
              </div>
              <div>
                <p className="text-xs font-medium">Job posting created</p>
                <p className="text-[10px] text-muted-foreground">{formatDate(job.createdAt)}</p>
              </div>
            </div>
            {job.postedDate && (
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 mt-1.5" />
                  <div className="w-px h-6 bg-black/[0.04] dark:bg-white/[0.06]" />
                </div>
                <div>
                  <p className="text-xs font-medium">Position posted</p>
                  <p className="text-[10px] text-muted-foreground">{formatDate(job.postedDate)}</p>
                </div>
              </div>
            )}
            {candidates.length > 0 && (
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-2 w-2 rounded-full bg-amber-400 mt-1.5" />
                  {hiredCandidates > 0 && <div className="w-px h-6 bg-black/[0.04] dark:bg-white/[0.06]" />}
                </div>
                <div>
                  <p className="text-xs font-medium">{candidates.length} candidate{candidates.length !== 1 ? 's' : ''} applied</p>
                  <p className="text-[10px] text-muted-foreground">Latest: {formatRelativeDate(candidates[0]?.appliedDate)}</p>
                </div>
              </div>
            )}
            {hiredCandidates > 0 && (
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 mt-1.5" />
                </div>
                <div>
                  <p className="text-xs font-medium">{hiredCandidates} candidate{hiredCandidates !== 1 ? 's' : ''} hired</p>
                  <p className="text-[10px] text-muted-foreground">Position filled</p>
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      </motion.div>

      {/* ═══ EDIT DIALOG ═══ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[600px] bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-4 w-4 text-emerald-400" />
              Edit Job Posting
            </DialogTitle>
            <DialogDescription>
              Update the details for this job posting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 py-2">
            {/* Title */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Job Title <span className="text-rose-400">*</span>
              </Label>
              <Input
                placeholder="e.g. Senior Frontend Developer"
                value={formData.title}
                onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
              />
            </div>

            {/* Ad Image / Banner Upload */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Ad Image / Banner</Label>
              <ImageUploadField
                imageUrl={formData.imageUrl}
                onImageChange={(url) => setFormData((f) => ({ ...f, imageUrl: url }))}
                uploading={uploading}
                setUploading={setUploading}
              />
            </div>

            {/* Department + Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Department</Label>
                <Select
                  value={formData.departmentId || '__none__'}
                  onValueChange={(v) => setFormData((f) => ({ ...f, departmentId: v === '__none__' ? '' : v }))}
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
                <Select value={formData.type} onValueChange={(v) => setFormData((f) => ({ ...f, type: v }))}>
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
                  value={formData.location}
                  onChange={(e) => setFormData((f) => ({ ...f, location: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Experience</Label>
                <Input
                  placeholder="e.g. 3-5 years"
                  value={formData.experience}
                  onChange={(e) => setFormData((f) => ({ ...f, experience: e.target.value }))}
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
                  value={formData.salaryMin}
                  onChange={(e) => setFormData((f) => ({ ...f, salaryMin: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Max Salary</Label>
                <Input
                  type="number"
                  placeholder="e.g. 90000"
                  value={formData.salaryMax}
                  onChange={(e) => setFormData((f) => ({ ...f, salaryMax: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                />
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Skills (comma-separated)</Label>
              <Input
                placeholder="e.g. React, TypeScript, Node.js, PostgreSQL"
                value={formData.skills}
                onChange={(e) => setFormData((f) => ({ ...f, skills: e.target.value }))}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea
                placeholder="Job description and requirements..."
                value={formData.description}
                onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 min-h-[100px]"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Posted Date</Label>
                <Input
                  type="date"
                  value={formData.postedDate}
                  onChange={(e) => setFormData((f) => ({ ...f, postedDate: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Closing Date</Label>
                <Input
                  type="date"
                  value={formData.closingDate}
                  onChange={(e) => setFormData((f) => ({ ...f, closingDate: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData((f) => ({ ...f, status: v }))}>
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

          <DialogFooter className="gap-2">
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
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ DELETE JOB CONFIRMATION ═══ */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-rose-400" />
              Delete Job Posting
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong className="text-foreground">{job.title}</strong>?
              {job._count.candidates > 0 && (
                <span className="block mt-2 text-amber-400 text-xs">
                  This job has {job._count.candidates} candidate(s). You must remove all candidates before deleting.
                </span>
              )}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-500 gap-1.5"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══ ADD CANDIDATE DIALOG ═══ */}
      <Dialog open={addCandidateOpen} onOpenChange={setAddCandidateOpen}>
        <DialogContent className="sm:max-w-[480px] bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-emerald-400" />
              Add Candidate
            </DialogTitle>
            <DialogDescription>
              Add a new candidate for <strong className="text-foreground">{job?.title}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Full Name <span className="text-rose-400">*</span>
              </Label>
              <Input
                placeholder="e.g. John Smith"
                value={candidateForm.name}
                onChange={(e) => setCandidateForm((f) => ({ ...f, name: e.target.value }))}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Email <span className="text-rose-400">*</span>
              </Label>
              <Input
                type="email"
                placeholder="e.g. john@example.com"
                value={candidateForm.email}
                onChange={(e) => setCandidateForm((f) => ({ ...f, email: e.target.value }))}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Phone</Label>
              <Input
                type="tel"
                placeholder="e.g. +1 (555) 123-4567"
                value={candidateForm.phone}
                onChange={(e) => setCandidateForm((f) => ({ ...f, phone: e.target.value }))}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
              />
            </div>

            {/* Source */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Source</Label>
              <Select
                value={candidateForm.source}
                onValueChange={(v) => setCandidateForm((f) => ({ ...f, source: v }))}
              >
                <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea
                placeholder="Any additional notes about this candidate..."
                value={candidateForm.notes}
                onChange={(e) => setCandidateForm((f) => ({ ...f, notes: e.target.value }))}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 min-h-[80px]"
              />
            </div>

            {/* Auto-set info */}
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60">
              <span className="flex items-center gap-1">
                <span className={cn('h-1.5 w-1.5 rounded-full', CANDIDATE_STAGE_CONFIG.APPLIED.dot || 'bg-slate-400')} />
                Stage: Applied
              </span>
              <span>•</span>
              <span>Date: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setAddCandidateOpen(false)}
              className="border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddCandidate}
              disabled={addingCandidate}
              className="bg-emerald-600 hover:bg-emerald-500 gap-1.5"
            >
              {addingCandidate ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
              {addingCandidate ? 'Adding...' : 'Add Candidate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ DELETE CANDIDATE CONFIRMATION ═══ */}
      <AlertDialog open={!!deleteCandidateId} onOpenChange={(open) => { if (!open) { setDeleteCandidateId(null); setDeleteCandidateName(''); } }}>
        <AlertDialogContent className="bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-rose-400" />
              Delete Candidate
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong className="text-foreground">{deleteCandidateName}</strong>?
              This action cannot be undone and will permanently remove the candidate from this job posting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCandidate}
              disabled={deletingCandidate}
              className="bg-rose-600 hover:bg-rose-500 gap-1.5"
            >
              {deletingCandidate ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              {deletingCandidate ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
