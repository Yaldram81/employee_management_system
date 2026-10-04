'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { StatCard } from './stat-card';
import { StatusBadge } from './status-badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { toast } from 'sonner';
import type { Request } from '@/lib/types';
import {
  ArrowLeft,
  ChevronRight,
  Palmtree,
  DollarSign,
  Monitor,
  ArrowLeftRight,
  GraduationCap,
  Wrench,
  Plane,
  Headphones,
  MessageSquare,
  Clock,
  Calendar,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Send,
  Activity,
  FileText,
  TrendingUp,
  Hourglass,
  Timer,
  Flag,
  Zap,
  CircleDot,
  User,
  XCircle,
  ArrowUpRight,
  Share2,
  Loader2,
  CircleCheck,
  CircleX,
  Edit,
  RotateCcw,
  Building,
  CalendarDays,
  UserCheck,
  Gauge,
  ShieldAlert,
  Eye,
} from 'lucide-react';
import { formatDate, formatDateTime, getInitials, formatCurrency } from './shared';

// ─── Type Config ─────────────────────────────────────────────────────────────
const typeConfig: Record<string, {
  icon: React.ElementType;
  color: string;
  label: string;
  iconBg: string;
  iconText: string;
  glow: 'emerald' | 'amber' | 'cyan' | 'violet' | 'rose' | 'orange' | 'teal' | 'slate';
}> = {
  'leave': { icon: Palmtree, color: 'emerald', label: 'Leave', iconBg: 'bg-emerald-500/20', iconText: 'text-emerald-400', glow: 'emerald' },
  'expense': { icon: DollarSign, color: 'amber', label: 'Expense', iconBg: 'bg-amber-500/20', iconText: 'text-amber-400', glow: 'amber' },
  'asset': { icon: Monitor, color: 'cyan', label: 'Asset', iconBg: 'bg-cyan-500/20', iconText: 'text-cyan-400', glow: 'cyan' },
  'shift-swap': { icon: ArrowLeftRight, color: 'violet', label: 'Shift Swap', iconBg: 'bg-violet-500/20', iconText: 'text-violet-400', glow: 'cyan' },
  'training': { icon: GraduationCap, color: 'blue', label: 'Training', iconBg: 'bg-blue-500/20', iconText: 'text-blue-400', glow: 'cyan' },
  'equipment': { icon: Wrench, color: 'orange', label: 'Equipment', iconBg: 'bg-orange-500/20', iconText: 'text-orange-400', glow: 'amber' },
  'travel': { icon: Plane, color: 'rose', label: 'Travel', iconBg: 'bg-rose-500/20', iconText: 'text-rose-400', glow: 'rose' },
  'it-support': { icon: Headphones, color: 'teal', label: 'IT Support', iconBg: 'bg-teal-500/20', iconText: 'text-teal-400', glow: 'cyan' },
};

// ─── Status Config ────────────────────────────────────────────────────────────
const statusConfig: Record<string, {
  label: string;
  color: string;
  bg: string;
  border: string;
  glow: 'cyan' | 'amber' | 'emerald' | 'rose' | 'slate' | 'orange';
}> = {
  pending: { label: 'Pending', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', glow: 'amber' },
  'under-review': { label: 'Under Review', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', glow: 'cyan' },
  approved: { label: 'Approved', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'emerald' },
  rejected: { label: 'Rejected', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', glow: 'rose' },
  cancelled: { label: 'Cancelled', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', glow: 'slate' },
  escalated: { label: 'Escalated', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', glow: 'rose' },
};

// ─── Priority Config ──────────────────────────────────────────────────────────
const priorityConfig: Record<string, {
  color: string;
  bg: string;
  border: string;
  label: string;
  icon: React.ReactNode;
}> = {
  low: { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', label: 'Low', icon: <Flag className="h-3 w-3" /> },
  medium: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', label: 'Medium', icon: <Flag className="h-3 w-3" /> },
  high: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'High', icon: <Zap className="h-3 w-3" /> },
  urgent: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', label: 'Urgent', icon: <Zap className="h-3 w-3" /> },
};

// ─── SLA Config ───────────────────────────────────────────────────────────────
const SLA_CONFIG: Record<string, {
  days: number;
  color: string;
  bg: string;
  label: string;
  glow: 'rose' | 'amber' | 'cyan' | 'slate';
}> = {
  urgent: { days: 1, color: 'text-rose-400', bg: 'bg-rose-500/20', label: '1 Day', glow: 'rose' },
  high: { days: 3, color: 'text-amber-400', bg: 'bg-amber-500/20', label: '3 Days', glow: 'amber' },
  medium: { days: 7, color: 'text-cyan-400', bg: 'bg-cyan-500/20', label: '7 Days', glow: 'cyan' },
  low: { days: 14, color: 'text-slate-400', bg: 'bg-slate-500/20', label: '14 Days', glow: 'slate' },
};

// ─── Approval Workflow Steps ──────────────────────────────────────────────────
const WORKFLOW_STEPS: Array<{ key: Request['status']; label: string; icon: React.ElementType }> = [
  { key: 'pending', label: 'Submitted', icon: FileText },
  { key: 'under-review', label: 'Under Review', icon: Eye },
  { key: 'approved', label: 'Approved', icon: CheckCircle2 },
];

// ─── Local Comment Interface ──────────────────────────────────────────────────
interface LocalComment {
  id: string;
  userName: string;
  content: string;
  timestamp: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(date?: string | null): string {
  if (!date) return '—';
  try {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return formatDate(date);
  } catch {
    return date;
  }
}

function getDaysSinceSubmitted(date: string): number {
  const diff = Date.now() - new Date(date).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}


function getAvatarGradient(name: string): string {
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

function getWorkflowStepIndex(status: Request['status']): number {
  if (status === 'rejected') return 2;
  if (status === 'cancelled') return 0;
  if (status === 'escalated') return 1;
  const idx = WORKFLOW_STEPS.findIndex(s => s.key === status);
  return idx >= 0 ? idx : 0;
}

function getSLAStatus(request: Request): {
  pct: number;
  isBreached: boolean;
  isAtRisk: boolean;
  daysRemaining: number;
  label: string;
} {
  const sla = SLA_CONFIG[request.priority];
  if (!sla || request.status === 'approved' || request.status === 'rejected' || request.status === 'cancelled') {
    return { pct: 100, isBreached: false, isAtRisk: false, daysRemaining: Infinity, label: 'Completed' };
  }
  const created = new Date(request.createdAt);
  const due = new Date(created.getTime() + sla.days * 24 * 60 * 60 * 1000);
  const now = Date.now();
  const total = sla.days * 24 * 60 * 60 * 1000;
  const elapsed = now - created.getTime();
  const pct = Math.min(100, (elapsed / total) * 100);
  const daysRemaining = Math.ceil((due.getTime() - now) / (1000 * 60 * 60 * 24));
  const isBreached = daysRemaining < 0;
  const isAtRisk = daysRemaining >= 0 && daysRemaining <= 1;
  return {
    pct,
    isBreached,
    isAtRisk,
    daysRemaining,
    label: isBreached ? 'Breached' : isAtRisk ? 'At Risk' : 'On Track',
  };
}

function getApprovalProbability(request: Request): number {
  if (request.status === 'approved') return 100;
  if (request.status === 'rejected') return 0;
  if (request.status === 'cancelled') return 0;
  // Simple heuristic based on priority and status
  const priorityScores: Record<string, number> = { low: 80, medium: 70, high: 60, urgent: 50 };
  const statusBoost: Record<string, number> = { pending: 0, 'under-review': 15, escalated: -10 };
  const base = priorityScores[request.priority] ?? 65;
  const boost = statusBoost[request.status] ?? 0;
  return Math.max(5, Math.min(95, base + boost));
}


// ─── Main Component ──────────────────────────────────────────────────────────
export function EmployeeRequestDetailView() {
  const {
    user,
    requests,
    updateRequest,
    departments,
    setSelectedRequestId,
    selectedRequestId,
    setActiveView,
  } = useEMSStore();

  // Local state
  const [commentText, setCommentText] = useState('');
  const [localComments, setLocalComments] = useState<LocalComment[]>([]);
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);
  const [escalateForm, setEscalateForm] = useState({ reason: '', urgency: 'high' as 'low' | 'medium' | 'high' | 'urgent' });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '', priority: 'medium' as Request['priority'] });
  const [cancelling, setCancelling] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Find the request
  const request = useMemo(() => {
    if (!selectedRequestId) return null;
    return requests.find(r => r.id === selectedRequestId) || null;
  }, [selectedRequestId, requests]);

  // ─── Derived Data ─────────────────────────────────────────────────────────
  const daysSinceSubmitted = request ? getDaysSinceSubmitted(request.createdAt) : 0;
  const slaStatus = request ? getSLAStatus(request) : null;
  const workflowStepIndex = request ? getWorkflowStepIndex(request.status) : 0;
  const approvalProbability = request ? getApprovalProbability(request) : 0;
  const isOwner = request && user ? request.userId === user.id : false;
  const slaConfig = request ? SLA_CONFIG[request.priority] || SLA_CONFIG.medium : SLA_CONFIG.medium;

  // Related requests (same type, excluding current)
  const relatedRequests = useMemo(() => {
    if (!request) return [];
    return requests
      .filter(r => r.type === request.type && r.id !== request.id)
      .slice(0, 5);
  }, [requests, request]);

  // Activity timeline
  const activityTimeline = useMemo(() => {
    if (!request) return [];
    const items: Array<{
      id: string;
      type: string;
      message: string;
      timestamp: string;
      color: string;
      icon: React.ReactNode;
    }> = [];

    // Submitted
    items.push({
      id: `${request.id}-submitted`,
      type: 'submitted',
      message: 'Request submitted',
      timestamp: request.createdAt,
      color: 'text-cyan-400',
      icon: <FileText className="h-3.5 w-3.5" />,
    });

    // Under review
    if (request.status === 'under-review' || request.status === 'approved' || request.status === 'rejected' || request.status === 'escalated') {
      items.push({
        id: `${request.id}-under-review`,
        type: 'under-review',
        message: 'Request under review',
        timestamp: request.updatedAt || request.createdAt,
        color: 'text-amber-400',
        icon: <Eye className="h-3.5 w-3.5" />,
      });
    }

    // Escalated
    if (request.escalatedAt) {
      items.push({
        id: `${request.id}-escalated`,
        type: 'escalated',
        message: `Escalated${request.escalatedBy ? ' by ' + request.escalatedBy : ''}`,
        timestamp: request.escalatedAt,
        color: 'text-orange-400',
        icon: <ArrowUpRight className="h-3.5 w-3.5" />,
      });
    }

    // Approved
    if (request.status === 'approved' && request.resolvedAt) {
      items.push({
        id: `${request.id}-approved`,
        type: 'approved',
        message: `Approved${request.reviewerName ? ' by ' + request.reviewerName : ''}`,
        timestamp: request.resolvedAt,
        color: 'text-emerald-400',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      });
    }

    // Rejected
    if (request.status === 'rejected' && request.resolvedAt) {
      items.push({
        id: `${request.id}-rejected`,
        type: 'rejected',
        message: `Rejected${request.reviewerName ? ' by ' + request.reviewerName : ''}`,
        timestamp: request.resolvedAt,
        color: 'text-rose-400',
        icon: <XCircle className="h-3.5 w-3.5" />,
      });
    }

    // Cancelled
    if (request.cancelledAt) {
      items.push({
        id: `${request.id}-cancelled`,
        type: 'cancelled',
        message: 'Request cancelled',
        timestamp: request.cancelledAt,
        color: 'text-slate-400',
        icon: <CircleX className="h-3.5 w-3.5" />,
      });
    }

    // SLA breach warning
    if (slaStatus?.isBreached && request.status !== 'approved' && request.status !== 'rejected' && request.status !== 'cancelled') {
      items.push({
        id: `${request.id}-sla-breach`,
        type: 'sla-breach',
        message: 'SLA breached — review overdue',
        timestamp: new Date().toISOString(),
        color: 'text-rose-400',
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
      });
    }

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [request, slaStatus]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const goBack = useCallback(() => {
    setSelectedRequestId(null);
    setActiveView('requests');
  }, [setSelectedRequestId, setActiveView]);

  const handleAddComment = useCallback(() => {
    if (!commentText.trim()) return;
    const newComment: LocalComment = {
      id: `lc-${Date.now()}`,
      userName: user?.name || 'You',
      content: commentText.trim(),
      timestamp: new Date().toISOString(),
    };
    setLocalComments(prev => [...prev, newComment]);
    setCommentText('');
    toast.success('Comment added');
  }, [commentText, user]);

  const handleCancel = useCallback(async () => {
    if (!request) return;
    setCancelling(true);
    try {
      await updateRequest(request.id, 'cancelled');
      toast.success('Request cancelled');
    } catch {
      toast.error('Failed to cancel request');
    } finally {
      setCancelling(false);
    }
  }, [request, updateRequest]);

  const handleResubmit = useCallback(async () => {
    if (!request) return;
    try {
      await updateRequest(request.id, 'pending');
      toast.success('Request resubmitted');
    } catch {
      toast.error('Failed to resubmit request');
    }
  }, [request, updateRequest]);

  const handleEscalate = useCallback(async () => {
    if (!request || !escalateForm.reason.trim()) {
      toast.error('Please provide an escalation reason');
      return;
    }
    setEscalating(true);
    try {
      await updateRequest(request.id, 'escalated', escalateForm.reason);
      setEscalateDialogOpen(false);
      setEscalateForm({ reason: '', urgency: 'high' });
      toast.success('Request escalated');
    } catch {
      toast.error('Failed to escalate request');
    } finally {
      setEscalating(false);
    }
  }, [request, escalateForm, updateRequest]);

  const handleOpenEdit = useCallback(() => {
    if (!request) return;
    setEditForm({
      title: request.title,
      description: request.description,
      priority: request.priority,
    });
    setEditDialogOpen(true);
  }, [request]);

  const handleSaveEdit = useCallback(async () => {
    if (!request || !editForm.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    try {
      // Use updateRequest — we can only update status via the store,
      // but we'll update via the API directly for full edit
      const res = await fetch('/api/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: request.id,
          title: editForm.title.trim(),
          description: editForm.description.trim(),
          priority: editForm.priority.toUpperCase(),
        }),
      });
      if (!res.ok) throw new Error('Failed to update');
      // Reload requests
      await useEMSStore.getState().loadRequests();
      setEditDialogOpen(false);
      toast.success('Request updated');
    } catch {
      toast.error('Failed to update request');
    } finally {
      setSaving(false);
    }
  }, [request, editForm]);

  const handleShare = useCallback(() => {
    if (!request) return;
    const shareText = `Request: ${request.title}\nType: ${typeConfig[request.type]?.label || request.type}\nStatus: ${request.status}\nPriority: ${request.priority}\nCreated: ${formatDate(request.createdAt)}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      toast.success('Request details copied to clipboard');
    }
  }, [request]);

  // ─── Animation Config ──────────────────────────────────────────────────────
  const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

  // ─── Not Found State ──────────────────────────────────────────────────────
  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="h-12 w-12 text-rose-400/50" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Request not found</p>
          <p className="text-xs text-muted-foreground mt-1">The request may have been deleted or the link is invalid.</p>
        </div>
        <Button variant="outline" size="sm" onClick={goBack} className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-cyan-500/10">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Requests
        </Button>
      </div>
    );
  }

  const reqTypeConfig = typeConfig[request.type] || typeConfig['it-support'];
  const reqStatusConfig = statusConfig[request.status] || statusConfig.pending;
  const reqPriorityConfig = priorityConfig[request.priority] || priorityConfig.medium;
  const departmentName = request.departmentName || departments.find(d => d.id === request.departmentId)?.name || '—';
  const isClosed = request.status === 'approved' || request.status === 'rejected' || request.status === 'cancelled';
  const TypeIcon = reqTypeConfig.icon;

  // Quick actions based on status
  const getQuickActions = () => {
    const actions: Array<{
      label: string;
      icon: React.ReactNode;
      onClick: () => void;
      variant: 'default' | 'outline';
      className: string;
    }> = [];

    if (request.status === 'pending') {
      actions.push({
        label: 'Edit',
        icon: <Edit className="h-3.5 w-3.5" />,
        onClick: handleOpenEdit,
        variant: 'outline',
        className: 'border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10',
      });
      actions.push({
        label: 'Cancel',
        icon: <CircleX className="h-3.5 w-3.5" />,
        onClick: handleCancel,
        variant: 'outline',
        className: 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10',
      });
    }

    if (request.status === 'rejected') {
      actions.push({
        label: 'Resubmit',
        icon: <RotateCcw className="h-3.5 w-3.5" />,
        onClick: handleResubmit,
        variant: 'default',
        className: 'bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white',
      });
    }

    if (request.status === 'pending' || request.status === 'under-review') {
      actions.push({
        label: 'Escalate',
        icon: <ArrowUpRight className="h-3.5 w-3.5" />,
        onClick: () => setEscalateDialogOpen(true),
        variant: 'outline',
        className: 'border-orange-500/30 text-orange-400 hover:bg-orange-500/10',
      });
    }

    if (user?.role === 'admin' || user?.role === 'manager') {
      if (request.status === 'pending' || request.status === 'under-review' || request.status === 'escalated') {
        actions.push({
          label: 'Approve',
          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
          onClick: async () => {
            try {
              await updateRequest(request.id, 'approved', 'Approved by ' + user.role);
              toast.success('Request approved');
            } catch {
              toast.error('Failed to approve request');
            }
          },
          variant: 'default',
          className: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white',
        });
        actions.push({
          label: 'Reject',
          icon: <XCircle className="h-3.5 w-3.5" />,
          onClick: async () => {
            try {
              await updateRequest(request.id, 'rejected', 'Rejected by ' + user.role);
              toast.success('Request rejected');
            } catch {
              toast.error('Failed to reject request');
            }
          },
          variant: 'outline',
          className: 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10',
        });
      }
    }

    return actions;
  };

  const quickActions = getQuickActions();

  return (
    <div className="space-y-6 pb-4">
      {/* ═══ TOP NAVIGATION BAR ═══ */}
      <motion.div {...fadeIn} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={goBack}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group shrink-0"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              <span className="hidden sm:inline">Requests</span>
            </button>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
            <span className="text-sm text-muted-foreground truncate">Request Detail</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleShare} className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]">
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ═══ REQUEST HEADER SECTION ═══ */}
      <motion.div {...fadeIn} transition={{ delay: 0.05, duration: 0.4 }}>
        <GlassCard className="p-5 sm:p-6" glow={reqTypeConfig.glow}>
          <div className="space-y-4">
            {/* Title + Type Icon */}
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className={cn('rounded-lg p-2.5 shrink-0', reqTypeConfig.iconBg)}>
                  <TypeIcon className={cn('h-5 w-5', reqTypeConfig.iconText)} />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold text-white break-words leading-tight">
                    {request.title}
                  </h1>
                </div>
              </div>

              {/* Badges row */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={cn('text-xs font-medium gap-1', reqTypeConfig.iconBg, reqTypeConfig.iconText)}>
                  {reqTypeConfig.label}
                </Badge>
                <StatusBadge status={request.status} />
                <StatusBadge status={request.priority} />
                {request.amount !== undefined && request.amount !== null && (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs font-medium gap-1">
                    <DollarSign className="h-3 w-3" />
                    {formatCurrency(request.amount)}
                  </Badge>
                )}
                {request.status === 'escalated' && (
                  <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs font-medium gap-1">
                    <ArrowUpRight className="h-3 w-3" /> Escalated
                  </Badge>
                )}
              </div>

              {/* Quick action buttons */}
              {quickActions.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {quickActions.map((action, i) => (
                    <Button
                      key={i}
                      size="sm"
                      variant={action.variant}
                      onClick={action.onClick}
                      disabled={action.label === 'Cancel' && cancelling}
                      className={cn('gap-1.5 text-xs', action.className)}
                    >
                      {action.label === 'Cancel' && cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : action.icon}
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}

              {/* Meta info row */}
              <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  Created {formatDate(request.createdAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Updated {formatRelativeTime(request.updatedAt || request.createdAt)}
                </span>
                <span className="font-mono text-muted-foreground/50">
                  ID: {request.id.slice(0, 8)}
                </span>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ═══ 4-CARD STATS ROW ═══ */}
      <motion.div {...fadeIn} transition={{ delay: 0.1, duration: 0.4 }}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Days Since Submitted"
            value={`${daysSinceSubmitted}d`}
            icon={Hourglass}
            color={daysSinceSubmitted > 7 ? 'rose' : daysSinceSubmitted > 3 ? 'amber' : 'cyan'}
            hero
            progressRing={{ value: daysSinceSubmitted, max: Math.max(daysSinceSubmitted * 2, 14) }}
            subtitle="Since creation"
          />
          <StatCard
            title="SLA Status"
            value={slaStatus?.label || '—'}
            icon={slaStatus?.isBreached ? AlertTriangle : slaStatus?.isAtRisk ? AlertOctagon : CheckCircle2}
            color={slaStatus?.isBreached ? 'rose' : slaStatus?.isAtRisk ? 'amber' : 'emerald'}
            hero
            progressRing={{ value: slaStatus?.isBreached ? 100 : slaStatus?.isAtRisk ? 75 : slaStatus?.pct || 0, max: 100 }}
            subtitle={slaConfig.label + ' SLA'}
          />
          <StatCard
            title="Processing Time"
            value={request.resolvedAt ? (() => {
              const diffMs = new Date(request.resolvedAt).getTime() - new Date(request.createdAt).getTime();
              const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
              const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
              return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
            })() : 'Awaiting Review'}
            icon={Timer}
            color={request.resolvedAt ? 'emerald' : 'amber'}
            hero
            progressRing={{ value: daysSinceSubmitted, max: Math.max(daysSinceSubmitted * 2, 14) }}
            subtitle={isClosed ? 'Resolved' : 'Pending'}
          />
          <StatCard
            title="Approval Probability"
            value={`${approvalProbability}%`}
            icon={Gauge}
            color={approvalProbability >= 70 ? 'emerald' : approvalProbability >= 40 ? 'amber' : 'rose'}
            hero
            progressRing={{ value: approvalProbability, max: 100 }}
            subtitle={isClosed ? (request.status === 'approved' ? 'Approved' : request.status === 'rejected' ? 'Rejected' : 'Closed') : 'Estimated'}
          />
        </div>
      </motion.div>

      {/* ═══ MAIN CONTENT: 2-COLUMN LAYOUT ═══ */}
      <motion.div {...fadeIn} transition={{ delay: 0.15, duration: 0.4 }}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── LEFT COLUMN (2/3) ─── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <GlassCard className="p-5 sm:p-6">
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Description
                </h2>
                {request.description ? (
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {request.description}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground/40 italic">No description provided</p>
                )}
              </div>
            </GlassCard>

            {/* Approval Workflow */}
            <GlassCard className="p-5 sm:p-6">
              <div className="space-y-4">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Approval Workflow
                </h2>
                {/* Horizontal stepper */}
                <div className="flex items-center gap-0 w-full overflow-x-auto pb-2">
                  {WORKFLOW_STEPS.map((step, i) => {
                    const isCompleted = i < workflowStepIndex;
                    const isCurrent = i === workflowStepIndex;
                    const isPending = i > workflowStepIndex;
                    const StepIcon = step.icon;

                    return (
                      <div key={step.key} className="flex items-center flex-1 min-w-0">
                        {/* Step node */}
                        <div className="flex flex-col items-center gap-1.5 shrink-0">
                          <div
                            className={cn(
                              'h-9 w-9 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                              isCompleted && 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
                              isCurrent && cn(
                                'bg-amber-500/20 border-amber-500/50 text-amber-400',
                                request.status === 'escalated' && 'bg-orange-500/20 border-orange-500/50 text-orange-400',
                                request.status === 'rejected' && 'bg-rose-500/20 border-rose-500/50 text-rose-400',
                                isClosed && 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
                              ),
                              isPending && 'bg-slate-500/10 border-slate-500/20 text-slate-500/60',
                            )}
                          >
                            {request.status === 'rejected' && isCurrent ? (
                              <XCircle className="h-4 w-4" />
                            ) : (
                              <StepIcon className="h-4 w-4" />
                            )}
                          </div>
                          <span
                            className={cn(
                              'text-[10px] font-medium text-center whitespace-nowrap',
                              isCompleted && 'text-emerald-400',
                              isCurrent && cn(
                                'text-amber-400',
                                request.status === 'escalated' && 'text-orange-400',
                                request.status === 'rejected' && 'text-rose-400',
                                isClosed && 'text-emerald-400',
                              ),
                              isPending && 'text-muted-foreground/40',
                            )}
                          >
                            {step.label}
                          </span>
                        </div>
                        {/* Connector line */}
                        {i < WORKFLOW_STEPS.length - 1 && (
                          <div
                            className={cn(
                              'flex-1 h-0.5 mx-1 min-w-[20px]',
                              i < workflowStepIndex ? 'bg-emerald-500/30' : 'bg-black/[0.04] dark:bg-white/[0.06]',
                            )}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Status-specific indicators */}
                {request.status === 'escalated' && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <ArrowUpRight className="h-4 w-4 text-orange-400" />
                    <span className="text-xs text-orange-400 font-medium">
                      This request has been escalated and is receiving priority attention
                    </span>
                  </div>
                )}
                {request.status === 'rejected' && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                    <XCircle className="h-4 w-4 text-rose-400" />
                    <span className="text-xs text-rose-400 font-medium">
                      This request has been rejected. You may resubmit with updated information.
                    </span>
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Review Comment */}
            {request.reviewComment && (
              <GlassCard className="p-5 sm:p-6" glow={request.status === 'approved' ? 'emerald' : request.status === 'rejected' ? 'rose' : undefined}>
                <div className="space-y-3">
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    {request.status === 'approved' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : request.status === 'rejected' ? (
                      <XCircle className="h-4 w-4 text-rose-400" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                    Review Comment
                  </h2>
                  <div className={cn(
                    'rounded-lg border p-4',
                    request.status === 'approved' ? 'bg-emerald-500/5 border-emerald-500/10' :
                    request.status === 'rejected' ? 'bg-rose-500/5 border-rose-500/10' :
                    'bg-black/[0.02] dark:bg-white/[0.03] border-black/[0.05] dark:border-white/[0.05]'
                  )}>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {request.reviewComment}
                    </p>
                  </div>
                </div>
              </GlassCard>
            )}

            {/* Conversation/Comments Section */}
            <GlassCard className="p-5 sm:p-6">
              <div className="space-y-4">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Conversation
                  {localComments.length > 0 && (
                    <Badge variant="outline" className="bg-black/[0.03] dark:bg-white/[0.05] text-muted-foreground border-black/[0.1] dark:border-white/[0.1] text-[10px] ml-1">
                      {localComments.length}
                    </Badge>
                  )}
                </h2>

                {/* Comments list */}
                <ScrollArea className="max-h-72">
                  {localComments.length > 0 ? (
                    <div className="space-y-3 pr-2">
                      {localComments.map((comment) => (
                        <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05]">
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarFallback className={cn('text-[10px] font-bold bg-gradient-to-br text-white', getAvatarGradient(comment.userName || 'U'))}>
                              {getInitials(comment.userName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-foreground">{comment.userName}</span>
                              <span className="text-[10px] text-muted-foreground/60">{formatRelativeTime(comment.timestamp)}</span>
                            </div>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground/40 italic py-4 text-center">No comments yet. Start the conversation.</p>
                  )}
                </ScrollArea>

                {/* Add comment */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                    className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-cyan-500/30 h-9 text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddComment}
                    disabled={!commentText.trim()}
                    className="gap-1.5 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white shrink-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </GlassCard>

            {/* Activity Timeline */}
            <GlassCard className="p-5 sm:p-6">
              <div className="space-y-4">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Activity Timeline
                </h2>
                <div className="space-y-0">
                  {activityTimeline.map((item, i) => (
                    <div key={item.id} className="flex gap-3 relative">
                      {/* Timeline line */}
                      {i < activityTimeline.length - 1 && (
                        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-black/[0.04] dark:bg-white/[0.06]" />
                      )}
                      {/* Icon */}
                      <div className={cn('h-6 w-6 rounded-full flex items-center justify-center shrink-0 z-10', item.color.replace('text-', 'bg-').replace(/-\d+$/, '-500/20'))}>
                        {item.icon}
                      </div>
                      {/* Content */}
                      <div className="pb-4 min-w-0 flex-1">
                        <p className="text-sm text-foreground">{item.message}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{formatDateTime(item.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </div>

          {/* ─── RIGHT COLUMN (1/3) ─── */}
          <div className="space-y-6">
            {/* Details Card */}
            <GlassCard className="p-5 sm:p-6">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <CircleDot className="h-4 w-4" /> Details
              </h2>
              <div className="space-y-4">
                {/* Type */}
                <div className="flex items-center gap-3">
                  <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', reqTypeConfig.iconBg)}>
                    <TypeIcon className={cn('h-4 w-4', reqTypeConfig.iconText)} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="text-sm text-foreground">{reqTypeConfig.label}</p>
                  </div>
                </div>

                <Separator className="bg-black/[0.04] dark:bg-white/[0.06]" />

                {/* Department */}
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <Building className="h-4 w-4 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Department</p>
                    <p className="text-sm text-foreground">{departmentName}</p>
                  </div>
                </div>

                <Separator className="bg-black/[0.04] dark:bg-white/[0.06]" />

                {/* Reviewer */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={cn('text-xs font-bold bg-gradient-to-br text-white', request.reviewerName ? getAvatarGradient(request.reviewerName) : 'from-slate-500 to-slate-600')}>
                      {request.reviewerName ? getInitials(request.reviewerName) : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs text-muted-foreground">Reviewer</p>
                    <p className="text-sm text-foreground">{request.reviewerName || 'Not assigned'}</p>
                  </div>
                </div>

                <Separator className="bg-black/[0.04] dark:bg-white/[0.06]" />

                {/* Amount */}
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="text-sm text-foreground">{request.amount !== undefined && request.amount !== null ? formatCurrency(request.amount) : '—'}</p>
                  </div>
                </div>

                <Separator className="bg-black/[0.04] dark:bg-white/[0.06]" />

                {/* Due Date */}
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <CalendarDays className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Due Date</p>
                    <p className="text-sm text-foreground">{request.dueDate ? formatDate(request.dueDate) : '—'}</p>
                  </div>
                </div>

                <Separator className="bg-black/[0.04] dark:bg-white/[0.06]" />

                {/* Created / Updated dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Created</p>
                    <p className="text-xs text-foreground mt-0.5">{formatDate(request.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Updated</p>
                    <p className="text-xs text-foreground mt-0.5">{formatRelativeTime(request.updatedAt || request.createdAt)}</p>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* SLA Card */}
            <GlassCard className="p-5 sm:p-6" glow={slaStatus?.isBreached ? 'rose' : slaStatus?.isAtRisk ? 'amber' : undefined}>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" /> SLA Tracking
              </h2>
              <div className="space-y-4">
                {/* SLA progress bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Time Elapsed</span>
                    <span className={cn(
                      'font-medium',
                      slaStatus?.isBreached ? 'text-rose-400' :
                      slaStatus?.isAtRisk ? 'text-amber-400' :
                      'text-emerald-400'
                    )}>
                      {Math.round(slaStatus?.pct ?? 0)}%
                    </span>
                  </div>
                  <Progress
                    value={Math.min(slaStatus?.pct ?? 0, 100)}
                    className={cn(
                      'h-2',
                      slaStatus?.isBreached ? '[&>div]:bg-rose-500' :
                      slaStatus?.isAtRisk ? '[&>div]:bg-amber-500' :
                      '[&>div]:bg-emerald-500'
                    )}
                  />
                </div>

                {/* SLA details */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Priority SLA</p>
                    <p className={cn('text-sm font-medium mt-0.5', slaConfig.color)}>{slaConfig.label}</p>
                  </div>
                  <div className="rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Days Left</p>
                    <p className={cn(
                      'text-sm font-medium mt-0.5',
                      slaStatus?.isBreached ? 'text-rose-400' :
                      slaStatus?.isAtRisk ? 'text-amber-400' :
                      'text-emerald-400'
                    )}>
                      {isClosed ? '—' : (slaStatus?.daysRemaining === Infinity ? '∞' : slaStatus?.isBreached ? `${Math.abs(slaStatus.daysRemaining)}d overdue` : `${slaStatus?.daysRemaining}d`)}
                    </p>
                  </div>
                </div>

                {/* SLA status indicator */}
                <div className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border',
                  slaStatus?.isBreached ? 'bg-rose-500/10 border-rose-500/20' :
                  slaStatus?.isAtRisk ? 'bg-amber-500/10 border-amber-500/20' :
                  'bg-emerald-500/10 border-emerald-500/20'
                )}>
                  {slaStatus?.isBreached ? (
                    <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                  ) : slaStatus?.isAtRisk ? (
                    <AlertOctagon className="h-4 w-4 text-amber-400 shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  )}
                  <span className={cn(
                    'text-xs font-medium',
                    slaStatus?.isBreached ? 'text-rose-400' :
                    slaStatus?.isAtRisk ? 'text-amber-400' :
                    'text-emerald-400'
                  )}>
                    {slaStatus?.isBreached ? 'SLA Breached — Immediate attention required' :
                     slaStatus?.isAtRisk ? 'SLA At Risk — Approaching deadline' :
                     isClosed ? 'SLA Met — Completed within target' :
                     'SLA On Track — Within target'}
                  </span>
                </div>
              </div>
            </GlassCard>

            {/* Priority & Status Visual */}
            <GlassCard className="p-5 sm:p-6">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Flag className="h-4 w-4" /> Priority & Status
              </h2>
              <div className="space-y-4">
                {/* Priority */}
                <div className={cn('rounded-lg border p-4', reqPriorityConfig.bg, reqPriorityConfig.border)}>
                  <div className="flex items-center gap-2 mb-2">
                    {reqPriorityConfig.icon}
                    <span className={cn('text-sm font-medium', reqPriorityConfig.color)}>
                      {reqPriorityConfig.label} Priority
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                      <div
                        key={p}
                        className={cn(
                          'h-1.5 flex-1 rounded-full transition-all',
                          p === request.priority
                            ? cn(
                                p === 'urgent' ? 'bg-rose-400' :
                                p === 'high' ? 'bg-amber-400' :
                                p === 'medium' ? 'bg-cyan-400' :
                                'bg-slate-400'
                              )
                            : 'bg-black/[0.04] dark:bg-white/[0.06]'
                        )}
                      />
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div className={cn('rounded-lg border p-4', reqStatusConfig.bg, reqStatusConfig.border)}>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'h-2.5 w-2.5 rounded-full',
                      request.status === 'approved' ? 'bg-emerald-400' :
                      request.status === 'rejected' ? 'bg-rose-400' :
                      request.status === 'pending' ? 'bg-amber-400' :
                      request.status === 'under-review' ? 'bg-cyan-400' :
                      request.status === 'escalated' ? 'bg-orange-400' :
                      'bg-slate-400',
                      request.status === 'pending' || request.status === 'under-review' || request.status === 'escalated' ? 'animate-pulse' : ''
                    )} />
                    <span className={cn('text-sm font-medium', reqStatusConfig.color)}>
                      {reqStatusConfig.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {request.status === 'pending' && 'Your request is waiting to be reviewed.'}
                    {request.status === 'under-review' && 'Your request is currently being reviewed.'}
                    {request.status === 'approved' && 'Your request has been approved.'}
                    {request.status === 'rejected' && 'Your request has been rejected. You may resubmit.'}
                    {request.status === 'cancelled' && 'This request has been cancelled.'}
                    {request.status === 'escalated' && 'This request has been escalated for priority handling.'}
                  </p>
                </div>
              </div>
            </GlassCard>

            {/* Review Info */}
            {request.reviewerName && isClosed && (
              <GlassCard className="p-5 sm:p-6">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <UserCheck className="h-4 w-4" /> Review Info
                </h2>
                <div className="space-y-4">
                  {/* Reviewer */}
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className={cn('text-xs font-bold bg-gradient-to-br text-white', getAvatarGradient(request.reviewerName))}>
                        {getInitials(request.reviewerName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs text-muted-foreground">Reviewed by</p>
                      <p className="text-sm text-foreground">{request.reviewerName}</p>
                    </div>
                  </div>

                  <Separator className="bg-black/[0.04] dark:bg-white/[0.06]" />

                  {/* Review comment */}
                  {request.reviewComment && (
                    <div className="rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] p-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Comment</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{request.reviewComment}</p>
                    </div>
                  )}

                  {/* Review date */}
                  {request.resolvedAt && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Reviewed {formatDateTime(request.resolvedAt)}
                    </div>
                  )}
                </div>
              </GlassCard>
            )}

            {/* Related Requests */}
            {relatedRequests.length > 0 && (
              <GlassCard className="p-5 sm:p-6">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <CircleDot className="h-4 w-4" /> Related Requests
                </h2>
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {relatedRequests.map((rel) => {
                    const relTypeConfig = typeConfig[rel.type] || typeConfig['it-support'];
                    const RelIcon = relTypeConfig.icon;
                    return (
                      <button
                        key={rel.id}
                        onClick={() => {
                          setSelectedRequestId(rel.id);
                          setLocalComments([]);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors text-left group"
                      >
                        <div className={cn('rounded-md p-1.5 shrink-0', relTypeConfig.iconBg)}>
                          <RelIcon className={cn('h-3.5 w-3.5', relTypeConfig.iconText)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate group-hover:text-cyan-400 transition-colors">
                            {rel.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <StatusBadge status={rel.status} className="text-[9px] px-1.5 py-0" />
                          </div>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0 transition-colors" />
                      </button>
                    );
                  })}
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      </motion.div>

      {/* ═══ ACTION BAR ═══ */}
      <motion.div {...fadeIn} transition={{ delay: 0.2, duration: 0.4 }}>
        <GlassCard className="p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {request.status === 'pending' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="gap-1.5 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                >
                  {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CircleX className="h-3.5 w-3.5" />}
                  Cancel Request
                </Button>
              )}
              {request.status === 'rejected' && (
                <Button
                  size="sm"
                  onClick={handleResubmit}
                  className="gap-1.5 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Resubmit
                </Button>
              )}
              {(request.status === 'pending' || request.status === 'under-review') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEscalateDialogOpen(true)}
                  className="gap-1.5 border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Escalate
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={goBack}
              className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to List
            </Button>
          </div>
        </GlassCard>
      </motion.div>

      {/* ═══ ESCALATE DIALOG ═══ */}
      <Dialog open={escalateDialogOpen} onOpenChange={setEscalateDialogOpen}>
        <DialogContent className="sm:max-w-[480px] bg-background/95 border-border backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-orange-400" />
              Escalate Request
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Escalate this request for priority attention. Provide a reason for the escalation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Reason for Escalation</label>
              <Textarea
                placeholder="Describe why this request needs to be escalated..."
                value={escalateForm.reason}
                onChange={(e) => setEscalateForm(prev => ({ ...prev, reason: e.target.value }))}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-orange-500/30 min-h-[100px] text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Urgency Level</label>
              <Select
                value={escalateForm.urgency}
                onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') =>
                  setEscalateForm(prev => ({ ...prev, urgency: value }))
                }
              >
                <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-orange-500/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEscalateDialogOpen(false)}
              className="border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEscalate}
              disabled={escalating || !escalateForm.reason.trim()}
              className="gap-1.5 bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-500 hover:to-rose-500 text-white"
            >
              {escalating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
              Escalate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ EDIT DIALOG ═══ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[520px] bg-background/95 border-border backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Edit className="h-5 w-5 text-cyan-400" />
              Edit Request
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update the details of your pending request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-cyan-500/30"
                placeholder="Request title"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-cyan-500/30 min-h-[120px] text-sm"
                placeholder="Describe your request..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Priority</label>
              <Select
                value={editForm.priority}
                onValueChange={(value: Request['priority']) =>
                  setEditForm(prev => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-cyan-500/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={saving || !editForm.title.trim()}
              className="gap-1.5 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
