'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { StatCard } from './stat-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { PayrollRecord, SalaryStructure, User } from '@/lib/types';
import {
  DollarSign, TrendingUp, Users, Clock, CheckCircle2, AlertTriangle,
  Plus, Loader2, Building2, Download, Eye, Edit, Ban, PauseCircle,
  CreditCard, Wallet, Banknote, Receipt, Calculator,
  Search, RefreshCw, UserIcon, CalendarDays, MapPin, Phone,
  Mail, Briefcase, ArrowRight, ChevronRight, FileText,
  Shield, Activity, Hash, Percent, CircleDollarSign,
  Landmark, BadgeDollarSign, Clock4, MoreHorizontal,
  ArrowUpDown, ChevronUp, ChevronDown, Filter, CheckSquare,
  Square, X, PlayCircle, XCircle,
} from 'lucide-react';
import { formatCurrency as formatCurrencyShared, getInitials as getInitialsShared } from './shared';

// ─── Helpers ───────────────────────────────────────────────────
const formatCurrency = formatCurrencyShared;

function formatCurrencyFull(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount);
}

const paymentMethodLabel: Record<string, string> = {
  'bank-transfer': 'Bank Transfer',
  'cash': 'Cash',
  'check': 'Check',
  'digital-wallet': 'Digital Wallet',
};

const paymentMethodIcon: Record<string, typeof CreditCard> = {
  'bank-transfer': Building2,
  'cash': Banknote,
  'check': Receipt,
  'digital-wallet': Wallet,
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  'draft': { label: 'Draft', color: 'text-slate-400', bg: 'bg-slate-500/15 border-slate-500/25' },
  'reviewed': { label: 'Reviewed', color: 'text-cyan-400', bg: 'bg-cyan-500/15 border-cyan-500/25' },
  'approved': { label: 'Approved', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/25' },
  'paid': { label: 'Paid', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/25' },
  'on-hold': { label: 'On Hold', color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/25' },
  'cancelled': { label: 'Cancelled', color: 'text-rose-400', bg: 'bg-rose-500/15 border-rose-500/25' },
};

// ─── Enriched Employee type for the list ───────────────────────
interface EnrichedEmployee {
  user: User;
  latestPayroll: PayrollRecord | null;
  payrollRecords: PayrollRecord[];
  salaryStructure: SalaryStructure | null;
  totalPaid: number;
  totalPending: number;
}

// ─── Salary Donut SVG Chart ────────────────────────────────────
function SalaryDonut({ data }: {
  data: { label: string; value: number; color: string }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = 60, cy = 60, r = 45, stroke = 14;
  const circumference = 2 * Math.PI * r;
  // Precompute cumulative offsets for each segment
  const cumOffsets = data.reduce<number[]>((acc, seg, i) => {
    const pct = seg.value / total;
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
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${dashLen} ${circumference - dashLen}`}
              strokeDashoffset={dashOff}
              transform={`rotate(-90 ${cx} ${cy})`}
              className="transition-all duration-700"
              style={{ strokeLinecap: 'round' }}
            />
          );
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-foreground text-[11px] font-bold">
          {formatCurrency(total)}
        </text>
        <text x={cx} y={cy + 8} textAnchor="middle" className="fill-muted-foreground text-[8px]">
          Total
        </text>
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

// ─── Sparkline SVG Chart ───────────────────────────────────────
function Sparkline({ data, width = 280, height = 80 }: {
  data: { month: string; total: number }[];
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return <div className="text-xs text-muted-foreground text-center py-4">Not enough data</div>;
  const max = Math.max(...data.map(d => d.total), 1);
  const min = Math.min(...data.map(d => d.total));
  const range = max - min || 1;
  const padX = 10, padY = 10;
  const w = width - padX * 2, h = height - padY * 2;

  const points = data.map((d, i) => ({
    x: padX + (i / (data.length - 1)) * w,
    y: padY + h - ((d.total - min) / range) * h,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1].x},${height - padY} L${points[0].x},${height - padY} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity={0.3} />
          <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkGrad)" />
      <path d={linePath} fill="none" stroke="rgb(16, 185, 129)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="rgb(16, 185, 129)" className="opacity-0 hover:opacity-100 transition-opacity" />
      ))}
      {/* Month labels */}
      {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 6)) === 0 || i === data.length - 1).map((d, i) => {
        const idx = data.indexOf(d);
        const x = padX + (idx / (data.length - 1)) * w;
        return (
          <text key={i} x={x} y={height} textAnchor="middle" className="fill-muted-foreground text-[7px]">
            {d.month.slice(5)}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Dept Bar Chart ────────────────────────────────────────────
function DeptBarChart({ data }: {
  data: { department: string; total: number; employees: number }[];
}) {
  const max = Math.max(...data.map(d => d.total), 1);
  const barColors = [
    'bg-emerald-500', 'bg-cyan-500', 'bg-amber-500', 'bg-rose-500',
    'bg-violet-500', 'bg-orange-500', 'bg-teal-500', 'bg-pink-500',
  ];

  return (
    <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
      {data.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No department data</p>
      ) : (
        data.map((d, i) => (
          <div key={d.department} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate max-w-[120px]">{d.department}</span>
              <span className="font-medium">{formatCurrency(d.total)}</span>
            </div>
            <div className="h-2.5 rounded-full bg-black/[0.03] dark:bg-white/[0.05] overflow-hidden">
              <motion.div
                className={cn('h-full rounded-full', barColors[i % barColors.length])}
                initial={{ width: 0 }}
                animate={{ width: `${(d.total / max) * 100}%` }}
                transition={{ duration: 0.8, delay: i * 0.05 }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Status Pipeline ───────────────────────────────────────────
function StatusPipeline({ payroll }: { payroll: PayrollRecord[] }) {
  const stages = [
    { key: 'draft', label: 'Draft', color: 'bg-slate-500' },
    { key: 'reviewed', label: 'Reviewed', color: 'bg-cyan-500' },
    { key: 'approved', label: 'Approved', color: 'bg-amber-500' },
    { key: 'paid', label: 'Paid', color: 'bg-emerald-500' },
  ];

  const counts = stages.map(s => ({
    ...s,
    count: payroll.filter(p => p.status === s.key).length,
    amount: payroll.filter(p => p.status === s.key).reduce((a, p) => a + p.netSalary, 0),
  }));

  const total = counts.reduce((s, c) => s + c.count, 0) || 1;
  const paidPct = payroll.length > 0
    ? (payroll.filter(p => p.status === 'paid').length / payroll.length) * 100
    : 0;

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status Pipeline</h4>
        <span className="text-xs text-muted-foreground">{payroll.length} records</span>
      </div>
      {/* Progress bar */}
      <div className="h-2 rounded-full bg-black/[0.03] dark:bg-white/[0.05] overflow-hidden flex mb-4">
        {counts.map((c, i) => (
          <motion.div
            key={c.key}
            className={cn('h-full', c.color)}
            initial={{ width: 0 }}
            animate={{ width: `${(c.count / total) * 100}%` }}
            transition={{ duration: 0.6, delay: i * 0.1 }}
          />
        ))}
      </div>
      {/* Stage indicators */}
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
      {/* Completion indicator */}
      <div className="mt-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">Payment Completion</span>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 rounded-full bg-black/[0.03] dark:bg-white/[0.05] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${paidPct}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
          <span className="text-[10px] font-semibold text-emerald-400">{paidPct.toFixed(0)}%</span>
        </div>
      </div>
    </GlassCard>
  );
}

// ─── Sort direction type ───────────────────────────────────────
type SortDir = 'asc' | 'desc' | null;
type SortField = 'userName' | 'month' | 'baseSalary' | 'overtime' | 'allowances' | 'bonus' | 'grossSalary' | 'deductions' | 'netSalary' | 'status';

// ─── Main Component ────────────────────────────────────────────
export function AdminPayrollCommandCenter() {
  const {
    user, payroll, salaryStructures, payrollDashboard, payrollLoading,
    users, departments,
    generatePayroll, updatePayroll, bulkPayrollAction,
    loadPayrollDashboard, loadSalaryStructures,
    createSalaryStructure, updateSalaryStructure, editPayrollRecord,
  } = useEMSStore();

  // ─── Load Data on Mount ───────────────────────────────────
  useEffect(() => {
    loadPayrollDashboard();
    loadSalaryStructures();
  }, [loadPayrollDashboard, loadSalaryStructures]);

  // ─── State ────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState<EnrichedEmployee | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Generate dialog
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateMonth, setGenerateMonth] = useState(new Date().toISOString().slice(0, 7));
  const [generateDept, setGenerateDept] = useState('all');
  const [generating, setGenerating] = useState(false);

  // Edit payroll dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<PayrollRecord | null>(null);
  const [editForm, setEditForm] = useState({ bonus: '', overtime: '', otherDeductions: '', notes: '' });

  // Create/Edit salary structure dialog
  const [structOpen, setStructOpen] = useState(false);
  const [editingStructId, setEditingStructId] = useState<string | null>(null);
  const [structForm, setStructForm] = useState({
    userId: '', baseSalary: '', housingAllowance: '', transportAllowance: '',
    medicalAllowance: '', foodAllowance: '', otherAllowances: '', overtimeRate: '',
    taxPercentage: '', insuranceRate: '', providentFundRate: '', effectiveFrom: '',
    effectiveTo: '', bankName: '', bankAccount: '', paymentMethod: 'bank-transfer' as SalaryStructure['paymentMethod'],
  });

  // Sheet tab
  const [sheetTab, setSheetTab] = useState('overview');

  const [refreshing, setRefreshing] = useState(false);

  // Main tabs
  const [activeTab, setActiveTab] = useState('employees');

  // Payroll records tab state
  const [recordFilterMonth, setRecordFilterMonth] = useState('all');
  const [recordFilterStatus, setRecordFilterStatus] = useState('all');
  const [recordFilterDept, setRecordFilterDept] = useState('all');
  const [recordSearch, setRecordSearch] = useState('');
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('month');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Record detail sheet
  const [recordDetailOpen, setRecordDetailOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);

  // Structure detail sheet
  const [structSheetOpen, setStructSheetOpen] = useState(false);
  const [selectedStructEmployee, setSelectedStructEmployee] = useState<EnrichedEmployee | null>(null);
  const [structSearch, setStructSearch] = useState('');

  // ─── Enriched Employees List ──────────────────────────────
  const enrichedEmployees = useMemo(() => {
    const activeUsers = users.filter(u => u.isActive !== false);
    return activeUsers.map(emp => {
      const empPayroll = payroll.filter(p => p.userId === emp.id);
      const empStructure = salaryStructures.find(s => s.userId === emp.id && s.isActive);
      const latestPayroll = empPayroll.length > 0
        ? empPayroll.sort((a, b) => b.month.localeCompare(a.month))[0]
        : null;
      const totalPaid = empPayroll.filter(p => p.status === 'paid').reduce((s, p) => s + p.netSalary, 0);
      const totalPending = empPayroll.filter(p => p.status !== 'paid' && p.status !== 'cancelled').reduce((s, p) => s + p.netSalary, 0);

      return {
        user: emp,
        latestPayroll,
        payrollRecords: empPayroll.sort((a, b) => b.month.localeCompare(a.month)),
        salaryStructure: empStructure || null,
        totalPaid,
        totalPending,
      };
    });
  }, [users, payroll, salaryStructures]);

  // ─── Filtered Employees ───────────────────────────────────
  const filteredEmployees = useMemo(() => {
    let result = enrichedEmployees;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.user.name.toLowerCase().includes(q) ||
        e.user.email.toLowerCase().includes(q) ||
        (e.user.position || '').toLowerCase().includes(q) ||
        (e.user.department || '').toLowerCase().includes(q)
      );
    }
    if (filterDept !== 'all') {
      result = result.filter(e => e.user.departmentId === filterDept);
    }
    result.sort((a, b) => {
      const aHas = a.latestPayroll ? 1 : 0;
      const bHas = b.latestPayroll ? 1 : 0;
      if (bHas !== aHas) return bHas - aHas;
      return a.user.name.localeCompare(b.user.name);
    });
    return result;
  }, [enrichedEmployees, searchQuery, filterDept]);

  // ─── Metrics (8 cards) ────────────────────────────────────
  const metrics = useMemo(() => {
    const totalPayroll = payroll.reduce((s, p) => s + p.netSalary, 0);
    const totalPaid = payroll.filter(p => p.status === 'paid').reduce((s, p) => s + p.netSalary, 0);
    const pendingAmount = payroll.filter(p => p.status !== 'paid' && p.status !== 'cancelled').reduce((s, p) => s + p.netSalary, 0);
    const avgSalary = payroll.length > 0 ? totalPayroll / payroll.length : 0;
    const totalDeductions = payroll.reduce((s, p) => s + p.deductions, 0);
    const totalOvertime = payroll.reduce((s, p) => s + p.overtime, 0);
    const totalTax = payroll.reduce((s, p) => s + p.tax, 0);
    const onHoldCount = payroll.filter(p => p.status === 'on-hold').length;
    return { totalPayroll, totalPaid, pendingAmount, avgSalary, totalDeductions, totalOvertime, totalTax, onHoldCount };
  }, [payroll]);

  const dashMetrics = useMemo(() => payrollDashboard?.metrics, [payrollDashboard]);

  // ─── Chart Data ───────────────────────────────────────────
  const donutData = useMemo(() => {
    const baseSalary = payroll.reduce((s, p) => s + p.baseSalary, 0);
    const allowances = payroll.reduce((s, p) => s + p.allowances, 0);
    const deductions = payroll.reduce((s, p) => s + p.deductions, 0);
    const bonuses = payroll.reduce((s, p) => s + p.bonus, 0);
    return [
      { label: 'Base Salary', value: baseSalary, color: '#10b981' },
      { label: 'Allowances', value: allowances, color: '#06b6d4' },
      { label: 'Deductions', value: deductions, color: '#f43f5e' },
      { label: 'Bonuses', value: bonuses, color: '#f59e0b' },
    ];
  }, [payroll]);

  const sparklineData = useMemo(() => {
    return payrollDashboard?.monthlyTrend || [];
  }, [payrollDashboard]);

  const deptBarData = useMemo(() => {
    return payrollDashboard?.deptBreakdown || [];
  }, [payrollDashboard]);

  // ─── Payroll Records Filtering & Sorting ──────────────────
  const filteredPayrollRecords = useMemo(() => {
    let result = [...payroll];
    if (recordFilterMonth !== 'all') {
      result = result.filter(p => p.month === recordFilterMonth);
    }
    if (recordFilterStatus !== 'all') {
      result = result.filter(p => p.status === recordFilterStatus);
    }
    if (recordFilterDept !== 'all') {
      result = result.filter(p => p.userDepartment === recordFilterDept);
    }
    if (recordSearch) {
      const q = recordSearch.toLowerCase();
      result = result.filter(p =>
        (p.userName || '').toLowerCase().includes(q) ||
        (p.userEmail || '').toLowerCase().includes(q) ||
        (p.userDepartment || '').toLowerCase().includes(q)
      );
    }
    if (sortField && sortDir) {
      result.sort((a, b) => {
        const aVal = a[sortField] ?? '';
        const bVal = b[sortField] ?? '';
        const cmp = typeof aVal === 'number' && typeof bVal === 'number'
          ? aVal - bVal
          : String(aVal).localeCompare(String(bVal));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [payroll, recordFilterMonth, recordFilterStatus, recordFilterDept, recordSearch, sortField, sortDir]);

  // ─── Unique months/depts for filters ──────────────────────
  const monthOptions = useMemo(() => {
    const months = [...new Set(payroll.map(p => p.month))].sort().reverse();
    return months;
  }, [payroll]);

  const recordDeptOptions = useMemo(() => {
    return [...new Set(payroll.map(p => p.userDepartment).filter(Boolean))].sort() as string[];
  }, [payroll]);

  // ─── Department Options ───────────────────────────────────
  const deptOptions = useMemo(() => {
    return departments
      .filter(d => d.employeeCount && d.employeeCount > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [departments]);

  // ─── Filtered Struct Employees ────────────────────────────
  const filteredStructEmployees = useMemo(() => {
    let result = enrichedEmployees;
    if (structSearch) {
      const q = structSearch.toLowerCase();
      result = result.filter(e =>
        e.user.name.toLowerCase().includes(q) ||
        e.user.email.toLowerCase().includes(q) ||
        (e.user.position || '').toLowerCase().includes(q) ||
        (e.user.department || '').toLowerCase().includes(q)
      );
    }
    // Sort: employees with structure first, then by name
    result.sort((a, b) => {
      const aHas = a.salaryStructure ? 1 : 0;
      const bHas = b.salaryStructure ? 1 : 0;
      if (bHas !== aHas) return bHas - aHas;
      return a.user.name.localeCompare(b.user.name);
    });
    return result;
  }, [enrichedEmployees, structSearch]);

  // ─── Handlers ─────────────────────────────────────────────
  const handleEmployeeClick = useCallback((emp: EnrichedEmployee) => {
    setSelectedEmployee(emp);
    setSheetTab('overview');
    setSheetOpen(true);
  }, []);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      await generatePayroll(generateMonth, generateDept === 'all' ? undefined : generateDept);
      toast.success('Payroll generated successfully');
      setGenerateOpen(false);
    } catch {
      toast.error('Failed to generate payroll');
    } finally {
      setTimeout(() => setGenerating(false), 600);
    }
  }, [generatePayroll, generateMonth, generateDept]);

  const handleStatusUpdate = useCallback(async (id: string, status: PayrollRecord['status']) => {
    try {
      await updatePayroll(id, { status });
      toast.success(`Payroll marked as ${status}`);
      if (selectedEmployee) {
        const empPayroll = payroll.map(p => p.id === id ? { ...p, status } : p).filter(p => p.userId === selectedEmployee.user.id);
        const latestPayroll = empPayroll.length > 0
          ? empPayroll.sort((a, b) => b.month.localeCompare(a.month))[0]
          : null;
        setSelectedEmployee(prev => prev ? { ...prev, latestPayroll, payrollRecords: empPayroll } : null);
      }
    } catch {
      toast.error('Failed to update payroll status');
    }
  }, [updatePayroll, payroll, selectedEmployee]);

  const openEdit = useCallback((record: PayrollRecord) => {
    setEditRecord(record);
    setEditForm({
      bonus: String(record.bonus),
      overtime: String(record.overtime),
      otherDeductions: String(record.otherDeductions),
      notes: record.notes || '',
    });
    setEditOpen(true);
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editRecord) return;
    const bonus = parseFloat(editForm.bonus) || 0;
    const overtime = parseFloat(editForm.overtime) || 0;
    const otherDeductions = parseFloat(editForm.otherDeductions) || 0;
    const newGross = editRecord.baseSalary + overtime + editRecord.allowances + bonus;
    const newDeductions = editRecord.tax + editRecord.insurance + editRecord.providentFund + otherDeductions;
    const newNet = newGross - newDeductions;
    try {
      await editPayrollRecord(editRecord.id, {
        bonus, overtime, otherDeductions,
        notes: editForm.notes,
        grossSalary: newGross,
        deductions: newDeductions,
        netSalary: newNet,
      });
      toast.success('Payroll record updated');
      setEditOpen(false);
    } catch {
      toast.error('Failed to update payroll record');
    }
  }, [editRecord, editForm, editPayrollRecord]);

  const openEditStructure = useCallback((emp: EnrichedEmployee) => {
    if (!emp.salaryStructure) return;
    const s = emp.salaryStructure;
    setEditingStructId(s.id);
    setStructForm({
      userId: emp.user.id,
      baseSalary: String(s.baseSalary),
      housingAllowance: String(s.housingAllowance),
      transportAllowance: String(s.transportAllowance),
      medicalAllowance: String(s.medicalAllowance),
      foodAllowance: String(s.foodAllowance),
      otherAllowances: String(s.otherAllowances),
      overtimeRate: String(s.overtimeRate),
      taxPercentage: String(s.taxPercentage),
      insuranceRate: String(s.insuranceRate),
      providentFundRate: String(s.providentFundRate),
      effectiveFrom: s.effectiveFrom ? new Date(s.effectiveFrom).toISOString().slice(0, 10) : '',
      effectiveTo: s.effectiveTo ? new Date(s.effectiveTo).toISOString().slice(0, 10) : '',
      bankName: s.bankName || '',
      bankAccount: s.bankAccount || '',
      paymentMethod: s.paymentMethod || 'bank-transfer',
    });
    setStructOpen(true);
  }, []);

  const openCreateStructure = useCallback((userId?: string) => {
    setEditingStructId(null);
    setStructForm({
      userId: userId || '', baseSalary: '', housingAllowance: '', transportAllowance: '',
      medicalAllowance: '', foodAllowance: '', otherAllowances: '', overtimeRate: '',
      taxPercentage: '', insuranceRate: '', providentFundRate: '', effectiveFrom: '',
      effectiveTo: '', bankName: '', bankAccount: '', paymentMethod: 'bank-transfer',
    });
    setStructOpen(true);
  }, []);

  const handleSaveStructure = useCallback(async () => {
    if (!structForm.userId || !structForm.baseSalary) {
      toast.error('Employee and base salary are required');
      return;
    }
    const payload = {
      userId: structForm.userId,
      baseSalary: parseFloat(structForm.baseSalary) || 0,
      housingAllowance: parseFloat(structForm.housingAllowance) || 0,
      transportAllowance: parseFloat(structForm.transportAllowance) || 0,
      medicalAllowance: parseFloat(structForm.medicalAllowance) || 0,
      foodAllowance: parseFloat(structForm.foodAllowance) || 0,
      otherAllowances: parseFloat(structForm.otherAllowances) || 0,
      overtimeRate: parseFloat(structForm.overtimeRate) || 0,
      taxPercentage: parseFloat(structForm.taxPercentage) || 0,
      insuranceRate: parseFloat(structForm.insuranceRate) || 0,
      providentFundRate: parseFloat(structForm.providentFundRate) || 0,
      effectiveFrom: structForm.effectiveFrom || new Date().toISOString(),
      effectiveTo: structForm.effectiveTo || undefined,
      bankName: structForm.bankName || undefined,
      bankAccount: structForm.bankAccount || undefined,
      paymentMethod: structForm.paymentMethod,
      isActive: true,
    };
    try {
      if (editingStructId) {
        await updateSalaryStructure(editingStructId, payload);
        toast.success('Salary structure updated');
      } else {
        await createSalaryStructure(payload);
        toast.success('Salary structure created');
      }
      setStructOpen(false);
      setEditingStructId(null);
      setStructForm({
        userId: '', baseSalary: '', housingAllowance: '', transportAllowance: '',
        medicalAllowance: '', foodAllowance: '', otherAllowances: '', overtimeRate: '',
        taxPercentage: '', insuranceRate: '', providentFundRate: '', effectiveFrom: '',
        effectiveTo: '', bankName: '', bankAccount: '', paymentMethod: 'bank-transfer',
      });
    } catch {
      toast.error(editingStructId ? 'Failed to update salary structure' : 'Failed to create salary structure');
    }
  }, [structForm, editingStructId, createSalaryStructure, updateSalaryStructure]);

  const exportCSV = useCallback(() => {
    const headers = ['Employee', 'Email', 'Department', 'Month', 'Base Salary', 'Overtime', 'Allowances', 'Bonus', 'Gross', 'Tax', 'Insurance', 'PF', 'Other Ded.', 'Total Ded.', 'Net', 'Status', 'Payment Method'];
    const rows = payroll.map(r => [
      r.userName, r.userEmail || '', r.userDepartment || '', r.month,
      r.baseSalary, r.overtime, r.allowances, r.bonus, r.grossSalary,
      r.tax, r.insurance, r.providentFund, r.otherDeductions, r.deductions,
      r.netSalary, r.status, r.paymentMethod,
    ].map(v => `"${v}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `payroll-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  }, [payroll]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPayrollDashboard();
    await loadSalaryStructures();
    setTimeout(() => { setRefreshing(false); toast.success('Dashboard refreshed'); }, 400);
  }, [loadPayrollDashboard, loadSalaryStructures]);

  // ─── Bulk Actions ─────────────────────────────────────────
  const toggleRecordSelect = useCallback((id: string) => {
    setSelectedRecords(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedRecords.size === filteredPayrollRecords.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(filteredPayrollRecords.map(r => r.id)));
    }
  }, [selectedRecords.size, filteredPayrollRecords]);

  const handleBulkAction = useCallback(async (action: string) => {
    if (selectedRecords.size === 0) return;
    try {
      await bulkPayrollAction([...selectedRecords], action);
      toast.success(`${selectedRecords.size} records updated to ${action}`);
      setSelectedRecords(new Set());
    } catch {
      toast.error('Bulk action failed');
    }
  }, [selectedRecords, bulkPayrollAction]);

  // ─── Sort handler ─────────────────────────────────────────
  const handleSort = useCallback((field: SortField) => {
    setSortField(field);
    setSortDir(prev => {
      if (prev === null) return 'asc';
      if (prev === 'asc') return 'desc';
      return null;
    });
  }, []);

  // ─── Edit Preview Calculation ─────────────────────────────
  const editPreview = useMemo(() => {
    if (!editRecord) return null;
    const bonus = parseFloat(editForm.bonus) || 0;
    const overtime = parseFloat(editForm.overtime) || 0;
    const otherDeductions = parseFloat(editForm.otherDeductions) || 0;
    const gross = editRecord.baseSalary + overtime + editRecord.allowances + bonus;
    const deductions = editRecord.tax + editRecord.insurance + editRecord.providentFund + otherDeductions;
    const net = gross - deductions;
    return { gross, deductions, net };
  }, [editRecord, editForm]);

  // ─── Avatar helper ────────────────────────────────────────
  const getInitials = getInitialsShared;

  function getAvatarColor(name: string) {
    const colors = [
      'from-emerald-500 to-cyan-500',
      'from-amber-500 to-orange-500',
      'from-violet-500 to-purple-500',
      'from-rose-500 to-pink-500',
      'from-cyan-500 to-teal-500',
      'from-lime-500 to-green-500',
      'from-fuchsia-500 to-pink-500',
      'from-sky-500 to-blue-500',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  // ─── Sort indicator ───────────────────────────────────────
  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    if (sortDir === 'asc') return <ChevronUp className="h-3 w-3 text-emerald-400" />;
    if (sortDir === 'desc') return <ChevronDown className="h-3 w-3 text-emerald-400" />;
    return <ArrowUpDown className="h-3 w-3 opacity-30" />;
  }

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">Payroll Management</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {users.filter(u => u.isActive !== false).length} employees &middot; {formatCurrency(metrics.totalPayroll)} total payroll
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-emerald-500/10 hover:border-emerald-500/30">
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-cyan-500/10 hover:border-cyan-500/30">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" onClick={() => setGenerateOpen(true)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-500">
            <Plus className="h-3.5 w-3.5" /> Generate Payroll
          </Button>
        </div>
      </div>

      {/* ═══ HERO METRICS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Payroll"
          value={formatCurrency(metrics.totalPayroll)}
          subtitle="Total disbursement"
          icon={DollarSign}
          color="emerald"
          hero
        />
        <StatCard
          title="Total Paid"
          value={formatCurrency(metrics.totalPaid)}
          subtitle="Payment completion"
          icon={CheckCircle2}
          color="emerald"
          hero
          progressRing={{ value: metrics.totalPaid, max: metrics.totalPayroll || 1 }}
        />
        <StatCard
          title="Pending"
          value={formatCurrency(metrics.pendingAmount)}
          subtitle="Awaiting processing"
          icon={Clock}
          color="amber"
          hero
          pulse={metrics.pendingAmount > 0}
        />
        <StatCard
          title="Avg Salary"
          value={formatCurrency(metrics.avgSalary)}
          subtitle="Per employee"
          icon={TrendingUp}
          color="cyan"
          hero
        />
        <StatCard
          title="Total Ded."
          value={formatCurrency(metrics.totalDeductions)}
          subtitle="All deductions"
          icon={BadgeDollarSign}
          color="rose"
          hero
        />
        <StatCard
          title="Total OT"
          value={formatCurrency(metrics.totalOvertime)}
          subtitle="Overtime earnings"
          icon={Clock4}
          color="orange"
          hero
        />
        <StatCard
          title="Total Tax"
          value={formatCurrency(metrics.totalTax)}
          subtitle="Tax withholdings"
          icon={Landmark}
          color="violet"
          hero
        />
        <StatCard
          title="On Hold"
          value={metrics.onHoldCount}
          subtitle="Requires attention"
          icon={PauseCircle}
          color="rose"
          hero
          pulse={metrics.onHoldCount > 0}
        />
      </div>

      {/* ═══ CHARTS ROW ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Salary Donut */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard className="p-4 h-full">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Salary Distribution</h4>
            <SalaryDonut data={donutData} />
          </GlassCard>
        </motion.div>

        {/* Monthly Trend Sparkline */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <GlassCard className="p-4 h-full">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Monthly Trend</h4>
            {sparklineData.length > 0 ? (
              <Sparkline data={sparklineData.map(d => ({ month: d.month, total: d.total }))} />
            ) : (
              <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
                No trend data available
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Dept Distribution Bar */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <GlassCard className="p-4 h-full">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Dept. Distribution</h4>
            <DeptBarChart data={deptBarData} />
          </GlassCard>
        </motion.div>
      </div>

      {/* ═══ STATUS PIPELINE ═══ */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <StatusPipeline payroll={payroll} />
      </motion.div>

      {/* ═══ BULK ACTIONS BAR ═══ */}
      <AnimatePresence>
        {selectedRecords.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="overflow-hidden"
          >
            <GlassCard className="p-3 border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25">
                    {selectedRecords.size} selected
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setSelectedRecords(new Set())}>
                    <X className="h-3 w-3" /> Clear
                  </Button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                    onClick={() => handleBulkAction('reviewed')}>
                    <Eye className="h-3 w-3" /> Review
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                    onClick={() => handleBulkAction('approved')}>
                    <CheckCircle2 className="h-3 w-3" /> Approve
                  </Button>
                  <Button size="sm" className="h-7 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-500"
                    onClick={() => handleBulkAction('paid')}>
                    <DollarSign className="h-3 w-3" /> Pay
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                    onClick={() => handleBulkAction('on-hold')}>
                    <PauseCircle className="h-3 w-3" /> Hold
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                    onClick={() => handleBulkAction('cancelled')}>
                    <XCircle className="h-3 w-3" /> Cancel
                  </Button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ MAIN TABS ═══ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-background/80 backdrop-blur-xl border border-black/[0.1] dark:border-white/[0.1] w-full grid grid-cols-4 sticky top-0 z-20">
          <TabsTrigger value="employees" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs gap-1">
            <Users className="h-3.5 w-3.5" /> Employees
          </TabsTrigger>
          <TabsTrigger value="records" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs gap-1">
            <Receipt className="h-3.5 w-3.5" /> Records
          </TabsTrigger>
          <TabsTrigger value="structures" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs gap-1">
            <Calculator className="h-3.5 w-3.5" /> Structures
          </TabsTrigger>
          <TabsTrigger value="dept" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs gap-1">
            <Building2 className="h-3.5 w-3.5" /> Dept
          </TabsTrigger>
        </TabsList>

        {/* ── EMPLOYEES TAB ── */}
        <TabsContent value="employees" className="mt-4 space-y-4">
          {/* Search & Filter Bar */}
          <GlassCard className="p-4 sticky top-10 z-10 bg-background/80 backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search employees by name, email, position..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="h-9 pl-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30" />
              </div>
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="h-9 w-44 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                  <Building2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {deptOptions.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                {filteredEmployees.length} of {enrichedEmployees.length} employees
              </div>
            </div>
          </GlassCard>

          {/* Employee List */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredEmployees.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <GlassCard className="p-12">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Users className="h-10 w-10 opacity-30" />
                      <p className="text-sm">No employees match your search</p>
                    </div>
                  </GlassCard>
                </motion.div>
              ) : (
                filteredEmployees.map((emp, i) => {
                  const latestStatus = emp.latestPayroll?.status;
                  const statusInfo = latestStatus ? statusConfig[latestStatus] : null;
                  return (
                    <motion.div
                      key={emp.user.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ delay: i * 0.03, duration: 0.3 }}
                    >
                      <GlassCard
                        hover
                        glow={latestStatus === 'paid' ? 'emerald' : latestStatus === 'on-hold' ? 'amber' : 'none'}
                        onClick={() => handleEmployeeClick(emp)}
                        className="p-4"
                      >
                        <div className="flex items-center gap-4">
                          {/* Avatar */}
                          <div className={cn(
                            'h-11 w-11 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-lg',
                            getAvatarColor(emp.user.name)
                          )}>
                            {getInitials(emp.user.name)}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-sm truncate">{emp.user.name}</h3>
                              {statusInfo && (
                                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border', statusInfo.bg, statusInfo.color)}>
                                  {statusInfo.label}
                                </Badge>
                              )}
                              {emp.salaryStructure && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                                  Structure Set
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1 truncate">
                                <Briefcase className="h-3 w-3 shrink-0" />
                                {emp.user.position || 'No position'}
                              </span>
                              <span className="flex items-center gap-1 truncate">
                                <Building2 className="h-3 w-3 shrink-0" />
                                {emp.user.department || 'Unassigned'}
                              </span>
                            </div>
                          </div>

                          {/* Salary Info */}
                          <div className="hidden sm:flex items-center gap-6 shrink-0">
                            <div className="text-right">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Base Salary</p>
                              <p className="text-sm font-bold text-foreground">
                                {emp.salaryStructure ? formatCurrency(emp.salaryStructure.baseSalary) : formatCurrency(emp.user.salary || 0)}
                              </p>
                            </div>
                            {emp.latestPayroll && (
                              <div className="text-right">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Latest Net</p>
                                <p className="text-sm font-bold text-emerald-400">{formatCurrency(emp.latestPayroll.netSalary)}</p>
                              </div>
                            )}
                            <div className="text-right">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Records</p>
                              <p className="text-sm font-semibold">{emp.payrollRecords.length}</p>
                            </div>
                          </div>

                          {/* Chevron */}
                          <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                        </div>
                      </GlassCard>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </TabsContent>

        {/* ── PAYROLL RECORDS TAB ── */}
        <TabsContent value="records" className="mt-4 space-y-4">
          {/* Filter Bar */}
          <GlassCard className="p-4 sticky top-10 z-10 bg-background/80 backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search records..." value={recordSearch} onChange={e => setRecordSearch(e.target.value)}
                  className="h-9 pl-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30" />
              </div>
              <Select value={recordFilterMonth} onValueChange={setRecordFilterMonth}>
                <SelectTrigger className="h-9 w-36 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                  <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {monthOptions.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={recordFilterStatus} onValueChange={setRecordFilterStatus}>
                <SelectTrigger className="h-9 w-36 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(statusConfig).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={recordFilterDept} onValueChange={setRecordFilterDept}>
                <SelectTrigger className="h-9 w-36 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                  <Building2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Dept" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Depts</SelectItem>
                  {recordDeptOptions.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                {filteredPayrollRecords.length} records
              </div>
            </div>
          </GlassCard>

          {/* Records Table */}
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-black/[0.06] dark:border-white/[0.06]">
                    <th className="p-3 text-left w-10">
                      <button onClick={toggleSelectAll} className="p-0.5">
                        {selectedRecords.size === filteredPayrollRecords.length && filteredPayrollRecords.length > 0
                          ? <CheckSquare className="h-4 w-4 text-emerald-400" />
                          : <Square className="h-4 w-4 text-muted-foreground/40" />
                        }
                      </button>
                    </th>
                    {[
                      { field: 'userName' as SortField, label: 'Employee' },
                      { field: 'month' as SortField, label: 'Month' },
                      { field: 'baseSalary' as SortField, label: 'Base' },
                      { field: 'overtime' as SortField, label: 'OT' },
                      { field: 'allowances' as SortField, label: 'Allow.' },
                      { field: 'bonus' as SortField, label: 'Bonus' },
                      { field: 'grossSalary' as SortField, label: 'Gross' },
                      { field: 'deductions' as SortField, label: 'Ded.' },
                      { field: 'netSalary' as SortField, label: 'Net' },
                      { field: 'status' as SortField, label: 'Status' },
                    ].map(col => (
                      <th key={col.field} className="p-3 text-left">
                        <button onClick={() => handleSort(col.field)} className="flex items-center gap-1 hover:text-foreground transition-colors text-muted-foreground">
                          {col.label}
                          {SortIcon({ field: col.field })}
                        </button>
                      </th>
                    ))}
                    <th className="p-3 text-left">Payment</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayrollRecords.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="p-12 text-center text-muted-foreground">
                        <FileText className="h-8 w-8 opacity-30 mx-auto mb-2" />
                        <p className="text-sm">No payroll records found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPayrollRecords.map(record => {
                      const sInfo = statusConfig[record.status];
                      const isSelected = selectedRecords.has(record.id);
                      return (
                        <motion.tr
                          key={record.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={cn(
                            'border-b border-black/[0.04] dark:border-white/[0.04] transition-colors cursor-pointer',
                            isSelected ? 'bg-emerald-500/5' : 'hover:bg-black/[0.01] dark:hover:bg-white/[0.02]'
                          )}
                          onClick={() => { setSelectedRecord(record); setRecordDetailOpen(true); }}
                        >
                          <td className="p-3">
                            <button onClick={() => toggleRecordSelect(record.id)} className="p-0.5">
                              {isSelected
                                ? <CheckSquare className="h-4 w-4 text-emerald-400" />
                                : <Square className="h-4 w-4 text-muted-foreground/40" />
                              }
                            </button>
                          </td>
                          <td className="p-3">
                            <div>
                              <p className="font-medium truncate max-w-[140px]">{record.userName || 'Unknown'}</p>
                              <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{record.userDepartment || ''}</p>
                            </div>
                          </td>
                          <td className="p-3 font-mono">{record.month}</td>
                          <td className="p-3">{formatCurrency(record.baseSalary)}</td>
                          <td className="p-3">{formatCurrency(record.overtime)}</td>
                          <td className="p-3">{formatCurrency(record.allowances)}</td>
                          <td className="p-3">{formatCurrency(record.bonus)}</td>
                          <td className="p-3 font-medium">{formatCurrency(record.grossSalary)}</td>
                          <td className="p-3 text-rose-400">-{formatCurrency(record.deductions)}</td>
                          <td className="p-3 font-bold text-emerald-400">{formatCurrency(record.netSalary)}</td>
                          <td className="p-3">
                            {sInfo && (
                              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border', sInfo.bg, sInfo.color)}>
                                {sInfo.label}
                              </Badge>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="text-[10px] text-muted-foreground">
                              {paymentMethodLabel[record.paymentMethod] || record.paymentMethod}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setSelectedRecord(record); setRecordDetailOpen(true); }}>
                                  <Eye className="h-3 w-3 mr-2" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEdit(record)}>
                                  <Edit className="h-3 w-3 mr-2" /> Edit
                                </DropdownMenuItem>
                                {record.status === 'draft' && (
                                  <DropdownMenuItem onClick={() => handleStatusUpdate(record.id, 'reviewed')}>
                                    <Eye className="h-3 w-3 mr-2" /> Review
                                  </DropdownMenuItem>
                                )}
                                {record.status === 'reviewed' && (
                                  <DropdownMenuItem onClick={() => handleStatusUpdate(record.id, 'approved')}>
                                    <CheckCircle2 className="h-3 w-3 mr-2" /> Approve
                                  </DropdownMenuItem>
                                )}
                                {record.status === 'approved' && (
                                  <DropdownMenuItem onClick={() => handleStatusUpdate(record.id, 'paid')}>
                                    <DollarSign className="h-3 w-3 mr-2" /> Mark Paid
                                  </DropdownMenuItem>
                                )}
                                {!['paid', 'cancelled'].includes(record.status) && (
                                  <DropdownMenuItem onClick={() => handleStatusUpdate(record.id, 'on-hold')}>
                                    <PauseCircle className="h-3 w-3 mr-2" /> Hold
                                  </DropdownMenuItem>
                                )}
                                {!['paid', 'cancelled'].includes(record.status) && (
                                  <DropdownMenuItem onClick={() => handleStatusUpdate(record.id, 'cancelled')}>
                                    <XCircle className="h-3 w-3 mr-2" /> Cancel
                                  </DropdownMenuItem>
                                )}
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

        {/* ── SALARY STRUCTURES TAB ── */}
        <TabsContent value="structures" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{salaryStructures.length} of {enrichedEmployees.length} employees have structures</p>
            <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-500" onClick={() => openCreateStructure()}>
              <Plus className="h-3.5 w-3.5" /> Create Structure
            </Button>
          </div>

          {/* Search */}
          <GlassCard className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search employees..." value={structSearch} onChange={e => setStructSearch(e.target.value)}
                className="h-9 pl-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30" />
            </div>
          </GlassCard>

          {/* Employee List */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredStructEmployees.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <GlassCard className="p-12">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Calculator className="h-10 w-10 opacity-30" />
                      <p className="text-sm">No employees match your search</p>
                    </div>
                  </GlassCard>
                </motion.div>
              ) : (
                filteredStructEmployees.map((emp, i) => {
                  const totalAllowances = emp.salaryStructure
                    ? emp.salaryStructure.housingAllowance + emp.salaryStructure.transportAllowance + emp.salaryStructure.medicalAllowance + emp.salaryStructure.foodAllowance + emp.salaryStructure.otherAllowances
                    : 0;
                  return (
                    <motion.div
                      key={emp.user.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ delay: i * 0.03, duration: 0.3 }}
                    >
                      <GlassCard
                        hover
                        onClick={() => { setSelectedStructEmployee(emp); setStructSheetOpen(true); }}
                        className="p-4"
                      >
                        <div className="flex items-center gap-4">
                          {/* Avatar */}
                          <div className={cn(
                            'h-11 w-11 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-lg',
                            getAvatarColor(emp.user.name)
                          )}>
                            {getInitials(emp.user.name)}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-sm truncate">{emp.user.name}</h3>
                              {emp.salaryStructure ? (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                                  Has Structure
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-500/10 border-slate-500/20 text-slate-400">
                                  No Structure
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1 truncate">
                                <Briefcase className="h-3 w-3 shrink-0" />
                                {emp.user.position || 'No position'}
                              </span>
                              <span className="flex items-center gap-1 truncate">
                                <Building2 className="h-3 w-3 shrink-0" />
                                {emp.user.department || 'Unassigned'}
                              </span>
                            </div>
                          </div>

                          {/* Structure Info */}
                          <div className="hidden sm:flex items-center gap-6 shrink-0">
                            <div className="text-right">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Base Salary</p>
                              <p className="text-sm font-bold text-foreground">
                                {emp.salaryStructure ? formatCurrency(emp.salaryStructure.baseSalary) : '—'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Allow.</p>
                              <p className="text-sm font-semibold">
                                {emp.salaryStructure ? formatCurrency(totalAllowances) : '—'}
                              </p>
                            </div>
                          </div>

                          {/* Chevron */}
                          <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                        </div>
                      </GlassCard>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </TabsContent>

        {/* ── DEPT BREAKDOWN TAB ── */}
        <TabsContent value="dept" className="mt-4 space-y-4">
          {deptBarData.length === 0 ? (
            <GlassCard className="p-12">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Building2 className="h-10 w-10 opacity-30" />
                <p className="text-sm">No department breakdown data available</p>
                <p className="text-xs text-muted-foreground/60">Generate payroll to see department cost distribution</p>
              </div>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deptBarData.map((dept, i) => {
                const deptPayroll = payroll.filter(p => p.userDepartment === dept.department);
                const deptPaid = deptPayroll.filter(p => p.status === 'paid').reduce((s, p) => s + p.netSalary, 0);
                const deptPending = deptPayroll.filter(p => p.status !== 'paid' && p.status !== 'cancelled').reduce((s, p) => s + p.netSalary, 0);
                const paidPct = dept.total > 0 ? (deptPaid / dept.total) * 100 : 0;
                const barColors = [
                  'from-emerald-500 to-cyan-500',
                  'from-amber-500 to-orange-500',
                  'from-violet-500 to-purple-500',
                  'from-rose-500 to-pink-500',
                  'from-cyan-500 to-teal-500',
                  'from-lime-500 to-green-500',
                ];

                return (
                  <motion.div key={dept.department} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <GlassCard className="p-4 h-full">
                      {/* Dept Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className={cn(
                          'h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm shrink-0',
                          barColors[i % barColors.length]
                        )}>
                          {dept.department.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold truncate">{dept.department}</h3>
                          <p className="text-[10px] text-muted-foreground">{dept.employees} employees</p>
                        </div>
                      </div>

                      {/* Total Cost */}
                      <div className="rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] p-3 mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Cost</span>
                          <span className="text-sm font-bold">{formatCurrency(dept.total)}</span>
                        </div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-muted-foreground">Avg Salary</span>
                          <span className="text-xs font-medium">{formatCurrency(dept.avgSalary)}</span>
                        </div>
                      </div>

                      {/* Paid vs Pending */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-2 text-center">
                          <p className="text-[9px] text-emerald-400/80 uppercase tracking-wider">Paid</p>
                          <p className="text-xs font-bold text-emerald-400">{formatCurrency(deptPaid)}</p>
                        </div>
                        <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-2 text-center">
                          <p className="text-[9px] text-amber-400/80 uppercase tracking-wider">Pending</p>
                          <p className="text-xs font-bold text-amber-400">{formatCurrency(deptPending)}</p>
                        </div>
                      </div>

                      {/* Payment Progress */}
                      <div>
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="text-muted-foreground">Payment Progress</span>
                          <span className="font-semibold text-emerald-400">{paidPct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-black/[0.03] dark:bg-white/[0.05] overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-emerald-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${paidPct}%` }}
                            transition={{ duration: 0.8, delay: i * 0.05 }}
                          />
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══ EMPLOYEE DETAIL SHEET ═══ */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-0 flex flex-col">
          {selectedEmployee && (
            <>
              {/* ── Sheet Header ── */}
              <div className="p-6 pb-4 border-b border-black/[0.1] dark:border-white/[0.1] shrink-0">
                <SheetHeader>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'h-14 w-14 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-lg',
                      getAvatarColor(selectedEmployee.user.name)
                    )}>
                      {getInitials(selectedEmployee.user.name)}
                    </div>
                    <div className="min-w-0">
                      <SheetTitle className="text-lg">{selectedEmployee.user.name}</SheetTitle>
                      <SheetDescription className="text-sm mt-0.5">
                        {selectedEmployee.user.position || 'No position'} &middot; {selectedEmployee.user.department || 'Unassigned'}
                      </SheetDescription>
                    </div>
                  </div>
                </SheetHeader>

                {/* Quick Stats Row */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1] p-2.5 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Base Salary</p>
                    <p className="text-sm font-bold mt-0.5">
                      {selectedEmployee.salaryStructure
                        ? formatCurrency(selectedEmployee.salaryStructure.baseSalary)
                        : formatCurrency(selectedEmployee.user.salary || 0)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-center">
                    <p className="text-[10px] text-emerald-400/80 uppercase tracking-wider">Total Paid</p>
                    <p className="text-sm font-bold text-emerald-400 mt-0.5">{formatCurrency(selectedEmployee.totalPaid)}</p>
                  </div>
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-center">
                    <p className="text-[10px] text-amber-400/80 uppercase tracking-wider">Pending</p>
                    <p className="text-sm font-bold text-amber-400 mt-0.5">{formatCurrency(selectedEmployee.totalPending)}</p>
                  </div>
                </div>
              </div>

              {/* ── Sheet Tabs ── */}
              <div className="px-6 pt-4 shrink-0">
                <Tabs value={sheetTab} onValueChange={setSheetTab}>
                  <TabsList className="bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1] w-full">
                    <TabsTrigger value="overview" className="flex-1 data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">
                      <UserIcon className="h-3.5 w-3.5 mr-1" /> Overview
                    </TabsTrigger>
                    <TabsTrigger value="payroll" className="flex-1 data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">
                      <Receipt className="h-3.5 w-3.5 mr-1" /> Payroll
                    </TabsTrigger>
                    <TabsTrigger value="structure" className="flex-1 data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">
                      <Calculator className="h-3.5 w-3.5 mr-1" /> Structure
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* ── Sheet Content (Scrollable) ── */}
              <ScrollArea className="flex-1 min-h-0 px-6">
                <div className="py-4 pb-8">

                  {/* ── OVERVIEW TAB ── */}
                  {sheetTab === 'overview' && (
                    <div className="space-y-5">
                      {/* Employee Info */}
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Employee Information</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { icon: Mail, label: 'Email', value: selectedEmployee.user.email },
                            { icon: Phone, label: 'Phone', value: selectedEmployee.user.phone || 'Not set' },
                            { icon: Briefcase, label: 'Position', value: selectedEmployee.user.position || 'Not set' },
                            { icon: Building2, label: 'Department', value: selectedEmployee.user.department || 'Unassigned' },
                            { icon: CalendarDays, label: 'Join Date', value: selectedEmployee.user.joinDate ? new Date(selectedEmployee.user.joinDate).toLocaleDateString() : 'Not set' },
                            { icon: Shield, label: 'Role', value: selectedEmployee.user.role.charAt(0).toUpperCase() + selectedEmployee.user.role.slice(1) },
                          ].map(item => (
                            <div key={item.label} className="flex items-start gap-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] p-3">
                              <item.icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[10px] text-muted-foreground">{item.label}</p>
                                <p className="text-xs font-medium truncate">{item.value}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Separator className="bg-black/[0.06] dark:bg-white/[0.1]" />

                      {/* Salary Structure Summary */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Salary Structure</h4>
                          {!selectedEmployee.salaryStructure ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                              onClick={() => openCreateStructure(selectedEmployee.user.id)}
                            >
                              <Plus className="h-3 w-3" /> Create Structure
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] gap-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                              onClick={() => openEditStructure(selectedEmployee)}
                            >
                              <Edit className="h-3 w-3" /> Edit Structure
                            </Button>
                          )}
                        </div>
                        {selectedEmployee.salaryStructure ? (
                          <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Base Salary</span>
                              <span className="text-sm font-bold text-emerald-400">{formatCurrencyFull(selectedEmployee.salaryStructure.baseSalary)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { label: 'Housing', value: selectedEmployee.salaryStructure.housingAllowance },
                                { label: 'Transport', value: selectedEmployee.salaryStructure.transportAllowance },
                                { label: 'Medical', value: selectedEmployee.salaryStructure.medicalAllowance },
                                { label: 'Food', value: selectedEmployee.salaryStructure.foodAllowance },
                              ].map(a => (
                                <div key={a.label} className="flex justify-between text-xs bg-black/[0.01] dark:bg-white/[0.02] rounded-md px-2.5 py-1.5">
                                  <span className="text-muted-foreground">{a.label}</span>
                                  <span className="font-medium">{formatCurrency(a.value)}</span>
                                </div>
                              ))}
                            </div>
                            <Separator className="bg-black/[0.04] dark:bg-white/[0.06]" />
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { label: 'Tax %', value: `${selectedEmployee.salaryStructure.taxPercentage}%` },
                                { label: 'Insurance %', value: `${selectedEmployee.salaryStructure.insuranceRate}%` },
                                { label: 'PF %', value: `${selectedEmployee.salaryStructure.providentFundRate}%` },
                              ].map(s => (
                                <div key={s.label} className="text-center bg-black/[0.01] dark:bg-white/[0.02] rounded-md px-2 py-1.5">
                                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                                  <p className="text-xs font-semibold">{s.value}</p>
                                </div>
                              ))}
                            </div>
                            {/* Bank Details in Overview */}
                            {(selectedEmployee.salaryStructure.bankName || selectedEmployee.salaryStructure.bankAccount) && (
                              <>
                                <Separator className="bg-black/[0.04] dark:bg-white/[0.06]" />
                                <div className="space-y-1.5">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Bank & Payment</p>
                                  {selectedEmployee.salaryStructure.bankName && (
                                    <div className="flex justify-between text-xs">
                                      <span className="text-muted-foreground">Bank</span>
                                      <span className="font-medium">{selectedEmployee.salaryStructure.bankName}</span>
                                    </div>
                                  )}
                                  {selectedEmployee.salaryStructure.bankAccount && (
                                    <div className="flex justify-between text-xs">
                                      <span className="text-muted-foreground">Account</span>
                                      <span className="font-mono">{selectedEmployee.salaryStructure.bankAccount}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Payment</span>
                                    <span className="font-medium">{paymentMethodLabel[selectedEmployee.salaryStructure.paymentMethod] || selectedEmployee.salaryStructure.paymentMethod}</span>
                                  </div>
                                </div>
                              </>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                              <Clock4 className="h-3 w-3" />
                              <span>Effective from {new Date(selectedEmployee.salaryStructure.effectiveFrom).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-dashed border-black/[0.1] dark:border-white/[0.1] p-6 text-center">
                            <Calculator className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">No salary structure configured</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-1">Create a structure to enable automated payroll calculation</p>
                          </div>
                        )}
                      </div>

                      <Separator className="bg-black/[0.06] dark:bg-white/[0.1]" />

                      {/* Latest Payroll Summary */}
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Latest Payroll</h4>
                        {selectedEmployee.latestPayroll ? (
                          <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] p-4 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Month</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">{selectedEmployee.latestPayroll.month}</span>
                                {(() => {
                                  const s = statusConfig[selectedEmployee.latestPayroll.status];
                                  return s ? (
                                    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border', s.bg, s.color)}>{s.label}</Badge>
                                  ) : null;
                                })()}
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Gross Salary</span>
                              <span className="text-sm font-semibold">{formatCurrencyFull(selectedEmployee.latestPayroll.grossSalary)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Total Deductions</span>
                              <span className="text-sm font-semibold text-rose-400">-{formatCurrencyFull(selectedEmployee.latestPayroll.deductions)}</span>
                            </div>
                            <Separator className="bg-black/[0.04] dark:bg-white/[0.06]" />
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium">Net Salary</span>
                              <span className="text-base font-bold text-emerald-400">{formatCurrencyFull(selectedEmployee.latestPayroll.netSalary)}</span>
                            </div>
                            <div className="flex gap-2 pt-2">
                              <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1" onClick={() => openEdit(selectedEmployee.latestPayroll!)}>
                                <Edit className="h-3 w-3" /> Edit Record
                              </Button>
                              {selectedEmployee.latestPayroll.status === 'draft' && (
                                <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                                  onClick={() => handleStatusUpdate(selectedEmployee.latestPayroll!.id, 'reviewed')}>
                                  <Eye className="h-3 w-3" /> Review
                                </Button>
                              )}
                              {selectedEmployee.latestPayroll.status === 'reviewed' && (
                                <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                                  onClick={() => handleStatusUpdate(selectedEmployee.latestPayroll!.id, 'approved')}>
                                  <CheckCircle2 className="h-3 w-3" /> Approve
                                </Button>
                              )}
                              {selectedEmployee.latestPayroll.status === 'approved' && (
                                <Button size="sm" className="flex-1 h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-500"
                                  onClick={() => handleStatusUpdate(selectedEmployee.latestPayroll!.id, 'paid')}>
                                  <DollarSign className="h-3 w-3" /> Mark Paid
                                </Button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-dashed border-black/[0.1] dark:border-white/[0.1] p-6 text-center">
                            <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">No payroll records yet</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-1">Generate payroll for this employee to see records</p>
                          </div>
                        )}
                      </div>

                      {/* Bank Details */}
                      {selectedEmployee.salaryStructure?.bankName && (
                        <>
                          <Separator className="bg-black/[0.06] dark:bg-white/[0.1]" />
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Bank Details</h4>
                            <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Bank</span>
                                <span className="text-xs font-medium">{selectedEmployee.salaryStructure.bankName}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Account</span>
                                <span className="text-xs font-mono">{selectedEmployee.salaryStructure.bankAccount}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Payment Method</span>
                                <span className="text-xs font-medium">{paymentMethodLabel[selectedEmployee.salaryStructure.paymentMethod] || selectedEmployee.salaryStructure.paymentMethod}</span>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* ── PAYROLL TAB ── */}
                  {sheetTab === 'payroll' && (
                    <div className="space-y-3">
                      {selectedEmployee.payrollRecords.length === 0 ? (
                        <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-dashed border-black/[0.1] dark:border-white/[0.1] p-8 text-center">
                          <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">No payroll records</p>
                          <p className="text-xs text-muted-foreground/60 mt-1">Generate payroll to create records for this employee</p>
                        </div>
                      ) : (
                        selectedEmployee.payrollRecords.map((record) => {
                          const sInfo = statusConfig[record.status];
                          return (
                            <motion.div
                              key={record.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] p-4"
                            >
                              {/* Record Header */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-sm font-semibold">{record.month}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {sInfo && (
                                    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border', sInfo.bg, sInfo.color)}>
                                      {sInfo.label}
                                    </Badge>
                                  )}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => openEdit(record)}>
                                        <Edit className="h-3 w-3 mr-2" /> Edit Record
                                      </DropdownMenuItem>
                                      {record.status === 'draft' && (
                                        <DropdownMenuItem onClick={() => handleStatusUpdate(record.id, 'reviewed')}>
                                          <Eye className="h-3 w-3 mr-2" /> Review
                                        </DropdownMenuItem>
                                      )}
                                      {record.status === 'reviewed' && (
                                        <DropdownMenuItem onClick={() => handleStatusUpdate(record.id, 'approved')}>
                                          <CheckCircle2 className="h-3 w-3 mr-2" /> Approve
                                        </DropdownMenuItem>
                                      )}
                                      {record.status === 'approved' && (
                                        <DropdownMenuItem onClick={() => handleStatusUpdate(record.id, 'paid')}>
                                          <DollarSign className="h-3 w-3 mr-2" /> Mark Paid
                                        </DropdownMenuItem>
                                      )}
                                      {!['on-hold', 'cancelled', 'paid'].includes(record.status) && (
                                        <DropdownMenuItem onClick={() => handleStatusUpdate(record.id, 'on-hold')}>
                                          <PauseCircle className="h-3 w-3 mr-2" /> Put On Hold
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>

                              {/* Earnings */}
                              <div className="space-y-1.5 mb-3">
                                <p className="text-[10px] font-semibold text-emerald-400/80 uppercase tracking-wider">Earnings</p>
                                {[
                                  { label: 'Base Salary', value: record.baseSalary },
                                  { label: 'Overtime', value: record.overtime },
                                  { label: 'Allowances', value: record.allowances },
                                  { label: 'Bonus', value: record.bonus },
                                ].map(e => (
                                  <div key={e.label} className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">{e.label}</span>
                                    <span className="font-medium">{formatCurrencyFull(e.value)}</span>
                                  </div>
                                ))}
                                <div className="flex items-center justify-between text-xs pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
                                  <span className="font-medium">Gross</span>
                                  <span className="font-semibold text-emerald-400">{formatCurrencyFull(record.grossSalary)}</span>
                                </div>
                              </div>

                              {/* Deductions */}
                              <div className="space-y-1.5 mb-3">
                                <p className="text-[10px] font-semibold text-rose-400/80 uppercase tracking-wider">Deductions</p>
                                {[
                                  { label: 'Tax', value: record.tax },
                                  { label: 'Insurance', value: record.insurance },
                                  { label: 'Provident Fund', value: record.providentFund },
                                  { label: 'Other', value: record.otherDeductions },
                                ].map(d => (
                                  <div key={d.label} className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">{d.label}</span>
                                    <span className="font-medium text-rose-400/80">-{formatCurrencyFull(d.value)}</span>
                                  </div>
                                ))}
                                <div className="flex items-center justify-between text-xs pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
                                  <span className="font-medium">Total Deductions</span>
                                  <span className="font-semibold text-rose-400">-{formatCurrencyFull(record.deductions)}</span>
                                </div>
                              </div>

                              {/* Net Pay */}
                              <div className="rounded-lg bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 p-3 flex items-center justify-between">
                                <span className="text-sm font-semibold">Net Pay</span>
                                <span className="text-lg font-bold text-emerald-400">{formatCurrencyFull(record.netSalary)}</span>
                              </div>

                              {/* Payment & Notes */}
                              {(record.paymentMethod || record.notes) && (
                                <div className="mt-3 space-y-1.5">
                                  {record.paymentMethod && (
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">Payment</span>
                                      <span className="font-medium">{paymentMethodLabel[record.paymentMethod] || record.paymentMethod}</span>
                                    </div>
                                  )}
                                  {record.notes && (
                                    <div className="text-xs">
                                      <span className="text-muted-foreground">Notes: </span>
                                      <span>{record.notes}</span>
                                    </div>
                                  )}
                                  {record.generatedAt && (
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">Generated</span>
                                      <span>{new Date(record.generatedAt).toLocaleDateString()}</span>
                                    </div>
                                  )}
                                  {record.paidAt && (
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">Paid On</span>
                                      <span>{new Date(record.paidAt).toLocaleDateString()}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex gap-2 mt-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
                                <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px] gap-1" onClick={() => openEdit(record)}>
                                  <Edit className="h-3 w-3" /> Edit
                                </Button>
                                {record.status === 'draft' && (
                                  <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px] gap-1 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                                    onClick={() => handleStatusUpdate(record.id, 'reviewed')}>
                                    <Eye className="h-3 w-3" /> Review
                                  </Button>
                                )}
                                {record.status === 'reviewed' && (
                                  <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px] gap-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                                    onClick={() => handleStatusUpdate(record.id, 'approved')}>
                                    <CheckCircle2 className="h-3 w-3" /> Approve
                                  </Button>
                                )}
                                {record.status === 'approved' && (
                                  <Button size="sm" className="flex-1 h-7 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-500"
                                    onClick={() => handleStatusUpdate(record.id, 'paid')}>
                                    <DollarSign className="h-3 w-3" /> Pay
                                  </Button>
                                )}
                                {!['paid', 'cancelled'].includes(record.status) && (
                                  <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                                    onClick={() => handleStatusUpdate(record.id, 'cancelled')}>
                                    <Ban className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* ── STRUCTURE TAB ── */}
                  {sheetTab === 'structure' && (
                    <div className="space-y-4">
                      {selectedEmployee.salaryStructure ? (
                        <>
                          {/* Full Structure Details */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Salary Breakdown</h4>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[10px] gap-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                                  onClick={() => openEditStructure(selectedEmployee)}
                                >
                                  <Edit className="h-3 w-3" /> Edit Structure
                                </Button>
                                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-[10px]">Active</Badge>
                              </div>
                            </div>
                            <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] overflow-hidden">
                              {/* Base Salary */}
                              <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-b border-black/[0.06] dark:border-white/[0.06]">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <CircleDollarSign className="h-4 w-4 text-emerald-400" />
                                    <span className="text-sm font-medium">Base Salary</span>
                                  </div>
                                  <span className="text-xl font-bold text-emerald-400">{formatCurrencyFull(selectedEmployee.salaryStructure.baseSalary)}</span>
                                </div>
                              </div>

                              {/* Allowances */}
                              <div className="p-4 border-b border-black/[0.06] dark:border-white/[0.06]">
                                <p className="text-[10px] font-semibold text-cyan-400/80 uppercase tracking-wider mb-2">Allowances</p>
                                <div className="space-y-2">
                                  {[
                                    { label: 'Housing Allowance', value: selectedEmployee.salaryStructure.housingAllowance },
                                    { label: 'Transport Allowance', value: selectedEmployee.salaryStructure.transportAllowance },
                                    { label: 'Medical Allowance', value: selectedEmployee.salaryStructure.medicalAllowance },
                                    { label: 'Food Allowance', value: selectedEmployee.salaryStructure.foodAllowance },
                                    { label: 'Other Allowances', value: selectedEmployee.salaryStructure.otherAllowances },
                                  ].map(a => (
                                    <div key={a.label} className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">{a.label}</span>
                                      <span className="font-medium">{formatCurrencyFull(a.value)}</span>
                                    </div>
                                  ))}
                                  <div className="flex items-center justify-between text-xs pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                                    <span className="font-medium">Total Allowances</span>
                                    <span className="font-semibold text-cyan-400">
                                      {formatCurrencyFull(
                                        selectedEmployee.salaryStructure.housingAllowance +
                                        selectedEmployee.salaryStructure.transportAllowance +
                                        selectedEmployee.salaryStructure.medicalAllowance +
                                        selectedEmployee.salaryStructure.foodAllowance +
                                        selectedEmployee.salaryStructure.otherAllowances
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Deduction Rates */}
                              <div className="p-4 border-b border-black/[0.06] dark:border-white/[0.06]">
                                <p className="text-[10px] font-semibold text-rose-400/80 uppercase tracking-wider mb-2">Deduction Rates</p>
                                <div className="space-y-2">
                                  {[
                                    { label: 'Tax Rate', value: selectedEmployee.salaryStructure.taxPercentage, icon: Percent },
                                    { label: 'Insurance Rate', value: selectedEmployee.salaryStructure.insuranceRate, icon: Shield },
                                    { label: 'Provident Fund Rate', value: selectedEmployee.salaryStructure.providentFundRate, icon: Landmark },
                                  ].map(d => (
                                    <div key={d.label} className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground flex items-center gap-1.5">
                                        <d.icon className="h-3 w-3" /> {d.label}
                                      </span>
                                      <span className="font-medium">{d.value}%</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Overtime */}
                              <div className="p-4 border-b border-black/[0.06] dark:border-white/[0.06]">
                                <p className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wider mb-2">Overtime</p>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Overtime Rate (per hour)</span>
                                  <span className="font-medium">{formatCurrencyFull(selectedEmployee.salaryStructure.overtimeRate)}</span>
                                </div>
                              </div>

                              {/* Payment & Bank */}
                              <div className="p-4">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment Details</p>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Payment Method</span>
                                    <span className="font-medium">{paymentMethodLabel[selectedEmployee.salaryStructure.paymentMethod] || selectedEmployee.salaryStructure.paymentMethod}</span>
                                  </div>
                                  {selectedEmployee.salaryStructure.bankName && (
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">Bank Name</span>
                                      <span className="font-medium">{selectedEmployee.salaryStructure.bankName}</span>
                                    </div>
                                  )}
                                  {selectedEmployee.salaryStructure.bankAccount && (
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">Account Number</span>
                                      <span className="font-mono text-xs">{selectedEmployee.salaryStructure.bankAccount}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Effective From</span>
                                    <span className="font-medium">{new Date(selectedEmployee.salaryStructure.effectiveFrom).toLocaleDateString()}</span>
                                  </div>
                                  {selectedEmployee.salaryStructure.effectiveTo && (
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">Effective To</span>
                                      <span className="font-medium">{new Date(selectedEmployee.salaryStructure.effectiveTo).toLocaleDateString()}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-dashed border-black/[0.1] dark:border-white/[0.1] p-8 text-center">
                          <Calculator className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                          <p className="text-sm font-medium text-muted-foreground">No Salary Structure</p>
                          <p className="text-xs text-muted-foreground/60 mt-1 mb-4">Set up a salary structure to define compensation, allowances, and deduction rates</p>
                          <Button
                            size="sm"
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-500"
                            onClick={() => openCreateStructure(selectedEmployee.user.id)}
                          >
                            <Plus className="h-3.5 w-3.5" /> Create Salary Structure
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ═══ PAYROLL RECORD DETAIL SHEET ═══ */}
      <Sheet open={recordDetailOpen} onOpenChange={setRecordDetailOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
          {selectedRecord && (
            <>
              <div className="p-6 pb-4 border-b border-black/[0.1] dark:border-white/[0.1] shrink-0">
                <SheetHeader>
                  <SheetTitle className="text-lg flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-emerald-400" />
                    Payroll Record — {selectedRecord.month}
                  </SheetTitle>
                  <SheetDescription>
                    {selectedRecord.userName} &middot; {selectedRecord.userDepartment || 'Unassigned'}
                  </SheetDescription>
                </SheetHeader>
                {/* Status badge */}
                <div className="mt-3">
                  {(() => {
                    const s = statusConfig[selectedRecord.status];
                    return s ? <Badge variant="outline" className={cn('text-xs px-2 py-0.5 border', s.bg, s.color)}>{s.label}</Badge> : null;
                  })()}
                </div>
              </div>
              <ScrollArea className="flex-1 min-h-0 px-6">
                <div className="py-4 pb-8 space-y-5">
                  {/* Earnings section */}
                  <div>
                    <h4 className="text-xs font-semibold text-emerald-400/80 uppercase tracking-wider mb-3">Earnings</h4>
                    <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] p-4 space-y-2">
                      {[
                        { label: 'Base Salary', value: selectedRecord.baseSalary },
                        { label: 'Overtime', value: selectedRecord.overtime },
                        { label: 'Allowances', value: selectedRecord.allowances },
                        { label: 'Bonus', value: selectedRecord.bonus },
                      ].map(e => (
                        <div key={e.label} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{e.label}</span>
                          <span className="font-medium">{formatCurrencyFull(e.value)}</span>
                        </div>
                      ))}
                      <Separator className="bg-black/[0.04] dark:bg-white/[0.06]" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Gross Salary</span>
                        <span className="font-bold text-emerald-400">{formatCurrencyFull(selectedRecord.grossSalary)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions section */}
                  <div>
                    <h4 className="text-xs font-semibold text-rose-400/80 uppercase tracking-wider mb-3">Deductions</h4>
                    <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] p-4 space-y-2">
                      {[
                        { label: 'Tax', value: selectedRecord.tax },
                        { label: 'Insurance', value: selectedRecord.insurance },
                        { label: 'Provident Fund', value: selectedRecord.providentFund },
                        { label: 'Other Deductions', value: selectedRecord.otherDeductions },
                      ].map(d => (
                        <div key={d.label} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{d.label}</span>
                          <span className="font-medium text-rose-400/80">-{formatCurrencyFull(d.value)}</span>
                        </div>
                      ))}
                      <Separator className="bg-black/[0.04] dark:bg-white/[0.06]" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Total Deductions</span>
                        <span className="font-bold text-rose-400">-{formatCurrencyFull(selectedRecord.deductions)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Net Pay highlight */}
                  <div className="rounded-xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 p-4 flex items-center justify-between">
                    <span className="text-sm font-semibold">Net Pay</span>
                    <span className="text-xl font-bold text-emerald-400">{formatCurrencyFull(selectedRecord.netSalary)}</span>
                  </div>

                  {/* Details section */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Details</h4>
                    <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] p-4 space-y-2">
                      {[
                        { label: 'Employee', value: selectedRecord.userName || 'Unknown' },
                        { label: 'Department', value: selectedRecord.userDepartment || 'Unassigned' },
                        { label: 'Position', value: selectedRecord.userPosition || 'N/A' },
                        { label: 'Month', value: selectedRecord.month },
                        { label: 'Payment Method', value: paymentMethodLabel[selectedRecord.paymentMethod] || selectedRecord.paymentMethod },
                        ...(selectedRecord.bankName ? [{ label: 'Bank', value: selectedRecord.bankName }] : []),
                        ...(selectedRecord.bankAccount ? [{ label: 'Account', value: selectedRecord.bankAccount }] : []),
                        { label: 'Generated', value: selectedRecord.generatedAt ? new Date(selectedRecord.generatedAt).toLocaleDateString() : 'N/A' },
                        ...(selectedRecord.reviewedAt ? [{ label: 'Reviewed', value: new Date(selectedRecord.reviewedAt).toLocaleDateString() }] : []),
                        ...(selectedRecord.approvedAt ? [{ label: 'Approved', value: new Date(selectedRecord.approvedAt).toLocaleDateString() }] : []),
                        ...(selectedRecord.paidAt ? [{ label: 'Paid On', value: new Date(selectedRecord.paidAt).toLocaleDateString() }] : []),
                        ...(selectedRecord.notes ? [{ label: 'Notes', value: selectedRecord.notes }] : []),
                      ].map(d => (
                        <div key={d.label} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{d.label}</span>
                          <span className="font-medium text-right max-w-[60%] truncate">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 h-9 text-xs gap-1.5" onClick={() => { setRecordDetailOpen(false); openEdit(selectedRecord!); }}>
                      <Edit className="h-3.5 w-3.5" /> Edit Record
                    </Button>
                    {selectedRecord.status === 'draft' && (
                      <Button size="sm" variant="outline" className="flex-1 h-9 text-xs gap-1.5 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                        onClick={() => handleStatusUpdate(selectedRecord.id, 'reviewed')}>
                        <Eye className="h-3.5 w-3.5" /> Review
                      </Button>
                    )}
                    {selectedRecord.status === 'reviewed' && (
                      <Button size="sm" variant="outline" className="flex-1 h-9 text-xs gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                        onClick={() => handleStatusUpdate(selectedRecord.id, 'approved')}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </Button>
                    )}
                    {selectedRecord.status === 'approved' && (
                      <Button size="sm" className="flex-1 h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500"
                        onClick={() => handleStatusUpdate(selectedRecord.id, 'paid')}>
                        <DollarSign className="h-3.5 w-3.5" /> Mark Paid
                      </Button>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ═══ SALARY STRUCTURE DETAIL SHEET ═══ */}
      <Sheet open={structSheetOpen} onOpenChange={setStructSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
          {selectedStructEmployee && (
            <>
              <div className="p-6 pb-4 border-b border-black/[0.1] dark:border-white/[0.1] shrink-0">
                <SheetHeader>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'h-12 w-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-lg',
                      getAvatarColor(selectedStructEmployee.user.name)
                    )}>
                      {getInitials(selectedStructEmployee.user.name)}
                    </div>
                    <div className="min-w-0">
                      <SheetTitle>Salary Structure</SheetTitle>
                      <SheetDescription>{selectedStructEmployee.user.name} — {selectedStructEmployee.user.department || 'Unassigned'}</SheetDescription>
                    </div>
                  </div>
                </SheetHeader>
              </div>
              <ScrollArea className="flex-1 min-h-0 px-6">
                <div className="py-4 pb-8">
                  {selectedStructEmployee.salaryStructure ? (
                    <div className="space-y-4">
                      {/* Base Salary Hero */}
                      <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] overflow-hidden">
                        <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-b border-black/[0.06] dark:border-white/[0.06]">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CircleDollarSign className="h-4 w-4 text-emerald-400" />
                              <span className="text-sm font-medium">Base Salary</span>
                            </div>
                            <span className="text-xl font-bold text-emerald-400">{formatCurrencyFull(selectedStructEmployee.salaryStructure.baseSalary)}</span>
                          </div>
                        </div>

                        {/* Allowances */}
                        <div className="p-4 border-b border-black/[0.06] dark:border-white/[0.06]">
                          <p className="text-[10px] font-semibold text-cyan-400/80 uppercase tracking-wider mb-2">Allowances</p>
                          <div className="space-y-2">
                            {[
                              { label: 'Housing Allowance', value: selectedStructEmployee.salaryStructure.housingAllowance },
                              { label: 'Transport Allowance', value: selectedStructEmployee.salaryStructure.transportAllowance },
                              { label: 'Medical Allowance', value: selectedStructEmployee.salaryStructure.medicalAllowance },
                              { label: 'Food Allowance', value: selectedStructEmployee.salaryStructure.foodAllowance },
                              { label: 'Other Allowances', value: selectedStructEmployee.salaryStructure.otherAllowances },
                            ].map(a => (
                              <div key={a.label} className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{a.label}</span>
                                <span className="font-medium">{formatCurrencyFull(a.value)}</span>
                              </div>
                            ))}
                            <div className="flex items-center justify-between text-xs pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                              <span className="font-medium">Total Allowances</span>
                              <span className="font-semibold text-cyan-400">
                                {formatCurrencyFull(
                                  selectedStructEmployee.salaryStructure.housingAllowance +
                                  selectedStructEmployee.salaryStructure.transportAllowance +
                                  selectedStructEmployee.salaryStructure.medicalAllowance +
                                  selectedStructEmployee.salaryStructure.foodAllowance +
                                  selectedStructEmployee.salaryStructure.otherAllowances
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Deduction Rates */}
                        <div className="p-4 border-b border-black/[0.06] dark:border-white/[0.06]">
                          <p className="text-[10px] font-semibold text-rose-400/80 uppercase tracking-wider mb-2">Deduction Rates</p>
                          <div className="space-y-2">
                            {[
                              { label: 'Tax Rate', value: selectedStructEmployee.salaryStructure.taxPercentage, icon: Percent },
                              { label: 'Insurance Rate', value: selectedStructEmployee.salaryStructure.insuranceRate, icon: Shield },
                              { label: 'Provident Fund Rate', value: selectedStructEmployee.salaryStructure.providentFundRate, icon: Landmark },
                            ].map(d => (
                              <div key={d.label} className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground flex items-center gap-1.5">
                                  <d.icon className="h-3 w-3" /> {d.label}
                                </span>
                                <span className="font-medium">{d.value}%</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Overtime */}
                        <div className="p-4 border-b border-black/[0.06] dark:border-white/[0.06]">
                          <p className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wider mb-2">Overtime</p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Overtime Rate (per hour)</span>
                            <span className="font-medium">{formatCurrencyFull(selectedStructEmployee.salaryStructure.overtimeRate)}</span>
                          </div>
                        </div>

                        {/* Payment & Bank */}
                        <div className="p-4">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment Details</p>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Payment Method</span>
                              <span className="font-medium">{paymentMethodLabel[selectedStructEmployee.salaryStructure.paymentMethod] || selectedStructEmployee.salaryStructure.paymentMethod}</span>
                            </div>
                            {selectedStructEmployee.salaryStructure.bankName && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Bank Name</span>
                                <span className="font-medium">{selectedStructEmployee.salaryStructure.bankName}</span>
                              </div>
                            )}
                            {selectedStructEmployee.salaryStructure.bankAccount && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Account Number</span>
                                <span className="font-mono text-xs">{selectedStructEmployee.salaryStructure.bankAccount}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Effective From</span>
                              <span className="font-medium">{new Date(selectedStructEmployee.salaryStructure.effectiveFrom).toLocaleDateString()}</span>
                            </div>
                            {selectedStructEmployee.salaryStructure.effectiveTo && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Effective To</span>
                                <span className="font-medium">{new Date(selectedStructEmployee.salaryStructure.effectiveTo).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-dashed border-black/[0.1] dark:border-white/[0.1] p-8 text-center">
                      <Calculator className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm font-medium text-muted-foreground">No Salary Structure</p>
                      <p className="text-xs text-muted-foreground/60 mt-1 mb-4">Set up a salary structure to define compensation, allowances, and deduction rates</p>
                      <Button
                        size="sm"
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-500"
                        onClick={() => openCreateStructure(selectedStructEmployee.user.id)}
                      >
                        <Plus className="h-3.5 w-3.5" /> Create Salary Structure
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ═══ GENERATE PAYROLL DIALOG ═══ */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="rounded-lg p-2 bg-emerald-500/10">
                <Plus className="h-4 w-4 text-emerald-400" />
              </div>
              Generate Payroll
            </DialogTitle>
            <DialogDescription>Generate payroll records for a specific month and department.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs">Month</Label>
              <Input type="month" value={generateMonth} onChange={e => setGenerateMonth(e.target.value)}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Department (optional)</Label>
              <Select value={generateDept} onValueChange={setGenerateDept}>
                <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="All Departments" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {deptOptions.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleGenerate} disabled={generating} className="bg-emerald-600 hover:bg-emerald-500 gap-1.5">
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ EDIT PAYROLL RECORD DIALOG ═══ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="rounded-lg p-2 bg-amber-500/10">
                <Edit className="h-4 w-4 text-amber-400" />
              </div>
              Edit Payroll Record
            </DialogTitle>
            <DialogDescription>
              {editRecord && `Editing ${editRecord.month} payroll for ${editRecord.userName || 'employee'}`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
          {editRecord && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] p-3 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Base Salary</span><span>{formatCurrencyFull(editRecord.baseSalary)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Allowances</span><span>{formatCurrencyFull(editRecord.allowances)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="text-rose-400">-{formatCurrencyFull(editRecord.tax)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Insurance</span><span className="text-rose-400">-{formatCurrencyFull(editRecord.insurance)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Provident Fund</span><span className="text-rose-400">-{formatCurrencyFull(editRecord.providentFund)}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Overtime</Label>
                  <Input type="number" value={editForm.overtime} onChange={e => setEditForm(f => ({ ...f, overtime: e.target.value }))}
                    className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Bonus</Label>
                  <Input type="number" value={editForm.bonus} onChange={e => setEditForm(f => ({ ...f, bonus: e.target.value }))}
                    className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Other Deductions</Label>
                <Input type="number" value={editForm.otherDeductions} onChange={e => setEditForm(f => ({ ...f, otherDeductions: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Notes</Label>
                <Textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] min-h-[60px]" placeholder="Optional notes..." />
              </div>
              {editPreview && (
                <div className="rounded-lg bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 p-3 space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">New Gross</span><span className="font-medium">{formatCurrencyFull(editPreview.gross)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">New Deductions</span><span className="font-medium text-rose-400">-{formatCurrencyFull(editPreview.deductions)}</span></div>
                  <div className="flex justify-between pt-1 border-t border-black/[0.06] dark:border-white/[0.06]"><span className="font-medium">New Net</span><span className="font-bold text-emerald-400">{formatCurrencyFull(editPreview.net)}</span></div>
                </div>
              )}
            </div>
          )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleEditSave} className="bg-emerald-600 hover:bg-emerald-500 gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ CREATE/EDIT SALARY STRUCTURE DIALOG ═══ */}
      <Dialog open={structOpen} onOpenChange={(open) => { setStructOpen(open); if (!open) setEditingStructId(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="rounded-lg p-2 bg-cyan-500/10">
                <Calculator className="h-4 w-4 text-cyan-400" />
              </div>
              {editingStructId ? 'Edit Salary Structure' : 'Create Salary Structure'}
            </DialogTitle>
            <DialogDescription>{editingStructId ? 'Update salary components, allowances, and deduction rates.' : 'Define salary components, allowances, and deduction rates for an employee.'}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 py-2">
            {/* Employee */}
            {!structForm.userId && (
              <div className="space-y-2">
                <Label className="text-xs">Employee</Label>
                <Select value={structForm.userId} onValueChange={v => setStructForm(f => ({ ...f, userId: v }))}>
                  <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {users.filter(u => u.isActive !== false).map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name} — {u.position || 'No position'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {structForm.userId && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-medium">{users.find(u => u.id === structForm.userId)?.name}</span>
              </div>
            )}

            {/* Base Salary & Overtime */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Base Salary *</Label>
                <Input type="number" value={structForm.baseSalary} onChange={e => setStructForm(f => ({ ...f, baseSalary: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Overtime Rate /hr</Label>
                <Input type="number" value={structForm.overtimeRate} onChange={e => setStructForm(f => ({ ...f, overtimeRate: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" placeholder="0" />
              </div>
            </div>

            {/* Allowances */}
            <div>
              <p className="text-[10px] font-semibold text-cyan-400/80 uppercase tracking-wider mb-2">Allowances</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'housingAllowance', label: 'Housing' },
                  { key: 'transportAllowance', label: 'Transport' },
                  { key: 'medicalAllowance', label: 'Medical' },
                  { key: 'foodAllowance', label: 'Food' },
                  { key: 'otherAllowances', label: 'Other' },
                ].map(a => (
                  <div key={a.key} className="space-y-1">
                    <Label className="text-[10px]">{a.label}</Label>
                    <Input type="number" value={(structForm as any)[a.key]} onChange={e => setStructForm(f => ({ ...f, [a.key]: e.target.value }))}
                      className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-8 text-xs" placeholder="0" />
                  </div>
                ))}
              </div>
            </div>

            {/* Deduction Rates */}
            <div>
              <p className="text-[10px] font-semibold text-rose-400/80 uppercase tracking-wider mb-2">Deduction Rates</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'taxPercentage', label: 'Tax %' },
                  { key: 'insuranceRate', label: 'Insurance %' },
                  { key: 'providentFundRate', label: 'PF %' },
                ].map(d => (
                  <div key={d.key} className="space-y-1">
                    <Label className="text-[10px]">{d.label}</Label>
                    <Input type="number" value={(structForm as any)[d.key]} onChange={e => setStructForm(f => ({ ...f, [d.key]: e.target.value }))}
                      className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-8 text-xs" placeholder="0" />
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Details */}
            <div>
              <p className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wider mb-2">Payment Details</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-[10px]">Payment Method</Label>
                  <Select value={structForm.paymentMethod} onValueChange={v => setStructForm(f => ({ ...f, paymentMethod: v as SalaryStructure['paymentMethod'] }))}>
                    <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="digital-wallet">Digital Wallet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Bank Name</Label>
                    <Input value={structForm.bankName} onChange={e => setStructForm(f => ({ ...f, bankName: e.target.value }))}
                      className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-8 text-xs" placeholder="Bank name" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Account Number</Label>
                    <Input value={structForm.bankAccount} onChange={e => setStructForm(f => ({ ...f, bankAccount: e.target.value }))}
                      className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-8 text-xs" placeholder="Account no." />
                  </div>
                </div>
              </div>
            </div>

            {/* Effective Date */}
            <div className="space-y-2">
              <Label className="text-xs">Effective From *</Label>
              <Input type="date" value={structForm.effectiveFrom} onChange={e => setStructForm(f => ({ ...f, effectiveFrom: e.target.value }))}
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
            </div>
          </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStructOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleSaveStructure} className="bg-emerald-600 hover:bg-emerald-500 gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> {editingStructId ? 'Update Structure' : 'Create Structure'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
