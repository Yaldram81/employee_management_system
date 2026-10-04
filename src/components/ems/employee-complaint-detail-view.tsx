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
import type { Complaint } from '@/lib/types';
import {
  ArrowLeft,
  ChevronRight,
  Users,
  Monitor,
  Building,
  DollarSign,
  Briefcase,
  Shield,
  MessageSquare,
  HelpCircle,
  Clock,
  Calendar,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Send,
  Activity,
  FileText,
  Eye,
  EyeOff,
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
  Search,
  UserX,
} from 'lucide-react';
import { formatDate, formatDateTime, getInitials } from './shared';

// ─── Category Config ──────────────────────────────────────────────────────────
const categoryConfig: Record<string, {
  icon: React.ElementType;
  color: string;
  label: string;
  iconBg: string;
  iconText: string;
}> = {
  hr: { icon: Users, color: 'emerald', label: 'HR', iconBg: 'bg-emerald-500/20', iconText: 'text-emerald-400' },
  it: { icon: Monitor, color: 'cyan', label: 'IT', iconBg: 'bg-cyan-500/20', iconText: 'text-cyan-400' },
  facilities: { icon: Building, color: 'amber', label: 'Facilities', iconBg: 'bg-amber-500/20', iconText: 'text-amber-400' },
  finance: { icon: DollarSign, color: 'orange', label: 'Finance', iconBg: 'bg-orange-500/20', iconText: 'text-orange-400' },
  management: { icon: Briefcase, color: 'violet', label: 'Management', iconBg: 'bg-violet-500/20', iconText: 'text-violet-400' },
  security: { icon: Shield, color: 'rose', label: 'Security', iconBg: 'bg-rose-500/20', iconText: 'text-rose-400' },
  general: { icon: MessageSquare, color: 'slate', label: 'General', iconBg: 'bg-slate-500/20', iconText: 'text-slate-400' },
  other: { icon: HelpCircle, color: 'teal', label: 'Other', iconBg: 'bg-teal-500/20', iconText: 'text-teal-400' },
};

// ─── Severity Config ──────────────────────────────────────────────────────────
const severityConfig: Record<string, {
  label: string;
  color: string;
  bg: string;
  border: string;
  glow: 'rose' | 'amber' | 'cyan';
}> = {
  normal: { label: 'Normal', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', glow: 'cyan' },
  sensitive: { label: 'Sensitive', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', glow: 'amber' },
  critical: { label: 'Critical', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', glow: 'rose' },
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
  critical: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', label: 'Critical', icon: <Zap className="h-3 w-3" /> },
};

// ─── SLA Config ───────────────────────────────────────────────────────────────
const SLA_CONFIG: Record<string, {
  days: number;
  color: string;
  bg: string;
  label: string;
  glow: 'rose' | 'amber' | 'cyan' | 'slate';
}> = {
  critical: { days: 1, color: 'text-rose-400', bg: 'bg-rose-500/20', label: '1 Day', glow: 'rose' },
  high: { days: 3, color: 'text-amber-400', bg: 'bg-amber-500/20', label: '3 Days', glow: 'amber' },
  medium: { days: 7, color: 'text-cyan-400', bg: 'bg-cyan-500/20', label: '7 Days', glow: 'cyan' },
  low: { days: 14, color: 'text-slate-400', bg: 'bg-slate-500/20', label: '14 Days', glow: 'slate' },
};

// ─── Status Config ────────────────────────────────────────────────────────────
const statusConfig: Record<string, {
  label: string;
  color: string;
  bg: string;
  border: string;
  glow: 'cyan' | 'amber' | 'emerald' | 'rose' | 'slate' | 'orange';
}> = {
  open: { label: 'Open', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', glow: 'cyan' },
  investigating: { label: 'Investigating', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', glow: 'amber' },
  'in-progress': { label: 'In Progress', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', glow: 'amber' },
  resolved: { label: 'Resolved', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'emerald' },
  closed: { label: 'Closed', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', glow: 'slate' },
  escalated: { label: 'Escalated', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', glow: 'rose' },
};

// ─── Resolution Workflow Steps ────────────────────────────────────────────────
const WORKFLOW_STEPS: Array<{ key: Complaint['status']; label: string; icon: React.ElementType }> = [
  { key: 'open', label: 'Filed', icon: FileText },
  { key: 'investigating', label: 'Investigating', icon: Search },
  { key: 'in-progress', label: 'In Progress', icon: TrendingUp },
  { key: 'resolved', label: 'Resolved', icon: CheckCircle2 },
  { key: 'closed', label: 'Closed', icon: CircleCheck },
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

function getDaysSinceFiled(date: string): number {
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

function getWorkflowStepIndex(status: Complaint['status']): number {
  if (status === 'escalated') return 2; // Show as between investigating and in-progress
  const idx = WORKFLOW_STEPS.findIndex(s => s.key === status);
  return idx >= 0 ? idx : 0;
}

function getSLAStatus(complaint: Complaint): {
  pct: number;
  isBreached: boolean;
  isAtRisk: boolean;
  daysRemaining: number;
  label: string;
} {
  const sla = SLA_CONFIG[complaint.priority];
  if (!sla || complaint.status === 'resolved' || complaint.status === 'closed') {
    return { pct: 100, isBreached: false, isAtRisk: false, daysRemaining: Infinity, label: 'Completed' };
  }
  const created = new Date(complaint.createdAt);
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

function getTimeToResolution(complaint: Complaint): string | null {
  if (!complaint.resolvedAt) return null;
  const created = new Date(complaint.createdAt);
  const resolved = new Date(complaint.resolvedAt);
  const diffMs = resolved.getTime() - created.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function EmployeeComplaintDetailView() {
  const {
    user,
    complaints,
    updateComplaint,
    departments,
    setSelectedComplaintId,
    selectedComplaintId,
    setActiveView,
  } = useEMSStore();

  // Local state
  const [commentText, setCommentText] = useState('');
  const [localComments, setLocalComments] = useState<LocalComment[]>([]);
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);
  const [escalateForm, setEscalateForm] = useState({ reason: '', urgency: 'high' as 'low' | 'medium' | 'high' | 'critical' });
  const [withdrawing, setWithdrawing] = useState(false);
  const [escalating, setEscalating] = useState(false);

  // Find the complaint
  const complaint = useMemo(() => {
    if (!selectedComplaintId) return null;
    return complaints.find(c => c.id === selectedComplaintId) || null;
  }, [selectedComplaintId, complaints]);

  // ─── Derived Data ─────────────────────────────────────────────────────────
  const daysSinceFiled = complaint ? getDaysSinceFiled(complaint.createdAt) : 0;
  const slaStatus = complaint ? getSLAStatus(complaint) : null;
  const timeToResolution = complaint ? getTimeToResolution(complaint) : null;
  const workflowStepIndex = complaint ? getWorkflowStepIndex(complaint.status) : 0;
  const isComplainant = complaint && user ? complaint.userId === user.id : false;

  // Related complaints (same category, excluding current)
  const relatedComplaints = useMemo(() => {
    if (!complaint) return [];
    return complaints
      .filter(c => c.category === complaint.category && c.id !== complaint.id)
      .slice(0, 5);
  }, [complaints, complaint]);

  // Activity timeline
  const activityTimeline = useMemo(() => {
    if (!complaint) return [];
    const items: Array<{
      id: string;
      type: string;
      message: string;
      timestamp: string;
      color: string;
      icon: React.ReactNode;
    }> = [];

    // Filed
    items.push({
      id: `${complaint.id}-filed`,
      type: 'filed',
      message: `Complaint filed${complaint.isAnonymous ? ' anonymously' : ''}`,
      timestamp: complaint.createdAt,
      color: 'text-cyan-400',
      icon: <FileText className="h-3.5 w-3.5" />,
    });

    // Investigating
    if (complaint.status === 'investigating' || complaint.status === 'in-progress' || complaint.status === 'resolved' || complaint.status === 'closed' || complaint.status === 'escalated') {
      items.push({
        id: `${complaint.id}-investigating`,
        type: 'investigating',
        message: 'Investigation started',
        timestamp: complaint.updatedAt || complaint.createdAt,
        color: 'text-amber-400',
        icon: <Search className="h-3.5 w-3.5" />,
      });
    }

    // In Progress
    if (complaint.status === 'in-progress' || complaint.status === 'resolved' || complaint.status === 'closed') {
      items.push({
        id: `${complaint.id}-in-progress`,
        type: 'in-progress',
        message: 'Resolution in progress',
        timestamp: complaint.updatedAt || complaint.createdAt,
        color: 'text-amber-400',
        icon: <TrendingUp className="h-3.5 w-3.5" />,
      });
    }

    // Escalated
    if (complaint.escalatedAt) {
      items.push({
        id: `${complaint.id}-escalated`,
        type: 'escalated',
        message: `Escalated${complaint.escalatorName ? ` by ${complaint.escalatorName}` : ''}`,
        timestamp: complaint.escalatedAt,
        color: 'text-orange-400',
        icon: <ArrowUpRight className="h-3.5 w-3.5" />,
      });
    }

    // Resolved
    if (complaint.resolvedAt) {
      items.push({
        id: `${complaint.id}-resolved`,
        type: 'resolved',
        message: `Resolved${complaint.resolverName ? ` by ${complaint.resolverName}` : ''}`,
        timestamp: complaint.resolvedAt,
        color: 'text-emerald-400',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      });
    }

    // Closed
    if (complaint.closedAt) {
      items.push({
        id: `${complaint.id}-closed`,
        type: 'closed',
        message: 'Complaint closed',
        timestamp: complaint.closedAt,
        color: 'text-slate-400',
        icon: <CircleCheck className="h-3.5 w-3.5" />,
      });
    }

    // SLA breach warning
    if (slaStatus?.isBreached && complaint.status !== 'resolved' && complaint.status !== 'closed') {
      items.push({
        id: `${complaint.id}-sla-breach`,
        type: 'sla-breach',
        message: 'SLA breached — resolution overdue',
        timestamp: new Date().toISOString(),
        color: 'text-rose-400',
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
      });
    }

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [complaint, slaStatus]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const goBack = useCallback(() => {
    setSelectedComplaintId(null);
    setActiveView('complaints');
  }, [setSelectedComplaintId, setActiveView]);

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

  const handleWithdraw = useCallback(async () => {
    if (!complaint) return;
    setWithdrawing(true);
    try {
      await updateComplaint(complaint.id, {
        status: 'closed',
        closedAt: new Date().toISOString(),
      });
      toast.success('Complaint withdrawn and closed');
    } catch {
      toast.error('Failed to withdraw complaint');
    } finally {
      setWithdrawing(false);
    }
  }, [complaint, updateComplaint]);

  const handleEscalate = useCallback(async () => {
    if (!complaint || !escalateForm.reason.trim()) {
      toast.error('Please provide an escalation reason');
      return;
    }
    setEscalating(true);
    try {
      await updateComplaint(complaint.id, {
        status: 'escalated',
        escalatedAt: new Date().toISOString(),
        escalatedBy: user?.id,
        escalatorName: user?.name,
        priority: escalateForm.urgency,
      });
      setEscalateDialogOpen(false);
      setEscalateForm({ reason: '', urgency: 'high' });
      toast.success('Complaint escalated');
    } catch {
      toast.error('Failed to escalate complaint');
    } finally {
      setEscalating(false);
    }
  }, [complaint, escalateForm, user, updateComplaint]);

  const handleShare = useCallback(() => {
    if (!complaint) return;
    const shareText = `Complaint: ${complaint.subject}\nStatus: ${complaint.status}\nPriority: ${complaint.priority}\nCategory: ${complaint.category}\nFiled: ${formatDate(complaint.createdAt)}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      toast.success('Complaint details copied to clipboard');
    }
  }, [complaint]);

  // ─── Animation Config ──────────────────────────────────────────────────────
  const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

  // ─── Not Found State ──────────────────────────────────────────────────────
  if (!complaint) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="h-12 w-12 text-rose-400/50" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Complaint not found</p>
          <p className="text-xs text-muted-foreground mt-1">The complaint may have been deleted or the link is invalid.</p>
        </div>
        <Button variant="outline" size="sm" onClick={goBack} className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-cyan-500/10">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Complaints
        </Button>
      </div>
    );
  }

  const catConfig = categoryConfig[complaint.category] || categoryConfig.general;
  const sevConfig = severityConfig[complaint.severity] || severityConfig.normal;
  const priConfig = priorityConfig[complaint.priority] || priorityConfig.medium;
  const staConfig = statusConfig[complaint.status] || statusConfig.open;
  const slaConfig = SLA_CONFIG[complaint.priority] || SLA_CONFIG.medium;
  const departmentName = complaint.departmentName || departments.find(d => d.id === complaint.departmentId)?.name || '—';
  const isClosedOrResolved = complaint.status === 'resolved' || complaint.status === 'closed';

  // Quick actions based on status
  const getQuickActions = () => {
    const actions: Array<{
      label: string;
      icon: React.ReactNode;
      onClick: () => void;
      variant: 'default' | 'outline';
      className: string;
    }> = [];

    if (isComplainant && (complaint.status === 'open' || complaint.status === 'investigating' || complaint.status === 'in-progress')) {
      actions.push({
        label: 'Withdraw',
        icon: <CircleX className="h-3.5 w-3.5" />,
        onClick: handleWithdraw,
        variant: 'outline',
        className: 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10',
      });
    }

    if (complaint.status !== 'escalated' && complaint.status !== 'resolved' && complaint.status !== 'closed') {
      actions.push({
        label: 'Escalate',
        icon: <ArrowUpRight className="h-3.5 w-3.5" />,
        onClick: () => setEscalateDialogOpen(true),
        variant: 'outline',
        className: 'border-orange-500/30 text-orange-400 hover:bg-orange-500/10',
      });
    }

    if (user?.role === 'admin' || user?.role === 'manager') {
      if (!isClosedOrResolved) {
        actions.push({
          label: 'Mark Resolved',
          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
          onClick: async () => {
            try {
              await updateComplaint(complaint.id, {
                status: 'resolved',
                resolvedAt: new Date().toISOString(),
                resolvedBy: user.id,
                resolverName: user.name,
              });
              toast.success('Complaint resolved');
            } catch {
              toast.error('Failed to resolve complaint');
            }
          },
          variant: 'default',
          className: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white',
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
              <span className="hidden sm:inline">Complaints</span>
            </button>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
            <span className="text-sm text-muted-foreground truncate">Complaint Detail</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleShare} className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]">
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ═══ COMPLAINT HEADER SECTION ═══ */}
      <motion.div {...fadeIn} transition={{ delay: 0.05, duration: 0.4 }}>
        <GlassCard className="p-5 sm:p-6" glow={sevConfig.glow}>
          <div className="space-y-4">
            {/* Title + Category Icon */}
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className={cn('rounded-lg p-2.5 shrink-0', catConfig.iconBg)}>
                  <catConfig.icon className={cn('h-5 w-5', catConfig.iconText)} />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold text-white break-words leading-tight">
                    {complaint.subject}
                  </h1>
                </div>
              </div>

              {/* Badges row */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={cn('text-xs font-medium gap-1', catConfig.iconBg, catConfig.iconText, `border-${catConfig.color}-500/30`)}>
                  {catConfig.label}
                </Badge>
                <StatusBadge status={complaint.status} />
                <StatusBadge status={complaint.priority} />
                <Badge variant="outline" className={cn('text-xs font-medium gap-1', sevConfig.bg, sevConfig.color, sevConfig.border)}>
                  {sevConfig.label}
                </Badge>
                {complaint.isAnonymous && (
                  <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-xs font-medium gap-1">
                    <EyeOff className="h-3 w-3" /> Anonymous
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
                      className={cn('gap-1.5 text-xs', action.className)}
                    >
                      {action.icon}
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}

              {/* Meta info row */}
              <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  Filed {formatDate(complaint.createdAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Updated {formatRelativeTime(complaint.updatedAt || complaint.createdAt)}
                </span>
                <span className="font-mono text-muted-foreground/50">
                  ID: {complaint.id.slice(0, 8)}
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
            title="Days Since Filed"
            value={`${daysSinceFiled}d`}
            icon={Hourglass}
            color={daysSinceFiled > 7 ? 'rose' : daysSinceFiled > 3 ? 'amber' : 'cyan'}
            hero
            progressRing={{ value: daysSinceFiled, max: Math.max(daysSinceFiled * 2, 14) }}
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
            title="Time to Resolution"
            value={timeToResolution || (isClosedOrResolved ? '—' : 'In Progress')}
            icon={Timer}
            color={timeToResolution ? 'emerald' : 'amber'}
            hero
            progressRing={{ value: daysSinceFiled, max: Math.max(daysSinceFiled * 2, 14) }}
            subtitle={isClosedOrResolved ? 'Resolved' : 'Pending'}
          />
          <StatCard
            title="Priority Level"
            value={priConfig.label}
            icon={complaint.priority === 'critical' ? Zap : Flag}
            color={complaint.priority === 'critical' ? 'rose' : complaint.priority === 'high' ? 'amber' : complaint.priority === 'medium' ? 'cyan' : 'slate'}
            hero
            progressRing={{ value: { low: 25, medium: 50, high: 75, critical: 100 }[complaint.priority] || 50, max: 100 }}
            subtitle={`Severity: ${sevConfig.label}`}
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
                {complaint.description ? (
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {complaint.description}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground/40 italic">No description provided</p>
                )}
                {complaint.resolution && (
                  <>
                    <Separator className="bg-black/[0.04] dark:bg-white/[0.06]" />
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" /> Resolution
                      </h3>
                      <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-4">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {complaint.resolution}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </GlassCard>

            {/* Resolution Workflow */}
            <GlassCard className="p-5 sm:p-6">
              <div className="space-y-4">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Resolution Workflow
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
                                complaint.status === 'escalated' && 'bg-orange-500/20 border-orange-500/50 text-orange-400',
                                isClosedOrResolved && 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
                              ),
                              isPending && 'bg-slate-500/10 border-slate-500/20 text-slate-500/60',
                            )}
                          >
                            <StepIcon className="h-4 w-4" />
                          </div>
                          <span
                            className={cn(
                              'text-[10px] font-medium text-center whitespace-nowrap',
                              isCompleted && 'text-emerald-400',
                              isCurrent && cn(
                                'text-amber-400',
                                complaint.status === 'escalated' && 'text-orange-400',
                                isClosedOrResolved && 'text-emerald-400',
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
                {/* Escalated indicator */}
                {complaint.status === 'escalated' && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <ArrowUpRight className="h-4 w-4 text-orange-400" />
                    <span className="text-xs text-orange-400 font-medium">
                      This complaint has been escalated and is receiving priority attention
                    </span>
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Escalation Info */}
            {complaint.escalatedAt && (
              <GlassCard className="p-5 sm:p-6" glow="rose">
                <div className="space-y-3">
                  <h2 className="text-sm font-medium text-orange-400 uppercase tracking-wider flex items-center gap-2">
                    <ArrowUpRight className="h-4 w-4" /> Escalation Info
                  </h2>
                  <div className="rounded-lg bg-orange-500/5 border border-orange-500/15 p-4 space-y-3">
                    {complaint.escalatorName && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-20">Escalated by</span>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className={cn('text-[8px] font-bold bg-gradient-to-br text-white', getAvatarGradient(complaint.escalatorName))}>
                              {getInitials(complaint.escalatorName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-foreground">{complaint.escalatorName}</span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-20">Escalated at</span>
                      <span className="text-sm text-foreground">{formatDateTime(complaint.escalatedAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-20">Current priority</span>
                      <StatusBadge status={complaint.priority} />
                    </div>
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
                {/* Category */}
                <div className="flex items-center gap-3">
                  <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', catConfig.iconBg)}>
                    <catConfig.icon className={cn('h-4 w-4', catConfig.iconText)} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Category</p>
                    <p className="text-sm text-foreground">{catConfig.label}</p>
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

                {/* Assignee */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={cn('text-xs font-bold bg-gradient-to-br text-white', complaint.assigneeName ? getAvatarGradient(complaint.assigneeName) : 'from-slate-500 to-slate-600')}>
                      {complaint.assigneeName ? getInitials(complaint.assigneeName) : <UserX className="h-3.5 w-3.5" />}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs text-muted-foreground">Assignee</p>
                    <p className="text-sm text-foreground">{complaint.assigneeName || 'Unassigned'}</p>
                  </div>
                </div>

                <Separator className="bg-black/[0.04] dark:bg-white/[0.06]" />

                {/* Filed by */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={cn('text-xs font-bold bg-gradient-to-br text-white', complaint.isAnonymous ? 'from-slate-500 to-slate-600' : getAvatarGradient(complaint.userName || 'U'))}>
                      {complaint.isAnonymous ? <EyeOff className="h-3.5 w-3.5" /> : getInitials(complaint.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs text-muted-foreground">Filed by</p>
                    <p className="text-sm text-foreground">
                      {complaint.isAnonymous ? 'Anonymous' : complaint.userName || '—'}
                    </p>
                  </div>
                </div>

                <Separator className="bg-black/[0.04] dark:bg-white/[0.06]" />

                {/* Anonymous status */}
                <div className="flex items-center gap-3">
                  <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', complaint.isAnonymous ? 'bg-slate-500/10' : 'bg-emerald-500/10')}>
                    {complaint.isAnonymous ? (
                      <EyeOff className="h-4 w-4 text-slate-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-emerald-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Identity</p>
                    <p className={cn('text-sm', complaint.isAnonymous ? 'text-slate-400' : 'text-emerald-400')}>
                      {complaint.isAnonymous ? 'Anonymous filing' : 'Identified'}
                    </p>
                  </div>
                </div>

                {/* Resolver info */}
                {complaint.resolverName && (
                  <>
                    <Separator className="bg-black/[0.04] dark:bg-white/[0.06]" />
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={cn('text-xs font-bold bg-gradient-to-br text-white', getAvatarGradient(complaint.resolverName))}>
                          {getInitials(complaint.resolverName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs text-muted-foreground">Resolved by</p>
                        <p className="text-sm text-emerald-400">{complaint.resolverName}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </GlassCard>

            {/* SLA Card */}
            <GlassCard className="p-5 sm:p-6" glow={slaStatus?.isBreached ? 'rose' : slaStatus?.isAtRisk ? 'amber' : undefined}>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Hourglass className="h-4 w-4" /> SLA Tracking
              </h2>
              <div className="space-y-4">
                {/* SLA progress bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">SLA Progress</span>
                    <span className={cn(
                      'font-medium',
                      slaStatus?.isBreached ? 'text-rose-400' : slaStatus?.isAtRisk ? 'text-amber-400' : 'text-cyan-400',
                    )}>
                      {isClosedOrResolved ? 'Completed' : slaStatus?.isBreached ? 'Breached' : slaStatus?.isAtRisk ? 'At Risk' : 'On Track'}
                    </span>
                  </div>
                  <Progress
                    value={isClosedOrResolved ? 100 : slaStatus?.pct || 0}
                    className={cn(
                      'h-2',
                      slaStatus?.isBreached ? '[&>div]:bg-rose-500' : slaStatus?.isAtRisk ? '[&>div]:bg-amber-500' : '[&>div]:bg-cyan-500',
                    )}
                  />
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
                    <span>Filed</span>
                    <span>SLA: {slaConfig.label}</span>
                    <span>{isClosedOrResolved ? 'Done' : slaStatus?.daysRemaining === Infinity ? '' : `${slaStatus?.daysRemaining}d left`}</span>
                  </div>
                </div>

                <Separator className="bg-black/[0.04] dark:bg-white/[0.06]" />

                {/* Priority-based SLA info */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground/60 uppercase tracking-wider text-[10px]">Priority</p>
                    <p className={cn('font-medium mt-0.5', priConfig.color)}>{priConfig.label}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground/60 uppercase tracking-wider text-[10px]">SLA Target</p>
                    <p className="font-medium text-foreground mt-0.5">{slaConfig.label}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground/60 uppercase tracking-wider text-[10px]">Days Elapsed</p>
                    <p className={cn('font-medium mt-0.5', daysSinceFiled > slaConfig.days ? 'text-rose-400' : 'text-foreground')}>
                      {daysSinceFiled}d
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground/60 uppercase tracking-wider text-[10px]">Status</p>
                    <p className={cn('font-medium mt-0.5', slaStatus?.isBreached ? 'text-rose-400' : slaStatus?.isAtRisk ? 'text-amber-400' : 'text-emerald-400')}>
                      {slaStatus?.label}
                    </p>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Priority & Severity Combined Visual */}
            <GlassCard className="p-5 sm:p-6">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Flag className="h-4 w-4" /> Priority & Severity
              </h2>
              <div className="space-y-4">
                {/* Priority indicator */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Priority</span>
                    <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium', priConfig.bg, priConfig.color, priConfig.border)}>
                      {priConfig.icon}
                      {priConfig.label}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {['low', 'medium', 'high', 'critical'].map((p) => {
                      const pIdx = ['low', 'medium', 'high', 'critical'].indexOf(p);
                      const currentIdx = ['low', 'medium', 'high', 'critical'].indexOf(complaint.priority);
                      const isActive = pIdx <= currentIdx;
                      return (
                        <div
                          key={p}
                          className={cn(
                            'flex-1 h-2 rounded-full transition-all',
                            isActive && p === 'critical' ? 'bg-rose-500' :
                            isActive && p === 'high' ? 'bg-amber-500' :
                            isActive && p === 'medium' ? 'bg-cyan-500' :
                            isActive ? 'bg-slate-400' : 'bg-black/[0.04] dark:bg-white/[0.06]',
                          )}
                        />
                      );
                    })}
                  </div>
                </div>

                <Separator className="bg-black/[0.04] dark:bg-white/[0.06]" />

                {/* Severity indicator */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Severity</span>
                    <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium', sevConfig.bg, sevConfig.color, sevConfig.border)}>
                      <Shield className="h-3 w-3" />
                      {sevConfig.label}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {['normal', 'sensitive', 'critical'].map((s) => {
                      const sIdx = ['normal', 'sensitive', 'critical'].indexOf(s);
                      const currentIdx = ['normal', 'sensitive', 'critical'].indexOf(complaint.severity);
                      const isActive = sIdx <= currentIdx;
                      return (
                        <div
                          key={s}
                          className={cn(
                            'flex-1 h-2 rounded-full transition-all',
                            isActive && s === 'critical' ? 'bg-rose-500' :
                            isActive && s === 'sensitive' ? 'bg-amber-500' :
                            isActive ? 'bg-cyan-500' : 'bg-black/[0.04] dark:bg-white/[0.06]',
                          )}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Due Date Indicator */}
            <GlassCard className="p-5 sm:p-6">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Due Date
              </h2>
              {complaint.dueDate ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'h-10 w-10 rounded-lg flex items-center justify-center',
                      new Date(complaint.dueDate) < new Date() && !isClosedOrResolved
                        ? 'bg-rose-500/20'
                        : 'bg-cyan-500/10',
                    )}>
                      <Calendar className={cn(
                        'h-5 w-5',
                        new Date(complaint.dueDate) < new Date() && !isClosedOrResolved
                          ? 'text-rose-400'
                          : 'text-cyan-400',
                      )} />
                    </div>
                    <div>
                      <p className={cn(
                        'text-sm font-medium',
                        new Date(complaint.dueDate) < new Date() && !isClosedOrResolved
                          ? 'text-rose-400'
                          : 'text-foreground',
                      )}>
                        {formatDate(complaint.dueDate)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {isClosedOrResolved
                          ? 'Complaint resolved'
                          : new Date(complaint.dueDate) < new Date()
                            ? 'Past due'
                            : `${Math.ceil((new Date(complaint.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days remaining`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-slate-500/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">No due date set</p>
                    <p className="text-[10px] text-muted-foreground/60">SLA applies based on priority</p>
                  </div>
                </div>
              )}
            </GlassCard>

            {/* Related Complaints */}
            {relatedComplaints.length > 0 && (
              <GlassCard className="p-5 sm:p-6">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Related Complaints
                </h2>
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {relatedComplaints.map((rc) => {
                    const rcCat = categoryConfig[rc.category] || categoryConfig.general;
                    return (
                      <button
                        key={rc.id}
                        onClick={() => {
                          setSelectedComplaintId(rc.id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="w-full text-left p-3 rounded-lg hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors group border border-black/[0.04] dark:border-white/[0.04]"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={cn('h-6 w-6 rounded flex items-center justify-center shrink-0 mt-0.5', rcCat.iconBg)}>
                            <rcCat.icon className={cn('h-3 w-3', rcCat.iconText)} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-foreground truncate group-hover:text-cyan-400 transition-colors">
                              {rc.subject}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <StatusBadge status={rc.status} className="text-[10px] px-1.5 py-0" />
                              <span className="text-[10px] text-muted-foreground/60">{formatRelativeTime(rc.createdAt)}</span>
                            </div>
                          </div>
                        </div>
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
              {isComplainant && !isClosedOrResolved && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleWithdraw}
                  disabled={withdrawing}
                  className="gap-1.5 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                >
                  {withdrawing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CircleX className="h-3.5 w-3.5" />}
                  Withdraw
                </Button>
              )}
              {!isClosedOrResolved && complaint.status !== 'escalated' && (
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
        <DialogContent className="bg-background/95 border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Escalate Complaint</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Escalate this complaint to receive priority attention. Provide a clear reason for the escalation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Reason for Escalation
              </label>
              <Textarea
                placeholder="Describe why this complaint needs to be escalated..."
                value={escalateForm.reason}
                onChange={(e) => setEscalateForm(prev => ({ ...prev, reason: e.target.value }))}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-orange-500/30 min-h-[100px] text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Urgency Level
              </label>
              <Select
                value={escalateForm.urgency}
                onValueChange={(val: any) => setEscalateForm(prev => ({ ...prev, urgency: val }))}
              >
                <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-sm">
                  <SelectValue placeholder="Select urgency" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  <SelectItem value="medium">Medium — Needs attention soon</SelectItem>
                  <SelectItem value="high">High — Urgent attention required</SelectItem>
                  <SelectItem value="critical">Critical — Immediate action needed</SelectItem>
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
              disabled={!escalateForm.reason.trim() || escalating}
              className="gap-1.5 bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-500 hover:to-rose-500 text-white"
            >
              {escalating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
              Escalate Complaint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
