'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { StatCard } from './stat-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Star,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Clock,
  ArrowRight,
  Edit,
  Trash2,
  Loader2,
  XCircle,
  DollarSign,
  CheckCircle2,
  Send,
  CalendarDays,
  ChevronRight,
  User,
  FileText,
  Sparkles,
  AlertCircle,
  Users,
} from 'lucide-react';
import { getInitials, formatDate, formatCurrency } from './shared';

// ─── Types ─────────────────────────────────────────────────────
interface JobPosting {
  id: string;
  title: string;
  department?: { id: string; name: string } | null;
  status?: string;
}

interface CandidateData {
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
const PIPELINE_STAGES = STAGES.filter(s => s !== 'REJECTED');

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

// Pipeline step icons
const STAGE_ICONS: Record<string, React.ElementType> = {
  APPLIED: FileText,
  SCREENING: Users,
  INTERVIEW: CalendarDays,
  ASSESSMENT: Sparkles,
  OFFER: DollarSign,
  HIRED: CheckCircle2,
};

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

// ─── Interactive Star Rating Component ─────────────────────────
function InteractiveStarRating({ rating, onChange }: { rating: number; onChange: (r: number) => void }) {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHoverRating(i)}
          onMouseLeave={() => setHoverRating(0)}
          className="transition-transform hover:scale-125 cursor-pointer"
        >
          <Star
            className={cn(
              'h-5 w-5 transition-colors',
              (hoverRating || rating) >= i
                ? 'text-amber-400 fill-amber-400'
                : 'text-muted-foreground/30'
            )}
          />
        </button>
      ))}
      {rating > 0 && (
        <span className="ml-1.5 text-xs text-muted-foreground">{rating}/5</span>
      )}
    </div>
  );
}

// ─── Pipeline Stepper Component ────────────────────────────────
function PipelineStepper({ currentStage }: { currentStage: string }) {
  const currentIndex = PIPELINE_STAGES.indexOf(currentStage as typeof PIPELINE_STAGES[number]);
  const activeIndex = currentIndex === -1 ? 0 : currentIndex;
  const isRejected = currentStage === 'REJECTED';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between relative">
        {/* Background track */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-black/[0.04] dark:bg-white/[0.06]" />
        {/* Progress track */}
        {!isRejected && activeIndex > 0 && (
          <div
            className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-700"
            style={{ width: `${(activeIndex / (PIPELINE_STAGES.length - 1)) * 100}%` }}
          />
        )}

        {PIPELINE_STAGES.map((stage, i) => {
          const cfg = STAGE_CONFIG[stage];
          const Icon = STAGE_ICONS[stage] || FileText;
          const isPast = i < activeIndex;
          const isActive = i === activeIndex && !isRejected;
          const isFuture = i > activeIndex || isRejected;

          return (
            <div key={stage} className="flex flex-col items-center relative z-10 group">
              {/* Step circle */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.08, duration: 0.3 }}
                className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                  isPast
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                    : isActive
                    ? `${cfg.bgColor} ${cfg.borderColor} border ${cfg.color} shadow-[0_0_12px_rgba(6,182,212,0.2)]`
                    : 'bg-black/[0.02] dark:bg-white/[0.04] border-black/[0.1] dark:border-white/[0.1] text-muted-foreground/40'
                )}
              >
                {isPast ? (
                  <CheckCircle2 className="h-4.5 w-4.5" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </motion.div>

              {/* Label */}
              <span
                className={cn(
                  'mt-2 text-[10px] sm:text-xs font-medium whitespace-nowrap transition-colors',
                  isPast
                    ? 'text-emerald-400'
                    : isActive
                    ? cfg.color
                    : 'text-muted-foreground/40'
                )}
              >
                {cfg.label}
              </span>

              {/* Active indicator dot */}
              {isActive && (
                <motion.div
                  layoutId="active-pipeline-dot"
                  className="mt-1 h-1 w-1 rounded-full bg-cyan-400"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Rejected indicator */}
      {isRejected && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 mt-4"
        >
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20">
            <XCircle className="h-3 w-3 text-rose-400" />
            <span className="text-xs font-medium text-rose-400">Rejected</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────
export function CandidateDetail() {
  const { selectedCandidateId, setActiveView, setSelectedCandidateId } = useEMSStore();
  const [candidate, setCandidate] = useState<CandidateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [moveStageOpen, setMoveStageOpen] = useState(false);
  const [scheduleInterviewOpen, setScheduleInterviewOpen] = useState(false);
  const [makeOfferOpen, setMakeOfferOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Form state - Move Stage
  const [moveTargetStage, setMoveTargetStage] = useState('');
  const [moveNote, setMoveNote] = useState('');
  const [moveSaving, setMoveSaving] = useState(false);

  // Form state - Schedule Interview
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [interviewNotes, setInterviewNotes] = useState('');
  const [interviewSaving, setInterviewSaving] = useState(false);

  // Form state - Make Offer
  const [offerAmount, setOfferAmount] = useState('');
  const [offerNotes, setOfferNotes] = useState('');
  const [offerSaving, setOfferSaving] = useState(false);

  // Form state - Reject
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [rejectSaving, setRejectSaving] = useState(false);

  // Form state - Edit
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const [editSaving, setEditSaving] = useState(false);

  // Delete
  const [deleteSaving, setDeleteSaving] = useState(false);

  // Notes editing
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  // ─── Load Candidate Data ─────────────────────────────────
  const loadCandidate = useCallback(async () => {
    if (!selectedCandidateId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/candidates');
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        const found = (json.data as CandidateData[]).find((c: CandidateData) => c.id === selectedCandidateId);
        if (found) {
          setCandidate(found);
          setNotesText(found.notes || '');
        } else {
          setError('Candidate not found');
        }
      } else {
        setError('Failed to load candidate data');
      }
    } catch {
      setError('Network error while loading candidate');
    } finally {
      setLoading(false);
    }
  }, [selectedCandidateId]);

  useEffect(() => {
    if (!selectedCandidateId) {
      setActiveView('candidates');
      return;
    }
    loadCandidate();
  }, [selectedCandidateId, setActiveView, loadCandidate]);

  // ─── Update Candidate API ────────────────────────────────
  const updateCandidate = useCallback(async (id: string, updates: Record<string, unknown>) => {
    const res = await fetch('/api/candidates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
    const json = await res.json();
    if (json.status === 'success') {
      return json.data;
    } else {
      throw new Error(json.message || 'Update failed');
    }
  }, []);

  // ─── Refresh candidate data after update ─────────────────
  const refreshCandidate = useCallback(async () => {
    try {
      const res = await fetch('/api/candidates');
      const json = await res.json();
      if (json.status === 'success' && json.data && candidate) {
        const found = (json.data as CandidateData[]).find((c: CandidateData) => c.id === candidate.id);
        if (found) {
          setCandidate(found);
          setNotesText(found.notes || '');
        }
      }
    } catch {
      // Silent - data will refresh on next full load
    }
  }, [candidate]);

  // ─── Navigation ──────────────────────────────────────────
  const goBack = useCallback(() => {
    setSelectedCandidateId(null);
    setActiveView('candidates');
  }, [setSelectedCandidateId, setActiveView]);

  // ─── Open dialog helpers ─────────────────────────────────
  const openMoveStage = useCallback(() => {
    setMoveTargetStage('');
    setMoveNote('');
    setMoveStageOpen(true);
  }, []);

  const openScheduleInterview = useCallback(() => {
    setInterviewDate(candidate?.interviewDate ? candidate.interviewDate.split('T')[0] : '');
    setInterviewTime('');
    setInterviewNotes('');
    setScheduleInterviewOpen(true);
  }, [candidate?.interviewDate]);

  const openMakeOffer = useCallback(() => {
    setOfferAmount(candidate?.offerAmount ? String(candidate.offerAmount) : '');
    setOfferNotes('');
    setMakeOfferOpen(true);
  }, [candidate?.offerAmount]);

  const openReject = useCallback(() => {
    setRejectReason('');
    setRejectNotes('');
    setRejectOpen(true);
  }, []);

  const openEdit = useCallback(() => {
    if (!candidate) return;
    setEditForm({
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone || '',
      notes: candidate.notes || '',
    });
    setEditOpen(true);
  }, [candidate]);

  const openDeleteConfirm = useCallback(() => {
    setDeleteConfirmOpen(true);
  }, []);

  // ─── CRUD Handlers ───────────────────────────────────────
  const handleMoveStage = useCallback(async () => {
    if (!candidate || !moveTargetStage) { toast.error('Select a target stage'); return; }
    setMoveSaving(true);
    try {
      const data: Record<string, unknown> = { stage: moveTargetStage };
      if (moveNote.trim()) data.notes = moveNote.trim();
      await updateCandidate(candidate.id, data);
      toast.success(`${candidate.name} moved to ${STAGE_CONFIG[moveTargetStage]?.label || moveTargetStage}`);
      setMoveStageOpen(false);
      await refreshCandidate();
    } catch {
      toast.error('Failed to move candidate');
    } finally {
      setMoveSaving(false);
    }
  }, [candidate, moveTargetStage, moveNote, updateCandidate, refreshCandidate]);

  const handleScheduleInterview = useCallback(async () => {
    if (!candidate) return;
    if (!interviewDate) { toast.error('Interview date is required'); return; }
    setInterviewSaving(true);
    try {
      const data: Record<string, unknown> = {
        stage: 'INTERVIEW',
        interviewDate: interviewTime ? `${interviewDate}T${interviewTime}` : interviewDate,
      };
      if (interviewNotes.trim()) data.notes = interviewNotes.trim();
      await updateCandidate(candidate.id, data);
      toast.success('Interview scheduled');
      setScheduleInterviewOpen(false);
      await refreshCandidate();
    } catch {
      toast.error('Failed to schedule interview');
    } finally {
      setInterviewSaving(false);
    }
  }, [candidate, interviewDate, interviewTime, interviewNotes, updateCandidate, refreshCandidate]);

  const handleMakeOffer = useCallback(async () => {
    if (!candidate) return;
    if (!offerAmount || parseFloat(offerAmount) <= 0) { toast.error('Offer amount is required'); return; }
    setOfferSaving(true);
    try {
      const data: Record<string, unknown> = {
        stage: 'OFFER',
        offerAmount: parseFloat(offerAmount),
      };
      if (offerNotes.trim()) data.notes = offerNotes.trim();
      await updateCandidate(candidate.id, data);
      toast.success('Offer extended');
      setMakeOfferOpen(false);
      await refreshCandidate();
    } catch {
      toast.error('Failed to make offer');
    } finally {
      setOfferSaving(false);
    }
  }, [candidate, offerAmount, offerNotes, updateCandidate, refreshCandidate]);

  const handleReject = useCallback(async () => {
    if (!candidate) return;
    if (!rejectReason.trim()) { toast.error('Rejection reason is required'); return; }
    setRejectSaving(true);
    try {
      const data: Record<string, unknown> = {
        stage: 'REJECTED',
        rejectedReason: rejectReason.trim(),
      };
      if (rejectNotes.trim()) data.notes = rejectNotes.trim();
      await updateCandidate(candidate.id, data);
      toast.success('Candidate rejected');
      setRejectOpen(false);
      await refreshCandidate();
    } catch {
      toast.error('Failed to reject candidate');
    } finally {
      setRejectSaving(false);
    }
  }, [candidate, rejectReason, rejectNotes, updateCandidate, refreshCandidate]);

  const handleEditSave = useCallback(async () => {
    if (!candidate) return;
    if (!editForm.name.trim()) { toast.error('Name is required'); return; }
    if (!editForm.email.trim()) { toast.error('Email is required'); return; }
    setEditSaving(true);
    try {
      await updateCandidate(candidate.id, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || null,
        notes: editForm.notes.trim() || null,
      });
      toast.success('Candidate updated');
      setEditOpen(false);
      await refreshCandidate();
    } catch {
      toast.error('Failed to update candidate');
    } finally {
      setEditSaving(false);
    }
  }, [candidate, editForm, updateCandidate, refreshCandidate]);

  const handleDelete = useCallback(async () => {
    if (!candidate) return;
    setDeleteSaving(true);
    try {
      const res = await fetch(`/api/candidates?id=${candidate.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success('Candidate deleted');
        setDeleteConfirmOpen(false);
        goBack();
      } else {
        toast.error(json.message || 'Failed to delete candidate');
      }
    } catch {
      toast.error('Failed to delete candidate');
    } finally {
      setDeleteSaving(false);
    }
  }, [candidate, goBack]);

  const handleRate = useCallback(async (rating: number) => {
    if (!candidate) return;
    try {
      await updateCandidate(candidate.id, { rating });
      setCandidate(prev => prev ? { ...prev, rating } : null);
      toast.success(`Rated ${candidate.name}: ${rating} star${rating > 1 ? 's' : ''}`);
    } catch {
      toast.error('Failed to update rating');
    }
  }, [candidate, updateCandidate]);

  const handleSaveNotes = useCallback(async () => {
    if (!candidate) return;
    setNotesSaving(true);
    try {
      await updateCandidate(candidate.id, { notes: notesText.trim() || null });
      setCandidate(prev => prev ? { ...prev, notes: notesText.trim() || null } : null);
      setEditingNotes(false);
      toast.success('Notes saved');
    } catch {
      toast.error('Failed to save notes');
    } finally {
      setNotesSaving(false);
    }
  }, [candidate, notesText, updateCandidate]);

  const handleMoveToNextStage = useCallback(async () => {
    if (!candidate) return;
    const next = getNextStage(candidate.stage);
    if (!next) {
      toast.info('No next stage available');
      return;
    }
    try {
      await updateCandidate(candidate.id, { stage: next });
      toast.success(`${candidate.name} moved to ${STAGE_CONFIG[next]?.label || next}`);
      await refreshCandidate();
    } catch {
      toast.error('Failed to move candidate');
    }
  }, [candidate, updateCandidate, refreshCandidate]);

  // ─── Animation Config ────────────────────────────────────
  const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };
  const stageCfg = candidate ? STAGE_CONFIG[candidate.stage] || STAGE_CONFIG.APPLIED : STAGE_CONFIG.APPLIED;
  const sourceCfg = candidate ? SOURCE_CONFIG[candidate.source] || SOURCE_CONFIG.OTHER : SOURCE_CONFIG.OTHER;
  const isTerminal = candidate?.stage === 'HIRED' || candidate?.stage === 'REJECTED';

  // ─── Loading State ───────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="h-8 w-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading candidate details…</p>
      </div>
    );
  }

  // ─── Error State ─────────────────────────────────────────
  if (error || !candidate) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-rose-400/50" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">{error || 'Candidate not found'}</p>
          <p className="text-xs text-muted-foreground mt-1">The candidate may have been removed or the link is invalid.</p>
        </div>
        <Button variant="outline" size="sm" onClick={goBack} className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-cyan-500/10">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Candidates
        </Button>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-4">
      {/* ═══ BACK BUTTON + HEADER ═══ */}
      <motion.div {...fadeIn} transition={{ duration: 0.4 }}>
        {/* Back button */}
        <button
          onClick={goBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to Candidates
        </button>

        {/* Header card */}
        <GlassCard className="p-6" glow={stageCfg.glow !== 'slate' ? stageCfg.glow : 'cyan'}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="relative shrink-0">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20 ring-2 ring-white/10">
                <AvatarFallback className={cn('text-lg sm:text-xl font-bold bg-gradient-to-br text-white', getAvatarGradient(candidate.name))}>
                  {getInitials(candidate.name)}
                </AvatarFallback>
              </Avatar>
              {/* Stage indicator dot */}
              <div className={cn(
                'absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full border-2 border-background flex items-center justify-center',
                stageCfg.bgColor
              )}>
                <div className={cn('h-2 w-2 rounded-full', stageCfg.color.replace('text-', 'bg-'))} />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h1 className="text-2xl font-bold truncate">{candidate.name}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={cn(stageCfg.bgColor, stageCfg.color, 'border-0 text-xs font-medium')}>
                    {stageCfg.label}
                  </Badge>
                  <Badge className={cn(sourceCfg.bgColor, sourceCfg.color, 'border-0 text-[10px] font-medium')}>
                    {sourceCfg.label}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {candidate.email}
                </span>
                {candidate.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> {candidate.phone}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <InteractiveStarRating rating={candidate.rating} onChange={handleRate} />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {!isTerminal && (
                <>
                  <Button
                    size="sm"
                    onClick={handleMoveToNextStage}
                    className="gap-1.5 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Move to {STAGE_CONFIG[getNextStage(candidate.stage) || '']?.label || 'Next'}</span>
                    <span className="sm:hidden">Next</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={openEdit} className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]">
                    <Edit className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Edit</span>
                  </Button>
                </>
              )}
              {isTerminal && (
                <Button variant="outline" size="sm" onClick={openEdit} className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]">
                  <Edit className="h-3.5 w-3.5" /> Edit
                </Button>
              )}
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ═══ PIPELINE PROGRESS ═══ */}
      <motion.div {...fadeIn} transition={{ delay: 0.08, duration: 0.4 }}>
        <GlassCard className="p-6" glow="cyan">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Hiring Pipeline</h2>
              {!isTerminal && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openMoveStage}
                  className="text-xs text-cyan-400 hover:text-cyan-300 gap-1"
                >
                  <ChevronRight className="h-3 w-3" /> Move Stage
                </Button>
              )}
            </div>
            <PipelineStepper currentStage={candidate.stage} />
          </div>
        </GlassCard>
      </motion.div>

      {/* ═══ KEY INFO CARDS ═══ */}
      <motion.div {...fadeIn} transition={{ delay: 0.12, duration: 0.4 }}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            title="Applied Date"
            value={formatDate(candidate.appliedDate)}
            icon={Calendar}
            color="slate"
            compact
          />
          <StatCard
            title="Job Position"
            value={candidate.jobPosting?.title || 'Unknown'}
            icon={Briefcase}
            color="cyan"
            compact
          />
          <StatCard
            title="Source"
            value={sourceCfg.label}
            icon={User}
            color={candidate.source === 'REFERRAL' ? 'emerald' : candidate.source === 'LINKEDIN' ? 'cyan' : candidate.source === 'WEBSITE' ? 'violet' : candidate.source === 'JOB_BOARD' ? 'amber' : candidate.source === 'AGENCY' ? 'rose' : 'slate'}
            compact
          />
          <StatCard
            title="Rating"
            value={`${candidate.rating}/5`}
            icon={Star}
            color={candidate.rating >= 4 ? 'emerald' : candidate.rating >= 3 ? 'amber' : 'rose'}
            compact
          />
          <StatCard
            title="Interview Date"
            value={candidate.interviewDate ? formatDate(candidate.interviewDate) : 'Not set'}
            icon={Clock}
            color={candidate.interviewDate ? 'amber' : 'slate'}
            compact
          />
          <StatCard
            title="Offer Amount"
            value={candidate.offerAmount ? formatCurrency(candidate.offerAmount) : 'No offer'}
            icon={DollarSign}
            color={candidate.offerAmount ? 'emerald' : 'slate'}
            compact
          />
        </div>
      </motion.div>

      {/* ═══ REJECTION REASON (if rejected) ═══ */}
      {candidate.stage === 'REJECTED' && candidate.rejectedReason && (
        <motion.div {...fadeIn} transition={{ delay: 0.15, duration: 0.4 }}>
          <GlassCard className="p-5" glow="rose">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-rose-400 flex items-center gap-2">
                <XCircle className="h-4 w-4" /> Rejection Reason
              </h3>
              <p className="text-sm text-muted-foreground">{candidate.rejectedReason}</p>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* ═══ NOTES SECTION ═══ */}
      <motion.div {...fadeIn} transition={{ delay: 0.16, duration: 0.4 }}>
        <GlassCard className="p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4" /> Notes
              </h2>
              {!editingNotes ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setNotesText(candidate.notes || ''); setEditingNotes(true); }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 gap-1"
                >
                  <Edit className="h-3 w-3" /> Edit
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingNotes(false)}
                    className="text-xs text-muted-foreground hover:text-foreground gap-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveNotes}
                    disabled={notesSaving}
                    className="text-xs gap-1 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white"
                  >
                    {notesSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                    Save
                  </Button>
                </div>
              )}
            </div>

            {editingNotes ? (
              <Textarea
                value={notesText}
                onChange={e => setNotesText(e.target.value)}
                placeholder="Add notes about this candidate…"
                rows={4}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-cyan-500/30 resize-none"
              />
            ) : (
              <div className="min-h-[60px]">
                {candidate.notes ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{candidate.notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground/40 italic">No notes added yet</p>
                )}
              </div>
            )}
          </div>
        </GlassCard>
      </motion.div>

      {/* ═══ ACTIONS PANEL ═══ */}
      <motion.div {...fadeIn} transition={{ delay: 0.2, duration: 0.4 }}>
        <GlassCard className="p-6">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Actions</h2>
          <div className="flex flex-wrap gap-3">
            {!isTerminal && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openMoveStage}
                  className="gap-1.5 border-cyan-500/20 hover:bg-cyan-500/10 hover:border-cyan-500/30 hover:text-cyan-400"
                >
                  <ArrowRight className="h-3.5 w-3.5" /> Move Stage
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openScheduleInterview}
                  className="gap-1.5 border-amber-500/20 hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-400"
                >
                  <CalendarDays className="h-3.5 w-3.5" /> Schedule Interview
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openMakeOffer}
                  className="gap-1.5 border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400"
                >
                  <DollarSign className="h-3.5 w-3.5" /> Make Offer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openReject}
                  className="gap-1.5 border-rose-500/20 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400"
                >
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={openEdit}
              className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
            >
              <Edit className="h-3.5 w-3.5" /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={openDeleteConfirm}
              className="gap-1.5 border-rose-500/20 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </GlassCard>
      </motion.div>

      {/* ═══ DIALOGS ═══ */}

      {/* Move Stage Dialog */}
      <Dialog open={moveStageOpen} onOpenChange={setMoveStageOpen}>
        <DialogContent className="bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-cyan-400" /> Move to Stage
            </DialogTitle>
            <DialogDescription>
              Move {candidate.name} to a different stage in the hiring pipeline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Target Stage</Label>
              <Select value={moveTargetStage} onValueChange={setMoveTargetStage}>
                <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                  <SelectValue placeholder="Select stage…" />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map(s => (
                    <SelectItem key={s} value={s} disabled={s === candidate.stage}>
                      {STAGE_CONFIG[s]?.label || s} {s === candidate.stage ? '(current)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Textarea
                value={moveNote}
                onChange={e => setMoveNote(e.target.value)}
                placeholder="Add a note about this stage change…"
                rows={3}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-cyan-500/30 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveStageOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleMoveStage} disabled={moveSaving || !moveTargetStage} className="gap-1.5 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white">
              {moveSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Move Stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Interview Dialog */}
      <Dialog open={scheduleInterviewOpen} onOpenChange={setScheduleInterviewOpen}>
        <DialogContent className="bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-amber-400" /> Schedule Interview
            </DialogTitle>
            <DialogDescription>
              Schedule an interview for {candidate.name}. This will move them to the Interview stage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={interviewDate}
                  onChange={e => setInterviewDate(e.target.value)}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-amber-500/30"
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={interviewTime}
                  onChange={e => setInterviewTime(e.target.value)}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-amber-500/30"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={interviewNotes}
                onChange={e => setInterviewNotes(e.target.value)}
                placeholder="Interview details, format, attendees…"
                rows={3}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-amber-500/30 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleInterviewOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleScheduleInterview} disabled={interviewSaving || !interviewDate} className="gap-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white">
              {interviewSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Make Offer Dialog */}
      <Dialog open={makeOfferOpen} onOpenChange={setMakeOfferOpen}>
        <DialogContent className="bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-400" /> Make Offer
            </DialogTitle>
            <DialogDescription>
              Extend an offer to {candidate.name}. This will move them to the Offer stage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Offer Amount (USD)</Label>
              <Input
                type="number"
                value={offerAmount}
                onChange={e => setOfferAmount(e.target.value)}
                placeholder="e.g. 85000"
                min="0"
                step="1000"
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={offerNotes}
                onChange={e => setOfferNotes(e.target.value)}
                placeholder="Offer details, benefits, conditions…"
                rows={3}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMakeOfferOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleMakeOffer} disabled={offerSaving || !offerAmount} className="gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white">
              {offerSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Extend Offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-rose-400" /> Reject Candidate
            </DialogTitle>
            <DialogDescription>
              Reject {candidate.name}. This action will mark them as rejected in the pipeline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Rejection Reason *</Label>
              <Textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Why is this candidate being rejected?"
                rows={3}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-rose-500/30 resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label>Additional Notes (optional)</Label>
              <Textarea
                value={rejectNotes}
                onChange={e => setRejectNotes(e.target.value)}
                placeholder="Internal notes about the rejection…"
                rows={2}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-rose-500/30 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleReject} disabled={rejectSaving || !rejectReason.trim()} className="gap-1.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white">
              {rejectSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Reject Candidate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-4 w-4 text-cyan-400" /> Edit Candidate
            </DialogTitle>
            <DialogDescription>
              Update {candidate.name}&apos;s information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={editForm.name}
                  onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-cyan-500/30"
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  value={editForm.email}
                  onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                  type="email"
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-cyan-500/30"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={editForm.phone}
                onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-cyan-500/30"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editForm.notes}
                onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                rows={3}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-cyan-500/30 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleEditSave} disabled={editSaving} className="gap-1.5 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white">
              {editSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-rose-400" /> Delete Candidate
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete {candidate.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-rose-500/5 border border-rose-500/10">
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
              <div>
                <p className="text-sm text-rose-400 font-medium">This is permanent</p>
                <p className="text-xs text-muted-foreground">
                  All data for {candidate.name} including notes, interview details, and offer information will be permanently removed.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleDelete} disabled={deleteSaving} className="gap-1.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white">
              {deleteSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
