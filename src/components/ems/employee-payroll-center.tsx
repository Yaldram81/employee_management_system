'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEMSStore } from '@/lib/store';
import type { PayrollRecord, SalaryStructure } from '@/lib/types';
import { GlassCard } from './glass-card';
import { StatCard } from './stat-card';
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle2, CreditCard, Wallet,
  Receipt, Download, Eye, ArrowUpRight, ArrowDownRight, Building2,
  Calendar, FileText, Banknote, PieChart, BarChart3, ChevronDown,
  ChevronUp, Info, Shield, BadgeDollarSign, Calculator, PiggyBank,
  Landmark, Percent, Activity, Target, Zap, Scale, Lightbulb,
  ArrowRight, Printer, ChevronLeft, ChevronRight, Briefcase, Hash,
  CircleDollarSign, LineChart, History, FileSpreadsheet, Coins,
} from 'lucide-react';
import { formatCurrency, formatDate, SalaryDonutChart } from './shared';

/* ────────────────────────── Helpers ────────────────────────── */


const statusColorMap: Record<string, string> = {
  paid: 'emerald', approved: 'cyan', reviewed: 'cyan',
  draft: 'amber', 'on-hold': 'rose', cancelled: 'slate',
};

const statusGlowMap: Record<string, 'emerald' | 'cyan' | 'amber' | 'rose' | 'none'> = {
  paid: 'emerald', approved: 'cyan', reviewed: 'cyan',
  draft: 'amber', 'on-hold': 'rose', cancelled: 'none',
};

const paymentMethodLabel: Record<string, string> = {
  'bank-transfer': 'Bank Transfer', cash: 'Cash',
  check: 'Check', 'digital-wallet': 'Digital Wallet',
};

const paymentMethodIcon: Record<string, typeof CreditCard> = {
  'bank-transfer': Landmark, cash: Banknote, check: Receipt, 'digital-wallet': Wallet,
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



function maskAccount(acc?: string): string {
  if (!acc) return 'N/A';
  const last4 = acc.slice(-4);
  return `••••${last4}`;
}

const stagger = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: 'easeOut' as const },
  }),
};

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

/* ────────────────────── TrendIndicator ────────────────────── */

function TrendIndicator({ current, previous, label, invert = false }: {
  current: number; previous: number; label?: string; invert?: boolean;
}) {
  if (!previous || previous === 0) return null;
  const diff = current - previous;
  const pct = (diff / previous) * 100;
  const isPositive = diff >= 0;
  const isGood = invert ? !isPositive : isPositive;
  return (
    <div className="flex items-center gap-1 text-xs">
      <span className={`inline-flex items-center gap-0.5 font-medium ${isGood ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {Math.abs(pct).toFixed(1)}%
      </span>
      {label && <span className="text-muted-foreground">{label}</span>}
    </div>
  );
}

/* ────────────────────── DeductionBar ────────────────────── */

function DeductionBar({ label, amount, total, color }: {
  label: string; amount: number; total: number; color: string;
}) {
  const pct = total > 0 ? Math.min((amount / total) * 100, 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{formatCurrency(amount)} <span className="text-xs text-muted-foreground">({pct.toFixed(1)}%)</span></span>
      </div>
      <div className="h-2 rounded-full bg-black/[0.03] dark:bg-white/[0.05] overflow-hidden">
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full" style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

/* ────────────────────── MiniBarChart ────────────────────── */

function MiniBarChart({ data, height = 120, barColor = '#10b981' }: {
  data: { label: string; value: number }[]; height?: number; barColor?: string;
}) {
  if (!data.length) return <div className="flex items-center justify-center h-28 text-xs text-muted-foreground">No data</div>;
  const maxVal = Math.max(...data.map(d => d.value)) || 1;
  const barWidth = Math.max(16, Math.min(40, 260 / data.length - 8));
  const gap = 8;
  const svgWidth = data.length * (barWidth + gap);
  const padding = { top: 8, bottom: 24, left: 4, right: 4 };
  const chartH = height - padding.top - padding.bottom;

  return (
    <div className="w-full overflow-x-auto">
      <svg width={svgWidth + padding.left + padding.right} height={height} viewBox={`0 0 ${svgWidth + padding.left + padding.right} ${height}`}>
        {data.map((d, i) => {
          const barH = Math.max(2, (d.value / maxVal) * chartH);
          const x = padding.left + i * (barWidth + gap);
          const y = padding.top + chartH - barH;
          return (
            <g key={i}>
              <motion.rect
                x={x} y={y} width={barWidth} rx={4}
                fill={barColor} opacity={0.8}
                initial={{ height: 0, y: padding.top + chartH }}
                animate={{ height: barH, y }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
              />
              <text x={x + barWidth / 2} y={height - 4} textAnchor="middle" className="fill-muted-foreground" fontSize={9}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ────────────────────── MiniLineChart ────────────────────── */

function MiniLineChart({ data, height = 140, lineColor = '#10b981' }: {
  data: { label: string; value: number }[]; height?: number; lineColor?: string;
}) {
  if (data.length < 2) return <div className="flex items-center justify-center h-28 text-xs text-muted-foreground">Insufficient data</div>;
  const maxVal = Math.max(...data.map(d => d.value)) || 1;
  const minVal = Math.min(...data.map(d => d.value));
  const range = maxVal - minVal || 1;
  const padding = { top: 12, bottom: 28, left: 8, right: 8 };
  const svgWidth = 320;
  const chartW = svgWidth - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartW,
    y: padding.top + chartH - ((d.value - minVal) / range) * chartH,
    ...d,
  }));

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = pathData + ` L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${svgWidth} ${height}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity={0.2} />
          <stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <motion.path d={areaPath} fill="url(#areaGrad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} />
      <motion.path d={pathData} fill="none" stroke={lineColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: 'easeOut' }} />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} fill={lineColor} stroke="rgba(0,0,0,0.3)" strokeWidth={2} />
          <text x={p.x} y={height - 6} textAnchor="middle" className="fill-muted-foreground" fontSize={9}>{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

/* ────────────────────── DualBarChart ────────────────────── */

function DualBarChart({ data, height = 140, color1 = '#10b981', color2 = '#f43f5e', label1 = 'Earnings', label2 = 'Deductions' }: {
  data: { label: string; value1: number; value2: number }[]; height?: number;
  color1?: string; color2?: string; label1?: string; label2?: string;
}) {
  if (!data.length) return <div className="flex items-center justify-center h-28 text-xs text-muted-foreground">No data</div>;
  const allVals = data.flatMap(d => [d.value1, d.value2]);
  const maxVal = Math.max(...allVals) || 1;
  const barW = 14;
  const pairGap = 4;
  const groupW = barW * 2 + pairGap;
  const groupGap = 16;
  const svgWidth = data.length * (groupW + groupGap);
  const padding = { top: 8, bottom: 28, left: 4, right: 4 };
  const chartH = height - padding.top - padding.bottom;

  return (
    <div className="w-full overflow-x-auto">
      <svg width={svgWidth + padding.left + padding.right} height={height} viewBox={`0 0 ${svgWidth + padding.left + padding.right} ${height}`}>
        {data.map((d, i) => {
          const h1 = Math.max(2, (d.value1 / maxVal) * chartH);
          const h2 = Math.max(2, (d.value2 / maxVal) * chartH);
          const x = padding.left + i * (groupW + groupGap);
          return (
            <g key={i}>
              <motion.rect x={x} y={padding.top + chartH - h1} width={barW} height={h1} rx={3} fill={color1} opacity={0.8}
                initial={{ height: 0, y: padding.top + chartH }} animate={{ height: h1, y: padding.top + chartH - h1 }} transition={{ duration: 0.5, delay: i * 0.06 }} />
              <motion.rect x={x + barW + pairGap} y={padding.top + chartH - h2} width={barW} height={h2} rx={3} fill={color2} opacity={0.8}
                initial={{ height: 0, y: padding.top + chartH }} animate={{ height: h2, y: padding.top + chartH - h2 }} transition={{ duration: 0.5, delay: i * 0.06 + 0.1 }} />
              <text x={x + groupW / 2} y={height - 4} textAnchor="middle" className="fill-muted-foreground" fontSize={9}>{d.label}</text>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center justify-center gap-4 mt-2 text-xs">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: color1 }} /> {label1}</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: color2 }} /> {label2}</span>
      </div>
    </div>
  );
}

/* ────────────────────────── Main Component ────────────────────────── */

export function EmployeePayrollCenter() {
  const { user, payroll, salaryStructures, loadSalaryStructures, loadPayrollDashboard, payrollDashboard } = useEMSStore();

  const myPayroll = useMemo(() => payroll.filter(p => p.userId === user?.id), [payroll, user?.id]);
  const myStructures = useMemo(() => salaryStructures.filter(s => s.userId === user?.id), [salaryStructures, user?.id]);

  const [activeTab, setActiveTab] = useState('overview');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [payslipDialogOpen, setPayslipDialogOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showCount, setShowCount] = useState(10);

  // Load salary structures on mount (accessible to all roles)
  // loadPayrollDashboard is admin/manager-only — skip for employees
  useEffect(() => {
    loadSalaryStructures();
    if (user?.role && user.role !== 'employee') {
      loadPayrollDashboard();
    }
  }, [loadSalaryStructures, loadPayrollDashboard, user?.role]);

  const sorted = useMemo(() =>
    [...myPayroll].sort((a, b) => monthSort(b.month) - monthSort(a.month)),
    [myPayroll]
  );

  const currentRecord = sorted[0] || null;
  const previousRecord = sorted[1] || null;
  const activeStructure = useMemo(() => myStructures.find(s => s.isActive) || myStructures[0] || null, [myStructures]);

  /* Computed stats */
  const stats = useMemo(() => {
    const paidCount = myPayroll.filter(p => p.status === 'paid').length;
    const pendingCount = myPayroll.filter(p => ['draft', 'reviewed', 'approved'].includes(p.status)).length;
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

  /* Monthly comparison */
  const monthlyComparison = useMemo(() => {
    if (!currentRecord || !previousRecord) return null;
    const diff = currentRecord.netSalary - previousRecord.netSalary;
    const pctChange = previousRecord.netSalary > 0 ? (diff / previousRecord.netSalary) * 100 : 0;
    return { diff, pctChange };
  }, [currentRecord, previousRecord]);

  /* Available filters */
  const availableMonths = useMemo(() => {
    const months = [...new Set(sorted.map(p => p.month))].filter(Boolean);
    return months.sort((a, b) => monthSort(b) - monthSort(a));
  }, [sorted]);

  const availableYears = useMemo(() => {
    const years = [...new Set(sorted.map(p => p.month?.split('-')[0]))].filter(Boolean);
    return years.sort().reverse();
  }, [sorted]);

  /* Filtered records */
  const filtered = useMemo(() => {
    let records = sorted;
    if (statusFilter !== 'all') records = records.filter(p => p.status === statusFilter);
    if (monthFilter !== 'all') records = records.filter(p => p.month === monthFilter);
    if (yearFilter !== 'all') records = records.filter(p => p.month?.startsWith(yearFilter));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      records = records.filter(p => monthLabel(p.month).toLowerCase().includes(q));
    }
    return records;
  }, [sorted, statusFilter, monthFilter, yearFilter, searchQuery]);

  const displayedRecords = useMemo(() => filtered.slice(0, showCount), [filtered, showCount]);

  /* CTC calculation */
  const ctc = useMemo(() => {
    if (!activeStructure) return 0;
    const annual = (activeStructure.baseSalary + activeStructure.housingAllowance + activeStructure.transportAllowance +
      activeStructure.medicalAllowance + activeStructure.foodAllowance + activeStructure.otherAllowances) * 12;
    return annual;
  }, [activeStructure]);

  /* Recent activity */
  const recentActivity = useMemo(() => {
    const events: { type: string; date: string; label: string; icon: typeof CheckCircle2; color: string }[] = [];
    sorted.slice(0, 5).forEach(p => {
      if (p.generatedAt) events.push({ type: 'generated', date: p.generatedAt, label: `${monthLabel(p.month)} payroll generated`, icon: FileText, color: 'text-cyan-400' });
      if (p.reviewedAt) events.push({ type: 'reviewed', date: p.reviewedAt, label: `${monthLabel(p.month)} payroll reviewed`, icon: Eye, color: 'text-amber-400' });
      if (p.approvedAt) events.push({ type: 'approved', date: p.approvedAt, label: `${monthLabel(p.month)} payroll approved`, icon: CheckCircle2, color: 'text-cyan-400' });
      if (p.paidAt) events.push({ type: 'paid', date: p.paidAt, label: `${monthLabel(p.month)} salary paid`, icon: DollarSign, color: 'text-emerald-400' });
    });
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  }, [sorted]);

  /* 6-month chart data */
  const last6Months = useMemo(() => sorted.slice(0, 6).reverse(), [sorted]);

  const trendData = useMemo(() => last6Months.map(p => ({
    label: monthLabel(p.month).split(' ')[0],
    value: p.netSalary,
  })), [last6Months]);

  const earningsVsDeductions = useMemo(() => last6Months.map(p => ({
    label: monthLabel(p.month).split(' ')[0],
    value1: p.grossSalary,
    value2: p.deductions,
  })), [last6Months]);

  const overtimeTrend = useMemo(() => last6Months.map(p => ({
    label: monthLabel(p.month).split(' ')[0],
    value: p.overtime,
  })), [last6Months]);

  const deductionTrend = useMemo(() => last6Months.map(p => ({
    label: monthLabel(p.month).split(' ')[0],
    value: p.deductions,
  })), [last6Months]);

  /* Tax & Deductions analytics */
  const annualProjection = useMemo(() => {
    if (!currentRecord) return { annualIncome: 0, annualTax: 0, monthlyTaxAvg: 0, bracket: '' };
    const annualIncome = currentRecord.grossSalary * 12;
    const annualTax = currentRecord.tax * 12;
    const monthlyTaxAvg = currentRecord.tax;
    let bracket = '10%';
    if (annualIncome > 500000) bracket = '37%';
    else if (annualIncome > 300000) bracket = '32%';
    else if (annualIncome > 200000) bracket = '24%';
    else if (annualIncome > 100000) bracket = '22%';
    else if (annualIncome > 50000) bracket = '12%';
    return { annualIncome, annualTax, monthlyTaxAvg, bracket };
  }, [currentRecord]);

  /* Monthly growth rate */
  const growthRate = useMemo(() => {
    if (sorted.length < 2) return 0;
    const newest = sorted[0].netSalary;
    const oldest = sorted[sorted.length - 1].netSalary;
    if (oldest === 0) return 0;
    return ((newest - oldest) / oldest) * 100;
  }, [sorted]);

  /* Callbacks */
  const toggleRow = useCallback((id: string) => {
    setExpandedRows(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);

  const openPayslip = useCallback((record: PayrollRecord) => {
    setSelectedRecord(record);
    setPayslipDialogOpen(true);
  }, []);

  const downloadCSV = useCallback((record: PayrollRecord) => {
    const headers = ['Field', 'Amount'];
    const rows = [
      ['Month', record.month], ['Base Salary', record.baseSalary.toString()],
      ['Overtime', record.overtime.toString()], ['Allowances', record.allowances.toString()],
      ['Bonus', record.bonus.toString()], ['Gross Salary', record.grossSalary.toString()],
      ['Tax', record.tax.toString()], ['Insurance', record.insurance.toString()],
      ['Provident Fund', record.providentFund.toString()], ['Other Deductions', record.otherDeductions.toString()],
      ['Total Deductions', record.deductions.toString()], ['Net Salary', record.netSalary.toString()],
      ['Status', record.status], ['Payment Method', record.paymentMethod],
    ];
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `payslip-${record.month}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Payslip CSV downloaded');
  }, []);

  const exportAllCSV = useCallback(() => {
    if (filtered.length === 0) { toast.error('No records to export'); return; }
    const headers = ['Month', 'Base Salary', 'Overtime', 'Allowances', 'Bonus', 'Gross', 'Tax', 'Insurance', 'PF', 'Other Ded.', 'Total Ded.', 'Net', 'Status', 'Payment'];
    const rows = filtered.map(p => [
      p.month, p.baseSalary, p.overtime, p.allowances, p.bonus, p.grossSalary,
      p.tax, p.insurance, p.providentFund, p.otherDeductions, p.deductions, p.netSalary,
      p.status, p.paymentMethod,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `all-payslips-${user?.name || 'employee'}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} payslips exported`);
  }, [filtered, user?.name]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const firstName = user?.name?.split(' ')[0] || 'there';

  /* ──────────────────────── Render ──────────────────────── */
  return (
    <div className="space-y-6">
      {/* ── Tab Navigation ── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <CircleDollarSign className="h-6 w-6 text-emerald-400" />
                Payroll Center
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Welcome, <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent font-semibold">{firstName}</span>
              </p>
            </div>
            <TabsList className="bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1]">
              <TabsTrigger value="overview" className="text-xs data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                <Activity className="h-3.5 w-3.5 mr-1" /> Overview
              </TabsTrigger>
              <TabsTrigger value="payslips" className="text-xs data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                <Receipt className="h-3.5 w-3.5 mr-1" /> Payslips
              </TabsTrigger>
              <TabsTrigger value="structure" className="text-xs data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                <Briefcase className="h-3.5 w-3.5 mr-1" /> Structure
              </TabsTrigger>
              <TabsTrigger value="tax" className="text-xs data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400">
                <Percent className="h-3.5 w-3.5 mr-1" /> Tax & Ded.
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400">
                <LineChart className="h-3.5 w-3.5 mr-1" /> Analytics
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ════════════════ OVERVIEW TAB ════════════════ */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            {/* Salary Header Card */}
            <motion.div {...fadeIn}>
              <GlassCard className="p-6" glow={currentRecord ? statusGlowMap[currentRecord.status] || 'none' : 'none'}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-lg font-semibold">{currentRecord ? `${monthLabel(currentRecord.month)} Salary` : 'No salary records yet'}</h2>
                      {currentRecord && <StatusBadge status={currentRecord.status} />}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {currentRecord ? `Period: ${monthLabel(currentRecord.month)}` : 'No payroll data available'}
                    </p>
                  </div>
                  <div className="flex items-center gap-8 flex-wrap">
                    <div className="text-center lg:text-right">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Net Salary</p>
                      <p className="text-4xl font-bold tracking-tight text-emerald-400">
                        {currentRecord ? formatCurrency(currentRecord.netSalary) : '$0'}
                      </p>
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
                              <p>Change from {previousRecord ? monthLabel(previousRecord.month) : 'previous'}: {monthlyComparison.diff >= 0 ? '+' : ''}{formatCurrency(monthlyComparison.diff)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}
                    {currentRecord?.paidAt ? (
                      <div className="flex items-center gap-2 text-sm text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Paid {formatDate(currentRecord.paidAt)}</span>
                      </div>
                    ) : currentRecord && currentRecord.status !== 'cancelled' ? (
                      <div className="flex items-center gap-2 text-sm text-amber-400">
                        <Clock className="h-4 w-4 animate-pulse" />
                        <span>Payment Pending</span>
                      </div>
                    ) : null}
                    {currentRecord && (() => {
                      const PMethodIcon = paymentMethodIcon[currentRecord.paymentMethod] || CreditCard;
                      return (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <PMethodIcon className="h-4 w-4" />
                          <span>{paymentMethodLabel[currentRecord.paymentMethod] || currentRecord.paymentMethod}</span>
                          {currentRecord.bankAccount && <span className="text-xs font-mono">{maskAccount(currentRecord.bankAccount)}</span>}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* Earnings Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: 'Base Salary', value: currentRecord?.baseSalary ?? 0, icon: Banknote, color: 'emerald' as const, prev: previousRecord?.baseSalary },
                { title: 'Overtime', value: currentRecord?.overtime ?? 0, icon: Clock, color: 'cyan' as const, prev: previousRecord?.overtime },
                { title: 'Allowances', value: currentRecord?.allowances ?? 0, icon: BadgeDollarSign, color: 'amber' as const, prev: previousRecord?.allowances },
                { title: 'Bonuses', value: currentRecord?.bonus ?? 0, icon: TrendingUp, color: 'slate' as const, prev: previousRecord?.bonus },
              ].map((s, i) => (
                <motion.div key={s.title} custom={i} variants={stagger} initial="hidden" animate="visible">
                  <StatCard
                    title={s.title} value={formatCurrency(s.value)} icon={s.icon} color={s.color} hero
                    trend={s.prev !== undefined && currentRecord ? { value: s.prev > 0 ? ((s.value - s.prev) / s.prev) * 100 : 0, label: 'vs last month' } : undefined}
                  />
                </motion.div>
              ))}
            </div>

            {/* 3-Column Detail Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Salary Breakdown */}
              <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
                <GlassCard className="p-6 h-full" hover glow="emerald">
                  <div className="flex items-center gap-2 mb-4">
                    <PieChart className="h-5 w-5 text-emerald-400" />
                    <h3 className="font-semibold">Salary Breakdown</h3>
                  </div>
                  {currentRecord ? (
                    <SalaryDonutChart
                      segments={[
                        { label: 'Base Salary', value: currentRecord.baseSalary, color: '#10b981' },
                        { label: 'Overtime', value: currentRecord.overtime, color: '#06b6d4' },
                        { label: 'Allowances', value: currentRecord.allowances, color: '#f59e0b' },
                        { label: 'Bonus', value: currentRecord.bonus, color: '#8b5cf6' },
                        { label: 'Deductions', value: currentRecord.deductions, color: '#f43f5e' },
                      ]}
                      centerLabel="Net Pay"
                      centerValue={formatCurrency(currentRecord.netSalary)}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Receipt className="h-10 w-10 mb-2 opacity-40" />
                      <p className="text-sm">No salary data available</p>
                    </div>
                  )}
                </GlassCard>
              </motion.div>

              {/* Deductions Breakdown */}
              <motion.div {...fadeIn} transition={{ delay: 0.25 }}>
                <GlassCard className="p-6 h-full" hover glow="rose">
                  <div className="flex items-center gap-2 mb-4">
                    <Calculator className="h-5 w-5 text-rose-400" />
                    <h3 className="font-semibold">Deductions Breakdown</h3>
                  </div>
                  {currentRecord ? (
                    <div className="space-y-4">
                      <DeductionBar label="Tax" amount={currentRecord.tax} total={currentRecord.grossSalary} color="#f43f5e" />
                      <DeductionBar label="Insurance" amount={currentRecord.insurance} total={currentRecord.grossSalary} color="#06b6d4" />
                      <DeductionBar label="Provident Fund" amount={currentRecord.providentFund} total={currentRecord.grossSalary} color="#f59e0b" />
                      {currentRecord.otherDeductions > 0 && (
                        <DeductionBar label="Other Deductions" amount={currentRecord.otherDeductions} total={currentRecord.grossSalary} color="#8b5cf6" />
                      )}
                      <Separator className="bg-black/[0.06] dark:bg-white/[0.1]" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Total Deductions</span>
                        <span className="font-bold text-rose-400">{formatCurrency(currentRecord.deductions)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Effective rate</span>
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

              {/* YTD Summary */}
              <motion.div {...fadeIn} transition={{ delay: 0.3 }}>
                <GlassCard className="p-6 h-full" hover glow="cyan">
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
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> Overtime Earnings
                        </span>
                        <span className="font-medium text-cyan-400">{formatCurrency(ytd.ytdOvertime)}</span>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            </div>

            {/* Recent Activity */}
            <motion.div {...fadeIn} transition={{ delay: 0.35 }}>
              <GlassCard className="p-6" hover>
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-5 w-5 text-cyan-400" />
                  <h3 className="font-semibold">Recent Activity</h3>
                </div>
                {recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.map((event, i) => {
                      const EventIcon = event.icon;
                      return (
                        <motion.div
                          key={i} custom={i} variants={stagger} initial="hidden" animate="visible"
                          className="flex items-center gap-3 p-3 rounded-lg bg-black/[0.01] dark:bg-white/[0.02] hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition-colors"
                        >
                          <div className={`rounded-full p-2 ${event.color} bg-black/[0.03] dark:bg-white/[0.05]`}>
                            <EventIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{event.label}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(event.date)}</p>
                          </div>
                          <Badge variant="outline" className="text-[9px] shrink-0 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                            {event.type}
                          </Badge>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Activity className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm">No recent activity</p>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </TabsContent>

          {/* ════════════════ PAYSLIPS TAB ════════════════ */}
          <TabsContent value="payslips" className="space-y-6 mt-4">
            {/* Payslip Timeline */}
            <motion.div {...fadeIn}>
              <GlassCard className="p-6" hover>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-5 w-5 text-cyan-400" />
                  <h3 className="font-semibold">Payslip Timeline</h3>
                  <Badge variant="outline" className="text-[10px] ml-2 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                    {myPayroll.length} record{myPayroll.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                {sorted.length > 0 ? (
                  <ScrollArea className="w-full">
                    <div className="flex gap-3 pb-2" style={{ minWidth: sorted.length * 140 }}>
                      {sorted.map((p, i) => {
                        const dotColor: Record<string, string> = {
                          paid: 'bg-emerald-400', approved: 'bg-cyan-400', reviewed: 'bg-cyan-400',
                          draft: 'bg-amber-400', 'on-hold': 'bg-rose-400', cancelled: 'bg-slate-400',
                        };
                        return (
                          <motion.div
                            key={p.id} custom={i} variants={stagger} initial="hidden" animate="visible"
                            whileHover={{ scale: 1.04, y: -2 }}
                            onClick={() => openPayslip(p)}
                            className="shrink-0 w-32 rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.03] p-3 cursor-pointer transition-colors hover:border-emerald-500/30"
                          >
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

            {/* Filter Bar */}
            <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
              <GlassCard className="p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Receipt className="h-5 w-5 text-amber-400 shrink-0" />
                    <h3 className="font-semibold shrink-0">Payslip History</h3>
                    <Badge variant="outline" className="text-[10px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                      {filtered.length} of {sorted.length}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <Input
                      placeholder="Search month..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      className="h-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] w-full sm:w-36"
                    />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[130px] h-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
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
                      <SelectTrigger className="w-[150px] h-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        {availableMonths.map(m => (
                          <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={yearFilter} onValueChange={setYearFilter}>
                      <SelectTrigger className="w-[110px] h-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {availableYears.map(y => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={exportAllCSV}>
                      <FileSpreadsheet className="h-3.5 w-3.5" /> Export All
                    </Button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* Payslip History Table */}
            <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
              <GlassCard className="p-6">
                <div className="max-h-[480px] overflow-y-auto rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-black/[0.1] dark:border-white/[0.1] hover:bg-transparent">
                        <TableHead className="text-xs">Month</TableHead>
                        <TableHead className="text-xs text-right">Base</TableHead>
                        <TableHead className="text-xs text-right">OT</TableHead>
                        <TableHead className="text-xs text-right hidden sm:table-cell">Allow.</TableHead>
                        <TableHead className="text-xs text-right">Gross</TableHead>
                        <TableHead className="text-xs text-right hidden md:table-cell">Ded.</TableHead>
                        <TableHead className="text-xs text-right font-bold">Net</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs hidden lg:table-cell">Payment</TableHead>
                        <TableHead className="text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedRecords.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <FileText className="h-8 w-8 opacity-30" />
                              <p className="text-sm">No payslip records found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        displayedRecords.map((p, i) => (
                          <motion.tr
                            key={p.id} custom={i} variants={stagger} initial="hidden" animate="visible"
                            className="border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.01] dark:hover:bg-white/[0.02] transition-colors"
                          >
                            <td colSpan={10} className="p-0">
                              <div>
                                <div className="flex items-center">
                                  <div className="flex-1 grid grid-cols-10 items-center gap-2 px-4 py-3 cursor-pointer" onClick={() => toggleRow(p.id)}>
                                    <div className="col-span-1 text-sm font-medium">{monthLabel(p.month)}</div>
                                    <div className="col-span-1 text-sm text-right text-muted-foreground">{formatCurrency(p.baseSalary)}</div>
                                    <div className="col-span-1 text-sm text-right text-muted-foreground">{formatCurrency(p.overtime)}</div>
                                    <div className="col-span-1 text-sm text-right text-muted-foreground hidden sm:block">{formatCurrency(p.allowances)}</div>
                                    <div className="col-span-1 text-sm text-right font-medium">{formatCurrency(p.grossSalary)}</div>
                                    <div className="col-span-1 text-sm text-right text-rose-400 hidden md:block">-{formatCurrency(p.deductions)}</div>
                                    <div className="col-span-1 text-sm text-right font-bold text-emerald-400">{formatCurrency(p.netSalary)}</div>
                                    <div className="col-span-1"><StatusBadge status={p.status} /></div>
                                    <div className="col-span-1 text-xs text-muted-foreground hidden lg:block">
                                      {paymentMethodLabel[p.paymentMethod] || p.paymentMethod}
                                    </div>
                                    <div className="col-span-1 flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openPayslip(p)}>
                                        <Eye className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => downloadCSV(p)}>
                                        <Download className="h-3.5 w-3.5" />
                                      </Button>
                                      {expandedRows.has(p.id) ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                                    </div>
                                  </div>
                                </div>
                                <AnimatePresence>
                                  {expandedRows.has(p.id) && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden"
                                    >
                                      <div className="mx-4 mb-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div><span className="text-muted-foreground">Bonus:</span> <span className="font-medium">{formatCurrency(p.bonus)}</span></div>
                                        <div><span className="text-muted-foreground">Tax:</span> <span className="font-medium text-rose-400">{formatCurrency(p.tax)}</span></div>
                                        <div><span className="text-muted-foreground">Insurance:</span> <span className="font-medium text-rose-400">{formatCurrency(p.insurance)}</span></div>
                                        <div><span className="text-muted-foreground">PF:</span> <span className="font-medium text-rose-400">{formatCurrency(p.providentFund)}</span></div>
                                        <div><span className="text-muted-foreground">Other Ded.:</span> <span className="font-medium text-rose-400">{formatCurrency(p.otherDeductions)}</span></div>
                                        <div><span className="text-muted-foreground">Payment:</span> <span className="font-medium">{paymentMethodLabel[p.paymentMethod]}</span></div>
                                        {p.bankName && <div><span className="text-muted-foreground">Bank:</span> <span className="font-medium">{p.bankName}</span></div>}
                                        {p.generatedAt && <div><span className="text-muted-foreground">Generated:</span> <span className="font-medium">{formatDate(p.generatedAt)}</span></div>}
                                        {p.reviewedAt && <div><span className="text-muted-foreground">Reviewed:</span> <span className="font-medium">{formatDate(p.reviewedAt)}</span></div>}
                                        {p.approvedAt && <div><span className="text-muted-foreground">Approved:</span> <span className="font-medium">{formatDate(p.approvedAt)}</span></div>}
                                        {p.paidAt && <div><span className="text-muted-foreground">Paid:</span> <span className="font-medium">{formatDate(p.paidAt)}</span></div>}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {/* Show More */}
                {filtered.length > showCount && (
                  <div className="flex justify-center mt-4">
                    <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setShowCount(prev => prev + 10)}>
                      Show More ({filtered.length - showCount} remaining) <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </TabsContent>

          {/* ════════════════ SALARY STRUCTURE TAB ════════════════ */}
          <TabsContent value="structure" className="space-y-6 mt-4">
            {/* CTC Breakdown */}
            <motion.div {...fadeIn}>
              <GlassCard className="p-6" glow="emerald">
                <div className="flex items-center gap-2 mb-4">
                  <CircleDollarSign className="h-5 w-5 text-emerald-400" />
                  <h3 className="font-semibold">Current CTC Breakdown</h3>
                  {activeStructure && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 ml-2">Active</Badge>
                  )}
                </div>
                {activeStructure ? (
                  <div className="space-y-6">
                    {/* CTC Total */}
                    <div className="text-center p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-emerald-500/10 border border-emerald-500/20">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Cost to Company (Annual)</p>
                      <p className="text-3xl font-bold text-emerald-400 mt-1">{formatCurrency(ctc)}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatCurrency(ctc / 12)}/month</p>
                    </div>

                    {/* Visual Composition Bar */}
                    <div className="h-6 w-full rounded-full overflow-hidden flex">
                      {(() => {
                        const items = [
                          { label: 'Base', value: activeStructure.baseSalary, color: '#10b981' },
                          { label: 'Housing', value: activeStructure.housingAllowance, color: '#06b6d4' },
                          { label: 'Transport', value: activeStructure.transportAllowance, color: '#f59e0b' },
                          { label: 'Medical', value: activeStructure.medicalAllowance, color: '#8b5cf6' },
                          { label: 'Food', value: activeStructure.foodAllowance, color: '#f97316' },
                          { label: 'Other', value: activeStructure.otherAllowances, color: '#64748b' },
                        ];
                        const total = items.reduce((s, i) => s + i.value, 0) || 1;
                        return items.filter(i => i.value > 0).map(item => (
                          <motion.div
                            key={item.label}
                            initial={{ width: 0 }} animate={{ width: `${(item.value / total) * 100}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full" style={{ backgroundColor: item.color }}
                            title={`${item.label}: ${formatCurrency(item.value)}`}
                          />
                        ));
                      })()}
                    </div>

                    {/* Breakdown Table */}
                    <div className="space-y-2">
                      {[
                        { label: 'Base Salary', value: activeStructure.baseSalary, color: '#10b981', icon: Banknote },
                        { label: 'Housing Allowance', value: activeStructure.housingAllowance, color: '#06b6d4', icon: Building2 },
                        { label: 'Transport Allowance', value: activeStructure.transportAllowance, color: '#f59e0b', icon: CarIcon },
                        { label: 'Medical Allowance', value: activeStructure.medicalAllowance, color: '#8b5cf6', icon: Shield },
                        { label: 'Food Allowance', value: activeStructure.foodAllowance, color: '#f97316', icon: BadgeDollarSign },
                        { label: 'Other Allowances', value: activeStructure.otherAllowances, color: '#64748b', icon: PlusIcon },
                      ].map(item => {
                        const monthlyTotal = activeStructure.baseSalary + activeStructure.housingAllowance + activeStructure.transportAllowance +
                          activeStructure.medicalAllowance + activeStructure.foodAllowance + activeStructure.otherAllowances;
                        const pct = monthlyTotal > 0 ? (item.value / monthlyTotal) * 100 : 0;
                        return (
                          <div key={item.label} className="flex items-center gap-3 py-2 border-b border-black/[0.06] dark:border-white/[0.05]">
                            <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-sm text-muted-foreground flex-1">{item.label}</span>
                            <span className="text-sm font-medium w-24 text-right">{formatCurrency(item.value)}</span>
                            <span className="text-xs text-muted-foreground w-12 text-right">{pct.toFixed(1)}%</span>
                          </div>
                        );
                      })}
                      <div className="flex items-center gap-3 py-2 font-bold">
                        <span className="h-3 w-3 rounded-full shrink-0" />
                        <span className="text-sm flex-1">Total Monthly</span>
                        <span className="text-sm font-bold w-24 text-right text-emerald-400">
                          {formatCurrency(activeStructure.baseSalary + activeStructure.housingAllowance + activeStructure.transportAllowance + activeStructure.medicalAllowance + activeStructure.foodAllowance + activeStructure.otherAllowances)}
                        </span>
                        <span className="text-xs w-12 text-right">100%</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Briefcase className="h-10 w-10 mb-2 opacity-40" />
                    <p className="text-sm">No salary structure assigned</p>
                    <p className="text-xs mt-1">Contact HR to set up your salary structure</p>
                  </div>
                )}
              </GlassCard>
            </motion.div>

            {/* Deduction Structure & Effective Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Deduction Structure */}
              <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
                <GlassCard className="p-6 h-full" hover glow="rose">
                  <div className="flex items-center gap-2 mb-4">
                    <Calculator className="h-5 w-5 text-rose-400" />
                    <h3 className="font-semibold">Deduction Structure</h3>
                  </div>
                  {activeStructure ? (
                    <div className="space-y-4">
                      {[
                        { label: 'Tax Rate', rate: activeStructure.taxPercentage, color: '#f43f5e', icon: Percent },
                        { label: 'Insurance Rate', rate: activeStructure.insuranceRate, color: '#06b6d4', icon: Shield },
                        { label: 'Provident Fund Rate', rate: activeStructure.providentFundRate, color: '#f59e0b', icon: PiggyBank },
                      ].map(item => {
                        const monthlyBase = activeStructure.baseSalary;
                        const annualAmount = (item.rate / 100) * monthlyBase * 12;
                        const monthlyEst = (item.rate / 100) * monthlyBase;
                        const ItemIcon = item.icon;
                        return (
                          <div key={item.label} className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] space-y-2">
                            <div className="flex items-center gap-2">
                              <ItemIcon className="h-4 w-4" style={{ color: item.color }} />
                              <span className="text-sm font-medium">{item.label}</span>
                              <span className="ml-auto text-sm font-bold" style={{ color: item.color }}>{item.rate}%</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Monthly estimate</span>
                              <span className="font-medium">{formatCurrency(monthlyEst)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Annual estimate</span>
                              <span className="font-medium">{formatCurrency(annualAmount)}</span>
                            </div>
                          </div>
                        );
                      })}
                      <Separator className="bg-black/[0.06] dark:bg-white/[0.1]" />
                      <div className="flex items-center justify-between text-sm font-medium">
                        <span>Estimated Monthly Deduction</span>
                        <span className="text-rose-400">
                          {formatCurrency((activeStructure.taxPercentage + activeStructure.insuranceRate + activeStructure.providentFundRate) / 100 * activeStructure.baseSalary)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Calculator className="h-8 w-8 mb-2 opacity-40" />
                      <p className="text-sm">No deduction data</p>
                    </div>
                  )}
                </GlassCard>
              </motion.div>

              {/* Effective Details */}
              <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
                <GlassCard className="p-6 h-full" hover glow="cyan">
                  <div className="flex items-center gap-2 mb-4">
                    <Info className="h-5 w-5 text-cyan-400" />
                    <h3 className="font-semibold">Effective Details</h3>
                  </div>
                  {activeStructure ? (
                    <div className="space-y-4">
                      {[
                        { label: 'Effective From', value: formatDate(activeStructure.effectiveFrom), icon: Calendar, color: 'text-cyan-400' },
                        { label: 'Effective To', value: activeStructure.effectiveTo ? formatDate(activeStructure.effectiveTo) : 'Ongoing', icon: Calendar, color: 'text-cyan-400' },
                        { label: 'Payment Method', value: paymentMethodLabel[activeStructure.paymentMethod] || activeStructure.paymentMethod, icon: CreditCard, color: 'text-emerald-400' },
                        { label: 'Bank Name', value: activeStructure.bankName || 'Not specified', icon: Landmark, color: 'text-amber-400' },
                        { label: 'Bank Account', value: maskAccount(activeStructure.bankAccount), icon: Hash, color: 'text-amber-400' },
                        { label: 'Overtime Rate', value: `${formatCurrency(activeStructure.overtimeRate)}/hour`, icon: Clock, color: 'text-violet-400' },
                      ].map(item => {
                        const ItemIcon = item.icon;
                        return (
                          <div key={item.label} className="flex items-center gap-3 py-2 border-b border-black/[0.06] dark:border-white/[0.05]">
                            <ItemIcon className={`h-4 w-4 ${item.color}`} />
                            <span className="text-sm text-muted-foreground flex-1">{item.label}</span>
                            <span className="text-sm font-medium">{item.value}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Info className="h-8 w-8 mb-2 opacity-40" />
                      <p className="text-sm">No structure details</p>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            </div>

            {/* Structure History */}
            {myStructures.length > 1 && (
              <motion.div {...fadeIn} transition={{ delay: 0.25 }}>
                <GlassCard className="p-6" hover>
                  <div className="flex items-center gap-2 mb-4">
                    <History className="h-5 w-5 text-amber-400" />
                    <h3 className="font-semibold">Structure History</h3>
                    <Badge variant="outline" className="text-[10px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                      {myStructures.length} versions
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {myStructures.map((s, i) => (
                      <div key={s.id} className="flex items-center gap-4 p-3 rounded-lg bg-black/[0.01] dark:bg-white/[0.02] hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition-colors">
                        <div className="relative">
                          <div className={`h-3 w-3 rounded-full ${s.isActive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                          {i < myStructures.length - 1 && <div className="absolute top-3 left-1.5 w-px h-8 bg-black/[0.06] dark:bg-white/[0.1]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">Base: {formatCurrency(s.baseSalary)}</p>
                            {s.isActive && <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Active</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Effective: {formatDate(s.effectiveFrom)} {s.effectiveTo ? `→ ${formatDate(s.effectiveTo)}` : '→ Ongoing'}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>Created {formatDate(s.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </TabsContent>

          {/* ════════════════ TAX & DEDUCTIONS TAB ════════════════ */}
          <TabsContent value="tax" className="space-y-6 mt-4">
            {/* Annual Tax Projection */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div {...fadeIn}>
                <GlassCard className="p-6 h-full" glow="rose">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="h-5 w-5 text-rose-400" />
                    <h3 className="font-semibold">Annual Tax Projection</h3>
                  </div>
                  {currentRecord ? (
                    <div className="space-y-5">
                      <div className="p-4 rounded-xl bg-gradient-to-r from-rose-500/10 to-amber-500/10 border border-rose-500/20 text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Projected Annual Income</p>
                        <p className="text-3xl font-bold text-rose-400 mt-1">{formatCurrency(annualProjection.annualIncome)}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg bg-rose-500/10 p-3 space-y-1">
                          <p className="text-xs text-muted-foreground">Est. Annual Tax</p>
                          <p className="text-lg font-bold text-rose-400">{formatCurrency(annualProjection.annualTax)}</p>
                        </div>
                        <div className="rounded-lg bg-amber-500/10 p-3 space-y-1">
                          <p className="text-xs text-muted-foreground">Monthly Tax Avg</p>
                          <p className="text-lg font-bold text-amber-400">{formatCurrency(annualProjection.monthlyTaxAvg)}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03]">
                        <div className="flex items-center gap-2">
                          <Scale className="h-4 w-4 text-cyan-400" />
                          <span className="text-sm text-muted-foreground">Estimated Tax Bracket</span>
                        </div>
                        <Badge variant="outline" className="text-xs bg-rose-500/10 text-rose-400 border-rose-500/20">
                          {annualProjection.bracket}
                        </Badge>
                      </div>
                      {activeStructure && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Effective Tax Rate</span>
                          <span className="font-medium">{activeStructure.taxPercentage}%</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Target className="h-10 w-10 mb-2 opacity-40" />
                      <p className="text-sm">No tax data available</p>
                    </div>
                  )}
                </GlassCard>
              </motion.div>

              {/* Deduction Breakdown Chart */}
              <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
                <GlassCard className="p-6 h-full" hover glow="amber">
                  <div className="flex items-center gap-2 mb-4">
                    <PieChart className="h-5 w-5 text-amber-400" />
                    <h3 className="font-semibold">Deduction Composition</h3>
                  </div>
                  {currentRecord && currentRecord.deductions > 0 ? (
                    <div className="space-y-5">
                      {/* Stacked horizontal bar */}
                      <div className="h-10 w-full rounded-lg overflow-hidden flex">
                        {(() => {
                          const items = [
                            { label: 'Tax', value: currentRecord.tax, color: '#f43f5e' },
                            { label: 'Insurance', value: currentRecord.insurance, color: '#06b6d4' },
                            { label: 'PF', value: currentRecord.providentFund, color: '#f59e0b' },
                            { label: 'Other', value: currentRecord.otherDeductions, color: '#8b5cf6' },
                          ];
                          const total = currentRecord.deductions || 1;
                          return items.filter(i => i.value > 0).map(item => (
                            <motion.div
                              key={item.label}
                              initial={{ width: 0 }} animate={{ width: `${(item.value / total) * 100}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              className="h-full flex items-center justify-center text-[10px] font-medium text-white"
                              style={{ backgroundColor: item.color, minWidth: item.value > 0 ? 24 : 0 }}
                              title={`${item.label}: ${formatCurrency(item.value)} (${((item.value / total) * 100).toFixed(1)}%)`}
                            >
                              {((item.value / total) * 100) > 8 ? `${((item.value / total) * 100).toFixed(0)}%` : ''}
                            </motion.div>
                          ));
                        })()}
                      </div>
                      {/* Legend */}
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Tax', value: currentRecord.tax, color: '#f43f5e' },
                          { label: 'Insurance', value: currentRecord.insurance, color: '#06b6d4' },
                          { label: 'Provident Fund', value: currentRecord.providentFund, color: '#f59e0b' },
                          { label: 'Other', value: currentRecord.otherDeductions, color: '#8b5cf6' },
                        ].map(item => (
                          <div key={item.label} className="flex items-center gap-2 text-sm">
                            <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-muted-foreground">{item.label}</span>
                            <span className="font-medium ml-auto">{formatCurrency(item.value)}</span>
                          </div>
                        ))}
                      </div>
                      <Separator className="bg-black/[0.06] dark:bg-white/[0.1]" />
                      <div className="flex items-center justify-between text-sm font-medium">
                        <span>Total Deductions</span>
                        <span className="text-rose-400">{formatCurrency(currentRecord.deductions)}</span>
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
            </div>

            {/* Monthly Deduction Trend */}
            <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
              <GlassCard className="p-6" hover glow="rose">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-5 w-5 text-rose-400" />
                  <h3 className="font-semibold">Monthly Deduction Trend</h3>
                  <span className="text-xs text-muted-foreground">(Last 6 months)</span>
                </div>
                <MiniBarChart data={deductionTrend} barColor="#f43f5e" height={140} />
              </GlassCard>
            </motion.div>

            {/* Tax Savings Tips & Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tax Savings Tips */}
              <motion.div {...fadeIn} transition={{ delay: 0.25 }}>
                <GlassCard className="p-6 h-full" hover glow="emerald">
                  <div className="flex items-center gap-2 mb-4">
                    <Lightbulb className="h-5 w-5 text-emerald-400" />
                    <h3 className="font-semibold">Tax Savings Tips</h3>
                  </div>
                  <div className="space-y-3">
                    {[
                      { title: 'Maximize Provident Fund Contributions', desc: 'Increasing your PF contributions can reduce taxable income while building long-term savings.', icon: PiggyBank, color: 'text-amber-400' },
                      { title: 'Review Insurance Options', desc: 'Health and life insurance premiums may be tax-deductible. Check with HR about available plans.', icon: Shield, color: 'text-cyan-400' },
                      { title: 'Check Eligible Allowances', desc: 'Some allowances like housing and transport may have special tax treatment. Ensure your structure is optimized.', icon: BadgeDollarSign, color: 'text-emerald-400' },
                    ].map((tip, i) => {
                      const TipIcon = tip.icon;
                      return (
                        <div key={i} className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors space-y-1">
                          <div className="flex items-center gap-2">
                            <TipIcon className={`h-4 w-4 ${tip.color}`} />
                            <p className="text-sm font-medium">{tip.title}</p>
                          </div>
                          <p className="text-xs text-muted-foreground pl-6">{tip.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>
              </motion.div>

              {/* Comparison Card */}
              <motion.div {...fadeIn} transition={{ delay: 0.3 }}>
                <GlassCard className="p-6 h-full" hover glow="cyan">
                  <div className="flex items-center gap-2 mb-4">
                    <Scale className="h-5 w-5 text-cyan-400" />
                    <h3 className="font-semibold">Month-over-Month Comparison</h3>
                  </div>
                  {currentRecord && previousRecord ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] space-y-2">
                          <p className="text-xs text-muted-foreground text-center">{monthLabel(currentRecord.month)}</p>
                          <div className="space-y-2">
                            {[
                              { label: 'Tax', val: currentRecord.tax, prev: previousRecord.tax, color: 'text-rose-400' },
                              { label: 'Insurance', val: currentRecord.insurance, prev: previousRecord.insurance, color: 'text-cyan-400' },
                              { label: 'PF', val: currentRecord.providentFund, prev: previousRecord.providentFund, color: 'text-amber-400' },
                            ].map(item => (
                              <div key={item.label} className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{item.label}</span>
                                <div className="flex items-center gap-2">
                                  <span className={`font-medium ${item.color}`}>{formatCurrency(item.val)}</span>
                                  <TrendIndicator current={item.val} previous={item.prev} invert />
                                </div>
                              </div>
                            ))}
                            <Separator className="bg-black/[0.06] dark:bg-white/[0.1]" />
                            <div className="flex items-center justify-between text-xs font-medium">
                              <span>Total</span>
                              <div className="flex items-center gap-2">
                                <span className="text-rose-400">{formatCurrency(currentRecord.deductions)}</span>
                                <TrendIndicator current={currentRecord.deductions} previous={previousRecord.deductions} invert />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] space-y-2">
                          <p className="text-xs text-muted-foreground text-center">{monthLabel(previousRecord.month)}</p>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Tax</span>
                              <span className="font-medium text-rose-400">{formatCurrency(previousRecord.tax)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Insurance</span>
                              <span className="font-medium text-cyan-400">{formatCurrency(previousRecord.insurance)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">PF</span>
                              <span className="font-medium text-amber-400">{formatCurrency(previousRecord.providentFund)}</span>
                            </div>
                            <Separator className="bg-black/[0.06] dark:bg-white/[0.1]" />
                            <div className="flex items-center justify-between text-xs font-medium">
                              <span>Total</span>
                              <span className="text-rose-400">{formatCurrency(previousRecord.deductions)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-cyan-500/10 text-center">
                        <p className="text-xs text-muted-foreground">Deduction Change</p>
                        <p className={`text-lg font-bold ${currentRecord.deductions - previousRecord.deductions >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {currentRecord.deductions - previousRecord.deductions >= 0 ? '+' : ''}{formatCurrency(currentRecord.deductions - previousRecord.deductions)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Scale className="h-8 w-8 mb-2 opacity-40" />
                      <p className="text-sm">Need at least 2 months of data for comparison</p>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            </div>
          </TabsContent>

          {/* ════════════════ ANALYTICS TAB ════════════════ */}
          <TabsContent value="analytics" className="space-y-6 mt-4">
            {/* Net Salary Trend */}
            <motion.div {...fadeIn}>
              <GlassCard className="p-6" hover glow="emerald">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                  <h3 className="font-semibold">Net Salary Trend</h3>
                  <span className="text-xs text-muted-foreground">(Last 6 months)</span>
                </div>
                <MiniLineChart data={trendData} lineColor="#10b981" height={160} />
              </GlassCard>
            </motion.div>

            {/* Earnings vs Deductions + Salary Growth */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Dual Bar Chart */}
              <motion.div {...fadeIn} transition={{ delay: 0.1 }} className="lg:col-span-2">
                <GlassCard className="p-6 h-full" hover glow="cyan">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-5 w-5 text-cyan-400" />
                    <h3 className="font-semibold">Earnings vs Deductions</h3>
                    <span className="text-xs text-muted-foreground">(6 months)</span>
                  </div>
                  <DualBarChart data={earningsVsDeductions} height={160} />
                </GlassCard>
              </motion.div>

              {/* Salary Growth */}
              <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
                <GlassCard className="p-6 h-full" hover glow="emerald">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="h-5 w-5 text-emerald-400" />
                    <h3 className="font-semibold">Salary Growth</h3>
                  </div>
                  <div className="flex flex-col items-center justify-center h-32">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Overall Growth Rate</p>
                    <div className={`text-4xl font-bold ${growthRate >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {sorted.length > 1 ? `From ${monthLabel(sorted[sorted.length - 1].month)} to ${monthLabel(sorted[0].month)}` : 'Insufficient data'}
                    </p>
                    {sorted.length >= 2 && (
                      <div className="flex items-center gap-1 mt-3 text-xs">
                        {growthRate >= 0 ? (
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
                        )}
                        <span className={growthRate >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {formatCurrency(Math.abs(sorted[0].netSalary - sorted[sorted.length - 1].netSalary))} {growthRate >= 0 ? 'increase' : 'decrease'}
                        </span>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            </div>

            {/* Overtime Trend + CTC Composition + Annual Projection */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Overtime Trend */}
              <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
                <GlassCard className="p-6 h-full" hover glow="cyan">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-5 w-5 text-cyan-400" />
                    <h3 className="font-semibold">Overtime Trend</h3>
                    <span className="text-xs text-muted-foreground">(6 months)</span>
                  </div>
                  <MiniBarChart data={overtimeTrend} barColor="#06b6d4" height={130} />
                  {currentRecord && (
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Current month</span>
                      <span className="font-medium text-cyan-400">{formatCurrency(currentRecord.overtime)}</span>
                    </div>
                  )}
                </GlassCard>
              </motion.div>

              {/* CTC Composition */}
              <motion.div {...fadeIn} transition={{ delay: 0.25 }}>
                <GlassCard className="p-6 h-full" hover glow="amber">
                  <div className="flex items-center gap-2 mb-4">
                    <Coins className="h-5 w-5 text-amber-400" />
                    <h3 className="font-semibold">CTC Composition</h3>
                  </div>
                  {activeStructure ? (
                    <div className="space-y-3">
                      {[
                        { label: 'Base', value: activeStructure.baseSalary * 12, color: '#10b981' },
                        { label: 'Housing', value: activeStructure.housingAllowance * 12, color: '#06b6d4' },
                        { label: 'Transport', value: activeStructure.transportAllowance * 12, color: '#f59e0b' },
                        { label: 'Medical', value: activeStructure.medicalAllowance * 12, color: '#8b5cf6' },
                        { label: 'Food', value: activeStructure.foodAllowance * 12, color: '#f97316' },
                        { label: 'Other', value: activeStructure.otherAllowances * 12, color: '#64748b' },
                      ].filter(item => item.value > 0).map(item => {
                        const pct = ctc > 0 ? (item.value / ctc) * 100 : 0;
                        return (
                          <div key={item.label} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-muted-foreground">{item.label}</span>
                              </span>
                              <span className="font-medium">{formatCurrency(item.value)} ({pct.toFixed(1)}%)</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-black/[0.03] dark:bg-white/[0.05] overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6 }} className="h-full rounded-full" style={{ backgroundColor: item.color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Coins className="h-8 w-8 mb-2 opacity-40" />
                      <p className="text-sm">No CTC data</p>
                    </div>
                  )}
                </GlassCard>
              </motion.div>

              {/* Annual Projection */}
              <motion.div {...fadeIn} transition={{ delay: 0.3 }}>
                <GlassCard className="p-6 h-full" hover glow="emerald">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="h-5 w-5 text-emerald-400" />
                    <h3 className="font-semibold">Annual Projection</h3>
                  </div>
                  {currentRecord ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Projected Annual Earnings</p>
                        <p className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(currentRecord.grossSalary * 12)}</p>
                      </div>
                      <div className="space-y-2">
                        {[
                          { label: 'Annual Gross', value: formatCurrency(currentRecord.grossSalary * 12), color: 'text-emerald-400' },
                          { label: 'Annual Deductions', value: formatCurrency(currentRecord.deductions * 12), color: 'text-rose-400' },
                          { label: 'Annual Net', value: formatCurrency(currentRecord.netSalary * 12), color: 'text-cyan-400' },
                          { label: 'Annual Overtime', value: formatCurrency(currentRecord.overtime * 12), color: 'text-amber-400' },
                          { label: 'Annual Bonus', value: formatCurrency(currentRecord.bonus * 12), color: 'text-violet-400' },
                        ].map(item => (
                          <div key={item.label} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{item.label}</span>
                            <span className={`font-medium ${item.color}`}>{item.value}</span>
                          </div>
                        ))}
                      </div>
                      <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] text-xs text-muted-foreground">
                        <div className="flex items-center gap-1 mb-1">
                          <Info className="h-3 w-3" />
                          <span className="font-medium">Disclaimer</span>
                        </div>
                        Projections based on current month data and may vary with changes in overtime, bonuses, and tax rules.
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Target className="h-8 w-8 mb-2 opacity-40" />
                      <p className="text-sm">No data for projection</p>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ════════════════ PAYSLIP DETAIL DIALOG ════════════════ */}
      <Dialog open={payslipDialogOpen} onOpenChange={setPayslipDialogOpen}>
        <DialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-400" />
              Payslip — {selectedRecord ? monthLabel(selectedRecord.month) : ''}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Detailed salary breakdown for the selected period
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (() => {
            const p = selectedRecord;
            const PMethodIcon = paymentMethodIcon[p.paymentMethod] || CreditCard;
            return (
              <div className="space-y-6 py-2">
                {/* Employee Info Header */}
                <GlassCard className="p-4" glow="emerald">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full h-12 w-12 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center text-lg font-bold text-emerald-400">
                      {user?.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <p className="font-semibold truncate">{p.userName || user?.name || 'Employee'}</p>
                      <p className="text-xs text-muted-foreground">{p.userDepartment || user?.department || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">{p.userPosition || 'N/A'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <StatusBadge status={p.status} />
                      <p className="text-xs text-muted-foreground mt-1">{monthLabel(p.month)}</p>
                    </div>
                  </div>
                </GlassCard>

                {/* Earnings Section */}
                <div>
                  <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-3">
                    <DollarSign className="h-4 w-4" /> Earnings
                  </h4>
                  <div className="space-y-2">
                    {[
                      { label: 'Base Salary', value: p.baseSalary },
                      { label: 'Overtime', value: p.overtime },
                      { label: 'Allowances', value: p.allowances },
                      { label: 'Bonus', value: p.bonus },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between text-sm py-1 border-b border-black/[0.06] dark:border-white/[0.05]">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-sm py-2 font-bold">
                      <span>Gross Salary</span>
                      <span className="text-emerald-400">{formatCurrency(p.grossSalary)}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions Section */}
                <div>
                  <h4 className="text-sm font-semibold text-rose-400 flex items-center gap-2 mb-3">
                    <Percent className="h-4 w-4" /> Deductions
                  </h4>
                  <div className="space-y-2">
                    {[
                      { label: 'Tax', value: p.tax },
                      { label: 'Insurance', value: p.insurance },
                      { label: 'Provident Fund', value: p.providentFund },
                      { label: 'Other Deductions', value: p.otherDeductions },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between text-sm py-1 border-b border-black/[0.06] dark:border-white/[0.05]">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium text-rose-400">-{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-sm py-2 font-bold">
                      <span>Total Deductions</span>
                      <span className="text-rose-400">-{formatCurrency(p.deductions)}</span>
                    </div>
                  </div>
                </div>

                {/* Net Salary Summary */}
                <GlassCard className="p-4" glow="emerald">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Net Salary</p>
                      <p className="text-3xl font-bold text-emerald-400">{formatCurrency(p.netSalary)}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{formatCurrency(p.grossSalary)} (gross)</p>
                      <p>- {formatCurrency(p.deductions)} (deductions)</p>
                    </div>
                  </div>
                </GlassCard>

                {/* Payment Details */}
                <div>
                  <h4 className="text-sm font-semibold text-cyan-400 flex items-center gap-2 mb-3">
                    <CreditCard className="h-4 w-4" /> Payment Details
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm py-1 border-b border-black/[0.06] dark:border-white/[0.05]">
                      <span className="text-muted-foreground">Payment Method</span>
                      <div className="flex items-center gap-1.5">
                        <PMethodIcon className="h-3.5 w-3.5" />
                        <span className="font-medium">{paymentMethodLabel[p.paymentMethod]}</span>
                      </div>
                    </div>
                    {p.bankName && (
                      <div className="flex items-center justify-between text-sm py-1 border-b border-black/[0.06] dark:border-white/[0.05]">
                        <span className="text-muted-foreground">Bank Name</span>
                        <span className="font-medium">{p.bankName}</span>
                      </div>
                    )}
                    {p.bankAccount && (
                      <div className="flex items-center justify-between text-sm py-1 border-b border-black/[0.06] dark:border-white/[0.05]">
                        <span className="text-muted-foreground">Account Number</span>
                        <span className="font-medium font-mono">{maskAccount(p.bankAccount)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Timestamps */}
                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  {p.generatedAt && (
                    <div className="p-2 rounded bg-black/[0.02] dark:bg-white/[0.03]">
                      <span className="font-medium">Generated:</span> {formatDate(p.generatedAt)}
                    </div>
                  )}
                  {p.reviewedAt && (
                    <div className="p-2 rounded bg-black/[0.02] dark:bg-white/[0.03]">
                      <span className="font-medium">Reviewed:</span> {formatDate(p.reviewedAt)}
                      {p.reviewerName && <span className="text-muted-foreground"> by {p.reviewerName}</span>}
                    </div>
                  )}
                  {p.approvedAt && (
                    <div className="p-2 rounded bg-black/[0.02] dark:bg-white/[0.03]">
                      <span className="font-medium">Approved:</span> {formatDate(p.approvedAt)}
                      {p.approverName && <span className="text-muted-foreground"> by {p.approverName}</span>}
                    </div>
                  )}
                  {p.paidAt && (
                    <div className="p-2 rounded bg-black/[0.02] dark:bg-white/[0.03]">
                      <span className="font-medium">Paid:</span> {formatDate(p.paidAt)}
                    </div>
                  )}
                </div>

                {p.notes && (
                  <div className="rounded-lg bg-black/[0.02] dark:bg-white/[0.03] p-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1 mb-1">
                      <Info className="h-3 w-3" />
                      <span className="font-medium">Notes</span>
                    </div>
                    {p.notes}
                  </div>
                )}

                {/* Action Buttons */}
                <DialogFooter className="gap-2">
                  <Button variant="outline" size="sm" className="text-xs gap-1" onClick={handlePrint}>
                    <Printer className="h-3.5 w-3.5" /> Print
                  </Button>
                  <Button size="sm" className="text-xs gap-1" onClick={() => downloadCSV(p)}>
                    <Download className="h-3.5 w-3.5" /> Download CSV
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Small inline icon components ─── */

function CarIcon(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

function PlusIcon(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
