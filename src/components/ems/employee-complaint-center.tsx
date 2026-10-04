'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEMSStore } from '@/lib/store';
import type { Complaint } from '@/lib/types';
import { GlassCard } from './glass-card';
import { StatusBadge } from './status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Users, Monitor, Building, DollarSign, Briefcase, Shield,
  MessageSquare, HelpCircle, Plus, FileText, Eye, XCircle,
  Clock, AlertTriangle, CheckCircle2, Zap, Search,
  UserX, ShieldCheck, Activity, Loader2, ArrowUpRight,
  Download, Filter, SortAsc, CalendarDays, TrendingUp,
  BarChart3, PieChart, Target, Timer, ArrowRight,
  ChevronRight, AlertOctagon, Flame, Info, ExternalLink,
  Paperclip, UserCircle, Siren, Gauge,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  timeAgo, formatDate, formatDateTime,
  ProgressRing,
  RingChart,
  priorityDot, priorityLabel,
  fadeIn,
  isOverdue,
  daysUntilDue,
} from './shared';

/* ═══════════════════════════════════════════════════════════
   CONFIG MAPS
   ═══════════════════════════════════════════════════════════ */

const categoryConfig: Record<string, { icon: LucideIcon; color: string; label: string; iconBg: string; iconText: string }> = {
  hr: { icon: Users, color: 'emerald', label: 'HR', iconBg: 'bg-emerald-500/20', iconText: 'text-emerald-400' },
  it: { icon: Monitor, color: 'cyan', label: 'IT', iconBg: 'bg-cyan-500/20', iconText: 'text-cyan-400' },
  facilities: { icon: Building, color: 'amber', label: 'Facilities', iconBg: 'bg-amber-500/20', iconText: 'text-amber-400' },
  finance: { icon: DollarSign, color: 'orange', label: 'Finance', iconBg: 'bg-orange-500/20', iconText: 'text-orange-400' },
  management: { icon: Briefcase, color: 'violet', label: 'Management', iconBg: 'bg-violet-500/20', iconText: 'text-violet-400' },
  security: { icon: Shield, color: 'rose', label: 'Security', iconBg: 'bg-rose-500/20', iconText: 'text-rose-400' },
  general: { icon: MessageSquare, color: 'slate', label: 'General', iconBg: 'bg-slate-500/20', iconText: 'text-slate-400' },
  other: { icon: HelpCircle, color: 'teal', label: 'Other', iconBg: 'bg-teal-500/20', iconText: 'text-teal-400' },
};

// priorityDot and priorityLabel imported from ./shared

const priorityColor: Record<string, string> = {
  low: 'bg-slate-500/20 text-slate-400',
  medium: 'bg-cyan-500/20 text-cyan-400',
  high: 'bg-amber-500/20 text-amber-400',
  critical: 'bg-rose-500/20 text-rose-400',
};

const severityLabel: Record<string, string> = {
  normal: 'Normal',
  sensitive: 'Sensitive',
  critical: 'Critical',
};

const severityColor: Record<string, string> = {
  normal: 'bg-slate-500/20 text-slate-400',
  sensitive: 'bg-amber-500/20 text-amber-400',
  critical: 'bg-rose-500/20 text-rose-400',
};

const severityIcon: Record<string, LucideIcon> = {
  normal: Info,
  sensitive: AlertTriangle,
  critical: AlertOctagon,
};

const statusChipColor: Record<string, string> = {
  all: 'bg-white/10 text-white',
  open: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  investigating: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'in-progress': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  resolved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  closed: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  escalated: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

const categoryColorBar: Record<string, string> = {
  hr: 'bg-emerald-400',
  it: 'bg-cyan-400',
  facilities: 'bg-amber-400',
  finance: 'bg-orange-400',
  management: 'bg-violet-400',
  security: 'bg-rose-400',
  general: 'bg-slate-400',
  other: 'bg-teal-400',
};

/* ═══════════════════════════════════════════════════════════
   HELPERS (timeAgo, formatDate, formatDateTime imported from ./shared)
   ═══════════════════════════════════════════════════════════ */

// isOverdue and daysUntilDue imported from ./shared

// stagger variant kept complaint-specific (uses hidden/visible + custom index pattern)
const stagger = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: 'easeOut' as const },
  }),
};

/* ═══════════════════════════════════════════════════════════
   QUICK TEMPLATES
   ═══════════════════════════════════════════════════════════ */

const quickTemplates = [
  { key: 'hr', label: 'HR Issue', desc: 'Workplace & policy', icon: Users, category: 'hr' as const, priority: 'medium' as const, severity: 'normal' as const },
  { key: 'it', label: 'IT Problem', desc: 'Tech & access issues', icon: Monitor, category: 'it' as const, priority: 'high' as const, severity: 'normal' as const },
  { key: 'facilities', label: 'Facilities', desc: 'Office environment', icon: Building, category: 'facilities' as const, priority: 'medium' as const, severity: 'normal' as const },
  { key: 'finance', label: 'Finance Concern', desc: 'Payroll & expenses', icon: DollarSign, category: 'finance' as const, priority: 'medium' as const, severity: 'sensitive' as const },
  { key: 'security', label: 'Security Issue', desc: 'Safety & access', icon: Shield, category: 'security' as const, priority: 'critical' as const, severity: 'critical' as const },
  { key: 'general', label: 'General Feedback', desc: 'Suggestions & input', icon: MessageSquare, category: 'general' as const, priority: 'low' as const, severity: 'normal' as const },
];

// RingChart and ProgressRing imported from ./shared

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */

export function EmployeeComplaintCenter() {
  const { user, complaints, createComplaint, updateComplaint, departments, setActiveView, setSelectedComplaintId } = useEMSStore();

  /* ── State ── */
  const [mainTab, setMainTab] = useState('my-complaints');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [escalateDialog, setEscalateDialog] = useState<Complaint | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [escalateUrgency, setEscalateUrgency] = useState('high');

  const [form, setForm] = useState({
    subject: '',
    description: '',
    category: '' as string,
    priority: 'medium' as string,
    severity: 'normal' as string,
    isAnonymous: false,
    dueDate: '',
    departmentId: '' as string,
  });

  /* ── Computed: My Complaints ── */
  const myComplaints = useMemo(
    () => complaints.filter((c) => c.userId === user?.id),
    [complaints, user?.id]
  );

  /* ── Computed: Stats ── */
  const stats = useMemo(() => {
    const total = myComplaints.length;
    const open = myComplaints.filter((c) => c.status === 'open').length;
    const inProgress = myComplaints.filter((c) => c.status === 'in-progress' || c.status === 'investigating').length;
    const resolved = myComplaints.filter((c) => c.status === 'resolved').length;
    const escalated = myComplaints.filter((c) => c.status === 'escalated').length;
    const critical = myComplaints.filter((c) => c.priority === 'critical' || c.severity === 'critical').length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    const overdue = myComplaints.filter((c) => isOverdue(c)).length;
    const resolvedWithDates = myComplaints.filter((c) => c.status === 'resolved' && c.resolvedAt);
    const avgResolutionDays = resolvedWithDates.length > 0
      ? Math.round(resolvedWithDates.reduce((sum, c) => {
          const days = (new Date(c.resolvedAt!).getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0) / resolvedWithDates.length * 10) / 10
      : 0;
    return { total, open, inProgress, resolved, escalated, critical, resolutionRate, overdue, avgResolutionDays };
  }, [myComplaints]);

  /* ── Computed: Filtered & Sorted ── */
  const filteredComplaints = useMemo(() => {
    let result = [...myComplaints];

    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (categoryFilter !== 'all') {
      result = result.filter((c) => c.category === categoryFilter);
    }
    if (priorityFilter !== 'all') {
      result = result.filter((c) => c.priority === priorityFilter);
    }
    if (severityFilter !== 'all') {
      result = result.filter((c) => c.severity === severityFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) => c.subject.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
      );
    }

    // Sort
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const severityOrder: Record<string, number> = { critical: 0, sensitive: 1, normal: 2 };
    const statusOrder: Record<string, number> = { escalated: 0, open: 1, investigating: 2, 'in-progress': 3, resolved: 4, closed: 5 };

    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'priority':
        result.sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));
        break;
      case 'severity':
        result.sort((a, b) => (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2));
        break;
      case 'status':
        result.sort((a, b) => (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5));
        break;
    }

    return result;
  }, [myComplaints, statusFilter, categoryFilter, priorityFilter, severityFilter, searchQuery, sortBy]);

  /* ── Computed: Category Groups ── */
  const categoryGroups = useMemo(() => {
    const groups: Record<string, Complaint[]> = {};
    for (const c of myComplaints) {
      const cat = c.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(c);
    }
    return groups;
  }, [myComplaints]);

  /* ── Computed: Analytics Data ── */
  const analytics = useMemo(() => {
    const total = myComplaints.length;
    const resolved = myComplaints.filter((c) => c.status === 'resolved').length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    // Category distribution
    const catDist: Record<string, number> = {};
    for (const c of myComplaints) {
      const cat = c.category || 'other';
      catDist[cat] = (catDist[cat] || 0) + 1;
    }

    // Priority breakdown
    const priorityBreakdown = {
      low: myComplaints.filter((c) => c.priority === 'low').length,
      medium: myComplaints.filter((c) => c.priority === 'medium').length,
      high: myComplaints.filter((c) => c.priority === 'high').length,
      critical: myComplaints.filter((c) => c.priority === 'critical').length,
    };

    // Average resolution time
    const resolvedComplaints = myComplaints.filter((c) => c.status === 'resolved' && c.resolvedAt);
    const avgResolutionDays = resolvedComplaints.length > 0
      ? resolvedComplaints.reduce((sum, c) => {
          const created = new Date(c.createdAt).getTime();
          const resolved = new Date(c.resolvedAt!).getTime();
          return sum + (resolved - created) / (1000 * 60 * 60 * 24);
        }, 0) / resolvedComplaints.length
      : 0;

    // SLA compliance
    const withDueDate = myComplaints.filter((c) => c.dueDate && (c.status === 'resolved' || c.status === 'closed'));
    const slaCompliant = withDueDate.filter((c) => {
      if (!c.resolvedAt && !c.closedAt) return false;
      const end = new Date(c.resolvedAt || c.closedAt!).getTime();
      return end <= new Date(c.dueDate!).getTime();
    });
    const slaRate = withDueDate.length > 0 ? Math.round((slaCompliant.length / withDueDate.length) * 100) : 100;

    // Monthly trend (last 6 months)
    const now = new Date();
    const monthlyData: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
      const monthStart = d.getTime();
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();
      const count = myComplaints.filter((c) => {
        const ct = new Date(c.createdAt).getTime();
        return ct >= monthStart && ct <= monthEnd;
      }).length;
      monthlyData.push({ month: monthLabel, count });
    }

    return { resolutionRate, catDist, priorityBreakdown, avgResolutionDays: Math.round(avgResolutionDays * 10) / 10, slaRate, monthlyData, total, resolved };
  }, [myComplaints]);

  /* ── Computed: Timeline Events ── */
  const timelineEvents = useMemo(() => {
    type Event = { id: string; complaintId: string; subject: string; category: string; type: string; date: string; actor?: string; statusFrom?: string; statusTo?: string };
    const events: Event[] = [];

    for (const c of myComplaints) {
      events.push({ id: `${c.id}-created`, complaintId: c.id, subject: c.subject, category: c.category, type: 'filed', date: c.createdAt, actor: c.isAnonymous ? 'Anonymous' : c.userName });
      if (c.escalatedAt) {
        events.push({ id: `${c.id}-escalated`, complaintId: c.id, subject: c.subject, category: c.category, type: 'escalated', date: c.escalatedAt, actor: c.escalatorName, statusTo: 'escalated' });
      }
      if (c.resolvedAt) {
        events.push({ id: `${c.id}-resolved`, complaintId: c.id, subject: c.subject, category: c.category, type: 'resolved', date: c.resolvedAt, actor: c.resolverName, statusTo: 'resolved' });
      }
      if (c.closedAt) {
        events.push({ id: `${c.id}-closed`, complaintId: c.id, subject: c.subject, category: c.category, type: 'closed', date: c.closedAt, statusTo: 'closed' });
      }
      if (c.updatedAt && c.status === 'investigating') {
        events.push({ id: `${c.id}-investigating`, complaintId: c.id, subject: c.subject, category: c.category, type: 'status-change', date: c.updatedAt, statusTo: 'investigating' });
      }
      if (c.updatedAt && c.status === 'in-progress') {
        events.push({ id: `${c.id}-inprogress`, complaintId: c.id, subject: c.subject, category: c.category, type: 'status-change', date: c.updatedAt, statusTo: 'in-progress' });
      }
    }

    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return events;
  }, [myComplaints]);

  /* ── Handlers ── */
  const handleSubmit = useCallback(async () => {
    if (!form.subject.trim()) { toast.error('Subject is required'); return; }
    if (!form.description.trim()) { toast.error('Description is required'); return; }
    if (!form.category) { toast.error('Please select a category'); return; }
    setSubmitting(true);
    try {
      await createComplaint({
        userId: user!.id,
        subject: form.subject.trim(),
        description: form.description.trim(),
        category: form.category as Complaint['category'],
        priority: form.priority as Complaint['priority'],
        severity: form.severity as Complaint['severity'],
        isAnonymous: form.isAnonymous,
        departmentId: form.departmentId || undefined,
        dueDate: form.dueDate || undefined,
      });
      toast.success('Complaint submitted successfully');
      setDialogOpen(false);
      setPreviewMode(false);
      setForm({ subject: '', description: '', category: '', priority: 'medium', severity: 'normal', isAnonymous: false, dueDate: '', departmentId: '' });
    } catch {
      toast.error('Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  }, [form, user, createComplaint]);

  const handleWithdraw = useCallback(async (id: string) => {
    try {
      await updateComplaint(id, { status: 'closed', closedAt: new Date().toISOString() });
      toast.success('Complaint withdrawn');
    } catch {
      toast.error('Failed to withdraw complaint');
    }
  }, [updateComplaint]);

  const handleEscalate = useCallback(async () => {
    if (!escalateDialog) return;
    if (!escalateReason.trim()) { toast.error('Please provide a reason for escalation'); return; }
    setEscalating(true);
    try {
      await updateComplaint(escalateDialog.id, {
        status: 'escalated',
        escalatedAt: new Date().toISOString(),
        escalatedBy: user?.id,
      });
      toast.success('Complaint escalated successfully');
      setEscalateDialog(null);
      setEscalateReason('');
      setEscalateUrgency('high');
    } catch {
      toast.error('Failed to escalate complaint');
    } finally {
      setEscalating(false);
    }
  }, [escalateDialog, escalateReason, user, updateComplaint]);

  const handleExportCSV = useCallback(() => {
    if (myComplaints.length === 0) { toast.error('No complaints to export'); return; }
    const headers = ['ID', 'Subject', 'Category', 'Priority', 'Severity', 'Status', 'Anonymous', 'Assignee', 'Due Date', 'Created', 'Resolved', 'Closed'];
    const rows = myComplaints.map((c) => [
      c.id, `"${c.subject.replace(/"/g, '""')}"`, c.category, c.priority, c.severity, c.status,
      c.isAnonymous ? 'Yes' : 'No', c.assigneeName || '', c.dueDate ? formatDate(c.dueDate) : '',
      formatDate(c.createdAt), c.resolvedAt ? formatDate(c.resolvedAt) : '', c.closedAt ? formatDate(c.closedAt) : '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `complaints-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Complaints exported to CSV');
  }, [myComplaints]);

  const applyTemplate = useCallback((t: typeof quickTemplates[number]) => {
    setForm((f) => ({ ...f, category: t.category, priority: t.priority, severity: t.severity }));
    setPreviewMode(false);
    setDialogOpen(true);
  }, []);

  const resetForm = useCallback(() => {
    setForm({ subject: '', description: '', category: '', priority: 'medium', severity: 'normal', isAnonymous: false, dueDate: '', departmentId: '' });
    setPreviewMode(false);
  }, []);

  const firstName = user?.name?.split(' ')[0] || 'there';

  const openDetail = useCallback((c: Complaint) => {
    setSelectedComplaintId(c.id);
    setActiveView('complaint-detail');
  }, [setSelectedComplaintId, setActiveView]);

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Complaint Center
              <span className="ml-2 text-base font-normal text-muted-foreground">Hi, {firstName}</span>
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-muted-foreground">
                <span className="text-cyan-400 font-medium">{stats.total}</span> complaint{stats.total !== 1 ? 's' : ''} on record
              </p>
              {stats.overdue > 0 && (
                <Badge variant="outline" className="text-[10px] bg-rose-500/20 text-rose-400 border-rose-500/30 gap-1">
                  <AlertTriangle className="h-2.5 w-2.5" /> {stats.overdue} overdue
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 border-white/10" onClick={handleExportCSV}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-500 shrink-0" onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-4 w-4" /> File Complaint
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── Stat Cards (8) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Complaints */}
        <motion.div {...fadeIn} transition={{ delay: 0 }}>
          <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[130px]" hover glow="cyan">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-cyan-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Complaints</p>
                <p className="text-2xl font-bold text-cyan-400">{stats.total}</p>
                <p className="text-[10px] text-cyan-400/80">All time</p>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                <ProgressRing value={stats.total} max={Math.max(stats.total, 1)} size={48} color="#06b6d4" />
                <span className="absolute text-[10px] font-bold text-cyan-400">{stats.total > 0 ? Math.round((stats.total / Math.max(stats.total, 1)) * 100) : 0}%</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* 2. Open */}
        <motion.div {...fadeIn} transition={{ delay: 0.05 }}>
          <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[130px]" hover glow="cyan">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-cyan-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Open</p>
                <p className="text-2xl font-bold text-cyan-400">{stats.open}</p>
                <p className="text-[10px] text-cyan-400/80">Awaiting action</p>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                <ProgressRing value={stats.open} max={Math.max(stats.total, 1)} size={48} color="#06b6d4" />
                <span className="absolute text-[10px] font-bold text-cyan-400">{stats.total > 0 ? Math.round((stats.open / Math.max(stats.total, 1)) * 100) : 0}%</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* 3. In Progress */}
        <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
          <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[130px]" hover glow="amber">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-amber-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">In Progress</p>
                <p className="text-2xl font-bold text-amber-400">{stats.inProgress}</p>
                <p className="text-[10px] text-amber-400/80">Being worked on</p>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                <ProgressRing value={stats.inProgress} max={Math.max(stats.total, 1)} size={48} color="#f59e0b" />
                <span className="absolute text-[10px] font-bold text-amber-400">{stats.total > 0 ? Math.round((stats.inProgress / Math.max(stats.total, 1)) * 100) : 0}%</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* 4. Resolved */}
        <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
          <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[130px]" hover glow="emerald">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-emerald-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Resolved</p>
                <p className="text-2xl font-bold text-emerald-400">{stats.resolutionRate}%</p>
                <p className="text-[10px] text-emerald-400/80">{stats.resolved} resolved</p>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                <ProgressRing value={stats.resolutionRate} max={100} size={48} color="#10b981" />
                <span className="absolute text-[10px] font-bold text-emerald-400">{stats.resolutionRate}%</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* 5. Escalated */}
        <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
          <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[130px]" hover glow="orange">
            {stats.escalated > 0 && (
              <div className="absolute inset-0 rounded-xl pointer-events-none">
                <div className="absolute inset-0 rounded-xl ring-2 ring-orange-500/20 animate-pulse" />
              </div>
            )}
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-orange-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Escalated</p>
                <p className="text-2xl font-bold text-orange-400">{stats.escalated}</p>
                <p className="text-[10px] text-orange-400/80">Needs attention</p>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                <ProgressRing value={stats.escalated} max={Math.max(stats.total, 1)} size={48} color="#f97316" />
                <span className="absolute text-[10px] font-bold text-orange-400">{stats.total > 0 ? Math.round((stats.escalated / Math.max(stats.total, 1)) * 100) : 0}%</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* 6. Critical */}
        <motion.div {...fadeIn} transition={{ delay: 0.25 }}>
          <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[130px]" hover glow="rose">
            {stats.critical > 0 && (
              <div className="absolute inset-0 rounded-xl pointer-events-none">
                <div className="absolute inset-0 rounded-xl ring-2 ring-rose-500/20 animate-pulse" />
              </div>
            )}
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-rose-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Critical</p>
                <p className="text-2xl font-bold text-rose-400">{stats.critical}</p>
                <p className="text-[10px] text-rose-400/80">High priority</p>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                <ProgressRing value={stats.critical} max={Math.max(stats.total, 1)} size={48} color="#f43f5e" />
                <span className="absolute text-[10px] font-bold text-rose-400">{stats.total > 0 ? Math.round((stats.critical / Math.max(stats.total, 1)) * 100) : 0}%</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* 7. Overdue */}
        <motion.div {...fadeIn} transition={{ delay: 0.3 }}>
          <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[130px]" hover glow="rose">
            {stats.overdue > 0 && (
              <div className="absolute inset-0 rounded-xl pointer-events-none">
                <div className="absolute inset-0 rounded-xl ring-2 ring-rose-500/20 animate-pulse" />
              </div>
            )}
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-rose-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Overdue</p>
                <p className="text-2xl font-bold text-rose-400">{stats.overdue}</p>
                <p className="text-[10px] text-rose-400/80">Past due date</p>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                <ProgressRing value={stats.overdue} max={Math.max(stats.total, 1)} size={48} color="#f43f5e" />
                <span className="absolute text-[10px] font-bold text-rose-400">{stats.total > 0 ? Math.round((stats.overdue / Math.max(stats.total, 1)) * 100) : 0}%</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* 8. Avg Resolution */}
        <motion.div {...fadeIn} transition={{ delay: 0.35 }}>
          <GlassCard className="p-4 sm:p-5 relative overflow-hidden min-h-[130px]" hover glow="cyan">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-cyan-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Resolution</p>
                <p className="text-2xl font-bold text-cyan-400">{stats.avgResolutionDays}d</p>
                <p className="text-[10px] text-cyan-400/80">Days to resolve</p>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                <ProgressRing value={stats.avgResolutionDays} max={14} size={48} color="#06b6d4" />
                <span className="absolute text-[10px] font-bold text-cyan-400">{Math.round((stats.avgResolutionDays / 14) * 100)}%</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* ── Quick Action Templates ── */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Quick Start Templates</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickTemplates.map((t) => {
            const Icon = t.icon;
            const cfg = categoryConfig[t.category];
            return (
              <motion.div key={t.key} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <GlassCard hover onClick={() => applyTemplate(t)} className="p-3 cursor-pointer">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className={cn('rounded-lg p-2', cfg.iconBg, cfg.iconText)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">{t.label}</p>
                      <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Main Tab System ── */}
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList className="bg-white/5 border border-white/10 h-auto flex-wrap">
          <TabsTrigger value="my-complaints" className="text-xs data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-400">
            <FileText className="h-3.5 w-3.5 mr-1.5" /> My Complaints
          </TabsTrigger>
          <TabsTrigger value="by-category" className="text-xs data-[state=active]:bg-amber-600/20 data-[state=active]:text-amber-400">
            <Filter className="h-3.5 w-3.5 mr-1.5" /> By Category
          </TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">
            <Clock className="h-3.5 w-3.5 mr-1.5" /> Timeline
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs data-[state=active]:bg-violet-600/20 data-[state=active]:text-violet-400">
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Analytics
          </TabsTrigger>
        </TabsList>

        {/* ────────────────── TAB 1: My Complaints ────────────────── */}
        <TabsContent value="my-complaints" className="mt-4 space-y-4">
          {/* Status Filter Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { value: 'all', label: 'All' },
              { value: 'open', label: 'Open' },
              { value: 'investigating', label: 'Investigating' },
              { value: 'in-progress', label: 'In Progress' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'closed', label: 'Closed' },
              { value: 'escalated', label: 'Escalated' },
            ].map((chip) => (
              <button
                key={chip.value}
                onClick={() => setStatusFilter(chip.value)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border transition-all',
                  statusFilter === chip.value
                    ? (statusChipColor[chip.value] || 'bg-white/10 text-white border-white/20')
                    : 'bg-transparent border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground'
                )}
              >
                {chip.label}
                {chip.value !== 'all' && (
                  <span className="ml-1 opacity-60">
                    {myComplaints.filter((c) => c.status === chip.value).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search + Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by subject or description..."
                className="pl-9 bg-white/5 border-white/10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[140px] bg-white/5 border-white/10 text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(categoryConfig).map(([k, cfg]) => (
                  <SelectItem key={k} value={k}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-[130px] bg-white/5 border-white/10 text-xs">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-full sm:w-[130px] bg-white/5 border-white/10 text-xs">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="sensitive">Sensitive</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[130px] bg-white/5 border-white/10 text-xs">
                <SortAsc className="h-3.5 w-3.5 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="severity">Severity</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Complaint List */}
          <AnimatePresence mode="popLayout">
            {filteredComplaints.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                <GlassCard className="p-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="rounded-full p-4 bg-white/5">
                      <MessageSquare className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium">No complaints found</p>
                    <p className="text-xs text-muted-foreground/70 max-w-xs">
                      {searchQuery || statusFilter !== 'all'
                        ? 'Try adjusting your filters or search query.'
                        : "You haven't filed any complaints yet. Use a template above or click File Complaint."}
                    </p>
                    <Button size="sm" variant="outline" className="mt-2 gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={() => { resetForm(); setDialogOpen(true); }}>
                      <Plus className="h-3.5 w-3.5" /> File New Complaint
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredComplaints.map((c, i) => {
                  const cfg = categoryConfig[c.category] || categoryConfig.other;
                  const CatIcon = cfg.icon;
                  const overdue = isOverdue(c);
                  const dueDays = daysUntilDue(c.dueDate);

                  const statusGlow: Record<string, string> = {
                    open: 'cyan',
                    investigating: 'amber',
                    'in-progress': 'amber',
                    resolved: 'emerald',
                    escalated: 'rose',
                    closed: '',
                  };
                  const glowColor = statusGlow[c.status] || undefined;

                  const catCircleColor: Record<string, string> = {
                    emerald: 'bg-emerald-500/5', cyan: 'bg-cyan-500/5', amber: 'bg-amber-500/5',
                    orange: 'bg-orange-500/5', violet: 'bg-violet-500/5', rose: 'bg-rose-500/5',
                    slate: 'bg-slate-500/5', teal: 'bg-teal-500/5',
                  };

                  return (
                    <motion.div
                      key={c.id}
                      custom={i}
                      variants={stagger}
                      initial="hidden"
                      animate="visible"
                      layout
                      exit={{ opacity: 0, y: -8 }}
                    >
                      <GlassCard
                        className="p-4 sm:p-5 relative overflow-hidden min-h-[160px] cursor-pointer"
                        hover
                        glow={glowColor || undefined}
                        onClick={() => openDetail(c)}
                      >
                        {/* Pulse ring for escalated / overdue */}
                        {(c.status === 'escalated' || overdue) && (
                          <div className="absolute inset-0 rounded-xl pointer-events-none">
                            <div className="absolute inset-0 rounded-xl ring-2 ring-rose-500/20 animate-pulse" />
                          </div>
                        )}
                        {/* Decorative circle */}
                        <div className={cn('absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8', catCircleColor[cfg.color] || 'bg-slate-500/5')} />
                        <div className="relative z-10 space-y-2">
                          {/* Icon + Category badge row */}
                          <div className="flex items-center gap-2">
                            <div className={cn('rounded-lg p-1.5', cfg.iconBg, cfg.iconText)}>
                              <CatIcon className="h-3.5 w-3.5" />
                            </div>
                            <Badge variant="outline" className={cn('text-[10px]', cfg.iconBg, cfg.iconText, 'border-0')}>{cfg.label}</Badge>
                          </div>
                          {/* Subject */}
                          <p className="text-sm font-medium line-clamp-2">{c.subject}</p>
                          {/* Status + Priority + Time row */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge status={c.status} />
                            <span className={cn('h-2 w-2 rounded-full', priorityDot[c.priority] || 'bg-slate-400')} title={priorityLabel[c.priority]} />
                            <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                          </div>
                          {/* Due date if exists */}
                          {c.dueDate && (
                            <div className={cn('flex items-center gap-1 text-[10px]', overdue ? 'text-rose-400 font-medium' : 'text-muted-foreground')}>
                              <CalendarDays className="h-2.5 w-2.5" />
                              {overdue ? 'Overdue' : dueDays !== null && dueDays <= 3 ? `${dueDays}d left` : formatDate(c.dueDate)}
                            </div>
                          )}
                        </div>
                      </GlassCard>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </TabsContent>

        {/* ────────────────── TAB 2: By Category ────────────────── */}
        <TabsContent value="by-category" className="mt-4">
          {Object.keys(categoryGroups).length === 0 ? (
            <GlassCard className="p-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-full p-4 bg-white/5">
                  <Filter className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No categories yet</p>
                <p className="text-xs text-muted-foreground/70">File a complaint to see category groupings here.</p>
              </div>
            </GlassCard>
          ) : (
            <Accordion type="multiple" defaultValue={Object.keys(categoryGroups)} className="space-y-3">
              {Object.entries(categoryGroups)
                .sort(([a], [b]) => categoryGroups[b].length - categoryGroups[a].length)
                .map(([cat, catComplaints]) => {
                  const cfg = categoryConfig[cat] || categoryConfig.other;
                  const CatIcon = cfg.icon;
                  const openCount = catComplaints.filter((c) => c.status === 'open').length;
                  const resolvedCount = catComplaints.filter((c) => c.status === 'resolved').length;
                  const escalatedCount = catComplaints.filter((c) => c.status === 'escalated').length;

                  return (
                    <AccordionItem key={cat} value={cat} className="border-0">
                      <AccordionTrigger className="hover:no-underline py-0">
                        <GlassCard className="p-4 w-full" hover>
                          <div className="flex items-center gap-3">
                            <div className={cn('rounded-lg p-2', cfg.iconBg, cfg.iconText)}>
                              <CatIcon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{cfg.label}</span>
                                <Badge variant="outline" className="text-[10px] bg-white/10 border-white/10">
                                  {catComplaints.length} item{catComplaints.length !== 1 ? 's' : ''}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="text-[10px] text-cyan-400">{openCount} open</span>
                                <span className="text-[10px] text-emerald-400">{resolvedCount} resolved</span>
                                {escalatedCount > 0 && <span className="text-[10px] text-orange-400">{escalatedCount} escalated</span>}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 group-radix-state-open:rotate-90" />
                          </div>
                        </GlassCard>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 space-y-2 pl-4">
                        {catComplaints.map((c) => {
                          const cCfg = categoryConfig[c.category] || categoryConfig.other;
                          return (
                            <GlassCard key={c.id} hover className="p-3 cursor-pointer" onClick={() => openDetail(c)}>
                              <div className="flex items-center gap-3">
                                <span className={cn('h-2 w-2 rounded-full shrink-0', priorityDot[c.priority])} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{c.subject}</p>
                                  <p className="text-xs text-muted-foreground line-clamp-1">{c.description}</p>
                                </div>
                                <StatusBadge status={c.status} />
                                <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(c.createdAt)}</span>
                              </div>
                            </GlassCard>
                          );
                        })}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
            </Accordion>
          )}
        </TabsContent>

        {/* ────────────────── TAB 3: Timeline ────────────────── */}
        <TabsContent value="timeline" className="mt-4">
          {timelineEvents.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-full p-4 bg-white/5">
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No timeline events</p>
                <p className="text-xs text-muted-foreground/70">Events will appear here as your complaints progress.</p>
              </div>
            </GlassCard>
          ) : (
            <div className="relative pl-8">
              {/* Vertical line */}
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-white/10" />

              <div className="space-y-4">
                {timelineEvents.map((event, i) => {
                  const cfg = categoryConfig[event.category] || categoryConfig.other;
                  const CatIcon = cfg.icon;

                  const eventTypeConfig: Record<string, { icon: LucideIcon; color: string; bg: string; label: string }> = {
                    filed: { icon: FileText, color: 'text-cyan-400', bg: 'bg-cyan-500/20', label: 'Filed' },
                    escalated: { icon: ArrowUpRight, color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Escalated' },
                    resolved: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Resolved' },
                    closed: { icon: XCircle, color: 'text-slate-400', bg: 'bg-slate-500/20', label: 'Closed' },
                    'status-change': { icon: Activity, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Status Changed' },
                  };
                  const evCfg = eventTypeConfig[event.type] || eventTypeConfig['status-change'];
                  const EvIcon = evCfg.icon;

                  return (
                    <motion.div
                      key={event.id}
                      custom={i}
                      variants={stagger}
                      initial="hidden"
                      animate="visible"
                      className="relative"
                    >
                      {/* Timeline dot */}
                      <div className={cn('absolute -left-8 top-3 rounded-full p-1.5 z-10', evCfg.bg)}>
                        <EvIcon className={cn('h-3 w-3', evCfg.color)} />
                      </div>

                      <GlassCard className="p-4 ml-2" hover onClick={() => {
                        const c = myComplaints.find((x) => x.id === event.complaintId);
                        if (c) openDetail(c);
                      }}>
                        <div className="flex items-start gap-3">
                          <div className={cn('rounded-lg p-1.5 shrink-0', cfg.iconBg, cfg.iconText)}>
                            <CatIcon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn('text-xs font-semibold', evCfg.color)}>{evCfg.label}</span>
                              <span className="text-xs text-muted-foreground">·</span>
                              <span className="text-sm font-medium truncate max-w-[250px]">{event.subject}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span>{formatDateTime(event.date)}</span>
                              {event.actor && <span className="flex items-center gap-1"><UserCircle className="h-3 w-3" />{event.actor}</span>}
                              {event.statusTo && <StatusBadge status={event.statusTo} />}
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ────────────────── TAB 4: Analytics ────────────────── */}
        <TabsContent value="analytics" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Resolution Rate Ring */}
            <GlassCard className="p-6" glow="emerald" hover>
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Resolution Rate</h3>
              <div className="flex items-center justify-center">
                <RingChart value={analytics.resolved} max={analytics.total} color="#10b981" label="resolved" />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">{analytics.resolved} of {analytics.total} complaints resolved</p>
            </GlassCard>

            {/* Category Distribution */}
            <GlassCard className="p-6 md:col-span-2" hover>
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Category Distribution</h3>
              <div className="space-y-3">
                {Object.entries(analytics.catDist)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, count]) => {
                    const cfg = categoryConfig[cat] || categoryConfig.other;
                    const pct = analytics.total > 0 ? (count / analytics.total) * 100 : 0;
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2">
                            <span className={cn('h-2 w-2 rounded-full', categoryColorBar[cat])} />
                            {cfg.label}
                          </span>
                          <span className="text-muted-foreground">{count} ({Math.round(pct)}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                          <motion.div
                            className={cn('h-full rounded-full', categoryColorBar[cat])}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                {Object.keys(analytics.catDist).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No data available</p>
                )}
              </div>
            </GlassCard>

            {/* Priority Breakdown */}
            <GlassCard className="p-6 md:col-span-2 lg:col-span-1" hover>
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Priority Breakdown</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'low', label: 'Low', color: 'slate', icon: Gauge },
                  { key: 'medium', label: 'Medium', color: 'cyan', icon: Activity },
                  { key: 'high', label: 'High', color: 'amber', icon: AlertTriangle },
                  { key: 'critical', label: 'Critical', color: 'rose', icon: Flame },
                ].map((p) => {
                  const PIcon = p.icon;
                  const count = analytics.priorityBreakdown[p.key as keyof typeof analytics.priorityBreakdown] || 0;
                  return (
                    <GlassCard key={p.key} className={cn('p-3 text-center', `from-${p.color}-500/20`)} hover>
                      <PIcon className={cn('h-4 w-4 mx-auto mb-1', `text-${p.color}-400`)} />
                      <p className="text-lg font-bold">{count}</p>
                      <p className="text-[10px] text-muted-foreground">{p.label}</p>
                    </GlassCard>
                  );
                })}
              </div>
            </GlassCard>

            {/* Average Resolution Time */}
            <GlassCard className="p-6" glow="cyan" hover>
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Avg. Resolution Time</h3>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <Timer className="h-6 w-6 text-cyan-400" />
                  <span className="text-3xl font-bold text-cyan-400">
                    {analytics.avgResolutionDays}
                  </span>
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Average time from filed to resolved</p>
              </div>
            </GlassCard>

            {/* SLA Compliance */}
            <GlassCard className="p-6" glow={analytics.slaRate >= 80 ? 'emerald' : 'rose'} hover>
              <h3 className="text-sm font-medium text-muted-foreground mb-4">SLA Compliance</h3>
              <div className="flex items-center justify-center">
                <RingChart value={analytics.slaRate} max={100} size={100} strokeWidth={8} color={analytics.slaRate >= 80 ? '#10b981' : '#f43f5e'} label="SLA" />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">
                {analytics.slaRate >= 80 ? 'On track' : 'Needs improvement'} — resolved within due date
              </p>
            </GlassCard>

            {/* Monthly Trend */}
            <GlassCard className="p-6 md:col-span-2 lg:col-span-3" hover>
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Monthly Trend (Last 6 Months)</h3>
              <div className="flex items-end gap-4 h-40">
                {analytics.monthlyData.map((m, i) => {
                  const maxCount = Math.max(...analytics.monthlyData.map((x) => x.count), 1);
                  const heightPct = (m.count / maxCount) * 100;
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-xs font-medium text-cyan-400">{m.count}</span>
                      <div className="w-full flex-1 flex items-end">
                        <motion.div
                          className="w-full rounded-t-md bg-gradient-to-t from-cyan-500/60 to-cyan-400/30"
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(heightPct, 4)}%` }}
                          transition={{ duration: 0.6, delay: i * 0.1, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{m.month}</span>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════
         FILE COMPLAINT DIALOG
         ═══════════════════════════════════════════════════════════ */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); setPreviewMode(false); } }}>
        <DialogContent className="glass-strong border-white/20 sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-400" /> File a Complaint
            </DialogTitle>
            <DialogDescription className="sr-only">Submit a new complaint form</DialogDescription>
          </DialogHeader>

          {!previewMode ? (
            <div className="space-y-5 py-2">
              {/* Category Selector Grid */}
              <div className="space-y-2">
                <Label>Category</Label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(categoryConfig).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    const selected = form.category === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, category: key }))}
                        className={cn(
                          'flex flex-col items-center gap-1.5 rounded-lg p-3 border transition-all text-center',
                          selected
                            ? `${cfg.iconBg} ${cfg.iconText} border-current`
                            : 'border-white/10 hover:border-white/20 text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-[10px] font-medium">{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="Brief subject of your complaint..."
                  className="bg-white/5 border-white/10"
                />
              </div>

              {/* Description with char count */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Description</Label>
                  <span className={cn('text-xs', form.description.length > 1800 ? 'text-rose-400' : 'text-muted-foreground')}>
                    {form.description.length}/2000
                  </span>
                </div>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, 2000) }))}
                  placeholder="Describe your complaint in detail..."
                  className="bg-white/5 border-white/10 min-h-[120px]"
                />
              </div>

              {/* Priority & Severity */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-400" /> Low</span></SelectItem>
                      <SelectItem value="medium"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-cyan-400" /> Medium</span></SelectItem>
                      <SelectItem value="high"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-400" /> High</span></SelectItem>
                      <SelectItem value="critical"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-rose-400" /> Critical</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <Select value={form.severity} onValueChange={(v) => setForm((f) => ({ ...f, severity: v }))}>
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal"><span className="flex items-center gap-2"><Info className="h-3 w-3" /> Normal</span></SelectItem>
                      <SelectItem value="sensitive"><span className="flex items-center gap-2"><AlertTriangle className="h-3 w-3" /> Sensitive</span></SelectItem>
                      <SelectItem value="critical"><span className="flex items-center gap-2"><AlertOctagon className="h-3 w-3" /> Critical</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Anonymous Toggle */}
              <GlassCard className="p-4" glow={form.isAnonymous ? 'cyan' : 'none'}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className={cn('h-5 w-5', form.isAnonymous ? 'text-cyan-400' : 'text-muted-foreground')} />
                    <div>
                      <p className="text-sm font-medium">Submit Anonymously</p>
                      <p className="text-xs text-muted-foreground">Your identity will be hidden from all viewers</p>
                    </div>
                  </div>
                  <Switch
                    checked={form.isAnonymous}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, isAnonymous: v }))}
                  />
                </div>
                {form.isAnonymous && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-start gap-2 text-xs text-cyan-400/80">
                      <Shield className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>Your name, email, and department will be concealed. Only authorized investigators may access your identity under strict protocols.</span>
                    </div>
                  </motion.div>
                )}
              </GlassCard>

              {/* Due Date (optional) */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" /> Due Date <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="bg-white/5 border-white/10"
                />
              </div>

              {/* Department */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5" /> Department <span className="text-muted-foreground">(auto-detected or manual)</span>
                </Label>
                <Select
                  value={form.departmentId || user?.departmentId || 'none'}
                  onValueChange={(v) => setForm((f) => ({ ...f, departmentId: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific department</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            /* Preview Mode */
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Eye className="h-3.5 w-3.5" /> Preview before submission
              </div>
              <GlassCard className="p-4" glow="cyan">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {form.category && (() => {
                      const cfg = categoryConfig[form.category];
                      const Icon = cfg.icon;
                      return (
                        <Badge variant="outline" className={cn('text-[10px]', cfg.iconBg, cfg.iconText, 'border-0 gap-1')}>
                          <Icon className="h-2.5 w-2.5" /> {cfg.label}
                        </Badge>
                      );
                    })()}
                    <Badge variant="outline" className={cn('text-[10px]', priorityColor[form.priority], 'border-0 gap-0.5')}>
                      <span className={cn('h-2 w-2 rounded-full', priorityDot[form.priority])} />
                      {priorityLabel[form.priority]}
                    </Badge>
                    <Badge variant="outline" className={cn('text-[10px]', severityColor[form.severity], 'border-0')}>
                      {severityLabel[form.severity]}
                    </Badge>
                    {form.isAnonymous && (
                      <Badge variant="outline" className="text-[10px] bg-slate-500/20 text-slate-400 border-slate-500/30 gap-1">
                        <Shield className="h-2.5 w-2.5" /> Anonymous
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-medium">{form.subject || '(No subject)'}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{form.description || '(No description)'}</p>
                  {form.dueDate && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" /> Due: {formatDate(form.dueDate)}
                    </p>
                  )}
                </div>
              </GlassCard>
            </div>
          )}

          <DialogFooter className="flex-row gap-2">
            {!previewMode ? (
              <>
                <Button variant="outline" onClick={() => { setDialogOpen(false); setPreviewMode(false); }} className="border-white/10">Cancel</Button>
                <Button
                  onClick={() => setPreviewMode(true)}
                  disabled={!form.subject.trim() || !form.description.trim() || !form.category}
                  className="gap-2 bg-cyan-600 hover:bg-cyan-500"
                >
                  <Eye className="h-4 w-4" /> Preview
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setPreviewMode(false)} className="border-white/10">Edit</Button>
                <Button onClick={handleSubmit} disabled={submitting} className="gap-2 bg-emerald-600 hover:bg-emerald-500">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {submitting ? 'Submitting...' : 'Submit Complaint'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════
         ESCALATE DIALOG
         ═══════════════════════════════════════════════════════════ */}
      <Dialog open={!!escalateDialog} onOpenChange={(open) => { if (!open) setEscalateDialog(null); }}>
        <DialogContent className="glass-strong border-white/20 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-orange-400" /> Escalate Complaint
            </DialogTitle>
            <DialogDescription className="sr-only">Escalate complaint {escalateDialog?.subject}</DialogDescription>
          </DialogHeader>

          {escalateDialog && (
            <div className="space-y-4 py-2">
              <GlassCard className="p-3">
                <p className="text-sm font-medium truncate">{escalateDialog.subject}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{escalateDialog.description}</p>
              </GlassCard>

              <div className="space-y-2">
                <Label>Reason for Escalation</Label>
                <Textarea
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  placeholder="Explain why this complaint needs escalation..."
                  className="bg-white/5 border-white/10 min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Urgency Level</Label>
                <Select value={escalateUrgency} onValueChange={setEscalateUrgency}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medium">Medium — Needs sooner attention</SelectItem>
                    <SelectItem value="high">High — Urgent matter</SelectItem>
                    <SelectItem value="critical">Critical — Immediate action required</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <GlassCard className="p-3 flex items-center gap-2" glow="rose">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Escalating will flag this complaint for higher-level review and may change the handling process.
                </p>
              </GlassCard>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEscalateDialog(null)} className="border-white/10">Cancel</Button>
            <Button onClick={handleEscalate} disabled={escalating} className="gap-2 bg-orange-600 hover:bg-orange-500">
              {escalating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
              {escalating ? 'Escalating...' : 'Escalate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
