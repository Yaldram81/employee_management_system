'use client';

import { useState, useMemo, useCallback } from 'react';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { StatusBadge } from './status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Users, Monitor, Building, DollarSign, Briefcase, Shield, MessageSquare, HelpCircle,
  AlertTriangle, Eye, UserCheck, Send, ArrowUpRight, XCircle, Search, Clock,
  Loader2, AlertCircle, Flame, TrendingUp, BarChart3, MoreHorizontal, Download,
  RotateCcw, GitMerge, Mail, UserPlus, Trash2, Filter, CheckSquare, Timer,
  ArrowDownRight, Info, ChevronUp, ChevronDown, Target, ShieldAlert, Activity,
} from 'lucide-react';
import type { Complaint, LucideIcon } from '@/lib/types';
import { timeAgo } from './shared';

// ─── Config ───────────────────────────────────────────────────
const catCfg: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  hr: { icon: Users, color: 'emerald', label: 'HR' },
  it: { icon: Monitor, color: 'cyan', label: 'IT' },
  facilities: { icon: Building, color: 'amber', label: 'Facilities' },
  finance: { icon: DollarSign, color: 'orange', label: 'Finance' },
  management: { icon: Briefcase, color: 'violet', label: 'Management' },
  security: { icon: Shield, color: 'rose', label: 'Security' },
  general: { icon: MessageSquare, color: 'slate', label: 'General' },
  other: { icon: HelpCircle, color: 'teal', label: 'Other' },
};

const priColor: Record<string, string> = {
  critical: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  high: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  medium: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};
const sevColor: Record<string, string> = {
  normal: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  sensitive: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  critical: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

// ─── SLA Thresholds ───────────────────────────────────────────
const SLA_HOURS: Record<string, number> = { critical: 24, high: 48, medium: 72, low: 120 };

function slaStatus(c: Complaint): { remaining: number; breached: boolean; pct: number } {
  if (c.status === 'resolved' || c.status === 'closed') {
    if (!c.resolvedAt || !c.createdAt) return { remaining: 0, breached: false, pct: 100 };
    const hrs = (new Date(c.resolvedAt).getTime() - new Date(c.createdAt).getTime()) / 3600000;
    const limit = SLA_HOURS[c.priority] || 72;
    return { remaining: 0, breached: hrs > limit, pct: Math.min(100, (hrs / limit) * 100) };
  }
  if (!c.createdAt) return { remaining: 72, breached: false, pct: 0 };
  const elapsed = (Date.now() - new Date(c.createdAt).getTime()) / 3600000;
  const limit = SLA_HOURS[c.priority] || 72;
  const remaining = limit - elapsed;
  return { remaining, breached: remaining < 0, pct: Math.min(100, (elapsed / limit) * 100) };
}

function formatHrs(h: number): string {
  if (h < 0) return `${Math.abs(Math.round(h))}h overdue`;
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${Math.round(h)}h`;
}

type SortKey = 'subject' | 'category' | 'priority' | 'severity' | 'status' | 'createdAt';
type SortDir = 'asc' | 'desc';

// ─── Internal Comment type ────────────────────────────────────
interface InternalComment {
  id: string; author: string; text: string; type: 'internal' | 'external'; time: string;
}

// ─── Component ────────────────────────────────────────────────
export function ManagerComplaintReviewBoard() {
  const { user, complaints, users, updateComplaint, setActiveView, setSelectedComplaintId } = useEMSStore();

  // ─── State ────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterSla, setFilterSla] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Dialog states
  const [delegateOpen, setDelegateOpen] = useState(false);
  const [requestInfoOpen, setRequestInfoOpen] = useState(false);
  const [returnRevisionOpen, setReturnRevisionOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);

  // Dialog form states
  const [delegateTo, setDelegateTo] = useState('');
  const [delegateNote, setDelegateNote] = useState('');
  const [requestInfoMsg, setRequestInfoMsg] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [mergeTargetIds, setMergeTargetIds] = useState<string[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentType, setCommentType] = useState<'internal' | 'external'>('internal');

  // Bulk update form
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkPriority, setBulkPriority] = useState('');
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkSeverity, setBulkSeverity] = useState('');

  // Internal comments (local state per complaint)
  const [commentsMap, setCommentsMap] = useState<Record<string, InternalComment[]>>({});

  // ─── Derived Data ─────────────────────────────────────────
  const deptUsers = useMemo(() => {
    if (!user?.departmentId) return users;
    return users.filter(u => u.departmentId === user.departmentId);
  }, [users, user?.departmentId]);

  const deptComplaints = useMemo(() => {
    const ids = new Set(deptUsers.map(u => u.id));
    return complaints.filter(c => ids.has(c.userId) || c.userId === user?.id || c.departmentId === user?.departmentId);
  }, [complaints, deptUsers, user?.id, user?.departmentId]);

  const assignableMembers = useMemo(() => deptUsers.filter(u => u.id && u.role !== 'admin'), [deptUsers]);

  // Stats
  const openCount = deptComplaints.filter(c => c.status === 'open').length;
  const investigatingCount = deptComplaints.filter(c => c.status === 'investigating').length;
  const inProgressCount = deptComplaints.filter(c => c.status === 'in-progress').length;
  const resolvedThisMonth = deptComplaints.filter(c => {
    if ((c.status !== 'resolved' && c.status !== 'closed') || !c.resolvedAt) return false;
    const d = new Date(c.resolvedAt);
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).length;
  const escalatedCount = deptComplaints.filter(c => c.status === 'escalated').length;
  const criticalOpenCount = deptComplaints.filter(c => c.priority === 'critical' && !['resolved', 'closed'].includes(c.status)).length;

  const avgResolutionHours = useMemo(() => {
    const r = deptComplaints.filter(c => c.resolvedAt && c.createdAt);
    if (!r.length) return 0;
    return Math.round(r.reduce((s, c) => s + (new Date(c.resolvedAt!).getTime() - new Date(c.createdAt).getTime()), 0) / r.length / 3600000);
  }, [deptComplaints]);

  // SLA compliance
  const slaCompliant = useMemo(() => {
    const resolved = deptComplaints.filter(c => c.resolvedAt && c.createdAt);
    if (!resolved.length) return 100;
    const ok = resolved.filter(c => (new Date(c.resolvedAt!).getTime() - new Date(c.createdAt).getTime()) <= (SLA_HOURS[c.priority] || 72) * 3600000);
    return Math.round((ok.length / resolved.length) * 100);
  }, [deptComplaints]);

  const breachedComplaints = useMemo(() => deptComplaints.filter(c => slaStatus(c).breached), [deptComplaints]);
  const atRiskComplaints = useMemo(() => deptComplaints.filter(c => { const s = slaStatus(c); return !s.breached && s.remaining < 12 && c.status !== 'resolved' && c.status !== 'closed'; }), [deptComplaints]);

  // Priority queue
  const criticalCards = deptComplaints.filter(c => c.priority === 'critical' && !['resolved', 'closed'].includes(c.status));
  const highCards = deptComplaints.filter(c => c.priority === 'high' && !['resolved', 'closed'].includes(c.status));
  const normalCards = deptComplaints.filter(c => (c.priority === 'medium' || c.priority === 'low') && !['resolved', 'closed'].includes(c.status));
  const escalatedComplaints = deptComplaints.filter(c => c.status === 'escalated');

  // Trend
  const trendData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      const ds = d.toDateString();
      const lbl = d.toLocaleDateString('en-US', { weekday: 'short' });
      return { label: lbl, count: deptComplaints.filter(c => new Date(c.createdAt).toDateString() === ds).length };
    });
  }, [deptComplaints]);
  const maxTrend = Math.max(...trendData.map(t => t.count), 1);

  // Monthly trend (6 months)
  const monthlyTrend = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
      const mo = d.toLocaleDateString('en-US', { month: 'short' });
      const count = deptComplaints.filter(c => { const cd = new Date(c.createdAt); return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear(); }).length;
      return { label: mo, count };
    });
  }, [deptComplaints]);
  const maxMonthly = Math.max(...monthlyTrend.map(t => t.count), 1);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    deptComplaints.forEach(c => { map[c.category] = (map[c.category] || 0) + 1; });
    const total = deptComplaints.length || 1;
    return Object.entries(map).map(([k, v]) => ({ key: k, count: v, pct: Math.round((v / total) * 100), cfg: catCfg[k] })).sort((a, b) => b.count - a.count);
  }, [deptComplaints]);

  // Severity breakdown
  const severityBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    deptComplaints.forEach(c => { map[c.severity] = (map[c.severity] || 0) + 1; });
    const total = deptComplaints.length || 1;
    return Object.entries(map).map(([k, v]) => ({ key: k, count: v, pct: Math.round((v / total) * 100) })).sort((a, b) => b.count - a.count);
  }, [deptComplaints]);

  // Resolution rate by category
  const resolutionByCategory = useMemo(() => {
    return categoryBreakdown.map(cat => {
      const catComplaints = deptComplaints.filter(c => c.category === cat.key);
      const resolved = catComplaints.filter(c => c.status === 'resolved' || c.status === 'closed').length;
      return { ...cat, resolved, rate: catComplaints.length ? Math.round((resolved / catComplaints.length) * 100) : 0 };
    });
  }, [deptComplaints, categoryBreakdown]);

  // Team member handling stats
  const teamStats = useMemo(() => {
    const map: Record<string, { name: string; resolved: number; open: number; total: number }> = {};
    assignableMembers.forEach(m => { map[m.id] = { name: m.name, resolved: 0, open: 0, total: 0 }; });
    deptComplaints.forEach(c => {
      if (c.assignedToId && map[c.assignedToId]) {
        map[c.assignedToId].total++;
        if (c.status === 'resolved' || c.status === 'closed') map[c.assignedToId].resolved++;
        else map[c.assignedToId].open++;
      }
    });
    return Object.values(map).filter(s => s.total > 0).sort((a, b) => b.resolved - a.resolved);
  }, [deptComplaints, assignableMembers]);

  // Avg resolution time trend (by month)
  const resolutionTrend = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
      const mo = d.toLocaleDateString('en-US', { month: 'short' });
      const r = deptComplaints.filter(c => c.resolvedAt && c.createdAt && new Date(c.resolvedAt).getMonth() === d.getMonth() && new Date(c.resolvedAt).getFullYear() === d.getFullYear());
      const avg = r.length ? Math.round(r.reduce((s, c) => s + (new Date(c.resolvedAt!).getTime() - new Date(c.createdAt).getTime()), 0) / r.length / 3600000) : 0;
      return { label: mo, avg };
    });
  }, [deptComplaints]);

  // ─── Filtered + Sorted ────────────────────────────────────
  const filtered = useMemo(() => {
    let list = deptComplaints.filter(c => {
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;
      if (filterCategory !== 'all' && c.category !== filterCategory) return false;
      if (filterPriority !== 'all' && c.priority !== filterPriority) return false;
      if (filterSeverity !== 'all' && c.severity !== filterSeverity) return false;
      if (filterAssignee !== 'all') {
        if (filterAssignee === 'unassigned' && c.assignedToId) return false;
        if (filterAssignee !== 'unassigned' && c.assignedToId !== filterAssignee) return false;
      }
      if (filterSla !== 'all') {
        const s = slaStatus(c);
        if (filterSla === 'breached' && !s.breached) return false;
        if (filterSla === 'at-risk' && (s.breached || s.remaining >= 12)) return false;
        if (filterSla === 'on-track' && s.breached) return false;
      }
      if (dateFrom && new Date(c.createdAt) < new Date(dateFrom)) return false;
      if (dateTo) { const end = new Date(dateTo); end.setHours(23, 59, 59); if (new Date(c.createdAt) > end) return false; }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return c.subject.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || (c.userName || '').toLowerCase().includes(q);
      }
      return true;
    });
    const priOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'priority') cmp = (priOrder[a.priority] ?? 3) - (priOrder[b.priority] ?? 3);
      else if (sortKey === 'createdAt') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortKey === 'subject') cmp = a.subject.localeCompare(b.subject);
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortKey === 'category') cmp = a.category.localeCompare(b.category);
      else if (sortKey === 'severity') cmp = a.severity.localeCompare(b.severity);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [deptComplaints, filterStatus, filterCategory, filterPriority, filterSeverity, filterAssignee, filterSla, dateFrom, dateTo, searchQuery, sortKey, sortDir]);

  // ─── Actions ──────────────────────────────────────────────
  const handleAction = useCallback(async (id: string, updates: Partial<Complaint>, msg: string) => {
    setActionLoading(true);
    try {
      await updateComplaint(id, updates);
      toast.success(msg);
      setSelectedComplaint(prev => prev ? { ...prev, ...updates } : null);
      setResolutionNotes('');
    } catch { toast.error('Action failed'); }
    finally { setActionLoading(false); }
  }, [updateComplaint]);

  const openDetail = useCallback((c: Complaint) => {
    setSelectedComplaintId(c.id);
    setActiveView('complaint-detail');
  }, [setActiveView, setSelectedComplaintId]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => sortKey === k ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null;

  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });
  const toggleAll = () => setSelectedIds(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(c => c.id)));

  const addComment = () => {
    if (!selectedComplaint || !commentText.trim()) return;
    const c: InternalComment = { id: Date.now().toString(), author: user?.name || 'Manager', text: commentText, type: commentType, time: new Date().toISOString() };
    setCommentsMap(prev => ({ ...prev, [selectedComplaint.id]: [...(prev[selectedComplaint.id] || []), c] }));
    setCommentText(''); setCommentOpen(false); toast.success('Comment added');
  };

  const csvExport = () => {
    const hdr = ['Subject', 'Category', 'Priority', 'Severity', 'Status', 'Reporter', 'Assigned', 'Created', 'SLA Status'].join(',');
    const rows = filtered.map(c => [c.subject, c.category, c.priority, c.severity, c.status, c.isAnonymous ? 'Anonymous' : c.userName || '', c.assigneeName || '', new Date(c.createdAt).toLocaleDateString(), slaStatus(c).breached ? 'Breached' : 'On Track'].map(v => `"${v}"`).join(','));
    const blob = new Blob([hdr + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'complaints.csv'; a.click(); URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const bulkDelete = async () => {
    if (!selectedIds.size) return;
    setActionLoading(true);
    for (const id of selectedIds) { try { await updateComplaint(id, { status: 'closed' as Complaint['status'] }); } catch { /* skip */ } }
    toast.success(`${selectedIds.size} complaints closed`);
    setSelectedIds(new Set()); setActionLoading(false);
  };

  const bulkUpdate = async () => {
    if (!selectedIds.size) return;
    setActionLoading(true);
    const updates: Partial<Complaint> = {};
    if (bulkStatus) updates.status = bulkStatus as Complaint['status'];
    if (bulkPriority) updates.priority = bulkPriority as Complaint['priority'];
    if (bulkSeverity) updates.severity = bulkSeverity as Complaint['severity'];
    if (bulkCategory) updates.category = bulkCategory as Complaint['category'];
    if (bulkAssignee) { updates.assignedToId = bulkAssignee; updates.assigneeName = assignableMembers.find(m => m.id === bulkAssignee)?.name; }
    for (const id of selectedIds) { try { await updateComplaint(id, updates); } catch { /* skip */ } }
    toast.success(`${selectedIds.size} complaints updated`);
    setSelectedIds(new Set()); setBulkOpen(false); setActionLoading(false);
    setBulkStatus(''); setBulkPriority(''); setBulkAssignee(''); setBulkCategory(''); setBulkSeverity('');
  };

  // ─── Status Timeline ─────────────────────────────────────
  const statusTimeline = (c: Complaint) => {
    const steps = ['open', 'investigating', 'in-progress', 'resolved', 'closed'];
    const idx = steps.indexOf(c.status);
    return steps.map((s, i) => (
      <div key={s} className="flex items-center gap-1.5">
        <div className={cn('h-2.5 w-2.5 rounded-full border-2', i <= idx ? 'bg-emerald-400 border-emerald-400' : 'bg-transparent border-black/[0.12] dark:border-white/[0.2]')} />
        <span className={cn('text-[10px] capitalize', i <= idx ? 'text-emerald-400' : 'text-muted-foreground')}>{s}</span>
        {i < steps.length - 1 && <div className={cn('flex-1 h-px', i < idx ? 'bg-emerald-400/40' : 'bg-black/[0.06] dark:bg-white/[0.1]')} />}
      </div>
    ));
  };

  // ─── Activity Timeline (simulated) ────────────────────────
  const activityTimeline = (c: Complaint) => {
    const events: { label: string; time: string; icon: LucideIcon; color: string }[] = [];
    events.push({ label: 'Complaint submitted', time: c.createdAt, icon: MessageSquare, color: 'text-cyan-400' });
    if (c.escalatedAt) events.push({ label: `Escalated by ${c.escalatorName || 'system'}`, time: c.escalatedAt, icon: ArrowUpRight, color: 'text-rose-400' });
    if (c.resolvedAt) events.push({ label: `Resolved by ${c.resolverName || 'system'}`, time: c.resolvedAt, icon: UserCheck, color: 'text-emerald-400' });
    if (c.closedAt) events.push({ label: 'Closed', time: c.closedAt, icon: XCircle, color: 'text-slate-400' });
    const comments = commentsMap[c.id] || [];
    comments.forEach(cm => events.push({ label: `${cm.type === 'internal' ? 'Internal' : 'External'} comment by ${cm.author}`, time: cm.time, icon: MessageSquare, color: 'text-amber-400' }));
    events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return events.map((e, i) => (
      <div key={i} className="flex items-start gap-2 text-xs">
        <e.icon className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', e.color)} />
        <div className="flex-1"><span className="text-foreground">{e.label}</span><span className="text-muted-foreground ml-2">{timeAgo(e.time)}</span></div>
      </div>
    ));
  };

  // ─── Row Actions Dropdown ────────────────────────────────
  const RowActions = ({ c }: { c: Complaint }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={e => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction(c.id, { status: 'investigating' }, 'Now investigating'); }}><Search className="h-3.5 w-3.5 mr-2" />Investigate</DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction(c.id, { status: 'in-progress' }, 'In Progress'); }}><UserCheck className="h-3.5 w-3.5 mr-2" />In Progress</DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction(c.id, { status: 'resolved', resolution: resolutionNotes || undefined, resolvedBy: user?.id, resolverName: user?.name, resolvedAt: new Date().toISOString() }, 'Resolved'); }}><CheckSquare className="h-3.5 w-3.5 mr-2" />Resolve</DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction(c.id, { status: 'escalated', escalatedAt: new Date().toISOString(), escalatedBy: user?.id, escalatorName: user?.name }, 'Escalated'); }}><ArrowUpRight className="h-3.5 w-3.5 mr-2" />Escalate</DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedComplaint(c); setDelegateTo(''); setDelegateNote(''); setDelegateOpen(true); }}><UserPlus className="h-3.5 w-3.5 mr-2" />Delegate</DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedComplaint(c); setRequestInfoMsg(''); setRequestInfoOpen(true); }}><Mail className="h-3.5 w-3.5 mr-2" />Request Info</DropdownMenuItem>
        {['resolved', 'closed'].includes(c.status) && <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedComplaint(c); setRevisionReason(''); setReturnRevisionOpen(true); }}><RotateCcw className="h-3.5 w-3.5 mr-2" />Return for Revision</DropdownMenuItem>}
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedComplaint(c); setMergeTargetIds([]); setMergeOpen(true); }}><GitMerge className="h-3.5 w-3.5 mr-2" />Merge Duplicates</DropdownMenuItem>
        <DropdownMenuItem className="text-rose-400" onClick={(e) => { e.stopPropagation(); handleAction(c.id, { status: 'closed', closedAt: new Date().toISOString() }, 'Complaint deleted'); }}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // ─── Filter Row ──────────────────────────────────────────
  const FilterRow = () => (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-9 w-40 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
      </div>
      <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-28 h-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="all">All Status</SelectItem>{['open','investigating','in-progress','resolved','closed','escalated'].map(s => <SelectItem key={s} value={s}>{s.replace('-',' ')}</SelectItem>)}</SelectContent></Select>
      <Select value={filterCategory} onValueChange={setFilterCategory}><SelectTrigger className="w-28 h-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="all">All Category</SelectItem>{Object.entries(catCfg).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select>
      <Select value={filterPriority} onValueChange={setFilterPriority}><SelectTrigger className="w-24 h-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="all">All Pri</SelectItem>{['critical','high','medium','low'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
      <Select value={filterSeverity} onValueChange={setFilterSeverity}><SelectTrigger className="w-24 h-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="all">All Sev</SelectItem>{['normal','sensitive','critical'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
      <Select value={filterAssignee} onValueChange={setFilterAssignee}><SelectTrigger className="w-28 h-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="all">All Assignee</SelectItem><SelectItem value="unassigned">Unassigned</SelectItem>{assignableMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select>
      <Select value={filterSla} onValueChange={setFilterSla}><SelectTrigger className="w-28 h-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="all">All SLA</SelectItem><SelectItem value="on-track">On Track</SelectItem><SelectItem value="at-risk">At Risk</SelectItem><SelectItem value="breached">Breached</SelectItem></SelectContent></Select>
      <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 w-32 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs" />
      <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 w-32 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs" />
    </div>
  );

  // ─── Stat Card ───────────────────────────────────────────
  const StatBlock = ({ label, value, sub, icon: Icon, glow, valColor }: { label: string; value: string | number; sub?: string; icon: LucideIcon; glow: string; valColor?: string }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <GlassCard className="p-4 relative overflow-hidden min-h-[100px]" hover glow={glow}>
        <div className="flex items-start justify-between">
          <div className="space-y-1"><p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p><p className={cn('text-xl font-bold', valColor || 'text-foreground')}>{value}</p>{sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}</div>
          <div className={cn('rounded-xl p-2.5 shrink-0', glow === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' : glow === 'rose' ? 'bg-rose-500/10 text-rose-400' : glow === 'amber' ? 'bg-amber-500/10 text-amber-400' : 'bg-cyan-500/10 text-cyan-400')}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* ─── Header ──────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold"><span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">Complaint Review Board</span></h1>
          <p className="text-sm text-muted-foreground mt-1">{user?.department || 'Department'} &middot; Enterprise complaint management</p>
        </div>
        <div className="flex gap-2 items-center">
          {openCount > 0 && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-3 py-1 text-sm animate-pulse">{openCount} Open</Badge>}
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={csvExport}><Download className="h-3.5 w-3.5 mr-1" />Export CSV</Button>
        </div>
      </motion.div>

      {/* ─── Tabs ────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1]">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="all" className="text-xs">All Complaints <Badge variant="secondary" className="ml-1.5 h-4 text-[10px]">{deptComplaints.length}</Badge></TabsTrigger>
          <TabsTrigger value="escalated" className="text-xs">Escalated {escalatedCount > 0 && <Badge className="ml-1.5 h-4 text-[10px] bg-rose-500/20 text-rose-400">{escalatedCount}</Badge>}</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs">Analytics</TabsTrigger>
          <TabsTrigger value="sla" className="text-xs">SLA</TabsTrigger>
        </TabsList>

        {/* ═══ OVERVIEW TAB ═══════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatBlock label="Open" value={openCount} sub={`${investigatingCount} investigating`} icon={AlertCircle} glow="emerald" valColor="text-emerald-400" />
            <StatBlock label="Resolved / Mo" value={resolvedThisMonth} sub="Successfully closed" icon={UserCheck} glow="emerald" valColor="text-emerald-400" />
            <StatBlock label="Critical Open" value={criticalOpenCount} sub={`${escalatedCount} escalated`} icon={Flame} glow="rose" valColor="text-rose-400" />
            <StatBlock label="Avg Resolution" value={`${avgResolutionHours}h`} sub="Time to resolve" icon={Clock} glow="cyan" valColor="text-cyan-400" />
            <StatBlock label="SLA Rate" value={`${slaCompliant}%`} sub={breachedComplaints.length ? `${breachedComplaints.length} breached` : 'All compliant'} icon={Target} glow={slaCompliant >= 90 ? 'emerald' : 'amber'} valColor={slaCompliant >= 90 ? 'text-emerald-400' : 'text-amber-400'} />
          </div>

          {/* Priority Queue */}
          <GlassCard className="p-4" glow="emerald">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-emerald-400" />Priority Queue</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { label: 'Critical', items: criticalCards, color: 'rose', dot: 'bg-rose-500' },
                { label: 'High', items: highCards, color: 'amber', dot: 'bg-amber-500' },
                { label: 'Normal', items: normalCards, color: 'cyan', dot: 'bg-cyan-500' },
              ].map(col => (
                <div key={col.label} className="space-y-2">
                  <div className={cn('flex items-center gap-2 text-xs font-medium', `text-${col.color}-400`)}><span className={cn('h-2 w-2 rounded-full', col.dot)} />{col.label} ({col.items.length})</div>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar">
                    {col.items.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-3">No {col.label.toLowerCase()} complaints</p>}
                    {col.items.slice(0, 8).map(c => (
                      <div key={c.id} onClick={() => openDetail(c)} className="cursor-pointer rounded-lg border border-black/[0.06] dark:border-white/[0.05] bg-black/[0.01] dark:bg-white/[0.02] p-2.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors">
                        <div className="flex items-center gap-1.5 mb-0.5">{(() => { const I = catCfg[c.category]?.icon || MessageSquare; return <I className={cn('h-3 w-3', `text-${col.color}-400`)} />; })()}<span className="text-xs font-medium truncate">{c.subject}</span></div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground"><span>{c.isAnonymous ? 'Anonymous' : c.userName || '—'}</span><span>{timeAgo(c.createdAt)}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GlassCard className="p-4" glow="cyan">
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-cyan-400" />Trends (7d)</h2>
              <div className="flex items-end gap-2 h-28">{trendData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <motion.div initial={{ height: 0 }} animate={{ height: `${maxTrend ? (d.count / maxTrend) * 100 : 0}%` }} transition={{ delay: i * 0.08 }} className="w-full rounded-t bg-gradient-to-t from-cyan-500/40 to-cyan-400/20 min-h-[3px]" style={{ maxHeight: '100%' }} />
                  <span className="text-[9px] text-muted-foreground">{d.label}</span><span className="text-[9px] font-medium text-cyan-400">{d.count}</span>
                </div>
              ))}</div>
            </GlassCard>
            <GlassCard className="p-4" glow="emerald">
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-400" />Category Breakdown</h2>
              <div className="space-y-2">{categoryBreakdown.map((cat, i) => (
                <div key={cat.key} className="space-y-0.5">
                  <div className="flex justify-between text-[10px]"><span className="font-medium">{cat.cfg?.label || cat.key}</span><span className="text-muted-foreground">{cat.count} ({cat.pct}%)</span></div>
                  <Progress value={cat.pct} className="h-1.5 bg-black/[0.03] dark:bg-white/[0.05] [&>[data-slot=indicator]]:bg-gradient-to-r [&>[data-slot=indicator]]:from-emerald-500 [&>[data-slot=indicator]]:to-cyan-500" />
                </div>
              ))}</div>
            </GlassCard>
          </div>
        </TabsContent>

        {/* ═══ ALL COMPLAINTS TAB ═════════════════════════════ */}
        <TabsContent value="all" className="space-y-3 mt-4">
          {/* Bulk Actions Bar */}
          {selectedIds.size > 0 && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
              <span className="text-xs font-medium text-emerald-400">{selectedIds.size} selected</span>
              <Button size="sm" className="h-7 text-xs bg-cyan-600 hover:bg-cyan-700 text-white" onClick={() => { setBulkStatus(''); setBulkPriority(''); setBulkAssignee(''); setBulkCategory(''); setBulkSeverity(''); setBulkOpen(true); }}>Bulk Update</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-rose-400 hover:bg-rose-500/10" onClick={bulkDelete} disabled={actionLoading}>{actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1" />}Bulk Delete</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => setSelectedIds(new Set())}>Clear</Button>
            </motion.div>
          )}

          <GlassCard className="p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
              <h2 className="text-sm font-semibold flex items-center gap-2"><Filter className="h-4 w-4 text-cyan-400" />Department Complaints</h2>
              {FilterRow()}
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background/80 backdrop-blur-sm z-10">
                  <tr className="border-b border-black/[0.1] dark:border-white/[0.1]">
                    <th className="py-2 px-2 w-8"><Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} /></th>
                    {([['subject','Subject'],['category','Category'],['priority','Priority'],['severity','Severity'],['status','Status'],['createdAt','Date']] as [SortKey,string][]).map(([k,l]) => (
                      <th key={k} className="text-left py-2 px-2 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort(k)}>{l} {SortIcon({ k })}</th>
                    ))}
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Reporter</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Assigned</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">SLA</th>
                    <th className="py-2 px-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && <tr><td colSpan={11} className="text-center py-8 text-muted-foreground text-xs">No complaints found</td></tr>}
                  {filtered.map(c => {
                    const sla = slaStatus(c);
                    return (
                      <tr key={c.id} onClick={() => openDetail(c)} className="border-b border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.02] dark:hover:bg-white/[0.03] cursor-pointer transition-colors">
                        <td className="py-1.5 px-2" onClick={e => e.stopPropagation()}><Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} /></td>
                        <td className="py-1.5 px-2 font-medium truncate max-w-[160px] text-xs">{c.subject}</td>
                        <td className="py-1.5 px-2"><Badge variant="outline" className="text-[10px] bg-black/[0.03] dark:bg-white/[0.05]">{catCfg[c.category]?.label || c.category}</Badge></td>
                        <td className="py-1.5 px-2"><Badge variant="outline" className={cn('text-[10px]', priColor[c.priority] || priColor.low)}>{c.priority}</Badge></td>
                        <td className="py-1.5 px-2"><Badge variant="outline" className={cn('text-[10px]', sevColor[c.severity] || sevColor.normal)}>{c.severity}</Badge></td>
                        <td className="py-1.5 px-2"><StatusBadge status={c.status} /></td>
                        <td className="py-1.5 px-2 text-[10px] text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</td>
                        <td className="py-1.5 px-2 text-[10px]">{c.isAnonymous ? 'Anon' : c.userName || '—'}</td>
                        <td className="py-1.5 px-2 text-[10px]">{c.assigneeName || <span className="text-muted-foreground">—</span>}</td>
                        <td className="py-1.5 px-2"><Badge variant="outline" className={cn('text-[10px]', sla.breached ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : sla.remaining < 12 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30')}>{sla.breached ? 'Breached' : formatHrs(sla.remaining)}</Badge></td>
                        <td className="py-1.5 px-2" onClick={e => e.stopPropagation()}>{RowActions({ c })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </TabsContent>

        {/* ═══ ESCALATED TAB ═══════════════════════════════════ */}
        <TabsContent value="escalated" className="space-y-3 mt-4">
          <GlassCard className="p-4" glow="rose">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-rose-400" />Escalated Complaints ({escalatedComplaints.length})</h2>
            {escalatedComplaints.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No escalated complaints</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {escalatedComplaints.map(c => {
                const escAge = c.escalatedAt ? (Date.now() - new Date(c.escalatedAt).getTime()) / 3600000 : 0;
                return (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 space-y-2">
                    <div className="flex justify-between items-start"><span className="text-xs font-medium">{c.subject}</span><StatusBadge status="escalated" /></div>
                    <div className="text-[10px] text-muted-foreground space-y-0.5">
                      {c.escalatorName && <p>By: <span className="text-rose-400">{c.escalatorName}</span></p>}
                      <p>Escalation age: <span className="text-rose-400">{Math.round(escAge)}h</span></p>
                      <p>{c.isAnonymous ? 'Reporter: Anonymous' : `Reporter: ${c.userName || '—'}`}</p>
                      <p>Priority: <Badge variant="outline" className={cn('text-[10px]', priColor[c.priority])}>{c.priority}</Badge></p>
                    </div>
                    <div className="flex gap-1.5 pt-1">
                      <Button size="sm" className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAction(c.id, { status: 'investigating' }, 'Taken over')} disabled={actionLoading}><Search className="h-3 w-3 mr-1" />Take Over</Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] text-cyan-400 hover:bg-cyan-500/10" onClick={() => handleAction(c.id, { status: 'in-progress' }, 'De-escalated to in-progress')}><ArrowDownRight className="h-3 w-3 mr-1" />De-escalate</Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] text-amber-400 hover:bg-amber-500/10" onClick={() => { setSelectedComplaint(c); setDelegateTo(''); setDelegateNote(''); setDelegateOpen(true); }}><UserPlus className="h-3 w-3 mr-1" />Reassign</Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] text-slate-400 hover:bg-slate-500/10" onClick={() => { setSelectedComplaint(c); setRequestInfoMsg(''); setRequestInfoOpen(true); }}><Mail className="h-3 w-3 mr-1" />Request Info</Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </GlassCard>
        </TabsContent>

        {/* ═══ ANALYTICS TAB ═══════════════════════════════════ */}
        <TabsContent value="analytics" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatBlock label="Total Complaints" value={deptComplaints.length} icon={BarChart3} glow="emerald" valColor="text-emerald-400" />
            <StatBlock label="Resolution Rate" value={`${deptComplaints.length ? Math.round((deptComplaints.filter(c => ['resolved','closed'].includes(c.status)).length / deptComplaints.length) * 100) : 0}%`} icon={UserCheck} glow="cyan" valColor="text-cyan-400" />
            <StatBlock label="Avg Resolution" value={`${avgResolutionHours}h`} icon={Clock} glow="amber" valColor="text-amber-400" />
            <StatBlock label="SLA Compliance" value={`${slaCompliant}%`} icon={Target} glow={slaCompliant >= 90 ? 'emerald' : 'rose'} valColor={slaCompliant >= 90 ? 'text-emerald-400' : 'text-rose-400'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Monthly Trend */}
            <GlassCard className="p-4" glow="cyan">
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-cyan-400" />Monthly Trend</h2>
              <div className="flex items-end gap-3 h-32">{monthlyTrend.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <span className="text-[9px] font-medium text-cyan-400">{d.count}</span>
                  <motion.div initial={{ height: 0 }} animate={{ height: `${maxMonthly ? (d.count / maxMonthly) * 100 : 0}%` }} transition={{ delay: i * 0.1 }} className="w-full rounded-t bg-gradient-to-t from-cyan-500/50 to-cyan-400/20 min-h-[3px]" style={{ maxHeight: '100%' }} />
                  <span className="text-[9px] text-muted-foreground">{d.label}</span>
                </div>
              ))}</div>
            </GlassCard>

            {/* Category Distribution (horizontal bars) */}
            <GlassCard className="p-4" glow="emerald">
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-400" />Category Distribution</h2>
              <div className="space-y-2">{categoryBreakdown.map(cat => (
                <div key={cat.key} className="flex items-center gap-2">
                  <span className="text-[10px] w-20 text-right font-medium">{cat.cfg?.label || cat.key}</span>
                  <div className="flex-1 h-4 bg-black/[0.03] dark:bg-white/[0.05] rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${cat.pct}%` }} transition={{ duration: 0.5 }} className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full" /></div>
                  <span className="text-[10px] text-muted-foreground w-10">{cat.count}</span>
                </div>
              ))}</div>
            </GlassCard>

            {/* Severity Breakdown */}
            <GlassCard className="p-4" glow="rose">
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-rose-400" />Severity Breakdown</h2>
              <div className="space-y-3">{severityBreakdown.map(s => (
                <div key={s.key} className="space-y-1">
                  <div className="flex justify-between text-xs"><span className="capitalize font-medium">{s.key}</span><span className="text-muted-foreground">{s.count} ({s.pct}%)</span></div>
                  <Progress value={s.pct} className="h-2 bg-black/[0.03] dark:bg-white/[0.05] [&>[data-slot=indicator]]:bg-gradient-to-r [&>[data-slot=indicator]]:from-rose-500 [&>[data-slot=indicator]]:to-amber-500" />
                </div>
              ))}</div>
            </GlassCard>

            {/* Resolution Rate by Category */}
            <GlassCard className="p-4" glow="amber">
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><CheckSquare className="h-4 w-4 text-amber-400" />Resolution Rate by Category</h2>
              <div className="space-y-3">{resolutionByCategory.map(r => (
                <div key={r.key} className="space-y-1">
                  <div className="flex justify-between text-xs"><span className="font-medium">{r.cfg?.label || r.key}</span><span className="text-muted-foreground">{r.resolved}/{r.count} ({r.rate}%)</span></div>
                  <Progress value={r.rate} className="h-2 bg-black/[0.03] dark:bg-white/[0.05] [&>[data-slot=indicator]]:bg-gradient-to-r [&>[data-slot=indicator]]:from-amber-500 [&>[data-slot=indicator]]:to-emerald-500" />
                </div>
              ))}</div>
            </GlassCard>

            {/* Avg Resolution Time Trend */}
            <GlassCard className="p-4" glow="cyan">
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><Timer className="h-4 w-4 text-cyan-400" />Avg Resolution Time</h2>
              <div className="flex items-end gap-3 h-28">{resolutionTrend.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <span className="text-[9px] font-medium text-cyan-400">{d.avg}h</span>
                  <div className="w-full bg-cyan-500/30 rounded-t min-h-[3px]" style={{ height: `${Math.max(...resolutionTrend.map(r => r.avg), 1) ? (d.avg / Math.max(...resolutionTrend.map(r => r.avg), 1)) * 100 : 0}%`, maxHeight: '100%' }} />
                  <span className="text-[9px] text-muted-foreground">{d.label}</span>
                </div>
              ))}</div>
            </GlassCard>

            {/* Team Member Handling Stats */}
            <GlassCard className="p-4" glow="emerald">
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-emerald-400" />Team Handling Stats</h2>
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">{teamStats.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-3">No data</p>}{teamStats.map(s => (
                <div key={s.name} className="flex items-center gap-2 text-xs">
                  <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px] bg-emerald-500/20 text-emerald-400">{s.name[0]}</AvatarFallback></Avatar>
                  <span className="flex-1 font-medium">{s.name}</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px]">{s.resolved} resolved</Badge>
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px]">{s.open} open</Badge>
                </div>
              ))}</div>
            </GlassCard>
          </div>
        </TabsContent>

        {/* ═══ SLA TAB ═════════════════════════════════════════ */}
        <TabsContent value="sla" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatBlock label="SLA Compliance" value={`${slaCompliant}%`} sub={slaCompliant >= 90 ? 'Healthy' : 'Needs attention'} icon={Target} glow={slaCompliant >= 90 ? 'emerald' : 'rose'} valColor={slaCompliant >= 90 ? 'text-emerald-400' : 'text-rose-400'} />
            <StatBlock label="Breached" value={breachedComplaints.length} sub="Past deadline" icon={AlertTriangle} glow="rose" valColor="text-rose-400" />
            <StatBlock label="At Risk" value={atRiskComplaints.length} sub="< 12h remaining" icon={AlertCircle} glow="amber" valColor="text-amber-400" />
            <StatBlock label="On Track" value={deptComplaints.filter(c => !['resolved','closed'].includes(c.status) && !slaStatus(c).breached && slaStatus(c).remaining >= 12).length} sub="Comfortable" icon={CheckSquare} glow="emerald" valColor="text-emerald-400" />
          </div>

          {/* Breached */}
          <GlassCard className="p-4" glow="rose">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-rose-400" />Breached Complaints ({breachedComplaints.length})</h2>
            {breachedComplaints.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No breached complaints</p>}
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">{breachedComplaints.map(c => {
              const sla = slaStatus(c);
              return (
                <div key={c.id} onClick={() => openDetail(c)} className="cursor-pointer flex items-center gap-3 rounded-lg border border-rose-500/20 bg-rose-500/5 p-2.5 hover:bg-rose-500/10 transition-colors">
                  <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{c.subject}</p><p className="text-[10px] text-muted-foreground">{c.isAnonymous ? 'Anonymous' : c.userName || '—'} &middot; {c.priority}</p></div>
                  <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 text-[10px]">{formatHrs(sla.remaining)}</Badge>
                  <StatusBadge status={c.status} />
                </div>
              );
            })}</div>
          </GlassCard>

          {/* At Risk */}
          <GlassCard className="p-4" glow="amber">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-400" />At Risk ({atRiskComplaints.length})</h2>
            {atRiskComplaints.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No at-risk complaints</p>}
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">{atRiskComplaints.map(c => {
              const sla = slaStatus(c);
              return (
                <div key={c.id} onClick={() => openDetail(c)} className="cursor-pointer flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 hover:bg-amber-500/10 transition-colors">
                  <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{c.subject}</p><p className="text-[10px] text-muted-foreground">{c.isAnonymous ? 'Anonymous' : c.userName || '—'} &middot; {c.priority}</p></div>
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">{formatHrs(sla.remaining)} left</Badge>
                  <StatusBadge status={c.status} />
                </div>
              );
            })}</div>
          </GlassCard>

          {/* SLA Settings Recommendation */}
          <GlassCard className="p-4" glow="emerald">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><Info className="h-4 w-4 text-emerald-400" />SLA Thresholds & Recommendations</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(SLA_HOURS).map(([pri, hrs]) => (
                <div key={pri} className="rounded-lg border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.01] dark:bg-white/[0.02] p-3 space-y-1">
                  <div className="flex items-center gap-2"><Badge variant="outline" className={cn('text-[10px]', priColor[pri])}>{pri}</Badge></div>
                  <p className="text-lg font-bold text-foreground">{hrs}h</p>
                  <p className="text-[10px] text-muted-foreground">Resolution deadline</p>
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-xs text-muted-foreground">
              <p className="font-medium text-emerald-400 mb-1">Recommendations</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Critical complaints should be addressed within {SLA_HOURS.critical}h — consider auto-escalation</li>
                <li>Current compliance rate: <span className={slaCompliant >= 90 ? 'text-emerald-400' : 'text-rose-400'}>{slaCompliant}%</span></li>
                <li>{breachedComplaints.length} complaint(s) have breached SLA — review and take immediate action</li>
                <li>Average resolution time ({avgResolutionHours}h) should be well within SLA thresholds</li>
              </ul>
            </div>
          </GlassCard>
        </TabsContent>
      </Tabs>

      {/* ═══ DIALOGS ═══════════════════════════════════════════ */}

      {/* Delegate Dialog */}
      <Dialog open={delegateOpen} onOpenChange={setDelegateOpen}>
        <DialogContent className="bg-background/95 border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader><DialogTitle>Delegate Complaint</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Assign To</Label><Select value={delegateTo} onValueChange={setDelegateTo}><SelectTrigger className="h-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Select team member" /></SelectTrigger><SelectContent>{assignableMembers.filter(m => m.id).map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Delegation Note</Label><Textarea value={delegateNote} onChange={e => setDelegateNote(e.target.value)} placeholder="Explain why you're delegating..." className="min-h-[60px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] resize-none" /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setDelegateOpen(false)}>Cancel</Button><Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!delegateTo || actionLoading} onClick={() => { if (selectedComplaint && delegateTo) { const m = assignableMembers.find(u => u.id === delegateTo); handleAction(selectedComplaint.id, { assignedToId: delegateTo, assigneeName: m?.name }, `Delegated to ${m?.name}`); setDelegateOpen(false); } }}>{actionLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <UserPlus className="h-3 w-3 mr-1" />}Delegate</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Info Dialog */}
      <Dialog open={requestInfoOpen} onOpenChange={setRequestInfoOpen}>
        <DialogContent className="bg-background/95 border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader><DialogTitle>Request More Information</DialogTitle></DialogHeader>
          <div><Label className="text-xs">Message to Reporter</Label><Textarea value={requestInfoMsg} onChange={e => setRequestInfoMsg(e.target.value)} placeholder="Describe what information you need..." className="min-h-[80px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] resize-none" /></div>
          <DialogFooter><Button variant="ghost" onClick={() => setRequestInfoOpen(false)}>Cancel</Button><Button className="bg-cyan-600 hover:bg-cyan-700 text-white" disabled={!requestInfoMsg.trim() || actionLoading} onClick={() => { toast.success('Info requested from reporter'); setRequestInfoOpen(false); }}>{actionLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Mail className="h-3 w-3 mr-1" />}Send Request</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return for Revision Dialog */}
      <Dialog open={returnRevisionOpen} onOpenChange={setReturnRevisionOpen}>
        <DialogContent className="bg-background/95 border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader><DialogTitle>Return for Revision</DialogTitle></DialogHeader>
          <div><Label className="text-xs">Reason for Reopening</Label><Textarea value={revisionReason} onChange={e => setRevisionReason(e.target.value)} placeholder="Explain why this complaint needs revision..." className="min-h-[80px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] resize-none" /></div>
          <DialogFooter><Button variant="ghost" onClick={() => setReturnRevisionOpen(false)}>Cancel</Button><Button className="bg-rose-600 hover:bg-rose-700 text-white" disabled={!revisionReason.trim() || actionLoading} onClick={() => { if (selectedComplaint) { handleAction(selectedComplaint.id, { status: 'open', resolution: undefined, resolvedAt: undefined, resolvedBy: undefined, resolverName: undefined }, 'Returned for revision'); setReturnRevisionOpen(false); } }}>{actionLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RotateCcw className="h-3 w-3 mr-1" />}Reopen</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Duplicates Dialog */}
      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent className="bg-background/95 border-black/[0.1] dark:border-white/[0.1] max-w-md">
          <DialogHeader><DialogTitle>Merge Duplicate Complaints</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground mb-2">Select complaints to merge into <span className="font-medium text-foreground">{selectedComplaint?.subject}</span></p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
            {deptComplaints.filter(c => c.id !== selectedComplaint?.id && c.category === selectedComplaint?.category).map(c => (
              <label key={c.id} className="flex items-center gap-2 p-2 rounded-lg border border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.02] dark:hover:bg-white/[0.03] cursor-pointer">
                <Checkbox checked={mergeTargetIds.includes(c.id)} onCheckedChange={(checked) => setMergeTargetIds(prev => checked ? [...prev, c.id] : prev.filter(id => id !== c.id))} />
                <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{c.subject}</p><p className="text-[10px] text-muted-foreground">{c.status} &middot; {c.priority}</p></div>
              </label>
            ))}
            {deptComplaints.filter(c => c.id !== selectedComplaint?.id && c.category === selectedComplaint?.category).length === 0 && <p className="text-[10px] text-muted-foreground text-center py-3">No similar complaints found</p>}
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setMergeOpen(false)}>Cancel</Button><Button className="bg-amber-600 hover:bg-amber-700 text-white" disabled={!mergeTargetIds.length || actionLoading} onClick={() => { toast.success(`${mergeTargetIds.length} complaints merged`); mergeTargetIds.forEach(id => handleAction(id, { status: 'closed', closedAt: new Date().toISOString() }, 'Merged into parent')); setMergeOpen(false); }}>{actionLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <GitMerge className="h-3 w-3 mr-1" />}Merge ({mergeTargetIds.length})</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Update Dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="bg-background/95 border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader><DialogTitle>Bulk Update ({selectedIds.size} complaints)</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Status</Label><Select value={bulkStatus} onValueChange={setBulkStatus}><SelectTrigger className="h-8 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs"><SelectValue placeholder="Keep current" /></SelectTrigger><SelectContent>{['open','investigating','in-progress','resolved','closed','escalated'].map(s => <SelectItem key={s} value={s}>{s.replace('-',' ')}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Priority</Label><Select value={bulkPriority} onValueChange={setBulkPriority}><SelectTrigger className="h-8 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs"><SelectValue placeholder="Keep current" /></SelectTrigger><SelectContent>{['critical','high','medium','low'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Severity</Label><Select value={bulkSeverity} onValueChange={setBulkSeverity}><SelectTrigger className="h-8 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs"><SelectValue placeholder="Keep current" /></SelectTrigger><SelectContent>{['normal','sensitive','critical'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Category</Label><Select value={bulkCategory} onValueChange={setBulkCategory}><SelectTrigger className="h-8 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs"><SelectValue placeholder="Keep current" /></SelectTrigger><SelectContent>{Object.entries(catCfg).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="col-span-2"><Label className="text-xs">Assign To</Label><Select value={bulkAssignee} onValueChange={setBulkAssignee}><SelectTrigger className="h-8 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs"><SelectValue placeholder="Keep current" /></SelectTrigger><SelectContent>{assignableMembers.filter(m => m.id).map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setBulkOpen(false)}>Cancel</Button><Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={actionLoading} onClick={bulkUpdate}>{actionLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckSquare className="h-3 w-3 mr-1" />}Update All</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Comment Dialog */}
      <Dialog open={commentOpen} onOpenChange={setCommentOpen}>
        <DialogContent className="bg-background/95 border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader><DialogTitle>Add Comment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Type</Label><Select value={commentType} onValueChange={v => setCommentType(v as 'internal' | 'external')}><SelectTrigger className="h-8 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="internal">Internal (team only)</SelectItem><SelectItem value="external">External (visible to reporter)</SelectItem></SelectContent></Select></div>
            <div><Label className="text-xs">Comment</Label><Textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Write your comment..." className="min-h-[80px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] resize-none" /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setCommentOpen(false)}>Cancel</Button><Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!commentText.trim()} onClick={addComment}><Send className="h-3 w-3 mr-1" />Add Comment</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
