'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign, TrendingUp, Users, Clock, CheckCircle2, AlertTriangle,
  Filter, Eye, Edit, PauseCircle, PlayCircle, CreditCard, Wallet,
  Receipt, Calculator, Search, RefreshCw, ChevronDown,
  ChevronUp, ChevronRight, Building2, FileSpreadsheet, Loader2,
  BarChart3, ArrowUpDown, Download, XCircle, Landmark,
  BadgeDollarSign, Clock4, MoreHorizontal, Briefcase, Banknote,
  FileText, Settings, PieChart, Shield, Activity, X
} from 'lucide-react';
import { GlassCard } from './glass-card';
import { StatCard } from './stat-card';
import { StatusBadge } from './status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useEMSStore } from '@/lib/store';
import type { PayrollRecord } from '@/lib/types';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────
const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);

const paymentMethodLabel: Record<string, string> = {
  'bank-transfer': 'Bank Transfer',
  cash: 'Cash',
  check: 'Check',
  'digital-wallet': 'Digital Wallet',
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: 'text-slate-400', bg: 'bg-slate-500/15 border-slate-500/25' },
  reviewed: { label: 'Reviewed', color: 'text-cyan-400', bg: 'bg-cyan-500/15 border-cyan-500/25' },
  approved: { label: 'Approved', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/25' },
  paid: { label: 'Paid', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/25' },
  'on-hold': { label: 'On Hold', color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/25' },
  cancelled: { label: 'Cancelled', color: 'text-rose-400', bg: 'bg-rose-500/15 border-rose-500/25' },
};

const stagger = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

type SortDir = 'asc' | 'desc' | null;
type SortField = 'userName' | 'month' | 'baseSalary' | 'overtime' | 'allowances' | 'grossSalary' | 'deductions' | 'netSalary' | 'status';

// ─── Salary Donut SVG ────────────────────────────────────────────
function SalaryDonut({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = 60, cy = 60, r = 45, stroke = 14;
  const circumference = 2 * Math.PI * r;
  const cumOffsets = data.reduce<number[]>((acc, _seg, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + data[i - 1].value / total);
    return acc;
  }, []);
  return (
    <div className="flex items-center gap-4">
      <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0">
        {data.map((seg, i) => {
          const pct = seg.value / total;
          const dashLen = pct * circumference;
          const dashOff = -(cumOffsets[i] || 0) * circumference;
          return (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color}
              strokeWidth={stroke} strokeDasharray={`${dashLen} ${circumference - dashLen}`}
              strokeDashoffset={dashOff} transform={`rotate(-90 ${cx} ${cy})`}
              className="transition-all duration-700" style={{ strokeLinecap: 'round' }} />
          );
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-foreground text-[11px] font-bold">{formatCurrency(total)}</text>
        <text x={cx} y={cy + 8} textAnchor="middle" className="fill-muted-foreground text-[8px]">Total</text>
      </svg>
      <div className="space-y-1.5 min-w-0">
        {data.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
            <span className="text-muted-foreground truncate">{seg.label}</span>
            <span className="font-medium ml-auto">{formatCurrency(seg.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Status Pipeline ─────────────────────────────────────────────
function StatusPipeline({ payroll }: { payroll: PayrollRecord[] }) {
  const stages = [
    { key: 'draft', label: 'Draft', color: 'bg-slate-500' },
    { key: 'reviewed', label: 'Reviewed', color: 'bg-cyan-500' },
    { key: 'approved', label: 'Approved', color: 'bg-amber-500' },
    { key: 'paid', label: 'Paid', color: 'bg-emerald-500' },
  ];
  const counts = stages.map(s => ({
    ...s, count: payroll.filter(p => p.status === s.key).length,
    amount: payroll.filter(p => p.status === s.key).reduce((a, p) => a + (p?.netSalary ?? 0), 0),
  }));
  const total = counts.reduce((s, c) => s + c.count, 0) || 1;
  const paidPct = payroll.length > 0 ? (payroll.filter(p => p.status === 'paid').length / payroll.length) * 100 : 0;
  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status Pipeline</h4>
        <span className="text-xs text-muted-foreground">{payroll.length} records</span>
      </div>
      <div className="h-2 rounded-full bg-black/[0.03] dark:bg-white/[0.05] overflow-hidden flex mb-4">
        {counts.map((c, i) => (
          <motion.div key={c.key} className={cn('h-full', c.color)}
            initial={{ width: 0 }} animate={{ width: `${(c.count / total) * 100}%` }}
            transition={{ duration: 0.6, delay: i * 0.1 }} />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-3">
        {counts.map(c => (
          <div key={c.key} className="text-center">
            <div className={cn('h-2 w-2 rounded-full mx-auto mb-1.5', c.color)} />
            <p className="text-xs font-semibold">{c.count}</p>
            <p className="text-[10px] text-muted-foreground">{c.label}</p>
            <p className="text-[9px] text-muted-foreground/70 mt-0.5">{formatCurrency(c.amount)}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">Payment Completion</span>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 rounded-full bg-black/[0.03] dark:bg-white/[0.05] overflow-hidden">
            <motion.div className="h-full rounded-full bg-emerald-500" initial={{ width: 0 }} animate={{ width: `${paidPct}%` }} transition={{ duration: 0.8 }} />
          </div>
          <span className="text-[10px] font-semibold text-emerald-400">{paidPct.toFixed(0)}%</span>
        </div>
      </div>
    </GlassCard>
  );
}

// ─── Main Component ──────────────────────────────────────────────
export function ManagerPayrollDashboard() {
  const {
    user, payroll, payrollDashboard, payrollLoading, users, departments,
    updatePayroll, bulkPayrollAction, loadPayrollDashboard, editPayrollRecord
  } = useEMSStore();

  // ─── State ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('overview');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>('month');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [refreshing, setRefreshing] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<PayrollRecord | null>(null);
  const [editForm, setEditForm] = useState({ bonus: '', overtime: '', otherDeductions: '', notes: '' });

  // Hold dialog
  const [holdOpen, setHoldOpen] = useState(false);
  const [holdRecord, setHoldRecord] = useState<PayrollRecord | null>(null);
  const [holdReason, setHoldReason] = useState('');

  // Approval notes
  const [approvalNotes, setApprovalNotes] = useState('');

  // Load dashboard data on mount
  useEffect(() => { loadPayrollDashboard(); }, [loadPayrollDashboard]);

  // ─── Department-scoped payroll ───────────────────────────────
  const deptPayroll = useMemo(() => {
    if (!user?.departmentId) return payroll ?? [];
    const deptUserIds = new Set(
      (users ?? []).filter(u => u.departmentId === user.departmentId).map(u => u.id)
    );
    return (payroll ?? []).filter(p => deptUserIds.has(p.userId) || p.userDepartment === user?.department);
  }, [payroll, users, user?.departmentId, user?.department]);

  const metrics = payrollDashboard?.metrics;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // ─── Computed Metrics ────────────────────────────────────────
  const computedMetrics = useMemo(() => {
    const totalPayroll = deptPayroll.reduce((s, p) => s + (p?.netSalary ?? 0), 0);
    const totalPaid = deptPayroll.filter(p => p.status === 'paid').reduce((s, p) => s + (p?.netSalary ?? 0), 0);
    const pendingAmount = deptPayroll.filter(p => !['paid', 'cancelled'].includes(p.status)).reduce((s, p) => s + (p?.netSalary ?? 0), 0);
    const avgSalary = deptPayroll.length > 0 ? totalPayroll / deptPayroll.length : 0;
    const totalDeductions = deptPayroll.reduce((s, p) => s + (p?.deductions ?? 0), 0);
    const totalOvertime = deptPayroll.reduce((s, p) => s + (p?.overtime ?? 0), 0);
    const totalTax = deptPayroll.reduce((s, p) => s + (p?.tax ?? 0), 0);
    const draftCount = deptPayroll.filter(p => p.status === 'draft').length;
    const reviewedCount = deptPayroll.filter(p => p.status === 'reviewed').length;
    const approvedCount = deptPayroll.filter(p => p.status === 'approved').length;
    const paidCount = deptPayroll.filter(p => p.status === 'paid').length;
    const onHoldCount = deptPayroll.filter(p => p.status === 'on-hold').length;
    const netPayout = totalPayroll - totalDeductions;
    return { totalPayroll, totalPaid, pendingAmount, avgSalary, totalDeductions, totalOvertime, totalTax, draftCount, reviewedCount, approvedCount, paidCount, onHoldCount, netPayout };
  }, [deptPayroll]);

  const draftRecords = useMemo(() => deptPayroll.filter(p => p.status === 'draft'), [deptPayroll]);
  const reviewedRecords = useMemo(() => deptPayroll.filter(p => p.status === 'reviewed'), [deptPayroll]);
  const pendingApproval = useMemo(() => deptPayroll.filter(p => ['draft', 'reviewed'].includes(p.status)), [deptPayroll]);

  // ─── Available months ───────────────────────────────────────
  const availableMonths = useMemo(() => {
    const set = new Set(deptPayroll.map(p => p?.month).filter(Boolean));
    return Array.from(set).sort().reverse();
  }, [deptPayroll]);

  // ─── Filtered & sorted payroll ──────────────────────────────
  const filtered = useMemo(() => {
    let list = [...deptPayroll];
    if (filterMonth !== 'all') list = list.filter(p => p.month === filterMonth);
    if (filterStatus !== 'all') list = list.filter(p => p.status === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (p.userName || '').toLowerCase().includes(q) ||
        (p.userDepartment || '').toLowerCase().includes(q) ||
        (p.userPosition || '').toLowerCase().includes(q) ||
        (p.month || '').includes(q)
      );
    }
    if (sortField && sortDir) {
      list.sort((a, b) => {
        const aVal = a[sortField] ?? '';
        const bVal = b[sortField] ?? '';
        const cmp = typeof aVal === 'number' && typeof bVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    } else {
      list.sort((a, b) => (b?.month || '').localeCompare(a?.month || ''));
    }
    return list;
  }, [deptPayroll, filterMonth, filterStatus, search, sortField, sortDir]);

  // ─── Chart Data ─────────────────────────────────────────────
  const monthlyTrend = useMemo(() => {
    if (payrollDashboard?.monthlyTrend?.length) return payrollDashboard.monthlyTrend.slice(-6);
    const map: Record<string, { total: number; paid: number; pending: number }> = {};
    deptPayroll.forEach(p => {
      if (!map[p.month]) map[p.month] = { total: 0, paid: 0, pending: 0 };
      map[p.month].total += p.netSalary ?? 0;
      if (p.status === 'paid') map[p.month].paid += p.netSalary ?? 0;
      else map[p.month].pending += p.netSalary ?? 0;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([month, data]) => ({ month, ...data }));
  }, [deptPayroll, payrollDashboard?.monthlyTrend]);

  const maxTrendVal = Math.max(...monthlyTrend.map(m => m?.total ?? 0), 1);

  const donutData = useMemo(() => {
    const baseSalary = deptPayroll.reduce((s, p) => s + (p?.baseSalary ?? 0), 0);
    const allowances = deptPayroll.reduce((s, p) => s + (p?.allowances ?? 0), 0);
    const deductions = deptPayroll.reduce((s, p) => s + (p?.deductions ?? 0), 0);
    const bonuses = deptPayroll.reduce((s, p) => s + (p?.bonus ?? 0), 0);
    return [
      { label: 'Base Salary', value: baseSalary, color: '#10b981' },
      { label: 'Allowances', value: allowances, color: '#06b6d4' },
      { label: 'Deductions', value: deductions, color: '#f43f5e' },
      { label: 'Bonuses', value: bonuses, color: '#f59e0b' },
    ];
  }, [deptPayroll]);

  const deductionBreakdown = useMemo(() => {
    const tax = deptPayroll.reduce((s, p) => s + (p?.tax ?? 0), 0);
    const insurance = deptPayroll.reduce((s, p) => s + (p?.insurance ?? 0), 0);
    const pf = deptPayroll.reduce((s, p) => s + (p?.providentFund ?? 0), 0);
    const other = deptPayroll.reduce((s, p) => s + (p?.otherDeductions ?? 0), 0);
    return [
      { label: 'Tax', value: tax, color: '#f43f5e' },
      { label: 'Insurance', value: insurance, color: '#f97316' },
      { label: 'Provident Fund', value: pf, color: '#8b5cf6' },
      { label: 'Other', value: other, color: '#64748b' },
    ];
  }, [deptPayroll]);

  // ─── Helpers ────────────────────────────────────────────────
  const deptName = departments?.find(d => d.id === user?.departmentId)?.name || user?.department || 'Department';

  function getInitials(name: string) { return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2); }
  function getAvatarColor(name: string) {
    const colors = ['from-emerald-500 to-cyan-500', 'from-amber-500 to-orange-500', 'from-violet-500 to-purple-500', 'from-rose-500 to-pink-500', 'from-cyan-500 to-teal-500', 'from-lime-500 to-green-500'];
    let hash = 0; for (let i = 0; i < (name || '').length; i++) hash = (name || '').charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  // ─── Actions ────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPayrollDashboard();
    setTimeout(() => { setRefreshing(false); toast.success('Dashboard refreshed'); }, 400);
  }, [loadPayrollDashboard]);

  const openDetail = useCallback((record: PayrollRecord) => {
    setSelectedRecord(record);
    setSheetOpen(true);
    setApprovalNotes('');
  }, []);

  const handleReview = useCallback(async (id: string) => {
    setActionLoading(true);
    try {
      await updatePayroll(id, { status: 'reviewed', reviewedBy: user?.id, reviewerName: user?.name, reviewedAt: new Date().toISOString() } as Partial<PayrollRecord>);
      toast.success('Payroll reviewed successfully');
      setSheetOpen(false);
    } catch { toast.error('Failed to review payroll'); }
    finally { setActionLoading(false); }
  }, [updatePayroll, user?.id, user?.name]);

  const handleApprove = useCallback(async (id: string) => {
    setActionLoading(true);
    try {
      await updatePayroll(id, { status: 'approved', approvedBy: user?.id, approverName: user?.name, approvedAt: new Date().toISOString() } as Partial<PayrollRecord>);
      toast.success('Payroll approved');
      setSheetOpen(false);
    } catch { toast.error('Failed to approve payroll'); }
    finally { setActionLoading(false); }
  }, [updatePayroll, user?.id, user?.name]);

  const handleHold = useCallback(async () => {
    if (!holdRecord) return;
    setActionLoading(true);
    try {
      await updatePayroll(holdRecord.id, { status: 'on-hold', notes: holdReason || 'Placed on hold by manager' } as Partial<PayrollRecord>);
      toast.success('Payroll put on hold');
      setHoldOpen(false); setHoldReason(''); setSheetOpen(false);
    } catch { toast.error('Failed to hold payroll'); }
    finally { setActionLoading(false); }
  }, [holdRecord, holdReason, updatePayroll]);

  const handleBulkAction = useCallback(async (action: string) => {
    if (selectedIds.size === 0) return;
    setActionLoading(true);
    try {
      await bulkPayrollAction(Array.from(selectedIds), action);
      toast.success(`${selectedIds.size} records updated to ${action}`);
      setSelectedIds(new Set());
    } catch { toast.error('Bulk action failed'); }
    finally { setActionLoading(false); }
  }, [bulkPayrollAction, selectedIds]);

  const openEdit = useCallback((record: PayrollRecord) => {
    setEditRecord(record);
    setEditForm({ bonus: String(record.bonus ?? 0), overtime: String(record.overtime ?? 0), otherDeductions: String(record.otherDeductions ?? 0), notes: record.notes || '' });
    setEditOpen(true);
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editRecord) return;
    const bonus = parseFloat(editForm.bonus) || 0;
    const overtime = parseFloat(editForm.overtime) || 0;
    const otherDeductions = parseFloat(editForm.otherDeductions) || 0;
    const newGross = (editRecord.baseSalary ?? 0) + overtime + (editRecord.allowances ?? 0) + bonus;
    const newDeductions = (editRecord.tax ?? 0) + (editRecord.insurance ?? 0) + (editRecord.providentFund ?? 0) + otherDeductions;
    const newNet = newGross - newDeductions;
    try {
      await editPayrollRecord(editRecord.id, { bonus, overtime, otherDeductions, notes: editForm.notes, grossSalary: newGross, deductions: newDeductions, netSalary: newNet });
      toast.success('Payroll record updated'); setEditOpen(false);
    } catch { toast.error('Failed to update payroll record'); }
  }, [editRecord, editForm, editPayrollRecord]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(p => p.id)));
  }, [selectedIds.size, filtered]);

  const handleSort = useCallback((field: SortField) => {
    setSortField(field);
    setSortDir(prev => { if (prev === null) return 'asc'; if (prev === 'asc') return 'desc'; return null; });
  }, []);

  const exportCSV = useCallback(() => {
    const headers = ['Employee', 'Position', 'Month', 'Base Salary', 'Overtime', 'Allowances', 'Bonus', 'Gross', 'Tax', 'Insurance', 'PF', 'Other Ded.', 'Deductions', 'Net', 'Status', 'Payment Method'];
    const rows = filtered.map(p => [
      p.userName || 'Unknown', p.userPosition || '', p.month,
      p.baseSalary ?? 0, p.overtime ?? 0, p.allowances ?? 0, p.bonus ?? 0, p.grossSalary ?? 0,
      p.tax ?? 0, p.insurance ?? 0, p.providentFund ?? 0, p.otherDeductions ?? 0, p.deductions ?? 0,
      p.netSalary ?? 0, p.status, p.paymentMethod
    ].map(v => `"${v}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `payroll-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  }, [filtered]);

  // ─── Sort icon ──────────────────────────────────────────────
  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    if (sortDir === 'asc') return <ChevronUp className="h-3 w-3 text-emerald-400" />;
    if (sortDir === 'desc') return <ChevronDown className="h-3 w-3 text-emerald-400" />;
    return <ArrowUpDown className="h-3 w-3 opacity-30" />;
  }

  // ─── Selected record payroll history ─────────────────────────
  const selectedRecordHistory = useMemo(() => {
    if (!selectedRecord) return [];
    return deptPayroll.filter(p => p.userId === selectedRecord.userId && p.id !== selectedRecord.id).sort((a, b) => (b?.month || '').localeCompare(a?.month || '')).slice(0, 5);
  }, [selectedRecord, deptPayroll]);

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ═══ HEADER ═══ */}
      <motion.div {...stagger} transition={{ delay: 0 }} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">Payroll Dashboard</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{deptName} &middot; Review and manage team payroll</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingApproval.length > 0 && (
            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">{pendingApproval.length} Pending</Badge>
            </motion.div>
          )}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-emerald-500/10">
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-cyan-500/10" disabled={filtered.length === 0}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </motion.div>

      {/* ═══ HERO METRICS (7 cards) ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <motion.div {...stagger} transition={{ delay: 0.05 }}>
          <StatCard title="Team Size" value={metrics?.totalEmployees || deptPayroll.length} icon={Users} color="emerald" subtitle="Active members" hero progressRing={{ value: metrics?.totalEmployees || deptPayroll.length, max: (users ?? []).length || 1 }} />
        </motion.div>
        <motion.div {...stagger} transition={{ delay: 0.1 }}>
          <StatCard title="Monthly Payroll" value={formatCurrency(metrics?.totalPayroll || computedMetrics.totalPayroll)} icon={DollarSign} color="cyan" subtitle="Total disbursement" hero />
        </motion.div>
        <motion.div {...stagger} transition={{ delay: 0.15 }}>
          <StatCard title="Avg Salary" value={formatCurrency(metrics?.avgSalary || computedMetrics.avgSalary)} icon={TrendingUp} color="emerald" subtitle="Per employee" hero />
        </motion.div>
        <motion.div {...stagger} transition={{ delay: 0.2 }}>
          <StatCard title="Pending" value={metrics?.draftCount || computedMetrics.draftCount} icon={Clock} color="amber" subtitle="Needs review" hero pulse={(metrics?.draftCount || computedMetrics.draftCount) > 0} />
        </motion.div>
        <motion.div {...stagger} transition={{ delay: 0.25 }}>
          <StatCard title="Total Deductions" value={formatCurrency(computedMetrics.totalDeductions)} icon={BadgeDollarSign} color="rose" subtitle="All deductions" hero />
        </motion.div>
        <motion.div {...stagger} transition={{ delay: 0.3 }}>
          <StatCard title="Net Payout" value={formatCurrency(computedMetrics.netPayout)} icon={Wallet} color="emerald" subtitle="After deductions" hero />
        </motion.div>
        <motion.div {...stagger} transition={{ delay: 0.35 }}>
          <StatCard title="Overtime" value={formatCurrency(metrics?.totalOvertime || computedMetrics.totalOvertime)} icon={Clock4} color="orange" subtitle="OT earnings" hero />
        </motion.div>
      </div>

      {/* ═══ MAIN TABS ═══ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-background/80 backdrop-blur-xl border border-black/[0.1] dark:border-white/[0.1] w-full grid grid-cols-5 sticky top-0 z-20">
          <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs gap-1">
            <BarChart3 className="h-3.5 w-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="team-payroll" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs gap-1">
            <Receipt className="h-3.5 w-3.5" /> Team Payroll
          </TabsTrigger>
          <TabsTrigger value="approvals" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs gap-1 relative">
            <CheckCircle2 className="h-3.5 w-3.5" /> Approvals
            {pendingApproval.length > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 text-[9px] text-white flex items-center justify-center font-bold">{pendingApproval.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs gap-1">
            <PieChart className="h-3.5 w-3.5" /> Reports
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs gap-1">
            <Settings className="h-3.5 w-3.5" /> Settings
          </TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW TAB ── */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Salary Donut */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <GlassCard className="p-4 h-full">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Salary Distribution</h4>
                <SalaryDonut data={donutData} />
              </GlassCard>
            </motion.div>
            {/* Monthly Trend Bar Chart */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <GlassCard className="p-4 h-full">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Monthly Trend</h4>
                {monthlyTrend.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">No trend data available</div>
                ) : (
                  <div className="h-32 flex items-end gap-2">
                    {monthlyTrend.map((m, i) => {
                      const totalH = ((m?.total ?? 0) / maxTrendVal) * 100;
                      const paidH = (m?.total ?? 0) > 0 ? ((m?.paid ?? 0) / (m?.total ?? 1)) * totalH : 0;
                      const pendingH = totalH - paidH;
                      return (
                        <div key={m?.month || i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full flex flex-col justify-end" style={{ height: '100px' }}>
                            <motion.div className="w-full bg-gradient-to-t from-amber-500/40 to-amber-400/20 rounded-t min-h-[2px]"
                              initial={{ height: 0 }} animate={{ height: `${pendingH}%` }} transition={{ delay: i * 0.1, duration: 0.5 }} />
                            <motion.div className="w-full bg-gradient-to-t from-emerald-500/40 to-emerald-400/20 min-h-[2px]"
                              initial={{ height: 0 }} animate={{ height: `${paidH}%` }} transition={{ delay: i * 0.1 + 0.1, duration: 0.5 }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{(m?.month || '').slice(5)}</span>
                          <span className="text-[10px] font-medium text-cyan-400">{formatCurrency(m?.total ?? 0)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                  <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Paid</div>
                  <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" /> Pending</div>
                </div>
              </GlassCard>
            </motion.div>
            {/* Deduction Breakdown Pie */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <GlassCard className="p-4 h-full">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Deduction Breakdown</h4>
                <SalaryDonut data={deductionBreakdown} />
              </GlassCard>
            </motion.div>
          </div>

          {/* Status Pipeline */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <StatusPipeline payroll={deptPayroll} />
          </motion.div>

          {/* Quick Review Queue */}
          {draftRecords.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" /> Quick Review Queue
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">{draftRecords.length}</Badge>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {draftRecords.slice(0, 6).map((record, i) => (
                  <motion.div key={record.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <GlassCard hover className="p-4" onClick={() => openDetail(record)}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={cn('h-9 w-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-xs shrink-0', getAvatarColor(record.userName || ''))}>
                          {getInitials(record.userName || '')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{record.userName || 'Unknown'}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{record.userPosition || ''}</p>
                        </div>
                        <p className="text-sm font-bold text-emerald-400 shrink-0">{formatCurrency(record.netSalary)}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded px-2 py-1"><span className="text-muted-foreground">Base:</span> <span className="font-medium">{formatCurrency(record.baseSalary)}</span></div>
                        <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded px-2 py-1"><span className="text-muted-foreground">OT:</span> <span className="font-medium">{formatCurrency(record.overtime)}</span></div>
                        <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded px-2 py-1"><span className="text-muted-foreground">Allow.:</span> <span className="font-medium">{formatCurrency(record.allowances)}</span></div>
                        <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded px-2 py-1"><span className="text-muted-foreground">Ded.:</span> <span className="font-medium text-rose-400">{formatCurrency(record.deductions)}</span></div>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Button size="sm" className="h-7 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-500 flex-1"
                          onClick={e => { e.stopPropagation(); handleReview(record.id); }} disabled={actionLoading}>
                          <CheckCircle2 className="h-3 w-3" /> Review
                        </Button>
                        <Button size="sm" className="h-7 text-[10px] gap-1 bg-cyan-600 hover:bg-cyan-500 flex-1"
                          onClick={e => { e.stopPropagation(); handleApprove(record.id); }} disabled={actionLoading}>
                          <PlayCircle className="h-3 w-3" /> Approve
                        </Button>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Recent Activity */}
          {payrollDashboard?.recentActivity && payrollDashboard.recentActivity.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <GlassCard className="p-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Activity</h4>
                <ScrollArea className="max-h-48">
                  <div className="space-y-2">
                    {payrollDashboard.recentActivity.slice(0, 10).map((act, i) => (
                      <div key={act.id || i} className="flex items-center gap-3 text-xs py-1.5 border-b border-black/[0.04] dark:border-white/[0.04] last:border-0">
                        <div className={cn('h-7 w-7 rounded-full flex items-center justify-center shrink-0',
                          act.action === 'paid' ? 'bg-emerald-500/15 text-emerald-400' :
                          act.action === 'approved' ? 'bg-amber-500/15 text-amber-400' :
                          act.action === 'reviewed' ? 'bg-cyan-500/15 text-cyan-400' : 'bg-slate-500/15 text-slate-400')}>
                          {act.action === 'paid' ? <DollarSign className="h-3.5 w-3.5" /> :
                           act.action === 'approved' ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                           <Eye className="h-3.5 w-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{act.userName}</span>
                          <span className="text-muted-foreground"> — {act.action} for {act.month}</span>
                        </div>
                        <span className="text-muted-foreground shrink-0">{formatCurrency(act.amount)}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </GlassCard>
            </motion.div>
          )}
        </TabsContent>

        {/* ── TEAM PAYROLL TAB ── */}
        <TabsContent value="team-payroll" className="mt-4 space-y-4">
          {/* Filter Bar */}
          <GlassCard className="p-4 sticky top-10 z-10 bg-background/80 backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search records..." value={search} onChange={e => setSearch(e.target.value)}
                  className="h-9 pl-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30" />
              </div>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="h-9 w-36 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {availableMonths.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 w-36 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(statusConfig).map(([key, cfg]) => <SelectItem key={key} value={key}>{cfg.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">{filtered.length} records</div>
            </div>
          </GlassCard>

          {/* Bulk Actions Bar */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div initial={{ opacity: 0, y: -20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -20, height: 0 }} className="overflow-hidden">
                <GlassCard className="p-3 border-emerald-500/20 bg-emerald-500/5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25">{selectedIds.size} selected</Badge>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setSelectedIds(new Set())}><X className="h-3 w-3" /> Clear</Button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10" onClick={() => handleBulkAction('reviewed')}><Eye className="h-3 w-3" /> Review</Button>
                      <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10" onClick={() => handleBulkAction('approved')}><CheckCircle2 className="h-3 w-3" /> Approve</Button>
                      <Button size="sm" className="h-7 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-500" onClick={() => handleBulkAction('paid')}><DollarSign className="h-3 w-3" /> Pay</Button>
                      <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 border-orange-500/30 text-orange-400 hover:bg-orange-500/10" onClick={() => handleBulkAction('on-hold')}><PauseCircle className="h-3 w-3" /> Hold</Button>
                      <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 border-rose-500/30 text-rose-400 hover:bg-rose-500/10" onClick={() => handleBulkAction('cancelled')}><XCircle className="h-3 w-3" /> Cancel</Button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Records Table */}
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-black/[0.06] dark:border-white/[0.06]">
                    <th className="p-3 text-left w-10">
                      <Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleSelectAll} />
                    </th>
                    {[
                      { field: 'userName' as SortField, label: 'Employee' },
                      { field: 'month' as SortField, label: 'Month' },
                      { field: 'baseSalary' as SortField, label: 'Base' },
                      { field: 'overtime' as SortField, label: 'OT' },
                      { field: 'allowances' as SortField, label: 'Allow.' },
                      { field: 'grossSalary' as SortField, label: 'Gross' },
                      { field: 'deductions' as SortField, label: 'Ded.' },
                      { field: 'netSalary' as SortField, label: 'Net' },
                      { field: 'status' as SortField, label: 'Status' },
                    ].map(col => (
                      <th key={col.field} className="p-3 text-left">
                        <button onClick={() => handleSort(col.field)} className="flex items-center gap-1 hover:text-foreground transition-colors text-muted-foreground">
                          {col.label} {SortIcon({ field: col.field })}
                        </button>
                      </th>
                    ))}
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={11} className="p-12 text-center text-muted-foreground">
                      <FileText className="h-8 w-8 opacity-30 mx-auto mb-2" /><p className="text-sm">No payroll records found</p>
                    </td></tr>
                  ) : filtered.map(record => {
                    const sInfo = statusConfig[record.status];
                    const isSelected = selectedIds.has(record.id);
                    return (
                      <motion.tr key={record.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className={cn('border-b border-black/[0.04] dark:border-white/[0.04] transition-colors cursor-pointer', isSelected ? 'bg-emerald-500/5' : 'hover:bg-black/[0.01] dark:hover:bg-white/[0.02]')}
                        onClick={() => openDetail(record)}>
                        <td className="p-3" onClick={e => e.stopPropagation()}>
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(record.id)} />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className={cn('h-7 w-7 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-[9px] shrink-0', getAvatarColor(record.userName || ''))}>
                              {getInitials(record.userName || '')}
                            </div>
                            <div>
                              <p className="font-medium truncate max-w-[130px]">{record.userName || 'Unknown'}</p>
                              <p className="text-[10px] text-muted-foreground truncate max-w-[130px]">{record.userPosition || ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-mono">{record.month}</td>
                        <td className="p-3">{formatCurrency(record.baseSalary)}</td>
                        <td className="p-3">{formatCurrency(record.overtime)}</td>
                        <td className="p-3">{formatCurrency(record.allowances)}</td>
                        <td className="p-3 font-medium">{formatCurrency(record.grossSalary)}</td>
                        <td className="p-3 text-rose-400">-{formatCurrency(record.deductions)}</td>
                        <td className="p-3 font-bold text-emerald-400">{formatCurrency(record.netSalary)}</td>
                        <td className="p-3">
                          {sInfo && <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border', sInfo.bg, sInfo.color)}>{sInfo.label}</Badge>}
                        </td>
                        <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openDetail(record)}><Eye className="h-3 w-3 mr-2" /> View Details</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(record)}><Edit className="h-3 w-3 mr-2" /> Edit</DropdownMenuItem>
                              {record.status === 'draft' && (
                                <DropdownMenuItem onClick={() => handleReview(record.id)}><CheckCircle2 className="h-3 w-3 mr-2" /> Review</DropdownMenuItem>
                              )}
                              {record.status === 'reviewed' && (
                                <DropdownMenuItem onClick={() => handleApprove(record.id)}><PlayCircle className="h-3 w-3 mr-2" /> Approve</DropdownMenuItem>
                              )}
                              {!['paid', 'cancelled'].includes(record.status) && (
                                <DropdownMenuItem onClick={() => { setHoldRecord(record); setHoldOpen(true); }}>
                                  <PauseCircle className="h-3 w-3 mr-2" /> Put on Hold
                                </DropdownMenuItem>
                              )}
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

        {/* ── APPROVALS TAB ── */}
        <TabsContent value="approvals" className="mt-4 space-y-4">
          {pendingApproval.length === 0 ? (
            <GlassCard className="p-12">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 opacity-30" />
                <p className="text-sm">All payroll records are processed</p>
                <p className="text-xs text-muted-foreground/60">No pending approvals at this time</p>
              </div>
            </GlassCard>
          ) : (
            <>
              {/* Bulk Approve Bar */}
              <GlassCard className="p-3 border-amber-500/20 bg-amber-500/5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-medium">{pendingApproval.length} records pending approval</span>
                  </div>
                  <Button size="sm" className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500" disabled={actionLoading}
                    onClick={async () => {
                      setActionLoading(true);
                      try {
                        const draftIds = draftRecords.map(p => p.id);
                        if (draftIds.length > 0) { await bulkPayrollAction(draftIds, 'reviewed'); }
                        const reviewedIds = reviewedRecords.map(p => p.id);
                        if (reviewedIds.length > 0) { await bulkPayrollAction(reviewedIds, 'approved'); }
                        toast.success('All pending records approved');
                      } catch { toast.error('Bulk approve failed'); }
                      finally { setActionLoading(false); }
                    }}>
                    {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Bulk Approve All
                  </Button>
                </div>
              </GlassCard>

              {/* Draft Records */}
              {draftRecords.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Badge className="bg-slate-500/15 text-slate-400 border-slate-500/25 text-[10px]">Draft</Badge>
                    {draftRecords.length} records need review
                  </h3>
                  <div className="space-y-2">
                    {draftRecords.map((record, i) => (
                      <motion.div key={record.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                        <GlassCard hover className="p-4" onClick={() => openDetail(record)}>
                          <div className="flex items-center gap-4">
                            <div className={cn('h-10 w-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-xs shrink-0', getAvatarColor(record.userName || ''))}>
                              {getInitials(record.userName || '')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">{record.userName || 'Unknown'}</span>
                                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border', statusConfig.draft?.bg, statusConfig.draft?.color)}>Draft</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{record.userPosition || ''} &middot; {record.month}</p>
                            </div>
                            <div className="hidden sm:flex items-center gap-6 shrink-0">
                              <div className="text-right"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Gross</p><p className="text-sm font-medium">{formatCurrency(record.grossSalary)}</p></div>
                              <div className="text-right"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Deductions</p><p className="text-sm font-medium text-rose-400">{formatCurrency(record.deductions)}</p></div>
                              <div className="text-right"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Net</p><p className="text-sm font-bold text-emerald-400">{formatCurrency(record.netSalary)}</p></div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                              <Button size="sm" className="h-7 text-[10px] gap-1 bg-cyan-600 hover:bg-cyan-500" onClick={() => handleReview(record.id)} disabled={actionLoading}>
                                <Eye className="h-3 w-3" /> Review
                              </Button>
                              <Button size="sm" className="h-7 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-500" onClick={() => handleApprove(record.id)} disabled={actionLoading}>
                                <CheckCircle2 className="h-3 w-3" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 border-orange-500/30 text-orange-400" onClick={() => { setHoldRecord(record); setHoldOpen(true); }}>
                                <PauseCircle className="h-3 w-3" /> Hold
                              </Button>
                            </div>
                          </div>
                        </GlassCard>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviewed Records (need approval) */}
              {reviewedRecords.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Badge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/25 text-[10px]">Reviewed</Badge>
                    {reviewedRecords.length} records need approval
                  </h3>
                  <div className="space-y-2">
                    {reviewedRecords.map((record, i) => (
                      <motion.div key={record.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                        <GlassCard hover className="p-4" onClick={() => openDetail(record)}>
                          <div className="flex items-center gap-4">
                            <div className={cn('h-10 w-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-xs shrink-0', getAvatarColor(record.userName || ''))}>
                              {getInitials(record.userName || '')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">{record.userName || 'Unknown'}</span>
                                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border', statusConfig.reviewed?.bg, statusConfig.reviewed?.color)}>Reviewed</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{record.userPosition || ''} &middot; {record.month}</p>
                            </div>
                            <div className="hidden sm:flex items-center gap-6 shrink-0">
                              <div className="text-right"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Net</p><p className="text-sm font-bold text-emerald-400">{formatCurrency(record.netSalary)}</p></div>
                              <div className="text-right"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Reviewed</p><p className="text-[10px] text-muted-foreground">{record.reviewerName || 'System'}</p></div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                              <Button size="sm" className="h-7 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-500" onClick={() => handleApprove(record.id)} disabled={actionLoading}>
                                <CheckCircle2 className="h-3 w-3" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 border-orange-500/30 text-orange-400" onClick={() => { setHoldRecord(record); setHoldOpen(true); }}>
                                <PauseCircle className="h-3 w-3" /> Hold
                              </Button>
                            </div>
                          </div>
                        </GlassCard>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ── REPORTS TAB ── */}
        <TabsContent value="reports" className="mt-4 space-y-4">
          {/* Summary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GlassCard className="p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Disbursed</p>
              <p className="text-lg font-bold text-emerald-400">{formatCurrency(computedMetrics.totalPaid)}</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Pending</p>
              <p className="text-lg font-bold text-amber-400">{formatCurrency(computedMetrics.pendingAmount)}</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Tax</p>
              <p className="text-lg font-bold text-violet-400">{formatCurrency(computedMetrics.totalTax)}</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">On Hold</p>
              <p className="text-lg font-bold text-orange-400">{computedMetrics.onHoldCount}</p>
            </GlassCard>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Monthly Payroll Trend */}
            <GlassCard className="p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Monthly Payroll Trend</h4>
              {monthlyTrend.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">No data</div>
              ) : (
                <div className="h-40 flex items-end gap-3">
                  {monthlyTrend.map((m, i) => (
                    <div key={m?.month || i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[9px] font-medium text-emerald-400">{formatCurrency(m?.total ?? 0)}</span>
                      <div className="w-full flex flex-col justify-end" style={{ height: '120px' }}>
                        <motion.div className="w-full bg-gradient-to-t from-emerald-500/50 to-emerald-400/20 rounded-t min-h-[2px]"
                          initial={{ height: 0 }} animate={{ height: `${((m?.total ?? 0) / maxTrendVal) * 100}%` }}
                          transition={{ delay: i * 0.1, duration: 0.5 }} />
                      </div>
                      <span className="text-[9px] text-muted-foreground">{(m?.month || '').slice(5)}</span>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Salary Distribution */}
            <GlassCard className="p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Department Salary Distribution</h4>
              <SalaryDonut data={donutData} />
            </GlassCard>

            {/* Deduction Breakdown */}
            <GlassCard className="p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Deduction Analysis</h4>
              <SalaryDonut data={deductionBreakdown} />
            </GlassCard>

            {/* Overtime Analysis */}
            <GlassCard className="p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Overtime Analysis</h4>
              {(() => {
                const otByMonth: Record<string, number> = {};
                deptPayroll.forEach(p => {
                  if (!otByMonth[p.month]) otByMonth[p.month] = 0;
                  otByMonth[p.month] += p.overtime ?? 0;
                });
                const otData = Object.entries(otByMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
                const maxOt = Math.max(...otData.map(([, v]) => v), 1);
                return otData.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">No overtime data</div>
                ) : (
                  <div className="space-y-2">
                    {otData.map(([month, value], i) => (
                      <div key={month} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{month}</span>
                          <span className="font-medium text-orange-400">{formatCurrency(value)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-black/[0.03] dark:bg-white/[0.05] overflow-hidden">
                          <motion.div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500"
                            initial={{ width: 0 }} animate={{ width: `${(value / maxOt) * 100}%` }}
                            transition={{ duration: 0.6, delay: i * 0.05 }} />
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06] text-xs flex justify-between">
                      <span className="text-muted-foreground">Total OT</span>
                      <span className="font-semibold text-orange-400">{formatCurrency(computedMetrics.totalOvertime)}</span>
                    </div>
                  </div>
                );
              })()}
            </GlassCard>
          </div>

          {/* Team Salary Comparison */}
          <GlassCard className="p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Team Salary Comparison (Current Month)</h4>
            {(() => {
              const currentRecords = deptPayroll.filter(p => p.month === currentMonth);
              if (currentRecords.length === 0) return <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">No data for current month</div>;
              const maxSalary = Math.max(...currentRecords.map(p => p.netSalary ?? 0), 1);
              return (
                <ScrollArea className="max-h-64">
                  <div className="space-y-2 pr-2">
                    {currentRecords.sort((a, b) => (b.netSalary ?? 0) - (a.netSalary ?? 0)).map((p, i) => (
                      <div key={p.id} className="flex items-center gap-3 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] rounded-lg p-1.5 transition-colors" onClick={() => openDetail(p)}>
                        <div className={cn('h-7 w-7 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-[9px] shrink-0', getAvatarColor(p.userName || ''))}>
                          {getInitials(p.userName || '')}
                        </div>
                        <span className="text-xs text-muted-foreground w-24 truncate shrink-0">{p.userName || 'Unknown'}</span>
                        <div className="flex-1 h-5 bg-black/[0.02] dark:bg-white/[0.04] rounded overflow-hidden relative">
                          <motion.div className="h-full rounded bg-gradient-to-r from-emerald-500/40 to-cyan-400/20"
                            initial={{ width: 0 }} animate={{ width: `${Math.max(((p.netSalary ?? 0) / maxSalary) * 100, 3)}%` }}
                            transition={{ delay: i * 0.04 + 0.2, duration: 0.5 }} />
                          <span className="absolute inset-y-0 right-2 flex items-center text-[10px] font-medium text-muted-foreground">{formatCurrency(p.netSalary)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              );
            })()}
          </GlassCard>
        </TabsContent>

        {/* ── SETTINGS TAB ── */}
        <TabsContent value="settings" className="mt-4 space-y-4">
          <GlassCard className="p-6">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Settings className="h-4 w-4 text-muted-foreground" /> Department Payroll Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Department Info */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Department Info</h4>
                <div className="space-y-3">
                  {[
                    { icon: Building2, label: 'Department', value: deptName },
                    { icon: Users, label: 'Team Size', value: String(deptPayroll.length || 0) },
                    { icon: DollarSign, label: 'Monthly Payroll', value: formatCurrency(computedMetrics.totalPayroll) },
                    { icon: TrendingUp, label: 'Avg Salary', value: formatCurrency(computedMetrics.avgSalary) },
                    { icon: Shield, label: 'Manager', value: user?.name || 'N/A' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] p-3">
                      <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0"><p className="text-[10px] text-muted-foreground">{item.label}</p><p className="text-sm font-medium">{item.value}</p></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payroll Policies */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payroll Policies</h4>
                <div className="space-y-3">
                  {[
                    { label: 'Payment Method', value: 'Bank Transfer (Default)', desc: 'Default payment method for team' },
                    { label: 'Overtime Rate', value: '1.5x Regular Rate', desc: 'Standard overtime multiplier' },
                    { label: 'Tax Withholding', value: 'Progressive', desc: 'Based on salary brackets' },
                    { label: 'Provident Fund', value: '12% Employer + 12% Employee', desc: 'Standard PF contribution' },
                    { label: 'Pay Cycle', value: 'Monthly', desc: 'Pay processed once per month' },
                  ].map(item => (
                    <div key={item.label} className="rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium">{item.label}</p>
                        <p className="text-xs text-emerald-400">{item.value}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Export Options */}
          <GlassCard className="p-6">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Download className="h-4 w-4 text-muted-foreground" /> Export Options</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-black/[0.1] dark:border-white/[0.1] hover:border-emerald-500/30 hover:bg-emerald-500/5" onClick={exportCSV} disabled={filtered.length === 0}>
                <FileSpreadsheet className="h-6 w-6 text-emerald-400" />
                <span className="text-xs font-medium">Export CSV</span>
                <span className="text-[10px] text-muted-foreground">{filtered.length} records</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-black/[0.1] dark:border-white/[0.1] hover:border-cyan-500/30 hover:bg-cyan-500/5" onClick={() => toast.info('PDF export coming soon')}>
                <FileText className="h-6 w-6 text-cyan-400" />
                <span className="text-xs font-medium">Export PDF</span>
                <span className="text-[10px] text-muted-foreground">Payroll summary</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-black/[0.1] dark:border-white/[0.1] hover:border-amber-500/30 hover:bg-amber-500/5" onClick={() => toast.info('Payslip export coming soon')}>
                <Receipt className="h-6 w-6 text-amber-400" />
                <span className="text-xs font-medium">Generate Payslips</span>
                <span className="text-[10px] text-muted-foreground">Current month</span>
              </Button>
            </div>
          </GlassCard>
        </TabsContent>
      </Tabs>

      {/* ═══ PAYROLL DETAIL SHEET ═══ */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col overflow-hidden">
          {selectedRecord && (
            <>
              {/* Sheet Header */}
              <div className="p-6 pb-4 border-b border-black/[0.1] dark:border-white/[0.1] shrink-0">
                <SheetHeader>
                  <div className="flex items-center gap-4">
                    <div className={cn('h-14 w-14 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-lg', getAvatarColor(selectedRecord.userName || ''))}>
                      {getInitials(selectedRecord.userName || '')}
                    </div>
                    <div className="min-w-0">
                      <SheetTitle className="text-lg">{selectedRecord.userName || 'Unknown Employee'}</SheetTitle>
                      <SheetDescription className="text-sm mt-0.5">
                        {selectedRecord.userPosition || ''} {selectedRecord.userDepartment ? `· ${selectedRecord.userDepartment}` : ''}
                      </SheetDescription>
                    </div>
                  </div>
                </SheetHeader>
                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1] p-2.5 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Gross</p>
                    <p className="text-sm font-bold">{formatCurrency(selectedRecord.grossSalary)}</p>
                  </div>
                  <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5 text-center">
                    <p className="text-[10px] text-rose-400/80 uppercase tracking-wider">Deductions</p>
                    <p className="text-sm font-bold text-rose-400">{formatCurrency(selectedRecord.deductions)}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-center">
                    <p className="text-[10px] text-emerald-400/80 uppercase tracking-wider">Net Pay</p>
                    <p className="text-sm font-bold text-emerald-400">{formatCurrency(selectedRecord.netSalary)}</p>
                  </div>
                </div>
              </div>

              {/* Sheet Content */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-6 space-y-5 pb-8">
                  {/* Status & Month */}
                  <div className="flex flex-wrap gap-2">
                    {(() => { const s = statusConfig[selectedRecord.status]; return s ? <Badge variant="outline" className={cn('text-xs px-2 py-0.5 border', s.bg, s.color)}>{s.label}</Badge> : <StatusBadge status={selectedRecord.status} />; })()}
                    <Badge variant="outline" className="bg-black/[0.03] dark:bg-white/[0.05]">{selectedRecord.month}</Badge>
                    <Badge variant="outline" className="bg-black/[0.03] dark:bg-white/[0.05]">{paymentMethodLabel[selectedRecord.paymentMethod] || selectedRecord.paymentMethod}</Badge>
                  </div>

                  {/* Salary Breakdown */}
                  <GlassCard className="p-4" glow="emerald">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Calculator className="h-4 w-4 text-emerald-400" /> Salary Breakdown</h3>
                    <div className="space-y-2">
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Earnings</p>
                        {[
                          { label: 'Base Salary', value: selectedRecord.baseSalary ?? 0 },
                          { label: 'Overtime', value: selectedRecord.overtime ?? 0 },
                          { label: 'Allowances', value: selectedRecord.allowances ?? 0 },
                          { label: 'Bonus', value: selectedRecord.bonus ?? 0 },
                        ].map(row => (
                          <div key={row.label} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{row.label}</span>
                            <span className="font-medium">{formatCurrency(row.value)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm font-semibold border-t border-black/[0.1] dark:border-white/[0.1] pt-1.5">
                          <span>Gross Salary</span><span className="text-emerald-400">{formatCurrency(selectedRecord.grossSalary)}</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Deductions</p>
                        {[
                          { label: 'Tax', value: selectedRecord.tax ?? 0 },
                          { label: 'Insurance', value: selectedRecord.insurance ?? 0 },
                          { label: 'Provident Fund', value: selectedRecord.providentFund ?? 0 },
                          { label: 'Other Deductions', value: selectedRecord.otherDeductions ?? 0 },
                        ].map(row => (
                          <div key={row.label} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{row.label}</span>
                            <span className="font-medium text-rose-400">-{formatCurrency(row.value)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm font-semibold border-t border-black/[0.1] dark:border-white/[0.1] pt-1.5">
                          <span>Total Deductions</span><span className="text-rose-400">{formatCurrency(selectedRecord.deductions)}</span>
                        </div>
                      </div>
                      <Separator className="bg-black/[0.06] dark:bg-white/[0.1]" />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Net Salary</span><span className="text-emerald-400">{formatCurrency(selectedRecord.netSalary)}</span>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Visual Salary Components Bar */}
                  <GlassCard className="p-4">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-cyan-400" /> Salary Components</h3>
                    {(() => {
                      const total = selectedRecord.grossSalary || 1;
                      const components = [
                        { label: 'Base', value: selectedRecord.baseSalary ?? 0, color: 'bg-emerald-500' },
                        { label: 'OT', value: selectedRecord.overtime ?? 0, color: 'bg-orange-500' },
                        { label: 'Allow.', value: selectedRecord.allowances ?? 0, color: 'bg-cyan-500' },
                        { label: 'Bonus', value: selectedRecord.bonus ?? 0, color: 'bg-amber-500' },
                      ];
                      return (
                        <div className="space-y-3">
                          <div className="h-4 rounded-full bg-black/[0.03] dark:bg-white/[0.05] overflow-hidden flex">
                            {components.map((c, i) => (
                              <motion.div key={c.label} className={cn('h-full', c.color)}
                                initial={{ width: 0 }} animate={{ width: `${(c.value / total) * 100}%` }}
                                transition={{ duration: 0.6, delay: i * 0.1 }} />
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {components.map(c => (
                              <div key={c.label} className="flex items-center gap-1.5 text-xs">
                                <div className={cn('h-2.5 w-2.5 rounded-full', c.color)} />
                                <span className="text-muted-foreground">{c.label}</span>
                                <span className="font-medium">{((c.value / total) * 100).toFixed(0)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </GlassCard>

                  {/* Review & Approval Info */}
                  {(selectedRecord.reviewerName || selectedRecord.approverName) && (
                    <GlassCard className="p-4">
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Shield className="h-4 w-4 text-amber-400" /> Review & Approval</h3>
                      <div className="space-y-2">
                        {selectedRecord.reviewerName && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Reviewed by</span>
                            <span className="font-medium">{selectedRecord.reviewerName}</span>
                          </div>
                        )}
                        {selectedRecord.reviewedAt && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Reviewed at</span>
                            <span className="font-medium">{new Date(selectedRecord.reviewedAt).toLocaleString()}</span>
                          </div>
                        )}
                        {selectedRecord.approverName && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Approved by</span>
                            <span className="font-medium">{selectedRecord.approverName}</span>
                          </div>
                        )}
                        {selectedRecord.approvedAt && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Approved at</span>
                            <span className="font-medium">{new Date(selectedRecord.approvedAt).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </GlassCard>
                  )}

                  {/* Payment History */}
                  {selectedRecordHistory.length > 0 && (
                    <GlassCard className="p-4">
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Receipt className="h-4 w-4 text-cyan-400" /> Payment History</h3>
                      <div className="space-y-2">
                        {selectedRecordHistory.map(h => {
                          const hs = statusConfig[h.status];
                          return (
                            <div key={h.id} className="flex items-center justify-between py-1.5 border-b border-black/[0.04] dark:border-white/[0.04] last:border-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-muted-foreground">{h.month}</span>
                                {hs && <Badge variant="outline" className={cn('text-[9px] px-1 py-0 border', hs.bg, hs.color)}>{hs.label}</Badge>}
                              </div>
                              <span className="text-xs font-semibold text-emerald-400">{formatCurrency(h.netSalary)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </GlassCard>
                  )}

                  {/* Notes */}
                  {selectedRecord.notes && (
                    <GlassCard className="p-4">
                      <h3 className="text-sm font-semibold mb-2">Notes</h3>
                      <p className="text-sm text-muted-foreground">{selectedRecord.notes}</p>
                    </GlassCard>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 pt-2">
                    {selectedRecord.status === 'draft' && (
                      <>
                        <Button className="gap-1.5 bg-cyan-600 hover:bg-cyan-500" onClick={() => handleReview(selectedRecord.id)} disabled={actionLoading}>
                          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} Review
                        </Button>
                        <Button className="gap-1.5 bg-emerald-600 hover:bg-emerald-500" onClick={() => handleApprove(selectedRecord.id)} disabled={actionLoading}>
                          <CheckCircle2 className="h-4 w-4" /> Approve
                        </Button>
                      </>
                    )}
                    {selectedRecord.status === 'reviewed' && (
                      <Button className="gap-1.5 bg-emerald-600 hover:bg-emerald-500" onClick={() => handleApprove(selectedRecord.id)} disabled={actionLoading}>
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Approve
                      </Button>
                    )}
                    {!['paid', 'cancelled'].includes(selectedRecord.status) && (
                      <Button variant="outline" className="gap-1.5 border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                        onClick={() => { setHoldRecord(selectedRecord); setHoldOpen(true); }}>
                        <PauseCircle className="h-4 w-4" /> Put on Hold
                      </Button>
                    )}
                    <Button variant="outline" className="gap-1.5" onClick={() => openEdit(selectedRecord)}>
                      <Edit className="h-4 w-4" /> Edit
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ═══ HOLD DIALOG ═══ */}
      <Dialog open={holdOpen} onOpenChange={setHoldOpen}>
        <DialogContent className="max-w-md bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><PauseCircle className="h-5 w-5 text-orange-400" /> Put Payroll on Hold</DialogTitle>
            <DialogDescription>Place payroll for {holdRecord?.userName || 'employee'} on hold.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs">Reason for hold</Label>
              <Textarea placeholder="Enter reason for putting on hold..." value={holdReason}
                onChange={e => setHoldReason(e.target.value)} className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] min-h-[80px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setHoldOpen(false)}>Cancel</Button>
            <Button className="bg-orange-600 hover:bg-orange-500" onClick={handleHold} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PauseCircle className="h-4 w-4 mr-2" />} Put on Hold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ EDIT DIALOG ═══ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Edit className="h-5 w-5 text-cyan-400" /> Edit Payroll Record</DialogTitle>
            <DialogDescription>Update payroll details for {editRecord?.userName || 'employee'}</DialogDescription>
          </DialogHeader>
          {editRecord && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Bonus</Label>
                  <Input type="number" value={editForm.bonus} onChange={e => setEditForm(f => ({ ...f, bonus: e.target.value }))}
                    className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-9" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Overtime</Label>
                  <Input type="number" value={editForm.overtime} onChange={e => setEditForm(f => ({ ...f, overtime: e.target.value }))}
                    className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-9" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Other Deductions</Label>
                  <Input type="number" value={editForm.otherDeductions} onChange={e => setEditForm(f => ({ ...f, otherDeductions: e.target.value }))}
                    className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-9" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Base Salary (read-only)</Label>
                  <Input value={formatCurrency(editRecord.baseSalary ?? 0)} disabled className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Notes</Label>
                <Textarea placeholder="Add notes..." value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] min-h-[60px]" />
              </div>
              {/* Preview */}
              {(() => {
                const bonus = parseFloat(editForm.bonus) || 0;
                const overtime = parseFloat(editForm.overtime) || 0;
                const otherDed = parseFloat(editForm.otherDeductions) || 0;
                const gross = (editRecord.baseSalary ?? 0) + overtime + (editRecord.allowances ?? 0) + bonus;
                const ded = (editRecord.tax ?? 0) + (editRecord.insurance ?? 0) + (editRecord.providentFund ?? 0) + otherDed;
                const net = gross - ded;
                return (
                  <GlassCard className="p-3 bg-black/[0.01] dark:bg-white/[0.02]">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Preview</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div><p className="text-[10px] text-muted-foreground">Gross</p><p className="text-sm font-bold">{formatCurrency(gross)}</p></div>
                      <div><p className="text-[10px] text-muted-foreground">Deductions</p><p className="text-sm font-bold text-rose-400">{formatCurrency(ded)}</p></div>
                      <div><p className="text-[10px] text-muted-foreground">Net</p><p className="text-sm font-bold text-emerald-400">{formatCurrency(net)}</p></div>
                    </div>
                  </GlassCard>
                );
              })()}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-500" onClick={handleEditSave} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />} Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
