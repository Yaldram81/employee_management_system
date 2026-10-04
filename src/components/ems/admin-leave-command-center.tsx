'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays, addDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import type { TimelineLeave, LeaveBalanceRecord, LeavePolicy, CompanyHoliday } from '@/lib/types';
import {
  Users, AlertTriangle, DollarSign, Shield, Lock, Unlock,
  CalendarDays, Plus, Trash2, RefreshCw, Loader2, CheckCircle2,
  XCircle, Clock, TrendingUp, Eye, Edit3, ChevronRight,
  FileText, Settings2, Zap, ChevronLeft, ChevronRightIcon,
  AlertCircle, RotateCcw, Download, Search, Filter, ArrowUpDown,
  BarChart3, PieChart, Activity, Banknote, Upload, Mail,
  Phone, TrendingDown, Minus, CheckSquare, Square, ArrowUpRight,
  ArrowDownRight, Target, Briefcase, User, Hash,
} from 'lucide-react';
import { formatCurrency } from './shared';

// ─── SVG Progress Ring ─────────────────────────────────────────
function Ring({ value, max, size = 56, strokeWidth = 5, color = '#10b981' }: {
  value: number; max: number; size?: number; strokeWidth?: number; color?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        className="transition-all duration-700 ease-out" />
    </svg>
  );
}

// ─── Leave type color helper ──────────────────────────────────
const typeColors: Record<string, string> = {
  SICK: '#f43f5e', CASUAL: '#f59e0b', VACATION: '#10b981',
  MATERNITY: '#ec4899', PATERNITY: '#8b5cf6', UNPAID: '#64748b',
};

const typeLabels: Record<string, string> = {
  SICK: 'Sick', CASUAL: 'Casual', VACATION: 'Vacation',
  MATERNITY: 'Maternity', PATERNITY: 'Paternity', UNPAID: 'Unpaid',
};

const typeBgColors: Record<string, string> = {
  SICK: 'bg-rose-500/10', CASUAL: 'bg-amber-500/10', VACATION: 'bg-emerald-500/10',
  MATERNITY: 'bg-pink-500/10', PATERNITY: 'bg-violet-500/10', UNPAID: 'bg-slate-500/10',
};

const statusColors: Record<string, string> = {
  APPROVED: 'text-emerald-400', PENDING: 'text-amber-400', REJECTED: 'text-rose-400',
};

const statusBorderColors: Record<string, string> = {
  APPROVED: 'border-emerald-500/20', PENDING: 'border-amber-500/20', REJECTED: 'border-rose-500/20',
};

// ─── CSV Export Utility ──────────────────────────────────────
function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) { toast.error('No data to export'); return; }
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const val = String(row[h] ?? '');
      return val.includes(',') ? `"${val}"` : val;
    }).join(','))
  ];
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('CSV exported successfully');
}

// ─── Horizontal Timeline (Gantt Chart) ────────────────────────
function LeaveTimeline({ leaves, holidays, startDate, days }: {
  leaves: TimelineLeave[];
  holidays: CompanyHoliday[];
  startDate: Date;
  days: number;
}) {
  const daysArr = useMemo(() => Array.from({ length: days }, (_, i) => addDays(startDate, i)), [startDate, days]);
  const holidaySet = useMemo(() => new Set(holidays.map(h => h.date)), [holidays]);
  const groupedByDept = useMemo(() => {
    const map = new Map<string, TimelineLeave[]>();
    for (const leave of leaves) {
      const dept = leave.department || 'No Dept';
      if (!map.has(dept)) map.set(dept, []);
      map.get(dept)!.push(leave);
    }
    return map;
  }, [leaves]);

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-fit mb-1 ml-[160px]">
        {daysArr.map((day, i) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const isHoliday = holidaySet.has(dateStr);
          return (
            <div key={i} className={cn(
              'w-8 text-center text-[10px] shrink-0 py-1',
              isHoliday ? 'text-amber-400 font-medium' : isWeekend ? 'text-slate-600' : 'text-muted-foreground',
            )}>
              <div>{format(day, 'd')}</div>
            </div>
          );
        })}
      </div>
      <div className="flex min-w-fit mb-2 ml-[160px]">
        {daysArr.map((day, i) => {
          if (i === 0 || day.getDate() === 1) {
            return (
              <div key={i} className="text-[10px] text-muted-foreground font-medium"
                style={{ position: 'relative', left: `${i * 32}px`, width: 'fit-content', whiteSpace: 'nowrap' }}>
                {format(day, 'MMM')}
              </div>
            );
          }
          return null;
        })}
      </div>
      {Array.from(groupedByDept.entries()).map(([dept, deptLeaves]) => (
        <div key={dept} className="mb-3">
          <div className="text-xs font-medium text-muted-foreground mb-1 px-1">{dept}</div>
          {deptLeaves.map((leave) => {
            const leaveStart = parseISO(leave.startDate);
            const leaveEnd = parseISO(leave.endDate);
            const color = typeColors[leave.type] || '#10b981';
            const isPending = leave.status === 'PENDING';
            return (
              <div key={leave.id} className="flex items-center gap-2 min-w-fit mb-1">
                <div className="w-[150px] shrink-0 truncate text-xs pr-2 text-right">{leave.userName}</div>
                <div className="relative h-6" style={{ width: `${days * 32}px` }}>
                  {daysArr.map((day, i) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    const isHoliday = holidaySet.has(dateStr);
                    return (
                      <div key={i} className={cn(
                        'absolute top-0 h-6 w-8',
                        isHoliday && 'bg-amber-500/5',
                        isWeekend && !isHoliday && 'bg-black/[0.01] dark:bg-white/[0.02]',
                      )} style={{ left: `${i * 32}px` }} />
                    );
                  })}
                  {(() => {
                    const barStart = Math.max(0, differenceInDays(leaveStart, startDate));
                    const barEnd = Math.min(days, differenceInDays(leaveEnd, startDate) + 1);
                    const barWidth = Math.max(1, barEnd - barStart);
                    if (barEnd <= 0 || barStart >= days) return null;
                    return (
                      <div className="absolute top-0.5 h-5 rounded-full flex items-center px-2"
                        style={{
                          left: `${Math.max(0, barStart) * 32}px`,
                          width: `${barWidth * 32}px`,
                          backgroundColor: isPending ? 'transparent' : color,
                          opacity: isPending ? 1 : 0.8,
                          border: isPending ? `2px dashed ${color}` : 'none',
                        }}>
                        <span className="text-[10px] font-medium text-white truncate">
                          {leave.userName} · {typeLabels[leave.type] || leave.type}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      ))}
      {leaves.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No leaves in this period</p>}
    </div>
  );
}

// ─── Mini SVG Bar Chart ──────────────────────────────────────
function MiniBarChart({ data, height = 120 }: { data: { label: string; value: number; color: string }[]; height?: number }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barWidth = Math.max(20, Math.min(40, 400 / data.length));
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${data.length * (barWidth + 8)} ${height}`} className="overflow-visible">
      {data.map((d, i) => {
        const barH = (d.value / maxVal) * (height - 30);
        return (
          <g key={i} transform={`translate(${i * (barWidth + 8)}, 0)`}>
            <rect x={0} y={height - 20 - barH} width={barWidth} height={barH} rx={3} fill={d.color} opacity={0.7} />
            <text x={barWidth / 2} y={height - 4} textAnchor="middle" className="text-[9px] fill-muted-foreground">{d.label}</text>
            <text x={barWidth / 2} y={height - 24 - barH} textAnchor="middle" className="text-[9px] fill-foreground font-medium">{d.value}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Mini SVG Line Chart ─────────────────────────────────────
function MiniLineChart({ data, height = 100 }: { data: { label: string; value: number }[]; height?: number }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const minVal = Math.min(...data.map(d => d.value), 0);
  const range = maxVal - minVal || 1;
  const w = 400;
  const pts = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * (w - 40) + 20;
    const y = height - 20 - ((d.value - minVal) / range) * (height - 40);
    return { x, y, ...d };
  });
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = pathD + ` L ${pts[pts.length - 1]?.x ?? 0} ${height - 20} L ${pts[0]?.x ?? 0} ${height - 20} Z`;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#lineGrad)" />
      <path d={pathD} fill="none" stroke="#10b981" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={3} fill="#10b981" />
          <text x={p.x} y={height - 4} textAnchor="middle" className="text-[9px] fill-muted-foreground">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

// ─── Mini SVG Donut Chart ────────────────────────────────────
function MiniDonutChart({ data, size = 140 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR * 0.6;
  // Compute cumulative values immutably
  const cumValues = data.reduce<number[]>((acc, d, i) => {
    acc.push((acc[i - 1] ?? 0) + d.value);
    return acc;
  }, []);
  const segments = data.map((d, i) => {
    const prevCum = i > 0 ? cumValues[i - 1] : 0;
    const startAngle = (prevCum / total) * Math.PI * 2 - Math.PI / 2;
    const endAngle = (cumValues[i] / total) * Math.PI * 2 - Math.PI / 2;
    const largeArc = d.value / total > 0.5 ? 1 : 0;
    const x1 = cx + outerR * Math.cos(startAngle);
    const y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(endAngle);
    const y2 = cy + outerR * Math.sin(endAngle);
    const x3 = cx + innerR * Math.cos(endAngle);
    const y3 = cy + innerR * Math.sin(endAngle);
    const x4 = cx + innerR * Math.cos(startAngle);
    const y4 = cy + innerR * Math.sin(startAngle);
    const d2 = `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;
    return { path: d2, color: d.color, label: d.label, value: d.value, pct: Math.round((d.value / total) * 100) };
  });
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((s, i) => <path key={i} d={s.path} fill={s.color} opacity={0.8} />)}
        <text x={cx} y={cy - 4} textAnchor="middle" className="text-sm fill-foreground font-bold">{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" className="text-[9px] fill-muted-foreground">total</text>
      </svg>
      <div className="space-y-1.5">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="font-medium ml-auto">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────
export function AdminLeaveCommandCenter() {
  const {
    adminLeaveData, adminLeaveLoading, loadAdminLeaveData,
    toggleLeaveLockdown, overrideLeaveBalance,
    createLeavePolicy, updateLeavePolicy,
    createCompanyHoliday, deleteCompanyHoliday,
    yearEndRollover, approveLeave, departments,
    users, setActiveView, setSelectedLeaveId,
  } = useEMSStore();

  // Core state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [globalSearch, setGlobalSearch] = useState('');

  // Modal states
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [rolloverModalOpen, setRolloverModalOpen] = useState(false);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [editPolicyModalOpen, setEditPolicyModalOpen] = useState(false);
  const [encashmentModalOpen, setEncashmentModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [importHolidayModalOpen, setImportHolidayModalOpen] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);

  // Override state
  const [overrideDelta, setOverrideDelta] = useState(1);
  const [overrideType, setOverrideType] = useState('CASUAL');
  const [overrideReason, setOverrideReason] = useState('');

  // Comment state for approve/reject
  const [commentLeaveId, setCommentLeaveId] = useState<string | null>(null);
  const [commentAction, setCommentAction] = useState<'approved' | 'rejected'>('approved');
  const [commentText, setCommentText] = useState('');

  // Bulk actions state
  const [selectedLeaves, setSelectedLeaves] = useState<Set<string>>(new Set());

  // Policy form
  const [policyForm, setPolicyForm] = useState({
    name: '', type: 'SICK', annualQuota: 10, requiresApproval: true,
    requiresDocument: false, documentThresholdDays: 3, carriesForward: false,
    maxCarryForward: 0, isEncashable: false, isPaid: true, color: '#10b981',
  });

  // Edit policy state
  const [editPolicyId, setEditPolicyId] = useState<string | null>(null);
  const [editPolicyForm, setEditPolicyForm] = useState(policyForm);

  // Holiday form
  const [holidayForm, setHolidayForm] = useState({ name: '', date: '', type: 'PUBLIC', isRecurring: false });

  // Import holidays text
  const [importText, setImportText] = useState('');

  // Encashment form
  const [encashForm, setEncashForm] = useState({ userId: '', leaveType: 'VACATION', days: 1, reason: '' });

  // Export form
  const [exportFormat, setExportFormat] = useState<'csv'>('csv');

  // Workforce filters
  const [wfSearch, setWfSearch] = useState('');
  const [wfDept, setWfDept] = useState('all');
  const [wfSort, setWfSort] = useState<'name' | 'remaining' | 'department'>('name');

  // All leaves tab filters
  const [alStatus, setAlStatus] = useState('ALL');
  const [alType, setAlType] = useState('ALL');
  const [alDept, setAlDept] = useState('ALL');
  const [alSearch, setAlSearch] = useState('');
  const [alDateFrom, setAlDateFrom] = useState('');
  const [alDateTo, setAlDateTo] = useState('');

  // Timeline scroll
  const [timelineStart, setTimelineStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d;
  });

  useEffect(() => { loadAdminLeaveData(); }, [loadAdminLeaveData]);

  const metrics = adminLeaveData?.metrics;
  const timelineLeaves = adminLeaveData?.timelineLeaves || [];
  const policies = adminLeaveData?.policies || [];
  const holidays = adminLeaveData?.holidays || [];
  const allLeaves = adminLeaveData?.allLeaves || [];
  const allBalances = adminLeaveData?.allLeaveBalances || [];

  // Approval rate calculation
  const approvalRate = useMemo(() => {
    const thisMonth = format(new Date(), 'yyyy-MM');
    const monthLeaves = allLeaves.filter(l => l.createdAt?.startsWith(thisMonth));
    const decided = monthLeaves.filter(l => l.status === 'APPROVED' || l.status === 'REJECTED');
    if (decided.length === 0) return { rate: 0, trend: 0 };
    const approved = decided.filter(l => l.status === 'APPROVED').length;
    const rate = Math.round((approved / decided.length) * 100);
    // Last month comparison
    const lastMonth = format(subMonths(new Date(), 1), 'yyyy-MM');
    const lastMonthLeaves = allLeaves.filter(l => l.createdAt?.startsWith(lastMonth));
    const lastDecided = lastMonthLeaves.filter(l => l.status === 'APPROVED' || l.status === 'REJECTED');
    const lastApproved = lastDecided.filter(l => l.status === 'APPROVED').length;
    const lastRate = lastDecided.length > 0 ? Math.round((lastApproved / lastDecided.length) * 100) : 0;
    return { rate, trend: rate - lastRate };
  }, [allLeaves]);

  // Selected employee data for drawer
  const selectedEmployeeBalances = useMemo(() => {
    if (!selectedUserId || !allBalances) return [];
    return allBalances.filter(b => b.userId === selectedUserId);
  }, [selectedUserId, allBalances]);

  const selectedEmployeeLeaves = useMemo(() => {
    if (!selectedUserId || !allLeaves) return [];
    return allLeaves.filter(l => l.userId === selectedUserId);
  }, [selectedUserId, allLeaves]);

  // Contact info for selected employee
  const selectedEmployeeUser = useMemo(() => {
    if (!selectedUserId) return null;
    return users.find(u => u.id === selectedUserId) || null;
  }, [selectedUserId, users]);

  // Department head for selected employee
  const selectedEmployeeDeptHead = useMemo(() => {
    if (!selectedEmployeeUser) return null;
    const dept = departments.find(d => d.id === selectedEmployeeUser.departmentId);
    if (!dept?.managerId) return null;
    return users.find(u => u.id === dept.managerId) || null;
  }, [selectedEmployeeUser, departments, users]);

  const openDrawer = useCallback((userId: string) => {
    setSelectedUserId(userId);
    setDrawerOpen(true);
  }, []);

  const openLeaveDetail = useCallback((leaveId: string) => {
    setSelectedLeaveId(leaveId);
    setActiveView('leave-detail');
  }, [setSelectedLeaveId, setActiveView]);

  // ── Handlers ─────────────────────────────────────────────
  const handleLockdown = async () => {
    try {
      await toggleLeaveLockdown();
      toast.success(metrics?.isLockdown ? 'Leave applications unlocked' : 'Leave applications locked');
    } catch { toast.error('Failed to toggle lockdown'); }
  };

  const handleCreatePolicy = async () => {
    try {
      await createLeavePolicy(policyForm);
      toast.success('Leave policy created');
      setPolicyModalOpen(false);
      setPolicyForm({ name: '', type: 'SICK', annualQuota: 10, requiresApproval: true, requiresDocument: false, documentThresholdDays: 3, carriesForward: false, maxCarryForward: 0, isEncashable: false, isPaid: true, color: '#10b981' });
    } catch { toast.error('Failed to create policy'); }
  };

  const handleEditPolicy = async () => {
    if (!editPolicyId) return;
    try {
      await updateLeavePolicy(editPolicyId, editPolicyForm);
      toast.success('Policy updated');
      setEditPolicyModalOpen(false);
    } catch { toast.error('Failed to update policy'); }
  };

  const handleTogglePolicyActive = async (id: string, currentActive: boolean) => {
    try {
      await updateLeavePolicy(id, { isActive: !currentActive });
      toast.success(`Policy ${!currentActive ? 'activated' : 'deactivated'}`);
    } catch { toast.error('Failed to update policy'); }
  };

  const handleCreateHoliday = async () => {
    try {
      await createCompanyHoliday(holidayForm);
      toast.success('Holiday created');
      setHolidayModalOpen(false);
      setHolidayForm({ name: '', date: '', type: 'PUBLIC', isRecurring: false });
    } catch { toast.error('Failed to create holiday'); }
  };

  const handleImportHolidays = async () => {
    const lines = importText.trim().split('\n').filter(l => l.trim());
    let count = 0;
    for (const line of lines) {
      const [name, date, type, recurring] = line.split(',').map(s => s.trim());
      if (name && date) {
        try {
          await createCompanyHoliday({ name, date, type: type || 'PUBLIC', isRecurring: recurring === 'true' });
          count++;
        } catch { /* skip invalid */ }
      }
    }
    toast.success(`${count} holidays imported`);
    setImportHolidayModalOpen(false);
    setImportText('');
  };

  const handleRollover = async () => {
    try { await yearEndRollover(); toast.success('Year-end rollover completed'); setRolloverModalOpen(false); }
    catch { toast.error('Rollover failed'); }
  };

  const handleOverride = async () => {
    if (!selectedUserId) return;
    try {
      await overrideLeaveBalance(selectedUserId, overrideType, overrideDelta, overrideReason);
      toast.success(`Balance ${overrideDelta > 0 ? 'credited' : 'debited'}`);
      setOverrideModalOpen(false);
      setOverrideReason('');
    } catch { toast.error('Override failed'); }
  };

  const handleApproveLeave = async (id: string, status: 'approved' | 'rejected', comment?: string) => {
    try {
      await approveLeave(id, status, comment);
      await loadAdminLeaveData();
      toast.success(`Leave ${status}`);
    } catch { toast.error(`Failed to ${status} leave`); }
  };

  const openCommentModal = (id: string, action: 'approved' | 'rejected') => {
    setCommentLeaveId(id);
    setCommentAction(action);
    setCommentText('');
    setCommentModalOpen(true);
  };

  const handleCommentSubmit = async () => {
    if (!commentLeaveId) return;
    await handleApproveLeave(commentLeaveId, commentAction, commentText);
    setCommentModalOpen(false);
    setCommentLeaveId(null);
    setCommentText('');
  };

  // Bulk actions
  const handleBulkAction = async (status: 'approved' | 'rejected') => {
    if (selectedLeaves.size === 0) return;
    try {
      for (const id of selectedLeaves) { await approveLeave(id, status); }
      toast.success(`${selectedLeaves.size} leaves ${status}`);
      setSelectedLeaves(new Set());
      await loadAdminLeaveData();
    } catch { toast.error('Bulk action failed'); }
  };

  const toggleLeaveSelection = (id: string) => {
    const next = new Set(selectedLeaves);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedLeaves(next);
  };

  const toggleAllLeaves = (ids: string[]) => {
    if (selectedLeaves.size === ids.length) { setSelectedLeaves(new Set()); }
    else { setSelectedLeaves(new Set(ids)); }
  };

  // CSV export all
  const handleExportAll = () => {
    const rows = allLeaves.map(l => ({
      Employee: l.userName, Department: l.department, Type: typeLabels[l.type] || l.type,
      Start: l.startDate, End: l.endDate, Days: differenceInDays(parseISO(l.endDate), parseISO(l.startDate)) + 1,
      Status: l.status, 'Approved By': l.managerName || '', 'Applied On': l.createdAt?.split('T')[0] || '',
    }));
    exportToCSV(rows, 'all_leaves');
  };

  // Export filtered
  const handleExportFiltered = () => {
    const filtered = getFilteredAllLeaves();
    const rows = filtered.map(l => ({
      Employee: l.userName, Department: l.department, Type: typeLabels[l.type] || l.type,
      Start: l.startDate, End: l.endDate, Days: differenceInDays(parseISO(l.endDate), parseISO(l.startDate)) + 1,
      Status: l.status, 'Approved By': l.managerName || '', 'Applied On': l.createdAt?.split('T')[0] || '',
    }));
    exportToCSV(rows, 'filtered_leaves');
    setExportModalOpen(false);
  };

  // ── Computed data for tabs ────────────────────────────────
  // Workforce grouped users with filters
  const workforceUsers = useMemo(() => {
    const userMap = new Map<string, { name: string; department: string; deptId: string; balances: LeaveBalanceRecord[] }>();
    for (const bal of allBalances) {
      if (!userMap.has(bal.userId)) {
        userMap.set(bal.userId, { name: bal.userName, department: bal.department, deptId: '', balances: [] });
      }
      userMap.get(bal.userId)!.balances.push(bal);
    }
    // Enrich with departmentId from users
    for (const [uid, data] of userMap.entries()) {
      const u = users.find(x => x.id === uid);
      if (u) data.deptId = u.departmentId || '';
    }
    let list = Array.from(userMap.entries()).map(([userId, data]) => ({
      userId, ...data,
      totalRemaining: data.balances.reduce((s, b) => s + (b.total - b.used), 0),
    }));
    // Search
    if (wfSearch) {
      const q = wfSearch.toLowerCase();
      list = list.filter(u => u.name.toLowerCase().includes(q) || u.department.toLowerCase().includes(q));
    }
    // Department filter
    if (wfDept !== 'all') list = list.filter(u => u.deptId === wfDept);
    // Sort
    list.sort((a, b) => {
      if (wfSort === 'name') return a.name.localeCompare(b.name);
      if (wfSort === 'remaining') return b.totalRemaining - a.totalRemaining;
      return a.department.localeCompare(b.department);
    });
    return list;
  }, [allBalances, users, wfSearch, wfDept, wfSort]);

  // All Leaves filtered
  const getFilteredAllLeaves = useCallback(() => {
    let filtered = [...allLeaves];
    if (alStatus !== 'ALL') filtered = filtered.filter(l => l.status === alStatus);
    if (alType !== 'ALL') filtered = filtered.filter(l => l.type === alType);
    if (alDept !== 'ALL') filtered = filtered.filter(l => l.department === alDept);
    if (alSearch) {
      const q = alSearch.toLowerCase();
      filtered = filtered.filter(l => l.userName.toLowerCase().includes(q));
    }
    if (alDateFrom) filtered = filtered.filter(l => l.startDate >= alDateFrom);
    if (alDateTo) filtered = filtered.filter(l => l.endDate <= alDateTo);
    return filtered;
  }, [allLeaves, alStatus, alType, alDept, alSearch, alDateFrom, alDateTo]);

  const filteredAllLeaves = useMemo(() => getFilteredAllLeaves(), [getFilteredAllLeaves]);

  // Global search filtering
  const globalSearchFilter = useMemo(() => {
    if (!globalSearch) return null;
    const q = globalSearch.toLowerCase();
    return {
      escalated: (adminLeaveData?.escalated || []).filter(l => l.userName.toLowerCase().includes(q)),
      recentPending: (adminLeaveData?.recentPending || []).filter(l => l.userName.toLowerCase().includes(q)),
      timelineLeaves: timelineLeaves.filter(l => l.userName.toLowerCase().includes(q)),
      allLeaves: allLeaves.filter(l => l.userName.toLowerCase().includes(q)),
    };
  }, [globalSearch, adminLeaveData?.escalated, adminLeaveData?.recentPending, timelineLeaves, allLeaves]);

  // Analytics computed
  const analytics = useMemo(() => {
    // Dept leave usage
    const deptUsage = new Map<string, number>();
    for (const l of allLeaves) {
      if (l.status === 'APPROVED') {
        const days = differenceInDays(parseISO(l.endDate), parseISO(l.startDate)) + 1;
        deptUsage.set(l.department, (deptUsage.get(l.department) || 0) + days);
      }
    }
    const deptBarData = Array.from(deptUsage.entries())
      .map(([department, value]) => ({ label: department.slice(0, 8), value, color: '#10b981' }))
      .sort((a, b) => b.value - a.value);

    // Monthly trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const month = subMonths(new Date(), i);
      const monthStr = format(month, 'yyyy-MM');
      const count = allLeaves.filter(l => l.createdAt?.startsWith(monthStr)).length;
      monthlyTrend.push({ label: format(month, 'MMM'), value: count });
    }

    // Leave type distribution
    const typeDist = new Map<string, number>();
    for (const l of allLeaves) { typeDist.set(l.type, (typeDist.get(l.type) || 0) + 1); }
    const donutData = Array.from(typeDist.entries()).map(([t, v]) => ({
      label: typeLabels[t] || t, value: v, color: typeColors[t] || '#64748b',
    }));

    // Top leave takers
    const userLeaves = new Map<string, { name: string; dept: string; days: number }>();
    for (const l of allLeaves) {
      if (l.status === 'APPROVED') {
        const days = differenceInDays(parseISO(l.endDate), parseISO(l.startDate)) + 1;
        if (!userLeaves.has(l.userId)) userLeaves.set(l.userId, { name: l.userName, dept: l.department, days: 0 });
        userLeaves.get(l.userId)!.days += days;
      }
    }
    const topTakers = Array.from(userLeaves.values()).sort((a, b) => b.days - a.days).slice(0, 5);

    // Absenteeism rate by dept
    const deptAbsent = new Map<string, { total: number; onLeave: number }>();
    for (const u of users) {
      const dept = departments.find(d => d.id === u.departmentId)?.name || 'Unknown';
      if (!deptAbsent.has(dept)) deptAbsent.set(dept, { total: 0, onLeave: 0 });
      deptAbsent.get(dept)!.total++;
      if (adminLeaveData?.currentLeaves?.some(cl => cl.userId === u.id)) {
        deptAbsent.get(dept)!.onLeave++;
      }
    }
    const absenteeismByDept = Array.from(deptAbsent.entries()).map(([dept, data]) => ({
      department: dept,
      rate: data.total > 0 ? Math.round((data.onLeave / data.total) * 100) : 0,
      onLeave: data.onLeave,
      total: data.total,
    }));

    return { deptBarData, monthlyTrend, donutData, topTakers, absenteeismByDept };
  }, [allLeaves, users, departments, adminLeaveData?.currentLeaves]);

  // ── Loading State ─────────────────────────────────────────
  if (adminLeaveLoading && !adminLeaveData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <p className="text-sm text-muted-foreground">Loading Air Traffic Control...</p>
        </div>
      </div>
    );
  }

  const attentionLeaves = [
    ...(globalSearchFilter?.escalated || adminLeaveData?.escalated || []),
    ...(globalSearchFilter?.recentPending || adminLeaveData?.recentPending || []),
  ];

  return (
    <div className="space-y-6">
      {/* ── Enhanced Header ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Leave Air Traffic Control</h2>
          <p className="text-sm text-muted-foreground mt-1">Macro-level workforce leave management</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search employee..." value={globalSearch} onChange={e => setGlobalSearch(e.target.value)}
              className="h-8 w-48 pl-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
          </div>
          <Button variant="outline" size="sm" onClick={handleExportAll}
            className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-emerald-500/10 hover:border-emerald-500/30">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => loadAdminLeaveData()}
            className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-cyan-500/10 hover:border-cyan-500/30">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          HERO METRICS — 5 Bento Cards
      ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* On Leave Today */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="p-5 relative overflow-hidden" glow="emerald">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -translate-y-8 translate-x-8" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">On Leave Today</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-3xl font-bold text-emerald-400">{metrics?.onLeaveToday || 0}</p>
                  <p className="text-sm text-muted-foreground">/ {metrics?.totalWorkforce || 0}</p>
                </div>
                <p className="text-xs text-emerald-400/80 mt-1">{metrics?.totalWorkforce ? Math.round(((metrics.totalWorkforce - metrics.onLeaveToday) / metrics.totalWorkforce) * 100) : 0}% available</p>
              </div>
              <div className="relative flex items-center justify-center">
                <Ring value={metrics?.onLeaveToday || 0} max={metrics?.totalWorkforce || 1} size={56} color="#10b981" />
                <span className="absolute text-xs font-bold text-emerald-400">{metrics?.onLeaveToday || 0}</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Pending Escalations */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <GlassCard className={cn("p-5 relative overflow-hidden", (metrics?.pendingEscalations || 0) > 0 ? "glow-amber" : "")} glow={(metrics?.pendingEscalations || 0) > 0 ? 'amber' : 'none'}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -translate-y-8 translate-x-8" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending Escalations</p>
                <p className={cn("text-3xl font-bold mt-1", (metrics?.pendingEscalations || 0) > 0 ? "text-amber-400" : "text-slate-400")}>{metrics?.pendingEscalations || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">{(metrics?.totalPending || 0) > 0 ? `${metrics?.totalPending} total pending` : 'All caught up'}</p>
              </div>
              <div className={cn("rounded-xl p-3", (metrics?.pendingEscalations || 0) > 0 ? "bg-amber-500/10" : "bg-slate-500/10")}>
                <AlertTriangle className={cn("h-5 w-5", (metrics?.pendingEscalations || 0) > 0 ? "text-amber-400" : "text-slate-500")} />
              </div>
            </div>
            {(metrics?.pendingEscalations || 0) > 0 && (
              <div className="absolute inset-0 rounded-xl pointer-events-none">
                <div className="absolute inset-0 rounded-xl ring-1 ring-amber-500/20 animate-pulse" />
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Financial Liability */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard className="p-5 relative overflow-hidden" glow="rose">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -translate-y-8 translate-x-8" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Financial Liability</p>
                <p className="text-3xl font-bold text-rose-400 mt-1">{formatCurrency(metrics?.financialLiability || 0)}</p>
                <p className="text-xs text-rose-400/80 mt-1">Unused encashable leaves</p>
              </div>
              <div className="rounded-xl p-3 bg-rose-500/10"><DollarSign className="h-5 w-5 text-rose-400" /></div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Upcoming Overlaps */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <GlassCard className={cn("p-5 relative overflow-hidden", (metrics?.deptOverlaps?.length || 0) > 0 ? "glow-amber" : "")} glow={(metrics?.deptOverlaps?.length || 0) > 0 ? 'amber' : 'none'}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -translate-y-8 translate-x-8" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Upcoming Overlaps</p>
                <p className={cn("text-3xl font-bold mt-1", (metrics?.deptOverlaps?.length || 0) > 0 ? "text-amber-400" : "text-emerald-400")}>{metrics?.deptOverlaps?.length || 0}</p>
                {(metrics?.deptOverlaps?.length || 0) > 0 ? (
                  <div className="mt-1">{metrics?.deptOverlaps?.slice(0, 2).map(o => <p key={o.department} className="text-xs text-amber-400/80">⚠ {o.count} from {o.department}</p>)}</div>
                ) : <p className="text-xs text-emerald-400/80 mt-1">✓ No conflicts next 2 weeks</p>}
              </div>
              <div className={cn("rounded-xl p-3", (metrics?.deptOverlaps?.length || 0) > 0 ? "bg-amber-500/10" : "bg-emerald-500/10")}>
                <Users className={cn("h-5 w-5", (metrics?.deptOverlaps?.length || 0) > 0 ? "text-amber-400" : "text-emerald-400")} />
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Approval Rate - NEW */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <GlassCard className="p-5 relative overflow-hidden" glow="cyan">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full -translate-y-8 translate-x-8" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Approval Rate</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-3xl font-bold text-cyan-400">{approvalRate.rate}%</p>
                  {approvalRate.trend !== 0 && (
                    <span className={cn("text-xs font-medium flex items-center gap-0.5", approvalRate.trend > 0 ? "text-emerald-400" : "text-rose-400")}>
                      {approvalRate.trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(approvalRate.trend)}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-cyan-400/80 mt-1">This month vs last</p>
              </div>
              <div className="relative flex items-center justify-center">
                <Ring value={approvalRate.rate} max={100} size={56} color="#06b6d4" />
                <span className="absolute text-xs font-bold text-cyan-400">{approvalRate.rate}%</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          ENHANCED NEEDS ATTENTION
      ═══════════════════════════════════════════════════════ */}
      {attentionLeaves.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <GlassCard className="p-6" glow="amber">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg p-2 bg-amber-500/10"><Zap className="h-4 w-4 text-amber-400" /></div>
                <h3 className="font-semibold">Needs Attention</h3>
                <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs">{attentionLeaves.length} pending</Badge>
              </div>
              {selectedLeaves.size > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-xs">{selectedLeaves.size} selected</Badge>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-400"
                    onClick={() => handleBulkAction('approved')}><CheckCircle2 className="h-3 w-3" /> Approve All</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-rose-500/20 hover:bg-rose-500/10 text-rose-400"
                    onClick={() => handleBulkAction('rejected')}><XCircle className="h-3 w-3" /> Reject All</Button>
                </div>
              )}
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {/* Escalated */}
              {(globalSearchFilter?.escalated || adminLeaveData?.escalated || []).map((leave) => (
                <motion.div key={leave.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  className="p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-rose-500/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <button onClick={() => toggleLeaveSelection(leave.id)} className="shrink-0">
                        {selectedLeaves.has(leave.id) ? <CheckSquare className="h-4 w-4 text-cyan-400" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{leave.userName}</span>
                          <Badge variant="outline" className="text-[10px] border-rose-500/20 text-rose-400">48h+ ESCALATED</Badge>
                          <Badge variant="outline" className="text-[10px]" style={{ borderColor: typeColors[leave.type] || '#10b981', color: typeColors[leave.type] || '#10b981' }}>
                            {typeLabels[leave.type] || leave.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{leave.startDate} → {leave.endDate} · {leave.reason}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0 ml-2">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => openLeaveDetail(leave.id)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-400"
                        onClick={() => openCommentModal(leave.id, 'approved')}><CheckCircle2 className="h-3 w-3" /> Approve</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-rose-500/20 hover:bg-rose-500/10 text-rose-400"
                        onClick={() => openCommentModal(leave.id, 'rejected')}><XCircle className="h-3 w-3" /> Reject</Button>
                    </div>
                  </div>
                </motion.div>
              ))}
              {/* Recent Pending */}
              {(globalSearchFilter?.recentPending || adminLeaveData?.recentPending || []).map((leave) => (
                <motion.div key={leave.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  className="p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-amber-500/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <button onClick={() => toggleLeaveSelection(leave.id)} className="shrink-0">
                        {selectedLeaves.has(leave.id) ? <CheckSquare className="h-4 w-4 text-cyan-400" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{leave.userName}</span>
                          <Badge variant="outline" className="text-[10px]" style={{ borderColor: typeColors[leave.type] || '#10b981', color: typeColors[leave.type] || '#10b981' }}>
                            {typeLabels[leave.type] || leave.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{leave.startDate} → {leave.endDate} · {leave.reason}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0 ml-2">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => openLeaveDetail(leave.id)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-400"
                        onClick={() => openCommentModal(leave.id, 'approved')}><CheckCircle2 className="h-3 w-3" /></Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-rose-500/20 hover:bg-rose-500/10 text-rose-400"
                        onClick={() => openCommentModal(leave.id, 'rejected')}><XCircle className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════
          ENHANCED ADMIN SUPERPOWERS BAR
      ═══════════════════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <GlassCard className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium">Admin Superpowers</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1]">
                {metrics?.isLockdown ? <Lock className="h-3.5 w-3.5 text-rose-400" /> : <Unlock className="h-3.5 w-3.5 text-emerald-400" />}
                <span className="text-xs">{metrics?.isLockdown ? 'Locked' : 'Unlocked'}</span>
                <Switch checked={metrics?.isLockdown || false} onCheckedChange={handleLockdown} />
              </div>
              <Button size="sm" variant="outline" className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-cyan-500/10 hover:border-cyan-500/30 text-xs"
                onClick={() => setPolicyModalOpen(true)}><Plus className="h-3.5 w-3.5 text-cyan-400" /> New Policy</Button>
              <Button size="sm" variant="outline" className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-amber-500/10 hover:border-amber-500/30 text-xs"
                onClick={() => setHolidayModalOpen(true)}><CalendarDays className="h-3.5 w-3.5 text-amber-400" /> Add Holiday</Button>
              <Button size="sm" variant="outline" className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-rose-500/10 hover:border-rose-500/30 text-xs"
                onClick={() => setRolloverModalOpen(true)}><RotateCcw className="h-3.5 w-3.5 text-rose-400" /> Year-End Rollover</Button>
              <Button size="sm" variant="outline" className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-emerald-500/10 hover:border-emerald-500/30 text-xs"
                onClick={() => setExportModalOpen(true)}><FileText className="h-3.5 w-3.5 text-emerald-400" /> Export Report</Button>
              <Button size="sm" variant="outline" className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-violet-500/10 hover:border-violet-500/30 text-xs"
                onClick={() => { setEncashForm(f => ({ ...f, userId: selectedUserId || '' })); setEncashmentModalOpen(true); }}>
                <Banknote className="h-3.5 w-3.5 text-violet-400" /> Leave Encashment
              </Button>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════
          6 TABS
      ═══════════════════════════════════════════════════════ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl pb-2 overflow-x-auto">
          <TabsList className="bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1]">
            <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">Timeline</TabsTrigger>
            <TabsTrigger value="policies" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">Policy Engine</TabsTrigger>
            <TabsTrigger value="holidays" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">Holidays</TabsTrigger>
            <TabsTrigger value="workforce" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">Workforce</TabsTrigger>
            <TabsTrigger value="all-leaves" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">All Leaves</TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">Analytics</TabsTrigger>
          </TabsList>
        </div>

        {/* ── Tab 1: Timeline ── */}
        <TabsContent value="overview">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Leave Timeline</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setTimelineStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground min-w-[140px] text-center">
                  {format(timelineStart, 'MMM d')} — {format(addDays(timelineStart, 29), 'MMM d, yyyy')}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setTimelineStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; })}>
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
                <div className="flex gap-3 ml-3">
                  <div className="flex items-center gap-1 text-xs"><div className="h-2 w-6 rounded-full bg-emerald-500" /> Approved</div>
                  <div className="flex items-center gap-1 text-xs"><div className="h-2 w-6 rounded-full border-2 border-dashed border-amber-500" /> Pending</div>
                  <div className="flex items-center gap-1 text-xs"><div className="h-2 w-6 rounded-full bg-amber-500/20" /> Holiday</div>
                </div>
              </div>
            </div>
            <LeaveTimeline leaves={globalSearchFilter?.timelineLeaves || timelineLeaves} holidays={holidays} startDate={timelineStart} days={30} />
          </GlassCard>
        </TabsContent>

        {/* ── Tab 2: Policy Engine (Enhanced) ── */}
        <TabsContent value="policies">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Leave Type Configuration</h3>
              <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs"
                onClick={() => setPolicyModalOpen(true)}><Plus className="h-3.5 w-3.5" /> Add Policy</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {policies.map((policy) => (
                <motion.div key={policy.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={cn("p-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border hover:border-black/[0.1] dark:hover:border-white/[0.1] transition-colors relative",
                    policy.isActive ? 'border-black/[0.06] dark:border-white/[0.05]' : 'border-black/[0.06] dark:border-white/[0.05] opacity-60')}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: policy.color }} />
                      <span className="font-medium text-sm">{policy.name}</span>
                      {!policy.isActive && <Badge variant="outline" className="text-[9px] border-slate-500/30 text-slate-500">INACTIVE</Badge>}
                    </div>
                    <Badge variant="outline" className="text-[10px]">{policy.annualQuota} days/yr</Badge>
                  </div>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex justify-between"><span>Requires Approval</span><span className={policy.requiresApproval ? 'text-amber-400' : 'text-emerald-400'}>{policy.requiresApproval ? 'Yes' : 'No'}</span></div>
                    <div className="flex justify-between"><span>Requires Document</span><span>{policy.requiresDocument ? `After ${policy.documentThresholdDays} days` : 'No'}</span></div>
                    <div className="flex justify-between"><span>Carries Forward</span><span className={policy.carriesForward ? 'text-emerald-400' : ''}>{policy.carriesForward ? `Yes (max ${policy.maxCarryForward})` : 'No'}</span></div>
                    <div className="flex justify-between"><span>Encashable</span><span className={policy.isEncashable ? 'text-emerald-400' : ''}>{policy.isEncashable ? 'Yes' : 'No'}</span></div>
                    <div className="flex justify-between"><span>Paid</span><span className={policy.isPaid ? 'text-emerald-400' : 'text-slate-400'}>{policy.isPaid ? 'Yes' : 'No'}</span></div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.05]">
                    <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 border-cyan-500/20 hover:bg-cyan-500/10 text-cyan-400"
                      onClick={() => { setEditPolicyId(policy.id); setEditPolicyForm({ name: policy.name, type: policy.type, annualQuota: policy.annualQuota, requiresApproval: policy.requiresApproval, requiresDocument: policy.requiresDocument, documentThresholdDays: policy.documentThresholdDays, carriesForward: policy.carriesForward, maxCarryForward: policy.maxCarryForward, isEncashable: policy.isEncashable, isPaid: policy.isPaid, color: policy.color }); setEditPolicyModalOpen(true); }}>
                      <Edit3 className="h-3 w-3" /> Edit
                    </Button>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">Active</span>
                      <Switch checked={policy.isActive} onCheckedChange={() => handleTogglePolicyActive(policy.id, policy.isActive)} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            {policies.length === 0 && <p className="text-center text-muted-foreground py-8">No leave policies configured</p>}
          </GlassCard>
        </TabsContent>

        {/* ── Tab 3: Holidays (Enhanced) ── */}
        <TabsContent value="holidays">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Company Holiday Calendar</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-cyan-500/10 hover:border-cyan-500/30 text-xs"
                  onClick={() => setImportHolidayModalOpen(true)}><Upload className="h-3.5 w-3.5 text-cyan-400" /> Import</Button>
                <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs"
                  onClick={() => setHolidayModalOpen(true)}><Plus className="h-3.5 w-3.5" /> Add Holiday</Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {holidays.map((holiday) => {
                const isPast = holiday.date < new Date().toISOString().split('T')[0];
                return (
                  <div key={holiday.id} className={cn("p-3 rounded-lg border transition-colors group", isPast ? "bg-black/[0.01] dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.05] opacity-60" : "bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.06] dark:border-white/[0.05] hover:border-black/[0.1] dark:hover:border-white/[0.1]")}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{holiday.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground font-mono">{holiday.date}</span>
                          <Badge variant="outline" className={cn("text-[10px] h-4",
                            holiday.type === 'PUBLIC' ? "border-emerald-500/20 text-emerald-400" :
                            holiday.type === 'COMPANY' ? "border-cyan-500/20 text-cyan-400" : "border-amber-500/20 text-amber-400")}>{holiday.type}</Badge>
                          {holiday.isRecurring && <span className="text-[10px] text-muted-foreground">↻ Annual</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={async () => { try { await deleteCompanyHoliday(holiday.id); toast.success('Holiday deleted'); } catch { toast.error('Failed to delete'); } }}>
                        <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            {holidays.length === 0 && <p className="text-center text-muted-foreground py-8">No holidays configured</p>}
          </GlassCard>
        </TabsContent>

        {/* ── Tab 4: Workforce (Enhanced) ── */}
        <TabsContent value="workforce">
          <GlassCard className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <h3 className="font-semibold">Workforce Leave Balances</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search..." value={wfSearch} onChange={e => setWfSearch(e.target.value)}
                    className="h-8 w-40 pl-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
                </div>
                <Select value={wfDept} onValueChange={setWfDept}>
                  <SelectTrigger className="h-8 w-32 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Depts</SelectItem>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={wfSort} onValueChange={v => setWfSort(v as typeof wfSort)}>
                  <SelectTrigger className="h-8 w-32 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><ArrowUpDown className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Sort: Name</SelectItem>
                    <SelectItem value="remaining">Sort: Remaining</SelectItem>
                    <SelectItem value="department">Sort: Dept</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              <div className="space-y-2">
                {workforceUsers.map(({ userId, name, department, balances, totalRemaining }, i) => (
                  <motion.div key={userId} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => openDrawer(userId)}
                    className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors group border border-transparent hover:border-cyan-500/10">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center text-sm font-medium border border-black/[0.1] dark:border-white/[0.1]">
                        {name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium group-hover:text-cyan-400 transition-colors">{name}</p>
                        <p className="text-xs text-muted-foreground">{department}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {balances.map(bal => {
                        const remaining = bal.total - bal.used;
                        const color = typeColors[bal.leaveType] || '#10b981';
                        return (
                          <div key={bal.leaveType} className="flex items-center gap-1.5">
                            <Ring value={remaining} max={bal.total} size={28} strokeWidth={3} color={color} />
                            <div className="text-[10px]">
                              <span className="font-medium" style={{ color }}>{remaining}</span>
                              <span className="text-muted-foreground">/{bal.total}</span>
                            </div>
                          </div>
                        );
                      })}
                      <Badge variant="outline" className="text-[10px] border-cyan-500/20 text-cyan-400">{totalRemaining}d left</Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-cyan-400 transition-colors" />
                    </div>
                  </motion.div>
                ))}
                {workforceUsers.length === 0 && <p className="text-center text-muted-foreground py-8">No employees found</p>}
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        {/* ── Tab 5: All Leaves (NEW) ── */}
        <TabsContent value="all-leaves">
          <GlassCard className="p-6">
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">All Organization Leaves</h3>
                <div className="flex items-center gap-2">
                  {selectedLeaves.size > 0 && (
                    <>
                      <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-xs">{selectedLeaves.size} selected</Badge>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-400"
                        onClick={() => handleBulkAction('approved')}><CheckCircle2 className="h-3 w-3" /> Approve</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-rose-500/20 hover:bg-rose-500/10 text-rose-400"
                        onClick={() => handleBulkAction('rejected')}><XCircle className="h-3 w-3" /> Reject</Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" className="gap-1 text-xs border-black/[0.1] dark:border-white/[0.1] hover:bg-emerald-500/10 hover:border-emerald-500/30"
                    onClick={handleExportFiltered}><Download className="h-3 w-3" /> Export</Button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search employee..." value={alSearch} onChange={e => setAlSearch(e.target.value)}
                    className="h-8 w-44 pl-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
                </div>
                <Select value={alStatus} onValueChange={setAlStatus}>
                  <SelectTrigger className="h-8 w-28 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={alType} onValueChange={setAlType}>
                  <SelectTrigger className="h-8 w-28 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Types</SelectItem>
                    {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={alDept} onValueChange={setAlDept}>
                  <SelectTrigger className="h-8 w-32 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Depts</SelectItem>
                    {[...new Set(allLeaves.map(l => l.department))].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="date" value={alDateFrom} onChange={e => setAlDateFrom(e.target.value)}
                  className="h-8 w-32 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" placeholder="From" />
                <Input type="date" value={alDateTo} onChange={e => setAlDateTo(e.target.value)}
                  className="h-8 w-32 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" placeholder="To" />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="min-w-[800px]">
                {/* Header */}
                <div className="grid grid-cols-[32px_1fr_1fr_80px_80px_80px_60px_80px_80px_80px] gap-2 px-3 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-black/[0.06] dark:border-white/[0.05]">
                  <div>
                    <button onClick={() => toggleAllLeaves(filteredAllLeaves.map(l => l.id))}>
                      {selectedLeaves.size === filteredAllLeaves.length && filteredAllLeaves.length > 0 ?
                        <CheckSquare className="h-3.5 w-3.5 text-cyan-400" /> : <Square className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <div>Employee</div><div className="whitespace-nowrap">Department</div><div>Type</div><div className="whitespace-nowrap">Start</div><div className="whitespace-nowrap">End</div><div>Days</div><div>Status</div><div className="whitespace-nowrap">Approved By</div><div className="whitespace-nowrap">Applied</div>
                </div>
                {/* Rows */}
                <div className="max-h-[400px] overflow-y-auto">
                  {filteredAllLeaves.map((leave, i) => {
                    const days = differenceInDays(parseISO(leave.endDate), parseISO(leave.startDate)) + 1;
                    return (
                      <motion.div key={leave.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(i * 0.01, 0.3) }}
                        className="grid grid-cols-[32px_1fr_1fr_80px_80px_80px_60px_80px_80px_80px] gap-2 px-3 py-2.5 text-xs border-b border-black/[0.03] dark:border-white/[0.03] hover:bg-black/[0.01] dark:hover:bg-white/[0.02] items-center">
                        <button onClick={() => toggleLeaveSelection(leave.id)}>
                          {selectedLeaves.has(leave.id) ? <CheckSquare className="h-3.5 w-3.5 text-cyan-400" /> : <Square className="h-3.5 w-3.5 text-muted-foreground" />}
                        </button>
                        <div className="font-medium truncate">{leave.userName}</div>
                        <div className="text-muted-foreground truncate">{leave.department}</div>
                        <div><Badge variant="outline" className="text-[10px] h-5" style={{ borderColor: typeColors[leave.type] || '#10b981', color: typeColors[leave.type] || '#10b981' }}>{typeLabels[leave.type] || leave.type}</Badge></div>
                        <div className="text-muted-foreground font-mono text-[10px]">{leave.startDate}</div>
                        <div className="text-muted-foreground font-mono text-[10px]">{leave.endDate}</div>
                        <div className="font-medium">{days}</div>
                        <div><Badge variant="outline" className={cn("text-[10px] h-5", statusBorderColors[leave.status] || '')}>
                          <span className={statusColors[leave.status] || ''}>{leave.status}</span>
                        </Badge></div>
                        <div className="text-muted-foreground truncate text-[10px]">{leave.managerName || '—'}</div>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground text-[10px]">{leave.createdAt?.split('T')[0] || '—'}</span>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => openLeaveDetail(leave.id)}><Eye className="h-3 w-3" /></Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
              {filteredAllLeaves.length === 0 && <p className="text-center text-muted-foreground py-8">No leaves match the filters</p>}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.05]">
              <p className="text-xs text-muted-foreground">{filteredAllLeaves.length} of {allLeaves.length} leaves</p>
            </div>
          </GlassCard>
        </TabsContent>

        {/* ── Tab 6: Analytics (NEW) ── */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Department Leave Usage */}
            <GlassCard className="p-6" glow="emerald">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-4 w-4 text-emerald-400" />
                <h3 className="font-semibold text-sm">Department Leave Usage</h3>
              </div>
              {analytics.deptBarData.length > 0 ? (
                <MiniBarChart data={analytics.deptBarData} height={140} />
              ) : <p className="text-sm text-muted-foreground text-center py-8">No data available</p>}
            </GlassCard>

            {/* Monthly Trend */}
            <GlassCard className="p-6" glow="cyan">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-4 w-4 text-cyan-400" />
                <h3 className="font-semibold text-sm">Monthly Leave Trend</h3>
              </div>
              {analytics.monthlyTrend.length > 0 ? (
                <MiniLineChart data={analytics.monthlyTrend} height={140} />
              ) : <p className="text-sm text-muted-foreground text-center py-8">No data available</p>}
            </GlassCard>

            {/* Leave Type Distribution */}
            <GlassCard className="p-6" glow="amber">
              <div className="flex items-center gap-2 mb-4">
                <PieChart className="h-4 w-4 text-amber-400" />
                <h3 className="font-semibold text-sm">Leave Type Distribution</h3>
              </div>
              {analytics.donutData.length > 0 ? (
                <MiniDonutChart data={analytics.donutData} size={140} />
              ) : <p className="text-sm text-muted-foreground text-center py-8">No data available</p>}
            </GlassCard>

            {/* Top Leave Takers */}
            <GlassCard className="p-6" glow="rose">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-4 w-4 text-rose-400" />
                <h3 className="font-semibold text-sm">Top Leave Takers</h3>
              </div>
              {analytics.topTakers.length > 0 ? (
                <div className="space-y-2.5">
                  {analytics.topTakers.map((taker, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.05]">
                      <div className="flex items-center gap-2">
                        <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                          i === 0 ? "bg-amber-500/20 text-amber-400" : i === 1 ? "bg-slate-500/20 text-slate-400" : i === 2 ? "bg-orange-500/20 text-orange-400" : "bg-black/[0.03] dark:bg-white/[0.05] text-muted-foreground")}>
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-xs font-medium">{taker.name}</p>
                          <p className="text-[10px] text-muted-foreground">{taker.dept}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] border-rose-500/20 text-rose-400">{taker.days}d</Badge>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground text-center py-8">No data available</p>}
            </GlassCard>

            {/* Absenteeism Rate by Department */}
            <GlassCard className="p-6 lg:col-span-2" glow="violet">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-4 w-4 text-violet-400" />
                <h3 className="font-semibold text-sm">Absenteeism Rate by Department</h3>
              </div>
              {analytics.absenteeismByDept.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {analytics.absenteeismByDept.map((dept) => (
                    <div key={dept.department} className="p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.05]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium">{dept.department}</span>
                        <span className={cn("text-sm font-bold", dept.rate > 20 ? "text-rose-400" : dept.rate > 10 ? "text-amber-400" : "text-emerald-400")}>
                          {dept.rate}%
                        </span>
                      </div>
                      <div className="h-2 bg-black/[0.03] dark:bg-white/[0.05] rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all duration-700", dept.rate > 20 ? "bg-rose-500" : dept.rate > 10 ? "bg-amber-500" : "bg-emerald-500")}
                          style={{ width: `${Math.min(dept.rate, 100)}%` }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{dept.onLeave} / {dept.total} on leave</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground text-center py-8">No data available</p>}
            </GlassCard>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════
          ENHANCED LEAVE WALLET DRAWER
      ═══════════════════════════════════════════════════════ */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg border-l border-black/[0.1] dark:border-white/[0.1]">
          {selectedUserId && (() => {
            const userName = selectedEmployeeBalances[0]?.userName || selectedEmployeeUser?.name || 'Employee';
            const dept = selectedEmployeeBalances[0]?.department || '';
            return (
              <>
                <SheetHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center text-xl font-bold border border-black/[0.1] dark:border-white/[0.1]">
                      {userName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                      <SheetTitle className="text-lg">{userName}</SheetTitle>
                      <SheetDescription className="text-xs">{dept}</SheetDescription>
                      {/* Contact Info */}
                      <div className="flex items-center gap-3 mt-1.5">
                        {selectedEmployeeUser?.email && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Mail className="h-3 w-3" /> {selectedEmployeeUser.email}
                          </div>
                        )}
                        {selectedEmployeeUser?.phone && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Phone className="h-3 w-3" /> {selectedEmployeeUser.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </SheetHeader>

                {selectedEmployeeDeptHead && (
                  <div className="mb-3 p-2.5 rounded-lg bg-violet-500/5 border border-violet-500/10 flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-violet-400" />
                    <div className="text-[10px]">
                      <span className="text-muted-foreground">Dept Head: </span>
                      <span className="font-medium text-violet-400">{selectedEmployeeDeptHead.name}</span>
                      {selectedEmployeeDeptHead.email && <span className="text-muted-foreground ml-1">({selectedEmployeeDeptHead.email})</span>}
                    </div>
                  </div>
                )}

                <Separator className="bg-black/[0.03] dark:bg-white/[0.05] mb-4" />

                {/* Leave Wallet — Ring charts */}
                <div className="space-y-3 mb-4">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Leave Wallet</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedEmployeeBalances.map(bal => {
                      const remaining = bal.total - bal.used;
                      const color = typeColors[bal.leaveType] || '#10b981';
                      const label = typeLabels[bal.leaveType] || bal.leaveType;
                      const policy = policies.find(p => p.type === bal.leaveType);
                      return (
                        <div key={bal.id} className="p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.05] text-center">
                          <div className="relative inline-flex items-center justify-center">
                            <Ring value={remaining} max={bal.total} size={52} strokeWidth={4} color={color} />
                            <span className="absolute text-xs font-bold" style={{ color }}>{remaining}</span>
                          </div>
                          <p className="text-xs font-medium mt-1">{label}</p>
                          <p className="text-[10px] text-muted-foreground">{bal.used}/{bal.total} used</p>
                          {bal.carriedForward > 0 && <p className="text-[10px] text-cyan-400">+{bal.carriedForward} carried</p>}
                          {/* Encash button if policy is encashable */}
                          {policy?.isEncashable && remaining > 0 && (
                            <Button size="sm" variant="outline" className="h-5 text-[9px] gap-0.5 mt-1.5 border-violet-500/20 hover:bg-violet-500/10 text-violet-400"
                              onClick={() => { setEncashForm({ userId: selectedUserId, leaveType: bal.leaveType, days: 1, reason: '' }); setEncashmentModalOpen(true); }}>
                              <Banknote className="h-2.5 w-2.5" /> Encash
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator className="bg-black/[0.03] dark:bg-white/[0.05] mb-4" />

                {/* Full Audit Trail */}
                <div className="space-y-3 mb-4">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Audit Trail</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedEmployeeLeaves.length > 0 ? [...selectedEmployeeLeaves].reverse().map((leave, i) => (
                      <motion.div key={leave.id} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="p-2.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.05]">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-[10px]" style={{ borderColor: typeColors[leave.type] || '#10b981', color: typeColors[leave.type] || '#10b981' }}>
                                {typeLabels[leave.type] || leave.type}
                              </Badge>
                              <Badge variant="outline" className={cn("text-[10px]",
                                leave.status === 'APPROVED' ? "border-emerald-500/20 text-emerald-400" :
                                leave.status === 'PENDING' ? "border-amber-500/20 text-amber-400" :
                                "border-rose-500/20 text-rose-400")}>{leave.status}</Badge>
                              {leave.reviewedAt && <span className="text-[9px] text-muted-foreground">reviewed {leave.reviewedAt.split('T')[0]}</span>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 font-mono">{leave.startDate} → {leave.endDate}</p>
                            {leave.reason && <p className="text-[10px] text-muted-foreground mt-0.5">{leave.reason}</p>}
                          </div>
                          <div className="text-right shrink-0">
                            {leave.managerName && <p className="text-[10px] text-muted-foreground">by {leave.managerName}</p>}
                            {leave.createdAt && <p className="text-[9px] text-muted-foreground">applied {leave.createdAt.split('T')[0]}</p>}
                          </div>
                        </div>
                      </motion.div>
                    )) : (
                      <p className="text-xs text-muted-foreground text-center py-4">No leave history</p>
                    )}
                  </div>
                </div>

                <Separator className="bg-black/[0.03] dark:bg-white/[0.05] mb-4" />

                {/* Admin Override with Reason */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Admin Override</h4>
                  <div className="flex items-center gap-2">
                    <Select value={overrideType} onValueChange={setOverrideType}>
                      <SelectTrigger className="h-8 w-28 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['SICK', 'CASUAL', 'VACATION', 'MATERNITY', 'PATERNITY', 'UNPAID'].map(t => <SelectItem key={t} value={t}>{typeLabels[t]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="number" value={overrideDelta} onChange={e => setOverrideDelta(Number(e.target.value))}
                      className="h-8 w-20 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" placeholder="± days" />
                    <Button size="sm" onClick={() => setOverrideModalOpen(true)}
                      className="gap-1 text-xs bg-amber-600 hover:bg-amber-700"><Edit3 className="h-3 w-3" /> Adjust</Button>
                  </div>
                  <Input value={overrideReason} onChange={e => setOverrideReason(e.target.value)} placeholder="Reason for override (optional)"
                    className="h-7 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* ═══════════════════════════════════════════════════════
          CREATE POLICY MODAL
      ═══════════════════════════════════════════════════════ */}
      <Dialog open={policyModalOpen} onOpenChange={setPolicyModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-cyan-400" /> New Leave Policy</DialogTitle>
            <DialogDescription>Define a new leave type for the company.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Name</Label><Input value={policyForm.name} onChange={e => setPolicyForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" placeholder="Sick Leave" /></div>
              <div><Label className="text-xs">Type</Label>
                <Select value={policyForm.type} onValueChange={v => setPolicyForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="h-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue /></SelectTrigger>
                  <SelectContent>{['SICK', 'CASUAL', 'VACATION', 'MATERNITY', 'PATERNITY', 'UNPAID'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Annual Quota (days)</Label><Input type="number" value={policyForm.annualQuota} onChange={e => setPolicyForm(f => ({ ...f, annualQuota: Number(e.target.value) }))} className="h-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2"><Switch checked={policyForm.requiresApproval} onCheckedChange={v => setPolicyForm(f => ({ ...f, requiresApproval: v }))} /><span className="text-xs">Requires Approval</span></div>
              <div className="flex items-center gap-2"><Switch checked={policyForm.requiresDocument} onCheckedChange={v => setPolicyForm(f => ({ ...f, requiresDocument: v }))} /><span className="text-xs">Requires Document</span></div>
              <div className="flex items-center gap-2"><Switch checked={policyForm.carriesForward} onCheckedChange={v => setPolicyForm(f => ({ ...f, carriesForward: v }))} /><span className="text-xs">Carries Forward</span></div>
              <div className="flex items-center gap-2"><Switch checked={policyForm.isEncashable} onCheckedChange={v => setPolicyForm(f => ({ ...f, isEncashable: v }))} /><span className="text-xs">Encashable</span></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Doc Threshold (days)</Label><Input type="number" value={policyForm.documentThresholdDays} onChange={e => setPolicyForm(f => ({ ...f, documentThresholdDays: Number(e.target.value) }))} className="h-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
              <div><Label className="text-xs">Max Carry Forward</Label><Input type="number" value={policyForm.maxCarryForward} onChange={e => setPolicyForm(f => ({ ...f, maxCarryForward: Number(e.target.value) }))} className="h-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
            </div>
            <div><Label className="text-xs">Color</Label><Input type="color" value={policyForm.color} onChange={e => setPolicyForm(f => ({ ...f, color: e.target.value }))} className="h-8 w-16 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
          </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPolicyModalOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleCreatePolicy} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"><CheckCircle2 className="h-4 w-4" /> Create Policy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════
          EDIT POLICY MODAL (NEW)
      ═══════════════════════════════════════════════════════ */}
      <Dialog open={editPolicyModalOpen} onOpenChange={setEditPolicyModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Edit3 className="h-5 w-5 text-cyan-400" /> Edit Leave Policy</DialogTitle>
            <DialogDescription>Update the leave type configuration.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Name</Label><Input value={editPolicyForm.name} onChange={e => setEditPolicyForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
              <div><Label className="text-xs">Type</Label>
                <Select value={editPolicyForm.type} onValueChange={v => setEditPolicyForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="h-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue /></SelectTrigger>
                  <SelectContent>{['SICK', 'CASUAL', 'VACATION', 'MATERNITY', 'PATERNITY', 'UNPAID'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Annual Quota (days)</Label><Input type="number" value={editPolicyForm.annualQuota} onChange={e => setEditPolicyForm(f => ({ ...f, annualQuota: Number(e.target.value) }))} className="h-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2"><Switch checked={editPolicyForm.requiresApproval} onCheckedChange={v => setEditPolicyForm(f => ({ ...f, requiresApproval: v }))} /><span className="text-xs">Requires Approval</span></div>
              <div className="flex items-center gap-2"><Switch checked={editPolicyForm.requiresDocument} onCheckedChange={v => setEditPolicyForm(f => ({ ...f, requiresDocument: v }))} /><span className="text-xs">Requires Document</span></div>
              <div className="flex items-center gap-2"><Switch checked={editPolicyForm.carriesForward} onCheckedChange={v => setEditPolicyForm(f => ({ ...f, carriesForward: v }))} /><span className="text-xs">Carries Forward</span></div>
              <div className="flex items-center gap-2"><Switch checked={editPolicyForm.isEncashable} onCheckedChange={v => setEditPolicyForm(f => ({ ...f, isEncashable: v }))} /><span className="text-xs">Encashable</span></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Doc Threshold</Label><Input type="number" value={editPolicyForm.documentThresholdDays} onChange={e => setEditPolicyForm(f => ({ ...f, documentThresholdDays: Number(e.target.value) }))} className="h-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
              <div><Label className="text-xs">Max Carry Forward</Label><Input type="number" value={editPolicyForm.maxCarryForward} onChange={e => setEditPolicyForm(f => ({ ...f, maxCarryForward: Number(e.target.value) }))} className="h-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
            </div>
            <div><Label className="text-xs">Color</Label><Input type="color" value={editPolicyForm.color} onChange={e => setEditPolicyForm(f => ({ ...f, color: e.target.value }))} className="h-8 w-16 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
          </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPolicyModalOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleEditPolicy} className="bg-cyan-600 hover:bg-cyan-700 gap-1.5"><CheckCircle2 className="h-4 w-4" /> Update Policy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════
          ADD HOLIDAY MODAL
      ═══════════════════════════════════════════════════════ */}
      <Dialog open={holidayModalOpen} onOpenChange={setHolidayModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-amber-400" /> Add Company Holiday</DialogTitle>
            <DialogDescription>Add a new company-wide holiday.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Holiday Name</Label><Input value={holidayForm.name} onChange={e => setHolidayForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" placeholder="Christmas Day" /></div>
            <div><Label className="text-xs">Date</Label><Input type="date" value={holidayForm.date} onChange={e => setHolidayForm(f => ({ ...f, date: e.target.value }))} className="h-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Type</Label>
                <Select value={holidayForm.type} onValueChange={v => setHolidayForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="h-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLIC">Public</SelectItem><SelectItem value="COMPANY">Company</SelectItem><SelectItem value="OPTIONAL">Optional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-5"><Switch checked={holidayForm.isRecurring} onCheckedChange={v => setHolidayForm(f => ({ ...f, isRecurring: v }))} /><span className="text-xs">Recurring</span></div>
            </div>
          </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHolidayModalOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleCreateHoliday} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"><CheckCircle2 className="h-4 w-4" /> Add Holiday</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════
          IMPORT HOLIDAYS MODAL (NEW)
      ═══════════════════════════════════════════════════════ */}
      <Dialog open={importHolidayModalOpen} onOpenChange={setImportHolidayModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-cyan-400" /> Import Holidays</DialogTitle>
            <DialogDescription>Bulk-add holidays. One per line: Name, Date, Type, Recurring</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
          <div className="space-y-3 py-2">
            <Textarea value={importText} onChange={e => setImportText(e.target.value)}
              className="min-h-[160px] text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] font-mono"
              placeholder={"New Year's Day, 2026-01-01, PUBLIC, true\nIndependence Day, 2026-07-04, PUBLIC, true\nCompany Anniversary, 2026-03-15, COMPANY, false"} />
            <p className="text-[10px] text-muted-foreground">Format: Name, YYYY-MM-DD, Type (PUBLIC/COMPANY/OPTIONAL), true/false for recurring</p>
          </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportHolidayModalOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleImportHolidays} className="bg-cyan-600 hover:bg-cyan-700 gap-1.5"><Upload className="h-4 w-4" /> Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════
          YEAR-END ROLLOVER MODAL
      ═══════════════════════════════════════════════════════ */}
      <Dialog open={rolloverModalOpen} onOpenChange={setRolloverModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RotateCcw className="h-5 w-5 text-rose-400" /> Year-End Rollover</DialogTitle>
            <DialogDescription>Carry forward unused leaves to next year according to policy rules.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
          <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/10">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-400/80">
                <p className="font-medium">This action cannot be undone.</p>
                <p className="mt-1">Only policies with &quot;Carries Forward&quot; enabled will be processed. Maximum carry-forward limits per policy will be enforced.</p>
              </div>
            </div>
          </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRolloverModalOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleRollover} className="bg-rose-600 hover:bg-rose-700 gap-1.5"><RotateCcw className="h-4 w-4" /> Execute Rollover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════
          OVERRIDE BALANCE MODAL (Enhanced with Reason)
      ═══════════════════════════════════════════════════════ */}
      <Dialog open={overrideModalOpen} onOpenChange={setOverrideModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Edit3 className="h-5 w-5 text-amber-400" /> Override Leave Balance</DialogTitle>
            <DialogDescription>Manually credit or debit leave days for this employee.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
          <div className="space-y-3 py-2">
            <p className="text-sm">Type: <span className="font-medium">{typeLabels[overrideType] || overrideType}</span></p>
            <p className="text-sm">Adjustment: <span className={cn("font-medium", overrideDelta > 0 ? "text-emerald-400" : "text-rose-400")}>
              {overrideDelta > 0 ? '+' : ''}{overrideDelta} days
            </span></p>
            {overrideReason && <p className="text-sm">Reason: <span className="text-muted-foreground">{overrideReason}</span></p>}
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-400/80">This action will be logged in the audit trail with your admin ID.</p>
              </div>
            </div>
          </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideModalOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleOverride} className="bg-amber-600 hover:bg-amber-700 gap-1.5"><CheckCircle2 className="h-4 w-4" /> Confirm Override</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════
          COMMENT MODAL (Approve/Reject with comment)
      ═══════════════════════════════════════════════════════ */}
      <Dialog open={commentModalOpen} onOpenChange={setCommentModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {commentAction === 'approved' ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <XCircle className="h-5 w-5 text-rose-400" />}
              {commentAction === 'approved' ? 'Approve Leave' : 'Reject Leave'}
            </DialogTitle>
            <DialogDescription>Add an optional comment for this decision.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
          <div className="py-2">
            <Label className="text-xs">Comment (optional)</Label>
            <Textarea value={commentText} onChange={e => setCommentText(e.target.value)}
              className="mt-1 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] min-h-[80px]"
              placeholder="Reason for approval/rejection..." />
          </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommentModalOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleCommentSubmit}
              className={cn("gap-1.5", commentAction === 'approved' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700")}>
              {commentAction === 'approved' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {commentAction === 'approved' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════
          LEAVE ENCASHMENT MODAL (NEW)
      ═══════════════════════════════════════════════════════ */}
      <Dialog open={encashmentModalOpen} onOpenChange={setEncashmentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Banknote className="h-5 w-5 text-violet-400" /> Leave Encashment</DialogTitle>
            <DialogDescription>Process leave encashment for an employee.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Employee</Label>
              <Select value={encashForm.userId} onValueChange={v => setEncashForm(f => ({ ...f, userId: v }))}>
                <SelectTrigger className="h-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Leave Type</Label>
                <Select value={encashForm.leaveType} onValueChange={v => setEncashForm(f => ({ ...f, leaveType: v }))}>
                  <SelectTrigger className="h-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {policies.filter(p => p.isEncashable && p.isActive).map(p => <SelectItem key={p.type} value={p.type}>{p.name}</SelectItem>)}
                    {policies.filter(p => p.isEncashable && p.isActive).length === 0 && <SelectItem value="VACATION">Vacation</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Days to Encash</Label>
                <Input type="number" min={1} value={encashForm.days} onChange={e => setEncashForm(f => ({ ...f, days: Number(e.target.value) }))}
                  className="h-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" />
              </div>
            </div>
            <div><Label className="text-xs">Reason</Label>
              <Input value={encashForm.reason} onChange={e => setEncashForm(f => ({ ...f, reason: e.target.value }))}
                className="h-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]" placeholder="Optional reason" />
            </div>
            {/* Calculation Preview */}
            {encashForm.userId && encashForm.days > 0 && (() => {
              const empUser = users.find(u => u.id === encashForm.userId);
              const bal = allBalances.find(b => b.userId === encashForm.userId && b.leaveType === encashForm.leaveType);
              const remaining = bal ? bal.total - bal.used : 0;
              const dailyRate = empUser?.salary ? Math.round(empUser.salary / 260) : 0;
              const encashValue = dailyRate * encashForm.days;
              return (
                <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/10 space-y-1.5">
                  <p className="text-xs font-medium text-violet-400">Encashment Preview</p>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Available Balance</span><span>{remaining} days</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Days to Encash</span><span>{encashForm.days} days</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Estimated Daily Rate</span><span>{formatCurrency(dailyRate)}</span></div>
                  <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />
                  <div className="flex justify-between text-xs font-medium"><span>Estimated Value</span><span className="text-violet-400">{formatCurrency(encashValue)}</span></div>
                  {encashForm.days > remaining && remaining > 0 && (
                    <p className="text-[10px] text-rose-400">⚠ Exceeds available balance ({remaining} days)</p>
                  )}
                </div>
              );
            })()}
          </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEncashmentModalOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={async () => {
              if (!encashForm.userId) { toast.error('Select an employee'); return; }
              try {
                await overrideLeaveBalance(encashForm.userId, encashForm.leaveType, -encashForm.days, `Encashment: ${encashForm.reason}`);
                toast.success(`Encashed ${encashForm.days} days of ${typeLabels[encashForm.leaveType] || encashForm.leaveType}`);
                setEncashmentModalOpen(false);
                setEncashForm({ userId: '', leaveType: 'VACATION', days: 1, reason: '' });
                await loadAdminLeaveData();
              } catch { toast.error('Encashment failed'); }
            }} className="bg-violet-600 hover:bg-violet-700 gap-1.5"><Banknote className="h-4 w-4" /> Process Encashment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════
          EXPORT REPORT MODAL (NEW)
      ═══════════════════════════════════════════════════════ */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-emerald-400" /> Export Report</DialogTitle>
            <DialogDescription>Download leave data as a spreadsheet.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Format</Label>
              <Select value={exportFormat} onValueChange={v => setExportFormat(v as 'csv')}>
                <SelectTrigger className="h-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="csv">CSV (Comma Separated)</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <p className="text-xs text-emerald-400/80">Export will include all {allLeaves.length} leave records with employee, department, type, dates, status, and approval details.</p>
            </div>
          </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportModalOpen(false)} className="border-black/[0.1] dark:border-white/[0.1]">Cancel</Button>
            <Button onClick={handleExportFiltered} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"><Download className="h-4 w-4" /> Download</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
