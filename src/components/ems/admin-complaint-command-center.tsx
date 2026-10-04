'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Monitor, Building, DollarSign, Briefcase, Shield,
  MessageSquare, HelpCircle, AlertTriangle, Clock, Eye,
  ChevronDown, Download, CheckCircle2, XCircle, Zap,
  ArrowUpRight, FileText, Search, Filter, UserCheck,
  Activity, ShieldAlert, MoreHorizontal, Ban, UserX
} from 'lucide-react';
import { GlassCard } from './glass-card';
import { StatCard } from './stat-card';
import { StatusBadge } from './status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useEMSStore } from '@/lib/store';
import type { Complaint } from '@/lib/types';
import type { LucideIcon } from 'lucide-react';
import { timeAgo, formatDate } from './shared';

// ─── Config Maps (static strings ONLY) ──────────────────────────────
const categoryConfig: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  hr: { icon: Users, color: 'emerald', label: 'HR' },
  it: { icon: Monitor, color: 'cyan', label: 'IT' },
  facilities: { icon: Building, color: 'amber', label: 'Facilities' },
  finance: { icon: DollarSign, color: 'orange', label: 'Finance' },
  management: { icon: Briefcase, color: 'violet', label: 'Management' },
  security: { icon: Shield, color: 'rose', label: 'Security' },
  general: { icon: MessageSquare, color: 'slate', label: 'General' },
  other: { icon: HelpCircle, color: 'teal', label: 'Other' },
};

const categoryBarColors: Record<string, string> = {
  hr: 'bg-emerald-500',
  it: 'bg-cyan-500',
  facilities: 'bg-amber-500',
  finance: 'bg-orange-500',
  management: 'bg-violet-500',
  security: 'bg-rose-500',
  general: 'bg-slate-500',
  other: 'bg-teal-500',
};

const priorityColors: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' },
  high: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  medium: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  low: { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/30' },
};

const severityColors: Record<string, { bg: string; text: string; ring: string }> = {
  critical: { bg: 'bg-rose-500/15', text: 'text-rose-400', ring: 'ring-rose-500/30' },
  sensitive: { bg: 'bg-amber-500/15', text: 'text-amber-400', ring: 'ring-amber-500/30' },
  normal: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', ring: 'ring-emerald-500/30' },
};

const escalatedBadgeClass = 'bg-rose-500/20 text-rose-400 border-rose-500/30';

const statusTimeline: Complaint['status'][] = ['open', 'investigating', 'in-progress', 'resolved', 'closed'];

const stagger = {
  container: { transition: { staggerChildren: 0.04 } },
  item: { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } },
};

// ─── Component ──────────────────────────────────────────────────────
export function AdminComplaintCommandCenter() {
  const { user, complaints, departments, users, updateComplaint, setSelectedComplaintId: setGlobalSelectedId, setActiveView } = useEMSStore();

  // ── State ──
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('overview');

  // ── Derived Data ──
  const filtered = useMemo(() => {
    return complaints.filter(c => {
      if (search && !c.subject.toLowerCase().includes(search.toLowerCase()) && !c.description.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
      if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false;
      if (severityFilter !== 'all' && c.severity !== severityFilter) return false;
      if (deptFilter !== 'all' && c.departmentId !== deptFilter && c.userDepartment !== deptFilter) return false;
      return true;
    });
  }, [complaints, search, statusFilter, categoryFilter, priorityFilter, severityFilter, deptFilter]);

  // ── Metrics ──
  const total = complaints.length;
  const openCount = complaints.filter(c => c.status === 'open').length;
  const investigating = complaints.filter(c => c.status === 'investigating').length;
  const inProgress = complaints.filter(c => c.status === 'in-progress').length;
  const resolved = complaints.filter(c => c.status === 'resolved').length;
  const closed = complaints.filter(c => c.status === 'closed').length;
  const escalated = complaints.filter(c => c.status === 'escalated').length;
  const criticalOpen = complaints.filter(c => c.priority === 'critical' && c.status !== 'closed' && c.status !== 'resolved').length;
  const anonymous = complaints.filter(c => c.isAnonymous).length;

  const avgResHours = useMemo(() => {
    const resolvedList = complaints.filter(c => c.resolvedAt && c.createdAt);
    if (!resolvedList.length) return 0;
    const totalH = resolvedList.reduce((sum, c) => {
      return sum + (new Date(c.resolvedAt!).getTime() - new Date(c.createdAt).getTime()) / 3600000;
    }, 0);
    return Math.round(totalH / resolvedList.length);
  }, [complaints]);

  const slaRate = useMemo(() => {
    const withDue = complaints.filter(c => c.dueDate);
    if (!withDue.length) return 97;
    const onTime = withDue.filter(c => {
      const end = c.resolvedAt || c.closedAt || new Date().toISOString();
      return new Date(end) <= new Date(c.dueDate!);
    });
    return Math.round((onTime.length / withDue.length) * 100);
  }, [complaints]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const keys = Object.keys(categoryConfig);
    return keys.map(k => ({ key: k, ...categoryConfig[k], count: complaints.filter(c => c.category === k).length }));
  }, [complaints]);
  const maxCatCount = Math.max(...categoryBreakdown.map(c => c.count), 1);

  // Severity counts
  const severityCounts = useMemo(() => ({
    critical: complaints.filter(c => c.severity === 'critical').length,
    sensitive: complaints.filter(c => c.severity === 'sensitive').length,
    normal: complaints.filter(c => c.severity === 'normal').length,
  }), [complaints]);

  // Priority counts
  const priorityCounts = useMemo(() => ({
    critical: complaints.filter(c => c.priority === 'critical').length,
    high: complaints.filter(c => c.priority === 'high').length,
    medium: complaints.filter(c => c.priority === 'medium').length,
    low: complaints.filter(c => c.priority === 'low').length,
  }), [complaints]);

  // Dept heatmap
  const deptHeat = useMemo(() => {
    return departments.map(d => ({
      id: d.id,
      name: d.name,
      count: complaints.filter(c => c.departmentId === d.id || c.userDepartment === d.name).length,
    })).sort((a, b) => b.count - a.count);
  }, [departments, complaints]);
  const maxDeptCount = Math.max(...deptHeat.map(d => d.count), 1);

  // Recent activity
  const recentActivity = useMemo(() => {
    return [...complaints]
      .filter(c => c.updatedAt || c.resolvedAt || c.escalatedAt || c.closedAt)
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      .slice(0, 10);
  }, [complaints]);

  // ── Actions ──
  const handleAction = useCallback(async (id: string, updates: Partial<Complaint>) => {
    try {
      await updateComplaint(id, updates);
      toast.success('Complaint updated');
    } catch { toast.error('Update failed'); }
  }, [updateComplaint]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const bulkAction = async (updates: Partial<Complaint>) => {
    for (const id of selectedIds) {
      await handleAction(id, updates);
    }
    setSelectedIds(new Set());
  };

  const exportCSV = () => {
    const header = 'Subject,Category,Priority,Severity,Status,Reporter,Assigned,Department,Created\n';
    const rows = filtered.map(c =>
      `"${c.subject}","${c.category}","${c.priority}","${c.severity}","${c.status}","${c.isAnonymous ? 'Anonymous' : c.userName || ''}","${c.assigneeName || ''}","${c.departmentName || c.userDepartment || ''}","${formatDate(c.createdAt)}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `complaints-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Complaint Command Center
          </h1>
          <Badge variant="outline" className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30">{total}</Badge>
          {criticalOpen > 0 && (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2 border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="all-complaints">All Complaints</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">

      {/* ── Metrics Strip — 4 key cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <GlassCard className="p-5 relative overflow-hidden min-h-[120px]" hover glow="cyan">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-6 translate-x-6 bg-cyan-500/5" />
            {criticalOpen > 0 && <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-rose-400 animate-pulse z-10" />}
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Complaints</p>
                <p className="text-2xl font-bold text-cyan-400">{total}</p>
                <p className="text-[10px] text-cyan-400/80">{complaints.length} tracked in system</p>
              </div>
              <div className="rounded-xl p-3 bg-cyan-500/10 text-cyan-400 shrink-0">
                <FileText className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.05] relative z-10">
              <span className="text-[10px] text-muted-foreground"><span className="text-cyan-400 font-semibold">{openCount}</span> open</span>
              <span className="text-[10px] text-muted-foreground"><span className="text-amber-400 font-semibold">{investigating}</span> investigating</span>
              <span className="text-[10px] text-muted-foreground"><span className="text-amber-400 font-semibold">{inProgress}</span> in progress</span>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <GlassCard className="p-5 relative overflow-hidden min-h-[120px]" hover glow="emerald">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-6 translate-x-6 bg-emerald-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Resolved</p>
                <p className="text-2xl font-bold text-emerald-400">{resolved}</p>
                <p className="text-[10px] text-emerald-400/80">{total > 0 ? Math.round((resolved / total) * 100) : 0}% resolution rate</p>
              </div>
              <div className="rounded-xl p-3 bg-emerald-500/10 text-emerald-400 shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.05] relative z-10">
              <span className="text-[10px] text-muted-foreground"><span className="text-slate-400 font-semibold">{closed}</span> closed</span>
              <span className="text-[10px] text-muted-foreground">SLA <span className="text-emerald-400 font-semibold">{slaRate}%</span></span>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard className="p-5 relative overflow-hidden min-h-[120px]" hover glow="rose">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-6 translate-x-6 bg-rose-500/5" />
            {escalated > 0 && <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-rose-400 animate-pulse z-10" />}
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Critical & Escalated</p>
                <p className="text-2xl font-bold text-rose-400">{criticalOpen + escalated}</p>
                <p className="text-[10px] text-rose-400/80">Needs immediate attention</p>
              </div>
              <div className="rounded-xl p-3 bg-rose-500/10 text-rose-400 shrink-0">
                <Zap className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.05] relative z-10">
              <span className="text-[10px] text-muted-foreground"><span className="text-rose-400 font-semibold">{criticalOpen}</span> critical</span>
              <span className="text-[10px] text-muted-foreground"><span className="text-rose-400 font-semibold">{escalated}</span> escalated</span>
              <span className="text-[10px] text-muted-foreground"><span className="text-slate-400 font-semibold">{anonymous}</span> anonymous</span>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <GlassCard className="p-5 relative overflow-hidden min-h-[120px]" hover glow="amber">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-6 translate-x-6 bg-amber-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Resolution</p>
                <p className="text-2xl font-bold text-amber-400">{avgResHours}h</p>
                <p className="text-[10px] text-amber-400/80">SLA compliance {slaRate}%</p>
              </div>
              <div className="rounded-xl p-3 bg-amber-500/10 text-amber-400 shrink-0">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.05] relative z-10">
              <span className="text-[10px] text-muted-foreground">Avg time to resolve</span>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* ── Category Breakdown ── */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-semibold mb-4">Category Breakdown</h2>
        <div className="space-y-3">
          {categoryBreakdown.map(cat => {
            const Icon = cat.icon;
            const pct = Math.round((cat.count / maxCatCount) * 100);
            return (
              <motion.div key={cat.key} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-28 shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{cat.label}</span>
                </div>
                <div className="flex-1 h-5 bg-black/[0.03] dark:bg-white/[0.05] rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${categoryBarColors[cat.key] || 'bg-slate-500'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-sm font-mono w-8 text-right">{cat.count}</span>
              </motion.div>
            );
          })}
        </div>
      </GlassCard>

      {/* ── Severity Watch + Priority Distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Severity */}
        <GlassCard className="p-6" glow="rose">
          <h2 className="text-lg font-semibold mb-4">Severity Watch</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'critical', emoji: '🔴', label: 'Critical' },
              { key: 'sensitive', emoji: '🟡', label: 'Sensitive' },
              { key: 'normal', emoji: '🟢', label: 'Normal' },
            ].map(s => {
              const sc = severityColors[s.key];
              const cnt = severityCounts[s.key as keyof typeof severityCounts];
              const pct = total ? Math.round((cnt / total) * 100) : 0;
              return (
                <motion.div key={s.key} whileHover={{ scale: 1.03 }} className={`rounded-xl p-4 ring-1 ${sc.ring} ${sc.bg} text-center`}>
                  <div className="text-2xl mb-1">{s.emoji}</div>
                  <div className={`text-2xl font-bold ${sc.text}`}>{cnt}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{pct}%</div>
                </motion.div>
              );
            })}
          </div>
        </GlassCard>

        {/* Priority */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold mb-4">Priority Distribution</h2>
          <div className="space-y-4">
            {(['critical', 'high', 'medium', 'low'] as const).map(p => {
              const pc = priorityColors[p];
              const cnt = priorityCounts[p];
              const pct = total ? Math.round((cnt / total) * 100) : 0;
              return (
                <div key={p}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium capitalize ${pc.text}`}>{p}</span>
                    <span className="text-sm text-muted-foreground">{cnt} ({pct}%)</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* ── Department Heatmap + Recent Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Dept Heatmap */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold mb-4">Department Heatmap</h2>
          {deptHeat.length === 0 ? (
            <p className="text-muted-foreground text-sm">No departments</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {deptHeat.map(d => {
                const intensity = Math.round((d.count / maxDeptCount) * 100);
                const bgStyle = d.count === 0
                  ? 'bg-black/[0.03] dark:bg-white/[0.05]'
                  : d.count / maxDeptCount > 0.7
                    ? 'bg-rose-500/20 ring-1 ring-rose-500/30'
                    : d.count / maxDeptCount > 0.4
                      ? 'bg-amber-500/15 ring-1 ring-amber-500/30'
                      : 'bg-emerald-500/10 ring-1 ring-emerald-500/20';
                return (
                  <motion.div key={d.id} whileHover={{ scale: 1.04 }} className={`rounded-lg p-3 text-center ${bgStyle}`}>
                    <div className="text-sm font-medium truncate">{d.name}</div>
                    <div className="text-2xl font-bold mt-1">{d.count}</div>
                    <div className="text-xs text-muted-foreground">complaints</div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* Recent Activity */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="text-muted-foreground text-sm">No recent activity</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {recentActivity.map(c => (
                <div key={c.id} className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-cyan-500 shrink-0" />
                  <span className="truncate flex-1 font-medium">{c.subject}</span>
                  {c.status === 'escalated' ? (
                    <Badge variant="outline" className={escalatedBadgeClass}>Escalated</Badge>
                  ) : (
                    <StatusBadge status={c.status} />
                  )}
                  <span className="text-xs text-muted-foreground shrink-0">{timeAgo(c.updatedAt || c.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

        </TabsContent>

        <TabsContent value="all-complaints" className="space-y-6">

      {/* ── Filter Bar ── */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 border-b border-black/[0.06] dark:border-white/[0.05]">
        <GlassCard className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search complaints..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(categoryConfig).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[130px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[130px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="sensitive">Sensitive</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
              </SelectContent>
            </Select>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-[150px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.filter(d => d.id).map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </GlassCard>
      </div>

      {/* ── Bulk Actions Bar ── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <GlassCard className="p-3 flex items-center gap-3 flex-wrap" glow="cyan">
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-black/[0.1] dark:border-white/[0.1]" onClick={() => bulkAction({ status: 'in-progress' })}>
                <UserCheck className="h-3 w-3" /> Bulk Assign
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-black/[0.1] dark:border-white/[0.1]" onClick={() => bulkAction({ status: 'resolved', resolutionNotes: 'Bulk resolved' })}>
                <CheckCircle2 className="h-3 w-3" /> Bulk Resolve
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-black/[0.1] dark:border-white/[0.1]" onClick={() => bulkAction({ status: 'escalated' })}>
                <ArrowUpRight className="h-3 w-3" /> Bulk Escalate
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-black/[0.1] dark:border-white/[0.1]" onClick={() => bulkAction({ status: 'closed' })}>
                <Ban className="h-3 w-3" /> Bulk Close
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs ml-auto" onClick={() => setSelectedIds(new Set())}>Clear</Button>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Complaint Table ── */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-black/[0.02] dark:bg-white/[0.03] sticky top-0 z-10">
              <tr className="border-b border-black/[0.06] dark:border-white/[0.06]">
                <th className="p-3 w-10"><input type="checkbox" className="rounded" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={() => {
                  if (selectedIds.size === filtered.length) setSelectedIds(new Set());
                  else setSelectedIds(new Set(filtered.map(c => c.id)));
                }} /></th>
                <th className="p-3 text-left text-muted-foreground font-medium">Subject</th>
                <th className="p-3 text-left text-muted-foreground font-medium">Category</th>
                <th className="p-3 text-left text-muted-foreground font-medium">Priority</th>
                <th className="p-3 text-left text-muted-foreground font-medium">Severity</th>
                <th className="p-3 text-left text-muted-foreground font-medium">Status</th>
                <th className="p-3 text-left text-muted-foreground font-medium">Reporter</th>
                <th className="p-3 text-left text-muted-foreground font-medium">Assigned To</th>
                <th className="p-3 text-left text-muted-foreground font-medium">Created</th>
                <th className="p-3 text-right text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="p-12 text-center text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>No complaints found</p>
                </td></tr>
              ) : filtered.map(c => {
                const catCfg = categoryConfig[c.category] || categoryConfig.other;
                const CatIcon = catCfg.icon;
                const pc = priorityColors[c.priority] || priorityColors.low;
                const sc = severityColors[c.severity] || severityColors.normal;
                return (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-black/[0.04] dark:border-white/[0.04] hover:bg-black/[0.01] dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
                    onClick={() => { setGlobalSelectedId(c.id); setActiveView('complaint-detail'); }}
                  >
                    <td className="p-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className="rounded" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} />
                    </td>
                    <td className="p-3 font-medium max-w-[200px] truncate">{c.subject}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1.5">
                        <CatIcon className="h-3.5 w-3.5" />
                        <span className="text-xs">{catCfg.label}</span>
                      </span>
                    </td>
                    <td className="p-3"><span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${pc.bg} ${pc.text} border ${pc.border}`}>{c.priority}</span></td>
                    <td className="p-3"><span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${sc.bg} ${sc.text} ring-1 ${sc.ring}`}>{c.severity}</span></td>
                    <td className="p-3">
                      {c.status === 'escalated' ? (
                        <Badge variant="outline" className={escalatedBadgeClass}>Escalated</Badge>
                      ) : (
                        <StatusBadge status={c.status} />
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {c.isAnonymous ? <Badge variant="outline" className="bg-slate-500/15 text-slate-400 border-slate-500/30">Anonymous</Badge> : <span className="truncate max-w-[100px] inline-block">{c.userName || '—'}</span>}
                    </td>
                    <td className="p-3 text-muted-foreground truncate max-w-[100px]">{c.assigneeName || '—'}</td>
                    <td className="p-3 text-muted-foreground text-xs">{formatDate(c.createdAt)}</td>
                    <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setGlobalSelectedId(c.id); setActiveView('complaint-detail'); }}><Eye className="h-4 w-4 mr-2" />View Details</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAction(c.id, { status: 'investigating' })}><Search className="h-4 w-4 mr-2" />Investigate</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAction(c.id, { status: 'in-progress' })}><Activity className="h-4 w-4 mr-2" />In Progress</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAction(c.id, { status: 'escalated', escalatedBy: user?.id, escalatorName: user?.name || '' })}><ArrowUpRight className="h-4 w-4 mr-2" />Escalate</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAction(c.id, { status: 'resolved', resolutionNotes: 'Resolved by admin' })}><CheckCircle2 className="h-4 w-4 mr-2" />Resolve</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAction(c.id, { status: 'closed' })}><XCircle className="h-4 w-4 mr-2" />Close</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
