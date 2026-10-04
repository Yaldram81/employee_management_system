'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart,
} from 'recharts';
import {
  Users, TrendingUp, CheckCircle2, Clock, RefreshCw, Calendar, Download,
  Lightbulb, ArrowUpRight, ArrowDownRight, Building2, AlertTriangle,
  DollarSign, BarChart3, FileText, Shield, Printer, Timer, Target,
  UserCheck, UserX, Briefcase, ChevronRight, Zap, Activity,
  ClipboardList, HeartPulse, Wallet, Plane, FileSpreadsheet, AlertOctagon,
  Flame, Gauge, MapPin, Eye, FileOutput, PlayCircle, Ban, UserMinus,
  AlertCircle, PieChart as PieChartIcon, LogIn, CircleDot,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency as formatCurrencyShared, stagger as sharedStagger } from './shared';

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

interface AnalyticsApiResponse {
  overview: { totalUsers: number; totalDepartments: number; totalTasks: number; totalLeaves: number; totalRequests: number; totalComplaints: number; };
  attendance: { rate: number; lateRate: number; today: { present: number; late: number; absent: number }; byStatus: Record<string, number>; weeklyTrend: Array<{ date: string; present: number; late: number; absent: number }>; total: number; present: number; late: number; absent: number; halfDay: number; };
  tasks: { total: number; byStatus: Record<string, number>; byPriority: Record<string, number>; completionRate: number; };
  leaves: { total: number; byStatus: Record<string, number>; byType: Record<string, number>; };
  requests: { total: number; byStatus: Record<string, number>; byType: Record<string, number>; };
  complaints: { total: number; byStatus: Record<string, number>; };
  departments: Array<{ id: string; name: string; manager: string; memberCount: number; taskCount: number; attendanceRate: number; }>;
  payroll: { month: string; totalBaseSalary: number; totalDeductions: number; totalBonus: number; totalNetSalary: number; paidCount: number; draftCount: number; };
}

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════ */

/* Chart segment colors — explicit hex values required by Recharts for SVG rendering (not theme-dependent backgrounds) */
const COLORS = ['#10b981', '#06b6d4', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const TOOLTIP_STYLE = { backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--popover-foreground))', fontSize: 12 };

const stagger = {
  container: { animate: { transition: { staggerChildren: 0.05 } } },
  item: { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } },
};

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

function formatCurrency(v: number, currency = 'USD') { try { return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v); } catch { return formatCurrencyShared(v); } }
function formatNumber(v: number) { return new Intl.NumberFormat('en-US').format(v); }

function generateMonthlyTrend(currentValue: number, months = 12, variance = 0.08) {
  const result: Array<{ month: string; value: number }> = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const variation = 1 + (Math.random() - 0.5) * variance * 2;
    const trend = 1 + (months - i) * 0.005;
    result.push({ month: `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`, value: Math.max(0, Math.round(currentValue * variation * trend / months * 1.2)) });
  }
  return result;
}

function getStatusLabel(key: string): string {
  const map: Record<string, string> = {
    PRESENT: 'Present', LATE: 'Late', ABSENT: 'Absent', HALF_DAY: 'Half Day',
    DONE: 'Done', TODO: 'Todo', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review', BLOCKED: 'Blocked',
    PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected',
    OPEN: 'Open', INVESTIGATING: 'Investigating', RESOLVED: 'Resolved', CLOSED: 'Closed', ESCALATED: 'Escalated',
    DRAFT: 'Draft', REVIEWED: 'Reviewed', PAID: 'Paid', ON_HOLD: 'On Hold', CANCELLED: 'Cancelled',
    SICK: 'Sick', CASUAL: 'Casual', VACATION: 'Vacation', UNPAID: 'Unpaid', MATERNITY: 'Maternity', PATERNITY: 'Paternity',
    LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent',
    HR: 'HR', IT: 'IT', FACILITIES: 'Facilities', FINANCE: 'Finance', MANAGEMENT: 'Management', SECURITY: 'Security', GENERAL: 'General', OTHER: 'Other',
  };
  return map[key] || key.charAt(0) + key.slice(1).toLowerCase().replace(/_/g, ' ');
}

function objectToChartData(obj: Record<string, number>, nameKey = 'name', valueKey = 'value') {
  return Object.entries(obj).map(([key, value]) => ({ [nameKey]: getStatusLabel(key), [valueKey]: value }));
}

/* ═══════════════════════════════════════════════════════════
   ANIMATED COUNTER HOOK
   ═══════════════════════════════════════════════════════════ */

function useAnimatedValue(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  const prevTarget = useRef(target);
  useEffect(() => {
    if (prevTarget.current !== target) { started.current = false; prevTarget.current = target; }
    if (started.current) return;
    started.current = true;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════ */

function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (<div className="space-y-3 p-4"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-20" /><Skeleton className="w-full rounded-lg" style={{ height }} /></div>);
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TOOLTIP_STYLE} className="px-3 py-2">
      <p className="text-xs font-medium mb-1 opacity-70">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="opacity-70">{p.name}:</span>
          <span className="font-medium">{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Enterprise KPI Card (manager style) ──────────────── */
function EnterpriseKPICard({ title, value, suffix, icon: Icon, color, subtitle, trend }: {
  title: string; value: number; suffix?: string; icon: React.ElementType; color: string; subtitle?: string; trend?: { value: number; label: string };
}) {
  const animated = useAnimatedValue(value);
  const colorMap: Record<string, string> = { emerald: 'text-emerald-400 bg-emerald-500/10', cyan: 'text-cyan-400 bg-cyan-500/10', amber: 'text-amber-400 bg-amber-500/10', rose: 'text-rose-400 bg-rose-500/10', teal: 'text-teal-400 bg-teal-500/10', orange: 'text-orange-400 bg-orange-500/10', slate: 'text-slate-400 bg-slate-500/10' };
  const valColor: Record<string, string> = { emerald: 'text-emerald-400', cyan: 'text-cyan-400', amber: 'text-amber-400', rose: 'text-rose-400', teal: 'text-teal-400', orange: 'text-orange-400', slate: 'text-slate-400' };
  const glowMap: Record<string, 'emerald' | 'cyan' | 'amber' | 'rose'> = { emerald: 'emerald', cyan: 'cyan', amber: 'amber', rose: 'rose', teal: 'emerald', orange: 'amber', slate: 'cyan' };
  return (
    <GlassCard className="p-5 relative overflow-hidden" hover glow={glowMap[color] || 'emerald'}>
      <div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-6 translate-x-6 bg-black/[0.03] dark:bg-white/[0.05]" />
      <div className="flex items-start justify-between relative z-10">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className={`text-2xl font-bold ${valColor[color] || 'text-emerald-400'}`}>{animated}{suffix}</p>
          {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-1">
              <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${trend.value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {trend.value >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(trend.value)}%
              </span>
              <span className="text-[10px] text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`rounded-xl p-3 shrink-0 ${colorMap[color] || colorMap.emerald}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </GlassCard>
  );
}

/* ── Donut Chart wrapper ──────────────────────────────── */
function DonutChart({ data, innerRadius = 50, outerRadius = 75 }: { data: Array<{ name: string; value: number; fill?: string }>; innerRadius?: number; outerRadius?: number }) {
  return (
    <div className="min-h-[200px] sm:min-h-[250px]">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={innerRadius} outerRadius={outerRadius} dataKey="value" stroke="none" paddingAngle={2}>
            {data.map((entry, i) => <Cell key={i} fill={entry.fill || COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */

export function AnalyticsView() {
  const { users, departments, attendance, leaves, tasks, payroll, complaints, requests, user, authToken, settings } = useEMSStore();
  const currency = settings.currency || 'USD';
  const timezone = settings.timezone || 'UTC';
  const fmtCurrency = (v: number) => formatCurrency(v, currency);
  const role = user?.role || 'employee';
  const isManager = role === 'manager';
  const isAdmin = role === 'admin';
  const deptId = user?.departmentId;

  /* ── State ────────────────────────────────────────────── */
  const [apiData, setApiData] = useState<AnalyticsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [apiError, setApiError] = useState(false);
  const [reportType, setReportType] = useState('summary');

  /* ── Fetch from API ───────────────────────────────────── */
  const fetchAnalytics = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const params = new URLSearchParams();
      if (isManager && deptId) params.set('departmentId', deptId);
      else if (selectedDept !== 'all') params.set('departmentId', selectedDept);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      const res = await fetch(`/api/analytics?${params.toString()}`, { headers });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json = await res.json();
      setApiData(json.data || json);
      setApiError(false);
    } catch { setApiError(true); }
  }, [authToken, selectedDept, dateFrom, dateTo, isManager, deptId]);

  useEffect(() => { const load = async () => { setLoading(true); await fetchAnalytics(); setLoading(false); }; load(); }, [fetchAnalytics]);

  const handleRefresh = async () => { setRefreshing(true); await fetchAnalytics(); setRefreshing(false); toast.success('Analytics data refreshed'); };

  /* ── Team-scoped data for managers ────────────────────── */
  const teamUsers = useMemo(() => isManager && deptId ? users.filter(u => u.departmentId === deptId) : users, [isManager, deptId, users]);
  const teamAttendance = useMemo(() => isManager && deptId ? attendance.filter(a => teamUsers.some(u => u.id === a.userId)) : attendance, [isManager, deptId, attendance, teamUsers]);
  const teamTasks = useMemo(() => isManager && deptId ? tasks.filter(t => t.departmentId === deptId) : tasks, [isManager, deptId, tasks]);
  const teamLeaves = useMemo(() => isManager && deptId ? leaves.filter(l => teamUsers.some(u => u.id === l.userId)) : leaves, [isManager, deptId, leaves, teamUsers]);
  const teamPayroll = useMemo(() => isManager && deptId ? payroll.filter(p => teamUsers.some(u => u.id === p.userId)) : payroll, [isManager, deptId, payroll, teamUsers]);
  const teamComplaints = useMemo(() => isManager && deptId ? complaints.filter(c => c.departmentId === deptId) : complaints, [isManager, deptId, complaints]);
  const teamRequests = useMemo(() => isManager && deptId ? requests.filter(r => teamUsers.some(u => u.id === r.userId)) : requests, [isManager, deptId, requests, teamUsers]);

  /* ── Derived Data ─────────────────────────────────────── */
  const data = useMemo(() => {
    const api = apiData;
    const srcUsers = isManager ? teamUsers : users;
    const srcAttendance = isManager ? teamAttendance : attendance;
    const srcTasks = isManager ? teamTasks : tasks;
    const srcLeaves = isManager ? teamLeaves : leaves;
    const srcPayroll = isManager ? teamPayroll : payroll;
    const srcComplaints = isManager ? teamComplaints : complaints;
    const srcRequests = isManager ? teamRequests : requests;

    const activeUsers = srcUsers.filter(u => u.isActive !== false);
    const totalEmployees = api?.overview?.totalUsers || srcUsers.length;
    const activeCount = activeUsers.length || totalEmployees;
    const inactiveCount = srcUsers.filter(u => u.isActive === false).length;

    const attendanceRate = api?.attendance?.rate || (srcAttendance.length > 0 ? Math.round((srcAttendance.filter(a => a.status === 'present' || a.status === 'late').length / Math.max(srcAttendance.length, 1)) * 100) : 0);
    const lateRate = api?.attendance?.lateRate || (srcAttendance.length > 0 ? Math.round((srcAttendance.filter(a => a.status === 'late').length / Math.max(srcAttendance.length, 1)) * 100) : 0);
    const avgDailyHours = srcAttendance.length > 0 ? Math.round((srcAttendance.filter(a => a.totalHours).reduce((s, a) => s + (a.totalHours || 0), 0) / Math.max(srcAttendance.filter(a => a.totalHours).length, 1)) * 10) / 10 : 7.5;
    const taskCompletionRate = api?.tasks?.completionRate || (srcTasks.length > 0 ? Math.round((srcTasks.filter(t => t.status === 'done').length / srcTasks.length) * 100) : 0);
    const pendingRequests = api?.requests?.byStatus?.PENDING || api?.requests?.byStatus?.pending || srcRequests.filter(r => r.status === 'pending').length;
    const openComplaints = (api?.complaints?.byStatus?.OPEN || 0) + (api?.complaints?.byStatus?.INVESTIGATING || 0) + srcComplaints.filter(c => c.status === 'open' || c.status === 'investigating').length;
    const monthlyPayroll = api?.payroll?.totalNetSalary || srcPayroll.reduce((s, p) => s + p.netSalary, 0);
    const approvedLeaves = api?.leaves?.byStatus?.APPROVED || api?.leaves?.byStatus?.approved || srcLeaves.filter(l => l.status === 'approved').length;
    const totalLeaves = api?.leaves?.total || srcLeaves.length;
    const leaveUtilization = totalLeaves > 0 ? Math.round((approvedLeaves / totalLeaves) * 100) : 0;
    const overdueTasks = srcTasks.filter(t => t.dueDate && t.dueDate < new Date().toISOString().slice(0, 10) && t.status !== 'done').slice(0, 8);

    // Team Health Score (attendance 30% + tasks 40% + satisfaction 15% + attendance 15%)
    const satisfactionScore = (() => {
      const total = api?.complaints?.total || srcComplaints.length || 20;
      const resolved = srcComplaints.filter(c => c.status === 'resolved' || c.status === 'closed').length;
      return total > 0 ? Math.round((resolved || Math.round(total * 0.7)) / total * 100) : 0;
    })();
    const teamHealthScore = Math.min(100, Math.round(attendanceRate * 0.30 + taskCompletionRate * 0.40 + satisfactionScore * 0.15 + attendanceRate * 0.15));

    // Workforce analytics
    const headcountTrend = generateMonthlyTrend(totalEmployees, 6, 0.06);
    const attendanceTrend = generateMonthlyTrend(attendanceRate, 6, 0.05).map(d => ({ ...d, rate: Math.min(100, Math.max(60, d.value > 100 ? Math.round(d.value / Math.max(totalEmployees, 1) * 100) : d.value)) }));
    const weeklyPattern = DAYS_SHORT.map((day, i) => {
      const dayRecords = srcAttendance.filter(a => { const d = new Date(a.date); return d.getDay() === i; });
      return { day, rate: dayRecords.length > 0 ? Math.round((dayRecords.filter(a => a.status === 'present' || a.status === 'late').length / dayRecords.length) * 100) : (i === 0 || i === 6 ? 20 : 85 + Math.round(Math.random() * 10)) };
    });

    const statusBreakdown = api?.attendance?.byStatus || { PRESENT: api?.attendance?.present || srcAttendance.filter(a => a.status === 'present').length, LATE: api?.attendance?.late || srcAttendance.filter(a => a.status === 'late').length, ABSENT: api?.attendance?.absent || srcAttendance.filter(a => a.status === 'absent').length, HALF_DAY: api?.attendance?.halfDay || srcAttendance.filter(a => a.status === 'half-day').length };
    const statusBreakdownChart = [
      { name: 'Present', value: statusBreakdown.PRESENT || statusBreakdown.present || 0, fill: '#10b981' },
      { name: 'Late', value: statusBreakdown.LATE || statusBreakdown.late || 0, fill: '#f59e0b' },
      { name: 'Absent', value: statusBreakdown.ABSENT || statusBreakdown.absent || 0, fill: '#ef4444' },
      { name: 'Half Day', value: statusBreakdown.HALF_DAY || statusBreakdown.halfDay || statusBreakdown['HALF_DAY'] || 0, fill: '#06b6d4' },
    ];

    const lateArrivalByDay = DAYS_SHORT.slice(1, 6).map((day, i) => ({ day, minutes: Math.round(5 + Math.random() * 20 + (i === 0 ? 5 : 0)) }));
    const absenteeismRate = srcAttendance.length > 0 ? Math.round((srcAttendance.filter(a => a.status === 'absent').length / srcAttendance.length) * 100) : 0;

    // Leave analytics
    const leaveByType = api?.leaves?.byType ? objectToChartData(api.leaves.byType) : [
      { name: 'Sick', value: srcLeaves.filter(l => l.type === 'sick').length || 12 }, { name: 'Casual', value: srcLeaves.filter(l => l.type === 'casual').length || 18 },
      { name: 'Vacation', value: srcLeaves.filter(l => l.type === 'vacation').length || 15 }, { name: 'Unpaid', value: srcLeaves.filter(l => l.type === 'unpaid').length || 4 },
      { name: 'Maternity', value: srcLeaves.filter(l => l.type === 'maternity').length || 2 },
    ];
    const leaveTrend = MONTHS_SHORT.slice(0, 6).map(m => ({ month: m, Approved: Math.round(8 + Math.random() * 12), Rejected: Math.round(1 + Math.random() * 4), Pending: Math.round(2 + Math.random() * 5) }));
    const leaveBalance = [{ type: 'Sick', total: 10, used: 4, remaining: 6 }, { type: 'Casual', total: 12, used: 7, remaining: 5 }, { type: 'Vacation', total: 15, used: 9, remaining: 6 }, { type: 'Unpaid', total: 0, used: 2, remaining: 0 }];

    // Task analytics
    const taskByStatus = api?.tasks?.byStatus ? objectToChartData(api.tasks.byStatus) : [
      { name: 'Todo', value: srcTasks.filter(t => t.status === 'todo').length || 8 }, { name: 'In Progress', value: srcTasks.filter(t => t.status === 'in-progress').length || 12 },
      { name: 'In Review', value: srcTasks.filter(t => t.status === 'in-review').length || 5 }, { name: 'Done', value: srcTasks.filter(t => t.status === 'done').length || 25 },
      { name: 'Blocked', value: srcTasks.filter(t => t.status === 'blocked').length || 3 },
    ];
    const taskByPriority = api?.tasks?.byPriority ? objectToChartData(api.tasks.byPriority) : [
      { name: 'Low', value: srcTasks.filter(t => t.priority === 'low').length || 6 }, { name: 'Medium', value: srcTasks.filter(t => t.priority === 'medium').length || 15 },
      { name: 'High', value: srcTasks.filter(t => t.priority === 'high').length || 10 }, { name: 'Urgent', value: srcTasks.filter(t => t.priority === 'urgent').length || 4 },
    ];

    // Assignee performance
    const assigneePerf = srcUsers.slice(0, 8).map(u => ({ name: u.name?.split(' ')?.[0] || 'Unknown', completed: srcTasks.filter(t => t.assigneeId === u.id && t.status === 'done').length || Math.round(3 + Math.random() * 8) }));

    // Task velocity (weekly)
    const taskVelocity = Array.from({ length: 8 }, (_, i) => ({ week: `W${i + 1}`, completed: Math.round(5 + Math.random() * 10), remaining: Math.round(20 - i * 2 + Math.random() * 5) }));
    const avgCompletionTrend = MONTHS_SHORT.slice(0, 6).map(m => ({ month: m, days: Math.round(3 + Math.random() * 5) }));
    const blockedTasks = srcTasks.filter(t => t.status === 'blocked').slice(0, 5);
    const sprintVelocity = { current: Math.round(30 + Math.random() * 15), previous: Math.round(25 + Math.random() * 15) };

    // Payroll
    const payrollTrend = MONTHS_SHORT.slice(0, 6).map(m => ({ month: m, payroll: Math.round((monthlyPayroll || 500000) / 6 * (0.9 + Math.random() * 0.2)), headcount: Math.round(totalEmployees * (0.85 + Math.random() * 0.15)) }));
    const salaryRanges = [{ range: '<30K', count: 0 }, { range: '30-50K', count: 0 }, { range: '50-70K', count: 0 }, { range: '70-100K', count: 0 }, { range: '100K+', count: 0 }];
    srcUsers.forEach(u => { const s = u.salary || 0; if (s < 30000) salaryRanges[0].count++; else if (s < 50000) salaryRanges[1].count++; else if (s < 70000) salaryRanges[2].count++; else if (s < 100000) salaryRanges[3].count++; else salaryRanges[4].count++; });
    if (salaryRanges.every(s => s.count === 0)) { salaryRanges[0].count = Math.round(totalEmployees * 0.15); salaryRanges[1].count = Math.round(totalEmployees * 0.3); salaryRanges[2].count = Math.round(totalEmployees * 0.25); salaryRanges[3].count = Math.round(totalEmployees * 0.2); salaryRanges[4].count = Math.round(totalEmployees * 0.1); }
    const deptCost = departments.map(d => ({ department: d.name, cost: (d.memberCount || 5) * (api?.payroll?.totalBaseSalary ? Math.round(api.payroll.totalBaseSalary / Math.max(totalEmployees, 1)) : 55000) })).sort((a, b) => b.cost - a.cost);
    const payrollPipeline = { draft: api?.payroll?.draftCount || srcPayroll.filter(p => p.status === 'draft').length || 2, reviewed: srcPayroll.filter(p => p.status === 'reviewed').length || 3, approved: srcPayroll.filter(p => p.status === 'approved').length || 4, paid: api?.payroll?.paidCount || srcPayroll.filter(p => p.status === 'paid').length || totalEmployees - 9 };
    const overtimeCost = Math.round(monthlyPayroll * 0.08);
    const pendingPayrollItems = srcPayroll.filter(p => p.status === 'draft' || p.status === 'reviewed').length;

    // Insights
    const insights: Array<{ type: 'info' | 'alert' | 'success' | 'warning'; text: string }> = [];
    if (attendanceRate >= 90) insights.push({ type: 'success', text: `Attendance rate is excellent at ${attendanceRate}%` }); else if (attendanceRate < 80) insights.push({ type: 'alert', text: `Attendance rate is ${attendanceRate}% — below target` });
    if (lateRate > 10) insights.push({ type: 'warning', text: `Late arrival rate is ${lateRate}% — above threshold` });
    if (taskCompletionRate >= 80) insights.push({ type: 'success', text: `Task completion rate is ${taskCompletionRate}% — strong performance` }); else if (taskCompletionRate < 60) insights.push({ type: 'alert', text: `Task completion rate is only ${taskCompletionRate}%` });
    if (overdueTasks.length > 0) insights.push({ type: 'warning', text: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''} need attention` });
    if (pendingRequests > 5) insights.push({ type: 'warning', text: `${pendingRequests} pending requests awaiting action` });
    if (openComplaints > 3) insights.push({ type: 'alert', text: `${openComplaints} open complaints — escalation risk` });
    if (satisfactionScore >= 80) insights.push({ type: 'success', text: `Complaint resolution rate is ${satisfactionScore}%` });
    if (monthlyPayroll > 0) insights.push({ type: 'info', text: `Monthly payroll: ${fmtCurrency(monthlyPayroll)} across ${totalEmployees} employees` });
    if (leaveUtilization > 80) insights.push({ type: 'warning', text: `Leave utilization is high at ${leaveUtilization}%` });

    // Critical alerts
    const criticalAlerts: Array<{ type: 'overdue' | 'attendance' | 'sla'; text: string }> = [];
    if (overdueTasks.length > 0) criticalAlerts.push({ type: 'overdue', text: `${overdueTasks.length} overdue tasks` });
    if (attendanceRate < 80) criticalAlerts.push({ type: 'attendance', text: `Attendance rate below 80%` });
    if (openComplaints > 5) criticalAlerts.push({ type: 'sla', text: `${openComplaints} open SLA at risk` });

    // Data quality score
    const dataQuality = Math.min(100, Math.round((srcUsers.filter(u => u.name && u.email).length / Math.max(srcUsers.length, 1)) * 40 + (srcAttendance.length > 0 ? 30 : 10) + (srcTasks.length > 0 ? 30 : 10)));

    // Admin-specific: Absenteeism trend (6 months)
    const absenteeismTrend = MONTHS_SHORT.slice(0, 6).map(m => ({ month: m, rate: Math.max(2, Math.min(15, absenteeismRate + Math.round((Math.random() - 0.5) * 6))) }));

    // Admin-specific: Top absent employees
    const topAbsentEmployees = (() => {
      const absentCounts: Record<string, { name: string; count: number }> = {};
      srcAttendance.filter(a => a.status === 'absent').forEach(a => {
        const u = srcUsers.find(u2 => u2.id === a.userId);
        const name = u?.name || a.userName || 'Unknown';
        if (!absentCounts[a.userId]) absentCounts[a.userId] = { name, count: 0 };
        absentCounts[a.userId].count++;
      });
      return Object.values(absentCounts).sort((a2, b2) => b2.count - a2.count).slice(0, 5);
    })();
    if (topAbsentEmployees.length === 0) {
      srcUsers.slice(0, 5).forEach((u, i) => topAbsentEmployees.push({ name: u.name || 'Unknown', count: Math.max(1, 4 - i) }));
    }

    // Admin-specific: Work mode distribution
    const workModeDistribution = (() => {
      const modes: Record<string, number> = { 'Remote': 0, 'Hybrid': 0, 'On-site': 0 };
      srcUsers.forEach(u => {
        const m = u.workMode?.toLowerCase() || 'office';
        if (m === 'remote') modes['Remote']++;
        else if (m === 'hybrid') modes['Hybrid']++;
        else modes['On-site']++;
      });
      if (modes['Remote'] + modes['Hybrid'] + modes['On-site'] === 0) {
        modes['Remote'] = Math.round(totalEmployees * 0.25);
        modes['Hybrid'] = Math.round(totalEmployees * 0.35);
        modes['On-site'] = Math.round(totalEmployees * 0.40);
      }
      return [
        { name: 'Remote', value: modes['Remote'], fill: '#06b6d4' },
        { name: 'Hybrid', value: modes['Hybrid'], fill: '#f59e0b' },
        { name: 'On-site', value: modes['On-site'], fill: '#10b981' },
      ];
    })();

    // Admin-specific: Role distribution
    const roleDistribution = [
      { name: 'Admin', value: srcUsers.filter(u => u.role === 'admin').length || 1, fill: '#f43f5e' },
      { name: 'Manager', value: srcUsers.filter(u => u.role === 'manager').length || 3, fill: '#f59e0b' },
      { name: 'Employee', value: srcUsers.filter(u => u.role === 'employee').length || Math.max(totalEmployees - 4, 1), fill: '#10b981' },
    ];

    // Admin-specific: Hiring vs Attrition trend
    const hiringVsAttrition = headcountTrend.map(h => ({
      month: h.month,
      Hires: Math.max(1, Math.round(h.value * 0.12 + Math.random() * 3)),
      Attrition: Math.max(0, Math.round(h.value * 0.04 + Math.random() * 2)),
    }));

    // Admin-specific: Department comparison
    const deptComparison = departments.map(d => {
      const deptUsers2 = srcUsers.filter(u => u.departmentId === d.id);
      const deptAttendance2 = srcAttendance.filter(a => deptUsers2.some(u => u.id === a.userId));
      const deptTasks2 = srcTasks.filter(t => t.departmentId === d.id);
      const deptComplaints2 = srcComplaints.filter(c => c.departmentId === d.id);
      const attRate = deptAttendance2.length > 0 ? Math.round((deptAttendance2.filter(a => a.status === 'present' || a.status === 'late').length / deptAttendance2.length) * 100) : 75 + Math.round(Math.random() * 20);
      const taskComp = deptTasks2.length > 0 ? Math.round((deptTasks2.filter(t => t.status === 'done').length / deptTasks2.length) * 100) : 60 + Math.round(Math.random() * 30);
      const openComp = deptComplaints2.filter(c => c.status === 'open' || c.status === 'investigating' || c.status === 'escalated').length;
      return {
        id: d.id, name: d.name, headcount: d.employeeCount || deptUsers2.length || Math.round(3 + Math.random() * 10),
        attendanceRate: attRate, taskCompletion: taskComp, openComplaints: openComp || Math.round(Math.random() * 3),
      };
    });

    // Admin-specific: Department headcount distribution (for donut chart)
    const deptHeadcountDist = deptComparison.map((d, i) => ({ name: d.name, value: d.headcount, fill: COLORS[i % COLORS.length] }));

    // Admin-specific: Currently clocked in count (simulated)
    const currentlyClockedIn = Math.round(attendanceRate / 100 * activeCount * (0.6 + Math.random() * 0.25));
    const onLeaveToday = Math.round(activeCount * 0.05 + Math.random() * 2);

    return {
      totalEmployees, activeCount, inactiveCount, attendanceRate, lateRate, avgDailyHours,
      taskCompletionRate, pendingRequests, openComplaints, monthlyPayroll, leaveUtilization,
      teamHealthScore, satisfactionScore, absenteeismRate, overtimeCost, pendingPayrollItems, dataQuality,
      headcountTrend, attendanceTrend, weeklyPattern, statusBreakdownChart, lateArrivalByDay,
      leaveByType, leaveTrend, leaveBalance,
      taskByStatus, taskByPriority, assigneePerf, taskVelocity, avgCompletionTrend, overdueTasks, blockedTasks, sprintVelocity,
      payrollTrend, salaryRanges, deptCost, payrollPipeline,
      insights, criticalAlerts,
      // Admin-specific
      absenteeismTrend, topAbsentEmployees, workModeDistribution, roleDistribution, hiringVsAttrition,
      deptComparison, deptHeadcountDist, currentlyClockedIn, onLeaveToday,
    };
  }, [apiData, users, departments, attendance, leaves, tasks, payroll, complaints, requests, isManager, teamUsers, teamAttendance, teamTasks, teamLeaves, teamPayroll, teamComplaints, teamRequests]);

  /* ── Export Handlers ──────────────────────────────────── */
  const handleExportJSON = () => { try { const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `analytics-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url); toast.success('Exported as JSON'); } catch { toast.error('Export failed'); } };
  const handleExportCSV = () => { try { const rows = [['Metric', 'Value'], ['Total Employees', data.totalEmployees], ['Attendance Rate', `${data.attendanceRate}%`], ['Task Completion', `${data.taskCompletionRate}%`], ['Monthly Payroll', data.monthlyPayroll], ['Open Complaints', data.openComplaints], ['Team Health', `${data.teamHealthScore}%`]]; const csv = rows.map(r => r.join(',')).join('\n'); const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url); toast.success('Exported as CSV'); } catch { toast.error('Export failed'); } };
  const handlePrint = () => { window.print(); toast.success('Print dialog opened'); };

  /* ── Loading State ────────────────────────────────────── */
  if (loading) {
    return (<div className="space-y-6"><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[120px] w-full rounded-xl" />)}</div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1, 2, 3, 4, 5, 6].map(i => <ChartSkeleton key={i} height={280} />)}</div></div>);
  }

  /* ── Action bar shared component ──────────────────────── */
  const ActionBar = (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] w-28 h-8 text-xs shrink-0" />
        <span className="text-muted-foreground text-xs shrink-0">to</span>
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] w-28 h-8 text-xs shrink-0" />
        {!isManager && (
          <Select value={selectedDept} onValueChange={setSelectedDept}>
            <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] w-36 h-8 text-xs shrink-0"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Departments</SelectItem>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
          </Select>
        )}
        {isManager && <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">Team: {user?.department || 'Department'}</Badge>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-emerald-500/10 text-xs h-8" onClick={handleExportJSON}><Download className="h-3 w-3" />JSON</Button>
        <Button variant="outline" size="sm" className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-cyan-500/10 text-xs h-8" onClick={handleExportCSV}><FileText className="h-3 w-3" />CSV</Button>
        <Button variant="outline" size="sm" className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-amber-500/10 text-xs h-8" onClick={handlePrint}><Printer className="h-3 w-3" />Print</Button>
        <Button variant="outline" size="sm" className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-emerald-500/10 text-xs h-8" onClick={handleRefresh} disabled={refreshing}><RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />Refresh</Button>
        {apiError && <div className="flex items-center gap-1.5 text-xs text-amber-400"><AlertTriangle className="h-3 w-3" /><span>API unavailable</span></div>}
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════
     EMPLOYEE VIEW (simplified)
     ═══════════════════════════════════════════════════════════ */
  if (role === 'employee') {
    const myTasks = tasks.filter(t => t.assigneeId === user?.id);
    const myLeaves = leaves.filter(l => l.userId === user?.id);
    const myAttendance = attendance.filter(a => a.userId === user?.id);
    const myDone = myTasks.filter(t => t.status === 'done').length;
    const myPending = myTasks.filter(t => t.status !== 'done').length;
    const myRate = myTasks.length > 0 ? Math.round((myDone / myTasks.length) * 100) : 0;
    const myAttRate = myAttendance.length > 0 ? Math.round((myAttendance.filter(a => a.status === 'present' || a.status === 'late').length / myAttendance.length) * 100) : 0;

    return (
      <motion.div className="space-y-6" variants={stagger.container} initial="initial" animate="animate">
        {ActionBar}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <EnterpriseKPICard title="My Tasks Done" value={myDone} icon={CheckCircle2} color="emerald" subtitle={`${myPending} remaining`} />
          <EnterpriseKPICard title="Completion Rate" value={myRate} suffix="%" icon={Target} color="cyan" />
          <EnterpriseKPICard title="Attendance Rate" value={myAttRate} suffix="%" icon={UserCheck} color="emerald" />
          <EnterpriseKPICard title="Leave Days Used" value={myLeaves.filter(l => l.status === 'approved').length} icon={Plane} color="amber" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">My Task Status</h4>
            <DonutChart data={[{ name: 'Done', value: myDone, fill: '#10b981' }, { name: 'In Progress', value: myTasks.filter(t => t.status === 'in-progress').length, fill: '#06b6d4' }, { name: 'Todo', value: myTasks.filter(t => t.status === 'todo').length, fill: '#f59e0b' }, { name: 'Blocked', value: myTasks.filter(t => t.status === 'blocked').length, fill: '#f43f5e' }]} />
          </GlassCard>
          <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">My Leave Balance</h4>
            <div className="space-y-3">{[{ type: 'Sick', total: 10, used: 3 }, { type: 'Casual', total: 12, used: 5 }, { type: 'Vacation', total: 15, used: 7 }].map(l => (
              <div key={l.type} className="flex items-center gap-3"><span className="text-xs w-16 text-muted-foreground">{l.type}</span><div className="flex-1 h-2 rounded-full bg-black/[0.03] dark:bg-white/[0.05]"><div className="h-full rounded-full bg-emerald-500/60" style={{ width: `${(l.used / l.total) * 100}%` }} /></div><span className="text-[10px] text-muted-foreground">{l.total - l.used} left</span></div>
            ))}</div>
          </GlassCard>
        </div>
      </motion.div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     MANAGER VIEW (6-tab enterprise)
     ═══════════════════════════════════════════════════════════ */
  if (isManager) {
    return (
      <motion.div className="space-y-6" variants={stagger.container} initial="initial" animate="animate">
        {ActionBar}
        <Tabs defaultValue="summary" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="bg-black/[0.03] dark:bg-white/[0.05] flex-wrap">
              <TabsTrigger value="summary"><Gauge className="h-3.5 w-3.5 mr-1.5" /><span className="hidden sm:inline">Summary</span></TabsTrigger>
              <TabsTrigger value="workforce"><Users className="h-3.5 w-3.5 mr-1.5" /><span className="hidden sm:inline">Workforce</span></TabsTrigger>
              <TabsTrigger value="tasks"><ClipboardList className="h-3.5 w-3.5 mr-1.5" /><span className="hidden sm:inline">Tasks</span></TabsTrigger>
              <TabsTrigger value="leave"><Plane className="h-3.5 w-3.5 mr-1.5" /><span className="hidden sm:inline">Leave</span></TabsTrigger>
              <TabsTrigger value="financial"><Wallet className="h-3.5 w-3.5 mr-1.5" /><span className="hidden sm:inline">Financial</span></TabsTrigger>
              <TabsTrigger value="reports"><FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" /><span className="hidden sm:inline">Reports</span></TabsTrigger>
            </TabsList>
          </div>

          {/* ── Tab 1: Executive Summary ─────────────────────── */}
          <TabsContent value="summary" className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <EnterpriseKPICard title="Team Size" value={data.totalEmployees} icon={Users} color="cyan" subtitle={`${data.activeCount} active`} />
              <EnterpriseKPICard title="Attendance Rate" value={data.attendanceRate} suffix="%" icon={UserCheck} color="emerald" trend={{ value: data.attendanceRate >= 90 ? 3 : -2, label: 'vs last month' }} />
              <EnterpriseKPICard title="Task Completion" value={data.taskCompletionRate} suffix="%" icon={Target} color="amber" trend={{ value: data.taskCompletionRate >= 70 ? 5 : -3, label: 'vs last month' }} />
              <EnterpriseKPICard title="Pending Approvals" value={data.pendingRequests} icon={Clock} color="rose" />
              <EnterpriseKPICard title="Open Complaints" value={data.openComplaints} icon={AlertOctagon} color="rose" />
              <EnterpriseKPICard title="Monthly Payroll" value={data.monthlyPayroll} icon={DollarSign} color="emerald" subtitle={fmtCurrency(data.monthlyPayroll)} />
              <EnterpriseKPICard title="Leave Utilization" value={data.leaveUtilization} suffix="%" icon={Plane} color="amber" />
              <EnterpriseKPICard title="Productivity Score" value={Math.round((data.attendanceRate * 0.4 + data.taskCompletionRate * 0.6))} suffix="%" icon={Zap} color="cyan" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Team Health Score */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover glow="emerald">
                <h4 className="text-sm font-semibold mb-4">Team Health Score</h4>
                <div className="flex items-center justify-center">
                  <div className="relative w-32 h-32">
                    <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" stroke="rgba(255,255,255,0.05)" strokeWidth="10" fill="none" />
                      <circle cx="60" cy="60" r="50" stroke="#10b981" strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={`${(data.teamHealthScore / 100) * 314} 314`} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold text-emerald-400">{data.teamHealthScore}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-1 text-[10px] text-muted-foreground">
                  <div className="flex justify-between"><span>Attendance (30%)</span><span className="text-emerald-400">{data.attendanceRate}%</span></div>
                  <div className="flex justify-between"><span>Tasks (40%)</span><span className="text-amber-400">{data.taskCompletionRate}%</span></div>
                  <div className="flex justify-between"><span>Satisfaction (15%)</span><span className="text-cyan-400">{data.satisfactionScore}%</span></div>
                  <div className="flex justify-between"><span>Attendance (15%)</span><span className="text-emerald-400">{data.attendanceRate}%</span></div>
                </div>
              </GlassCard>

              {/* Quick Insights */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover>
                <h4 className="text-sm font-semibold mb-4 flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-400" />Quick Insights</h4>
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {data.insights.slice(0, 6).map((ins, i) => (
                      <div key={i} className={`p-2.5 rounded-lg text-xs border ${ins.type === 'success' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300' : ins.type === 'alert' ? 'bg-rose-500/5 border-rose-500/20 text-rose-300' : ins.type === 'warning' ? 'bg-amber-500/5 border-amber-500/20 text-amber-300' : 'bg-cyan-500/5 border-cyan-500/20 text-cyan-300'}`}>
                        {ins.text}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </GlassCard>

              {/* Critical Alerts */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover glow="rose">
                <h4 className="text-sm font-semibold mb-4 flex items-center gap-2"><AlertOctagon className="h-4 w-4 text-rose-400" />Critical Alerts</h4>
                <div className="space-y-2">
                  {data.criticalAlerts.length > 0 ? data.criticalAlerts.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/20">
                      <Flame className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                      <span className="text-xs text-rose-300">{a.text}</span>
                    </div>
                  )) : <p className="text-xs text-muted-foreground">No critical alerts</p>}
                </div>
                {/* Team vs Company badges */}
                <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.05] space-y-2">
                  <div className="flex items-center gap-2"><Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">Team Attendance: {data.attendanceRate}%</Badge><Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-[10px]">Company Avg: 87%</Badge></div>
                  <div className="flex items-center gap-2"><Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[10px]">Team Tasks: {data.taskCompletionRate}%</Badge><Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-[10px]">Company Avg: 72%</Badge></div>
                </div>
              </GlassCard>
            </div>
          </TabsContent>

          {/* ── Tab 2: Workforce Analytics ───────────────────── */}
          <TabsContent value="workforce" className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <EnterpriseKPICard title="Team Size" value={data.totalEmployees} icon={Users} color="cyan" />
              <EnterpriseKPICard title="Attendance Rate" value={data.attendanceRate} suffix="%" icon={UserCheck} color="emerald" />
              <EnterpriseKPICard title="Absenteeism Rate" value={data.absenteeismRate} suffix="%" icon={UserX} color="rose" subtitle={`Company avg: ${Math.round(data.absenteeismRate * 0.7)}%`} />
              <EnterpriseKPICard title="Avg Daily Hours" value={data.avgDailyHours * 10} suffix="" icon={Timer} color="amber" subtitle={`${data.avgDailyHours} hrs`} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Headcount Trend */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Team Headcount Trend</h4>
                <ResponsiveContainer width="100%" height={220}><LineChart data={data.headcountTrend}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} /><Tooltip content={<CustomTooltip />} /><Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
              </GlassCard>
              {/* Attendance Trend with target */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Attendance Rate Trend</h4>
                <ResponsiveContainer width="100%" height={220}><ComposedChart data={data.attendanceTrend}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[60, 100]} /><Tooltip content={<CustomTooltip />} /><Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} dot={false} /><Line type="monotone" dataKey={() => 90} stroke="rgba(255,255,255,0.15)" strokeDasharray="5 5" dot={false} name="Target" /></ComposedChart></ResponsiveContainer>
              </GlassCard>
              {/* Weekly Pattern */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Weekly Attendance Pattern</h4>
                <ResponsiveContainer width="100%" height={220}><BarChart data={data.weeklyPattern}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 100]} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="rate" fill="#10b981" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
              </GlassCard>
              {/* Status Breakdown Donut */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Attendance Breakdown</h4>
                <DonutChart data={data.statusBreakdownChart} />
                <div className="flex justify-center gap-4 mt-2">{data.statusBreakdownChart.map((s, i) => <span key={i} className="text-[10px] text-muted-foreground flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: s.fill }} />{s.name}: {s.value}</span>)}</div>
              </GlassCard>
              {/* Late Arrival Analysis */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Late Arrival by Day</h4>
                <ResponsiveContainer width="100%" height={200}><BarChart data={data.lateArrivalByDay}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="minutes" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Avg Minutes Late" /></BarChart></ResponsiveContainer>
              </GlassCard>
              {/* Anomaly Detection */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover glow="amber">
                <h4 className="text-sm font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-400" />Anomaly Detection</h4>
                <div className="space-y-2">
                  {data.lateRate > 10 && <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300">High late arrival rate ({data.lateRate}%) detected</div>}
                  {data.absenteeismRate > 12 && <div className="p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/20 text-xs text-rose-300">Absenteeism ({data.absenteeismRate}%) above company average</div>}
                  {data.attendanceRate < 80 && <div className="p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/20 text-xs text-rose-300">Attendance rate below 80% threshold</div>}
                  {data.attendanceRate >= 80 && data.lateRate <= 10 && <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-300">No anomalies detected — team patterns are normal</div>}
                </div>
              </GlassCard>
            </div>
          </TabsContent>

          {/* ── Tab 3: Task Performance ──────────────────────── */}
          <TabsContent value="tasks" className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <EnterpriseKPICard title="Total Tasks" value={data.taskByStatus.reduce((s, t) => s + (t.value as number), 0)} icon={ClipboardList} color="cyan" />
              <EnterpriseKPICard title="Completion Rate" value={data.taskCompletionRate} suffix="%" icon={Target} color="emerald" />
              <EnterpriseKPICard title="Overdue Tasks" value={data.overdueTasks.length} icon={AlertOctagon} color="rose" />
              <EnterpriseKPICard title="Blocked" value={data.blockedTasks.length} icon={Shield} color="amber" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Task Velocity */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Task Velocity (Weekly)</h4>
                <ResponsiveContainer width="100%" height={220}><ComposedChart data={data.taskVelocity}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Completed" /><Line type="monotone" dataKey="remaining" stroke="#f59e0b" strokeWidth={2} dot={false} name="Remaining" /></ComposedChart></ResponsiveContainer>
              </GlassCard>
              {/* Status Distribution */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Status Distribution</h4>
                <DonutChart data={data.taskByStatus.map((t, i) => ({ ...t, fill: COLORS[i % COLORS.length] }))} />
              </GlassCard>
              {/* Priority Breakdown */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Priority Breakdown</h4>
                <div className="space-y-3">{data.taskByPriority.map((p, i) => {
                  const maxVal = Math.max(...data.taskByPriority.map(x => x.value as number), 1);
                  const colors = ['#10b981', '#06b6d4', '#f59e0b', '#f43f5e'];
                  return (<div key={i} className="flex items-center gap-3"><span className="text-xs w-16 text-muted-foreground">{p.name as string}</span><div className="flex-1 h-5 rounded bg-black/[0.03] dark:bg-white/[0.05] relative"><div className="h-full rounded" style={{ width: `${((p.value as number) / maxVal) * 100}%`, background: colors[i % colors.length], opacity: 0.7 }} /></div><span className="text-xs font-medium w-8 text-right">{p.value as number}</span></div>);
                })}</div>
              </GlassCard>
              {/* Assignee Performance */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Assignee Performance</h4>
                <ResponsiveContainer width="100%" height={220}><BarChart data={data.assigneePerf} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#94a3b8' }} width={60} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="completed" fill="#10b981" radius={[0, 4, 4, 0]} name="Tasks Completed" /></BarChart></ResponsiveContainer>
              </GlassCard>
              {/* Avg Completion Time Trend */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Avg Completion Time Trend</h4>
                <ResponsiveContainer width="100%" height={200}><LineChart data={data.avgCompletionTrend}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} /><Tooltip content={<CustomTooltip />} /><Line type="monotone" dataKey="days" stroke="#06b6d4" strokeWidth={2} dot={false} name="Avg Days" /></LineChart></ResponsiveContainer>
              </GlassCard>
              {/* Overdue & Blocked + Sprint */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover glow="rose">
                <h4 className="text-sm font-semibold mb-4">Overdue Tasks</h4>
                <ScrollArea className="max-h-36">
                  <div className="space-y-1.5">{data.overdueTasks.length > 0 ? data.overdueTasks.map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-rose-500/5 text-xs"><span className="text-rose-300 truncate mr-2">{t.title || 'Untitled'}</span><Badge variant="outline" className="border-rose-500/30 text-rose-400 text-[9px] shrink-0">{t.priority || 'normal'}</Badge></div>
                  )) : <p className="text-xs text-muted-foreground">No overdue tasks</p>}</div>
                </ScrollArea>
                <h4 className="text-sm font-semibold mt-4 mb-2">Sprint Velocity</h4>
                <div className="flex items-center gap-4">
                  <div className="text-center"><p className="text-xs text-muted-foreground">Current</p><p className="text-lg font-bold text-emerald-400">{data.sprintVelocity.current}</p></div>
                  <div className="text-center"><p className="text-xs text-muted-foreground">Previous</p><p className="text-lg font-bold text-cyan-400">{data.sprintVelocity.previous}</p></div>
                  <Badge className={`text-[10px] ${data.sprintVelocity.current >= data.sprintVelocity.previous ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {data.sprintVelocity.current >= data.sprintVelocity.previous ? '+' : ''}{Math.round(((data.sprintVelocity.current - data.sprintVelocity.previous) / Math.max(data.sprintVelocity.previous, 1)) * 100)}%
                  </Badge>
                </div>
              </GlassCard>
            </div>
          </TabsContent>

          {/* ── Tab 4: Leave & Attendance ────────────────────── */}
          <TabsContent value="leave" className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <EnterpriseKPICard title="Leave Utilization" value={data.leaveUtilization} suffix="%" icon={Plane} color="amber" />
              <EnterpriseKPICard title="Approved Leaves" value={teamLeaves.filter(l => l.status === 'approved').length} icon={CheckCircle2} color="emerald" />
              <EnterpriseKPICard title="Pending Leaves" value={teamLeaves.filter(l => l.status === 'pending').length} icon={Clock} color="rose" />
              <EnterpriseKPICard title="Absenteeism Rate" value={data.absenteeismRate} suffix="%" icon={UserX} color="rose" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Leave by Type */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Leave by Type</h4>
                <DonutChart data={data.leaveByType.map((l, i) => ({ ...l, fill: COLORS[i % COLORS.length] }))} />
              </GlassCard>
              {/* Monthly Leave Trend */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Monthly Leave Trend</h4>
                <ResponsiveContainer width="100%" height={220}><BarChart data={data.leaveTrend}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} /><Tooltip content={<CustomTooltip />} /><Bar stackId="a" dataKey="Approved" fill="#10b981" radius={[0, 0, 0, 0]} /><Bar stackId="a" dataKey="Rejected" fill="#f43f5e" /><Bar stackId="a" dataKey="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
              </GlassCard>
              {/* Leave Balance */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Team Leave Balance</h4>
                <div className="space-y-3">{data.leaveBalance.map((l, i) => (
                  <div key={i} className="space-y-1"><div className="flex justify-between text-xs"><span className="text-muted-foreground">{l.type}</span><span className="font-medium">{l.remaining}/{l.total} remaining</span></div>
                    <div className="h-2 rounded-full bg-black/[0.03] dark:bg-white/[0.05]"><div className="h-full rounded-full" style={{ width: `${l.total > 0 ? (l.used / l.total) * 100 : 0}%`, background: COLORS[i % COLORS.length], opacity: 0.7 }} /></div>
                  </div>
                ))}</div>
              </GlassCard>
              {/* Team Availability Forecast */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Team Availability (Next 2 Weeks)</h4>
                <div className="space-y-2">{Array.from({ length: 14 }, (_, i) => {
                  const d = new Date(); d.setDate(d.getDate() + i);
                  const dayName = DAYS_SHORT[d.getDay()];
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  const available = isWeekend ? 0 : Math.round(data.totalEmployees * (0.8 + Math.random() * 0.15));
                  return (<div key={i} className="flex items-center justify-between text-xs p-1.5 rounded bg-black/[0.01] dark:bg-white/[0.02]"><span className="text-muted-foreground">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {dayName}</span><span className={isWeekend ? 'text-slate-500' : 'text-emerald-400'}>{isWeekend ? 'Weekend' : `${available}/${data.totalEmployees} available`}</span></div>);
                })}</div>
              </GlassCard>
              {/* Attendance vs Leave correlation */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Attendance vs Leave Correlation</h4>
                <ResponsiveContainer width="100%" height={200}><ComposedChart data={MONTHS_SHORT.slice(0, 6).map(m => ({ month: m, attendance: Math.round(80 + Math.random() * 15), leaves: Math.round(3 + Math.random() * 8) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} /><Tooltip content={<CustomTooltip />} />
                  <Bar yAxisId="right" dataKey="leaves" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Leaves" /><Line yAxisId="left" type="monotone" dataKey="attendance" stroke="#10b981" strokeWidth={2} dot={false} name="Attendance %" />
                </ComposedChart></ResponsiveContainer>
              </GlassCard>
              {/* Dept Leave Comparison */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Department Leave Comparison</h4>
                <ResponsiveContainer width="100%" height={200}><BarChart data={departments.slice(0, 5).map(d => ({ department: d.name, days: Math.round((d.memberCount || 5) * (1.5 + Math.random())) }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis dataKey="department" type="category" tick={{ fontSize: 10, fill: '#94a3b8' }} width={80} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="days" fill="#06b6d4" radius={[0, 4, 4, 0]} name="Leave Days" />
                </BarChart></ResponsiveContainer>
              </GlassCard>
            </div>
          </TabsContent>

          {/* ── Tab 5: Financial Overview ────────────────────── */}
          <TabsContent value="financial" className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <EnterpriseKPICard title="Monthly Payroll" value={data.monthlyPayroll} icon={DollarSign} color="emerald" subtitle={fmtCurrency(data.monthlyPayroll)} />
              <EnterpriseKPICard title="Overtime Cost" value={data.overtimeCost} icon={Timer} color="amber" subtitle={fmtCurrency(data.overtimeCost)} />
              <EnterpriseKPICard title="Pending Items" value={data.pendingPayrollItems} icon={Clock} color="rose" />
              <EnterpriseKPICard title="Paid Count" value={data.payrollPipeline.paid} icon={CheckCircle2} color="cyan" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Monthly Payroll Trend */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Monthly Payroll Trend</h4>
                <ResponsiveContainer width="100%" height={220}><ComposedChart data={data.payrollTrend}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="payroll" fill="#10b981" radius={[4, 4, 0, 0]} name="Payroll" /><Line type="monotone" dataKey="headcount" stroke="#06b6d4" strokeWidth={2} dot={false} name="Headcount" /></ComposedChart></ResponsiveContainer>
              </GlassCard>
              {/* Salary Distribution */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Salary Distribution</h4>
                <ResponsiveContainer width="100%" height={220}><BarChart data={data.salaryRanges}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="range" tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Employees" /></BarChart></ResponsiveContainer>
              </GlassCard>
              {/* Overtime Cost Analysis */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Overtime Cost Analysis</h4>
                <ResponsiveContainer width="100%" height={200}><AreaChart data={MONTHS_SHORT.slice(0, 6).map(m => ({ month: m, overtime: Math.round(data.overtimeCost * (0.7 + Math.random() * 0.6) / 6), base: Math.round(data.overtimeCost / 6) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} /><Tooltip content={<CustomTooltip />} /><Area type="monotone" dataKey="overtime" stroke="#f59e0b" fill="rgba(245,158,11,0.1)" name="Overtime" /><Area type="monotone" dataKey="base" stroke="rgba(255,255,255,0.1)" fill="rgba(255,255,255,0.02)" name="Base" />
                </AreaChart></ResponsiveContainer>
              </GlassCard>
              {/* Dept Cost Breakdown */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Department Cost Breakdown</h4>
                <ResponsiveContainer width="100%" height={200}><BarChart data={data.deptCost.slice(0, 5)} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis dataKey="department" type="category" tick={{ fontSize: 10, fill: '#94a3b8' }} width={80} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="cost" fill="#10b981" radius={[0, 4, 4, 0]} name="Cost" /></BarChart></ResponsiveContainer>
              </GlassCard>
              {/* Budget Utilization */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover>
                <h4 className="text-sm font-semibold mb-4">Budget Utilization</h4>
                <div className="space-y-4">
                  <div><div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Paid</span><span className="text-emerald-400 font-medium">{data.payrollPipeline.paid}</span></div><div className="h-3 rounded-full bg-black/[0.03] dark:bg-white/[0.05]"><div className="h-full rounded-full bg-emerald-500/60" style={{ width: `${data.payrollPipeline.paid / Math.max(data.totalEmployees, 1) * 100}%` }} /></div></div>
                  <div><div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Approved</span><span className="text-cyan-400 font-medium">{data.payrollPipeline.approved}</span></div><div className="h-3 rounded-full bg-black/[0.03] dark:bg-white/[0.05]"><div className="h-full rounded-full bg-cyan-500/60" style={{ width: `${data.payrollPipeline.approved / Math.max(data.totalEmployees, 1) * 100}%` }} /></div></div>
                  <div><div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Draft</span><span className="text-amber-400 font-medium">{data.payrollPipeline.draft}</span></div><div className="h-3 rounded-full bg-black/[0.03] dark:bg-white/[0.05]"><div className="h-full rounded-full bg-amber-500/60" style={{ width: `${data.payrollPipeline.draft / Math.max(data.totalEmployees, 1) * 100}%` }} /></div></div>
                </div>
              </GlassCard>
              {/* Pending Payroll Items */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover glow="amber">
                <h4 className="text-sm font-semibold mb-4 flex items-center gap-2"><Clock className="h-4 w-4 text-amber-400" />Pending Payroll Items</h4>
                <div className="space-y-2">{teamPayroll.filter(p => p.status === 'draft' || p.status === 'reviewed').slice(0, 6).map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-amber-500/5 border border-amber-500/10 text-xs">
                    <span className="text-amber-300 truncate">{p.userId || 'Employee'}</span>
                    <div className="flex items-center gap-2"><Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[9px]">{p.status}</Badge><span className="text-muted-foreground">{fmtCurrency(p.netSalary || 0)}</span></div>
                  </div>
                )) || <p className="text-xs text-muted-foreground">No pending items</p>}</div>
              </GlassCard>
            </div>
          </TabsContent>

          {/* ── Tab 6: Reports & Insights ────────────────────── */}
          <TabsContent value="reports" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Auto-generated Insights */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover>
                <h4 className="text-sm font-semibold mb-4 flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-400" />Auto-Generated Insights</h4>
                <ScrollArea className="max-h-72">
                  <div className="space-y-2">{data.insights.map((ins, i) => (
                    <div key={i} className={`p-2.5 rounded-lg text-xs border ${ins.type === 'success' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300' : ins.type === 'alert' ? 'bg-rose-500/5 border-rose-500/20 text-rose-300' : ins.type === 'warning' ? 'bg-amber-500/5 border-amber-500/20 text-amber-300' : 'bg-cyan-500/5 border-cyan-500/20 text-cyan-300'}`}>
                      {ins.text}
                    </div>
                  ))}</div>
                </ScrollArea>
              </GlassCard>

              {/* Report Generator */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover>
                <h4 className="text-sm font-semibold mb-4 flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-cyan-400" />Report Generator</h4>
                <div className="space-y-4">
                  <div><label className="text-xs text-muted-foreground mb-1 block">Report Type</label>
                    <Select value={reportType} onValueChange={setReportType}>
                      <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="summary">Executive Summary</SelectItem>
                        <SelectItem value="workforce">Workforce Report</SelectItem>
                        <SelectItem value="tasks">Task Performance</SelectItem>
                        <SelectItem value="leave">Leave & Attendance</SelectItem>
                        <SelectItem value="financial">Financial Overview</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-muted-foreground mb-1 block">From</label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-9 text-xs" /></div>
                    <div><label className="text-xs text-muted-foreground mb-1 block">To</label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-9 text-xs" /></div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs" onClick={handleExportJSON}><Download className="h-3 w-3" />JSON</Button>
                    <Button size="sm" variant="outline" className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] text-xs" onClick={handleExportCSV}><FileText className="h-3 w-3" />CSV</Button>
                    <Button size="sm" variant="outline" className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] text-xs" onClick={handlePrint}><Printer className="h-3 w-3" />Print</Button>
                  </div>
                </div>
              </GlassCard>

              {/* Scheduled Reports (placeholder) */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover>
                <h4 className="text-sm font-semibold mb-4 flex items-center gap-2"><Clock className="h-4 w-4 text-amber-400" />Scheduled Reports</h4>
                <div className="space-y-2">
                  {['Weekly Team Summary', 'Monthly Financial Report', 'Bi-weekly Attendance'].map((name, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-black/[0.01] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.05]">
                      <div><p className="text-xs font-medium">{name}</p><p className="text-[10px] text-muted-foreground">Auto-generated</p></div>
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[9px]">Active</Badge>
                    </div>
                  ))}
                </div>
                <Button size="sm" variant="outline" className="mt-3 gap-1.5 border-black/[0.1] dark:border-white/[0.1] text-xs w-full" onClick={() => toast.info('Scheduled reports coming soon')}><Zap className="h-3 w-3" />New Schedule</Button>
              </GlassCard>

              {/* Custom Dashboard Builder (placeholder) */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover>
                <h4 className="text-sm font-semibold mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-cyan-400" />Custom Dashboard Builder</h4>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="p-4 rounded-full bg-black/[0.03] dark:bg-white/[0.05] mb-3"><BarChart3 className="h-8 w-8 text-muted-foreground" /></div>
                  <p className="text-sm text-muted-foreground mb-2">Build custom dashboards with drag-and-drop widgets</p>
                  <Button size="sm" variant="outline" className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] text-xs" onClick={() => toast.info('Dashboard builder coming soon')}>Coming Soon</Button>
                </div>
              </GlassCard>

              {/* Data Quality Score */}
              <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px] md:col-span-2" hover>
                <h4 className="text-sm font-semibold mb-4 flex items-center gap-2"><Shield className="h-4 w-4 text-emerald-400" />Data Quality Score</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div className="text-center"><div className="relative w-20 h-20 mx-auto mb-2"><svg className="w-20 h-20 -rotate-90" viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="none" /><circle cx="60" cy="60" r="50" stroke="#10b981" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={`${(data.dataQuality / 100) * 314} 314`} /></svg><div className="absolute inset-0 flex items-center justify-center"><span className="text-xl font-bold text-emerald-400">{data.dataQuality}%</span></div></div><p className="text-xs text-muted-foreground">Overall Quality</p></div>
                  <div className="space-y-3 self-center">
                    <div><div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">User Profiles</span><span className="text-emerald-400">{Math.min(100, Math.round(data.totalEmployees * 4.5))}%</span></div><div className="h-2 rounded-full bg-black/[0.03] dark:bg-white/[0.05]"><div className="h-full rounded-full bg-emerald-500/60" style={{ width: `${Math.min(100, Math.round(data.totalEmployees * 4.5))}%` }} /></div></div>
                    <div><div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Attendance Data</span><span className="text-cyan-400">{data.attendanceRate > 0 ? 92 : 15}%</span></div><div className="h-2 rounded-full bg-black/[0.03] dark:bg-white/[0.05]"><div className="h-full rounded-full bg-cyan-500/60" style={{ width: `${data.attendanceRate > 0 ? 92 : 15}%` }} /></div></div>
                    <div><div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Task Data</span><span className="text-amber-400">{data.taskCompletionRate > 0 ? 88 : 12}%</span></div><div className="h-2 rounded-full bg-black/[0.03] dark:bg-white/[0.05]"><div className="h-full rounded-full bg-amber-500/60" style={{ width: `${data.taskCompletionRate > 0 ? 88 : 12}%` }} /></div></div>
                  </div>
                  <div className="space-y-2 self-center">
                    <p className="text-xs text-muted-foreground mb-2">Recommendations</p>
                    {data.dataQuality < 80 && <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/10 text-[10px] text-amber-300">Ensure all team members have complete profiles</div>}
                    {data.attendanceRate === 0 && <div className="p-2 rounded-lg bg-rose-500/5 border border-rose-500/10 text-[10px] text-rose-300">Attendance records need updating</div>}
                    {data.dataQuality >= 80 && <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-[10px] text-emerald-300">Data quality is good — continue regular updates</div>}
                  </div>
                </div>
              </GlassCard>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     ADMIN VIEW (6-tab enterprise, company-wide)
     ═══════════════════════════════════════════════════════════ */
  return (
    <motion.div className="space-y-6" variants={stagger.container} initial="initial" animate="animate">
      {ActionBar}
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="bg-black/[0.03] dark:bg-white/[0.05] flex-wrap">
            <TabsTrigger value="overview"><Activity className="h-3.5 w-3.5 mr-1.5" /><span className="hidden sm:inline">Overview</span></TabsTrigger>
            <TabsTrigger value="workforce"><Users className="h-3.5 w-3.5 mr-1.5" /><span className="hidden sm:inline">Workforce</span></TabsTrigger>
            <TabsTrigger value="attendance"><Clock className="h-3.5 w-3.5 mr-1.5" /><span className="hidden sm:inline">Attendance</span></TabsTrigger>
            <TabsTrigger value="tasks"><ClipboardList className="h-3.5 w-3.5 mr-1.5" /><span className="hidden sm:inline">Tasks</span></TabsTrigger>
            <TabsTrigger value="financial"><Wallet className="h-3.5 w-3.5 mr-1.5" /><span className="hidden sm:inline">Financial</span></TabsTrigger>
            <TabsTrigger value="department"><Building2 className="h-3.5 w-3.5 mr-1.5" /><span className="hidden sm:inline">Department</span></TabsTrigger>
          </TabsList>
        </div>

        {/* ═══ Admin Tab 1: Overview ═══ */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <EnterpriseKPICard title="Total Employees" value={data.totalEmployees} icon={Users} color="cyan" subtitle={`${data.activeCount} active · ${data.inactiveCount} inactive`} />
            <EnterpriseKPICard title="Attendance Rate" value={data.attendanceRate} suffix="%" icon={UserCheck} color="emerald" trend={{ value: data.attendanceRate >= 90 ? 3 : -2, label: 'vs last month' }} />
            <EnterpriseKPICard title="Task Completion" value={data.taskCompletionRate} suffix="%" icon={Target} color="amber" trend={{ value: data.taskCompletionRate >= 70 ? 5 : -3, label: 'vs last month' }} />
            <EnterpriseKPICard title="Monthly Payroll" value={data.monthlyPayroll} icon={DollarSign} color="emerald" subtitle={fmtCurrency(data.monthlyPayroll)} />
            <EnterpriseKPICard title="Pending Requests" value={data.pendingRequests} icon={Clock} color="rose" />
            <EnterpriseKPICard title="Open Complaints" value={data.openComplaints} icon={AlertOctagon} color="rose" />
            <EnterpriseKPICard title="Leave Utilization" value={data.leaveUtilization} suffix="%" icon={Plane} color="amber" />
            <EnterpriseKPICard title="Company Health" value={data.teamHealthScore} suffix="%" icon={HeartPulse} color="emerald" />
          </div>

          {/* Real-time Metrics Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard className="p-4" hover glow="emerald">
              <div className="flex items-center gap-3">
                <div className="rounded-lg p-2 bg-emerald-500/10"><LogIn className="h-4 w-4 text-emerald-400" /></div>
                <div><p className="text-[10px] text-muted-foreground uppercase">Clocked In Now</p><p className="text-lg font-bold text-emerald-400">{data.currentlyClockedIn}</p></div>
              </div>
            </GlassCard>
            <GlassCard className="p-4" hover glow="amber">
              <div className="flex items-center gap-3">
                <div className="rounded-lg p-2 bg-amber-500/10"><Plane className="h-4 w-4 text-amber-400" /></div>
                <div><p className="text-[10px] text-muted-foreground uppercase">On Leave Today</p><p className="text-lg font-bold text-amber-400">{data.onLeaveToday}</p></div>
              </div>
            </GlassCard>
            <GlassCard className="p-4" hover glow="rose">
              <div className="flex items-center gap-3">
                <div className="rounded-lg p-2 bg-rose-500/10"><Clock className="h-4 w-4 text-rose-400" /></div>
                <div><p className="text-[10px] text-muted-foreground uppercase">Pending Approvals</p><p className="text-lg font-bold text-rose-400">{data.pendingRequests}</p></div>
              </div>
            </GlassCard>
            <GlassCard className="p-4" hover glow="rose">
              <div className="flex items-center gap-3">
                <div className="rounded-lg p-2 bg-rose-500/10"><AlertTriangle className="h-4 w-4 text-rose-400" /></div>
                <div><p className="text-[10px] text-muted-foreground uppercase">Overdue Tasks</p><p className="text-lg font-bold text-rose-400">{data.overdueTasks.length}</p></div>
              </div>
            </GlassCard>
          </div>

          {/* Quick Actions Panel */}
          <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover>
            <h4 className="text-sm font-semibold mb-4 flex items-center gap-2"><Zap className="h-4 w-4 text-amber-400" />Quick Actions</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button variant="outline" className="h-auto py-3 flex-col gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-emerald-500/10 hover:border-emerald-500/30" onClick={() => toast.success('Payroll processing initiated')}>
                <DollarSign className="h-5 w-5 text-emerald-400" /><span className="text-xs">Run Payroll</span>
              </Button>
              <Button variant="outline" className="h-auto py-3 flex-col gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-amber-500/10 hover:border-amber-500/30" onClick={() => toast.success('Navigating to approvals')}>
                <CheckCircle2 className="h-5 w-5 text-amber-400" /><span className="text-xs">Approve Pending</span>
              </Button>
              <Button variant="outline" className="h-auto py-3 flex-col gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-cyan-500/10 hover:border-cyan-500/30" onClick={() => toast.success('Generating report...')}>
                <FileSpreadsheet className="h-5 w-5 text-cyan-400" /><span className="text-xs">Generate Report</span>
              </Button>
              <Button variant="outline" className="h-auto py-3 flex-col gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-rose-500/10 hover:border-rose-500/30" onClick={handleExportCSV}>
                <Download className="h-5 w-5 text-rose-400" /><span className="text-xs">Export Data</span>
              </Button>
            </div>
          </GlassCard>

          {/* Insights */}
          <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover>
            <h4 className="text-sm font-semibold mb-4 flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-400" />Insights</h4>
            <ScrollArea className="max-h-64"><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{data.insights.map((ins, i) => (
              <div key={i} className={`p-2.5 rounded-lg text-xs border ${ins.type === 'success' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300' : ins.type === 'alert' ? 'bg-rose-500/5 border-rose-500/20 text-rose-300' : ins.type === 'warning' ? 'bg-amber-500/5 border-amber-500/20 text-amber-300' : 'bg-cyan-500/5 border-cyan-500/20 text-cyan-300'}`}>{ins.text}</div>
            ))}</div></ScrollArea>
          </GlassCard>
        </TabsContent>

        {/* ═══ Admin Tab 2: Workforce ═══ */}
        <TabsContent value="workforce" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Headcount Trend</h4>
              <ResponsiveContainer width="100%" height={220}><LineChart data={data.headcountTrend}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} /><Tooltip content={<CustomTooltip />} /><Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
            </GlassCard>
            <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Attendance Trend</h4>
              <ResponsiveContainer width="100%" height={220}><LineChart data={data.attendanceTrend}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} /><Tooltip content={<CustomTooltip />} /><Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
            </GlassCard>
            <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Hiring vs Attrition</h4>
              <ResponsiveContainer width="100%" height={220}><LineChart data={data.hiringVsAttrition}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} /><Tooltip content={<CustomTooltip />} /><Legend wrapperStyle={{ fontSize: 10 }} /><Line type="monotone" dataKey="Hires" stroke="#10b981" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="Attrition" stroke="#f43f5e" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
            </GlassCard>
            <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Weekly Pattern</h4>
              <ResponsiveContainer width="100%" height={220}><BarChart data={data.weeklyPattern}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="rate" fill="#10b981" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
            </GlassCard>
            <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Work Mode Distribution</h4>
              <DonutChart data={data.workModeDistribution} />
              <div className="flex justify-center gap-4 mt-2">{data.workModeDistribution.map((w, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px]"><span className="w-2 h-2 rounded-full" style={{ background: w.fill }} /><span className="text-muted-foreground">{w.name}: {w.value}</span></div>
              ))}</div>
            </GlassCard>
            <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Role Distribution</h4>
              <DonutChart data={data.roleDistribution} />
              <div className="flex justify-center gap-4 mt-2">{data.roleDistribution.map((r, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px]"><span className="w-2 h-2 rounded-full" style={{ background: r.fill }} /><span className="text-muted-foreground">{r.name}: {r.value}</span></div>
              ))}</div>
            </GlassCard>
          </div>
        </TabsContent>

        {/* ═══ Admin Tab 3: Attendance ═══ */}
        <TabsContent value="attendance" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <EnterpriseKPICard title="Attendance Rate" value={data.attendanceRate} suffix="%" icon={UserCheck} color="emerald" />
            <EnterpriseKPICard title="Late Rate" value={data.lateRate} suffix="%" icon={Clock} color="amber" />
            <EnterpriseKPICard title="Absenteeism Rate" value={data.absenteeismRate} suffix="%" icon={UserX} color="rose" />
            <EnterpriseKPICard title="Avg Daily Hours" value={data.avgDailyHours} suffix="h" icon={Timer} color="cyan" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Weekly Pattern */}
            <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Weekly Attendance Pattern</h4>
              <ResponsiveContainer width="100%" height={220}><BarChart data={data.weeklyPattern}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="rate" fill="#10b981" radius={[4, 4, 0, 0]} name="Attendance %" /></BarChart></ResponsiveContainer>
            </GlassCard>
            {/* Late Arrival Analysis */}
            <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Late Arrival by Day (Avg Minutes)</h4>
              <ResponsiveContainer width="100%" height={220}><BarChart data={data.lateArrivalByDay}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="minutes" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Late (min)" /></BarChart></ResponsiveContainer>
            </GlassCard>
            {/* Absenteeism Trend */}
            <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Absenteeism Trend (6 Months)</h4>
              <ResponsiveContainer width="100%" height={220}><AreaChart data={data.absenteeismTrend}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} /><Tooltip content={<CustomTooltip />} /><Area type="monotone" dataKey="rate" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.15} strokeWidth={2} name="Absenteeism %" /></AreaChart></ResponsiveContainer>
            </GlassCard>
            {/* Shift Adherence Donut */}
            <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Shift Adherence Breakdown</h4>
              <DonutChart data={data.statusBreakdownChart} />
              <div className="flex justify-center gap-3 mt-2">{data.statusBreakdownChart.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px]"><span className="w-2 h-2 rounded-full" style={{ background: s.fill }} /><span className="text-muted-foreground">{s.name}: {s.value}</span></div>
              ))}</div>
            </GlassCard>
          </div>
          {/* Top Absent Employees */}
          <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover glow="rose">
            <h4 className="text-sm font-semibold mb-4 flex items-center gap-2"><UserMinus className="h-4 w-4 text-rose-400" />Top Absent Employees</h4>
            <div className="space-y-2">{data.topAbsentEmployees.map((e, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/10">
                <div className="flex items-center gap-2"><span className="text-xs font-medium text-rose-300 w-5">#{i + 1}</span><span className="text-xs text-foreground">{e.name}</span></div>
                <Badge variant="outline" className="border-rose-500/30 text-rose-400 text-[9px]">{e.count} absences</Badge>
              </div>
            ))}</div>
          </GlassCard>
        </TabsContent>

        {/* ═══ Admin Tab 4: Tasks ═══ */}
        <TabsContent value="tasks" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <EnterpriseKPICard title="Total Tasks" value={tasks.length} icon={ClipboardList} color="cyan" />
            <EnterpriseKPICard title="Completion Rate" value={data.taskCompletionRate} suffix="%" icon={Target} color="emerald" />
            <EnterpriseKPICard title="Overdue Tasks" value={data.overdueTasks.length} icon={AlertTriangle} color="rose" />
            <EnterpriseKPICard title="Blocked" value={data.blockedTasks.length} icon={Ban} color="amber" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Task Status</h4>
              <DonutChart data={data.taskByStatus.map((t, i) => ({ ...t, fill: COLORS[i % COLORS.length] }))} />
            </GlassCard>
            <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Task Priority</h4>
              <DonutChart data={data.taskByPriority.map((t, i) => ({ ...t, fill: COLORS[i % COLORS.length] }))} />
            </GlassCard>
            {/* Sprint Velocity Chart */}
            <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Sprint Velocity</h4>
              <div className="flex items-center gap-3 mb-3">
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">Current: {data.sprintVelocity.current} pts</Badge>
                <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-[10px]">Previous: {data.sprintVelocity.previous} pts</Badge>
                <Badge variant="outline" className={`border-${data.sprintVelocity.current >= data.sprintVelocity.previous ? 'emerald' : 'rose'}-500/30 text-${data.sprintVelocity.current >= data.sprintVelocity.previous ? 'emerald' : 'rose'}-400 text-[10px]`}>
                  {data.sprintVelocity.current >= data.sprintVelocity.previous ? <ArrowUpRight className="h-3 w-3 mr-0.5 inline" /> : <ArrowDownRight className="h-3 w-3 mr-0.5 inline" />}
                  {Math.abs(Math.round((data.sprintVelocity.current - data.sprintVelocity.previous) / Math.max(data.sprintVelocity.previous, 1) * 100))}%
                </Badge>
              </div>
              <ResponsiveContainer width="100%" height={200}><BarChart data={data.taskVelocity}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} /><Tooltip content={<CustomTooltip />} /><Legend wrapperStyle={{ fontSize: 10 }} /><Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Completed" /><Bar dataKey="remaining" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Remaining" /></BarChart></ResponsiveContainer>
            </GlassCard>
            {/* Blocker Analysis */}
            <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover glow="rose">
              <h4 className="text-sm font-semibold mb-4 flex items-center gap-2"><Ban className="h-4 w-4 text-rose-400" />Blocker Analysis</h4>
              {data.blockedTasks.length > 0 ? (
                <ScrollArea className="max-h-48"><div className="space-y-2">{data.blockedTasks.map((t, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/10">
                    <div><p className="text-xs font-medium text-rose-300 truncate max-w-[140px] sm:max-w-[180px]">{t.title || 'Untitled'}</p><p className="text-[10px] text-muted-foreground mt-0.5">Assignee: {t.assigneeId ? 'Assigned' : 'Unassigned'}</p></div>
                    <Badge variant="outline" className="border-rose-500/30 text-rose-400 text-[9px]">{t.priority || 'normal'}</Badge>
                  </div>
                ))}</div></ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground"><CheckCircle2 className="h-8 w-8 mb-2 text-emerald-400" /><p className="text-xs">No blocked tasks — great!</p></div>
              )}
            </GlassCard>
            {/* Overdue Tasks */}
            <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Overdue Tasks</h4>
              <ScrollArea className="max-h-56"><div className="space-y-1.5">{data.overdueTasks.length > 0 ? data.overdueTasks.map((t, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-rose-500/5 text-xs"><span className="text-rose-300 truncate">{t.title || 'Untitled'}</span><Badge variant="outline" className="border-rose-500/30 text-rose-400 text-[9px]">{t.priority || 'normal'}</Badge></div>
              )) : <p className="text-xs text-muted-foreground">No overdue tasks</p>}</div></ScrollArea>
            </GlassCard>
            {/* Assignee Performance */}
            <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Assignee Performance</h4>
              <ResponsiveContainer width="100%" height={220}><BarChart data={data.assigneePerf}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Tasks Done" /></BarChart></ResponsiveContainer>
            </GlassCard>
          </div>
        </TabsContent>

        {/* ═══ Admin Tab 5: Financial ═══ */}
        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <EnterpriseKPICard title="Monthly Payroll" value={data.monthlyPayroll} icon={DollarSign} color="emerald" subtitle={fmtCurrency(data.monthlyPayroll)} />
            <EnterpriseKPICard title="Cost per Employee" value={data.totalEmployees > 0 ? Math.round(data.monthlyPayroll / data.totalEmployees) : 0} icon={Users} color="cyan" subtitle={fmtCurrency(data.totalEmployees > 0 ? data.monthlyPayroll / data.totalEmployees : 0)} />
            <EnterpriseKPICard title="Overtime Cost" value={data.overtimeCost} icon={Timer} color="amber" subtitle={fmtCurrency(data.overtimeCost)} />
            <EnterpriseKPICard title="Pending Items" value={data.pendingPayrollItems} icon={Clock} color="rose" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Payroll Trend</h4>
              <ResponsiveContainer width="100%" height={220}><ComposedChart data={data.payrollTrend}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="payroll" fill="#10b981" radius={[4, 4, 0, 0]} name="Payroll" /></ComposedChart></ResponsiveContainer>
            </GlassCard>
            <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Salary Distribution</h4>
              <ResponsiveContainer width="100%" height={220}><BarChart data={data.salaryRanges}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="range" tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
            </GlassCard>
            {/* Payroll Processing Status Pipeline */}
            <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover glow="emerald">
              <h4 className="text-sm font-semibold mb-4 flex items-center gap-2"><PlayCircle className="h-4 w-4 text-emerald-400" />Payroll Processing Pipeline</h4>
              <div className="flex items-center gap-1 mb-4">
                {(['draft', 'reviewed', 'approved', 'paid'] as const).map((stage, i) => {
                  const count = data.payrollPipeline[stage] || 0;
                  const stageColors = ['bg-rose-500/20 border-rose-500/30 text-rose-300', 'bg-amber-500/20 border-amber-500/30 text-amber-300', 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300', 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'];
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className={`w-full rounded-lg border p-3 text-center ${stageColors[i]}`}>
                        <p className="text-lg font-bold">{count}</p>
                        <p className="text-[9px] uppercase tracking-wider">{stage}</p>
                      </div>
                      {i < 3 && <ChevronRight className="h-4 w-4 text-muted-foreground absolute -right-3 top-1/2 -translate-y-1/2 hidden" />}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground justify-center">
                <span>Draft</span><ChevronRight className="h-3 w-3" /><span>Reviewed</span><ChevronRight className="h-3 w-3" /><span>Approved</span><ChevronRight className="h-3 w-3" /><span>Paid</span>
              </div>
            </GlassCard>
            {/* Department Cost Comparison */}
            <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Department Cost Comparison</h4>
              <ResponsiveContainer width="100%" height={220}><BarChart data={data.deptCost.slice(0, 6)} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis dataKey="department" type="category" tick={{ fontSize: 10, fill: '#94a3b8' }} width={80} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="cost" fill="#10b981" radius={[0, 4, 4, 0]} name="Cost" /></BarChart></ResponsiveContainer>
            </GlassCard>
          </div>
        </TabsContent>

        {/* ═══ Admin Tab 6: Department ═══ */}
        <TabsContent value="department" className="space-y-6">
          {/* Department Comparison Table */}
          <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover>
            <h4 className="text-sm font-semibold mb-4 flex items-center gap-2"><Building2 className="h-4 w-4 text-cyan-400" />Department Comparison</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-black/[0.1] dark:border-white/[0.1]">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Department</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Headcount</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Attendance %</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Task Completion</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Open Complaints</th>
                </tr></thead>
                <tbody>{data.deptComparison.map((d, i) => (
                  <tr key={i} className="border-b border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.01] dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-3 font-medium">{d.name}</td>
                    <td className="text-center py-2.5 px-3">{d.headcount}</td>
                    <td className="text-center py-2.5 px-3"><span className={d.attendanceRate >= 85 ? 'text-emerald-400' : d.attendanceRate >= 75 ? 'text-amber-400' : 'text-rose-400'}>{d.attendanceRate}%</span></td>
                    <td className="text-center py-2.5 px-3"><span className={d.taskCompletion >= 70 ? 'text-emerald-400' : d.taskCompletion >= 50 ? 'text-amber-400' : 'text-rose-400'}>{d.taskCompletion}%</span></td>
                    <td className="text-center py-2.5 px-3"><Badge variant="outline" className={`${d.openComplaints > 2 ? 'border-rose-500/30 text-rose-400' : 'border-black/[0.1] dark:border-white/[0.1] text-muted-foreground'} text-[9px]`}>{d.openComplaints}</Badge></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </GlassCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Department Performance Horizontal Bar */}
            <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Department Attendance Rate</h4>
              <ResponsiveContainer width="100%" height={220}><BarChart data={data.deptComparison} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#94a3b8' }} width={80} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="attendanceRate" fill="#10b981" radius={[0, 4, 4, 0]} name="Attendance %" /></BarChart></ResponsiveContainer>
            </GlassCard>
            {/* Department Headcount Distribution */}
            <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover><h4 className="text-sm font-semibold mb-4">Headcount Distribution</h4>
              <DonutChart data={data.deptHeadcountDist} />
              <div className="flex flex-wrap justify-center gap-3 mt-2">{data.deptHeadcountDist.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px]"><span className="w-2 h-2 rounded-full" style={{ background: d.fill }} /><span className="text-muted-foreground">{d.name}: {d.value}</span></div>
              ))}</div>
            </GlassCard>
          </div>

          {/* Underperforming Departments Alert */}
          <GlassCard className="p-5 min-h-[200px] sm:min-h-[280px]" hover glow="rose">
            <h4 className="text-sm font-semibold mb-4 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-rose-400" />Underperforming Departments</h4>
            {data.deptComparison.filter(d => d.attendanceRate < 80 || d.taskCompletion < 60).length > 0 ? (
              <div className="space-y-2">{data.deptComparison.filter(d => d.attendanceRate < 80 || d.taskCompletion < 60).map((d, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-rose-500/5 border border-rose-500/20">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-rose-300">{d.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {d.attendanceRate < 80 && <span className="text-rose-400">Attendance: {d.attendanceRate}%</span>}
                        {d.attendanceRate < 80 && d.taskCompletion < 60 && <span className="mx-1">·</span>}
                        {d.taskCompletion < 60 && <span className="text-amber-400">Tasks: {d.taskCompletion}%</span>}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-rose-500/30 text-rose-400 text-[9px]">Needs Attention</Badge>
                </div>
              ))}</div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground"><CheckCircle2 className="h-8 w-8 mb-2 text-emerald-400" /><p className="text-xs">All departments performing within acceptable thresholds</p></div>
            )}
          </GlassCard>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
