'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { StatCard } from './stat-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Users,
  UserPlus,
  Search,
  Star,
  ChevronRight,
  Briefcase,
  Mail,
  Phone,
  Calendar,
  Clock,
  ArrowRight,
  Eye,
  Edit,
  Trash2,
  LayoutGrid,
  List,
  Filter,
  RefreshCw,
  Loader2,
  XCircle,
  DollarSign,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Building2,
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  Send,
  CalendarDays,
  ThumbsUp,
  ThumbsDown,
  Kanban,
} from 'lucide-react';
import { getInitials, formatDate, formatCurrency } from './shared';

// ─── Types ─────────────────────────────────────────────────────
interface JobPosting {
  id: string;
  title: string;
  department?: { id: string; name: string } | null;
  status?: string;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  jobPostingId: string;
  stage: string;
  rating: number;
  source: string;
  appliedDate: string;
  notes?: string | null;
  avatar?: string | null;
  resumeUrl?: string | null;
  interviewDate?: string | null;
  offerAmount?: number | null;
  rejectedReason?: string | null;
  createdAt: string;
  updatedAt: string;
  jobPosting?: JobPosting | null;
}

// ─── Constants ─────────────────────────────────────────────────
const STAGES = ['APPLIED', 'SCREENING', 'INTERVIEW', 'ASSESSMENT', 'OFFER', 'HIRED', 'REJECTED'] as const;

const STAGE_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string; glow: 'slate' | 'cyan' | 'amber' | 'violet' | 'emerald' | 'rose' | 'none' }> = {
  APPLIED: { label: 'Applied', color: 'text-slate-400', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/20', glow: 'slate' },
  SCREENING: { label: 'Screening', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/20', glow: 'cyan' },
  INTERVIEW: { label: 'Interview', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20', glow: 'amber' },
  ASSESSMENT: { label: 'Assessment', color: 'text-violet-400', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/20', glow: 'violet' },
  OFFER: { label: 'Offer', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20', glow: 'emerald' },
  HIRED: { label: 'Hired', color: 'text-emerald-300', bgColor: 'bg-emerald-500/20', borderColor: 'border-emerald-500/30', glow: 'emerald' },
  REJECTED: { label: 'Rejected', color: 'text-rose-400', bgColor: 'bg-rose-500/10', borderColor: 'border-rose-500/20', glow: 'rose' },
};

const SOURCE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  REFERRAL: { label: 'Referral', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  LINKEDIN: { label: 'LinkedIn', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
  WEBSITE: { label: 'Website', color: 'text-violet-400', bgColor: 'bg-violet-500/10' },
  JOB_BOARD: { label: 'Job Board', color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  AGENCY: { label: 'Agency', color: 'text-rose-400', bgColor: 'bg-rose-500/10' },
  OTHER: { label: 'Other', color: 'text-slate-400', bgColor: 'bg-slate-500/10' },
};

const PIPELINE_STAGES = STAGES.filter(s => s !== 'REJECTED');

// ─── Helpers ───────────────────────────────────────────────────

function getAvatarGradient(name: string) {
  const gradients = [
    'from-cyan-500 to-emerald-500',
    'from-amber-500 to-orange-500',
    'from-violet-500 to-purple-500',
    'from-rose-500 to-pink-500',
    'from-teal-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-pink-500 to-rose-500',
    'from-orange-500 to-amber-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return gradients[Math.abs(hash) % gradients.length];
}

function getNextStage(current: string): string | null {
  const idx = PIPELINE_STAGES.indexOf(current as typeof PIPELINE_STAGES[number]);
  if (idx === -1 || idx >= PIPELINE_STAGES.length - 1) return null;
  return PIPELINE_STAGES[idx + 1];
}

// ─── Star Rating Component ─────────────────────────────────────
function StarRating({ rating, size = 'sm', interactive, onChange }: { rating: number; size?: 'sm' | 'md'; interactive?: boolean; onChange?: (r: number) => void }) {
  const sz = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(i)}
          className={cn('transition-colors', interactive && 'cursor-pointer hover:scale-110')}
        >
          <Star
            className={cn(
              sz,
              i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30',
              interactive && 'hover:text-amber-300'
            )}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Stage Badge Component ─────────────────────────────────────
function StageBadge({ stage }: { stage: string }) {
  const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.APPLIED;
  return (
    <Badge className={cn(cfg.bgColor, cfg.color, 'border-0 text-[10px] font-medium')}>
      {cfg.label}
    </Badge>
  );
}

// ─── Source Badge Component ────────────────────────────────────
function SourceBadge({ source }: { source: string }) {
  const cfg = SOURCE_CONFIG[source] || SOURCE_CONFIG.OTHER;
  return (
    <Badge className={cn(cfg.bgColor, cfg.color, 'border-0 text-[9px] font-medium')}>
      {cfg.label}
    </Badge>
  );
}

// ─── Pipeline Progress Component ───────────────────────────────
function PipelineProgress({ currentStage }: { currentStage: string }) {
  const idx = STAGES.indexOf(currentStage as typeof STAGES[number]);
  const progressIdx = idx === -1 ? 0 : idx;
  return (
    <div className="flex items-center gap-1">
      {STAGES.filter(s => s !== 'REJECTED').map((stage, i) => {
        const cfg = STAGE_CONFIG[stage];
        const isActive = i === progressIdx;
        const isPast = i < progressIdx;
        return (
          <div key={stage} className="flex items-center gap-1">
            <div
              className={cn(
                'h-2 rounded-full transition-all',
                isPast ? 'w-4 bg-emerald-500/60' :
                isActive ? `w-6 ${cfg.bgColor} border ${cfg.borderColor}` :
                'w-2 bg-black/[0.06] dark:bg-white/[0.1]'
              )}
            />
            {i < PIPELINE_STAGES.length - 1 && (
              <div className={cn('h-[1px] w-2', isPast ? 'bg-emerald-500/40' : 'bg-black/[0.06] dark:bg-white/[0.1]')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────
export function CandidateManagement() {
  // ─── Data State ───────────────────────────────────────────
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ─── View State ──────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJob, setFilterJob] = useState('all');
  const [filterStage, setFilterStage] = useState('all');
  const [filterSource, setFilterSource] = useState('all');

  // ─── Dialog State ────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [moveStageOpen, setMoveStageOpen] = useState(false);
  const [scheduleInterviewOpen, setScheduleInterviewOpen] = useState(false);
  const [makeOfferOpen, setMakeOfferOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // ─── Selected Candidate ──────────────────────────────────
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // ─── Form State ──────────────────────────────────────────
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    phone: '',
    jobPostingId: '',
    source: 'OTHER',
    notes: '',
  });
  const [addSaving, setAddSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });
  const [editSaving, setEditSaving] = useState(false);

  const [moveTargetStage, setMoveTargetStage] = useState('');
  const [moveNote, setMoveNote] = useState('');
  const [moveSaving, setMoveSaving] = useState(false);

  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [interviewNotes, setInterviewNotes] = useState('');
  const [interviewSaving, setInterviewSaving] = useState(false);

  const [offerAmount, setOfferAmount] = useState('');
  const [offerNotes, setOfferNotes] = useState('');
  const [offerSaving, setOfferSaving] = useState(false);

  const [rejectReason, setRejectReason] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [rejectSaving, setRejectSaving] = useState(false);

  const [deleteSaving, setDeleteSaving] = useState(false);

  // ─── API Calls ───────────────────────────────────────────
  const loadCandidates = useCallback(async () => {
    try {
      const res = await fetch('/api/candidates');
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        setCandidates(json.data);
      }
    } catch (e) {
      console.error('Failed to load candidates:', e);
    }
  }, []);

  const loadJobPostings = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs');
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        setJobPostings(json.data);
      }
    } catch (e) {
      console.error('Failed to load job postings:', e);
    }
  }, []);

  const loadData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      await Promise.all([loadCandidates(), loadJobPostings()]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadCandidates, loadJobPostings]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateCandidate = useCallback(async (id: string, updates: Record<string, unknown>) => {
    const res = await fetch('/api/candidates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
    const json = await res.json();
    if (json.status === 'success') {
      await loadCandidates();
      return json.data;
    } else {
      throw new Error(json.message || 'Update failed');
    }
  }, [loadCandidates]);

  // ─── Filtered Data ───────────────────────────────────────
  const filteredCandidates = useMemo(() => {
    let result = [...candidates];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.jobPosting?.title || '').toLowerCase().includes(q)
      );
    }
    if (filterJob !== 'all') {
      result = result.filter(c => c.jobPostingId === filterJob);
    }
    if (filterStage !== 'all') {
      result = result.filter(c => c.stage === filterStage);
    }
    if (filterSource !== 'all') {
      result = result.filter(c => c.source === filterSource);
    }
    return result;
  }, [candidates, searchQuery, filterJob, filterStage, filterSource]);

  // ─── Stats ───────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = candidates.length;
    const inPipeline = candidates.filter(c => ['SCREENING', 'INTERVIEW', 'ASSESSMENT'].includes(c.stage)).length;
    const offersExtended = candidates.filter(c => c.stage === 'OFFER').length;
    const hired = candidates.filter(c => c.stage === 'HIRED').length;
    const rejected = candidates.filter(c => c.stage === 'REJECTED').length;
    const applied = candidates.filter(c => c.stage === 'APPLIED').length;
    return { total, inPipeline, offersExtended, hired, rejected, applied };
  }, [candidates]);

  // ─── Handlers ────────────────────────────────────────────
  const openDetail = useCallback((c: Candidate) => {
    useEMSStore.getState().setSelectedCandidateId(c.id);
    useEMSStore.getState().setActiveView('candidate-detail');
  }, []);

  const openMoveStage = useCallback((c: Candidate) => {
    setSelectedCandidate(c);
    setMoveTargetStage('');
    setMoveNote('');
    setMoveStageOpen(true);
  }, []);

  const openScheduleInterview = useCallback((c: Candidate) => {
    setSelectedCandidate(c);
    setInterviewDate(c.interviewDate || '');
    setInterviewTime('');
    setInterviewNotes('');
    setScheduleInterviewOpen(true);
  }, []);

  const openMakeOffer = useCallback((c: Candidate) => {
    setSelectedCandidate(c);
    setOfferAmount(c.offerAmount ? String(c.offerAmount) : '');
    setOfferNotes('');
    setMakeOfferOpen(true);
  }, []);

  const openReject = useCallback((c: Candidate) => {
    setSelectedCandidate(c);
    setRejectReason('');
    setRejectNotes('');
    setRejectOpen(true);
  }, []);

  const openEdit = useCallback((c: Candidate) => {
    setSelectedCandidate(c);
    setEditForm({
      name: c.name,
      email: c.email,
      phone: c.phone || '',
      notes: c.notes || '',
    });
    setEditOpen(true);
  }, []);

  const openDeleteConfirm = useCallback((c: Candidate) => {
    setSelectedCandidate(c);
    setDeleteConfirmOpen(true);
  }, []);

  // ─── CRUD Handlers ───────────────────────────────────────
  const handleAdd = useCallback(async () => {
    if (!addForm.name.trim()) { toast.error('Name is required'); return; }
    if (!addForm.email.trim()) { toast.error('Email is required'); return; }
    if (!addForm.jobPostingId) { toast.error('Job posting is required'); return; }
    setAddSaving(true);
    try {
      const res = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name.trim(),
          email: addForm.email.trim(),
          phone: addForm.phone.trim() || null,
          jobPostingId: addForm.jobPostingId,
          source: addForm.source,
          appliedDate: new Date().toISOString().split('T')[0],
          notes: addForm.notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success('Candidate added successfully');
        setAddOpen(false);
        setAddForm({ name: '', email: '', phone: '', jobPostingId: '', source: 'OTHER', notes: '' });
        await loadCandidates();
      } else {
        toast.error(json.message || 'Failed to add candidate');
      }
    } catch {
      toast.error('Failed to add candidate');
    } finally {
      setAddSaving(false);
    }
  }, [addForm, loadCandidates]);

  const handleEditSave = useCallback(async () => {
    if (!selectedCandidate) return;
    if (!editForm.name.trim()) { toast.error('Name is required'); return; }
    if (!editForm.email.trim()) { toast.error('Email is required'); return; }
    setEditSaving(true);
    try {
      await updateCandidate(selectedCandidate.id, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || null,
        notes: editForm.notes.trim() || null,
      });
      toast.success('Candidate updated');
      setEditOpen(false);
      // Refresh selected candidate data
      const updated = candidates.find(c => c.id === selectedCandidate.id);
      if (updated) setSelectedCandidate({ ...updated, name: editForm.name, email: editForm.email, phone: editForm.phone || null, notes: editForm.notes || null });
    } catch {
      toast.error('Failed to update candidate');
    } finally {
      setEditSaving(false);
    }
  }, [selectedCandidate, editForm, updateCandidate, candidates]);

  const handleMoveStage = useCallback(async () => {
    if (!selectedCandidate || !moveTargetStage) { toast.error('Select a target stage'); return; }
    setMoveSaving(true);
    try {
      const data: Record<string, unknown> = { stage: moveTargetStage };
      if (moveNote.trim()) data.notes = moveNote.trim();
      await updateCandidate(selectedCandidate.id, data);
      toast.success(`${selectedCandidate.name} moved to ${STAGE_CONFIG[moveTargetStage]?.label || moveTargetStage}`);
      setMoveStageOpen(false);
      // Update selected candidate
      setSelectedCandidate(prev => prev ? { ...prev, stage: moveTargetStage } : null);
    } catch {
      toast.error('Failed to move candidate');
    } finally {
      setMoveSaving(false);
    }
  }, [selectedCandidate, moveTargetStage, moveNote, updateCandidate]);

  const handleScheduleInterview = useCallback(async () => {
    if (!selectedCandidate) return;
    if (!interviewDate) { toast.error('Interview date is required'); return; }
    setInterviewSaving(true);
    try {
      const data: Record<string, unknown> = {
        stage: 'INTERVIEW',
        interviewDate: interviewTime ? `${interviewDate}T${interviewTime}` : interviewDate,
      };
      if (interviewNotes.trim()) data.notes = interviewNotes.trim();
      await updateCandidate(selectedCandidate.id, data);
      toast.success('Interview scheduled');
      setScheduleInterviewOpen(false);
      setSelectedCandidate(prev => prev ? { ...prev, stage: 'INTERVIEW', interviewDate: interviewDate } : null);
    } catch {
      toast.error('Failed to schedule interview');
    } finally {
      setInterviewSaving(false);
    }
  }, [selectedCandidate, interviewDate, interviewTime, interviewNotes, updateCandidate]);

  const handleMakeOffer = useCallback(async () => {
    if (!selectedCandidate) return;
    if (!offerAmount || parseFloat(offerAmount) <= 0) { toast.error('Offer amount is required'); return; }
    setOfferSaving(true);
    try {
      const data: Record<string, unknown> = {
        stage: 'OFFER',
        offerAmount: parseFloat(offerAmount),
      };
      if (offerNotes.trim()) data.notes = offerNotes.trim();
      await updateCandidate(selectedCandidate.id, data);
      toast.success('Offer extended');
      setMakeOfferOpen(false);
      setSelectedCandidate(prev => prev ? { ...prev, stage: 'OFFER', offerAmount: parseFloat(offerAmount) } : null);
    } catch {
      toast.error('Failed to make offer');
    } finally {
      setOfferSaving(false);
    }
  }, [selectedCandidate, offerAmount, offerNotes, updateCandidate]);

  const handleReject = useCallback(async () => {
    if (!selectedCandidate) return;
    if (!rejectReason.trim()) { toast.error('Rejection reason is required'); return; }
    setRejectSaving(true);
    try {
      const data: Record<string, unknown> = {
        stage: 'REJECTED',
        rejectedReason: rejectReason.trim(),
      };
      if (rejectNotes.trim()) data.notes = rejectNotes.trim();
      await updateCandidate(selectedCandidate.id, data);
      toast.success('Candidate rejected');
      setRejectOpen(false);
      setSelectedCandidate(prev => prev ? { ...prev, stage: 'REJECTED', rejectedReason: rejectReason.trim() } : null);
    } catch {
      toast.error('Failed to reject candidate');
    } finally {
      setRejectSaving(false);
    }
  }, [selectedCandidate, rejectReason, rejectNotes, updateCandidate]);

  const handleDelete = useCallback(async () => {
    if (!selectedCandidate) return;
    setDeleteSaving(true);
    try {
      const res = await fetch(`/api/candidates?id=${selectedCandidate.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success('Candidate deleted');
        setDeleteConfirmOpen(false);
        setSelectedCandidate(null);
        await loadCandidates();
      } else {
        toast.error(json.message || 'Failed to delete candidate');
      }
    } catch {
      toast.error('Failed to delete candidate');
    } finally {
      setDeleteSaving(false);
    }
  }, [selectedCandidate, loadCandidates]);

  const handleRate = useCallback(async (candidate: Candidate, rating: number) => {
    try {
      await updateCandidate(candidate.id, { rating });
      if (selectedCandidate?.id === candidate.id) {
        setSelectedCandidate(prev => prev ? { ...prev, rating } : null);
      }
      toast.success(`Rated ${candidate.name}: ${rating} star${rating > 1 ? 's' : ''}`);
    } catch {
      toast.error('Failed to update rating');
    }
  }, [updateCandidate, selectedCandidate]);

  const handleMoveToNextStage = useCallback(async (candidate: Candidate) => {
    const next = getNextStage(candidate.stage);
    if (!next) {
      toast.info('No next stage available');
      return;
    }
    try {
      await updateCandidate(candidate.id, { stage: next });
      toast.success(`${candidate.name} moved to ${STAGE_CONFIG[next]?.label || next}`);
      if (selectedCandidate?.id === candidate.id) {
        setSelectedCandidate(prev => prev ? { ...prev, stage: next } : null);
      }
    } catch {
      toast.error('Failed to move candidate');
    }
  }, [updateCandidate, selectedCandidate]);

  // ─── Animation Config ────────────────────────────────────
  const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

  // ─── Loading State ───────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="h-8 w-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading candidates…</p>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-4">
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent">
              Candidate Management
            </span>
          </h2>
          <div className="flex items-center gap-3 mt-1.5">
            <Badge className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 text-xs">
              <Users className="h-3 w-3 mr-1" />{stats.total} Total
            </Badge>
            <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/25 text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />{stats.inPipeline} In Pipeline
            </Badge>
            <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />{stats.hired} Hired
            </Badge>
            <Badge className="bg-rose-500/15 text-rose-400 border border-rose-500/25 text-xs">
              <XCircle className="h-3 w-3 mr-1" />{stats.rejected} Rejected
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-cyan-500/10 hover:border-cyan-500/30"
          >
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setAddForm({ name: '', email: '', phone: '', jobPostingId: '', source: 'OTHER', notes: '' });
              setAddOpen(true);
            }}
            className="gap-1.5 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white"
          >
            <UserPlus className="h-3.5 w-3.5" /> Add Candidate
          </Button>
        </div>
      </div>

      {/* ═══ TOOLBAR ═══ */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search candidates by name, email, position..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-9 pl-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-cyan-500/30"
            />
          </div>
          <Select value={filterJob} onValueChange={setFilterJob}>
            <SelectTrigger className="h-9 w-44 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
              <SelectValue placeholder="All Jobs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Job Postings</SelectItem>
              {jobPostings.map(j => (
                <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStage} onValueChange={setFilterStage}>
            <SelectTrigger className="h-9 w-36 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {STAGES.map(s => (
                <SelectItem key={s} value={s}>{STAGE_CONFIG[s]?.label || s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="h-9 w-32 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {Object.entries(SOURCE_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'outline'}
              size="sm"
              className={cn('h-9 w-9 p-0', viewMode === 'kanban' ? 'bg-cyan-600 hover:bg-cyan-500' : 'border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]')}
              onClick={() => setViewMode('kanban')}
            >
              <Kanban className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              className={cn('h-9 w-9 p-0', viewMode === 'table' ? 'bg-cyan-600 hover:bg-cyan-500' : 'border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]')}
              onClick={() => setViewMode('table')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* ═══ STATS BAR ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { title: 'Total Candidates', value: stats.total, icon: Users, color: 'cyan' as const, subtitle: 'All applicants' },
          { title: 'In Pipeline', value: stats.inPipeline, icon: TrendingUp, color: 'amber' as const, subtitle: 'Screening+Interview+Assessment' },
          { title: 'Offers Extended', value: stats.offersExtended, icon: Send, color: 'emerald' as const, subtitle: 'Awaiting response' },
          { title: 'Hired', value: stats.hired, icon: CheckCircle2, color: 'violet' as const, subtitle: 'Successfully hired' },
        ].map((m, i) => (
          <motion.div key={m.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <StatCard title={m.title} value={m.value} icon={m.icon} color={m.color} subtitle={m.subtitle} hero pulse={m.value > 0} />
          </motion.div>
        ))}
      </div>

      {/* ═══ KANBAN VIEW ═══ */}
      {viewMode === 'kanban' && (
        <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
            {STAGES.map(stage => {
              const cfg = STAGE_CONFIG[stage];
              const stageCandidates = filteredCandidates.filter(c => c.stage === stage);
              return (
                <div key={stage} className="space-y-2 min-w-[180px] sm:min-w-[220px] max-w-[280px] flex-shrink-0">
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('h-2 w-2 rounded-full', cfg.bgColor, 'ring-2', cfg.borderColor)} />
                      <span className="text-xs font-medium text-muted-foreground">{cfg.label}</span>
                    </div>
                    <span className={cn('h-5 min-w-[20px] rounded-full flex items-center justify-center text-[10px] font-bold px-1.5', cfg.bgColor, cfg.color)}>
                      {stageCandidates.length}
                    </span>
                  </div>

                  {/* Column Cards */}
                  <div className="space-y-2 min-h-[200px] max-h-[500px] overflow-y-auto p-1.5 rounded-xl bg-black/[0.01] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.05]" style={{ scrollbarWidth: 'thin' }}>
                    <AnimatePresence>
                      {stageCandidates.map(c => (
                        <motion.div
                          key={c.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div
                            className="p-2.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.05] hover:border-cyan-500/20 transition-all cursor-pointer group"
                            onClick={() => openDetail(c)}
                          >
                            {/* Avatar + Name */}
                            <div className="flex items-center gap-1.5 mb-1">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className={cn('text-[8px] bg-gradient-to-br text-white', getAvatarGradient(c.name))}>
                                  {getInitials(c.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-[11px] font-medium truncate">{c.name}</span>
                            </div>

                            {/* Job Title */}
                            <p className="text-[9px] text-muted-foreground truncate mb-1.5">
                              {c.jobPosting?.title || 'Unknown Position'}
                            </p>

                            {/* Rating + Source */}
                            <div className="flex items-center justify-between mb-1.5">
                              <StarRating rating={c.rating} />
                              <SourceBadge source={c.source} />
                            </div>

                            {/* Move to Next Stage Button */}
                            {stage !== 'HIRED' && stage !== 'REJECTED' && (
                              <button
                                onClick={e => { e.stopPropagation(); handleMoveToNextStage(c); }}
                                className="w-full flex items-center justify-center gap-1 py-1 rounded-md text-[9px] font-medium bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] hover:bg-cyan-500/10 hover:border-cyan-500/20 hover:text-cyan-400 transition-all"
                              >
                                <ArrowRight className="h-2.5 w-2.5" />
                                Move to {STAGE_CONFIG[getNextStage(stage) || '']?.label || 'Next'}
                              </button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {stageCandidates.length === 0 && (
                      <div className="flex items-center justify-center h-20 text-[10px] text-muted-foreground/40">
                        No candidates
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ═══ TABLE VIEW ═══ */}
      {viewMode === 'table' && (
        <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-black/[0.06] dark:border-white/[0.05] hover:bg-transparent">
                    <TableHead className="text-[10px] font-medium text-muted-foreground uppercase">Candidate</TableHead>
                    <TableHead className="text-[10px] font-medium text-muted-foreground uppercase">Position</TableHead>
                    <TableHead className="text-[10px] font-medium text-muted-foreground uppercase">Stage</TableHead>
                    <TableHead className="text-[10px] font-medium text-muted-foreground uppercase">Rating</TableHead>
                    <TableHead className="text-[10px] font-medium text-muted-foreground uppercase">Source</TableHead>
                    <TableHead className="text-[10px] font-medium text-muted-foreground uppercase">Applied</TableHead>
                    <TableHead className="text-right text-[10px] font-medium text-muted-foreground uppercase">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCandidates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="h-8 w-8 text-muted-foreground/30" />
                          <p className="text-sm">No candidates found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCandidates.map(c => (
                      <TableRow
                        key={c.id}
                        className="border-b border-black/[0.03] dark:border-white/[0.03] hover:bg-black/[0.01] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                        onClick={() => openDetail(c)}
                      >
                        <TableCell className="p-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className={cn('text-[10px] bg-gradient-to-br text-white', getAvatarGradient(c.name))}>
                                {getInitials(c.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{c.name}</p>
                              <p className="text-[10px] text-muted-foreground">{c.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="p-3 text-xs text-muted-foreground max-w-[150px] truncate">
                          {c.jobPosting?.title || 'Unknown'}
                        </TableCell>
                        <TableCell className="p-3"><StageBadge stage={c.stage} /></TableCell>
                        <TableCell className="p-3" onClick={e => e.stopPropagation()}>
                          <StarRating rating={c.rating} interactive onChange={r => handleRate(c, r)} />
                        </TableCell>
                        <TableCell className="p-3"><SourceBadge source={c.source} /></TableCell>
                        <TableCell className="p-3 text-[10px] text-muted-foreground">{formatDate(c.appliedDate)}</TableCell>
                        <TableCell className="p-3 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-cyan-400 hover:text-cyan-300 gap-1" onClick={() => openDetail(c)}>
                              <Eye className="h-3 w-3" />View
                            </Button>
                            {c.stage !== 'HIRED' && c.stage !== 'REJECTED' && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-400 hover:text-emerald-300 gap-1" onClick={() => handleMoveToNextStage(c)}>
                                <ArrowRight className="h-3 w-3" />Next
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-rose-400 hover:text-rose-300" onClick={() => openDeleteConfirm(c)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* ═══ ADD CANDIDATE DIALOG ═══ */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-background border-black/[0.1] dark:border-white/[0.1] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-cyan-400" />
              Add New Candidate
            </DialogTitle>
            <DialogDescription>Add a new candidate to the hiring pipeline</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Name <span className="text-rose-400">*</span></Label>
                <Input
                  placeholder="Full name"
                  value={addForm.name}
                  onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-cyan-500/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Email <span className="text-rose-400">*</span></Label>
                <Input
                  placeholder="email@example.com"
                  type="email"
                  value={addForm.email}
                  onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-cyan-500/30"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <Input
                  placeholder="+1 555-0123"
                  value={addForm.phone}
                  onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-cyan-500/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Source</Label>
                <Select value={addForm.source} onValueChange={v => setAddForm(f => ({ ...f, source: v }))}>
                  <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-cyan-500/30">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SOURCE_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Job Posting <span className="text-rose-400">*</span></Label>
              <Select value={addForm.jobPostingId} onValueChange={v => setAddForm(f => ({ ...f, jobPostingId: v }))}>
                <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-cyan-500/30">
                  <SelectValue placeholder="Select a job posting" />
                </SelectTrigger>
                <SelectContent>
                  {jobPostings.map(j => (
                    <SelectItem key={j.id} value={j.id}>{j.title}{j.department ? ` — ${j.department.name}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={addForm.notes}
                onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-cyan-500/30 min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleAdd} disabled={addSaving} className="gap-1.5 bg-gradient-to-r from-cyan-600 to-emerald-600 text-white">
              {addSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
              Add Candidate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* ═══ MOVE STAGE DIALOG ═══ */}
      <Dialog open={moveStageOpen} onOpenChange={setMoveStageOpen}>
        <DialogContent className="bg-background border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-cyan-400" />
              Move Candidate — {selectedCandidate?.name}
            </DialogTitle>
            <DialogDescription>
              Current stage: {selectedCandidate && <StageBadge stage={selectedCandidate.stage} />}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Target Stage</Label>
              <Select value={moveTargetStage} onValueChange={setMoveTargetStage}>
                <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-cyan-500/30">
                  <SelectValue placeholder="Select target stage" />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map(s => (
                    <SelectItem key={s} value={s} disabled={selectedCandidate?.stage === s}>
                      {STAGE_CONFIG[s]?.label || s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Note (optional)</Label>
              <Textarea
                placeholder="Add a note for this stage transition..."
                value={moveNote}
                onChange={e => setMoveNote(e.target.value)}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-cyan-500/30 min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveStageOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleMoveStage} disabled={moveSaving || !moveTargetStage} className="gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white">
              {moveSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
              Move Stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ SCHEDULE INTERVIEW DIALOG ═══ */}
      <Dialog open={scheduleInterviewOpen} onOpenChange={setScheduleInterviewOpen}>
        <DialogContent className="bg-background border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-amber-400" />
              Schedule Interview — {selectedCandidate?.name}
            </DialogTitle>
            <DialogDescription>Schedule an interview and move candidate to Interview stage</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Date <span className="text-rose-400">*</span></Label>
                <Input
                  type="date"
                  value={interviewDate}
                  onChange={e => setInterviewDate(e.target.value)}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-amber-500/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Time</Label>
                <Input
                  type="time"
                  value={interviewTime}
                  onChange={e => setInterviewTime(e.target.value)}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-amber-500/30"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
              <Textarea
                placeholder="Interview details, format, interviewer..."
                value={interviewNotes}
                onChange={e => setInterviewNotes(e.target.value)}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-amber-500/30 min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleInterviewOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleScheduleInterview} disabled={interviewSaving || !interviewDate} className="gap-1.5 bg-amber-600 hover:bg-amber-500 text-white">
              {interviewSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarDays className="h-3.5 w-3.5" />}
              Schedule Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ MAKE OFFER DIALOG ═══ */}
      <Dialog open={makeOfferOpen} onOpenChange={setMakeOfferOpen}>
        <DialogContent className="bg-background border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-400" />
              Make Offer — {selectedCandidate?.name}
            </DialogTitle>
            <DialogDescription>Extend an offer and move candidate to Offer stage</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Offer Amount <span className="text-rose-400">*</span></Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="75000"
                  value={offerAmount}
                  onChange={e => setOfferAmount(e.target.value)}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
              <Textarea
                placeholder="Offer details, benefits, start date..."
                value={offerNotes}
                onChange={e => setOfferNotes(e.target.value)}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMakeOfferOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleMakeOffer} disabled={offerSaving || !offerAmount} className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white">
              {offerSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
              Extend Offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ REJECT DIALOG ═══ */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="bg-background border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ThumbsDown className="h-5 w-5 text-rose-400" />
              Reject Candidate — {selectedCandidate?.name}
            </DialogTitle>
            <DialogDescription>This will move the candidate to the Rejected stage</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Rejection Reason <span className="text-rose-400">*</span></Label>
              <Textarea
                placeholder="Provide a reason for rejection..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-rose-500/30 min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Additional Notes (optional)</Label>
              <Textarea
                placeholder="Any additional notes..."
                value={rejectNotes}
                onChange={e => setRejectNotes(e.target.value)}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-rose-500/30 min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleReject} disabled={rejectSaving || !rejectReason.trim()} className="gap-1.5 bg-rose-600 hover:bg-rose-500 text-white">
              {rejectSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              Reject Candidate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ EDIT CANDIDATE DIALOG ═══ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-background border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-violet-400" />
              Edit Candidate
            </DialogTitle>
            <DialogDescription>Update candidate information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Name <span className="text-rose-400">*</span></Label>
                <Input
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-violet-500/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Email <span className="text-rose-400">*</span></Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-violet-500/30"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Phone</Label>
              <Input
                value={editForm.phone}
                onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-violet-500/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea
                value={editForm.notes}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-violet-500/30 min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleEditSave} disabled={editSaving} className="gap-1.5 bg-violet-600 hover:bg-violet-500 text-white">
              {editSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Edit className="h-3.5 w-3.5" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ DELETE CONFIRM DIALOG ═══ */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-background border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400">
              <AlertCircle className="h-5 w-5" />
              Delete Candidate
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedCandidate?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleDelete} disabled={deleteSaving} className="gap-1.5 bg-rose-600 hover:bg-rose-500 text-white">
              {deleteSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
