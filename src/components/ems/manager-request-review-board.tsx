'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palmtree, DollarSign, Monitor, ArrowLeftRight, GraduationCap,
  Wrench, Plane, Headphones, Clock, CheckCircle2, XCircle,
  AlertTriangle, Eye, ChevronLeft, ChevronRight, Search,
  ArrowUpDown, ArrowUp, ArrowDown, Shield, FileText, User,
  MoreHorizontal, Download, RotateCcw, MessageSquare, Send,
  Users, BarChart3, Filter, Trash2, ChevronDown, Keyboard,
  HandMetal, Info, CornerDownRight, ListChecks,
  Zap, Flame, TrendingUp, CircleDot, AlertCircle
} from 'lucide-react';
import { GlassCard } from './glass-card';
import { StatCard } from './stat-card';
import { StatusBadge } from './status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useEMSStore } from '@/lib/store';
import type { Request } from '@/lib/types';
import { timeAgo } from './shared';

// ── Config Maps ──
const typeConfig: Record<string, { icon: typeof Palmtree; color: string; label: string }> = {
  'leave': { icon: Palmtree, color: 'emerald', label: 'Leave' },
  'expense': { icon: DollarSign, color: 'amber', label: 'Expense' },
  'asset': { icon: Monitor, color: 'cyan', label: 'Asset' },
  'shift-swap': { icon: ArrowLeftRight, color: 'violet', label: 'Shift Swap' },
  'training': { icon: GraduationCap, color: 'blue', label: 'Training' },
  'equipment': { icon: Wrench, color: 'orange', label: 'Equipment' },
  'travel': { icon: Plane, color: 'rose', label: 'Travel' },
  'it-support': { icon: Headphones, color: 'teal', label: 'IT Support' },
};
const priorityColorMap: Record<string, string> = {
  urgent: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  high: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  medium: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};
const typeColorMap: Record<string, string> = {
  'leave': 'text-emerald-400', 'expense': 'text-amber-400', 'asset': 'text-cyan-400',
  'shift-swap': 'text-violet-400', 'training': 'text-blue-400', 'equipment': 'text-orange-400',
  'travel': 'text-rose-400', 'it-support': 'text-teal-400',
};

const stagger = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

// ── API helper ──
async function apiAction(id: string, action: string, extra: Record<string, unknown> = {}) {
  const token = useEMSStore.getState().authToken;
  const res = await fetch('/api/requests', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ id, action, ...extra }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as Record<string,string>).message || 'Action failed'); }
  return res.json();
}

async function apiBulkAction(ids: string[], bulkAction: string, extra: Record<string, unknown> = {}) {
  const token = useEMSStore.getState().authToken;
  const res = await fetch('/api/requests', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ action: 'bulk-action', ids, bulkAction, ...extra }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as Record<string,string>).message || 'Bulk action failed'); }
  return res.json();
}

async function loadDashboard() {
  const token = useEMSStore.getState().authToken;
  const res = await fetch('/api/requests?action=dashboard', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error('Failed to load dashboard');
  const json = await res.json();
  return json.data;
}

export function ManagerRequestReviewBoard() {
  const { user, requests, departments, users, updateRequest, setSelectedRequestId: setGlobalSelectedId, setActiveView } = useEMSStore();

  // ── State ──
  const [activeTab, setActiveTab] = useState('overview');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterRequester, setFilterRequester] = useState('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'createdAt' | 'priority' | 'amount'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [reviewComment, setReviewComment] = useState('');
  const [quickReviewIdx, setQuickReviewIdx] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  // Dialogs
  const [dlgConditionalApprove, setDlgConditionalApprove] = useState(false);
  const [dlgDelegate, setDlgDelegate] = useState(false);
  const [dlgReturnRevision, setDlgReturnRevision] = useState(false);
  const [dlgRequestInfo, setDlgRequestInfo] = useState(false);
  const [dlgAddComment, setDlgAddComment] = useState(false);
  const [dlgBulkAction, setDlgBulkAction] = useState(false);
  const [dlgTargetId, setDlgTargetId] = useState<string | null>(null);
  const [dlgConditions, setDlgConditions] = useState('');
  const [dlgDelegateTo, setDlgDelegateTo] = useState('');
  const [dlgDelegationNote, setDlgDelegationNote] = useState('');
  const [dlgRevisionReason, setDlgRevisionReason] = useState('');
  const [dlgInfoMessage, setDlgInfoMessage] = useState('');
  const [dlgComment, setDlgComment] = useState('');
  const [dlgCommentVisibility, setDlgCommentVisibility] = useState('internal');
  const [dlgBulkActionType, setDlgBulkActionType] = useState('approve');
  const [dlgBulkPriority, setDlgBulkPriority] = useState('medium');
  const [dlgBulkComment, setDlgBulkComment] = useState('');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // ── Computed ──
  const deptRequests = useMemo(() => {
    const deptId = user?.departmentId;
    const deptUserIds = users.filter(u => u.departmentId === deptId).map(u => u.id);
    return requests.filter(r => deptUserIds.includes(r.userId) || r.userId === user?.id);
  }, [requests, users, user]);

  const pendingReview = deptRequests.filter(r => r.status === 'pending' || r.status === 'under-review');
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const approvedThisMonth = deptRequests.filter(r => r.status === 'approved' && r.updatedAt?.startsWith(thisMonth));
  const rejectedThisMonth = deptRequests.filter(r => r.status === 'rejected' && r.updatedAt?.startsWith(thisMonth));
  const escalated = deptRequests.filter(r => r.status === 'escalated');
  const teamOpen = deptRequests.filter(r => ['pending', 'under-review', 'escalated'].includes(r.status));

  const avgResponseHrs = useMemo(() => {
    const resolved = deptRequests.filter(r => r.resolvedAt && r.createdAt);
    if (!resolved.length) return 0;
    const total = resolved.reduce((sum, r) => sum + (new Date(r.resolvedAt!).getTime() - new Date(r.createdAt).getTime()), 0);
    return Math.round(total / resolved.length / 3600000);
  }, [deptRequests]);

  const trendData = useMemo(() => {
    const days: { label: string; count: number; approved: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString('en', { weekday: 'short' });
      days.push({
        label: dayLabel,
        count: deptRequests.filter(r => r.createdAt?.startsWith(key)).length,
        approved: deptRequests.filter(r => r.status === 'approved' && r.updatedAt?.startsWith(key)).length,
      });
    }
    return days;
  }, [deptRequests]);

  const filtered = useMemo(() => {
    let list = [...deptRequests];
    if (filterStatus !== 'all') list = list.filter(r => r.status === filterStatus);
    if (filterType !== 'all') list = list.filter(r => r.type === filterType);
    if (filterPriority !== 'all') list = list.filter(r => r.priority === filterPriority);
    if (filterRequester !== 'all') list = list.filter(r => r.userId === filterRequester);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => r.title.toLowerCase().includes(q) || r.userName?.toLowerCase().includes(q));
    }
    const priOrd: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    list.sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'priority') return (priOrd[a.priority] - priOrd[b.priority]) * mul;
      if (sortKey === 'amount') return ((a.amount || 0) - (b.amount || 0)) * mul;
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * mul;
    });
    return list;
  }, [deptRequests, filterStatus, filterType, filterPriority, filterRequester, search, sortKey, sortDir]);

  const paged = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const selected = deptRequests.find(r => r.id === selectedId);
  const relatedRequests = useMemo(() => {
    if (!selected) return [];
    return deptRequests.filter(r => r.userId === selected.userId && r.id !== selected.id).slice(0, 5);
  }, [deptRequests, selected]);

  const uniqueRequesters = useMemo(() => {
    const map = new Map<string, string>();
    deptRequests.forEach(r => { if (r.userId && r.userName) map.set(r.userId, r.userName); });
    return Array.from(map.entries());
  }, [deptRequests]);

  const deptManagers = useMemo(() => users.filter(u => u.role === 'manager' && u.id !== user?.id), [users, user]);

  const deptName = departments.find(d => d.id === user?.departmentId)?.name || user?.department || 'Department';
  const maxTrend = Math.max(...trendData.map(d => d.count), 1);

  // ── Activity Timeline from payload ──
  const activityTimeline = useMemo(() => {
    if (!selected) return [];
    try {
      const p = typeof (selected as any).payload === 'string' ? JSON.parse((selected as any).payload) : (selected as any).payload || {};
      return (p._activity as Array<{ action: string; by: string; byName: string; note?: string; at: string }>) || [];
    } catch { return []; }
  }, [selected]);

  // ── Handlers ──
  const refreshData = useCallback(async () => {
    try {
      const data = await loadDashboard();
      setDashboardData(data);
    } catch { /* silent */ }
  }, []);

  const handleAction = useCallback(async (id: string, status: Request['status'], comment?: string) => {
    try {
      await updateRequest(id, status, comment || reviewComment || undefined);
      toast.success(`Request ${status.replace('-', ' ')}`);
      setReviewComment('');
    } catch { toast.error('Failed to update request'); }
  }, [updateRequest, reviewComment]);

  const handleEnterpriseAction = useCallback(async (id: string, action: string, extra: Record<string, unknown> = {}) => {
    try {
      setLoading(true);
      await apiAction(id, action, extra);
      toast.success(`Action "${action}" completed`);
      // Refresh store
      await useEMSStore.getState().loadData(user?.id || '', user?.role || '');
      setSelectedId(null);
    } catch (e: any) { toast.error(e.message || 'Action failed'); }
    finally { setLoading(false); }
  }, [user]);

  const handleBulkAction = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) { toast.error('No requests selected'); return; }
    try {
      setLoading(true);
      await apiBulkAction(ids, dlgBulkActionType, {
        reviewComment: dlgBulkComment || undefined,
        priority: dlgBulkActionType === 'change-priority' ? dlgBulkPriority : undefined,
      });
      toast.success(`Bulk action applied to ${ids.length} request(s)`);
      setSelectedIds(new Set());
      setDlgBulkAction(false);
      await useEMSStore.getState().loadData(user?.id || '', user?.role || '');
    } catch (e: any) { toast.error(e.message || 'Bulk action failed'); }
    finally { setLoading(false); }
  }, [selectedIds, dlgBulkActionType, dlgBulkComment, dlgBulkPriority, user]);

  const exportCSV = useCallback(() => {
    const headers = ['Title', 'Type', 'Requester', 'Priority', 'Status', 'Amount', 'Created', 'Updated'];
    const rows = filtered.map(r => [r.title, r.type, r.userName || '', r.priority, r.status, r.amount?.toString() || '', r.createdAt, r.updatedAt || '']);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'requests.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  }, [filtered]);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === paged.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(paged.map(r => r.id)));
  };

  const openDialog = (dialog: string, id: string) => {
    setDlgTargetId(id);
    switch (dialog) {
      case 'conditional-approve': setDlgConditionalApprove(true); break;
      case 'delegate': setDlgDelegate(true); break;
      case 'return-revision': setDlgReturnRevision(true); break;
      case 'request-info': setDlgRequestInfo(true); break;
      case 'add-comment': setDlgAddComment(true); break;
    }
  };

  const SortIcon = ({ col }: { col: typeof sortKey }) => (
    sortKey !== col ? <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" /> :
    sortDir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 text-cyan-400" /> : <ArrowDown className="h-3 w-3 ml-1 text-cyan-400" />
  );

  const TypeIcon = ({ type, className }: { type: string; className?: string }) => {
    const cfg = typeConfig[type] || typeConfig['it-support'];
    const I = cfg.icon;
    return <I className={`${className || 'h-4 w-4'} ${typeColorMap[type] || 'text-slate-400'}`} />;
  };

  // ── Quick Review ──
  const quickQueue = pendingReview;
  const quickReq = quickQueue[quickReviewIdx];

  // ── Dashboard Analytics ──
  const analytics = dashboardData;

  // Load analytics on mount / tab switch
  useMemo(() => { if (activeTab === 'analytics' && !analytics) refreshData(); }, [activeTab, analytics, refreshData]);

  // ── Team Summary ──
  const teamSummary = useMemo(() => {
    const map = new Map<string, { name: string; total: number; approved: number; rejected: number; pending: number; responseMs: number[] }>();
    deptRequests.forEach(r => {
      if (!map.has(r.userId)) map.set(r.userId, { name: r.userName || 'Unknown', total: 0, approved: 0, rejected: 0, pending: 0, responseMs: [] });
      const s = map.get(r.userId)!;
      s.total++;
      if (r.status === 'approved') s.approved++;
      if (r.status === 'rejected') s.rejected++;
      if (['pending', 'under-review'].includes(r.status)) s.pending++;
      if (r.resolvedAt && r.createdAt) s.responseMs.push(new Date(r.resolvedAt!).getTime() - new Date(r.createdAt).getTime());
    });
    return Array.from(map.entries()).map(([id, s]) => ({
      id, name: s.name, total: s.total, approved: s.approved, rejected: s.rejected, pending: s.pending,
      avgResponseHrs: s.responseMs.length > 0 ? Math.round(s.responseMs.reduce((a, b) => a + b, 0) / s.responseMs.length / 3600000 * 10) / 10 : 0,
    }));
  }, [deptRequests]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div {...stagger} transition={{ delay: 0 }} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">Request Review Board</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{deptName} &middot; Enterprise Request Management</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingReview.length > 0 && (
            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">{pendingReview.length} Pending</Badge>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] h-10">
          {(['overview', 'all-requests', 'quick-review', 'escalated', 'analytics', 'team-summary'] as const).map(tab => (
            <TabsTrigger key={tab} value={tab} className="text-xs data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 gap-1.5">
              {tab === 'overview' && <><BarChart3 className="h-3.5 w-3.5" /> Overview</>}
              {tab === 'all-requests' && <><ListChecks className="h-3.5 w-3.5" /> All Requests</>}
              {tab === 'quick-review' && <><Zap className="h-3.5 w-3.5 text-amber-400" /> Quick Review</>}
              {tab === 'escalated' && <><Flame className="h-3.5 w-3.5 text-rose-400" /> Escalated</>}
              {tab === 'analytics' && <><TrendingUp className="h-3.5 w-3.5" /> Analytics</>}
              {tab === 'team-summary' && <><Users className="h-3.5 w-3.5" /> Team Summary</>}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ════════ OVERVIEW TAB ════════ */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Pending Review', value: pendingReview.length, sub: 'Needs attention', icon: Clock, color: 'emerald' as const, glow: 'emerald' as const },
              { title: 'Approved', value: approvedThisMonth.length, sub: 'This month', icon: CheckCircle2, color: 'emerald' as const, glow: 'emerald' as const },
              { title: 'Rejected', value: rejectedThisMonth.length, sub: 'This month', icon: XCircle, color: 'rose' as const, glow: 'rose' as const },
              { title: 'Escalated', value: escalated.length, sub: 'Requires action', icon: AlertTriangle, color: 'amber' as const, glow: 'amber' as const },
            ].map((card, i) => (
              <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <GlassCard className="p-5 relative overflow-hidden min-h-[120px]" hover glow={card.glow}>
                  <div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-6 translate-x-6 bg-emerald-500/5" />
                  <div className="flex items-start justify-between relative z-10">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.title}</p>
                      <p className={`text-2xl font-bold text-${card.color}-400`}>{card.value}</p>
                      <p className={`text-[10px] text-${card.color}-400/80`}>{card.sub}</p>
                    </div>
                    <div className={`rounded-xl p-3 bg-${card.color}-500/10 text-${card.color}-400 shrink-0`}>
                      <card.icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.05] relative z-10">
                    <span className="text-[10px] text-muted-foreground">Avg response <span className="text-cyan-400 font-semibold">{avgResponseHrs}h</span></span>
                    <span className="text-[10px] text-muted-foreground"><span className="text-slate-400 font-semibold">{teamOpen.length}</span> open</span>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          {/* Priority Queue */}
          <motion.div {...stagger} transition={{ delay: 0.35 }} className="space-y-4">
            <h2 className="text-lg font-semibold">Priority Queue</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {([
                { label: 'Urgent', icon: <CircleDot className="h-4 w-4 text-rose-500 fill-rose-500/20" />, items: pendingReview.filter(r => r.priority === 'urgent'), glow: 'rose' as const },
                { label: 'High', icon: <CircleDot className="h-4 w-4 text-amber-500 fill-amber-500/20" />, items: pendingReview.filter(r => r.priority === 'high'), glow: 'amber' as const },
                { label: 'Normal', icon: <CircleDot className="h-4 w-4 text-emerald-500 fill-emerald-500/20" />, items: pendingReview.filter(r => r.priority === 'medium' || r.priority === 'low'), glow: 'emerald' as const },
              ]).map(col => (
                <GlassCard key={col.label} glow={col.glow} className="p-4 min-h-[160px]">
                  <div className="flex items-center gap-2 mb-3">
                    {col.icon}<span className="font-semibold text-sm">{col.label}</span>
                    <Badge variant="outline" className="ml-auto text-xs bg-black/[0.03] dark:bg-white/[0.05]">{col.items.length}</Badge>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {col.items.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No items</p>}
                    {col.items.slice(0, 8).map(r => (
                      <motion.div key={r.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer transition-colors"
                        onClick={() => { setGlobalSelectedId(r.id); setActiveView('request-detail'); }}>
                        {TypeIcon({ type: r.type })}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{r.title}</p>
                          <p className="text-[10px] text-muted-foreground">{r.userName} &middot; {timeAgo(r.createdAt)}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-emerald-400 hover:text-emerald-300" onClick={e => { e.stopPropagation(); handleAction(r.id, 'approved'); }}><CheckCircle2 className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-rose-400 hover:text-rose-300" onClick={e => { e.stopPropagation(); handleAction(r.id, 'rejected'); }}><XCircle className="h-3.5 w-3.5" /></Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </GlassCard>
              ))}
            </div>
          </motion.div>

          {/* Trend Chart */}
          <motion.div {...stagger} transition={{ delay: 0.45 }} className="space-y-3">
            <h2 className="text-lg font-semibold">Team Request Trends</h2>
            <GlassCard className="p-4">
              <div className="flex items-end gap-2 h-32">
                {trendData.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div className="w-full bg-gradient-to-t from-emerald-500/40 to-cyan-500/30 rounded-t-sm min-h-[2px]"
                      initial={{ height: 0 }} animate={{ height: `${(d.count / maxTrend) * 100}%` }} transition={{ delay: i * 0.08, duration: 0.5 }} />
                    <span className="text-[10px] text-muted-foreground">{d.label}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">{d.count}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </TabsContent>

        {/* ════════ ALL REQUESTS TAB ════════ */}
        <TabsContent value="all-requests" className="space-y-4 mt-4">
          {/* Bulk Actions Bar */}
          {selectedIds.size > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <Badge className="bg-cyan-500/20 text-cyan-400">{selectedIds.size} selected</Badge>
              <Button size="sm" variant="ghost" className="text-emerald-400 hover:text-emerald-300" onClick={() => { setDlgBulkActionType('approve'); setDlgBulkAction(true); }}><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Approve</Button>
              <Button size="sm" variant="ghost" className="text-rose-400 hover:text-rose-300" onClick={() => { setDlgBulkActionType('reject'); setDlgBulkAction(true); }}><XCircle className="h-3.5 w-3.5 mr-1" />Reject</Button>
              <Button size="sm" variant="ghost" className="text-amber-400 hover:text-amber-300" onClick={() => { setDlgBulkActionType('escalate'); setDlgBulkAction(true); }}><AlertTriangle className="h-3.5 w-3.5 mr-1" />Escalate</Button>
              <Button size="sm" variant="ghost" className="text-cyan-400 hover:text-cyan-300" onClick={() => { setDlgBulkActionType('change-priority'); setDlgBulkAction(true); }}><ArrowUpDown className="h-3.5 w-3.5 mr-1" />Priority</Button>
              <Button size="sm" variant="ghost" className="text-rose-400 hover:text-rose-300" onClick={() => { setDlgBulkActionType('delete'); setDlgBulkAction(true); }}><Trash2 className="h-3.5 w-3.5 mr-1" />Delete</Button>
              <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelectedIds(new Set())}>Clear</Button>
            </motion.div>
          )}

          {/* Filters */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-8 h-9 bg-black/[0.02] dark:bg-white/[0.04]" />
              </div>
              <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(0); }}>
                <SelectTrigger className="w-32 h-9 bg-black/[0.02] dark:bg-white/[0.04]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {['pending', 'under-review', 'approved', 'rejected', 'escalated', 'cancelled'].map(s => <SelectItem key={s} value={s}>{s.replace('-', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={v => { setFilterType(v); setPage(0); }}>
                <SelectTrigger className="w-32 h-9 bg-black/[0.02] dark:bg-white/[0.04]"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(typeConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={v => { setFilterPriority(v); setPage(0); }}>
                <SelectTrigger className="w-28 h-9 bg-black/[0.02] dark:bg-white/[0.04]"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {['urgent', 'high', 'medium', 'low'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterRequester} onValueChange={v => { setFilterRequester(v); setPage(0); }}>
                <SelectTrigger className="w-36 h-9 bg-black/[0.02] dark:bg-white/[0.04]"><SelectValue placeholder="Requester" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Requesters</SelectItem>
                  {uniqueRequesters.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" variant="outline" className="gap-2" onClick={exportCSV}><Download className="h-3.5 w-3.5" />Export CSV</Button>
          </div>

          {/* Table */}
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/[0.06] dark:border-white/[0.06]">
                    <th className="p-3"><Checkbox checked={selectedIds.size === paged.length && paged.length > 0} onCheckedChange={toggleSelectAll} /></th>
                    <th className="text-left p-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('createdAt')}>
                      Type & Title {SortIcon({ col: "createdAt" })}
                    </th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Requester</th>
                    <th className="text-left p-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('priority')}>
                      Priority {SortIcon({ col: "priority" })}
                    </th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('amount')}>
                      Amount {SortIcon({ col: "amount" })}
                    </th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No requests found</td></tr>}
                  {paged.map(r => (
                    <tr key={r.id} className={`border-b border-black/[0.04] dark:border-white/[0.04] hover:bg-black/[0.02] dark:hover:bg-white/[0.03] cursor-pointer transition-colors ${selectedIds.has(r.id) ? 'bg-cyan-500/5' : ''}`}
                      onClick={() => { setGlobalSelectedId(r.id); setActiveView('request-detail'); }}>
                      <td className="p-3" onClick={e => e.stopPropagation()}>
                        <Checkbox checked={selectedIds.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} />
                      </td>
                      <td className="p-3"><div className="flex items-center gap-2">{TypeIcon({ type: r.type })}<span className="truncate max-w-[200px]">{r.title}</span></div></td>
                      <td className="p-3 text-muted-foreground">{r.userName || '—'}</td>
                      <td className="p-3"><Badge className={priorityColorMap[r.priority]}>{r.priority}</Badge></td>
                      <td className="p-3"><StatusBadge status={r.status} /></td>
                      <td className="p-3 text-muted-foreground">{r.amount != null ? `$${r.amount.toLocaleString()}` : '—'}</td>
                      <td className="p-3 text-muted-foreground text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td className="p-3" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button size="sm" variant="ghost" className="h-7 w-7 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem onClick={() => handleAction(r.id, 'approved')}><CheckCircle2 className="h-4 w-4 mr-2 text-emerald-400" />Approve</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAction(r.id, 'rejected')}><XCircle className="h-4 w-4 mr-2 text-rose-400" />Reject</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAction(r.id, 'escalated')}><AlertTriangle className="h-4 w-4 mr-2 text-amber-400" />Escalate</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAction(r.id, 'under-review')}><Eye className="h-4 w-4 mr-2 text-cyan-400" />Under Review</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openDialog('conditional-approve', r.id)}><ListChecks className="h-4 w-4 mr-2 text-emerald-400" />Conditional Approve</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDialog('delegate', r.id)}><CornerDownRight className="h-4 w-4 mr-2 text-violet-400" />Delegate</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDialog('return-revision', r.id)}><RotateCcw className="h-4 w-4 mr-2 text-amber-400" />Return for Revision</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDialog('request-info', r.id)}><MessageSquare className="h-4 w-4 mr-2 text-cyan-400" />Request More Info</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDialog('add-comment', r.id)}><FileText className="h-4 w-4 mr-2 text-slate-400" />Add Comment</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-rose-400" onClick={() => handleEnterpriseAction(r.id, 'delete')}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}</p>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                  return <Button key={p} size="sm" variant={p === page ? 'default' : 'ghost'} className={`h-7 w-7 p-0 ${p === page ? 'bg-cyan-500/20 text-cyan-400' : ''}`} onClick={() => setPage(p)}>{p + 1}</Button>;
                })}
                <Button size="sm" variant="ghost" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ════════ QUICK REVIEW TAB ════════ */}
        <TabsContent value="quick-review" className="mt-4">
          {quickQueue.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-400 mb-3" />
              <p className="font-semibold text-lg">All caught up!</p>
              <p className="text-sm text-muted-foreground">No pending requests to review</p>
            </GlassCard>
          ) : (
            <GlassCard glow="emerald" className="p-6 max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">{quickReviewIdx + 1} of {quickQueue.length} pending</p>
                <div className="w-48">
                  <div className="h-1.5 bg-black/[0.06] dark:bg-white/[0.1] rounded-full overflow-hidden">
                    <motion.div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full"
                      animate={{ width: `${((quickReviewIdx + 1) / quickQueue.length) * 100}%` }} />
                  </div>
                </div>
              </div>
              {quickReq && (
                <AnimatePresence mode="wait">
                  <motion.div key={quickReq.id} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
                    <div className="flex items-center gap-3 mb-4">
                      {TypeIcon({ type: quickReq.type, className: "h-6 w-6" })}
                      <div>
                        <h3 className="font-semibold text-lg">{quickReq.title}</h3>
                        <p className="text-sm text-muted-foreground">{quickReq.userName} &middot; {typeConfig[quickReq.type]?.label}</p>
                      </div>
                      <Badge className={`ml-auto ${priorityColorMap[quickReq.priority]}`}>{quickReq.priority}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 bg-black/[0.02] dark:bg-white/[0.03] p-3 rounded-lg">{quickReq.description || 'No description provided'}</p>
                    {quickReq.amount != null && <p className="text-sm mb-3"><span className="text-muted-foreground">Amount:</span> <span className="font-semibold text-amber-400">${quickReq.amount.toLocaleString()}</span></p>}
                    {/* Related user info */}
                    {deptRequests.filter(r => r.userId === quickReq.userId && r.id !== quickReq.id && ['pending', 'under-review'].includes(r.status)).length > 0 && (
                      <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <p className="text-xs text-amber-400 font-medium mb-1 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Other pending requests from {quickReq.userName}:</p>
                        {deptRequests.filter(r => r.userId === quickReq.userId && r.id !== quickReq.id && ['pending', 'under-review'].includes(r.status)).slice(0, 3).map(r => (
                          <p key={r.id} className="text-xs text-muted-foreground">• {r.title} ({typeConfig[r.type]?.label})</p>
                        ))}
                      </div>
                    )}
                    <Textarea placeholder="Add review comment (optional)..." value={reviewComment} onChange={e => setReviewComment(e.target.value)} className="mb-4 bg-black/[0.02] dark:bg-white/[0.04] min-h-[60px]" />
                    <div className="flex items-center gap-3 flex-wrap">
                      <Button className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30" onClick={() => handleAction(quickReq.id, 'approved')}><CheckCircle2 className="h-4 w-4 mr-2" />Approve</Button>
                      <Button className="bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30" onClick={() => handleAction(quickReq.id, 'rejected')}><XCircle className="h-4 w-4 mr-2" />Reject</Button>
                      <Button className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30" onClick={() => handleAction(quickReq.id, 'escalated')}><AlertTriangle className="h-4 w-4 mr-2" />Escalate</Button>
                      <Button className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30" onClick={() => handleAction(quickReq.id, 'under-review')}><Eye className="h-4 w-4 mr-2" />Under Review</Button>
                      <Button variant="ghost" size="sm" onClick={() => openDialog('conditional-approve', quickReq.id)}><ListChecks className="h-4 w-4 mr-1 text-emerald-400" />Conditional</Button>
                      <Button variant="ghost" size="sm" onClick={() => openDialog('delegate', quickReq.id)}><CornerDownRight className="h-4 w-4 mr-1 text-violet-400" />Delegate</Button>
                      <Button variant="ghost" size="sm" onClick={() => openDialog('request-info', quickReq.id)}><MessageSquare className="h-4 w-4 mr-1 text-cyan-400" />Info</Button>
                      <div className="ml-auto flex gap-2 items-center">
                        <span className="text-[10px] text-muted-foreground hidden sm:inline">← → navigate</span>
                        <Button size="icon" variant="ghost" disabled={quickReviewIdx === 0} onClick={() => setQuickReviewIdx(i => i - 1)}><ChevronLeft /></Button>
                        <Button size="icon" variant="ghost" disabled={quickReviewIdx >= quickQueue.length - 1} onClick={() => setQuickReviewIdx(i => i + 1)}><ChevronRight /></Button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Keyboard className="h-3 w-3" /> Keyboard: ← → navigate &middot; A approve &middot; R reject &middot; E escalate
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </GlassCard>
          )}
        </TabsContent>

        {/* ════════ ESCALATED TAB ════════ */}
        <TabsContent value="escalated" className="space-y-3 mt-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-400" /> Escalation Watch ({escalated.length})</h2>
          {escalated.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <Shield className="h-10 w-10 mx-auto text-emerald-400 mb-2" />
              <p className="text-sm text-muted-foreground">No escalated requests</p>
            </GlassCard>
          ) : escalated.map(r => {
            const escalationAge = r.escalatedAt ? Math.floor((Date.now() - new Date(r.escalatedAt).getTime()) / 3600000) : 0;
            return (
              <GlassCard key={r.id} glow="amber" className="p-4 cursor-pointer" onClick={() => setSelectedId(r.id)}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground">By {r.userName} &middot; {typeConfig[r.type]?.label}
                      {r.escalatedAt && <span className="text-amber-400 ml-2 inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {escalationAge}h ago</span>}
                    </p>
                    {r.reviewComment && <p className="text-xs text-amber-400/80 mt-1 truncate">"{r.reviewComment}"</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" onClick={e => { e.stopPropagation(); handleAction(r.id, 'approved'); }}>Handle</Button>
                    <Button size="sm" variant="ghost" className="text-cyan-400 hover:text-cyan-300" onClick={e => { e.stopPropagation(); handleEnterpriseAction(r.id, 'de-escalate', { reviewComment: 'De-escalated' }); }}>De-escalate</Button>
                    <Button size="sm" variant="ghost" className="text-violet-400 hover:text-violet-300" onClick={e => { e.stopPropagation(); openDialog('delegate', r.id); }}>Delegate</Button>
                    <Button size="sm" variant="ghost" className="text-rose-400 hover:text-rose-300" onClick={e => { e.stopPropagation(); handleAction(r.id, 'rejected'); }}>Reject</Button>
                  </div>
                </div>
                {escalationAge > 24 && <div className="mt-2"><Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Over 24h since escalation</Badge></div>}
              </GlassCard>
            );
          })}
        </TabsContent>

        {/* ════════ ANALYTICS TAB ════════ */}
        <TabsContent value="analytics" className="space-y-6 mt-4">
          {!analytics ? (
            <div className="flex justify-center py-12"><Button onClick={refreshData} disabled={loading}>{loading ? 'Loading...' : 'Load Analytics'}</Button></div>
          ) : (
            <>
              {/* Monthly Trend */}
              <GlassCard className="p-6">
                <h3 className="font-semibold mb-4">Monthly Request Trend</h3>
                <div className="flex items-end gap-3 h-40">
                  {(analytics.monthlyTrend || []).map((m: any, i: number) => {
                    const maxV = Math.max(...(analytics.monthlyTrend || []).map((x: any) => x.created), 1);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col gap-0.5" style={{ height: '120px' }}>
                          <motion.div className="w-full bg-gradient-to-t from-cyan-500/40 to-cyan-500/10 rounded-t-sm flex-1"
                            initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} style={{ transformOrigin: 'bottom', height: `${(m.created / maxV) * 100}%` }} transition={{ delay: i * 0.1 }} />
                          <motion.div className="w-full bg-gradient-to-t from-emerald-500/40 to-emerald-500/10 rounded-t-sm"
                            initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} style={{ transformOrigin: 'bottom', height: `${(m.approved / maxV) * 100}%` }} transition={{ delay: i * 0.1 + 0.05 }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{m.month}</span>
                        <span className="text-[10px] font-medium text-cyan-400">{m.created}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                  <span><span className="inline-block w-2 h-2 rounded bg-cyan-500/40 mr-1" />Created</span>
                  <span><span className="inline-block w-2 h-2 rounded bg-emerald-500/40 mr-1" />Approved</span>
                </div>
              </GlassCard>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Type Distribution */}
                <GlassCard className="p-6">
                  <h3 className="font-semibold mb-4">Type Distribution</h3>
                  <div className="space-y-3">
                    {Object.entries(analytics.typeDistribution || {}).map(([type, count]: [string, any]) => {
                      const total = Object.values(analytics.typeDistribution || {}).reduce((a: number, b: any) => a + Number(b), 0);
                      const pct = total > 0 ? Math.round((Number(count) / total) * 100) : 0;
                      return (
                        <div key={type} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="flex items-center gap-2">{TypeIcon({ type, className: "h-3.5 w-3.5" })}{typeConfig[type]?.label || type}</span>
                            <span className="text-muted-foreground">{count} ({pct}%)</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>

                {/* Priority Distribution */}
                <GlassCard className="p-6">
                  <h3 className="font-semibold mb-4">Priority Distribution</h3>
                  <div className="space-y-3">
                    {Object.entries(analytics.priorityDistribution || {}).map(([priority, count]: [string, any]) => {
                      const total = Object.values(analytics.priorityDistribution || {}).reduce((a: number, b: any) => a + Number(b), 0);
                      const pct = total > 0 ? Math.round((Number(count) / total) * 100) : 0;
                      return (
                        <div key={priority} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span><Badge className={priorityColorMap[priority]}>{priority}</Badge></span>
                            <span className="text-muted-foreground">{count} ({pct}%)</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>

                {/* Approval Rate by Type */}
                <GlassCard className="p-6">
                  <h3 className="font-semibold mb-4">Approval Rate by Type</h3>
                  <div className="space-y-3">
                    {Object.entries(analytics.approvalRateByType || {}).map(([type, data]: [string, any]) => (
                      <div key={type} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-2">{TypeIcon({ type, className: "h-3.5 w-3.5" })}{typeConfig[type]?.label || type}</span>
                          <span className={data.rate >= 70 ? 'text-emerald-400' : data.rate >= 40 ? 'text-amber-400' : 'text-rose-400'}>{data.rate}%</span>
                        </div>
                        <Progress value={data.rate} className="h-1.5" />
                      </div>
                    ))}
                  </div>
                </GlassCard>

                {/* Avg Response Time by Type */}
                <GlassCard className="p-6">
                  <h3 className="font-semibold mb-4">Avg Response Time by Type</h3>
                  <div className="space-y-3">
                    {Object.entries(analytics.avgResponseByType || {}).map(([type, hrs]: [string, any]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm">{TypeIcon({ type, className: "h-3.5 w-3.5" })}{typeConfig[type]?.label || type}</span>
                        <span className={`font-semibold ${Number(hrs) <= 24 ? 'text-emerald-400' : Number(hrs) <= 48 ? 'text-amber-400' : 'text-rose-400'}`}>{hrs}h</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                {/* Expense Analysis */}
                <GlassCard className="p-6 md:col-span-2">
                  <h3 className="font-semibold mb-4">Expense Analysis</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 rounded-lg bg-amber-500/10">
                      <p className="text-2xl font-bold text-amber-400">${(analytics.metrics?.totalExpenseAmount || 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Total Expenses</p>
                    </div>
                    {Object.entries(analytics.expenseByType || {}).slice(0, 3).map(([type, data]: [string, any]) => (
                      <div key={type} className="text-center p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03]">
                        <p className="text-lg font-bold text-cyan-400">${(data.total || 0).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{typeConfig[type]?.label || type}</p>
                        <p className="text-[10px] text-muted-foreground">Avg: ${data.avg?.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>
            </>
          )}
        </TabsContent>

        {/* ════════ TEAM SUMMARY TAB ════════ */}
        <TabsContent value="team-summary" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamSummary.sort((a, b) => b.total - a.total).map((member, i) => (
              <motion.div key={member.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <GlassCard className="p-5" hover>
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 text-emerald-400 text-sm">{(member.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.total} requests</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center p-2 rounded bg-emerald-500/10">
                      <p className="text-sm font-bold text-emerald-400">{member.approved}</p>
                      <p className="text-[10px] text-muted-foreground">Approved</p>
                    </div>
                    <div className="text-center p-2 rounded bg-rose-500/10">
                      <p className="text-sm font-bold text-rose-400">{member.rejected}</p>
                      <p className="text-[10px] text-muted-foreground">Rejected</p>
                    </div>
                    <div className="text-center p-2 rounded bg-amber-500/10">
                      <p className="text-sm font-bold text-amber-400">{member.pending}</p>
                      <p className="text-[10px] text-muted-foreground">Pending</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Avg response: <span className="text-cyan-400 font-medium">{member.avgResponseHrs}h</span></span>
                    <Button size="sm" variant="ghost" className="h-6 text-xs text-cyan-400" onClick={() => { setFilterRequester(member.id); setActiveTab('all-requests'); }}>View Requests</Button>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
            {teamSummary.length === 0 && (
              <GlassCard className="p-8 text-center col-span-full">
                <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No team data available</p>
              </GlassCard>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ════════ DIALOGS ════════ */}

      {/* Conditional Approve Dialog */}
      <Dialog open={dlgConditionalApprove} onOpenChange={setDlgConditionalApprove}>
        <DialogContent className="bg-background/95 border-border">
          <DialogHeader><DialogTitle>Conditional Approval</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Approve this request with conditions that must be met.</p>
          <Textarea placeholder="Enter conditions..." value={dlgConditions} onChange={e => setDlgConditions(e.target.value)} className="min-h-[80px] bg-black/[0.02] dark:bg-white/[0.04]" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDlgConditionalApprove(false)}>Cancel</Button>
            <Button className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30" disabled={loading || !dlgConditions} onClick={() => { if (dlgTargetId) { handleEnterpriseAction(dlgTargetId, 'conditional-approve', { conditions: dlgConditions }); setDlgConditionalApprove(false); setDlgConditions(''); } }}>Approve with Conditions</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delegate Dialog */}
      <Dialog open={dlgDelegate} onOpenChange={setDlgDelegate}>
        <DialogContent className="bg-background/95 border-border">
          <DialogHeader><DialogTitle>Delegate Review</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Assign this request to another reviewer.</p>
          <div className="space-y-3">
            <div><Label className="text-xs">Assign to</Label>
              <Select value={dlgDelegateTo} onValueChange={setDlgDelegateTo}>
                <SelectTrigger className="bg-black/[0.02] dark:bg-white/[0.04]"><SelectValue placeholder="Select reviewer..." /></SelectTrigger>
                <SelectContent>
                  {deptManagers.map(u => <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>)}
                  {deptManagers.length === 0 && <SelectItem value={user?.id || ''}>{user?.name || 'Self'}</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Delegation Note</Label>
              <Textarea placeholder="Add note..." value={dlgDelegationNote} onChange={e => setDlgDelegationNote(e.target.value)} className="bg-black/[0.02] dark:bg-white/[0.04]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDlgDelegate(false)}>Cancel</Button>
            <Button className="bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 border border-violet-500/30" disabled={loading || !dlgDelegateTo} onClick={() => { if (dlgTargetId) { handleEnterpriseAction(dlgTargetId, 'delegate', { delegateToId: dlgDelegateTo, delegationNote: dlgDelegationNote }); setDlgDelegate(false); setDlgDelegateTo(''); setDlgDelegationNote(''); } }}>Delegate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return for Revision Dialog */}
      <Dialog open={dlgReturnRevision} onOpenChange={setDlgReturnRevision}>
        <DialogContent className="bg-background/95 border-border">
          <DialogHeader><DialogTitle>Return for Revision</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Send this request back to pending for revision.</p>
          <Textarea placeholder="Reason for returning..." value={dlgRevisionReason} onChange={e => setDlgRevisionReason(e.target.value)} className="min-h-[80px] bg-black/[0.02] dark:bg-white/[0.04]" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDlgReturnRevision(false)}>Cancel</Button>
            <Button className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30" disabled={loading} onClick={() => { if (dlgTargetId) { handleEnterpriseAction(dlgTargetId, 'return-for-revision', { reason: dlgRevisionReason }); setDlgReturnRevision(false); setDlgRevisionReason(''); } }}>Return for Revision</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request More Info Dialog */}
      <Dialog open={dlgRequestInfo} onOpenChange={setDlgRequestInfo}>
        <DialogContent className="bg-background/95 border-border">
          <DialogHeader><DialogTitle>Request More Information</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Ask the requester for additional information.</p>
          <Textarea placeholder="What information do you need?" value={dlgInfoMessage} onChange={e => setDlgInfoMessage(e.target.value)} className="min-h-[80px] bg-black/[0.02] dark:bg-white/[0.04]" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDlgRequestInfo(false)}>Cancel</Button>
            <Button className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30" disabled={loading || !dlgInfoMessage} onClick={() => { if (dlgTargetId) { handleEnterpriseAction(dlgTargetId, 'request-more-info', { infoMessage: dlgInfoMessage }); setDlgRequestInfo(false); setDlgInfoMessage(''); } }}>Request Info</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Comment Dialog */}
      <Dialog open={dlgAddComment} onOpenChange={setDlgAddComment}>
        <DialogContent className="bg-background/95 border-border">
          <DialogHeader><DialogTitle>Add Internal Comment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Textarea placeholder="Your comment..." value={dlgComment} onChange={e => setDlgComment(e.target.value)} className="min-h-[80px] bg-black/[0.02] dark:bg-white/[0.04]" />
            <div><Label className="text-xs">Visibility</Label>
              <Select value={dlgCommentVisibility} onValueChange={setDlgCommentVisibility}>
                <SelectTrigger className="bg-black/[0.02] dark:bg-white/[0.04]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal (reviewers only)</SelectItem>
                  <SelectItem value="public">Public (visible to requester)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDlgAddComment(false)}>Cancel</Button>
            <Button className="bg-slate-500/20 text-slate-300 hover:bg-slate-500/30 border border-slate-500/30" disabled={loading || !dlgComment} onClick={() => { if (dlgTargetId) { handleEnterpriseAction(dlgTargetId, 'add-comment', { comment: dlgComment, visibility: dlgCommentVisibility }); setDlgAddComment(false); setDlgComment(''); } }}>Add Comment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Dialog */}
      <Dialog open={dlgBulkAction} onOpenChange={setDlgBulkAction}>
        <DialogContent className="bg-background/95 border-border">
          <DialogHeader><DialogTitle>Bulk Action: {dlgBulkActionType.replace('-', ' ')}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Apply to {selectedIds.size} selected request(s).</p>
          <div className="space-y-3">
            {dlgBulkActionType === 'change-priority' && (
              <div><Label className="text-xs">New Priority</Label>
                <Select value={dlgBulkPriority} onValueChange={setDlgBulkPriority}>
                  <SelectTrigger className="bg-black/[0.02] dark:bg-white/[0.04]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['urgent', 'high', 'medium', 'low'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div><Label className="text-xs">Comment (optional)</Label>
              <Textarea placeholder="Optional comment..." value={dlgBulkComment} onChange={e => setDlgBulkComment(e.target.value)} className="bg-black/[0.02] dark:bg-white/[0.04]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDlgBulkAction(false)}>Cancel</Button>
            <Button className={dlgBulkActionType === 'delete' ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30' : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30'} disabled={loading} onClick={handleBulkAction}>
              {dlgBulkActionType === 'delete' ? 'Delete' : 'Apply'} ({selectedIds.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
