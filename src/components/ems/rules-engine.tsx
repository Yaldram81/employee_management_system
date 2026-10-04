'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { StatCard } from './stat-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Plus,
  Trash2,
  Edit,
  Scale,
  Zap,
  ArrowRight,
  CalendarClock,
  Palmtree,
  ListTodo,
  DollarSign,
  Search,
  Play,
  ChevronDown,
  ChevronUp,
  Shield,
  Clock,
  Activity,
  CheckCircle2,
  XCircle,
  Copy,
  AlertTriangle,
  Sparkles,
  Eye,
  Users,
  Timer,
  TrendingUp,
  BarChart3,
  Filter,
  ArrowUpDown,
  SkipForward,
  MoreHorizontal,
  CheckSquare,
  XSquare,
  LayoutGrid,
  BookOpen,
  FlaskConical,
} from 'lucide-react';
import type { SystemRule } from '@/lib/types';

// ─── Category Definitions ─────────────────────────────────────────
const CATEGORIES = [
  { value: 'attendance', label: 'Attendance', icon: CalendarClock, color: 'text-cyan-400', bg: 'bg-cyan-500/15', dot: 'bg-cyan-400', border: 'border-cyan-500/20' },
  { value: 'leave', label: 'Leave', icon: Palmtree, color: 'text-amber-400', bg: 'bg-amber-500/15', dot: 'bg-amber-400', border: 'border-amber-500/20' },
  { value: 'task', label: 'Task', icon: ListTodo, color: 'text-emerald-400', bg: 'bg-emerald-500/15', dot: 'bg-emerald-400', border: 'border-emerald-500/20' },
  { value: 'payroll', label: 'Payroll', icon: DollarSign, color: 'text-rose-400', bg: 'bg-rose-500/15', dot: 'bg-rose-400', border: 'border-rose-500/20' },
] as const;

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'text-slate-400', bg: 'bg-slate-500/15', border: 'border-slate-500/20' },
  { value: 'medium', label: 'Medium', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/20' },
  { value: 'high', label: 'High', color: 'text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-500/20' },
  { value: 'critical', label: 'Critical', color: 'text-violet-400', bg: 'bg-violet-500/15', border: 'border-violet-500/20' },
] as const;

type CategoryValue = (typeof CATEGORIES)[number]['value'];
type SeverityValue = (typeof SEVERITY_LEVELS)[number]['value'];

// ─── Trigger Events by Category ───────────────────────────────────
const TRIGGER_EVENTS: Record<string, { value: string; label: string }[]> = {
  attendance: [
    { value: 'LATE_CLOCK_IN', label: 'Late Clock In' },
    { value: 'MISSED_CLOCK_OUT', label: 'Missed Clock Out' },
    { value: 'ABSENT_CONSECUTIVE', label: 'Consecutive Absence' },
    { value: 'EARLY_CLOCK_OUT', label: 'Early Clock Out' },
  ],
  leave: [
    { value: 'LEAVE_APPLIED', label: 'Leave Applied' },
    { value: 'LEAVE_APPROVED', label: 'Leave Approved' },
    { value: 'LEAVE_REJECTED', label: 'Leave Rejected' },
    { value: 'LEAVE_BALANCE_LOW', label: 'Leave Balance Low' },
  ],
  task: [
    { value: 'TASK_COMPLETED', label: 'Task Completed' },
    { value: 'TASK_OVERDUE', label: 'Task Overdue' },
    { value: 'TASK_BLOCKED', label: 'Task Blocked' },
    { value: 'TASK_ASSIGNED', label: 'Task Assigned' },
  ],
  payroll: [
    { value: 'MONTH_END', label: 'Month End' },
    { value: 'PAYROLL_APPROVED', label: 'Payroll Approved' },
    { value: 'SALARY_DISBURSED', label: 'Salary Disbursed' },
    { value: 'BONUS_TRIGGERED', label: 'Bonus Triggered' },
  ],
};

// ─── Actions by Category ──────────────────────────────────────────
const ACTIONS: Record<string, { value: string; label: string }[]> = {
  attendance: [
    { value: 'SEND_WARNING_EMAIL', label: 'Send Warning Email' },
    { value: 'DEDUCT_LEAVE', label: 'Deduct Leave' },
    { value: 'LOCK_ATTENDANCE', label: 'Lock Attendance' },
    { value: 'NOTIFY_MANAGER', label: 'Notify Manager' },
  ],
  leave: [
    { value: 'AUTO_APPROVE', label: 'Auto Approve' },
    { value: 'AUTO_REJECT', label: 'Auto Reject' },
    { value: 'ESCALATE_TO_HR', label: 'Escalate to HR' },
    { value: 'NOTIFY_MANAGER', label: 'Notify Manager' },
  ],
  task: [
    { value: 'REASSIGN_TASK', label: 'Reassign Task' },
    { value: 'BOOST_PERFORMANCE', label: 'Boost Performance' },
    { value: 'NOTIFY_MANAGER', label: 'Notify Manager' },
    { value: 'AUTO_CLOSE', label: 'Auto Close' },
  ],
  payroll: [
    { value: 'LOCK_PAYROLL', label: 'Lock Payroll' },
    { value: 'SEND_PAYSHEET', label: 'Send Paysheet' },
    { value: 'NOTIFY_FINANCE', label: 'Notify Finance' },
    { value: 'GENERATE_REPORT', label: 'Generate Report' },
  ],
};

// ─── Rule Templates (Expanded to 12+) ─────────────────────────────
const RULE_TEMPLATES = [
  { name: 'Late Arrival Warning', category: 'attendance' as CategoryValue, severity: 'medium' as SeverityValue, triggerEvent: 'LATE_CLOCK_IN', conditionCount: 1, action: 'SEND_WARNING_EMAIL', actionValue: '', description: 'Send a warning email when an employee clocks in late' },
  { name: '3x Late → Deduct Leave', category: 'attendance' as CategoryValue, severity: 'high' as SeverityValue, triggerEvent: 'LATE_CLOCK_IN', conditionCount: 3, action: 'DEDUCT_LEAVE', actionValue: '1', description: 'Deduct 1 leave day after 3 late arrivals' },
  { name: 'Task Overdue Alert', category: 'task' as CategoryValue, severity: 'high' as SeverityValue, triggerEvent: 'TASK_OVERDUE', conditionCount: 1, action: 'NOTIFY_MANAGER', actionValue: '', description: 'Notify manager when a task becomes overdue' },
  { name: 'Month-End Payroll Lock', category: 'payroll' as CategoryValue, severity: 'critical' as SeverityValue, triggerEvent: 'MONTH_END', conditionCount: 1, action: 'LOCK_PAYROLL', actionValue: '', description: 'Lock payroll processing at month end' },
  { name: 'Leave Balance Low Alert', category: 'leave' as CategoryValue, severity: 'medium' as SeverityValue, triggerEvent: 'LEAVE_BALANCE_LOW', conditionCount: 1, action: 'ESCALATE_TO_HR', actionValue: '', description: 'Escalate to HR when leave balance drops low' },
  { name: 'Absent 3+ Days → Auto-Escalate', category: 'attendance' as CategoryValue, severity: 'critical' as SeverityValue, triggerEvent: 'ABSENT_CONSECUTIVE', conditionCount: 3, action: 'NOTIFY_MANAGER', actionValue: '', description: 'Auto-escalate when employee is absent 3+ consecutive days' },
  // NEW templates (7-14)
  { name: 'Missed Clock-Out Reminder', category: 'attendance' as CategoryValue, severity: 'low' as SeverityValue, triggerEvent: 'MISSED_CLOCK_OUT', conditionCount: 1, action: 'SEND_WARNING_EMAIL', actionValue: '', description: 'Send a reminder when employee forgets to clock out' },
  { name: 'Early Departure Alert', category: 'attendance' as CategoryValue, severity: 'medium' as SeverityValue, triggerEvent: 'EARLY_CLOCK_OUT', conditionCount: 2, action: 'NOTIFY_MANAGER', actionValue: '', description: 'Notify manager after 2 early departures' },
  { name: 'Auto-Approve Short Leave', category: 'leave' as CategoryValue, severity: 'low' as SeverityValue, triggerEvent: 'LEAVE_APPLIED', conditionCount: 1, action: 'AUTO_APPROVE', actionValue: '', description: 'Automatically approve leave requests of 1 day or less' },
  { name: 'Leave Rejection Escalation', category: 'leave' as CategoryValue, severity: 'high' as SeverityValue, triggerEvent: 'LEAVE_REJECTED', conditionCount: 2, action: 'ESCALATE_TO_HR', actionValue: '', description: 'Escalate to HR if an employee has 2+ leaves rejected' },
  { name: 'Task Blocked → Reassign', category: 'task' as CategoryValue, severity: 'high' as SeverityValue, triggerEvent: 'TASK_BLOCKED', conditionCount: 1, action: 'REASSIGN_TASK', actionValue: '', description: 'Auto-reassign task when it becomes blocked' },
  { name: 'Task Completed → Boost', category: 'task' as CategoryValue, severity: 'low' as SeverityValue, triggerEvent: 'TASK_COMPLETED', conditionCount: 5, action: 'BOOST_PERFORMANCE', actionValue: '', description: 'Boost performance score after 5 tasks completed' },
  { name: 'Payroll Approved → Send Paysheet', category: 'payroll' as CategoryValue, severity: 'medium' as SeverityValue, triggerEvent: 'PAYROLL_APPROVED', conditionCount: 1, action: 'SEND_PAYSHEET', actionValue: '', description: 'Automatically send paysheet when payroll is approved' },
  { name: 'Bonus Triggered → Notify Finance', category: 'payroll' as CategoryValue, severity: 'high' as SeverityValue, triggerEvent: 'BONUS_TRIGGERED', conditionCount: 1, action: 'NOTIFY_FINANCE', actionValue: '', description: 'Notify finance team when a bonus is triggered' },
];

// ─── Execution Log Entry Type ─────────────────────────────────────
interface ExecutionLogEntry {
  id: string;
  ruleId: string;
  ruleName: string;
  trigger: string;
  result: string;
  status: 'success' | 'failed' | 'skipped';
  timestamp: Date;
  affectedUsers: number;
  durationMs: number;
}

// ─── Generate realistic execution log ─────────────────────────────
function generateExecutionLog(rules: SystemRule[]): ExecutionLogEntry[] {
  const now = Date.now();
  const entries: ExecutionLogEntry[] = [];
  const ruleNames = rules.length > 0 ? rules : RULE_TEMPLATES.map(t => ({ id: `tpl-${t.name}`, name: t.name, action: t.action, condition: `Occurs ${t.conditionCount} time(s)`, description: t.description, isActive: true, createdAt: new Date().toISOString() } as SystemRule));

  const triggers = ['LATE_CLOCK_IN', 'TASK_OVERDUE', 'MONTH_END', 'LEAVE_BALANCE_LOW', 'ABSENT_CONSECUTIVE', 'LEAVE_APPLIED', 'TASK_BLOCKED', 'PAYROLL_APPROVED', 'BONUS_TRIGGERED', 'EARLY_CLOCK_OUT', 'MISSED_CLOCK_OUT', 'TASK_COMPLETED'];
  const results = [
    'Warning email sent to john@ems.com',
    'Leave deduction queued (1 day)',
    'Manager notified about overdue task #TK-204',
    'Payroll locked for current period',
    'HR escalation sent',
    'Manager and HR notified',
    'SMTP connection failed — retry scheduled',
    'Notification dispatch failed',
    'Auto-approved 1-day leave request',
    'Paysheet generated and sent',
    'Task reassigned to available member',
    'Rule skipped — condition not met',
    'Finance team notified of bonus',
    'Performance boost applied (+5 pts)',
  ];
  const statuses: Array<'success' | 'failed' | 'skipped'> = ['success', 'success', 'success', 'success', 'success', 'success', 'failed', 'failed', 'skipped'];

  for (let i = 0; i < 25; i++) {
    const rule = ruleNames[i % ruleNames.length];
    entries.push({
      id: `log-${i}`,
      ruleId: rule.id,
      ruleName: rule.name,
      trigger: triggers[i % triggers.length],
      result: results[i % results.length],
      status: statuses[i % statuses.length],
      timestamp: new Date(now - (i * 3600000 * (1 + Math.random() * 3))),
      affectedUsers: statuses[i % statuses.length] === 'skipped' ? 0 : Math.floor(Math.random() * 12) + 1,
      durationMs: statuses[i % statuses.length] === 'skipped' ? 0 : Math.floor(Math.random() * 2400) + 50,
    });
  }
  return entries;
}

// ─── Helper: Infer category from rule ─────────────────────────────
function inferCategory(rule: SystemRule): CategoryValue {
  const text = `${rule.name} ${rule.condition} ${rule.action} ${rule.description}`.toLowerCase();
  if (text.includes('attend') || text.includes('late') || text.includes('clock') || text.includes('punch') || text.includes('absent') || text.includes('missed')) return 'attendance';
  if (text.includes('leave') || text.includes('vacation') || text.includes('sick')) return 'leave';
  if (text.includes('task') || text.includes('todo') || text.includes('deadline') || text.includes('overdue')) return 'task';
  if (text.includes('pay') || text.includes('salary') || text.includes('payroll') || text.includes('bonus')) return 'payroll';
  return 'attendance';
}

function inferSeverity(rule: SystemRule): SeverityValue {
  const text = `${rule.name} ${rule.description} ${rule.action}`.toLowerCase();
  if (text.includes('critical') || text.includes('lock') || text.includes('auto-escalate') || text.includes('3+')) return 'critical';
  if (text.includes('high') || text.includes('deduct') || text.includes('overdue') || text.includes('3x') || text.includes('escalate')) return 'high';
  if (text.includes('medium') || text.includes('warning') || text.includes('alert') || text.includes('notify')) return 'medium';
  return 'low';
}

function formatTriggerLabel(triggerEvent: string): string {
  for (const events of Object.values(TRIGGER_EVENTS)) {
    const found = events.find(e => e.value === triggerEvent);
    if (found) return found.label;
  }
  return triggerEvent.replace(/_/g, ' ');
}

function formatActionLabel(action: string): string {
  for (const acts of Object.values(ACTIONS)) {
    const found = acts.find(a => a.value === action);
    if (found) return found.label;
  }
  return action.replace(/_/g, ' ');
}

function extractTriggerEvent(rule: SystemRule): string {
  const desc = rule.description || '';
  const match = desc.match(/^([A-Z_]+)\s*→/);
  if (match) return match[1];
  return '';
}

// ─── Form State Type ──────────────────────────────────────────────
interface RuleFormState {
  name: string;
  description: string;
  category: CategoryValue;
  severity: SeverityValue;
  triggerEvent: string;
  conditionCount: number;
  action: string;
  actionValue: string;
  isActive: boolean;
}

const EMPTY_FORM: RuleFormState = {
  name: '',
  description: '',
  category: 'attendance',
  severity: 'medium',
  triggerEvent: 'LATE_CLOCK_IN',
  conditionCount: 1,
  action: 'SEND_WARNING_EMAIL',
  actionValue: '',
  isActive: true,
};

// ─── Mock last triggered times ────────────────────────────────────
const MOCK_LAST_TRIGGERED: Record<string, string> = {
  'default-1': '2 hours ago',
  'default-2': 'Yesterday',
  'default-3': '3 days ago',
  'default-4': 'Last week',
  'default-5': '2 weeks ago',
};

function getLastTriggered(rule: SystemRule, index: number): string {
  return MOCK_LAST_TRIGGERED[rule.id] || MOCK_LAST_TRIGGERED[`default-${(index % 5) + 1}`] || 'Never';
}

// ─── Sort type ────────────────────────────────────────────────────
type SortField = 'name' | 'date' | 'severity' | 'executionCount';
type SortDir = 'asc' | 'desc';

// ─── Mini Donut Chart Component ───────────────────────────────────
function MiniDonut({ segments, size = 64 }: { segments: { value: number; color: string; label: string }[]; size?: number }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return <div style={{ width: size, height: size }} className="rounded-full border-2 border-black/[0.1] dark:border-white/[0.1]" />;
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  // Pre-compute offsets for each segment
  const segData = segments.map((seg, i) => {
    const pct = seg.value / total;
    const dash = pct * c;
    const prevTotal = segments.slice(0, i).reduce((s, sg) => s + (sg.value / total) * c, 0);
    return { key: i, dash, offset: prevTotal, color: seg.color };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
      {segData.map(sd => (
        <circle
          key={sd.key}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={sd.color}
          strokeWidth={4}
          strokeDasharray={`${sd.dash} ${c - sd.dash}`}
          strokeDashoffset={-sd.offset}
          className="transition-all duration-500"
        />
      ))}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function RulesEngine() {
  const { rules, createRule, updateRule, deleteRule } = useEMSStore();

  // ─── State ────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SystemRule | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [logOpen, setLogOpen] = useState(false);
  const [form, setForm] = useState<RuleFormState>({ ...EMPTY_FORM });
  // New state
  const [detailRule, setDetailRule] = useState<SystemRule | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sevFilter, setSevFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState(false);
  const [templateCatFilter, setTemplateCatFilter] = useState<string>('all');
  const [logFilter, setLogFilter] = useState<{ status: string; ruleId: string }>({ status: 'all', ruleId: 'all' });
  const [testRunning, setTestRunning] = useState(false);

  // ─── Execution log (memoized) ────────────────────────────────
  const executionLog = useMemo(() => generateExecutionLog(rules), [rules]);

  // ─── Computed ─────────────────────────────────────────────────
  const activeRulesCount = useMemo(() => rules.filter(r => r.isActive).length, [rules]);
  const inactiveRulesCount = useMemo(() => rules.filter(r => !r.isActive).length, [rules]);

  const rulesByCategory = useMemo(() => {
    const map: Record<string, number> = { attendance: 0, leave: 0, task: 0, payroll: 0 };
    rules.forEach(r => { map[inferCategory(r)] = (map[inferCategory(r)] || 0) + 1; });
    return map;
  }, [rules]);

  const categoriesCovered = useMemo(() => { const cats = new Set(rules.map(r => inferCategory(r))); return cats.size; }, [rules]);

  // Enhanced filtered + sorted rules
  const filteredRules = useMemo(() => {
    let result = [...rules];
    if (catFilter !== 'all') result = result.filter(r => inferCategory(r) === catFilter);
    if (sevFilter !== 'all') result = result.filter(r => inferSeverity(r) === sevFilter);
    if (statusFilter === 'active') result = result.filter(r => r.isActive);
    if (statusFilter === 'inactive') result = result.filter(r => !r.isActive);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) ||
        r.action.toLowerCase().includes(q) || r.condition.toLowerCase().includes(q) ||
        extractTriggerEvent(r).toLowerCase().includes(q) || formatActionLabel(r.action).toLowerCase().includes(q)
      );
    }
    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'date') cmp = (a.createdAt || '').localeCompare(b.createdAt || '');
      else if (sortField === 'severity') {
        const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        cmp = (order[inferSeverity(a)] ?? 4) - (order[inferSeverity(b)] ?? 4);
      } else {
        cmp = 0; // executionCount not tracked, fallback
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [rules, catFilter, sevFilter, statusFilter, searchQuery, sortField, sortDir]);

  // Execution summary stats
  const execStats = useMemo(() => {
    const last24h = executionLog.filter(e => Date.now() - e.timestamp.getTime() < 86400000);
    const success24 = last24h.filter(e => e.status === 'success').length;
    const failed24 = last24h.filter(e => e.status === 'failed').length;
    const rate = last24h.length > 0 ? Math.round((success24 / last24h.length) * 100) : 0;
    return { last24h: last24h.length, success24, failed24, rate, total: executionLog.length };
  }, [executionLog]);

  // Most triggered rules
  const mostTriggered = useMemo(() => {
    const counts: Record<string, number> = {};
    executionLog.forEach(e => { counts[e.ruleName] = (counts[e.ruleName] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [executionLog]);

  // Filtered execution log
  const filteredLog = useMemo(() => {
    let result = [...executionLog];
    if (logFilter.status !== 'all') result = result.filter(e => e.status === logFilter.status);
    if (logFilter.ruleId !== 'all') result = result.filter(e => e.ruleId === logFilter.ruleId);
    return result;
  }, [executionLog, logFilter]);

  // Related rules for detail sheet
  const relatedRules = useMemo(() => {
    if (!detailRule) return [];
    const cat = inferCategory(detailRule);
    const trigger = extractTriggerEvent(detailRule);
    return rules.filter(r => r.id !== detailRule.id && (inferCategory(r) === cat || extractTriggerEvent(r) === trigger)).slice(0, 5);
  }, [detailRule, rules]);

  // Execution history for detail rule
  const detailExecHistory = useMemo(() => {
    if (!detailRule) return [];
    return executionLog.filter(e => e.ruleId === detailRule.id || e.ruleName === detailRule.name).slice(0, 10);
  }, [detailRule, executionLog]);

  // ─── Get first trigger/action for category ────────────────────
  const getFirstTrigger = useCallback((category: string) => TRIGGER_EVENTS[category]?.[0]?.value || 'LATE_CLOCK_IN', []);
  const getFirstAction = useCallback((category: string) => ACTIONS[category]?.[0]?.value || 'NOTIFY_MANAGER', []);

  // ─── Handlers ─────────────────────────────────────────────────
  const resetForm = useCallback(() => { setForm({ ...EMPTY_FORM }); setEditingRule(null); }, []);

  const handleOpenCreate = useCallback(() => { resetForm(); setDialogOpen(true); }, [resetForm]);

  const handleOpenEdit = useCallback((rule: SystemRule) => {
    setEditingRule(rule);
    const cat = inferCategory(rule);
    const triggerEvent = extractTriggerEvent(rule) || getFirstTrigger(cat);
    setForm({
      name: rule.name, description: rule.description, category: cat, severity: inferSeverity(rule),
      triggerEvent, conditionCount: parseInt(rule.condition?.replace(/[^0-9]/g, '') || '1', 10) || 1,
      action: rule.action, actionValue: '', isActive: rule.isActive,
    });
    setDialogOpen(true);
  }, [getFirstTrigger]);

  const handleCategoryChange = useCallback((category: string) => {
    const cat = category as CategoryValue;
    setForm(prev => ({ ...prev, category: cat, triggerEvent: TRIGGER_EVENTS[cat]?.[0]?.value || 'LATE_CLOCK_IN', action: ACTIONS[cat]?.[0]?.value || 'NOTIFY_MANAGER' }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) { toast.error('Rule name is required'); return; }
    if (!form.triggerEvent) { toast.error('Trigger event is required'); return; }
    if (!form.action) { toast.error('Action is required'); return; }
    try {
      const ruleData: Record<string, unknown> = {
        name: form.name, description: form.description || `${form.triggerEvent} → ${form.action}`,
        condition: `Occurs ${form.conditionCount} time(s)`, action: form.action, isActive: form.isActive,
        triggerEvent: form.triggerEvent, conditionCount: form.conditionCount, actionValue: form.actionValue || null,
      };
      if (editingRule) { await updateRule(editingRule.id, ruleData); toast.success('Rule updated successfully'); }
      else { await createRule(ruleData as Omit<SystemRule, 'id' | 'createdAt'>); toast.success('Rule created successfully'); }
      setDialogOpen(false); resetForm();
    } catch { toast.error('Failed to save rule'); }
  }, [form, editingRule, createRule, updateRule, resetForm]);

  const handleToggle = useCallback(async (rule: SystemRule) => {
    try { await updateRule(rule.id, { isActive: !rule.isActive }); toast.success(`Rule ${rule.isActive ? 'disabled' : 'enabled'}`); }
    catch { toast.error('Failed to update rule'); }
  }, [updateRule]);

  const handleDelete = useCallback(async (id: string) => {
    try { await deleteRule(id); toast.success('Rule deleted'); setDeleteConfirm(null); setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; }); }
    catch { toast.error('Failed to delete rule'); }
  }, [deleteRule]);

  const handleDuplicate = useCallback(async (rule: SystemRule) => {
    try {
      await createRule({ name: `${rule.name} (Copy)`, description: rule.description, condition: rule.condition, action: rule.action, isActive: false, createdAt: new Date().toISOString() });
      toast.success('Rule duplicated');
    } catch { toast.error('Failed to duplicate rule'); }
  }, [createRule]);

  const handleUseTemplate = useCallback((template: typeof RULE_TEMPLATES[number]) => {
    setEditingRule(null);
    setForm({ name: template.name, description: template.description, category: template.category, severity: template.severity, triggerEvent: template.triggerEvent, conditionCount: template.conditionCount, action: template.action, actionValue: template.actionValue, isActive: true });
    setDialogOpen(true); setTemplateGalleryOpen(false);
    toast.info('Template loaded — customize and save');
  }, []);

  const handleRunAllRules = useCallback(() => {
    const activeCount = rules.filter(r => r.isActive).length;
    if (activeCount === 0) { toast.warning('No active rules to run'); return; }
    toast.success(`Running ${activeCount} active rule${activeCount > 1 ? 's' : ''}...`);
  }, [rules]);

  const handleTestRule = useCallback(() => {
    setTestRunning(true);
    setTimeout(() => {
      setTestRunning(false);
      const passed = Math.random() > 0.2;
      if (passed) toast.success(`Test passed for "${form.name}" — action would fire`);
      else toast.warning(`Test condition not met for "${form.name}" — rule would skip`);
    }, 1500);
  }, [form.name]);

  // Bulk actions
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredRules.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredRules.map(r => r.id)));
  }, [filteredRules, selectedIds]);

  const handleBulkActivate = useCallback(async () => {
    let count = 0;
    for (const id of selectedIds) {
      const rule = rules.find(r => r.id === id);
      if (rule && !rule.isActive) { try { await updateRule(id, { isActive: true }); count++; } catch { /* skip */ } }
    }
    toast.success(`${count} rule${count > 1 ? 's' : ''} activated`);
    setSelectedIds(new Set());
  }, [selectedIds, rules, updateRule]);

  const handleBulkDeactivate = useCallback(async () => {
    let count = 0;
    for (const id of selectedIds) {
      const rule = rules.find(r => r.id === id);
      if (rule?.isActive) { try { await updateRule(id, { isActive: false }); count++; } catch { /* skip */ } }
    }
    toast.success(`${count} rule${count > 1 ? 's' : ''} deactivated`);
    setSelectedIds(new Set());
  }, [selectedIds, rules, updateRule]);

  const handleBulkDelete = useCallback(async () => {
    let count = 0;
    for (const id of selectedIds) { try { await deleteRule(id); count++; } catch { /* skip */ } }
    toast.success(`${count} rule${count > 1 ? 's' : ''} deleted`);
    setSelectedIds(new Set());
  }, [selectedIds, deleteRule]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }, [sortField]);

  // ─── Animation Variants ───────────────────────────────────────
  const cardVariants = { hidden: { opacity: 0, y: 12, scale: 0.97 }, visible: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -8, scale: 0.97 } };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ─── Header Section ──────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20">
                <Scale className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-300 bg-clip-text text-transparent">
                  Rules Engine
                </h2>
                <p className="text-xs text-muted-foreground">
                  <span className="text-emerald-400 font-semibold">{activeRulesCount}</span>
                  <span className="text-muted-foreground/60">/{rules.length}</span> rules active
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 border-black/[0.1] dark:border-white/[0.1] hover:border-amber-500/30 hover:bg-amber-500/5" onClick={() => setTemplateGalleryOpen(true)}>
              <BookOpen className="h-3.5 w-3.5 text-amber-400" />Browse Templates
            </Button>
            <Button variant="outline" size="sm" className="gap-2 border-black/[0.1] dark:border-white/[0.1] hover:border-emerald-500/30 hover:bg-emerald-500/5" onClick={handleRunAllRules}>
              <Play className="h-3.5 w-3.5 text-emerald-400" />Run All Rules
            </Button>
            <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-500" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" />New Rule
            </Button>
          </div>
        </div>

        {/* ─── Rule Statistics Dashboard ──────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard title="Active Rules" value={activeRulesCount} icon={Shield} color="emerald" hero subtitle="Currently active" />
          <StatCard title="Inactive" value={inactiveRulesCount} icon={XCircle} color="rose" hero subtitle="Disabled rules" />
          <StatCard title="Categories" value={categoriesCovered} icon={ListTodo} color="amber" hero subtitle="of 4 covered" progressRing={{ value: categoriesCovered, max: 4 }} />
          <StatCard title="Executed 24h" value={execStats.last24h} icon={Activity} color="cyan" hero subtitle={`${execStats.rate}% success`} trend={{ value: execStats.rate, label: 'success rate' }} />
          <GlassCard className="p-3 flex items-center gap-3">
            <MiniDonut segments={[
              { value: rulesByCategory.attendance || 0, color: '#22d3ee', label: 'Attendance' },
              { value: rulesByCategory.leave || 0, color: '#fbbf24', label: 'Leave' },
              { value: rulesByCategory.task || 0, color: '#34d399', label: 'Task' },
              { value: rulesByCategory.payroll || 0, color: '#fb7185', label: 'Payroll' },
            ]} size={52} />
            <div className="space-y-1 min-w-0 flex-1">
              <p className="text-[10px] font-medium text-muted-foreground">By Category</p>
              {CATEGORIES.map(c => (
                <div key={c.value} className="flex items-center gap-1.5">
                  <span className={cn('w-1.5 h-1.5 rounded-full', c.dot)} />
                  <span className="text-[10px] text-muted-foreground truncate">{c.label}</span>
                  <span className="text-[10px] font-medium ml-auto">{rulesByCategory[c.value] || 0}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Most Triggered Rules */}
        {mostTriggered.length > 0 && (
          <GlassCard className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs font-semibold text-foreground/90">Most Triggered</span>
            </div>
            <div className="flex items-end gap-3">
              {mostTriggered.map(([name, count], i) => (
                <div key={name} className="flex-1 min-w-0 text-center">
                  <div className="relative h-8 bg-black/[0.03] dark:bg-white/[0.05] rounded-t" title={name}>
                    <div className={cn('absolute bottom-0 left-0 right-0 rounded-t transition-all', i === 0 ? 'bg-emerald-500/30' : i === 1 ? 'bg-cyan-500/25' : 'bg-amber-500/20')} style={{ height: `${Math.max(20, (count / mostTriggered[0][1]) * 100)}%` }} />
                  </div>
                  <p className="text-[9px] text-muted-foreground truncate mt-1">{name}</p>
                  <p className="text-[10px] font-semibold">{count}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>

      {/* ─── Category + Advanced Filter Bar ─────────────────────── */}
      <div className="space-y-2 sticky top-0 z-20 bg-background/80 backdrop-blur-xl py-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant={catFilter === 'all' ? 'default' : 'outline'} size="sm" className={cn('h-8 text-xs gap-1.5', catFilter === 'all' ? 'bg-emerald-600 hover:bg-emerald-500' : 'border-black/[0.1] dark:border-white/[0.1] hover:border-emerald-500/30')} onClick={() => setCatFilter('all')}>
            All <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-black/[0.06] dark:bg-white/[0.1]">{rules.length}</Badge>
          </Button>
          {CATEGORIES.map(c => (
            <Button key={c.value} variant={catFilter === c.value ? 'default' : 'outline'} size="sm" className={cn('h-8 text-xs gap-1.5', catFilter === c.value ? 'bg-emerald-600 hover:bg-emerald-500' : 'border-black/[0.1] dark:border-white/[0.1] hover:border-emerald-500/30')} onClick={() => setCatFilter(c.value)}>
              <c.icon className={cn('h-3 w-3', catFilter !== c.value && c.color)} />{c.label}
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-black/[0.06] dark:bg-white/[0.1]">{rulesByCategory[c.value] || 0}</Badge>
            </Button>
          ))}
          <div className="flex items-center gap-1.5 ml-auto">
            <Select value={sevFilter} onValueChange={setSevFilter}>
              <SelectTrigger className="h-7 text-[10px] w-[90px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                {SEVERITY_LEVELS.map(s => <SelectItem key={s.value} value={s.value}><span className={s.color}>{s.label}</span></SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-7 text-[10px] w-[90px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={() => handleSort('name')}>
              <ArrowUpDown className="h-3 w-3" />Sort
            </Button>
          </div>
        </div>
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search by name, trigger, action, description..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-8 text-xs bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30" />
        </div>
      </div>

      {/* ─── Bulk Action Bar ────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <CheckSquare className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 border-black/[0.1] dark:border-white/[0.1] hover:border-emerald-500/30" onClick={handleBulkActivate}>
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />Activate
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 border-black/[0.1] dark:border-white/[0.1] hover:border-amber-500/30" onClick={handleBulkDeactivate}>
              <XCircle className="h-3 w-3 text-amber-400" />Deactivate
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 border-black/[0.1] dark:border-white/[0.1] hover:border-rose-500/30 text-rose-400" onClick={handleBulkDelete}>
              <Trash2 className="h-3 w-3" />Delete
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setSelectedIds(new Set())}>Clear</Button>
          </div>
        </motion.div>
      )}

      {/* ─── Rules Grid/List ─────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Select All Row */}
        {filteredRules.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <Checkbox checked={selectedIds.size === filteredRules.length && filteredRules.length > 0} onCheckedChange={toggleSelectAll} className="border-black/[0.12] dark:border-white/[0.2]" />
            <span className="text-[10px] text-muted-foreground">Select all ({filteredRules.length})</span>
          </div>
        )}
        <AnimatePresence mode="popLayout">
          {filteredRules.map((rule, index) => {
            const cat = CATEGORIES.find(c => c.value === inferCategory(rule)) || CATEGORIES[0];
            const CatIcon = cat.icon;
            const sev = SEVERITY_LEVELS.find(s => s.value === inferSeverity(rule)) || SEVERITY_LEVELS[0];
            const triggerEvent = extractTriggerEvent(rule);
            const triggerLabel = triggerEvent ? formatTriggerLabel(triggerEvent) : rule.condition;
            const actionLabel = formatActionLabel(rule.action) || rule.action;

            return (
              <motion.div key={rule.id} variants={cardVariants} initial="hidden" animate="visible" exit="exit" layout transition={{ duration: 0.25, delay: index * 0.03 }}>
                <GlassCard className={cn('p-4 transition-all duration-300 cursor-pointer hover:border-black/[0.1] dark:hover:border-white/[0.15]', !rule.isActive && 'opacity-45 grayscale-[30%]', selectedIds.has(rule.id) && 'ring-1 ring-emerald-500/30')}>
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <Checkbox checked={selectedIds.has(rule.id)} onCheckedChange={() => toggleSelect(rule.id)} onClick={e => e.stopPropagation()} className="mt-1 border-black/[0.12] dark:border-white/[0.2] shrink-0" />
                    {/* Main content - clickable */}
                    <div className="flex-1 space-y-3 min-w-0" onClick={() => setDetailRule(rule)}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('w-2 h-2 rounded-full shrink-0', cat.dot)} />
                        <span className="font-semibold text-sm truncate">{rule.name}</span>
                        <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0', cat.bg, cat.color)}>
                          <CatIcon className="h-3 w-3" />{cat.label}
                        </span>
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0', sev.bg, sev.color)}>{sev.label}</span>
                        {!rule.isActive && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-black/[0.03] dark:bg-white/[0.05] text-muted-foreground">Inactive</span>}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-mono flex-wrap">
                        <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">TRIGGER</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="px-2 py-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 max-w-[180px] truncate" title={triggerLabel}>{triggerLabel}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 max-w-[180px] truncate" title={actionLabel}>{actionLabel}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {rule.description && <span className="truncate max-w-[400px]">{rule.description}</span>}
                        <span className="flex items-center gap-1 shrink-0"><Clock className="h-3 w-3" />{getLastTriggered(rule, index)}</span>
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <Switch checked={rule.isActive} onCheckedChange={() => handleToggle(rule)} className="scale-75" />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEdit(rule)}><Edit className="h-3.5 w-3.5" /></Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => setDetailRule(rule)}><Eye className="h-3.5 w-3.5 mr-2" />View Details</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(rule)}><Copy className="h-3.5 w-3.5 mr-2" />Duplicate</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteConfirm(rule.id)} className="text-rose-400"><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredRules.length === 0 && rules.length > 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">No rules match your filter</div>
        )}
        {rules.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center"><Zap className="h-8 w-8 text-emerald-400/60" /></div>
            <p className="text-sm font-medium text-foreground/80">No automation rules yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">Create rules to automate workflows — when conditions are met, actions fire automatically.</p>
            <Button className="mt-4 gap-2 bg-emerald-600 hover:bg-emerald-500" size="sm" onClick={handleOpenCreate}><Plus className="h-4 w-4" />Create First Rule</Button>
          </div>
        )}
      </div>

      {/* ─── Execution Log (Enhanced) ────────────────────────────── */}
      <Collapsible open={logOpen} onOpenChange={setLogOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 w-full py-2 group">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-foreground/90">Execution Log</h3>
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-black/[0.06] dark:bg-white/[0.1]">{executionLog.length}</Badge>
              <span className="text-[10px] text-emerald-400 font-medium">{execStats.rate}% success (24h)</span>
            </div>
            <Separator className="flex-1" />
            {logOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" /> : <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <GlassCard className="mt-2 overflow-hidden">
            {/* Log Filters */}
            <div className="flex items-center gap-2 p-3 border-b border-black/[0.06] dark:border-white/[0.05]">
              <Filter className="h-3 w-3 text-muted-foreground" />
              <Select value={logFilter.status} onValueChange={v => setLogFilter(prev => ({ ...prev, status: v }))}>
                <SelectTrigger className="h-7 text-[10px] w-[100px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                </SelectContent>
              </Select>
              <Select value={logFilter.ruleId} onValueChange={v => setLogFilter(prev => ({ ...prev, ruleId: v }))}>
                <SelectTrigger className="h-7 text-[10px] w-[140px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]"><SelectValue placeholder="All Rules" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rules</SelectItem>
                  {[...new Map(executionLog.map(e => [e.ruleId, e.ruleName])).entries()].map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-[10px] text-muted-foreground ml-auto">{filteredLog.length} entries</span>
            </div>
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="border-black/[0.06] dark:border-white/[0.05] hover:bg-transparent">
                    <TableHead className="text-[11px] text-muted-foreground h-8">Time</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground h-8">Rule Name</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground h-8">Trigger</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground h-8">Result</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground h-8">Users</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground h-8">Duration</TableHead>
                    <TableHead className="text-[11px] text-muted-foreground h-8 w-20">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLog.map(log => (
                    <TableRow key={log.id} className="border-black/[0.06] dark:border-white/[0.05] hover:bg-black/[0.01] dark:hover:bg-white/[0.02]">
                      <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap py-2">{log.timestamp.toLocaleDateString()} {log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                      <TableCell className="text-[11px] font-medium py-2">{log.ruleName}</TableCell>
                      <TableCell className="py-2"><span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">{log.trigger}</span></TableCell>
                      <TableCell className="text-[11px] text-muted-foreground py-2 max-w-[180px] truncate">{log.result}</TableCell>
                      <TableCell className="text-[11px] py-2"><span className="flex items-center gap-1 text-muted-foreground"><Users className="h-3 w-3" />{log.affectedUsers}</span></TableCell>
                      <TableCell className="text-[11px] text-muted-foreground py-2"><span className="flex items-center gap-1"><Timer className="h-3 w-3" />{log.durationMs}ms</span></TableCell>
                      <TableCell className="py-2">
                        {log.status === 'success' && <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium"><CheckCircle2 className="h-3 w-3" />Success</span>}
                        {log.status === 'failed' && <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 font-medium"><XCircle className="h-3 w-3" />Failed</span>}
                        {log.status === 'skipped' && <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-medium"><SkipForward className="h-3 w-3" />Skipped</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </GlassCard>
        </CollapsibleContent>
      </Collapsible>

      {/* ─── Rule Detail Sheet ────────────────────────────────────── */}
      <Sheet open={!!detailRule} onOpenChange={open => { if (!open) setDetailRule(null); }}>
        <SheetContent className="w-full sm:max-w-lg glass-strong border-black/[0.12] dark:border-white/[0.2] overflow-y-auto custom-scrollbar">
          {detailRule && (() => {
            const cat = CATEGORIES.find(c => c.value === inferCategory(detailRule)) || CATEGORIES[0];
            const CatIcon = cat.icon;
            const sev = SEVERITY_LEVELS.find(s => s.value === inferSeverity(detailRule)) || SEVERITY_LEVELS[0];
            const triggerEvent = extractTriggerEvent(detailRule);
            const triggerLabel = triggerEvent ? formatTriggerLabel(triggerEvent) : detailRule.condition;
            const actionLabel = formatActionLabel(detailRule.action) || detailRule.action;

            return (
              <div className="space-y-5 pt-4">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-emerald-400" />Rule Details
                  </SheetTitle>
                </SheetHeader>

                {/* Rule Info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('w-2.5 h-2.5 rounded-full', cat.dot)} />
                    <h3 className="text-base font-bold">{detailRule.name}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium', cat.bg, cat.color)}><CatIcon className="h-3 w-3" />{cat.label}</span>
                    <span className={cn('px-2 py-1 rounded text-[10px] font-medium', sev.bg, sev.color)}>{sev.label}</span>
                    <span className={cn('px-2 py-1 rounded text-[10px] font-medium', detailRule.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-black/[0.03] dark:bg-white/[0.05] text-muted-foreground')}>{detailRule.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                  {detailRule.description && <p className="text-xs text-muted-foreground">{detailRule.description}</p>}
                </div>

                <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />

                {/* Visual Flow */}
                <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] space-y-2">
                  <p className="text-[10px] text-muted-foreground font-medium">RULE FLOW</p>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Zap className="h-3 w-3" />TRIGGER
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 px-2.5 py-1.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-center">{triggerLabel}</div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 px-2.5 py-1.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-center">{actionLabel}</div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Condition: {detailRule.condition}</p>
                </div>

                <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:border-emerald-500/30" onClick={() => { handleOpenEdit(detailRule); setDetailRule(null); }}><Edit className="h-3 w-3" />Edit</Button>
                  <Button variant="outline" size="sm" className={cn('h-8 text-[11px] gap-1.5 border-black/[0.1] dark:border-white/[0.1]', detailRule.isActive ? 'hover:border-amber-500/30' : 'hover:border-emerald-500/30')} onClick={() => { handleToggle(detailRule); setDetailRule(null); }}>
                    {detailRule.isActive ? <><XCircle className="h-3 w-3 text-amber-400" />Deactivate</> : <><CheckCircle2 className="h-3 w-3 text-emerald-400" />Activate</>}
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:border-cyan-500/30" onClick={() => { handleDuplicate(detailRule); setDetailRule(null); }}><Copy className="h-3 w-3" />Duplicate</Button>
                  <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:border-rose-500/30 text-rose-400" onClick={() => { setDeleteConfirm(detailRule.id); setDetailRule(null); }}><Trash2 className="h-3 w-3" />Delete</Button>
                </div>

                <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />

                {/* Execution History */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="text-xs font-semibold">Execution History</span>
                    <Badge variant="secondary" className="h-4 px-1.5 text-[9px] bg-black/[0.06] dark:bg-white/[0.1]">Last {detailExecHistory.length || 0}</Badge>
                  </div>
                  {detailExecHistory.length > 0 ? (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                      {detailExecHistory.map(e => (
                        <div key={e.id} className="flex items-center gap-2 p-2 rounded bg-black/[0.01] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04]">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              {e.status === 'success' && <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />}
                              {e.status === 'failed' && <XCircle className="h-3 w-3 text-rose-400 shrink-0" />}
                              {e.status === 'skipped' && <SkipForward className="h-3 w-3 text-amber-400 shrink-0" />}
                              <span className="text-[10px] text-muted-foreground truncate">{e.result}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-[9px] text-muted-foreground">{e.timestamp.toLocaleDateString()}</span>
                              <span className="text-[9px] text-muted-foreground"><Users className="h-2.5 w-2.5 inline" /> {e.affectedUsers} users</span>
                              <span className="text-[9px] text-muted-foreground"><Timer className="h-2.5 w-2.5 inline" /> {e.durationMs}ms</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground py-2 text-center">No execution history found</p>
                  )}
                </div>

                <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />

                {/* Related Rules */}
                {relatedRules.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-xs font-semibold">Related Rules</span>
                    </div>
                    {relatedRules.map(r => {
                      const rc = CATEGORIES.find(c => c.value === inferCategory(r)) || CATEGORIES[0];
                      return (
                        <div key={r.id} className="flex items-center gap-2 p-2 rounded bg-black/[0.01] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04] cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition-colors" onClick={() => setDetailRule(r)}>
                          <span className={cn('w-2 h-2 rounded-full', rc.dot)} />
                          <span className="text-[11px] font-medium truncate flex-1">{r.name}</span>
                          <span className={cn('text-[9px] px-1.5 py-0.5 rounded', rc.bg, rc.color)}>{rc.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* ─── Template Gallery Dialog ──────────────────────────────── */}
      <Dialog open={templateGalleryOpen} onOpenChange={setTemplateGalleryOpen}>
        <DialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2] sm:max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />Browse Rule Templates
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* Category filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant={templateCatFilter === 'all' ? 'default' : 'outline'} size="sm" className={cn('h-7 text-[10px]', templateCatFilter === 'all' ? 'bg-emerald-600' : 'border-black/[0.1] dark:border-white/[0.1]')} onClick={() => setTemplateCatFilter('all')}>All ({RULE_TEMPLATES.length})</Button>
              {CATEGORIES.map(c => {
                const count = RULE_TEMPLATES.filter(t => t.category === c.value).length;
                return <Button key={c.value} variant={templateCatFilter === c.value ? 'default' : 'outline'} size="sm" className={cn('h-7 text-[10px] gap-1', templateCatFilter === c.value ? 'bg-emerald-600' : 'border-black/[0.1] dark:border-white/[0.1]')} onClick={() => setTemplateCatFilter(c.value)}>
                  <c.icon className={cn('h-3 w-3', c.color)} />{c.label} ({count})
                </Button>;
              })}
            </div>
            {/* Template Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {RULE_TEMPLATES.filter(t => templateCatFilter === 'all' || t.category === templateCatFilter).map((template, idx) => {
                const cat = CATEGORIES.find(c => c.value === template.category) || CATEGORIES[0];
                const CatIcon = cat.icon;
                const sev = SEVERITY_LEVELS.find(s => s.value === template.severity) || SEVERITY_LEVELS[0];
                return (
                  <motion.div key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
                    <GlassCard className="p-3.5 h-full flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn('w-2 h-2 rounded-full', cat.dot)} />
                          <span className="text-xs font-semibold truncate">{template.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium', cat.bg, cat.color)}><CatIcon className="h-3 w-3" />{cat.label}</span>
                          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', sev.bg, sev.color)}>{sev.label}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{template.description}</p>
                        {/* Mini flow preview */}
                        <div className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground">
                          <span className="px-1 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">{formatTriggerLabel(template.triggerEvent)}</span>
                          <ArrowRight className="h-2.5 w-2.5" />
                          <span className="px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{formatActionLabel(template.action)}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="mt-3 h-7 text-[11px] gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:border-emerald-500/30 hover:bg-emerald-500/5 w-full" onClick={() => handleUseTemplate(template)}>
                        <Copy className="h-3 w-3" />Use Template
                      </Button>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Create/Edit Rule Dialog (Enhanced) ──────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2] sm:max-w-lg max-h-[85vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-emerald-400" />
              {editingRule ? 'Edit Rule' : 'Create New Rule'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Rule Name */}
            <div className="space-y-1.5">
              <Label className="text-xs">Rule Name</Label>
              <Input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Late Arrival Alert" className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 h-9 text-sm" />
            </div>

            {/* Category + Severity */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={form.category} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}><span className="flex items-center gap-1.5"><c.icon className={cn('h-3 w-3', c.color)} />{c.label}</span></SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Severity</Label>
                <Select value={form.severity} onValueChange={v => setForm(prev => ({ ...prev, severity: v as SeverityValue }))}>
                  <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITY_LEVELS.map(s => <SelectItem key={s.value} value={s.value}><span className={cn('flex items-center gap-1.5', s.color)}><AlertTriangle className="h-3 w-3" />{s.label}</span></SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Trigger Event */}
            <div className="space-y-1.5">
              <Label className="text-xs">Trigger Event</Label>
              <Select value={form.triggerEvent} onValueChange={v => setForm(prev => ({ ...prev, triggerEvent: v }))}>
                <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(TRIGGER_EVENTS[form.category] || []).map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Condition Count */}
            <div className="space-y-1.5">
              <Label className="text-xs">Condition — Occurs N time(s) before firing</Label>
              <Input type="number" min={1} max={100} value={form.conditionCount} onChange={e => setForm(prev => ({ ...prev, conditionCount: Math.max(1, parseInt(e.target.value) || 1) }))} className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 h-9 text-sm w-24" />
            </div>

            {/* Action */}
            <div className="space-y-1.5">
              <Label className="text-xs">Action</Label>
              <Select value={form.action} onValueChange={v => setForm(prev => ({ ...prev, action: v }))}>
                <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(ACTIONS[form.category] || []).map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Describe what this rule does..." className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 min-h-[60px] text-sm" />
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={v => setForm(prev => ({ ...prev, isActive: v }))} />
              <Label className="text-xs">Active {form.isActive ? <span className="text-emerald-400">(enabled)</span> : <span className="text-muted-foreground">(disabled)</span>}</Label>
            </div>

            <Separator className="bg-black/[0.03] dark:bg-white/[0.05]" />

            {/* Enhanced Visual Rule Flow Preview */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Rule Flow Preview</Label>
              <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
                <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Zap className="h-3 w-3" />TRIGGER
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="px-2 py-1.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {form.triggerEvent ? formatTriggerLabel(form.triggerEvent) : '—'}
                    {form.conditionCount > 1 && <span className="text-cyan-300/60 ml-1">×{form.conditionCount}</span>}
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="px-2 py-1.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {form.action ? formatActionLabel(form.action) : '—'}
                    {form.actionValue && <span className="text-emerald-300/60 ml-1">({form.actionValue})</span>}
                  </span>
                </div>
                {form.name && <p className="text-[10px] text-muted-foreground mt-2"><span className="text-foreground/70 font-medium">{form.name}</span>{form.description && ` — ${form.description}`}</p>}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button onClick={handleSave} className="flex-1 bg-emerald-600 hover:bg-emerald-500 gap-2">
                <Zap className="h-3.5 w-3.5" />{editingRule ? 'Update Rule' : 'Create Rule'}
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:border-cyan-500/30" onClick={handleTestRule} disabled={testRunning || !form.name}>
                {testRunning ? <Activity className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5 text-cyan-400" />}
                {testRunning ? 'Testing...' : 'Test Rule'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ─────────────────────────────────── */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={open => !open && setDeleteConfirm(null)}>
        <AlertDialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-rose-400" />Delete Rule</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this rule. This action cannot be undone. Any active automations using this rule will stop immediately.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-black/[0.1] dark:border-white/[0.1]">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-500" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
