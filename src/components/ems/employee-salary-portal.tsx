'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEMSStore } from '@/lib/store';
import type { PayrollRecord, InvestmentDeclaration, TaxSimulationResult, TaxOptimizationTip, MarketBenchmark } from '@/lib/types';
import { GlassCard } from './glass-card';
import { StatCard } from './stat-card';
import { StatusBadge } from './status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  DollarSign, TrendingUp, Clock, CheckCircle2, CreditCard, Wallet,
  Receipt, Download, Eye, ArrowUpRight, ArrowDownRight, Building2,
  Calendar, FileText, Banknote, PieChart, BarChart3, ChevronDown,
  ChevronUp, Info, Shield, BadgeDollarSign, Calculator, PiggyBank,
  Landmark, Percent, Zap, Lightbulb, Target, Upload, Plus, Trash2,
  X, FileCheck, FileX, AlertTriangle, Globe, Users, ArrowRight,
  HandCoins, Baby, HeartHandshake, Heart, Sparkles,
} from 'lucide-react';
import { formatCurrency, SalaryDonutChart } from './shared';

/* ────────────── Helpers ────────────── */

const statusColorMap: Record<string, string> = {
  paid: 'emerald',
  approved: 'cyan',
  reviewed: 'cyan',
  draft: 'amber',
  'on-hold': 'rose',
  cancelled: 'slate',
};

const statusGlowMap: Record<string, 'emerald' | 'cyan' | 'amber' | 'rose' | 'slate'> = {
  paid: 'emerald',
  approved: 'cyan',
  reviewed: 'cyan',
  draft: 'amber',
  'on-hold': 'rose',
  cancelled: 'slate',
};

const paymentMethodLabel: Record<string, string> = {
  'bank-transfer': 'Bank Transfer',
  cash: 'Cash',
  check: 'Check',
  'digital-wallet': 'Digital Wallet',
};

const paymentMethodIcon: Record<string, typeof CreditCard> = {
  'bank-transfer': Landmark,
  cash: Banknote,
  check: Receipt,
  'digital-wallet': Wallet,
};

const investmentCategoryLabels: Record<string, string> = {
  '401k': '401(k) Retirement',
  hsa: 'Health Savings (HSA)',
  insurance: 'Life Insurance',
  education: 'Education (529)',
  'home-loan': 'Home Loan Interest',
  charity: 'Charitable Donations',
  nps: 'National Pension (NPS)',
  other: 'Other Deductions',
};

const investmentCategoryColors: Record<string, string> = {
  '401k': '#10b981',
  hsa: '#06b6d4',
  insurance: '#8b5cf6',
  education: '#f59e0b',
  'home-loan': '#ec4899',
  charity: '#f43f5e',
  nps: '#14b8a6',
  other: '#6b7280',
};

const tipIconMap: Record<string, typeof PiggyBank> = {
  PiggyBank, Heart, Landmark, HeartHandshake, Shield, Baby,
};

const stagger = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.35, ease: 'easeOut' },
  }),
};

function monthLabel(month: string): string {
  if (!month) return 'N/A';
  const [y, m] = month.split('-');
  if (!y || !m) return month;
  const date = new Date(parseInt(y), parseInt(m) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function monthSort(month: string): number {
  if (!month) return 0;
  const [y, m] = month.split('-');
  return parseInt(y || '0') * 12 + parseInt(m || '0');
}

function getCurrentFiscalYear(): string {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${(year + 1).toString().slice(-2)}`;
}

/* ────────────── Progress Bar ────────────── */

function DeductionBar({ label, amount, total, color }: { label: string; amount: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min((amount / total) * 100, 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{formatCurrency(amount)} <span className="text-xs text-muted-foreground">({pct.toFixed(1)}%)</span></span>
      </div>
      <div className="h-2 rounded-full bg-black/[0.03] dark:bg-white/[0.05] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

/* ────────────── Salary Comparison Bar ────────────── */

function SalaryComparisonBar({ benchmark }: { benchmark: MarketBenchmark }) {
  const maxVal = benchmark.p90 * 1.2 || 1;
  const salaryPct = Math.min((benchmark.yourSalary / maxVal) * 100, 100);
  const p25Pct = (benchmark.p25 / maxVal) * 100;
  const p50Pct = (benchmark.p50 / maxVal) * 100;
  const p75Pct = (benchmark.p75 / maxVal) * 100;
  const p90Pct = (benchmark.p90 / maxVal) * 100;

  return (
    <div className="space-y-3">
      <div className="relative h-12 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] overflow-hidden">
        {/* Range bars */}
        <div className="absolute inset-y-0 left-0 rounded-lg" style={{ width: `${p90Pct}%`, background: 'linear-gradient(to right, rgba(16,185,129,0.1), rgba(16,185,129,0.25))' }} />
        <div className="absolute inset-y-0 left-0 rounded-lg" style={{ width: `${p75Pct}%`, background: 'linear-gradient(to right, rgba(16,185,129,0.15), rgba(16,185,129,0.35))' }} />
        <div className="absolute inset-y-0 left-0 rounded-lg" style={{ width: `${p50Pct}%`, background: 'linear-gradient(to right, rgba(16,185,129,0.2), rgba(16,185,129,0.45))' }} />

        {/* Percentile markers */}
        {[p25Pct, p50Pct, p75Pct, p90Pct].map((p, i) => (
          <div key={i} className="absolute inset-y-0 w-px bg-black/[0.15] dark:bg-white/[0.3]" style={{ left: `${p}%` }}>
            <span className="absolute -top-5 text-[9px] text-muted-foreground -translate-x-1/2">
              P{[25, 50, 75, 90][i]}
            </span>
          </div>
        ))}

        {/* Your salary marker */}
        <motion.div
          initial={{ left: 0 }}
          animate={{ left: `${salaryPct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="absolute inset-y-1 w-0.5 bg-emerald-400 rounded-full shadow-lg shadow-emerald-400/50"
          style={{ boxShadow: '0 0 8px rgba(16,185,129,0.5)' }}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{formatCurrency(benchmark.p10)}</span>
        <span className="font-medium text-emerald-400">You: {formatCurrency(benchmark.yourSalary)} (P{benchmark.percentile})</span>
        <span className="text-muted-foreground">{formatCurrency(benchmark.p90)}</span>
      </div>
    </div>
  );
}

/* ────────────── Main Component ────────────── */

export function EmployeeSalaryPortal() {
  const { user, payroll, salaryStructures } = useEMSStore();
  const myPayroll = useMemo(() => payroll.filter(p => p.userId === user?.id), [payroll, user?.id]);
  const myStructure = useMemo(() => salaryStructures.find(s => s.userId === user?.id), [salaryStructures, user?.id]);

  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [payslipDialogOpen, setPayslipDialogOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Tax Simulator State
  const [raiseAmount, setRaiseAmount] = useState('');
  const [raiseType, setRaiseType] = useState<'flat' | 'percent'>('flat');
  const [additional401k, setAdditional401k] = useState('');
  const [additionalHSA, setAdditionalHSA] = useState('');
  const [simResult, setSimResult] = useState<TaxSimulationResult | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Optimization Tips State
  const [tips, setTips] = useState<TaxOptimizationTip[]>([]);
  const [loadingTips, setLoadingTips] = useState(false);

  // Investment Declaration State
  const [investments, setInvestments] = useState<InvestmentDeclaration[]>([]);
  const [loadingInvestments, setLoadingInvestments] = useState(false);
  const [investmentDialogOpen, setInvestmentDialogOpen] = useState(false);
  const [newInvestment, setNewInvestment] = useState({ category: '401k', description: '', amount: '' });
  const [proofFile, setProofFile] = useState<File | null>(null);

  // Market Benchmark State
  const [benchmark, setBenchmark] = useState<MarketBenchmark | null>(null);
  const [loadingBenchmark, setLoadingBenchmark] = useState(false);

  const sorted = useMemo(() => [...myPayroll].sort((a, b) => monthSort(b.month) - monthSort(a.month)), [myPayroll]);

  const currentRecord = sorted[0] || null;
  const previousRecord = sorted[1] || null;

  /* Computed stats */
  const stats = useMemo(() => {
    const paidCount = myPayroll.filter(p => p.status === 'paid').length;
    const pendingCount = myPayroll.filter(p => p.status === 'draft' || p.status === 'reviewed' || p.status === 'approved').length;
    const totalEarnings = myPayroll.reduce((s, p) => s + p.grossSalary, 0);
    const totalDeductions = myPayroll.reduce((s, p) => s + p.deductions, 0);
    const totalNet = myPayroll.reduce((s, p) => s + p.netSalary, 0);
    return { paidCount, pendingCount, totalEarnings, totalDeductions, totalNet };
  }, [myPayroll]);

  /* YTD computation */
  const ytd = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    const yearRecords = myPayroll.filter(p => p.month.startsWith(currentYear));
    const ytdEarnings = yearRecords.reduce((s, p) => s + p.grossSalary, 0);
    const ytdDeductions = yearRecords.reduce((s, p) => s + p.deductions, 0);
    const ytdNet = yearRecords.reduce((s, p) => s + p.netSalary, 0);
    const monthCount = yearRecords.length || 1;
    const avgSalary = ytdNet / monthCount;
    const ytdOvertime = yearRecords.reduce((s, p) => s + p.overtime, 0);
    return { ytdEarnings, ytdDeductions, ytdNet, avgSalary, monthCount, ytdOvertime };
  }, [myPayroll]);

  /* Comparison to last month */
  const monthlyComparison = useMemo(() => {
    if (!currentRecord || !previousRecord) return null;
    const diff = currentRecord.netSalary - previousRecord.netSalary;
    const pctChange = previousRecord.netSalary > 0 ? (diff / previousRecord.netSalary) * 100 : 0;
    return { diff, pctChange };
  }, [currentRecord, previousRecord]);

  /* Available months for filter */
  const availableMonths = useMemo(() => {
    const months = [...new Set(sorted.map(p => p.month))];
    return months.sort((a, b) => monthSort(b) - monthSort(a));
  }, [sorted]);

  /* Filtered records for table */
  const filtered = useMemo(() => {
    let records = sorted;
    if (statusFilter !== 'all') records = records.filter(p => p.status === statusFilter);
    if (monthFilter !== 'all') records = records.filter(p => p.month === monthFilter);
    return records;
  }, [sorted, statusFilter, monthFilter]);

  /* Total declared investments */
  const totalDeclared = useMemo(() => investments.reduce((s, i) => s + i.amount, 0), [investments]);
  const totalApprovedDeclared = useMemo(() => investments.filter(i => i.status === 'approved').reduce((s, i) => s + i.amount, 0), [investments]);

  /* ── Load tax data on tab change ── */
  const loadOptimizationTips = useCallback(async () => {
    setLoadingTips(true);
    try {
      const res = await fetch('/api/tax-simulator?action=optimization-tips');
      const data = await res.json();
      if (data.status === 'success') setTips(data.data);
    } catch (err) {
      console.error('Failed to load tips:', err);
    } finally {
      setLoadingTips(false);
    }
  }, []);

  const loadInvestments = useCallback(async () => {
    setLoadingInvestments(true);
    try {
      const fy = getCurrentFiscalYear();
      const res = await fetch(`/api/tax-simulator?action=investments&fiscalYear=${fy}`);
      const data = await res.json();
      if (data.status === 'success') setInvestments(data.data);
    } catch (err) {
      console.error('Failed to load investments:', err);
    } finally {
      setLoadingInvestments(false);
    }
  }, []);

  const loadBenchmark = useCallback(async () => {
    setLoadingBenchmark(true);
    try {
      const res = await fetch('/api/tax-simulator?action=benchmarks');
      const data = await res.json();
      if (data.status === 'success') setBenchmark(data.data);
    } catch (err) {
      console.error('Failed to load benchmark:', err);
    } finally {
      setLoadingBenchmark(false);
    }
  }, []);

  /* ── Tax simulation ── */
  const runSimulation = useCallback(async () => {
    const raise = parseFloat(raiseAmount);
    if (isNaN(raise) || raise <= 0) {
      toast.error('Enter a valid raise amount');
      return;
    }
    setSimulating(true);
    try {
      const res = await fetch('/api/tax-simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'simulate',
          raiseAmount: raise,
          raiseType,
          additional401k: parseFloat(additional401k) || 0,
          additionalHSA: parseFloat(additionalHSA) || 0,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSimResult(data.data);
        toast.success('Tax simulation complete!');
      } else {
        toast.error(data.message || 'Simulation failed');
      }
    } catch (err) {
      toast.error('Simulation failed');
    } finally {
      setSimulating(false);
    }
  }, [raiseAmount, raiseType, additional401k, additionalHSA]);

  /* ── Submit investment declaration ── */
  const submitInvestment = useCallback(async () => {
    const amount = parseFloat(newInvestment.amount);
    if (!newInvestment.description || isNaN(amount) || amount <= 0) {
      toast.error('Fill in all required fields');
      return;
    }

    try {
      const res = await fetch('/api/tax-simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-investment',
          category: newInvestment.category,
          description: newInvestment.description,
          amount,
          fiscalYear: getCurrentFiscalYear(),
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success('Investment declaration submitted!');
        setInvestmentDialogOpen(false);
        setNewInvestment({ category: '401k', description: '', amount: '' });
        setProofFile(null);
        loadInvestments();
      } else {
        toast.error(data.message || 'Failed to submit');
      }
    } catch (err) {
      toast.error('Failed to submit investment');
    }
  }, [newInvestment, loadInvestments]);

  /* ── Delete investment declaration ── */
  const deleteInvestment = useCallback(async (id: string) => {
    try {
      const res = await fetch('/api/tax-simulator', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success('Investment declaration deleted');
        loadInvestments();
      } else {
        toast.error(data.message || 'Failed to delete');
      }
    } catch (err) {
      toast.error('Failed to delete');
    }
  }, [loadInvestments]);

  /* Toggle expanded row */
  const toggleRow = useCallback((id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  /* Open payslip detail dialog */
  const openPayslip = useCallback((record: PayrollRecord) => {
    setSelectedRecord(record);
    setPayslipDialogOpen(true);
  }, []);

  /* Download CSV for a single payslip */
  const downloadCSV = useCallback((record: PayrollRecord) => {
    const headers = ['Field', 'Amount'];
    const rows = [
      ['Month', record.month],
      ['Base Salary', record.baseSalary.toString()],
      ['Overtime', record.overtime.toString()],
      ['Allowances', record.allowances.toString()],
      ['Bonus', record.bonus.toString()],
      ['Gross Salary', record.grossSalary.toString()],
      ['Tax', record.tax.toString()],
      ['Insurance', record.insurance.toString()],
      ['Provident Fund', record.providentFund.toString()],
      ['Other Deductions', record.otherDeductions.toString()],
      ['Total Deductions', record.deductions.toString()],
      ['Net Salary', record.netSalary.toString()],
      ['Status', record.status],
      ['Payment Method', record.paymentMethod],
    ];
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payslip-${record.month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Payslip CSV downloaded');
  }, []);

  const firstName = user?.name?.split(' ')[0] || 'there';

  /* ────────────── Render ────────────── */
  return (
    <div className="space-y-6">
      {/* ── Salary Overview Header ── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <GlassCard className="p-6" glow={currentRecord ? statusGlowMap[currentRecord.status] || 'none' : 'none'}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">
                  Salary &amp; Tax Portal
                </h1>
                <span className="text-muted-foreground text-sm">
                  Welcome, <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent font-semibold">{firstName}</span>
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {currentRecord ? `${monthLabel(currentRecord.month)} Salary` : 'No salary records yet'}
              </p>
            </div>
            <div className="flex items-center gap-8 flex-wrap">
              <div className="text-center lg:text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  {currentRecord ? monthLabel(currentRecord.month) : 'Current Month'}
                </p>
                <p className="text-4xl font-bold tracking-tight text-emerald-400">
                  {currentRecord ? formatCurrency(currentRecord.netSalary) : '$0'}
                </p>
                {currentRecord && <StatusBadge status={currentRecord.status} />}
              </div>
              {monthlyComparison && (
                <div className="flex flex-col items-center gap-1">
                  <div className={`flex items-center gap-1 text-sm font-medium ${monthlyComparison.diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {monthlyComparison.diff >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    {Math.abs(monthlyComparison.pctChange).toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">vs last month</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-muted-foreground cursor-help">
                          {monthlyComparison.diff >= 0 ? '+' : ''}{formatCurrency(monthlyComparison.diff)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Change from {previousRecord ? monthLabel(previousRecord.month) : 'previous month'}: {monthlyComparison.diff >= 0 ? '+' : ''}{formatCurrency(monthlyComparison.diff)}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
              {currentRecord?.paidAt && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Paid {new Date(currentRecord.paidAt).toLocaleDateString()}</span>
                </div>
              )}
              {currentRecord && !currentRecord.paidAt && currentRecord.status !== 'cancelled' && (
                <div className="flex items-center gap-2 text-sm text-amber-400">
                  <Clock className="h-4 w-4" />
                  <span>Payment pending</span>
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ── Tabs: Overview | Tax Simulator | Investments | Market Compare ── */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1] p-1 h-auto gap-1">
          <TabsTrigger value="overview" className="text-xs data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 px-4 py-2">
            <Receipt className="h-3.5 w-3.5 mr-1.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="simulator" className="text-xs data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 px-4 py-2" onClick={loadOptimizationTips}>
            <Calculator className="h-3.5 w-3.5 mr-1.5" /> Tax Simulator
          </TabsTrigger>
          <TabsTrigger value="investments" className="text-xs data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 px-4 py-2" onClick={loadInvestments}>
            <PiggyBank className="h-3.5 w-3.5 mr-1.5" /> Investments
          </TabsTrigger>
          <TabsTrigger value="market" className="text-xs data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400 px-4 py-2" onClick={loadBenchmark}>
            <Globe className="h-3.5 w-3.5 mr-1.5" /> Market Compare
          </TabsTrigger>
        </TabsList>

        {/* ════════════ OVERVIEW TAB ════════════ */}
        <TabsContent value="overview" className="space-y-6">
          {/* Earnings Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Base Salary', value: currentRecord?.baseSalary ?? 0, icon: Banknote, color: 'emerald' as const, subtitle: 'Current month', trend: previousRecord && currentRecord ? { value: ((currentRecord.baseSalary - previousRecord.baseSalary) / (previousRecord.baseSalary || 1)) * 100, label: 'vs last month' } : undefined },
              { title: 'Overtime', value: currentRecord?.overtime ?? 0, icon: Clock, color: 'cyan' as const, subtitle: 'Extra hours earned', trend: previousRecord && currentRecord ? { value: previousRecord.overtime > 0 ? ((currentRecord.overtime - previousRecord.overtime) / previousRecord.overtime) * 100 : 0, label: 'vs last month' } : undefined },
              { title: 'Allowances', value: currentRecord?.allowances ?? 0, icon: BadgeDollarSign, color: 'amber' as const, subtitle: 'Additional benefits', trend: previousRecord && currentRecord ? { value: previousRecord.allowances > 0 ? ((currentRecord.allowances - previousRecord.allowances) / previousRecord.allowances) * 100 : 0, label: 'vs last month' } : undefined },
              { title: 'Bonuses', value: currentRecord?.bonus ?? 0, icon: TrendingUp, color: 'slate' as const, subtitle: 'Performance rewards', trend: previousRecord && currentRecord ? { value: previousRecord.bonus > 0 ? ((currentRecord.bonus - previousRecord.bonus) / previousRecord.bonus) * 100 : 0, label: 'vs last month' } : undefined },
            ].map((s, i) => (
              <motion.div key={s.title} custom={i} variants={stagger} initial="hidden" animate="visible">
                <StatCard
                  title={s.title}
                  value={formatCurrency(s.value)}
                  icon={s.icon}
                  color={s.color}
                  subtitle={s.subtitle}
                  hero
                  trend={s.trend}
                />
              </motion.div>
            ))}
          </div>

          {/* Salary Breakdown + Deductions + YTD */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <GlassCard className="p-6" hover glow="emerald">
                <div className="flex items-center gap-2 mb-4">
                  <PieChart className="h-5 w-5 text-emerald-400" />
                  <h3 className="font-semibold">Salary Breakdown</h3>
                </div>
                {currentRecord ? <SalaryDonutChart
                  segments={[
                    { label: 'Base Salary', value: currentRecord.baseSalary, color: '#10b981' },
                    { label: 'Overtime', value: currentRecord.overtime, color: '#06b6d4' },
                    { label: 'Allowances', value: currentRecord.allowances, color: '#f59e0b' },
                    { label: 'Bonus', value: currentRecord.bonus, color: '#8b5cf6' },
                    { label: 'Deductions', value: currentRecord.deductions, color: '#f43f5e' },
                  ]}
                  size={180}
                  strokeWidth={28}
                  centerLabel="Net Pay"
                  centerValue={formatCurrency(currentRecord.netSalary)}
                /> : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Receipt className="h-10 w-10 mb-2 opacity-40" />
                    <p className="text-sm">No salary data available</p>
                  </div>
                )}
              </GlassCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <GlassCard className="p-6" hover glow="rose">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="h-5 w-5 text-rose-400" />
                  <h3 className="font-semibold">Deductions Breakdown</h3>
                </div>
                {currentRecord ? (
                  <div className="space-y-4">
                    <DeductionBar label="Tax" amount={currentRecord.tax} total={currentRecord.grossSalary} color="#f43f5e" />
                    <DeductionBar label="Insurance" amount={currentRecord.insurance} total={currentRecord.grossSalary} color="#06b6d4" />
                    <DeductionBar label="Provident Fund" amount={currentRecord.providentFund} total={currentRecord.grossSalary} color="#f59e0b" />
                    {currentRecord.otherDeductions > 0 && <DeductionBar label="Other Deductions" amount={currentRecord.otherDeductions} total={currentRecord.grossSalary} color="#8b5cf6" />}
                    <Separator className="bg-black/[0.06] dark:bg-white/[0.1]" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Total Deductions</span>
                      <span className="font-bold text-rose-400">{formatCurrency(currentRecord.deductions)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Effective deduction rate</span>
                      <span>{currentRecord.grossSalary > 0 ? ((currentRecord.deductions / currentRecord.grossSalary) * 100).toFixed(1) : 0}% of gross</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Percent className="h-10 w-10 mb-2 opacity-40" />
                    <p className="text-sm">No deduction data</p>
                  </div>
                )}
              </GlassCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <GlassCard className="p-6" hover glow="cyan">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-5 w-5 text-cyan-400" />
                  <h3 className="font-semibold">Year-to-Date Summary</h3>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-emerald-500/10 p-3 space-y-1">
                      <p className="text-xs text-muted-foreground">YTD Earnings</p>
                      <p className="text-lg font-bold text-emerald-400">{formatCurrency(ytd.ytdEarnings)}</p>
                    </div>
                    <div className="rounded-lg bg-rose-500/10 p-3 space-y-1">
                      <p className="text-xs text-muted-foreground">YTD Deductions</p>
                      <p className="text-lg font-bold text-rose-400">{formatCurrency(ytd.ytdDeductions)}</p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-cyan-500/10 p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">YTD Net Pay</p>
                    <p className="text-xl font-bold text-cyan-400">{formatCurrency(ytd.ytdNet)}</p>
                  </div>
                  <Separator className="bg-black/[0.06] dark:bg-white/[0.1]" />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Monthly Average</span>
                      <span className="font-medium">{formatCurrency(ytd.avgSalary)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Months Processed</span>
                      <span className="font-medium">{ytd.monthCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Total Overtime</span>
                      <span className="font-medium text-cyan-400">{formatCurrency(ytd.ytdOvertime)}</span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* Payslip Timeline */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <GlassCard className="p-6" hover>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-cyan-400" />
                <h3 className="font-semibold">Payslip Timeline</h3>
                <Badge variant="outline" className="text-[10px] ml-2 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">{myPayroll.length} record{myPayroll.length !== 1 ? 's' : ''}</Badge>
              </div>
              {sorted.length > 0 ? (
                <ScrollArea className="w-full">
                  <div className="flex gap-3 pb-2" style={{ minWidth: sorted.length * 140 }}>
                    {sorted.map((p, i) => {
                      const glow = statusGlowMap[p.status] || 'slate';
                      const dotColor: Record<string, string> = { paid: 'bg-emerald-400', approved: 'bg-cyan-400', reviewed: 'bg-cyan-400', draft: 'bg-amber-400', 'on-hold': 'bg-rose-400', cancelled: 'bg-slate-400' };
                      return (
                        <motion.div key={p.id} custom={i} variants={stagger} initial="hidden" animate="visible" whileHover={{ scale: 1.04, y: -2 }} onClick={() => openPayslip(p)}
                          className="shrink-0 w-32 rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.03] p-3 cursor-pointer transition-colors hover:border-emerald-500/30">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${dotColor[p.status] || 'bg-slate-400'}`} />
                            <span className="text-xs font-medium truncate">{monthLabel(p.month)}</span>
                          </div>
                          <p className="text-sm font-bold">{formatCurrency(p.netSalary)}</p>
                          <StatusBadge status={p.status} className="mt-2 text-[9px]" />
                        </motion.div>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">No payslip records yet</p>
                </div>
              )}
            </GlassCard>
          </motion.div>

          {/* Payslip History Table */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <GlassCard className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-amber-400" />
                  <h3 className="font-semibold">Payslip History</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] h-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={monthFilter} onValueChange={setMonthFilter}>
                    <SelectTrigger className="w-[160px] h-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Month" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Months</SelectItem>
                      {availableMonths.filter(m => m).map(m => <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="border-black/[0.1] dark:border-white/[0.1] hover:bg-transparent">
                      <TableHead className="text-xs">Month</TableHead>
                      <TableHead className="text-xs text-right">Base</TableHead>
                      <TableHead className="text-xs text-right">OT</TableHead>
                      <TableHead className="text-xs text-right hidden sm:table-cell">Allowances</TableHead>
                      <TableHead className="text-xs text-right">Gross</TableHead>
                      <TableHead className="text-xs text-right hidden md:table-cell">Deductions</TableHead>
                      <TableHead className="text-xs text-right font-bold">Net</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2"><FileText className="h-8 w-8 opacity-30" /><p className="text-sm">No payslip records found</p></div>
                      </TableCell></TableRow>
                    ) : filtered.map((p, i) => (
                      <motion.tr key={p.id} custom={i} variants={stagger} initial="hidden" animate="visible" className="border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.01] dark:hover:bg-white/[0.02] transition-colors">
                        <td colSpan={9} className="p-0">
                          <div>
                            <div className="flex items-center gap-0">
                              <div className="flex-1 grid grid-cols-9 items-center gap-2 px-4 py-3 cursor-pointer" onClick={() => toggleRow(p.id)}>
                                <div className="col-span-1 text-sm font-medium">{monthLabel(p.month)}</div>
                                <div className="col-span-1 text-sm text-right text-muted-foreground">{formatCurrency(p.baseSalary)}</div>
                                <div className="col-span-1 text-sm text-right text-muted-foreground">{formatCurrency(p.overtime)}</div>
                                <div className="col-span-1 text-sm text-right text-muted-foreground hidden sm:block">{formatCurrency(p.allowances)}</div>
                                <div className="col-span-1 text-sm text-right font-medium">{formatCurrency(p.grossSalary)}</div>
                                <div className="col-span-1 text-sm text-right text-rose-400 hidden md:block">-{formatCurrency(p.deductions)}</div>
                                <div className="col-span-1 text-sm text-right font-bold text-emerald-400">{formatCurrency(p.netSalary)}</div>
                                <div className="col-span-1"><StatusBadge status={p.status} /></div>
                                <div className="col-span-1 flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openPayslip(p)}><Eye className="h-3.5 w-3.5" /></Button>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => downloadCSV(p)}><Download className="h-3.5 w-3.5" /></Button>
                                  {expandedRows.has(p.id) ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                                </div>
                              </div>
                            </div>
                            <AnimatePresence>
                              {expandedRows.has(p.id) && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                  <div className="mx-4 mb-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div><span className="text-muted-foreground">Bonus:</span> <span className="font-medium">{formatCurrency(p.bonus)}</span></div>
                                    <div><span className="text-muted-foreground">Tax:</span> <span className="font-medium text-rose-400">{formatCurrency(p.tax)}</span></div>
                                    <div><span className="text-muted-foreground">Insurance:</span> <span className="font-medium text-rose-400">{formatCurrency(p.insurance)}</span></div>
                                    <div><span className="text-muted-foreground">Provident Fund:</span> <span className="font-medium text-rose-400">{formatCurrency(p.providentFund)}</span></div>
                                    <div><span className="text-muted-foreground">Other Deductions:</span> <span className="font-medium text-rose-400">{formatCurrency(p.otherDeductions)}</span></div>
                                    <div><span className="text-muted-foreground">Payment:</span> <span className="font-medium">{paymentMethodLabel[p.paymentMethod] || p.paymentMethod}</span></div>
                                    {p.bankName && <div><span className="text-muted-foreground">Bank:</span> <span className="font-medium">{p.bankName}</span></div>}
                                    {p.generatedAt && <div><span className="text-muted-foreground">Generated:</span> <span className="font-medium">{new Date(p.generatedAt).toLocaleDateString()}</span></div>}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </GlassCard>
          </motion.div>
        </TabsContent>

        {/* ════════════ TAX SIMULATOR TAB ════════════ */}
        <TabsContent value="simulator" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* What-if Calculator */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard className="p-6" hover glow="cyan">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="h-5 w-5 text-cyan-400" />
                  <h3 className="font-semibold">What-If Calculator</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-6">See how a raise would change your take-home pay after taxes and deductions.</p>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Current Base Salary</label>
                    <div className="h-10 px-3 rounded-md bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1] flex items-center text-sm font-medium">
                      {myStructure ? formatCurrency(myStructure.baseSalary) : formatCurrency(user?.salary ?? 0)}
                      <span className="text-xs text-muted-foreground ml-2">/month</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Raise Amount</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input type="number" placeholder="5,000" value={raiseAmount} onChange={e => setRaiseAmount(e.target.value)}
                          className="pl-7 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
                      </div>
                      <Select value={raiseType} onValueChange={(v) => setRaiseType(v as 'flat' | 'percent')}>
                        <SelectTrigger className="w-[120px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="flat">Flat ($)</SelectItem>
                          <SelectItem value="percent">Percent (%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">Additional 401(k)/year</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input type="number" placeholder="0" value={additional401k} onChange={e => setAdditional401k(e.target.value)}
                          className="pl-7 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">Additional HSA/year</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input type="number" placeholder="0" value={additionalHSA} onChange={e => setAdditionalHSA(e.target.value)}
                          className="pl-7 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
                      </div>
                    </div>
                  </div>

                  <Button className="w-full gap-2 bg-cyan-600 hover:bg-cyan-500" onClick={runSimulation} disabled={simulating}>
                    {simulating ? <><Clock className="h-4 w-4 animate-spin" /> Calculating...</> : <><Calculator className="h-4 w-4" /> Simulate Tax Impact</>}
                  </Button>
                </div>
              </GlassCard>
            </motion.div>

            {/* Simulation Results */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <GlassCard className="p-6" glow={simResult ? (simResult.takeHomeChange >= 0 ? 'emerald' : 'rose') : 'none'}>
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-5 w-5 text-emerald-400" />
                  <h3 className="font-semibold">Simulation Results</h3>
                </div>
                {simResult ? (
                  <div className="space-y-4">
                    {/* Take-home change hero */}
                    <div className={`rounded-xl p-4 text-center ${simResult.takeHomeChange >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                      <p className="text-xs text-muted-foreground mb-1">Monthly Take-Home Change</p>
                      <p className={`text-3xl font-bold ${simResult.takeHomeChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {simResult.takeHomeChange >= 0 ? '+' : ''}{formatCurrency(simResult.takeHomeChange)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{simResult.takeHomeChangePct}% change from current</p>
                    </div>

                    {/* Before vs After comparison */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-black/[0.02] dark:bg-white/[0.03] p-3 space-y-2">
                        <p className="text-xs text-muted-foreground font-medium">Current</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between"><span className="text-muted-foreground">Gross</span><span>{formatCurrency(simResult.currentGross)}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="text-rose-400">-{formatCurrency(simResult.currentTax)}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Deductions</span><span className="text-rose-400">-{formatCurrency(simResult.currentDeductions)}</span></div>
                          <Separator className="bg-black/[0.06] dark:bg-white/[0.1] my-1" />
                          <div className="flex justify-between font-bold"><span>Net</span><span className="text-emerald-400">{formatCurrency(simResult.currentNet)}</span></div>
                        </div>
                      </div>
                      <div className="rounded-lg bg-black/[0.02] dark:bg-white/[0.03] p-3 space-y-2 border border-cyan-500/20">
                        <p className="text-xs text-cyan-400 font-medium">After Raise</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between"><span className="text-muted-foreground">Gross</span><span>{formatCurrency(simResult.newGross)}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="text-rose-400">-{formatCurrency(simResult.newTax)}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Deductions</span><span className="text-rose-400">-{formatCurrency(simResult.newDeductions)}</span></div>
                          <Separator className="bg-black/[0.06] dark:bg-white/[0.1] my-1" />
                          <div className="flex justify-between font-bold"><span>Net</span><span className="text-emerald-400">{formatCurrency(simResult.newNet)}</span></div>
                        </div>
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="rounded-lg bg-black/[0.02] dark:bg-white/[0.03] p-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">New Monthly Breakdown</p>
                      {[
                        { label: 'Base Salary', value: simResult.breakdown.baseSalary, color: '#10b981' },
                        { label: 'Allowances', value: simResult.breakdown.allowances, color: '#f59e0b' },
                        { label: 'Tax', value: simResult.breakdown.tax, color: '#f43f5e' },
                        { label: 'Insurance', value: simResult.breakdown.insurance, color: '#06b6d4' },
                        { label: 'Provident Fund', value: simResult.breakdown.providentFund, color: '#f59e0b' },
                        { label: 'Other Deductions', value: simResult.breakdown.otherDeductions, color: '#8b5cf6' },
                      ].map(item => (
                        <div key={item.label} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-muted-foreground">{item.label}</span>
                          </div>
                          <span className="font-medium">{formatCurrency(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Calculator className="h-12 w-12 mb-3 opacity-30" />
                    <p className="text-sm font-medium">No simulation yet</p>
                    <p className="text-xs mt-1">Enter a raise amount and click Simulate</p>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </div>

          {/* Tax Optimization Tips */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <GlassCard className="p-6" hover glow="amber">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-400" />
                  <h3 className="font-semibold">Tax Optimization Tips</h3>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={loadOptimizationTips} disabled={loadingTips}>
                  {loadingTips ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
              {loadingTips && tips.length === 0 ? (
                <div className="flex items-center justify-center py-12"><Clock className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : tips.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tips.map((tip, i) => {
                    const TipIcon = tipIconMap[tip.icon] || PiggyBank;
                    const priorityColor = tip.priority === 'high' ? 'text-rose-400 bg-rose-500/10' : tip.priority === 'medium' ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400 bg-slate-500/10';
                    return (
                      <motion.div key={tip.id} custom={i} variants={stagger} initial="hidden" animate="visible"
                        className="rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.03] p-4 hover:border-amber-500/20 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-amber-500/10 p-2 shrink-0">
                            <TipIcon className="h-5 w-5 text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-medium truncate">{tip.title}</h4>
                              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${priorityColor}`}>{tip.priority}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{tip.description}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-emerald-400 font-medium">
                                Save up to {formatCurrency(tip.potentialSaving)}/year
                              </span>
                              <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2 text-cyan-400 hover:text-cyan-300">
                                {tip.actionLabel} <ArrowRight className="h-3 w-3 ml-1" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Lightbulb className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">Click Refresh to load tips</p>
                </div>
              )}
            </GlassCard>
          </motion.div>
        </TabsContent>

        {/* ════════════ INVESTMENTS TAB ════════════ */}
        <TabsContent value="investments" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title="Total Declared" value={formatCurrency(totalDeclared)} icon={PiggyBank} color="amber" subtitle={`FY ${getCurrentFiscalYear()}`} hero />
            <StatCard title="Approved" value={formatCurrency(totalApprovedDeclared)} icon={CheckCircle2} color="emerald" subtitle="Verified by HR" hero />
            <StatCard title="Pending Review" value={formatCurrency(totalDeclared - totalApprovedDeclared)} icon={Clock} color="cyan" subtitle="Awaiting approval" hero />
          </div>

          {/* Investment Declarations List */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard className="p-6" hover>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <PiggyBank className="h-5 w-5 text-amber-400" />
                  <h3 className="font-semibold">Investment Declarations</h3>
                  <Badge variant="outline" className="text-[10px] ml-2 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                    FY {getCurrentFiscalYear()}
                  </Badge>
                </div>
                <Button className="gap-2 bg-amber-600 hover:bg-amber-500 text-xs" onClick={() => setInvestmentDialogOpen(true)}>
                  <Plus className="h-3.5 w-3.5" /> Add Declaration
                </Button>
              </div>

              {loadingInvestments ? (
                <div className="flex items-center justify-center py-12"><Clock className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : investments.length > 0 ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {investments.map((inv, i) => {
                    const catColor = investmentCategoryColors[inv.category] || '#6b7280';
                    const statusIcon = inv.status === 'approved' ? FileCheck : inv.status === 'rejected' ? FileX : Clock;
                    const StatusIcon = statusIcon;
                    const statusColor = inv.status === 'approved' ? 'text-emerald-400' : inv.status === 'rejected' ? 'text-rose-400' : 'text-amber-400';
                    return (
                      <motion.div key={inv.id} custom={i} variants={stagger} initial="hidden" animate="visible"
                        className="rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.03] p-4 hover:border-black/[0.12] dark:hover:border-white/[0.2] transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="rounded-lg p-2.5 shrink-0" style={{ backgroundColor: `${catColor}20` }}>
                            <PiggyBank className="h-5 w-5" style={{ color: catColor }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h4 className="text-sm font-medium truncate">{inv.description}</h4>
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0" style={{ borderColor: catColor, color: catColor }}>
                                {investmentCategoryLabels[inv.category] || inv.category}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Submitted {new Date(inv.submittedAt).toLocaleDateString()}
                              {inv.proofName && <> &middot; Proof: {inv.proofName}</>}
                              {inv.reviewComment && <> &middot; <span className="italic">{inv.reviewComment}</span></>}
                            </p>
                          </div>
                          <div className="text-right shrink-0 flex items-center gap-3">
                            <div>
                              <p className="text-sm font-bold">{formatCurrency(inv.amount)}</p>
                              <div className={`flex items-center gap-1 text-xs ${statusColor}`}>
                                <StatusIcon className="h-3 w-3" />
                                <span className="capitalize">{inv.status}</span>
                              </div>
                            </div>
                            {inv.status !== 'approved' && (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                onClick={() => deleteInvestment(inv.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <PiggyBank className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-sm">No investment declarations yet</p>
                  <p className="text-xs mt-1">Add your tax-saving investments for FY {getCurrentFiscalYear()}</p>
                </div>
              )}
            </GlassCard>
          </motion.div>

          {/* Investment Proof Upload Info */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <GlassCard className="p-6" hover glow="emerald">
              <div className="flex items-center gap-2 mb-4">
                <Info className="h-5 w-5 text-emerald-400" />
                <h3 className="font-semibold">Tax-Saving Investment Categories</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(investmentCategoryLabels).map(([key, label]) => {
                  const color = investmentCategoryColors[key];
                  return (
                    <div key={key} className="rounded-lg bg-black/[0.02] dark:bg-white/[0.03] p-3 border border-black/[0.06] dark:border-white/[0.05] hover:border-black/[0.1] dark:hover:border-white/[0.1] transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-xs font-medium">{label}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {key === '401k' && 'Max $23,000/yr deduction'}
                        {key === 'hsa' && 'Max $4,150/yr triple tax-free'}
                        {key === 'insurance' && 'Premium up to $1,500/yr'}
                        {key === 'education' && '529 plan contributions'}
                        {key === 'home-loan' && 'Mortgage interest deduction'}
                        {key === 'charity' && 'Deductible donations'}
                        {key === 'nps' && 'Additional $1,000 deduction'}
                        {key === 'other' && 'Other qualifying deductions'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>
        </TabsContent>

        {/* ════════════ MARKET COMPARE TAB ════════════ */}
        <TabsContent value="market" className="space-y-6">
          {loadingBenchmark ? (
            <GlassCard className="p-12">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Clock className="h-8 w-8 animate-spin mb-3" />
                <p className="text-sm">Loading market benchmarks...</p>
              </div>
            </GlassCard>
          ) : benchmark ? (
            <>
              {/* Percentile Hero Card */}
              <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
                <GlassCard className="p-6" glow={benchmark.percentile >= 50 ? 'emerald' : 'amber'}>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Globe className="h-6 w-6 text-cyan-400" />
                        <h3 className="text-xl font-bold">Salary Market Comparison</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Comparing your salary as <span className="font-medium text-white">{benchmark.position}</span> in <span className="font-medium text-white">{benchmark.department}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Your Percentile</p>
                        <p className={`text-5xl font-bold ${benchmark.percentile >= 75 ? 'text-emerald-400' : benchmark.percentile >= 50 ? 'text-cyan-400' : benchmark.percentile >= 25 ? 'text-amber-400' : 'text-rose-400'}`}>
                          P{benchmark.percentile}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Your Annual Salary</p>
                        <p className="text-2xl font-bold text-emerald-400">{formatCurrency(benchmark.yourSalary)}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(benchmark.yourSalary / 12)}/month</p>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>

              {/* Comparison Visualization */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <GlassCard className="p-6" hover glow="cyan">
                  <div className="flex items-center gap-2 mb-6">
                    <BarChart3 className="h-5 w-5 text-cyan-400" />
                    <h3 className="font-semibold">Market Distribution</h3>
                  </div>
                  <SalaryComparisonBar benchmark={benchmark} />
                  <Separator className="bg-black/[0.06] dark:bg-white/[0.1] my-6" />
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { label: '10th Percentile', value: benchmark.p10, color: 'slate' },
                      { label: '25th Percentile', value: benchmark.p25, color: 'amber' },
                      { label: 'Median (P50)', value: benchmark.p50, color: 'cyan' },
                      { label: '75th Percentile', value: benchmark.p75, color: 'emerald' },
                      { label: '90th Percentile', value: benchmark.p90, color: 'emerald' },
                    ].map(item => (
                      <div key={item.label} className="rounded-lg bg-black/[0.02] dark:bg-white/[0.03] p-3 text-center">
                        <p className="text-[10px] text-muted-foreground mb-1">{item.label}</p>
                        <p className={`text-sm font-bold ${item.color === 'emerald' ? 'text-emerald-400' : item.color === 'cyan' ? 'text-cyan-400' : item.color === 'amber' ? 'text-amber-400' : 'text-slate-400'}`}>
                          {formatCurrency(item.value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>

              {/* Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <GlassCard className="p-6" hover glow={benchmark.yourSalary >= benchmark.p50 ? 'emerald' : 'amber'}>
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="h-5 w-5 text-emerald-400" />
                      <h3 className="font-semibold">Your Position</h3>
                    </div>
                    <div className="space-y-3">
                      {benchmark.yourSalary >= benchmark.p75 ? (
                        <div className="rounded-lg bg-emerald-500/10 p-3 flex items-start gap-3">
                          <Sparkles className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-emerald-400">Above Market Rate</p>
                            <p className="text-xs text-muted-foreground mt-1">Your salary is in the top {100 - benchmark.percentile}% for {benchmark.position}. You earn {formatCurrency(benchmark.yourSalary - benchmark.p50)} more than the median.</p>
                          </div>
                        </div>
                      ) : benchmark.yourSalary >= benchmark.p50 ? (
                        <div className="rounded-lg bg-cyan-500/10 p-3 flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-cyan-400">At Market Rate</p>
                            <p className="text-xs text-muted-foreground mt-1">Your salary is above the median for {benchmark.position}. You could aim for {formatCurrency(benchmark.p75)} to reach the 75th percentile.</p>
                          </div>
                        </div>
                      ) : benchmark.yourSalary >= benchmark.p25 ? (
                        <div className="rounded-lg bg-amber-500/10 p-3 flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-amber-400">Below Median</p>
                            <p className="text-xs text-muted-foreground mt-1">Your salary is below the market median. The median for {benchmark.position} is {formatCurrency(benchmark.p50)}. A raise of {formatCurrency(benchmark.p50 - benchmark.yourSalary)} would bring you to the median.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-rose-500/10 p-3 flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-rose-400">Significantly Below Market</p>
                            <p className="text-xs text-muted-foreground mt-1">Your salary is well below market rates for {benchmark.position}. Consider discussing a compensation review. You would need a {formatCurrency(benchmark.p25 - benchmark.yourSalary)} raise to reach the 25th percentile.</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Gap to median</span>
                        <span className={`font-medium ${benchmark.yourSalary >= benchmark.p50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {benchmark.yourSalary >= benchmark.p50 ? '+' : ''}{formatCurrency(benchmark.yourSalary - benchmark.p50)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Gap to P75</span>
                        <span className={`font-medium ${benchmark.yourSalary >= benchmark.p75 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {benchmark.yourSalary >= benchmark.p75 ? '+' : ''}{formatCurrency(benchmark.yourSalary - benchmark.p75)}
                        </span>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <GlassCard className="p-6" hover glow="cyan">
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="h-5 w-5 text-cyan-400" />
                      <h3 className="font-semibold">Department Comparison</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="rounded-lg bg-black/[0.02] dark:bg-white/[0.03] p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Your Department Avg</span>
                          <span className="text-sm font-medium">{formatCurrency(benchmark.deptAvg || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Team Size</span>
                          <span className="text-sm font-medium">{benchmark.deptSize || 0} members</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">vs Department Avg</span>
                          <span className={`text-sm font-medium ${benchmark.yourSalary >= (benchmark.deptAvg || 0) ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {benchmark.yourSalary >= (benchmark.deptAvg || 0) ? '+' : ''}{formatCurrency(benchmark.yourSalary - (benchmark.deptAvg || 0))}
                          </span>
                        </div>
                      </div>
                      <div className="rounded-lg bg-cyan-500/10 p-4">
                        <p className="text-xs text-cyan-400 font-medium mb-2">Quick Actions</p>
                        <div className="space-y-2">
                          <Button variant="outline" size="sm" className="w-full justify-start text-xs border-black/[0.1] dark:border-white/[0.1] hover:border-cyan-500/30"
                            onClick={() => {
                              const gap = Math.max(benchmark.p50 - benchmark.yourSalary, 0);
                              if (gap > 0) {
                                setRaiseAmount(Math.round(gap / 12).toString());
                                setRaiseType('flat');
                                toast.info('Raise amount pre-filled! Switch to Tax Simulator tab to simulate.');
                              } else {
                                toast.info('Your salary is already at or above median!');
                              }
                            }}>
                            <Calculator className="h-3.5 w-3.5 mr-2" />
                            Simulate raise to P50 ({formatCurrency(benchmark.p50)})
                          </Button>
                          <Button variant="outline" size="sm" className="w-full justify-start text-xs border-black/[0.1] dark:border-white/[0.1] hover:border-cyan-500/30"
                            onClick={() => {
                              const gap = Math.max(benchmark.p75 - benchmark.yourSalary, 0);
                              if (gap > 0) {
                                setRaiseAmount(Math.round(gap / 12).toString());
                                setRaiseType('flat');
                                toast.info('Raise amount pre-filled! Switch to Tax Simulator tab to simulate.');
                              } else {
                                toast.info('Your salary is already at or above P75!');
                              }
                            }}>
                            <Target className="h-3.5 w-3.5 mr-2" />
                            Simulate raise to P75 ({formatCurrency(benchmark.p75)})
                          </Button>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              </div>
            </>
          ) : (
            <GlassCard className="p-12">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Globe className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">Failed to load market data</p>
                <Button variant="outline" size="sm" className="mt-3 border-black/[0.1] dark:border-white/[0.1]" onClick={loadBenchmark}>Retry</Button>
              </div>
            </GlassCard>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Payslip Detail Dialog ── */}
      <Dialog open={payslipDialogOpen} onOpenChange={setPayslipDialogOpen}>
        <DialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-400" />
              Payslip — {selectedRecord ? monthLabel(selectedRecord.month) : ''}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">Detailed salary breakdown for the selected period</DialogDescription>
          </DialogHeader>
          {selectedRecord && (() => {
            const p = selectedRecord;
            const PMethodIcon = paymentMethodIcon[p.paymentMethod] || CreditCard;
            return (
              <div className="space-y-6 py-2">
                <GlassCard className="p-4" glow="emerald">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full h-12 w-12 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center text-lg font-bold text-emerald-400">
                      {user?.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold">{p.userName || user?.name || 'Employee'}</p>
                      <p className="text-xs text-muted-foreground">{p.userDepartment || user?.department || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">{p.userPosition || user?.position || 'N/A'}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <StatusBadge status={p.status} />
                      <p className="text-xs text-muted-foreground mt-1">{monthLabel(p.month)}</p>
                    </div>
                  </div>
                </GlassCard>
                <div>
                  <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-3"><DollarSign className="h-4 w-4" /> Earnings</h4>
                  <div className="space-y-2">
                    {[{ label: 'Base Salary', value: p.baseSalary }, { label: 'Overtime', value: p.overtime }, { label: 'Allowances', value: p.allowances }, { label: 'Bonus', value: p.bonus }].map(item => (
                      <div key={item.label} className="flex items-center justify-between text-sm py-1 border-b border-black/[0.06] dark:border-white/[0.05]">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-sm py-2 font-bold"><span>Gross Salary</span><span className="text-emerald-400">{formatCurrency(p.grossSalary)}</span></div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-rose-400 flex items-center gap-2 mb-3"><Percent className="h-4 w-4" /> Deductions</h4>
                  <div className="space-y-2">
                    {[{ label: 'Tax', value: p.tax }, { label: 'Insurance', value: p.insurance }, { label: 'Provident Fund', value: p.providentFund }, { label: 'Other Deductions', value: p.otherDeductions }].map(item => (
                      <div key={item.label} className="flex items-center justify-between text-sm py-1 border-b border-black/[0.06] dark:border-white/[0.05]">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium text-rose-400">-{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-sm py-2 font-bold"><span>Total Deductions</span><span className="text-rose-400">-{formatCurrency(p.deductions)}</span></div>
                  </div>
                </div>
                <GlassCard className="p-4" glow="emerald">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Net Salary</p>
                      <p className="text-2xl font-bold text-emerald-400">{formatCurrency(p.netSalary)}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{formatCurrency(p.grossSalary)} (gross)</p>
                      <p>- {formatCurrency(p.deductions)} (deductions)</p>
                    </div>
                  </div>
                </GlassCard>
                <div>
                  <h4 className="text-sm font-semibold text-cyan-400 flex items-center gap-2 mb-3"><CreditCard className="h-4 w-4" /> Payment Details</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-black/[0.02] dark:bg-white/[0.03] p-3">
                      <p className="text-xs text-muted-foreground">Payment Method</p>
                      <div className="flex items-center gap-2 mt-1"><PMethodIcon className="h-4 w-4 text-cyan-400" /><span className="font-medium">{paymentMethodLabel[p.paymentMethod] || p.paymentMethod}</span></div>
                    </div>
                    {p.bankName && <div className="rounded-lg bg-black/[0.02] dark:bg-white/[0.03] p-3"><p className="text-xs text-muted-foreground">Bank</p><div className="flex items-center gap-2 mt-1"><Building2 className="h-4 w-4 text-cyan-400" /><span className="font-medium">{p.bankName}</span></div></div>}
                    {p.bankAccount && <div className="rounded-lg bg-black/[0.02] dark:bg-white/[0.03] p-3"><p className="text-xs text-muted-foreground">Account</p><div className="flex items-center gap-2 mt-1"><Shield className="h-4 w-4 text-cyan-400" /><span className="font-medium">****{p.bankAccount.slice(-4)}</span></div></div>}
                  </div>
                </div>
                <Separator className="bg-black/[0.06] dark:bg-white/[0.1]" />
                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  {p.generatedAt && <div className="flex items-center gap-1"><FileText className="h-3 w-3" /><span>Generated: {new Date(p.generatedAt).toLocaleDateString()}</span></div>}
                  {p.reviewedAt && p.reviewerName && <div className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-cyan-400" /><span>Reviewed by {p.reviewerName} on {new Date(p.reviewedAt).toLocaleDateString()}</span></div>}
                  {p.approvedAt && p.approverName && <div className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-amber-400" /><span>Approved by {p.approverName} on {new Date(p.approvedAt).toLocaleDateString()}</span></div>}
                  {p.paidAt && <div className="flex items-center gap-1"><DollarSign className="h-3 w-3 text-emerald-400" /><span>Paid on {new Date(p.paidAt).toLocaleDateString()}</span></div>}
                </div>
              </div>
            );
          })()}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPayslipDialogOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Close</Button>
            {selectedRecord && <Button className="gap-2 bg-emerald-600 hover:bg-emerald-500" onClick={() => downloadCSV(selectedRecord)}><Download className="h-4 w-4" /> Download CSV</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Investment Declaration Dialog ── */}
      <Dialog open={investmentDialogOpen} onOpenChange={setInvestmentDialogOpen}>
        <DialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-amber-400" />
              Add Investment Declaration
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Declare tax-saving investments for FY {getCurrentFiscalYear()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Category *</label>
              <Select value={newInvestment.category} onValueChange={(v) => setNewInvestment(prev => ({ ...prev, category: v }))}>
                <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(investmentCategoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Description *</label>
              <Textarea placeholder="e.g. 401(k) contribution through employer plan" value={newInvestment.description}
                onChange={(e) => setNewInvestment(prev => ({ ...prev, description: e.target.value }))}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] min-h-[80px]" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Amount ($) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input type="number" placeholder="5,000" value={newInvestment.amount}
                  onChange={(e) => setNewInvestment(prev => ({ ...prev, amount: e.target.value }))}
                  className="pl-7 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Upload Proof (optional)</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-black/[0.12] dark:border-white/[0.2] bg-black/[0.02] dark:bg-white/[0.03] cursor-pointer hover:border-black/[0.15] dark:hover:border-white/[0.3] transition-colors">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{proofFile ? proofFile.name : 'Choose file'}</span>
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
                </label>
                {proofFile && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setProofFile(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">PDF, JPG, PNG — Max 5MB</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setInvestmentDialogOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button className="gap-2 bg-amber-600 hover:bg-amber-500" onClick={submitInvestment}>
              <FileCheck className="h-4 w-4" /> Submit Declaration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
