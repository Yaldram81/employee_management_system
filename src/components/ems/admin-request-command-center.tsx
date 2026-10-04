'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { StatCard } from './stat-card';
import { StatusBadge } from './status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, parseISO } from 'date-fns';
import type { Request } from '@/lib/types';
import {
  LayoutDashboard, Clock, CheckCircle2, XCircle, AlertTriangle, ArrowUpRight,
  DollarSign, Monitor, ArrowLeftRight, GraduationCap, Wrench, Plane, Headphones,
  Palmtree, Search, RefreshCw, Loader2, Plus, ChevronDown, Eye,
  Shield, MoreHorizontal, Check, X, ArrowUp, MessageSquare, Download,
  Activity, FileText, Zap, TrendingUp,
} from 'lucide-react';
import { formatCurrency } from './shared';

// ─── Type Config ─────────────────────────────────────────────────
const typeConfig: Record<string, { icon: typeof Palmtree; color: string; label: string; barClass: string }> = {
  'leave': { icon: Palmtree, color: 'emerald', label: 'Leave', barClass: 'bg-emerald-500' },
  'expense': { icon: DollarSign, color: 'amber', label: 'Expense', barClass: 'bg-amber-500' },
  'asset': { icon: Monitor, color: 'cyan', label: 'Asset', barClass: 'bg-cyan-500' },
  'shift-swap': { icon: ArrowLeftRight, color: 'violet', label: 'Shift Swap', barClass: 'bg-violet-500' },
  'training': { icon: GraduationCap, color: 'blue', label: 'Training', barClass: 'bg-blue-500' },
  'equipment': { icon: Wrench, color: 'orange', label: 'Equipment', barClass: 'bg-orange-500' },
  'travel': { icon: Plane, color: 'rose', label: 'Travel', barClass: 'bg-rose-500' },
  'it-support': { icon: Headphones, color: 'teal', label: 'IT Support', barClass: 'bg-teal-500' },
};

const priorityColors: Record<string, { bg: string; text: string; bar: string }> = {
  urgent: { bg: 'bg-rose-500/15', text: 'text-rose-400', bar: 'bg-rose-500' },
  high: { bg: 'bg-amber-500/15', text: 'text-amber-400', bar: 'bg-amber-500' },
  medium: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', bar: 'bg-cyan-500' },
  low: { bg: 'bg-slate-500/15', text: 'text-slate-400', bar: 'bg-slate-500' },
};

// ─── Helpers ─────────────────────────────────────────────────────
function timeAgo(date: string) {
  try { return formatDistanceToNow(parseISO(date), { addSuffix: true }); } catch { return date; }
}

// ─── Component ───────────────────────────────────────────────────
export function AdminRequestCommandCenter() {
  const { user, requests, departments, updateRequest, createRequest, loadRequests, setSelectedRequestId, setActiveView } = useEMSStore();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterDept, setFilterDept] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ type: 'expense' as Request['type'], title: '', description: '', amount: '', priority: 'medium' as Request['priority'] });
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // ─── Metrics ────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter(r => r.status === 'pending').length;
    const underReview = requests.filter(r => r.status === 'under-review').length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;
    const escalated = requests.filter(r => r.status === 'escalated').length;
    const totalExpense = requests.reduce((sum, r) => sum + (r.amount || 0), 0);
    const resolved = requests.filter(r => r.resolvedAt);
    const avgHours = resolved.length > 0
      ? Math.round(resolved.reduce((sum, r) => {
          const start = new Date(r.createdAt).getTime();
          const end = new Date(r.resolvedAt!).getTime();
          return sum + (end - start) / 3600000;
        }, 0) / resolved.length)
      : 0;
    const slaCompliant = requests.filter(r => {
      if (!r.dueDate || r.status === 'pending') return false;
      const resolvedOrNow = r.resolvedAt ? new Date(r.resolvedAt) : new Date();
      return resolvedOrNow <= new Date(r.dueDate);
    }).length;
    const withDueDate = requests.filter(r => r.dueDate).length;
    const slaRate = withDueDate > 0 ? Math.round((slaCompliant / withDueDate) * 100) : 98;
    return { total, pending, underReview, approved, rejected, escalated, totalExpense, avgHours, slaRate };
  }, [requests]);

  // ─── Type Breakdown ─────────────────────────────────────────
  const typeBreakdown = useMemo(() => {
    return Object.entries(typeConfig).map(([key, cfg]) => ({
      key,
      ...cfg,
      count: requests.filter(r => r.type === key).length,
    })).sort((a, b) => b.count - a.count);
  }, [requests]);

  const maxTypeCount = Math.max(...typeBreakdown.map(t => t.count), 1);

  // ─── Department Distribution ────────────────────────────────
  const deptDistribution = useMemo(() => {
    const map = new Map<string, number>();
    requests.forEach(r => {
      const name = r.departmentName || 'Unassigned';
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [requests]);

  const maxDeptCount = Math.max(...deptDistribution.map(d => d.count), 1);

  // ─── Priority Distribution ──────────────────────────────────
  const priorityDist = useMemo(() => {
    return (['urgent', 'high', 'medium', 'low'] as const).map(p => ({
      key: p,
      count: requests.filter(r => r.priority === p).length,
      pct: requests.length > 0 ? Math.round((requests.filter(r => r.priority === p).length / requests.length) * 100) : 0,
      ...priorityColors[p],
    }));
  }, [requests]);

  // ─── Filtered Requests ──────────────────────────────────────
  const filtered = useMemo(() => {
    return requests.filter(r => {
      const matchSearch = !searchQuery ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.userName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = filterStatus === 'all' || r.status === filterStatus;
      const matchType = filterType === 'all' || r.type === filterType;
      const matchPriority = filterPriority === 'all' || r.priority === filterPriority;
      const matchDept = filterDept === 'all' || r.departmentId === filterDept;
      return matchSearch && matchStatus && matchType && matchPriority && matchDept;
    });
  }, [requests, searchQuery, filterStatus, filterType, filterPriority, filterDept]);

  // ─── Activity Feed ──────────────────────────────────────────
  const activityFeed = useMemo(() => {
    return [...requests]
      .filter(r => r.updatedAt || r.resolvedAt || r.escalatedAt)
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      .slice(0, 10)
      .map(r => ({
        id: r.id,
        title: r.title,
        status: r.status,
        userName: r.userName || 'Unknown',
        time: timeAgo(r.updatedAt || r.createdAt),
      }));
  }, [requests]);

  // ─── Handlers ───────────────────────────────────────────────
  const handleAction = useCallback(async (id: string, status: Request['status'], comment?: string) => {
    try {
      await updateRequest(id, status, comment);
      toast.success(`Request ${status.replace('-', ' ')}`);
    } catch { toast.error('Action failed'); }
  }, [updateRequest]);

  const handleBulkAction = useCallback(async (status: Request['status']) => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await updateRequest(id, status);
    }
    toast.success(`${ids.length} requests ${status.replace('-', ' ')}`);
    setSelectedIds(new Set());
  }, [selectedIds, updateRequest]);

  const handleCreate = async () => {
    if (!createForm.title) { toast.error('Title is required'); return; }
    try {
      await createRequest({
        userId: user!.id,
        type: createForm.type,
        title: createForm.title,
        description: createForm.description,
        amount: createForm.amount ? parseFloat(createForm.amount) : undefined,
        priority: createForm.priority,
      });
      toast.success('Request created');
      setCreateOpen(false);
      setCreateForm({ type: 'expense', title: '', description: '', amount: '', priority: 'medium' });
    } catch { toast.error('Failed to create request'); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const exportCSV = () => {
    const headers = ['Title', 'Type', 'Status', 'Priority', 'Requester', 'Department', 'Amount', 'Created'];
    const rows = filtered.map(r => [r.title, r.type, r.status, r.priority, r.userName || '', r.departmentName || '', String(r.amount || 0), r.createdAt]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `requests-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const openDetail = (req: Request) => { setSelectedRequestId(req.id); setActiveView('request-detail'); };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadRequests();
      toast.success('Data refreshed');
    } catch {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  // Auto-load requests on mount if empty
  useEffect(() => {
    if (requests.length === 0) {
      loadRequests().catch(() => {});
    }
    // Only run on mount
  }, []);

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">Request Command Center</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{metrics.total} total requests &middot; {metrics.pending} pending review</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-1.5 border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/30">
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5 border-white/10 hover:bg-cyan-500/10 hover:border-cyan-500/30">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-500">
            <Plus className="h-3.5 w-3.5" /> New Request
          </Button>
        </div>
      </div>

      {/* ═══ METRICS STRIP — 4 key cards ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <GlassCard className="p-5 relative overflow-hidden min-h-[120px]" hover glow="cyan">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-6 translate-x-6 bg-cyan-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Requests</p>
                <p className="text-2xl font-bold text-cyan-400">{metrics.total}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-emerald-400">↑ 5%</span>
                  <span className="text-[10px] text-muted-foreground">vs last month</span>
                </div>
              </div>
              <div className="rounded-xl p-3 bg-cyan-500/10 text-cyan-400 shrink-0">
                <LayoutDashboard className="h-5 w-5" />
              </div>
            </div>
            {/* Inline mini-stats */}
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5 relative z-10">
              <span className="text-[10px] text-muted-foreground"><span className="text-amber-400 font-semibold">{metrics.pending}</span> pending</span>
              <span className="text-[10px] text-muted-foreground"><span className="text-cyan-400 font-semibold">{metrics.underReview}</span> reviewing</span>
              <span className="text-[10px] text-muted-foreground"><span className="text-amber-400 font-semibold">{metrics.escalated}</span> escalated</span>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <GlassCard className="p-5 relative overflow-hidden min-h-[120px]" hover glow="emerald">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-6 translate-x-6 bg-emerald-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Approved</p>
                <p className="text-2xl font-bold text-emerald-400">{metrics.approved}</p>
                <p className="text-[10px] text-emerald-400/80">{metrics.total > 0 ? Math.round((metrics.approved / metrics.total) * 100) : 0}% approval rate</p>
              </div>
              <div className="rounded-xl p-3 bg-emerald-500/10 text-emerald-400 shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5 relative z-10">
              <span className="text-[10px] text-muted-foreground"><span className="text-rose-400 font-semibold">{metrics.rejected}</span> rejected</span>
              <span className="text-[10px] text-muted-foreground">SLA <span className="text-emerald-400 font-semibold">{metrics.slaRate}%</span></span>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard className="p-5 relative overflow-hidden min-h-[120px]" hover glow="amber">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-6 translate-x-6 bg-amber-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Resolution</p>
                <p className="text-2xl font-bold text-amber-400">{metrics.avgHours}h</p>
                <p className="text-[10px] text-amber-400/80">Average time to resolve</p>
              </div>
              <div className="rounded-xl p-3 bg-amber-500/10 text-amber-400 shrink-0">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5 relative z-10">
              <span className="text-[10px] text-muted-foreground">SLA compliance <span className="text-emerald-400 font-semibold">{metrics.slaRate}%</span></span>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <GlassCard className="p-5 relative overflow-hidden min-h-[120px]" hover glow="emerald">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-6 translate-x-6 bg-emerald-500/5" />
            <div className="flex items-start justify-between relative z-10">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Expenses</p>
                <p className="text-2xl font-bold text-emerald-400">{formatCurrency(metrics.totalExpense)}</p>
                <p className="text-[10px] text-emerald-400/80">Across all requests</p>
              </div>
              <div className="rounded-xl p-3 bg-emerald-500/10 text-emerald-400 shrink-0">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5 relative z-10">
              <span className="text-[10px] text-muted-foreground">Shield <span className="text-emerald-400 font-semibold">{metrics.slaRate}%</span> SLA</span>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* ═══ TABS: Overview | All Requests ═══ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/5 border border-white/10 sticky top-0 z-20 bg-background/80 backdrop-blur-xl pb-2">
          <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Activity className="h-3.5 w-3.5 mr-1.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="requests" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <FileText className="h-3.5 w-3.5 mr-1.5" /> All Requests
          </TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Type Breakdown */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
              <GlassCard className="p-6" glow="cyan">
                <div className="flex items-center gap-2 mb-4">
                  <div className="rounded-lg p-2 bg-cyan-500/10"><Zap className="h-4 w-4 text-cyan-400" /></div>
                  <h3 className="font-semibold">Request Type Breakdown</h3>
                </div>
                <div className="space-y-3">
                  {typeBreakdown.map((t, i) => {
                    const Icon = t.icon;
                    const pct = maxTypeCount > 0 ? Math.round((t.count / maxTypeCount) * 100) : 0;
                    return (
                      <motion.div key={t.key} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3">
                        <div className="flex items-center gap-2 w-28 shrink-0">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{t.label}</span>
                        </div>
                        <div className="flex-1 h-6 rounded-full bg-white/5 overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: i * 0.08 }} className={cn('h-full rounded-full', t.barClass)} />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">{t.count}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </GlassCard>
            </motion.div>

            {/* Department Distribution */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <GlassCard className="p-6 h-full" glow="emerald">
                <div className="flex items-center gap-2 mb-4">
                  <div className="rounded-lg p-2 bg-emerald-500/10"><TrendingUp className="h-4 w-4 text-emerald-400" /></div>
                  <h3 className="font-semibold">Dept Distribution</h3>
                </div>
                {deptDistribution.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No data</p>
                ) : (
                  <div className="space-y-3">
                    {deptDistribution.slice(0, 6).map((d, i) => {
                      const pct = maxDeptCount > 0 ? Math.round((d.count / maxDeptCount) * 100) : 0;
                      const total = requests.length || 1;
                      const share = Math.round((d.count / total) * 100);
                      return (
                        <div key={d.name} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="truncate max-w-[120px]">{d.name}</span>
                            <span className="text-muted-foreground">{d.count} ({share}%)</span>
                          </div>
                          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: i * 0.08 }} className="h-full rounded-full bg-emerald-500" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </div>

          {/* Priority + Activity Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Priority Distribution */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <GlassCard className="p-6" glow="amber">
                <div className="flex items-center gap-2 mb-4">
                  <div className="rounded-lg p-2 bg-amber-500/10"><AlertTriangle className="h-4 w-4 text-amber-400" /></div>
                  <h3 className="font-semibold">Priority Distribution</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {priorityDist.map((p, i) => (
                    <motion.div key={p.key} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}
                      className={cn('rounded-lg p-4 border border-white/5', p.bg)}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn('text-sm font-semibold capitalize', p.text)}>{p.key}</span>
                        <span className="text-lg font-bold">{p.count}</span>
                      </div>
                      <Progress value={p.pct} className="h-1.5" />
                      <p className="text-xs text-muted-foreground mt-1.5">{p.pct}% of total</p>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>

            {/* Recent Activity Feed */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <GlassCard className="p-6 h-full" glow="cyan">
                <div className="flex items-center gap-2 mb-4">
                  <div className="rounded-lg p-2 bg-cyan-500/10"><Activity className="h-4 w-4 text-cyan-400" /></div>
                  <h3 className="font-semibold">Recent Activity</h3>
                </div>
                {activityFeed.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {activityFeed.map((a, i) => (
                      <motion.div key={a.id} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                        <div className="h-2 w-2 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate"><span className="font-medium">{a.userName}</span> &rarr; <StatusBadge status={a.status} /></p>
                          <p className="text-xs text-muted-foreground truncate">{a.title} &middot; {a.time}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </div>
        </TabsContent>

        {/* ── All Requests Tab ── */}
        <TabsContent value="requests" className="space-y-4">
          {/* Bulk Actions Bar */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <GlassCard className="p-3" glow="emerald">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{selectedIds.size} selected</span>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs"
                        onClick={() => handleBulkAction('approved')}>
                        <Check className="h-3.5 w-3.5" /> Bulk Approve
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs"
                        onClick={() => handleBulkAction('rejected')}>
                        <X className="h-3.5 w-3.5" /> Bulk Reject
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs"
                        onClick={() => handleBulkAction('escalated')}>
                        <ArrowUp className="h-3.5 w-3.5" /> Bulk Escalate
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Filter Bar */}
          <GlassCard className="p-4 sticky top-0 z-20 bg-background/80 backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search requests..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs bg-white/5 border-white/10 focus:border-cyan-500/30" />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 w-36 text-xs bg-white/5 border-white/10"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="under-review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 w-32 text-xs bg-white/5 border-white/10"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(typeConfig).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="h-8 w-28 text-xs bg-white/5 border-white/10"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="h-8 w-36 text-xs bg-white/5 border-white/10"><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.filter(d => d.id).map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </GlassCard>

          {/* Request Table */}
          <GlassCard className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground w-8">
                      <input type="checkbox" className="rounded border-white/20 bg-white/5"
                        checked={selectedIds.size === filtered.length && filtered.length > 0}
                        onChange={() => {
                          if (selectedIds.size === filtered.length) setSelectedIds(new Set());
                          else setSelectedIds(new Set(filtered.map(r => r.id)));
                        }} />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Request</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Requester</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Created</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Reviewer</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} className="text-center text-muted-foreground py-12">No requests match your filters</td></tr>
                  ) : (
                    filtered.map((req, i) => {
                      const cfg = typeConfig[req.type] || typeConfig['it-support'];
                      const Icon = cfg.icon;
                      const pColor = priorityColors[req.priority] || priorityColors['medium'];
                      return (
                        <motion.tr key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors group cursor-pointer"
                          onClick={() => openDetail(req)}>
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <input type="checkbox" className="rounded border-white/20 bg-white/5" checked={selectedIds.has(req.id)} onChange={() => toggleSelect(req.id)} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-sm font-medium truncate max-w-[180px]">{req.title}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center text-[10px] font-medium border border-white/10 shrink-0">
                                {(req.userName || '?').charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm truncate">{req.userName || 'Unknown'}</p>
                                {req.userDepartment && <Badge variant="outline" className="text-[9px] border-white/10 h-4">{req.userDepartment}</Badge>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize', pColor.bg, pColor.text)}>{req.priority}</span>
                          </td>
                          <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                          <td className="px-4 py-3 text-sm">
                            {(req.type === 'expense' || req.type === 'travel') && req.amount ? formatCurrency(req.amount) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(req.createdAt)}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{req.reviewerName || '—'}</td>
                          <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-white/10">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-background border-border">
                                <DropdownMenuItem className="text-xs gap-2" onClick={() => openDetail(req)}><Eye className="h-3.5 w-3.5" /> View Details</DropdownMenuItem>
                                <DropdownMenuItem className="text-xs gap-2 text-emerald-400" onClick={() => handleAction(req.id, 'approved')}><Check className="h-3.5 w-3.5" /> Approve</DropdownMenuItem>
                                <DropdownMenuItem className="text-xs gap-2 text-rose-400" onClick={() => handleAction(req.id, 'rejected')}><X className="h-3.5 w-3.5" /> Reject</DropdownMenuItem>
                                <DropdownMenuItem className="text-xs gap-2 text-amber-400" onClick={() => handleAction(req.id, 'escalated')}><ArrowUp className="h-3.5 w-3.5" /> Escalate</DropdownMenuItem>
                                <DropdownMenuItem className="text-xs gap-2 text-cyan-400" onClick={() => handleAction(req.id, 'under-review')}><MessageSquare className="h-3.5 w-3.5" /> Under Review</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </TabsContent>
      </Tabs>

      {/* ═══ CREATE REQUEST DIALOG ═══ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-white/10 sm:max-w-md">
          <DialogHeader><DialogTitle>Create Request</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Request Type</Label>
              <Select value={createForm.type} onValueChange={v => setCreateForm({ ...createForm, type: v as Request['type'] })}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(typeConfig).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={createForm.priority} onValueChange={v => setCreateForm({ ...createForm, priority: v as Request['priority'] })}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} placeholder="Request title..."
                className="bg-white/5 border-white/10" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} placeholder="Describe your request..."
                className="bg-white/5 border-white/10 min-h-[60px]" />
            </div>
            {(createForm.type === 'expense' || createForm.type === 'travel') && (
              <div className="space-y-2">
                <Label>Amount ($)</Label>
                <Input type="number" value={createForm.amount} onChange={e => setCreateForm({ ...createForm, amount: e.target.value })} placeholder="0.00"
                  className="bg-white/5 border-white/10" />
              </div>
            )}
            <Button onClick={handleCreate} className="w-full bg-emerald-600 hover:bg-emerald-500">Submit Request</Button>
          </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
